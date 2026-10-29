// Sinkronin video sama voice over dari CapCut.
// Pakai: 1. Generate voice di CapCut dari naskah-dubbing.md, export audio-nya.
//        2. Simpan jadi public/voice/atlas-01.mp3 (boleh .wav/.m4a juga).
//        3. npm run sync -- ATLAS-01               → Whisper (lokal) nyari timestamp tiap kata,
//                                                   durasi scene + subtitle ngikut voice → src/videos/atlas-01/voice.ts
//        4. npm run render -- ATLAS-01
// Opsi:  --model=medium   model Whisper lebih akurat (lebih lambat, ±1,5 GB). Default: small (±470 MB).
// Tanpa file voice: voice.ts cuma diisi subtitle dengan timing perkiraan.
// Download pertama (Whisper + model) cuma sekali, disimpan di folder .whisper/.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildSync, chunkText, parseNaskah, splitForTts, voiceTs } from "./voice-lib.mjs";

const WHISPER_VERSION = "1.5.5";
const AUDIO_EXT = ["mp3", "wav", "m4a", "aac", "ogg"];

/**
 * File voice satu video: public/voice/atlas-01.mp3 (satu file), atau per bagian
 * public/voice/atlas-01-1.mp3, atlas-01-2.mp3, … (digabung otomatis sesuai urutan nomor).
 */
export function voiceFilesFor(n) {
  const single = AUDIO_EXT.map((e) => `public/voice/atlas-${n}.${e}`).find((f) => existsSync(f));
  if (single) return [single];
  if (!existsSync("public/voice")) return [];
  const re = new RegExp(`^atlas-${n}-(\\d+)\\.(${AUDIO_EXT.join("|")})$`, "i");
  return readdirSync("public/voice")
    .map((f) => [f, f.match(re)])
    .filter(([, m]) => m)
    .sort((a, b) => Number(a[1][1]) - Number(b[1][1]))
    .map(([f]) => `public/voice/${f}`);
}
export const hashFiles = (files) => {
  const h = createHash("sha1");
  for (const f of files) h.update(readFileSync(f));
  return h.digest("hex").slice(0, 16);
};

const ffmpeg = (args) => spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", ...args], { stdio: "inherit", shell: true });

const sceneNames = (n) => [...readFileSync(`src/videos/atlas-${n}/Video.tsx`, "utf8").matchAll(/name: "([^"]*)"/g)].map((m) => m[1]);

export async function sync(id, { model = "small" } = {}) {
  const n = id.replace(/^ATLAS-/i, "");
  const dir = `src/videos/atlas-${n}`;
  const naskah = parseNaskah(`${dir}/naskah-dubbing.md`);
  const names = sceneNames(n);
  if (naskah.length !== names.length) {
    throw new Error(`naskah-dubbing.md punya ${naskah.length} bagian, Video.tsx punya ${names.length} scene. Samakan dulu.`);
  }
  // Teks buat text-to-speech CapCut (maks 500 karakter per generate), dipecah per bagian.
  const parts = splitForTts(naskah.map((s) => s.text));
  writeFileSync(
    `${dir}/naskah-voice.txt`,
    `Tempel tiap bagian ke klip teks terpisah di CapCut (maks 500 karakter per generate), urut dari bagian 1.\n` +
      `Export audio: satu file gabungan → public/voice/atlas-${n}.mp3, atau per bagian → public/voice/atlas-${n}-1.mp3, atlas-${n}-2.mp3, dst.\n\n` +
      parts.map((p, i) => `===== BAGIAN ${i + 1} (${p.length} karakter) =====\n${p}`).join("\n\n") +
      "\n",
  );
  const files = voiceFilesFor(n);
  if (!files.length) {
    const chunks = naskah.flatMap((s, scene) => chunkText(s.text).map((text) => ({ scene, text })));
    writeFileSync(`${dir}/voice.ts`, voiceTs({ chunks, sync: null }));
    console.log(`Belum ada voice (public/voice/atlas-${n}.mp3). Subtitle pakai timing perkiraan → ${dir}/voice.ts`);
    return;
  }

  const { downloadWhisperModel, installWhisperCpp, transcribe } = await import("@remotion/install-whisper-cpp");
  const whisperPath = path.join(process.cwd(), ".whisper");
  if (!existsSync(whisperPath)) {
    console.log("Install Whisper.cpp (sekali aja)…");
    await installWhisperCpp({ to: whisperPath, version: WHISPER_VERSION, printOutput: true });
  }
  await downloadWhisperModel({ model, folder: whisperPath, printOutput: true });

  // Beberapa bagian → digabung jadi satu file (yang dipakai video).
  let audio = files[0];
  if (files.length > 1) {
    audio = `public/voice/atlas-${n}-gabungan.wav`;
    const inputs = files.flatMap((f) => ["-i", `"${f}"`]);
    const r = ffmpeg([...inputs, "-filter_complex", `"concat=n=${files.length}:v=0:a=1"`, "-ar", "44100", "-ac", "2", `"${audio}"`]);
    if (r.status !== 0) throw new Error("Gagal gabungin file voice.");
    console.log(`Gabung ${files.length} bagian voice → ${audio}`);
  }

  // Whisper butuh WAV 16 kHz mono.
  mkdirSync(path.join(whisperPath, "tmp"), { recursive: true });
  const wav = path.join(whisperPath, "tmp", `atlas-${n}.wav`);
  const ff = ffmpeg(["-i", `"${audio}"`, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", `"${wav}"`]);
  if (ff.status !== 0) throw new Error("Gagal convert audio ke WAV.");
  const duration = (statSync(wav).size - 44) / (16000 * 2);

  console.log(`Transkrip ${audio} (${duration.toFixed(1)} dtk, model ${model})…`);
  const out = await transcribe({
    inputPath: wav,
    whisperPath,
    whisperCppVersion: WHISPER_VERSION,
    model,
    modelFolder: whisperPath,
    tokenLevelTimestamps: true,
    language: "id",
    printOutput: false,
  });

  // Token → kata (token yang diawali spasi = kata baru).
  const words = [];
  for (const item of out.transcription) {
    for (const tok of item.tokens) {
      if (!tok.text || tok.text.startsWith("[_")) continue;
      const from = (tok.t_dtw !== -1 ? tok.t_dtw * 10 : tok.offsets.from) / 1000;
      const to = tok.offsets.to / 1000;
      if (tok.text.startsWith(" ") || !words.length) words.push({ w: tok.text.trim(), from, to: Math.max(to, from) });
      else {
        const last = words[words.length - 1];
        last.w += tok.text;
        last.to = Math.max(last.to, to);
      }
    }
  }
  const words2 = words.filter((w) => w.w);
  for (let i = 0; i < words2.length - 1; i++) words2[i].to = Math.min(words2[i].to, words2[i + 1].from);

  const res = buildSync(naskah, words2, duration);
  const rel = path.relative("public", audio).split(path.sep).join("/");
  writeFileSync(
    `${dir}/voice.ts`,
    voiceTs({ chunks: res.chunks, sync: { audio: rel, hash: hashFiles(files), duration: Math.round(duration * 1000) / 1000, scenes: res.scenes } }),
  );

  const pct = Math.round((res.matched / res.total) * 100);
  console.log(`\nKata naskah yang ketemu di voice: ${res.matched}/${res.total} (${pct}%)`);
  if (pct < 70) console.log("⚠  Kecocokan rendah. Cek apakah voice-nya sesuai naskah-dubbing.md, atau coba --model=medium.");
  console.log("\nScene           voice (dtk)");
  res.scenes.forEach((s, i) => console.log(`${names[i].padEnd(16)}${(s.to - s.from).toFixed(1).padStart(6)}`));
  console.log(`\nTotal ±${Math.round(duration)} dtk → ${dir}/voice.ts. Lanjut: npm run render -- ATLAS-${n}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    console.error("Kasih ID videonya, contoh: npm run sync -- ATLAS-01");
    process.exit(1);
  }
  const model = (args.find((a) => a.startsWith("--model=")) ?? "--model=small").split("=")[1];
  sync(id, { model }).catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}

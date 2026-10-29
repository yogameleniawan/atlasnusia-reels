// Render satu video ke MP4 60 fps (plus voice & subtitle), sekalian cover YouTube Shorts dari hook.
// Kalau ada public/voice/atlas-XX.mp3 yang belum di-sync, `npm run sync` dijalankan otomatis dulu.
// Pakai: npm run render -- ATLAS-01                  → out/ATLAS-01.mp4 + out/ATLAS-01-cover.png
//        npm run render -- ATLAS-01 --30             → versi 30 fps
//        npm run render -- ATLAS-01 --frame=120      → cover dari frame lain (hitungan 30 fps)
//        npm run render -- ATLAS-01 --no-cover       → video aja
//        npm run render -- ATLAS-01 --music=0.3      → volume backsound (default 0,3)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { makeCover, parseFrame } from "./cover.mjs";
import { hashFiles, sync, voiceFilesFor } from "./sync.mjs";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("Kasih ID videonya, contoh: npm run render -- ATLAS-01");
  process.exit(1);
}
// Voice: sync dulu kalau file voice baru/berubah.
const n = id.replace(/^ATLAS-/i, "");
const voiceTs = `src/videos/atlas-${n}/voice.ts`;
if (existsSync(voiceTs)) {
  const files = voiceFilesFor(n);
  const synced = readFileSync(voiceTs, "utf8").match(/"hash": "([^"]+)"/)?.[1];
  if (files.length && synced !== hashFiles(files)) {
    console.log(`Voice ${files.join(", ")} belum di-sync, sync dulu…`);
    await sync(id);
  } else if (!files.length) {
    console.log(`(Belum ada public/voice/atlas-${n}.mp3: render tanpa voice, subtitle pakai timing perkiraan.)`);
  }
}

// Backsound: public/voice/atlas-XX-backsound.* (khusus) → public/backsound/* (default, urut abjad).
const MUSIC = /\.(mp3|wav|m4a|aac|ogg)$/i;
const own = existsSync("public/voice") ? readdirSync("public/voice").find((f) => f.toLowerCase().startsWith(`atlas-${n}-backsound.`) && MUSIC.test(f)) : null;
const def = existsSync("public/backsound") ? readdirSync("public/backsound").filter((f) => MUSIC.test(f)).sort()[0] : null;
const backsound = own ? `voice/${own}` : def ? `backsound/${def}` : null;
const musicArg = args.find((a) => a.startsWith("--music="));
const musicVolume = musicArg ? Number(musicArg.split("=")[1]) : undefined;
console.log(backsound ? `Backsound: public/${backsound}${musicVolume !== undefined ? ` (volume ${musicVolume})` : ""}` : "Backsound: nggak ada (taruh file di public/backsound/)");
mkdirSync("out", { recursive: true });
const propsFile = "out/.render-props.json";
writeFileSync(propsFile, JSON.stringify({ backsound, ...(musicVolume !== undefined ? { musicVolume } : {}) }));

const fps30 = args.includes("--30");
const comp = fps30 ? id : `${id}-60fps`;
const out = `out/${id}${fps30 ? "-30fps" : ""}.mp4`;
const r = spawnSync("npx", ["remotion", "render", comp, out, "--codec=h264", "--crf=18", `--props=${propsFile}`], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (r.status !== 0) process.exit(r.status ?? 1);

if (!args.includes("--no-cover")) process.exit(makeCover(id, parseFrame(args)));

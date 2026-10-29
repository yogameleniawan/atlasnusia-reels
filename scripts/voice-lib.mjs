// Logika sync voice ↔ naskah (dipakai scripts/sync.mjs). Murni JS, tanpa Whisper, biar gampang dites.
import { readFileSync } from "node:fs";

/** Baca naskah-dubbing.md → [{ name, text }] per scene, urut. */
export function parseNaskah(path) {
  const md = readFileSync(path, "utf8").replace(/\r/g, "");
  const out = [];
  const re = /\*\*\[[^\]]*\]\s*(.+?)\*\*\n([\s\S]*?)(?=\n\*\*\[|$)/g;
  let m;
  while ((m = re.exec(md))) out.push({ name: m[1].trim(), text: m[2].trim().replace(/\s+/g, " ") });
  return out;
}

const MAX = 64; // karakter per potongan subtitle (±2 baris)

/** Pecah teks satu scene jadi potongan subtitle (kalimat → koma → kata). */
export function chunkText(text) {
  const pieces = [];
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    if (sentence.length <= MAX) {
      pieces.push(sentence);
      continue;
    }
    // Potong di koma, digabung lagi selama muat.
    let cur = "";
    for (const part of sentence.split(/(?<=,)\s+/)) {
      if (!cur) cur = part;
      else if ((cur + " " + part).length <= MAX) cur += " " + part;
      else {
        pieces.push(cur);
        cur = part;
      }
    }
    if (cur) pieces.push(cur);
  }
  // Yang masih kepanjangan: bagi rata per kata.
  const split = pieces.flatMap((p) => {
    if (p.length <= MAX) return [p];
    const words = p.split(" ");
    const n = Math.ceil(p.length / MAX);
    const per = Math.ceil(words.length / n);
    const res = [];
    for (let i = 0; i < words.length; i += per) res.push(words.slice(i, i + per).join(" "));
    return res;
  });
  // Kalimat pendek digabung ke sebelahnya kalau masih muat.
  const merged = [];
  for (const p of split) {
    const last = merged[merged.length - 1];
    if (last && (last.length < 22 || p.length < 22) && (last + " " + p).length <= MAX) merged[merged.length - 1] = last + " " + p;
    else merged.push(p);
  }
  return merged;
}

/* ---------- normalisasi & angka → kata (Whisper sering nulis angka) ---------- */
const SATUAN = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
export function terbilang(n) {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? " " + terbilang(n % 10) : ""}`;
  if (n < 200) return `seratus${n - 100 ? " " + terbilang(n - 100) : ""}`;
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus${n % 100 ? " " + terbilang(n % 100) : ""}`;
  if (n < 2000) return `seribu${n - 1000 ? " " + terbilang(n - 1000) : ""}`;
  if (n < 1e6) return `${terbilang(Math.floor(n / 1000))} ribu${n % 1000 ? " " + terbilang(n % 1000) : ""}`;
  if (n < 1e9) return `${terbilang(Math.floor(n / 1e6))} juta${n % 1e6 ? " " + terbilang(n % 1e6) : ""}`;
  if (n < 1e12) return `${terbilang(Math.floor(n / 1e9))} miliar${n % 1e9 ? " " + terbilang(n % 1e9) : ""}`;
  return String(n);
}

/** Satu kata Whisper → satu/lebih kata ternormalisasi ("2%" → ["dua","persen"]). */
export function expandWord(raw) {
  let w = raw.toLowerCase().trim();
  const out = [];
  w = w.replace(/^rp\.?/, "").replace(/^\$/, "");
  const pct = w.endsWith("%");
  w = w.replace(/%$/, "");
  const core = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$|^\d+(,\d+)?$|^\d+\.\d{1,2}$/.test(core)) {
    let [int, dec] = core.includes(",") ? core.split(",") : /^\d+\.\d{1,2}$/.test(core) ? core.split(".") : [core, null];
    int = int.replace(/\./g, "");
    out.push(...terbilang(Number(int)).split(" "));
    if (dec) out.push("koma", ...(dec.startsWith("0") ? dec.split("").map((d) => SATUAN[Number(d)]) : terbilang(Number(dec)).split(" ")));
  } else {
    for (const part of core.split(/[^\p{L}\p{N}]+/u)) if (part) out.push(part);
  }
  if (pct) out.push("persen");
  return out;
}

export const normWords = (text) => text.split(/\s+/).flatMap((w) => expandWord(w)).filter(Boolean);

const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const sim = (a, b) => {
  if (a === b) return 2;
  const r = 1 - lev(a, b) / Math.max(a.length, b.length);
  return r >= 0.7 ? 1 : -1;
};

/**
 * Sejajarkan kata naskah (S) dengan kata Whisper (T: {w, from, to}) pakai DP (Needleman–Wunsch).
 * Hasil: waktu {from, to} untuk tiap kata naskah; yang nggak ketemu diinterpolasi dari tetangganya.
 */
export function align(S, T) {
  const n = S.length;
  const m = T.length;
  const GAP = -0.6;
  const score = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const back = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) (score[i][0] = i * GAP), (back[i][0] = 1);
  for (let j = 1; j <= m; j++) (score[0][j] = j * GAP), (back[0][j] = 2);
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const d = score[i - 1][j - 1] + sim(S[i - 1], T[j - 1].w);
      const u = score[i - 1][j] + GAP;
      const l = score[i][j - 1] + GAP;
      if (d >= u && d >= l) (score[i][j] = d), (back[i][j] = 0);
      else if (u >= l) (score[i][j] = u), (back[i][j] = 1);
      else (score[i][j] = l), (back[i][j] = 2);
    }
  const times = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const b = back[i][j];
    if (i > 0 && j > 0 && b === 0) {
      if (sim(S[i - 1], T[j - 1].w) > 0) times[i - 1] = { from: T[j - 1].from, to: T[j - 1].to };
      i--, j--;
    } else if (i > 0 && (j === 0 || b === 1)) i--;
    else j--;
  }
  const matched = times.filter(Boolean).length;
  const ok = times.map(Boolean);
  // Interpolasi kata yang nggak ketemu, proporsional panjang huruf.
  const end = T.length ? T[T.length - 1].to : 0;
  let i = 0;
  while (i < n) {
    if (times[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && !times[j]) j++;
    const a = i > 0 ? times[i - 1].to : 0;
    const b = j < n ? times[j].from : end;
    const total = S.slice(i, j).reduce((s, w) => s + w.length + 1, 0);
    let t = a;
    for (let k = i; k < j; k++) {
      const len = ((b - a) * (S[k].length + 1)) / total;
      times[k] = { from: t, to: t + len };
      t += len;
    }
    i = j;
  }
  return { times, matched, ok };
}

/**
 * Hitung potongan scene & subtitle dari naskah + kata Whisper.
 * scenes: [{text}] urut; words: [{w (raw), from, to}] detik; duration: panjang audio (detik).
 */
export function buildSync(scenes, words, duration) {
  const T = words.flatMap((x) => {
    const parts = expandWord(x.w);
    const step = (x.to - x.from) / Math.max(1, parts.length);
    return parts.map((w, k) => ({ w, from: x.from + k * step, to: x.from + (k + 1) * step }));
  });
  // Kata naskah, ditandai scene & potongan subtitle-nya.
  const S = [];
  const chunks = [];
  scenes.forEach((s, si) => {
    for (const text of chunkText(s.text)) {
      const ws = normWords(text);
      chunks.push({ scene: si, text, a: S.length, b: S.length + ws.length });
      S.push(...ws);
    }
  });
  const { times, matched, ok } = align(S, T);
  const LEAD = 0.15;
  // Awal scene = kata pertama yang ketemu di scene itu, dikurangi perkiraan durasi kata sebelumnya yang nggak ketemu.
  const sceneStart = scenes.map((_, si) => {
    const cs = chunks.filter((x) => x.scene === si && x.b > x.a);
    if (!cs.length) return null;
    const a = cs[0].a;
    const b = cs[cs.length - 1].b;
    for (let k = a; k < b; k++) {
      if (!ok[k]) continue;
      const before = S.slice(a, k).reduce((s, w) => s + w.length + 1, 0) * 0.065;
      const prevEnd = a > 0 ? times[a - 1].to : 0;
      return Math.max(prevEnd, times[k].from - before);
    }
    return times[a].from;
  });
  const sceneOut = scenes.map((_, si) => {
    let from = si === 0 ? 0 : Math.max(0, (sceneStart[si] ?? 0) - LEAD);
    return { from };
  });
  for (let si = 1; si < scenes.length; si++) sceneOut[si].from = Math.max(sceneOut[si].from, sceneOut[si - 1].from + 0.5);
  const lastWord = times.length ? times[times.length - 1].to : duration;
  sceneOut.forEach((s, si) => (s.to = si < scenes.length - 1 ? sceneOut[si + 1].from : Math.min(duration, lastWord + 0.4)));
  const round = (v) => Math.round(v * 1000) / 1000;
  return {
    matched,
    total: S.length,
    scenes: sceneOut.map((s) => ({ from: round(s.from), to: round(s.to) })),
    chunks: chunks.map((c) => ({ scene: c.scene, text: c.text, from: c.b > c.a ? round(times[c.a].from) : undefined, to: c.b > c.a ? round(times[c.b - 1].to) : undefined })),
  };
}

/** voice.ts untuk satu video. */
export function voiceTs({ chunks, sync }) {
  return `// Dibikin otomatis oleh \`npm run sync\` dari naskah-dubbing.md (+ voice di public/voice/). Jangan diedit manual.
import type { VoiceData } from "../../atlas/voice";

export const VOICE: VoiceData = ${JSON.stringify({ chunks, sync }, null, 2)};
`;
}

/**
 * Pecah naskah buat text-to-speech CapCut (maks 500 karakter per generate).
 * Scene digabung selama muat; scene yang kepanjangan dipotong per kalimat.
 */
export function splitForTts(texts, max = 480) {
  const units = texts.flatMap((t) => {
    if (t.length <= max) return [t];
    const out = [];
    let cur = "";
    for (const s of t.split(/(?<=[.?!])\s+/)) {
      if (cur && (cur + " " + s).length > max) {
        out.push(cur);
        cur = s;
      } else cur = cur ? cur + " " + s : s;
    }
    if (cur) out.push(cur);
    return out;
  });
  const parts = [];
  let cur = "";
  for (const u of units) {
    if (cur && (cur + " " + u).length > max) {
      parts.push(cur);
      cur = u;
    } else cur = cur ? cur + " " + u : u;
  }
  if (cur) parts.push(cur);
  return parts;
}

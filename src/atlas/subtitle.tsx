import React from "react";
import { getInputProps, useCurrentFrame } from "remotion";
import { C, clamp, FONT } from "./tokens";
import type { DesignScene, Timeline, VoiceData } from "./voice";

/**
 * Subtitle berjalan (seperti Algonoma v4): per frasa 2–6 kata, satu baris, kata yang lagi diucapkan disorot
 * stabilo emas (teks hitam), yang udah diucapkan gading, yang belum redup. Teks = naskah voice persis.
 * Timing dari `npm run sync` (Whisper); tanpa voice, perkiraan proporsional panjang teks per scene.
 * Posisi: top 1440, di bawah semua teks lain. Matikan: --props='{"noCaptions":true}' (dipakai cover).
 */
export type SubPhrase = { s: number; e: number; w: string[] };

const MAX_CHARS = 30;
const MAX_WORDS = 6;

/** Ejaan buat TTS → tulisan di layar (naskah ditulis "atlasnusia dot com" biar dibaca benar). */
const display = (text: string) => text.replace(/(\S+) dot com\b/gi, "$1.com");

/** Pecah teks jadi frasa pendek: utamakan potong di tanda baca, lalu di batas kata. */
function phrases(text: string): string[] {
  const words = display(text).split(/\s+/).filter(Boolean);
  const out: string[][] = [];
  let cur: string[] = [];
  const len = (ws: string[]) => ws.join(" ").length;
  words.forEach((w, i) => {
    if (cur.length && (len([...cur, w]) > MAX_CHARS || cur.length >= MAX_WORDS)) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
    const punct = /[.,?!;:…]$/.test(w);
    const rest = words.length - i - 1;
    if (punct && cur.length >= 2 && rest !== 1) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) {
    if (cur.length === 1 && out.length && len([...out[out.length - 1], ...cur]) <= MAX_CHARS + 6) out[out.length - 1].push(...cur);
    else out.push(cur);
  }
  return out.map((p) => p.join(" "));
}

/** Frasa subtitle (frame 30 fps di timeline video) dari voice.ts + timeline. */
export function buildSubs(scenes: DesignScene[], voice: VoiceData, tl: Timeline): SubPhrase[] {
  const subs: SubPhrase[] = [];
  const sync = voice.sync;
  const push = (text: string, s: number, e: number) => {
    const ps = phrases(text);
    const total = ps.reduce((n, p) => n + p.length + 1, 0);
    let a = s;
    ps.forEach((p) => {
      const d = ((e - s) * (p.length + 1)) / total;
      subs.push({ s: Math.round(a), e: Math.round(a + d), w: p.split(" ") });
      a += d;
    });
  };
  if (sync) {
    const fr = (scene: number, t: number) => tl.starts[scene] + Math.max(0, t - sync.scenes[scene].from) * 30;
    voice.chunks.forEach((c) => {
      const from = fr(c.scene, c.from ?? sync.scenes[c.scene].from);
      const to = fr(c.scene, c.to ?? sync.scenes[c.scene].to);
      push(c.text, from, Math.max(from + 12, to));
    });
  } else {
    scenes.forEach((_, i) => {
      const list = voice.chunks.filter((c) => c.scene === i);
      const total = list.reduce((n, c) => n + c.text.length, 0);
      const a = tl.starts[i] + 3,
        b = tl.starts[i] + tl.frames[i] - 4;
      let t = a;
      list.forEach((c) => {
        const len = ((b - a) * c.text.length) / total;
        push(c.text, t, t + len);
        t += len;
      });
    });
  }
  // jangan tumpang tindih
  for (let i = 0; i < subs.length - 1; i++) subs[i].e = Math.min(subs[i].e + 6, subs[i + 1].s);
  return subs;
}

export const Subtitles: React.FC<{ subs: SubPhrase[]; top?: number }> = ({ subs, top = 1440 }) => {
  const f = useCurrentFrame();
  if ((getInputProps() as { noCaptions?: boolean }).noCaptions) return null;
  const ph = subs.find((p) => f >= p.s && f < p.e);
  if (!ph) return null;
  const slot = ((ph.e - ph.s) * 0.88) / ph.w.length;
  const idx = Math.floor((f - ph.s) / slot);
  const tIn = clamp((f - ph.s) / 5);
  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        top,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "8px 0",
        fontFamily: FONT,
        fontSize: 40,
        fontWeight: 600,
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        opacity: tIn,
        transform: `translateY(${((1 - tIn) * 16).toFixed(1)}px)`,
        textShadow: "0 2px 12px rgba(0,0,0,.65)",
      }}
    >
      {ph.w.map((w, i) => {
        const active = i === idx,
          said = i < idx;
        const pop = clamp((f - ph.s - i * slot) / 5);
        const sc = active ? 1 + 0.08 * Math.sin(Math.PI * Math.min(1, pop)) + 0.02 : 1;
        return (
          <span
            key={`${ph.s}-${i}`}
            style={{
              padding: "0 10px",
              borderRadius: 10,
              background: active ? C.goldLight : "transparent",
              color: active ? C.ink : said ? C.ivory : "#8a8170",
              textShadow: active ? "none" : undefined,
              transform: active ? `scale(${sc.toFixed(3)})` : undefined,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

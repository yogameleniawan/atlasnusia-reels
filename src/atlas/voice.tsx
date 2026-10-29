import React, { createContext, useContext } from "react";
import { Audio, getInputProps, getStaticFiles, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS } from "./tokens";

/**
 * Voice over + timeline.
 *
 * Semua animasi Atlasnusia ditulis dalam WAKTU DESAIN T (detik). Tiap scene punya rentang desain
 * [from, to]. Kalau ada voice (npm run sync), panjang tiap scene di video ikut panjang potongan voice-nya,
 * dan T dipetakan linear di dalam scene (animasi dipercepat/diperlambat, tetap nyambung antar scene).
 * Tanpa voice, T = frame / 30.
 *
 * voice.ts dibikin otomatis oleh scripts/sync.mjs, jangan diedit manual.
 */
export type VoiceData = {
  chunks: { scene: number; text: string; from?: number; to?: number }[];
  sync: null | { audio: string; hash: string; duration: number; scenes: { from: number; to: number }[] };
};
/** Scene desain: name harus sama urutannya dengan bagian di naskah-dubbing.md. */
export type DesignScene = { name: string; from: number; to: number };
export type Timeline = {
  /** Awal tiap scene di video (frame 30 fps). */
  starts: number[];
  frames: number[];
  totalFrames: number;
  /** frame video (30 fps) → waktu desain (detik). */
  toDesign: (frame: number) => number;
  /** waktu desain → frame video (buat SFX). */
  toFrame: (t: number) => number;
  track: VoiceTrackData;
};
export type VoiceTrackData = { audio: string; segments: { at: number; trimBefore: number; length: number }[] } | null;

const RATE_MAX = 1.4; // animasi paling cepat 1,4× (voice jauh lebih pendek → scene diperpanjang tanpa suara)

/**
 * scenes = scene yang ada voice-nya (urut). tail = bagian akhir tanpa voice (bumper), detik desain.
 */
export function timeline(scenes: DesignScene[], voice: VoiceData, tail = 0): Timeline {
  const sync = voice.sync;
  if (sync && sync.scenes.length !== scenes.length) {
    throw new Error(`voice.ts punya ${sync.scenes.length} bagian, Video.tsx punya ${scenes.length} scene. Jalankan ulang npm run sync.`);
  }
  const frames = scenes.map((s, i) => {
    const design = (s.to - s.from) * FPS;
    if (!sync) return Math.round(design);
    const voiced = (sync.scenes[i].to - sync.scenes[i].from) * FPS;
    return Math.max(Math.round(voiced), Math.ceil(design / RATE_MAX), 15);
  });
  const tailFrames = Math.round(tail * FPS);
  const starts: number[] = [];
  frames.forEach((f, i) => starts.push(i === 0 ? 0 : starts[i - 1] + frames[i - 1]));
  const voicedEnd = starts[starts.length - 1] + frames[frames.length - 1];
  const designEnd = scenes[scenes.length - 1].to;
  const totalFrames = voicedEnd + tailFrames;

  const toDesign = (f: number) => {
    if (f >= voicedEnd) return designEnd + (f - voicedEnd) / FPS;
    let i = 0;
    while (i < scenes.length - 1 && f >= starts[i + 1]) i++;
    const u = (f - starts[i]) / frames[i];
    return scenes[i].from + u * (scenes[i].to - scenes[i].from);
  };
  const toFrame = (t: number) => {
    if (t >= designEnd) return voicedEnd + (t - designEnd) * FPS;
    let i = 0;
    while (i < scenes.length - 1 && t >= scenes[i + 1].from) i++;
    const u = (t - scenes[i].from) / (scenes[i].to - scenes[i].from);
    return starts[i] + u * frames[i];
  };
  const track: VoiceTrackData = sync
    ? { audio: sync.audio, segments: sync.scenes.map((v, i) => ({ at: starts[i], trimBefore: v.from * FPS, length: Math.min(frames[i], (v.to - v.from) * FPS) })) }
    : null;
  return { starts, frames, totalFrames, toDesign, toFrame, track };
}

/* ---------- waktu desain buat semua komponen ---------- */
const TimeCtx = createContext<(f: number) => number>((f) => f / FPS);
/** Pasang sekali di Video.tsx. Komponen di dalamnya baca waktu desain lewat useT(). */
export const TimeProvider: React.FC<{ toDesign: (f: number) => number; children: React.ReactNode }> = ({ toDesign, children }) => (
  <TimeCtx.Provider value={toDesign}>{children}</TimeCtx.Provider>
);
/** Waktu desain (detik) di frame ini. Aman di 30 & 60 fps (frame dihitung ulang ke 30 fps). */
export const useT = () => {
  const frame = useCurrentFrame();
  const map = useContext(TimeCtx);
  return map(frame);
};

/** Voice: tiap scene muter potongan audionya sendiri. Ditaruh di luar wrapper 60fps. */
export const VoiceTrack: React.FC<{ track: VoiceTrackData }> = ({ track }) => {
  const { fps } = useVideoConfig();
  if (!track) return null;
  const k = fps / FPS;
  return (
    <>
      {track.segments.map((s, i) => (
        <Sequence key={i} name={`Voice ${i + 1}`} from={Math.round(s.at * k)} durationInFrames={Math.max(1, Math.round(s.length * k))} layout="none">
          <Audio src={staticFile(track.audio)} trimBefore={Math.round(s.trimBefore * k)} durationInFrames={Math.max(1, Math.round(s.length * k))} />
        </Sequence>
      ))}
    </>
  );
};

/* ---------- Backsound ---------- */
const MUSIC_EXT = /\.(mp3|wav|m4a|aac|ogg)$/i;
const MUSIC_VOL = 0.3;

/** public/voice/atlas-XX-backsound.mp3 (khusus) → public/backsound/* (default, urut abjad). */
export const backsoundFor = (id: string): string | null => {
  const n = id.replace(/^ATLAS-/i, "");
  let files: { name: string }[] = [];
  try {
    files = getStaticFiles();
  } catch {
    return null;
  }
  files = files.map((f) => ({ name: f.name.split("\\").join("/") }));
  const own = files.find((f) => new RegExp(`^voice/atlas-${n}-backsound\\.`, "i").test(f.name) && MUSIC_EXT.test(f.name));
  if (own) return own.name;
  const def = files.filter((f) => f.name.startsWith("backsound/") && MUSIC_EXT.test(f.name)).sort((a, b) => a.name.localeCompare(b.name))[0];
  return def ? def.name : null;
};

export const Backsound: React.FC<{ id: string }> = ({ id }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const props = getInputProps() as { noBacksound?: boolean; backsound?: string | null; musicVolume?: number };
  const src = props.backsound !== undefined ? props.backsound : backsoundFor(id);
  if (!src || props.noBacksound) return null;
  const vol = props.musicVolume ?? MUSIC_VOL;
  return (
    <Audio
      name="Backsound"
      src={staticFile(src)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={(f) => vol * interpolate(f, [0, fps * 0.5, durationInFrames - fps * 1.5, durationInFrames - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
};

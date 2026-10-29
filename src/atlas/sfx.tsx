import React from "react";
import { Audio, getInputProps, Sequence, staticFile, useVideoConfig } from "remotion";

/**
 * Sound effect. File di public/sfx/ (koleksi yang sama dengan algonoma-reels).
 * hit  = detik "kena" di dalam file (puncak suaranya), jadi titik kena jatuh pas di cue.
 * gain = penyetara volume antar file (di bawah voice).
 * Arti tiap suara di Atlasnusia (pakai sesuai artinya):
 *   swoosh      peta muncul (sapuan), kartu/foto masuk
 *   woosh       kamera turun ke 2D, foto dilempar keluar, kata meluncur masuk
 *   key-lock    pin mendarat, polaroid mendarat
 *   droplet     label kecil, kata "air"/"danau" muncul
 *   magic       sesuatu terungkap (border danau tergambar, jawaban hook)
 *   ding        angka odometer berhenti, ukuran ketemu
 *   drum        kata "meletus" meledak (+ shake)
 *   crumble     kata "runtuh" berjatuhan
 *   pickup      pulau/benda muncul membesar
 *   bamboo      kayu/budaya (patung, tenun)
 *   join        ajakan komentar
 *   achievement berlian logo mendarat di bumper
 *   gasp        fakta yang bikin kaget di hook (maks 1×)
 * Sengaja nggak dipakai (rasa meme, nggak cocok sama brand mewah): Among Us, Fart, Oppai, Rizz, FAHH, Taco Bell,
 * Spongebob, Goku, Holy, Minecraft, Garry's Mod, Nokia, Vine Boom, Bonk, Censor, Bass Drop, dll.
 */
export const SFX = {
  woosh: { file: "sfx/woosh.mp3", hit: 0.45, dur: 1.15, gain: 0.6 },
  swoosh: { file: "sfx/swoosh.mp3", hit: 0.44, dur: 1.1, gain: 0.55 },
  "key-lock": { file: "sfx/key-lock.mp3", hit: 0.12, dur: 0.53, gain: 2.0 },
  shutter: { file: "sfx/shutter.mp3", hit: 0.16, dur: 0.68, gain: 1.9 },
  magic: { file: "sfx/magic.mp3", hit: 0.2, dur: 2.74, gain: 2.4 },
  ding: { file: "sfx/ding.mp3", hit: 0.3, dur: 1.05, gain: 0.55 },
  achievement: { file: "sfx/achievement.mp3", hit: 0.13, dur: 1.18, gain: 0.4 },
  "level-up": { file: "sfx/level-up.mp3", hit: 0.45, dur: 2.54, gain: 3 },
  gasp: { file: "sfx/Crowd Gasp.mp3", hit: 0.63, dur: 1.67, gain: 1.2 },
  droplet: { file: "sfx/Water Droplet.mp3", hit: 0.15, dur: 0.5, gain: 0.35 },
  pickup: { file: "sfx/Counter Strike Item Pickup.mp3", hit: 0.4, dur: 1.0, gain: 2.4 },
  drum: { file: "sfx/Japanese Drum.mp3", hit: 0.36, dur: 1.65, gain: 0.45 },
  bamboo: { file: "sfx/Bamboo Hit.mp3", hit: 0.39, dur: 0.95, gain: 1.6 },
  vanish: { file: "sfx/Vanish.mp3", hit: 0.4, dur: 2.79, gain: 0.4 },
  crumble: { file: "sfx/Lego Break Fall Apart.mp3", hit: 0.31, dur: 1.86, gain: 1.6 },
  "stone-slide": { file: "sfx/Stone Sliding.mp3", hit: 0.3, dur: 1.5, gain: 0.8 },
  join: { file: "sfx/Discord Join.mp3", hit: 0.29, dur: 1.25, gain: 0.45 },
} as const;
export type SfxName = keyof typeof SFX;

/** Cue di Video.tsx: t = waktu desain (detik) saat sesuatu "kena". */
export type SfxCue = { t: number; s: SfxName; vol?: number };
/** Cue di timeline video (frame 30 fps). */
export type SfxHit = { at: number; s: SfxName; vol: number };

const BASE = 0.8;

/** Lapisan SFX, di luar wrapper 60fps. Matikan: --props='{"noSfx":true}'; volume: {"sfxVolume":0.6}. */
export const SfxTrack: React.FC<{ hits?: SfxHit[] | null }> = ({ hits }) => {
  const { fps } = useVideoConfig();
  const props = getInputProps() as { noSfx?: boolean; sfxVolume?: number };
  if (!hits || props.noSfx) return null;
  const k = fps / 30;
  const master = props.sfxVolume ?? BASE;
  return (
    <>
      {hits.map((h, i) => {
        const def = SFX[h.s];
        const start = h.at * k - def.hit * fps;
        const from = Math.max(0, Math.round(start));
        const trim = Math.max(0, Math.round(-start));
        const len = Math.max(1, Math.ceil(def.dur * fps) - trim);
        return (
          <Sequence key={i} name={`SFX ${h.s}`} from={from} durationInFrames={len} layout="none">
            <Audio src={staticFile(def.file)} trimBefore={trim} volume={Math.min(10, def.gain * h.vol * master)} />
          </Sequence>
        );
      })}
    </>
  );
};

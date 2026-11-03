import React from "react";
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../atlas/fonts";
import { C, clamp, expo, FONT, inCub, ramp, spring, win } from "../../atlas/tokens";
import { DesignScene, timeline, TimeProvider, useT } from "../../atlas/voice";
import { MapLook, MapWorld, useMap } from "../../atlas/MapStage";
import { biggest, LL, MapData, outer } from "../../atlas/map";
import { CompassHud, GlowBorder, PlaceLabels, Pulses, Scrim, useSurface } from "../../atlas/overlay";
import { Card3D, headOf, Pin, ShapeIll } from "../../atlas/pins";
import { Kinetic } from "../../atlas/kinetic";
import { ProgressMap } from "../../atlas/progress";
import { InitiatorSpotlight } from "../../atlas/initiator";
import { SiteFinale } from "../../atlas/finale";
import { buildSubs, SubPhrase, Subtitles } from "../../atlas/subtitle";
import { Bumper, BUMPER_SECONDS, PhotoCard, Watermark } from "../../atlas/brand";
import { SfxCue, SfxHit } from "../../atlas/sfx";
import MAP_JSON from "./map.json";
import PHOTOS_JSON from "./photos.json";
import { VOICE } from "./voice";

/**
 * ATLAS-05 · Kalimantan Timur, lumba-lumba yang hidup di sungai
 * Hook (gaya baru "sungai": garis sungai emas berkelok tergambar melintang layar, kata-kata hanyut mengikuti arus
 * lalu berhenti, sirip pesut muncul-tenggelam di arus, "Di mana?" muncul dari cipratan)
 * → AJAK: 4 terbuka, Kaltim terbuka (4 → 5/38) → INISIATOR @mhpratama30 "Kaltim kak" (izin foto dari user)
 * → Kaltim terangkat + kartu → Sungai Mahakam tergambar di peta (±920 km) → pin + kartu Pesut Mahakam (jawaban)
 * → Penajam Paser Utara (IKN) → Kepulauan Derawan → foto penyu hijau → foto amplang → penutup SiteFinale → bumper.
 * Peta: Bulungan & Malinau dikeluarkan dari fokus (sejak 2012 masuk Kalimantan Utara), jadi 10 kab/kota.
 */
const MAP = MAP_JSON as unknown as MapData & { river: LL[] };
const PH = Object.fromEntries((PHOTOS_JSON as { key: string; src: string; credit: string }[]).map((p) => [p.key, p]));

const AJAK_AT = 3.3,
  AJAK_MAP = 6.0,
  AJAK_LEN = 10.6;
const story = (t: number) => (t < AJAK_AT ? t : t < AJAK_AT + AJAK_LEN ? AJAK_AT : t - AJAK_LEN);
const S = (t: number) => (t < AJAK_AT ? t : t + AJAK_LEN);
const STORY_SCENES: DesignScene[] = [
  { name: "Hook", from: 0, to: 3.3 },
  { name: "Provinsi", from: 3.3, to: 6.6 },
  { name: "Mahakam", from: 6.6, to: 10.0 },
  { name: "Pesut", from: 10.0, to: 13.8 },
  { name: "IKN", from: 13.8, to: 17.0 },
  { name: "Derawan", from: 17.0, to: 20.4 },
  { name: "Foto Penyu", from: 20.4, to: 23.8 },
  { name: "Amplang", from: 23.8, to: 27.2 },
  { name: "Ajakan", from: 27.2, to: 32.4 },
];
export const SCENES: DesignScene[] = [
  STORY_SCENES[0],
  { name: "Ajak", from: AJAK_AT, to: AJAK_AT + AJAK_MAP },
  { name: "Inisiator", from: AJAK_AT + AJAK_MAP, to: AJAK_AT + AJAK_LEN },
  ...STORY_SCENES.slice(1).map((s) => ({ ...s, from: S(s.from), to: S(s.to) })),
];
const STORY_END = 32.4;
const END = S(STORY_END);

const SAMARINDA: LL = [117.15, -0.5];
const PESUT: LL = [116.5678, -0.285]; // Mahakam tengah, sekitar Kota Bangun (perkiraan habitat inti)
const IKN: LL = [116.7, -0.97]; // kawasan inti IKN, Sepaku (perkiraan)
const DERAWAN: LL = [118.25, 2.28];

const LOOK: MapLook = {
  camera: [
    [0, 116.6, -0.7, 200, 34, -24],
    [3.0, 116.5, -0.45, 165, 36, -14],
    [5.9, 116.4, -0.3, 125, 42, 6],
    [7.0, 115.9, -0.1, 120, 40, 0],
    [9.6, 116.2, -0.3, 105, 44, 6],
    [10.6, 116.55, -0.5, 36, 54, 10],
    [13.6, 116.56, -0.52, 34, 56, 12],
    [14.8, 116.7, -1.25, 46, 50, 0],
    [16.8, 116.7, -1.28, 42, 52, 4],
    [17.9, 117.9, 1.6, 70, 46, -8],
    [18.6, 118.25, 1.95, 30, 54, -8],
    [20.2, 118.25, 1.93, 27, 56, -6],
    [27.0, 116.6, -0.4, 90, 42, 30],
    [29.4, 116.5, -0.5, 160, 38, -20],
    [32, 116.4, -0.5, 175, 36, -24],
    [37, 116.3, -0.5, 182, 35, -27],
  ],
  sweep: { a: [113.3, 2.8], b: [119.4, -2.7], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 6.4, 7.4)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 27.0, 28.2)),
  detail: [116.2, 117.3, -1.4, -0.1],
};

const STORY_CUES: SfxCue[] = [
  { t: 0.1, s: "woosh", vol: 0.7 },
  { t: 1.05, s: "droplet", vol: 0.8 },
  { t: 1.75, s: "droplet", vol: 0.6 },
  { t: 2.0, s: "magic", vol: 0.7 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 6.9, s: "droplet" },
  { t: 7.2, s: "woosh", vol: 0.8 },
  { t: 10.2, s: "woosh", vol: 0.8 },
  { t: 10.96, s: "key-lock" },
  { t: 11.4, s: "magic", vol: 0.8 },
  { t: 14.1, s: "swoosh", vol: 0.8 },
  { t: 14.9, s: "ding", vol: 0.6 },
  { t: 17.2, s: "woosh", vol: 0.8 },
  { t: 18.8, s: "droplet" },
  { t: 20.9, s: "swoosh" },
  { t: 24.2, s: "pickup", vol: 0.8 },
  { t: 27.4, s: "join" },
  { t: 29.75, s: "ding", vol: 0.6 },
  { t: STORY_END + 0.01, s: "achievement" },
];
const AJAK_UNLOCK = AJAK_AT + 2.3;
const INI_AT = AJAK_AT + AJAK_MAP;
const CUES: SfxCue[] = [
  ...STORY_CUES.map((c) => ({ ...c, t: S(c.t) })),
  { t: AJAK_AT + 0.05, s: "swoosh", vol: 0.8 },
  { t: AJAK_UNLOCK + 0.3, s: "key-lock" },
  { t: AJAK_UNLOCK + 0.4, s: "magic", vol: 0.75 },
  { t: AJAK_UNLOCK + 0.55, s: "ding", vol: 0.8 },
  { t: AJAK_AT + 4.0, s: "join", vol: 0.7 },
  { t: INI_AT + 0.1, s: "swoosh", vol: 0.8 },
  { t: INI_AT + 1.05, s: "key-lock" },
  { t: INI_AT + 1.15, s: "achievement", vol: 0.7 },
  { t: INI_AT + 1.45, s: "pickup", vol: 0.7 },
];

const kaltimRing = biggest(MAP.focus);

/* ---------- hook gaya "sungai" ---------- */
const RIVER_D = "M-40 760 C120 700 220 860 380 800 S620 640 760 760 S980 880 1120 780";
/**
 * Sungai emas berkelok tergambar dari kiri ke kanan (dua garis tepi + arus berkilau). Kata-kata "hanyut" masuk dari
 * kiri dengan sedikit gelombang vertikal lalu berhenti di baris. Sirip punggung pesut muncul dari arus, menyelam lagi
 * dengan cipratan. "Di mana?" muncul dari cipratan kedua. Keluar: semuanya hanyut ke kanan sambil buram.
 */
const HookRiver: React.FC<{ out: number }> = ({ out }) => {
  const t = useT();
  if (t > out + 0.7) return null;
  const v = inCub((t - out) / 0.45);
  const draw = expo((t - 0.05) / 1.1);
  const lines = [
    { text: "Ada lumba-lumba yang", at: 0.1, size: 72 },
    { text: "hidup di *sungai,*", at: 0.5, size: 92 },
    { text: "bukan di laut.", at: 0.85, size: 72 },
  ];
  const qa = 1.95,
    qu = t - qa;
  // sirip: muncul di sepanjang sungai, melengkung naik-turun
  const finU = clamp((t - 0.95) / 1.0);
  const finX = 250 + finU * 520;
  const finY = 790 + Math.sin(finU * 5) * 30;
  const finUp = Math.sin(Math.PI * clamp((t - 0.95) / 1.0));
  const splash = (at: number, x: number, y: number) => {
    const u = (t - at) / 0.7;
    if (u <= 0 || u >= 1) return null;
    return (
      <g transform={`translate(${x} ${y})`} opacity={1 - u}>
        <ellipse rx={30 + 80 * u} ry={8 + 20 * u} fill="none" stroke={C.waterWave} strokeWidth={2.5} />
        {Array.from({ length: 7 }, (_, i) => {
          const a = -Math.PI * (0.15 + (0.7 * i) / 6);
          const r = 20 + 70 * expo(u);
          return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r + 60 * u * u} r={4 * (1 - u) + 1} fill={C.waterWave} />;
        })}
      </g>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: 1 - v, transform: `translateX(${(v * 140).toFixed(1)}px)`, filter: v > 0 ? `blur(${(v * 12).toFixed(1)}px)` : undefined }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: 270, textAlign: "center", color: C.ivory }}>
        {lines.map((L, li) => {
          const words = L.text.split(" ");
          return (
            <div key={li} style={{ fontSize: L.size, fontWeight: li === 1 ? 700 : 600, lineHeight: 1.12, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              {words.map((w, wi) => {
                const a = t - L.at - wi * 0.08;
                const u = expo(a / 0.7);
                const wave = (1 - u) * Math.sin(a * 14 + wi) * 18;
                const m = w.match(/^\*(.+)\*([.,?!]*)$/);
                return (
                  <React.Fragment key={wi}>
                    <span
                      style={{
                        display: "inline-block",
                        transform: `translate(${((1 - u) * -220).toFixed(1)}px, ${wave.toFixed(1)}px)`,
                        opacity: clamp(a / 0.15),
                        filter: u < 0.98 ? `blur(${((1 - u) * 10).toFixed(1)}px)` : undefined,
                        color: m ? C.waterText : undefined,
                      }}
                    >
                      {m ? m[1] + m[2] : w}
                    </span>
                    {wi < words.length - 1 ? " " : null}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="hrW" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={C.gold} />
            <stop offset=".5" stopColor={C.waterWave} />
            <stop offset="1" stopColor={C.gold} />
          </linearGradient>
          <filter id="hrGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <clipPath id="hrAbove">
            <rect x={0} y={0} width={1080} height={finY + 2} />
          </clipPath>
        </defs>
        {/* aliran: lebar + glow + kilau arus */}
        <path d={RIVER_D} fill="none" stroke={C.waterWave} strokeWidth={70} strokeLinecap="round" opacity={0.12 * draw} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        <path d={RIVER_D} fill="none" stroke="url(#hrW)" strokeWidth={22} strokeLinecap="round" filter="url(#hrGlow)" opacity={0.6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        <path d={RIVER_D} fill="none" stroke="url(#hrW)" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        {[0, 1, 2].map((k) => (
          <path key={k} d={RIVER_D} fill="none" stroke="#f4fffd" strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="0.05 0.28" strokeDashoffset={-((t * 0.25 + k * 0.11) % 1)} opacity={0.8 * clamp((t - 0.8) / 0.4)} />
        ))}
        {/* sirip pesut */}
        {finUp > 0.02 ? (
          <g clipPath="url(#hrAbove)">
            <g transform={`translate(${finX.toFixed(1)} ${(finY + (1 - finUp) * 70).toFixed(1)})`}>
              <path d="M-70 0 C-50 -46 10 -62 60 -30 C70 -24 74 -12 70 0 Z" fill={C.goldPale} stroke={C.goldDeep} strokeWidth={2} />
              <path d="M-10 -48 C-4 -70 12 -80 20 -86 C18 -70 16 -58 14 -44 Z" fill={C.goldLight} stroke={C.goldDeep} strokeWidth={2} />
              <circle cx={44} cy={-22} r={3.5} fill={C.ink} />
            </g>
          </g>
        ) : null}
        {splash(0.98, 250, 790)}
        {splash(1.9, 770, 790 + Math.sin(5) * 30)}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center" }}>
        {qu > -0.02 ? (
          <div
            style={{
              display: "inline-block",
              fontSize: 120,
              fontWeight: 700,
              lineHeight: 1,
              color: C.goldLight,
              letterSpacing: "-0.02em",
              opacity: clamp(qu / 0.12),
              transform: `translateY(${((1 - spring(qu / 0.55)) * -90).toFixed(1)}px) scale(${(0.5 + 0.5 * spring(qu / 0.55)).toFixed(3)})`,
            }}
          >
            Di mana?
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Garis Sungai Mahakam di peta: glow biru-emas yang tergambar dari hulu ke muara + kilau arus. */
const RiverLine: React.FC<{ draw: number; opacity: number }> = ({ draw, opacity }) => {
  const { cam, t } = useMap();
  const { focusY } = useSurface();
  if (opacity <= 0.001) return null;
  const d = MAP.river.map(([lo, la], i) => {
    const p = cam.proj(lo, la, focusY);
    return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
  }).join("");
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible", opacity }} aria-hidden="true">
      <defs>
        <filter id="rl-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <path d={d} fill="none" stroke={C.waterWave} strokeWidth={18} strokeLinejoin="round" strokeLinecap="round" filter="url(#rl-glow)" opacity={0.7} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <path d={d} fill="none" stroke="#1f6f6a" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <path d={d} fill="none" stroke="#e9fbf8" strokeWidth={2.5} strokeLinecap="round" pathLength={1} strokeDasharray="0.02 0.06" strokeDashoffset={-((t * 0.04) % 1)} opacity={draw > 0.98 ? 0.9 : 0} />
    </svg>
  );
};

/** Ilustrasi kartu Pesut Mahakam: pesut berkepala bulat tanpa moncong melompat di sungai. */
const PesutIll: React.FC<{ u: number }> = ({ u }) => {
  const jump = Math.sin(Math.min(1, Math.max(0, (u - 0.3) / 1.2)) * Math.PI);
  const loop = u > 1.5 ? Math.sin((u - 1.5) * 2.4) * 6 : 0;
  const wave = "M-20 0" + " q5 -4 10 0 t10 0".repeat(20);
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <linearGradient id="psB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9ced3" />
          <stop offset="1" stopColor="#7c8790" />
        </linearGradient>
      </defs>
      <rect y={112} width={172} height={60} fill="#5f817c" />
      {[126, 144].map((y, i) => (
        <g key={y} transform={`translate(0 ${y})`}>
          <path d={wave} fill="none" stroke="#cfe3df" strokeWidth={2} opacity={i ? 0.5 : 0.8} transform={`translate(${(((u * 14 + i * 9) % 20) - 20).toFixed(1)} 0)`} />
        </g>
      ))}
      <g transform={`translate(86 ${(118 - jump * 46 + loop).toFixed(1)}) rotate(${(-18 + jump * 10).toFixed(1)})`}>
        <path d="M-56 6 C-50 -24 -6 -34 30 -24 C50 -18 58 -4 56 8 C40 16 -30 20 -56 6 Z" fill="url(#psB)" stroke="#4f5961" strokeWidth={1.6} />
        <path d="M-4 -30 C0 -42 6 -48 12 -50 C12 -40 12 -34 10 -28 Z" fill="#8f99a1" stroke="#4f5961" strokeWidth={1.4} />
        <path d="M-56 6 L-72 -6 L-70 12 Z" fill="#8f99a1" stroke="#4f5961" strokeWidth={1.4} />
        <circle cx={40} cy={-8} r={2.6} fill="#1d1a15" />
        <path d="M44 4 Q50 6 54 4" stroke="#4f5961" strokeWidth={1.4} fill="none" />
      </g>
    </svg>
  );
};

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY } = useSurface();
  const photoOn = Math.max(win(t, 20.2, 27.2, 0.45));
  const factOn = t >= 6.6 && t < 20.4,
    ctaOn = t >= 27.1;
  const ktP = cam.proj(116.3, 0.2, focusY);
  const psP = cam.proj(PESUT[0], PESUT[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  return (
    <>
      <PlaceLabels show={ramp(t, 3.5, 4.3) * (1 - photoOn)} yMin={300} yMax={ctaOn ? 840 : factOn ? 960 : 1400} kabFade={1 - win(t, 6.8, 13.8, 0.4)} />
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 7.0, 0.4)} line="#fff1cf" glow={C.gold} />
      <RiverLine draw={ramp(t, 7.0, 9.6)} opacity={win(t, 6.9, 13.9, 0.4)} />
      <Pulses at={PESUT} y={focusY} t0={10.6} t1={13.6} radiusDeg={0.08} />
      {/* IKN di Penajam Paser Utara */}
      <GlowBorder rings={outer(MAP.features.ppu)} y={focusY} draw={ramp(t, 14.4, 15.4)} opacity={win(t, 14.2, 17.0, 0.4)} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.16 * win(t, 14.2, 17.0, 0.4)} />
      <Pulses at={IKN} y={focusY} t0={14.8} t1={16.9} radiusDeg={0.12} />
      <Pulses at={DERAWAN} y={focusY} t0={18.4} t1={20.3} radiusDeg={0.1} />
      <Pin id="ktm" at={xy(ktP)} t0={3.7} t1={6.3} />
      <Card3D
        at={headOf(xy(ktP))}
        t0={4.15}
        t1={6.2}
        name="Kalimantan Timur"
        ill={(u) => <ShapeIll id="ktm" u={u} rings={[kaltimRing]} dot={SAMARINDA} />}
        stats={[
          { icon: "grid", value: 10, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Samarinda" },
        ]}
      />
      <Pin id="pst" at={xy(psP)} t0={10.5} t1={13.6} />
      <Card3D at={headOf(xy(psP))} t0={10.95} t1={13.5} name="Pesut Mahakam" ill={(u) => <PesutIll u={u} />} stats={[{ icon: "grid", prefix: "±", value: 62, suffix: " ekor" }, { icon: "star", text: "Air tawar" }]} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = win(t, 20.2, 27.2, 0.45);
  const factBottom = Math.max(win(t, 6.7, 20.5, 0.4), ramp(t, 27.0, 27.5));
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={factBottom} full={photoOn} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1500, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.97) 0%, rgba(12,11,10,.93) 72%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      <HookRiver out={2.85} />
      <Kinetic mode="act" t0={7.0} t1={10.0} top={1060} step={0.07} text="Sungai *Mahakam*{wave} mengalir ±920 km, terpanjang{stretch} kedua di Indonesia." />
      <Kinetic mode="act" t0={11.0} t1={13.8} top={1060} align="center" text="Jawabannya: *pesut*{pop} Mahakam, lumba-lumba air tawar. Kini tinggal ±62 ekor." />
      <Kinetic mode="act" t0={14.3} t1={17.0} top={1060} align="right" text="Di Penajam Paser Utara sedang dibangun *IKN*{rise} Nusantara." />
      <Kinetic mode="act" t0={17.6} t1={20.4} top={1060} text="Kepulauan *Derawan*{wave} di Berau, tempat bertelur penyu hijau terbesar di Indonesia." />
      <PhotoCard src={PH.penyu.src} credit={PH.penyu.credit} shape="polaroid" t0={20.4} t1={23.8} drift={-1} />
      <Kinetic mode="drop" t0={20.85} t1={23.8} top={1200} size={48} weight={500} lineHeight={1.32} text="Di Pulau Kakaban ada danau berisi jutaan *ubur-ubur* yang tidak menyengat." />
      <PhotoCard src={PH.amplang.src} credit={PH.amplang.credit} shape="round" t0={23.8} t1={27.0} />
      <Kinetic mode="pop" t0={24.25} t1={27.0} top={1200} size={48} weight={500} lineHeight={1.32} text="*Amplang,* kerupuk ikan renyah yang lekat dengan Samarinda, oleh-oleh wajib Kaltim." />
      <SiteFinale t0={27.3} open={["Aceh", "Sumatera Selatan", "Sumatera Barat", "Sulawesi Tenggara", "Kalimantan Timur"]} />
      <Kinetic mode="wave" t0={27.55} t1={99} top={250} size={84} weight={600} lineHeight={1.12} align="center" text="Lima terbuka, *33* lagi. Daerahmu *berikutnya?*" />
      <Kinetic mode="blur" t0={29.0} t1={99} top={1140} size={44} weight={500} lineHeight={1.3} align="center" text="Cek peta yang sudah terbuka di" />
    </AbsoluteFill>
  );
};

/** Blok Ajak (peta progres) + apresiasi Inisiator. Waktu desain video. */
const Ajak: React.FC = () => {
  const k = AJAK_AT;
  return (
    <>
      <ProgressMap t0={k} t1={k + AJAK_MAP} before={["Aceh", "Sumatera Selatan", "Sumatera Barat", "Sulawesi Tenggara"]} unlock="Kalimantan Timur" at={AJAK_UNLOCK} />
      <Kinetic mode="blur" t0={k + 0.2} t1={k + 3.8} top={240} size={74} lineHeight={1.14} text="Sekarang ke *Kalimantan.* Yang terbuka: *Kaltim!*" />
      <Kinetic mode="pop" t0={k + 3.95} t1={k + AJAK_MAP - 0.1} top={240} size={74} lineHeight={1.14} text="Daerahmu berikutnya? Tulis di *komentar!*" />
      <InitiatorSpotlight t0={INI_AT} t1={k + AJAK_LEN} handle="mhpratama30" comment="Kaltim kak" platform="Instagram" photo="photos/atlas-05/inisiator.jpg" />
      <Kinetic mode="drop" t0={INI_AT + 0.25} t1={k + AJAK_LEN - 0.1} top={230} size={68} lineHeight={1.16} text="Terima kasih *@mhpratama30,* Inisiator Kalimantan Timur dari Instagram!" />
    </>
  );
};

const Stage: React.FC<{ subs: SubPhrase[]; toDesign: (f: number) => number }> = ({ subs, toDesign }) => (
  <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
    <TimeProvider toDesign={(f) => story(toDesign(f))}>
      <Story />
    </TimeProvider>
    <TimeProvider toDesign={toDesign}>
      <Ajak />
      <Watermark until={END} />
      <Subtitles subs={subs} />
      <Bumper t0={END} />
    </TimeProvider>
  </AbsoluteFill>
);

/* ---------- registrasi ---------- */
const TL = timeline(SCENES, VOICE, BUMPER_SECONDS);
const SUBS = buildSubs(SCENES, VOICE, TL);
const withTime = (toDesign: (f: number) => number, subs: SubPhrase[]): React.FC => {
  const C1: React.FC = () => (
    <FontGate>
      <Stage subs={subs} toDesign={toDesign} />
    </FontGate>
  );
  return C1;
};
const STORY_DESIGN = timeline(STORY_SCENES, { chunks: [], sync: null }, BUMPER_SECONDS);
const Cover: React.FC = () => (
  <FontGate>
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <TimeProvider toDesign={STORY_DESIGN.toDesign}>
        <Story />
        <Watermark until={STORY_END} />
      </TimeProvider>
    </AbsoluteFill>
  </FontGate>
);

export const ATLAS05 = {
  id: "ATLAS-05",
  title: "Kalimantan Timur, lumba-lumba yang hidup di sungai",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};

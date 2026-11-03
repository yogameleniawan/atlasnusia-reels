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
 * ATLAS-04 · Sulawesi Tenggara, kabupaten yang namanya gabungan empat pulau
 * Hook (gaya baru "pulau": kata timbul dari bawah garis air sambil berayun, empat pulau emas muncul dari laut
 * dengan tanda tanya, lalu tersambung garis putus-putus ke papan nama "? ? ? ?")
 * → AJAK: Aceh, Sumsel, Sumbar terbuka, Sultra terbuka (3 → 4/38) → INISIATOR @resthyanaaaa "Sulawesi Tenggara kk"
 *   (izin foto dari user)
 * → Sultra terangkat + kartu → Wakatobi: empat pulau menyala bergantian dengan suku kata WA·KA·TO·BI (jawaban)
 * → kartu Taman Nasional Wakatobi → foto karang → Baubau + kartu Benteng Keraton Buton → foto benteng
 * → foto sinonggi → penutup SiteFinale → bumper.
 */
const MAP = MAP_JSON as unknown as MapData;
const PH = Object.fromEntries((PHOTOS_JSON as { key: string; src: string; credit: string }[]).map((p) => [p.key, p]));

const AJAK_AT = 3.3,
  AJAK_MAP = 6.0,
  AJAK_LEN = 10.6;
const story = (t: number) => (t < AJAK_AT ? t : t < AJAK_AT + AJAK_LEN ? AJAK_AT : t - AJAK_LEN);
const S = (t: number) => (t < AJAK_AT ? t : t + AJAK_LEN);
const STORY_SCENES: DesignScene[] = [
  { name: "Hook", from: 0, to: 3.3 },
  { name: "Provinsi", from: 3.3, to: 6.6 },
  { name: "Wakatobi", from: 6.6, to: 10.6 },
  { name: "Taman Nasional", from: 10.6, to: 13.8 },
  { name: "Foto Karang", from: 13.8, to: 17.0 },
  { name: "Benteng", from: 17.0, to: 20.4 },
  { name: "Foto Benteng", from: 20.4, to: 23.8 },
  { name: "Sinonggi", from: 23.8, to: 27.2 },
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

const KENDARI: LL = [122.597, -3.955];
const BENTENG: LL = [122.611, -5.468]; // Benteng Keraton Buton, Baubau (perkiraan)
const WAKA_C: LL = [123.765, -5.6]; // pin di Kaledupa
/** Empat pulau utama Wakatobi (titik tengah perkiraan) + suku kata nama. */
const ISLANDS: { at: LL; syl: string; isle: string }[] = [
  { at: [123.584, -5.311], syl: "WA", isle: "Wangi-wangi" },
  { at: [123.765, -5.536], syl: "KA", isle: "Kaledupa" },
  { at: [123.943, -5.751], syl: "TO", isle: "Tomia" },
  { at: [124.025, -5.95], syl: "BI", isle: "Binongko" },
];
const SYL_AT = 7.5,
  SYL_STEP = 0.55;

const LOOK: MapLook = {
  camera: [
    [0, 122.6, -4.9, 185, 34, -24],
    [3.0, 122.5, -4.7, 150, 36, -14],
    [5.9, 122.5, -4.5, 100, 44, 8],
    [6.9, 123.1, -5.1, 80, 46, 10],
    [8.4, 123.74, -5.8, 36, 56, 0],
    [10.4, 123.74, -5.82, 34, 58, 4],
    [13.6, 123.74, -5.82, 33, 58, 6],
    [15.0, 123.2, -5.5, 40, 50, 10],
    [16.9, 122.6, -5.5, 26, 54, 4],
    [20.2, 122.6, -5.5, 22, 56, 0],
    [27.0, 122.6, -4.9, 80, 44, 30],
    [29.4, 122.4, -4.7, 140, 38, -20],
    [32, 122.3, -4.65, 155, 36, -24],
    [37, 122.2, -4.6, 162, 35, -27],
  ],
  sweep: { a: [120.4, -2.3], b: [124.6, -6.5], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 7.0, 8.2)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 27.0, 28.2)),
  detail: [122.4, 124.2, -6.1, -5.1],
};

const STORY_CUES: SfxCue[] = [
  { t: 0.15, s: "swoosh", vol: 0.8 },
  ...[0.75, 0.95, 1.15, 1.35].map((t) => ({ t, s: "droplet" as const, vol: 0.6 })),
  { t: 1.7, s: "magic", vol: 0.7 },
  { t: 2.05, s: "ding", vol: 0.7 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 6.9, s: "woosh", vol: 0.8 },
  ...ISLANDS.map((_, i) => ({ t: SYL_AT + i * SYL_STEP, s: "pickup" as const, vol: 0.7 })),
  { t: SYL_AT + 4 * SYL_STEP + 0.2, s: "magic", vol: 0.8 },
  { t: 11.06, s: "key-lock" },
  { t: 11.5, s: "ding", vol: 0.6 },
  { t: 14.2, s: "droplet" },
  { t: 15.1, s: "woosh", vol: 0.8 },
  { t: 17.46, s: "key-lock" },
  { t: 17.9, s: "ding", vol: 0.6 },
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

const sultraRing = biggest(MAP.focus);
const wakaRings = outer(MAP.features.waka);

/* ---------- hook gaya "pulau" ---------- */
const HOOK_ISLES = [
  { x: 205, y: 790, s: 1.15, d: "M-62 6 C-60 -16 -30 -34 -2 -30 C26 -40 58 -18 62 4 C40 18 -38 20 -62 6Z" },
  { x: 425, y: 840, s: 0.95, d: "M-54 6 C-52 -22 -14 -38 14 -28 C40 -30 56 -10 54 6 C30 18 -30 18 -54 6Z" },
  { x: 655, y: 800, s: 0.85, d: "M-50 6 C-44 -18 -18 -30 6 -26 C30 -34 52 -12 50 6 C24 16 -26 16 -50 6Z" },
  { x: 875, y: 850, s: 1.0, d: "M-56 6 C-50 -26 -10 -34 18 -24 C42 -26 58 -8 56 6 C28 18 -30 18 -56 6Z" },
];
/**
 * Kata timbul dari bawah garis air (masker bawah) lalu berayun pelan seperti mengapung. Empat pulau emas naik dari laut
 * bergantian (riak + cipratan), masing-masing diberi label "?", lalu garis putus-putus menyambung keempatnya ke papan
 * nama "? ? ? ?". Keluar: tenggelam ke bawah sambil buram.
 */
const HookIslands: React.FC<{ out: number }> = ({ out }) => {
  const t = useT();
  if (t > out + 0.7) return null;
  const v = inCub((t - out) / 0.45);
  const lines = [
    { text: "Ada kabupaten yang namanya", at: 0 },
    { text: "gabungan *4* *pulau.*", at: 0.4 },
  ];
  const qa = 2.0,
    qu = t - qa;
  const link = expo((t - 1.55) / 0.7);
  const plate = spring((t - 1.75) / 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: 1 - v, transform: `translateY(${(v * 120).toFixed(1)}px)`, filter: v > 0 ? `blur(${(v * 12).toFixed(1)}px)` : undefined }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: 290, textAlign: "center", color: C.ivory }}>
        {lines.map((L, li) => {
          const words = L.text.split(" ");
          return (
            <div key={li} style={{ fontSize: li ? 92 : 60, fontWeight: li ? 700 : 600, lineHeight: 1.12, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              {words.map((w, wi) => {
                const a = t - L.at - wi * 0.09;
                const u = expo(a / 0.6);
                const bob = a > 0.5 ? Math.sin((t + wi * 0.7) * 3.2) * 4 : 0;
                const m = w.match(/^\*(.+)\*([.,?!]*)$/);
                return (
                  <React.Fragment key={wi}>
                    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0 .05em .14em", margin: "0 -.05em -.14em" }}>
                      <span style={{ display: "inline-block", transform: `translateY(${((1 - u) * 110 + bob).toFixed(1)}%) rotate(${((1 - u) * -6).toFixed(2)}deg)`, color: m ? C.goldLight : undefined, opacity: a > 0 ? 1 : 0 }}>
                        {m ? m[1] + m[2] : w}
                      </span>
                    </span>
                    {wi < words.length - 1 ? " " : null}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
        <div style={{ marginTop: 22, height: 130 }}>
          {qu > -0.02 ? (
            <div
              style={{
                display: "inline-block",
                fontSize: 118,
                fontWeight: 700,
                lineHeight: 1,
                color: C.goldLight,
                letterSpacing: "-0.02em",
                opacity: clamp(qu / 0.12),
                transform: `translateY(${((1 - expo(qu / 0.5)) * 60 + Math.sin(qu * 3) * 5).toFixed(1)}px) scale(${(0.7 + 0.3 * spring(qu / 0.5)).toFixed(3)})`,
              }}
            >
              Di mana?
            </div>
          ) : null}
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="hiGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8e6b8" />
            <stop offset=".55" stopColor="#d2a862" />
            <stop offset="1" stopColor="#7a5a26" />
          </linearGradient>
        </defs>
        {/* garis laut */}
        {[0, 1, 2].map((k) => (
          <path
            key={k}
            d={`M60 ${880 + k * 34} ` + Array.from({ length: 24 }, () => `q 20 ${k % 2 ? 7 : -7} 40 0`).join(" ")}
            transform={`translate(${(Math.sin(t * 1.4 + k) * 14).toFixed(1)} 0)`}
            fill="none"
            stroke={C.gold}
            strokeWidth={1.6}
            opacity={(0.45 - k * 0.12) * clamp((t - 0.3 - k * 0.1) / 0.4)}
          />
        ))}
        {/* garis sambung ke papan nama */}
        {HOOK_ISLES.map((I, i) => {
          // garis putus-putus yang "tumbuh" dari pulau ke papan nama (tiap putus = 1/30 panjang)
          const n = Math.round(link * 15);
          const dash = Array.from({ length: 15 }, (_, k) => (k < n ? "0.0333 0.0333" : "0 0.0666")).join(" ");
          return <path key={i} d={`M${I.x} ${I.y + 10} Q ${(I.x + 540) / 2} 990 540 966`} fill="none" stroke={C.goldLight} strokeWidth={2.5} strokeLinecap="round" pathLength={1} strokeDasharray={dash} opacity={0.9 * clamp(link * 3)} />;
        })}
        {HOOK_ISLES.map((I, i) => {
          const a = t - 0.7 - i * 0.2;
          const u = spring(a / 0.6);
          const rip = clamp(a / 0.9);
          const q = spring((a - 0.25) / 0.5);
          return (
            <g key={i} transform={`translate(${I.x} ${I.y})`} opacity={a > 0 ? 1 : 0}>
              <ellipse rx={50 + 90 * rip} ry={10 + 18 * rip} fill="none" stroke={C.goldLight} strokeWidth={2} opacity={(1 - rip) * 0.8} />
              <g style={{ clipPath: "inset(-200px -200px 0px -200px)" }}>
                <g transform={`translate(0 ${((1 - u) * 50).toFixed(1)}) scale(${I.s})`}>
                  <path d={I.d} fill="url(#hiGold)" stroke="#5e4520" strokeWidth={1.5} />
                  <path d={I.d} fill="#fff" opacity={0.18} transform="translate(-6 -6) scale(.7)" />
                </g>
              </g>
              <g transform={`translate(0 ${(-62 - 10 * Math.sin(t * 3 + i)).toFixed(1)}) scale(${q.toFixed(3)})`}>
                <circle r={26} fill={C.onyx} stroke={C.goldLight} strokeWidth={2.5} />
                <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={700} fontSize={30} fill={C.goldLight}>
                  ?
                </text>
              </g>
            </g>
          );
        })}
        {/* papan nama */}
        <g transform={`translate(540 1010) scale(${plate.toFixed(3)})`} opacity={clamp((t - 1.75) / 0.2)}>
          <rect x={-190} y={-44} width={380} height={88} rx={22} fill={C.onyx} stroke={C.goldLight} strokeWidth={3} />
          <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={700} fontSize={50} letterSpacing="0.3em" fill={C.goldLight}>
            ????
          </text>
        </g>
      </svg>
    </div>
  );
};

/** Ilustrasi kartu Benteng Keraton Buton: dinding batu berkubu melingkar bukit, gerbang di tengah. */
const FortIll: React.FC<{ u: number }> = ({ u }) => {
  const draw = ramp(u, 0.15, 1.1),
    fill = ramp(u, 0.6, 1.2);
  const merlons = "M18 104" + Array.from({ length: 17 }, () => ` h4 v-6 h4 v6`).join("") + " L154 104";
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <linearGradient id="ftW" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8ab92" />
          <stop offset="1" stopColor="#6d634f" />
        </linearGradient>
      </defs>
      <rect y={0} width={172} height={172} fill="#e8dfcb" opacity={0} />
      <path d="M0 150 Q86 96 172 150 L172 172 L0 172Z" fill="#7f9a6a" opacity={fill} />
      <g opacity={fill}>
        <path d="M18 104 L154 104 L154 140 L18 140Z" fill="url(#ftW)" />
        <path d="M74 140 L74 118 Q86 104 98 118 L98 140Z" fill="#2b261d" />
        {[26, 46, 118, 138].map((x) => (
          <rect key={x} x={x} y={112} width={8} height={4} fill="#4c4537" opacity={0.6} />
        ))}
      </g>
      <path d={merlons} fill="none" stroke="#f6e2b6" strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <path d="M18 140 L18 104 M154 140 L154 104" stroke="#f6e2b6" strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      {/* bendera */}
      <g opacity={fill} transform="translate(86 60)">
        <line y1={0} y2={44} stroke="#5e4520" strokeWidth={2} />
        <path d={`M0 0 Q12 ${(4 + 3 * Math.sin(u * 6)).toFixed(1)} 24 0 L24 12 Q12 ${(16 + 3 * Math.sin(u * 6 + 1)).toFixed(1)} 0 12Z`} fill="#b02a2a" />
      </g>
    </svg>
  );
};

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY } = useSurface();
  const photoOn = Math.max(win(t, 13.6, 17.0, 0.45), win(t, 20.2, 27.2, 0.45));
  const factOn = t >= 6.6 && t < 13.8,
    fortOn = t >= 17.0 && t < 20.4,
    ctaOn = t >= 27.1;
  const stP = cam.proj(122.2, -4.1, focusY);
  const wkP = cam.proj(WAKA_C[0], WAKA_C[1], focusY);
  const bnP = cam.proj(BENTENG[0], BENTENG[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  const sylOut = 1 - ramp(t, 10.3, 10.8);
  return (
    <>
      <PlaceLabels show={ramp(t, 3.5, 4.3) * (1 - photoOn) * (1 - win(t, 7.0, 10.6, 0.4))} yMin={300} yMax={ctaOn ? 840 : factOn || fortOn ? 960 : 1400} />
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 7.4, 0.4)} line="#fff1cf" glow={C.gold} />
      {/* Wakatobi: pulau menyala bergantian */}
      {ISLANDS.map((I, i) => {
        const a0 = SYL_AT + i * SYL_STEP;
        const ring = wakaRings.reduce((best, r) => {
          const d = (p: LL) => Math.hypot(p[0] - I.at[0], p[1] - I.at[1]);
          const cen = (rr: LL[]): LL => [rr.reduce((s, p) => s + p[0], 0) / rr.length, rr.reduce((s, p) => s + p[1], 0) / rr.length];
          return d(cen(r)) < d(cen(best)) ? r : best;
        });
        const on = ramp(t, a0, a0 + 0.35) * (1 - ramp(t, 13.4, 14.0));
        return <GlowBorder key={I.syl} rings={[ring]} y={focusY} draw={ramp(t, a0, a0 + 0.5)} opacity={on} line="#fff1cf" glow={C.goldLight} fill={C.gold} fillOpacity={0.35 * on} />;
      })}
      {ISLANDS.map((I, i) => {
        const a = t - SYL_AT - i * SYL_STEP;
        if (a < 0 || sylOut <= 0) return null;
        const p = cam.proj(I.at[0], I.at[1], focusY);
        const u = spring(a / 0.55);
        const side = 1;
        return (
          <div key={I.syl} style={{ position: "absolute", left: p[0], top: p[1], width: 0, height: 0, opacity: sylOut }}>
            <div
              style={{
                position: "absolute",
                left: side < 0 ? -250 : 40,
                top: -64,
                width: 210,
                textAlign: side < 0 ? "right" : "left",
                fontFamily: FONT,
                transform: `translateY(${((1 - u) * 30).toFixed(1)}px) scale(${(0.6 + 0.4 * u).toFixed(3)})`,
                transformOrigin: side < 0 ? "100% 50%" : "0 50%",
                opacity: clamp(a / 0.15),
              }}
            >
              <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: C.goldLight, textShadow: "0 4px 18px rgba(0,0,0,.7)" }}>{I.syl}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: C.ivory, marginTop: 4, textShadow: "0 2px 10px rgba(0,0,0,.8)" }}>
                <span style={{ color: C.goldLight }}>{I.isle.slice(0, 2)}</span>
                {I.isle.slice(2)}
              </div>
            </div>
          </div>
        );
      })}
      <Pulses at={BENTENG} y={focusY} t0={17.3} t1={20.2} radiusDeg={0.04} />
      <Pin id="stg" at={xy(stP)} t0={3.7} t1={6.3} />
      <Card3D
        at={headOf(xy(stP))}
        t0={4.15}
        t1={6.2}
        name="Sulawesi Tenggara"
        ill={(u) => <ShapeIll id="stg" u={u} rings={[sultraRing]} dot={KENDARI} />}
        stats={[
          { icon: "grid", value: 17, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Kendari" },
        ]}
      />
      <Pin id="wkt" at={xy(wkP)} t0={10.75} t1={13.5} />
      <Card3D
        at={headOf(xy(wkP))}
        t0={11.2}
        t1={13.4}
        name="TN Wakatobi"
        ill={(u) => <ShapeIll id="wkt" u={u} rings={wakaRings} fit={wakaRings} />}
        stats={[
          { icon: "star", text: "Sejak 2002" },
          { icon: "grid", value: 942, suffix: " jenis ikan" },
        ]}
      />
      <Pin id="bnt" at={xy(bnP)} t0={17.2} t1={20.2} />
      <Card3D at={headOf(xy(bnP))} t0={17.65} t1={20.1} name="Benteng Keraton Buton" ill={(u) => <FortIll u={u} />} stats={[{ icon: "grid", value: 2740, suffix: " m keliling" }, { icon: "star", text: "12 pintu" }]} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = Math.max(win(t, 13.6, 17.0, 0.45), win(t, 20.2, 27.2, 0.45));
  const factBottom = Math.max(win(t, 6.7, 13.9, 0.4), win(t, 17.1, 20.5, 0.4), ramp(t, 27.0, 27.5));
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={factBottom} full={photoOn} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1250, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.96) 0%, rgba(12,11,10,.92) 62%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      <HookIslands out={2.85} />
      <Kinetic mode="act" t0={9.8} t1={10.6} top={1060} align="center" text="*Wakatobi!*{pop}" />
      <Kinetic mode="act" t0={7.1} t1={9.7} top={1060} step={0.07} text="Empat pulau utamanya{wave} menyumbang suku kata pertama." />
      <Kinetic mode="act" t0={11.1} t1={13.8} top={1060} align="center" text="Taman nasional sejak 2002, cagar biosfer *UNESCO*{rise} sejak 2012." />
      <PhotoCard src={PH.karang.src} credit={PH.karang.credit} shape="polaroid" t0={13.8} t1={17.0} drift={-1} />
      <Kinetic mode="drop" t0={14.25} t1={17.0} top={1200} size={48} weight={500} lineHeight={1.32} text="Lautnya rumah *942* jenis ikan, di kawasan Segitiga Karang dunia." />
      <Kinetic mode="act" t0={17.5} t1={20.4} top={1060} align="right" text="Di Baubau berdiri *Benteng* *Keraton* *Buton,*{pop} kelilingnya 2.740 meter." />
      <PhotoCard src={PH.benteng.src} credit={PH.benteng.credit} shape="arch" t0={20.4} t1={23.8} />
      <Kinetic mode="wipe" t0={20.85} t1={23.8} top={1200} size={48} weight={500} lineHeight={1.32} text="Dicatat *MURI* sebagai benteng terluas di dunia, dengan 12 pintu dan 16 kubu." />
      <PhotoCard src={PH.sinonggi.src} credit={PH.sinonggi.credit} shape="round" t0={23.8} t1={27.0} drift={-1} />
      <Kinetic mode="pop" t0={24.25} t1={27.0} top={1200} size={48} weight={500} lineHeight={1.32} text="*Sinonggi,* sagu kental makanan pokok suku Tolaki, diangkat pakai sumpit bambu." />
      <SiteFinale t0={27.3} open={["Aceh", "Sumatera Selatan", "Sumatera Barat", "Sulawesi Tenggara"]} />
      <Kinetic mode="wave" t0={27.55} t1={99} top={250} size={84} weight={600} lineHeight={1.12} align="center" text="Empat terbuka, *34* lagi. Daerahmu *berikutnya?*" />
      <Kinetic mode="blur" t0={29.0} t1={99} top={1140} size={44} weight={500} lineHeight={1.3} align="center" text="Cek peta yang sudah terbuka di" />
    </AbsoluteFill>
  );
};

/** Blok Ajak (peta progres) + apresiasi Inisiator. Waktu desain video. */
const Ajak: React.FC = () => {
  const k = AJAK_AT;
  return (
    <>
      <ProgressMap t0={k} t1={k + AJAK_MAP} before={["Aceh", "Sumatera Selatan", "Sumatera Barat"]} unlock="Sulawesi Tenggara" at={AJAK_UNLOCK} />
      <Kinetic mode="blur" t0={k + 0.2} t1={k + 3.8} top={240} size={74} lineHeight={1.14} text="Kita *menyeberang* ke Sulawesi. Berikutnya: *Sultra!*" />
      <Kinetic mode="pop" t0={k + 3.95} t1={k + AJAK_MAP - 0.1} top={240} size={74} lineHeight={1.14} text="Daerahmu berikutnya? Tulis di *komentar!*" />
      <InitiatorSpotlight t0={INI_AT} t1={k + AJAK_LEN} handle="resthyanaaaa" comment="Sulawesi Tenggara kk" platform="Instagram" photo="photos/atlas-04/inisiator.jpg" />
      <Kinetic mode="drop" t0={INI_AT + 0.25} t1={k + AJAK_LEN - 0.1} top={230} size={66} lineHeight={1.16} text="Terima kasih *@resthyanaaaa,* Inisiator Sulawesi Tenggara dari Instagram!" />
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

export const ATLAS04 = {
  id: "ATLAS-04",
  title: "Sulawesi Tenggara, kabupaten yang namanya gabungan empat pulau",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};

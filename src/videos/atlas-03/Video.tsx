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
 * ATLAS-03 · Sumatera Barat, jam yang angka empatnya ditulis IIII
 * Hook (gaya baru "jam": kata masuk berdetak seperti jarum detik, muka jam emas tergambar, angka IIII disorot)
 * → AJAK: Aceh + Sumsel terbuka, Sumbar terbuka (2 → 3/38) → INISIATOR @faisichzi "Sumbar min" (izin foto dari user)
 * → Sumbar terangkat + kartu → turun ke 2D di Bukittinggi → pin + kartu Jam Gadang (jawaban) → foto jam (IIII, Big Ben)
 * → Danau Singkarak → foto Istano Basa Pagaruyung (gonjong) → foto rendang → penutup SiteFinale → bumper.
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
  { name: "Bukittinggi", from: 6.6, to: 9.2 },
  { name: "Jam Gadang", from: 9.2, to: 12.6 },
  { name: "Foto Jam", from: 12.6, to: 16.0 },
  { name: "Singkarak", from: 16.0, to: 19.6 },
  { name: "Rumah Gadang", from: 19.6, to: 23.0 },
  { name: "Rendang", from: 23.0, to: 26.4 },
  { name: "Ajakan", from: 26.4, to: 31.6 },
];
export const SCENES: DesignScene[] = [
  STORY_SCENES[0],
  { name: "Ajak", from: AJAK_AT, to: AJAK_AT + AJAK_MAP },
  { name: "Inisiator", from: AJAK_AT + AJAK_MAP, to: AJAK_AT + AJAK_LEN },
  ...STORY_SCENES.slice(1).map((s) => ({ ...s, from: S(s.from), to: S(s.to) })),
];
const STORY_END = 31.6;
const END = S(STORY_END);

const JAM: LL = [100.3693, -0.3051]; // Jam Gadang, Bukittinggi
const SINGKARAK: LL = [100.54, -0.62];
const PADANG: LL = [100.358, -0.958];

const LOOK: MapLook = {
  camera: [
    [0, 100.4, -1.6, 190, 34, -24],
    [3.0, 100.3, -1.2, 155, 36, -14],
    [5.9, 100.3, -1.0, 100, 44, 8],
    [6.9, 100.33, -0.75, 80, 46, 6],
    [8.7, 100.369, -0.302, 9, 89.9, 0],
    [12.4, 100.369, -0.302, 8.5, 89.9, 0],
    [13.4, 100.45, -0.5, 36, 50, 18],
    [16.0, 100.5, -0.58, 34, 50, 18],
    [17.0, 100.54, -0.66, 28, 52, 24],
    [19.6, 100.54, -0.66, 26, 53, 28],
    [26.2, 100.4, -0.9, 70, 44, 40],
    [28.6, 100.2, -1.3, 135, 38, -20],
    [31, 100.1, -1.4, 150, 36, -24],
    [36, 100.0, -1.45, 158, 35, -27],
  ],
  sweep: { a: [98.2, 1.4], b: [102.4, -3.7], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 7.4, 8.5)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 26.2, 27.4)),
  detail: [100.2, 100.75, -0.8, -0.2],
};

const STORY_CUES: SfxCue[] = [
  ...[0.0, 0.25, 0.5, 0.75, 1.0].map((t) => ({ t, s: "pickup" as const, vol: 0.35 })),
  { t: 1.5, s: "magic", vol: 0.7 },
  { t: 1.95, s: "ding", vol: 0.7 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 7.0, s: "woosh", vol: 0.8 },
  { t: 8.4, s: "magic", vol: 0.8 },
  { t: 9.66, s: "key-lock" },
  { t: 10.1, s: "ding", vol: 0.7 },
  { t: 13.1, s: "key-lock" },
  { t: 16.2, s: "woosh", vol: 0.8 },
  { t: 16.9, s: "droplet" },
  { t: 19.8, s: "swoosh" },
  { t: 23.2, s: "pickup", vol: 0.8 },
  { t: 26.6, s: "join" },
  { t: 28.95, s: "ding", vol: 0.6 },
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

const sumbarRing = biggest(MAP.focus);
const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

/* ---------- hook gaya "jam" ---------- */
/**
 * Kata-kata masuk satu per satu seperti jarum detik: berputar dari -80° ke tegak dengan pantulan, tiap kata = satu detak.
 * Di bawahnya muka jam emas tergambar, angka romawi muncul searah jarum jam, jarum berputar cepat lalu berhenti
 * menunjuk angka IIII yang membesar + cincin emas. Pertanyaan "Di mana?" berayun seperti bandul. Keluar: menyusut + buram.
 */
const HookClock: React.FC<{ out: number }> = ({ out }) => {
  const t = useT();
  if (t > out + 0.7) return null;
  const v = inCub((t - out) / 0.45);
  const lines = [
    { text: "Ada jam yang angka", at: 0 },
    { text: "empatnya ditulis *IIII.*", at: 0.55 },
  ];
  const qa = 1.95;
  const qu = t - qa;
  const swing = qu > 0 ? Math.exp(-3.2 * qu) * Math.sin(qu * 11) * 14 : 0;
  // jam
  const cx = 540,
    cy = 905,
    R = 205;
  const ring = expo((t - 0.15) / 0.9);
  const handU = expo((t - 0.3) / 1.4); // jarum berputar lalu berhenti di angka 4
  const minuteA = -720 + handU * (720 + 120); // berhenti tepat di arah angka 4 (120°)
  const hourA = -200 + handU * 260;
  const hi = expo((t - 1.55) / 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: 1 - v, filter: v > 0 ? `blur(${(v * 14).toFixed(1)}px)` : undefined, transform: `scale(${(1 - v * 0.12).toFixed(3)})`, transformOrigin: "540px 700px" }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: 290, textAlign: "center", color: C.ivory }}>
        {lines.map((L, li) => {
          const words = L.text.split(" ");
          return (
            <div key={li} style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              {words.map((w, wi) => {
                const a = t - L.at - wi * 0.13;
                const u = spring(a / 0.55);
                const m = w.match(/^\*(.+)\*([.,?!]*)$/);
                return (
                  <React.Fragment key={wi}>
                    <span
                      style={{
                        display: "inline-block",
                        transformOrigin: "50% 100%",
                        transform: `rotate(${((1 - u) * -80).toFixed(2)}deg)`,
                        opacity: clamp(a / 0.1),
                        color: m ? C.goldLight : undefined,
                        textShadow: m ? `0 0 ${(28 * hi).toFixed(0)}px rgba(239,207,142,.75)` : undefined,
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
        <div style={{ marginTop: 26, height: 140 }}>
          {qu > -0.02 ? (
            <div
              style={{
                display: "inline-block",
                fontSize: 120,
                fontWeight: 700,
                lineHeight: 1,
                color: C.goldLight,
                transformOrigin: "50% -260px",
                transform: `rotate(${swing.toFixed(2)}deg) scale(${(0.6 + 0.4 * expo(qu / 0.4)).toFixed(3)})`,
                opacity: clamp(qu / 0.12),
                letterSpacing: "-0.02em",
              }}
            >
              Di mana?
            </div>
          ) : null}
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <radialGradient id="hkFace" cx="50%" cy="42%" r="60%">
            <stop offset="0" stopColor="#2a241c" />
            <stop offset="1" stopColor="#0f0d0b" />
          </radialGradient>
          <linearGradient id="hkRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6e2b0" />
            <stop offset=".5" stopColor="#c59a55" />
            <stop offset="1" stopColor="#f0d396" />
          </linearGradient>
        </defs>
        <g transform={`translate(${cx} ${cy}) scale(${(0.7 + 0.3 * ring).toFixed(3)})`} opacity={clamp((t - 0.15) / 0.25)}>
          <circle r={R + 20} fill="rgba(216,178,115,.07)" />
          <circle r={R} fill="url(#hkFace)" stroke="url(#hkRim)" strokeWidth={10} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} />
          <circle r={R - 22} fill="none" stroke={C.goldDeep} strokeWidth={1.5} opacity={0.7 * ring} />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i * 6 * Math.PI) / 180;
            const big = i % 5 === 0;
            const r0 = R - 10,
              r1 = R - (big ? 26 : 17);
            return <line key={i} x1={Math.sin(a) * r0} y1={-Math.cos(a) * r0} x2={Math.sin(a) * r1} y2={-Math.cos(a) * r1} stroke={C.gold} strokeWidth={big ? 3 : 1.4} opacity={clamp((ring - i / 60) * 3)} />;
          })}
          {ROMAN.map((n, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const rr = R - 64;
            const u = expo((t - 0.4 - i * 0.07) / 0.4);
            const four = i === 4;
            const s = four ? 1 + 0.75 * hi : 1;
            return (
              <g key={n} transform={`translate(${(Math.sin(a) * rr).toFixed(1)} ${(-Math.cos(a) * rr).toFixed(1)}) scale(${(u * s).toFixed(3)})`}>
                {four ? <circle r={44} fill="rgba(239,207,142,.18)" stroke={C.goldLight} strokeWidth={3} opacity={hi} /> : null}
                <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={four ? 700 : 600} fontSize={34} fill={four ? (hi > 0.1 ? C.goldLight : C.ivory) : C.ivory} opacity={four ? 1 : 1 - 0.45 * hi}>
                  {n}
                </text>
              </g>
            );
          })}
          {[0, 1].map((k) => {
            const r = (t - 1.6 - k * 0.3) / 0.9;
            if (r <= 0 || r >= 1) return null;
            const a = (120 * Math.PI) / 180,
              rr = R - 64;
            return <circle key={k} cx={Math.sin(a) * rr} cy={-Math.cos(a) * rr} r={40 + r * 90} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={(1 - r) * 0.8} />;
          })}
          {/* jarum */}
          <g transform={`rotate(${hourA.toFixed(2)})`}>
            <path d="M-7 14 L0 -98 L7 14 Z" fill={C.goldPale} />
          </g>
          <g transform={`rotate(${minuteA.toFixed(2)})`}>
            <path d="M-4.5 18 L0 -150 L4.5 18 Z" fill={C.goldLight} />
          </g>
          <circle r={11} fill={C.goldLight} stroke={C.ink} strokeWidth={3} />
        </g>
      </svg>
    </div>
  );
};

/** Ilustrasi kartu Jam Gadang: menara putih beratap gonjong, muka jam berdetak. */
const JamIll: React.FC<{ u: number }> = ({ u }) => {
  const rise = expo(u / 0.9),
    fill = ramp(u, 0.5, 1.1);
  const sec = Math.floor(u * 2) * 30;
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <linearGradient id="jgT" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fbf6ea" />
          <stop offset="1" stopColor="#d9cfbb" />
        </linearGradient>
        <linearGradient id="jgR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98a4a" />
          <stop offset="1" stopColor="#7a3f22" />
        </linearGradient>
      </defs>
      <rect y={150} width={172} height={22} fill="#6f8f6a" opacity={0.9} />
      <g transform={`translate(0 ${((1 - rise) * 60).toFixed(1)})`} opacity={clamp(u / 0.3)}>
        {/* badan menara */}
        <rect x={62} y={66} width={48} height={86} fill="url(#jgT)" stroke="#b9ab8e" strokeWidth={1} />
        <rect x={56} y={146} width={60} height={8} fill="#e9e0cc" />
        {/* atap gonjong */}
        <path d="M52 66 Q86 54 120 66 L114 58 Q86 44 58 58 Z" fill="url(#jgR)" opacity={fill} />
        <path d="M58 58 Q60 40 48 22 Q66 34 74 52 Z M114 58 Q112 40 124 22 Q106 34 98 52 Z" fill="url(#jgR)" opacity={fill} />
        <path d="M74 52 Q86 30 98 52 Z" fill="#a85f33" opacity={fill} />
        <line x1={86} y1={36} x2={86} y2={20} stroke="#c59a55" strokeWidth={2} opacity={fill} />
        {/* muka jam */}
        <circle cx={86} cy={88} r={15} fill="#eef3ee" stroke="#6b5a3c" strokeWidth={2} />
        <line x1={86} y1={88} x2={86} y2={78} stroke="#3a2f20" strokeWidth={2} strokeLinecap="round" />
        <line x1={86} y1={88} x2={86} y2={76} stroke="#9c3a2a" strokeWidth={1.2} strokeLinecap="round" transform={`rotate(${sec} 86 88)`} />
        <rect x={80} y={116} width={12} height={22} rx={6} fill="#cfc3a8" />
      </g>
    </svg>
  );
};

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY, waterY } = useSurface();
  const photoOn = Math.max(win(t, 12.4, 16.0, 0.45), win(t, 19.4, 26.4, 0.45));
  const factOn = (t >= 6.6 && t < 12.6) || (t >= 16.0 && t < 19.6),
    ctaOn = t >= 26.3;
  const a2d = ramp(t, 8.0, 8.8) * (1 - ramp(t, 12.4, 13.2));
  const sbP = cam.proj(100.25, -0.95, focusY);
  const jamP = cam.proj(JAM[0], JAM[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  return (
    <>
      <PlaceLabels show={ramp(t, 1.0, 1.8) * (1 - photoOn)} yMin={t < 3.3 ? 1100 : 300} yMax={ctaOn ? 840 : factOn ? 960 : 1400} kabFade={1 - win(t, 7.6, 13.0, 0.4)} />
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 8.0, 0.4)} line="#fff1cf" glow={C.gold} />
      <GlowBorder rings={outer(MAP.features.bkt)} y={focusY} draw={ramp(t, 8.2, 9.2)} opacity={a2d} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.14 * a2d} />
      <Pulses at={JAM} y={focusY} t0={9.5} t1={12.4} radiusDeg={0.008} />
      {/* Danau Singkarak */}
      <GlowBorder rings={outer(MAP.water)} y={waterY} draw={ramp(t, 16.4, 17.4)} opacity={win(t, 16.3, 19.6, 0.4)} line="#e9fbf8" glow={C.waterWave} />
      <Pulses at={SINGKARAK} y={waterY} t0={16.6} t1={19.5} radiusDeg={0.1} />
      <Pin id="sbr" at={xy(sbP)} t0={3.7} t1={6.3} />
      <Card3D
        at={headOf(xy(sbP))}
        t0={4.15}
        t1={6.2}
        name="Sumatera Barat"
        ill={(u) => <ShapeIll id="sbr" u={u} rings={[sumbarRing]} dot={PADANG} />}
        stats={[
          { icon: "grid", value: 19, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Padang" },
        ]}
      />
      <Pin id="jam" at={xy(jamP)} t0={9.3} t1={12.4} />
      <Card3D at={headOf(xy(jamP))} t0={9.75} t1={12.3} name="Jam Gadang" ill={(u) => <JamIll u={u} />} stats={[{ icon: "star", text: "Dibangun 1926" }, { icon: "grid", value: 26, suffix: " m tinggi" }]} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = Math.max(win(t, 12.4, 16.0, 0.45), win(t, 19.4, 26.4, 0.45));
  const factBottom = Math.max(win(t, 6.7, 9.3, 0.4), win(t, 9.4, 12.7, 0.4), win(t, 16.1, 19.7, 0.4), ramp(t, 26.2, 26.7));
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={factBottom} full={photoOn} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1250, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.96) 0%, rgba(12,11,10,.9) 60%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      <HookClock out={2.85} />
      <Kinetic mode="act" t0={6.8} t1={9.2} top={1020} step={0.08} text="Kita turun ke *Bukittinggi,*{rise} kota sejuk di dataran tinggi." />
      <Kinetic mode="act" t0={9.6} t1={12.6} top={1060} align="center" text="Inilah *Jam* *Gadang,*{pop} dibangun 1926, tingginya 26 meter." />
      <PhotoCard src={PH.jam.src} credit={PH.jam.credit} shape="polaroid" t0={12.6} t1={16.0} drift={-1} focus="72% 55%" />
      <Kinetic mode="drop" t0={13.05} t1={16.0} top={1200} size={48} weight={500} lineHeight={1.32} text="Angka empatnya ditulis *IIII,* bukan IV. Mesinnya kembaran mesin *Big* *Ben* di London." />
      <Kinetic mode="act" t0={16.3} t1={19.6} top={1020} align="right" text="Danau *Singkarak*{wave} ±11.200 ha, terbesar{stretch} kedua di Sumatra setelah Toba." />
      <PhotoCard src={PH.istano.src} credit={PH.istano.credit} shape="arch" t0={19.6} t1={23.0} />
      <Kinetic mode="wipe" t0={20.05} t1={23.0} top={1200} size={48} weight={500} lineHeight={1.32} text="Atap *gonjong* rumah gadang meruncing, sering diibaratkan tanduk kerbau. Ini Istano Basa Pagaruyung." />
      <PhotoCard src={PH.rendang.src} credit={PH.rendang.credit} shape="round" t0={23.0} t1={26.2} drift={-1} />
      <Kinetic mode="pop" t0={23.45} t1={26.2} top={1200} size={48} weight={500} lineHeight={1.32} text="*Rendang,* juara makanan terenak dunia versi pembaca CNN, tahun 2011 dan 2017." />
      <SiteFinale t0={26.5} open={["Aceh", "Sumatera Selatan", "Sumatera Barat"]} />
      <Kinetic mode="wave" t0={26.75} t1={99} top={250} size={84} weight={600} lineHeight={1.12} align="center" text="Tiga terbuka, *35* lagi. Daerahmu *berikutnya?*" />
      <Kinetic mode="blur" t0={28.2} t1={99} top={1140} size={44} weight={500} lineHeight={1.3} align="center" text="Cek peta yang sudah terbuka di" />
    </AbsoluteFill>
  );
};

/** Blok Ajak (peta progres) + apresiasi Inisiator. Waktu desain video. */
const Ajak: React.FC = () => {
  const k = AJAK_AT;
  return (
    <>
      <ProgressMap t0={k} t1={k + AJAK_MAP} before={["Aceh", "Sumatera Selatan"]} unlock="Sumatera Barat" at={AJAK_UNLOCK} />
      <Kinetic mode="blur" t0={k + 0.2} t1={k + 3.8} top={240} size={78} lineHeight={1.14} text="Aceh dan Sumsel sudah *terbuka.* Berikutnya: *Sumbar!*" />
      <Kinetic mode="pop" t0={k + 3.95} t1={k + AJAK_MAP - 0.1} top={240} size={74} lineHeight={1.14} text="Daerahmu berikutnya? Tulis di *komentar!*" />
      <InitiatorSpotlight t0={INI_AT} t1={k + AJAK_LEN} handle="faisichzi" comment="Sumbar min" platform="Instagram" photo="photos/atlas-03/inisiator.jpg" />
      <Kinetic mode="drop" t0={INI_AT + 0.25} t1={k + AJAK_LEN - 0.1} top={230} size={70} lineHeight={1.16} text="Terima kasih *@faisichzi,* Inisiator Sumatera Barat dari Instagram!" />
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

export const ATLAS03 = {
  id: "ATLAS-03",
  title: "Sumatera Barat, jam yang angka empatnya ditulis IIII",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};

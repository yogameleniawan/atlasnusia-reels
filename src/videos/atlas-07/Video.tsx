import React from "react";
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../atlas/fonts";
import { C, clamp, expo, FONT, hash, inCub, ramp, spring, win } from "../../atlas/tokens";
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
 * ATLAS-07 · Sulawesi Selatan, lukisan bercerita tertua di dunia (Leang Karampuang, Maros)
 * Hook (gaya baru "cadas": dinding batu gelap, angka raksasa 51.200 tersemprot oker jadi latar, kalimat tersapu kuas,
 * cap tangan oker tersemprot di samping "Di mana?")
 * → AJAK: 6 terbuka, Sulsel terbuka (6 → 7/38) → INISIATOR @hendri.lhendri (YouTube) "Sulawesi Selatan" (izin foto dari user)
 * → Sulsel terangkat + kartu → Maros menyala (bukit kapur) → pin + kartu Leang Karampuang (jawaban) → foto gua
 * → Bulukumba (pinisi, UNESCO 2017) → foto pinisi → foto tongkonan → foto coto Makassar → penutup SiteFinale → bumper.
 */
const MAP = MAP_JSON as unknown as MapData;
const PH = Object.fromEntries((PHOTOS_JSON as { key: string; src: string; credit: string }[]).map((p) => [p.key, p]));
/** provinsi yang sudah terbuka, urutan dibuka (termasuk episode ini) */
const OPEN = ["Aceh", "Sumatera Selatan", "Sumatera Barat", "Sulawesi Tenggara", "Kalimantan Timur", "Sumatera Utara", "Sulawesi Selatan"];

const AJAK_AT = 3.3,
  AJAK_MAP = 6.0,
  AJAK_LEN = 10.6;
const story = (t: number) => (t < AJAK_AT ? t : t < AJAK_AT + AJAK_LEN ? AJAK_AT : t - AJAK_LEN);
const S = (t: number) => (t < AJAK_AT ? t : t + AJAK_LEN);
const STORY_SCENES: DesignScene[] = [
  { name: "Hook", from: 0, to: 3.3 },
  { name: "Provinsi", from: 3.3, to: 6.8 },
  { name: "Maros", from: 6.8, to: 10.0 },
  { name: "Jawaban", from: 10.0, to: 14.6 },
  { name: "Foto Gua", from: 14.6, to: 17.6 },
  { name: "Pinisi", from: 17.6, to: 21.4 },
  { name: "Foto Pinisi", from: 21.4, to: 24.6 },
  { name: "Tongkonan", from: 24.6, to: 27.8 },
  { name: "Coto", from: 27.8, to: 31.4 },
  { name: "Ajakan", from: 31.4, to: 36.6 },
];
export const SCENES: DesignScene[] = [
  STORY_SCENES[0],
  { name: "Ajak", from: AJAK_AT, to: AJAK_AT + AJAK_MAP },
  { name: "Inisiator", from: AJAK_AT + AJAK_MAP, to: AJAK_AT + AJAK_LEN },
  ...STORY_SCENES.slice(1).map((s) => ({ ...s, from: S(s.from), to: S(s.to) })),
];
const STORY_END = 36.6;
const END = S(STORY_END);

const MAKASSAR: LL = [119.43, -5.14];
const KARAMPUANG: LL = [119.67, -4.93]; // perkiraan, kawasan karst Maros
const TANA_BERU: LL = [120.38, -5.63]; // perkiraan, galangan pinisi Bulukumba

const LOOK: MapLook = {
  camera: [
    [0, 120.0, -4.5, 200, 34, -24],
    [3.0, 119.95, -4.3, 165, 36, -14],
    [6.2, 119.9, -4.2, 125, 42, 6],
    [7.4, 119.75, -4.85, 70, 46, 0],
    [9.8, 119.72, -4.92, 52, 50, 4],
    [10.8, 119.68, -4.95, 30, 54, 8],
    [14.4, 119.68, -4.96, 28, 56, 10],
    [17.9, 120.25, -5.35, 62, 48, -6],
    [18.9, 120.3, -5.5, 44, 52, -6],
    [21.2, 120.32, -5.52, 40, 54, -4],
    [28.0, 120.0, -4.4, 100, 42, 20],
    [31.0, 119.95, -4.3, 160, 38, -20],
    [34, 119.9, -4.3, 175, 36, -24],
    [40, 119.9, -4.3, 182, 35, -27],
  ],
  sweep: { a: [117.2, -1.5], b: [123.0, -7.5], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 6.4, 7.4)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 30.6, 31.8)),
  detail: [119.2, 120.7, -5.8, -4.6],
};

const STORY_CUES: SfxCue[] = [
  { t: 0.1, s: "swoosh", vol: 0.7 },
  { t: 0.55, s: "magic", vol: 0.55 },
  { t: 2.05, s: "key-lock", vol: 0.8 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 7.2, s: "woosh", vol: 0.8 },
  { t: 10.96, s: "key-lock" },
  { t: 11.4, s: "magic", vol: 0.8 },
  { t: 14.8, s: "swoosh" },
  { t: 18.0, s: "woosh", vol: 0.8 },
  { t: 18.9, s: "ding", vol: 0.6 },
  { t: 21.6, s: "swoosh", vol: 0.8 },
  { t: 24.8, s: "bamboo" },
  { t: 28.2, s: "pickup", vol: 0.8 },
  { t: 31.6, s: "join" },
  { t: 33.4, s: "ding", vol: 0.6 },
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

const sulselRing = biggest(MAP.focus);

/* ---------- hook gaya "cadas" ---------- */
const OCHRE = "#c4643f";
const OCHRE_DEEP = "#8e3f24";
/** telapak tangan terbuka (dipakai sebagai lubang stensil), ±200 px tinggi, pusat telapak di (0,0) */
const HAND_D =
  "M-46 30 C-52 0 -50 -28 -44 -44 L-46 -112 C-47 -126 -30 -128 -28 -114 L-24 -58 L-20 -134 C-19 -149 -1 -149 -1 -134 L0 -60 L6 -128 C8 -142 25 -141 24 -126 L18 -54 L32 -104 C36 -118 52 -114 49 -99 L36 -36 C46 -48 62 -62 74 -56 C84 -51 80 -40 72 -32 C56 -12 44 14 36 40 C30 62 -38 62 -46 30 Z";
/**
 * Dinding batu gelap. Angka raksasa "51.200" tersemprot oker (titik-titik semprotan lalu menyatu) dan jadi latar.
 * Kalimat tersapu kuas (masker bertepi kasar bergerak dari kiri). Kata "tertua" berwarna oker.
 * Cap tangan: semburan oker membentuk lingkaran, telapak tangan jadi "lubang" gelap (stensil seperti di gua Maros),
 * lalu "Di mana?" muncul di sebelahnya. Keluar: semua memudar ke gelap seperti senter yang diturunkan.
 */
const HookOchre: React.FC<{ out: number }> = ({ out }) => {
  const t = useT();
  if (t > out + 0.7) return null;
  const v = inCub((t - out) / 0.5);
  const spray = clamp((t - 0.05) / 0.9);
  const lines = [
    { text: "Lukisan *bercerita*", at: 0.35, size: 86 },
    { text: "tertua di dunia", at: 0.75, size: 86, ochre: "tertua" },
    { text: "umurnya ±51.200 tahun.", at: 1.15, size: 60 },
  ];
  const hand = t - 1.75;
  const handOn = clamp(hand / 0.5);
  const q = t - 2.05;
  const dots = Array.from({ length: 70 }, (_, i) => {
    const a = hash(i * 3 + 1) * Math.PI * 2,
      r = 120 + 90 * Math.sqrt(hash(i * 7 + 2));
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.95, s: 2 + 5 * hash(i * 11 + 5), at: 1.75 + 0.35 * hash(i * 5 + 3) };
  });
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: 1 - v }}>
      {/* dinding batu: noda gelap-hangat */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <filter id="hoRock">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="9" />
            <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0 0.11  0 0 0 1.4 -0.45" />
          </filter>
          <filter id="hoSpray">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="12" />
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <radialGradient id="hoHalo">
            <stop offset="0.35" stopColor={OCHRE} stopOpacity="0.95" />
            <stop offset="0.75" stopColor={OCHRE_DEEP} stopOpacity="0.55" />
            <stop offset="1" stopColor={OCHRE_DEEP} stopOpacity="0" />
          </radialGradient>
          <mask id="hoHand">
            <rect x={-300} y={-300} width={600} height={600} fill="#fff" />
            <path d={HAND_D} fill="#000" transform="rotate(-14) scale(1.05)" />
          </mask>
        </defs>
        <rect width={1080} height={1500} filter="url(#hoRock)" opacity={0.9 * (1 - ramp(t, 2.9, 3.4))} />
        {/* angka raksasa latar */}
        <text
          x={540}
          y={760}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={330}
          fontWeight={700}
          letterSpacing="-0.04em"
          fill={OCHRE}
          filter="url(#hoSpray)"
          opacity={0.32 * spray}
          style={{ clipPath: `inset(0 ${((1 - expo(spray)) * 100).toFixed(1)}% 0 0)` }}
        >
          51.200
        </text>
        {/* cap tangan oker */}
        {hand > -0.02 ? (
          <g transform={`translate(250 1000) scale(${(0.92 + 0.08 * spring(hand / 0.6)).toFixed(3)})`}>
            <g mask="url(#hoHand)" filter="url(#hoSpray)" opacity={handOn}>
              <circle r={190 * expo(hand / 0.45)} fill="url(#hoHalo)" />
            </g>
            {dots.map((d, i) =>
              t > d.at ? <circle key={i} cx={d.x} cy={d.y} r={d.s} fill={OCHRE} opacity={0.75 * clamp((t - d.at) / 0.12)} /> : null,
            )}
          </g>
        ) : null}
      </svg>
      {/* kalimat tersapu kuas */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 300, textAlign: "center", color: C.ivory }}>
        {lines.map((L, li) => {
          const u = expo((t - L.at) / 0.55);
          const edge = (u * 116 - 8).toFixed(1);
          return (
            <div
              key={li}
              style={{
                fontSize: L.size,
                fontWeight: li === 2 ? 600 : 700,
                lineHeight: 1.16,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                marginTop: li === 2 ? 14 : 0,
                WebkitMaskImage: `linear-gradient(100deg, #000 ${edge}%, transparent ${(Number(edge) + 8).toFixed(1)}%)`,
                maskImage: `linear-gradient(100deg, #000 ${edge}%, transparent ${(Number(edge) + 8).toFixed(1)}%)`,
                color: li === 2 ? "#d9cfbd" : undefined,
              }}
            >
              {L.text.split(" ").map((w, wi) => {
                const m = w.match(/^\*(.+)\*$/);
                const isOchre = L.ochre === w;
                return (
                  <React.Fragment key={wi}>
                    {wi ? " " : null}
                    <span style={{ color: m ? C.goldLight : isOchre ? "#e0805a" : undefined }}>{m ? m[1] : w}</span>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
      {q > -0.02 ? (
        <div
          style={{
            position: "absolute",
            left: 430,
            top: 940,
            fontSize: 112,
            fontWeight: 700,
            lineHeight: 1,
            color: C.goldLight,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            opacity: clamp(q / 0.12),
            transform: `translateX(${((1 - spring(q / 0.6)) * 80).toFixed(1)}px)`,
            filter: q < 0.3 ? `blur(${((1 - q / 0.3) * 8).toFixed(1)}px)` : undefined,
          }}
        >
          Di mana?
        </div>
      ) : null}
    </div>
  );
};

/** Ilustrasi kartu Leang Karampuang: babi hutan + tiga manusia oker tergambar di dinding gua. */
const CaveIll: React.FC<{ u: number }> = ({ u }) => {
  const d1 = ramp(u, 0.2, 1.0),
    d2 = ramp(u, 0.7, 1.4);
  const stroke = { fill: "none", stroke: OCHRE, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1, strokeDasharray: "1 1" };
  const human = (x: number, y: number, s: number, k: number) => (
    <g key={k} transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-26} r={5} fill={OCHRE} opacity={d2} />
      <path d="M0 -20 L0 4 M0 4 L-8 22 M0 4 L8 22 M0 -12 L-12 -2 M0 -12 L12 -18 L20 -34" {...stroke} strokeDashoffset={1 - d2} />
    </g>
  );
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <radialGradient id="cvBg" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#e4cfae" />
          <stop offset="1" stopColor="#a98a62" />
        </radialGradient>
      </defs>
      <rect width={172} height={172} rx={14} fill="url(#cvBg)" />
      {/* babi hutan Sulawesi */}
      <path d="M44 92 C46 70 76 60 104 66 C122 70 132 80 136 90 L146 92 L138 100 C130 108 110 112 88 110 C66 108 46 106 44 92 Z" {...stroke} fill={OCHRE} fillOpacity={0.35 * d1} strokeDashoffset={1 - d1} />
      <path d="M58 108 L54 124 M74 110 L72 126 M108 110 L110 126 M122 106 L126 122 M44 92 L34 86" {...stroke} strokeDashoffset={1 - d1} />
      {human(30, 140, 1, 0)}
      {human(150, 132, 0.9, 1)}
      {human(150, 60, 0.85, 2)}
    </svg>
  );
};

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY } = useSurface();
  const photoOn = Math.max(win(t, 14.4, 17.8, 0.45), win(t, 21.2, 31.4, 0.45));
  const factOn = t >= 6.8 && t < 21.4,
    ctaOn = t >= 31.3;
  const ssP = cam.proj(120.05, -3.9, focusY);
  const cvP = cam.proj(KARAMPUANG[0], KARAMPUANG[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  return (
    <>
      <PlaceLabels show={ramp(t, 3.5, 4.3) * (1 - photoOn)} yMin={300} yMax={ctaOn ? 840 : factOn ? 960 : 1400} kabFade={1 - win(t, 6.8, 21.0, 0.4)} />
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 7.2, 0.4)} line="#fff1cf" glow={C.gold} />
      <GlowBorder rings={outer(MAP.features.maros)} y={focusY} draw={ramp(t, 7.2, 8.4)} opacity={win(t, 7.0, 14.4, 0.4)} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.16 * win(t, 7.0, 14.4, 0.4)} />
      <Pulses at={KARAMPUANG} y={focusY} t0={10.6} t1={14.4} radiusDeg={0.05} />
      <GlowBorder rings={outer(MAP.features.bulukumba)} y={focusY} draw={ramp(t, 18.2, 19.4)} opacity={win(t, 18.0, 21.4, 0.4)} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.16 * win(t, 18.0, 21.4, 0.4)} />
      <Pulses at={TANA_BERU} y={focusY} t0={18.8} t1={21.3} radiusDeg={0.06} />
      <Pin id="sls" at={xy(ssP)} t0={3.7} t1={6.5} />
      <Card3D
        at={headOf(xy(ssP))}
        t0={4.15}
        t1={6.4}
        name="Sulawesi Selatan"
        ill={(u) => <ShapeIll id="sls" u={u} rings={[sulselRing]} dot={MAKASSAR} />}
        stats={[
          { icon: "grid", value: 24, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Makassar" },
        ]}
      />
      <Pin id="krp" at={xy(cvP)} t0={10.5} t1={14.4} />
      <Card3D at={headOf(xy(cvP))} t0={10.95} t1={14.3} name="Leang Karampuang" ill={(u) => <CaveIll u={u} />} stats={[{ icon: "star", prefix: "≥", value: 51200, suffix: " tahun" }]} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = Math.max(win(t, 14.4, 17.8, 0.45), win(t, 21.2, 31.4, 0.45));
  const factBottom = Math.max(win(t, 6.9, 21.5, 0.4), ramp(t, 31.2, 31.7));
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={factBottom} full={photoOn} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1500, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.97) 0%, rgba(12,11,10,.93) 72%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      <HookOchre out={2.85} />
      <Kinetic mode="act" t0={7.2} t1={10.0} top={1060} step={0.07} text="Di *Maros,*{pop} bukit-bukit batu kapur menjulang{rise} tinggi dan penuh gua.{sink}" />
      <Kinetic mode="act" t0={11.2} t1={14.6} top={1060} align="center" text="Di *Leang* *Karampuang*{pop} ada lukisan babi hutan dan tiga manusia, umurnya ≥[51200] tahun." />
      <PhotoCard src={PH.gua.src} credit={PH.gua.credit} shape="polaroid" t0={14.6} t1={17.6} drift={-1} focus="50% 40%" />
      <Kinetic mode="drop" t0={15.05} t1={17.6} top={1200} size={48} weight={500} lineHeight={1.32} text="Guinness mencatatnya sebagai lukisan *bergambar* *tertua* di dunia." />
      <Kinetic mode="act" t0={18.1} t1={21.4} top={1060} align="right" text="Di *Bulukumba*{pop} kapal pinisi dibuat turun-temurun, diakui{rise} UNESCO sejak 2017." />
      <PhotoCard src={PH.pinisi.src} credit={PH.pinisi.credit} shape="woven" t0={21.4} t1={24.6} focus="45% 50%" />
      <Kinetic mode="wipe" t0={21.85} t1={24.6} top={1200} size={48} weight={500} lineHeight={1.32} text="Kapal kayu sebesar ini dirakit dengan tangan, langsung di tepi *pantai.*" />
      <PhotoCard src={PH.tongkonan.src} credit={PH.tongkonan.credit} shape="arch" t0={24.6} t1={27.8} focus="62% 40%" />
      <Kinetic mode="type" t0={25.05} t1={27.8} top={1200} size={48} weight={500} lineHeight={1.32} text="Di Toraja ada *tongkonan,* rumah adat yang atapnya melengkung seperti perahu." />
      <PhotoCard src={PH.coto.src} credit={PH.coto.credit} shape="round" t0={27.8} t1={31.2} drift={-1} focus="40% 45%" />
      <Kinetic mode="pop" t0={28.25} t1={31.2} top={1200} size={48} weight={500} lineHeight={1.32} text="*Coto* *Makassar,* sup daging berbumbu kacang, enak dimakan dengan ketupat." />
      <SiteFinale t0={31.5} open={OPEN} />
      <Kinetic mode="wave" t0={31.75} t1={99} top={250} size={84} weight={600} lineHeight={1.12} align="center" text="Tujuh terbuka, *31* lagi. Daerahmu *berikutnya?*" />
      <Kinetic mode="blur" t0={33.2} t1={99} top={1140} size={44} weight={500} lineHeight={1.3} align="center" text="Cek peta yang sudah terbuka di" />
    </AbsoluteFill>
  );
};

/** Blok Ajak (peta progres) + apresiasi Inisiator. Waktu desain video. */
const Ajak: React.FC = () => {
  const k = AJAK_AT;
  return (
    <>
      <ProgressMap t0={k} t1={k + AJAK_MAP} before={OPEN.slice(0, -1)} unlock="Sulawesi Selatan" at={AJAK_UNLOCK} />
      <Kinetic mode="blur" t0={k + 0.2} t1={k + 3.8} top={240} size={74} lineHeight={1.14} text="Peta makin terang. Sekarang giliran *Sulawesi* *Selatan!*" />
      <Kinetic mode="drop" t0={k + 3.95} t1={k + AJAK_MAP - 0.1} top={240} size={74} lineHeight={1.14} text="Daerahmu belum terbuka? Tulis di *komentar!*" />
      <InitiatorSpotlight t0={INI_AT} t1={k + AJAK_LEN} handle="hendri.lhendri" comment="Sulawesi Selatan" platform="YouTube" photo="photos/atlas-07/inisiator.jpg" />
      <Kinetic mode="pop" t0={INI_AT + 0.25} t1={k + AJAK_LEN - 0.1} top={230} size={68} lineHeight={1.16} text="Terima kasih *@hendri.lhendri,* Inisiator Sulawesi Selatan dari YouTube!" />
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

export const ATLAS07 = {
  id: "ATLAS-07",
  title: "Sulawesi Selatan, lukisan bercerita tertua di dunia",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};

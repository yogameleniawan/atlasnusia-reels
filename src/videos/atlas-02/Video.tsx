import React from "react";
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../atlas/fonts";
import { C, ramp, win } from "../../atlas/tokens";
import { DesignScene, timeline, TimeProvider, useT } from "../../atlas/voice";
import { MapLook, MapWorld, useMap } from "../../atlas/MapStage";
import { biggest, LL, MapData, outer } from "../../atlas/map";
import { CompassHud, GlowBorder, PlaceLabels, Pulses, Scrim, useSurface } from "../../atlas/overlay";
import { Card3D, headOf, Pin, ShapeIll } from "../../atlas/pins";
import { HookLines, Kinetic } from "../../atlas/kinetic";
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
 * ATLAS-02 · Sumatera Selatan, jembatan yang tengahnya bisa naik
 * Hook (teka-teki, gaya HookLines: kata muncul dari balik masker) → AJAK: Aceh sudah terbuka, Sumsel terbuka (1 → 2/38)
 * → INISIATOR: foto profil @tamaaa066 + komentar "Sumsel minn" (izin foto sudah dari user)
 * → Sumsel terangkat + pin & kartu → Sungai Musi → turun ke 2D di Palembang → pin + kartu Jembatan Ampera (jawaban)
 * → foto Ampera → kota tertua (Sriwijaya) → foto songket, pempek → ajakan penutup → bumper.
 *
 * Seperti ATLAS-01: cerita (Story) ditulis di waktu "cerita". Blok Ajak + Inisiator disisipkan di AJAK_AT selama AJAK_LEN.
 */
const MAP = MAP_JSON as unknown as MapData;
const PH = Object.fromEntries((PHOTOS_JSON as { key: string; src: string; credit: string }[]).map((p) => [p.key, p]));

const AJAK_AT = 3.3,
  AJAK_MAP = 6.0, // lama peta progres
  AJAK_LEN = 10.6; // + apresiasi Inisiator
const story = (t: number) => (t < AJAK_AT ? t : t < AJAK_AT + AJAK_LEN ? AJAK_AT : t - AJAK_LEN);
const S = (t: number) => (t < AJAK_AT ? t : t + AJAK_LEN);
const STORY_SCENES: DesignScene[] = [
  { name: "Hook", from: 0, to: 3.3 },
  { name: "Provinsi", from: 3.3, to: 6.6 },
  { name: "Sungai Musi", from: 6.6, to: 9.8 },
  { name: "Palembang", from: 9.8, to: 11.4 },
  { name: "Ampera", from: 11.4, to: 14.8 },
  { name: "Foto Ampera", from: 14.8, to: 18.0 },
  { name: "Kota tertua", from: 18.0, to: 21.4 },
  { name: "Songket", from: 21.4, to: 24.8 },
  { name: "Pempek", from: 24.8, to: 28.2 },
  { name: "Ajakan", from: 28.2, to: 33.4 },
];
export const SCENES: DesignScene[] = [
  STORY_SCENES[0],
  { name: "Ajak", from: AJAK_AT, to: AJAK_AT + AJAK_MAP },
  { name: "Inisiator", from: AJAK_AT + AJAK_MAP, to: AJAK_AT + AJAK_LEN },
  ...STORY_SCENES.slice(1).map((s) => ({ ...s, from: S(s.from), to: S(s.to) })),
];
const STORY_END = 33.4;
const END = S(STORY_END);

const AMPERA: LL = [104.7633, -2.9917]; // Jembatan Ampera, Palembang (perkiraan)
const PAL = MAP.cities.find((c) => c[2] === "Palembang");
const PAL_LL: LL = PAL ? [PAL[0], PAL[1]] : [104.748, -2.978];

const LOOK: MapLook = {
  camera: [
    [0, 104.3, -3.9, 175, 34, -24],
    [3.0, 104.1, -3.5, 140, 36, -14],
    [5.9, 104.0, -3.3, 88, 44, 8],
    [7.2, 104.2, -3.2, 84, 44, 4],
    [9.4, 104.6, -3.05, 46, 52, 10],
    [11.1, 104.75, -2.99, 15, 89.9, 0],
    [14.6, 104.76, -2.99, 14, 89.9, 0],
    [15.6, 104.7, -3.0, 40, 48, 18],
    [18.0, 104.7, -3.0, 44, 48, 18],
    [21.2, 104.75, -2.98, 38, 50, 22],
    [28.0, 104.6, -3.1, 70, 44, 40],
    [30.4, 104.1, -3.4, 120, 38, -20],
    [32, 104.0, -3.45, 135, 36, -24],
    [37, 103.9, -3.5, 142, 35, -27],
  ],
  sweep: { a: [100.6, -0.4], b: [107.6, -6.2], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 9.0, 10.4)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 28.0, 29.2)),
  detail: [104.3, 105.2, -3.4, -2.6],
};

const STORY_CUES: SfxCue[] = [
  { t: 0.2, s: "swoosh" },
  { t: 1.55, s: "magic", vol: 0.7 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 7.2, s: "droplet" },
  { t: 8.3, s: "woosh", vol: 0.8 },
  { t: 9.9, s: "woosh" },
  { t: 10.45, s: "magic", vol: 0.8 },
  { t: 11.86, s: "key-lock" },
  { t: 12.3, s: "magic", vol: 0.8 },
  { t: 15.3, s: "key-lock" },
  { t: 18.55, s: "woosh", vol: 0.7 },
  { t: 19.4, s: "ding", vol: 0.6 },
  { t: 21.6, s: "swoosh" },
  { t: 25.0, s: "pickup", vol: 0.8 },
  { t: 28.4, s: "join" },
  { t: 30.75, s: "ding", vol: 0.6 },
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

const sumselRing = biggest(MAP.focus);

/** Ilustrasi kartu Ampera: dua menara, bagian tengah jembatan naik-turun seperti dulu. */
const AmperaIll: React.FC<{ u: number }> = ({ u }) => {
  const draw = ramp(u, 0.2, 1.1),
    fill = ramp(u, 0.7, 1.3);
  const lift = 0.5 - 0.5 * Math.cos(Math.max(0, u - 1.2) * 2.2);
  const wave = "M-20 0" + " q5 -4 10 0 t10 0".repeat(20);
  const dy = -lift * 34;
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <linearGradient id="gamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7e3b5" />
          <stop offset=".65" stopColor="#c59a55" />
          <stop offset="1" stopColor="#7a5e2e" />
        </linearGradient>
      </defs>
      <rect y={122} width={172} height={50} fill="#5f817c" />
      {[136, 152].map((y, i) => (
        <g key={y} transform={`translate(0 ${y})`}>
          <path d={wave} fill="none" stroke="#cfe3df" strokeWidth={2} opacity={i ? 0.5 : 0.8} transform={`translate(${(((u * 14 + i * 9) % 20) - 20).toFixed(1)} 0)`} />
        </g>
      ))}
      {/* menara */}
      {[48, 112].map((x) => (
        <g key={x} opacity={fill}>
          <rect x={x} y={30} width={12} height={92} rx={2} fill="url(#gamp)" />
          <rect x={x - 2} y={26} width={16} height={8} rx={2} fill="#f6e2b6" />
        </g>
      ))}
      <path d="M48 34 L112 34" stroke="#f6e2b6" strokeWidth={3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      {/* dek samping */}
      <path d="M0 108 L54 108 M118 108 L172 108" stroke="#f6e2b6" strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      {/* bagian tengah yang naik */}
      <g transform={`translate(0 ${dy.toFixed(1)})`} opacity={fill}>
        <rect x={60} y={104} width={52} height={8} rx={2} fill="#f6e2b6" />
        <path d={`M66 104 L66 ${(34 - dy).toFixed(1)} M106 104 L106 ${(34 - dy).toFixed(1)}`} stroke="#e8cf93" strokeWidth={1.5} opacity={0.8} />
      </g>
    </svg>
  );
};

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY, waterY } = useSurface();
  const photoOn = Math.max(win(t, 14.6, 18.0, 0.45), win(t, 21.2, 28.2, 0.45));
  const factOn = (t >= 6.6 && t < 14.8) || (t >= 18.0 && t < 21.4),
    ctaOn = t >= 28.1;
  const a2d = ramp(t, 9.9, 10.6) * (1 - ramp(t, 14.6, 15.4));
  const ssP = cam.proj(104.0, -3.3, focusY);
  const amP = cam.proj(AMPERA[0], AMPERA[1], waterY);
  const palP = cam.proj(PAL_LL[0], PAL_LL[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  return (
    <>
      <PlaceLabels show={ramp(t, 1.0, 1.8) * (1 - photoOn)} yMin={t < 3.3 ? 1080 : 300} yMax={ctaOn ? 840 : factOn ? 960 : 1400} kabFade={1 - win(t, 9.6, 15.0, 0.4)} />
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 10.0, 0.4)} line="#fff1cf" glow={C.gold} />
      {/* Palembang di 2D */}
      <GlowBorder rings={outer(MAP.features.pal)} y={focusY} draw={ramp(t, 10.0, 11.0)} opacity={a2d} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.16 * a2d} />
      <Pulses at={AMPERA} y={focusY} t0={11.7} t1={14.6} radiusDeg={0.03} />
      <Pulses at={PAL_LL} y={focusY} t0={18.5} t1={21.3} radiusDeg={0.12} />
      {/* pin + kartu */}
      <Pin id="sms" at={xy(ssP)} t0={3.7} t1={6.3} />
      <Card3D
        at={headOf(xy(ssP))}
        t0={4.15}
        t1={6.2}
        name="Sumatera Selatan"
        ill={(u) => <ShapeIll id="sms" u={u} rings={[sumselRing]} dot={PAL_LL} />}
        stats={[
          { icon: "grid", value: 17, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Palembang" },
        ]}
      />
      <Pin id="amp" at={xy(amP)} t0={11.5} t1={14.6} />
      <Card3D at={headOf(xy(amP))} t0={11.95} t1={14.5} name="Jembatan Ampera" ill={(u) => <AmperaIll u={u} />} stats={[{ icon: "star", text: "Diresmikan 1965" }]} />
      <Pin id="pal" at={xy(palP)} t0={18.2} t1={21.3} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = Math.max(win(t, 14.6, 18.0, 0.45), win(t, 21.2, 28.2, 0.45));
  const factBottom = Math.max(win(t, 6.7, 9.9, 0.4), win(t, 11.6, 14.9, 0.4), win(t, 18.1, 21.5, 0.4), ramp(t, 28.0, 28.5));
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={factBottom} full={photoOn} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1250, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.95) 0%, rgba(12,11,10,.9) 52%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      {/* hook gaya "masker": kata naik dari balik garis, pertanyaan huruf per huruf */}
      <HookLines
        out={2.9}
        lines={[
          { text: "Ada jembatan yang", at: 0 },
          { text: "tengahnya bisa *naik.*", at: 0.45 },
          { text: "Di mana?", at: 1.45, big: true },
        ]}
      />
      <Kinetic mode="act" t0={6.9} t1={9.8} top={1020} step={0.08} text="*Sungai* *Musi* mengalir{wave} ±[750] km, terpanjang{stretch} kedua di Sumatra." />
      <Kinetic mode="act" t0={11.7} t1={14.8} top={1020} align="center" text="Jembatan *Ampera,*{pop} diresmikan 1965. Dulu bagian tengahnya bisa naik{rise} supaya kapal lewat." />
      <Kinetic mode="act" t0={18.3} t1={21.4} top={1020} align="right" text="Palembang disebut kota *tertua*{rise} di Indonesia, tercatat sejak tahun 682, masa Sriwijaya." />
      <PhotoCard src={PH.ampera.src} credit={PH.ampera.credit} shape="polaroid" t0={14.8} t1={18.0} drift={-1} />
      <Kinetic mode="drop" t0={15.25} t1={18.0} top={1200} size={48} weight={500} lineHeight={1.32} text="Sejak 1970-an tengahnya tak lagi dinaikkan, tapi *Ampera* tetap ikon Palembang." />
      <PhotoCard src={PH.songket.src} credit={PH.songket.credit} shape="woven" t0={21.4} t1={24.8} />
      <Kinetic mode="wipe" t0={21.85} t1={24.8} top={1200} size={48} weight={500} lineHeight={1.32} text="*Songket* *Palembang* ditenun dengan benang emas, dipakai saat upacara adat dan pernikahan." />
      <PhotoCard src={PH.pempek.src} credit={PH.pempek.credit} shape="round" t0={24.8} t1={28.0} drift={-1} />
      <Kinetic mode="pop" t0={25.25} t1={28.0} top={1200} size={48} weight={500} lineHeight={1.32} text="*Pempek,* olahan ikan dan sagu, disantap dengan kuah cuko asam, manis, pedas." />
      {/* penutup: sorot situs atlasnusia.com */}
      <SiteFinale t0={28.3} open={["Aceh", "Sumatera Selatan"]} />
      <Kinetic mode="wave" t0={28.55} t1={99} top={250} size={84} weight={600} lineHeight={1.12} align="center" text="Dua terbuka, *36* lagi. Daerahmu *berikutnya?*" />
      <Kinetic mode="blur" t0={30.0} t1={99} top={1140} size={44} weight={500} lineHeight={1.3} align="center" text="Cek peta yang sudah terbuka di" />
    </AbsoluteFill>
  );
};

/** Blok Ajak (peta progres) + apresiasi Inisiator. Waktu desain video. */
const Ajak: React.FC = () => {
  const k = AJAK_AT;
  return (
    <>
      <ProgressMap t0={k} t1={k + AJAK_MAP} before={["Aceh"]} unlock="Sumatera Selatan" at={AJAK_UNLOCK} />
      <Kinetic mode="blur" t0={k + 0.2} t1={k + 3.8} top={240} size={78} lineHeight={1.14} text="Aceh sudah *terbuka.* Berikutnya pilihan kalian: *Sumsel!*" />
      <Kinetic mode="pop" t0={k + 3.95} t1={k + AJAK_MAP - 0.1} top={240} size={74} lineHeight={1.14} text="Daerahmu berikutnya? Tulis di *komentar!*" />
      <InitiatorSpotlight t0={INI_AT} t1={k + AJAK_LEN} handle="tamaaa066" comment="Sumsel minn" platform="Instagram" photo="photos/atlas-02/inisiator.jpg" />
      <Kinetic mode="drop" t0={INI_AT + 0.25} t1={k + AJAK_LEN - 0.1} top={230} size={70} lineHeight={1.16} text="Terima kasih *@tamaaa066,* Inisiator Sumatera Selatan dari Instagram!" />
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

export const ATLAS02 = {
  id: "ATLAS-02",
  title: "Sumatera Selatan, jembatan yang tengahnya bisa naik",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};

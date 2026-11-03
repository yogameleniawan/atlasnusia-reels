import React from "react";
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../atlas/fonts";
import { C, ramp, win } from "../../atlas/tokens";
import { DesignScene, timeline, TimeProvider, useT } from "../../atlas/voice";
import { MapLook, MapWorld, useMap } from "../../atlas/MapStage";
import { biggest, LL, MapData, outer } from "../../atlas/map";
import { CompassHud, GlowBorder, MapLettering, PlaceLabels, Pulses, Scrim, useSurface } from "../../atlas/overlay";
import { Card3D, headOf, Pin, ShapeIll } from "../../atlas/pins";
import { Kinetic } from "../../atlas/kinetic";
import { HookStack } from "../../atlas/hook";
import { ProgressMap } from "../../atlas/progress";
import { buildSubs, SubPhrase, Subtitles } from "../../atlas/subtitle";
import { Bumper, BUMPER_SECONDS, PhotoCard, Watermark } from "../../atlas/brand";
import { SfxCue, SfxHit } from "../../atlas/sfx";
import MAP_JSON from "./map.json";
import PHOTOS_JSON from "./photos.json";
import { VOICE } from "./voice";

/**
 * ATLAS-01 · Aceh, titik nol Indonesia (episode perkenalan)
 * Hook (teka-teki titik nol) → KENALAN: ini Atlasnusia, peta 38 provinsi masih gelap, Aceh terbuka (0 → 1/38), ajak komentar
 * → Aceh terangkat + pin & kartu → ujung barat → turun ke 2D di Pulau Weh → Tugu Kilometer Nol (jawaban)
 * → foto tugu → Serambi Mekkah (Banda Aceh) → foto Baiturrahman, Saman, mie Aceh → ajakan penutup → bumper.
 *
 * Animasi cerita (Story) ditulis di waktu "cerita" yang belum ada scene Kenalan-nya. Scene Kenalan disisipkan
 * di AJAK_AT selama AJAK_LEN detik: selama itu cerita berhenti di bawah layar perkenalan, sesudahnya geser AJAK_LEN.
 */
const MAP = MAP_JSON as unknown as MapData;
const PH = Object.fromEntries((PHOTOS_JSON as { key: string; src: string; credit: string }[]).map((p) => [p.key, p]));

const AJAK_AT = 3.3,
  AJAK_LEN = 11;
/** waktu desain video → waktu cerita */
const story = (t: number) => (t < AJAK_AT ? t : t < AJAK_AT + AJAK_LEN ? AJAK_AT : t - AJAK_LEN);
/** waktu cerita → waktu desain video */
const S = (t: number) => (t < AJAK_AT ? t : t + AJAK_LEN);
const STORY_SCENES: DesignScene[] = [
  { name: "Hook", from: 0, to: 3.3 },
  { name: "Provinsi", from: 3.3, to: 6.6 },
  { name: "Ujung barat", from: 6.6, to: 9.8 },
  { name: "Pulau Weh", from: 9.8, to: 11.4 },
  { name: "Titik nol", from: 11.4, to: 14.8 },
  { name: "Tugu", from: 14.8, to: 18.0 },
  { name: "Serambi Mekkah", from: 18.0, to: 21.4 },
  { name: "Baiturrahman", from: 21.4, to: 24.8 },
  { name: "Saman", from: 24.8, to: 28.2 },
  { name: "Mie Aceh", from: 28.2, to: 31.4 },
  { name: "Ajakan", from: 31.4, to: 36.6 },
];
export const SCENES: DesignScene[] = [
  STORY_SCENES[0],
  { name: "Kenalan", from: AJAK_AT, to: AJAK_AT + AJAK_LEN },
  ...STORY_SCENES.slice(1).map((s) => ({ ...s, from: S(s.from), to: S(s.to) })),
];
const STORY_END = 36.6;
const END = S(STORY_END); // bumper mulai

const KM0: LL = [95.2168, 5.9059]; // 05°54'21" LU, 95°13'00" BT (detik.com, pengukuran BPPT)
const BANDA = MAP.cities.find((c) => c[2] === "Banda Aceh");
const BANDA_LL: LL = BANDA ? [BANDA[0], BANDA[1]] : [95.32, 5.55];
const WEH = MAP.features.weh;
const [W0, W1] = MAP.axes.weh;

const LOOK: MapLook = {
  camera: [
    [0, 97.0, 3.4, 175, 34, -24],
    [3.0, 96.8, 3.9, 140, 36, -14],
    [5.9, 96.5, 4.5, 82, 44, 8],
    [7.2, 96.2, 4.7, 80, 44, 4],
    [9.4, 95.6, 5.5, 44, 52, 10],
    [11.1, 95.29, 5.84, 15, 89.9, 0],
    [14.6, 95.28, 5.85, 14, 89.9, 0],
    [15.6, 95.34, 5.62, 40, 48, 18],
    [18.0, 95.34, 5.56, 44, 48, 18],
    [21.2, 95.32, 5.55, 38, 50, 22],
    [31.0, 95.5, 5.3, 70, 44, 40],
    [33.4, 96.4, 4.3, 120, 38, -20],
    [35, 96.6, 4.2, 135, 36, -24],
    [40, 96.7, 4.1, 142, 35, -27],
  ],
  sweep: { a: [93.0, 7.2], b: [100.6, 0.9], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 9.0, 10.4)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 31.2, 32.4)),
  detail: [94.9, 96.3, 5.0, 6.2],
};

/** SFX di waktu cerita (detik) saat sesuatu "kena". */
const STORY_CUES: SfxCue[] = [
  { t: 0.2, s: "swoosh" },
  { t: 1.95, s: "magic", vol: 0.7 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 7.45, s: "woosh", vol: 0.8 },
  { t: 8.7, s: "droplet" },
  { t: 9.9, s: "woosh" },
  { t: 10.45, s: "magic", vol: 0.8 },
  { t: 11.86, s: "key-lock" },
  { t: 12.3, s: "magic", vol: 0.8 },
  { t: 15.3, s: "key-lock" },
  { t: 18.55, s: "key-lock" },
  { t: 19.3, s: "woosh", vol: 0.7 },
  { t: 21.6, s: "swoosh" },
  { t: 25.0, s: "swoosh" },
  { t: 28.4, s: "pickup", vol: 0.8 },
  { t: 31.6, s: "join" },
  { t: 34.25, s: "ding", vol: 0.6 },
  { t: STORY_END + 0.01, s: "achievement" },
];
const AJAK_UNLOCK = AJAK_AT + 6.4; // Aceh terbuka di peta progres
const CUES: SfxCue[] = [
  ...STORY_CUES.map((c) => ({ ...c, t: S(c.t) })),
  { t: AJAK_AT + 0.05, s: "swoosh", vol: 0.8 },
  { t: AJAK_AT + 2.85, s: "pickup", vol: 0.7 },
  { t: AJAK_UNLOCK + 0.3, s: "key-lock" },
  { t: AJAK_UNLOCK + 0.4, s: "magic", vol: 0.75 },
  { t: AJAK_UNLOCK + 0.55, s: "ding", vol: 0.8 },
  { t: AJAK_AT + 8.25, s: "join", vol: 0.7 },
];

const acehRing = biggest(MAP.focus);
const wehRings = outer(WEH);

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY } = useSurface();
  const photoOn = Math.max(win(t, 14.6, 18.0, 0.45), win(t, 21.2, 31.4, 0.45));
  const factOn = (t >= 6.6 && t < 14.8) || (t >= 18.0 && t < 21.4),
    ctaOn = t >= 31.3;
  const a2d = ramp(t, 9.9, 10.6) * (1 - ramp(t, 14.6, 15.4));
  const acP = cam.proj(96.5, 4.55, focusY);
  const kmP = cam.proj(KM0[0], KM0[1], focusY);
  const baP = cam.proj(BANDA_LL[0], BANDA_LL[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  return (
    <>
      <PlaceLabels show={ramp(t, 1.0, 1.8) * (1 - photoOn)} yMin={t < 3.3 ? 1080 : 300} yMax={factOn || ctaOn ? 960 : 1400} kabFade={1 - win(t, 9.6, 15.0, 0.4)} />
      {/* Aceh: garis provinsi menyala saat terangkat */}
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 10.0, 0.4)} line="#fff1cf" glow={C.gold} />
      {/* Pulau Weh di 2D */}
      <GlowBorder rings={wehRings} y={focusY} draw={ramp(t, 10.0, 11.0)} opacity={a2d} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.22 * a2d} />
      <MapLettering text="PULAU WEH" a={W1} b={W0} y={focusY} offsetKm={7} t0={10.1} t1={11.5} size={60} />
      <Pulses at={KM0} y={focusY} t0={11.7} t1={14.6} radiusDeg={0.05} />
      <Pulses at={BANDA_LL} y={focusY} t0={18.5} t1={21.3} radiusDeg={0.12} />
      {/* pin + kartu */}
      <Pin id="ace" at={xy(acP)} t0={3.7} t1={6.3} />
      <Card3D
        at={headOf(xy(acP))}
        t0={4.15}
        t1={6.2}
        name="Aceh"
        ill={(u) => <ShapeIll id="ace" u={u} rings={[acehRing]} dot={BANDA_LL} />}
        stats={[
          { icon: "grid", value: 23, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Banda Aceh" },
        ]}
      />
      <Pin id="km0" at={xy(kmP)} t0={11.5} t1={14.6} />
      <Card3D
        at={headOf(xy(kmP))}
        t0={11.95}
        t1={14.5}
        name="Kilometer Nol"
        ill={(u) => <ShapeIll id="km0" u={u} rings={wehRings} dot={KM0} />}
        stats={[{ icon: "star", text: "Ujung barat Indonesia" }]}
      />
      <Pin id="bna" at={xy(baP)} t0={18.2} t1={21.3} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = Math.max(win(t, 14.6, 18.0, 0.45), win(t, 21.2, 31.4, 0.45));
  const factBottom = Math.max(win(t, 6.7, 9.9, 0.4), win(t, 11.6, 14.9, 0.4), win(t, 18.1, 21.5, 0.4), ramp(t, 31.2, 31.7));
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={factBottom} full={photoOn} />
        {/* gelap penuh di atas saat hook, biar kalimat teka-tekinya jadi pusat */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1250, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.95) 0%, rgba(12,11,10,.9) 52%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      <HookStack
        out={2.9}
        lines={[
          { text: "Indonesia", at: 0 },
          { text: "punya *titik* *nol.*", at: 0.4 },
        ]}
        question={{ text: "Di mana?", at: 1.6 }}
      />
      {/* fakta di peta: posisi & gerak beda tiap bagian */}
      <Kinetic mode="act" t0={6.9} t1={9.8} top={1020} step={0.08} text="Aceh ada di ujung *paling* *barat*{stretch} Indonesia, diapit Selat Malaka dan Samudra Hindia.{wave}" />
      <Kinetic mode="act" t0={11.7} t1={14.8} top={1020} align="center" text="Di sini berdiri *Tugu* *Kilometer* *Nol,*{pop} penanda ujung barat{stretch} Indonesia." />
      <Kinetic mode="act" t0={18.3} t1={21.4} top={1020} align="right" text="Aceh dijuluki *Serambi* *Mekkah.*{pop} Dulu jamaah haji singgah di sini sebelum berlayar{stretch} ke Mekkah." />
      {/* foto: bingkai & gerak teks beda tiap foto */}
      <PhotoCard src={PH.km0.src} credit={PH.km0.credit} shape="polaroid" t0={14.8} t1={18.0} drift={-1} />
      <Kinetic mode="drop" t0={15.25} t1={18.0} top={1200} size={48} weight={500} lineHeight={1.32} text="*Tugu* *Kilometer* *Nol* di Iboih, Sabang, diresmikan tahun 1997." />
      <PhotoCard src={PH.masjid.src} credit={PH.masjid.credit} shape="arch" t0={21.4} t1={24.8} focus="50% 40%" />
      <Kinetic mode="type" t0={21.85} t1={24.8} top={1200} size={48} weight={500} lineHeight={1.32} text="*Masjid* *Raya* *Baiturrahman,* dibangun 1879. Saat tsunami 2004, masjid ini tetap berdiri." />
      <PhotoCard src={PH.saman.src} credit={PH.saman.credit} shape="woven" t0={24.8} t1={28.2} />
      <Kinetic mode="wipe" t0={25.25} t1={28.2} top={1200} size={48} weight={500} lineHeight={1.32} text="*Tari* *Saman* dari Gayo: duduk berbaris, tepukannya makin cepat. Warisan budaya UNESCO 2011." />
      <PhotoCard src={PH.mie.src} credit={PH.mie.credit} shape="round" t0={28.2} t1={31.2} drift={-1} />
      <Kinetic mode="pop" t0={28.65} t1={31.2} top={1200} size={48} weight={500} lineHeight={1.32} text="*Mie* *Aceh,* mi tebal berbumbu rempah, digoreng atau berkuah." />
      {/* ajakan penutup: teks saja, huruf bergelombang */}
      <Kinetic mode="wave" t0={31.75} t1={99} top={900} size={92} weight={600} lineHeight={1.12} text="Aceh terbuka, *37* lagi. Daerahmu *berikutnya?*" />
      <Kinetic mode="blur" t0={34.1} t1={99} top={1270} size={46} weight={500} lineHeight={1.3} text="Cek peta yang sudah terbuka di *atlasnusia.com*" />
    </AbsoluteFill>
  );
};

/** Scene Kenalan: perkenalan Atlasnusia + peta 38 provinsi yang masih gelap, Aceh terbuka, ajak komentar. Waktu desain video. */
const Kenalan: React.FC = () => {
  const k = AJAK_AT;
  return (
    <>
      <ProgressMap t0={k} t1={k + AJAK_LEN} before={[]} unlock="Aceh" at={AJAK_UNLOCK} />
      <Kinetic mode="drop" t0={k + 0.2} t1={k + 2.6} top={250} size={84} text="Kenalan dulu, ini *Atlasnusia.*" />
      <Kinetic mode="pop" t0={k + 2.75} t1={k + 5.4} top={250} size={80} lineHeight={1.14} text="[38] provinsi, semuanya masih *gelap.*" />
      <Kinetic mode="blur" t0={k + 5.55} t1={k + 8.0} top={250} size={78} lineHeight={1.14} text="Tiap episode dibuka satu. Hari ini: *Aceh!*" />
      <Kinetic mode="pop" t0={k + 8.15} t1={k + AJAK_LEN - 0.1} top={230} size={70} lineHeight={1.16} text="Sisanya kita buka *bareng.* Tulis daerahmu di *komentar!*" />
    </>
  );
};

const Stage: React.FC<{ subs: SubPhrase[]; toDesign: (f: number) => number }> = ({ subs, toDesign }) => (
  <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
    <TimeProvider toDesign={(f) => story(toDesign(f))}>
      <Story />
    </TimeProvider>
    <TimeProvider toDesign={toDesign}>
      <Kenalan />
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
/** Cover: cerita tanpa scene Kenalan, jadi frame cover (default 165 = pin + kartu Aceh) nggak geser. */
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

export const ATLAS01 = {
  id: "ATLAS-01",
  title: "Aceh, titik nol Indonesia",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};

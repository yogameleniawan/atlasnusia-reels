import React from "react";
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../atlas/fonts";
import { C, ramp, win } from "../../atlas/tokens";
import { DesignScene, timeline, TimeProvider, useT } from "../../atlas/voice";
import { MapLook, MapWorld, useMap } from "../../atlas/MapStage";
import { biggest, centroid, kmPerDeg, LL, MapData, outer } from "../../atlas/map";
import { CompassHud, GlowBorder, MapLettering, Measure, PlaceLabels, Pulses, Scrim, useSurface } from "../../atlas/overlay";
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
 * ATLAS-01 · Danau Toba
 * Hook (teka-teki) → AJAK: peta 38 provinsi, Sumatera Utara terbuka (0 → 1/38), minta penonton bantu buka sisanya
 * → Sumatera Utara terangkat + pin & kartu → turun ke 2D, Danau Toba ditulis di peta
 * → 4 fakta teks kinetik → 4 foto (budaya, tempat, kerajinan, makanan) → ajakan penutup → bumper.
 *
 * Animasi cerita (Story) ditulis di waktu "cerita" yang belum ada scene Ajak-nya. Scene Ajak disisipkan
 * di AJAK_AT selama AJAK_LEN detik: selama itu cerita berhenti di bawah layar ajakan, sesudahnya geser AJAK_LEN.
 */
const MAP = MAP_JSON as unknown as MapData;
const PH = Object.fromEntries((PHOTOS_JSON as { key: string; src: string; credit: string }[]).map((p) => [p.key, p]));

/** Scene desain (detik). name = judul bagian di naskah-dubbing.md, urutannya sama. */
const AJAK_AT = 3.3,
  AJAK_LEN = 5.5;
/** waktu desain video → waktu cerita */
const story = (t: number) => (t < AJAK_AT ? t : t < AJAK_AT + AJAK_LEN ? AJAK_AT : t - AJAK_LEN);
/** waktu cerita → waktu desain video */
const S = (t: number) => (t < AJAK_AT ? t : t + AJAK_LEN);
const STORY_SCENES: DesignScene[] = [
  { name: "Hook", from: 0, to: 3.3 },
  { name: "Provinsi", from: 3.3, to: 6.6 },
  { name: "Masuk Toba", from: 6.6, to: 8.4 },
  { name: "Asal-usul", from: 8.4, to: 11.3 },
  { name: "Ukuran", from: 11.3, to: 14.3 },
  { name: "Samosir", from: 14.3, to: 17.3 },
  { name: "Jawaban", from: 17.3, to: 20.6 },
  { name: "Sigale-gale", from: 20.6, to: 23.8 },
  { name: "Huta Siallagan", from: 23.8, to: 27.0 },
  { name: "Ulos", from: 27.0, to: 30.2 },
  { name: "Arsik", from: 30.2, to: 33.6 },
  { name: "Ajakan", from: 33.6, to: 38.8 },
];
export const SCENES: DesignScene[] = [
  STORY_SCENES[0],
  { name: "Ajak", from: AJAK_AT, to: AJAK_AT + AJAK_LEN },
  ...STORY_SCENES.slice(1).map((s) => ({ ...s, from: S(s.from), to: S(s.to) })),
];
const END = S(38.8); // bumper mulai

const LOOK: MapLook = {
  camera: [
    [0, 99.9, 1.2, 175, 34, -24],
    [3.0, 99.4, 1.9, 140, 36, -14],
    [5.9, 98.95, 2.75, 62, 44, 8],
    [8.0, 98.84, 2.45, 52, 89.9, 0],
    [11.2, 98.84, 2.45, 52, 89.9, 0],
    [14.2, 98.84, 2.45, 53, 89.9, 0],
    [17.2, 98.77, 2.47, 34, 89.9, 0],
    [20.2, 98.79, 2.55, 24, 89.9, 0],
    [22.4, 98.75, 2.6, 70, 48, 20],
    [33.2, 98.85, 2.55, 80, 44, 70],
    [35.6, 99.3, 1.7, 120, 38, -20],
    [37, 99.5, 1.5, 135, 36, -24],
    [41, 99.6, 1.4, 142, 35, -27],
  ],
  sweep: { a: [95.0, 5.8], b: [105.6, -5.9], t0: -0.35, t1: 1.85 },
  lift: (t) => 1.1 * ramp(t, 3.3, 4.5) * (1 - ramp(t, 6.0, 7.6)),
  dim: (t) => 0.72 * ramp(t, 3.3, 4.4) * (1 - ramp(t, 33.4, 34.6)),
  detail: [97.9, 99.9, 1.5, 3.7],
};

const LAKE = MAP.features.lake;
const ISLAND = MAP.features.island;
const [A0, A1] = MAP.axes.lake;
const LAKE_C: LL = [(A0[0] + A1[0]) / 2, (A0[1] + A1[1]) / 2];
const ISL_C = centroid(biggest(ISLAND));
const SIDIHONI: LL = [98.785, 2.635]; // perkiraan, Kec. Ronggur Nihuta
const MEDAN = MAP.cities.find((c) => c[2] === "Medan");
const widthEnds = (() => {
  const { kx, ky } = kmPerDeg(LAKE_C[1]);
  const ax = [(A1[0] - A0[0]) * kx, (A1[1] - A0[1]) * ky],
    L = Math.hypot(ax[0], ax[1]);
  const pn = [-ax[1] / L, ax[0] / L];
  const c: LL = [LAKE_C[0] - 0.03, LAKE_C[1] - 0.06];
  return [
    [c[0] - (pn[0] * 15) / kx, c[1] - (pn[1] * 15) / ky],
    [c[0] + (pn[0] * 15) / kx, c[1] + (pn[1] * 15) / ky],
  ] as [LL, LL];
})();

/** SFX di waktu desain (detik) saat sesuatu "kena". */
const STORY_CUES: SfxCue[] = [
  { t: 0.2, s: "swoosh" },
  { t: 1.95, s: "magic", vol: 0.7 },
  { t: 4.06, s: "key-lock" },
  { t: 4.45, s: "swoosh", vol: 0.8 },
  { t: 6.5, s: "woosh" },
  { t: 7.7, s: "magic", vol: 0.8 },
  { t: 9.38, s: "drum" },
  { t: 9.75, s: "crumble", vol: 0.8 },
  { t: 10.3, s: "droplet" },
  { t: 12.6, s: "ding" },
  { t: 15.26, s: "key-lock" },
  { t: 15.65, s: "woosh", vol: 0.7 },
  { t: 17.96, s: "key-lock" },
  { t: 18.45, s: "magic", vol: 0.8 },
  { t: 20.75, s: "bamboo" },
  { t: 24.15, s: "key-lock" },
  { t: 27.15, s: "swoosh" },
  { t: 30.4, s: "pickup", vol: 0.8 },
  { t: 33.8, s: "join" },
  { t: 36.45, s: "ding", vol: 0.6 },
  { t: 38.81, s: "achievement" },
];
const AJAK_UNLOCK = AJAK_AT + 1.4; // Sumatera Utara terbuka di peta progres
const CUES: SfxCue[] = [
  ...STORY_CUES.map((c) => ({ ...c, t: S(c.t) })),
  { t: AJAK_AT + 0.05, s: "swoosh", vol: 0.8 },
  { t: AJAK_UNLOCK + 0.3, s: "key-lock" },
  { t: AJAK_UNLOCK + 0.4, s: "magic", vol: 0.75 },
  { t: AJAK_UNLOCK + 0.55, s: "ding", vol: 0.8 },
  { t: AJAK_AT + 2.35, s: "pickup", vol: 0.7 },
];

/* ---------- ilustrasi kartu ---------- */
const sumutRing = biggest(MAP.focus);
const lakeOuter = outer(LAKE);
const SidihoniIll: React.FC<{ u: number }> = ({ u }) => {
  const draw = ramp(u, 0.25, 1.25),
    fill = ramp(u, 0.8, 1.4),
    ph = (u * 1.1) % 1;
  const wave = "M-20 0" + " q5 -4 10 0 t10 0".repeat(20);
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <linearGradient id="gsid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7e3b5" />
          <stop offset=".65" stopColor="#c59a55" />
          <stop offset="1" stopColor="#7a5e2e" />
        </linearGradient>
      </defs>
      <rect y={116} width={172} height={60} fill="#5f817c" />
      {[132, 148].map((y, i) => (
        <g key={y} transform={`translate(0 ${y})`}>
          <path d={wave} fill="none" stroke="#cfe3df" strokeWidth={2} opacity={i ? 0.5 : 0.8} transform={`translate(${(((u * 14 + i * 9) % 20) - 20).toFixed(1)} 0)`} />
        </g>
      ))}
      <path d="M14 120 C40 98 54 64 86 54 C118 64 132 98 158 120Z" fill="url(#gsid)" opacity={fill} />
      <path d="M14 120 C40 98 54 64 86 54 C118 64 132 98 158 120" fill="none" stroke="#f6e2b6" strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <ellipse cx={86} cy={60} rx={17} ry={5} fill={C.water} stroke="#fff3d6" strokeWidth={1.5} opacity={fill} />
      <circle cx={86} cy={60} r={4 + 16 * ph} fill="none" stroke="#fff3d6" strokeWidth={2} opacity={(1 - ph) * ramp(u, 1.0, 1.3)} />
    </svg>
  );
};

/* ---------- stage ---------- */
const MapOverlays: React.FC = () => {
  const { t, cam } = useMap();
  const { focusY, waterY } = useSurface();
  const photoOn = win(t, 20.4, 33.6, 0.45);
  const factOn = t >= 8.2 && t < 20.5,
    ctaOn = t >= 33.5;
  const a2d = ramp(t, 6.8, 7.5) * (1 - ramp(t, 20.4, 21.2));
  const smP = cam.proj(99.35, 2.1, focusY);
  const samP = cam.proj(ISL_C[0], ISL_C[1], focusY);
  const sidP = cam.proj(SIDIHONI[0], SIDIHONI[1], focusY);
  const xy = (p: number[]): [number, number] => [p[0], p[1]];
  return (
    <>
      <PlaceLabels show={ramp(t, 1.0, 1.8) * (1 - photoOn)} yMin={t < 3.3 ? 1080 : 300} yMax={factOn || ctaOn ? 960 : 1400} kabFade={1 - win(t, 7.2, 11.3, 0.4)} />
      {/* Sumatera Utara: garis provinsi menyala saat terangkat */}
      <GlowBorder rings={outer(MAP.focus, 40)} y={focusY} draw={ramp(t, 3.3, 4.8)} opacity={win(t, 3.3, 7.2, 0.4)} line="#fff1cf" glow={C.gold} />
      {/* Danau Toba & Samosir */}
      <GlowBorder rings={lakeOuter} y={waterY} draw={ramp(t, 7.0, 8.6)} opacity={a2d} line="#8c6a30" glow={C.gold} />
      <GlowBorder rings={outer(ISLAND)} y={focusY} draw={ramp(t, 14.4, 15.6)} opacity={a2d} line={C.goldDark} glow="#e9cf98" fill={C.gold} fillOpacity={0.34 * win(t, 14.6, 17.6, 0.5)} />
      <Pulses at={LAKE_C} y={waterY} t0={8.6} t1={11.2} />
      <MapLettering text="DANAU TOBA" a={A0} b={A1} y={focusY} offsetKm={22} t0={7.3} t1={11.3} />
      <Measure a={A0} b={A1} y={focusY} offsetKm={22} value={100} unit="km" t0={11.4} t1={14.2} />
      <Measure a={widthEnds[0]} b={widthEnds[1]} y={focusY} offsetKm={0} value={30} unit="km" t0={12.0} t1={14.2} labelSide={-1} />
      {/* pin + kartu */}
      <Pin id="sum" at={xy(smP)} t0={3.7} t1={6.3} />
      <Card3D
        at={headOf(xy(smP))}
        t0={4.15}
        t1={6.2}
        name="Sumatera Utara"
        ill={(u) => <ShapeIll id="sum" u={u} rings={[sumutRing]} inner={[{ rings: lakeOuter, fill: C.water }]} dot={MEDAN ? [MEDAN[0], MEDAN[1]] : undefined} />}
        stats={[
          { icon: "grid", value: 33, suffix: " kab/kota" },
          { icon: "star", text: "Ibu kota Medan" },
        ]}
      />
      <Pin id="sam" at={xy(samP)} t0={14.9} t1={17.25} />
      <Card3D
        at={headOf(xy(samP))}
        t0={15.3}
        t1={17.15}
        name="Pulau Samosir"
        ill={(u) => <ShapeIll id="sam" u={u} rings={outer(ISLAND)} inner={[]} fit={lakeOuter} />}
        stats={[{ icon: "area", prefix: "±", value: 630, suffix: " km²" }]}
      />
      <Pin id="sid" at={xy(sidP)} t0={17.6} t1={20.3} />
      <Card3D at={headOf(xy(sidP))} t0={18.0} t1={20.2} name="Danau Sidihoni" ill={(u) => <SidihoniIll u={u} />} stats={[{ icon: "peak", prefix: "±", value: 1300, suffix: " mdpl" }]} />
    </>
  );
};

const Story: React.FC = () => {
  const t = useT();
  const photoOn = win(t, 20.4, 33.6, 0.45);
  return (
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <MapWorld data={MAP} look={LOOK}>
        <MapOverlays />
        <Scrim top={1 - 0.35 * win(t, 3.4, 7.0, 0.5)} bottom={Math.max(win(t, 8.2, 20.6, 0.4), ramp(t, 33.4, 33.9))} full={photoOn} />
        {/* gelap penuh di atas saat hook, biar kalimat teka-tekinya jadi pusat */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1250, opacity: 1 - ramp(t, 2.9, 3.6), background: "linear-gradient(180deg, rgba(12,11,10,.95) 0%, rgba(12,11,10,.9) 52%, rgba(12,11,10,0) 100%)" }} />
        <CompassHud />
      </MapWorld>
      {/* hook gaya "stack": baris meluncur bergantian kiri-kanan, kata kunci berongga lalu terisi emas */}
      <HookStack
        out={2.9}
        lines={[
          { text: "Ada *danau*", at: 0 },
          { text: "di atas pulau…", at: 0.4 },
          { text: "…dan *pulaunya*", at: 0.95 },
          { text: "di tengah danau.", at: 1.3 },
        ]}
        question={{ text: "Di mana itu?", at: 1.9 }}
      />
      {/* fakta: kata-katanya bergerak sesuai arti, posisi rata kiri/kanan/tengah bergantian */}
      <Kinetic mode="act" t0={8.7} t1={11.3} top={1020} step={0.075} text="Sekitar [74000] tahun lalu, Gunung Toba meletus{burst} *dahsyat.* Kawahnya runtuh,{fall} lalu terisi air.{fill}" />
      <Kinetic mode="act" t0={11.6} t1={14.3} top={1020} step={0.08} text="Panjangnya{stretch} ±[100] km, lebarnya{wide} ±[30] km, dan dalamnya{sink} *lebih* *dari* *500* *meter.*" />
      <Kinetic mode="act" t0={14.6} t1={17.3} top={1020} align="right" text="Di tengahnya ada *Pulau* *Samosir,*{pop} luasnya ±[630] km², hampir seluas Singapura.{swap}" />
      <Kinetic mode="act" t0={17.6} t1={20.4} top={1020} align="center" text="Di puncak Samosir ada *Danau* *Sidihoni.*{rise} Danau{wave} di atas pulau,{rise} di tengah danau.{wave}" />
      {/* foto: bingkai & gerak teks beda tiap foto */}
      <PhotoCard src={PH.sigale.src} credit={PH.sigale.credit} shape="arch" t0={20.6} t1={23.8} focus="50% 10%" />
      <Kinetic mode="type" t0={21.05} t1={23.8} top={1200} size={48} weight={500} lineHeight={1.32} text="Di Samosir ada *Sigale-gale,* boneka kayu seukuran manusia yang dulu ditarikan saat upacara kematian." />
      <PhotoCard src={PH.siallagan.src} credit={PH.siallagan.credit} shape="polaroid" t0={23.8} t1={27.0} drift={-1} focus="50% 35%" />
      <Kinetic mode="drop" t0={24.25} t1={27.0} top={1200} size={48} weight={500} lineHeight={1.32} text="Gerbang *Huta* *Siallagan,* kampung Batak berpagar batu. Di dalamnya ada kursi batu raja berumur [200]+ tahun." />
      <PhotoCard src={PH.ulos.src} credit={PH.ulos.credit} shape="woven" t0={27.0} t1={30.2} />
      <Kinetic mode="wipe" t0={27.45} t1={30.2} top={1200} size={48} weight={500} lineHeight={1.32} text="*Ulos* ditenun dengan tangan, lalu diberikan sebagai tanda kasih sayang dan hormat." />
      <PhotoCard src={PH.arsik.src} credit={PH.arsik.credit} shape="round" t0={30.2} t1={33.4} drift={-1} focus="50% 45%" />
      <Kinetic mode="pop" t0={30.65} t1={33.4} top={1200} size={48} weight={500} lineHeight={1.32} text="*Arsik,* ikan mas berbumbu andaliman, disajikan utuh dari kepala sampai ekor saat acara adat." />
      {/* ajakan penutup: teks saja, huruf bergelombang */}
      <Kinetic mode="wave" t0={33.95} t1={99} top={900} size={92} weight={600} lineHeight={1.12} text="Satu terbuka, *37* lagi. Daerahmu *berikutnya?*" />
      {/* tempat cek peta yang sudah terbuka */}
      <Kinetic mode="blur" t0={36.3} t1={99} top={1270} size={46} weight={500} lineHeight={1.3} text="Cek peta yang sudah terbuka di *atlasnusia.com*" />
    </AbsoluteFill>
  );
};

/** Scene Ajak: peta progres + ajakan buka bareng. Waktu desain video. */
const Ajak: React.FC = () => (
  <>
    <ProgressMap t0={AJAK_AT} t1={AJAK_AT + AJAK_LEN} before={[]} unlock="Sumatera Utara" at={AJAK_UNLOCK} />
    <Kinetic mode="drop" t0={AJAK_AT + 0.2} t1={AJAK_AT + 2.2} top={250} size={84} text="Peta Indonesia ini masih *gelap.*" />
    <Kinetic mode="pop" t0={AJAK_AT + 2.35} t1={AJAK_AT + AJAK_LEN - 0.1} top={230} size={70} lineHeight={1.16} text="Sisanya kita buka *bareng.* Tulis daerahmu di *komentar!*" />
  </>
);

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
/** Cover: cerita tanpa scene Ajak, jadi frame cover (default 165 = pin + kartu provinsi) nggak geser. */
const STORY_DESIGN = timeline(STORY_SCENES, { chunks: [], sync: null }, BUMPER_SECONDS);
const Cover: React.FC = () => (
  <FontGate>
    <AbsoluteFill style={{ background: C.onyx, overflow: "hidden" }}>
      <TimeProvider toDesign={STORY_DESIGN.toDesign}>
        <Story />
        <Watermark until={38.8} />
      </TimeProvider>
    </AbsoluteFill>
  </FontGate>
);

export const ATLAS01 = {
  id: "ATLAS-01",
  title: "Danau Toba",
  component: withTime(TL.toDesign, SUBS),
  cover: Cover,
  coverFrames: STORY_DESIGN.totalFrames,
  totalFrames: TL.totalFrames,
  voice: TL.track,
  sfx: CUES.map((c) => ({ at: TL.toFrame(c.t), s: c.s, vol: c.vol ?? 1 })) as SfxHit[],
};


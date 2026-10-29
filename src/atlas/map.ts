import * as THREE from "three";

/** [lon, lat] */
export type LL = [number, number];
export type Ring = LL[];
/** Satu poligon: ring luar + lubang. */
export type Poly = Ring[];

/**
 * Data peta satu wilayah, dibikin `npm run map` (scripts/prep_map.py) dari
 * geoBoundaries (batas kabupaten/kota) + Natural Earth (pantai, jalan, kota).
 */
export type MapData = {
  bbox: [number, number, number, number]; // lon0, lon1, lat0, lat1
  cen: LL;
  /** daratan di luar provinsi fokus */
  rest: Poly[];
  /** provinsi fokus (yang terangkat) */
  focus: Poly[];
  /** negara tetangga (lempeng gelap) */
  others: Poly[];
  /** danau/perairan darat di provinsi fokus */
  water: Poly[];
  regLines: Ring[];
  provLines: Ring[];
  roads: [number, Ring][]; // [1 = jalan utama, garis]
  cities: [number, number, string, number, number][]; // lon, lat, nama, rank (kecil = penting), di fokus?
  kab: [string, number, number, number, number][]; // nama, lon, lat, luas (derajat²), di fokus?
  /** fitur bernama dari --feature / --island (misal "lake", "island") */
  features: Record<string, Poly[]>;
  /** sumbu terpanjang fitur (--axis), buat garis ukur */
  axes: Record<string, [LL, LL]>;
};

export const K = 10; // 1° = 10 satuan dunia
export const TH = 0.35; // tebal lempeng peta

/** Kunci kamera: [t detik desain, lon, lat, jarak, pitch°, bearing°]. pitch 89.9 = 2D (tegak lurus). */
export type CamKey = [number, number, number, number, number, number];

const ss = (x: number) => {
  x = Math.min(1, Math.max(0, x));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export function camAt(keys: CamKey[], t: number): CamKey {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i],
    b = keys[i + 1];
  const u = ss((t - a[0]) / (b[0] - a[0]));
  return a.map((x, k) => (k === 0 ? t : x + (b[k] - x) * u)) as CamKey;
}

export const world = (cen: LL) => (lon: number, lat: number, y = 0) => new THREE.Vector3((lon - cen[0]) * K, y, -(lat - cen[1]) * K);

/** Kamera three.js untuk waktu t (dipakai lempeng 3D dan semua overlay 2D, jadi selalu pas). */
export function cameraFor(keys: CamKey[], t: number, cen: LL) {
  const key = camAt(keys, t);
  const [, lon, lat, dist, pitch, bear] = key;
  const Wd = world(cen);
  const cam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.5, 1200);
  const tgt = Wd(lon, lat, 0),
    p = THREE.MathUtils.degToRad(pitch),
    b = THREE.MathUtils.degToRad(bear);
  const fwd = new THREE.Vector3(Math.sin(b), 0, -Math.cos(b));
  cam.position.set(tgt.x - fwd.x * Math.cos(p) * dist, Math.sin(p) * dist, tgt.z - fwd.z * Math.cos(p) * dist);
  cam.up.copy(fwd);
  cam.lookAt(tgt);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3();
  /** lon/lat/tinggi → piksel stage [x, y, kedalaman NDC] */
  const proj = (lo: number, la: number, y = TH): [number, number, number] => {
    v.copy(Wd(lo, la, y)).project(cam);
    return [(v.x + 1) * 540, (1 - v.y) * 960, v.z];
  };
  return { cam, key, tgt, proj, dist, pitch, bear, lon, lat };
}
export type CamInfo = ReturnType<typeof cameraFor>;

/** Path SVG dari ring yang diproyeksikan. */
export const ringsPath = (rings: Ring[], proj: CamInfo["proj"], y: number) => {
  let d = "";
  for (const r of rings) {
    r.forEach(([lo, la], i) => {
      const [x, yy] = proj(lo, la, y);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + yy.toFixed(1);
    });
    d += "Z";
  }
  return d;
};
export const outer = (polys: Poly[], minPts = 0) => polys.map((p) => p[0]).filter((r) => r.length > minPts);
export const biggest = (polys: Poly[]) => outer(polys).reduce((a, b) => (a.length > b.length ? a : b));
export const centroid = (r: Ring): LL => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];

/** km per derajat di lintang tertentu. */
export const kmPerDeg = (lat: number) => ({ kx: 111.32 * Math.cos((lat * Math.PI) / 180), ky: 110.6 });

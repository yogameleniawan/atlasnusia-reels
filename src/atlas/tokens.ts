/**
 * Atlasnusia design tokens. Hitam hangat + emas champagne + gading, satu font: Poppins.
 * Warna di stage video ditulis literal dari sini, jangan bikin warna baru per episode.
 */
export const C = {
  onyx: "#0c0b0a", // latar
  panel: "#161412", // bidang gelap kedua (dalam lingkaran foto profil, dsb.)
  ink: "#1d1a15", // teks di atas emas/gading
  ivory: "#f5efe4", // teks utama
  ivorySoft: "#efe6d4", // teks kecil di stage (koordinat)
  bodyText: "#efe8da",
  muted: "#a39880", // teks pelengkap
  gold: "#d8b273", // garis, ornamen, aksen
  goldLight: "#efcf8e", // stabilo, angka, teks emas
  goldPale: "#f6e2b0",
  goldDeep: "#9c7a3f",
  goldDark: "#6e5222", // garis ukur di atas peta gading
  paper: "#e9e2d2", // daratan peta
  water: "#a9c7c3", // air di peta
  waterText: "#6fd3c9", // kata yang "jadi air"
  waterWave: "#9fe3dc",
  lava: "#ffb347", // kata yang "meledak"
  ulosRed: "#8f1d1d",
} as const;

export const FONT = "Poppins, 'Century Gothic', sans-serif";
export const FPS = 30;
export const W = 1080;
export const H = 1920;

/* ---------- easing & helpers (semua dipakai dengan waktu desain T dalam detik) ---------- */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ss = (x: number) => {
  x = clamp(x);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const ramp = (t: number, a: number, b: number) => ss((t - a) / (b - a));
/** naik di [a, a+f], turun di [b-f, b]. */
export const win = (t: number, a: number, b: number, f = 0.35) => Math.min(ramp(t, a, a + f), 1 - ramp(t, b - f, b));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const expo = (x: number) => {
  x = clamp(x);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};
export const inCub = (x: number) => {
  x = clamp(x);
  return x * x * x;
};
export const spring = (x: number) => (x <= 0 ? 0 : 1 - Math.exp(-5.5 * x) * Math.cos(8.5 * x));
export const springSoft = (x: number) => (x <= 0 ? 0 : 1 - Math.exp(-4.2 * x) * Math.cos(10.5 * x));
export const easeBounce = (x: number) => {
  x = clamp(x);
  const n = 7.5625,
    d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
export const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Angka format Indonesia: 74000 → "74.000". */
export const idNum = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Jatuh + 3 pantulan (pin peta, berlian logo). Hasil [tinggi px, skalaX, skalaY]. */
const FALL = 0.36;
const BOUNCES: [number, number, number][] = [
  [0.34, 120, 0.3],
  [0.21, 36, 0.17],
  [0.12, 10, 0.08],
];
export function bounce(tau: number): [number, number, number] {
  if (tau < 0) return [560, 1, 1];
  if (tau < FALL) {
    const u = tau / FALL;
    return [560 * (1 - u * u), 0.92, 1.1];
  }
  let T = FALL,
    amp = 0.3;
  for (const [d, hgt, a] of BOUNCES) {
    if (tau < T + d) {
      const u = (tau - T) / d,
        k = amp * Math.exp(-(tau - T) * 30);
      return [hgt * 4 * u * (1 - u), 1 + k * 0.9, 1 - k];
    }
    T += d;
    amp = a;
  }
  const k = amp * Math.exp(-(tau - T) * 30);
  return [0, 1 + k * 0.9, 1 - k];
}
export const BOUNCE_LAND = FALL;

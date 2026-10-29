import React from "react";
import { bounce, BOUNCE_LAND, C, clamp, expo, FONT, idNum, inCub, lerp, ramp, spring } from "./tokens";
import { useT } from "./voice";
import { Ring } from "./map";

/**
 * Penanda lokasi: pin emas 3D yang jatuh & memantul, lalu kartu 3D bertepi emas yang terbuka di atasnya.
 * Ini pengganti "label judul + subjudul": nama tempat selalu lewat pin + kartu, bukan teks besar-kecil.
 */
export const Pin: React.FC<{ at: [number, number]; t0: number; t1: number; id: string }> = ({ at, t0, t1, id }) => {
  const t = useT();
  const tau = t - t0;
  if (tau < 0 || t > t1 + 0.35) return null;
  const [h, sx, sy] = bounce(tau),
    out = 1 - inCub((t - t1) / 0.3);
  const g = 1 - Math.min(h, 560) / 700;
  const a = tau - BOUNCE_LAND;
  const rip = a > 0 && a < 0.9 ? expo(a / 0.9) : -1;
  return (
    <div style={{ position: "absolute", left: at[0], top: at[1], width: 0, height: 0 }}>
      <svg viewBox="-70 -170 140 200" style={{ position: "absolute", left: -70, top: -170, width: 140, height: 200, overflow: "visible" }} aria-hidden="true">
        <defs>
          <radialGradient id={`pg-${id}`} cx="34%" cy="26%" r="80%">
            <stop offset="0" stopColor="#fff5da" />
            <stop offset=".32" stopColor="#ecc985" />
            <stop offset=".7" stopColor="#b8894a" />
            <stop offset="1" stopColor="#6a4f22" />
          </radialGradient>
          <filter id={`pb-${id}`} x="-50%" y="-200%" width="200%" height="500%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        {rip >= 0 ? <ellipse rx={30 + 110 * rip} ry={10 + 36 * rip} fill="none" stroke={C.goldLight} strokeWidth={3} opacity={(1 - a / 0.9) * 0.9} /> : null}
        <ellipse rx={30} ry={9} fill="#000" filter={`url(#pb-${id})`} transform={`scale(${(g * out).toFixed(3)})`} opacity={0.5 * g * out} />
        <g transform={`translate(0 ${(-h).toFixed(1)}) scale(${(sx * out).toFixed(3)} ${(sy * out).toFixed(3)})`}>
          <path d="M0 0 C-9 -24 -46 -56 -46 -98 A46 46 0 1 1 46 -98 C46 -56 9 -24 0 0Z" fill={`url(#pg-${id})`} stroke="#5e4520" strokeWidth={2} />
          <circle cy={-98} r={21} fill="#0e0d0b" stroke="#f6e2b6" strokeWidth={3} />
          <path d="M0 -110 L9 -98 L0 -86 L-9 -98Z" fill={C.goldLight} />
          <ellipse cx={-18} cy={-118} rx={9} ry={16} fill="#fff" opacity={0.5} transform="rotate(-32 -18 -118)" />
        </g>
      </svg>
    </div>
  );
};

/** Titik kepala pin (buat posisi kartu). */
export const headOf = (xy: [number, number]): [number, number] => [xy[0], xy[1] - 200];

const ICON: Record<string, React.ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9c7a3f" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="#c9a159" stroke="#8a6a30" strokeWidth={1.2} strokeLinejoin="round">
      <path d="M12 2.8l2.7 5.7 6.2.8-4.6 4.3 1.2 6.2L12 16.8l-5.5 3 1.2-6.2-4.6-4.3 6.2-.8z" />
    </svg>
  ),
  area: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9c7a3f" strokeWidth={2.2} strokeLinecap="round">
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
      <rect x="8.5" y="8.5" width="7" height="7" fill="#e6c47f" stroke="none" />
    </svg>
  ),
  peak: (
    <svg viewBox="0 0 24 24" fill="#e6c47f" stroke="#8a6a30" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M2.5 20l7-12 3.8 6 2.2-3 6 9z" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9c7a3f" strokeWidth={2} strokeLinecap="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.6c2.6.2 4.4 2 4.9 5.4" />
    </svg>
  ),
};
export type CardStat = { icon: keyof typeof ICON; text?: string; value?: number; prefix?: string; suffix?: string };

/**
 * Kartu 3D: tepi emas tebal seperti lempengan, terbuka dari rebah ke berdiri (pegas), mengambang, dilewati kilau.
 * ill(u) = ilustrasi 172×172 (u = detik sejak kartu mulai), stats = angka yang menghitung naik.
 */
export const Card3D: React.FC<{ at: [number, number]; t0: number; t1: number; name: string; ill: (u: number) => React.ReactNode; stats: CardStat[]; width?: number }> = ({
  at,
  t0,
  t1,
  name,
  ill,
  stats,
  width = 640,
}) => {
  const t = useT();
  if (t < t0 || t > t1 + 0.4) return null;
  const u = t - t0;
  const x = clamp(at[0], width / 2 + 48, 1080 - width / 2 - 48),
    v = inCub((t - t1) / 0.38);
  const e = spring(u / 0.95),
    sc = 0.5 + 0.5 * expo(u / 0.55);
  const rx = -94 * (1 - e) + 3 * Math.sin(t * 1.7) + 80 * v,
    ry = -6 * Math.cos(t * 1.2) + (at[0] - x) * 0.03,
    ty = -7 * Math.sin(t * 2.1);
  return (
    <div style={{ position: "absolute", left: x, top: at[1], width: 0, height: 0, perspective: 1500, opacity: 1 - v }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, transformStyle: "preserve-3d", transformOrigin: "50% 100%", transform: `translateX(-50%) translateY(${ty.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})` }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: 26,
            padding: "24px 36px 24px 24px",
            whiteSpace: "nowrap",
            background: "linear-gradient(155deg,#fdf8ec 0%,#f3e8d0 55%,#e5d3ad 100%)",
            borderRadius: 28,
            border: "2px solid #edd39f",
            boxShadow:
              "0 1.5px 0 #d6b574, 0 3px 0 #c8a562, 0 4.5px 0 #b99555, 0 6px 0 #aa8749, 0 7.5px 0 #9a793f, 0 9px 0 #8b6c36, 0 10.5px 0 #7c602f, 0 12px 0 #6e5428, 0 40px 60px -12px rgba(0,0,0,.6), inset 0 2px 0 rgba(255,255,255,.85)",
            fontFamily: FONT,
          }}
        >
          <div style={{ width: 172, height: 172, flex: "none", borderRadius: 20, overflow: "hidden", background: "radial-gradient(circle at 32% 28%, #2a261f, #0e0d0b 75%)", boxShadow: "inset 0 0 0 2px rgba(237,211,159,.55), 0 6px 14px -6px rgba(0,0,0,.5)" }}>
            {ill(u)}
          </div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1.08 }}>{name}</div>
            <div style={{ display: "flex", gap: 26, marginTop: 12 }}>
              {stats.map((s, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 27, fontWeight: 500, color: C.goldDark, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ width: 30, height: 30, display: "block" }}>{ICON[s.icon]}</span>
                  <span>
                    {s.prefix ?? ""}
                    {s.value !== undefined ? <b style={{ fontWeight: 600 }}>{idNum(s.value * expo((u - 0.45) / 1.1))}</b> : null}
                    {s.suffix ?? ""}
                    {s.text ?? ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              inset: -2,
              pointerEvents: "none",
              background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,.75) 50%, transparent 62%)",
              transform: `translateX(${lerp(-140, 140, ramp(u, 0.6, 1.5)).toFixed(1)}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* ---------- ilustrasi kartu dari data batas wilayah ---------- */
export function fitter(rings: Ring[], box = 172, pad = 18) {
  const all = rings.flat(),
    xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const k = (box - 2 * pad) / Math.max(x1 - x0, y1 - y0),
    ox = (box - (x1 - x0) * k) / 2,
    oy = (box - (y1 - y0) * k) / 2;
  const f = ([lo, la]: [number, number]): [number, number] => [ox + (lo - x0) * k, oy + (y1 - la) * k];
  const d = (rs: Ring[]) => rs.map((r) => "M" + r.map((p) => f(p).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z").join("");
  return { f, d };
}

/** Siluet wilayah: garis tergambar → terisi emas. extra(u, f) buat titik ibu kota / danau. */
export const ShapeIll: React.FC<{ u: number; rings: Ring[]; inner?: { rings: Ring[]; fill: string }[]; dot?: [number, number]; fit?: Ring[]; id: string }> = ({ u, rings, inner = [], dot, fit, id }) => {
  const F = fitter(fit ?? rings);
  const draw = ramp(u, 0.25, 1.25),
    fill = ramp(u, 0.8, 1.4);
  const dp = dot ? F.f(dot) : null;
  const ph = (u * 1.1) % 1;
  return (
    <svg viewBox="0 0 172 172" width={172} height={172}>
      <defs>
        <linearGradient id={`ill-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e3b5" />
          <stop offset="1" stopColor="#b48a47" />
        </linearGradient>
      </defs>
      <path d={F.d(rings)} fill={`url(#ill-${id})`} opacity={fill} />
      {inner.map((r, i) => (
        <path key={i} d={F.d(r.rings)} fill={r.fill} opacity={fill} />
      ))}
      <path d={F.d(rings)} fill="none" stroke="#f6e2b6" strokeWidth={1.6} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      {dp ? (
        <>
          <circle cx={dp[0]} cy={dp[1]} r={4 + 16 * ph} fill="none" stroke="#fff3d6" strokeWidth={2} opacity={(1 - ph) * ramp(u, 1.0, 1.3)} />
          <circle cx={dp[0]} cy={dp[1]} r={4.5} fill="#fff3d6" stroke={C.goldDark} strokeWidth={1.5} opacity={fill} />
        </>
      ) : null}
    </svg>
  );
};

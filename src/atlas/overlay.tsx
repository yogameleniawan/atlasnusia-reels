import React from "react";
import { useMap } from "./MapStage";
import { kmPerDeg, LL, Ring, ringsPath, TH } from "./map";
import { C, clamp, expo, FONT, inCub, idNum, lerp, ramp, win } from "./tokens";

/**
 * Overlay 2D yang nempel di peta (ikut kamera): label kota & kabupaten, border yang tergambar,
 * denyut, garis ukur, tulisan nama di peta. Semua diproyeksikan dari lon/lat tiap frame.
 */
const Svg: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible", opacity }} aria-hidden="true">
    <defs>
      <filter id="an-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
    </defs>
    {children}
  </svg>
);

/** Tinggi permukaan: fitur di provinsi fokus ikut terangkat. */
export const useSurface = () => {
  const { lift } = useMap();
  return { focusY: TH + lift + 0.02, restY: TH + 0.02, waterY: TH - 0.07 + lift + 0.01 };
};

/** Garis batas yang tergambar (draw 0..1) dengan glow emas. */
export const GlowBorder: React.FC<{ rings: Ring[]; y: number; draw: number; opacity?: number; line?: string; glow?: string; fill?: string; fillOpacity?: number; width?: number }> = ({
  rings,
  y,
  draw,
  opacity = 1,
  line = C.goldDark,
  glow = C.gold,
  fill,
  fillOpacity = 0,
  width = 5,
}) => {
  const { cam, t } = useMap();
  if (opacity <= 0.001) return null;
  const d = ringsPath(rings, cam.proj, y);
  return (
    <Svg opacity={opacity}>
      {fill ? <path d={d} fill={fill} fillOpacity={fillOpacity} /> : null}
      <path d={d} fill="none" stroke={glow} strokeWidth={20} strokeLinejoin="round" filter="url(#an-glow)" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 0.5 + 0.2 * Math.sin(t * 3) : 0} />
      <path d={d} fill="none" stroke={line} strokeWidth={width} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 1 : 0} />
    </Svg>
  );
};

/** Lingkaran denyut di satu titik (penanda "di sini"). */
export const Pulses: React.FC<{ at: LL; y: number; t0: number; t1: number; radiusDeg?: number }> = ({ at, y, t0, t1, radiusDeg = 0.5 }) => {
  const { cam, t } = useMap();
  const on = win(t, t0, t1, 0.4);
  if (on <= 0) return null;
  const c = cam.proj(at[0], at[1], y),
    e = cam.proj(at[0] + radiusDeg, at[1], y);
  const pr = Math.hypot(e[0] - c[0], e[1] - c[1]);
  return (
    <Svg>
      {[0, 1, 2].map((k) => {
        const ph = ((((t - t0) / 1.6 + k / 3) % 1) + 1) % 1;
        return <circle key={k} cx={c[0]} cy={c[1]} r={pr * (0.3 + ph * 0.9)} fill="none" stroke={C.goldDark} strokeWidth={5 * (1 - ph) + 1} opacity={on * (1 - ph)} />;
      })}
    </Svg>
  );
};

/** Garis ukur dengan ujung tegak + label angka yang menghitung naik. a→b dalam lon/lat, digeser offsetKm tegak lurus. */
export const Measure: React.FC<{ a: LL; b: LL; y: number; offsetKm: number; value: number; unit: string; t0: number; t1: number; labelSide?: 1 | -1 }> = ({
  a,
  b,
  y,
  offsetKm,
  value,
  unit,
  t0,
  t1,
  labelSide = 1,
}) => {
  const { cam, t } = useMap();
  const on = win(t, t0, t1, 0.4);
  if (on <= 0) return null;
  const { kx, ky } = kmPerDeg((a[1] + b[1]) / 2);
  const ax = [(b[0] - a[0]) * kx, (b[1] - a[1]) * ky],
    L = Math.hypot(ax[0], ax[1]);
  const pn = [-ax[1] / L, ax[0] / L];
  const o: LL = [(pn[0] * offsetKm) / kx, (pn[1] * offsetKm) / ky];
  const pa = cam.proj(a[0] + o[0], a[1] + o[1], y),
    pb = cam.proj(b[0] + o[0], b[1] + o[1], y);
  const pm = [lerp(pa[0], pb[0], 0.5), lerp(pa[1], pb[1], 0.5)];
  const g = expo((t - t0) / 0.9);
  const ea = [lerp(pm[0], pa[0], g), lerp(pm[1], pa[1], g)],
    eb = [lerp(pm[0], pb[0], g), lerp(pm[1], pb[1], g)];
  const nl = Math.hypot(pb[1] - pa[1], pb[0] - pa[0]) || 1;
  const tk = [((pb[1] - pa[1]) / nl) * 20, (-(pb[0] - pa[0]) / nl) * 20];
  const lab = [pm[0] + tk[0] * 3.4 * labelSide, pm[1] + tk[1] * 3.4 * labelSide];
  const n = Math.round(value * expo((t - t0 - 0.2) / 1.0));
  return (
    <>
      <Svg opacity={on}>
        <g stroke={C.goldDark} strokeWidth={4} strokeLinecap="square">
          <line x1={ea[0]} y1={ea[1]} x2={eb[0]} y2={eb[1]} />
          <line x1={ea[0] - tk[0]} y1={ea[1] - tk[1]} x2={ea[0] + tk[0]} y2={ea[1] + tk[1]} />
          <line x1={eb[0] - tk[0]} y1={eb[1] - tk[1]} x2={eb[0] + tk[0]} y2={eb[1] + tk[1]} />
        </g>
      </Svg>
      <div
        style={{
          position: "absolute",
          left: lab[0],
          top: lab[1],
          transform: "translate(-50%,-50%)",
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 600,
          color: "#f6e5bd",
          background: "rgba(12,11,10,.9)",
          border: "1.5px solid rgba(226,194,138,.7)",
          padding: "6px 20px 8px",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          opacity: on * ramp(t, t0 + 0.6, t0 + 1.0),
        }}
      >
        ±{idNum(n)} {unit}
      </div>
    </>
  );
};

/** Nama ditulis langsung di peta, sejajar garis a→b, huruf muncul satu-satu (gaya peta ukir). */
export const MapLettering: React.FC<{ text: string; a: LL; b: LL; y: number; offsetKm: number; t0: number; t1: number; size?: number }> = ({ text, a, b, y, offsetKm, t0, t1, size = 64 }) => {
  const { cam, t } = useMap();
  if (t < t0 - 0.05 || t > t1 + 0.05) return null;
  const { kx, ky } = kmPerDeg((a[1] + b[1]) / 2);
  const ax = [(b[0] - a[0]) * kx, (b[1] - a[1]) * ky],
    L = Math.hypot(ax[0], ax[1]);
  const pn = [-ax[1] / L, ax[0] / L];
  const off = (km: number): LL => [(pn[0] * km) / kx, (pn[1] * km) / ky];
  const o = off(offsetKm),
    q = off(offsetKm - 5.5);
  const p1 = cam.proj(a[0] + o[0], a[1] + o[1], y),
    p2 = cam.proj(b[0] + o[0], b[1] + o[1], y);
  const ext = (u: number) => [lerp(p1[0], p2[0], u), lerp(p1[1], p2[1], u)];
  const A = ext(-0.12),
    B = ext(1.12);
  const r1 = cam.proj(a[0] + q[0], a[1] + q[1], y),
    r2 = cam.proj(b[0] + q[0], b[1] + q[1], y);
  const id = `let-${text.replace(/\W/g, "")}`;
  let prev = 0;
  return (
    <Svg>
      <path id={id} d={`M${A[0].toFixed(1)} ${A[1].toFixed(1)} L${B[0].toFixed(1)} ${B[1].toFixed(1)}`} fill="none" />
      <path
        d={`M${r1[0].toFixed(1)} ${r1[1].toFixed(1)} L${r2[0].toFixed(1)} ${r2[1].toFixed(1)}`}
        fill="none"
        stroke={C.goldDark}
        strokeWidth={2.5}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - expo((t - t0) / 1.1) + inCub((t - t1 + 0.4) / 0.35)}
      />
      <text style={{ fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: 20, fill: "#3a2e1a", paintOrder: "stroke", stroke: "#ece5d5", strokeWidth: 10, strokeLinejoin: "round" }}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {[...text].map((ch, i) => {
            const u = expo((t - t0 - 0.15 - i * 0.07) / 0.55),
              v = inCub((t - t1 + 0.45 - i * 0.025) / 0.3);
            const dy = -46 * (1 - u) - 46 * v;
            const el = (
              <tspan key={i} dy={(dy - prev).toFixed(2)} opacity={(u * (1 - v)).toFixed(3)}>
                {ch === " " ? "  " : ch}
              </tspan>
            );
            prev = dy;
            return el;
          })}
        </textPath>
      </text>
    </Svg>
  );
};

/**
 * Label kota & kabupaten yang tetap tegak walau peta miring. Tabrakan disembunyikan (yang penting menang).
 * show 0..1, area aman [yMin, yMax] (jangan sampai nutup teks).
 */
export const PlaceLabels: React.FC<{ show: number; yMin: number; yMax: number; kabFade?: number }> = ({ show, yMin, yMax, kabFade = 1 }) => {
  const { data, cam, lift } = useMap();
  if (show < 0.02) return null;
  type L = { lo: number; la: number; inF: number; pri: number; w: number; h: number; kind: "city" | "kab"; name: string; fs: number };
  const list: L[] = [];
  data.cities.forEach(([lo, la, name, rank, inF]) => {
    const fs = rank <= 3 ? 44 : rank <= 6 ? 38 : 33;
    list.push({ lo, la, inF, pri: rank, w: name.length * fs * 0.6 + 22, h: fs, kind: "city", name, fs });
  });
  data.kab.forEach(([name, lo, la, area, inF]) => {
    const nm = name.toUpperCase();
    list.push({ lo, la, inF, pri: 20 - Math.min(area * 40, 10), w: nm.length * 25 * 0.82, h: 25, kind: "kab", name: nm, fs: 25 });
  });
  list.sort((a, b) => a.pri - b.pri);
  const kabOn = clamp((95 - cam.dist) / 25) * kabFade;
  const placed: number[][] = [];
  const out: React.ReactNode[] = [];
  list.forEach((L, i) => {
    const op = show * (L.kind === "kab" ? kabOn : L.pri > 6 ? clamp((150 - cam.dist) / 30) : 1);
    if (op < 0.02) return;
    const [x, y, z] = cam.proj(L.lo, L.la, TH + (L.inF ? lift : 0) + 0.02);
    const x0 = L.kind === "kab" ? x - L.w / 2 : x - 12;
    const b = [x0, y - L.h * 0.7, x0 + L.w, y + L.h * 0.5];
    if (b[0] < 24 || b[2] > 1056 || b[1] < yMin || b[3] > yMax || z > 1) return;
    if (placed.some((q) => !(b[2] < q[0] || b[0] > q[2] || b[3] < q[1] || b[1] > q[3]))) return;
    placed.push([b[0] - 14, b[1] - 10, b[2] + 14, b[3] + 10]);
    const textStyle: React.CSSProperties = { fontFamily: FONT, paintOrder: "stroke", stroke: "#f7f2e7", strokeWidth: 9, strokeLinejoin: "round" };
    out.push(
      <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} opacity={op}>
        {L.kind === "city" ? (
          <>
            <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)" fill={C.ink} stroke="#f7f2e7" strokeWidth={3} />
            <text x={18} y={L.fs * 0.35} fontSize={L.fs} fontWeight={500} fill="#2a2620" style={textStyle}>
              {L.name}
            </text>
          </>
        ) : (
          <text y={L.fs * 0.35} fontSize={L.fs} fontWeight={500} fill="#98896b" textAnchor="middle" letterSpacing="0.14em" style={textStyle}>
            {L.name}
          </text>
        )}
      </g>,
    );
  });
  return <Svg>{out}</Svg>;
};

/* ---------- HUD yang nempel di layar: kompas + koordinat ---------- */
const dms = (v: number, pos: string, neg: string) => {
  const a = Math.abs(v),
    d = Math.floor(a),
    m = Math.floor((a - d) * 60);
  return (
    <>
      {d}°{String(m).padStart(2, "0")}′ <b style={{ fontWeight: 500, color: C.gold }}>{v >= 0 ? pos : neg}</b>
    </>
  );
};
export const CompassHud: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const { cam } = useMap();
  return (
    <div style={{ position: "absolute", right: 64, top: 72, width: 150, opacity }}>
      <svg viewBox="-75 -75 150 150" width={150} height={150} aria-hidden="true">
        <circle r={66} fill="none" stroke={C.gold} strokeOpacity={0.55} strokeWidth={1.5} />
        <circle r={56} fill="none" stroke={C.gold} strokeOpacity={0.35} strokeWidth={6} strokeDasharray="1 4.86" />
        <g transform={`rotate(${(-cam.bear).toFixed(2)})`}>
          <path d="M0-50 L9 0 L0 0Z" fill="#e9cf98" />
          <path d="M0-50 L-9 0 L0 0Z" fill={C.goldDeep} />
          <path d="M0 50 L9 0 L0 0Z M0 50 L-9 0 L0 0Z" fill="none" stroke={C.gold} strokeWidth={1.5} />
          <path d="M-50 0 L0 -5 L0 5Z M50 0 L0 -5 L0 5Z" fill="none" stroke={C.gold} strokeOpacity={0.6} strokeWidth={1.2} />
          <text y={-56} textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize={15} fontWeight={600} fill="#fff1cf">
            U
          </text>
        </g>
        <circle r={4} fill={C.onyx} stroke="#e9cf98" strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", right: 0, top: 160, whiteSpace: "nowrap", textAlign: "right", fontFamily: FONT, fontSize: 23, letterSpacing: "0.14em", color: C.ivorySoft, fontVariantNumeric: "tabular-nums" }}>
        {dms(cam.lat, "LU", "LS")}
        &nbsp;&nbsp;
        {dms(cam.lon, "BT", "BB")}
      </div>
    </div>
  );
};

/** Gradasi gelap di atas & bawah biar teks selalu kebaca di atas peta gading. */
export const Scrim: React.FC<{ top?: number; bottom?: number; full?: number }> = ({ top = 1, bottom = 0, full = 0 }) => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 85% at 50% 48%, transparent 58%, rgba(8,7,6,.7) 100%)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 820, opacity: top, background: "linear-gradient(180deg, rgba(12,11,10,.92) 0%, rgba(12,11,10,.55) 45%, rgba(12,11,10,0) 100%)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1000, opacity: bottom, background: "linear-gradient(0deg, rgba(12,11,10,.97) 0%, rgba(12,11,10,.93) 70%, rgba(12,11,10,0) 100%)" }} />
    <div style={{ position: "absolute", inset: 0, opacity: full, background: "radial-gradient(120% 70% at 50% 40%, rgba(12,11,10,.55), rgba(12,11,10,.92))" }} />
  </>
);

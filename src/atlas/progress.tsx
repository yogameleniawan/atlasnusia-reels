import React from "react";
import { C, FONT, clamp, easeBounce, lerp, ramp, win } from "./tokens";
import { useT } from "./voice";
import INDO from "./indonesia.json";

/**
 * Ajakan di awal video: peta 38 provinsi yang "dibuka bareng penonton" (sama dengan aplikasi peta Atlasnusia).
 * - Provinsi yang sudah terbuka sebelum episode ini: gading.
 * - Provinsi episode ini: menyala lalu terbuka (garis emas tergambar → gading → terangkat + riak).
 * - Sedang diproduksi: garis emas berdenyut. Sisanya gelap.
 * - Angka "N / 38" berganti saat provinsi terbuka, plus "sisa X" dan bar 38 kotak.
 * Teks ajakannya pakai Kinetic terpisah di Video.tsx (biar gaya hurufnya bisa beda tiap episode).
 *
 * Data provinsi: src/atlas/indonesia.json (scripts/prep_provinces.py), proyeksi 1000 × 375,5.
 */
type Prov = { d: string; c: [number, number]; b: [number, number, number, number] };
const P = (INDO as unknown as { p: Record<string, Prov> }).p;
export const PROVINCES = Object.keys(P);

export const ProgressMap: React.FC<{
  t0: number;
  t1: number;
  /** provinsi yang sudah terbuka sebelum episode ini */
  before: string[];
  /** provinsi yang dibuka episode ini */
  unlock: string;
  /** waktu desain provinsi episode ini terbuka */
  at: number;
  prod?: string[];
  top?: number;
}> = ({ t0, t1, before, unlock, at, prod = [], top = 650 }) => {
  const t = useT();
  if (t < t0 - 0.02 || t > t1 + 0.02) return null;
  for (const n of [...before, unlock, ...prod]) if (!P[n]) throw new Error(`ProgressMap: provinsi "${n}" nggak ada di indonesia.json`);
  const on = win(t, t0, t1, 0.4);
  const total = PROVINCES.length;
  const nBefore = before.length;
  const flip = ramp(t, at + 0.45, at + 0.75);
  const nOpen = nBefore + (t >= at + 0.45 ? 1 : 0);

  // tilt ala peta video, masuk dari atas
  const tilt = lerp(36, 22, ramp(t, t0, t0 + 1.4));
  const s = 1.0;
  const draw = ramp(t, at, at + 0.45);
  const fillU = ramp(t, at + 0.35, at + 0.75);
  const lift = easeBounce(clamp((t - at - 0.35) / 0.6));
  const [ux, uy] = P[unlock].c;

  const stOf = (n: string) => (n === unlock ? "now" : before.includes(n) ? "open" : prod.includes(n) ? "prod" : "lock");
  const pulse = 0.55 + 0.45 * Math.sin((t - t0) * 5.5);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: on, fontFamily: FONT }}>
      {/* latar: gelap penuh + kilau emas tipis di tengah */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 38% at 50% 40%, rgba(216,178,115,.13), rgba(12,11,10,0) 70%), ${C.onyx}` }} />
      {/* peta 38 provinsi */}
      <div style={{ position: "absolute", left: 40, top, width: 1000, height: 376, perspective: 1600 }}>
        <svg
          viewBox="0 0 1000 375.5"
          width={1000 * s}
          height={375.5 * s}
          style={{ overflow: "visible", transform: `rotateX(${tilt}deg)`, transformOrigin: "50% 60%" }}
        >
          <defs>
            <linearGradient id="pmIvory" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbf4e3" />
              <stop offset="1" stopColor={C.paper} />
            </linearGradient>
            <filter id="pmGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          {PROVINCES.map((n) => {
            const st = stOf(n);
            if (st === "now") return null;
            const appear = ramp(t, t0 + 0.1 + (P[n].c[0] / 1000) * 0.7, t0 + 0.45 + (P[n].c[0] / 1000) * 0.7);
            const fill = st === "open" ? "url(#pmIvory)" : st === "prod" ? "#3a2f1d" : "#28231c";
            const stroke = st === "open" ? C.gold : st === "prod" ? C.gold : "#6a5e48";
            return (
              <path
                key={n}
                d={P[n].d}
                fill={fill}
                stroke={stroke}
                strokeWidth={st === "lock" ? 0.9 : 1.3}
                strokeLinejoin="round"
                opacity={appear * (st === "prod" ? 0.6 + 0.4 * pulse : 1)}
              />
            );
          })}
          {/* provinsi episode ini */}
          <g style={{ opacity: ramp(t, t0 + 0.2, t0 + 0.6) }}>
            <path d={P[unlock].d} fill={C.goldLight} opacity={0.55 * fillU * (1 - 0.4 * ramp(t, at + 1.2, at + 2))} filter="url(#pmGlow)" transform={`translate(0 ${(-10 * lift).toFixed(2)})`} />
            <path
              d={P[unlock].d}
              fill={fillU > 0 ? "url(#pmIvory)" : "#28231c"}
              fillOpacity={fillU > 0 ? fillU : 1}
              stroke="#1c1915"
              strokeWidth={0}
              transform={`translate(0 ${(-10 * lift).toFixed(2)})`}
            />
            <path
              d={P[unlock].d}
              fill="none"
              stroke={t < at ? "#6a5e48" : "#fff1cf"}
              strokeWidth={t < at ? 0.8 : 1.8}
              pathLength={1}
              strokeDasharray={t < at ? undefined : "1 1"}
              strokeDashoffset={t < at ? undefined : 1 - draw}
              strokeLinejoin="round"
              transform={`translate(0 ${(-10 * lift).toFixed(2)})`}
            />
            {/* riak */}
            {[0, 0.22, 0.44].map((d, i) => {
              const u = clamp((t - at - 0.55 - d) / 1.1);
              if (u <= 0 || u >= 1) return null;
              return <circle key={i} cx={ux} cy={uy} r={8 + 70 * u} fill="none" stroke={C.goldLight} strokeWidth={2.4 * (1 - u)} opacity={1 - u} />;
            })}
          </g>
        </svg>
      </div>

      {/* nama provinsi yang baru terbuka */}
      <div
        style={{
          position: "absolute",
          left: 40 + ux,
          top: top - 96,
          transform: `translate(-20%, ${((1 - ramp(t, at + 0.7, at + 1.05)) * 24).toFixed(1)}px)`,
          opacity: ramp(t, at + 0.7, at + 1.05),
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 20px",
          borderRadius: 999,
          background: C.goldLight,
          color: C.ink,
          fontSize: 32,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 10px 30px -10px rgba(239,207,142,.7)",
        }}
      >
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 7.5-2" />
        </svg>
        {unlock}
      </div>
      {/* angka */}
      <div style={{ position: "absolute", left: 76, right: 76, top: top + 430, display: "flex", alignItems: "flex-end", justifyContent: "space-between", opacity: ramp(t, t0 + 0.5, t0 + 0.9) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <Flip value={nOpen} prev={nBefore} u={flip} size={168} color={C.goldLight} />
          <span style={{ fontSize: 64, fontWeight: 600, color: C.ivory }}>/ {total}</span>
          <span style={{ fontSize: 34, color: C.muted, marginLeft: 6, lineHeight: 1.1 }}>
            provinsi
            <br />
            terbuka
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>sisa</div>
          <Flip value={total - nOpen} prev={total - nBefore} u={flip} size={92} color={C.ivory} />
        </div>
      </div>
      {/* bar 38 kotak */}
      <div style={{ position: "absolute", left: 76, right: 76, top: top + 640, display: "grid", gridTemplateColumns: `repeat(${total}, 1fr)`, gap: 4, opacity: ramp(t, t0 + 0.6, t0 + 1.0) }}>
        {Array.from({ length: total }, (_, i) => {
          const isOpen = i < nBefore;
          const isNow = i === nBefore;
          const isProd = !isOpen && !isNow && i <= nBefore + prod.length;
          const nowU = isNow ? ramp(t, at + 0.55, at + 0.85) : 0;
          return (
            <i
              key={i}
              style={{
                height: 22,
                borderRadius: 4,
                background: isOpen ? C.goldLight : isNow ? `rgba(239,207,142,${0.12 + 0.88 * nowU})` : isProd ? C.goldDeep : "#2a251f",
                opacity: isProd ? 0.55 + 0.45 * pulse : 1,
                boxShadow: isOpen || nowU > 0.5 ? "0 0 14px rgba(239,207,142,.6)" : "none",
                transform: isNow ? `scaleY(${1 + 0.5 * Math.sin(Math.PI * nowU)})` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/** Angka berganti dengan gerak gulung ke atas. */
const Flip: React.FC<{ value: number; prev: number; u: number; size: number; color: string }> = ({ value, prev, u, size, color }) => {
  const show = value === prev ? 1 : u;
  return (
    <span style={{ position: "relative", display: "inline-block", height: size * 1.05, overflow: "hidden", fontSize: size, fontWeight: 600, lineHeight: 1.05, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
      <span style={{ display: "block", transform: `translateY(${(-show * 100).toFixed(1)}%)`, opacity: value === prev ? 0 : 1 - show }}>{prev}</span>
      <span style={{ display: "block", position: "absolute", left: 0, top: 0, transform: `translateY(${((1 - show) * 100).toFixed(1)}%)`, opacity: value === prev ? 1 : show }}>{value}</span>
    </span>
  );
};

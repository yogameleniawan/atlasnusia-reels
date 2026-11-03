import React from "react";
import { C, clamp, expo, FONT, hash, lerp, ramp, spring } from "./tokens";
import { useT } from "./voice";
import { PROV_SHAPES, PROVINCES } from "./progress";
import { MarkSmall } from "./brand";

/**
 * Penutup mewah yang menyorot situs atlasnusia.com (mulai ATLAS-02, dipakai juga ATLAS-01).
 * - Layar menggelap di atas peta (teks selalu kebaca), sinar emas berputar pelan di belakang.
 * - Jendela browser bertepi emas terangkat dari bawah (pegas + miring 3D → tegak): bilah alamat mengetik "atlasnusia.com",
 *   isinya peta 38 provinsi seperti di situs: provinsi yang sudah terbuka menyala gading + denyut, sisanya gelap,
 *   bar progres N / 38. Kursor datang dan mengetuk provinsi terakhir yang terbuka (riak).
 * - Di bawahnya alamat atlasnusia.com besar warna emas solid dengan kilau menyapu berulang + garis emas.
 * - Partikel emas melayang naik.
 * Teks ajakan di atasnya (progres + "Daerahmu berikutnya?") tetap pakai Kinetic di Video.tsx (top ±230, di atas y 520).
 */
export const SiteFinale: React.FC<{
  t0: number;
  /** provinsi yang sudah terbuka termasuk episode ini (nama sesuai indonesia.json), urutan dibuka */
  open: string[];
  site?: string;
}> = ({ t0, open, site = "atlasnusia.com" }) => {
  const t = useT();
  if (t < t0 - 0.05) return null;
  const u = t - t0;
  const dark = ramp(u, 0, 0.5);
  const lift = spring((u - 0.35) / 0.9);
  const tilt = lerp(28, 0, expo((u - 0.35) / 1.0));
  const typed = Math.round(clamp((u - 1.0) / 0.8) * site.length);
  const mapIn = ramp(u, 1.2, 1.7);
  const last = open[open.length - 1];
  const [lx, ly] = PROV_SHAPES[last]?.c ?? [500, 180];
  const tap = u - 2.7; // kursor mengetuk
  const urlIn = spring((u - 1.9) / 0.8);
  const sweep = ((u - 2.4) % 2.6) / 1.1; // kilau berulang
  const total = PROVINCES.length;
  const pulse = 0.5 + 0.5 * Math.sin(u * 4);

  // kursor: masuk dari kanan bawah ke provinsi terakhir di peta mini
  const W = 800,
    mapW = 720,
    mapS = mapW / 1000;
  const cardL = 140,
    cardT = 560;
  const mapL = cardL + (W - mapW) / 2,
    mapT = cardT + 120;
  const tx = mapL + lx * mapS,
    ty = mapT + ly * mapS;
  const cu = expo((u - 2.1) / 0.6);
  const curX = lerp(1000, tx, cu),
    curY = lerp(1300, ty, cu);
  const press = tap > 0 && tap < 0.25 ? 0.85 : 1;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, pointerEvents: "none" }}>
      {/* gelap + cahaya */}
      <div style={{ position: "absolute", inset: 0, opacity: dark, background: `radial-gradient(55% 32% at 50% 47%, rgba(239,207,142,.2), rgba(12,11,10,0) 70%), rgba(12,11,10,.94)` }} />
      {/* sinar berputar */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.11 * ramp(u, 0.4, 1.2) }}>
        <g transform={`rotate(${(u * 8).toFixed(1)} 540 900)`}>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return <path key={i} d={`M540 900 L${540 + Math.cos(a - 0.045) * 1100} ${900 + Math.sin(a - 0.045) * 1100} L${540 + Math.cos(a + 0.045) * 1100} ${900 + Math.sin(a + 0.045) * 1100} Z`} fill={C.goldLight} />;
          })}
        </g>
      </svg>
      {/* partikel emas naik */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: ramp(u, 0.6, 1.2) }}>
        {Array.from({ length: 40 }, (_, i) => {
          const sp = 60 + hash(i * 3) * 90;
          const y = 1500 - ((u * sp + hash(i) * 1200) % 1300);
          const x = 60 + hash(i * 7) * 960 + Math.sin(u * 1.5 + i) * 18;
          return <circle key={i} cx={x} cy={y} r={1.5 + hash(i * 5) * 3} fill="#fff3d4" opacity={0.25 + 0.5 * hash(i * 9)} />;
        })}
      </svg>

      {/* jendela browser */}
      <div style={{ position: "absolute", left: cardL, top: cardT, width: W, perspective: 1600 }}>
        <div
          style={{
            transform: `translateY(${((1 - lift) * 420).toFixed(1)}px) rotateX(${tilt.toFixed(2)}deg)`,
            transformOrigin: "50% 100%",
            opacity: ramp(u, 0.35, 0.6),
            borderRadius: 34,
            padding: 3,
            background: "linear-gradient(140deg, #fff3d4 0%, #d9b06a 30%, #6e5222 55%, #e9cf98 80%, #fff3d4 100%)",
            boxShadow: "0 60px 120px -30px rgba(0,0,0,.95), 0 0 80px -20px rgba(239,207,142,.55)",
          }}
        >
          <div style={{ borderRadius: 31, overflow: "hidden", background: "linear-gradient(180deg,#1c1915,#0e0c0a)" }}>
            {/* bilah atas */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 26px", background: "linear-gradient(180deg,#2a241c,#1a1612)", borderBottom: "1px solid rgba(239,207,142,.25)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 18, height: 18, borderRadius: 9, background: i === 0 ? C.goldLight : "rgba(239,207,142,.35)" }} />
                ))}
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "10px 20px", borderRadius: 999, background: "#0c0b0a", border: "1px solid rgba(239,207,142,.35)", boxShadow: "inset 0 2px 6px rgba(0,0,0,.7)" }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.goldLight} strokeWidth={2.4} strokeLinecap="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <span style={{ fontSize: 34, color: C.ivory, fontWeight: 500, letterSpacing: "0.01em" }}>
                  {site.slice(0, typed)}
                  <span style={{ opacity: typed < site.length && Math.floor(u * 4) % 2 === 0 ? 1 : 0, color: C.goldLight }}>|</span>
                </span>
              </div>
            </div>
            {/* isi: logo kecil + peta + progres, seperti situs */}
            <div style={{ position: "relative", height: 440, padding: "18px 40px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: mapIn }}>
                <MarkSmall size={40} />
                <span style={{ fontSize: 24, letterSpacing: "0.3em", color: C.ivory, fontWeight: 600 }}>
                  ATLAS<span style={{ color: C.goldLight }}>NUSIA</span>
                </span>
              </div>
              <svg viewBox="0 0 1000 375.5" width={mapW} height={375.5 * mapS} style={{ position: "absolute", left: (W - mapW) / 2, top: 70, overflow: "visible", opacity: mapIn }}>
                <defs>
                  <linearGradient id="sfIvory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fbf4e3" />
                    <stop offset="1" stopColor={C.paper} />
                  </linearGradient>
                  <filter id="sfGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="7" />
                  </filter>
                </defs>
                {PROVINCES.map((n) => {
                  const isOpen = open.includes(n);
                  return <path key={n} d={PROV_SHAPES[n].d} fill={isOpen ? "url(#sfIvory)" : "#28231c"} stroke={isOpen ? C.gold : "#5a4f3d"} strokeWidth={isOpen ? 1.6 : 0.8} />;
                })}
                {open.map((n) => (
                  <path key={"g" + n} d={PROV_SHAPES[n].d} fill={C.goldLight} opacity={0.35 + 0.25 * pulse} filter="url(#sfGlow)" />
                ))}
                {tap > 0 &&
                  [0, 0.25].map((d, i) => {
                    const r = clamp((tap - d) / 0.9);
                    return r > 0 && r < 1 ? <circle key={i} cx={lx} cy={ly} r={10 + 70 * r} fill="none" stroke={C.goldLight} strokeWidth={4 * (1 - r)} opacity={1 - r} /> : null;
                  })}
              </svg>
              {/* progres */}
              <div style={{ position: "absolute", left: 40, right: 40, bottom: 26, display: "flex", alignItems: "center", gap: 18, opacity: mapIn }}>
                <span style={{ fontSize: 30, color: C.ivory, fontWeight: 600, whiteSpace: "nowrap" }}>
                  <span style={{ color: C.goldLight }}>{open.length}</span> / {total} terbuka
                </span>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${total}, 1fr)`, gap: 3 }}>
                  {Array.from({ length: total }, (_, i) => (
                    <i key={i} style={{ height: 12, borderRadius: 3, background: i < open.length ? C.goldLight : "#2a251f", boxShadow: i < open.length ? "0 0 10px rgba(239,207,142,.7)" : "none" }} />
                  ))}
                </div>
              </div>
              {/* kilau kaca */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 40%, rgba(255,246,222,.12) 50%, transparent 60%)", transform: `translateX(${lerp(-120, 120, ramp(u, 1.3, 2.3)).toFixed(1)}%)` }} />
            </div>
          </div>
        </div>
      </div>

      {/* kursor mengetuk */}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: curX - 8, top: curY - 4, opacity: ramp(u, 2.1, 2.3) * (1 - ramp(u, 3.6, 4.0)), transform: `scale(${press})`, filter: "drop-shadow(0 6px 10px rgba(0,0,0,.8))" }}>
        <path d="M4 2 L4 19 L8.5 15 L11.5 21.5 L14.5 20 L11.6 13.8 L17.5 13.6 Z" fill={C.ivory} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round" />
      </svg>

      {/* alamat situs besar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1215, textAlign: "center", opacity: clamp(urlIn * 1.4), transform: `translateY(${((1 - urlIn) * 60).toFixed(1)}px)` }}>
        <div style={{ position: "relative", display: "inline-block", fontSize: 104, fontWeight: 700, letterSpacing: "-0.01em", color: C.goldLight, lineHeight: 1.05, textShadow: "0 3px 0 #6e5222, 0 0 40px rgba(239,207,142,.45)" }}>
          {site}
          {/* kilau menyapu: salinan teks putih yang dipotong pita miring */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              color: "#fffaf0",
              textShadow: "none",
              clipPath: `polygon(${(sweep * 100 - 8).toFixed(1)}% 0, ${(sweep * 100 + 4).toFixed(1)}% 0, ${(sweep * 100 - 4).toFixed(1)}% 100%, ${(sweep * 100 - 16).toFixed(1)}% 100%)`,
              opacity: sweep > 0 && sweep < 1.2 ? 0.9 : 0,
            }}
          >
            {site}
          </span>
        </div>
        <div style={{ margin: "14px auto 0", width: lerp(0, 640, expo((u - 2.2) / 0.7)), height: 3, background: `linear-gradient(90deg, transparent, ${C.goldLight}, transparent)` }} />
      </div>
    </div>
  );
};

import React from "react";
import { Img, staticFile } from "remotion";
import { bounce, C, expo, FONT, inCub, lerp, ramp, spring } from "./tokens";
import { useT } from "./voice";

/**
 * Identitas Atlasnusia: simbol "A" (puncak = berlian penanda kota, palang = garis lintang, lingkaran bola dunia
 * + satu garis bujur), watermark pojok, bumper penutup, dan bingkai foto. Jangan digambar ulang dengan bentuk lain.
 */
export const MarkSmall: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
    <circle cx="100" cy="100" r="92" fill="none" stroke={C.gold} strokeWidth={7} />
    <line x1="10" y1="118" x2="190" y2="118" stroke={C.gold} strokeWidth={8} />
    <path d="M54 168 L100 44 L146 168" fill="none" stroke={C.ivory} strokeWidth={16} strokeLinejoin="miter" />
    <path d="M100 10 L114 30 L100 50 L86 30 Z" fill={C.gold} />
  </svg>
);

/** Watermark kiri atas (72, 96), 75%, sepanjang video kecuali bumper. */
export const Watermark: React.FC<{ until: number }> = ({ until }) => {
  const t = useT();
  const o = 0.75 * ramp(t, 0.6, 1.2) * (1 - ramp(t, until - 0.2, until + 0.2));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 72, top: 96, display: "flex", alignItems: "center", gap: 16, opacity: o, fontFamily: FONT, fontSize: 30, fontWeight: 500, letterSpacing: "0.26em", color: C.ivory }}>
      <MarkSmall size={64} />
      <span>ATLASNUSIA</span>
    </div>
  );
};

/** Bumper penutup 4 dtk: lingkaran → bujur → lintang → "A" → berlian jatuh memantul → wordmark → @handle. */
export const Bumper: React.FC<{ t0: number; handle?: string }> = ({ t0, handle = "@atlasnusia" }) => {
  const t = useT();
  const u = t - t0;
  if (u < 0) return null;
  const g = u - 1.45;
  const [h, sx, sy] = g < 0 ? [560, 1, 1] : bounce(g);
  const ls = expo((u - 0.9) / 0.6);
  const w = expo((u - 1.9) / 0.8);
  const sb = ramp(u, 2.6, 3.0);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.onyx, opacity: ramp(u, 0, 0.35), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 620, height: 620, margin: "-560px 0 0 -310px", borderRadius: "50%", background: "radial-gradient(circle, rgba(216,178,115,.3), rgba(216,178,115,0) 70%)", opacity: 0.9 * ramp(u, 1.7, 2.0) - 0.5 * ramp(u, 2.0, 2.8) }} />
      <svg viewBox="0 0 200 200" width={420} height={420} style={{ position: "relative" }} aria-hidden="true">
        <defs>
          <linearGradient id="bmg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={C.goldPale} />
            <stop offset=".5" stopColor={C.gold} />
            <stop offset="1" stopColor={C.goldDeep} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill="none" stroke="url(#bmg)" strokeWidth={3} transform="rotate(-90 100 100)" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ramp(u, 0.15, 1.15)} />
        <ellipse cx="100" cy="100" rx="38" ry="92" fill="none" stroke={C.gold} strokeOpacity={0.35} strokeWidth={1.5} opacity={ramp(u, 0.7, 1.1)} />
        <line x1="10" y1="118" x2="190" y2="118" stroke={C.gold} strokeWidth={4} transform={`translate(100 118) scale(${ls.toFixed(4)} 1) translate(-100 -118)`} />
        <path d="M54 168 L100 44 L146 168" fill="none" stroke="url(#bmg)" strokeWidth={9} strokeLinejoin="miter" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ramp(u, 0.55, 1.45)} />
        <path
          d="M100 14 L111 30 L100 46 L89 30 Z"
          fill="url(#bmg)"
          opacity={g < 0 ? 0 : 1}
          transform={`translate(100 46) translate(0 ${(-h / 4).toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-100 -46)`}
        />
      </svg>
      <div style={{ marginTop: 56, fontSize: 84, fontWeight: 500, letterSpacing: `${lerp(0.7, 0.3, w).toFixed(3)}em`, paddingLeft: "0.3em", color: C.ivory, whiteSpace: "nowrap", opacity: ramp(u, 1.9, 2.3) }}>
        ATLAS<span style={{ color: C.gold }}>NUSIA</span>
      </div>
      <div style={{ marginTop: 26, width: 520, height: 1, background: C.gold, transform: `scaleX(${expo((u - 2.3) / 0.6).toFixed(4)})` }} />
      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: sb, transform: `translateY(${((1 - sb) * 16).toFixed(1)}px)` }}>
        <div style={{ fontSize: 44, color: C.goldLight, letterSpacing: "0.04em" }}>{handle}</div>
        <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: "0.22em", color: C.muted, textTransform: "uppercase" }}>Instagram · YouTube · TikTok · Facebook</div>
      </div>
    </div>
  );
};
export const BUMPER_SECONDS = 4;

/* ---------- Foto: tiap foto bingkainya beda, masuknya beda ---------- */
/**
 * arch      lengkung pintu rumah adat + garis emas mengambang (budaya, bangunan, patung)
 * polaroid  kartu gading miring + selotip emas, dilempar lalu mendarat (tempat, suasana)
 * woven     bingkai motif tenun merah-hitam-emas, terbuka dari tengah (kain, kerajinan)
 * round     piring bundar + cincin titik emas berputar (makanan)
 */
export type FrameShape = "arch" | "polaroid" | "woven" | "round";
const BOX: Record<FrameShape, { left: number; top: number; w: number; h: number }> = {
  arch: { left: 190, top: 210, w: 700, h: 880 },
  polaroid: { left: 130, top: 240, w: 820, h: 840 },
  woven: { left: 56, top: 280, w: 968, h: 780 },
  round: { left: 170, top: 270, w: 740, h: 740 },
};

export const PhotoCard: React.FC<{ src: string; credit: string; shape: FrameShape; t0: number; t1: number; drift?: 1 | -1; focus?: string }> = ({ src, credit, shape, t0, t1, drift = 1, focus = "50% 50%" }) => {
  const t = useT();
  if (t < t0 - 0.05 || t > t1 + 0.05) return null;
  const u = t - t0,
    out = inCub((t - t1 + 0.4) / 0.38);
  const B = BOX[shape];
  let pcTf = "",
    pcClip: string | undefined,
    pfClip: string | undefined,
    ringTf = "",
    ringOp = 0;
  if (shape === "arch") {
    const e = spring(u / 0.8),
      m = expo(u / 0.7);
    pcTf = `translateY(${((1 - e) * 260).toFixed(1)}px)`;
    pfClip = `inset(${((1 - m) * 100).toFixed(2)}% 0 0 0 round 350px 350px 34px 34px)`;
    ringTf = `scale(${(0.9 + 0.1 * expo((u - 0.2) / 0.7)).toFixed(3)})`;
    ringOp = ramp(u, 0.2, 0.6);
  } else if (shape === "polaroid") {
    const e = spring(u / 0.85);
    pcTf = `translate(${((1 - e) * -420).toFixed(1)}px, ${((1 - e) * -980).toFixed(1)}px) rotate(${lerp(-38, -4, e).toFixed(2)}deg) scale(${lerp(1.25, 1, expo(u / 0.6)).toFixed(3)})`;
  } else if (shape === "woven") {
    const m = expo(u / 0.75),
      e = spring(u / 0.9);
    pcClip = `inset(0 ${((1 - m) * 50).toFixed(2)}% 0 ${((1 - m) * 50).toFixed(2)}%)`;
    pcTf = `scaleY(${(0.6 + 0.4 * e).toFixed(3)})`;
  } else {
    const e = spring(u / 0.8);
    pcTf = `scale(${(0.2 + 0.8 * e).toFixed(3)}) rotate(${((1 - e) * -140).toFixed(2)}deg)`;
    ringTf = `rotate(${(u * 24).toFixed(1)}deg)`;
    ringOp = ramp(u, 0.3, 0.7);
  }
  const kb = 1.16 - 0.12 * Math.min(1, u / 3.2),
    px = drift * 3 * Math.min(1, u / 3.2);
  const shine = lerp(-120, 120, ramp(t, t0 + 0.6, t0 + 1.4));
  const pc: React.CSSProperties = { position: "absolute", left: B.left, top: B.top, width: B.w, height: B.h, transform: pcTf, clipPath: pcClip };
  const pf: React.CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", background: "#16140f", clipPath: pfClip };
  if (shape === "arch") pf.borderRadius = "350px 350px 34px 34px";
  if (shape === "polaroid") {
    Object.assign(pc, { background: "#f6efe0", borderRadius: 8, boxShadow: "0 40px 80px -24px rgba(0,0,0,.85), inset 0 0 0 1px rgba(0,0,0,.08)" });
    Object.assign(pf, { inset: "34px 34px 150px 34px", borderRadius: 3 });
  }
  if (shape === "woven") {
    Object.assign(pc, {
      padding: 30,
      borderRadius: 6,
      background: `repeating-linear-gradient(90deg, #1a1410 0 10px, ${C.ulosRed} 10px 26px, #1a1410 26px 32px, #e2c28a 32px 36px, #1a1410 36px 42px), #1a1410`,
      boxShadow: "0 0 0 3px #e2c28a, 0 40px 80px -24px rgba(0,0,0,.85)",
    });
    Object.assign(pf, { inset: 30, borderRadius: 2 });
  }
  if (shape === "round") Object.assign(pf, { borderRadius: "50%", boxShadow: "inset 0 0 0 8px #e2c28a" });
  const creditStyle: React.CSSProperties =
    shape === "polaroid"
      ? { position: "absolute", left: 0, right: 0, bottom: 52, textAlign: "center", fontSize: 20, color: "#6c6353" }
      : { position: "absolute", left: 0, right: 0, top: "100%", marginTop: shape === "round" ? 54 : shape === "arch" ? 40 : 18, textAlign: "center", fontSize: 20, lineHeight: 1.3, color: "rgba(239,230,212,.72)" };
  const weave = "repeating-linear-gradient(90deg, #e2c28a 0 4px, transparent 4px 12px), repeating-linear-gradient(0deg, #8f1d1d 0 6px, #1a1410 6px 12px)";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateY(${(-out * 120).toFixed(1)}px) scale(${(1 - 0.08 * out).toFixed(3)})`, transformOrigin: "50% 40%", fontFamily: FONT }}>
      <div style={pc}>
        {shape === "arch" ? <div style={{ position: "absolute", inset: -26, border: "3px solid #e2c28a", borderRadius: "376px 376px 52px 52px", transformOrigin: "50% 100%", transform: ringTf, opacity: ringOp }} /> : null}
        {shape === "round" ? (
          <div
            style={{
              position: "absolute",
              inset: -34,
              borderRadius: "50%",
              border: "2px solid rgba(226,194,138,.7)",
              transform: ringTf,
              opacity: ringOp,
              background:
                "radial-gradient(circle at 50% 2px, #efcf8e 6px, transparent 7px), radial-gradient(circle at 50% calc(100% - 2px), #efcf8e 6px, transparent 7px), radial-gradient(circle at 2px 50%, #efcf8e 6px, transparent 7px), radial-gradient(circle at calc(100% - 2px) 50%, #efcf8e 6px, transparent 7px)",
            }}
          />
        ) : null}
        {shape === "woven" ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 30, background: weave }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 30, background: weave }} />
          </>
        ) : null}
        <div style={pf}>
          <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: focus, transform: `scale(${kb.toFixed(4)}) translateX(${px.toFixed(2)}%)` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 40%, rgba(255,248,230,.3) 50%, transparent 60%)", transform: `translateX(${shine.toFixed(1)}%)` }} />
        </div>
        {shape === "polaroid" ? <div style={{ position: "absolute", left: "50%", top: -28, width: 230, height: 62, marginLeft: -115, background: "rgba(226,194,138,.78)", transform: "rotate(3deg)", boxShadow: "0 4px 10px -4px rgba(0,0,0,.4)" }} /> : null}
        <div style={creditStyle}>{credit}</div>
      </div>
    </div>
  );
};

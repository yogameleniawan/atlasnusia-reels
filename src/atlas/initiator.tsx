import React from "react";
import { Img, staticFile } from "remotion";
import { C, clamp, expo, FONT, inCub, lerp, ramp, spring } from "./tokens";
import { useT } from "./voice";

/**
 * Apresiasi Inisiator (mulai ATLAS-02): foto profil penonton yang pertama minta provinsinya, di dalam cincin emas
 * yang tergambar + titik-titik berputar, medali jatuh memantul di pojok foto, lalu gelembung komentar aslinya
 * (handle tebal + isi komentar) muncul mengetik di bawahnya. Platform disebut di teks Kinetic (bukan logo platform).
 * Teks ucapan terima kasih pakai Kinetic terpisah di Video.tsx (biar gayanya bisa beda tiap episode).
 *
 * Foto profil HANYA dipakai kalau penontonnya sudah setuju (tanya user dulu); kalau belum, kosongkan `photo`
 * dan avatar inisial emas yang tampil.
 */
export const InitiatorSpotlight: React.FC<{
  t0: number;
  t1: number;
  handle: string;
  comment: string;
  /** path di public/, misal photos/atlas-02/inisiator.jpg */
  photo?: string;
  top?: number;
}> = ({ t0, t1, handle, comment, photo, top = 600 }) => {
  const t = useT();
  if (t < t0 - 0.02 || t > t1 + 0.05) return null;
  const u = t - t0;
  const on = Math.min(ramp(t, t0, t0 + 0.35), 1 - ramp(t, t1 - 0.35, t1));
  const out = inCub((t - t1 + 0.45) / 0.4);
  const R = 210; // jari-jari foto
  const ring = expo(u / 0.9);
  const pop = spring((u - 0.15) / 0.8);
  const medal = spring((u - 0.85) / 0.7);
  const bubble = spring((u - 1.3) / 0.7);
  const typed = Math.round(clamp((u - 1.6) / Math.max(0.6, comment.length * 0.06)) * comment.length);
  const glint = lerp(-1.2, 1.2, ramp(u, 0.9, 1.7));
  const cx = 540,
    cy = top + R + 40;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: on, fontFamily: FONT, transform: `translateY(${(-out * 80).toFixed(1)}px)` }}>
      {/* latar: gelap + cahaya emas lembut di belakang foto */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(42% 26% at 50% ${((cy / 1920) * 100).toFixed(1)}%, rgba(239,207,142,.22), rgba(12,11,10,0) 70%), ${C.onyx}` }} />
      {/* sinar tipis berputar */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.35 * ring }}>
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2 + u * 0.25;
          return <line key={i} x1={cx + Math.cos(a) * (R + 40)} y1={cy + Math.sin(a) * (R + 40)} x2={cx + Math.cos(a) * (R + 210)} y2={cy + Math.sin(a) * (R + 210)} stroke={C.gold} strokeWidth={2} strokeLinecap="round" opacity={0.25 + 0.25 * Math.sin(i * 1.7)} />;
        })}
      </svg>
      {/* foto + cincin */}
      <div style={{ position: "absolute", left: cx - R, top: cy - R, width: R * 2, height: R * 2, transform: `scale(${(0.55 + 0.45 * pop).toFixed(3)})` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: "#1d1a15", boxShadow: "0 40px 80px -20px rgba(0,0,0,.9)" }}>
          {photo ? (
            <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${(1.08 - 0.06 * clamp(u / 3)).toFixed(3)})` }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "linear-gradient(180deg,#fff3d4,#d9b06a 60%,#b98a45)", color: C.ink, fontSize: 190, fontWeight: 700 }}>{handle[0]?.toUpperCase()}</div>
          )}
          {/* kilau menyapu */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 35%, rgba(255,246,222,.35) 50%, transparent 65%)", transform: `translateX(${(glint * 100).toFixed(1)}%)` }} />
        </div>
        <svg width={R * 2 + 60} height={R * 2 + 60} style={{ position: "absolute", left: -30, top: -30, overflow: "visible" }}>
          <circle cx={R + 30} cy={R + 30} r={R + 10} fill="none" stroke={C.goldLight} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform={`rotate(-90 ${R + 30} ${R + 30})`} />
          <g transform={`rotate(${(u * 22).toFixed(1)} ${R + 30} ${R + 30})`} opacity={ramp(u, 0.6, 1)}>
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <circle key={i} cx={R + 30 + Math.cos(a) * (R + 26)} cy={R + 30 + Math.sin(a) * (R + 26)} r={i % 3 ? 2.5 : 4.5} fill={C.gold} />;
            })}
          </g>
        </svg>
        {/* medali di pojok kanan bawah foto */}
        <svg viewBox="0 0 52 52" width={150} height={150} style={{ position: "absolute", right: -34, bottom: -30, transform: `translateY(${((1 - medal) * -260).toFixed(1)}px) rotate(${((1 - medal) * -30).toFixed(1)}deg)`, opacity: ramp(u, 0.8, 0.95), filter: "drop-shadow(0 6px 0 #4a3818) drop-shadow(0 0 16px rgba(239,207,142,.6))" }}>
          <defs>
            <linearGradient id="inMed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff1cf" />
              <stop offset=".5" stopColor="#e2c28a" />
              <stop offset="1" stopColor="#9c7a3f" />
            </linearGradient>
          </defs>
          <path d="M17 2h7l3 12h-9zM28 2h7l-1 12h-9z" fill="#8f1d1d" />
          <circle cx="26" cy="32" r="17" fill="url(#inMed)" stroke="#6e5222" strokeWidth="1.5" />
          <circle cx="26" cy="32" r="12" fill="none" stroke="#6e5222" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M26 22 L29 32 L26 42 L23 32Z" fill="#1d1a15" />
          <path d="M19 34 L33 34" stroke="#1d1a15" strokeWidth="1.6" />
        </svg>
      </div>
      {/* gelembung komentar asli */}
      <div
        style={{
          position: "absolute",
          left: 140,
          right: 140,
          top: cy + R + 70,
          padding: "26px 34px",
          borderRadius: 30,
          background: "linear-gradient(180deg, rgba(36,32,26,.97), rgba(20,18,15,.97))",
          border: `2px solid rgba(239,207,142,.55)`,
          boxShadow: "inset 0 1px 0 rgba(255,236,196,.15), 0 30px 60px -20px rgba(0,0,0,.9)",
          transform: `translateY(${((1 - bubble) * 60).toFixed(1)}px) scale(${(0.9 + 0.1 * bubble).toFixed(3)})`,
          opacity: clamp(bubble * 1.4),
          transformOrigin: "50% 0%",
        }}
      >
        <div style={{ fontSize: 50, lineHeight: 1.2, color: C.ivory, whiteSpace: "nowrap", overflow: "hidden" }}>
          <b style={{ color: C.goldLight, fontWeight: 700 }}>@{handle}</b> {comment.slice(0, typed)}
          <span style={{ opacity: typed < comment.length && Math.floor(u * 3) % 2 === 0 ? 1 : 0, color: C.goldLight }}>|</span>
        </div>
      </div>
    </div>
  );
};

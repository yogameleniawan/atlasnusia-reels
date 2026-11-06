import React from "react";
import { Img, staticFile } from "remotion";
import { C, clamp, expo, FONT, hash, inCub, lerp, ramp, spring } from "./tokens";
import { useT } from "./voice";

/**
 * Apresiasi Inisiator (mulai ATLAS-02): upacara penghargaan yang meriah.
 * - Panggung: lampu sorot bergoyang dari dua sisi, cahaya emas di belakang.
 * - Trofi emas naik dari podium "1" (pegas), karangan daun salam emas tergambar mengelilinginya,
 *   pita merah "INISIATOR" terbentang, kilau menyapu trofi.
 * - Kembang api tiga kali + hujan konfeti (emas, gading, merah, hijau air) + bintang berkelip.
 * - Kartu komentar ala embed: foto profil KECIL bercincin emas, handle tebal, isi komentar mengetik, platform sebagai teks.
 * Teks ucapan terima kasih pakai Kinetic terpisah di Video.tsx (top ±230).
 *
 * Foto profil HANYA dipakai kalau penontonnya sudah setuju (tanya user dulu); kalau belum, kosongkan `photo`
 * dan avatar inisial emas yang tampil.
 */
export const InitiatorSpotlight: React.FC<{
  t0: number;
  t1: number;
  handle: string;
  comment: string;
  /** nama platform sebagai teks, misal "Instagram" */
  platform: string;
  /** path di public/, misal photos/atlas-02/inisiator.jpg */
  photo?: string;
}> = ({ t0, t1, handle, comment, platform, photo }) => {
  const t = useT();
  if (t < t0 - 0.02 || t > t1 + 0.05) return null;
  const u = t - t0;
  const on = Math.min(ramp(t, t0, t0 + 0.3), 1 - ramp(t, t1 - 0.35, t1));
  const out = inCub((t - t1 + 0.45) / 0.4);

  const cx = 540;
  const rise = spring((u - 0.2) / 0.85); // trofi naik
  const laurel = ramp(u, 0.55, 1.35);
  const ribbon = expo((u - 0.95) / 0.6);
  const card = spring((u - 1.6) / 0.75);
  const chars = Array.from(comment); // per karakter (emoji tidak terbelah saat mengetik)
  const typed = Math.round(clamp((u - 1.95) / Math.max(0.5, chars.length * 0.06)) * chars.length);
  const shine = lerp(-1.3, 1.3, ramp(u, 1.1, 1.9));
  const sway = Math.sin(u * 1.6) * 7;

  /* kembang api */
  const bursts = [
    { x: 170, y: 720, at: 0.9, col: C.goldLight },
    { x: 910, y: 690, at: 1.2, col: "#fff3d4" },
    { x: 230, y: 1010, at: 1.55, col: C.ulosRed },
    { x: 860, y: 960, at: 1.85, col: C.goldLight },
  ];
  /* konfeti */
  const COLS = [C.goldLight, C.gold, "#fff3d4", C.ulosRed, C.waterText];
  const confetti = Array.from({ length: 90 }, (_, i) => {
    const a = u - 0.85 - hash(i * 3.1) * 0.9;
    if (a < 0) return null;
    const x = hash(i) * 1080 + Math.sin(a * (2 + hash(i * 7) * 3) + i) * 40;
    const y = -60 - hash(i * 5.3) * 300 + a * (380 + hash(i * 2.2) * 320);
    if (y > 1500) return null;
    const rot = a * (200 + hash(i * 9) * 400) * (i % 2 ? 1 : -1);
    const flip = Math.cos(a * (6 + hash(i * 4) * 6));
    const col = COLS[i % COLS.length];
    return i % 4 === 0 ? (
      <circle key={i} cx={x} cy={y} r={6} fill={col} />
    ) : (
      <rect key={i} x={-7} y={-12} width={14} height={24} rx={2} fill={col} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1 ${Math.max(0.15, Math.abs(flip)).toFixed(2)})`} />
    );
  });
  /* bintang berkelip */
  const stars = Array.from({ length: 16 }, (_, i) => {
    const x = 120 + hash(i * 11) * 840,
      y = 520 + hash(i * 13) * 560;
    const tw = Math.max(0, Math.sin(u * 5 + i * 1.9)) * ramp(u, 0.9 + (i % 5) * 0.1, 1.2 + (i % 5) * 0.1);
    const s = 8 + hash(i * 17) * 10;
    return <path key={i} d={`M${x} ${y - s} L${x + s * 0.25} ${y - s * 0.25} L${x + s} ${y} L${x + s * 0.25} ${y + s * 0.25} L${x} ${y + s} L${x - s * 0.25} ${y + s * 0.25} L${x - s} ${y} L${x - s * 0.25} ${y - s * 0.25}Z`} fill="#fff3d4" opacity={tw} />;
  });
  /* daun salam: dua cabang melengkung mengelilingi trofi */
  const leaves = (side: 1 | -1) =>
    Array.from({ length: 10 }, (_, i) => {
      const k = i / 9;
      if (laurel < k * 0.9) return null;
      const ang = ((side === 1 ? -75 + k * 118 : 255 - k * 118) * Math.PI) / 180;
      const R = 235;
      const x = cx + Math.cos(ang) * R,
        y = 735 + Math.sin(ang) * R * 0.95;
      const rotDeg = (ang * 180) / Math.PI + (side === 1 ? 90 : -90) + side * 25;
      const sc = 0.6 + 0.4 * expo((laurel - k * 0.9) / 0.15);
      return (
        <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotDeg.toFixed(1)}) scale(${sc.toFixed(2)})`}>
          <ellipse cx={-14} cy={0} rx={28} ry={11} fill="url(#inLeaf)" transform="rotate(-28)" />
          <ellipse cx={14} cy={0} rx={28} ry={11} fill="url(#inLeaf)" transform="rotate(28)" />
        </g>
      );
    });

  const trophyY = (1 - rise) * 260;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: on, fontFamily: FONT, transform: `translateY(${(-out * 80).toFixed(1)}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(48% 30% at 50% 42%, rgba(239,207,142,.26), rgba(12,11,10,0) 72%), ${C.onyx}` }} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="inGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3d4" />
            <stop offset=".35" stopColor="#f2d595" />
            <stop offset=".7" stopColor="#d9b06a" />
            <stop offset="1" stopColor="#9c7a3f" />
          </linearGradient>
          <linearGradient id="inLeaf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f6e2b0" />
            <stop offset="1" stopColor="#b98a45" />
          </linearGradient>
          <linearGradient id="inBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3d4" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff3d4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="inRib" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b2302a" />
            <stop offset="1" stopColor="#6f1414" />
          </linearGradient>
          <linearGradient id="inPod" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a241c" />
            <stop offset="1" stopColor="#120f0c" />
          </linearGradient>
          <filter id="inGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <clipPath id="inCup">
            <path d="M390 600 H690 C690 760 625 830 540 840 C455 830 390 760 390 600 Z" />
          </clipPath>
        </defs>

        {/* lampu sorot */}
        <g opacity={0.5 * ramp(u, 0, 0.5)}>
          <path d={`M60 -40 L210 -40 L${cx + 170 + sway} 1080 L${cx - 90 + sway} 1080 Z`} fill="url(#inBeam)" />
          <path d={`M870 -40 L1020 -40 L${cx + 90 - sway} 1080 L${cx - 170 - sway} 1080 Z`} fill="url(#inBeam)" />
        </g>

        {/* kembang api */}
        {bursts.map((b, bi) => {
          const a = u - b.at;
          if (a < 0 || a > 1.4) return null;
          const r = expo(a / 0.7) * 150,
            fade = 1 - ramp(a, 0.6, 1.4);
          return (
            <g key={bi} opacity={fade}>
              {Array.from({ length: 16 }, (_, k) => {
                const ang = (k / 16) * Math.PI * 2;
                const x1 = b.x + Math.cos(ang) * r * 0.45,
                  y1 = b.y + Math.sin(ang) * r * 0.45 + a * 30;
                const x2 = b.x + Math.cos(ang) * r,
                  y2 = b.y + Math.sin(ang) * r + a * 30;
                return (
                  <g key={k}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={b.col} strokeWidth={5} strokeLinecap="round" />
                    <circle cx={x2} cy={y2} r={5} fill="#fff3d4" />
                  </g>
                );
              })}
              <circle cx={b.x} cy={b.y} r={30 * (1 - ramp(a, 0, 0.4))} fill="#fff3d4" filter="url(#inGlow)" />
            </g>
          );
        })}

        {stars}

        {/* podium */}
        <g transform={`translate(0 ${((1 - expo(u / 0.6)) * 200).toFixed(1)})`} opacity={ramp(u, 0, 0.3)}>
          <ellipse cx={cx} cy={1100} rx={300} ry={26} fill="#000" opacity={0.6} />
          <rect x={300} y={960} width={480} height={130} rx={14} fill="url(#inPod)" stroke={C.gold} strokeWidth={3} />
          <rect x={300} y={960} width={480} height={10} rx={5} fill="url(#inGold)" />
          <text x={cx} y={1062} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={76} fill={C.goldLight}>
            1
          </text>
        </g>

        {/* daun salam */}
        <g opacity={ramp(u, 0.5, 0.8)}>
          {leaves(1)}
          {leaves(-1)}
        </g>

        {/* trofi */}
        <g transform={`translate(0 ${trophyY.toFixed(1)})`} opacity={ramp(u, 0.15, 0.4)}>
          <circle cx={cx} cy={720} r={190} fill={C.goldLight} opacity={0.18 + 0.06 * Math.sin(u * 4)} filter="url(#inGlow)" />
          {/* gagang */}
          <path d="M398 625 C320 625 315 735 410 760" fill="none" stroke="url(#inGold)" strokeWidth={22} strokeLinecap="round" />
          <path d="M682 625 C760 625 765 735 670 760" fill="none" stroke="url(#inGold)" strokeWidth={22} strokeLinecap="round" />
          {/* mangkuk */}
          <path d="M390 600 H690 C690 760 625 830 540 840 C455 830 390 760 390 600 Z" fill="url(#inGold)" stroke="#fff3d4" strokeWidth={3} />
          <ellipse cx={cx} cy={600} rx={150} ry={20} fill="#e6c47f" stroke="#fff3d4" strokeWidth={3} />
          <ellipse cx={cx} cy={600} rx={128} ry={12} fill="#9c7a3f" opacity={0.6} />
          {/* lambang berlian di mangkuk */}
          <path d="M540 650 L572 700 L540 760 L508 700 Z" fill="#fff3d4" opacity={0.85} stroke="#9c7a3f" strokeWidth={3} />
          <line x1={470} y1={712} x2={610} y2={712} stroke="#9c7a3f" strokeWidth={4} opacity={0.7} />
          {/* kilau */}
          <g clipPath="url(#inCup)">
            <rect x={cx - 40 + shine * 260} y={560} width={60} height={320} fill="#fff" opacity={0.45} transform={`skewX(-18)`} />
          </g>
          {/* batang + alas */}
          <rect x={524} y={838} width={32} height={46} fill="url(#inGold)" />
          <ellipse cx={cx} cy={884} rx={44} ry={12} fill="url(#inGold)" />
          <path d="M470 900 L610 900 L630 950 L450 950 Z" fill="url(#inGold)" stroke="#fff3d4" strokeWidth={2} />
          <rect x={436} y={948} width={208} height={18} rx={4} fill="#6e5222" />
        </g>

        {/* pita INISIATOR */}
        <g opacity={ramp(u, 0.95, 1.05)}>
          <g transform={`translate(${cx} 0) scale(${ribbon.toFixed(3)} 1) translate(${-cx} 0)`}>
            <path d="M300 920 L270 950 L300 980 L250 980 L230 950 L250 920 Z" fill="#6f1414" />
            <path d="M780 920 L810 950 L780 980 L830 980 L850 950 L830 920 Z" fill="#6f1414" />
            <rect x={290} y={906} width={500} height={86} rx={8} fill="url(#inRib)" stroke={C.goldLight} strokeWidth={3} />
            <text x={cx} y={963} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} letterSpacing="0.32em" fill="#fff3d4">
              INISIATOR
            </text>
          </g>
        </g>

        {/* konfeti di depan semua */}
        <g>{confetti}</g>
      </svg>

      {/* kartu komentar ala embed: foto profil kecil */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 1150,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "22px 30px",
          borderRadius: 28,
          background: "linear-gradient(180deg, rgba(38,34,28,.97), rgba(20,18,15,.97))",
          border: `2px solid rgba(239,207,142,.6)`,
          boxShadow: "inset 0 1px 0 rgba(255,236,196,.15), 0 30px 60px -20px rgba(0,0,0,.9), 0 0 40px -10px rgba(239,207,142,.35)",
          transform: `translateY(${((1 - card) * 90).toFixed(1)}px) scale(${(0.9 + 0.1 * card).toFixed(3)})`,
          opacity: clamp(card * 1.4),
        }}
      >
        <div style={{ position: "relative", width: 92, height: 92, flex: "none", borderRadius: "50%", padding: 4, background: "linear-gradient(135deg,#fff3d4,#d9b06a 55%,#9c7a3f)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: C.panel, border: `3px solid ${C.onyx}` }}>
            {photo ? (
              <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: C.goldLight, fontSize: 40, fontWeight: 700 }}>{handle[0]?.toUpperCase()}</div>
            )}
          </div>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* handle di baris sendiri, komentar di bawahnya dan boleh turun baris: komentar panjang nggak terpotong.
              Sisa komentar yang belum "terketik" tetap dirender transparan supaya tinggi kartu nggak loncat. */}
          <div style={{ fontSize: 40, lineHeight: 1.15, color: C.goldLight, fontWeight: 700, overflowWrap: "anywhere" }}>{handle}</div>
          <div style={{ fontSize: comment.length > 34 ? 36 : 42, lineHeight: 1.22, color: C.ivory, marginTop: 4, whiteSpace: "normal", overflowWrap: "anywhere" }}>
            {chars.slice(0, typed).join("")}
            <span style={{ opacity: typed < chars.length && Math.floor(u * 3) % 2 === 0 ? 1 : 0, color: C.goldLight }}>|</span>
            <span style={{ visibility: "hidden" }}>{chars.slice(typed).join("")}</span>
          </div>
          <div style={{ fontSize: 28, color: C.muted, marginTop: 6 }}>{platform} · komentar pertama</div>
        </div>
      </div>
    </div>
  );
};

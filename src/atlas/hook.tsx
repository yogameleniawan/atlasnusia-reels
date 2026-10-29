import React from "react";
import { C, clamp, expo, FONT, inCub } from "./tokens";
import { useT } from "./voice";

/**
 * Hook "stack" (ATLAS-01): kalimat pendek bertumpuk di tengah, tiap baris meluncur dari sisi yang berselang
 * (kiri/kanan) sambil buram → tajam dan miring → tegak. Kata kunci *kata* muncul sebagai huruf berongga emas
 * lalu terisi emas cair dari bawah. Pertanyaan penutup jatuh dari skala besar dengan huruf merapat + riak emas.
 * Semua keluar ke atas sambil buram.
 *
 * Gaya hook BOLEH dan SEBAIKNYA beda tiap episode (lihat skill). Ini salah satu gaya; HookLines (masker) yang lain.
 */
export type HookLine = { text: string; at: number };

const WordFill: React.FC<{ text: string; level: number; t: number }> = ({ text, level, t }) => {
  const pts = Array.from({ length: 11 }, (_, q) => {
    const x = q * 10,
      base = 100 - level * 100,
      amp = level > 0.02 && level < 0.98 ? 1 : 0;
    return `${x}% ${(base + 7 * Math.sin(t * 7 + x * 0.13) * amp).toFixed(1)}%`;
  }).join(", ");
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ color: "transparent", WebkitTextStroke: `2.5px ${C.goldLight}` }}>{text}</span>
      <span style={{ position: "absolute", left: 0, top: 0, color: C.goldLight, clipPath: `polygon(0% 120%, ${pts}, 100% 120%)` }}>{text}</span>
    </span>
  );
};

export const HookStack: React.FC<{ lines: HookLine[]; question: { text: string; at: number }; out: number; top?: number; size?: number }> = ({ lines, question, out, top = 300, size = 96 }) => {
  const t = useT();
  if (t > out + 0.7) return null;
  const qu = t - question.at;
  const qv = inCub((t - out - lines.length * 0.04) / 0.35);
  const qe = expo(qu / 0.6);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, fontFamily: FONT, color: C.ivory, textAlign: "center" }}>
      {lines.map((L, li) => {
        const dir = li % 2 ? 1 : -1;
        const v = inCub((t - out - li * 0.04) / 0.32);
        const words = L.text.split(" ");
        return (
          <div key={li} style={{ fontSize: size, fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.025em", whiteSpace: "nowrap", transform: `translateY(${(-v * 90).toFixed(1)}px)`, opacity: 1 - v, filter: v > 0 ? `blur(${(v * 12).toFixed(1)}px)` : undefined }}>
            {words.map((w, wi) => {
              const a = t - L.at - wi * 0.06;
              const u = expo(a / 0.5);
              const m = w.match(/^\*(.+)\*([.,?!…]*)$/);
              return (
                <React.Fragment key={wi}>
                  <span
                    style={{
                      display: "inline-block",
                      opacity: clamp(a / 0.12),
                      transform: `translateX(${((1 - u) * 180 * dir).toFixed(1)}px) skewX(${((1 - u) * -14 * dir).toFixed(2)}deg)`,
                      filter: u < 0.99 ? `blur(${((1 - u) * 16).toFixed(1)}px)` : undefined,
                    }}
                  >
                    {m ? (
                      <>
                        <WordFill text={m[1]} level={expo((a - 0.35) / 0.7)} t={t} />
                        {m[2]}
                      </>
                    ) : (
                      w
                    )}
                  </span>
                  {wi < words.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
      {qu > -0.05 ? (
        <div style={{ position: "relative", marginTop: 40, height: size * 1.5 }}>
          {[0, 1].map((k) => {
            const r = (qu - 0.3 - k * 0.25) / 1.0;
            if (r <= 0 || r >= 1) return null;
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 520,
                  height: 220,
                  marginLeft: -260,
                  marginTop: -110,
                  borderRadius: "50%",
                  border: `2px solid ${C.gold}`,
                  transform: `scale(${(0.5 + r * 1.3).toFixed(3)})`,
                  opacity: ((1 - r) * 0.7 * (1 - qv)).toFixed(3),
                }}
              />
            );
          })}
          <div
            style={{
              position: "relative",
              fontSize: size * 1.42,
              fontWeight: 700,
              lineHeight: 1.1,
              color: C.goldLight,
              whiteSpace: "nowrap",
              letterSpacing: `${(0.45 * (1 - qe) - 0.025).toFixed(3)}em`,
              transform: `translateY(${(-qv * 90).toFixed(1)}px) scale(${(2.3 - 1.3 * qe).toFixed(3)})`,
              opacity: (clamp(qu / 0.15) * (1 - qv)).toFixed(3),
              filter: qe < 0.99 || qv > 0 ? `blur(${((1 - qe) * 20 + qv * 12).toFixed(1)}px)` : undefined,
            }}
          >
            {question.text}
          </div>
        </div>
      ) : null}
    </div>
  );
};

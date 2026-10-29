import React from "react";
import { C, clamp, easeBounce, expo, FONT, hash, idNum, inCub, spring, springSoft } from "./tokens";
import { useT } from "./voice";

/**
 * Teks kinetik Atlasnusia. SATU ukuran per blok (nggak ada judul besar + subjudul kecil).
 *
 * Markup per kata:
 *   *kata*      stabilo emas tersapu di belakang kata (kata berurutan jadi satu stabilo)
 *   [74000]     angka: di mode "act" jadi odometer per digit, di mode lain menghitung naik
 *   kata{fx}    (mode "act") kata bergerak sesuai artinya:
 *               burst   meledak, huruf terlempar oranye lava + blok bergetar   ("meletus", "pecah")
 *               fall    huruf jatuh memantul dan diam miring                    ("runtuh", "jatuh")
 *               fill    terisi warna air dari bawah, permukaan bergelombang      ("air", "banjir")
 *               stretch huruf merenggang lalu rapat, kata sesudahnya terdorong   ("panjang", "jauh")
 *               wide    kata melebar lalu normal, kata sesudahnya terdorong       ("lebar", "luas")
 *               sink    huruf tenggelam warna air                                ("dalam", "turun")
 *               pop     kata muncul membesar dengan pegas                        (nama tempat)
 *               swap    meluncur dari kanan, buram ke tajam                      (pembanding: "Singapura")
 *               rise    tumbuh dari bawah ke atas                                ("puncak", "tinggi", "naik")
 *               wave    huruf bergelombang terus, warna air                      ("danau", "laut", "sungai")
 *
 * Mode blok (variasikan antar bagian, jangan sama terus):
 *   act   kata masuk + efek per kata di atas (buat fakta utama)
 *   pop   kata melompat masuk
 *   drop  kata jatuh dari atas sambil berputar
 *   wipe  tersapu per baris dari kiri
 *   blur  huruf dari buram ke tajam
 *   type  mengetik dengan kursor emas, terhapus mundur di akhir
 *   wave  huruf meloncat masuk seperti gelombang lalu bergoyang (ajakan)
 */
export type KineMode = "act" | "pop" | "drop" | "wipe" | "blur" | "type" | "wave";
export type KineFx = "burst" | "fall" | "fill" | "stretch" | "wide" | "sink" | "pop" | "swap" | "rise" | "wave";

type Tok = { raw: string; text: string; hl: boolean; fx: KineFx | null; num: { pre: string; n: number; post: string } | null; x: number; y: number; w: number; line: number; i: number };

let ctx2d: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, weight: number, ls: number) {
  if (!ctx2d) ctx2d = document.createElement("canvas").getContext("2d");
  const c = ctx2d!;
  c.font = `${weight} ${size}px Poppins`;
  (c as unknown as { letterSpacing: string }).letterSpacing = `${ls}px`;
  return c.measureText(text).width;
}

function layout(text: string, size: number, weight: number, ls: number, maxW: number, lh: number, align: "left" | "center" | "right") {
  const toks: Tok[] = [];
  const space = measure(" ", size, weight, ls);
  text.split(" ").forEach((raw, i) => {
    let t = raw,
      fx: KineFx | null = null,
      hl = false,
      m;
    if ((m = t.match(/^(.*?)\{(\w+)\}$/))) {
      t = m[1];
      fx = m[2] as KineFx;
    }
    if ((m = t.match(/^\*(.+)\*([.,?!:;]?)$/))) {
      hl = true;
      t = m[1] + m[2];
    }
    let num: Tok["num"] = null;
    const nm = t.match(/^(.*?)\[(\d+)\](.*)$/);
    if (nm) {
      num = { pre: nm[1], n: Number(nm[2]), post: nm[3] };
      t = nm[1] + idNum(Number(nm[2])) + nm[3];
    }
    toks.push({ raw, text: t, hl, fx, num, x: 0, y: 0, w: measure(t, size, weight, ls), line: 0, i });
  });
  const lines: Tok[][] = [[]];
  let cur = 0;
  toks.forEach((tk) => {
    const add = (lines[lines.length - 1].length ? space : 0) + tk.w;
    if (cur + add > maxW && lines[lines.length - 1].length) {
      lines.push([]);
      cur = 0;
    }
    const L = lines[lines.length - 1];
    tk.x = L.length ? cur + space : 0;
    cur = tk.x + tk.w;
    L.push(tk);
  });
  lines.forEach((L, li) => {
    const w = L.length ? L[L.length - 1].x + L[L.length - 1].w : 0;
    const off = align === "center" ? (maxW - w) / 2 : align === "right" ? maxW - w : 0;
    L.forEach((tk) => {
      tk.x += off;
      tk.y = li * lh;
      tk.line = li;
    });
  });
  return { toks, lines: lines.length, space };
}

export const Kinetic: React.FC<{
  text: string;
  t0: number;
  t1: number;
  mode: KineMode;
  left?: number;
  top: number;
  width?: number;
  size?: number;
  weight?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  step?: number;
}> = ({ text, t0, t1, mode, left = 76, top, width = 928, size = 74, weight = 600, lineHeight = 1.18, align = "left", step }) => {
  const T = useT();
  if (T < t0 - 0.02 || T > t1 + 0.05) return null;
  const ls = mode === "act" || size >= 70 ? -0.015 * size : -0.005 * size;
  const lh = size * lineHeight;
  const { toks } = layout(text, size, weight, ls, width, lh, align);
  const charW = (ch: string) => measure(ch, size, weight, ls);
  const st = step ?? (mode === "drop" ? 0.075 : 0.085);
  let shake = 0;
  let acc = 0,
    curLine = -1;

  const hlBox = (tk: Tok, hv: number, prevHl: boolean) => (
    <div
      style={{
        position: "absolute",
        zIndex: -1,
        left: prevHl ? -(charW(" ") + 8) : -8,
        right: -8,
        top: "8%",
        bottom: "4%",
        background: C.goldLight,
        borderRadius: 12,
        transform: `scaleX(${hv.toFixed(3)})`,
        transformOrigin: "0 50%",
      }}
    />
  );

  const nodes = toks.map((tk, wi) => {
    if (tk.line !== curLine) {
      curLine = tk.line;
      acc = 0;
    }
    const s = t0 + wi * st,
      a = T - s;
    const outW = inCub((T - t1 + 0.36 - wi * 0.012) / 0.3);
    const prevHl = wi > 0 && toks[wi - 1].hl && toks[wi - 1].line === tk.line && tk.hl;
    const chars = [...tk.text];
    let wordTf = "",
      innerTf = "",
      filter = "",
      opacity = 1,
      color: string | undefined;
    const charTf: string[] = chars.map(() => "");
    const charCol: (string | undefined)[] = chars.map(() => undefined);
    const charOp: number[] = chars.map(() => 1);
    let hv = 0;
    let extra = 0;
    let fillLevel = -1;

    if (mode === "act") {
      const u = spring(a / 0.5);
      let tx = 0,
        ty = (1 - u) * 90 - outW * 50,
        sx = 1,
        sy = 1;
      const f = a - 0.3;
      opacity = clamp(a / 0.1) * (1 - outW);
      if (tk.fx === "wide") {
        sx = 1 + 0.45 * Math.sin(Math.PI * clamp(f / 0.9));
        extra = tk.w * (sx - 1);
      }
      if (tk.fx === "stretch") extra = (chars.length - 1) * 12 * Math.sin(Math.PI * clamp(f / 1.1));
      if (tk.fx === "pop") {
        const p = springSoft(a / 0.8);
        sx = sy = Math.max(0.001, p);
        ty = -outW * 50;
      }
      if (tk.fx === "swap") {
        const p = expo(a / 0.7);
        tx = (1 - p) * 360;
        filter = `blur(${((1 - p) * 16).toFixed(1)}px)`;
        ty = -outW * 50;
      }
      if (tk.fx === "rise") {
        const p = springSoft(a / 0.8);
        sy = Math.max(0.001, p);
        ty = (1 - p) * 40 - outW * 50;
      }
      tx += acc;
      acc += extra;
      wordTf = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
      innerTf = `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      chars.forEach((_, i) => {
        let x = 0,
          y = 0,
          r = 0;
        if (tk.fx === "burst" && f > 0) {
          const p = f < 0.22 ? expo(f / 0.22) : 1 - springSoft((f - 0.22) / 0.75);
          const ang = hash(i + wi * 13) * Math.PI * 2,
            dist = 70 + 110 * hash(i * 3.1 + 7);
          x = Math.cos(ang) * dist * p;
          y = Math.sin(ang) * dist * p - 40 * p;
          r = (hash(i * 5.7) - 0.5) * 120 * p;
          charCol[i] = f < 1.1 ? C.lava : C.goldLight;
          if (f < 0.9) shake = Math.max(shake, 1 - f / 0.9);
        }
        if (tk.fx === "fall" && f > 0) {
          const p = easeBounce((f - i * 0.06) / 0.65);
          y = p * 34;
          r = (hash(i * 9.1) - 0.5) * 34 * p;
        }
        if (tk.fx === "stretch" && f > 0) x = i * 12 * Math.sin(Math.PI * clamp(f / 1.1));
        if (tk.fx === "sink" && f > 0) {
          const p = Math.sin(Math.PI * clamp((f - i * 0.06) / 1.0));
          y = 24 * p;
          charCol[i] = p > 0.15 ? C.waterText : undefined;
          charOp[i] = 1 - 0.45 * p;
        }
        if (tk.fx === "wave" && a > 0.4) {
          y = Math.sin(T * 5 - i * 0.55) * 9;
          charCol[i] = C.waterWave;
        }
        if (x || y || r) charTf[i] = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg)`;
      });
      if (tk.fx === "fill") fillLevel = expo((a - 0.45) / 0.9);
      hv = expo((a - 0.15) / 0.4);
    } else if (mode === "pop" || mode === "drop") {
      const o = clamp(a / 0.12);
      opacity = o * (1 - outW);
      if (mode === "pop") {
        const u = spring(a / 0.55);
        wordTf = `translateY(${((1 - u) * 60 - outW * 40).toFixed(1)}px) scale(${(0.86 + 0.14 * u).toFixed(3)})`;
      } else {
        const u = springSoft(a / 0.7),
          r = (wi % 2 ? 1 : -1) * 22 * (1 - u);
        wordTf = `translateY(${((1 - u) * -150 + outW * 60).toFixed(1)}px) rotate(${r.toFixed(2)}deg)`;
      }
      hv = expo((a - 0.12) / 0.4);
    } else if (mode === "wipe") {
      const s2 = t0 + tk.line * 0.32 + (tk.x / width) * 0.42,
        u = expo((T - s2) / 0.45),
        v = inCub((T - t1 + 0.34 - tk.line * 0.04) / 0.3);
      opacity = u > 0.001 && v < 0.999 ? 1 : 0;
      innerTf = `translateX(${((1 - u) * -26).toFixed(1)}px)`;
      filter = "";
      wordTf = "";
      (tk as Tok & { clip?: string }).clip = `inset(-20% ${((1 - u) * 100).toFixed(1)}% -20% ${(v * 100).toFixed(1)}%)`;
      hv = expo((T - s2 - 0.2) / 0.4);
    }
    // mode per huruf
    let k0 = 0;
    for (let j = 0; j < wi; j++) k0 += toks[j].text.length + 1;
    if (mode === "blur" || mode === "type" || mode === "wave") {
      chars.forEach((_, i) => {
        const k = k0 + i;
        if (mode === "blur") {
          const s2 = t0 + k * 0.016,
            u = expo((T - s2) / 0.6),
            v = inCub((T - t1 + 0.36 - k * 0.003) / 0.3);
          charOp[i] = u * (1 - v);
          charTf[i] = `translateY(${((1 - u) * 14).toFixed(1)}px) scale(${(1 + (1 - u) * 0.35).toFixed(3)})`;
          (charCol as (string | undefined)[])[i] = undefined;
          (tk as Tok & { blur?: number[] }).blur = (tk as Tok & { blur?: number[] }).blur ?? [];
          (tk as Tok & { blur?: number[] }).blur![i] = (1 - u) * 14 + v * 10;
        } else if (mode === "type") {
          const total = toks.reduce((n2, x) => n2 + x.text.length + 1, 0);
          const shown = Math.floor((T - t0) / 0.03),
            del = Math.max(0, Math.floor((T - (t1 - 0.55)) / 0.012));
          const vis = clamp(Math.min(shown, total - del), 0, total);
          charOp[i] = k < vis ? 1 : 0;
          if (k === vis - 1 && Math.floor(T * 2.4) % 2 === 0) (tk as Tok & { caret?: number }).caret = i;
        } else {
          const s2 = t0 + k * 0.028,
            u = springSoft((T - s2) / 0.75),
            bob = u > 0.98 ? Math.sin(T * 4 - k * 0.35) * 6 : 0;
          charOp[i] = clamp((T - s2) / 0.1);
          charTf[i] = `translateY(${((1 - u) * 110 + bob).toFixed(1)}px) rotate(${((1 - u) * -24).toFixed(1)}deg)`;
        }
      });
      const firstK = k0;
      hv = mode === "blur" ? expo((T - t0 - firstK * 0.016 - 0.35) / 0.4) : mode === "type" ? expo((T - t0 - (firstK + tk.text.length) * 0.03 - 0.05) / 0.35) : expo((T - t0 - firstK * 0.028 - 0.4) / 0.45);
    }
    if (tk.hl && hv > 0.45) color = C.ink;
    const ext = tk as Tok & { clip?: string; blur?: number[]; caret?: number };

    // isi kata: huruf biasa atau odometer
    let inner: React.ReactNode;
    if (tk.num && mode === "act") {
      const pre = [...tk.num.pre],
        post = [...tk.num.post];
      const digits = idNum(tk.num.n).split("");
      let dj = 0;
      inner = (
        <>
          {pre.map((ch, i) => (
            <span key={`p${i}`} style={{ display: "inline-block", whiteSpace: "pre" }}>
              {ch}
            </span>
          ))}
          {digits.map((ch, i) => {
            if (!/\d/.test(ch))
              return (
                <span key={`d${i}`} style={{ display: "inline-block", color: C.goldLight }}>
                  {ch}
                </span>
              );
            const d = Number(ch),
              j = dj++;
            const p = expo((a - 0.05 - j * 0.08) / (1.1 + j * 0.12)),
              pos = (10 + d) * p;
            return (
              <span key={`d${i}`} style={{ display: "inline-block", position: "relative", overflow: "hidden", width: charW(ch), height: lh, verticalAlign: "bottom", color: C.goldLight }}>
                <span style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${((-pos * 100) / 30).toFixed(3)}%)` }}>
                  {"012345678901234567890123456789".split("").map((x, q) => (
                    <span key={q} style={{ display: "block", height: lh, lineHeight: `${lh}px` }}>
                      {x}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
          {post.map((ch, i) => (
            <span key={`q${i}`} style={{ display: "inline-block", whiteSpace: "pre" }}>
              {ch}
            </span>
          ))}
        </>
      );
    } else if (tk.num) {
      const cnt = idNum(tk.num.n * expo((T - t0 - 0.15) / 1.2));
      inner = (
        <>
          {tk.num.pre}
          <b style={{ fontWeight: Math.max(weight, 600), color: color ?? C.goldLight, fontVariantNumeric: "tabular-nums" }}>{cnt}</b>
          {tk.num.post}
        </>
      );
      if (mode === "type" || mode === "blur" || mode === "wave") {
        // mode per huruf: angka tetap dianimasikan per huruf di bawah
        inner = null;
      }
    }
    if (inner == null) {
      inner = chars.map((ch, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            transform: charTf[i] || undefined,
            color: charCol[i],
            opacity: charOp[i],
            filter: ext.blur ? `blur(${ext.blur[i].toFixed(1)}px)` : undefined,
            boxShadow: ext.caret === i ? `6px 0 0 ${C.goldLight}` : undefined,
          }}
        >
          {ch}
        </span>
      ));
    }
    return (
      <div
        key={wi}
        style={{
          position: "absolute",
          left: tk.x,
          top: tk.y,
          height: lh,
          lineHeight: `${lh}px`,
          whiteSpace: "nowrap",
          opacity,
          transform: wordTf || undefined,
          filter: filter || undefined,
          color: color ?? (tk.num && mode !== "act" ? undefined : undefined),
          isolation: "isolate",
        }}
      >
        {tk.hl ? hlBox(tk, hv, prevHl) : null}
        <div style={{ display: "inline-block", transformOrigin: tk.fx === "wide" ? "0 100%" : "50% 100%", transform: innerTf || undefined, clipPath: ext.clip, position: "relative" }}>
          {inner}
          {fillLevel >= 0 ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                color: C.waterText,
                whiteSpace: "pre",
                clipPath: `polygon(0% 120%, ${Array.from({ length: 11 }, (_, q) => {
                  const xq = q * 10,
                    base = 100 - fillLevel * 100,
                    amp = fillLevel > 0.02 && fillLevel < 0.98 ? 1 : fillLevel >= 0.98 ? 0.4 : 0;
                  return `${xq}% ${(base + 6 * Math.sin(T * 6 + xq * 0.12) * amp).toFixed(1)}%`;
                }).join(", ")}, 100% 120%)`,
              }}
            >
              {tk.text}
            </div>
          ) : null}
        </div>
      </div>
    );
  });
  const sx = shake ? Math.sin(T * 90) * 9 * shake : 0,
    sy = shake ? Math.cos(T * 77) * 6 * shake : 0;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: ls,
        color: C.ivory,
        transform: shake ? `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)` : undefined,
      }}
    >
      {nodes}
    </div>
  );
};

/** Hook: baris-baris kalimat yang muncul dari balik masker per kata; *kata* = italic emas. */
export const HookLines: React.FC<{ lines: { text: string; at: number; big?: boolean }[]; out: number; top?: number }> = ({ lines, out, top = 290 }) => {
  const T = useT();
  if (T > out + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 76, right: 76, top, color: C.ivory, fontFamily: FONT }}>
      {lines.map((L, li) => {
        const words = L.text.split(" ");
        return (
          <div key={li} style={{ fontSize: L.big ? 112 : 80, lineHeight: L.big ? 1 : 1.08, fontWeight: L.big ? 700 : 600, letterSpacing: L.big ? "-0.02em" : "-0.015em", marginTop: L.big ? 34 : li ? 6 : 0 }}>
            {(L.big ? [...L.text] : words).map((w, wi) => {
              const m = !L.big && w.match(/^\*(.+)\*$/);
              const st = L.big ? 0.035 : 0.065;
              const u = expo((T - L.at - wi * st) / 0.6),
                v = inCub((T - out - wi * 0.012) / 0.32);
              const y = (1 - u) * 112 - v * 112;
              const tilt = L.big ? 12 : 7;
              return (
                <React.Fragment key={wi}>
                  <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0 .04em .12em", margin: "0 -.04em -.12em" }}>
                    <span
                      style={{
                        display: "inline-block",
                        transformOrigin: "0 100%",
                        transform: `translateY(${y.toFixed(2)}%) rotate(${((1 - u) * tilt).toFixed(2)}deg)`,
                        opacity: u > 0.001 && v < 0.999 ? 1 : 0,
                        color: L.big || m ? C.goldLight : undefined,
                        fontStyle: m ? "italic" : undefined,
                        fontWeight: m ? 300 : undefined,
                        whiteSpace: "pre",
                      }}
                    >
                      {L.big ? (w === " " ? " " : w) : m ? m[1] : w}
                    </span>
                  </span>
                  {!L.big && wi < words.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
      <div style={{ width: 520, height: 2, marginTop: 18, background: "linear-gradient(90deg,#d8b273,rgba(216,178,115,0))", transformOrigin: "0 50%", transform: `scaleX(${(expo((T - lines[lines.length - 1].at - 0.3) / 0.8) * (1 - inCub((T - out) / 0.3))).toFixed(3)})` }} />
    </div>
  );
};


import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

/** Poppins lokal (public/fonts). Satu-satunya font Atlasnusia. */
const WEIGHTS = [300, 400, 500, 600, 700];
let ready: Promise<unknown> | null = null;
export const loadAtlasFonts = () => {
  if (!ready) {
    ready = Promise.all([
      ...WEIGHTS.map((w) => loadFont({ family: "Poppins", url: staticFile(`fonts/Poppins-${w}.woff2`), weight: String(w) })),
      loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-300-italic.woff2"), weight: "300", style: "italic" }),
    ]);
  }
  return ready;
};

/**
 * Anak-anaknya baru dirender setelah font siap, karena tata letak teks kinetik
 * diukur pakai canvas (lebar kata harus pakai Poppins asli, bukan fallback).
 */
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ok, setOk] = useState(false);
  const [handle] = useState(() => delayRender("Poppins"));
  useEffect(() => {
    loadAtlasFonts()
      .then(() => document.fonts.ready)
      .then(() => {
        setOk(true);
        continueRender(handle);
      });
  }, [handle]);
  return ok ? <>{children}</> : null;
};

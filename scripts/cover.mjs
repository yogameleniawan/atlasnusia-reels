// Cover YouTube Shorts: satu frame dari timeline desain (default: pin + kartu provinsi baru mendarat).
// Pakai: npm run cover -- ATLAS-01                → out/ATLAS-01-cover.png
//        npm run cover -- ATLAS-01 --frame=120    → ambil frame lain (hitungan 30 fps)
// Juga dipanggil otomatis sama `npm run render`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Frame 165 (detik ke-5,5): peta sudah terangkat, pin + kartu 3D provinsi sudah terbuka.
export const DEFAULT_COVER_FRAME = 165;

export const parseFrame = (args) => {
  const f = args.find((a) => a.startsWith("--frame="));
  return f ? Number(f.split("=")[1]) : DEFAULT_COVER_FRAME;
};

export function makeCover(id, frame = DEFAULT_COVER_FRAME) {
  mkdirSync("out", { recursive: true });
  const out = `out/${id}-cover.png`;
  // Komposisi "<ID>-Cover" = timeline desain asli (nggak ikut geser walau timeline disesuaikan voice).
  const props = "out/.cover-props.json";
  writeFileSync(props, JSON.stringify({ noCaptions: true }));
  const r = spawnSync("npx", ["remotion", "still", `${id}-Cover`, out, `--frame=${frame}`, "--image-format=png", `--props=${props}`], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) return r.status ?? 1;

  console.log(`Cover: ${out}`);
  return 0;
}

// Dijalankan langsung lewat `npm run cover`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    console.error("Kasih ID videonya, contoh: npm run cover -- ATLAS-01");
    process.exit(1);
  }
  process.exit(makeCover(id, parseFrame(args)));
}

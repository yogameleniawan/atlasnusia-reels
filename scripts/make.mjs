// Satu command: sync voice → render MP4 (60 fps) → cover.
// Pakai: npm run make -- ATLAS-01                 → out/ATLAS-01.mp4 + out/ATLAS-01-cover.png
//        npm run make -- ATLAS-01 ATLAS-02 ATLAS-03  → beberapa video sekaligus, berurutan
// Opsi render/cover tetap jalan: --30, --no-cover, --frame=120. Opsi sync: --model=medium.
import { spawnSync } from "node:child_process";
import { sync } from "./sync.mjs";
import { ensurePhotos } from "./photos-check.mjs";

const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith("--"));
const flags = args.filter((a) => a.startsWith("--"));
if (!ids.length) {
  console.error("Kasih ID videonya, contoh: npm run make -- ATLAS-01");
  process.exit(1);
}
const model = (flags.find((a) => a.startsWith("--model=")) ?? "--model=small").split("=")[1];
const renderFlags = flags.filter((a) => !a.startsWith("--model="));

const failed = [];
for (const id of ids) {
  if (!ensurePhotos(id)) {
    failed.push(id);
    continue;
  }
  console.log(`\n=== ${id} · 1/2 sync voice ===`);
  try {
    await sync(id, { model });
  } catch (e) {
    console.error(`${id}: sync gagal → ${e.message ?? e}`);
    failed.push(id);
    continue;
  }
  console.log(`\n=== ${id} · 2/2 render + cover ===`);
  const r = spawnSync(process.execPath, ["scripts/render.mjs", id, ...renderFlags], { stdio: "inherit" });
  if (r.status !== 0) failed.push(id);
}

console.log(failed.length ? `\nSelesai, tapi gagal: ${failed.join(", ")}` : `\nBeres: ${ids.join(", ")} → folder out/`);
process.exit(failed.length ? 1 : 0);

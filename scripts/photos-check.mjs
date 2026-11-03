// Pastikan semua foto di photos.json sudah ada di public/ sebelum render.
// Foto nggak ikut di-commit (diunduh dari Wikimedia Commons), jadi kalau belum ada → jalankan commons.mjs otomatis.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

export function ensurePhotos(id) {
  const n = id.replace(/^ATLAS-/i, "");
  const file = `src/videos/atlas-${n}/photos.json`;
  if (!existsSync(file)) return true;
  const list = JSON.parse(readFileSync(file, "utf8"));
  const missing = list.filter((p) => !p.src || !existsSync(`public/${p.src}`));
  if (!missing.length) return true;
  console.log(`Foto belum ada (${missing.map((p) => p.key).join(", ")}), unduh dari Wikimedia Commons dulu…`);
  const r = spawnSync(process.execPath, ["scripts/commons.mjs", `ATLAS-${n}`], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\nFoto ${id} gagal diunduh. Coba lagi: npm run photos -- ${id}`);
    return false;
  }
  return true;
}

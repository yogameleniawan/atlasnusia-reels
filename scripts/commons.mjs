// Ambil foto dari Wikimedia Commons + kredit & lisensinya.
// Pakai: npm run photos -- ATLAS-01
//   Baca src/videos/atlas-01/photos.json → [{ "key": "sigale", "title": "File:Patung Sigale-gale pulau Samosir.jpg" }, …]
//   Download lebar 1400 px → public/photos/atlas-01/<key>.jpg
//   Isi "credit", "license", "licenseUrl", "page" di photos.json (dipakai Video.tsx, kredit tampil di bawah foto).
// Hanya lisensi bebas yang diterima (CC0, Public domain, CC BY, CC BY-SA). Selain itu ditolak.
// Wikimedia membatasi kecepatan: kalau kena 429, script nunggu lalu coba lagi.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "AtlasnusiaReels/1.0 (video edukasi; https://github.com/yogameleniawan/atlasnusia-reels)";
const OK = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => (h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function get(url, kind = "json") {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 429 || r.status >= 500) {
      console.log(`  (${r.status}, tunggu ${20 + i * 15} dtk…)`);
      await sleep((20 + i * 15) * 1000);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return kind === "json" ? r.json() : Buffer.from(await r.arrayBuffer());
  }
  throw new Error(`Gagal terus: ${url}`);
}

const id = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!id) {
  console.error("Kasih ID videonya, contoh: npm run photos -- ATLAS-01");
  process.exit(1);
}
const n = id.replace(/^ATLAS-/i, "");
const file = `src/videos/atlas-${n}/photos.json`;
if (!existsSync(file)) {
  console.error(`Belum ada ${file}. Isi dulu: [{ "key": "nama", "title": "File:Judul di Commons.jpg" }]`);
  process.exit(1);
}
const list = JSON.parse(readFileSync(file, "utf8"));
const params = new URLSearchParams({ action: "query", format: "json", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1400", titles: list.map((p) => p.title).join("|") });
const info = await get(`https://commons.wikimedia.org/w/api.php?${params}`);
const pages = Object.values(info.query?.pages ?? {});
const norm = Object.fromEntries((info.query?.normalized ?? []).map((x) => [x.from, x.to]));
mkdirSync(`public/photos/atlas-${n}`, { recursive: true });

let bad = 0;
for (const p of list) {
  const page = pages.find((x) => x.title === (norm[p.title] ?? p.title));
  const ii = page?.imageinfo?.[0];
  if (!ii) {
    console.error(`✗ ${p.title}: nggak ketemu di Commons`);
    bad++;
    continue;
  }
  const m = ii.extmetadata ?? {};
  const license = strip(m.LicenseShortName?.value);
  if (!OK.test(license)) {
    console.error(`✗ ${p.title}: lisensi "${license}" bukan lisensi bebas, cari foto lain`);
    bad++;
    continue;
  }
  const artist = strip(m.Artist?.value) || "tanpa nama";
  const url = (ii.thumburl ?? ii.url).replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/").split("?")[0];
  const buf = await get(url, "bin");
  writeFileSync(`public/photos/atlas-${n}/${p.key}.jpg`, buf);
  Object.assign(p, { src: `photos/atlas-${n}/${p.key}.jpg`, credit: `Foto: ${artist} · Wikimedia Commons · ${license}`, license, licenseUrl: strip(m.LicenseUrl?.value), page: ii.descriptionurl });
  console.log(`✓ ${p.key}: ${artist} · ${license} (${Math.round(buf.length / 1024)} KB)`);
  await sleep(4000);
}
writeFileSync(file, JSON.stringify(list, null, 2) + "\n");
console.log(bad ? `\n${bad} foto gagal, cek di atas.` : `\nBeres → ${file}`);
process.exit(bad ? 1 : 0);

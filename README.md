# Atlasnusia Reels (Remotion)

Satu project untuk semua video Reels/Shorts **Atlasnusia**: edukasi daerah-daerah Indonesia untuk semua umur.
1080×1920, hitam hangat + emas champagne + gading, satu font (Poppins lokal di `public/fonts`).

## Setup (sekali aja)

Butuh Node.js 20.19+ atau 22+. Buat bikin data peta episode baru juga butuh Python 3 + `pip install shapely`.

```bash
git clone https://github.com/yogameleniawan/atlasnusia-reels.git
cd atlasnusia-reels
npm i
```

## Render

```bash
git pull
npm run render -- ATLAS-01     # → out/ATLAS-01.mp4 (60 fps) + out/ATLAS-01-cover.png
```

- `--30` versi 30 fps · `--no-cover` video aja · `--frame=165` frame cover lain (hitungan 30 fps, default 165:
  pin + kartu provinsi baru terbuka) · `--music=0.4` volume backsound.
- `npm run cover -- ATLAS-01` cover aja. `npm run dev` buka Remotion Studio.
- Tiap episode punya 3 komposisi: `ATLAS-XX` (30 fps), `ATLAS-XX-60fps`, `ATLAS-XX-Cover`.

## Voice over

Video ngikutin voice. Tanpa voice pun video tetap jalan (durasi desain).

1. Buka `src/videos/atlas-01/naskah-voice.txt` (dibikin `npm run sync`), naskah sudah dipecah per BAGIAN
   (maks ±480 karakter buat text-to-speech CapCut). Generate tiap bagian, susun berurutan.
2. Export audio: `public/voice/atlas-01.mp3`, atau per bagian `atlas-01-1.mp3`, `atlas-01-2.mp3`, dst.
3. `npm run make -- ATLAS-01` → sync (Whisper lokal) + render + cover sekaligus.

- Durasi tiap scene ngikut potongan voice-nya, animasi dipercepat/diperlambat di dalam scene (tetap nyambung).
  Voice yang jauh lebih pendek: animasi maks 1,4× lebih cepat, sisanya tanpa suara.
- Bumper logo 4 detik otomatis di akhir (tanpa voice).
- Backsound: `public/backsound/xxx.mp3` (default) atau `public/voice/atlas-01-backsound.mp3` (khusus). Volume 0,3.
- Ubah teks: edit `naskah-dubbing.md` (jumlah bagian = jumlah scene di `Video.tsx`), generate ulang, sync lagi.

## Sound effect

Koleksi yang sama dengan algonoma-reels di `public/sfx/`. Daftar & arti tiap suara: `src/atlas/sfx.tsx`.
Cue ditulis di `Video.tsx` dalam waktu desain: `{ t: 9.38, s: "drum" }`, ikut geser otomatis kalau durasi ngikut voice.
Matikan: `--props='{"noSfx":true}'` · volume: `--props='{"sfxVolume":0.6}'`.

## Episode baru (ATLAS-XX)

1. **Peta**: `npm run map -- --out src/videos/atlas-XX/map.json --bbox ... --cen ... --province "..."`
   (opsi lengkap di kepala `scripts/prep_map.py`; data sumber di-download sekali ke `.mapdata/`).
2. **Foto**: isi `src/videos/atlas-XX/photos.json` dengan judul file Wikimedia Commons, lalu
   `npm run photos -- ATLAS-XX` → foto masuk `public/photos/atlas-XX/`, kredit & lisensi terisi otomatis.
   Cuma lisensi bebas (CC0, public domain, CC BY, CC BY-SA) yang diterima.
3. **Naskah**: `naskah-dubbing.md` per scene.
4. **Video.tsx**: salin dari `atlas-01`, ganti scene, kamera, pin, kartu, teks kinetik, foto, cue SFX.
   Daftarkan di `src/videos/index.ts`.
5. `npm run sync -- ATLAS-XX` (bikin `voice.ts` + `naskah-voice.txt`), cek di Studio, render.

## Struktur

```
public/fonts            Poppins 300–700 (+ 300 italic)
public/sfx              sound effect
public/photos/atlas-XX  foto episode (Wikimedia Commons, kredit di photos.json)
scripts/                render, make, sync (Whisper), cover, commons (foto), prep_map.py (peta)
src/atlas/              mesin Atlasnusia
  tokens.ts             warna, font, easing, bounce
  map.ts, MapStage.tsx  data peta, kamera, lempeng 3D (three.js)
  overlay.tsx           label kota/kabupaten, border menyala, garis ukur, tulisan di peta, kompas, scrim
  pins.tsx              pin emas memantul + kartu 3D + ilustrasi siluet wilayah
  kinetic.tsx           teks kinetik (mode act/pop/drop/wipe/blur/type/wave + efek per kata) + hook
  brand.tsx             simbol, watermark, bumper, bingkai foto (arch/polaroid/woven/round)
  voice.tsx, sfx.tsx    timeline voice, backsound, SFX
src/videos/atlas-XX/    satu episode: Video.tsx, map.json, photos.json, naskah-dubbing.md, voice.ts
```

## Daftar episode

| ID | Judul | Durasi |
|---|---|---|
| ATLAS-01 | Danau Toba: danau di atas pulau di tengah danau | ±41 dtk (tanpa voice) |

## Sumber data & lisensi

- Batas kabupaten/kota: [geoBoundaries](https://www.geoboundaries.org) (CC BY 4.0).
- Pantai, provinsi, negara, jalan, kota: [Natural Earth](https://www.naturalearthdata.com) (public domain).
- Foto: Wikimedia Commons, pemotret & lisensi per foto di `src/videos/atlas-XX/photos.json` dan tampil di video.
  Tulis juga kreditnya di caption saat posting.

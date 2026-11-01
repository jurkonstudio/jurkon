# Sitemap dan pengindeksan global

- `node tools/buat-sitemap.js` membuat `sitemap.xml` dari daftar di dalam skrip (11 bahasa landing + halaman publik). Skrip menolak halaman bernoindex, canonical yang tidak cocok, dan hreflang yang tidak ada di `<head>`.
- `lastmod` berubah hanya bila isi halaman berubah (sidik di `tools/sitemap-lastmod.json`, ikut di-commit). Ganti versi skrip/CSS/SRI tidak dihitung.
- `sitemap-catatan.xml` (catatan publik) tetap dibuat Worker, lihat `worker/README.md`.
- Setiap rilis yang mengubah halaman publik: `node tools/buat-sitemap.js`, commit, push. Lalu (opsional) `node tools/indexnow.js` untuk Bing/Yandex/Naver/Seznam.
- Google tidak memakai IndexNow: kirim `sitemap.xml` di Search Console (sekali; Google membaca ulang sendiri).
- Menambah bahasa baru: buat landing-nya, tambahkan satu baris di `BAHASA` pada `tools/buat-sitemap.js`, dan pastikan setiap landing memuat hreflang ke bahasa itu (jalankan `node tools/buat-landing.js` setelah menambah bahasa di `landing-teks.js`).

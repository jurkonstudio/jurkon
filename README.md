# Jurnal Koneksi (Jurkon) — jurkon.my.id

Sosial media minimalis berbahasa Indonesia: posting maks 250 karakter, pesan maks 750 karakter.
Stack: HTML/CSS/JS biasa (tanpa framework, tanpa build) + Supabase (Auth, Postgres, Realtime, RLS). Hosting: GitHub Pages. PWA.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/pasang.md`](docs/pasang.md) | memasang dari nol, domain, versi cache, cara merilis |
| [`sql/README.md`](sql/README.md) | urutan migrasi SQL dan prasyaratnya |
| [`docs/keamanan.md`](docs/keamanan.md) | anti-bot, CAPTCHA, pengaturan Auth, CSP, filter konten |
| [`docs/fitur.md`](docs/fitur.md) | notifikasi, feed, mention, foto profil, kutip, pesan, media chat |
| [`docs/admin.md`](docs/admin.md) | panel admin dan landing page |
| [`docs/teknis.md`](docs/teknis.md) | performa, kamus bahasa, service worker, login |

## Alur rilis (ringkas)

1. Ada perubahan SQL? Jalankan di Supabase **dulu**, sebelum mengunggah kode (lihat `sql/README.md`).
2. Mengubah kamus bahasa (`js/bahasa.js`)? Jalankan `node tools/pecah-bahasa.js`.
3. Mengubah daftar kata terlarang (`js/filter-data.js`)? Jalankan `node tools/buat-filter-sql.js`, lalu jalankan ulang `sql/004_filter_konten.sql`.
4. Sebelum commit: `node tools/naikkan-cache.js` (menaikkan versi cache supaya HP pengguna memakai berkas baru).
5. Commit dan push ke `main`. GitHub Pages terbit otomatis.

## Struktur folder

```
*.html            halaman (index, login, profil, chat, notifikasi, dst.)
css/              style.css, tema-kaca.css, tema-awan.css, admin.css, landing.css
js/               logika aplikasi; js/bahasa/ dihasilkan oleh tools/pecah-bahasa.js
sql/              schema.sql + migrasi bernomor (lihat sql/README.md); arsip/ = rujukan lama
supabase/         Edge Function hapus-media-kedaluwarsa
tools/            skrip bantu (cache, bahasa, filter, SRI, gabung SQL)
murthehelp/       Pusat Kendali admin
docs/             dokumentasi
assets/           logo, ikon PWA, gambar OG
sw.js             service worker (cache berversi)
```

## Keamanan singkat

- Hanya kunci anon/publishable yang boleh ada di repo. Jangan pernah commit `service_role` (`.gitignore` sudah menolak `.env`, `*.key`, `*.pem`).
- Semua tabel memakai Row Level Security; batas 250/750 karakter dipasang di database, bukan hanya di tampilan.
- Detail lengkap: [`docs/keamanan.md`](docs/keamanan.md). Menemukan kerentanan? Lihat `/.well-known/security.txt`.

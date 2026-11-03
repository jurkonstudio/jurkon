# Keamanan dan filter konten

## Keamanan
- Hanya pakai anon key di kode. Jangan pernah commit service_role key (`.gitignore` sudah menolak `.env`, `*.key`, `*.pem`).
- Semua tabel memakai Row Level Security (lihat schema.sql). Batas 250/750 karakter dipasang di database, bukan hanya di tampilan.

### Perlindungan dari bot & perusakan (pasang berurutan)

**Kenyataan penting:** kunci anon Supabase itu publik, jadi bot tidak perlu membuka situs Anda; ia bisa memanggil API Supabase langsung. Karena itu perlindungan yang sungguhan harus ada di server (langkah 1-3). Lapisan di browser (CSP, honeypot, jeda gagal) hanya pelengkap.

1. **Database:** jalankan `sql/019_anti_bot_keamanan.sql` (setelah 002-018). Isinya: hanya akun dengan email terverifikasi dan tidak dibekukan yang boleh posting/pesan/suka/ikuti/lapor; email sekali pakai ditolak saat daftar; karakter tak terlihat dan penimpa arah teks ditolak; hak `anon` dicabut dari semua tabel dan fungsi; daftar isi bucket avatar tidak lagi publik. Hasil akhir skrip harus **0 baris** (itu pemeriksaan otomatis). Admin dapat membekukan penulis dari halaman Admin (tombol *Bekukan penulis* pada laporan), atau `select bekukan_akun('<uuid>', 'alasan');` / `select buka_pembekuan('<uuid>');`.
2. **CAPTCHA (Cloudflare Turnstile, gratis):**
   a. Cloudflare > Turnstile > *Add site* (domain `jurkon.my.id`, mode Managed). Salin *Site key* ke `TURNSTILE_SITE_KEY` di `js/supabase.js`.
   b. Unggah kode ke GitHub dan tunggu Pages selesai.
   c. **Baru kemudian** Supabase > Authentication > Attack Protection > *Enable CAPTCHA protection* > Turnstile > tempel *Secret key*. (Urutan ini penting: bila CAPTCHA diaktifkan di Supabase sebelum kode baru tayang, login semua orang akan gagal. Mengisi site key lebih dulu aman karena token diabaikan selama CAPTCHA Supabase mati.)
3. **Pengaturan Auth Supabase** (Authentication):
   - *Providers > Email*: **Confirm email = ON** (tanpa ini email palsu langsung aktif), panjang sandi minimal 8, wajib huruf dan angka, aktifkan *Leaked password protection* bila paket Anda mendukung.
   - *Sign In / Providers*: **Allow anonymous sign-ins = OFF**; matikan provider yang tidak dipakai.
   - *Rate Limits*: turunkan batas email, sign-in, dan token ke angka wajar. Pasang *Custom SMTP* sendiri (email bawaan Supabase sangat terbatas dan mudah dibuat penuh oleh bot).
   - *URL Configuration*: Redirect URLs hanya domain Anda (tanpa wildcard `*`).
   - *Sessions*: kecilkan *JWT expiry* (3600 dtk) dan aktifkan *Refresh token rotation*.
   - Aktifkan TOTP/MFA dan 2FA untuk akun admin Anda, dan 2FA di akun GitHub, Supabase, dan registrar domain.
4. **Browser:** setiap halaman kini memakai Content-Security-Policy (hanya skrip dari situs sendiri + jsDelivr [+ Cloudflare Turnstile di login]), `referrer` terbatas, pemblokir iframe (`js/keamanan.js`), dan tanpa skrip inline. Bila menambah layanan luar (analitik, font, dsb), tambahkan domainnya di meta CSP tiap HTML atau akan diblokir. Semua halaman sudah diuji di browser headless tanpa pelanggaran CSP (kecuali widget Turnstile, yang baru aktif setelah site key diisi, jadi uji login Anda sendiri setelah langkah 2). Bila dibingkai situs lain, halaman menyembunyikan diri.
5. **SRI pustaka Supabase:** sudah terpasang (atribut `integrity` di semua tag `<script>` pustaka). Untuk memasang ulang, atau setelah menaikkan versi pustaka: GitHub > Actions > **Pasang SRI** > Run workflow (`.github/workflows/sri.yml`: menghitung hash, memasangnya di semua HTML, lalu menaikkan versi cache). Alternatif di komputer: `node tools/pasang-sri.js`. Bila versi supabase-js diganti, ubah URL-nya di `sw.js` (`LIB`), di workflow, dan di semua HTML sekaligus.
6. **GitHub:** Settings > Branches > aturan proteksi `main` (wajib pull request, tanpa force-push), aktifkan Secret scanning dan Push protection, dan *Enforce HTTPS* di Pages.
7. **Lapisan tambahan yang disarankan:** letakkan domain di belakang Cloudflare (gratis) untuk Bot Fight Mode, rate limiting, dan *Transform Rules* yang mengirim header sungguhan (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `Permissions-Policy`, `frame-ancestors 'none'`); GitHub Pages sendiri tidak bisa mengirim header.

8. **Login dengan username (Edge Function `masuk-username`):**
   - IP untuk batas laju diambil dari `cf-connecting-ip`, dengan cadangan entri TERAKHIR `x-forwarded-for`. Entri pertama tidak dipercaya karena bisa dipalsukan klien.
   - Hanya galat CAPTCHA, batas laju, dan "email belum dikonfirmasi" yang diteruskan; semua galat lain dijawab sama ("Invalid login credentials"). Username yang tidak ada tetap melalui satu percobaan masuk palsu agar waktu jawabnya mirip.
   - CORS dibatasi ke `https://jurkon.my.id` dan `https://www.jurkon.my.id`. Menambah asal lain (mis. pratinjau Codespaces): `supabase secrets set ALLOWED_ORIGINS="https://jurkon.my.id,https://www.jurkon.my.id,https://NAMA.app.github.dev"`.
   - Deploy ulang setiap kali `index.ts` berubah: `supabase functions deploy masuk-username --no-verify-jwt`. GitHub Pages tidak menjalankan fungsi ini.
   - Token akses Supabase yang dipakai untuk deploy adalah kunci ke seluruh akun: hapus dari dashboard (Account > Access Tokens) setelah selesai, dan jangan menampilkannya di layar atau tangkapan layar.

Kerentanan ditemukan? Lihat `/.well-known/security.txt`.

## Filter konten terlarang
Tulisan dicek sebelum dikirim (posting, balasan, pesan, nama, bio, username).
- **Diblokir**: judi, konten dewasa, narkoba, penipuan, ancaman, SARA, NIK. Dicek di layar (`js/filter.js`) dan di database (`sql/004_filter_konten.sql`).
- **Peringatan** (boleh tetap kirim): kata kasar dan nomor telepon. Hanya di layar.
- Daftar kata ada di satu tempat: `js/filter-data.js`. Setelah mengubahnya jalankan `node tools/buat-filter-sql.js`, lalu jalankan ulang `sql/004_filter_konten.sql` di Supabase.
- Variasi penyamaran (`j0di`, `t.o.g.e.l`, `togeeel`) ikut terdeteksi. Kata sehari-hari yang ambigu sengaja tidak diblokir agar tidak salah sasaran.
- Daftar ini titik awal, bukan nasihat hukum. Tinjau dan sesuaikan secara berkala.

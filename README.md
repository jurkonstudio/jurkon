# Jurnal Koneksi (Jurkon) — jurkon.my.id

Sosial media minimalis: posting maks 250 karakter, pesan maks 750 karakter.
Stack: HTML/CSS/JS biasa + Supabase. Hosting: GitHub Pages.

## Langkah pasang
1. **Supabase**: buat project baru → SQL Editor → tempel isi `sql/schema.sql` → Run.
1b. Jalankan juga `sql/002_privasi_keamanan.sql`, `sql/003_feed_cepat.sql`, `sql/004_filter_konten.sql`, lalu `sql/006_feed_dua_bagian.sql`, `sql/007_anti_spam.sql`, dan `sql/008_foto_profil_limit.sql` (berurutan; `005_notifikasi.sql` opsional, lihat bagian Notifikasi). Tanpa 002, tidak ada blokir, batas spam, admin, hapus akun, dan ekspor data. Migrasi lanjutan (013-019, termasuk foto/suara chat dan notifikasi) ada di bagian "Urutan migrasi terbaru" di bawah.
2. Supabase → Project Settings → API → salin *Project URL* dan *anon public key* ke `js/supabase.js`.
3. Supabase → Authentication → URL Configuration: isi Site URL dengan `https://jurkon.my.id`.
   Tambahkan juga `https://jurkon.my.id/reset.html` dan `https://jurkon.my.id/index.html` di *Redirect URLs* (wajib agar "Lupa kata sandi" dan login Google bisa kembali ke aplikasi).
   (Opsional) aktifkan login Google di Authentication → Providers.
4. **GitHub**: buat repo, unggah semua isi folder ini (file `CNAME` harus di akar repo).
5. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
6. Domain: di panel domain, buat record `A` ke 185.199.108.153, .109.153, .110.153, .111.153
   (atau `CNAME` untuk `www` ke `USERNAME.github.io`). Lalu centang *Enforce HTTPS* di Pages.
7. Ikon aplikasi sudah ada di `assets/icons/`.

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
   d. Login Google tidak memakai CAPTCHA (Google sendiri yang memeriksa).
3. **Pengaturan Auth Supabase** (Authentication):
   - *Providers > Email*: **Confirm email = ON** (tanpa ini email palsu langsung aktif), panjang sandi minimal 8, wajib huruf dan angka, aktifkan *Leaked password protection* bila paket Anda mendukung.
   - *Sign In / Providers*: **Allow anonymous sign-ins = OFF**; matikan provider yang tidak dipakai.
   - *Rate Limits*: turunkan batas email, sign-in, dan token ke angka wajar. Pasang *Custom SMTP* sendiri (email bawaan Supabase sangat terbatas dan mudah dibuat penuh oleh bot).
   - *URL Configuration*: Redirect URLs hanya domain Anda (tanpa wildcard `*`).
   - *Sessions*: kecilkan *JWT expiry* (3600 dtk) dan aktifkan *Refresh token rotation*.
   - Aktifkan TOTP/MFA dan 2FA untuk akun admin Anda, dan 2FA di akun GitHub, Supabase, dan registrar domain.
4. **Browser:** setiap halaman kini memakai Content-Security-Policy (hanya skrip dari situs sendiri + jsDelivr [+ Cloudflare Turnstile di login]), `referrer` terbatas, pemblokir iframe (`js/keamanan.js`), dan tanpa skrip inline. Bila menambah layanan luar (analitik, font, dsb), tambahkan domainnya di meta CSP tiap HTML atau akan diblokir. Semua halaman sudah diuji di browser headless tanpa pelanggaran CSP (kecuali widget Turnstile, yang baru aktif setelah site key diisi, jadi uji login Anda sendiri setelah langkah 2). Bila dibingkai situs lain, halaman menyembunyikan diri.
5. **SRI pustaka Supabase:** jalankan sekali di komputer Anda `node tools/pasang-sri.js` (menambahkan `integrity` ke tag `<script>` pustaka). Lalu naikkan `CACHE` di `sw.js` dan unggah ulang.
6. **GitHub:** Settings > Branches > aturan proteksi `main` (wajib pull request, tanpa force-push), aktifkan Secret scanning dan Push protection, dan *Enforce HTTPS* di Pages.
7. **Lapisan tambahan yang disarankan:** letakkan domain di belakang Cloudflare (gratis) untuk Bot Fight Mode, rate limiting, dan *Transform Rules* yang mengirim header sungguhan (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `Permissions-Policy`, `frame-ancestors 'none'`); GitHub Pages sendiri tidak bisa mengirim header.

Kerentanan ditemukan? Lihat `/.well-known/security.txt`.

## Filter konten terlarang
Tulisan dicek sebelum dikirim (posting, balasan, pesan, nama, bio, username).
- **Diblokir**: judi, konten dewasa, narkoba, penipuan, ancaman, SARA, NIK. Dicek di layar (`js/filter.js`) dan di database (`sql/004_filter_konten.sql`).
- **Peringatan** (boleh tetap kirim): kata kasar dan nomor telepon. Hanya di layar.
- Daftar kata ada di satu tempat: `js/filter-data.js`. Setelah mengubahnya jalankan `node tools/buat-filter-sql.js`, lalu jalankan ulang `sql/004_filter_konten.sql` di Supabase.
- Variasi penyamaran (`j0di`, `t.o.g.e.l`, `togeeel`) ikut terdeteksi. Kata sehari-hari yang ambigu sengaja tidak diblokir agar tidak salah sasaran.
- Daftar ini titik awal, bukan nasihat hukum. Tinjau dan sesuaikan secara berkala.

## Notifikasi

Panel notifikasi dalam aplikasi: suka, balasan, pengikut baru, dan pesan baru, dengan lencana belum dibaca dan pembaruan realtime.

- **Database:** jalankan `sql/005_notifikasi.sql` di Supabase SQL Editor (setelah 002). Notifikasi dibuat oleh trigger; klien hanya boleh membaca, menandai dibaca, dan menghapus miliknya. Pesan digabung: satu notifikasi belum dibaca per percakapan.
- **Retensi:** `select bersihkan_notifikasi(60);` menghapus notifikasi lebih dari 60 hari. Petunjuk penjadwalan dengan pg_cron ada di akhir file SQL.
- **Klien:** `js/notif.js` (jumlah, realtime, penyusun kalimat), `js/notifikasi.js` + `notifikasi.html` (daftar). Tab Notifikasi dan lencana ada di `js/nav.js`; ringkasan 5 terbaru tampil di panel kanan layar lebar.
- Bila migrasi belum dijalankan, aplikasi tetap berjalan tanpa lencana.

## Feed Beranda: Publik dan Mengikuti

Beranda punya dua tab. **Publik** menampilkan semua posting utama; **Mengikuti** hanya posting sendiri dan akun yang diikuti (kosong bila belum mengikuti siapa pun, dengan ajakan ke Jelajah). Tab terakhir yang dipilih diingat di perangkat (`localStorage: feedAktif`, bawaan Publik).

- Klien: `index.html` (tab), `js/feed.js` (logika), `css/style.css` (bagian *Tab feed*).
- Database: jalankan `sql/006_feed_dua_bagian.sql` untuk menambah mode `ikuti` pada `daftar_posting`. Tanpa itu aplikasi tetap jalan, hanya akun yang belum mengikuti siapa pun akan melihat semua posting di tab Mengikuti.

## Mention @username

Saat menulis posting atau balasan, mengetik `@` memunculkan saran akun (akun yang diikuti lebih dulu; ketik huruf untuk mencari username). Ketuk saran untuk menyisipkan. `@username` di dalam posting tampil sebagai tautan ke profil. Tanpa migrasi database. Kode: `js/mention.js`, `isiHtml()` di `js/ui.js`. Mention mengirim notifikasi (migrasi 015).

## Foto profil & batas ubah bulanan

Di **Profil > Ubah profil**, pemilik akun bisa mengunggah, mengganti, atau menghapus foto profil. Foto otomatis dipotong persegi, dikecilkan ke 320px, dan disimpan sebagai JPEG (data lokasi/EXIF hilang). Foto tampil di semua tempat: feed, detail & balasan, profil, Jelajah (pencarian orang), daftar & header Pesan, Notifikasi, dan saran @mention. Bila foto gagal dimuat atau belum ada, tampil huruf inisial seperti sebelumnya.

- **Batas per bulan kalender (zona WIB, reset tanggal 1)**: foto 3x, nama 2x, username 2x. Ubah angkanya di fungsi `batas_profil()` pada `sql/008_foto_profil_limit.sql`, lalu jalankan ulang file itu. Hapus foto juga dihitung sebagai satu perubahan. Mengubah bio tidak dibatasi. Aturan username sekali sehari (007) tetap berlaku.
- **Ditegakkan di database** (trigger `batasi_profil_bulanan_trg`), bukan hanya di layar. Layar menampilkan sisa jatah dan meminta konfirmasi sebelum memakai jatah. Pengisian profil pertama (halaman selamat) tidak dihitung.
- **Penyimpanan**: bucket publik `avatar` (maks 512 KB per file, JPG/PNG/WebP). Pengguna hanya boleh mengunggah ke foldernya sendiri, maksimal 6 file tersimpan; foto lama dihapus otomatis setelah ganti. `foto_url` hanya boleh menunjuk ke folder milik sendiri.
- **Urutan pasang**: jalankan `008` di Supabase DULU, baru unggah kode ke GitHub. Tanpa 008, kueri yang meminta kolom `foto_url` akan gagal.
- Catatan: foto tidak dimoderasi otomatis. Laporan akun tetap lewat alur laporan yang ada, dan admin bisa mengosongkan `foto_url` lewat SQL Editor (tidak dibatasi jatah).

## Dislike, kutip, posting ulang, dan penanda perangkat
- **Database:** jalankan `sql/013_perangkat_dislike_kutip.sql` (setelah 002–012; aman diulang). Isinya: kolom `perangkat`, `jenis`, `kutip_id` di `posts`, tabel `dislikes`, fungsi `toggle_tidak_suka`, `toggle_ulang`, `statistik_posting`, dan pembatas posting yang mengenal kutip/ulang.
- **Dislike:** jumlahnya tampil di tiap kartu; siapa yang dislike tidak terlihat orang lain. Menyukai posting otomatis membatalkan dislike, dan sebaliknya.
- **Posting ulang:** ketuk ikon panah ganda → Posting ulang. Muncul di profil dan feed pengikut sebagai kartu "X memposting ulang". Posting ulang tidak memakai kuota menulis harian.
- **Kutip:** ketuk ikon panah ganda → Kutip, tulis komentar; posting asli tampil sebagai kotak kutipan. Bila aslinya dihapus, kutipan tampil "tidak tersedia".
- **Perangkat:** tiap posting baru menyimpan iOS/Android/Web (dari browser), tampil kecil di bawah posting.
- Tanpa migrasi 013, aplikasi tetap berjalan; fitur-fitur di atas hanya belum muncul.
- Catatan: `007_anti_spam.sql` sudah diperbaiki (sintaks `CASE` di dalam `IF` ditolak Postgres); jalankan ulang file itu bila sebelumnya gagal.

## Pesan hanya untuk akun yang saling mengikuti, dan notifikasi "Mengikuti"
- **Database:** jalankan `sql/014_pesan_saling_ikuti_notif_mengikuti.sql` (setelah 002 dan 005; aman diulang). Jalankan SEBELUM mengunggah kode JS terbaru.
- **Pesan:** pesan hanya bisa dikirim bila kedua akun saling mengikuti. Ditegakkan di database (fungsi `saling_ikuti`, kebijakan insert `messages`, dan `buka_percakapan`), jadi tidak bisa ditembus lewat API. Bila salah satu berhenti mengikuti, riwayat tetap terbaca tetapi kotak kirim terkunci. Di profil, tombol Kirim Pesan nonaktif sampai saling mengikuti.
- **Notifikasi terpisah:** halaman Notifikasi punya dua tab. *Aktivitas* (suka, balasan, pengikut baru, pesan) dan *Mengikuti* (catatan baru dari akun yang kamu ikuti, jenis `posting`). Jumlah belum dibaca dan "Tandai semua dibaca" dihitung per tab; lencana menu menjumlahkan keduanya (ubah di `js/nav.js`, baris `setLencana('notifikasi', ...)`, bila hanya ingin Aktivitas). Panel kanan hanya menampilkan Aktivitas.
- Notifikasi "Mengikuti" dibuat oleh trigger saat catatan utama diposting (balasan dan posting ulang murni tidak). Satu baris per pengikut, jadi akun dengan pengikut sangat banyak akan menulis banyak baris per posting; retensi 60 hari (`bersihkan_notifikasi`) berlaku juga di sini.

## Notifikasi kutip, posting ulang, dan mention
- **Database:** jalankan `sql/015_notif_kutip_ulang_mention.sql` (setelah 002, 005, 013, 014; aman diulang). Jalankan SEBELUM mengunggah kode JS terbaru.
- Jenis baru di tab *Aktivitas*: `ulang` (catatanmu diposting ulang), `kutip` (catatanmu dikutip), `mention` (@usernamemu disebut di posting atau balasan).
- Tidak ganda: pemilik catatan yang dibalas atau dikutip tidak mendapat mention lagi untuk catatan itu, dan pengikut yang sudah mendapat kutip/mention tidak mendapat notifikasi "Mengikuti" untuk catatan yang sama.
- Maksimal 5 akun yang disebut per catatan yang diberi notifikasi. Membatalkan posting ulang menghapus notifikasinya.

## Performa (pembaruan 016)

- **Kamus bahasa dipecah per bahasa.** Sumber tetap `js/bahasa.js` (edit di sini). Setelah mengubahnya jalankan `node tools/pecah-bahasa.js` untuk membuat ulang `js/bahasa/<kode>.js` dan `js/bahasa-muat.js`, lalu commit semuanya. Browser hanya mengunduh satu bahasa (sekitar 16 KB, bukan 94 KB). `node tools/cek-bahasa.js` tetap dipakai untuk memeriksa kamus.
- **Indeks database:** jalankan `sql/016_performa.sql` di Supabase (hanya menambah indeks, aman diulang).
- **Service worker:** naikkan angka `CACHE` di `sw.js` setiap ada perubahan berkas statis (sekarang `jurkon-v29`).
- **Chat** kini menyusul pesan yang terlewat saat koneksi realtime putus.

## Foto & pesan suara di chat (hilang setelah 10 menit)
Di kotak kirim chat ada tombol kamera (foto) dan mikrofon (pesan suara, maks 60 detik). Berkas hanya bisa dibuka **10 menit** sejak dikirim; setelah itu gelembung berubah menjadi "sudah hilang". Foto dan suara hanya bisa dikirim antar akun yang saling mengikuti (aturan yang sama dengan pesan teks).

- **Database:** jalankan `sql/017_media_pesan.sql` (setelah 002, 004, 007, dan 014_pesan_saling_ikuti; aman diulang) SEBELUM mengunggah kode JS terbaru. Isinya: kolom `media_jenis`/`media_path` di `messages`, bucket privat `media-pesan` (maks 3 MB per berkas), kebijakan storage, dan pembatas media (akun baru 10/jam, lainnya 40/jam; maks 12 unggahan per 10 menit).
- **Akses 10 menit ditegakkan di database:** kebijakan baca storage hanya meloloskan peserta percakapan selama 10 menit sejak unggah, jadi tidak bisa dibuka lagi lewat API walau berkasnya belum terhapus. Tautan yang dibuat klien juga berlaku paling lama sampai batas itu.
- **Penghapusan fisik berkas:** ada dua lapis. (1) Cadangan: saat pengirim membuka chat, berkas miliknya yang kedaluwarsa dihapus. (2) Utama: Edge Function `supabase/functions/hapus-media-kedaluwarsa` membuang semua berkas lewat 10 menit. Pasang sekali: Supabase > Edge Functions > deploy folder itu (atau `supabase functions deploy hapus-media-kedaluwarsa`), lalu jadwalkan tiap 5 menit lewat Integrations > Cron (jenis Edge Function) atau pg_cron + pg_net. Kunci service_role disediakan Supabase di dalam fungsi; jangan dimasukkan ke repo. **Fungsi ini sekarang menolak panggilan tanpa rahasia bersama** (kunci anon itu publik): jalankan `supabase secrets set CRON_SECRET=<acak 32+ karakter>`, dan penjadwal harus mengirim `POST` dengan header `x-cron-secret: <nilai yang sama>` (Cron jenis HTTP Request, atau pg_cron + pg_net).
- **Foto:** dikecilkan ke maks 1280px dan disimpan ulang sebagai JPEG di perangkat, sehingga data EXIF/lokasi hilang. **Suara:** MP4/AAC bila didukung, selain itu WebM/Opus (Android Chrome lama merekam WebM, yang bisa gagal diputar di iPhone lama).
- Rekam suara butuh HTTPS dan izin mikrofon (GitHub Pages sudah HTTPS). Tombol media otomatis tersembunyi bila migrasi 017 belum dijalankan atau perangkat tak mendukung rekam suara.
- Catatan: foto dan suara tidak dimoderasi otomatis (filter kata hanya untuk teks). Blokir tetap berlaku. Pertimbangkan menambah satu kalimat di Kebijakan Privasi bahwa media chat hanya tersimpan 10 menit.

## Notifikasi suka ikut hilang saat suka dibatalkan
Jalankan `sql/018_hapus_notif_suka.sql` (setelah 005 dan 013; aman diulang). Bila suka dibatalkan, termasuk saat menekan "tidak suka" yang otomatis membatalkan suka, notifikasi "menyukai catatanmu" ikut dihapus (seperti posting ulang yang dibatalkan). Suka lagi sesudahnya memberi notifikasi baru; batas laju suka (007) mencegah penyalahgunaan.

## Urutan migrasi terbaru
`sql/jalankan-pembaruan-terbaru.sql` hanya memuat 007, 013, dan `014_notifikasi_kutip_ulang`. Migrasi berikut dijalankan **terpisah**, berurutan: `014_pesan_saling_ikuti_notif_mengikuti` -> `015_notif_kutip_ulang_mention` -> `016_performa` -> `017_media_pesan` -> `018_hapus_notif_suka`. Jalankan SQL dulu, baru unggah kode JS terbaru.

## Panel admin & landing page (migrasi 020)

Halaman `admin.html` kini panel lengkap: **Ringkasan** (statistik + grafik 14 hari), **Laporan** (baru/selesai; hapus posting, bekukan penulis), **Pengguna** (cari, bekukan/buka, jadikan admin, hapus akun), **Posting** (cari, sorot, hapus), **Sorotan Jelajah**, **Landing & situs** (teks landing, pengumuman, buka/tutup pendaftaran), **Admin** (tambah/cabut admin), dan **Jejak** (log semua aksi admin).

1. Jalankan `sql/020_panel_admin.sql` di Supabase SQL Editor (setelah 002-019). Aman diulang. Hasil pemeriksaan di akhir skrip harus **tepat 1 baris: `landing_publik()`**.
2. Jadikan dirimu admin (sekali saja, bila belum): `insert into admins (user_id) select id from auth.users where email = 'EMAIL-KAMU@contoh.com';`
3. Buka `/admin.html` (di-`noindex`, hanya terlihat oleh admin). Admin berikutnya bisa ditambah dari tab *Admin*.
4. **Landing page** ada di `/landing.html` (teks, pengumuman, angka pengguna/catatan, dan status pendaftaran diambil dari Supabase). Untuk menjadikannya halaman depan domain, lihat catatan di bawah.

Keamanan panel: semua aksi lewat fungsi `admin_*` yang memeriksa `is_admin()` di database; tabel `pengaturan_situs` dan `admin_log` tertutup untuk klien; setiap aksi tercatat di `admin_log`. Satu-satunya fungsi untuk pengunjung tanpa login adalah `landing_publik()` (hanya total pengguna, total catatan, dan teks landing, tanpa data pribadi). **Menjalankan ulang 019 mencabut hak itu**; jalankan ulang 020 setelahnya. Tombol *tutup pendaftaran* ditegakkan oleh trigger di `auth.users` (berlaku juga untuk login Google).

Menjadikan landing sebagai halaman depan: sekarang `index.html` adalah feed dan mengarahkan pengunjung tanpa login ke `login.html`. Cara termudah: ganti nama `index.html` menjadi `beranda.html`, ganti nama `landing.html` menjadi `index.html`, lalu perbarui tautan beranda di `js/nav.js`, `sw.js`, dan `manifest.json` (`start_url`). Atau biarkan apa adanya dan bagikan tautan `/landing.html`.

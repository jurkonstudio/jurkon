# Jurnal Koneksi (Jurkon) — jurkon.my.id

Sosial media minimalis: posting maks 250 karakter, pesan maks 750 karakter.
Stack: HTML/CSS/JS biasa + Supabase. Hosting: GitHub Pages.

## Langkah pasang
1. **Supabase**: buat project baru → SQL Editor → tempel isi `sql/schema.sql` → Run.
1b. Jalankan juga `sql/002_privasi_keamanan.sql`, `sql/003_feed_cepat.sql`, lalu `sql/004_filter_konten.sql` (berurutan). Tanpa 002, tidak ada blokir, batas spam, admin, hapus akun, dan ekspor data.
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
- Hanya pakai anon key di kode. Jangan pernah commit service_role key.
- Semua tabel memakai Row Level Security (lihat schema.sql).
- Batas 250/750 karakter dipasang di database, bukan hanya di tampilan.

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

# Jurnal Koneksi (Jurkon) — jurkon.my.id

Sosial media minimalis: posting maks 250 karakter, pesan maks 750 karakter.
Stack: HTML/CSS/JS biasa + Supabase. Hosting: GitHub Pages.

## Langkah pasang
1. **Supabase**: buat project baru → SQL Editor → tempel isi `sql/schema.sql` → Run.
1b. Jalankan juga `sql/002_privasi_keamanan.sql`, `sql/003_feed_cepat.sql`, `sql/004_filter_konten.sql`, lalu `sql/006_feed_dua_bagian.sql`, `sql/007_anti_spam.sql`, dan `sql/008_foto_profil_limit.sql` (berurutan; `005_notifikasi.sql` opsional, lihat bagian Notifikasi). Tanpa 002, tidak ada blokir, batas spam, admin, hapus akun, dan ekspor data.
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

## Feed Beranda: Publik dan Mengikuti

Beranda punya dua tab. **Publik** menampilkan semua posting utama; **Mengikuti** hanya posting sendiri dan akun yang diikuti (kosong bila belum mengikuti siapa pun, dengan ajakan ke Jelajah). Tab terakhir yang dipilih diingat di perangkat (`localStorage: feedAktif`, bawaan Publik).

- Klien: `index.html` (tab), `js/feed.js` (logika), `css/style.css` (bagian *Tab feed*).
- Database: jalankan `sql/006_feed_dua_bagian.sql` untuk menambah mode `ikuti` pada `daftar_posting`. Tanpa itu aplikasi tetap jalan, hanya akun yang belum mengikuti siapa pun akan melihat semua posting di tab Mengikuti.

## Mention @username

Saat menulis posting atau balasan, mengetik `@` memunculkan saran akun (akun yang diikuti lebih dulu; ketik huruf untuk mencari username). Ketuk saran untuk menyisipkan. `@username` di dalam posting tampil sebagai tautan ke profil. Tanpa migrasi database. Kode: `js/mention.js`, `isiHtml()` di `js/ui.js`. Catatan: mention belum mengirim notifikasi.

## Foto profil & batas ubah bulanan

Di **Profil > Ubah profil**, pemilik akun bisa mengunggah, mengganti, atau menghapus foto profil. Foto otomatis dipotong persegi, dikecilkan ke 320px, dan disimpan sebagai JPEG (data lokasi/EXIF hilang). Foto tampil di semua tempat: feed, detail & balasan, profil, Jelajah (pencarian orang), daftar & header Pesan, Notifikasi, dan saran @mention. Bila foto gagal dimuat atau belum ada, tampil huruf inisial seperti sebelumnya.

- **Batas per bulan kalender (zona WIB, reset tanggal 1)**: foto 3x, nama 2x, username 2x. Ubah angkanya di fungsi `batas_profil()` pada `sql/008_foto_profil_limit.sql`, lalu jalankan ulang file itu. Hapus foto juga dihitung sebagai satu perubahan. Mengubah bio tidak dibatasi. Aturan username sekali sehari (007) tetap berlaku.
- **Ditegakkan di database** (trigger `batasi_profil_bulanan_trg`), bukan hanya di layar. Layar menampilkan sisa jatah dan meminta konfirmasi sebelum memakai jatah. Pengisian profil pertama (halaman selamat) tidak dihitung.
- **Penyimpanan**: bucket publik `avatar` (maks 512 KB per file, JPG/PNG/WebP). Pengguna hanya boleh mengunggah ke foldernya sendiri, maksimal 6 file tersimpan; foto lama dihapus otomatis setelah ganti. `foto_url` hanya boleh menunjuk ke folder milik sendiri.
- **Urutan pasang**: jalankan `008` di Supabase DULU, baru unggah kode ke GitHub. Tanpa 008, kueri yang meminta kolom `foto_url` akan gagal.
- Catatan: foto tidak dimoderasi otomatis. Laporan akun tetap lewat alur laporan yang ada, dan admin bisa mengosongkan `foto_url` lewat SQL Editor (tidak dibatasi jatah).

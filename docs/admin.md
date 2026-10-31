# Panel admin dan landing page

## Panel admin & landing page (migrasi 020)

Panel admin (kini di `/murthehelp/031411`, lihat bagian terakhir) adalah panel lengkap: **Ringkasan** (statistik + grafik 14 hari), **Laporan** (baru/selesai; hapus posting, bekukan penulis), **Pengguna** (cari, bekukan/buka, jadikan admin, hapus akun), **Posting** (cari, sorot, hapus), **Sorotan Jelajah**, **Landing & situs** (teks landing, pengumuman, buka/tutup pendaftaran), **Admin** (tambah/cabut admin), dan **Jejak** (log semua aksi admin).

1. Jalankan `sql/020_panel_admin.sql` di Supabase SQL Editor (setelah 002-019). Aman diulang. Hasil pemeriksaan di akhir skrip harus **tepat 1 baris: `landing_publik()`**.
2. Jadikan dirimu admin (sekali saja, bila belum): `insert into admins (user_id) select id from auth.users where email = 'EMAIL-KAMU@contoh.com';`
3. Buka `/murthehelp/031411` (di-`noindex`, hanya terbuka untuk admin). Admin berikutnya bisa ditambah dari tab *Akses admin*.
4. **Landing page** ada di `/landing.html` (teks, pengumuman, angka pengguna/catatan, dan status pendaftaran diambil dari Supabase). Untuk menjadikannya halaman depan domain, lihat catatan di bawah.

Keamanan panel: semua aksi lewat fungsi `admin_*` yang memeriksa `is_admin()` di database; tabel `pengaturan_situs` dan `admin_log` tertutup untuk klien; setiap aksi tercatat di `admin_log`. Satu-satunya fungsi untuk pengunjung tanpa login adalah `landing_publik()` (hanya total pengguna, total catatan, dan teks landing, tanpa data pribadi). 019 versi terbaru sudah mengecualikan fungsi ini, jadi menjalankan ulang 019 aman. Tombol *tutup pendaftaran* ditegakkan oleh trigger di `auth.users` (berlaku untuk semua cara pendaftaran).

Menjadikan landing sebagai halaman depan: sekarang `index.html` adalah feed dan mengarahkan pengunjung tanpa login ke `login.html`. Cara termudah: ganti nama `index.html` menjadi `beranda.html`, ganti nama `landing.html` menjadi `index.html`, lalu perbarui tautan beranda di `js/nav.js`, `sw.js`, dan `manifest.json` (`start_url`). Atau biarkan apa adanya dan bagikan tautan `/landing.html`.

## Pusat Kendali admin (`/murthehelp/031411`)

Alamat: `https://jurkon.my.id/murthehelp/031411` (file `murthehelp/031411.html`, gaya `css/admin.css`, logika `js/admin.js`). Halaman lama `/031411/` hanya mengalihkan ke sini.

- **Prasyarat database:** `sql/020_panel_admin.sql` sudah dijalankan, dan akunmu ada di tabel `admins` (lihat `sql/002_privasi_keamanan.sql`, `insert into admins (user_id) values ('<uuid>')`).
- **Akses:** login email + sandi langsung di halaman; bila akun punya TOTP (2 langkah) kodenya diminta; akun non-admin melihat "Akses ditolak". Layar terkunci otomatis setelah 15 menit tidak aktif (ubah `MENIT_KUNCI` di `js/admin.js`).
- **Penting:** semua aksi dijaga `is_admin()` di server (fungsi `admin_*`). Login/kunci di layar hanyalah lapisan tambahan. Halaman ber-`noindex` dan tidak dicantumkan di `robots.txt`/sitemap agar alamatnya tidak terbuka.

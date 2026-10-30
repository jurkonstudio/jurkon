# Jurnal Koneksi (Jurkon) — jurkon.my.id

Sosial media minimalis: posting maks 250 karakter, pesan maks 750 karakter.
Stack: HTML/CSS/JS biasa + Supabase. Hosting: GitHub Pages.

## Langkah pasang
1. **Supabase**: buat project baru → SQL Editor → tempel isi `sql/schema.sql` → Run.
1b. Jalankan juga `sql/002_privasi_keamanan.sql` lalu `sql/003_feed_cepat.sql` (satu kali tiap file, berurutan). Tanpa 002, tidak ada blokir, batas spam, admin, hapus akun, dan ekspor data.
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

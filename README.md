# Jurnal Koneksi (Jurkon) — jurkon.my.id

Sosial media minimalis: posting maks 250 karakter, pesan maks 750 karakter.
Stack: HTML/CSS/JS biasa + Supabase. Hosting: GitHub Pages.

## Langkah pasang
1. **Supabase**: buat project baru → SQL Editor → tempel isi `sql/schema.sql` → Run.
2. Supabase → Project Settings → API → salin *Project URL* dan *anon public key* ke `js/supabase.js`.
3. Supabase → Authentication → URL Configuration: isi Site URL dengan `https://jurkon.my.id`.
   (Opsional) aktifkan login Google di Authentication → Providers.
4. **GitHub**: buat repo, unggah semua isi folder ini (file `CNAME` harus di akar repo).
5. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
6. Domain: di panel domain, buat record `A` ke 185.199.108.153, .109.153, .110.153, .111.153
   (atau `CNAME` untuk `www` ke `USERNAME.github.io`). Lalu centang *Enforce HTTPS* di Pages.
7. Buat ikon `assets/icons/icon-192.png` dan `icon-512.png` agar bisa di-install sebagai aplikasi.

## Keamanan
- Hanya pakai anon key di kode. Jangan pernah commit service_role key.
- Semua tabel memakai Row Level Security (lihat schema.sql).
- Batas 250/750 karakter dipasang di database, bukan hanya di tampilan.

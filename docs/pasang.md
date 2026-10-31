# Pasang dan rilis

Panduan memasang Jurkon dari nol, urutan SQL, dan cara merilis pembaruan.

## Langkah pasang
1. **Supabase**: buat project baru → SQL Editor → tempel isi `sql/schema.sql` → Run.
1b. Jalankan juga `sql/002_privasi_keamanan.sql`, `sql/003_feed_cepat.sql`, `sql/004_filter_konten.sql`, lalu `sql/006_feed_dua_bagian.sql`, `sql/007_anti_spam.sql`, dan `sql/008_foto_profil_limit.sql` (berurutan; `005_notifikasi.sql` opsional, lihat bagian Notifikasi). Tanpa 002, tidak ada blokir, batas spam, admin, hapus akun, dan ekspor data. Migrasi lanjutan (009-020) beserta urutannya ada di `sql/README.md`.
2. Supabase → Project Settings → API → salin *Project URL* dan *anon public key* ke `js/supabase.js`.
3. Supabase → Authentication → URL Configuration: isi Site URL dengan `https://jurkon.my.id`.
   Tambahkan juga `https://jurkon.my.id/reset.html` dan `https://jurkon.my.id/index.html` di *Redirect URLs* (wajib agar "Lupa kata sandi" bisa kembali ke aplikasi).
   Login Google **dinonaktifkan sementara**: tombolnya dihapus dari `login.html` dan handler-nya dari `js/auth.js` (cara memasangnya lagi ada di komentar `js/auth.js`). Provider Google di Supabase tidak perlu diaktifkan.
4. **GitHub**: buat repo, unggah semua isi folder ini (file `CNAME` harus di akar repo).
5. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
6. Domain: di panel domain, buat record `A` ke 185.199.108.153, .109.153, .110.153, .111.153
   (atau `CNAME` untuk `www` ke `USERNAME.github.io`). Lalu centang *Enforce HTTPS* di Pages.
7. Ikon aplikasi sudah ada di `assets/icons/`.

## Urutan migrasi
Daftar lengkap, prasyarat, dan cara membuat satu berkas gabungan untuk project baru ada di `sql/README.md`. Aturan emas: **jalankan SQL dulu, baru unggah kode JS terbaru**.

## Catatan versi cache
Setiap perubahan JS/CSS/HTML/gambar yang ditampilkan ke pengguna perlu menaikkan versi `CACHE` di `sw.js` agar HP tidak memakai berkas lama. Sekarang cukup jalankan **sebelum commit/unggah**:

```
node tools/naikkan-cache.js
```

Skrip ini menghitung sidik jari isi semua berkas situs lalu menulisnya ke `CACHE` (mis. `jurkon-252deb79`). Isi berubah → versi berubah; tidak ada perubahan → versi tetap. Skrip juga memastikan semua berkas di daftar `STATIS` benar-benar ada. Kalau lupa menjalankannya, pengguna bisa terus melihat berkas lama.

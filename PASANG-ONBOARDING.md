# Paket 1+3+4: onboarding, tautan undangan, statistik

1. Supabase > SQL Editor > jalankan `sql/044_onboarding_undangan.sql` (aman diulang). Hasil pemeriksaan di bawahnya harus 0 baris.
2. Unggah berkas paket ini ke repo (commit, push). `sw.js` sudah dinaikkan versinya.
3. Uji: buka `https://jurkon.my.id/?undang=USERNAMEMU` di jendela samaran, daftar akun uji, pilih username (kotak "Ikuti @..." muncul),
   lalu halaman `mulai.html` tampil dengan 3 langkah. Setelah selesai, `statistik.html` (akun pengelola) menampilkan angkanya.
4. Tautan undangan tiap orang: `https://jurkon.my.id/?undang=USERNAME`. Pengguna menemukannya di langkah 3 onboarding; halamannya
   juga bisa dibuka lagi kapan saja lewat `mulai.html`.

Catatan: terjemahan `mulai.*` baru lengkap untuk Indonesia, Inggris, Melayu; bahasa lain sementara memakai teks Inggris
(edit `js/bahasa.js`, lalu `node tools/pecah-bahasa.js`).

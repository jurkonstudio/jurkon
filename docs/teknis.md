# Catatan teknis: performa, bahasa, login

## Performa (pembaruan 016)

- **Kamus bahasa dipecah per bahasa.** Sumber tetap `js/bahasa.js` (edit di sini). Setelah mengubahnya jalankan `node tools/pecah-bahasa.js` untuk membuat ulang `js/bahasa/<kode>.js` dan `js/bahasa-muat.js`, lalu commit semuanya. Browser hanya mengunduh satu bahasa (sekitar 16 KB, bukan 94 KB). `node tools/cek-bahasa.js` tetap dipakai untuk memeriksa kamus.
- **Indeks database:** jalankan `sql/016_performa.sql` di Supabase (hanya menambah indeks, aman diulang).
- **Service worker:** jalankan `node tools/naikkan-cache.js` sebelum unggah (lihat "Catatan versi cache" di bawah). Jangan edit angka `CACHE` manual.
- **Chat** kini menyusul pesan yang terlewat saat koneksi realtime putus.

## Login: perilaku kolom sandi
Bila masuk gagal (sandi salah), kolom kata sandi dikosongkan dan kursor kembali ke sana, jadi pengguna wajib mengetik ulang; email tetap terisi (`js/auth.js`). Hal yang sama berlaku di halaman admin dan layar kunci admin. Batas percobaan gagal (kunci sementara setelah 5 kali) tetap berlaku.

## Performa & stabilitas (pembaruan 021)
- **Service worker cache-first berversi.** Berkas statis dilayani langsung dari cache (tanpa menunggu jaringan), sehingga halaman terbuka cepat walau sinyal lemah. HTML, JS, dan CSS selalu dari versi yang sama. Pemasangan versi baru dibatalkan bila ada satu berkas gagal diunduh, jadi tidak pernah ada versi setengah jadi. Bahasa lain, tema Kaca/Awan, admin, dan landing disimpan otomatis saat pertama dipakai.
- **Font tidak lagi memblokir tampilan.** Font Source Serif 4 dimuat dari `js/tema.js`; teks tampil dulu dengan font cadangan.
- **Logo WebP** (`assets/*.webp`) menggantikan PNG/JPG (hemat sekitar 60–100 KB per halaman). Berkas PNG/JPG lama yang tidak dipakai sudah dihapus dari `assets/`.
- **Permintaan data tidak menggantung.** `js/supabase.js` membungkus fetch REST/RPC: batas waktu 12 detik, dan pembacaan diulang sekali bila jaringan putus/timeout/502/503/504. Penulisan tidak pernah diulang otomatis.
- Service worker didaftarkan setelah halaman selesai dimuat.

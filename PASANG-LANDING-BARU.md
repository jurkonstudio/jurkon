# Landing baru (3 Nov 2026)

Unggah SEMUA berkas di zip ini ke repo (timpa yang lama, struktur folder sama):
landing.html, en/ ms/ jv/ su/ zh/ ja/ ko/ es/ fr/ hi/ ar (index.html), css/landing.css,
js/landing.js, js/landing-teks.js (bila ada), tools/landing-templat.html, tools/buat-landing.js,
sitemap.xml, sw.js.

Setelah itu: tunggu 1-2 menit, buka jurkon.my.id/en/ lalu muat ulang keras (di HP: hapus data situs
atau buka tab privat) karena service worker menyimpan cache lama.

Pengaturan yang boleh kamu ubah: js/landing.js, konstanta MIN_ANGKA (default 100).
Strip angka pengguna/catatan hanya tampil bila pengguna >= MIN_ANGKA. Isi 0 untuk selalu tampil.

Jika kelak mengubah teks atau struktur: edit tools/landing-templat.html / tools/landing-teks.js,
lalu jalankan  node tools/buat-landing.js  dan  node tools/naikkan-cache.js

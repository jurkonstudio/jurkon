# Pasang: Profil publik (pilihan sendiri)

Tamu yang membuka `jurkon.my.id/@username` melihat:
- **Profil publik menyala:** kartu profil (nama, bio, foto, jumlah pengikut) + catatan yang sudah dijadikan publik + tombol Gabung/Masuk.
- **Profil privat, username tidak ada, atau gangguan:** ajakan bergabung (bukan halaman 404). Tamu tidak bisa membedakan "privat" dari "tidak ada".
- **Anggota yang sudah masuk:** langsung ke profil seperti biasa (tidak berubah).

Saklar ada di dua tempat: **Pengaturan > Privasi** dan di bawah tombol pada **profil sendiri**. Bawaan MATI untuk semua akun.

## Urutan (SQL dulu, baru kode)

1. Supabase > SQL Editor: jalankan `sql/045_profil_publik.sql`, lalu `sql/036_perbaiki_hak_anon.sql` (daftar anon jadi 7 fungsi). Cek kueri nomor 1 di akhir 045: harus 7 baris.
2. Unggah semua berkas ke GitHub (jalankan `node tools/naikkan-cache.js` dulu; sudah dijalankan di paket ini).
3. Uji sebagai tamu (jendela privat) dengan akun yang saklarnya mati: `jurkon.my.id/@namamu` harus menampilkan ajakan. Nyalakan saklar di profil, muat ulang: kartu profil tampil.
4. **Pratinjau media sosial (WhatsApp/X/Facebook)** butuh Worker. Tanpa Worker, tautan tetap bisa dibuka dan tampilannya benar, tetapi pratinjau memakai gambar/judul umum karena GitHub Pages membalas 404 untuk alamat `/@username`.
   - Tempel ulang `worker/catatan-publik.js` ke Worker `jurkon-catatan` (Deploy).
   - Tambah route: `jurkon.my.id/@*` (Route, bukan Custom Domain; DNS tetap Proxied).
   - Uji: `curl -A WhatsApp https://jurkon.my.id/@namamu` harus berstatus 200 dan `<title>` berisi nama.
   - WhatsApp menyimpan cache lama: uji dengan menambah `?v=2`.

## Yang tidak berubah
- `profil.html` untuk anggota, aturan RLS, dan tabel `profiles/posts/follows` (tetap tertutup untuk anon).
- Tamu hanya memanggil `profil_publik_info()` dan `profil_publik_catatan()`.

## Membatalkan
`update profiles set profil_publik = false;` mematikan semua profil seketika. Untuk mencopot fungsinya: lihat baris "Membatalkan" di akhir `sql/045_profil_publik.sql`.

## Catatan
- `kebijakan-privasi.html` (Indonesia) sudah diperbarui. Versi bahasa lain (`/en/privacy.html`, `/hi/`, `/ja/`, dst.) masih menyebut profil hanya untuk anggota dan perlu disesuaikan.
- Teks terjemahan baru (kunci `pv.*`, `pp.*`, `set.katPrivasi*`) belum dibaca penutur asli.

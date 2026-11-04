# Pasang: Profil profesional (sampul foto, lokasi, tautan tambahan)

Yang berubah di halaman profil:
- **Sampul bisa diganti foto.** Foto dipotong 3:1 dari tengah (1200x400 JPEG, EXIF dibuang, di bawah 1 MB). Tanpa foto, tampil sampul kertas bergaris seperti sebelumnya. Tombol kamera di pojok sampul membuka dialog Ubah profil.
- **Foto profil menimpa sampul di kiri bawah** (96 px di HP, 120 px di desktop). Tombol Ubah profil, Jurnal, dan Bagikan tidak lagi tertutup foto: semuanya satu baris penuh di bawah statistik.
- **Lokasi dan maksimal 4 tautan tambahan**, diatur pengguna di Ubah profil. Tampil sebagai pil di bawah bio. Akun yang belum mengisi melihat ajakan "Tambahkan lokasi dan tautan" (hanya pemilik). Tamu pada profil publik juga melihat sampul, lokasi, dan tautan.
- Batas ganti sampul **3 kali per bulan** (sama dengan foto profil; ubah di `batas_profil()` pada SQL).

## Urutan (SQL dulu, baru kode)

1. Supabase > SQL Editor: jalankan `sql/048_profil_sampul_tautan_lokasi.sql`. Aman diulang. Jalankan 4 kueri pemeriksaan di akhir berkas (kolom 3 baris, bucket `sampul` publik, fungsi anon tetap 7 baris, tamu pada profil privat 0 baris).
2. Unggah semua berkas di bawah ke GitHub (cache `sw.js` sudah dinaikkan; jalankan `node tools/naikkan-cache.js` lagi bila Anda mengubah apa pun).

Berkas: `sql/048_...sql` (baru), `js/profil-ekstra.js` (baru), `js/profil.js`, `js/profil-publik.js`, `js/data.js`, `js/bahasa.js` + `js/bahasa/*.js` (18 kunci `pe.*`, 840 kunci x 9 bahasa), `css/style.css` (lapisan terakhir; hapus blok "Profil profesional" untuk membatalkan tampilan), `profil.html`, `profil-publik.html`, `sw.js`, `sql/README.md`.

## Aturan keamanan

- Tautan hanya `https://` dengan domain sungguhan (bukan IP, tanpa port, tanpa `user:pass@`). `javascript:`, `data:`, `mailto:` ditolak. Dicek di klien **dan** di database (trigger `validasi_profil_ekstra`).
- Tautan dibuka dengan `target="_blank"` dan `rel="noopener noreferrer nofollow ugc"`.
- Lokasi maks 40 huruf, nama tautan maks 30, alamat maks 200. Filter kata terlarang (004) ikut berlaku untuk lokasi dan tautan.
- Folder sampul harus milik sendiri (kebijakan storage + trigger), maks 4 berkas tersimpan per akun; berkas lama dibersihkan setelah ganti.
- Tamu hanya melihat sampul, lokasi, dan tautan bila pemilik menyalakan Profil publik (045). Fungsi anon tetap 7.
- Kode baru aman dipasang sebelum SQL: bila kolom belum ada, pengguna yang tidak mengisi sampul/lokasi/tautan tidak terganggu, dan yang mengisi mendapat pesan "belum aktif di server".

## Uji manual yang tetap perlu (Supabase sungguhan)

Unggah sampul (JPG, PNG, WebP; foto kecil <600 px ditolak), ganti 3x lalu coba ke-4 (ditolak), hapus sampul, isi lokasi, tambah 4 tautan lalu coba ke-5 (tombol mati), `javascript:alert(1)` (ditolak), `contoh.com/saya` (jadi `https://contoh.com/saya`), buka profil sebagai akun lain dan sebagai tamu (profil publik menyala dan mati), tema Gelap/Kaca/Awan, 320 px.

## Belum dikerjakan

Geser/atur posisi foto sampul (sekarang selalu bagian tengah). Pratinjau OG per profil di `worker/catatan-publik.js` belum memakai sampul.

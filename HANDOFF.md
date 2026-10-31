# Handoff Jurkon, 31 Oktober 2026

Sesi ini: usulan fitur halaman profil, nomor 1 dan 2 selesai. Tidak ada SQL baru.

## Status

| Pekerjaan | Perlu SQL? | Status |
|---|---|---|
| Tab **Kapsul** di profil sendiri (daftar, hitung mundur, Batalkan) | Tidak (`kapsul_saya()`, `batalkan_kapsul()` dari 024) | Kode selesai, sintaks dan kamus diperiksa; **belum diuji di browser** |
| Label **Mengikuti kamu** dan tombol **Ikuti balik** | Tidak | Sama |
| Tombol **Bagikan profil** (ikon di profil sendiri, menu ⋯ di profil orang) | Tidak | Sama |
| Login mengingat tujuan lewat `?lanjut=` | Tidak | Sama |

Syarat: `sql/024_kapsul_waktu.sql` harus sudah dijalankan di Supabase, kalau tidak tab Kapsul menampilkan galat dengan tombol Coba lagi. Pengujian browser di sandbox tidak bisa dijalankan (npm tidak dapat diakses), jadi uji manual di bawah wajib.

## Berkas yang berubah

`profil.html`, `js/profil.js`, `js/supabase.js`, `js/auth.js`, `css/style.css`, `js/bahasa.js` (sumber kamus), turunannya `js/bahasa/*.js`, dan `docs/fitur.md`.
`js/bahasa/*.js` dihasilkan oleh `node tools/pecah-bahasa.js`; jangan diedit langsung.

## Cara pasang

```
git pull --rebase
unzip -o jurkon-profil.zip
node tools/cek-bahasa.js
node tools/naikkan-cache.js
git status --short
git add -A
git commit -m "Profil: tab Kapsul, saling-ikuti, bagikan, login ingat tujuan"
git push
```

`cek-bahasa.js` harus berakhir dengan `OK: 395 kunci × 7 bahasa.`

## Cara mencoba

1. Profil sendiri: ada tab **Kapsul** di ujung kanan. Isinya kapsul yang menunggu, hitung mundur ("Terbuka dalam 2 hari"), dan tanggal buka. Batalkan menghapus kapsul setelah konfirmasi. Kapsul baru dari lembar tulis muncul di sini tanpa muat ulang.
2. Profil orang lain: tab Kapsul tidak ada. Bila dia mengikuti kamu tetapi kamu belum, tombol bertuliskan **Ikuti balik** dan ada label "Mengikuti kamu" di samping @username.
3. Bagikan: ikon di profil sendiri, atau menu ⋯ di profil orang. Di HP muncul lembar bagikan bawaan; di desktop tautan disalin dan muncul toast.
4. Buka tautan profil di jendela privat (belum login): harus masuk ke `login.html?lanjut=profil.html%3Fu%3D...`, lalu setelah login kembali ke profil itu, bukan beranda.
5. Layar sempit (320 sampai 360 px) di profil sendiri: lima tab harus tetap terbaca ("Menyukai" boleh terpotong).

## Catatan teknis

- `lanjutAman()` (js/supabase.js) hanya menerima `nama-berkas.html` dengan query sederhana; `login`, `reset`, `selamat`, dan alamat luar ditolak. `keLogin()` dipakai oleh `wajibLogin()` dan aksi yang butuh login.
- Pendaftaran akun baru yang butuh konfirmasi email belum meneruskan `lanjut` lewat tautan email (hanya login langsung).
- Status "dia mengikuti saya" sekarang dicek untuk setiap profil orang lain (satu kueri `follows`, sebelumnya hanya bila sudah mengikuti).
- Hitung mundur kapsul diperbarui tiap 30 detik. Bila waktu perangkat berbeda dari server, daftar dimuat ulang paling sering sekali per 20 detik.

## Berikutnya (urutan usulan)

1. **Sematkan satu catatan di profil** (kolom baru di `profiles` + trigger agar catatannya milik sendiri, catatan utama, bukan kapsul belum terbuka).
2. **Lapor akun dan Bisukan** di menu ⋯ (butuh SQL).
3. **Opsi sembunyikan tab Menyukai**: harus ditegakkan di RLS tabel `likes`, bukan hanya menyembunyikan tab (`SUKA_PUBLIK` sekarang berlaku untuk semua).
4. **Tab Tersimpan** (bookmark, tabel privat baru).
5. **Ringkasan menulis pribadi** tanpa streak, sesuai nuansa tenang.

Nomor 1 sampai 4 menambah kolom atau tabel. Sebaiknya migrasi **025** (perbaikan celah kebijakan update `profiles` yang membolehkan pemilik mengisi kolom apa pun di barisnya) jalan lebih dulu atau bersamaan; perbaikannya satu trigger kecil.

Cek apakah celah itu pernah dipakai, di SQL Editor:
```
select id, created_at, disorot, dilihat from posts where disorot or created_at > now() order by created_at desc;
```
Baris `disorot` yang dikenal dari panel admin itu wajar. Yang mencurigakan: `created_at` di masa depan atau `dilihat` tidak masuk akal.

Tidak disarankan sekarang: gambar sampul dan tautan di bio (foto belum dimoderasi; tautan membuka celah spam dan phishing).

## Aturan tetap

SQL dulu di Supabase, baru unggah kode. Jangan tempel SQL atau connection string ke terminal selain yang diminta. Jalankan `node tools/naikkan-cache.js` sebelum setiap unggahan.

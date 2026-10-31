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

1. ~~Sematkan satu catatan di profil~~ (selesai, lihat bagian 026 di bawah).
2. **Lapor akun dan Bisukan** di menu ⋯ (butuh SQL).
3. **Opsi sembunyikan tab Menyukai**: harus ditegakkan di RLS tabel `likes`, bukan hanya menyembunyikan tab (`SUKA_PUBLIK` sekarang berlaku untuk semua).
4. **Tab Tersimpan** (bookmark, tabel privat baru).
5. **Ringkasan menulis pribadi** tanpa streak, sesuai nuansa tenang.

Nomor 1 sampai 4 menambah kolom atau tabel, jadi **025 sebaiknya jalan lebih dulu**.

## Migrasi 026: sematkan catatan

Kode selesai, **belum diuji** (sandbox tanpa Postgres dan browser). Pasang SQL dulu: `sql/026_sematkan_catatan.sql` (kolom `profiles.disematkan` + trigger `jaga_disematkan_trg`), jalankan uji di bagian pemeriksaannya, baru unggah kode. Tanpa 026, halaman profil tetap jalan (sematan dianggap kosong) tetapi tombol pin akan menampilkan galat.
Berkas: `profil.html` (wadah `#sematan`), `js/profil.js` (`tombolSemat`, `muatSematan`, penyaring daftar), `js/ui.js` (tombol di `htmlPost`, hanya bila `tombolSemat` ada), `css/style.css`, kamus.
Uji: di profil sendiri ketuk pin di satu catatan, catatan pindah ke puncak dengan label "Disematkan" dan hilang dari daftar di bawahnya; ketuk pin lagi untuk melepas; hapus catatan yang disematkan, sematan hilang sendiri. Balasan, kutipan, dan catatan berumur tidak punya pin atau ditolak server.
Catatan: daftar baris dari `daftar_posting` tidak memuat kolom `jenis`, jadi catatan kutipan tetap menampilkan pin tetapi ditolak server dengan pesan berbahasa Indonesia.

## Migrasi 025 (celah dari penilaian awal)

Kebijakan insert `posts` hanya mengecek `auth.uid() = user_id`, dan tidak ada trigger yang mereset `created_at`, `disorot`, atau `dilihat`. Anggota login bisa memanggil API langsung untuk memasang sorotan, memalsukan jumlah tayang, menempelkan catatan di puncak feed (`created_at` masa depan), atau lolos pembatas laju (`created_at` masa lalu). Hal yang sama berlaku untuk `likes`, `follows`, `messages`, `reports`, `dislikes`, dan `blocks`.

`sql/025_kunci_kolom_insert.sql` memasang trigger `a0_kunci_kolom_trg` (BEFORE INSERT) di tujuh tabel itu. Isinya memaksa `created_at := now()` dan, khusus `posts`, `disorot := false` dan `dilihat := 0`, bila `auth.uid()` tidak null. Insert dari SQL Editor dan service role tidak berubah.

Status: ditulis, **belum dijalankan** (sandbox tidak punya Postgres). Urutan: jalankan uji "sebelum" di bagian pemeriksaan berkas itu (dalam transaksi rollback), jalankan migrasi, ulangi uji (created_at harus = sekarang, disorot = f, dilihat = 0), lalu jalankan kueri pencari baris yang sudah terlanjur dimanipulasi:
```
select id, user_id, created_at, disorot, dilihat from posts where disorot or created_at > now() order by created_at desc;
```
Baris `disorot` yang dikenal dari panel admin itu wajar. Yang mencurigakan: `created_at` di masa depan atau `dilihat` tidak masuk akal. Baris lama tidak diubah migrasi; bersihkan sendiri setelah diperiksa.

Daftar temuan lain dari penilaian awal yang belum dikerjakan: cadangan data pertama, TOTP admin dan admin kedua, konfirmasi setelan Auth Supabase ("Confirm email"), notifikasi saat kapsul terbuka, jalur publik untuk pertumbuhan (dikerjakan di Migrasi 027).

Tidak disarankan sekarang: gambar sampul dan tautan di bio (foto belum dimoderasi; tautan membuka celah spam dan phishing).

## Migrasi 027: catatan publik

Kode selesai, **belum diuji** (sandbox tanpa Postgres dan browser). Urutan: jalankan `sql/027_catatan_publik.sql` dan pemeriksaannya, unggah kode, lalu (opsional) pasang Worker (`worker/README.md`). Ringkasan fitur dan syarat ada di `docs/fitur.md`, bagian "Catatan publik".

Uji: (1) di catatan sendiri ketuk ikon globe, tombol "Jadikan publik" harus mati sampai kotak dicentang; (2) buka `n.html?id=<id>` di jendela privat, catatan tampil tanpa login; (3) catatan berisi tautan, email, nomor telepon, atau @sebutan harus ditolak dengan pesan jelas; (4) "Jadikan privat lagi" lalu muat ulang halaman publik: harus tampil "tidak tersedia"; (5) balasan, kutipan, catatan berumur, kapsul: ditolak server; (6) anon tidak bisa `select` dari `posts`.
Catatan: setelah 019 dijalankan ulang, hak anon untuk `catatan_publik` dan `daftar_publik` harus dipasang lagi (bagian F di 027).

## Aturan tetap

SQL dulu di Supabase, baru unggah kode. Jangan tempel SQL atau connection string ke terminal selain yang diminta. Jalankan `node tools/naikkan-cache.js` sebelum setiap unggahan.


## Tautan profil `/@username`

Tombol Bagikan profil sekarang membagikan `https://jurkon.my.id/@username`. Berkas baru: `404.html` dan `js/alih-profil.js` (GitHub Pages memakai 404.html untuk alamat yang tidak ada; skrip itu mengalihkan `/@username` ke `profil.html?u=username`). Berkas ubahan: `js/profil.js`, kamus (`hal.judul`, `hal.hilang`), `sw.js` (versi cache). Tanpa SQL. Uji: buka `jurkon.my.id/@namamu` di jendela privat; harus masuk ke login lalu kembali ke profil itu. Alamat tanpa @ (`/namamu`) ikut bekerja kecuali bentrok dengan halaman asli.

## Angka aksi langsung (030)

Jalankan `sql/030_angka_langsung.sql` di Supabase lebih dulu, baru unggah kode. Berkas: `js/ui.js` (`setAngka`, `pasangAngkaLangsung`), `css/style.css`, `sql/030_angka_langsung.sql`, `sql/README.md`, `docs/fitur.md`. Diuji di browser dengan backend tiruan (angka 0 kosong, tayang muncul saat > 0, pembaruan otomatis, animasi tik, klik suka); **belum diuji terhadap Supabase asli**. Uji manual: buka beranda di dua perangkat, suka sebuah catatan di satu perangkat, perangkat lain harus ikut berubah dalam beberapa detik.


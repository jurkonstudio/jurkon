# Handoff tambahan, 1 November 2026 (perbaikan tampilan desktop)

**Diuji di Chromium tanpa Supabase (data tiruan), belum di produksi.** Ukuran yang dilihat: 390, 980, 1280, 1440, 1920 px; tema Kertas, Gelap, Kaca, Awan.
Berubah: `css/style.css` (lapisan "Desktop v5" di paling bawah, bisa dibatalkan dengan menghapusnya), `js/nav.js` (kotak tulis + pintasan keyboard), `sw.js` (versi cache). Tanpa SQL, tanpa kunci bahasa baru (kotak tulis memakai `pf.k.catatanT` dan `nav.tulis`).
Penyebab utama: aturan HP `.nav a{font-size:11px}` dan `.nav svg{width:21px}` (di bagian "kompak") jatuh SESUDAH aturan desktop, jadi ikut menimpa menu samping. Di 768-1099 px ikon menu mengecil jadi 0 px (hanya teks kecil tampak); di >= 1100 px label tertahan 11 px, bukan 17 px. Lapisan baru berada paling akhir supaya menang.
Perbaikan: (1) menu samping ikon (768-1099) dan berlabel (>= 1100) kini terbaca, penanda aktif tanpa titik ganda; (2) dialog tanpa `.lembar` (Kartu catatan, `.pub-dlg`) kini terpusat, sebab `*{margin:0}` menghapus `margin:auto` bawaan dialog dan dialog menempel di kiri atas di semua lebar; (3) Kartu catatan di desktop dua kolom (pratinjau besar di kiri, pilihan di kanan); (4) beranda desktop: kotak "Ceritakan sesuatu hari ini" membuka lembar tulis, logo header disembunyikan di >= 1100 px karena sudah ada di menu samping; (5) padding dan ukuran teks catatan di 768-1099 tidak lagi memakai angka HP; (6) hover pil pada tombol aksi, fokus keyboard terlihat; (7) layar >= 1600 px kolom 700 px; (8) pintasan: N tulis, / cari, J dan K pindah antar catatan (nonaktif saat mengetik atau ada dialog).
Uji manual yang tetap perlu: kotak tulis dengan sesi sungguhan, Kartu catatan dengan Unduh dan Bagikan, pintasan di profil dan detail, tema Kaca/Awan di 768-1099 px.

---

# Handoff tambahan, 1 November 2026 (login dan daftar dipisah, Ketentuan Layanan 7 bahasa)

**Belum diuji di browser.** Dijalankan: `pecah-bahasa`, `cek-bahasa` (560 kunci x 7 bahasa, OK), `node --check` untuk `auth.js` dan `ketentuan-bahasa.js`, uji tiruan `ketentuan-bahasa.js` untuk 7 bahasa (11 bagian tiap bahasa), JSON-LD dan sitemap di-parse, `naikkan-cache`.
- Form dipisah: `login.html` hanya masuk (+ tautan "Buat akun"), `daftar.html` baru (email, kata sandi, ulangi kata sandi, petunjuk, Turnstile, persetujuan dengan tautan tab baru, tautan "Masuk"). `js/auth.js` dipakai bersama; handler dipasang hanya bila tombolnya ada. `?lanjut=` ikut terbawa antar dua halaman; `lanjutAman()` menolak `daftar.html` sebagai tujuan.
- Pesan sukses (cek email, tautan reset terkirim) memakai kotak netral (`.galat.ok`), bukan merah.
- `ketentuan-layanan.html`: HTML Indonesia tetap statis; `js/ketentuan-bahasa.js` mengganti isi ke en, ms, jv, su, zh, ja sesuai bahasa tampilan; ada pemilih bahasa di bawah halaman. Ditambahkan catatan bahwa Kebijakan Privasi dan Aturan masih Indonesia saja, dan bahwa versi Indonesia yang berlaku bila ada beda (keputusan hukum: tinjau).
- Belum diterjemahkan: `kebijakan-privasi.html` dan `aturan.html`. Terjemahan Jawa dan Sunda sebaiknya dibaca penutur asli; seluruh terjemahan hukum sebaiknya ditinjau orang yang paham.
- Corong: `login_buka` kini hanya dicatat di login.html, bukan di daftar.html.
Uji manual: daftar (sandi tidak sama, sandi lemah, email baru, email sudah terdaftar), masuk, lupa sandi, buka halaman tanpa login lalu `?lanjut=` ke daftar dan balik; ketentuan-layanan di tiap bahasa (ganti lewat pemilih bawah), tema gelap, 320 px.

---

# Handoff tambahan, 1 November 2026 (login: bahasa + SEO)

**Belum diuji di browser.** Yang dijalankan: `node tools/pecah-bahasa.js`, `node tools/cek-bahasa.js` (550 kunci x 7 bahasa, OK), `node --check js/bahasa-muat.js`, `node tools/naikkan-cache.js`, JSON-LD dan `sitemap.xml` di-parse.
Berubah: `login.html` (H1 terlihat + subjudul, tombol "Buat akun baru", tautan Apa itu Jurkon / Jelajahi / Pusat bantuan, `robots` jadi index, title/description/OG/Twitter baru, JSON-LD), `css/login.css`, `js/bahasa.js` (+ turunan `js/bahasa/*.js`, `js/bahasa-muat.js`), `tools/pecah-bahasa.js` (crawler memakai bahasa Indonesia), `sitemap.xml` (+ `login.html`), `docs/seo.md`, `sw.js`.
Kunci baru: `auth.judulDoc`, `auth.sub`. Teks id dan en dipoles untuk semua pesan galat login; ms/jv/su/zh/ja hanya berubah di tempat maknanya ikut berubah (`auth.daftar`, `auth.sandiPh`, `auth.setujuHtml`, kunci baru). Terjemahan Jawa dan Sunda sebaiknya dibaca penutur asli.
Uji manual: login (masuk, daftar, lupa sandi, pesan galat), tema Kertas/Gelap/Kaca/Awan di 320 dan 390 px, ganti bahasa lalu muat ulang. Setelah unggah: Search Console > Pemeriksaan URL > `https://jurkon.my.id/login.html` > Minta pengindeksan, lalu kirim ulang `sitemap.xml`.

---

# Handoff tambahan, 1 November 2026: SEO landing + tampilan modern

Belum diuji di browser. Perubahan: bagian FAQ (5 pertanyaan x 7 bahasa) dengan `<details>`, JSON-LD jadi `@graph` (WebSite, Organization, WebApplication, FAQPage), meta robots + twitter + ukuran og:image, lapisan CSS modern di akhir `css/landing.css` (hero, kartu, langkah dengan benang, FAQ, `content-visibility`), `docs/seo.md` (langkah Search Console yang harus kamu lakukan sendiri). Sumber teks: `tools/landing-teks.js`; hasil: `node tools/buat-landing.js`. Cek visual wajib di HP (320 dan 390 px) dan tema gelap. Terjemahan Jawa/Sunda FAQ sebaiknya dibaca penutur asli.

---

# Handoff, 1 November 2026 (malam): pintu depan, Jelajahi publik, corong

**Belum diuji** di browser dan Postgres (sandbox tanpa keduanya). Yang sudah dijalankan: `node --check` semua JS yang diubah, uji logika `akar.js` dengan lingkungan tiruan (id, en, ja, fr, pilihan tersimpan, sudah masuk), `node tools/buat-landing.js`, `node tools/pecah-bahasa.js`, `node tools/cek-bahasa.js` (548 kunci x 7 bahasa, OK), `node tools/naikkan-cache.js`.
Urutan pasang: jalankan `sql/035_jelajahi_publik.sql` di Supabase, cek tiga kueri di akhir berkas, baru unggah kode. Tanpa 035: landing dan `/` tetap jalan; Jelajahi menampilkan galat dengan tombol Coba lagi; centang Jelajahi tidak muncul; hitungan corong diam-diam gagal.
Berkas baru: `sql/035_jelajahi_publik.sql`, `jelajahi.html`, `js/jelajahi.js`, `js/akar.js`, `js/corong.js`. Berubah: `index.html`, `login.html` (noindex + corong), `js/auth.js` (satu baris), `js/publik.js` (centang Jelajahi), `js/n.js` (tautan ke Jelajahi), `js/landing.js`, `tools/landing-templat.html`, `tools/landing-teks.js` (+ hasil buat-landing: landing.html, en/ ms/ jv/ su/ zh/ ja/), `css/style.css`, `css/landing.css`, `js/bahasa.js` (+ turunannya), `sitemap.xml`, `sw.js`, `kebijakan-privasi.html`, `sql/README.md`, `docs/fitur.md`.
Uji manual: (1) jendela privat, buka `jurkon.my.id/` -> landing; login lalu buka `/` -> beranda. (2) Jadikan satu catatan publik, centang Jelajahi, buka `jelajahi.html` di jendela privat. (3) Hapus centang -> hilang dari daftar, tautan tetap jalan. (4) Jadikan privat -> hilang dari daftar dan centang kembali kosong bila dipublikasikan lagi. (5) `select * from admin_corong(7);` setelah beberapa kunjungan. (6) Setelah 035 jalankan kueri cek anon (harus 5 fungsi).
Keterbatasan jujur: pengalihan `/` berjalan di browser (GitHub Pages); Google biasanya mengikutinya tetapi ini bukan SSR. `jelajahi.html` belum punya pratinjau OG dinamis per daftar (bukan per catatan, jadi tidak perlu Worker). Sitemap `jelajahi.html` hanya satu alamat; catatan individu tetap lewat Worker `sitemap-catatan.xml` dan hanya yang publik (termasuk yang hanya-tautan, sesuai peringatan 027).
Terjemahan Jawa dan Sunda untuk kunci baru sebaiknya dibaca penutur asli.

---

# Handoff Jurnal, 1 November 2026 (kode selesai, belum diuji)

Dikerjakan sesuai rancangan: `sql/034_jurnal.sql`, `jurnal.html`, `js/jurnal.js`, tombol Jurnal di `js/profil.js`, gaya di `css/style.css` (bagian "Jurnal"), 33 kunci `jr.*` di `js/bahasa.js` (turunan `js/bahasa/*.js` sudah dihasilkan ulang), `sw.js` (versi cache).
`node tools/cek-bahasa.js` lolos (537 kunci x 7 bahasa); `node --check` lolos untuk jurnal.js dan profil.js.
**Belum diuji:** SQL belum dijalankan di Supabase; halaman belum dibuka di browser; unduhan dan cetak PDF belum dicoba.

Cara pasang: jalankan 034 di SQL Editor dan cek 4 kueri di akhir berkas, baru unggah kode.

Keputusan tambahan yang saya ambil (ubah bila tidak cocok):
- Catatan publik terbaca lewat `jurnal.html?u=username` (tanpa ini "publik" tidak punya tempat dibaca). Belum ada tautan ke sana dari profil orang lain.
- Saringan konten hanya untuk catatan publik; yang pribadi tidak disaring.
- Belum ada tombol Laporkan untuk jurnal publik (tabel `reports` terikat ke `posts`). Sementara pengelola hanya bisa menghapus lewat SQL/kebijakan admin.
- `ekspor_data()` didefinisikan ulang di 034 (salinan 002 + kunci `jurnal`).
- Tidak ada syarat umur akun atau batas harian untuk mempublikasikan, tidak seperti 027.

---

# Handoff tambahan, 1 November 2026

Login baru (`login.html` + `css/login.css`), `css/dokumen.css` untuk tiga halaman hukum, dan tiga penyesuaian di `kebijakan-privasi.html` (tanggal, pilihan bahasa dan hitungan gagal masuk di bagian 6, Cloudflare Turnstile di bagian 5; Turnstile memang aktif). Tanpa SQL. Belum diuji: login sungguhan di produksi, tombol lihat sandi (belum dibuat, butuh kunci bahasa baru).
Pertanyaan harian: lihat `docs/fitur.md` (perbaikan 1 November 2026). Penyebab asli galat "Failed to load" di daftar jawaban belum terbukti dari kode; pemuat sekarang punya cadangan dan menampilkan kode galat.
Ide berikutnya: indikator kekuatan sandi, login Google/Apple (butuh konfigurasi Supabase), pemilih tema kecil di halaman masuk.

---

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
7. ~~Tampilan baru halaman Pesan~~ (selesai, tanpa SQL; lihat `docs/fitur.md`). Hapus per pesan dan edit selesai di migrasi 033 (lihat bagian di bawah). Belum ada: tanda sudah dibaca (centang) di gelembung, dan balas per pesan.
6. ~~Kartu catatan untuk dibagikan~~ (selesai, tanpa SQL; lihat `docs/fitur.md`). Lanjutan yang masuk akal: tombol yang sama di halaman catatan publik `n.html`, dan font serif yang dibundel.

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

## Bar aksi baru + kartu tautan

Tanpa SQL baru. Berkas: `js/ui.js` (`htmlPost`, `hiasKartu`, `isiHtml`, `htmlTautan`, `kenalSitus`), `css/style.css`, kamus (`tt.*`, 18 kunci × 7 bahasa), `docs/fitur.md`. Diuji di browser dengan backend tiruan di lima tema (Kertas, Terang, Gelap, Kaca, Awan) pada lebar 390 px; **belum diuji di Supabase asli dan HP**. Kasus tautan yang diuji: Spotify album, YouTube, tautan pendek, domain tiruan `spotify.com.evil.example`, `user:sandi@`, `localhost`, tanda baca sesudah alamat.
Catatan: pada postingan milik sendiri di layar sempit, ikon Lapor dan Hapus turun ke baris kedua (aturan wrap yang sudah ada).

## Sesi 31 Oktober (malam): tombol Kembali, edit dan hapus pesan

**Bug Kembali:** `href="javascript:history.back()"` diblokir CSP (tanpa `unsafe-inline`), jadi tombolnya mati di `detail.html`, `aturan.html`, `tentang.html`, `pusat-bantuan.html`, `kebijakan-privasi.html`, `ketentuan-layanan.html`. Diganti `<a href="index.html" data-kembali>` plus pendengar klik di `js/keamanan.js`. Tanpa SQL.

**Migrasi 033** (`sql/033_pesan_edit_hapus.sql`): edit dan hapus pesan. Kode selesai, sintaks dan kamus diperiksa (`node tools/cek-bahasa.js` OK, 507 kunci), **belum diuji di browser dan Postgres**. Pasang SQL dulu, jalankan tiga kueri pemeriksaan di akhir berkas, baru unggah kode. Tanpa 033 chat tetap jalan, menu hanya menawarkan Salin.

Berkas berubah: `sql/033_pesan_edit_hapus.sql`, `js/chat.js`, `js/pesan.js`, `js/keamanan.js`, `chat.html`, enam halaman statis di atas, `css/style.css`, `js/bahasa.js` (+ turunan `js/bahasa/*.js`), `docs/fitur.md`, `sql/README.md`, `sw.js` (versi cache).

Uji manual: (1) buka postingan lalu ketuk Kembali, harus ke halaman sebelumnya; buka `detail.html?id=...` langsung di tab baru, Kembali harus ke beranda. (2) Chat dengan akun saling-ikuti: ketuk pesan sendiri, Edit, ubah, centang; kedua layar menampilkan "diedit" tanpa muat ulang. (3) Hapus pesan teks dan foto; kedua layar berubah jadi "Pesan ini dihapus", daftar Pesan menampilkan "Pesan dihapus". (4) Berhenti saling mengikuti: Edit hilang dari menu, Hapus tetap ada. (5) Ketik draf, keluar chat, buka lagi: draf kembali.

Ide berikutnya: balas pesan tertentu (kolom `balas_id`), tanda sudah dibaca, reaksi emoji, dan tombol salin tautan postingan di menu Detail.

---

# Handoff tambahan, 2 November 2026 (pertanyaan harian ganti bahasa + landing es/fr/hi/ar)

**Belum diuji di browser.** Dijalankan: `pecah-bahasa` dan `cek-bahasa` (647 kunci x 7 bahasa, OK), `node --check` semua JS yang diubah, uji tiruan `akar.js` (es-MX, fr-CA, hi-IN, ar-EG -> landing masing-masing; bahasa lain -> `/en/`), JSON-LD tiap landing baru di-parse, `buat-landing`, `buat-sitemap` (19 alamat), `naikkan-cache`. `pasang-sri` gagal di sandbox (tanpa jaringan): jalankan ulang di komputer sendiri atau biarkan workflow `sri.yml`.
- **Pertanyaan harian ganti bahasa:** 60 kunci `pq.q0..q59` di `js/bahasa.js` (7 bahasa). `pqTampil()` (`js/pertanyaan.js`) hanya mengubah tampilan; teks yang disimpan dan dicek server tetap Indonesia, jadi TANPA SQL. Dipakai di kartu Beranda, `pertanyaan.html`, lembar tulis, dan kiriman jawaban di umpan. `js/pertanyaan.js` kini juga dimuat di `profil`, `detail`, `post`, `explore`. Detail: `docs/fitur.md`.
- **Landing baru:** Spanyol `/es/`, Prancis `/fr/`, Hindi `/hi/`, Arab `/ar/` (RTL). Hanya landing; antarmuka aplikasi tetap 7 bahasa. Berubah: `tools/landing-teks.js` (+BAHASA, +4 blok T), `tools/landing-templat.html` (`dir`), `tools/buat-landing.js`, `tools/buat-sitemap.js`, `js/akar.js`, `css/landing.css` (lapisan RTL), `docs/*`. Halaman landing lama ikut dibuat ulang (tautan bahasa kini 11).
- Uji manual: `/ar/` di 320 dan 390 px (arah kanan-ke-kiri, benang langkah, FAQ, tema gelap), ganti bahasa lewat tautan di kaki landing, kartu pertanyaan di Beranda untuk tiap bahasa, jawab pertanyaan lalu lihat kiriman di umpan dengan bahasa lain.
- Setelah unggah: Search Console > kirim ulang `sitemap.xml`; Pemeriksaan URL untuk `/es/`, `/fr/`, `/hi/`, `/ar/`; opsional `node tools/indexnow.js`. Terjemahan baru (dan Jawa/Sunda) sebaiknya dibaca penutur asli.


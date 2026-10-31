# Update Jurkon, 1 November 2026

Halaman masuk dirombak, dokumen hukum dirapikan, dan kebijakan privasi disesuaikan dengan kode. Tanpa SQL.

| Pekerjaan | Berkas | Perlu SQL? | Status |
|---|---|---|---|
| Halaman masuk baru (padat, mengikuti 5 tema) | `login.html`, `css/login.css` | Tidak | Diuji tampilan di Chromium (5 tema, HP dan desktop); login sungguhan belum diuji |
| Tipografi dokumen hukum | `css/dokumen.css`, `kebijakan-privasi.html`, `ketentuan-layanan.html`, `aturan.html` | Tidak | Sama |
| Kebijakan privasi: bahasa, hitungan gagal masuk, Cloudflare Turnstile (sudah aktif: kunci situs terisi di `js/supabase.js`) | `kebijakan-privasi.html` | Tidak | Perlu dibaca pemilik sebelum rilis |
| Pertanyaan harian: tampilan baru, jalur hari, jawab kemarin, pemuat jawaban tahan gagal | `pertanyaan.html`, `js/pertanyaan-halaman.js`, `js/pertanyaan.js`, `css/style.css`, `css/tema-kaca.css`, `css/tema-awan.css` | Tidak | Diuji dengan Supabase tiruan di Chromium; belum diuji di produksi |
| Cache offline | `sw.js` | Tidak | Jalankan `node tools/naikkan-cache.js` |

Catatan:
- `css/login.css` hanya mengatur ukuran dan tata letak; warna isian dan tombol tetap dari `style.css`, `tema-kaca.css`, `tema-awan.css`. Tema baru otomatis ikut bila mengikuti pola itu.
- Tidak ada kunci bahasa baru (memakai `auth.*` yang ada), jadi `node tools/cek-bahasa.js` tetap OK.
- Teks privasi **tidak** diubah soal isi hukum selain tiga penyesuaian di atas. Pernyataan "masuk dengan Google" masih ada padahal tombol Google dinonaktifkan di `js/auth.js`; biarkan bila akan diaktifkan lagi, hapus bila tidak.
- Pasang: `git pull --rebase`, `unzip -o jurkon-patch.zip`, `node tools/naikkan-cache.js`, `git add -A`, `git commit -m "Login baru, dokumen hukum, privasi"`, `git push`.

---

# Update Jurkon, 31 Oktober 2026

Catatan pembaruan sesi ini: kapsul waktu, perapian tampilan di Google dan WhatsApp, dan persiapan cadangan data.
Dokumen ini juga bisa dipakai sebagai handoff untuk sesi berikutnya.

## 1. Ringkasan

| Pekerjaan | Paket | Perlu SQL? | Status |
|---|---|---|---|
| Kapsul waktu | `kapsul-waktu.zip` | Ya, `sql/024_kapsul_waktu.sql` | Diuji di Postgres lokal dan browser; belum dikonfirmasi di produksi |
| Deskripsi, judul, favicon | `seo.zip` | Tidak | Diuji di salinan repo; belum dikonfirmasi di produksi |
| Cadangan data | (tanpa paket) | Tidak | Alat terpasang di Codespace; cadangan pertama belum dibuat |

Aturan pasang tetap: **SQL dulu di Supabase, baru unggah kode.** Jangan tempel SQL atau connection string ke terminal selain yang diminta.

## 2. Kapsul waktu

Catatan utama baru bisa dijadwalkan muncul pada waktu yang dipilih penulis.

Aturan:
- Pilihan di lembar tulis: besok, 1 minggu, 1 bulan, 1 tahun, atau tanggal bebas. Server membatasi 1 jam sampai 365 hari dari jam server.
- Hanya untuk catatan utama (bukan balasan, kutipan, atau posting ulang). Tidak bisa digabung dengan catatan berumur.
- Sebelum waktunya, kapsul tidak terbaca siapa pun lewat RLS, termasuk penulisnya. Admin tetap bisa membaca untuk moderasi, tetapi kapsul belum tampil di feed admin.
- Penulis melihat dan membatalkan kapsulnya lewat tautan **Kapsul saya** di lembar tulis (`kapsul_saya()` dan `batalkan_kapsul()`).
- Waktu buka tidak bisa diubah setelah dikirim.
- Tidak ada notifikasi (mention, pengikut) untuk kapsul. Notifikasi yang terbentuk saat kirim dihapus oleh trigger `zz_kapsul_notif_trg`.
- Kapsul yang sudah terbuka diurutkan menurut waktu bukanya. Kolom `created_at` di hasil `daftar_posting` dan `posting_ramai` berisi waktu buka, dan kolom baru `kapsul_ditulis` berisi tanggal tulis asli (untuk label "Kapsul waktu, ditulis ...").
- Tanpa pg_cron: kapsul terbuka karena waktu sekarang melewati `terbuka_pada`.

### Cara memasang
1. Supabase > SQL Editor: tempel isi `sql/024_kapsul_waktu.sql`, Run. Jalankan 4 kueri cek di bagian bawah berkas (hasil: 1 baris, 4 baris, 2 baris, kebijakan "posting dibaca anggota").
2. Codespace:
```
git pull --rebase
unzip -o kapsul-waktu.zip
node tools/pasang-kapsul-waktu.js
git status --short
node tools/naikkan-cache.js
git add -A
git commit -m "Kapsul waktu"
git push
```

### Cara mencoba
1. Buka jurkon.my.id, ketuk Tulis, pilih Kapsul waktu "Buka besok", kirim. Harus muncul "Kapsul tersimpan. Terbuka ...". Catatan tidak tampil di feed.
2. Ketuk **Kapsul saya**: kapsul terdaftar, ada tombol Batalkan.
3. Untuk melihat kapsul terbuka tanpa menunggu, di SQL Editor (ganti `ISI` dengan sebagian teks catatan):
```
update posts set terbuka_pada = now() - interval '1 minute'
where content like '%ISI%' and terbuka_pada is not null;
```

### Pembatalan (rollback)
`drop trigger zz_kapsul_notif_trg on posts; drop trigger jaga_kapsul_trg on posts;` lalu pasang ulang kebijakan baca dan fungsi `daftar_posting` / `posting_ramai` dari `sql/023_catatan_berumur.sql`, dan `alter table posts drop column terbuka_pada;`. Detail ada di bagian bawah berkas 024.

### Catatan teknis
- Bila `daftar_posting` atau `posting_ramai` didefinisikan ulang di migrasi berikutnya, kolom `kedaluwarsa` dan `kapsul_ditulis` harus tetap ada di akhir daftar kolom hasil (klien memetakannya di `dariBaris`, `js/data.js`).
- `landing_publik()` masih ikut menghitung kapsul yang belum terbuka (hanya angka, tidak membocorkan isi).
- Skrip tambalan memakai teks anchor dan berhenti sebelum menulis apa pun bila titik sisip berubah. Aman dijalankan ulang.

## 3. Tampilan di Google dan WhatsApp (`seo.zip`)

Isi paket: `tools/ganti-deskripsi.js` dan `tools/ganti-judul.js`.

Perubahan:
- Deskripsi (meta description dan og:description) di `index.html`, `landing.html`, `tentang.html`:
  "Sosmed buatan orang Indonesia. Nulisnya cuma 250 karakter, feed ada ujungnya, dan bisa titip catatan buat dirimu untuk setahun lagi."
- Judul `index.html` dan `landing.html`: "Journal Connection - tempat nulis catatan dan pengingat dirimu".
- Di `index.html` atribut `data-i-doc` pada `<title>` dibuang agar JS (`js/i18n.js`) tidak menimpa judul menjadi "Beranda · Jurkon" (Googlebot menjalankan JS). Hitungan notifikasi "(3)" di judul tab tetap jalan (`js/notif.js`).
- Favicon 192 px (`assets/icons/icon-192.png`) ditambahkan agar ikon di hasil Google tidak berupa globe.

Cara memasang:
```
git pull --rebase
unzip -o seo.zip
node tools/ganti-deskripsi.js
node tools/ganti-judul.js
git status --short
node tools/naikkan-cache.js
git add -A
git commit -m "Judul, deskripsi, dan favicon untuk pencarian"
git push
```

Catatan:
- Judul tidak memuat kata "Jurkon". Alternatif: "Jurkon (Journal Connection) - tempat nulis catatan dan pengingat dirimu".
- `js/landing.js` menimpa judul landing bila `hero_judul` diisi di panel admin.
- Google butuh beberapa hari sampai beberapa minggu untuk menjelajah ulang. Pratinjau WhatsApp menyimpan cache lama; uji dengan menambahkan `?v=2` pada tautan.
- Saat dicek (`site:jurkon.my.id`), baru `/` yang terindeks, dengan judul dan deskripsi lama.
- Isi catatan tidak pernah terindeks: hanya anggota login yang bisa membaca (RLS), dan halaman catatan, profil, dan Jelajah memakai `noindex`.
- Search Console tidak wajib, tetapi disarankan (Domain, verifikasi lewat DNS TXT di Cloudflare) untuk meminta pengindeksan ulang `/` dan `/landing.html`.

## 4. Cadangan data (belum selesai)

Zip repo dari GitHub hanya menyimpan kode, bukan data. Data (akun, catatan, pesan, kapsul) ada di Supabase.

Langkah:
1. Cek **Supabase > Database > Backups**. Bila ada cadangan harian, itu cara termudah.
2. Bila tidak ada, cadangan manual dari Codespace:
```
sudo apt-get update && sudo apt-get install -y postgresql-client
echo '*.dump' >> .gitignore
read -s -p "Connection string: " DBURL; export DBURL
psql "$DBURL" -c "show server_version"
pg_dump "$DBURL" -Fc --no-owner --no-privileges --schema=public --schema=auth -f jurkon-$(date +%F).dump
ls -lh jurkon-*.dump
pg_restore -l jurkon-*.dump | head
```
3. Unduh berkas `.dump` ke HP (Explorer Codespace > tekan lama > Download), simpan di Google Drive, lalu `rm jurkon-*.dump; unset DBURL`.

Catatan:
- Connection string: Supabase > **Connect > Direct** > **Session pooler** (koneksi langsung memakai IPv6 dan biasanya gagal dari Codespaces). Jangan memilih tab MCP.
- Simbol di sandi harus di-encode (`@` jadi `%40`, `#` jadi `%23`, `/` jadi `%2F`), atau reset sandi dengan huruf dan angka saja.
- Alat yang terpasang adalah `postgresql-client-16`. Bila server Supabase versi 17, `pg_dump` gagal ("server version mismatch"); pasang klien 17 dari repo PGDG.
- Berkas `.dump` berisi data pengguna: jangan masuk repo, jangan dibagikan.
- Foto profil dan media chat ada di Supabase Storage, tidak ikut `pg_dump`.
- Status terakhir: `read -s` belum berhasil menyimpan connection string (perlu cek `echo ${#DBURL}`, harus lebih dari 0).
- Uji pemulihan sekali ke project Supabase kosong sebelum benar-benar dibutuhkan.

## 5. Catatan tindak lanjut

- Akun resmi sudah menulis catatan pengumuman kapsul waktu. Saran gaya: nada pribadi, tanpa daftar fitur, tanpa emoji berderet.
- Temuan di WhatsApp: tautan `http://` dengan pratinjau generik sempat dikira phishing. Bagikan tautan dengan `https://`, tambahkan satu kalimat pribadi, dan samakan nama merek di judul dan gambar pratinjau (`assets/og.jpg` bertuliskan "Journal Connection").
- Cloudflare: dipakai untuk DNS, Turnstile, dan bisa ditambah pembatas laju dan header keamanan (HSTS, frame-ancestors).

## 6. Belum dikonfirmasi / sisa pekerjaan

Belum dikonfirmasi:
- Apakah SQL 024, `kapsul-waktu.zip`, dan `seo.zip` sudah dijalankan di produksi.
- Setelan Auth Supabase (Confirm email, rate limit, SMTP kustom).
- Riwayat git: ada rahasia lama atau tidak.
- Hasil akhir migrasi 019 dan 020 (0 baris pada kueri cek).
- Penjadwalan pg_cron untuk `bersihkan_notifikasi(60)` dan `bersihkan_catatan_berumur(30)`.
- Ada tidaknya cadangan harian di Supabase.

Sisa pekerjaan teknis (urut prioritas):
1. Cadangan data pertama, lalu admin kedua dan catatan aksi MFA ke Jejak audit.
2. Notifikasi "kapsul terbuka" (butuh pg_cron atau pemeriksaan saat aplikasi dibuka).
3. Hapus kode ganda `htmlPost` dan `pasangAksiPost` di `js/supabase.js`.
4. Satukan email kontak (`EMAIL_KONTAK` di `js/config.js` masih placeholder, `kontak.js` hardcode).
5. Rapikan kamus bahasa (dua kunci yatim: `auth.google`, `auth.gagalGoogle`) dan jalankan `tools/cek-bahasa.js` otomatis.
6. CI GitHub Actions (cek-bahasa, versi cache, lint).
7. Utang teknis: runner migrasi SQL, CSP `style-src 'unsafe-inline'`, header HTTP via Cloudflare, kebijakan like/follow antar pengguna yang saling blokir.

Arah fitur berikutnya: jeda sebelum kirim (catatan emosional), atur sendiri feedmu (butuh hashtag), komunitas sekitar, Simpan (bookmark), hashtag, pencarian isi posting, polling.

## 7. Prompt pembuka untuk sesi baru

> Saya melanjutkan pengembangan Jurkon (jurkonstudio/jurkon, jurkon.my.id, Supabase). Bacalah dokumen update terlampir. Saya bekerja hanya dari HP (GitHub web dan Codespaces); paket perubahan dikirim sebagai zip dengan skrip tambalan. Audit keamanan selesai, kapsul waktu dan perapian SEO sudah dibuat. Mulai dari: (pilih) cadangan data / notifikasi kapsul terbuka / jeda sebelum kirim. Unggah juga zip repo terbaru bila perlu.

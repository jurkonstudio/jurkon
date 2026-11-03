# Update Jurkon, 3 November 2026 (malam): uji browser dan perapian JS/CSS

Tanpa SQL, tanpa deploy Edge Function. Cukup unggah berkas lalu push.

| Pekerjaan | Berkas | Status |
|---|---|---|
| **Alat uji browser baru**: membuka semua halaman utama di Chromium dengan Supabase tiruan, pada tema kertas/gelap/kaca/awan, lebar 320/390/1280 px, mode tamu dan masuk; melaporkan galat JS, berkas 404, dan layar yang melebar ke samping | `tools/uji-browser.js`, `tools/uji/fake-supabase.js` | Dijalankan: 696 pemuatan (29 halaman x 2 mode x 4 tema x 3 lebar), tidak ada masalah setelah perbaikan di bawah |
| **Bug tampilan ditemukan alat uji**: `statistik.html` melebar 9 px ke samping di 390 px. Penyebab: kelas `stat` di halaman itu bentrok dengan aturan global `.stat>div{display:flex}` milik statistik profil. Kelas diganti `stat-halaman` | `statistik.html` | Diperbaiki dan diuji ulang |
| Hapus kode ganda `htmlPost` dan `pasangAksiPost` di `js/supabase.js` (yang berlaku selama ini sudah di `js/ui.js`). Dicek: halaman yang memuat `supabase.js` tanpa `ui.js` (`jelajahi`, `n`, `profil-publik`, `landing`) tidak memakainya | `js/supabase.js` | Diuji |
| Hapus 13 aturan CSS mati (sisa gaya Jurnal lama `jr-item`, `jr-meta`, `jr-lencana`, `jr-isi`, `jr-aksi`, `jr-hapus`, `jr-publik`, `jr-daftar`, `jr-aksi-kepala`, dan `.baris-profil`; `style.css` turun sekitar 1 KB). Kelas yang dibentuk dinamis (`j-suka` di notifikasi) sengaja DIPERTAHANKAN | `css/style.css` | Diuji |
| Versi cache dinaikkan | `sw.js` | `node tools/naikkan-cache.js` |

Cara memakai alat uji (di Codespaces, sekali pasang):
```
npm i --no-save playwright && npx playwright install chromium
node tools/uji-browser.js --cepat      # ±1 menit: tema kertas, lebar 390 dan 1280
node tools/uji-browser.js              # lengkap, ±10 menit
node tools/uji-browser.js --halaman=profil.html,jurnal.html
```
Jalankan sebelum tiap unggah. Keluar dengan kode 1 bila ada masalah.

Batas alat uji (jujur):
- Supabase DITIRUKAN (semua kueri mengembalikan data kosong). Jadi yang teruji: skrip berjalan tanpa galat, halaman tidak rusak di 4 tema dan 3 lebar, tidak ada berkas hilang. TIDAK teruji: RLS, SQL, Edge Function, realtime, unggah berkas, dan tampilan dengan data nyata (daftar catatan terisi, chat berisi).
- Uji manual di HP tetap perlu untuk alur dengan akun sungguhan (login, kirim catatan, Jurnal, Kapsul, Brankas).
- Pustaka Supabase asli tidak dipakai karena sandbox pembuatnya tidak bisa mengunduhnya; atribut `integrity` (SRI) dilepas hanya di server uji.

Hasil pengukuran utang CSS (`css/style.css`, 136 KB, 1.7 ribu baris):
- 29 bagian bertanda, 78 blok `@media`, 42 `!important`, 62 aturan berselektor ID (`#atas ...`) yang dipakai untuk menimpa gaya lama.
- Selektor yang ditulis ulang 4-5 kali: `.header`, `.nav`, `.nav a`, `.nav svg`, `.post`, `.post .aksi`, `.post .isi`, `.btn`. Lapisan "Desktop v5" dan "Sampul jurnal" sengaja diletakkan paling bawah supaya menang; aturan HP `.nav a{font-size:11px}` yang jatuh sesudah aturan desktop pernah menyebabkan ikon menu 0 px.
- Hanya 13 kelas (sekitar 3%) yang tidak dirujuk di mana pun; sudah dihapus. Penghapusan lebih besar (menggabungkan lapisan) SENGAJA belum dilakukan karena butuh pembanding gambar sebelum-sesudah; urutannya di bagian "Sisa pekerjaan teknis".
- Aturan praktis agar bug serupa tidak terulang: jangan memberi kelas umum (`stat`, `kartu`, `daftar`) pada elemen halaman baru tanpa awalan halaman, dan selalu batasi aturan turunan global (`.stat>div`) dengan induk (`#atas .profil-atas .stat>div`).

Yang TIDAK diubah, dan alasannya:
- `document.write` di `js/bahasa-muat.js` dan `js/tema.js`: sengaja, karena kamus bahasa harus sudah ada sebelum `i18n.js` berjalan. Memuat dengan `async` akan membuat teks Indonesia berkedip. Berkasnya sama-asal (bukan lintas situs), jadi tidak terkena pemblokiran Chrome.
- Email kontak (`journalconnection@aol.com` di `js/config.js` vs `jurkon@yahoo.com` di `js/kontak.js` dan `security.txt`): ini keputusanmu alamat mana yang dipakai. Setelah dipilih, ubah satu alamat di tiga tempat itu.
- `sql/025_kunci_kolom_insert.sql` tetap hilang (lihat temuan 1 di bawah); butuh SQL baru dan uji di database.

---

# Update Jurkon, 3 November 2026 (tindak lanjut audit)

Perbaikan dari audit kode dan penyamaan dokumen dengan isi repo. Tanpa SQL.

| Pekerjaan | Berkas | Perlu deploy? | Status |
|---|---|---|---|
| Batas laju login: IP dari `cf-connecting-ip` (bukan entri pertama `x-forwarded-for`) | `supabase/functions/masuk-username/index.ts` | Ya: `supabase functions deploy masuk-username --no-verify-jwt` | Kode dicek sintaks; tes login di produksi belum dikonfirmasi |
| Galat seragam (hanya CAPTCHA, batas laju, email belum dikonfirmasi yang diteruskan), percobaan masuk palsu untuk username tak ada, CORS dibatasi | sama | Ya (sama) | Sama |
| Service worker: daftar `STATIS` (inti) dan `OPSIONAL` | `sw.js`, `tools/naikkan-cache.js` | Tidak, cukup push | Sama |
| Hapus berkas CSS mati di akar (`style.css`, `tema-awan.css`, `tema-kaca.css`; yang dipakai ada di `css/`) | 3 berkas dihapus | Tidak | Sudah di-commit |

Catatan:
- Asal tambahan untuk CORS (mis. pratinjau Codespaces): `supabase secrets set ALLOWED_ORIGINS="https://jurkon.my.id,https://www.jurkon.my.id,https://NAMA.app.github.dev"`.
- Token akses Supabase untuk deploy: hapus dari dashboard setelah dipakai, dan jangan tampilkan di layar.
- Dokumen yang disamakan dengan isi repo: `sql/README.md` (5 migrasi yang belum tercatat; 025 tidak ada berkasnya), `docs/pasang.md`, `docs/teknis.md`, `docs/keamanan.md`, `docs/fitur.md` (Brankas, Penerjemah, sesi login, sambutan, onboarding), `PASANG-MASUK-USERNAME.md`.
- Kamus bahasa kini 822 kunci per bahasa (id, en, ko, hi sama). Angka "647 kunci" di bagian 2 November di bawah adalah catatan lama.

Temuan yang belum dikerjakan:
1. **`sql/025_kunci_kolom_insert.sql` tidak ada di repo** padahal dicatat di README dan HANDOFF (status "belum dijalankan"). Celahnya: anggota login bisa memalsukan `created_at`, `dilihat`, dan `disorot` lewat API. Cek di Supabase: `select tgname from pg_trigger where tgname = 'a0_kunci_kolom_trg';` (0 baris = belum ada). Berkas perlu dibuat ulang dari rancangan di bagian "Migrasi 025" HANDOFF, diuji, lalu dijalankan.
2. Email kontak tidak seragam: `js/config.js` memakai `journalconnection@aol.com`, sedangkan `js/kontak.js` dan `.well-known/security.txt` memakai `jurkon@yahoo.com`.
3. ~~Kode ganda `htmlPost` dan `pasangAksiPost`~~: SELESAI 3 November malam (lihat bagian paling atas).
4. Periksa *Enforce HTTPS* di Pages dan ganti `document.write` di `js/bahasa-muat.js` dan `js/info-muat.js`.

---

# Update Jurkon, 2 November 2026 (bahasa Korea dan Hindi)

Bahasa **한국어 (ko)** dan **हिन्दी (hi)** ditambahkan ke seluruh bagian: antarmuka aplikasi (647 kunci), landing page, halaman Tentang/Privasi/Aturan/Bantuan/Ketentuan, navigasi bahasa, hreflang, sitemap, dan versi cache.

| Bagian | Berkas |
|---|---|
| Kamus antarmuka | `js/bahasa.js` (kolom ko, hi), `js/bahasa/ko.js`, `js/bahasa/hi.js`, `js/bahasa-muat.js` |
| Landing page | `tools/landing-teks.js` (blok `T.ko`, daftar `BAHASA`), `ko/index.html`, `hi/index.html`, `landing.html` |
| Halaman info | `js/info/ko.js`, `js/info/hi.js`, `tools/info-config.js`, `ko/*.html`, `hi/*.html`, `js/info-arah.js` |
| Ketentuan | `js/ketentuan-bahasa.js` (blok ko, hi) |
| Sitemap dan pengalihan | `tools/buat-sitemap.js`, `sitemap.xml`, `js/akar.js` |
| Navigasi manual | `proses-membangun-jurkon.html`, `tempat-curhat-tanpa-algoritma.html` |

Urutan menjalankan ulang (setelah mengubah kamus atau teks):
`node tools/cek-bahasa.js` → `node tools/pecah-bahasa.js` → `node tools/buat-info.js` → `node tools/buat-landing.js` → `node tools/buat-sitemap.js` (wajib terakhir, karena `buat-landing` juga menulis sitemap dengan format lebih sederhana) → `node tools/naikkan-cache.js`.

Catatan:
- Terjemahan ko dan hi dibuat dengan bantuan mesin dan **perlu ditinjau penutur asli** sebelum rilis, terutama halaman hukum.
- Istilah "India" diartikan sebagai bahasa Hindi. Bahasa India lain (Tamil, Bengali, dsb.) belum termasuk.
- Teks yang di-hardcode dalam bahasa Indonesia di beberapa halaman aplikasi (login, daftar, panel admin, dan lainnya) belum masuk kamus. Ini berlaku untuk semua bahasa, bukan hanya ko dan hi.
- `es`, `fr`, dan `ar` sudah punya landing page, tetapi belum punya antarmuka aplikasi maupun halaman info.

# Update Jurkon, 1 November 2026 (landing global)

Landing page kini punya alamat sendiri untuk 7 bahasa supaya bisa terindeks mesin pencari di luar Indonesia. Tanpa SQL.

| Pekerjaan | Berkas | Perlu SQL? | Status |
|---|---|---|---|
| Landing per bahasa: `/en/`, `/ms/`, `/jv/`, `/su/`, `/zh/`, `/ja/` (Indonesia tetap `landing.html`) | `en/ ms/ jv/ su/ zh/ ja/ landing.html` | Tidak | Diuji di Chromium (7 bahasa, HP dan desktop) dengan Supabase tiruan; belum diuji di produksi |
| `hreflang`, canonical per bahasa, JSON-LD, pilihan bahasa di kaki halaman | sama | Tidak | Sama |
| Sitemap memuat 7 versi + `x-default` (Inggris) | `sitemap.xml` | Tidak | Sama |
| `landing.js` sadar bahasa (tombol, angka, bagikan) | `js/landing.js`, `js/landing-teks.js` | Tidak | Sama |
| Generator: satu template + satu kamus | `tools/buat-landing.js`, `tools/landing-teks.js`, `tools/landing-templat.html` | Tidak | Idempoten |

Catatan:
- **Jangan edit `landing.html`, `*/index.html`, dan `js/landing-teks.js` langsung.** Ubah `tools/landing-teks.js` (teks) atau `tools/landing-templat.html` (struktur), lalu `node tools/buat-landing.js`.
- Teks hero dan pengumuman dari panel admin berbahasa Indonesia, jadi hanya menimpa `landing.html`. Versi bahasa lain memakai teks terjemahan tetap; pengumuman tetap tampil tetapi ditandai `lang="id"`.
- Terjemahan Jawa dan Sunda perlu dibaca penutur asli. Terjemahan lain sebaiknya ditinjau sekali.
- Tautan Tentang, Pusat bantuan, dan dokumen hukum di halaman non-Indonesia masih menuju halaman Indonesia. Setelah versi terjemahannya ada, daftarkan bahasanya di `TERBIT` (`tools/landing-teks.js`) dan tautannya otomatis pindah ke `/<kode>/<slug>/`.
- Pasang: `git pull --rebase`, `unzip -o jurkon-landing-global.zip`, `node tools/buat-landing.js` (harus "Tidak ada perubahan"), `node tools/cek-bahasa.js`, `node tools/naikkan-cache.js`, `git add -A`, `git commit -m "Landing 7 bahasa untuk pencarian global"`, `git push`.
- Setelah tayang: Search Console > Sitemaps > kirim ulang `sitemap.xml`, lalu Inspeksi URL untuk `/en/` dan minta pengindeksan.

---

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
3. ~~Hapus kode ganda `htmlPost` dan `pasangAksiPost`~~ (selesai 3 November malam).
4. Satukan email kontak (`js/config.js` memakai `journalconnection@aol.com`; `js/kontak.js` dan `security.txt` memakai `jurkon@yahoo.com`).
5. Rapikan kamus bahasa (dua kunci yatim: `auth.google`, `auth.gagalGoogle`) dan jalankan `tools/cek-bahasa.js` otomatis.
6. CI GitHub Actions: jalankan `node tools/cek-bahasa.js` dan `node tools/uji-browser.js --cepat` otomatis tiap push (alat ujinya sudah ada sejak 3 November malam; tinggal workflow-nya).
7. Utang teknis: pembanding gambar sebelum-sesudah lalu gabungkan lapisan CSS timpa (lihat pengukuran di atas), runner migrasi SQL + tabel pencatat (nomor ganda 035, 036, 040 dan 025 hilang), CSP `style-src 'unsafe-inline'`, header HTTP via Cloudflare, kebijakan like/follow antar pengguna yang saling blokir.

Arah fitur berikutnya: jeda sebelum kirim (catatan emosional), atur sendiri feedmu (butuh hashtag), komunitas sekitar, Simpan (bookmark), hashtag, pencarian isi posting, polling.

## 7. Prompt pembuka untuk sesi baru

> Saya melanjutkan pengembangan Jurkon (jurkonstudio/jurkon, jurkon.my.id, Supabase). Bacalah dokumen update terlampir. Saya bekerja hanya dari HP (GitHub web dan Codespaces); paket perubahan dikirim sebagai zip dengan skrip tambalan. Audit keamanan selesai, kapsul waktu dan perapian SEO sudah dibuat. Mulai dari: (pilih) cadangan data / notifikasi kapsul terbuka / jeda sebelum kirim. Unggah juga zip repo terbaru bila perlu.

# Fitur dan migrasinya

Setiap bagian menyebut migrasi SQL yang dibutuhkan. Urutan lengkap ada di `sql/README.md`.

## Notifikasi

Panel notifikasi dalam aplikasi: suka, balasan, pengikut baru, dan pesan baru, dengan lencana belum dibaca dan pembaruan realtime.

- **Database:** jalankan `sql/005_notifikasi.sql` di Supabase SQL Editor (setelah 002). Notifikasi dibuat oleh trigger; klien hanya boleh membaca, menandai dibaca, dan menghapus miliknya. Pesan digabung: satu notifikasi belum dibaca per percakapan.
- **Retensi:** `select bersihkan_notifikasi(60);` menghapus notifikasi lebih dari 60 hari. Petunjuk penjadwalan dengan pg_cron ada di akhir file SQL.
- **Klien:** `js/notif.js` (jumlah, realtime, penyusun kalimat), `js/notifikasi.js` + `notifikasi.html` (daftar). Tab Notifikasi dan lencana ada di `js/nav.js`; ringkasan 5 terbaru tampil di panel kanan layar lebar.
- Bila migrasi belum dijalankan, aplikasi tetap berjalan tanpa lencana.

## Feed Beranda: Publik dan Mengikuti

Beranda punya dua tab. **Publik** menampilkan semua posting utama; **Mengikuti** hanya posting sendiri dan akun yang diikuti (kosong bila belum mengikuti siapa pun, dengan ajakan ke Jelajah). Tab terakhir yang dipilih diingat di perangkat (`localStorage: feedAktif`, bawaan Publik).

- Klien: `index.html` (tab), `js/feed.js` (logika), `css/style.css` (bagian *Tab feed*).
- Database: jalankan `sql/006_feed_dua_bagian.sql` untuk menambah mode `ikuti` pada `daftar_posting`. Tanpa itu aplikasi tetap jalan, hanya akun yang belum mengikuti siapa pun akan melihat semua posting di tab Mengikuti.

## Mention @username

Saat menulis posting atau balasan, mengetik `@` memunculkan saran akun (akun yang diikuti lebih dulu; ketik huruf untuk mencari username). Ketuk saran untuk menyisipkan. `@username` di dalam posting tampil sebagai tautan ke profil. Tanpa migrasi database. Kode: `js/mention.js`, `isiHtml()` di `js/ui.js`. Mention mengirim notifikasi (migrasi 015).

## Foto profil & batas ubah bulanan

Di **Profil > Ubah profil**, pemilik akun bisa mengunggah, mengganti, atau menghapus foto profil. Foto otomatis dipotong persegi, dikecilkan ke 320px, dan disimpan sebagai JPEG (data lokasi/EXIF hilang). Foto tampil di semua tempat: feed, detail & balasan, profil, Jelajah (pencarian orang), daftar & header Pesan, Notifikasi, dan saran @mention. Bila foto gagal dimuat atau belum ada, tampil huruf inisial seperti sebelumnya.

- **Batas per bulan kalender (zona WIB, reset tanggal 1)**: foto 3x, nama 2x, username 2x. Ubah angkanya di fungsi `batas_profil()` pada `sql/008_foto_profil_limit.sql`, lalu jalankan ulang file itu. Hapus foto juga dihitung sebagai satu perubahan. Mengubah bio tidak dibatasi. Aturan username sekali sehari (007) tetap berlaku.
- **Ditegakkan di database** (trigger `batasi_profil_bulanan_trg`), bukan hanya di layar. Layar menampilkan sisa jatah dan meminta konfirmasi sebelum memakai jatah. Pengisian profil pertama (halaman selamat) tidak dihitung.
- **Penyimpanan**: bucket publik `avatar` (maks 512 KB per file, JPG/PNG/WebP). Pengguna hanya boleh mengunggah ke foldernya sendiri, maksimal 6 file tersimpan; foto lama dihapus otomatis setelah ganti. `foto_url` hanya boleh menunjuk ke folder milik sendiri.
- **Urutan pasang**: jalankan `008` di Supabase DULU, baru unggah kode ke GitHub. Tanpa 008, kueri yang meminta kolom `foto_url` akan gagal.
- Catatan: foto tidak dimoderasi otomatis. Laporan akun tetap lewat alur laporan yang ada, dan admin bisa mengosongkan `foto_url` lewat SQL Editor (tidak dibatasi jatah).

## Dislike, kutip, posting ulang, dan penanda perangkat
- **Database:** jalankan `sql/013_perangkat_dislike_kutip.sql` (setelah 002–012; aman diulang). Isinya: kolom `perangkat`, `jenis`, `kutip_id` di `posts`, tabel `dislikes`, fungsi `toggle_tidak_suka`, `toggle_ulang`, `statistik_posting`, dan pembatas posting yang mengenal kutip/ulang.
- **Dislike:** jumlahnya tampil di tiap kartu; siapa yang dislike tidak terlihat orang lain. Menyukai posting otomatis membatalkan dislike, dan sebaliknya.
- **Posting ulang:** ketuk ikon panah ganda → Posting ulang. Muncul di profil dan feed pengikut sebagai kartu "X memposting ulang". Posting ulang tidak memakai kuota menulis harian.
- **Kutip:** ketuk ikon panah ganda → Kutip, tulis komentar; posting asli tampil sebagai kotak kutipan. Bila aslinya dihapus, kutipan tampil "tidak tersedia".
- **Perangkat:** tiap posting baru menyimpan iOS/Android/Web (dari browser), tampil kecil di bawah posting.
- Tanpa migrasi 013, aplikasi tetap berjalan; fitur-fitur di atas hanya belum muncul.
- Catatan: `007_anti_spam.sql` sudah diperbaiki (sintaks `CASE` di dalam `IF` ditolak Postgres); jalankan ulang file itu bila sebelumnya gagal.

## Pesan hanya untuk akun yang saling mengikuti, dan notifikasi "Mengikuti"
- **Database:** jalankan `sql/014b_pesan_saling_ikuti_notif_mengikuti.sql` (setelah 002 dan 005; aman diulang). Jalankan SEBELUM mengunggah kode JS terbaru.
- **Pesan:** pesan hanya bisa dikirim bila kedua akun saling mengikuti. Ditegakkan di database (fungsi `saling_ikuti`, kebijakan insert `messages`, dan `buka_percakapan`), jadi tidak bisa ditembus lewat API. Bila salah satu berhenti mengikuti, riwayat tetap terbaca tetapi kotak kirim terkunci. Di profil, tombol Kirim Pesan nonaktif sampai saling mengikuti.
- **Notifikasi terpisah:** halaman Notifikasi punya dua tab. *Aktivitas* (suka, balasan, pengikut baru, pesan) dan *Mengikuti* (catatan baru dari akun yang kamu ikuti, jenis `posting`). Jumlah belum dibaca dan "Tandai semua dibaca" dihitung per tab; lencana menu menjumlahkan keduanya (ubah di `js/nav.js`, baris `setLencana('notifikasi', ...)`, bila hanya ingin Aktivitas). Panel kanan hanya menampilkan Aktivitas.
- Notifikasi "Mengikuti" dibuat oleh trigger saat catatan utama diposting (balasan dan posting ulang murni tidak). Satu baris per pengikut, jadi akun dengan pengikut sangat banyak akan menulis banyak baris per posting; retensi 60 hari (`bersihkan_notifikasi`) berlaku juga di sini.

## Notifikasi kutip, posting ulang, dan mention
- **Database:** jalankan `sql/015_notif_kutip_ulang_mention.sql` (setelah 002, 005, 013, 014a, 014b; aman diulang). Jalankan SEBELUM mengunggah kode JS terbaru.
- Jenis baru di tab *Aktivitas*: `ulang` (catatanmu diposting ulang), `kutip` (catatanmu dikutip), `mention` (@usernamemu disebut di posting atau balasan).
- Tidak ganda: pemilik catatan yang dibalas atau dikutip tidak mendapat mention lagi untuk catatan itu, dan pengikut yang sudah mendapat kutip/mention tidak mendapat notifikasi "Mengikuti" untuk catatan yang sama.
- Maksimal 5 akun yang disebut per catatan yang diberi notifikasi. Membatalkan posting ulang menghapus notifikasinya.

## Foto & pesan suara di chat (hilang setelah 10 menit)
Di kotak kirim chat ada tombol kamera (foto) dan mikrofon (pesan suara, maks 60 detik). Berkas hanya bisa dibuka **10 menit** sejak dikirim; setelah itu gelembung berubah menjadi "sudah hilang". Foto dan suara hanya bisa dikirim antar akun yang saling mengikuti (aturan yang sama dengan pesan teks).

- **Database:** jalankan `sql/017_media_pesan.sql` (setelah 002, 004, 007, dan 014b_pesan_saling_ikuti_notif_mengikuti; aman diulang) SEBELUM mengunggah kode JS terbaru. Isinya: kolom `media_jenis`/`media_path` di `messages`, bucket privat `media-pesan` (maks 3 MB per berkas), kebijakan storage, dan pembatas media (akun baru 10/jam, lainnya 40/jam; maks 12 unggahan per 10 menit).
- **Akses 10 menit ditegakkan di database:** kebijakan baca storage hanya meloloskan peserta percakapan selama 10 menit sejak unggah, jadi tidak bisa dibuka lagi lewat API walau berkasnya belum terhapus. Tautan yang dibuat klien juga berlaku paling lama sampai batas itu.
- **Penghapusan fisik berkas:** ada dua lapis. (1) Cadangan: saat pengirim membuka chat, berkas miliknya yang kedaluwarsa dihapus. (2) Utama: Edge Function `supabase/functions/hapus-media-kedaluwarsa` membuang semua berkas lewat 10 menit. Pasang sekali: Supabase > Edge Functions > deploy folder itu (atau `supabase functions deploy hapus-media-kedaluwarsa`), lalu jadwalkan tiap 5 menit lewat Integrations > Cron (jenis Edge Function) atau pg_cron + pg_net. Kunci service_role disediakan Supabase di dalam fungsi; jangan dimasukkan ke repo. **Fungsi ini sekarang menolak panggilan tanpa rahasia bersama** (kunci anon itu publik): jalankan `supabase secrets set CRON_SECRET=<acak 32+ karakter>`, dan penjadwal harus mengirim `POST` dengan header `x-cron-secret: <nilai yang sama>` (Cron jenis HTTP Request, atau pg_cron + pg_net).
- **Foto:** dikecilkan ke maks 1280px dan disimpan ulang sebagai JPEG di perangkat, sehingga data EXIF/lokasi hilang. **Suara:** MP4/AAC bila didukung, selain itu WebM/Opus (Android Chrome lama merekam WebM, yang bisa gagal diputar di iPhone lama).
- Rekam suara butuh HTTPS dan izin mikrofon (GitHub Pages sudah HTTPS). Tombol media otomatis tersembunyi bila migrasi 017 belum dijalankan atau perangkat tak mendukung rekam suara.
- Catatan: foto dan suara tidak dimoderasi otomatis (filter kata hanya untuk teks). Blokir tetap berlaku. Pertimbangkan menambah satu kalimat di Kebijakan Privasi bahwa media chat hanya tersimpan 10 menit.

## Notifikasi suka ikut hilang saat suka dibatalkan
Jalankan `sql/018_hapus_notif_suka.sql` (setelah 005 dan 013; aman diulang). Bila suka dibatalkan, termasuk saat menekan "tidak suka" yang otomatis membatalkan suka, notifikasi "menyukai catatanmu" ikut dihapus (seperti posting ulang yang dibatalkan). Suka lagi sesudahnya memberi notifikasi baru; batas laju suka (007) mencegah penyalahgunaan.

## Profil: tab Kapsul, saling-ikuti, Bagikan

- **Tab Kapsul** (hanya terlihat oleh pemilik profil): daftar kapsul waktu yang belum terbuka, dengan hitung mundur dan tombol Batalkan. Memakai `kapsul_saya()` dan `batalkan_kapsul()` dari `sql/024_kapsul_waktu.sql`. Tidak ada SQL baru.
- **Mengikuti kamu / Ikuti balik**: profil orang lain menampilkan label "Mengikuti kamu" bila dia mengikuti kita, dan tombol Ikuti berubah menjadi "Ikuti balik". Tombol Kirim Pesan tetap hanya aktif bila saling mengikuti.
- **Bagikan profil**: ikon bagikan di profil sendiri, atau di menu ⋯ pada profil orang lain. Memakai lembar bagikan bawaan perangkat, atau menyalin tautan bila tidak tersedia. Tautan yang dibagikan berbentuk `jurkon.my.id/@username`. GitHub Pages tidak punya aturan rewrite, jadi alamat itu jatuh ke `404.html`, lalu `js/alih-profil.js` mengalihkannya ke `profil.html?u=username` (bentuk `/username` tanpa @ juga dialihkan, tetapi kalah dari halaman asli bernama sama seperti `/login` atau `/n`).
- **Tautan yang mengingat tujuan**: bila belum login, halaman diarahkan ke `login.html?lanjut=<halaman>` dan setelah masuk kembali ke halaman itu. Hanya nama berkas `.html` Jurkon sendiri yang diterima (`lanjutAman()` di `js/supabase.js`); alamat luar diabaikan.
- **Sematkan catatan**: di profil sendiri, kartu catatan utama punya ikon pin. Catatan yang disematkan tampil di puncak tab Catatan dengan label "Disematkan" (tidak dobel di daftar). Satu sematan per profil; ketuk pin lagi untuk melepas. Yang boleh disematkan hanya catatan utama milik sendiri yang sudah tayang dan tidak berumur, ditegakkan oleh trigger di `sql/026_sematkan_catatan.sql`. Bila catatannya dihapus, sematan hilang otomatis.

## Catatan publik

Jalur masuk organik: penulis boleh menjadikan **satu catatan** bisa dibaca siapa pun (tanpa login) lewat tautan `https://jurkon.my.id/n?id=<id>`. Bawaan tetap privat.

- **Database:** jalankan `sql/027_catatan_publik.sql` (setelah 026). Tabel `posts` tetap tertutup untuk anon; dunia luar hanya lewat `catatan_publik(id)` dan `daftar_publik()`.
- **Cara pakai:** ikon globe di kartu catatan milik sendiri. Dialog menjelaskan akibatnya dan mewajibkan centang sebelum tombol "Jadikan publik" aktif. Ikon berwarna aksen = sedang publik. Di dialog yang sama ada Salin tautan, Bagikan, dan "Jadikan privat lagi".
- **Syarat (ditegakkan server):** email terverifikasi, akun tidak dibekukan, akun berumur 3 hari, maks 5 catatan publik per 24 jam, hanya catatan utama biasa (bukan balasan, kutipan, posting ulang, catatan berumur, kapsul waktu), lolos filter konten, tanpa tautan/email/nomor telepon/@sebutan, tidak sedang dilaporkan, dan tidak dikunci pengelola.
- **Yang tampil ke publik:** isi, tanggal, nama, @username, jumlah suka. Tanpa foto dan data profil lain.
- **Hilang otomatis dari publik:** dijadikan privat, dihapus, akun dibekukan, 3 laporan baru, atau dikunci pengelola. Pengelola: `select admin_kunci_publik('<uuid catatan>', 'alasan');` (buka kunci: `admin_buka_kunci_publik`).
- **Klien:** `n.html` + `js/n.js` (halaman baca, boleh diindeks, tombol Laporkan untuk anggota yang login), `js/publik.js` (tombol dan dialog), kamus `pub.*`.
- **Pratinjau WhatsApp/X dan sitemap:** butuh Worker Cloudflare, lihat `worker/README.md`. Tanpa Worker, fitur tetap jalan tetapi pratinjau tautan generik.
- Tab Beranda "Publik" diganti label "Semua" karena artinya hanya "semua catatan untuk anggota", bukan publik di internet.

## Angka aksi: tersembunyi saat 0 dan menyegarkan diri

- Angka suka, tidak suka, posting ulang, dan tayang pada kartu **tidak ditampilkan sampai ada yang menyukai/melihat** (ikonnya tetap; ikon tayang ikut muncul saat angkanya > 0).
- Kartu yang sedang terlihat di layar diperbarui sendiri lewat `angka_posting()` (`sql/030_angka_langsung.sql`), satu pemanggilan untuk semua kartu. Jeda 6 detik, melebar sampai 30 detik bila tidak ada perubahan, berhenti saat tab di latar belakang, dan menyegarkan cepat saat tab dibuka lagi. Angka yang berubah memberi animasi "tik" singkat (mati bila perangkat memakai "kurangi gerakan").
- Ini polling ringan, bukan WebSocket. Tidak ada tabel baru dan tidak ada langganan Realtime. Tanpa migrasi 030 kartu tetap berfungsi, hanya tidak menyegarkan diri.
- Kode: `setAngka()` dan `pasangAngkaLangsung()` di `js/ui.js`, gaya `.tik` di `css/style.css`.

## Bar aksi baru dan kartu tautan

- **Urutan aksi:** Balas · Posting ulang · [Suka | Tidak suka] · Tayang, lalu Lapor/Sematkan/Publik/Hapus di sisi kanan. Suka dan tidak suka berada dalam satu pil dengan sekat tipis. Warna aktif per aksi memakai token tema: suka = `--aksen`, tidak suka = `--teks` (netral, tidak ikut merah), posting ulang = `--hijau` (dibuat per tema di `css/style.css`). Hover memberi lingkaran halus berwarna sesuai aksinya; hati memantul saat disukai (mati bila "kurangi gerakan").
- **Penanda perangkat** (iOS/Android/Web) sekarang berupa ikon kecil di sebelah waktu, bukan baris sendiri di bawah kartu.
- **Tautan di dalam posting** tampil sebagai kartu yang menyebut tujuannya ("Spotify · Album", "YouTube · Video", "Wikipedia · Artikel"), bukan alamat panjang. Alamat sendirian di satu baris menjadi kartu dua baris; alamat di tengah kalimat menjadi pil satu baris. Domain asli selalu tampil.
- **Keamanan tautan** (`htmlTautan` di `js/ui.js`): nama situs hanya dikenali dari domain yang persis cocok (`spotify.com.situs-lain.com` dianggap situs tak dikenal dan tampil dengan domain aslinya); alamat dengan `user:sandi@` dan alamat tanpa titik (mis. `localhost`) tidak dijadikan tautan; tautan pendek (bit.ly, s.id, t.co, dst.) diberi tanda peringatan karena tujuannya tersembunyi; dibuka di tab baru dengan `rel="noopener noreferrer nofollow ugc"`. Tidak ada permintaan ke situs lain (tanpa gambar atau judul yang diambil dari luar), jadi tidak ada kebocoran IP dan tidak ada perubahan CSP.
- Situs yang dikenali: Spotify, YouTube, Instagram, TikTok, X, Facebook, GitHub, Wikipedia, Google Maps, WhatsApp, Telegram. Tambah di `kenalSitus()`. Teks jenis ada di kamus (`tt.*`).

## Pertanyaan harian

Satu pertanyaan sama untuk semua orang tiap hari (hari menurut WIB), dipilih dari daftar `PQ_BANK` di `js/pertanyaan.js` (hari ke-N mod jumlah pertanyaan). Kartunya tampil di Beranda; halaman penuh `pertanyaan.html` menampilkan semua jawaban dan bisa membuka pertanyaan 30 hari ke belakang (`?tgl=YYYY-MM-DD`).

- **Database:** jalankan `sql/032_pertanyaan_harian.sql` (setelah 024) SEBELUM mengunggah kode JS. Jawaban adalah catatan biasa dengan `posts.pertanyaan_tgl`; satu jawaban per akun per hari, tanggal harus hari ini atau kemarin (WIB), hanya catatan utama biasa.
- **Klien:** kartu dan data di `js/pertanyaan.js`, halaman di `js/pertanyaan-halaman.js`, mode `jawab` di lembar tulis (`js/tulis.js`). Tanpa migrasi 032 kartu otomatis tidak tampil.
- **Teks pertanyaan hanya berbahasa Indonesia**; teks antarmukanya (`pq.*`) tersedia di 7 bahasa.

## Kartu catatan (gambar untuk dibagikan)

Catatan milik sendiri bisa dijadikan gambar PNG untuk Story Instagram, WhatsApp, dan sebagainya. Ikon gambar muncul di bar aksi kartu catatan sendiri (di sebelah ikon globe).

- **Tanpa SQL.** Gambar dibuat di perangkat lewat canvas, tidak diunggah ke server, dan tidak ada tabel atau kolom baru. Catatan privat pun boleh dijadikan kartu; yang memutuskan membagikan tetap penulisnya.
- **Pilihan:** warna (Kertas, Gelap, Merah), ukuran (Story 1080x1920, Persegi 1080x1080), dan tampilkan/sembunyikan nama, @username, dan tanggal. Pilihan warna dan ukuran diingat di perangkat (`localStorage: kartuPilihan`). Warna kartu sengaja tetap, tidak ikut tema aplikasi, supaya gambarnya konsisten.
- **Bagikan:** memakai lembar bagikan berkas bawaan ponsel bila ada; kalau tidak (mis. desktop) gambar diunduh.
- **Tata letak:** ukuran huruf otomatis dari 84px turun sampai 30px sesuai panjang catatan; baris baru asli dipertahankan; kata tanpa spasi (mis. tautan panjang) dipotong per karakter. Teks diambil dari isi asli catatan, bukan dari tampilan, jadi kartu tautan tidak ikut tertulis.
- **Hanya untuk catatan sendiri yang punya isi.** Posting ulang murni dan catatan orang lain tidak mendapat tombol.
- **Kode:** `js/kartu.js` (dimuat setelah `js/publik.js` di index, detail, profil, explore, pertanyaan), `tombolKartu()` dipanggil `htmlPost` di `js/ui.js`, gaya di akhir `css/style.css`, kamus `kartu.*` di 7 bahasa. Jalankan `node tools/naikkan-cache.js` sebelum unggah.
- **Catatan:** font Source Serif 4 tidak dimuat aplikasi, jadi kartu memakai serif bawaan perangkat (Iowan Old Style, Charter, atau Georgia); tampilannya sedikit berbeda antar perangkat. Mau seragam? Sertakan berkas font WOFF2 sendiri dan muat dengan `@font-face`.

## Pesan: tampilan baru (daftar dan panel chat)

Hanya perubahan tampilan dan perilaku di klien. Tanpa SQL, tanpa tabel atau kolom baru.

- **Daftar percakapan** (`pesan.html`, `js/pesan.js`): baris dengan foto 52px, nama, cuplikan pesan, dan waktu ringkas (jam bila hari ini, "kemarin", nama hari dalam seminggu, selebihnya tanggal). Percakapan yang belum dibaca ditandai titik warna aksen, nama dan cuplikan menebal, dan waktu berwarna aksen. Penanda dibaca dari tabel `notifications` (jenis `pesan`, `dibaca = false`); bila kueri itu gagal, daftar tetap tampil tanpa penanda.
- **Kolom cari** muncul bila ada lebih dari 4 percakapan. Menyaring di perangkat menurut nama dan username (boleh memakai awalan @), tanpa kueri baru.
- **Panel chat** (`chat.html`, `js/chat.js`): kepala berisi tombol kembali (ikon), foto, nama, dan @username yang bisa diketuk ke profil. Gelembung dari pengirim yang sama dengan jeda kurang dari 5 menit dirapatkan dan sudutnya disambung. Pemisah waktu: label hari ("Hari ini · 20.29") saat hari berganti, atau jam saja bila jeda lebih dari 30 menit. Menahan atau mengarahkan kursor ke gelembung menampilkan tanggal dan jam lengkap (atribut `title`).
- **Kotak kirim berbentuk pil**: kotak tulis tumbuh otomatis sampai kira-kira 5 baris, ikon foto dan mikrofon di dalam pil, tombol kirim berupa lingkaran dengan panah (redup saat kosong). Penghitung karakter hanya muncul mulai 600 dari 750 karakter. Semua ID elemen lama (`#teks`, `#kirim`, `#btnFoto`, `#btnMik`, `#hitung`, `#barisKirim`, `#rekam`, `#syarat`) dipertahankan, jadi logika foto, suara, kunci saling-ikuti, dan realtime tidak berubah.
- Teks placeholder kotak tulis sekarang selalu "Tulis pesan..." karena nama lawan bicara sudah ada di kepala halaman (kunci `chat.phNama` tidak lagi dipakai).
- **Gaya:** blok terakhir di `css/style.css` ("Pesan: desain ulang"), hanya memakai token tema sehingga ikut Kertas, Terang, Gelap, Kaca, dan Awan. Kunci kamus baru: `pesan.cari`, `pesan.cariKosong`, `chat.hariIni` (7 bahasa).

## Pesan: edit, hapus, salin (migrasi 033)
- **Database:** jalankan `sql/033_pesan_edit_hapus.sql` (setelah 004, 014b, 017; aman diulang) SEBELUM mengunggah kode JS terbaru. Isinya: kolom `messages.diedit_at` dan `dihapus_at`, dua fungsi `edit_pesan()` dan `hapus_pesan()`, dan aturan isi yang membolehkan teks kosong pada pesan terhapus. Klien tidak punya kebijakan UPDATE di tabel `messages`; jalan satu-satunya adalah dua fungsi itu.
- **Menu pesan:** ketuk gelembung (atau Enter saat terfokus) membuka lembar bawah. *Salin* untuk semua pesan teks, *Edit* dan *Hapus* hanya untuk pesan sendiri. Memilih teks atau memutar suara tidak membuka menu.
- **Edit:** hanya pesan teks sendiri, maksimal **24 jam** sejak dikirim, dan hanya selagi kedua akun masih saling mengikuti dan tidak saling memblokir (supaya aturan saling-ikuti tidak bisa dilewati dengan mengedit pesan lama). Teks baru melewati filter konten yang sama dengan mengirim. Kotak tulis berubah jadi mode edit (bilah "Mengedit pesan", tombol kirim jadi centang, Esc atau ✕ membatalkan); draf yang sedang diketik dipulihkan setelah selesai. Lawan bicara melihat label kecil *diedit*. Mengubah batas 24 jam: ubah `interval '24 hours'` di `edit_pesan()` dan `MASA_EDIT` di `js/chat.js`.
- **Hapus:** teks, foto, atau suara milik sendiri, kapan saja (tidak butuh saling-ikuti), dihapus untuk **semua orang**, tidak bisa dibatalkan. Isi dikosongkan di database dan berkas media dibuang dari storage. Di kedua layar gelembung berubah jadi "Pesan ini dihapus" lewat realtime, dan daftar Pesan menampilkan "Pesan dihapus" sebagai cuplikan.
- **Sinkron:** `chat.js` mendengarkan event UPDATE realtime, dan `susul()` memeriksa 50 pesan terbaru saat koneksi kembali, jadi edit/hapus yang terlewat ikut menyusul.
- **Draf:** teks yang belum terkirim disimpan per percakapan di perangkat (kunci `jk:draf:<id>`, ikut terhapus saat keluar akun) dan muncul lagi saat percakapan dibuka.
- **Tanpa migrasi 033:** chat tetap jalan; menu hanya menawarkan Salin.
- Kunci kamus baru (7 bahasa): `chat.dihapus`, `chat.diedit`, `chat.menuAria`, `chat.salin`, `chat.salinOk`, `chat.edit`, `chat.hapus`, `chat.mengedit`, `chat.batal`, `chat.simpan`, `chat.hapusJ`, `chat.hapusT`, `chat.gagalEdit`, `chat.gagalHapus`, `pesan.dihapus`.

## Tombol Kembali
`href="javascript:history.back()"` tidak jalan karena CSP situs melarang skrip sebaris (tombol Kembali di Detail Posting dan halaman Aturan, Tentang, Bantuan, Privasi, dan Ketentuan mati). Sekarang tombolnya `<a href="index.html" data-kembali>`; `js/keamanan.js` memasang satu pendengar klik yang memanggil `history.back()` bila halaman dibuka dari halaman Jurkon lain (bukan dari login, reset, atau selamat), dan selain itu tautan biasa ke beranda yang berjalan. Halaman baru yang butuh tombol Kembali cukup memakai atribut `data-kembali`.

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
- **Bagikan profil**: ikon bagikan di profil sendiri, atau di menu ⋯ pada profil orang lain. Memakai lembar bagikan bawaan perangkat, atau menyalin tautan bila tidak tersedia.
- **Tautan yang mengingat tujuan**: bila belum login, halaman diarahkan ke `login.html?lanjut=<halaman>` dan setelah masuk kembali ke halaman itu. Hanya nama berkas `.html` Jurkon sendiri yang diterima (`lanjutAman()` di `js/supabase.js`); alamat luar diabaikan.

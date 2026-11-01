# SEO dan pengindeksan Jurkon

Situs statis (GitHub Pages) + Supabase. Catatan yang ada di kode:

- Landing 11 bahasa (`landing.html`, `en/ ms/ jv/ su/ zh/ ja/ es/ fr/ hi/ ar/`). Empat yang terakhir (Spanyol, Prancis, Hindi, Arab; bahasa dengan penutur terbanyak di luar Inggris dan Mandarin) **hanya landing**: antarmuka aplikasi tetap 7 bahasa, jadi tombol Mulai/Masuk membawa pengunjung ke aplikasi berbahasa Inggris. `/ar/` memakai `dir="rtl"` (lapisan RTL di akhir `css/landing.css`). Menjadikan salah satunya bahasa aplikasi penuh: tambah entri di `I18N_BAHASA` dan satu kolom di tiap baris `js/bahasa.js` (587+60 kunci), lalu `pecah-bahasa` dan `cek-bahasa`. Terjemahan baru belum dibaca penutur asli.
- Semua landing dibuat dari `tools/landing-templat.html` + `tools/landing-teks.js` lewat `node tools/buat-landing.js`. Jangan edit hasilnya langsung.
- Tiap landing punya: canonical, hreflang timbal balik + x-default (`/en/`), Open Graph + Twitter, `robots` index/follow, dan JSON-LD (`WebSite`, `Organization`, `WebApplication`, `FAQPage`). Teks FAQ di JSON-LD sama persis dengan yang tampil di halaman.
- `jelajahi.html` (publik, boleh diindeks) dan `n.html?id=` (catatan publik). Worker Cloudflare (opsional, `worker/README.md`) memberi pratinjau OG per catatan dan `sitemap-catatan.xml`.
- `login.html` boleh diindeks (judul "Masuk atau daftar akun", deskripsi, JSON-LD `WebPage` + `BreadcrumbList`, H1 dan subjudul statis, tautan ke landing, Jelajahi, dan Pusat bantuan; ada di `sitemap.xml`). Tujuannya pencarian merek seperti "jurkon masuk"; halaman utama untuk peringkat tetap `landing.html`. Varian `login.html?lanjut=...` memakai canonical ke `login.html`.
- `daftar.html` (buat akun) halaman terpisah dari `login.html`, juga boleh diindeks dan ada di `sitemap.xml`. Keduanya memakai `js/auth.js` yang sama.
- `ketentuan-layanan.html` berisi versi Indonesia di HTML statis (yang dibaca mesin pencari); `js/ketentuan-bahasa.js` mengganti isinya ke en/ms/jv/su/zh/ja sesuai bahasa pengguna. Bila teks Indonesia berubah, ubah keenam terjemahan itu juga.
- Halaman di dalam aplikasi dan `explore.html` bernoindex.
- Crawler (Googlebot, Bingbot, dll.) selalu dilayani bahasa Indonesia oleh `js/bahasa-muat.js` (dihasilkan `tools/pecah-bahasa.js`), supaya hasil render sama dengan HTML statis dan meta description. Pengguna tetap mengikuti bahasa perangkatnya.

## Langkah yang hanya bisa kamu lakukan (butuh akun)

1. **Google Search Console**: tambah properti *Domain* `jurkon.my.id` (verifikasi lewat DNS TXT). Kirim `https://jurkon.my.id/sitemap.xml` (dan `sitemap-catatan.xml` bila Worker terpasang).
2. Di Search Console > Pemeriksaan URL: periksa dan "Minta pengindeksan" untuk `landing.html`, `/en/`, `jelajahi.html`.
3. **Bing Webmaster Tools**: impor dari Search Console (satu klik). Bing juga memberi makan DuckDuckGo dan Ecosia.
4. Cek **Rich Results Test** (search.google.com/test/rich-results) untuk `landing.html`: harus terbaca FAQ dan WebApplication tanpa galat.
5. Cek **PageSpeed Insights** (HP) dan catat skor awal. Target: LCP di bawah 2,5 detik.
6. Cari backlink alami: tautan dari profil sosialmu, README GitHub, komunitas yang relevan. Tautan dari situs lain berpengaruh lebih besar daripada tweak kode.

## Yang perlu dipahami

- Halaman baru butuh hari sampai minggu untuk muncul. Tidak ada kode yang bisa mempercepatnya; Minta Pengindeksan hanya membantu sedikit.
- `/` mengalihkan tamu ke landing lewat JavaScript (bukan SSR). Google biasanya mengikutinya; landing sendiri sudah statis penuh.
- FAQ hanya dihitung rich result bila isinya benar-benar tampil di halaman (sudah).
- Jangan menambah isi hanya demi kata kunci; tulis yang benar-benar menjawab pertanyaan pengunjung.

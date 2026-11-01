# SEO dan pengindeksan Jurkon

Situs statis (GitHub Pages) + Supabase. Catatan yang ada di kode:

- Landing 7 bahasa (`landing.html`, `en/ ms/ jv/ su/ zh/ ja/`), dibuat dari `tools/landing-templat.html` + `tools/landing-teks.js` lewat `node tools/buat-landing.js`. Jangan edit hasilnya langsung.
- Tiap landing punya: canonical, hreflang timbal balik + x-default (`/en/`), Open Graph + Twitter, `robots` index/follow, dan JSON-LD (`WebSite`, `Organization`, `WebApplication`, `FAQPage`). Teks FAQ di JSON-LD sama persis dengan yang tampil di halaman.
- `jelajahi.html` (publik, boleh diindeks) dan `n.html?id=` (catatan publik). Worker Cloudflare (opsional, `worker/README.md`) memberi pratinjau OG per catatan dan `sitemap-catatan.xml`.
- `login.html`, halaman di dalam aplikasi, dan `explore.html` bernoindex.

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

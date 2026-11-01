# Worker catatan publik (opsional, tahap 2)

Tanpa Worker, fitur catatan publik **tetap jalan**: halaman `n.html` bisa dibuka siapa pun dan Google yang menjalankan JavaScript bisa membaca judul dan isinya. Worker menambah dua hal:

1. **Pratinjau WhatsApp/X/Facebook** per catatan (crawler mereka tidak menjalankan JavaScript).
2. **404 + noindex yang benar** untuk catatan yang sudah privat/dihapus, dan **sitemap** `sitemap-catatan.xml` berisi catatan publik.

## Pasang (bisa dari HP, lewat dashboard Cloudflare)

1. Cloudflare > Workers & Pages > Create > Worker > beri nama `jurkon-catatan` > Deploy > **Edit code**, tempel isi `worker/catatan-publik.js`, Deploy.
2. Worker > Settings > Variables and Secrets > tambah (jenis Text):
   - `SUPABASE_URL` = alamat project Supabase (sama dengan di `js/supabase.js`)
   - `SUPABASE_ANON_KEY` = kunci publishable/anon (sama dengan di `js/supabase.js`). **Jangan** pakai `service_role`.
3. Worker > Settings > Domains & Routes > **Add > Route** (bukan Custom Domain, supaya tidak berputar ke dirinya sendiri). Zone `jurkon.my.id`, tiga route:
   - `jurkon.my.id/n`
   - `jurkon.my.id/n.html`
   - `jurkon.my.id/sitemap-catatan.xml`
4. Pastikan DNS `jurkon.my.id` berstatus **Proxied** (awan oranye). Bila tidak, route Worker tidak berjalan.
5. Uji: jadikan satu catatan publik, buka `https://jurkon.my.id/n?id=<id>` di jendela privat. Lihat sumber halaman (view-source): `<title>` berisi nama dan cuplikan catatan. Lalu buka `https://jurkon.my.id/sitemap-catatan.xml`.
6. Search Console (Domain jurkon.my.id) > Sitemaps > kirim `sitemap-catatan.xml`.
7. Pratinjau WhatsApp menyimpan cache lama; uji dengan menambah `&v=2` pada tautan.

## Perilaku yang perlu diketahui

- Jadikan privat berlaku **seketika** di Worker (tanpa cache): tautan langsung 404 + noindex. Hasil Google butuh hari sampai minggu untuk hilang. Untuk mempercepat: Search Console > Penghapusan (Removals).
- Gangguan Supabase: Worker membalas 503 (crawler mencoba lagi nanti), bukan 404, supaya catatan tidak keliru dijatuhkan dari indeks.
- Worker memanggil hanya `catatan_publik` dan `daftar_publik`. Keduanya sengaja mengembalikan data minimal.
- Cloudflare gratis: 100.000 permintaan Worker per hari. Cukup untuk tahap awal.

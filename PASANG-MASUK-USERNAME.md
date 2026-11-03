# Masuk dengan username (Jurkon)

Kolom masuk menerima **username atau email**. Tanpa "@" dianggap username.

## Pasang (urut)
1. Unggah kode ke repo (commit dan push).
2. Pasang fungsinya. Wajib `--no-verify-jwt` karena pemanggilnya belum masuk:
   `supabase functions deploy masuk-username --no-verify-jwt`
   (dari Codespaces tanpa login: tambahkan `--use-api --project-ref <ref>` dan isi `SUPABASE_ACCESS_TOKEN`; hapus token itu dari dashboard setelah selesai).
3. Bila menguji dari alamat selain `jurkon.my.id` (mis. pratinjau Codespaces), daftarkan asalnya:
   `supabase secrets set ALLOWED_ORIGINS="https://jurkon.my.id,https://www.jurkon.my.id,https://NAMA.app.github.dev"`
4. Tes: masuk dengan username dan dengan email (dua-duanya harus berhasil); sandi salah dengan username yang ada dan dengan username yang tidak ada (pesannya harus sama).

Tidak ada SQL baru. Daftar, lupa sandi, dan masuk lewat email tidak berubah.

## Catatan keamanan
- Email tidak pernah dikirim ke browser. Pencarian username -> email terjadi di server.
- Username tidak ada dan sandi salah mendapat pesan yang sama. Username yang tidak ada tetap melewati satu percobaan masuk palsu agar waktu jawabnya mirip.
- Hanya galat CAPTCHA, batas laju, dan "email belum dikonfirmasi" yang diteruskan apa adanya (Supabase hanya mengirim yang terakhir bila sandi sudah benar).
- IP untuk batas laju: `cf-connecting-ip`, cadangannya entri terakhir `x-forwarded-for`. Entri pertama tidak dipercaya.
- CORS dibatasi ke daftar asal di atas (bawaan: `jurkon.my.id` dan `www.jurkon.my.id`).
- "Lupa kata sandi" tetap meminta email (pesannya sudah begitu).

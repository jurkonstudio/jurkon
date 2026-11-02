# Masuk dengan username (Jurkon)

Kolom masuk sekarang menerima **username atau email**. Tanpa "@" dianggap username.

## Pasang (urut)
1. Unggah isi zip ini ke akar repo (timpa berkas yang sama), lalu commit dan push.
2. Di Codespaces, pasang fungsi barunya. Wajib `--no-verify-jwt` karena pemanggilnya belum masuk:
   `supabase functions deploy masuk-username --no-verify-jwt`
3. Tes: masuk dengan username, lalu dengan email (dua-duanya harus berhasil).

Tidak ada SQL baru. Daftar, lupa sandi, dan masuk lewat email tidak berubah.
Kamus bahasa sudah dipecah ulang dan versi cache (sw.js) sudah dinaikkan.

## Catatan keamanan
- Email tidak pernah dikirim ke browser. Pencarian username -> email terjadi di server.
- Username tidak ada dan sandi salah mendapat pesan yang sama.
- "Lupa kata sandi" tetap meminta email (pesannya sudah begitu).

# Cadangan otomatis, jaga aktif, dan uji otomatis (4 November 2026)

Tanpa SQL, tanpa Edge Function. Tiga berkas di `.github/workflows/`:

| Berkas | Fungsi | Jadwal |
|---|---|---|
| `cadangan.yml` | Dump database (skema `public`, data `public`, akun `auth.users` + `auth.identities`), dikemas, **dienkripsi AES-256**, diunggah sebagai artifact (simpan 30 hari) | Harian 02.17 WIB + manual |
| `jaga-aktif.yml` | Memanggil `jelajahi_publik` di Supabase dan membuka situs. Mencegah proyek gratis di-pause karena sepi; gagal = GitHub mengirim email | Harian 11.23 WIB + manual |
| `uji.yml` | `cek-bahasa`, `uji-markdown`, `uji-browser --cepat`, `uji-jurnal` | Tiap push ke `main`, pull request, manual (bisa "lengkap") |

## Pasang (sekali)

1. Salin folder `.github/workflows/` ke repo (tiga berkas baru; `naikkan-cache.yml` dan `sri.yml` tidak disentuh).
2. **Rahasia** (GitHub repo > Settings > Secrets and variables > Actions > *New repository secret*):
   - `SUPABASE_DB_URL`: Supabase > tombol **Connect** > **Session pooler** (port 5432, pengguna `postgres.<ref>`). Wajib pooler, bukan "Direct connection": sambungan langsung hanya IPv6 dan runner GitHub tidak punya IPv6. Ganti `[YOUR-PASSWORD]` dengan sandi database; bila mengandung karakter khusus (`@ : / ? # %`) ubah ke bentuk persen (mis. `@` jadi `%40`).
   - `CADANGAN_SANDI`: sandi acak minimal 16 karakter untuk mengenkripsi cadangan. **Simpan juga di pengelola kata sandi.** Bila hilang, cadangan tidak bisa dibuka siapa pun.
3. (Opsional) variabel `PG_VERSI` (tab Variables) bila dump gagal dengan "server version mismatch". Isi dengan versi Postgres proyekmu (Supabase > Project Settings > Infrastructure). Bawaan: 17.
4. **Jalankan sekali dengan tangan**: Actions > *Cadangan database* > Run workflow, lalu *Jaga aktif dan pantau*. Pastikan hijau. Jalankan cadangan pertama itu SEBELUM mengandalkannya.
5. Unduh artifact-nya dan **uji buka di perangkatmu** (hasil unduhan berupa zip berisi satu berkas `.gpg`):
   ```
   gpg --decrypt cadangan-2026-11-04-1900.tar.gz.gpg | tar -xz
   ```
   Harus muncul `skema-public.sql.gz`, `data-public.sql.gz`, `auth-data.sql.gz`.

## Kenapa terenkripsi

Cadangan berisi pesan pribadi dan hash kata sandi (`auth.users`). Di repo publik, artifact bisa diunduh siapa pun yang punya akses baca repo, jadi berkas tanpa enkripsi TIDAK boleh diunggah. Jangan pernah meng-commit cadangan ke repo.

## Memulihkan (ke proyek Supabase baru)

`skema-public.sql.gz` hanya referensi: pemicu pada tabel `auth` (mis. pembuat profil) dan izin lain ada di migrasi repo, bukan di dump `public`. Urutan yang disarankan:

1. Proyek Supabase baru: jalankan migrasi repo (`node tools/gabung-sql.js` menghasilkan `sql/schema-terbaru.sql`) di SQL Editor.
2. Muat akun lalu data, dengan pemicu dimatikan supaya trigger (notifikasi, pembatas harian, profil otomatis) tidak menggandakan atau mengubah data:
   ```
   ( echo "set session_replication_role = replica;"; zcat auth-data.sql.gz )   | psql "$URL_BARU"
   ( echo "set session_replication_role = replica;"; zcat data-public.sql.gz ) | psql "$URL_BARU"
   ```
3. Deploy ulang Edge Function dan rahasianya (`CRON_SECRET`, dst.), dan perbarui `SUPABASE_URL`/kunci di `js/supabase.js`.

**Belum teruji di datamu**: alur dump, enkripsi, dan buka-kembali sudah dicek dengan data contoh, tetapi dump ke Supabase-mu dan prosedur pemulihan di atas belum pernah dijalankan. Latih sekali ke proyek Supabase gratis kedua sebelum kamu benar-benar membutuhkannya.

## Yang TIDAK tercakup

- **Berkas di Storage** (foto profil di bucket `avatar`). Pesan media 10 menit memang sementara. Bila foto profil penting, tambahkan pencadangan bucket nanti.
- Edge Function dan rahasia Supabase (ada di repo / dashboard).

## Catatan

- Workflow terjadwal di repo publik dimatikan GitHub bila repo tidak ada aktivitas 60 hari. Selama kamu masih push, aman. Bila repo diam lama, nyalakan lagi di tab Actions.
- Jadwal GitHub bisa terlambat beberapa menit sampai puluhan menit saat ramai.
- Kegagalan workflow terjadwal dikirim lewat email ke akun yang terakhir mengubah jadwalnya (periksa Settings > Notifications > Actions).
- CI di `uji.yml` berjalan SESUDAH push (GitHub Pages sudah terbit), jadi ini peringatan dini, bukan penghalang. Untuk penghalang sungguhan, kerjakan lewat pull request.
- Batas uji sama seperti `tools/uji-browser.js`: Supabase ditiru; RLS, SQL, dan Edge Function tidak teruji.
- Privasi: tambahkan di kebijakan privasi bahwa cadangan terenkripsi disimpan di GitHub, bila belum tercantum.

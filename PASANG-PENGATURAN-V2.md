# Pengaturan v2: kategori + perangkat login (lokasi, device, provider)

## Yang berubah
- **Panel Pengaturan** (`profil.html`, `js/pengaturan.js`, `js/akun.js`, `css/style.css` bagian paling bawah): menu utama berisi 4 kategori, tiap kategori membuka halamannya sendiri dengan tombol panah kembali.
  - **Tampilan & bahasa**: tema, bahasa
  - **Keamanan**: email, **ganti kata sandi (baru)**, **perangkat & aktivitas login (baru)**
  - **Data & privasi**: unduh data, catatan data sesi, hapus akun (zona berbahaya)
  - **Informasi**: kebijakan, ketentuan, aturan, bantuan, tentang
  - Tautan **Panel admin** muncul di menu utama, hanya untuk admin. Tombol Keluar dan versi tetap di menu utama.
- **Perangkat & aktivitas login** (`js/sesi.js`, `sql/041_sesi_login.sql`, `supabase/functions/catat-sesi/`): tiap pengguna melihat daftar sesinya sendiri: nama peramban + sistem, perkiraan lokasi (kota, wilayah, negara), provider, IP yang disamarkan, kapan masuk, terakhir aktif, penanda "Perangkat ini". Bisa mengeluarkan satu perangkat atau semua perangkat lain.
- `js/auth.js`, `login.html`, `daftar.html`, `js/ui.js`: sesi dicatat saat login dan paling sering sekali per jam.
- `kebijakan-privasi.html` (versi Indonesia): paragraf riwayat sesi + pihak ketiga geolokasi IP.
- 38 kunci bahasa baru (`set.kat*`, `kt.*`, `ss.*`, `dp.sesi`) di 9 bahasa; `sw.js` memuat dua berkas JS baru.

## Cara pasang di Codespace (urutan penting)
```bash
# 1. Di Codespace, terminal di folder repo (jurkon)
git pull --rebase

# 2. Taruh zip di folder repo (tarik-lepas berkas ke panel Explorer), lalu:
unzip -o jurkon-pengaturan-v2.zip

# 3. Cek dan naikkan versi cache
node tools/cek-bahasa.js        # lihat catatan di bawah soal 49 masalah lama
node tools/naikkan-cache.js
```

### 4. Jalankan SQL DULU (sebelum push kode)
Supabase > SQL Editor > New query > tempel isi `sql/041_sesi_login.sql` > Run. Lalu jalankan dua kueri cek di akhir berkas itu (hasil yang benar: 3 baris, lalu 0 baris).

### 5. Pasang Edge Function
Pilih salah satu:
- **Dashboard**: Supabase > Edge Functions > Deploy a new function > nama `catat-sesi` > tempel isi `supabase/functions/catat-sesi/index.ts` > Deploy. Biarkan "Verify JWT" **aktif**.
- **CLI di Codespace**: `npx supabase login` lalu `npx supabase functions deploy catat-sesi --project-ref twdrpydydxlhfmllfoan`

Tidak perlu secret tambahan (SUPABASE_URL dan SERVICE_ROLE_KEY sudah disediakan Supabase). Opsional: `GEO_URL` bila ingin mengganti layanan geolokasi (pakai `{ip}` sebagai penanda alamat).

### 6. Push
```bash
git add -A
git commit -m "Pengaturan per kategori + perangkat login (lokasi, device, provider)"
git push
```

## Uji setelah tayang
1. Buka Profil > gear > **Keamanan**: perangkat ini muncul dengan penanda "Perangkat ini" (butuh beberapa detik pertama kali).
2. Login dari HP/browser lain, buka Keamanan di perangkat pertama: perangkat kedua muncul dengan lokasi dan provider.
3. Tekan **Keluarkan** pada perangkat kedua: perangkat itu hilang dari daftar dan, saat memuat ulang, kembali ke halaman masuk.
4. Ganti kata sandi dengan sandi lemah (harus ditolak) dan dengan sandi sama dengan yang lama (pesan "harus berbeda").
5. Kebijakan privasi: baca paragraf baru.

## Hal yang perlu kamu ketahui (jujur)
- **Belum diuji dengan Supabase sungguhan.** Diuji di Chromium dengan Supabase tiruan: navigasi kategori, daftar perangkat, keluarkan satu/semua, ganti sandi, Esc, 5 bahasa/tema, lebar 320-1280 px. SQL dan Edge Function belum dijalankan (tidak ada Postgres/Deno di sandbox): `node --check` untuk JS saja.
- **Akurasi lokasi/provider**: dari alamat IP lewat layanan gratis ipwho.is. Akurat di tingkat kota/negara, bisa meleset pada data seluler (IP milik operator, kota bisa kota lain) dan VPN (menampilkan lokasi VPN). Bila trafik besar, layanan gratis punya batas; ganti lewat `GEO_URL`.
- **Keluarkan perangkat** menghapus sesi di Supabase, jadi perangkat itu tidak bisa memperbarui token. Access token yang sudah terbit tetap berlaku sampai habis masa (bawaan Supabase 1 jam, atur di Authentication > Sessions). Untuk akun yang diretas, tetap sarankan ganti kata sandi.
- **Privasi**: IP disimpan disamarkan (203.0.113.x). Kebijakan privasi versi Indonesia sudah diperbarui; **versi bahasa lain (`js/info/*.js` dan halaman statis `en/ ms/ jv/ su/ zh/ ja/ ko/ hi/`) belum**. Perbarui lalu `node tools/buat-info.js` bila ingin seragam.
- Sesi yang sudah ada sebelum pembaruan baru muncul di daftar setelah pemiliknya membuka aplikasi lagi (dicatat saat buka halaman, sekali per jam).
- Ganti kata sandi memakai `updateUser({ password })`. Bila Supabase diatur "Secure password change" (butuh login ulang baru), pengguna melihat pesan "masuk ulang dulu".
- Temuan di zip asli, tidak saya ubah: `node tools/cek-bahasa.js` melaporkan 49 masalah karena kunci `bk.*` (Brankas) dan `pn.*` (Penerjemah) dipakai di kode tetapi **tidak ada di `js/bahasa.js`**, jadi teks Brankas/Penerjemah tampil sebagai nama kunci. Setelah perubahan ini jumlahnya tetap 49 (tidak bertambah).

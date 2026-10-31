# Migrasi SQL Jurkon

Semua berkas dijalankan di Supabase: **SQL Editor > New query > tempel isi berkas > Run**.
Aturan emas: **jalankan SQL dulu, baru unggah kode JS terbaru** ke GitHub.
Semua migrasi aman diulang, kecuali disebut lain di kolom catatan.

## Urutan (project baru)

| Berkas | Isi singkat | Catatan |
|---|---|---|
| `schema.sql` | tabel dasar dan RLS | pertama |
| `002_privasi_keamanan.sql` | blokir, batas spam dasar, admin, hapus akun, ekspor data | wajib |
| `003_feed_cepat.sql` | daftar posting dan profil dalam satu panggilan | |
| `004_filter_konten.sql` | filter kata terlarang di database | dibuat otomatis oleh `tools/buat-filter-sql.js` |
| `005_notifikasi.sql` | notifikasi suka, balasan, ikuti, pesan | setelah 002 |
| `006_feed_dua_bagian.sql` | tab Publik dan Mengikuti | |
| `007_anti_spam.sql` | batas laju, deteksi duplikat dan tautan | |
| `008_foto_profil_limit.sql` | foto profil dan batas ubah bulanan | |
| `009_akun_resmi.sql` | lencana akun resmi | |
| `010_profil_balasan_suka_views.sql` | tab balasan dan menyukai, jumlah dilihat | |
| `011_jelajah_ramai.sql` | posting ramai di Jelajah | setelah 010 |
| `012_jelajah_sorotan.sql` | Jelajah hanya Sorotan | |
| `013_perangkat_dislike_kutip.sql` | perangkat, dislike, kutip, posting ulang | setelah 002-012 |
| `014a_notifikasi_kutip_ulang.sql` | notifikasi kutip dan posting ulang (tahap awal) | setelah 005 dan 013 |
| `014b_pesan_saling_ikuti_notif_mengikuti.sql` | pesan hanya antar akun saling mengikuti, notifikasi tab Mengikuti | setelah 002 dan 005 |
| `015_notif_kutip_ulang_mention.sql` | notifikasi kutip, posting ulang, mention `@username` | setelah 013, 014a, 014b |
| `016_performa.sql` | indeks performa | hanya menambah indeks |
| `017_media_pesan.sql` | foto dan suara di chat (hilang 10 menit) | setelah 014b |
| `018_hapus_notif_suka.sql` | notifikasi suka ikut hilang saat suka dibatalkan | setelah 005 dan 013 |
| `019_anti_bot_keamanan.sql` | pengerasan keamanan dan anti-bot | hasil akhir harus 0 baris |
| `020_panel_admin.sql` | panel admin dan pengaturan landing | hasil akhir harus 1 baris: `landing_publik()` |
| `021_mfa_admin.sql` | `is_admin()` mewajibkan sesi 2 langkah (aal2) bila admin sudah punya TOTP | setelah 020; hasil akhir: daftar admin dan status 2 langkah |
| `022_pastikan_rls_anggota.sql` | menghapus kebijakan baca terbuka (`using (true)`) dan memastikan hanya anggota login yang bisa membaca | setelah 021; hasil akhir: 0 baris (lihat kueri cek di berkas) |
| `023_catatan_berumur.sql` | catatan berumur (hilang otomatis), kolom `kedaluwarsa` di feed | setelah 021 |
| `024_kapsul_waktu.sql` | kapsul waktu: kolom `terbuka_pada`, kebijakan baca, `kapsul_saya()`, `batalkan_kapsul()`, kolom `kapsul_ditulis` di feed | setelah 023 |
| `025_kunci_kolom_insert.sql` | trigger yang memaksa `created_at` = sekarang (dan `disorot` = false, `dilihat` = 0 di posts) saat klien insert; menutup pemalsuan jumlah tayang, sorotan, dan pembatas laju | setelah 024; hasil cek: 7 baris |
| `026_sematkan_catatan.sql` | kolom `profiles.disematkan` + trigger yang memastikan hanya catatan utama milik sendiri (sudah tayang, tidak berumur) yang bisa disematkan | setelah 024 (disarankan setelah 025); hasil cek: 1 baris, 1 baris |
| `027_catatan_publik.sql` | catatan publik per catatan: kolom `publik`, `jadikan_publik()`/`jadikan_privat()`, `catatan_publik()` dan `daftar_publik()` (boleh anon), kunci pengelola | setelah 026; hasil cek: tepat 3 fungsi yang boleh dipanggil anon |
| `028_lencana_verified.sql` | lencana verified: kolom `profiles.verified`, trigger penjaga, `admin_set_verified()`, `daftar_verified()`, kolom `lencana` di `admin_cari_pengguna` | setelah 020 dan 021; hasil cek: 2 baris, 1 baris, 0 baris |

Catatan nama: `014a` dan `014b` dulu bernama `014_notifikasi_kutip_ulang.sql` dan `014_pesan_saling_ikuti_notif_mengikuti.sql`. Isinya tidak berubah, hanya diberi huruf supaya urutannya jelas.

## Database yang sudah berjalan

Tidak perlu menjalankan ulang migrasi yang sudah pernah dijalankan. Jalankan hanya migrasi baru yang belum pernah dijalankan, sesuai urutan di atas.

## Berkas gabungan (opsional, untuk project baru)

`node tools/gabung-sql.js` membuat `sql/schema-terbaru.sql` (schema + semua migrasi berurutan). Berkas ini tidak ikut di-commit (ada di `.gitignore`). Isinya hanya gabungan mentah berkas di atas dan belum diuji pada database kosong, jadi untuk project penting lebih aman jalankan satu per satu. Bila terlalu besar untuk editor di HP, pakai cara satu per satu.

## Arsip

`arsip/jalankan-pembaruan-terbaru.sql` adalah bundel lama (007, 013, 014a) dan sudah digantikan berkas di atas. Disimpan hanya sebagai rujukan, tidak perlu dijalankan.

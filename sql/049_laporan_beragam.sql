-- 049: laporan yang menyesuaikan apa yang dilaporkan (akun atau catatan).
-- Jalankan SETELAH 031 (laporan akun). Aman dijalankan ulang.
--
-- Hanya memperluas daftar kategori yang diterima kolom reports.kategori.
--   Akun   : spam, penipuan, pelecehan, palsu, kekerasan, tak_pantas, lainnya
--   Catatan: spam, penipuan, pelecehan, hoaks, dewasa, kekerasan, privasi, bahaya_diri, lainnya
-- Aplikasi (js/laporan.js) tetap berjalan bila migrasi ini belum dijalankan: kategori baru
-- dikirim sebagai "lainnya" dengan awalan [kategori] di kolom alasan.

alter table reports drop constraint if exists laporan_kategori;
alter table reports add constraint laporan_kategori
  check (kategori is null or kategori in (
    'spam','pelecehan','palsu','tak_pantas','lainnya',
    'penipuan','hoaks','dewasa','kekerasan','privasi','bahaya_diri'
  ));

-- ---------------------------------------------------------------------
-- Cek hasil (jalankan terpisah):
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'reports'::regclass and conname = 'laporan_kategori';   -- memuat 'hoaks'
-- ---------------------------------------------------------------------

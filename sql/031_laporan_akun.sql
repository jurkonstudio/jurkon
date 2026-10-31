-- 031: laporan akun (laporkan profil orang lain), selain laporan catatan.
-- Jalankan SETELAH 020 (panel admin). Aman dijalankan ulang.
--
-- reports.post_id tetap dipakai untuk laporan catatan. Laporan akun mengisi target_user_id
-- (dan post_id dibiarkan kosong). kategori berisi pilihan dari panel laporan di profil.

alter table reports add column if not exists target_user_id uuid references profiles(id) on delete cascade;
alter table reports add column if not exists kategori text;

-- Laporan harus menunjuk catatan ATAU akun; tidak boleh melaporkan diri sendiri
alter table reports drop constraint if exists laporan_sasaran;
alter table reports add constraint laporan_sasaran
  check (post_id is not null or target_user_id is not null);
alter table reports drop constraint if exists laporan_bukan_diri;
alter table reports add constraint laporan_bukan_diri
  check (target_user_id is null or target_user_id <> reporter_id);

alter table reports drop constraint if exists laporan_kategori;
alter table reports add constraint laporan_kategori
  check (kategori is null or kategori in ('spam','pelecehan','palsu','tak_pantas','lainnya'));

-- Satu orang hanya bisa melaporkan akun yang sama sekali (seperti laporan_unik untuk catatan)
create unique index if not exists laporan_akun_unik
  on reports (reporter_id, target_user_id) where post_id is null and target_user_id is not null;
create index if not exists reports_target_user on reports (target_user_id) where target_user_id is not null;

-- Kebijakan insert yang sudah ada ("lapor sendiri": auth.uid() = reporter_id) tetap berlaku.
-- Pembatas 10 laporan/hari (batasi_laporan) dan gerbang akun (019) ikut berlaku otomatis.

-- ---------------------------------------------------------------------
-- Cek hasil (jalankan terpisah):
--   select column_name from information_schema.columns
--    where table_name = 'reports' and column_name in ('target_user_id','kategori');   -- 2 baris
--   select conname from pg_constraint
--    where conrelid = 'reports'::regclass
--      and conname in ('laporan_sasaran','laporan_bukan_diri','laporan_kategori');    -- 3 baris
-- ---------------------------------------------------------------------

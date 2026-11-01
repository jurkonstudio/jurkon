-- JURKON 039: Jurnal: DRAF (simpan dulu, lanjutkan nanti) dan batas isi naik dari 2000 menjadi 4000 karakter.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: migrasi 034_jurnal sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.
--
-- Aturan baru (ditegakkan di database):
--  * Isi 1 sampai 4000 karakter.
--  * Kolom draf (bawaan false). Draf SELALU pribadi: draf = true tidak boleh bersama publik = true.
--  * Draf ikut dihitung dalam batas 50 catatan per akun dan tidak pernah terbaca orang lain.
--  * Saat draf diterbitkan sebagai catatan publik, isinya tetap lewat cek_konten() (trigger 034 sudah mengurusnya,
--    karena catatan yang baru dijadikan publik selalu disaring).

alter table jurnal add column if not exists draf boolean not null default false;

alter table jurnal drop constraint if exists jurnal_isi_check;
alter table jurnal add constraint jurnal_isi_check check (char_length(isi) <= 4000 and btrim(isi) <> '');

alter table jurnal drop constraint if exists jurnal_draf_check;
alter table jurnal add constraint jurnal_draf_check check (not (draf and publik));

-- Lapisan kedua: kebijakan baca tidak pernah membuka draf untuk orang lain
drop policy if exists "jurnal dibaca" on jurnal;
create policy "jurnal dibaca" on jurnal for select
  using (auth.uid() is not null
         and (user_id = auth.uid() or (publik and not draf and not ada_blokir(auth.uid(), user_id))));

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan satu per satu)
-- 1) Harus 1 baris:
--      select column_name from information_schema.columns where table_name = 'jurnal' and column_name = 'draf';
-- 2) Harus 2 baris, yang pertama memuat 4000:
--      select conname, pg_get_constraintdef(oid) from pg_constraint
--       where conrelid = 'public.jurnal'::regclass and conname in ('jurnal_isi_check', 'jurnal_draf_check');
-- 3) Harus tetap 5 baris:
--      select policyname from pg_policies where tablename = 'jurnal';
--
-- MEMBATALKAN (hanya aman bila belum ada catatan di atas 2000 karakter dan semua draf sudah dihapus/diterbitkan):
--   alter table jurnal drop constraint jurnal_draf_check;
--   alter table jurnal drop constraint jurnal_isi_check;
--   alter table jurnal add constraint jurnal_isi_check check (char_length(isi) <= 2000 and btrim(isi) <> '');
--   alter table jurnal drop column draf;
--   lalu jalankan ulang kebijakan "jurnal dibaca" dari 034_jurnal.sql.

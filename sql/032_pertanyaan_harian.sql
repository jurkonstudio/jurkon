-- =====================================================================
-- JURKON 032: pertanyaan harian.
-- Satu pertanyaan sama untuk semua orang tiap hari (hari menurut WIB). Teks pertanyaan ada di klien
-- (js/pertanyaan.js); database hanya menandai catatan mana yang menjawab pertanyaan hari apa.
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 013 (kolom jenis), 023 (kedaluwarsa), 024 (terbuka_pada).
--
-- Aturan:
--  * Jawaban = catatan utama biasa (bukan balasan, kutipan, posting ulang, kapsul, atau catatan berumur)
--    dengan posts.pertanyaan_tgl berisi tanggal pertanyaannya.
--  * Tanggal harus hari ini atau kemarin menurut WIB (waktu server), jadi tidak bisa memalsukan hari lain.
--  * Satu jawaban per akun per hari (indeks unik).
--  * Penanda tidak bisa diubah sesudah dikirim.
--  * Dibaca lewat kebijakan baca yang sudah ada (blokir, kapsul, dll. tetap berlaku). Tanpa fungsi baru.
-- =====================================================================
alter table posts add column if not exists pertanyaan_tgl date;

create unique index if not exists posts_jawaban_harian_uq on posts (user_id, pertanyaan_tgl) where pertanyaan_tgl is not null;
create index if not exists posts_pertanyaan_idx on posts (pertanyaan_tgl, created_at desc) where pertanyaan_tgl is not null;

create or replace function jaga_pertanyaan() returns trigger
language plpgsql set search_path = public as $$
declare hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if tg_op = 'INSERT' then
    if new.pertanyaan_tgl is not null then
      if new.parent_id is not null or coalesce(new.jenis, 'biasa') <> 'biasa'
         or new.terbuka_pada is not null or new.kedaluwarsa is not null then
        raise exception 'Jawaban pertanyaan harian hanya untuk catatan utama biasa.';
      end if;
      if new.pertanyaan_tgl > hari or new.pertanyaan_tgl < hari - 1 then
        raise exception 'Pertanyaan itu sudah lewat.';
      end if;
    end if;
  elsif new.pertanyaan_tgl is distinct from old.pertanyaan_tgl and auth.uid() is not null then
    raise exception 'Penanda pertanyaan tidak bisa diubah.';
  end if;
  return new;
end $$;

drop trigger if exists jaga_pertanyaan_trg on posts;
create trigger jaga_pertanyaan_trg before insert or update of pertanyaan_tgl on posts
  for each row execute function jaga_pertanyaan();

-- PEMERIKSAAN (jalankan satu per satu)
-- 1) Harus 1 baris (kolom ada, tipe date):
--      select column_name, data_type from information_schema.columns
--      where table_name = 'posts' and column_name = 'pertanyaan_tgl';
-- 2) Harus 2 baris (indeks):
--      select indexname from pg_indexes where indexname in ('posts_jawaban_harian_uq', 'posts_pertanyaan_idx');
-- 3) Harus 1 baris (trigger):
--      select tgname from pg_trigger where tgname = 'jaga_pertanyaan_trg' and not tgisinternal;
--
-- Pembatalan:
--   drop trigger if exists jaga_pertanyaan_trg on posts;
--   drop function if exists jaga_pertanyaan();
--   drop index if exists posts_jawaban_harian_uq; drop index if exists posts_pertanyaan_idx;
--   alter table posts drop column if exists pertanyaan_tgl;
-- =====================================================================

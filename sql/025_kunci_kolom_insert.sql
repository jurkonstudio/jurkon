-- 025: Kunci kolom saat INSERT dari klien (dibuat ulang; berkas aslinya hilang dari repo).
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 007 (created_at di likes/follows), 010 (dilihat), 012 (disorot), 013 (dislikes). Setelah 024.
--
-- Celah yang ditutup: kebijakan insert hanya mengecek auth.uid() = user_id, jadi anggota login yang
-- memanggil API langsung bisa mengisi sendiri created_at (masa depan = menempel di puncak feed,
-- masa lalu = lolos pembatas laju), disorot = true, atau dilihat = angka besar.
--
-- Aturan (hanya bila auth.uid() tidak null, yaitu permintaan dari anggota login):
--   * created_at dipaksa now()                                  (posts, messages, reports, likes, follows, dislikes)
--   * posts.disorot dipaksa false, posts.dilihat dipaksa 0
--   * Insert dari SQL Editor dan service_role (auth.uid() null) tidak berubah.
--   * Perubahan sorotan oleh admin lewat UPDATE tidak tersentuh (trigger ini hanya BEFORE INSERT).
--
-- Rancangan aman galat:
--   * Fungsi posts terpisah dari fungsi tabel lain, karena hanya posts yang punya disorot/dilihat.
--   * Trigger hanya dipasang pada tabel dan kolom yang benar-benar ada (tabel blocks tidak punya
--     created_at, jadi dilewati; memasangnya akan membuat setiap insert gagal).
--   * Nama "a0_" membuat trigger ini jalan paling awal, sebelum pembatas laju membaca created_at.
--   * Baris lama tidak diubah.

-- ============ A. Fungsi untuk posts ============
create or replace function a0_kunci_kolom_posts() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    new.created_at := now();
    new.disorot := false;
    new.dilihat := 0;
  end if;
  return new;
end $$;

-- ============ B. Fungsi untuk tabel lain yang punya created_at ============
create or replace function a0_kunci_kolom() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    new.created_at := now();
  end if;
  return new;
end $$;

-- ============ C. Pasang trigger ============
drop trigger if exists a0_kunci_kolom_trg on posts;
create trigger a0_kunci_kolom_trg before insert on posts
  for each row execute function a0_kunci_kolom_posts();

do $$
declare t text;
begin
  foreach t in array array['messages','reports','likes','follows','dislikes'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'created_at') then
      execute format('drop trigger if exists a0_kunci_kolom_trg on public.%I', t);
      execute format('create trigger a0_kunci_kolom_trg before insert on public.%I
                      for each row execute function a0_kunci_kolom()', t);
    end if;
  end loop;
end $$;

-- ============ D. Pemeriksaan (jalankan sebagai query terpisah setelah migrasi) ============
-- 1) Trigger terpasang. Hasil: 6 baris (posts, messages, reports, likes, follows, dislikes).
--    select c.relname from pg_trigger g join pg_class c on c.oid = g.tgrelid
--    where g.tgname = 'a0_kunci_kolom_trg' and not g.tgisinternal order by 1;
--
-- 2) Tidak ada insert yang rusak: coba satu aksi biasa di aplikasi (suka, ikuti, kirim catatan).
--
-- 3) Baris lama yang sudah terlanjur dimanipulasi (periksa dulu, migrasi tidak mengubahnya):
--    select id, user_id, created_at, disorot, dilihat from posts
--    where disorot or created_at > now() order by created_at desc;
--    (disorot dari panel admin itu wajar; yang mencurigakan: created_at masa depan atau dilihat tidak masuk akal)
--
-- Membatalkan:
--    drop trigger if exists a0_kunci_kolom_trg on posts;
--    drop trigger if exists a0_kunci_kolom_trg on messages;
--    drop trigger if exists a0_kunci_kolom_trg on reports;
--    drop trigger if exists a0_kunci_kolom_trg on likes;
--    drop trigger if exists a0_kunci_kolom_trg on follows;
--    drop trigger if exists a0_kunci_kolom_trg on dislikes;
--    drop function if exists a0_kunci_kolom_posts(); drop function if exists a0_kunci_kolom();

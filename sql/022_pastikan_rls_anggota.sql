-- 022: Pastikan tidak ada kebijakan baca "using (true)" di produksi.
-- Idempoten, aman dijalankan ulang. Perilaku sama dengan 002 (hanya anggota login).

drop policy if exists "profil dibaca semua" on profiles;
drop policy if exists "posting dibaca semua" on posts;
drop policy if exists "like dibaca semua" on likes;
drop policy if exists "follow dibaca semua" on follows;

drop policy if exists "profil dibaca anggota" on profiles;
create policy "profil dibaca anggota" on profiles for select
  using (auth.uid() is not null);

drop policy if exists "posting dibaca anggota" on posts;
create policy "posting dibaca anggota" on posts for select
  using (auth.uid() is not null and not ada_blokir(auth.uid(), user_id));

drop policy if exists "like dibaca anggota" on likes;
create policy "like dibaca anggota" on likes for select
  using (auth.uid() is not null);

drop policy if exists "follow dibaca anggota" on follows;
create policy "follow dibaca anggota" on follows for select
  using (auth.uid() is not null);

-- Cek hasil: harus 0 baris.
-- select schemaname, tablename, policyname from pg_policies
--  where schemaname = 'public' and cmd = 'SELECT' and qual = 'true';

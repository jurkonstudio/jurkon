-- JURKON 040: BRANKAS. Berkas pribadi (maks 10 MB, tanpa arsip/berkas program) yang dienkripsi DI PERANGKAT dengan sandi brankas.
-- Server hanya menyimpan berkas terenkripsi dan kunci yang terbungkus; sandi tidak pernah dikirim dan TIDAK bisa dipulihkan.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: schema.sql. Jalankan SEBELUM mengunggah kode JS terbaru (js/brankas.js).

-- =====================================================================
-- A. Kunci brankas (satu baris per akun): kunci berkas acak yang dibungkus kunci turunan sandi (PBKDF2 + AES-GCM)
-- =====================================================================
create table if not exists brankas_kunci (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  salt      text not null check (char_length(salt)  between 16 and 64),
  iv        text not null check (char_length(iv)    between 12 and 64),
  kunci     text not null check (char_length(kunci) between 40 and 200),
  iterasi   int  not null default 310000 check (iterasi between 100000 and 2000000),
  dibuat_at timestamptz not null default now(),
  diubah_at timestamptz not null default now()
);
alter table brankas_kunci enable row level security;

drop policy if exists "brankas kunci baca"  on brankas_kunci;
drop policy if exists "brankas kunci buat"  on brankas_kunci;
drop policy if exists "brankas kunci ubah"  on brankas_kunci;
drop policy if exists "brankas kunci hapus" on brankas_kunci;
create policy "brankas kunci baca"  on brankas_kunci for select to authenticated using (user_id = auth.uid());
create policy "brankas kunci buat"  on brankas_kunci for insert to authenticated with check (user_id = auth.uid());
create policy "brankas kunci ubah"  on brankas_kunci for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "brankas kunci hapus" on brankas_kunci for delete to authenticated using (user_id = auth.uid());

-- =====================================================================
-- B. Daftar berkas (nama, jenis, ukuran asli). Isi berkas ada di storage dan terenkripsi.
-- =====================================================================
create table if not exists brankas_berkas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  nama      text not null check (char_length(nama) between 1 and 150),
  mime      text not null default 'application/octet-stream' check (char_length(mime) <= 100),
  ukuran    bigint not null check (ukuran > 0 and ukuran <= 10485760),
  path      text not null unique check (path like user_id::text || '/%'),
  dibuat_at timestamptz not null default now()
);
create index if not exists brankas_berkas_pemilik on brankas_berkas (user_id, dibuat_at desc);
alter table brankas_berkas enable row level security;

drop policy if exists "brankas berkas baca"  on brankas_berkas;
drop policy if exists "brankas berkas buat"  on brankas_berkas;
drop policy if exists "brankas berkas hapus" on brankas_berkas;
create policy "brankas berkas baca"  on brankas_berkas for select to authenticated using (user_id = auth.uid());
create policy "brankas berkas buat"  on brankas_berkas for insert to authenticated with check (user_id = auth.uid());
create policy "brankas berkas hapus" on brankas_berkas for delete to authenticated using (user_id = auth.uid());

-- Penjaga: maks 25 berkas per akun, arsip dan berkas program ditolak, waktu dibuat dipaksa sekarang
create or replace function brankas_berkas_jaga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.nama) ~ '\.(zip|zipx|rar|7z|tar|gz|tgz|bz2|xz|zst|lz|lzma|cab|iso|dmg|jar|apk|aab|ipa|exe|msi|bat|cmd|com|scr|dll|sh|ps1|vbs|app|deb|rpm)$' then
    raise exception 'jenis berkas tidak diterima' using errcode = '23514';
  end if;
  if (select count(*) from brankas_berkas where user_id = new.user_id) >= 25 then
    raise exception 'brankas penuh (maks 25 berkas)' using errcode = '23514';
  end if;
  new.dibuat_at := now();
  return new;
end $$;
revoke execute on function brankas_berkas_jaga() from public, anon, authenticated;

drop trigger if exists brankas_berkas_jaga on brankas_berkas;
create trigger brankas_berkas_jaga before insert on brankas_berkas
  for each row execute function brankas_berkas_jaga();

-- =====================================================================
-- C. Bucket storage PRIVAT. Isi = 12 byte IV + data terenkripsi (+16 byte tag), jadi sedikit di atas 10 MB.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brankas', 'brankas', false, 10485760 + 4096, array['application/octet-stream'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Hanya folder sendiri: <id akun>/<uuid>
drop policy if exists "brankas unggah" on storage.objects;
create policy "brankas unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brankas'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select count(*) from storage.objects o
          where o.bucket_id = 'brankas' and (storage.foldername(o.name))[1] = auth.uid()::text) < 30);

drop policy if exists "brankas baca" on storage.objects;
create policy "brankas baca" on storage.objects for select to authenticated
  using (bucket_id = 'brankas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "brankas hapus" on storage.objects;
create policy "brankas hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'brankas' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Cek hasil (jalankan terpisah):
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public' and tablename in ('brankas_kunci', 'brankas_berkas');      -- 2 baris, rowsecurity = true
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like 'brankas%';  -- 3 baris
--   select id, public, file_size_limit from storage.buckets where id = 'brankas';            -- 1 baris, public = false
-- =====================================================================

-- JURKON 008: foto profil + batas ubah profil per bulan.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Jalankan SEBELUM mengunggah kode JS terbaru ke GitHub.
--
-- Isi:
--  A. Kolom foto_url di profiles (menyimpan path file, bukan URL penuh)
--  B. Bucket penyimpanan "avatar" (publik dibaca, hanya pemilik yang boleh unggah/hapus di foldernya)
--  C. Batas ganti per bulan kalender (zona WIB, reset tiap tanggal 1): foto, nama, username
--  D. daftar_posting & profil_info ikut mengembalikan foto
--
-- Ubah angka batas di fungsi batas_profil() di bawah (bawaan: foto 3x, nama 2x, username 2x per bulan).
-- Aturan username sekali sehari (migrasi 007) tetap berlaku di samping batas bulanan ini.

-- A. Kolom foto -------------------------------------------------------
alter table profiles add column if not exists foto_url text;

-- B. Penyimpanan foto -------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar', 'avatar', true, 524288, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar dibaca" on storage.objects;
create policy "avatar dibaca" on storage.objects for select
  using (bucket_id = 'avatar');

-- Hanya boleh unggah ke folder bernama id sendiri; maksimal 6 file tersimpan per akun (sisa lama dibersihkan klien)
drop policy if exists "avatar unggah sendiri" on storage.objects;
create policy "avatar unggah sendiri" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatar'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select count(*) from storage.objects o
          where o.bucket_id = 'avatar' and (storage.foldername(o.name))[1] = auth.uid()::text) < 6
  );

drop policy if exists "avatar hapus sendiri" on storage.objects;
create policy "avatar hapus sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

-- C. Batas ubah per bulan ----------------------------------------------
create table if not exists profil_perubahan (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  jenis text not null check (jenis in ('foto','nama','username')),
  created_at timestamptz not null default now()
);
create index if not exists profil_perubahan_user on profil_perubahan (user_id, jenis, created_at desc);
alter table profil_perubahan enable row level security;   -- tanpa kebijakan: klien tidak bisa membaca/menulis langsung

create or replace function batas_profil(p_jenis text) returns int
language sql immutable as $$
  select case p_jenis when 'foto' then 3 when 'nama' then 2 when 'username' then 2 else 0 end
$$;

create or replace function awal_bulan() returns timestamptz
language sql stable as $$
  select date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
$$;

create or replace function batasi_profil_bulanan() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  j text; pakai int; maks int;
begin
  -- Pembaruan lewat SQL Editor / service role (tanpa sesi pengguna) tidak dibatasi
  if auth.uid() is null or auth.uid() <> old.id then return new; end if;

  -- Penanda "siap" tidak boleh dikembalikan ke false (mencegah celah pengisian awal)
  if old.siap is true and new.siap is not true then new.siap := true; end if;

  -- Foto harus berasal dari folder sendiri (bukan tautan luar)
  if new.foto_url is not null and new.foto_url not like (old.id::text || '/%') then
    raise exception 'Foto profil tidak valid.';
  end if;

  -- Pengisian profil pertama kali (selamat.html) tidak dihitung
  if old.siap is not true and new.siap is true then return new; end if;

  foreach j in array array['foto','nama','username'] loop
    if (j = 'foto' and new.foto_url is distinct from old.foto_url)
       or (j = 'nama' and new.nama is distinct from old.nama)
       or (j = 'username' and new.username is distinct from old.username) then
      maks := batas_profil(j);
      select count(*) into pakai from profil_perubahan
        where user_id = old.id and jenis = j and created_at >= awal_bulan();
      if pakai >= maks then
        raise exception 'Batas ganti % bulan ini sudah habis (% kali). Coba lagi bulan depan.',
          case j when 'foto' then 'foto profil' when 'nama' then 'nama' else 'username' end, maks;
      end if;
      insert into profil_perubahan (user_id, jenis) values (old.id, j);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists batasi_profil_bulanan_trg on profiles;
create trigger batasi_profil_bulanan_trg before update on profiles
  for each row execute function batasi_profil_bulanan();

-- Sisa jatah untuk ditampilkan di layar
create or replace function kuota_profil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reset', ((date_trunc('month', now() at time zone 'Asia/Jakarta') + interval '1 month') at time zone 'Asia/Jakarta'),
    'foto', jsonb_build_object('maks', batas_profil('foto'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'foto' and created_at >= awal_bulan())),
    'nama', jsonb_build_object('maks', batas_profil('nama'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'nama' and created_at >= awal_bulan())),
    'username', jsonb_build_object('maks', batas_profil('username'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'username' and created_at >= awal_bulan()))
  )
$$;
revoke execute on function kuota_profil() from public, anon;
grant execute on function kuota_profil() to authenticated;

-- D. Foto ikut di daftar posting & info profil --------------------------
drop function if exists daftar_posting(text, uuid, text, int, timestamptz);
create function daftar_posting(
  p_mode text default 'beranda',
  p_id uuid default null,
  p_kata text default null,
  p_limit int default 20,
  p_sebelum timestamptz default null
) returns table (
  id uuid, user_id uuid, parent_id uuid, content text, created_at timestamptz,
  username text, nama text, jumlah_suka bigint, sudah_suka boolean, foto text
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.user_id, p.parent_id, p.content, p.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = p.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = p.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto
  from posts p
  join profiles pr on pr.id = p.user_id
  where (p_sebelum is null or p.created_at < p_sebelum)
    and case p_mode
      when 'satu' then p.id = p_id
      when 'balasan' then p.parent_id = p_id
      when 'pengguna' then p.user_id = p_id
      when 'semua' then p.parent_id is null
      when 'ikuti' then p.parent_id is null
        and ( p.user_id = auth.uid()
              or exists (select 1 from follows f2 where f2.follower_id = auth.uid() and f2.following_id = p.user_id) )
      when 'cari' then p.parent_id is null
        and p.content ilike '%' || replace(replace(replace(p_kata, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      else p.parent_id is null
        and ( not exists (select 1 from follows f where f.follower_id = auth.uid())
              or p.user_id = auth.uid()
              or exists (select 1 from follows f2 where f2.follower_id = auth.uid() and f2.following_id = p.user_id) )
    end
  order by (case when p_mode = 'balasan' then p.created_at end) asc nulls last, p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
revoke execute on function daftar_posting(text, uuid, text, int, timestamptz) from public, anon;
grant execute on function daftar_posting(text, uuid, text, int, timestamptz) to authenticated;

create or replace function profil_info(p_username text default null)
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'id', pr.id, 'username', pr.username, 'nama', pr.nama, 'bio', pr.bio, 'foto', pr.foto_url,
    'pengikut', (select count(*) from follows f where f.following_id = pr.id),
    'mengikuti', (select count(*) from follows f2 where f2.follower_id = pr.id),
    'saya_ikut', exists (select 1 from follows f3 where f3.follower_id = auth.uid() and f3.following_id = pr.id),
    'saya_blokir', exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = pr.id))
  from profiles pr
  where (p_username is null and pr.id = auth.uid()) or pr.username = p_username
  limit 1;
$$;
revoke execute on function profil_info(text) from public, anon;
grant execute on function profil_info(text) to authenticated;

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select kuota_profil();                                  -- jatah bulan ini (saat login di aplikasi)
--   select id, public from storage.buckets where id='avatar';   -- 1 baris, public = true
--   select column_name from information_schema.columns where table_name='profiles' and column_name='foto_url';
-- Untuk melihat riwayat ubah: select * from profil_perubahan order by created_at desc limit 20;

-- 048: Profil profesional: foto sampul, lokasi, dan tautan tambahan (diatur pengguna sendiri).
-- Jalankan di Supabase SQL Editor SEBELUM mengunggah kode JS terbaru. Aman diulang.
--
-- Isi:
--   A. Kolom baru di profiles: sampul_url, lokasi, tautan (maks 4 tautan https)
--   B. Bucket "sampul" (publik dibaca, hanya pemilik yang boleh unggah/hapus di foldernya, maks 1 MB per berkas)
--   C. Batas ganti sampul per bulan (3x, sama seperti foto profil), lewat trigger yang sama dengan 008
--   D. Pemeriksaan di database: lokasi maks 40 huruf; tautan hanya https, maks 4, label maks 30; folder sampul harus milik sendiri
--   E. Filter kata terlarang (004) ikut berlaku untuk lokasi dan tautan
--   F. profil_info (anggota) dan profil_publik_info (tamu, hanya bila profil publik dinyalakan) ikut mengembalikan ketiganya
-- Tidak ada akun yang berubah tampilannya sampai pemiliknya mengisi sendiri.

-- A. Kolom ------------------------------------------------------------
alter table profiles add column if not exists sampul_url text;
alter table profiles add column if not exists lokasi text;
alter table profiles add column if not exists tautan jsonb not null default '[]'::jsonb;

-- B. Penyimpanan sampul -----------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sampul', 'sampul', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sampul dibaca" on storage.objects;
create policy "sampul dibaca" on storage.objects for select
  using (bucket_id = 'sampul');

drop policy if exists "sampul unggah sendiri" on storage.objects;
create policy "sampul unggah sendiri" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sampul'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select count(*) from storage.objects o
          where o.bucket_id = 'sampul' and (storage.foldername(o.name))[1] = auth.uid()::text) < 4
  );

drop policy if exists "sampul hapus sendiri" on storage.objects;
create policy "sampul hapus sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'sampul' and (storage.foldername(name))[1] = auth.uid()::text);

-- C. Batas ganti sampul per bulan -------------------------------------
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.profil_perubahan'::regclass and contype = 'c' loop
    execute format('alter table public.profil_perubahan drop constraint %I', c.conname);
  end loop;
end $$;
alter table profil_perubahan add constraint profil_perubahan_jenis_check
  check (jenis in ('foto','nama','username','sampul'));

create or replace function batas_profil(p_jenis text) returns int
language sql immutable as $$
  select case p_jenis when 'foto' then 3 when 'sampul' then 3 when 'nama' then 2 when 'username' then 2 else 0 end
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

  -- Foto dan sampul harus berasal dari folder sendiri (bukan tautan luar)
  if new.foto_url is not null and new.foto_url not like (old.id::text || '/%') then
    raise exception 'Foto profil tidak valid.';
  end if;
  if new.sampul_url is not null and new.sampul_url not like (old.id::text || '/%') then
    raise exception 'Foto sampul tidak valid.';
  end if;

  -- Pengisian profil pertama kali (selamat.html) tidak dihitung
  if old.siap is not true and new.siap is true then return new; end if;

  foreach j in array array['foto','sampul','nama','username'] loop
    if (j = 'foto' and new.foto_url is distinct from old.foto_url)
       or (j = 'sampul' and new.sampul_url is distinct from old.sampul_url)
       or (j = 'nama' and new.nama is distinct from old.nama)
       or (j = 'username' and new.username is distinct from old.username) then
      maks := batas_profil(j);
      select count(*) into pakai from profil_perubahan
        where user_id = old.id and jenis = j and created_at >= awal_bulan();
      if pakai >= maks then
        raise exception 'Batas ganti % bulan ini sudah habis (% kali). Coba lagi bulan depan.',
          case j when 'foto' then 'foto profil' when 'sampul' then 'foto sampul' when 'nama' then 'nama' else 'username' end, maks;
      end if;
      insert into profil_perubahan (user_id, jenis) values (old.id, j);
    end if;
  end loop;
  return new;
end $$;

create or replace function kuota_profil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reset', ((date_trunc('month', now() at time zone 'Asia/Jakarta') + interval '1 month') at time zone 'Asia/Jakarta'),
    'foto', jsonb_build_object('maks', batas_profil('foto'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'foto' and created_at >= awal_bulan())),
    'sampul', jsonb_build_object('maks', batas_profil('sampul'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'sampul' and created_at >= awal_bulan())),
    'nama', jsonb_build_object('maks', batas_profil('nama'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'nama' and created_at >= awal_bulan())),
    'username', jsonb_build_object('maks', batas_profil('username'),
      'pakai', (select count(*) from profil_perubahan where user_id = auth.uid() and jenis = 'username' and created_at >= awal_bulan()))
  )
$$;
revoke execute on function kuota_profil() from public, anon;
grant execute on function kuota_profil() to authenticated;

-- D. Pemeriksaan lokasi dan tautan ------------------------------------
create or replace function validasi_profil_ekstra() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e jsonb; u text; l text; hasil jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or auth.uid() <> old.id then return new; end if;

  -- Lokasi: kosong jadi NULL, maks 40 huruf, tanpa karakter kendali
  new.lokasi := nullif(btrim(coalesce(new.lokasi, '')), '');
  if new.lokasi is not null and (char_length(new.lokasi) > 40 or new.lokasi ~ '[[:cntrl:]]') then
    raise exception 'Lokasi tidak valid (maksimal 40 huruf).';
  end if;

  -- Tautan: larik berisi maks 4 objek {label, url}; hanya https, tanpa kredensial/port/IP
  if new.tautan is null then new.tautan := '[]'::jsonb; end if;
  if jsonb_typeof(new.tautan) <> 'array' or jsonb_array_length(new.tautan) > 4 then
    raise exception 'Tautan tidak valid (maksimal 4 tautan).';
  end if;
  for e in select * from jsonb_array_elements(new.tautan) loop
    if jsonb_typeof(e) <> 'object' then raise exception 'Tautan tidak valid.'; end if;
    u := e ->> 'url';
    l := nullif(btrim(coalesce(e ->> 'label', '')), '');
    if u is null or char_length(u) > 200
       or u !~* '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}([/?#][^[:space:]]*)?$' then
      raise exception 'Tautan tidak valid: gunakan alamat https lengkap.';
    end if;
    if l is not null and (char_length(l) > 30 or l ~ '[[:cntrl:]]') then
      raise exception 'Nama tautan terlalu panjang (maksimal 30 huruf).';
    end if;
    hasil := hasil || jsonb_build_array(jsonb_build_object('label', l, 'url', u));
  end loop;
  new.tautan := hasil;   -- hanya kunci label dan url yang disimpan
  return new;
end $$;
drop trigger if exists validasi_profil_ekstra_trg on profiles;
create trigger validasi_profil_ekstra_trg before update on profiles
  for each row execute function validasi_profil_ekstra();

-- E. Filter kata terlarang (fungsi dari 004) ---------------------------
drop trigger if exists tolak_konten_profiles_ekstra on profiles;
create trigger tolak_konten_profiles_ekstra before update of lokasi, tautan on profiles
  for each row execute function tolak_konten_terlarang('lokasi', 'tautan');

-- F. Dibaca di profil -------------------------------------------------
create or replace function profil_info(p_username text default null)
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'id', pr.id, 'username', pr.username, 'nama', pr.nama, 'bio', pr.bio, 'foto', pr.foto_url,
    'sampul', pr.sampul_url, 'lokasi', pr.lokasi, 'tautan', pr.tautan,
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

-- Profil untuk tamu (syarat sama dengan 045: opt-in, tidak dibekukan). Tipe kembalian berubah, jadi fungsi dibuat ulang.
drop function if exists profil_publik_info(text);
create function profil_publik_info(p_username text)
returns table (username text, nama text, bio text, foto text, bergabung timestamptz, pengikut bigint, jumlah_catatan bigint,
               sampul text, lokasi text, tautan jsonb)
language sql stable security definer set search_path = public as $$
  select pr.username, pr.nama, pr.bio, pr.foto_url, pr.created_at,
         (select count(*) from follows f where f.following_id = pr.id),
         (select count(*) from posts p
           where p.user_id = pr.id and p.publik and not p.publik_dikunci
             and p.parent_id is null and p.kedaluwarsa is null
             and (p.terbuka_pada is null or p.terbuka_pada <= now())
             and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3),
         pr.sampul_url, pr.lokasi, pr.tautan
    from profiles pr
   where pr.username = lower(coalesce(p_username, ''))
     and p_username ~ '^@?[A-Za-z0-9_]{3,20}$'
     and pr.profil_publik and pr.siap
     and not exists (select 1 from pembekuan b where b.user_id = pr.id)
   limit 1
$$;
revoke execute on function profil_publik_info(text) from public;
grant  execute on function profil_publik_info(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah, satu per satu)
-- =====================================================================
-- 1) Kolom baru, harus 3 baris:
--   select column_name from information_schema.columns where table_name='profiles' and column_name in ('sampul_url','lokasi','tautan');
-- 2) Bucket, 1 baris, public = true:
--   select id, public from storage.buckets where id = 'sampul';
-- 3) Fungsi yang boleh dipanggil anon harus tetap TEPAT 7 baris (lihat pemeriksaan di 045):
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
-- 4) Uji tamu pada akun yang profil publiknya mati: harus 0 baris, tanpa galat:
--   begin; set local role anon; select * from profil_publik_info('jurkon'); rollback;
-- Membatalkan (tampilan kembali seperti sebelumnya): kode JS lama tetap jalan; kolom dan bucket boleh dibiarkan.

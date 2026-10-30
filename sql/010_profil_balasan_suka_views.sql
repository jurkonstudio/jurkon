-- JURKON 010: tab Catatan / Balasan / Menyukai di profil + jumlah views (dilihat) per posting.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Jalankan SEBELUM mengunggah kode JS terbaru ke GitHub.
--
-- Isi:
--  A. Kolom posts.dilihat (penghitung) + tabel privat post_views (satu orang dihitung sekali per posting)
--  B. catat_tayang(ids): mencatat views; tidak menghitung posting sendiri; maks 50 id per panggilan
--  C. daftar_posting: mode baru 'catatan_oleh', 'balasan_oleh', 'disukai_oleh'
--     + kolom baru: dilihat, induk_username ("Membalas @..."), suka_pada (waktu di-suka)
--
-- Tanpa migrasi ini aplikasi tetap jalan (tab profil memakai cara lama, views tidak tampil).

-- A. Penghitung views ---------------------------------------------------
alter table posts add column if not exists dilihat integer not null default 0;

create table if not exists post_views (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_views_user on post_views (user_id);
alter table post_views enable row level security;   -- tanpa kebijakan: siapa melihat apa tidak bisa dibaca klien

-- B. Catat views --------------------------------------------------------
create or replace function catat_tayang(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_ids is null then return; end if;
  with baru as (
    insert into post_views (post_id, user_id)
    select p.id, auth.uid()
    from posts p
    where p.id = any (p_ids[1:50]) and p.user_id <> auth.uid()
    on conflict do nothing
    returning post_id
  )
  update posts set dilihat = dilihat + 1 where id in (select post_id from baru);
end $$;
revoke execute on function catat_tayang(uuid[]) from public, anon;
grant execute on function catat_tayang(uuid[]) to authenticated;

-- C. Daftar posting dengan mode profil ----------------------------------
-- mode: beranda, ikuti, semua, cari, pengguna (semua milik id), satu, balasan (balasan untuk induk id),
--       catatan_oleh (posting utama milik id), balasan_oleh (balasan yang ditulis id), disukai_oleh (yang di-suka id)
drop function if exists daftar_posting(text, uuid, text, int, timestamptz);
create function daftar_posting(
  p_mode text default 'beranda',
  p_id uuid default null,
  p_kata text default null,
  p_limit int default 20,
  p_sebelum timestamptz default null
) returns table (
  id uuid, user_id uuid, parent_id uuid, content text, created_at timestamptz,
  username text, nama text, jumlah_suka bigint, sudah_suka boolean, foto text,
  dilihat integer, induk_username text, suka_pada timestamptz
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.user_id, p.parent_id, p.content, p.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = p.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = p.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto,
    p.dilihat,
    ppr.username as induk_username,
    l0.created_at as suka_pada
  from posts p
  join profiles pr on pr.id = p.user_id
  left join posts pp on pp.id = p.parent_id
  left join profiles ppr on ppr.id = pp.user_id
  left join likes l0 on p_mode = 'disukai_oleh' and l0.post_id = p.id and l0.user_id = p_id
  where (p_sebelum is null or coalesce(l0.created_at, p.created_at) < p_sebelum)
    and case p_mode
      when 'satu' then p.id = p_id
      when 'balasan' then p.parent_id = p_id
      when 'pengguna' then p.user_id = p_id
      when 'catatan_oleh' then p.user_id = p_id and p.parent_id is null
      when 'balasan_oleh' then p.user_id = p_id and p.parent_id is not null
      when 'disukai_oleh' then l0.post_id is not null
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
  order by (case when p_mode = 'balasan' then p.created_at end) asc nulls last,
           coalesce(l0.created_at, p.created_at) desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
revoke execute on function daftar_posting(text, uuid, text, int, timestamptz) from public, anon;
grant execute on function daftar_posting(text, uuid, text, int, timestamptz) to authenticated;

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select column_name from information_schema.columns where table_name='posts' and column_name='dilihat';  -- 1 baris
--   select proname from pg_proc where proname in ('catat_tayang','daftar_posting');                          -- 2 baris
-- Untuk membatalkan views: drop function catat_tayang(uuid[]); drop table post_views; alter table posts drop column dilihat;
--   (lalu jalankan ulang bagian D di sql/008_foto_profil_limit.sql agar daftar_posting kembali seperti semula)

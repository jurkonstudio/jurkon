-- JURKON - Migrasi 003: daftar posting & profil dalam SATU panggilan (lebih cepat)
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run.
-- Aman diulang (CREATE OR REPLACE). Tidak mengubah tabel, data, atau kebijakan RLS.
-- Aplikasi tetap berjalan tanpa migrasi ini (memakai cara lama yang lebih lambat).
--
-- Fungsi memakai SECURITY INVOKER: aturan RLS (termasuk blokir) tetap berlaku.

-- mode: beranda (ikuti), semua, cari (p_kata), pengguna (p_id), balasan (p_id = induk), satu (p_id)
create or replace function daftar_posting(
  p_mode text default 'beranda',
  p_id uuid default null,
  p_kata text default null,
  p_limit int default 20,
  p_sebelum timestamptz default null
) returns table (
  id uuid, user_id uuid, parent_id uuid, content text, created_at timestamptz,
  username text, nama text, jumlah_suka bigint, sudah_suka boolean
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.user_id, p.parent_id, p.content, p.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = p.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = p.id and l2.user_id = auth.uid()) as sudah_suka
  from posts p
  join profiles pr on pr.id = p.user_id
  where (p_sebelum is null or p.created_at < p_sebelum)
    and case p_mode
      when 'satu' then p.id = p_id
      when 'balasan' then p.parent_id = p_id
      when 'pengguna' then p.user_id = p_id
      when 'semua' then p.parent_id is null
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

-- Profil + jumlah pengikut + status ikuti/blokir sekaligus (p_username kosong = profil sendiri)
create or replace function profil_info(p_username text default null)
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'id', pr.id, 'username', pr.username, 'nama', pr.nama, 'bio', pr.bio,
    'pengikut', (select count(*) from follows f where f.following_id = pr.id),
    'mengikuti', (select count(*) from follows f2 where f2.follower_id = pr.id),
    'saya_ikut', exists (select 1 from follows f3 where f3.follower_id = auth.uid() and f3.following_id = pr.id),
    'saya_blokir', exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = pr.id))
  from profiles pr
  where (p_username is null and pr.id = auth.uid()) or pr.username = p_username
  limit 1;
$$;

revoke execute on function daftar_posting(text, uuid, text, int, timestamptz) from public, anon;
grant execute on function daftar_posting(text, uuid, text, int, timestamptz) to authenticated;
revoke execute on function profil_info(text) from public, anon;
grant execute on function profil_info(text) to authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah setelah migrasi):
--   select proname from pg_proc where proname in ('daftar_posting','profil_info');   -- harus 2 baris
--   select id, username, jumlah_suka from daftar_posting('semua');                   -- harus keluar posting
-- Untuk membatalkan: drop function daftar_posting(text, uuid, text, int, timestamptz); drop function profil_info(text);
-- =====================================================================

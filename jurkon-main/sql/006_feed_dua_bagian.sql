-- JURKON - Migrasi 006: feed Beranda dua bagian (Publik & Mengikuti)
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Tidak mengubah tabel, data, atau kebijakan RLS. Hanya menambah mode 'ikuti' pada daftar_posting.
--
-- mode baru:
--   'semua' : feed Publik (semua posting utama)            -> sudah ada
--   'ikuti' : feed Mengikuti = posting sendiri + akun yang diikuti (SELALU terfilter,
--             tidak lagi jatuh ke "semua" saat belum mengikuti siapa pun)
--   'beranda' tetap seperti semula (dipertahankan agar kompatibel).
-- Tanpa migrasi ini, aplikasi tetap jalan: mode 'ikuti' diperlakukan seperti 'beranda'
-- (beda hanya untuk akun yang belum mengikuti siapa pun: tampil semua, bukan kosong).

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

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select id, username from daftar_posting('ikuti');   -- hanya posting sendiri + akun yang diikuti
--   select id, username from daftar_posting('semua');   -- semua posting

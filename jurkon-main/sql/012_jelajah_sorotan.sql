-- JURKON 012: Jelajah hanya menampilkan "Sorotan":
--   (a) posting utama yang jumlah "dilihat"-nya mencapai ambang (bawaan 100.000), ATAU
--   (b) posting yang diklasifikasikan/dipilih admin sebagai sorotan (kolom posts.disorot).
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Syarat: migrasi 002 (is_admin) dan 010 (kolom posts.dilihat) sudah dijalankan.
-- Jalankan SEBELUM mengunggah JS terbaru ke GitHub.
--
-- Mengubah ambang: ubah angka di ambang_sorotan() di bawah, lalu jalankan ulang file ini
-- (atau hanya fungsi itu). Pencarian di Jelajah tetap menjangkau semua posting.
-- Pengguna biasa TIDAK bisa menandai posting sebagai sorotan (posts tidak punya kebijakan UPDATE
-- untuk pengguna); hanya admin lewat sorot_posting() atau pemilik lewat SQL Editor.
-- (011_jelajah_ramai.sql tidak lagi dipakai aplikasi; boleh tetap ada.)

alter table posts add column if not exists disorot boolean not null default false;
create index if not exists posts_disorot on posts (created_at desc) where disorot;
create index if not exists posts_dilihat on posts (dilihat desc) where parent_id is null;

create or replace function ambang_sorotan() returns int
language sql immutable as $$ select 100000 $$;

create or replace function posting_sorotan(p_limit int default 20, p_sebelum timestamptz default null)
returns table (
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
    null::text as induk_username,
    null::timestamptz as suka_pada
  from posts p
  join profiles pr on pr.id = p.user_id
  where p.parent_id is null
    and (p.disorot or p.dilihat >= ambang_sorotan())
    and (p_sebelum is null or p.created_at < p_sebelum)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
revoke execute on function posting_sorotan(int, timestamptz) from public, anon;
grant execute on function posting_sorotan(int, timestamptz) to authenticated;

-- Admin menandai / mencabut sorotan
create or replace function sorot_posting(p_id uuid, p_nilai boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Khusus admin.'; end if;
  update posts set disorot = coalesce(p_nilai, true) where id = p_id and parent_id is null;
  if not found then raise exception 'Posting tidak ditemukan atau berupa balasan.'; end if;
end $$;
revoke execute on function sorot_posting(uuid, boolean) from public, anon;
grant execute on function sorot_posting(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';

-- CARA CEPAT lewat SQL Editor (tanpa panel admin):
--   update posts set disorot = true  where id = '<id-posting>';   -- sorot
--   update posts set disorot = false where id = '<id-posting>';   -- cabut
-- PEMERIKSAAN:  select * from posting_sorotan(10, null);
-- Membatalkan: drop function posting_sorotan(int, timestamptz); drop function sorot_posting(uuid, boolean);
--              drop function ambang_sorotan(); alter table posts drop column disorot;

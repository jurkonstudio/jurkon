-- 023: Catatan berumur (hilang otomatis) + kolom kedaluwarsa pada feed.
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 002, 010, 011, 021 (memakai ada_blokir(), is_admin()).
--
-- Cara kerja:
--  * Penulis boleh memilih catatan utama hilang setelah 24 jam / 7 hari (maks 30 hari).
--  * Setelah lewat waktunya, catatan tidak terbaca lagi oleh anggota (kebijakan RLS), tetapi tetap
--    terbaca admin sebagai bukti laporan. Penghapusan fisik: bersihkan_catatan_berumur() di bawah.
--  * Masa berlaku tidak bisa diubah/dicabut sesudah catatan dikirim (mencegah akal-akalan moderasi).

alter table posts add column if not exists kedaluwarsa timestamptz;
create index if not exists posts_kedaluwarsa_idx on posts (kedaluwarsa) where kedaluwarsa is not null;

-- A. Aturan isian: hanya catatan utama; waktu dibatasi 1 jam .. 30 hari dari jam server
create or replace function jaga_kedaluwarsa() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.kedaluwarsa is not null then
      if new.parent_id is not null or coalesce(new.jenis, 'biasa') <> 'biasa' then
        raise exception 'Catatan berumur hanya untuk catatan utama.';
      end if;
      new.kedaluwarsa := least(greatest(new.kedaluwarsa, now() + interval '1 hour'), now() + interval '30 days');
    end if;
  elsif new.kedaluwarsa is distinct from old.kedaluwarsa and auth.uid() is not null then
    raise exception 'Masa berlaku catatan tidak bisa diubah.';
  end if;
  return new;
end $$;
drop trigger if exists jaga_kedaluwarsa_trg on posts;
create trigger jaga_kedaluwarsa_trg before insert or update of kedaluwarsa on posts
  for each row execute function jaga_kedaluwarsa();

-- B. Catatan yang sudah lewat waktunya disembunyikan dari anggota (admin tetap bisa melihat)
drop policy if exists "posting dibaca anggota" on posts;
create policy "posting dibaca anggota" on posts for select
  using (auth.uid() is not null and not ada_blokir(auth.uid(), user_id)
         and (kedaluwarsa is null or kedaluwarsa > now() or is_admin()));

-- C. Feed dan "ramai" ikut mengirim kolom kedaluwarsa (untuk label "Hilang dalam ...")
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
  dilihat integer, induk_username text, suka_pada timestamptz, kedaluwarsa timestamptz
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.user_id, p.parent_id, p.content, p.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = p.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = p.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto,
    p.dilihat,
    ppr.username as induk_username,
    l0.created_at as suka_pada,
    p.kedaluwarsa
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

drop function if exists posting_ramai(int, int);
create function posting_ramai(p_limit int default 10, p_jam int default 72)
returns table (
  id uuid, user_id uuid, parent_id uuid, content text, created_at timestamptz,
  username text, nama text, jumlah_suka bigint, sudah_suka boolean, foto text,
  dilihat integer, induk_username text, suka_pada timestamptz, kedaluwarsa timestamptz
)
language sql stable security invoker set search_path = public as $$
  with kandidat as (
    select p.id, p.user_id, p.content, p.created_at, p.dilihat, p.kedaluwarsa,
      (select count(distinct l.user_id) from likes l where l.post_id = p.id and l.user_id <> p.user_id) as suka_lain,
      (select count(distinct r.user_id) from posts r where r.parent_id = p.id and r.user_id <> p.user_id) as balas_lain
    from posts p
    where p.parent_id is null
      and p.created_at > now() - make_interval(hours => least(greatest(coalesce(p_jam, 72), 1), 720))
  )
  select k.id, k.user_id, null::uuid, k.content, k.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = k.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = k.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto,
    k.dilihat,
    null::text, null::timestamptz,
    k.kedaluwarsa
  from kandidat k
  join profiles pr on pr.id = k.user_id
  where k.suka_lain + k.balas_lain >= 1
  order by ((k.suka_lain * 2 + k.balas_lain * 3 + least(k.dilihat, 500) * 0.05)
            / power(extract(epoch from (now() - k.created_at)) / 3600.0 + 2, 1.4)) desc,
           k.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 30);
$$;
revoke execute on function posting_ramai(int, int) from public, anon;
grant execute on function posting_ramai(int, int) to authenticated;

-- D. Penghapusan fisik (opsional, terjadwal/manual). Catatan yang sedang dilaporkan TIDAK dihapus.
-- Balasan pada catatan yang dihapus ikut terhapus (relasi cascade).
create or replace function bersihkan_catatan_berumur(hari integer default 30) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from posts p
   where p.kedaluwarsa is not null
     and p.kedaluwarsa < now() - make_interval(days => hari)
     and not exists (select 1 from reports r where r.post_id = p.id);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function bersihkan_catatan_berumur(integer) from public, anon, authenticated;
-- Jadwal harian (opsional, pg_cron aktif): select cron.schedule('bersihkan-berumur', '15 3 * * *', 'select public.bersihkan_catatan_berumur(30)');

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select column_name from information_schema.columns where table_name='posts' and column_name='kedaluwarsa';  -- 1 baris
--   select proname from pg_proc where proname in ('jaga_kedaluwarsa','bersihkan_catatan_berumur');              -- 2 baris
--   select policyname from pg_policies where tablename='posts' and cmd='SELECT';                                -- "posting dibaca anggota"
-- Pembatalan: drop trigger jaga_kedaluwarsa_trg on posts; lalu pasang ulang kebijakan 002 untuk posts dan
--   jalankan ulang 010 (daftar_posting) dan 011 (posting_ramai); alter table posts drop column kedaluwarsa;

-- 024: Kapsul waktu (catatan yang baru muncul pada waktu yang dipilih penulis).
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 013, 021, 023 (memakai ada_blokir(), is_admin(), kolom jenis dan kedaluwarsa).
--
-- Cara kerja:
--  * Penulis memilih catatan utama baru "terbuka" 1 jam .. 365 hari lagi (waktu server).
--  * Sebelum waktunya, catatan TIDAK terbaca siapa pun lewat RLS, termasuk penulisnya sendiri
--    (sehingga tidak bocor lewat jalur baca mana pun). Admin tetap bisa membaca untuk moderasi.
--    Penulis melihat dan membatalkan kapsulnya lewat kapsul_saya() dan batalkan_kapsul().
--  * Waktu buka tidak bisa diubah sesudah dikirim. Tidak bisa digabung dengan catatan berumur.
--  * Tidak ada notifikasi (mention, pengikut) untuk kapsul; notifikasi yang terbentuk saat kirim dihapus.
--  * Di feed, kapsul yang sudah terbuka diurutkan menurut waktu bukanya, dan kartunya memuat
--    tanggal tulis asli (kolom kapsul_ditulis) untuk label "Kapsul waktu, ditulis ...".
--  * Tanpa pg_cron: kapsul "terbuka" hanya karena waktu sekarang melewati terbuka_pada.

alter table posts add column if not exists terbuka_pada timestamptz;
create index if not exists posts_terbuka_idx on posts (terbuka_pada) where terbuka_pada is not null;

-- A. Aturan isian: hanya catatan utama; 1 jam .. 365 hari dari jam server; tidak digabung catatan berumur
create or replace function jaga_kapsul() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.terbuka_pada is not null then
      if new.parent_id is not null or coalesce(new.jenis, 'biasa') <> 'biasa' then
        raise exception 'Kapsul waktu hanya untuk catatan utama.';
      end if;
      if new.kedaluwarsa is not null then
        raise exception 'Pilih salah satu: kapsul waktu atau catatan berumur.';
      end if;
      new.terbuka_pada := least(greatest(new.terbuka_pada, now() + interval '1 hour'), now() + interval '365 days');
    end if;
  elsif new.terbuka_pada is distinct from old.terbuka_pada and auth.uid() is not null then
    raise exception 'Waktu buka kapsul tidak bisa diubah.';
  end if;
  return new;
end $$;
drop trigger if exists jaga_kapsul_trg on posts;
create trigger jaga_kapsul_trg before insert or update of terbuka_pada on posts
  for each row execute function jaga_kapsul();

-- B. Kebijakan baca: gabungan aturan blokir (022), kedaluwarsa (023), dan kapsul (024)
drop policy if exists "posting dibaca anggota" on posts;
create policy "posting dibaca anggota" on posts for select
  using (auth.uid() is not null and not ada_blokir(auth.uid(), user_id)
         and (kedaluwarsa is null or kedaluwarsa > now() or is_admin())
         and (terbuka_pada is null or terbuka_pada <= now() or is_admin()));

-- C. Tanpa notifikasi untuk kapsul. Trigger berjalan menurut urutan nama; "zz_" berjalan terakhir,
--    sesudah notif_mention_trg dan notif_posting_ikuti_trg, lalu menghapus notifikasi yang baru terbentuk.
create or replace function kapsul_bersihkan_notif() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from notifications where post_id = new.id;
  return new;
end $$;
drop trigger if exists zz_kapsul_notif_trg on posts;
create trigger zz_kapsul_notif_trg after insert on posts
  for each row when (new.terbuka_pada is not null)
  execute function kapsul_bersihkan_notif();

-- D. Kapsul milik sendiri yang masih menunggu, dan pembatalannya
create or replace function kapsul_saya()
returns table (id uuid, content text, created_at timestamptz, terbuka_pada timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.content, p.created_at, p.terbuka_pada
    from posts p
   where p.user_id = auth.uid() and p.terbuka_pada > now()
   order by p.terbuka_pada asc
   limit 100;
$$;
revoke execute on function kapsul_saya() from public, anon;
grant execute on function kapsul_saya() to authenticated;

create or replace function batalkan_kapsul(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then return false; end if;
  delete from posts where id = p_id and user_id = auth.uid() and terbuka_pada > now();
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke execute on function batalkan_kapsul(uuid) from public, anon;
grant execute on function batalkan_kapsul(uuid) to authenticated;

-- E. Feed dan "ramai": kapsul belum terbuka disembunyikan (juga dari admin di feed biasa);
--    kapsul terbuka memakai waktu bukanya sebagai created_at dan mengirim tanggal tulis asli di kapsul_ditulis.
--    Kolom kedaluwarsa tetap ada; kapsul_ditulis ditambahkan DI AKHIR.
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
  dilihat integer, induk_username text, suka_pada timestamptz, kedaluwarsa timestamptz,
  kapsul_ditulis timestamptz
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.user_id, p.parent_id, p.content, coalesce(p.terbuka_pada, p.created_at) as created_at,
    pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = p.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = p.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto,
    p.dilihat,
    ppr.username as induk_username,
    l0.created_at as suka_pada,
    p.kedaluwarsa,
    case when p.terbuka_pada is not null then p.created_at end as kapsul_ditulis
  from posts p
  join profiles pr on pr.id = p.user_id
  left join posts pp on pp.id = p.parent_id
  left join profiles ppr on ppr.id = pp.user_id
  left join likes l0 on p_mode = 'disukai_oleh' and l0.post_id = p.id and l0.user_id = p_id
  where (p.terbuka_pada is null or p.terbuka_pada <= now())
    and (p_sebelum is null or coalesce(l0.created_at, p.terbuka_pada, p.created_at) < p_sebelum)
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
           coalesce(l0.created_at, p.terbuka_pada, p.created_at) desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
revoke execute on function daftar_posting(text, uuid, text, int, timestamptz) from public, anon;
grant execute on function daftar_posting(text, uuid, text, int, timestamptz) to authenticated;

drop function if exists posting_ramai(int, int);
create function posting_ramai(p_limit int default 10, p_jam int default 72)
returns table (
  id uuid, user_id uuid, parent_id uuid, content text, created_at timestamptz,
  username text, nama text, jumlah_suka bigint, sudah_suka boolean, foto text,
  dilihat integer, induk_username text, suka_pada timestamptz, kedaluwarsa timestamptz,
  kapsul_ditulis timestamptz
)
language sql stable security invoker set search_path = public as $$
  with kandidat as (
    select p.id, p.user_id, p.content, coalesce(p.terbuka_pada, p.created_at) as created_at, p.dilihat, p.kedaluwarsa,
      case when p.terbuka_pada is not null then p.created_at end as ditulis,
      (select count(distinct l.user_id) from likes l where l.post_id = p.id and l.user_id <> p.user_id) as suka_lain,
      (select count(distinct r.user_id) from posts r where r.parent_id = p.id and r.user_id <> p.user_id) as balas_lain
    from posts p
    where p.parent_id is null
      and (p.terbuka_pada is null or p.terbuka_pada <= now())
      and coalesce(p.terbuka_pada, p.created_at) > now() - make_interval(hours => least(greatest(coalesce(p_jam, 72), 1), 720))
  )
  select k.id, k.user_id, null::uuid, k.content, k.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = k.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = k.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto,
    k.dilihat,
    null::text, null::timestamptz,
    k.kedaluwarsa,
    k.ditulis
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

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select column_name from information_schema.columns where table_name='posts' and column_name='terbuka_pada';   -- 1 baris
--   select proname from pg_proc where proname in ('jaga_kapsul','kapsul_bersihkan_notif','kapsul_saya','batalkan_kapsul'); -- 4 baris
--   select tgname from pg_trigger where tgrelid='posts'::regclass and tgname in ('jaga_kapsul_trg','zz_kapsul_notif_trg'); -- 2 baris
--   select policyname from pg_policies where tablename='posts' and cmd='SELECT';                                    -- "posting dibaca anggota"
-- Pembatalan: drop trigger zz_kapsul_notif_trg on posts; drop trigger jaga_kapsul_trg on posts;
--   pasang ulang kebijakan 023 dan fungsi daftar_posting/posting_ramai dari 023; alter table posts drop column terbuka_pada;

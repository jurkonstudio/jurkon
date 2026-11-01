-- JURKON 020: panel admin lengkap + pengaturan landing page.
-- Jalankan di Supabase SQL Editor SETELAH 002-019 (butuh is_admin, bekukan_akun, sorot_posting,
-- kolom posts.dilihat dan posts.disorot). Aman dijalankan ulang.
--
-- Isi:
--  A. Tabel pengaturan_situs (teks landing, pengumuman, buka/tutup pendaftaran) dan admin_log (jejak audit).
--  B. Fungsi admin: statistik, cari pengguna, cari posting, bekukan/buka, hapus posting/akun, sorot,
--     tangani laporan, kelola admin, simpan pengaturan, baca log. SEMUA memeriksa is_admin() di server.
--  C. landing_publik(): satu-satunya fungsi yang boleh dipanggil tanpa login (anon). Isinya hanya angka
--     total dan teks landing, tanpa data pribadi.
--  D. Tombol "tutup pendaftaran" sungguhan (trigger di auth.users), bukan sekadar tampilan.
--  E. Hak akses + pemeriksaan akhir.
--
-- Semua tabel baru TERTUTUP untuk klien (RLS aktif tanpa kebijakan + revoke). Klien hanya lewat fungsi di bawah.

-- =====================================================================
-- A. Tabel
-- =====================================================================
create table if not exists pengaturan_situs (
  kunci text primary key check (kunci ~ '^[a-z_]{2,40}$'),
  nilai text not null default '' check (char_length(nilai) <= 600),
  diubah_at timestamptz not null default now(),
  diubah_oleh uuid
);
alter table pengaturan_situs enable row level security;
revoke all on pengaturan_situs from anon, authenticated;

insert into pengaturan_situs (kunci, nilai) values
  ('brand_nama',        'Jurnal Koneksi'),
  ('hero_judul',        'Catatan singkat, koneksi yang tenang.'),
  ('hero_sub',          'Media sosial berbahasa Indonesia dengan batas 250 karakter. Tulis yang penting, baca yang berarti, tanpa keramaian.'),
  ('pengumuman_aktif',  '0'),
  ('pengumuman',        ''),
  ('pendaftaran_buka',  '1'),
  ('kontak_email',      '')
on conflict (kunci) do nothing;

create table if not exists admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid,
  aksi text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_waktu on admin_log (created_at desc);
alter table admin_log enable row level security;
revoke all on admin_log from anon, authenticated;

-- Internal: dipanggil fungsi admin lain. Klien TIDAK boleh memanggilnya (lihat bagian E).
create or replace function catat_admin(p_aksi text, p_target text default null, p_detail text default null) returns void
language sql security definer set search_path = public as $$
  insert into admin_log (admin_id, aksi, target, detail)
  values (auth.uid(), p_aksi, p_target, left(p_detail, 300));
$$;

-- =====================================================================
-- B. Fungsi admin
-- =====================================================================

-- B1. Statistik ringkasan + deret 14 hari
create or replace function admin_statistik() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare hasil jsonb;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  select jsonb_build_object(
    'pengguna',        (select count(*) from profiles),
    'pengguna_24j',    (select count(*) from profiles where created_at > now() - interval '1 day'),
    'pengguna_7h',     (select count(*) from profiles where created_at > now() - interval '7 days'),
    'aktif_24j',       (select count(*) from auth.users where last_sign_in_at > now() - interval '1 day'),
    'belum_verifikasi',(select count(*) from auth.users where email_confirmed_at is null),
    'dibekukan',       (select count(*) from pembekuan),
    'admin',           (select count(*) from admins),
    'posting',         (select count(*) from posts where parent_id is null),
    'balasan',         (select count(*) from posts where parent_id is not null),
    'pesan',           (select count(*) from messages),
    'suka',            (select count(*) from likes),
    'laporan_baru',    (select count(*) from reports where status = 'baru'),
    'laporan_selesai', (select count(*) from reports where status = 'selesai'),
    'disorot',         (select count(*) from posts where disorot),
    'seri', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'hari', to_char(d.hari, 'YYYY-MM-DD'),
        'pengguna', (select count(*) from profiles x where (x.created_at at time zone 'Asia/Jakarta') >= d.hari and (x.created_at at time zone 'Asia/Jakarta') < d.hari + interval '1 day'),
        'posting',  (select count(*) from posts x where (x.created_at at time zone 'Asia/Jakarta') >= d.hari and (x.created_at at time zone 'Asia/Jakarta') < d.hari + interval '1 day'),
        'pesan',    (select count(*) from messages x where (x.created_at at time zone 'Asia/Jakarta') >= d.hari and (x.created_at at time zone 'Asia/Jakarta') < d.hari + interval '1 day')
      ) order by d.hari), '[]'::jsonb)
      from generate_series(
        date_trunc('day', now() at time zone 'Asia/Jakarta') - interval '13 days',
        date_trunc('day', now() at time zone 'Asia/Jakarta'),
        interval '1 day') as d(hari)
    )
  ) into hasil;
  return hasil;
end $$;

-- B2. Cari pengguna (username, nama, email, atau UUID persis)
create or replace function admin_cari_pengguna(p_cari text default '', p_batas int default 30, p_mulai int default 0)
returns table (
  id uuid, username text, nama text, email text, foto text,
  dibuat timestamptz, masuk_terakhir timestamptz, terverifikasi boolean,
  dibekukan boolean, alasan_beku text, jml_posting bigint, laporan_baru bigint, adalah_admin boolean
)
language plpgsql stable security definer set search_path = public, auth as $$
declare q text := nullif(trim(coalesce(p_cari, '')), '');
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return query
    select p.id, p.username, p.nama, u.email::text, p.foto_url,
           p.created_at, u.last_sign_in_at, (u.email_confirmed_at is not null),
           (b.user_id is not null), b.alasan,
           (select count(*) from posts x where x.user_id = p.id),
           (select count(*) from reports r join posts x on x.id = r.post_id
              where x.user_id = p.id and r.status = 'baru'),
           exists (select 1 from admins a where a.user_id = p.id)
    from profiles p
    join auth.users u on u.id = p.id
    left join pembekuan b on b.user_id = p.id
    where q is null
       or p.username ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
       or coalesce(p.nama, '') ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
       or u.email ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
       or p.id::text = lower(q)
    order by p.created_at desc
    limit greatest(1, least(coalesce(p_batas, 30), 100)) offset greatest(coalesce(p_mulai, 0), 0);
end $$;

-- B3. Cari posting (isi atau username penulis)
create or replace function admin_cari_posting(p_cari text default '', p_batas int default 30, p_mulai int default 0)
returns table (
  id uuid, isi text, dibuat timestamptz, user_id uuid, username text,
  adalah_balasan boolean, dilihat int, disorot boolean, jml_suka bigint, laporan_baru bigint
)
language plpgsql stable security definer set search_path = public, auth as $$
declare q text := nullif(trim(coalesce(p_cari, '')), '');
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return query
    select x.id, x.content, x.created_at, x.user_id, p.username,
           (x.parent_id is not null), x.dilihat, x.disorot,
           (select count(*) from likes l where l.post_id = x.id),
           (select count(*) from reports r where r.post_id = x.id and r.status = 'baru')
    from posts x
    join profiles p on p.id = x.user_id
    where q is null
       or x.content ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
       or p.username ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
       or x.id::text = lower(q)
    order by x.created_at desc
    limit greatest(1, least(coalesce(p_batas, 30), 100)) offset greatest(coalesce(p_mulai, 0), 0);
end $$;

-- B4. Moderasi
create or replace function admin_hapus_posting(p_id uuid, p_alasan text default null) returns void
language plpgsql security definer set search_path = public as $$
declare cuplikan text; penulis text;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  select left(x.content, 80), p.username into cuplikan, penulis
    from posts x join profiles p on p.id = x.user_id where x.id = p_id;
  if penulis is null then raise exception 'Posting tidak ditemukan.'; end if;
  delete from posts where id = p_id;
  perform catat_admin('hapus_posting', p_id::text, '@' || penulis || ': ' || coalesce(cuplikan, '') ||
                      case when p_alasan is not null then ' | ' || p_alasan else '' end);
end $$;

create or replace function admin_bekukan_akun(target uuid, p_alasan text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  perform bekukan_akun(target, p_alasan);
  perform catat_admin('bekukan_akun', target::text, p_alasan);
end $$;

create or replace function admin_buka_pembekuan(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  perform buka_pembekuan(target);
  perform catat_admin('buka_pembekuan', target::text, null);
end $$;

create or replace function admin_hapus_akun(target uuid, p_alasan text default null) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_nama text;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if target is null or target = auth.uid() then raise exception 'Tidak bisa menghapus akunmu sendiri dari sini.'; end if;
  if exists (select 1 from admins where user_id = target) then raise exception 'Cabut status admin dulu sebelum menghapus akun.'; end if;
  select username into v_nama from profiles where id = target;
  if v_nama is null then raise exception 'Akun tidak ditemukan.'; end if;
  delete from auth.users where id = target;       -- semua data akun ikut terhapus (cascade)
  perform catat_admin('hapus_akun', target::text, '@' || v_nama || coalesce(' | ' || p_alasan, ''));
end $$;

create or replace function admin_sorot(p_id uuid, p_nilai boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  perform sorot_posting(p_id, p_nilai);
  perform catat_admin(case when coalesce(p_nilai, true) then 'sorot' else 'cabut_sorot' end, p_id::text, null);
end $$;

create or replace function admin_tangani_laporan(p_id uuid, p_status text default 'selesai') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if p_status not in ('baru', 'selesai') then raise exception 'Status tidak valid.'; end if;
  update reports set status = p_status where id = p_id;
  perform catat_admin('laporan_' || p_status, p_id::text, null);
end $$;

-- Tandai selesai semua laporan terbuka untuk satu posting sekaligus
create or replace function admin_selesaikan_laporan_posting(p_post uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  update reports set status = 'selesai' where post_id = p_post and status = 'baru';
  get diagnostics n = row_count;
  perform catat_admin('laporan_selesai_massal', p_post::text, n || ' laporan');
  return n;
end $$;

-- B5. Kelola admin
create or replace function admin_daftar_admin() returns table (user_id uuid, username text, email text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return query
    select a.user_id, p.username, u.email::text
    from admins a
    left join profiles p on p.id = a.user_id
    left join auth.users u on u.id = a.user_id
    order by p.username;
end $$;

create or replace function admin_tambah_admin(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'Tidak ada akun dengan email itu.'; end if;
  if exists (select 1 from pembekuan where user_id = uid) then raise exception 'Akun ini sedang dibekukan.'; end if;
  insert into admins (user_id) values (uid) on conflict do nothing;
  perform catat_admin('tambah_admin', uid::text, null);
end $$;

create or replace function admin_cabut_admin(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if target = auth.uid() then raise exception 'Tidak bisa mencabut statusmu sendiri (agar selalu ada admin).'; end if;
  delete from admins where user_id = target;
  perform catat_admin('cabut_admin', target::text, null);
end $$;

-- B6. Jejak audit
create or replace function admin_log_daftar(p_batas int default 60) returns table (
  id bigint, waktu timestamptz, admin_username text, aksi text, target text, detail text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return query
    select l.id, l.created_at, p.username, l.aksi, l.target, l.detail
    from admin_log l left join profiles p on p.id = l.admin_id
    order by l.created_at desc, l.id desc
    limit greatest(1, least(coalesce(p_batas, 60), 200));
end $$;

-- B7. Pengaturan situs (daftar kunci yang boleh diubah ditetapkan di sini, bukan oleh klien)
create or replace function admin_pengaturan() returns table (kunci text, nilai text, diubah_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return query select s.kunci, s.nilai, s.diubah_at from pengaturan_situs s order by s.kunci;
end $$;

create or replace function admin_simpan_pengaturan(p_kunci text, p_nilai text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := coalesce(p_nilai, '');
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if p_kunci not in ('brand_nama','hero_judul','hero_sub','pengumuman_aktif','pengumuman','pendaftaran_buka','kontak_email') then
    raise exception 'Pengaturan tidak dikenal.';
  end if;
  if char_length(v) > 600 then raise exception 'Terlalu panjang (maks 600 karakter).'; end if;
  if v ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\u2060-\u2064\u202a-\u202e\u2066-\u2069\ufeff]' then
    raise exception 'Teks memuat karakter tak terlihat yang tidak diizinkan.';
  end if;
  if p_kunci in ('pengumuman_aktif', 'pendaftaran_buka') and v not in ('0', '1') then
    raise exception 'Nilai harus 0 atau 1.';
  end if;
  insert into pengaturan_situs (kunci, nilai, diubah_at, diubah_oleh)
  values (p_kunci, v, now(), auth.uid())
  on conflict (kunci) do update set nilai = excluded.nilai, diubah_at = now(), diubah_oleh = auth.uid();
  perform catat_admin('pengaturan', p_kunci, left(v, 120));
end $$;

-- =====================================================================
-- C. Landing publik (boleh anon). Hanya angka total dan teks landing.
-- =====================================================================
create or replace function landing_publik() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pengguna', (select count(*) from profiles),
    'catatan',  (select count(*) from posts where parent_id is null),
    'brand_nama',       coalesce((select nilai from pengaturan_situs where kunci = 'brand_nama'), ''),
    'hero_judul',       coalesce((select nilai from pengaturan_situs where kunci = 'hero_judul'), ''),
    'hero_sub',         coalesce((select nilai from pengaturan_situs where kunci = 'hero_sub'), ''),
    'pendaftaran_buka', coalesce((select nilai from pengaturan_situs where kunci = 'pendaftaran_buka'), '1') = '1',
    'kontak_email',     coalesce((select nilai from pengaturan_situs where kunci = 'kontak_email'), ''),
    'pengumuman',       case when (select nilai from pengaturan_situs where kunci = 'pengumuman_aktif') = '1'
                             then coalesce((select nilai from pengaturan_situs where kunci = 'pengumuman'), '')
                             else '' end
  );
$$;

-- =====================================================================
-- D. Tutup pendaftaran sungguhan (berlaku juga untuk login Google yang membuat akun baru)
-- =====================================================================
create or replace function cek_pendaftaran_buka() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if coalesce((select nilai from pengaturan_situs where kunci = 'pendaftaran_buka'), '1') <> '1' then
    raise exception 'Pendaftaran akun baru sedang ditutup sementara.';
  end if;
  return new;
end $$;
drop trigger if exists cek_pendaftaran_buka_trg on auth.users;
create trigger cek_pendaftaran_buka_trg before insert on auth.users
  for each row execute function cek_pendaftaran_buka();

-- =====================================================================
-- E. Hak akses
--    Fungsi admin: hanya pengguna masuk (dan tetap menolak non-admin di dalamnya).
--    catat_admin dan fungsi pemicu: tidak untuk klien.
--    landing_publik: SATU-SATUNYA yang dibuka untuk anon.
-- =====================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'admin_statistik()', 'admin_cari_pengguna(text,int,int)', 'admin_cari_posting(text,int,int)',
    'admin_hapus_posting(uuid,text)', 'admin_bekukan_akun(uuid,text)', 'admin_buka_pembekuan(uuid)',
    'admin_hapus_akun(uuid,text)', 'admin_sorot(uuid,boolean)', 'admin_tangani_laporan(uuid,text)',
    'admin_selesaikan_laporan_posting(uuid)', 'admin_daftar_admin()', 'admin_tambah_admin(text)',
    'admin_cabut_admin(uuid)', 'admin_log_daftar(int)', 'admin_pengaturan()', 'admin_simpan_pengaturan(text,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

revoke execute on function catat_admin(text, text, text) from public, anon, authenticated;
revoke execute on function cek_pendaftaran_buka() from public, anon, authenticated;

revoke execute on function landing_publik() from public;
grant execute on function landing_publik() to anon, authenticated;

-- =====================================================================
-- PEMERIKSAAN AKHIR
-- Hasil yang BENAR: tepat 1 baris, 'landing_publik()' (itu memang sengaja dibuka untuk halaman landing).
-- Bila ada baris lain, ada fungsi yang bocor ke anon.
-- Catatan: bila nanti kamu menjalankan ulang 019, ia mencabut hak anon dari landing_publik().
--          Jalankan ulang seluruh 020 setelahnya (bagian E juga mencabut catat_admin dari klien).
-- =====================================================================
select 'fungsi terbuka untuk anon' as info, p.oid::regprocedure::text as nama
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and has_function_privilege('anon', p.oid, 'execute')
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');

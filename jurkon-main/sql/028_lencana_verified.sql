-- JURKON 028: lencana verified yang bisa diberikan admin dari Pusat Kendali.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Syarat: 020 dan 021 sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.
--
-- Isi:
--   1. profiles.verified dan profiles.verified_at
--   2. Trigger penjaga: pengguna biasa TIDAK bisa mengubah kolom ini lewat API, walau memakai
--      kebijakan "ubah profil sendiri". Hanya admin_set_verified() atau SQL Editor yang bisa.
--   3. admin_set_verified(target, nilai, alasan): memberi/mencabut lencana, tercatat di Jejak admin.
--   4. admin_cari_pengguna diperbarui: ada kolom lencana, dan mengetik :verified menampilkan semua akun verified.
--   5. daftar_verified(): daftar username verified untuk klien (dipanggil saat aplikasi dibuka).
-- Akun resmi (jurkon, journalconnection, jurnalkoneksi) tetap bercentang lewat daftar di js/ui.js.

alter table profiles add column if not exists verified boolean not null default false;
alter table profiles add column if not exists verified_at timestamptz;

-- 2. Penjaga kolom
create or replace function jaga_verified() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;                                   -- SQL Editor / pemicu sistem
  if current_setting('jurkon.verified_ok', true) = '1' then return new; end if;    -- diset hanya oleh admin_set_verified
  if tg_op = 'INSERT' then
    new.verified := false; new.verified_at := null;
  else
    new.verified := old.verified; new.verified_at := old.verified_at;
  end if;
  return new;
end $$;
drop trigger if exists jaga_verified_trg on profiles;
create trigger jaga_verified_trg before insert or update on profiles
  for each row execute function jaga_verified();

-- 3. Beri / cabut lencana
create or replace function admin_set_verified(target uuid, p_nilai boolean default true, p_alasan text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_nama text; v_nilai boolean := coalesce(p_nilai, true);
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  select username into v_nama from profiles where id = target;
  if v_nama is null then raise exception 'Akun tidak ditemukan.'; end if;
  perform set_config('jurkon.verified_ok', '1', true);      -- berlaku hanya di transaksi ini
  update profiles set verified = v_nilai, verified_at = case when v_nilai then now() else null end where id = target;
  perform set_config('jurkon.verified_ok', '', true);
  perform catat_admin(case when v_nilai then 'beri_verified' else 'cabut_verified' end, target::text,
                      '@' || v_nama || case when p_alasan is not null then ' | ' || p_alasan else '' end);
end $$;

-- 4. Cari pengguna: tambah kolom lencana di AKHIR daftar kolom
drop function if exists admin_cari_pengguna(text, int, int);
create or replace function admin_cari_pengguna(p_cari text default '', p_batas int default 30, p_mulai int default 0)
returns table (
  id uuid, username text, nama text, email text, foto text,
  dibuat timestamptz, masuk_terakhir timestamptz, terverifikasi boolean,
  dibekukan boolean, alasan_beku text, jml_posting bigint, laporan_baru bigint, adalah_admin boolean,
  lencana boolean
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
           exists (select 1 from admins a where a.user_id = p.id),
           p.verified
    from profiles p
    join auth.users u on u.id = p.id
    left join pembekuan b on b.user_id = p.id
    where q is null
       or (lower(q) = ':verified' and p.verified)
       or (lower(q) <> ':verified' and (
              p.username ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
           or coalesce(p.nama, '') ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
           or u.email ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
           or p.id::text = lower(q)))
    order by p.created_at desc
    limit greatest(1, least(coalesce(p_batas, 30), 100)) offset greatest(coalesce(p_mulai, 0), 0);
end $$;

-- 5. Daftar username verified (publik di antara anggota; hanya username)
create or replace function daftar_verified() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(username), '{}'::text[])
  from (select username from profiles where verified order by verified_at limit 5000) s;
$$;

-- Hak akses
revoke execute on function admin_set_verified(uuid, boolean, text) from public, anon;
grant  execute on function admin_set_verified(uuid, boolean, text) to authenticated;
revoke execute on function admin_cari_pengguna(text, int, int) from public, anon;
grant  execute on function admin_cari_pengguna(text, int, int) to authenticated;
revoke execute on function daftar_verified() from public, anon;
grant  execute on function daftar_verified() to authenticated;
revoke execute on function jaga_verified() from public, anon, authenticated;

-- =====================================================================
-- PEMERIKSAAN (jalankan satu per satu setelah migrasi)
-- 1) Harus 2 baris (verified, verified_at):
--      select column_name from information_schema.columns where table_name = 'profiles' and column_name like 'verified%';
-- 2) Harus 1 baris (jaga_verified_trg):
--      select tgname from pg_trigger where tgname = 'jaga_verified_trg';
-- 3) Fungsi baru TIDAK boleh bisa dipanggil anon. Harus 0 baris:
--      select p.proname from pg_proc p where p.proname in ('admin_set_verified','daftar_verified','admin_cari_pengguna')
--        and has_function_privilege('anon', p.oid, 'execute');
-- 4) Uji manual: beri lencana ke dirimu sendiri lewat panel, lalu cabut lagi. Cek tab Jejak.
--
-- Pembatalan (rollback):
--   drop trigger if exists jaga_verified_trg on profiles;
--   drop function if exists admin_set_verified(uuid, boolean, text);
--   drop function if exists daftar_verified();
--   alter table profiles drop column if exists verified, drop column if exists verified_at;
--   lalu jalankan ulang 020 agar admin_cari_pengguna kembali ke versi lama.
-- =====================================================================

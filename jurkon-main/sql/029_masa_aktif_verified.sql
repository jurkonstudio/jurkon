-- JURKON 029: masa aktif lencana verified (permanen atau berbatas waktu).
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Syarat: 028 sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.
--
-- Bawaan tetap PERMANEN (verified_sampai kosong). Admin bisa memilih 7 / 30 / 90 / 365 hari di dialog panel.
-- Lencana berbatas waktu padam sendiri tanpa pekerjaan terjadwal: daftar_verified() dan admin_cari_pengguna()
-- hanya menghitung lencana yang belum lewat tanggalnya.

alter table profiles add column if not exists verified_sampai timestamptz;

-- Penjaga kolom: sekarang melindungi verified_sampai juga
create or replace function jaga_verified() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;
  if current_setting('jurkon.verified_ok', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.verified_at := null; new.verified_sampai := null;
  else
    new.verified := old.verified; new.verified_at := old.verified_at; new.verified_sampai := old.verified_sampai;
  end if;
  return new;
end $$;

-- Beri / ubah / cabut. p_hari: kosong atau 0 = permanen; 1..3650 = berakhir sekian hari dari sekarang.
drop function if exists admin_set_verified(uuid, boolean, text);
drop function if exists admin_set_verified(uuid, boolean, text, int);
create or replace function admin_set_verified(target uuid, p_nilai boolean default true, p_alasan text default null, p_hari int default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_nama text; v_nilai boolean := coalesce(p_nilai, true); v_hari int := coalesce(p_hari, 0);
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if v_hari < 0 or v_hari > 3650 then raise exception 'Masa aktif tidak valid.'; end if;
  select username into v_nama from profiles where id = target;
  if v_nama is null then raise exception 'Akun tidak ditemukan.'; end if;
  perform set_config('jurkon.verified_ok', '1', true);
  update profiles set
    verified = v_nilai,
    verified_at = case when v_nilai then coalesce(verified_at, now()) else null end,
    verified_sampai = case when v_nilai and v_hari > 0 then now() + make_interval(days => v_hari) else null end
  where id = target;
  perform set_config('jurkon.verified_ok', '', true);
  perform catat_admin(case when v_nilai then 'beri_verified' else 'cabut_verified' end, target::text,
                      '@' || v_nama
                      || case when v_nilai then ' | ' || case when v_hari > 0 then v_hari || ' hari' else 'permanen' end else '' end
                      || case when p_alasan is not null then ' | ' || p_alasan else '' end);
end $$;

-- Cari pengguna: lencana = aktif sekarang; kolom baru lencana_sampai di AKHIR
drop function if exists admin_cari_pengguna(text, int, int);
create or replace function admin_cari_pengguna(p_cari text default '', p_batas int default 30, p_mulai int default 0)
returns table (
  id uuid, username text, nama text, email text, foto text,
  dibuat timestamptz, masuk_terakhir timestamptz, terverifikasi boolean,
  dibekukan boolean, alasan_beku text, jml_posting bigint, laporan_baru bigint, adalah_admin boolean,
  lencana boolean, lencana_sampai timestamptz
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
           (p.verified and (p.verified_sampai is null or p.verified_sampai > now())),
           case when p.verified and (p.verified_sampai is null or p.verified_sampai > now()) then p.verified_sampai end
    from profiles p
    join auth.users u on u.id = p.id
    left join pembekuan b on b.user_id = p.id
    where q is null
       or (lower(q) = ':verified' and p.verified and (p.verified_sampai is null or p.verified_sampai > now()))
       or (lower(q) <> ':verified' and (
              p.username ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
           or coalesce(p.nama, '') ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
           or u.email ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
           or p.id::text = lower(q)))
    order by p.created_at desc
    limit greatest(1, least(coalesce(p_batas, 30), 100)) offset greatest(coalesce(p_mulai, 0), 0);
end $$;

-- Daftar untuk klien: hanya yang masih aktif
create or replace function daftar_verified() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(username), '{}'::text[])
  from (select username from profiles
        where verified and (verified_sampai is null or verified_sampai > now())
        order by verified_at limit 5000) s;
$$;

revoke execute on function admin_set_verified(uuid, boolean, text, int) from public, anon;
grant  execute on function admin_set_verified(uuid, boolean, text, int) to authenticated;
revoke execute on function admin_cari_pengguna(text, int, int) from public, anon;
grant  execute on function admin_cari_pengguna(text, int, int) to authenticated;
revoke execute on function daftar_verified() from public, anon;
grant  execute on function daftar_verified() to authenticated;

-- =====================================================================
-- PEMERIKSAAN
-- 1) Harus 1 baris (verified_sampai):
--      select column_name from information_schema.columns where table_name = 'profiles' and column_name = 'verified_sampai';
-- 2) Harus 1 baris (hanya versi 4 argumen):
--      select pg_get_function_identity_arguments(oid) from pg_proc where proname = 'admin_set_verified';
-- 3) Harus 0 baris (anon tidak boleh memanggil):
--      select p.proname from pg_proc p where p.proname in ('admin_set_verified','daftar_verified','admin_cari_pengguna')
--        and has_function_privilege('anon', p.oid, 'execute');
--
-- Pembatalan: alter table profiles drop column if exists verified_sampai; lalu jalankan ulang 028
-- (fungsi 028 kembali menjadi versi tanpa masa aktif).
-- =====================================================================

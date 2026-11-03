-- JURKON 043: detail perangkat pada riwayat sesi login.
-- Menambah: model perangkat (contoh "SM-S918B", "iPhone"), versi OS, versi peramban, dan cara masuk (email / google).
-- Bergantung pada 041_sesi_login.sql. Aman diulang. Jalankan di Supabase SQL Editor SEBELUM memasang
-- Edge Function `catat-sesi` dan JS terbaru.

alter table sesi_login add column if not exists model          text;
alter table sesi_login add column if not exists os_versi       text;
alter table sesi_login add column if not exists peramban_versi text;
alter table sesi_login add column if not exists metode         text;   -- email | google | ...

-- catat_sesi: tanda tangan baru (+4 parameter). Yang lama dihapus supaya tidak ada dua versi.
drop function if exists catat_sesi(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text);

create or replace function catat_sesi(
  p_user uuid, p_session uuid, p_perangkat text, p_jenis text, p_os text, p_peramban text,
  p_ip_samar text, p_kota text, p_wilayah text, p_negara text, p_kode_negara text,
  p_provider text, p_asn text,
  p_model text default null, p_os_versi text default null, p_peramban_versi text default null, p_metode text default null
) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if p_user is null or p_session is null then raise exception 'tidak valid'; end if;
  if not exists (select 1 from auth.sessions s where s.id = p_session and s.user_id = p_user) then
    raise exception 'sesi tidak ditemukan';
  end if;

  insert into sesi_login (session_id, user_id, perangkat, jenis, os, peramban, ip_samar, kota, wilayah, negara,
                          kode_negara, provider, asn, model, os_versi, peramban_versi, metode)
  values (p_session, p_user, left(p_perangkat, 80), case when p_jenis in ('ponsel','tablet','desktop','lain') then p_jenis else 'lain' end,
          left(p_os, 40), left(p_peramban, 40), left(p_ip_samar, 60), left(p_kota, 80), left(p_wilayah, 80),
          left(p_negara, 80), left(upper(p_kode_negara), 2), left(p_provider, 120), left(p_asn, 20),
          left(p_model, 60), left(p_os_versi, 30), left(p_peramban_versi, 30), left(lower(p_metode), 20))
  on conflict (session_id) do update set
    perangkat = excluded.perangkat, jenis = excluded.jenis, os = excluded.os, peramban = excluded.peramban,
    ip_samar = excluded.ip_samar,
    kota = coalesce(excluded.kota, sesi_login.kota), wilayah = coalesce(excluded.wilayah, sesi_login.wilayah),
    negara = coalesce(excluded.negara, sesi_login.negara), kode_negara = coalesce(excluded.kode_negara, sesi_login.kode_negara),
    provider = coalesce(excluded.provider, sesi_login.provider), asn = coalesce(excluded.asn, sesi_login.asn),
    model = coalesce(excluded.model, sesi_login.model), os_versi = coalesce(excluded.os_versi, sesi_login.os_versi),
    peramban_versi = coalesce(excluded.peramban_versi, sesi_login.peramban_versi),
    metode = coalesce(excluded.metode, sesi_login.metode),
    terakhir_at = now()
  where sesi_login.user_id = p_user;

  delete from sesi_login l
   where l.user_id = p_user
     and not exists (select 1 from auth.sessions s where s.id = l.session_id);
  delete from sesi_login l
   where l.user_id = p_user
     and l.session_id in (select session_id from sesi_login where user_id = p_user
                          order by terakhir_at desc offset 30);
end $$;

-- daftar_sesi: kolom hasil bertambah, jadi harus dibuat ulang (tipe kembalian tidak bisa diubah in-place).
drop function if exists daftar_sesi();

create or replace function daftar_sesi() returns table (
  session_id uuid, perangkat text, jenis text, os text, peramban text, ip_samar text,
  kota text, wilayah text, negara text, kode_negara text, provider text,
  masuk_at timestamptz, terakhir_at timestamptz, ini boolean,
  model text, os_versi text, peramban_versi text, metode text
)
language plpgsql stable security definer set search_path = public, auth as $$
declare skr uuid;
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  begin skr := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then skr := null; end;
  return query
    select l.session_id, l.perangkat, l.jenis, l.os, l.peramban, l.ip_samar, l.kota, l.wilayah, l.negara,
           l.kode_negara, l.provider, l.masuk_at, l.terakhir_at, (l.session_id = skr),
           l.model, l.os_versi, l.peramban_versi, l.metode
      from sesi_login l
     where l.user_id = auth.uid()
       and exists (select 1 from auth.sessions s where s.id = l.session_id and s.user_id = auth.uid())
     order by (l.session_id = skr) desc, l.terakhir_at desc
     limit 30;
end $$;

revoke execute on function catat_sesi(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant  execute on function catat_sesi(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;
revoke execute on function daftar_sesi() from public, anon;
grant  execute on function daftar_sesi() to authenticated;

notify pgrst, 'reload schema';

-- JURKON 041: riwayat sesi login (lokasi, perangkat, provider) + keluar dari perangkat lain.
--
-- Cara kerja:
--   * Edge Function `catat-sesi` (supabase/functions/catat-sesi) membaca IP asli dari header permintaan,
--     mencari kota/negara/provider lewat layanan geolokasi IP, lalu memanggil catat_sesi() di bawah.
--     Hanya service_role yang boleh memanggil catat_sesi(), jadi klien TIDAK bisa memalsukan lokasi.
--   * Klien memanggil daftar_sesi() (hanya milik sendiri), keluarkan_sesi(id), keluarkan_sesi_lain().
--   * Baris otomatis hilang saat sesinya berakhir (daftar_sesi hanya menampilkan yang masih ada di auth.sessions,
--     dan catat_sesi membersihkan baris yatim) dan saat akun dihapus (on delete cascade).
--   * IP TIDAK disimpan utuh: IPv4 disamarkan oktet terakhirnya (203.0.113.x), IPv6 hanya 3 blok pertama.
--
-- Jalankan di Supabase SQL Editor SEBELUM mengunggah kode JS terbaru. Aman diulang.

-- =====================================================================
-- A. Tabel
-- =====================================================================
create table if not exists sesi_login (
  session_id   uuid primary key,                                   -- = auth.sessions.id = klaim session_id di JWT
  user_id      uuid not null references auth.users(id) on delete cascade,
  perangkat    text,          -- contoh: "Chrome di Android"
  jenis        text check (jenis in ('ponsel', 'tablet', 'desktop', 'lain')),
  os           text,
  peramban     text,
  ip_samar     text,          -- contoh: 203.0.113.x
  kota         text,
  wilayah      text,
  negara       text,
  kode_negara  text,
  provider     text,          -- ISP / operator, contoh: "Telkomsel"
  asn          text,
  masuk_at     timestamptz not null default now(),
  terakhir_at  timestamptz not null default now()
);
create index if not exists sesi_login_user_idx on sesi_login (user_id, terakhir_at desc);

alter table sesi_login enable row level security;
-- Tanpa kebijakan sama sekali: klien tidak bisa membaca/menulis tabel ini langsung. Semua lewat fungsi di bawah.
revoke all on sesi_login from anon, authenticated;

-- =====================================================================
-- B. Dicatat oleh Edge Function (service_role saja)
-- =====================================================================
create or replace function catat_sesi(
  p_user uuid, p_session uuid, p_perangkat text, p_jenis text, p_os text, p_peramban text,
  p_ip_samar text, p_kota text, p_wilayah text, p_negara text, p_kode_negara text,
  p_provider text, p_asn text
) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if p_user is null or p_session is null then raise exception 'tidak valid'; end if;
  -- Hanya untuk sesi yang benar-benar milik pengguna itu.
  if not exists (select 1 from auth.sessions s where s.id = p_session and s.user_id = p_user) then
    raise exception 'sesi tidak ditemukan';
  end if;

  insert into sesi_login (session_id, user_id, perangkat, jenis, os, peramban, ip_samar, kota, wilayah, negara,
                          kode_negara, provider, asn)
  values (p_session, p_user, left(p_perangkat, 80), case when p_jenis in ('ponsel','tablet','desktop','lain') then p_jenis else 'lain' end,
          left(p_os, 40), left(p_peramban, 40), left(p_ip_samar, 60), left(p_kota, 80), left(p_wilayah, 80),
          left(p_negara, 80), left(upper(p_kode_negara), 2), left(p_provider, 120), left(p_asn, 20))
  on conflict (session_id) do update set
    perangkat = excluded.perangkat, jenis = excluded.jenis, os = excluded.os, peramban = excluded.peramban,
    ip_samar = excluded.ip_samar,
    kota = coalesce(excluded.kota, sesi_login.kota), wilayah = coalesce(excluded.wilayah, sesi_login.wilayah),
    negara = coalesce(excluded.negara, sesi_login.negara), kode_negara = coalesce(excluded.kode_negara, sesi_login.kode_negara),
    provider = coalesce(excluded.provider, sesi_login.provider), asn = coalesce(excluded.asn, sesi_login.asn),
    terakhir_at = now()
  where sesi_login.user_id = p_user;

  -- Rapikan: buang baris yang sesinya sudah tidak ada, dan batasi 30 baris terbaru per akun.
  delete from sesi_login l
   where l.user_id = p_user
     and not exists (select 1 from auth.sessions s where s.id = l.session_id);
  delete from sesi_login l
   where l.user_id = p_user
     and l.session_id in (select session_id from sesi_login where user_id = p_user
                          order by terakhir_at desc offset 30);
end $$;

-- =====================================================================
-- C. Dipakai klien (hanya milik sendiri)
-- =====================================================================
create or replace function daftar_sesi() returns table (
  session_id uuid, perangkat text, jenis text, os text, peramban text, ip_samar text,
  kota text, wilayah text, negara text, kode_negara text, provider text,
  masuk_at timestamptz, terakhir_at timestamptz, ini boolean
)
language plpgsql stable security definer set search_path = public, auth as $$
declare skr uuid;
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  begin skr := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then skr := null; end;
  return query
    select l.session_id, l.perangkat, l.jenis, l.os, l.peramban, l.ip_samar, l.kota, l.wilayah, l.negara,
           l.kode_negara, l.provider, l.masuk_at, l.terakhir_at, (l.session_id = skr)
      from sesi_login l
     where l.user_id = auth.uid()
       and exists (select 1 from auth.sessions s where s.id = l.session_id and s.user_id = auth.uid())
     order by (l.session_id = skr) desc, l.terakhir_at desc
     limit 30;
end $$;

create or replace function keluarkan_sesi(p_session uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare skr uuid;
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  begin skr := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then skr := null; end;
  if p_session = skr then raise exception 'Gunakan tombol Keluar untuk perangkat ini.'; end if;
  delete from auth.sessions where id = p_session and user_id = auth.uid();
  delete from sesi_login where session_id = p_session and user_id = auth.uid();
end $$;

create or replace function keluarkan_sesi_lain() returns integer
language plpgsql security definer set search_path = public, auth as $$
declare skr uuid; n integer;
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  begin skr := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then skr := null; end;
  if skr is null then raise exception 'sesi saat ini tidak dikenali'; end if;
  with d as (delete from auth.sessions where user_id = auth.uid() and id <> skr returning 1)
  select count(*) into n from d;
  delete from sesi_login where user_id = auth.uid() and session_id <> skr;
  return n;
end $$;

-- =====================================================================
-- D. Hak akses
-- =====================================================================
revoke execute on function catat_sesi(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant  execute on function catat_sesi(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text) to service_role;

revoke execute on function daftar_sesi()           from public, anon;
revoke execute on function keluarkan_sesi(uuid)    from public, anon;
revoke execute on function keluarkan_sesi_lain()   from public, anon;
grant  execute on function daftar_sesi()           to authenticated;
grant  execute on function keluarkan_sesi(uuid)    to authenticated;
grant  execute on function keluarkan_sesi_lain()   to authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- CEK (jalankan terpisah). Hasil yang benar:
--   1) tepat 3 baris (fungsi yang boleh dipanggil login, tidak ada untuk anon):
--      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' and p.proname in ('daftar_sesi','keluarkan_sesi','keluarkan_sesi_lain')
--         and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute');
--   2) 0 baris (klien tidak boleh membaca tabel langsung):
--      select 1 where has_table_privilege('authenticated', 'public.sesi_login', 'select')
--                  or has_table_privilege('anon', 'public.sesi_login', 'select');
-- =====================================================================

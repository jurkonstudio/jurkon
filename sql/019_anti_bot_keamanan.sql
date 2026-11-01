-- JURKON 019: pengerasan keamanan & anti-bot di sisi database.
-- Jalankan di Supabase SQL Editor (setelah 002-018). Aman dijalankan ulang.
-- Jalankan SEBELUM mengunggah kode terbaru ke GitHub.
--
-- Isi:
--  A. Gerbang akun: hanya akun yang emailnya TERVERIFIKASI dan TIDAK DIBEKUKAN yang boleh posting,
--     kirim pesan, suka, ikuti, lapor (ditegakkan di database, tidak bisa dilewati lewat API).
--  B. Pembekuan akun oleh admin (bekukan_akun / buka_pembekuan) + sesi akun itu dicabut.
--  C. Tolak email sekali pakai saat mendaftar (daftar domain bisa ditambah lewat SQL).
--  D. Tolak karakter tak terlihat / kontrol di posting, pesan, profil, laporan (spoofing, teks berbalik arah).
--  E. Cabut hak anon: anon tidak boleh menjalankan fungsi atau menyentuh tabel; daftar file avatar tidak publik.
--  F. Pemeriksaan akhir (hasil harus KOSONG).

-- =====================================================================
-- A + B. Pembekuan & gerbang akun
-- =====================================================================
create table if not exists pembekuan (
  user_id uuid primary key references auth.users on delete cascade,
  alasan text check (char_length(alasan) <= 300),
  oleh uuid,
  created_at timestamptz not null default now()
);
alter table pembekuan enable row level security;   -- tanpa kebijakan: klien tidak bisa membaca/menulis langsung
revoke all on pembekuan from anon, authenticated;

create or replace function gerbang_akun() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare j jsonb := to_jsonb(new); uid uuid;
begin
  uid := coalesce(j->>'user_id', j->>'sender_id', j->>'follower_id', j->>'reporter_id')::uuid;
  if uid is null then return new; end if;
  if exists (select 1 from pembekuan where user_id = uid) then
    raise exception 'Akunmu sedang dibekukan. Hubungi admin bila ini keliru.';
  end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'Verifikasi emailmu dulu sebelum berinteraksi.';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['posts','messages','likes','dislikes','follows','reports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists a_gerbang_akun_trg on public.%I', t);
      -- awalan "a_" membuat gerbang berjalan paling awal, sebelum pembatas laju
      execute format('create trigger a_gerbang_akun_trg before insert on public.%I for each row execute function gerbang_akun()', t);
    end if;
  end loop;
end $$;

create or replace function bekukan_akun(target uuid, p_alasan text default null) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if target is null or target = auth.uid() then raise exception 'tidak valid'; end if;
  if exists (select 1 from admins where user_id = target) then raise exception 'Admin tidak bisa dibekukan.'; end if;
  insert into pembekuan (user_id, alasan, oleh) values (target, left(p_alasan, 300), auth.uid())
    on conflict (user_id) do update set alasan = excluded.alasan, oleh = excluded.oleh;
  begin
    delete from auth.sessions where user_id = target;      -- paksa keluar dari semua perangkat
  exception when others then null;
  end;
end $$;

create or replace function buka_pembekuan(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  delete from pembekuan where user_id = target;
end $$;

-- =====================================================================
-- C. Tolak email sekali pakai saat daftar / ganti email
-- =====================================================================
create table if not exists domain_sekali_pakai (domain text primary key check (domain = lower(domain)));
alter table domain_sekali_pakai enable row level security;
revoke all on domain_sekali_pakai from anon, authenticated;
insert into domain_sekali_pakai (domain) values
  ('mailinator.com'),('guerrillamail.com'),('guerrillamail.net'),('guerrillamail.org'),('guerrillamail.biz'),
  ('guerrillamailblock.com'),('sharklasers.com'),('grr.la'),('pokemail.net'),('spam4.me'),
  ('10minutemail.com'),('10minutemail.net'),('20minutemail.com'),('tempmail.com'),('temp-mail.org'),
  ('temp-mail.io'),('tempmail.net'),('tempmailo.com'),('tempail.com'),('tempinbox.com'),('tmpmail.org'),
  ('tmpmail.net'),('throwawaymail.com'),('yopmail.com'),('yopmail.net'),('yopmail.fr'),('trashmail.com'),
  ('trashmail.net'),('trashmail.de'),('getnada.com'),('nada.email'),('maildrop.cc'),('dispostable.com'),
  ('fakeinbox.com'),('mintemail.com'),('mohmal.com'),('emailondeck.com'),('burnermail.io'),('discard.email'),
  ('discardmail.com'),('spamgourmet.com'),('mailnesia.com'),('moakt.com'),('inboxkitten.com'),
  ('mytemp.email'),('mailcatch.com'),('emailfake.com'),('fakemailgenerator.com'),('harakirimail.com'),
  ('mailtemp.net'),('mail.tm'),('tempr.email'),('getairmail.com'),('anonbox.net'),('dropmail.me'),
  ('luxusmail.org'),('mailforspam.com'),('spambox.us'),('trash-mail.com'),('wegwerfmail.de'),('einrot.com')
on conflict do nothing;

create or replace function tolak_email_sekali_pakai() returns trigger
language plpgsql security definer set search_path = public as $$
declare d text;
begin
  if new.email is null then return new; end if;
  d := split_part(lower(new.email), '@', 2);
  if exists (select 1 from domain_sekali_pakai s
             where s.domain = d or right(d, char_length(s.domain) + 1) = '.' || s.domain) then
    raise exception 'Email sementara atau sekali pakai tidak diterima. Gunakan email aktif milikmu.';
  end if;
  return new;
end $$;
drop trigger if exists tolak_email_sekali_pakai_trg on auth.users;
create trigger tolak_email_sekali_pakai_trg before insert or update of email on auth.users
  for each row execute function tolak_email_sekali_pakai();

-- =====================================================================
-- D. Tolak karakter tak terlihat / kontrol
--    Dilarang: kontrol C0 (kecuali tab, baris baru, CR), DEL, spasi lebar-nol (U+200B), U+2060-2064,
--    penimpa arah teks (U+202A-202E, U+2066-2069), BOM (U+FEFF). ZWJ/ZWNJ tetap boleh (dipakai emoji/aksara).
-- =====================================================================
create or replace function tolak_karakter_kontrol() returns trigger
language plpgsql as $$
declare j jsonb := to_jsonb(new); k text; v text;
begin
  foreach k in array array['content','nama','bio','alasan','username'] loop
    v := j->>k;
    if v is not null and v ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f​⁠-⁤‪-‮⁦-⁩﻿]' then
      raise exception 'Tulisan memuat karakter tak terlihat yang tidak diizinkan.';
    end if;
  end loop;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['posts','messages','profiles','reports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists b_tolak_karakter_trg on public.%I', t);
      execute format('create trigger b_tolak_karakter_trg before insert or update on public.%I for each row execute function tolak_karakter_kontrol()', t);
    end if;
  end loop;
end $$;

-- =====================================================================
-- E. Cabut hak anon dan batasi fungsi
--    Aplikasi mewajibkan login di semua halaman, jadi anon (kunci publik tanpa login) tidak perlu apa pun.
-- =====================================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
do $$ begin
  -- Supabase membuat objek baru atas nama supabase_admin juga; abaikan bila tidak berwenang
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon';
  execute 'alter default privileges for role supabase_admin in schema public revoke execute on functions from public, anon';
exception when others then null;
end $$;

-- Semua fungsi lain: hanya pengguna yang sudah masuk. (Fungsi milik ekstensi tidak disentuh.)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig, (p.prorettype = 'trigger'::regtype) as pemicu
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    if not r.pemicu then
      execute format('grant execute on function %s to authenticated, service_role', r.sig);
    end if;
  end loop;
end $$;

-- Fungsi publik yang SENGAJA boleh dipanggil tanpa login (halaman landing, Jelajahi, tautan catatan publik).
-- Tanpa blok ini, menjalankan ulang 019 membuat jelajahi.html "Gagal memuat". Hanya fungsi yang ada yang disentuh.
do $$
declare nama text; r record;
begin
  foreach nama in array array['catatan_publik', 'daftar_publik', 'landing_publik', 'jelajahi_publik', 'catat_corong'] loop
    for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = nama and p.prokind = 'f'
    loop
      execute format('grant execute on function %s to anon, authenticated, service_role', r.sig);
    end loop;
  end loop;
end $$;

-- Fungsi perawatan: hanya server (cron / edge function), bukan klien
do $$ begin
  if to_regprocedure('public.media_pesan_kedaluwarsa(integer)') is not null then
    revoke execute on function media_pesan_kedaluwarsa(integer) from authenticated;
  end if;
  if to_regprocedure('public.bersihkan_notifikasi(integer)') is not null then
    revoke execute on function bersihkan_notifikasi(integer) from authenticated;
  end if;
end $$;

-- Daftar isi bucket avatar tidak lagi terbuka untuk anon (mencegah pendataan ID pengguna dari nama folder).
-- Gambar tetap tampil karena bucket publik melayani URL langsung tanpa kebijakan select.
drop policy if exists "avatar dibaca" on storage.objects;
create policy "avatar dibaca" on storage.objects for select to authenticated
  using (bucket_id = 'avatar');

-- =====================================================================
-- F. PEMERIKSAAN AKHIR - hasil di bawah harus KOSONG (0 baris)
-- =====================================================================
select 'tabel tanpa RLS' as masalah, c.relname::text as nama
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'fungsi masih terbuka untuk anon', p.oid::regprocedure::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and has_function_privilege('anon', p.oid, 'execute')
  and p.proname not in ('catatan_publik', 'daftar_publik', 'landing_publik', 'jelajahi_publik', 'catat_corong')
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');

-- Operasional admin (jalankan manual di SQL Editor bila perlu):
--   select bekukan_akun('<uuid>', 'alasan');        select buka_pembekuan('<uuid>');
--   insert into domain_sekali_pakai values ('contoh-sementara.com');

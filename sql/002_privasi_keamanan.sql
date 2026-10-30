-- JURKON - Migrasi 002: privasi & keamanan (P0)
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run.
-- Aman diulang (memakai IF NOT EXISTS / OR REPLACE), tapi tidak perlu.
-- JANGAN jalankan ulang schema.sql.

-- =====================================================================
-- A. Username netral (tidak lagi dari email) + pilih username sendiri
-- =====================================================================
alter table profiles add column if not exists siap boolean not null default false;

create or replace function buat_username() returns text
language plpgsql volatile as $$
declare
  u text;
  huruf text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
begin
  loop
    u := 'pengguna_';
    for i in 1..6 loop
      u := u || substr(huruf, 1 + floor(random() * length(huruf))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where username = u);
  end loop;
  return u;
end $$;

create or replace function buat_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username) values (new.id, buat_username());
  return new;
end $$;

-- Bersihkan akun lama: nama dari email dihapus, username berpola email diganti
update profiles p set nama = null
  from auth.users u
  where u.id = p.id and p.nama = split_part(u.email, '@', 1);

update profiles p set username = buat_username()
  from auth.users u
  where u.id = p.id
    and p.username ~ ('^' || lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || '[0-9]{3}$');

-- Username yang dicadangkan tidak boleh dipakai
create or replace function cek_username() returns trigger
language plpgsql as $$
declare periksa boolean := false;
begin
  if tg_op = 'INSERT' then
    periksa := true;
  elsif new.username is distinct from old.username then
    periksa := true;
  end if;
  if periksa and new.username in ('admin','administrator','jurkon','jurnalkoneksi','moderator','mod',
                                  'support','bantuan','help','system','sistem','official','resmi',
                                  'root','null','undefined','anonymous') then
    raise exception 'Username ini tidak tersedia.';
  end if;
  return new;
end $$;
drop trigger if exists cek_username_trg on profiles;
create trigger cek_username_trg before insert or update on profiles
  for each row execute function cek_username();

drop policy if exists "ubah profil sendiri" on profiles;
create policy "ubah profil sendiri" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- =====================================================================
-- B. Blokir
-- =====================================================================
alter table blocks drop constraint if exists blokir_bukan_diri;
alter table blocks add constraint blokir_bukan_diri check (blocker_id <> blocked_id);

-- Benar bila salah satu memblokir yang lain (mengabaikan RLS agar dua arah terbaca)
create or replace function ada_blokir(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function blokir(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or target = auth.uid() then raise exception 'tidak valid'; end if;
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), target) on conflict do nothing;
  delete from follows
    where (follower_id = auth.uid() and following_id = target)
       or (follower_id = target and following_id = auth.uid());
end $$;

create or replace function buka_percakapan(lawan uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; cid uuid;
begin
  if auth.uid() is null or lawan = auth.uid() then raise exception 'tidak valid'; end if;
  if ada_blokir(auth.uid(), lawan) then
    raise exception 'Tidak dapat mengirim pesan ke pengguna ini.';
  end if;
  a := least(auth.uid(), lawan); b := greatest(auth.uid(), lawan);
  select id into cid from conversations where user_a = a and user_b = b;
  if cid is null then
    insert into conversations (user_a, user_b) values (a, b) returning id into cid;
  end if;
  return cid;
end $$;

drop policy if exists "pesan dikirim peserta" on messages;
create policy "pesan dikirim peserta" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from conversations c
          where c.id = conversation_id
            and auth.uid() in (c.user_a, c.user_b)
            and not ada_blokir(c.user_a, c.user_b)));

drop policy if exists "ikuti sendiri" on follows;
create policy "ikuti sendiri" on follows for insert with check (
  auth.uid() = follower_id and not ada_blokir(follower_id, following_id));

-- =====================================================================
-- C. Data hanya dapat dibaca anggota yang sudah masuk (bukan publik anonim)
--    Aplikasi memang mewajibkan login di semua halaman. Posting dari/ke
--    pengguna yang saling blokir otomatis tersembunyi.
-- =====================================================================
drop policy if exists "profil dibaca semua" on profiles;
drop policy if exists "profil dibaca anggota" on profiles;
create policy "profil dibaca anggota" on profiles for select using (auth.uid() is not null);

drop policy if exists "posting dibaca semua" on posts;
drop policy if exists "posting dibaca anggota" on posts;
create policy "posting dibaca anggota" on posts for select
  using (auth.uid() is not null and not ada_blokir(auth.uid(), user_id));

drop policy if exists "like dibaca semua" on likes;
drop policy if exists "like dibaca anggota" on likes;
create policy "like dibaca anggota" on likes for select using (auth.uid() is not null);

drop policy if exists "follow dibaca semua" on follows;
drop policy if exists "follow dibaca anggota" on follows;
create policy "follow dibaca anggota" on follows for select using (auth.uid() is not null);

-- =====================================================================
-- D. Pembatasan laju (anti-spam)
--    Posting+balasan: 5/menit, 50/hari. Pesan: 15/menit, 300/hari.
--    Laporan: 10/hari. Ubah angka di bawah bila perlu.
-- =====================================================================
create index if not exists posts_user_waktu on posts (user_id, created_at desc);
create index if not exists messages_pengirim_waktu on messages (sender_id, created_at desc);
create index if not exists reports_pelapor_waktu on reports (reporter_id, created_at desc);

create or replace function batasi_posting() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; hari int; penulis uuid;
begin
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into menit, hari
    from posts where user_id = new.user_id and created_at > now() - interval '1 day';
  if menit >= 5 then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if hari >= 50 then raise exception 'Batas posting harian tercapai (50). Coba lagi besok.'; end if;
  if new.parent_id is not null then
    select user_id into penulis from posts where id = new.parent_id;
    if penulis is null then raise exception 'Posting yang dibalas tidak ditemukan.'; end if;
    if ada_blokir(new.user_id, penulis) then raise exception 'Tidak dapat membalas posting ini.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists batasi_posting_trg on posts;
create trigger batasi_posting_trg before insert on posts
  for each row execute function batasi_posting();

create or replace function batasi_pesan() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; hari int;
begin
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into menit, hari
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if menit >= 15 then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if hari >= 300 then raise exception 'Batas pesan harian tercapai. Coba lagi besok.'; end if;
  return new;
end $$;
drop trigger if exists batasi_pesan_trg on messages;
create trigger batasi_pesan_trg before insert on messages
  for each row execute function batasi_pesan();

create or replace function batasi_laporan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Batas laporan harian tercapai.';
  end if;
  return new;
end $$;
drop trigger if exists batasi_laporan_trg on reports;
create trigger batasi_laporan_trg before insert on reports
  for each row execute function batasi_laporan();

-- =====================================================================
-- E. Laporan bisa dibaca admin
-- =====================================================================
create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table admins enable row level security;
drop policy if exists "admin lihat diri" on admins;
create policy "admin lihat diri" on admins for select using (auth.uid() = user_id);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

alter table reports add column if not exists status text not null default 'baru';
alter table reports drop constraint if exists status_laporan;
alter table reports add constraint status_laporan check (status in ('baru','selesai'));
create unique index if not exists laporan_unik on reports (reporter_id, post_id);

drop policy if exists "admin baca laporan" on reports;
create policy "admin baca laporan" on reports for select using (is_admin());
drop policy if exists "admin ubah laporan" on reports;
create policy "admin ubah laporan" on reports for update using (is_admin()) with check (is_admin());
drop policy if exists "admin hapus posting" on posts;
create policy "admin hapus posting" on posts for delete using (is_admin());

-- =====================================================================
-- F. Hapus akun & unduh data saya (UU PDP)
-- =====================================================================
create or replace function hapus_akun() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  delete from auth.users where id = auth.uid();   -- seluruh data ikut terhapus (cascade)
end $$;

create or replace function ekspor_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'tidak valid'; end if;
  return jsonb_build_object(
    'diekspor_pada', now(),
    'email', (select email from auth.users where id = uid),
    'profil', (select to_jsonb(p) from profiles p where p.id = uid),
    'posting', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from posts x where x.user_id = uid), '[]'::jsonb),
    'suka', coalesce((select jsonb_agg(to_jsonb(l)) from likes l where l.user_id = uid), '[]'::jsonb),
    'mengikuti', coalesce((select jsonb_agg(f.following_id) from follows f where f.follower_id = uid), '[]'::jsonb),
    'pengikut', coalesce((select jsonb_agg(f.follower_id) from follows f where f.following_id = uid), '[]'::jsonb),
    'diblokir', coalesce((select jsonb_agg(b.blocked_id) from blocks b where b.blocker_id = uid), '[]'::jsonb),
    'pesan', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at)
                       from messages m join conversations c on c.id = m.conversation_id
                       where uid in (c.user_a, c.user_b)), '[]'::jsonb)
  );
end $$;

-- Fungsi aksi hanya untuk pengguna yang sudah masuk
revoke execute on function hapus_akun() from public, anon;
revoke execute on function ekspor_data() from public, anon;
revoke execute on function blokir(uuid) from public, anon;
grant execute on function hapus_akun() to authenticated;
grant execute on function ekspor_data() to authenticated;
grant execute on function blokir(uuid) to authenticated;

-- =====================================================================
-- LANGKAH MANUAL SETELAH MIGRASI (jangan dijalankan bersamaan):
-- Jadikan dirimu admin (ganti email dengan email akun Jurkon-mu):
--   insert into admins (user_id)
--   select id from auth.users where email = 'EMAIL-KAMU@contoh.com';
-- =====================================================================

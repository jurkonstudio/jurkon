-- =====================================================================
-- JURKON - Pembaruan terbaru (jalankan SEKALI, urut dari atas)
-- Supabase: SQL Editor > New query > tempel SELURUH isi file ini > Run.
-- Isinya: perbaikan 007 (anti-spam) + 013 (dislike, kutip, posting ulang, perangkat)
--         + 014 (notifikasi kutip & posting ulang). Aman dijalankan berulang.
-- Prasyarat: schema.sql dan migrasi 002-006, 008-012 sudah pernah dijalankan.
-- =====================================================================

-- ########## 007_anti_spam.sql (diperbaiki) ##########
-- JURKON 007: anti-spam menyeluruh. Jalankan di Supabase SQL Editor. Aman dijalankan ulang.
-- Menambah/mengganti: batas laju posting, balasan, pesan, suka, ikuti; deteksi duplikat,
-- tautan & mention berlebihan, karakter berulang; batas lebih ketat untuk akun baru (3 hari);
-- batas ganti username sekali sehari.

-- A. Kolom waktu untuk suka & ikuti (baris lama diberi tanggal lama supaya tidak dihitung "baru")
alter table likes add column if not exists created_at timestamptz;
update likes set created_at = '2000-01-01' where created_at is null;
alter table likes alter column created_at set default now();
alter table follows add column if not exists created_at timestamptz;
update follows set created_at = '2000-01-01' where created_at is null;
alter table follows alter column created_at set default now();
alter table profiles add column if not exists username_diubah_at timestamptz;

create index if not exists likes_user_waktu on likes (user_id, created_at desc);
create index if not exists follows_pengikut_waktu on follows (follower_id, created_at desc);
create index if not exists posts_user_waktu on posts (user_id, created_at desc);
create index if not exists messages_pengirim_waktu on messages (sender_id, created_at desc);

-- B. Pembantu
create or replace function akun_baru(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select coalesce(created_at, '2000-01-01') > now() - interval '3 days'
                   from profiles where id = uid), false)
$$;

create or replace function norm_teks(t text) returns text
language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'))
$$;

create or replace function cek_isi_spam(teks text, baru boolean) returns void
language plpgsql stable as $$
declare tautan int; sebut int;
begin
  if teks ~ '(.)\1{14,}' then
    raise exception 'Tulisanmu terlihat seperti spam (karakter berulang). Ringkas dulu ya.';
  end if;
  select count(*) into tautan from regexp_matches(teks, '(https?://|www\.)', 'gi');
  if tautan > (case when baru then 1 else 3 end) then
    raise exception 'Terlalu banyak tautan dalam satu tulisan.';
  end if;
  select count(*) into sebut from regexp_matches(teks, '@[a-z0-9_]{3,20}', 'gi');
  if sebut > (case when baru then 2 else 5 end) then
    raise exception 'Terlalu banyak sebutan @username dalam satu tulisan.';
  end if;
end $$;

-- C. Posting & balasan
create or replace function batasi_posting() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; jam int; hari int; penulis uuid; baru boolean; sama int; balasan int;
        b_menit int; b_jam int; b_hari int;
begin
  baru := akun_baru(new.user_id);
  b_menit := case when baru then 3 else 5 end;
  b_jam := case when baru then 10 else 30 end;
  b_hari := case when baru then 20 else 50 end;
  select count(*) filter (where created_at > now() - interval '1 minute'),
         count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into menit, jam, hari
    from posts where user_id = new.user_id and created_at > now() - interval '1 day';
  if menit >= b_menit then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if jam >= b_jam then raise exception 'Kamu menulis terlalu sering dalam satu jam. Coba lagi nanti.'; end if;
  if hari >= b_hari then raise exception 'Batas posting harian tercapai (%). Coba lagi besok.', b_hari; end if;
  select count(*) into sama from posts
    where user_id = new.user_id and created_at > now() - interval '1 hour'
      and norm_teks(content) = norm_teks(new.content);
  if sama >= 1 then raise exception 'Isi yang sama baru saja kamu kirim. Tulis hal yang berbeda ya.'; end if;
  perform cek_isi_spam(new.content, baru);
  if new.parent_id is not null then
    select user_id into penulis from posts where id = new.parent_id;
    if penulis is null then raise exception 'Posting yang dibalas tidak ditemukan.'; end if;
    if ada_blokir(new.user_id, penulis) then raise exception 'Tidak dapat membalas posting ini.'; end if;
    select count(*) into balasan from posts
      where user_id = new.user_id and parent_id = new.parent_id and created_at > now() - interval '1 hour';
    if balasan >= 5 then raise exception 'Kamu sudah membalas posting ini beberapa kali. Tunggu sebentar.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists batasi_posting_trg on posts;
create trigger batasi_posting_trg before insert on posts
  for each row execute function batasi_posting();

-- D. Pesan pribadi
create or replace function batasi_pesan() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; hari int; baru boolean; siaran int; lawan int; sudah boolean;
begin
  baru := akun_baru(new.sender_id);
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into menit, hari
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if menit >= (case when baru then 8 else 15 end) then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if hari >= (case when baru then 100 else 300 end) then raise exception 'Batas pesan harian tercapai. Coba lagi besok.'; end if;
  perform cek_isi_spam(new.content, baru);
  select count(distinct conversation_id) into siaran from messages
    where sender_id = new.sender_id and created_at > now() - interval '1 hour'
      and conversation_id <> new.conversation_id and norm_teks(content) = norm_teks(new.content);
  if siaran >= 2 then raise exception 'Pesan yang sama sudah kamu kirim ke beberapa orang. Ubah isinya atau tunggu dulu.'; end if;
  select count(distinct conversation_id), coalesce(bool_or(conversation_id = new.conversation_id), false)
    into lawan, sudah
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if not sudah and lawan >= (case when baru then 5 else 30 end) then
    raise exception 'Kamu sudah menghubungi terlalu banyak orang hari ini. Coba lagi besok.';
  end if;
  return new;
end $$;
drop trigger if exists batasi_pesan_trg on messages;
create trigger batasi_pesan_trg before insert on messages
  for each row execute function batasi_pesan();

-- E. Suka
create or replace function batasi_suka() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; hari int; baru boolean;
begin
  baru := akun_baru(new.user_id);
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into menit, hari from likes where user_id = new.user_id and created_at > now() - interval '1 day';
  if menit >= (case when baru then 15 else 40 end) then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if hari >= (case when baru then 100 else 500 end) then raise exception 'Batas suka harian tercapai. Coba lagi besok.'; end if;
  return new;
end $$;
drop trigger if exists batasi_suka_trg on likes;
create trigger batasi_suka_trg before insert on likes
  for each row execute function batasi_suka();

-- F. Ikuti (ikuti-berhenti berulang ikut terhitung karena tiap ikuti = baris baru)
create or replace function batasi_ikuti() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; jam int; hari int; baru boolean;
begin
  baru := akun_baru(new.follower_id);
  select count(*) filter (where created_at > now() - interval '1 minute'),
         count(*) filter (where created_at > now() - interval '1 hour'), count(*)
    into menit, jam, hari from follows where follower_id = new.follower_id and created_at > now() - interval '1 day';
  if menit >= (case when baru then 5 else 10 end) then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if jam >= (case when baru then 20 else 60 end) then raise exception 'Kamu mengikuti terlalu banyak akun dalam satu jam. Coba lagi nanti.'; end if;
  if hari >= (case when baru then 60 else 200 end) then raise exception 'Batas ikuti harian tercapai. Coba lagi besok.'; end if;
  return new;
end $$;
drop trigger if exists batasi_ikuti_trg on follows;
create trigger batasi_ikuti_trg before insert on follows
  for each row execute function batasi_ikuti();

-- G. Ganti username: sekali sehari (kolom penanda tidak bisa dipalsukan dari klien)
create or replace function batasi_username() returns trigger
language plpgsql as $$
begin
  if new.username is distinct from old.username then
    if old.username_diubah_at is not null and old.username_diubah_at > now() - interval '1 day' then
      raise exception 'Username hanya bisa diganti sekali dalam sehari.';
    end if;
    new.username_diubah_at := now();
  else
    new.username_diubah_at := old.username_diubah_at;
  end if;
  return new;
end $$;
drop trigger if exists batasi_username_trg on profiles;
create trigger batasi_username_trg before update on profiles
  for each row execute function batasi_username();

-- ########## 013_perangkat_dislike_kutip.sql ##########
-- JURKON 013: penanda perangkat, dislike, kutip, dan posting ulang.
-- Jalankan di Supabase: SQL Editor > New query > Run. Aman dijalankan berulang.
-- Prasyarat: migrasi 002-012 sudah dijalankan.

-- ============ A. Kolom baru di posts ============
alter table posts add column if not exists perangkat text;
alter table posts add column if not exists jenis text not null default 'biasa';
alter table posts add column if not exists kutip_id uuid references posts(id) on delete set null;

alter table posts drop constraint if exists posts_perangkat_cek;
alter table posts add constraint posts_perangkat_cek check (perangkat is null or perangkat in ('ios', 'android', 'web'));
alter table posts drop constraint if exists posts_jenis_cek;
alter table posts add constraint posts_jenis_cek check (jenis in ('biasa', 'kutip', 'ulang'));

-- Posting ulang tidak punya teks; selain itu isi tetap 1-250 karakter
alter table posts drop constraint if exists posts_content_check;
alter table posts drop constraint if exists posts_isi_cek;
alter table posts add constraint posts_isi_cek check (char_length(content) <= 250 and (jenis = 'ulang' or char_length(content) >= 1));

create index if not exists posts_kutip_idx on posts (kutip_id) where kutip_id is not null;
create unique index if not exists posts_ulang_unik on posts (user_id, kutip_id) where jenis = 'ulang';

-- Bila posting asli dihapus, posting ulang miliknya ikut hilang (kutipan tetap ada, tampil "tidak tersedia")
create or replace function hapus_ulang_terkait() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from posts where kutip_id = old.id and jenis = 'ulang';
  return old;
end $$;
drop trigger if exists hapus_ulang_trg on posts;
create trigger hapus_ulang_trg before delete on posts
  for each row execute function hapus_ulang_terkait();

-- ============ B. Pembatas posting (versi 007 + dukungan kutip/ulang) ============
create or replace function batasi_posting() returns trigger
language plpgsql security definer set search_path = public as $$
declare kp uuid; kj text; menit int; jam int; hari int; penulis uuid; baru boolean; sama int; balasan int;
        b_menit int; b_jam int; b_hari int;
begin
  baru := akun_baru(new.user_id);
  -- (013) Jenis posting: 'biasa', 'kutip' (dengan komentar), 'ulang' (posting ulang tanpa teks)
  if (new.jenis in ('kutip', 'ulang')) <> (new.kutip_id is not null) then
    raise exception 'Posting yang dikutip tidak ditemukan.';
  end if;
  if new.kutip_id is not null then
    select user_id, jenis into kp, kj from posts where id = new.kutip_id;
    if kp is null or kj = 'ulang' then raise exception 'Posting yang dikutip tidak ditemukan.'; end if;
    if ada_blokir(new.user_id, kp) then raise exception 'Tidak dapat membagikan ulang posting ini.'; end if;
  end if;
  if new.jenis = 'ulang' then
    select count(*) into menit from posts
      where user_id = new.user_id and jenis = 'ulang' and created_at > now() - interval '1 hour';
    if menit >= (case when baru then 10 else 40 end) then
      raise exception 'Terlalu banyak posting ulang. Coba lagi nanti.';
    end if;
    return new;
  end if;
  b_menit := case when baru then 3 else 5 end;
  b_jam := case when baru then 10 else 30 end;
  b_hari := case when baru then 20 else 50 end;
  select count(*) filter (where created_at > now() - interval '1 minute'),
         count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into menit, jam, hari
    from posts where user_id = new.user_id and jenis <> 'ulang' and created_at > now() - interval '1 day';
  if menit >= b_menit then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if jam >= b_jam then raise exception 'Kamu menulis terlalu sering dalam satu jam. Coba lagi nanti.'; end if;
  if hari >= b_hari then raise exception 'Batas posting harian tercapai (%). Coba lagi besok.', b_hari; end if;
  select count(*) into sama from posts
    where user_id = new.user_id and created_at > now() - interval '1 hour'
      and norm_teks(content) = norm_teks(new.content);
  if sama >= 1 then raise exception 'Isi yang sama baru saja kamu kirim. Tulis hal yang berbeda ya.'; end if;
  perform cek_isi_spam(new.content, baru);
  if new.parent_id is not null then
    select user_id into penulis from posts where id = new.parent_id;
    if penulis is null then raise exception 'Posting yang dibalas tidak ditemukan.'; end if;
    if ada_blokir(new.user_id, penulis) then raise exception 'Tidak dapat membalas posting ini.'; end if;
    select count(*) into balasan from posts
      where user_id = new.user_id and parent_id = new.parent_id and created_at > now() - interval '1 hour';
    if balasan >= 5 then raise exception 'Kamu sudah membalas posting ini beberapa kali. Tunggu sebentar.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists batasi_posting_trg on posts;
create trigger batasi_posting_trg before insert on posts
  for each row execute function batasi_posting();

-- ============ C. Dislike ============
create table if not exists dislikes (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table dislikes enable row level security;
-- Siapa yang tidak suka bersifat pribadi: tiap orang hanya melihat barisnya sendiri.
-- Menambah/menghapus hanya lewat fungsi toggle_tidak_suka di bawah.
drop policy if exists "dislike dibaca sendiri" on dislikes;
create policy "dislike dibaca sendiri" on dislikes for select using (auth.uid() = user_id);

-- Menyukai sebuah posting otomatis membatalkan "tidak suka"-mu
create or replace function hapus_dislike_saat_suka() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from dislikes where post_id = new.post_id and user_id = new.user_id;
  return new;
end $$;
drop trigger if exists hapus_dislike_trg on likes;
create trigger hapus_dislike_trg after insert on likes
  for each row execute function hapus_dislike_saat_suka();

create or replace function toggle_tidak_suka(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); penulis uuid; ada boolean := null; cepat int;
begin
  if uid is null then raise exception 'tidak valid'; end if;
  select user_id into penulis from posts where id = p_id;
  if penulis is null or ada_blokir(uid, penulis) then raise exception 'Posting tidak ditemukan.'; end if;
  select count(*) into cepat from dislikes where user_id = uid and created_at > now() - interval '1 minute';
  if cepat >= 30 then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  delete from dislikes where post_id = p_id and user_id = uid returning true into ada;
  if ada is null then
    insert into dislikes (post_id, user_id) values (p_id, uid);
    delete from likes where post_id = p_id and user_id = uid;
  end if;
  return jsonb_build_object(
    'tidak_suka', (select count(*) from dislikes where post_id = p_id),
    'saya_tidak_suka', ada is null,
    'suka', (select count(*) from likes where post_id = p_id));
end $$;

-- ============ D. Posting ulang ============
create or replace function toggle_ulang(p_id uuid, p_perangkat text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); penulis uuid; jns text; ada uuid;
begin
  if uid is null then raise exception 'tidak valid'; end if;
  select user_id, jenis into penulis, jns from posts where id = p_id;
  if penulis is null or jns = 'ulang' or ada_blokir(uid, penulis) then raise exception 'Posting tidak ditemukan.'; end if;
  select id into ada from posts where user_id = uid and kutip_id = p_id and jenis = 'ulang';
  if ada is not null then
    delete from posts where id = ada;
  else
    insert into posts (user_id, content, jenis, kutip_id, perangkat)
    values (uid, '', 'ulang', p_id, case when p_perangkat in ('ios', 'android', 'web') then p_perangkat end);
  end if;
  return jsonb_build_object(
    'saya_ulang', ada is null,
    'ulang', (select count(*) from posts where kutip_id = p_id and jenis = 'ulang'));
end $$;

-- ============ E. Angka tambahan untuk kartu posting ============
create or replace function statistik_posting(p_ids uuid[])
returns table (
  id uuid, perangkat text, jenis text, kutip_id uuid,
  tidak_suka bigint, saya_tidak_suka boolean,
  ulang bigint, saya_ulang boolean, kutip bigint
)
language sql stable security definer set search_path = public as $$
  select p.id, p.perangkat, p.jenis, p.kutip_id,
    (select count(*) from dislikes d where d.post_id = p.id),
    exists (select 1 from dislikes d2 where d2.post_id = p.id and d2.user_id = auth.uid()),
    (select count(*) from posts r where r.kutip_id = p.id and r.jenis = 'ulang'),
    exists (select 1 from posts r2 where r2.kutip_id = p.id and r2.jenis = 'ulang' and r2.user_id = auth.uid()),
    (select count(*) from posts q where q.kutip_id = p.id and q.jenis = 'kutip')
  from posts p
  where auth.uid() is not null
    and p.id = any (p_ids[1:200])
    and not ada_blokir(auth.uid(), p.user_id);
$$;

revoke execute on function toggle_tidak_suka(uuid) from public, anon;
revoke execute on function toggle_ulang(uuid, text) from public, anon;
revoke execute on function statistik_posting(uuid[]) from public, anon;
grant execute on function toggle_tidak_suka(uuid) to authenticated;
grant execute on function toggle_ulang(uuid, text) to authenticated;
grant execute on function statistik_posting(uuid[]) to authenticated;

-- ########## 014_notifikasi_kutip_ulang.sql ##########
-- JURKON 014: notifikasi saat postinganmu dikutip atau diposting ulang.
-- Jalankan di Supabase: SQL Editor > New query > Run. Aman dijalankan berulang.
-- Prasyarat: 005 (notifikasi) dan 013 (kutip & posting ulang) sudah dijalankan.
-- Catatan: "tidak suka" SENGAJA tidak mengirim notifikasi, supaya siapa yang tidak suka tetap privat.

alter table notifications drop constraint if exists notifications_jenis_check;
alter table notifications add constraint notifications_jenis_check
  check (jenis in ('suka', 'balasan', 'ikuti', 'pesan', 'kutip', 'ulang'));

-- ulang: post_id = posting asli (satu notifikasi per pelaku per posting)
-- kutip: post_id = posting kutipan milik pelaku
create unique index if not exists notif_ulang_unik on notifications (actor_id, post_id) where jenis = 'ulang';

create or replace function notif_kutip_ulang() returns trigger
language plpgsql security definer set search_path = public as $$
declare pemilik uuid;
begin
  if new.kutip_id is null then return new; end if;
  select user_id into pemilik from posts where id = new.kutip_id;
  if pemilik is null or pemilik = new.user_id or ada_blokir(pemilik, new.user_id) then
    return new;
  end if;
  if new.jenis = 'ulang' then
    insert into notifications (user_id, actor_id, jenis, post_id)
    values (pemilik, new.user_id, 'ulang', new.kutip_id)
    on conflict (actor_id, post_id) where jenis = 'ulang' do nothing;
  elsif new.jenis = 'kutip' then
    insert into notifications (user_id, actor_id, jenis, post_id)
    values (pemilik, new.user_id, 'kutip', new.id);
  end if;
  return new;
exception when others then
  raise warning 'notif_kutip_ulang gagal: %', sqlerrm;
  return new;
end $$;

drop trigger if exists notif_kutip_ulang_trg on posts;
create trigger notif_kutip_ulang_trg after insert on posts
  for each row execute function notif_kutip_ulang();

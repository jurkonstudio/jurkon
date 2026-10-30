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

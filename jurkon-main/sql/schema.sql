-- JURKON - Jalankan di Supabase: SQL Editor > New query > Run
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  nama text check (char_length(nama) <= 40),
  bio text check (char_length(bio) <= 160),
  created_at timestamptz default now()
);
create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  parent_id uuid references posts(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 250),
  created_at timestamptz default now()
);
create table likes (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references profiles(id) on delete cascade not null,
  user_b uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null check (char_length(content) between 1 and 750),
  created_at timestamptz default now()
);
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade,
  alasan text check (char_length(alasan) <= 300),
  created_at timestamptz default now()
);
create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  primary key (blocker_id, blocked_id)
);

create index on posts (created_at desc);
create index on posts (parent_id);
create index on messages (conversation_id, created_at);

-- Profil otomatis saat daftar
create function buat_profil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, nama)
  values (new.id,
    lower(regexp_replace(split_part(new.email,'@',1),'[^a-zA-Z0-9]','','g')) || floor(random()*900+100)::int,
    split_part(new.email,'@',1));
  return new;
end $$;
create trigger saat_daftar after insert on auth.users for each row execute function buat_profil();

-- Buka / buat percakapan
create function buka_percakapan(lawan uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; cid uuid;
begin
  if auth.uid() is null or lawan = auth.uid() then raise exception 'tidak valid'; end if;
  a := least(auth.uid(), lawan); b := greatest(auth.uid(), lawan);
  select id into cid from conversations where user_a = a and user_b = b;
  if cid is null then insert into conversations (user_a, user_b) values (a, b) returning id into cid; end if;
  return cid;
end $$;

-- RLS
alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table follows enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;

create policy "profil dibaca semua" on profiles for select using (auth.uid() is not null);
create policy "ubah profil sendiri" on profiles for update using (auth.uid() = id);

create policy "posting dibaca semua" on posts for select using (auth.uid() is not null);
create policy "posting sendiri" on posts for insert with check (auth.uid() = user_id);
create policy "hapus posting sendiri" on posts for delete using (auth.uid() = user_id);

create policy "like dibaca semua" on likes for select using (auth.uid() is not null);
create policy "like sendiri" on likes for insert with check (auth.uid() = user_id);
create policy "batal like sendiri" on likes for delete using (auth.uid() = user_id);

create policy "follow dibaca semua" on follows for select using (auth.uid() is not null);
create policy "ikuti sendiri" on follows for insert with check (auth.uid() = follower_id);
create policy "berhenti ikuti" on follows for delete using (auth.uid() = follower_id);

create policy "percakapan peserta" on conversations for select
  using (auth.uid() in (user_a, user_b));

create policy "pesan dibaca peserta" on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "pesan dikirim peserta" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

create policy "lapor sendiri" on reports for insert with check (auth.uid() = reporter_id);
create policy "blokir dibaca sendiri" on blocks for select using (auth.uid() = blocker_id);
create policy "blokir sendiri" on blocks for insert with check (auth.uid() = blocker_id);
create policy "buka blokir" on blocks for delete using (auth.uid() = blocker_id);

-- Aktifkan realtime untuk chat
alter publication supabase_realtime add table messages;

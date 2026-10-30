-- JURKON - Migrasi 005: notifikasi (suka, balasan, pengikut baru, pesan baru)
-- Jalankan di Supabase: SQL Editor > New query > tempel semua > Run.
-- Aman diulang (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS). Jangan ubah schema.sql.
-- Syarat: migrasi 002 (fungsi ada_blokir) sudah dijalankan.

-- =====================================================================
-- A. Tabel
--    Hanya memuat id dan jenis. Teks/cuplikan diambil klien lewat join
--    yang tetap dilindungi RLS, jadi tidak ada isi posting/pesan yang bocor.
-- =====================================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,   -- penerima
  actor_id uuid not null references profiles(id) on delete cascade,  -- pelaku
  jenis text not null check (jenis in ('suka','balasan','ikuti','pesan')),
  post_id uuid references posts(id) on delete cascade,  -- suka: catatan yang disukai; balasan: id balasan
  conversation_id uuid references conversations(id) on delete cascade,
  dibaca boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_id <> actor_id)
);

create index if not exists notif_penerima_waktu on notifications (user_id, created_at desc);
create index if not exists notif_belum_dibaca on notifications (user_id) where dibaca = false;

-- Pencegah duplikat: satu notifikasi suka per (pelaku, catatan), satu notifikasi ikuti per pasangan,
-- dan satu notifikasi pesan BELUM DIBACA per percakapan (bukan per pesan).
create unique index if not exists notif_suka_unik on notifications (actor_id, post_id) where jenis = 'suka';
create unique index if not exists notif_ikuti_unik on notifications (user_id, actor_id) where jenis = 'ikuti';
create unique index if not exists notif_pesan_unik on notifications (user_id, conversation_id)
  where jenis = 'pesan' and dibaca = false;

-- =====================================================================
-- B. RLS: klien hanya boleh baca, tandai dibaca, dan hapus miliknya.
--    TIDAK ada policy insert: notifikasi hanya dibuat oleh trigger di bawah.
-- =====================================================================
alter table notifications enable row level security;

drop policy if exists "notif dibaca pemilik" on notifications;
create policy "notif dibaca pemilik" on notifications for select
  using (auth.uid() = user_id and not ada_blokir(user_id, actor_id));

drop policy if exists "notif ditandai pemilik" on notifications;
create policy "notif ditandai pemilik" on notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notif dihapus pemilik" on notifications;
create policy "notif dihapus pemilik" on notifications for delete
  using (auth.uid() = user_id);

-- Hak akses tingkat kolom: klien hanya boleh mengubah kolom "dibaca", tidak boleh insert
revoke all on notifications from anon;
revoke insert, update on notifications from authenticated;
grant select, delete on notifications to authenticated;
grant update (dibaca) on notifications to authenticated;

-- =====================================================================
-- C. Trigger pembuat notifikasi (security definer)
--    Gagal membuat notifikasi tidak boleh membatalkan aksi pengguna,
--    jadi galat ditelan dan hanya dicatat sebagai peringatan.
-- =====================================================================
create or replace function notif_suka() returns trigger
language plpgsql security definer set search_path = public as $$
declare pemilik uuid;
begin
  select user_id into pemilik from posts where id = new.post_id;
  if pemilik is null or pemilik = new.user_id or ada_blokir(pemilik, new.user_id) then
    return new;
  end if;
  insert into notifications (user_id, actor_id, jenis, post_id)
  values (pemilik, new.user_id, 'suka', new.post_id)
  on conflict (actor_id, post_id) where jenis = 'suka' do nothing;
  return new;
exception when others then
  raise warning 'notif_suka gagal: %', sqlerrm;
  return new;
end $$;

create or replace function notif_balasan() returns trigger
language plpgsql security definer set search_path = public as $$
declare pemilik uuid;
begin
  if new.parent_id is null then return new; end if;
  select user_id into pemilik from posts where id = new.parent_id;
  if pemilik is null or pemilik = new.user_id or ada_blokir(pemilik, new.user_id) then
    return new;
  end if;
  insert into notifications (user_id, actor_id, jenis, post_id)
  values (pemilik, new.user_id, 'balasan', new.id);
  return new;
exception when others then
  raise warning 'notif_balasan gagal: %', sqlerrm;
  return new;
end $$;

create or replace function notif_ikuti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.following_id = new.follower_id or ada_blokir(new.following_id, new.follower_id) then
    return new;
  end if;
  insert into notifications (user_id, actor_id, jenis)
  values (new.following_id, new.follower_id, 'ikuti')
  on conflict (user_id, actor_id) where jenis = 'ikuti' do nothing;
  return new;
exception when others then
  raise warning 'notif_ikuti gagal: %', sqlerrm;
  return new;
end $$;

create or replace function notif_pesan() returns trigger
language plpgsql security definer set search_path = public as $$
declare penerima uuid;
begin
  select case when user_a = new.sender_id then user_b else user_a end
    into penerima from conversations where id = new.conversation_id;
  if penerima is null or penerima = new.sender_id or ada_blokir(penerima, new.sender_id) then
    return new;
  end if;
  insert into notifications (user_id, actor_id, jenis, conversation_id)
  values (penerima, new.sender_id, 'pesan', new.conversation_id)
  on conflict (user_id, conversation_id) where jenis = 'pesan' and dibaca = false
  do update set created_at = now(), actor_id = excluded.actor_id;
  return new;
exception when others then
  raise warning 'notif_pesan gagal: %', sqlerrm;
  return new;
end $$;

drop trigger if exists notif_suka_trg on likes;
create trigger notif_suka_trg after insert on likes
  for each row execute function notif_suka();

drop trigger if exists notif_balasan_trg on posts;
create trigger notif_balasan_trg after insert on posts
  for each row when (new.parent_id is not null) execute function notif_balasan();

drop trigger if exists notif_ikuti_trg on follows;
create trigger notif_ikuti_trg after insert on follows
  for each row execute function notif_ikuti();

drop trigger if exists notif_pesan_trg on messages;
create trigger notif_pesan_trg after insert on messages
  for each row execute function notif_pesan();

-- =====================================================================
-- D. Fungsi RPC untuk klien (security invoker: RLS tetap berlaku)
-- =====================================================================
-- Hasil: {"total": n, "pesan": n}. "pesan" = jumlah percakapan dengan pesan belum dibaca.
create or replace function jumlah_notifikasi_baru() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total', count(*),
    'pesan', count(*) filter (where jenis = 'pesan'))
  from notifications
  where user_id = auth.uid() and dibaca = false;
$$;

-- ids = null berarti tandai semua. Mengembalikan jumlah baris yang berubah.
create or replace function tandai_notifikasi_dibaca(ids uuid[] default null) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  update notifications set dibaca = true
   where user_id = auth.uid() and dibaca = false
     and (ids is null or id = any(ids));
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function jumlah_notifikasi_baru() from public, anon;
revoke execute on function tandai_notifikasi_dibaca(uuid[]) from public, anon;
grant execute on function jumlah_notifikasi_baru() to authenticated;
grant execute on function tandai_notifikasi_dibaca(uuid[]) to authenticated;

-- =====================================================================
-- E. Realtime
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- =====================================================================
-- F. Retensi: hapus notifikasi lebih dari 60 hari agar tabel tidak membengkak
-- =====================================================================
create or replace function bersihkan_notifikasi(hari integer default 60) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from notifications where created_at < now() - make_interval(days => hari);
  get diagnostics n = row_count;
  return n;
end $$;

-- Hanya untuk dijalankan terjadwal / manual dari SQL Editor, bukan oleh klien
revoke execute on function bersihkan_notifikasi(integer) from public, anon, authenticated;

-- Menjadwalkan otomatis tiap hari pukul 03:00 UTC (opsional):
--   1) Supabase > Database > Extensions > aktifkan "pg_cron"
--   2) Jalankan SEKALI baris berikut (hapus tanda -- di depannya):
-- select cron.schedule('bersihkan-notifikasi', '0 3 * * *', 'select public.bersihkan_notifikasi(60)');
-- Tanpa pg_cron, jalankan manual sesekali:  select bersihkan_notifikasi(60);

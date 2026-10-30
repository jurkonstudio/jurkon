-- JURKON 015: notifikasi kutip, posting ulang, dan mention @username (satu migrasi).
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: migrasi 002, 005, 013 (kolom jenis/kutip_id) dan 014 sudah dijalankan.
-- Jalankan SEBELUM mengunggah kode JS terbaru.
--
-- Aturan (sengaja tidak ganda):
--   ulang   : seseorang memposting ulang catatanmu            -> post_id = catatan aslimu
--   kutip   : seseorang mengutip catatanmu                    -> post_id = catatan kutipan itu
--   mention : seseorang menulis @usernamemu di posting/balasan -> post_id = catatan itu
-- Penerima tidak mendapat notifikasi ganda untuk satu catatan: pemilik catatan yang dibalas/dikutip
-- tidak dapat "mention" lagi, dan pengikut yang sudah dapat kutip/mention tidak dapat "posting" (014).
-- Maksimal 5 akun yang disebut per catatan (mencegah spam notifikasi). Tidak ada notifikasi ke diri
-- sendiri atau antar akun yang saling blokir.

-- =====================================================================
-- A. Jenis notifikasi yang diizinkan
-- =====================================================================
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.notifications'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%jenis%'
  loop
    execute format('alter table notifications drop constraint %I', r.conname);
  end loop;
  alter table notifications add constraint notifications_jenis_check
    check (jenis in ('suka','balasan','ikuti','pesan','kutip','ulang','posting','mention'));
end $$;

-- ulang: satu notifikasi per pelaku per catatan asli; mention: satu per (penerima, catatan)
create unique index if not exists notif_ulang_unik on notifications (actor_id, post_id) where jenis = 'ulang';
create unique index if not exists notif_mention_unik on notifications (user_id, post_id) where jenis = 'mention';

-- =====================================================================
-- B. Kutip dan posting ulang
-- =====================================================================
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

-- Batal posting ulang: notifikasinya ikut hilang (dan posting ulang berikutnya memberi notifikasi lagi)
create or replace function notif_ulang_batal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(to_jsonb(old)->>'jenis', '') = 'ulang' and old.kutip_id is not null then
    delete from notifications
     where jenis = 'ulang' and actor_id = old.user_id and post_id = old.kutip_id;
  end if;
  return old;
exception when others then
  raise warning 'notif_ulang_batal gagal: %', sqlerrm;
  return old;
end $$;

drop trigger if exists notif_ulang_batal_trg on posts;
create trigger notif_ulang_batal_trg after delete on posts
  for each row execute function notif_ulang_batal();

-- =====================================================================
-- C. Mention @username (pola sama dengan js/ui.js dan js/mention.js)
-- =====================================================================
create or replace function notif_mention() returns trigger
language plpgsql security definer set search_path = public as $$
declare dibalas uuid; dikutip uuid; kid uuid;
begin
  if new.content is null or position('@' in new.content) = 0 then return new; end if;
  if new.parent_id is not null then
    select user_id into dibalas from posts where id = new.parent_id;
  end if;
  kid := nullif(to_jsonb(new)->>'kutip_id', '')::uuid;
  if kid is not null then
    select user_id into dikutip from posts where id = kid;
  end if;

  insert into notifications (user_id, actor_id, jenis, post_id)
  select p.id, new.user_id, 'mention', new.id
    from profiles p
   where p.username in (
           select x.m[2]
             from regexp_matches(lower(new.content),
                                 '(^|[^a-z0-9_@])@([a-z0-9_]{3,20})(?![a-z0-9_])', 'g')
                  with ordinality as x(m, n)
            group by x.m[2] order by min(x.n) limit 5)
     and p.id <> new.user_id
     and p.id is distinct from dibalas
     and p.id is distinct from dikutip
     and not ada_blokir(p.id, new.user_id)
  on conflict (user_id, post_id) where jenis = 'mention' do nothing;
  return new;
exception when others then
  raise warning 'notif_mention gagal: %', sqlerrm;
  return new;
end $$;

drop trigger if exists notif_mention_trg on posts;
create trigger notif_mention_trg after insert on posts
  for each row execute function notif_mention();

-- =====================================================================
-- D. Notifikasi "posting" (014): lewati penerima yang sudah dapat notifikasi untuk catatan yang sama
--    (kutip/mention). Trigger berjalan menurut urutan nama: kutip_ulang < mention < posting_ikuti.
-- =====================================================================
create or replace function notif_posting_ikuti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is not null then return new; end if;
  if coalesce(to_jsonb(new)->>'jenis', 'biasa') = 'ulang' then return new; end if;
  insert into notifications (user_id, actor_id, jenis, post_id)
  select f.follower_id, new.user_id, 'posting', new.id
    from follows f
   where f.following_id = new.user_id
     and not ada_blokir(f.follower_id, new.user_id)
     and not exists (select 1 from notifications n
                      where n.user_id = f.follower_id and n.post_id = new.id)
  on conflict (user_id, post_id) where jenis = 'posting' do nothing;
  return new;
exception when others then
  raise warning 'notif_posting_ikuti gagal: %', sqlerrm;
  return new;
end $$;

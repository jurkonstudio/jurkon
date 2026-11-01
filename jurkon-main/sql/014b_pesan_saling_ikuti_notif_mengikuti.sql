-- JURKON 014: (1) pesan hanya antar akun yang SALING MENGIKUTI,
--              (2) notifikasi terpisah untuk catatan baru dari akun yang diikuti.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: migrasi 002 dan 005 sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.

-- =====================================================================
-- A. Pesan hanya untuk akun yang saling mengikuti (ditegakkan di database)
-- =====================================================================

-- Benar bila a mengikuti b DAN b mengikuti a (security definer agar terbaca dua arah)
create or replace function saling_ikuti(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = a and following_id = b)
     and exists (select 1 from follows where follower_id = b and following_id = a);
$$;
revoke execute on function saling_ikuti(uuid, uuid) from public, anon;
grant execute on function saling_ikuti(uuid, uuid) to authenticated;

-- Membuka percakapan baru: wajib saling mengikuti (dan tidak ada blokir)
create or replace function buka_percakapan(lawan uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; cid uuid;
begin
  if auth.uid() is null or lawan = auth.uid() then raise exception 'tidak valid'; end if;
  if ada_blokir(auth.uid(), lawan) then
    raise exception 'Tidak dapat mengirim pesan ke pengguna ini.';
  end if;
  if not saling_ikuti(auth.uid(), lawan) then
    raise exception 'Kalian harus saling mengikuti untuk bisa berkirim pesan.';
  end if;
  a := least(auth.uid(), lawan); b := greatest(auth.uid(), lawan);
  select id into cid from conversations where user_a = a and user_b = b;
  if cid is null then
    insert into conversations (user_a, user_b) values (a, b) returning id into cid;
  end if;
  return cid;
end $$;

-- Mengirim pesan: percakapan lama pun tidak bisa dikirimi bila salah satu berhenti mengikuti.
-- Riwayat pesan tetap bisa dibaca (kebijakan baca tidak diubah).
drop policy if exists "pesan dikirim peserta" on messages;
create policy "pesan dikirim peserta" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from conversations c
          where c.id = conversation_id
            and auth.uid() in (c.user_a, c.user_b)
            and not ada_blokir(c.user_a, c.user_b)
            and saling_ikuti(c.user_a, c.user_b)));

-- =====================================================================
-- B. Notifikasi terpisah: catatan baru dari akun yang diikuti (jenis 'posting')
-- =====================================================================

-- Izinkan jenis baru 'posting' (nama constraint dicari otomatis).
-- Daftar ini sengaja mencakup 'kutip' dan 'ulang' (notifikasi kutip/posting ulang) agar tidak terhapus
-- bila query itu sudah pernah dijalankan; bila belum, nilai tambahan itu tidak berbahaya.
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
    check (jenis in ('suka','balasan','ikuti','pesan','kutip','ulang','posting'));
end $$;

-- Satu notifikasi 'posting' per (penerima, catatan)
create unique index if not exists notif_posting_unik on notifications (user_id, post_id) where jenis = 'posting';
create index if not exists notif_kelompok on notifications (user_id, (jenis = 'posting'), created_at desc);

-- Saat catatan utama dibuat, beri notifikasi ke semua pengikut penulisnya.
-- Balasan dan posting ulang murni tidak dihitung (kutipan dengan komentar tetap dihitung).
-- Memakai to_jsonb agar tetap jalan walau migrasi 013 (kolom jenis) belum dijalankan.
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
  on conflict (user_id, post_id) where jenis = 'posting' do nothing;
  return new;
exception when others then
  raise warning 'notif_posting_ikuti gagal: %', sqlerrm;
  return new;
end $$;

drop trigger if exists notif_posting_ikuti_trg on posts;
create trigger notif_posting_ikuti_trg after insert on posts
  for each row execute function notif_posting_ikuti();

-- Jumlah belum dibaca: total = aktivitas (suka, balasan, ikuti, pesan), mengikuti = catatan akun yang diikuti
create or replace function jumlah_notifikasi_baru() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total',     count(*) filter (where jenis <> 'posting'),
    'pesan',     count(*) filter (where jenis = 'pesan'),
    'mengikuti', count(*) filter (where jenis = 'posting'))
  from notifications
  where user_id = auth.uid() and dibaca = false;
$$;

-- Tandai dibaca per kelompok: kelompok = 'aktivitas' | 'mengikuti' | null (semua)
drop function if exists tandai_notifikasi_dibaca(uuid[]);
create or replace function tandai_notifikasi_dibaca(ids uuid[] default null, kelompok text default null) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'tidak valid'; end if;
  update notifications set dibaca = true
   where user_id = auth.uid() and dibaca = false
     and (ids is null or id = any(ids))
     and (kelompok is null
          or (kelompok = 'mengikuti' and jenis = 'posting')
          or (kelompok = 'aktivitas' and jenis <> 'posting'));
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function jumlah_notifikasi_baru() from public, anon;
revoke execute on function tandai_notifikasi_dibaca(uuid[], text) from public, anon;
grant execute on function jumlah_notifikasi_baru() to authenticated;
grant execute on function tandai_notifikasi_dibaca(uuid[], text) to authenticated;

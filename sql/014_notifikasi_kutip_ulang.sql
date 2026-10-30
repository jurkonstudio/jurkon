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

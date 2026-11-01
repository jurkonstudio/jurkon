-- JURKON 018: notifikasi "menyukai" ikut hilang bila suka dibatalkan (termasuk saat menekan "tidak suka",
-- yang otomatis membatalkan suka). Tanpa ini, pemilik posting masih melihat notifikasi dari suka yang sudah tidak ada.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: migrasi 005 dan 013 sudah dijalankan.
-- Suka-batal berulang tidak bisa dipakai membanjiri notifikasi: batas laju suka (007) tetap berlaku.

create or replace function hapus_notif_suka() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from notifications
   where jenis = 'suka' and actor_id = old.user_id and post_id = old.post_id;
  return old;
exception when others then
  raise warning 'hapus_notif_suka gagal: %', sqlerrm;
  return old;
end $$;

drop trigger if exists hapus_notif_suka_trg on likes;
create trigger hapus_notif_suka_trg after delete on likes
  for each row execute function hapus_notif_suka();

-- PEMERIKSAAN (jalankan terpisah):
--   select tgname from pg_trigger where tgname = 'hapus_notif_suka_trg';   -- 1 baris
-- MEMBATALKAN: drop trigger if exists hapus_notif_suka_trg on likes; drop function if exists hapus_notif_suka();

-- 026: Sematkan satu catatan di puncak profil.
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 013 (kolom jenis), 023 (kedaluwarsa), 024 (terbuka_pada). Disarankan 025 sudah jalan lebih dulu.
--
-- Aturan:
--   * Satu catatan per profil, disimpan di profiles.disematkan (kosong = tidak ada).
--   * Yang boleh disematkan: catatan utama milik sendiri (bukan balasan, kutipan, atau posting ulang),
--     yang sudah tayang (bukan kapsul yang belum terbuka) dan tidak berumur (tanpa kedaluwarsa).
--     Ditegakkan oleh trigger di server, bukan hanya oleh tombol di layar.
--   * Kebijakan update profil sudah membolehkan pemilik mengubah barisnya, jadi trigger inilah yang
--     memastikan kolom baru ini tidak bisa menunjuk ke posting orang lain.
--   * Bila catatannya dihapus, sematan hilang otomatis (on delete set null).
--   * Tidak dihitung dalam batas ubah profil bulanan (yang dihitung hanya foto, nama, username).

alter table profiles add column if not exists disematkan uuid references posts(id) on delete set null;

create or replace function jaga_disematkan() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Profil baru tidak boleh lahir dengan sematan
  if tg_op = 'INSERT' then new.disematkan := null; return new; end if;
  if new.disematkan is not null and new.disematkan is distinct from old.disematkan then
    if not exists (
      select 1 from posts p
       where p.id = new.disematkan
         and p.user_id = new.id
         and p.parent_id is null
         and coalesce(p.jenis, 'biasa') = 'biasa'
         and p.kedaluwarsa is null
         and (p.terbuka_pada is null or p.terbuka_pada <= now())
    ) then
      raise exception 'Hanya catatan utamamu yang sudah tayang dan tidak berumur yang bisa disematkan.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists jaga_disematkan_trg on profiles;
create trigger jaga_disematkan_trg before insert or update of disematkan on profiles
  for each row execute function jaga_disematkan();

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah)
-- =====================================================================
-- 1) Kolom dan trigger terpasang (hasil: 1 baris, lalu 1 baris):
--   select column_name from information_schema.columns where table_name = 'profiles' and column_name = 'disematkan';
--   select tgname from pg_trigger where tgrelid = 'profiles'::regclass and tgname = 'jaga_disematkan_trg';
--
-- 2) Uji nyata, di dalam transaksi yang dibatalkan (tidak ada yang tersimpan).
--    Ganti <UUID> dengan id akunmu (select id, username from profiles;),
--    <POST_MILIKMU> dengan id satu catatan utamamu (select id from posts where user_id = '<UUID>' and parent_id is null limit 1;),
--    <POST_ORANG_LAIN> dengan id posting milik akun lain.
--
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub', '<UUID>', 'role', 'authenticated')::text, true);
--   set local role authenticated;
--   update profiles set disematkan = '<POST_MILIKMU>' where id = '<UUID>';      -- harus berhasil: UPDATE 1
--   rollback;
--
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub', '<UUID>', 'role', 'authenticated')::text, true);
--   set local role authenticated;
--   update profiles set disematkan = '<POST_ORANG_LAIN>' where id = '<UUID>';   -- harus galat: Hanya catatan utamamu ...
--   rollback;
--
-- Pembatalan (rollback):
--   drop trigger if exists jaga_disematkan_trg on profiles;
--   drop function if exists jaga_disematkan();
--   alter table profiles drop column if exists disematkan;

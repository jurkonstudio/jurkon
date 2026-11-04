-- JURKON 051: username awal akun baru dibuat dari nama depan email (bagian sebelum "@").
-- Contoh: budi.santoso@gmail.com -> budisantoso. Pengguna tetap memilih/mengganti sendiri di layar "selamat".
-- Aturan: huruf kecil + angka, maksimal 20 karakter, harus lolos alasan_username() (040). Bila terpakai, ditambah
-- akhiran acak (_xxxx). Bila terlalu pendek / tidak lolos aturan, memakai username netral buat_username() seperti sebelumnya.
-- CATATAN PRIVASI: username bersifat publik, jadi bagian depan email ikut terlihat sampai pengguna menggantinya.
-- Hanya mengubah akun BARU. Akun lama tidak disentuh. Aman diulang.

create or replace function buat_username_dari_email(p_email text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  dasar text; u text; huruf text := 'abcdefghjkmnpqrstuvwxyz23456789'; i int; n int;
begin
  dasar := left(lower(regexp_replace(split_part(coalesce(p_email, ''), '@', 1), '[^a-zA-Z0-9]', '', 'g')), 20);
  if dasar !~ '^[a-z0-9]{3,20}$' or dasar !~ '[a-z]' then return buat_username(); end if;
  if alasan_username(dasar, null) is not null then return buat_username(); end if;
  if not exists (select 1 from profiles where username = dasar) then return dasar; end if;
  for n in 1..10 loop
    u := left(dasar, 15) || '_';
    for i in 1..4 loop u := u || substr(huruf, 1 + floor(random() * length(huruf))::int, 1); end loop;
    if alasan_username(u, null) is null and not exists (select 1 from profiles where username = u) then return u; end if;
  end loop;
  return buat_username();
end $$;
revoke all on function buat_username_dari_email(text) from public, anon, authenticated;

create or replace function buat_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username) values (new.id, buat_username_dari_email(new.email));
  return new;
end $$;

-- JURKON 021: verifikasi 2 langkah (TOTP) admin ditegakkan di SERVER.
-- Jalankan di Supabase SQL Editor (setelah 002-020). Aman dijalankan ulang.
--
-- Aturan baru is_admin():
--   * akun harus ada di tabel admins, DAN
--   * sesi harus aal2 (sudah memasukkan kode TOTP), ATAU akun itu belum punya faktor TOTP terverifikasi
--     (supaya admin yang belum mendaftar 2 langkah tidak terkunci).
-- Begitu admin mendaftarkan TOTP lewat panel (menu Keamanan), kata sandi curian saja tidak cukup lagi
-- untuk memanggil fungsi admin_* maupun kebijakan RLS yang memakai is_admin().
--
-- Membatalkan (mengembalikan ke aturan lama):
--   create or replace function is_admin() returns boolean language sql stable security definer
--   set search_path = public as $f$ select exists (select 1 from admins where user_id = auth.uid()) $f$;
-- Bila HP autentikator hilang dan akun terkunci, hapus faktornya:
--   delete from auth.mfa_factors where user_id = '<uuid admin>';

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from admins a where a.user_id = auth.uid())
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (
         select 1 from auth.mfa_factors f
         where f.user_id = auth.uid()
           and f.factor_type = 'totp'
           and f.status = 'verified')
     );
$$;

-- Pemeriksaan (opsional): admin mana yang sudah / belum punya TOTP terverifikasi
select p.username,
       exists (select 1 from auth.mfa_factors f
               where f.user_id = a.user_id and f.factor_type = 'totp' and f.status = 'verified') as sudah_2_langkah
from admins a left join profiles p on p.id = a.user_id;

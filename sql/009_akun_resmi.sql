-- JURKON 009: akun resmi (lencana centang biru) + pencadangan username.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Jalankan SEBELUM mengunggah kode JS terbaru ke GitHub.
--
-- Username resmi: jurkon, journalconnection, jurnalkoneksi
-- (daftar yang sama ada di js/ui.js: AKUN_RESMI)
--
-- Pengguna biasa tidak bisa memakai username tersebut maupun yang berawalan sama
-- (mis. jurkon_official). Pembaruan lewat SQL Editor (tanpa sesi pengguna) diizinkan,
-- sehingga pemilik bisa mengubah username akun miliknya menjadi username resmi.

create or replace function cek_username() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.username is not distinct from old.username then return new; end if;
    if auth.uid() is null then return new; end if;
  end if;
  if new.username in ('admin','administrator','moderator','mod','support','bantuan',
                      'help','system','sistem','official','resmi','root','null',
                      'undefined','anonymous')
     or new.username like 'jurkon%'
     or new.username like 'journalconnection%'
     or new.username like 'jurnalkoneksi%' then
    raise exception 'Username ini tidak tersedia.';
  end if;
  return new;
end $$;

-- Cara memberi username resmi ke akun milikmu (contoh; ganti akunresmi1 dengan username sementara):
--   update profiles set username_diubah_at = null where username = 'akunresmi1';
--   update profiles set username = 'jurkon' where username = 'akunresmi1';

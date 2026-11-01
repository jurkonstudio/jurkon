-- 027: Catatan publik (pilihan per catatan, bawaan tetap privat).
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 004 (cek_konten), 013 (jenis), 019 (pembekuan), 020 (catat_admin), 021 (is_admin), 023, 024.
--
-- Prinsip:
--   * Tabel posts TETAP tertutup untuk anon. Dunia luar hanya lewat fungsi sempit catatan_publik(id)
--     dan daftar_publik() (untuk sitemap). Tidak ada kebijakan RLS baru.
--   * Hanya penulis yang bisa mempublikasikan, hanya lewat jadikan_publik(); kolom publik tidak bisa diubah
--     langsung dari klien (trigger jaga_publik). Insert baru selalu lahir privat.
--   * Syarat publikasi (ditegakkan di server): email terverifikasi, akun tidak dibekukan, akun berumur >= 3 hari,
--     maks 5 catatan publik per 24 jam, hanya catatan utama biasa (bukan balasan, kutipan, posting ulang,
--     catatan berumur, atau kapsul waktu), lolos cek_konten, tanpa tautan, email, nomor telepon, atau @sebutan,
--     tidak sedang dilaporkan (laporan 'baru'), dan tidak dikunci pengelola.
--   * Yang tampil ke publik: isi, tanggal, nama, @username, jumlah suka. Tanpa foto, bio, dan data profil lain.
--   * Disembunyikan otomatis dari publik bila: >= 3 laporan 'baru', akun dibekukan, dikunci pengelola, dihapus.
--   * "Jadikan privat" berlaku seketika (fungsi membaca keadaan terkini, tanpa cache di sisi database).

alter table posts add column if not exists publik boolean not null default false;
alter table posts add column if not exists publik_pada timestamptz;
alter table posts add column if not exists publik_dikunci boolean not null default false;
create index if not exists posts_publik_idx on posts (publik_pada desc) where publik;

-- A. Penjaga kolom: klien tidak boleh mengubah kolom publik secara langsung.
--    Fungsi di bawah menyalakan penanda sementara (hanya hidup di dalam satu transaksi) sebelum mengubahnya.
create or replace function jaga_publik() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;                                  -- SQL Editor / service role
  if coalesce(current_setting('jurkon.publik_ok', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.publik := false; new.publik_pada := null; new.publik_dikunci := false;
    return new;
  end if;
  if new.publik is distinct from old.publik
     or new.publik_pada is distinct from old.publik_pada
     or new.publik_dikunci is distinct from old.publik_dikunci then
    raise exception 'Status publik hanya bisa diubah lewat tombol catatan publik.';
  end if;
  return new;
end $$;
drop trigger if exists jaga_publik_trg on posts;
create trigger jaga_publik_trg before insert or update on posts
  for each row execute function jaga_publik();

-- B. Penulis menjadikan satu catatan publik (semua syarat diperiksa di sini)
create or replace function jadikan_publik(p_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  r posts%rowtype;
  n int;
begin
  if uid is null then raise exception 'Masuk dulu.'; end if;
  select * into r from posts where id = p_id and user_id = uid;
  if not found then raise exception 'Catatan tidak ditemukan.'; end if;

  if exists (select 1 from pembekuan where user_id = uid) then
    raise exception 'Akunmu sedang dibekukan. Hubungi admin bila ini keliru.';
  end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'Verifikasi emailmu dulu sebelum mempublikasikan catatan.';
  end if;
  if exists (select 1 from auth.users u where u.id = uid and u.created_at > now() - interval '3 days') then
    raise exception 'Akun baru bisa mempublikasikan catatan setelah berumur 3 hari.';
  end if;
  if r.publik_dikunci then
    raise exception 'Catatan ini tidak bisa dipublikasikan (dikunci pengelola).';
  end if;
  if r.parent_id is not null or coalesce(r.jenis, 'biasa') <> 'biasa'
     or r.kedaluwarsa is not null or r.terbuka_pada is not null
     or r.content is null or btrim(r.content) = '' then
    raise exception 'Hanya catatan utama biasa (bukan balasan, kutipan, catatan berumur, atau kapsul waktu) yang bisa dipublikasikan.';
  end if;
  if r.publik then return; end if;                                                  -- sudah publik: tidak ada yang berubah

  if exists (select 1 from reports where post_id = p_id and status = 'baru') then
    raise exception 'Catatan ini sedang ditinjau pengelola, jadi belum bisa dipublikasikan.';
  end if;
  if cek_konten(r.content) is not null then
    raise exception 'Catatan ini memuat konten yang tidak diizinkan, jadi tidak bisa dipublikasikan.';
  end if;
  if r.content ~* '(https?:|www\.)' or r.content ~* '[a-z0-9-]{2,}\.(com|net|org|id|co|io|me|xyz|info|biz|ly|link|click|top|app|site|online|shop)([^a-z0-9]|$)' then
    raise exception 'Catatan publik belum boleh memuat tautan.';
  end if;
  if r.content ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' then
    raise exception 'Catatan publik tidak boleh memuat alamat email.';
  end if;
  if r.content ~ '(^|[^0-9])(\+?62|0)[ .-]?8[0-9]{1,2}[ .-]?[0-9]{3,4}[ .-]?[0-9]{3,5}([^0-9]|$)' then
    raise exception 'Catatan publik tidak boleh memuat nomor telepon.';
  end if;
  if r.content ~ '(^|[^a-zA-Z0-9_@])@[a-zA-Z0-9_]{3,20}' then
    raise exception 'Catatan publik tidak boleh menyebut pengguna lain dengan @. Hapus sebutannya dulu.';
  end if;

  select count(*) into n from posts where user_id = uid and publik_pada > now() - interval '24 hours';
  if n >= 5 then
    raise exception 'Batas 5 catatan publik per 24 jam tercapai. Coba lagi besok.';
  end if;

  perform set_config('jurkon.publik_ok', '1', true);
  update posts set publik = true, publik_pada = now() where id = p_id;
  perform set_config('jurkon.publik_ok', '0', true);
end $$;

-- C. Penulis menariknya kembali. publik_pada sengaja dibiarkan agar batas harian tetap menghitungnya.
create or replace function jadikan_privat(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if not exists (select 1 from posts where id = p_id and user_id = auth.uid()) then
    raise exception 'Catatan tidak ditemukan.';
  end if;
  perform set_config('jurkon.publik_ok', '1', true);
  update posts set publik = false where id = p_id and user_id = auth.uid();
  perform set_config('jurkon.publik_ok', '0', true);
end $$;

-- D. Pengelola: cabut dan kunci (penulis tidak bisa mempublikasikan lagi), atau buka kunci.
--    Dari SQL Editor juga bisa: select admin_kunci_publik('<uuid catatan>', 'alasan');
create or replace function admin_kunci_publik(p_id uuid, p_alasan text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'Khusus pengelola.'; end if;
  perform set_config('jurkon.publik_ok', '1', true);
  update posts set publik = false, publik_dikunci = true where id = p_id;
  perform set_config('jurkon.publik_ok', '0', true);
  if auth.uid() is not null then perform catat_admin('kunci_publik', p_id::text, p_alasan); end if;
end $$;

create or replace function admin_buka_kunci_publik(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'Khusus pengelola.'; end if;
  perform set_config('jurkon.publik_ok', '1', true);
  update posts set publik_dikunci = false where id = p_id;
  perform set_config('jurkon.publik_ok', '0', true);
  if auth.uid() is not null then perform catat_admin('buka_kunci_publik', p_id::text, null); end if;
end $$;

-- E. Dibaca dunia luar (anon boleh). Satu catatan per panggilan, kolom seminimal mungkin.
create or replace function catatan_publik(p_id uuid)
returns table (id uuid, content text, created_at timestamptz, username text, nama text, jumlah_suka bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.content, p.created_at, pr.username, pr.nama,
         (select count(*) from likes l where l.post_id = p.id)
    from posts p join profiles pr on pr.id = p.user_id
   where p.id = p_id
     and p.publik and not p.publik_dikunci
     and p.parent_id is null and p.kedaluwarsa is null
     and (p.terbuka_pada is null or p.terbuka_pada <= now())
     and not exists (select 1 from pembekuan b where b.user_id = p.user_id)
     and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3
$$;

-- Daftar id untuk sitemap (dipakai Worker). Maks 1000 per panggilan, terbaru dulu.
create or replace function daftar_publik(p_limit int default 500, p_sebelum timestamptz default null)
returns table (id uuid, diperbarui timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.publik_pada
    from posts p
   where p.publik and not p.publik_dikunci
     and p.parent_id is null and p.kedaluwarsa is null
     and (p.terbuka_pada is null or p.terbuka_pada <= now())
     and not exists (select 1 from pembekuan b where b.user_id = p.user_id)
     and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3
     and (p_sebelum is null or p.publik_pada < p_sebelum)
   order by p.publik_pada desc
   limit least(greatest(coalesce(p_limit, 500), 1), 1000)
$$;

-- F. Hak akses: penulis dan pengelola hanya untuk yang sudah masuk; fungsi baca publik untuk anon juga.
revoke execute on function jadikan_publik(uuid) from public, anon;
revoke execute on function jadikan_privat(uuid) from public, anon;
revoke execute on function admin_kunci_publik(uuid, text) from public, anon;
revoke execute on function admin_buka_kunci_publik(uuid) from public, anon;
grant execute on function jadikan_publik(uuid) to authenticated;
grant execute on function jadikan_privat(uuid) to authenticated;
grant execute on function admin_kunci_publik(uuid, text) to authenticated;
grant execute on function admin_buka_kunci_publik(uuid) to authenticated;
revoke execute on function catatan_publik(uuid) from public;
revoke execute on function daftar_publik(int, timestamptz) from public;
grant execute on function catatan_publik(uuid) to anon, authenticated;
grant execute on function daftar_publik(int, timestamptz) to anon, authenticated;

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah)
-- =====================================================================
-- 1) Fungsi yang boleh dipanggil anon. Harus TEPAT 3 baris (bila 019 sudah dijalankan):
--    catatan_publik, daftar_publik, landing_publik. Baris lain = ada yang bocor.
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--
-- 2) Uji nyata, di dalam transaksi yang dibatalkan. Ganti <UUID> dengan id akunmu dan <POST> dengan id satu
--    catatan utamamu yang berumur akun >= 3 hari dan tanpa tautan/email/telepon/@sebutan.
--
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub', '<UUID>', 'role', 'authenticated')::text, true);
--   set local role authenticated;
--   update posts set publik = true where id = '<POST>';          -- harus UPDATE 0 / galat (tidak ada kebijakan update)
--   select jadikan_publik('<POST>');                              -- harus berhasil (atau pesan syarat yang jelas)
--   select publik from posts where id = '<POST>';                 -- t
--   rollback;
--
--   begin;
--   set local role anon;
--   select id, username, jumlah_suka from catatan_publik('<POST>');   -- 0 baris di sini karena rollback; saat publik: 1 baris
--   select count(*) from posts;                                       -- harus galat permission denied
--   rollback;
--
-- 3) Kueri bantu pengelola:
--   select id, user_id, publik_pada, publik_dikunci from posts where publik order by publik_pada desc limit 50;
--
-- Pembatalan (rollback):
--   drop function if exists catatan_publik(uuid);
--   drop function if exists daftar_publik(int, timestamptz);
--   drop function if exists jadikan_publik(uuid);
--   drop function if exists jadikan_privat(uuid);
--   drop function if exists admin_kunci_publik(uuid, text);
--   drop function if exists admin_buka_kunci_publik(uuid);
--   drop trigger if exists jaga_publik_trg on posts;
--   drop function if exists jaga_publik();
--   alter table posts drop column if exists publik, drop column if exists publik_pada, drop column if exists publik_dikunci;
--
-- Catatan: bila nanti 019 dijalankan ulang, ia mencabut hak anon dari semua fungsi. Setelah itu jalankan ulang
-- bagian F di atas (revoke/grant catatan_publik dan daftar_publik) dan grant landing_publik() seperti di 020.

-- JURKON 040: username lebih aman.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Jalankan SEBELUM mengunggah kode JS terbaru ke GitHub (setelah 002, 007, 009, 019).
--
-- Isi:
--  A. Tabel username_cadangan: nama halaman/folder situs, nama peran (admin, staff, ...), dan kata yang
--     tidak boleh DIKANDUNG atau DIAWALI username (jurkon, jurnalkoneksi, ...). Daftar bisa ditambah lewat SQL.
--  B. Aturan bentuk: wajib ada minimal satu huruf, tidak boleh diawali garis bawah (jadi "___" dan "031411" ditolak).
--  C. Anti penyamaran: sebelum dicek, garis bawah dibuang, angka mirip huruf diganti (0->o, 1->i/l, 3->e, 4->a,
--     5->s, 7->t) dan huruf kembar dilipat. Jadi "jurk0n", "jur_kon", "official_jurkon" ikut ditolak.
--  D. Username lama ditahan 60 hari setelah dilepas (tabel username_riwayat) supaya tidak langsung diambil
--     orang lain dan tautan /@nama-lama tidak berpindah ke orang yang salah. Pemilik lama boleh memakainya kembali.
--  E. Fungsi username_tersedia() untuk pemeriksaan langsung di layar (hanya akun yang masuk).
--  F. Pemeriksaan akhir.
--
-- Yang TIDAK berubah: akun lama dibiarkan (aturan hanya diperiksa saat username diganti atau saat akun baru
-- memilih username). Pembaruan lewat SQL Editor (tanpa sesi pengguna) tetap diizinkan, jadi kamu bisa memberi
-- username resmi ke akun milikmu seperti di 009.
-- Sengaja TIDAK ada pengalihan otomatis dari username lama ke yang baru: itu akan membocorkan username baru
-- orang yang pindah nama untuk menghindari pelecehan.

-- =====================================================================
-- A. Daftar cadangan
-- =====================================================================
create table if not exists username_cadangan (
  kata text primary key check (kata = lower(kata)),
  jenis text not null check (jenis in ('persis', 'mengandung', 'awalan'))
);
alter table username_cadangan enable row level security;   -- tanpa kebijakan: klien tidak bisa membaca/menulis langsung
revoke all on username_cadangan from anon, authenticated;

insert into username_cadangan (kata, jenis) values
  -- nama halaman dan folder situs (alamat /nama tanpa @ akan menyajikan halaman aslinya lebih dulu)
  ('login','persis'),('logout','persis'),('daftar','persis'),('register','persis'),('signup','persis'),('signin','persis'),
  ('masuk','persis'),('keluar','persis'),('explore','persis'),('jelajahi','persis'),('jelajah','persis'),('chat','persis'),
  ('pesan','persis'),('notifikasi','persis'),('notif','persis'),('post','persis'),('posting','persis'),('detail','persis'),
  ('tentang','persis'),('aturan','persis'),('profil','persis'),('profile','persis'),('jurnal','persis'),('pertanyaan','persis'),
  ('selamat','persis'),('landing','persis'),('reset','persis'),('index','persis'),('beranda','persis'),('home','persis'),
  ('pengaturan','persis'),('settings','persis'),('setting','persis'),('akun','persis'),('account','persis'),('cari','persis'),
  ('search','persis'),('pusat','persis'),('kebijakan','persis'),('ketentuan','persis'),('privasi','persis'),('privacy','persis'),
  ('terms','persis'),('rules','persis'),('about','persis'),('proses','persis'),('tempat','persis'),
  ('assets','persis'),('css','persis'),('sql','persis'),('docs','persis'),('tools','persis'),('worker','persis'),
  ('supabase','persis'),('murthehelp','persis'),('sitemap','persis'),('robots','persis'),('manifest','persis'),('cname','persis'),
  ('readme','persis'),('handoff','persis'),('favicon','persis'),('static','persis'),('public','persis'),
  -- peran dan nama yang menyiratkan wewenang
  ('administrator','persis'),('mod','persis'),('moderasi','persis'),
  ('bantuan','persis'),('help','persis'),('helpdesk','persis'),('system','persis'),('sistem','persis'),
  ('resmi','persis'),('root','persis'),('null','persis'),('undefined','persis'),('anonymous','persis'),
  ('anonim','persis'),('staff','persis'),('tim','persis'),('team','persis'),('owner','persis'),('pemilik','persis'),
  ('pendiri','persis'),('founder','persis'),('contact','persis'),('kontak','persis'),('security','persis'),('keamanan','persis'),
  ('news','persis'),('berita','persis'),('info','persis'),('informasi','persis'),('status','persis'),('www','persis'),
  ('mail','persis'),('email','persis'),('api','persis'),('app','persis'),('abuse','persis'),('postmaster','persis'),
  ('webmaster','persis'),('noreply','persis'),('billing','persis'),('verified','persis'),('verifikasi','persis'),
  ('terverifikasi','persis'),('laporan','persis'),('report','persis'),('everyone','persis'),('semua','persis'),('here','persis'),
  -- tidak boleh dikandung (anti penyamaran akun resmi)
  ('jurkon','mengandung'),('jurnalkoneksi','mengandung'),('journalconnection','mengandung'),
  -- tidak boleh diawali
  ('admin','awalan'),('moderator','awalan'),('support','awalan'),('official','awalan')
on conflict (kata) do update set jenis = excluded.jenis;

-- Catatan: admin, moderator, support, dan official berjenis 'awalan', jadi nama persisnya ikut tertolak.

-- =====================================================================
-- D (tabel). Riwayat username yang dilepas
-- =====================================================================
create table if not exists username_riwayat (
  username text primary key,
  user_id uuid not null,
  dilepas_at timestamptz not null default now()
);
alter table username_riwayat enable row level security;   -- tanpa kebijakan: tidak bisa dibaca klien
revoke all on username_riwayat from anon, authenticated;

-- =====================================================================
-- B + C + D (aturan). Satu fungsi pemeriksa, dipakai trigger dan layar
-- Hasil: null = boleh; 'format' | 'huruf' | 'cadangan' | 'tahan'
-- =====================================================================
create or replace function alasan_username(u text, uid uuid default null) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  a text; b text; x text; x2 text; ck text; k record;
begin
  u := lower(coalesce(u, ''));
  if u !~ '^[a-z0-9_]{3,20}$' then return 'format'; end if;
  if u !~ '[a-z]' or left(u, 1) = '_' then return 'huruf'; end if;

  -- bentuk yang sudah dinormalisasi (dua tafsir untuk angka 1: i atau l)
  a := replace(translate(u, '013457', 'oieast'), '_', '');
  b := replace(translate(u, '013457', 'oleast'), '_', '');

  if exists (select 1 from username_cadangan c where c.jenis = 'persis' and c.kata in (u, a, b)) then
    return 'cadangan';
  end if;

  for k in select kata, jenis from username_cadangan where jenis in ('mengandung', 'awalan') loop
    ck := regexp_replace(k.kata, '(.)\1+', '\1', 'g');
    foreach x in array array[a, b] loop
      x2 := regexp_replace(x, '(.)\1+', '\1', 'g');
      if k.jenis = 'mengandung' and position(ck in x2) > 0 then return 'cadangan'; end if;
      if k.jenis = 'awalan' and left(x2, length(ck)) = ck then return 'cadangan'; end if;
    end loop;
  end loop;

  if exists (select 1 from username_riwayat r
             where r.username = u and r.user_id is distinct from uid
               and r.dilepas_at > now() - interval '60 days') then
    return 'tahan';
  end if;

  return null;
end $$;
revoke all on function alasan_username(text, uuid) from public, anon, authenticated;

-- =====================================================================
-- Trigger penjaga (menggantikan cek_username dari 009)
-- Diperiksa saat: akun dibuat, username diganti, atau akun baru menyelesaikan pilihan username (siap false -> true)
-- =====================================================================
create or replace function cek_username() returns trigger
language plpgsql security definer set search_path = public as $$
declare periksa boolean := false; kode text;
begin
  if tg_op = 'INSERT' then
    periksa := true;
  else
    if new.username is distinct from old.username then
      periksa := true;
    elsif not coalesce(old.siap, false) and coalesce(new.siap, false) then
      periksa := true;   -- username sementara pengguna_xxxxxx yang tidak diganti tetap dicek
    end if;
    if periksa and auth.uid() is null then return new; end if;   -- SQL Editor / pemilik proyek
  end if;
  if not periksa then return new; end if;

  kode := alasan_username(new.username, new.id);
  if kode = 'huruf' then
    raise exception 'Username harus mengandung huruf dan tidak boleh diawali garis bawah.';
  elsif kode = 'tahan' then
    raise exception 'Username ini baru saja dilepas dan dicadangkan sementara. Coba yang lain.';
  elsif kode is not null then
    raise exception 'Username ini tidak tersedia.';
  end if;
  return new;
end $$;
revoke all on function cek_username() from public, anon, authenticated;
drop trigger if exists cek_username_trg on profiles;
create trigger cek_username_trg before insert or update on profiles
  for each row execute function cek_username();

-- =====================================================================
-- D (trigger). Catat username lama saat diganti
-- =====================================================================
create or replace function catat_username_lama() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.username is distinct from old.username and coalesce(old.siap, false) then
    insert into username_riwayat (username, user_id, dilepas_at) values (old.username, old.id, now())
    on conflict (username) do update set user_id = excluded.user_id, dilepas_at = excluded.dilepas_at;
    delete from username_riwayat where dilepas_at < now() - interval '120 days';
  end if;
  return new;
end $$;
revoke all on function catat_username_lama() from public, anon, authenticated;
drop trigger if exists catat_username_lama_trg on profiles;
create trigger catat_username_lama_trg after update of username on profiles
  for each row execute function catat_username_lama();

-- =====================================================================
-- E. Pemeriksaan langsung untuk layar (hanya akun yang masuk)
-- Hasil: 'ok' | 'format' | 'huruf' | 'cadangan' | 'tahan' | 'dipakai'
-- =====================================================================
create or replace function username_tersedia(u text) returns text
language plpgsql stable security definer set search_path = public as $$
declare kode text;
begin
  if auth.uid() is null then return 'format'; end if;
  u := lower(trim(coalesce(u, '')));
  kode := alasan_username(u, auth.uid());
  if kode is not null then return kode; end if;
  if exists (select 1 from profiles p where p.username = u and p.id <> auth.uid()) then return 'dipakai'; end if;
  return 'ok';
end $$;
revoke all on function username_tersedia(text) from public, anon;
grant execute on function username_tersedia(text) to authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- F. Pemeriksaan akhir: tiga baris. Harapan:
--    fungsi yang bisa dipanggil anon = 0 | jumlah kata cadangan = sekitar 150 | akun lama yang melanggar = informasi saja
-- =====================================================================
select 'fungsi anon bisa memanggil (harus 0)' as cek, count(*)::text as hasil
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('alasan_username', 'cek_username', 'catat_username_lama', 'username_tersedia')
    and has_function_privilege('anon', p.oid, 'execute')
union all
select 'jumlah kata cadangan', count(*)::text from username_cadangan
union all
select 'akun lama yang melanggar aturan baru (informasi)', count(*)::text
  from profiles where alasan_username(username, id) is not null;

-- Untuk melihat daftarnya (jalankan terpisah):
--   select username, alasan_username(username, id) as alasan from profiles
--   where alasan_username(username, id) is not null order by 2, 1;
-- Menambah kata cadangan:
--   insert into username_cadangan (kata, jenis) values ('contoh', 'persis') on conflict (kata) do nothing;

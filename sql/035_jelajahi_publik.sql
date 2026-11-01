-- 035: Jelajahi publik + tiga tingkat visibilitas + angka corong (funnel) tanpa data pribadi.
-- Jalankan SETELAH 027 (catatan publik) dan 020 (is_admin, landing_publik). Jalankan di Supabase SQL Editor
-- lebih dulu, cek tiga kueri di akhir berkas, baru unggah kode.
--
-- Tiga tingkat visibilitas catatan:
--   privat       : hanya penulis (bawaan, tidak berubah)
--   publik-tautan: siapa pun yang punya tautan n.html?id=... bisa membaca (ini perilaku 027 sekarang)
--   publik-daftar: sama seperti di atas, DAN muncul di halaman Jelajahi publik (jelajahi.html)
-- Semua catatan yang sudah publik sebelum 035 tetap "publik-tautan". Tidak ada catatan yang tiba-tiba
-- tampil di daftar tanpa penulisnya mencentang sendiri.
--
-- Prinsip yang dijaga:
--   * Tabel posts TETAP tertutup untuk anon. Anon hanya memanggil fungsi sempit.
--   * Daftar publik memakai syarat yang SAMA dengan catatan_publik() ditambah jelajahi = true.
--   * Menjadikan privat otomatis mematikan jelajahi (publikasi ulang harus memilih lagi).
--   * Angka corong hanya hitungan harian per langkah dan bahasa. Tanpa IP, tanpa id perangkat, tanpa cookie.

-- A. Kolom pilihan + penjaga
alter table posts add column if not exists jelajahi boolean not null default false;
create index if not exists posts_jelajahi_idx on posts (publik_pada desc) where publik and jelajahi;

create or replace function jaga_jelajahi() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;                                   -- SQL Editor / service role
  if tg_op = 'INSERT' then new.jelajahi := false; return new; end if;
  if coalesce(current_setting('jurkon.publik_ok', true), '') = '1' then
    if not new.publik then new.jelajahi := false; end if;                           -- privat/kunci => keluar dari daftar
    return new;
  end if;
  if new.jelajahi is distinct from old.jelajahi then
    raise exception 'Pilihan Jelajahi hanya bisa diubah lewat dialog catatan publik.';
  end if;
  return new;
end $$;
drop trigger if exists jaga_jelajahi_trg on posts;
create trigger jaga_jelajahi_trg before insert or update on posts
  for each row execute function jaga_jelajahi();

-- B. Penulis memilih tampil/tidak di Jelajahi (hanya untuk catatannya yang sedang publik)
create or replace function atur_jelajahi(p_id uuid, p_tampil boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r posts%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  select * into r from posts where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Catatan tidak ditemukan.'; end if;
  if p_tampil and (not r.publik or r.publik_dikunci) then
    raise exception 'Jadikan catatan ini publik dulu.';
  end if;
  perform set_config('jurkon.publik_ok', '1', true);
  update posts set jelajahi = coalesce(p_tampil, false) where id = p_id and user_id = auth.uid();
  perform set_config('jurkon.publik_ok', '0', true);
end $$;

-- C. Daftar untuk halaman Jelajahi publik. Kolom seminimal mungkin, maks 50 per panggilan, terbaru dulu.
create or replace function jelajahi_publik(p_limit int default 20, p_sebelum timestamptz default null)
returns table (id uuid, content text, publik_pada timestamptz, username text, nama text, jumlah_suka bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.content, p.publik_pada, pr.username, pr.nama,
         (select count(*) from likes l where l.post_id = p.id)
    from posts p join profiles pr on pr.id = p.user_id
   where p.publik and p.jelajahi and not p.publik_dikunci
     and p.parent_id is null and p.kedaluwarsa is null
     and (p.terbuka_pada is null or p.terbuka_pada <= now())
     and not exists (select 1 from pembekuan b where b.user_id = p.user_id)
     and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3
     and (p_sebelum is null or p.publik_pada < p_sebelum)
   order by p.publik_pada desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- D. Pembaca dialog: apakah catatan ini tampil di Jelajahi (hanya milik sendiri)
create or replace function status_jelajahi(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select jelajahi from posts where id = p_id and user_id = auth.uid()), false)
$$;

-- E. Corong pengunjung: hitungan harian, tanpa pengenal apa pun.
create table if not exists corong_harian (
  hari date not null default current_date,
  langkah text not null,
  bahasa text not null default 'id',
  jumlah int not null default 0,
  primary key (hari, langkah, bahasa)
);
alter table corong_harian enable row level security;       -- tanpa kebijakan = tertutup untuk semua kecuali fungsi di bawah

create or replace function catat_corong(p_langkah text, p_bahasa text default 'id') returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_langkah is null or p_langkah not in ('landing', 'landing_mulai', 'jelajahi', 'jelajahi_baca', 'login_buka') then return; end if;
  if p_bahasa is null or p_bahasa not in ('id', 'en', 'ms', 'jv', 'su', 'zh', 'ja') then p_bahasa := 'id'; end if;
  insert into corong_harian (hari, langkah, bahasa, jumlah) values (current_date, p_langkah, p_bahasa, 1)
  on conflict (hari, langkah, bahasa) do update set jumlah = corong_harian.jumlah + 1;
end $$;

-- Laporan untuk pengelola: langkah klien + dua langkah yang dihitung dari database (akun baru, catatan pertama).
create or replace function admin_corong(p_hari int default 30)
returns table (hari date, langkah text, jumlah bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'Khusus pengelola.'; end if;
  return query
    select c.hari, c.langkah, sum(c.jumlah)::bigint from corong_harian c
     where c.hari > current_date - least(greatest(coalesce(p_hari, 30), 1), 365) group by c.hari, c.langkah
    union all
    select pr.created_at::date, 'akun_baru', count(*)::bigint from profiles pr
     where pr.created_at::date > current_date - least(greatest(coalesce(p_hari, 30), 1), 365) group by 1
    union all
    select m.hari, 'catatan_pertama', count(*)::bigint from (
      select p.user_id, min(p.created_at)::date as hari from posts p where p.parent_id is null group by p.user_id
    ) m where m.hari > current_date - least(greatest(coalesce(p_hari, 30), 1), 365) group by m.hari
    order by 1 desc, 2;
end $$;

-- F. Hak akses
revoke execute on function atur_jelajahi(uuid, boolean) from public, anon;
revoke execute on function status_jelajahi(uuid) from public, anon;
revoke execute on function admin_corong(int) from public, anon;
revoke execute on function jelajahi_publik(int, timestamptz) from public;
revoke execute on function catat_corong(text, text) from public;
grant execute on function atur_jelajahi(uuid, boolean) to authenticated;
grant execute on function status_jelajahi(uuid) to authenticated;
grant execute on function admin_corong(int) to authenticated;
grant execute on function jelajahi_publik(int, timestamptz) to anon, authenticated;
grant execute on function catat_corong(text, text) to anon, authenticated;

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah)
-- =====================================================================
-- 1) Fungsi yang boleh dipanggil anon. Harus TEPAT 5 baris sekarang:
--    catatan_publik, daftar_publik, landing_publik, jelajahi_publik, catat_corong.
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--
-- 2) Anon tidak boleh membaca tabel. Harus galat permission denied:
--   begin; set local role anon; select count(*) from posts; rollback;
--   begin; set local role anon; select count(*) from corong_harian; rollback;
--
-- 3) Semua catatan lama harus tetap tidak tampil di daftar (hasil 0 sampai penulis mencentang):
--   select count(*) from posts where jelajahi;
--
-- Pembatalan (rollback):
--   drop function if exists jelajahi_publik(int, timestamptz);
--   drop function if exists atur_jelajahi(uuid, boolean);
--   drop function if exists status_jelajahi(uuid);
--   drop function if exists admin_corong(int);
--   drop function if exists catat_corong(text, text);
--   drop table if exists corong_harian;
--   drop trigger if exists jaga_jelajahi_trg on posts;
--   drop function if exists jaga_jelajahi();
--   alter table posts drop column if exists jelajahi;
--
-- Catatan: bila 019 dijalankan ulang, hak anon dicabut dari semua fungsi. Setelah itu pasang ulang grant
-- untuk jelajahi_publik dan catat_corong (bagian F) selain tiga fungsi lama.

-- 045: Profil publik (pilihan sendiri / opt-in).
-- Jalankan di Supabase SQL Editor SEBELUM mengunggah kode JS terbaru. Aman diulang.
--
-- Prinsip (sama dengan catatan publik 027 dan Jelajahi 035):
--   * Bawaan PRIVAT. Tidak ada akun lama yang tiba-tiba terbuka.
--   * Tabel profiles/posts/follows TETAP tertutup untuk anon. Tamu hanya memanggil dua fungsi sempit di bawah.
--   * Yang terlihat tamu: nama, bio, foto, tanggal bergabung, jumlah pengikut, dan catatan yang sudah dijadikan publik.
--     Daftar pengikut, balasan, suka, kapsul, dan catatan privat TIDAK pernah keluar.
--   * Profil privat dan username yang tidak ada memberi hasil sama (0 baris), jadi tamu tidak bisa menebak siapa yang ada.
--   * Mematikan saklar berlaku seketika (fungsi memeriksa saklar di setiap panggilan, tanpa cache).

-- A. Saklar
alter table profiles add column if not exists profil_publik boolean not null default false;

-- B. Pemilik mengubah saklarnya sendiri
create or replace function atur_profil_publik(p_publik boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  update profiles set profil_publik = coalesce(p_publik, false) where id = auth.uid();
  return coalesce(p_publik, false);
end $$;

-- C. Info profil untuk tamu. 0 baris = privat / tidak ada / dibekukan (halaman menampilkan ajakan bergabung, bukan galat).
create or replace function profil_publik_info(p_username text)
returns table (username text, nama text, bio text, foto text, bergabung timestamptz, pengikut bigint, jumlah_catatan bigint)
language sql stable security definer set search_path = public as $$
  select pr.username, pr.nama, pr.bio, pr.foto_url, pr.created_at,
         (select count(*) from follows f where f.following_id = pr.id),
         (select count(*) from posts p
           where p.user_id = pr.id and p.publik and not p.publik_dikunci
             and p.parent_id is null and p.kedaluwarsa is null
             and (p.terbuka_pada is null or p.terbuka_pada <= now())
             and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3)
    from profiles pr
   where pr.username = lower(coalesce(p_username, ''))
     and p_username ~ '^@?[A-Za-z0-9_]{3,20}$'
     and pr.profil_publik and pr.siap
     and not exists (select 1 from pembekuan b where b.user_id = pr.id)
   limit 1
$$;

-- D. Catatan publik milik profil itu (syarat sama dengan catatan_publik), terbaru dulu, maks 50 per panggilan.
create or replace function profil_publik_catatan(p_username text, p_limit int default 20, p_sebelum timestamptz default null)
returns table (id uuid, content text, publik_pada timestamptz, jumlah_suka bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.content, p.publik_pada,
         (select count(*) from likes l where l.post_id = p.id)
    from posts p join profiles pr on pr.id = p.user_id
   where pr.username = lower(coalesce(p_username, ''))
     and p_username ~ '^@?[A-Za-z0-9_]{3,20}$'
     and pr.profil_publik and pr.siap
     and not exists (select 1 from pembekuan b where b.user_id = pr.id)
     and p.publik and not p.publik_dikunci
     and p.parent_id is null and p.kedaluwarsa is null
     and (p.terbuka_pada is null or p.terbuka_pada <= now())
     and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3
     and (p_sebelum is null or p.publik_pada < p_sebelum)
   order by p.publik_pada desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- E. Hak akses
revoke execute on function atur_profil_publik(boolean) from public, anon;
grant  execute on function atur_profil_publik(boolean) to authenticated;
revoke execute on function profil_publik_info(text) from public;
revoke execute on function profil_publik_catatan(text, int, timestamptz) from public;
grant  execute on function profil_publik_info(text) to anon, authenticated, service_role;
grant  execute on function profil_publik_catatan(text, int, timestamptz) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah, satu per satu)
-- =====================================================================
-- 1) Fungsi yang boleh dipanggil anon. Harus TEPAT 7 baris (setelah 036 versi terbaru):
--    catat_corong, catatan_publik, daftar_publik, jelajahi_publik, landing_publik,
--    profil_publik_catatan, profil_publik_info.
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--
-- 2) Uji sebagai tamu. Akun yang saklarnya mati harus 0 baris, tanpa galat:
--   begin; set local role anon; select * from profil_publik_info('jurkon'); rollback;
--
-- 3) Nyalakan untuk satu akun lewat SQL Editor, lalu ulangi nomor 2 (harus 1 baris):
--   update profiles set profil_publik = true where username = 'jurkon';
--
-- Membatalkan: update profiles set profil_publik = false;   (atau drop function profil_publik_info(text), profil_publik_catatan(text,int,timestamptz))


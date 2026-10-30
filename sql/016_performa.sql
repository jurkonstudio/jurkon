-- JURKON 016: indeks performa (feed, balasan, profil, pengikut, pencarian)
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Hanya menambah indeks: tidak mengubah tabel, data, fungsi, atau kebijakan RLS.
-- Boleh dijalankan sebelum atau sesudah mengunggah kode terbaru ke GitHub.

-- 1. Feed Publik: posting utama terbaru
create index if not exists posts_feed_publik on posts (created_at desc) where parent_id is null;

-- 2. Balasan sebuah posting, urut waktu
create index if not exists posts_balasan_waktu on posts (parent_id, created_at) where parent_id is not null;

-- 3. Tab Catatan di profil (posting utama milik satu akun)
create index if not exists posts_catatan_user on posts (user_id, created_at desc) where parent_id is null;

-- 4. Hitung pengikut (kueri berdasarkan following_id; kunci utama hanya melayani follower_id)
create index if not exists follows_following on follows (following_id);

-- 5. Pencarian teks (ILIKE '%kata%') di Jelajah. Dibungkus agar migrasi tetap lolos
--    bila ekstensi pg_trgm tidak bisa dipasang di proyekmu.
do $$
begin
  create extension if not exists pg_trgm with schema extensions;
  perform set_config('search_path', 'public, extensions', true);
  create index if not exists posts_content_trgm    on posts    using gin (content  gin_trgm_ops);
  create index if not exists profiles_username_trgm on profiles using gin (username gin_trgm_ops);
  create index if not exists profiles_nama_trgm     on profiles using gin (nama     gin_trgm_ops);
exception when others then
  raise notice 'Indeks pencarian (pg_trgm) dilewati: %', sqlerrm;
end $$;

analyze posts; analyze follows; analyze profiles;
notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select indexname from pg_indexes where schemaname = 'public'
--    and indexname in ('posts_feed_publik','posts_balasan_waktu','posts_catatan_user','follows_following',
--                      'posts_content_trgm','profiles_username_trgm','profiles_nama_trgm');   -- 7 baris (4 bila pg_trgm dilewati)
--   explain select * from daftar_posting('semua');
--
-- MEMBATALKAN:
--   drop index if exists posts_feed_publik, posts_balasan_waktu, posts_catatan_user, follows_following,
--                        posts_content_trgm, profiles_username_trgm, profiles_nama_trgm;

-- 036: Perbaiki hak akses halaman publik (Jelajahi "Gagal memuat").
-- Aman dijalankan berulang kali. Jalankan di Supabase SQL Editor, lalu muat ulang jelajahi.html.
--
-- Penyebab paling umum: sql/019 dijalankan ulang SETELAH 035. Berkas 019 mencabut hak "anon" dari SEMUA fungsi,
-- termasuk jelajahi_publik() dan catat_corong(), sehingga pengunjung tanpa login mendapat "permission denied".
-- Berkas ini memasang kembali hak anon hanya untuk fungsi yang memang sengaja publik (daftar putih di bawah),
-- lalu meminta PostgREST memuat ulang daftar fungsinya (tanpa ini, fungsi baru kadang belum terlihat API).

do $$
declare
  nama text;
  r record;
  ada int := 0;
begin
  foreach nama in array array['catatan_publik', 'daftar_publik', 'landing_publik', 'jelajahi_publik', 'catat_corong'] loop
    for r in
      select p.oid::regprocedure as sig
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = nama and p.prokind = 'f'
    loop
      execute format('revoke execute on function %s from public', r.sig);
      execute format('grant execute on function %s to anon, authenticated, service_role', r.sig);
      ada := ada + 1;
    end loop;
  end loop;
  raise notice 'Hak anon dipasang pada % fungsi publik (harus 5).', ada;
end $$;

-- Minta API (PostgREST) memuat ulang daftar fungsi
notify pgrst, 'reload schema';

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah, satu per satu)
-- =====================================================================
-- 1) Harus TEPAT 5 baris: catat_corong, catatan_publik, daftar_publik, jelajahi_publik, landing_publik
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--
-- 2) Bila jelajahi_publik TIDAK ada di hasil nomor 1 dan juga tidak ada di daftar fungsi, berarti 035 belum
--    dijalankan: jalankan sql/035_jelajahi_publik.sql dulu, lalu berkas ini lagi.
--   select proname from pg_proc where proname = 'jelajahi_publik';
--
-- 3) Uji sebagai pengunjung (harus tidak galat; 0 baris wajar bila belum ada catatan yang dicentang Jelajahi):
--   begin; set local role anon; select * from jelajahi_publik(5, null); rollback;

-- 046: Daftar profil publik untuk sitemap dinamis (/sitemap-profil.xml di Worker).
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM memasang Worker terbaru.
-- Prasyarat: 045 (kolom profiles.profil_publik), 027 (posts.publik_pada).
--
-- Mengapa lewat fungsi, bukan "select" langsung ke tabel: sejak 019/022 tamu (anon) tidak boleh membaca
-- tabel apa pun, jadi sitemap tidak bisa memanggil /rest/v1/profiles. Fungsi ini security definer dan
-- mengembalikan HANYA username dan tanggal, dengan syarat yang sama persis seperti profil_publik_info():
--   * pemilik menyalakan "profil publik" sendiri (bawaan mati)
--   * akun sudah siap (siap) dan tidak dibekukan
-- Profil privat tidak pernah muncul di daftar, jadi sitemap tidak membocorkan nama akun.

create or replace function daftar_profil_publik(p_limit int default 1000, p_offset int default 0)
returns table (username text, diperbarui timestamptz)
language sql stable security definer set search_path = public as $$
  select pr.username,
         greatest(pr.created_at, coalesce(
           (select max(p.publik_pada) from posts p
             where p.user_id = pr.id and p.publik and not p.publik_dikunci
               and p.parent_id is null and p.kedaluwarsa is null), pr.created_at))
    from profiles pr
   where pr.profil_publik and pr.siap
     and not exists (select 1 from pembekuan b where b.user_id = pr.id)
   order by pr.created_at desc, pr.username
   limit least(greatest(coalesce(p_limit, 1000), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke execute on function daftar_profil_publik(int, int) from public;
grant  execute on function daftar_profil_publik(int, int) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah, satu per satu)
-- =====================================================================
-- 1) Fungsi yang boleh dipanggil anon. Harus TEPAT 8 baris (setelah 036 versi terbaru):
--    catat_corong, catatan_publik, daftar_profil_publik, daftar_publik, jelajahi_publik, landing_publik,
--    profil_publik_catatan, profil_publik_info.
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--
-- 2) Uji sebagai tamu (0 baris wajar bila belum ada akun yang menyalakan profil publik, tanpa galat):
--   begin; set local role anon; select * from daftar_profil_publik(10, 0); rollback;
--
-- 3) Uji tamu tidak bisa membaca tabel (harus galat "permission denied"):
--   begin; set local role anon; select * from profiles limit 1; rollback;
--
-- Membatalkan: drop function if exists daftar_profil_publik(int, int);

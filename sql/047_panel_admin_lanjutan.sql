-- JURKON 047: panel admin lanjutan.
-- Jalankan di Supabase SQL Editor SETELAH 020, 021, 023, 024, 027 dan 035. Aman dijalankan ulang.
--
-- Isi:
--  A. admin_cek_skema(): pemeriksaan kesehatan skema untuk tab "Kesehatan" di panel
--     (trigger 025 dan 027, daftar fungsi anon, kebijakan RLS "using (true)", tabel tanpa RLS, status 2 langkah tiap admin).
--  B. admin_cari_posting() diperluas: status publik, kunci, Jelajahi, berumur, kapsul, jenis + parameter filter.
--
-- Catatan: bila 020 dijalankan ulang SETELAH ini, ia membuat ulang admin_cari_posting versi lama (10 kolom)
-- dan galat "cannot change return type". Jalankan ulang 047 sesudahnya.

-- =====================================================================
-- A. Kesehatan skema (hanya baca, hanya admin)
-- =====================================================================
create or replace function admin_cek_skema() returns jsonb
language plpgsql stable security definer set search_path = public, auth, pg_catalog as $$
declare
  hasil jsonb := '[]'::jsonb;
  daftar_admin jsonb;
  v_ada boolean;
  v_teks text;
  v_n int;
  boleh text[] := array['catatan_publik','daftar_publik','landing_publik','jelajahi_publik','catat_corong',
                        'profil_publik_info','profil_publik_catatan','daftar_profil_publik'];
  anon_ada text[]; kelebihan text[]; kurang text[];
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;

  -- 1. Trigger penjaga kolom insert (025)
  select exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid
                  where g.tgname = 'a0_kunci_kolom_trg' and c.relname = 'posts' and not g.tgisinternal) into v_ada;
  hasil := hasil || jsonb_build_object('kode', 'trigger_025', 'judul', 'Trigger kunci kolom (025)',
    'status', case when v_ada then 'ok' else 'gagal' end,
    'detail', case when v_ada then 'a0_kunci_kolom_trg terpasang di posts.' else 'Belum terpasang. Jalankan ulang sql/025_kunci_kolom_insert.sql.' end);

  -- 2. Trigger penjaga kolom publik (027)
  select exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid
                  where g.tgname = 'jaga_publik_trg' and c.relname = 'posts' and not g.tgisinternal) into v_ada;
  hasil := hasil || jsonb_build_object('kode', 'trigger_027', 'judul', 'Penjaga kolom catatan publik (027)',
    'status', case when v_ada then 'ok' else 'gagal' end,
    'detail', case when v_ada then 'jaga_publik_trg terpasang di posts.' else 'Belum terpasang. Jalankan ulang sql/027_catatan_publik.sql.' end);

  -- 3. Fungsi yang bisa dipanggil anon harus persis daftar putih
  select coalesce(array_agg(p.proname::text order by p.proname), '{}') into anon_ada
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');
  select coalesce(array_agg(x order by x), '{}') into kelebihan from unnest(anon_ada) x where x <> all (boleh);
  select coalesce(array_agg(x order by x), '{}') into kurang from unnest(boleh) x where x <> all (anon_ada);
  hasil := hasil || jsonb_build_object('kode', 'fungsi_anon', 'judul', 'Fungsi terbuka untuk tamu (anon)',
    'status', case when cardinality(kelebihan) > 0 then 'gagal' when cardinality(kurang) > 0 then 'peringatan' else 'ok' end,
    'detail', case
      when cardinality(kelebihan) > 0 then 'Terbuka tapi tidak seharusnya: ' || array_to_string(kelebihan, ', ') || '. Jalankan sql/036_perbaiki_hak_anon.sql.'
      when cardinality(kurang) > 0 then 'Belum terbuka (Jelajahi/profil publik bisa gagal): ' || array_to_string(kurang, ', ') || '. Jalankan sql/036_perbaiki_hak_anon.sql.'
      else cardinality(anon_ada) || ' fungsi, sesuai daftar putih.' end);

  -- 4. Kebijakan RLS yang membuka semuanya (using true / with check true)
  select count(*), string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
    into v_n, v_teks
    from pg_policies
   where schemaname = 'public'
     and (replace(coalesce(qual, ''), ' ', '') in ('true', '(true)')
       or replace(coalesce(with_check, ''), ' ', '') in ('true', '(true)'));
  hasil := hasil || jsonb_build_object('kode', 'kebijakan_true', 'judul', 'Kebijakan RLS "using (true)"',
    'status', case when v_n = 0 then 'ok' else 'peringatan' end,
    'detail', case when v_n = 0 then 'Tidak ada.' else v_n || ' kebijakan: ' || left(v_teks, 400) || '. Wajar bila memang sengaja (mis. data publik); periksa tiap satu.' end);

  -- 5. Tabel di schema public tanpa RLS
  select count(*), string_agg(c.relname, ', ' order by c.relname) into v_n, v_teks
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  hasil := hasil || jsonb_build_object('kode', 'tanpa_rls', 'judul', 'Tabel tanpa RLS',
    'status', case when v_n = 0 then 'ok' else 'peringatan' end,
    'detail', case when v_n = 0 then 'Semua tabel memakai RLS.' else v_n || ' tabel: ' || left(v_teks, 400) || '. Aman bila hak klien (anon/authenticated) sudah dicabut dari tabel itu.' end);

  -- 6. Admin tanpa 2 langkah
  select coalesce(jsonb_agg(jsonb_build_object(
           'username', p.username, 'user_id', a.user_id,
           'dua_langkah', exists (select 1 from auth.mfa_factors f
                                   where f.user_id = a.user_id and f.factor_type = 'totp' and f.status = 'verified'))
         order by p.username), '[]'::jsonb)
    into daftar_admin
    from admins a left join profiles p on p.id = a.user_id;
  select count(*) into v_n from jsonb_array_elements(daftar_admin) x where not (x->>'dua_langkah')::boolean;
  hasil := hasil || jsonb_build_object('kode', 'dua_langkah', 'judul', 'Verifikasi 2 langkah admin',
    'status', case when v_n = 0 then 'ok' else 'peringatan' end,
    'detail', case when v_n = 0 then 'Semua admin sudah memasang 2 langkah.'
                   else v_n || ' admin belum memasang 2 langkah. Server belum memaksanya (021): mereka tetap bisa masuk hanya dengan kata sandi.' end);

  return jsonb_build_object('diperiksa', now(), 'pemeriksaan', hasil, 'admin', daftar_admin);
end $$;

revoke execute on function admin_cek_skema() from public, anon;
grant execute on function admin_cek_skema() to authenticated;

-- =====================================================================
-- B. Cari posting diperluas (kolom baru + filter)
--    p_filter: '' (semua) | publik | dikunci | jelajahi | berumur | kapsul | dilaporkan | disorot
-- =====================================================================
drop function if exists admin_cari_posting(text, int, int);
drop function if exists admin_cari_posting(text, int, int, text);

create function admin_cari_posting(p_cari text default '', p_batas int default 30, p_mulai int default 0, p_filter text default '')
returns table (
  id uuid, isi text, dibuat timestamptz, user_id uuid, username text,
  adalah_balasan boolean, dilihat int, disorot boolean, jml_suka bigint, laporan_baru bigint,
  publik boolean, publik_dikunci boolean, jelajahi boolean, kedaluwarsa timestamptz, terbuka_pada timestamptz, jenis text
)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  q text := nullif(trim(coalesce(p_cari, '')), '');
  f text := coalesce(p_filter, '');
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if f not in ('', 'publik', 'dikunci', 'jelajahi', 'berumur', 'kapsul', 'dilaporkan', 'disorot') then
    raise exception 'Filter tidak dikenal.';
  end if;
  return query
    select x.id, x.content, x.created_at, x.user_id, p.username,
           (x.parent_id is not null), x.dilihat, x.disorot,
           (select count(*) from likes l where l.post_id = x.id),
           (select count(*) from reports r where r.post_id = x.id and r.status = 'baru'),
           x.publik, x.publik_dikunci, x.jelajahi, x.kedaluwarsa, x.terbuka_pada, x.jenis
    from posts x
    join profiles p on p.id = x.user_id
    where (q is null
        or x.content ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
        or p.username ilike '%' || replace(replace(q, '%', ''), '_', '\_') || '%'
        or x.id::text = lower(q))
      and (f = ''
        or (f = 'publik'     and x.publik)
        or (f = 'dikunci'    and x.publik_dikunci)
        or (f = 'jelajahi'   and x.jelajahi)
        or (f = 'berumur'    and x.kedaluwarsa is not null)
        or (f = 'kapsul'     and x.terbuka_pada is not null)
        or (f = 'disorot'    and x.disorot)
        or (f = 'dilaporkan' and exists (select 1 from reports r where r.post_id = x.id and r.status = 'baru')))
    order by x.created_at desc
    limit greatest(1, least(coalesce(p_batas, 30), 100)) offset greatest(coalesce(p_mulai, 0), 0);
end $$;

revoke execute on function admin_cari_posting(text, int, int, text) from public, anon;
grant execute on function admin_cari_posting(text, int, int, text) to authenticated;

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah)
-- =====================================================================
-- 1) Tidak boleh ada fungsi baru yang terbuka untuk anon. Hasil yang BENAR: 0 baris.
--   select proname from pg_proc where proname in ('admin_cek_skema','admin_cari_posting')
--      and has_function_privilege('anon', oid, 'execute');
-- 2) Dari panel (login admin): tab "Kesehatan" harus menampilkan 6 pemeriksaan.
--
-- Pembatalan:
--   drop function if exists admin_cek_skema();
--   drop function if exists admin_cari_posting(text, int, int, text);
--   lalu jalankan ulang 020 (mengembalikan admin_cari_posting versi lama).

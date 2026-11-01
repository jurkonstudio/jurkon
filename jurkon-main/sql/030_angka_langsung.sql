-- =====================================================================
-- JURKON 030: angka langsung pada kartu posting (suka, tidak suka, posting ulang + kutip, tayang).
-- Dipanggil oleh js/ui.js (pasangAngkaLangsung) tiap beberapa detik untuk kartu yang sedang terlihat.
-- Satu pemanggilan untuk sampai 100 posting; hanya angka, tanpa isi posting. Aman dijalankan ulang.
-- Syarat: 010 (kolom posts.dilihat), 013 (dislikes, ada_blokir). Tanpa migrasi ini kartu tetap
-- berfungsi: angkanya hanya tidak menyegarkan diri.
-- =====================================================================
create or replace function angka_posting(p_ids uuid[])
returns table (id uuid, suka bigint, tidak_suka bigint, ulang bigint, kutip bigint, dilihat integer)
language sql stable security definer set search_path = public as $$
  select p.id,
    (select count(*) from likes l where l.post_id = p.id),
    (select count(*) from dislikes d where d.post_id = p.id),
    (select count(*) from posts r where r.kutip_id = p.id and r.jenis = 'ulang'),
    (select count(*) from posts q where q.kutip_id = p.id and q.jenis = 'kutip'),
    p.dilihat
  from posts p
  where auth.uid() is not null
    and p.id = any (p_ids[1:100])
    and not ada_blokir(auth.uid(), p.user_id);
$$;

revoke execute on function angka_posting(uuid[]) from public, anon;
grant execute on function angka_posting(uuid[]) to authenticated;

-- PEMERIKSAAN
-- 1) Harus 0 baris (anon tidak boleh memanggil):
--      select p.proname from pg_proc p where p.proname = 'angka_posting' and has_function_privilege('anon', p.oid, 'execute');
-- 2) Sebagai anggota login, harus mengembalikan 1 baris berisi angka:
--      select * from angka_posting(array[(select id from posts limit 1)]);
--
-- Pembatalan: drop function if exists angka_posting(uuid[]);
-- =====================================================================

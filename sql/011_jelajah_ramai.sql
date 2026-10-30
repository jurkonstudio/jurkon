-- JURKON 011: Jelajah menampilkan posting yang sedang ramai dibahas (trending).
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman dijalankan ulang.
-- Syarat: migrasi 010 sudah dijalankan (memakai kolom posts.dilihat). Jalankan SEBELUM mengunggah JS terbaru.
--
-- posting_ramai(p_limit, p_jam): posting utama (bukan balasan) dalam p_jam jam terakhir, diurutkan
-- berdasarkan skor keramaian yang meluruh seiring waktu:
--     (suka*2 + balasan*3 + dilihat*0.05) / (umur_jam + 2)^1.4
--   - suka dan balasan dihitung per orang berbeda dan TIDAK menghitung milik penulisnya sendiri
--     (supaya tidak bisa didongkrak sendiri); dilihat dibatasi 500 agar tidak mendominasi.
--   - hanya posting dengan minimal 1 suka/balasan dari orang lain yang masuk.
-- Memakai hak pengguna (security invoker), jadi aturan privasi & blokir yang ada tetap berlaku.
--
-- Tanpa migrasi ini aplikasi tetap jalan: Jelajah memakai cara cadangan (diurutkan dari jumlah suka).

create or replace function posting_ramai(p_limit int default 10, p_jam int default 72)
returns table (
  id uuid, user_id uuid, parent_id uuid, content text, created_at timestamptz,
  username text, nama text, jumlah_suka bigint, sudah_suka boolean, foto text,
  dilihat integer, induk_username text, suka_pada timestamptz
)
language sql stable security invoker set search_path = public as $$
  with kandidat as (
    select p.id, p.user_id, p.content, p.created_at, p.dilihat,
      (select count(distinct l.user_id) from likes l where l.post_id = p.id and l.user_id <> p.user_id) as suka_lain,
      (select count(distinct r.user_id) from posts r where r.parent_id = p.id and r.user_id <> p.user_id) as balas_lain
    from posts p
    where p.parent_id is null
      and p.created_at > now() - make_interval(hours => least(greatest(coalesce(p_jam, 72), 1), 720))
  )
  select k.id, k.user_id, null::uuid, k.content, k.created_at, pr.username, pr.nama,
    (select count(*) from likes l where l.post_id = k.id) as jumlah_suka,
    exists (select 1 from likes l2 where l2.post_id = k.id and l2.user_id = auth.uid()) as sudah_suka,
    pr.foto_url as foto,
    k.dilihat,
    null::text, null::timestamptz
  from kandidat k
  join profiles pr on pr.id = k.user_id
  where k.suka_lain + k.balas_lain >= 1
  order by ((k.suka_lain * 2 + k.balas_lain * 3 + least(k.dilihat, 500) * 0.05)
            / power(extract(epoch from (now() - k.created_at)) / 3600.0 + 2, 1.4)) desc,
           k.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 30);
$$;
revoke execute on function posting_ramai(int, int) from public, anon;
grant execute on function posting_ramai(int, int) to authenticated;

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select * from posting_ramai(10, 72);   -- maksimal 10 baris; kosong bila belum ada interaksi
-- Untuk membatalkan: drop function posting_ramai(int, int);

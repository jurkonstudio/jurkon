-- JURKON 036: pratinjau tautan untuk SEMUA catatan yang dibagikan (bukan hanya catatan publik).
-- Dipakai Worker Cloudflare untuk membuat kartu pratinjau (judul + cuplikan) di WhatsApp, X, Facebook, dll.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: migrasi 027 (kolom publik_dikunci) dan 024 (terbuka_pada) sudah dijalankan.
--
-- Yang keluar ke dunia luar dari fungsi ini HANYA: nama, @username, tanggal, dan 160 karakter pertama isi catatan.
-- Tabel posts tetap tertutup untuk anon; satu catatan per panggilan, dan id-nya (UUID) harus diketahui.
-- Tidak pernah tampil: catatan berumur (kedaluwarsa), kapsul waktu yang belum terbuka, catatan yang dikunci
-- pengelola, catatan dari akun yang dibekukan, dan catatan dengan >= 3 laporan baru.

create or replace function pratinjau_catatan(p_id uuid)
returns table (id uuid, cuplikan text, created_at timestamptz, username text, nama text)
language sql stable security definer set search_path = public as $$
  select p.id, left(p.content, 160), p.created_at, pr.username, pr.nama
    from posts p join profiles pr on pr.id = p.user_id
   where p.id = p_id
     and p.kedaluwarsa is null
     and not p.publik_dikunci
     and (p.terbuka_pada is null or p.terbuka_pada <= now())
     and not exists (select 1 from pembekuan b where b.user_id = p.user_id)
     and (select count(*) from reports r where r.post_id = p.id and r.status = 'baru') < 3
$$;

revoke execute on function pratinjau_catatan(uuid) from public;
grant execute on function pratinjau_catatan(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- PEMERIKSAAN:  select * from pratinjau_catatan('<id catatan>');   -- 1 baris
-- MEMBATALKAN:  drop function pratinjau_catatan(uuid);   (Worker otomatis kembali ke tampilan generik)

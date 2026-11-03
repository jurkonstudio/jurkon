-- JURKON 044: onboarding pengguna baru, tautan undangan, dan statistik pendaftaran/retensi (tanpa pelacak).
--
-- Isi:
--   A. undangan            : siapa mengundang siapa (satu baris per orang yang diundang; tanpa kebijakan RLS).
--   B. terima_undangan()   : dipanggil klien setelah username dipilih (selamat.js). Opsional ikut mengikuti pengundang.
--   C. jumlah_undangan()   : berapa orang yang bergabung lewat tautanmu (untuk halaman mulai.html).
--   D. saran_akun()        : akun yang disarankan di langkah 1 onboarding (akun resmi + penulis catatan publik terbaru).
--   E. catat_corong()      : daftar langkah diperluas (daftar_buka, onboarding_mulai, onboarding_selesai, undangan_buka).
--   F. admin_retensi()     : tabel kohort harian untuk halaman statistik.html (khusus pengelola).
--
-- Jalankan di Supabase SQL Editor SEBELUM mengunggah kode JS terbaru. Aman diulang.

-- ------------------------------------------------------------ A. tabel undangan
create table if not exists undangan (
  diundang   uuid primary key references profiles(id) on delete cascade,
  pengundang uuid not null references profiles(id) on delete cascade,
  dibuat_at  timestamptz not null default now(),
  check (diundang <> pengundang)
);
create index if not exists undangan_pengundang_idx on undangan (pengundang);
alter table undangan enable row level security;     -- tanpa kebijakan: hanya fungsi security definer di bawah
revoke all on undangan from anon, authenticated;

-- ------------------------------------------------------------ B. terima undangan
-- Aturan: hanya akun yang baru dibuat (maks 3 hari), hanya sekali, tidak bisa mengundang diri sendiri.
-- p_ikuti = true: pengguna baru mengikuti pengundang (pilihan pengguna sendiri, bukan otomatis).
create or replace function terima_undangan(p_username text, p_ikuti boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  u  text := lower(btrim(coalesce(p_username, '')));
  pid uuid; pnama text; dibuat timestamptz;
begin
  if me is null then return jsonb_build_object('ok', false); end if;
  if u !~ '^[a-z0-9_]{3,20}$' then return jsonb_build_object('ok', false); end if;
  select created_at into dibuat from profiles where id = me;
  if dibuat is null or dibuat < now() - interval '3 days' then return jsonb_build_object('ok', false); end if;
  select id, coalesce(nama, username) into pid, pnama from profiles where username = u and siap;
  if pid is null or pid = me then return jsonb_build_object('ok', false); end if;
  if exists (select 1 from blocks where (blocker_id = pid and blocked_id = me) or (blocker_id = me and blocked_id = pid)) then
    return jsonb_build_object('ok', false);
  end if;
  insert into undangan (diundang, pengundang) values (me, pid) on conflict (diundang) do nothing;
  if p_ikuti then
    insert into follows (follower_id, following_id) values (me, pid) on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true, 'username', u, 'nama', pnama);
end $$;

-- ------------------------------------------------------------ C. jumlah undangan milikku
create or replace function jumlah_undangan() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from undangan where pengundang = auth.uid();
$$;

-- ------------------------------------------------------------ D. saran akun
-- Akun resmi lebih dulu, lalu penulis dengan catatan publik terbaru. Tanpa diri sendiri, tanpa yang sudah diikuti,
-- tanpa blokir (dua arah), tanpa akun yang dibekukan. Hanya username, nama, bio, foto: data yang memang tampil di profil.
create or replace function saran_akun(p_limit int default 8)
returns table (id uuid, username text, nama text, bio text, foto_url text)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.username, pr.nama, pr.bio, pr.foto_url
    from profiles pr
    left join lateral (
      select max(p.publik_pada) as terakhir from posts p
       where p.user_id = pr.id and p.publik and not p.publik_dikunci and p.parent_id is null
         and p.kedaluwarsa is null and (p.terbuka_pada is null or p.terbuka_pada <= now())
    ) q on true
   where auth.uid() is not null and pr.siap and pr.id <> auth.uid()
     and (akun_resmi_uid(pr.id) or q.terakhir is not null)
     and not exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = pr.id)
     and not exists (select 1 from blocks b where (b.blocker_id = pr.id and b.blocked_id = auth.uid())
                                              or (b.blocker_id = auth.uid() and b.blocked_id = pr.id))
     and not exists (select 1 from pembekuan z where z.user_id = pr.id)
   order by akun_resmi_uid(pr.id) desc, q.terakhir desc nulls last
   limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

-- ------------------------------------------------------------ E. langkah corong baru
create or replace function catat_corong(p_langkah text, p_bahasa text default 'id') returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_langkah is null or p_langkah not in ('landing', 'landing_mulai', 'jelajahi', 'jelajahi_baca', 'login_buka',
       'daftar_buka', 'onboarding_mulai', 'onboarding_selesai', 'undangan_buka') then return; end if;
  if p_bahasa is null or p_bahasa not in ('id', 'en', 'ms', 'jv', 'su', 'zh', 'ja', 'ko', 'hi', 'es', 'fr', 'ar') then p_bahasa := 'id'; end if;
  insert into corong_harian (hari, langkah, bahasa, jumlah) values (current_date, p_langkah, p_bahasa, 1)
  on conflict (hari, langkah, bahasa) do update set jumlah = corong_harian.jumlah + 1;
end $$;

-- ------------------------------------------------------------ F. kohort harian (khusus pengelola)
-- aktif_d1 / aktif_d7: akun yang masih tercatat aktif (sesi_login.terakhir_at) paling cepat 1 / 7 hari setelah daftar.
-- Kohort yang belum cukup umur menampilkan NULL pada kolom itu, bukan 0.
create or replace function admin_retensi(p_hari int default 30)
returns table (hari date, akun_baru bigint, selesai_profil bigint, catatan_7h bigint, ikut_akun bigint,
               aktif_d1 bigint, aktif_d7 bigint, lewat_undangan bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'Khusus pengelola.'; end if;
  return query
    select pr.created_at::date,
           count(*)::bigint,
           count(*) filter (where pr.siap)::bigint,
           count(*) filter (where exists (select 1 from posts p where p.user_id = pr.id and p.parent_id is null
                                             and p.created_at < pr.created_at + interval '7 days'))::bigint,
           count(*) filter (where exists (select 1 from follows f where f.follower_id = pr.id))::bigint,
           case when pr.created_at::date <= current_date - 1 then
             count(*) filter (where exists (select 1 from sesi_login s where s.user_id = pr.id and s.terakhir_at >= pr.created_at + interval '1 day'))::bigint end,
           case when pr.created_at::date <= current_date - 7 then
             count(*) filter (where exists (select 1 from sesi_login s where s.user_id = pr.id and s.terakhir_at >= pr.created_at + interval '7 days'))::bigint end,
           count(*) filter (where exists (select 1 from undangan u where u.diundang = pr.id))::bigint
      from profiles pr
     where pr.created_at::date > current_date - least(greatest(coalesce(p_hari, 30), 1), 365)
     group by pr.created_at::date
     order by 1 desc;
end $$;

-- ------------------------------------------------------------ hak akses
revoke execute on function terima_undangan(text, boolean) from public, anon;
revoke execute on function jumlah_undangan() from public, anon;
revoke execute on function saran_akun(int) from public, anon;
revoke execute on function admin_retensi(int) from public, anon;
revoke execute on function catat_corong(text, text) from public;
grant execute on function terima_undangan(text, boolean) to authenticated;
grant execute on function jumlah_undangan() to authenticated;
grant execute on function saran_akun(int) to authenticated;
grant execute on function admin_retensi(int) to authenticated;
grant execute on function catat_corong(text, text) to anon, authenticated;

-- PEMERIKSAAN: hasil yang BENAR adalah 0 baris tambahan untuk anon selain catat_corong (dan landing_publik dll. yang lama).
select 'terbuka untuk anon' as info, p.oid::regprocedure::text as nama
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('terima_undangan', 'jumlah_undangan', 'saran_akun', 'admin_retensi')
   and has_function_privilege('anon', p.oid, 'execute');

-- Membatalkan: drop function terima_undangan(text, boolean); drop function jumlah_undangan(); drop function saran_akun(int);
--              drop function admin_retensi(int); drop table undangan;  (catat_corong: jalankan ulang 035)

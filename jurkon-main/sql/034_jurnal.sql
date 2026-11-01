-- =====================================================================
-- JURKON 034: Jurnal (catatan pribadi, per catatan bisa dijadikan publik).
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: 002 (ada_blokir, ekspor_data), 004 (cek_konten), 019 (pembekuan), 020/021 (is_admin).
--
-- Jurnal BUKAN "Catatan publik" (027). Tabelnya terpisah dari posts, jadi tidak muncul di feed,
-- Jelajah, notifikasi, atau hasil pencarian, dan tidak pernah terbaca oleh orang yang belum login.
--
-- Aturan (semuanya ditegakkan di database, bukan hanya di tampilan):
--  * Isi hanya teks, 1 sampai 2000 karakter (tanpa spasi kosong saja).
--  * Maksimal 50 catatan per akun.
--  * Bawaan PRIBADI: hanya pemilik yang bisa membaca. Bila publik = true, semua anggota yang sudah
--    masuk bisa membaca (kecuali saling blokir), sesuai kebijakan privasi: data hanya untuk anggota.
--  * Catatan yang dijadikan publik (atau diubah isinya saat publik) lewat cek_konten().
--    Catatan pribadi tidak disaring karena tidak dibaca orang lain.
--  * Akun dibekukan tidak bisa menulis, mengubah, atau menghapus lewat API.
--  * Pemilik tidak bisa memindahkan catatan ke akun lain atau memalsukan waktu dibuat.
--  * Ikut terhapus saat akun dihapus (cascade) dan ikut terunduh di ekspor_data().
--  * Pengelola bisa menghapus catatan publik yang melanggar (kebijakan hapus is_admin()).
-- =====================================================================

create table if not exists jurnal (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  isi        text not null,
  publik     boolean not null default false,
  dibuat_at  timestamptz not null default now(),
  diubah_at  timestamptz not null default now(),
  constraint jurnal_isi_check check (char_length(isi) <= 2000 and btrim(isi) <> '')
);
create index if not exists jurnal_user_idx on jurnal (user_id, dibuat_at desc);

alter table jurnal enable row level security;
revoke all on jurnal from anon;
grant select, insert, update, delete on jurnal to authenticated;

-- A. Kebijakan: pemilik penuh atas miliknya; anggota lain hanya membaca yang publik
drop policy if exists "jurnal dibaca" on jurnal;
create policy "jurnal dibaca" on jurnal for select
  using (auth.uid() is not null
         and (user_id = auth.uid() or (publik and not ada_blokir(auth.uid(), user_id))));

drop policy if exists "jurnal ditulis pemilik" on jurnal;
create policy "jurnal ditulis pemilik" on jurnal for insert
  with check (user_id = auth.uid());

drop policy if exists "jurnal diubah pemilik" on jurnal;
create policy "jurnal diubah pemilik" on jurnal for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "jurnal dihapus pemilik" on jurnal;
create policy "jurnal dihapus pemilik" on jurnal for delete
  using (user_id = auth.uid());

drop policy if exists "jurnal dihapus admin" on jurnal;
create policy "jurnal dihapus admin" on jurnal for delete
  using (is_admin());

-- B. Penjaga: batas 50, filter konten untuk yang publik, kolom tetap, pembekuan
create or replace function jaga_jurnal() returns trigger
language plpgsql set search_path = public as $$
declare
  n int;
  k text;
  periksa boolean;
begin
  if auth.uid() is null then return new; end if;           -- SQL Editor / service role

  if exists (select 1 from pembekuan where user_id = auth.uid()) then
    raise exception 'Akunmu sedang dibekukan. Hubungi admin bila ini keliru.';
  end if;

  new.isi := btrim(new.isi);

  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.dibuat_at := now();
    new.diubah_at := now();
    -- Kunci per akun supaya dua penyimpanan bersamaan tidak melewati batas
    perform pg_advisory_xact_lock(hashtext('jurnal:' || new.user_id::text));
    select count(*) into n from jurnal where user_id = new.user_id;
    if n >= 50 then
      raise exception 'Jurnal penuh: maksimal 50 catatan. Hapus yang lama dulu.';
    end if;
  else
    if new.user_id is distinct from old.user_id or new.dibuat_at is distinct from old.dibuat_at then
      raise exception 'Pemilik dan waktu dibuat tidak bisa diubah.';
    end if;
    if new.isi is distinct from old.isi then new.diubah_at := now(); else new.diubah_at := old.diubah_at; end if;
  end if;

  -- Disaring hanya bila catatan publik baru, baru dijadikan publik, atau isinya berubah saat publik.
  -- (Dipisah per cabang: OLD tidak ada saat INSERT dan tidak boleh disentuh.)
  periksa := false;
  if new.publik then
    if tg_op = 'INSERT' then periksa := true;
    elsif new.isi is distinct from old.isi or not old.publik then periksa := true;
    end if;
  end if;
  if periksa then
    k := cek_konten(new.isi);
    if k is not null then raise exception 'KONTEN_DILARANG|%', k using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;

drop trigger if exists jaga_jurnal_trg on jurnal;
create trigger jaga_jurnal_trg before insert or update on jurnal
  for each row execute function jaga_jurnal();

-- Hapus juga harus lewat pemeriksaan pembekuan (akun beku tidak boleh mengubah apa pun)
create or replace function jaga_jurnal_hapus() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and old.user_id = auth.uid()
     and exists (select 1 from pembekuan where user_id = auth.uid()) then
    raise exception 'Akunmu sedang dibekukan. Hubungi admin bila ini keliru.';
  end if;
  return old;
end $$;
drop trigger if exists jaga_jurnal_hapus_trg on jurnal;
create trigger jaga_jurnal_hapus_trg before delete on jurnal
  for each row execute function jaga_jurnal_hapus();

-- C. Unduh data saya (UU PDP) ikut memuat jurnal. Sama dengan versi 002 ditambah kunci 'jurnal'.
create or replace function ekspor_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'tidak valid'; end if;
  return jsonb_build_object(
    'diekspor_pada', now(),
    'email', (select email from auth.users where id = uid),
    'profil', (select to_jsonb(p) from profiles p where p.id = uid),
    'posting', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from posts x where x.user_id = uid), '[]'::jsonb),
    'suka', coalesce((select jsonb_agg(to_jsonb(l)) from likes l where l.user_id = uid), '[]'::jsonb),
    'mengikuti', coalesce((select jsonb_agg(f.following_id) from follows f where f.follower_id = uid), '[]'::jsonb),
    'pengikut', coalesce((select jsonb_agg(f.follower_id) from follows f where f.following_id = uid), '[]'::jsonb),
    'diblokir', coalesce((select jsonb_agg(b.blocked_id) from blocks b where b.blocker_id = uid), '[]'::jsonb),
    'pesan', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at)
                       from messages m join conversations c on c.id = m.conversation_id
                       where uid in (c.user_a, c.user_b)), '[]'::jsonb),
    'jurnal', coalesce((select jsonb_agg(to_jsonb(j) order by j.dibuat_at) from jurnal j where j.user_id = uid), '[]'::jsonb)
  );
end $$;
revoke execute on function ekspor_data() from public, anon;
grant execute on function ekspor_data() to authenticated;

-- PEMERIKSAAN (jalankan satu per satu)
-- 1) Harus 1 baris (RLS menyala):
--      select relrowsecurity from pg_class where relname = 'jurnal' and relrowsecurity;
-- 2) Harus 5 baris (kebijakan):
--      select policyname from pg_policies where tablename = 'jurnal';
-- 3) Harus 2 baris (trigger):
--      select tgname from pg_trigger where tgrelid = 'public.jurnal'::regclass and not tgisinternal;
-- 4) Harus 0 baris (anon tidak punya hak apa pun):
--      select privilege_type from information_schema.role_table_grants where table_name = 'jurnal' and grantee = 'anon';
--
-- Pembatalan:
--   drop table if exists jurnal;
--   drop function if exists jaga_jurnal(); drop function if exists jaga_jurnal_hapus();
--   (lalu jalankan ulang bagian ekspor_data() dari 002 untuk mengembalikan versi lama)
-- =====================================================================

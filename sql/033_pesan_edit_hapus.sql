-- =====================================================================
-- JURKON 033: edit dan hapus pesan di chat (hanya milik sendiri).
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: 004, 014b, 017 sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.
--
-- Aturan:
--  * Edit: hanya pesan TEKS milik sendiri, maksimal 24 jam sejak dikirim, hanya bila kedua akun masih
--    saling mengikuti dan tidak saling memblokir (sama seperti mengirim, supaya aturan saling-ikuti
--    tidak bisa dilewati dengan mengedit pesan lama). Teks baru lewat filter konten yang sama.
--    Pesan yang diedit diberi tanda waktu `diedit_at`; lawan bicara melihat label "diedit".
--  * Hapus: pesan teks, foto, atau suara milik sendiri, kapan saja, tanpa syarat saling-ikuti.
--    Dihapus untuk SEMUA orang. Isi benar-benar dikosongkan di database (bukan hanya disembunyikan);
--    barisnya tetap ada dengan `dihapus_at` supaya layar lawan bicara berubah jadi "Pesan ini dihapus"
--    lewat realtime. Berkas foto/suara dibuang klien dari storage (fungsi mengembalikan path-nya).
--  * Klien TIDAK diberi kebijakan UPDATE di tabel messages. Satu-satunya jalan adalah dua fungsi di bawah,
--    jadi kolom lain (pengirim, waktu kirim, percakapan) tidak bisa dipalsukan lewat API.
-- =====================================================================

-- A. Kolom baru
alter table messages add column if not exists diedit_at timestamptz;
alter table messages add column if not exists dihapus_at timestamptz;

-- B. Pesan yang dihapus boleh berisi teks kosong (aturan lama: teks 1-750 karakter, kecuali media)
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.messages'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%char_length(content)%'
  loop
    execute format('alter table messages drop constraint %I', r.conname);
  end loop;
  alter table messages add constraint messages_isi_check check (
    dihapus_at is not null
    or (media_path is null and char_length(content) between 1 and 750)
    or (media_path is not null and char_length(content) <= 750));
end $$;

-- C. Edit pesan teks. Mengembalikan waktu edit.
create or replace function edit_pesan(p_id uuid, p_isi text) returns timestamptz
language plpgsql security definer set search_path = public, auth as $$
declare
  m messages%rowtype;
  c conversations%rowtype;
  isi text := btrim(coalesce(p_isi, ''));
  k text;
  waktu timestamptz;
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if char_length(isi) < 1 or char_length(isi) > 750 then
    raise exception 'Pesan harus berisi 1 sampai 750 karakter.';
  end if;

  select * into m from messages where id = p_id for update;
  if not found or m.sender_id <> auth.uid() then raise exception 'Pesan tidak ditemukan.'; end if;
  if m.dihapus_at is not null then raise exception 'Pesan ini sudah dihapus.'; end if;
  if m.media_path is not null then raise exception 'Pesan foto atau suara tidak bisa diedit.'; end if;
  if m.created_at < now() - interval '24 hours' then
    raise exception 'Pesan hanya bisa diedit dalam 24 jam setelah dikirim.';
  end if;

  -- Sama seperti gerbang saat mengirim: akun dibekukan atau email belum terverifikasi tidak boleh mengubah isi
  if exists (select 1 from pembekuan where user_id = auth.uid()) then
    raise exception 'Akunmu sedang dibekukan. Hubungi admin bila ini keliru.';
  end if;

  select * into c from conversations where id = m.conversation_id;
  if ada_blokir(c.user_a, c.user_b) then raise exception 'Tidak dapat mengirim pesan ke pengguna ini.'; end if;
  if not saling_ikuti(c.user_a, c.user_b) then
    raise exception 'Kalian harus saling mengikuti untuk bisa mengubah pesan.';
  end if;

  if isi = m.content then return m.diedit_at; end if;   -- tidak ada perubahan

  k := cek_konten(isi);
  if k is not null then raise exception 'KONTEN_DILARANG|%', k using errcode = 'P0001'; end if;

  update messages set content = isi, diedit_at = now() where id = p_id returning diedit_at into waktu;
  return waktu;
end $$;

-- D. Hapus pesan (untuk semua orang). Mengembalikan path berkas media yang harus dibuang dari storage (atau null).
create or replace function hapus_pesan(p_id uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare m messages%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  select * into m from messages where id = p_id for update;
  if not found or m.sender_id <> auth.uid() then raise exception 'Pesan tidak ditemukan.'; end if;
  if m.dihapus_at is not null then return null; end if;   -- sudah terhapus: aman diulang

  update messages
     set content = '', media_path = null, media_jenis = null, diedit_at = null, dihapus_at = now()
   where id = p_id;
  return m.media_path;
end $$;

revoke execute on function edit_pesan(uuid, text) from public, anon;
revoke execute on function hapus_pesan(uuid) from public, anon;
grant execute on function edit_pesan(uuid, text) to authenticated;
grant execute on function hapus_pesan(uuid) to authenticated;

-- =====================================================================
-- PEMERIKSAAN (jalankan terpisah setelah migrasi)
-- =====================================================================
-- 1) Kolom ada: harus 2 baris
--    select column_name from information_schema.columns
--     where table_name = 'messages' and column_name in ('diedit_at', 'dihapus_at');
-- 2) Fungsi ada dan TIDAK bisa dipanggil anon: harus 2 baris, anon_bisa = false
--    select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_bisa
--      from pg_proc p where p.proname in ('edit_pesan', 'hapus_pesan');
-- 3) Tabel messages tidak punya kebijakan UPDATE/DELETE untuk klien: harus 0 baris
--    select policyname, cmd from pg_policies
--     where tablename = 'messages' and cmd in ('UPDATE', 'DELETE', 'ALL');
-- 4) Uji manual di aplikasi: edit pesan sendiri (muncul "diedit" di kedua layar), hapus pesan
--    (kedua layar berubah jadi "Pesan ini dihapus"), coba edit setelah salah satu berhenti mengikuti
--    (ditolak, tetapi hapus tetap boleh).

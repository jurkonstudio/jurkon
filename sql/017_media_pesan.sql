-- JURKON 017: kirim FOTO dan PESAN SUARA di chat. Berkas hanya bisa dibuka 10 menit setelah dikirim.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: schema.sql dan migrasi 002, 004, 007, 014 sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.

-- =====================================================================
-- A. Kolom media di tabel messages
-- =====================================================================
alter table messages add column if not exists media_jenis text;   -- 'foto' | 'suara'
alter table messages add column if not exists media_path text;    -- <id percakapan>/<id pengirim>/<uuid>.<ekstensi>

do $$
declare r record;
begin
  -- Aturan lama "isi 1-750 karakter" diganti: pesan media boleh tanpa teks
  for r in select conname from pg_constraint
           where conrelid = 'public.messages'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%char_length(content)%'
  loop
    execute format('alter table messages drop constraint %I', r.conname);
  end loop;
  alter table messages add constraint messages_isi_check check (
    (media_path is null and char_length(content) between 1 and 750)
    or (media_path is not null and char_length(content) <= 750));

  alter table messages drop constraint if exists messages_media_check;
  alter table messages add constraint messages_media_check check (
    (media_path is null and media_jenis is null)
    or (media_jenis in ('foto', 'suara')
        and char_length(media_path) <= 200
        and media_path like conversation_id::text || '/' || sender_id::text || '/%'));
end $$;

-- =====================================================================
-- B. Penyimpanan: bucket PRIVAT (tidak ada tautan publik)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-pesan', 'media-pesan', false, 3145728,
        array['image/jpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Peserta percakapan yang tidak saling memblokir
create or replace function boleh_baca_media(p_nama text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversations c
                  where c.id::text = (storage.foldername(p_nama))[1]
                    and auth.uid() in (c.user_a, c.user_b)
                    and not ada_blokir(c.user_a, c.user_b));
$$;
revoke execute on function boleh_baca_media(text) from public, anon;
grant execute on function boleh_baca_media(text) to authenticated;

-- Unggah: hanya ke folder <percakapan>/<id sendiri>/, hanya bila saling mengikuti, maks 12 berkas per 10 menit
drop policy if exists "media pesan unggah" on storage.objects;
create policy "media pesan unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media-pesan'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from conversations c
                 where c.id::text = (storage.foldername(name))[1]
                   and auth.uid() in (c.user_a, c.user_b)
                   and not ada_blokir(c.user_a, c.user_b)
                   and saling_ikuti(c.user_a, c.user_b))
    and (select count(*) from storage.objects o
          where o.bucket_id = 'media-pesan'
            and (storage.foldername(o.name))[2] = auth.uid()::text
            and o.created_at > now() - interval '10 minutes') < 12
  );

-- Baca: peserta percakapan HANYA selama 10 menit sejak diunggah (ditegakkan di database, bukan di layar).
-- Pengirim tetap melihat berkasnya sendiri selama masih ada, supaya klien bisa menghapusnya.
drop policy if exists "media pesan baca" on storage.objects;
create policy "media pesan baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'media-pesan'
    and ((created_at > now() - interval '10 minutes' and boleh_baca_media(name))
         or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- Hapus: hanya berkas milik sendiri
drop policy if exists "media pesan hapus" on storage.objects;
create policy "media pesan hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'media-pesan' and (storage.foldername(name))[2] = auth.uid()::text);

-- =====================================================================
-- C. Pembatas pesan: media tidak dihitung sebagai "pesan sama yang disebar", plus batas media per jam
-- =====================================================================
create or replace function batasi_pesan() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; hari int; baru boolean; siaran int; lawan int; sudah boolean; jml_media int;
begin
  baru := akun_baru(new.sender_id);
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into menit, hari
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if menit >= (case when baru then 8 else 15 end) then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if hari >= (case when baru then 100 else 300 end) then raise exception 'Batas pesan harian tercapai. Coba lagi besok.'; end if;
  if new.media_path is not null then
    select count(*) into jml_media from messages
      where sender_id = new.sender_id and media_path is not null and created_at > now() - interval '1 hour';
    if jml_media >= (case when baru then 10 else 40 end) then
      raise exception 'Terlalu banyak foto atau pesan suara dalam satu jam. Coba lagi nanti.';
    end if;
  end if;
  perform cek_isi_spam(new.content, baru);
  if new.media_path is null then
    select count(distinct conversation_id) into siaran from messages
      where sender_id = new.sender_id and created_at > now() - interval '1 hour'
        and conversation_id <> new.conversation_id and norm_teks(content) = norm_teks(new.content);
    if siaran >= 2 then raise exception 'Pesan yang sama sudah kamu kirim ke beberapa orang. Ubah isinya atau tunggu dulu.'; end if;
  end if;
  select count(distinct conversation_id), coalesce(bool_or(conversation_id = new.conversation_id), false)
    into lawan, sudah
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if not sudah and lawan >= (case when baru then 5 else 30 end) then
    raise exception 'Kamu sudah menghubungi terlalu banyak orang hari ini. Coba lagi besok.';
  end if;
  return new;
end $$;
drop trigger if exists batasi_pesan_trg on messages;
create trigger batasi_pesan_trg before insert on messages
  for each row execute function batasi_pesan();

-- =====================================================================
-- D. Penghapusan fisik berkas kedaluwarsa (dipanggil Edge Function terjadwal, lihat README)
--    Akses sudah tertutup oleh kebijakan baca di atas; ini yang benar-benar membuang berkasnya.
-- =====================================================================
create or replace function media_pesan_kedaluwarsa(p_batas int default 500) returns setof text
language sql stable security definer set search_path = public as $$
  select name from storage.objects
   where bucket_id = 'media-pesan' and created_at < now() - interval '10 minutes'
   order by created_at limit greatest(1, least(p_batas, 1000));
$$;
revoke execute on function media_pesan_kedaluwarsa(int) from public, anon, authenticated;
grant execute on function media_pesan_kedaluwarsa(int) to service_role;

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select id, public, file_size_limit from storage.buckets where id = 'media-pesan';   -- 1 baris, public = false
--   select column_name from information_schema.columns where table_name = 'messages' and column_name like 'media_%';  -- 2 baris
-- MEMBATALKAN: hapus kebijakan "media pesan ..." di storage.objects, lalu
--   alter table messages drop constraint messages_media_check, drop constraint messages_isi_check;

-- JURKON 035: kirim DOKUMEN di chat (maks 5 MB). Sama seperti foto & pesan suara (017): bucket privat,
-- hanya bisa dibuka 10 menit sejak dikirim, lalu berkasnya dibuang oleh Edge Function terjadwal.
-- Penerima bisa menyimpannya ke perangkat sendiri (tombol Simpan) selama 10 menit itu.
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
-- Prasyarat: migrasi 017 dan 033 sudah dijalankan. Jalankan SEBELUM mengunggah kode JS terbaru.

-- =====================================================================
-- A. Kolom nama & ukuran dokumen, dan jenis baru 'dokumen'
-- =====================================================================
alter table messages add column if not exists media_nama text;      -- nama berkas asli (hanya untuk tampilan)
alter table messages add column if not exists media_ukuran integer; -- ukuran dalam byte (hanya untuk tampilan)

alter table messages drop constraint if exists messages_media_check;
alter table messages add constraint messages_media_check check (
  (media_path is null and media_jenis is null and media_nama is null and media_ukuran is null)
  or (media_jenis in ('foto', 'suara', 'dokumen')
      and char_length(media_path) <= 200
      and media_path like conversation_id::text || '/' || sender_id::text || '/%'
      and (media_nama is null or (media_jenis = 'dokumen' and char_length(media_nama) between 1 and 120))
      and (media_ukuran is null or (media_jenis = 'dokumen' and media_ukuran between 0 and 5242880))));

-- Pesan yang dihapus (hapus_pesan, migrasi 033) mengosongkan media_path: nama dan ukuran ikut dikosongkan
create or replace function bersih_nama_media() returns trigger
language plpgsql as $$
begin
  if new.media_path is null then new.media_nama := null; new.media_ukuran := null; end if;
  return new;
end $$;
drop trigger if exists bersih_nama_media_trg on messages;
create trigger bersih_nama_media_trg before update on messages
  for each row execute function bersih_nama_media();

-- =====================================================================
-- B. Bucket: batas 5 MB dan jenis dokumen yang boleh. TIDAK ada berkas yang bisa dijalankan
--    (exe, apk, html, svg, zip, dokumen berisi makro seperti docm/xlsm).
-- =====================================================================
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array[
         'image/jpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a',
         'application/pdf', 'text/plain', 'text/csv',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation']
 where id = 'media-pesan';

-- Unggah: sama seperti 017, ditambah pemeriksaan ekstensi di database (bukan hanya di layar)
-- dan bentuk path harus tepat <percakapan>/<id sendiri>/<nama berkas>.
drop policy if exists "media pesan unggah" on storage.objects;
create policy "media pesan unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media-pesan'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = auth.uid()::text
    and lower(name) ~ '\.(jpg|webm|ogg|m4a|mp3|aac|pdf|txt|csv|docx|xlsx|pptx)$'
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

-- Kebijakan baca (10 menit), hapus (milik sendiri), pembatas pesan, dan fungsi pembersihan kedaluwarsa dari 017
-- TIDAK berubah dan otomatis berlaku untuk dokumen juga.

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select file_size_limit, array_length(allowed_mime_types, 1) from storage.buckets where id = 'media-pesan';  -- 5242880 dan 13
--   select column_name from information_schema.columns where table_name = 'messages' and column_name like 'media_%';  -- 4 baris
-- MEMBATALKAN: update storage.buckets set file_size_limit = 3145728 where id = 'media-pesan';
--   lalu jalankan ulang kebijakan "media pesan unggah" dan aturan messages_media_check dari 017, dan:
--   drop trigger bersih_nama_media_trg on messages; alter table messages drop column media_nama, drop column media_ukuran;

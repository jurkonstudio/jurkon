-- JURKON 037: pertanyaan harian MASUK KE KIRIMAN.
-- Jawaban kini menyimpan teks pertanyaannya (posts.pertanyaan_teks) dan di umpan tampil kotak
-- "Menjawab pertanyaan harian: <pertanyaan>" yang menaut ke halaman pertanyaan itu.
-- Idempoten, aman dijalankan ulang. Jalankan SEBELUM mengunggah kode JS terbaru.
-- Prasyarat: migrasi 032 (pertanyaan_tgl).
--
-- Mengapa teks disimpan (bukan dihitung dari tanggal): daftar pertanyaan di klien dipetakan dengan sisa bagi
-- (hari ke-N mod jumlah), sehingga menambah pertanyaan mengubah pemetaan. Dengan salinan teks di kiriman,
-- jawaban lama tetap menampilkan pertanyaan yang benar.
-- Mengapa divalidasi server: teks yang tampil ke semua orang tidak boleh dipalsukan klien. Server menolak teks
-- yang tidak sama persis dengan pertanyaan resmi untuk tanggal itu (tabel pertanyaan_bank di bawah).
--
-- PENTING saat menambah pertanyaan di js/pertanyaan.js: jalankan  node tools/buat-bank-pertanyaan-sql.js
-- lalu tempel hasilnya di Supabase SEBELUM mengunggah JS, supaya daftar di klien dan di server selalu sama.

alter table posts add column if not exists pertanyaan_teks text;
alter table posts drop constraint if exists posts_pertanyaan_teks_check;
alter table posts add constraint posts_pertanyaan_teks_check
  check (pertanyaan_teks is null or (pertanyaan_tgl is not null and char_length(pertanyaan_teks) between 1 and 200));

-- A. Daftar pertanyaan resmi (urutan sama dengan PQ_BANK di js/pertanyaan.js). Klien tidak bisa membaca/mengubahnya.
create table if not exists pertanyaan_bank (
  urut int primary key check (urut >= 0),
  teks text not null unique check (char_length(teks) between 1 and 200)
);
alter table pertanyaan_bank enable row level security;   -- tanpa kebijakan = tertutup untuk klien
insert into pertanyaan_bank (urut, teks) values
  (0, 'Apa satu hal kecil yang bikin harimu lebih baik hari ini?'),
  (1, 'Siapa yang ingin kamu ucapkan terima kasih, tapi belum sempat?'),
  (2, 'Kalau hari ini punya judul, apa judulnya?'),
  (3, 'Apa yang kamu pelajari minggu ini?'),
  (4, 'Makanan apa yang paling bikin kamu merasa pulang ke rumah?'),
  (5, 'Apa yang ingin kamu ingat dari hari ini setahun lagi?'),
  (6, 'Satu kebiasaan kecil apa yang pelan-pelan mengubah hidupmu?'),
  (7, 'Lagu apa yang paling sering kamu putar akhir-akhir ini, dan kenapa?'),
  (8, 'Apa yang sedang kamu tunggu-tunggu?'),
  (9, 'Kapan terakhir kali kamu tertawa sampai lupa waktu?'),
  (10, 'Apa nasihat terbaik yang pernah kamu terima?'),
  (11, 'Kalau boleh bicara dengan dirimu lima tahun lalu, apa yang kamu bilang?'),
  (12, 'Tempat mana yang membuatmu paling tenang?'),
  (13, 'Apa yang kamu syukuri hari ini, sekecil apa pun?'),
  (14, 'Pekerjaan rumah apa yang diam-diam kamu nikmati?'),
  (15, 'Apa yang ingin kamu coba, tapi belum berani?'),
  (16, 'Siapa yang paling sering terlintas di pikiranmu minggu ini?'),
  (17, 'Apa satu hal yang ingin kamu lepaskan bulan ini?'),
  (18, 'Ceritakan satu kenangan masa kecil yang masih hangat.'),
  (19, 'Apa yang membuatmu merasa cukup?'),
  (20, 'Buku, film, atau tontonan apa yang meninggalkan bekas di kepalamu?'),
  (21, 'Kebaikan kecil apa yang pernah orang lakukan untukmu?'),
  (22, 'Kalau besok libur penuh, apa yang akan kamu lakukan?'),
  (23, 'Apa yang kamu harapkan dari dirimu sendiri bulan depan?'),
  (24, 'Hal apa yang dulu terasa besar, sekarang terasa kecil?'),
  (25, 'Apa yang kamu banggakan minggu ini, walau tidak ada yang tahu?'),
  (26, 'Aroma apa yang langsung mengingatkanmu pada sesuatu?'),
  (27, 'Apa yang sedang kamu belajar terima?'),
  (28, 'Apa yang kamu lakukan saat butuh menenangkan diri?'),
  (29, 'Kalau kamu menulis surat untuk dirimu setahun lagi, kalimat pertamanya apa?'),
  (30, 'Siapa yang membuatmu merasa dimengerti?'),
  (31, 'Apa satu hal sederhana yang selalu memperbaiki suasana hatimu?'),
  (32, 'Apa yang ingin kamu lakukan lebih sering?'),
  (33, 'Apa yang ingin kamu lakukan lebih jarang?'),
  (34, 'Momen paling tenang apa yang kamu alami hari ini?'),
  (35, 'Mimpi kecil apa yang masih kamu simpan?'),
  (36, 'Kata apa yang paling menggambarkan minggumu?'),
  (37, 'Apa yang kamu rindukan akhir-akhir ini?'),
  (38, 'Ceritakan seseorang yang diam-diam kamu kagumi.'),
  (39, 'Keputusan kecil apa yang ternyata berdampak besar?'),
  (40, 'Hal baik apa yang terjadi tanpa kamu duga?'),
  (41, 'Apa yang ingin kamu katakan pada dirimu pagi ini?'),
  (42, 'Kebiasaan apa dari keluargamu yang ingin kamu bawa terus?'),
  (43, 'Apa yang membuatmu merasa hidup?'),
  (44, 'Tulis satu hal yang ingin kamu maafkan, dari dirimu atau orang lain.'),
  (45, 'Apa yang kamu cari dari hari-hari biasa?'),
  (46, 'Siapa yang ingin kamu hubungi lagi?'),
  (47, 'Apa yang kamu harap orang tahu tentangmu?'),
  (48, 'Pencapaian kecil apa yang kemarin belum terasa, tapi hari ini terasa?'),
  (49, 'Kalau hidupmu sebuah buku, bab yang sedang kamu jalani bercerita tentang apa?'),
  (50, 'Benda apa yang paling punya cerita di kamarmu?'),
  (51, 'Apa yang ingin kamu pelajari tahun depan?'),
  (52, 'Apa yang kamu lakukan hari ini yang akan kamu syukuri nanti?'),
  (53, 'Apa tujuan kecilmu untuk besok?'),
  (54, 'Apa yang membuatmu merasa tenang sebelum tidur?'),
  (55, 'Ceritakan hari terbaik yang bisa kamu ingat.'),
  (56, 'Apa yang sedang kamu syukuri dari orang di sekitarmu?'),
  (57, 'Apa yang kamu ingin dunia punya lebih banyak?'),
  (58, 'Apa satu janji kecil yang ingin kamu tepati pada dirimu sendiri?'),
  (59, 'Apa kabarmu sebenarnya hari ini, jujur saja?')
on conflict (urut) do update set teks = excluded.teks;

-- B. Pertanyaan resmi untuk satu tanggal (rumus sama dengan pqTeks di klien: hari sejak 2026-01-01, sisa bagi)
create or replace function teks_pertanyaan(p_tgl date) returns text
language sql stable security definer set search_path = public as $$
  with n as (select count(*)::int as n from pertanyaan_bank)
  select b.teks from pertanyaan_bank b, n
   where n.n > 0 and b.urut = (((p_tgl - date '2026-01-01') % n.n) + n.n) % n.n
$$;
revoke execute on function teks_pertanyaan(date) from public, anon;
grant execute on function teks_pertanyaan(date) to authenticated;

-- C. Penjaga (menggantikan jaga_pertanyaan dari 032; semua aturan lama tetap)
create or replace function jaga_pertanyaan() returns trigger
language plpgsql set search_path = public as $$
declare hari date := (now() at time zone 'Asia/Jakarta')::date; sah text;
begin
  if tg_op = 'INSERT' then
    if new.pertanyaan_tgl is not null then
      if new.parent_id is not null or coalesce(new.jenis, 'biasa') <> 'biasa'
         or new.terbuka_pada is not null or new.kedaluwarsa is not null then
        raise exception 'Jawaban pertanyaan harian hanya untuk catatan utama biasa.';
      end if;
      if new.pertanyaan_tgl > hari or new.pertanyaan_tgl < hari - 1 then
        raise exception 'Pertanyaan itu sudah lewat.';
      end if;
      -- Teks boleh kosong (klien lama); bila ada, harus persis pertanyaan resmi hari itu
      if new.pertanyaan_teks is not null then
        sah := teks_pertanyaan(new.pertanyaan_tgl);
        if sah is null or new.pertanyaan_teks <> sah then
          raise exception 'Pertanyaan sudah diperbarui. Muat ulang halaman lalu coba lagi.';
        end if;
      end if;
    elsif new.pertanyaan_teks is not null then
      raise exception 'Teks pertanyaan hanya untuk jawaban pertanyaan harian.';
    end if;
  elsif (new.pertanyaan_tgl is distinct from old.pertanyaan_tgl
         or new.pertanyaan_teks is distinct from old.pertanyaan_teks) and auth.uid() is not null then
    raise exception 'Penanda pertanyaan tidak bisa diubah.';
  end if;
  return new;
end $$;

drop trigger if exists jaga_pertanyaan_trg on posts;
create trigger jaga_pertanyaan_trg before insert or update of pertanyaan_tgl, pertanyaan_teks on posts
  for each row execute function jaga_pertanyaan();

-- D. Isi teks untuk jawaban lama (dari SQL Editor, jadi lolos penjaga). Memakai daftar saat ini.
update posts set pertanyaan_teks = teks_pertanyaan(pertanyaan_tgl)
 where pertanyaan_tgl is not null and pertanyaan_teks is null;

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan satu per satu)
-- 1) Harus 60:   select count(*) from pertanyaan_bank;
-- 2) Harus teks pertanyaan hari ini:   select teks_pertanyaan((now() at time zone 'Asia/Jakarta')::date);
-- 3) Harus 0:   select count(*) from posts where pertanyaan_tgl is not null and pertanyaan_teks is null;
-- MEMBATALKAN: jalankan ulang jaga_pertanyaan dari 032, lalu
--   alter table posts drop column pertanyaan_teks;  drop function teks_pertanyaan(date);  drop table pertanyaan_bank;

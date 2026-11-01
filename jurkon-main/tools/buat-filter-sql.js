#!/usr/bin/env node
// Membuat sql/004_filter_konten.sql dari js/filter-data.js agar aturan di database sama dengan di layar.
// Pemakaian (dari akar proyek):  node tools/buat-filter-sql.js
const fs = require('fs');
const path = require('path');
const { FILTER_KATEGORI, FILTER_POLA, FILTER_SAMAR } = require('../js/filter-data.js');

const PAGAR_KIRI = '(^|[^a-z0-9])', PAGAR_KANAN = '($|[^a-z0-9])', PISAH = '[._*-]*';
const polaIstilah = s => PAGAR_KIRI + s.split(' ').map(k => Array.from(k).map(h => {
  const g = FILTER_SAMAR[h] || '';
  return (g ? '[' + h + g + ']' : h) + '+';
}).join(PISAH)).join('[^a-z0-9]+') + PAGAR_KANAN;

const q = s => "'" + s.replace(/'/g, "''") + "'";
const baris = [];
for (const [k, kat] of Object.entries(FILTER_KATEGORI)) {
  if (kat.tingkat !== 'blokir') continue;
  for (const i of kat.istilah) baris.push(`  (${q(k)}, ${q(i)}, ${q(polaIstilah(i))})`);
}
for (const p of FILTER_POLA) {
  if (p.tingkat !== 'blokir') continue;
  baris.push(`  (${q(p.k)}, ${q('(pola data pribadi)')}, ${q(p.pola)})`);
}

const sql = `-- JURKON - Migrasi 004: filter konten terlarang (sisi database)
-- DIBUAT OTOMATIS oleh tools/buat-filter-sql.js dari js/filter-data.js. Jangan diubah manual;
-- ubah daftarnya di js/filter-data.js lalu buat ulang file ini.
-- Jalankan di Supabase: SQL Editor > New query > tempel semua > Run. Aman diulang.
--
-- Yang diblokir di sini hanya tingkat "blokir" (judi, dewasa, narkoba, penipuan, ancaman, SARA, NIK).
-- Kata kasar tingkat "peringatan" hanya diperingatkan di layar, tidak ditolak database.

create table if not exists filter_konten (
  id serial primary key,
  kategori text not null,
  istilah text not null,
  pola text not null
);
alter table filter_konten enable row level security;   -- tanpa policy: tidak bisa dibaca/ubah dari klien
revoke all on filter_konten from anon, authenticated;

truncate filter_konten restart identity;
insert into filter_konten (kategori, istilah, pola) values
${baris.join(',\n')};

-- Mengembalikan kategori pelanggaran pertama yang ditemukan, atau null jika bersih.
create or replace function cek_konten(teks text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  t text;
  k text;
begin
  if teks is null or btrim(teks) = '' then return null; end if;
  t := lower(regexp_replace(teks, '[\\u200b-\\u200d\\ufeff]', '', 'g'));
  select kategori into k from filter_konten where t ~ pola limit 1;
  return k;
end $$;

create or replace function tolak_konten_terlarang() returns trigger
language plpgsql as $$
declare
  kolom text;
  nilai text;
  k text;
begin
  foreach kolom in array tg_argv loop
    nilai := to_jsonb(new) ->> kolom;
    k := cek_konten(nilai);
    if k is not null then
      raise exception 'KONTEN_DILARANG|%', k using errcode = 'P0001';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists tolak_konten_posts on posts;
create trigger tolak_konten_posts before insert or update of content on posts
  for each row execute function tolak_konten_terlarang('content');

drop trigger if exists tolak_konten_messages on messages;
create trigger tolak_konten_messages before insert on messages
  for each row execute function tolak_konten_terlarang('content');

drop trigger if exists tolak_konten_profiles on profiles;
create trigger tolak_konten_profiles before update of nama, bio, username on profiles
  for each row execute function tolak_konten_terlarang('nama', 'bio', 'username');
`;
fs.writeFileSync(path.join(__dirname, '..', 'sql', '004_filter_konten.sql'), sql);
console.log('Dibuat sql/004_filter_konten.sql dengan ' + baris.length + ' aturan.');

// Menggabung schema.sql + semua migrasi bernomor (urut) menjadi satu berkas: sql/schema-terbaru.sql
// Pakai:  node tools/gabung-sql.js
// Untuk project Supabase BARU. Database yang sudah berjalan tidak perlu ini.
// Hanya gabungan mentah berkas yang ada; urutan mengikuti sql/README.md.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'sql');
const keluar = 'schema-terbaru.sql';

const migrasi = fs.readdirSync(dir)
  .filter(f => /^\d{3}[a-z]?_.+\.sql$/.test(f))
  .sort();
const urut = ['schema.sql', ...migrasi].filter(f => fs.existsSync(path.join(dir, f)));
if (urut[0] !== 'schema.sql') { console.error('schema.sql tidak ditemukan di sql/'); process.exit(1); }

let isi = '-- JURKON: schema + semua migrasi (dibuat oleh tools/gabung-sql.js). JANGAN diedit; edit berkas aslinya.\n' +
          '-- Untuk project Supabase baru. Tempel seluruhnya di SQL Editor lalu Run.\n\n';
for (const f of urut) {
  isi += '-- ########## ' + f + ' ##########\n' + fs.readFileSync(path.join(dir, f), 'utf8').replace(/\s+$/, '') + '\n\n';
}
fs.writeFileSync(path.join(dir, keluar), isi);
console.log('Digabung ' + urut.length + ' berkas -> sql/' + keluar + ' (' + Math.round(isi.length / 1024) + ' KB)');
console.log(urut.join('\n'));

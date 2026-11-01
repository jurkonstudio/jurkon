// Membuat SQL daftar pertanyaan resmi (tabel pertanyaan_bank) dari PQ_BANK di js/pertanyaan.js.
// Pakai SETIAP kali menambah/mengubah pertanyaan:   node tools/buat-bank-pertanyaan-sql.js
// Hasilnya sql/bank_pertanyaan_terbaru.sql: tempel di Supabase SQL Editor > Run SEBELUM mengunggah JS.
// Daftar di klien dan di server harus sama persis; bila tidak, jawaban baru ditolak dengan pesan "muat ulang".
const fs = require('fs'), path = require('path');
const akar = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(akar, 'js/pertanyaan.js'), 'utf8');
const m = js.match(/const PQ_BANK = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('PQ_BANK tidak ditemukan di js/pertanyaan.js'); process.exit(1); }
const bank = new Function('return ' + m[1])();
if (!bank.length || bank.some(t => typeof t !== 'string' || !t || t.length > 200)) { console.error('Ada pertanyaan kosong atau lebih dari 200 karakter'); process.exit(1); }
if (new Set(bank).size !== bank.length) { console.error('Ada pertanyaan ganda'); process.exit(1); }
const nilai = bank.map((t, i) => "  (" + i + ", '" + t.replace(/'/g, "''") + "')").join(',\n');
const sql = '-- DIHASILKAN oleh tools/buat-bank-pertanyaan-sql.js. Jalankan di Supabase SEBELUM mengunggah JS.\n' +
  'insert into pertanyaan_bank (urut, teks) values\n' + nilai + '\non conflict (urut) do update set teks = excluded.teks;\n' +
  'delete from pertanyaan_bank where urut >= ' + bank.length + ';\n';
fs.writeFileSync(path.join(akar, 'sql/bank_pertanyaan_terbaru.sql'), sql);
console.log('sql/bank_pertanyaan_terbaru.sql: ' + bank.length + ' pertanyaan');

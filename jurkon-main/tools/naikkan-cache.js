// Mengisi versi CACHE di sw.js dari sidik jari isi semua berkas situs.
// Pakai SETIAP SEBELUM mengunggah ke GitHub:   node tools/naikkan-cache.js
// - Isi berkas berubah  -> versi berubah -> HP pengguna otomatis mengambil berkas baru.
// - Tidak ada yang berubah -> versi tetap sama (aman dijalankan berulang).
// Juga memeriksa bahwa semua berkas di daftar STATIS (sw.js) benar-benar ada.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const akar = path.join(__dirname, '..');
const swPath = path.join(akar, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');

const blok = sw.match(/const STATIS = \[([\s\S]*?)\];/);
if (!blok) { console.error('Daftar STATIS tidak ditemukan di sw.js'); process.exit(1); }
const hilang = [...blok[1].matchAll(/'(\/[^']+)'/g)].map(m => m[1]).filter(f => !fs.existsSync(path.join(akar, f)));
if (hilang.length) { console.error('Berkas di STATIS tidak ada:\n  ' + hilang.join('\n  ')); process.exit(1); }

const LEWATI = new Set(['.git', '.github', 'node_modules', 'sql', 'tools', 'supabase', '.well-known']);
const TIPE = /\.(html|css|js|json|png|jpe?g|webp|svg|woff2?)$/i;
const semua = [];
(function jelajah(dir) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (LEWATI.has(n.name)) continue;
    const p = path.join(dir, n.name);
    if (n.isDirectory()) jelajah(p); else if (TIPE.test(n.name) && p !== swPath) semua.push(p);   // sw.js dihitung terpisah di bawah
  }
})(akar);
semua.sort();

const h = crypto.createHash('sha1');
h.update(sw.replace(/const CACHE = '[^']*';/, ''));   // sw.js sendiri, tanpa baris versinya
for (const f of semua) { h.update(path.relative(akar, f)); h.update(fs.readFileSync(f)); }
const versi = 'jurkon-' + h.digest('hex').slice(0, 8);

const baru = sw.replace(/const CACHE = '[^']*';/, "const CACHE = '" + versi + "';");
if (baru !== sw) { fs.writeFileSync(swPath, baru); console.log('CACHE diperbarui menjadi ' + versi + ' (' + semua.length + ' berkas diperiksa)'); }
else console.log('CACHE sudah ' + versi + ' (tidak ada perubahan)');

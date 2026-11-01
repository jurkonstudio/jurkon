// Mengganti meta description dan og:description di index.html, landing.html, tentang.html.
// Idempoten dan semua-atau-tidak-sama-sekali: tiap berkas harus punya tepat 1 tag description dan 1 og:description.
// Pakai: node tools/ganti-deskripsi.js
const fs = require('fs'), path = require('path');
const akar = path.join(__dirname, '..');
const TEKS = 'Sosmed buatan orang Indonesia. Nulisnya cuma 250 karakter, feed ada ujungnya, dan bisa titip catatan buat dirimu untuk setahun lagi.';
const BERKAS = ['index.html', 'landing.html', 'tentang.html'];
const POLA = [
  /(<meta name="description" content=")[^"]*(")/g,
  /(<meta property="og:description" content=")[^"]*(")/g,
];
const hasil = {}, galat = [];
for (const b of BERKAS) {
  let s;
  try { s = fs.readFileSync(path.join(akar, b), 'utf8'); } catch (e) { galat.push(b + ': tidak ditemukan'); continue; }
  for (const re of POLA) {
    const n = (s.match(re) || []).length;
    if (n !== 1) { galat.push(`${b}: ${re.source.slice(0, 30)} ditemukan ${n}x (harus 1)`); continue; }
    s = s.replace(re, (m, a, z) => a + TEKS + z);
  }
  hasil[b] = s;
}
if (galat.length) { console.error('BERHENTI, tidak ada berkas yang ditulis:\n- ' + galat.join('\n- ')); process.exit(1); }
let ubah = 0;
for (const b of BERKAS) {
  const p = path.join(akar, b);
  if (fs.readFileSync(p, 'utf8') !== hasil[b]) { fs.writeFileSync(p, hasil[b]); ubah++; console.log('diubah  ' + b); }
  else console.log('sudah   ' + b);
}
console.log(`\n${ubah} berkas diubah.` + (ubah ? '\nLanjut: node tools/naikkan-cache.js' : ''));

// Mengganti <title> index.html dan landing.html, dan menambah favicon 192px (untuk ikon di hasil Google).
// index.html: atribut data-i-doc dibuang supaya JS tidak menimpa judul dengan "Beranda · Jurkon" (Googlebot menjalankan JS).
// Idempoten dan semua-atau-tidak-sama-sekali. Pakai: node tools/ganti-judul.js
const fs = require('fs'), path = require('path');
const akar = path.join(__dirname, '..');
const JUDUL = 'Journal Connection - tempat nulis catatan dan pengingat dirimu';
const IKON = '<link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png">';
const IKON32 = '<link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png">';
// [berkas, pola judul lama]
const BERKAS = [
  ['index.html', /<title data-i-doc="nav\.beranda">[^<]*<\/title>/],
  ['landing.html', /<title>[^<]*<\/title>/],
];
const hasil = {}, galat = [];
for (const [b, pola] of BERKAS) {
  let s;
  try { s = fs.readFileSync(path.join(akar, b), 'utf8'); } catch (e) { galat.push(b + ': tidak ditemukan'); continue; }
  const baru = '<title>' + JUDUL + '</title>';
  if (!s.includes(baru)) {
    if (s.split('<title').length - 1 !== 1 || !pola.test(s)) { galat.push(b + ': tag <title> tidak dikenali'); continue; }
    s = s.replace(pola, () => baru);
  }
  if (!s.includes('icon-192.png">') || !s.includes('sizes="192x192"')) {
    if (s.split(IKON32).length - 1 !== 1) { galat.push(b + ': baris favicon 32px tidak ditemukan tepat 1x'); continue; }
    s = s.replace(IKON32, () => IKON32 + '\n' + IKON);
  }
  hasil[b] = s;
}
if (galat.length) { console.error('BERHENTI, tidak ada berkas yang ditulis:\n- ' + galat.join('\n- ')); process.exit(1); }
let ubah = 0;
for (const [b] of BERKAS) {
  const p = path.join(akar, b);
  if (fs.readFileSync(p, 'utf8') !== hasil[b]) { fs.writeFileSync(p, hasil[b]); ubah++; console.log('diubah  ' + b); }
  else console.log('sudah   ' + b);
}
console.log(`\n${ubah} berkas diubah.` + (ubah ? '\nLanjut: node tools/naikkan-cache.js' : ''));

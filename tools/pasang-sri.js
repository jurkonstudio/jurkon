// Memasang atribut integrity (SRI) pada tag <script> pustaka Supabase di semua halaman HTML.
// SRI membuat browser MENOLAK pustaka bila isinya berubah di CDN (mis. CDN diretas), jadi skrip curang tidak ikut jalan.
//
// Pakai (butuh internet, jalankan di komputer Anda):   node tools/pasang-sri.js
// Setelah itu naikkan versi CACHE di sw.js (mis. jurkon-v31 -> jurkon-v32) dan unggah ulang.
// Jalankan ulang setiap kali versi pustaka diganti (versi sekarang: 2.45.4).
const fs = require('fs'), path = require('path'), https = require('https'), crypto = require('crypto');
const VERSI = '2.45.4';
const URL_LIB = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${VERSI}/dist/umd/supabase.js`;
const dasar = path.join(__dirname, '..');

function unduh(u) {
  return new Promise((ok, gagal) => https.get(u, r => {
    if (r.statusCode !== 200) return gagal(new Error('HTTP ' + r.statusCode));
    const bagian = []; r.on('data', d => bagian.push(d)); r.on('end', () => ok(Buffer.concat(bagian)));
  }).on('error', gagal));
}

(async () => {
  const isi = await unduh(URL_LIB);
  const hash = 'sha384-' + crypto.createHash('sha384').update(isi).digest('base64');
  console.log('Ukuran', isi.length, 'byte;', hash);
  const tag = new RegExp('<script src="' + URL_LIB.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '"[^>]*></script>', 'g');
  const baru = `<script src="${URL_LIB}" integrity="${hash}" crossorigin="anonymous"></script>`;
  let n = 0;
  for (const f of fs.readdirSync(dasar).filter(x => x.endsWith('.html'))) {
    const p = path.join(dasar, f), s = fs.readFileSync(p, 'utf8');
    const h = s.replace(tag, baru);
    if (h !== s) { fs.writeFileSync(p, h); n++; console.log('  ' + f); }
  }
  console.log('Selesai:', n, 'halaman diperbarui.');
})().catch(e => { console.error('Gagal:', e.message); process.exit(1); });

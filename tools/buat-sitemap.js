// Membuat sitemap.xml dari daftar halaman di bawah ini.  Pakai:  node tools/buat-sitemap.js
// - Hanya memasukkan halaman yang boleh diindeks (tanpa noindex, canonical = alamat di sitemap).
// - Grup bahasa memakai hreflang timbal balik + x-default; skrip memeriksa tag yang sama ada di <head> HTML.
// - <lastmod> hanya berubah bila ISI halaman berubah (bukan karena ganti versi skrip/CSS atau SRI).
//   Sidik isi disimpan di tools/sitemap-lastmod.json (ikut di-commit).
// - Tidak memakai <changefreq>/<priority>: Google mengabaikannya.
// Menambah halaman/bahasa baru: ubah BAHASA atau TUNGGAL, jalankan ulang. Skrip berhenti bila ada galat.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dasar = path.join(__dirname, '..');
const SITUS = 'https://jurkon.my.id';
const baca = p => fs.readFileSync(path.join(dasar, p), 'utf8');

const BAHASA = [  // [hreflang, alamat, berkas]; grup ini saling menunjuk
  ['id', '/landing.html', 'landing.html'], ['en', '/en/', 'en/index.html'], ['ms', '/ms/', 'ms/index.html'],
  ['jv', '/jv/', 'jv/index.html'], ['su', '/su/', 'su/index.html'], ['zh-Hans', '/zh/', 'zh/index.html'], ['ja', '/ja/', 'ja/index.html'],
  ['es', '/es/', 'es/index.html'], ['fr', '/fr/', 'fr/index.html'], ['hi', '/hi/', 'hi/index.html'], ['ar', '/ar/', 'ar/index.html']];
const X_DEFAULT = 'en';
const TUNGGAL = [  // [alamat, berkas]
  ['/jelajahi.html', 'jelajahi.html'], ['/tentang.html', 'tentang.html'], ['/pusat-bantuan.html', 'pusat-bantuan.html'],
  ['/login.html', 'login.html'], ['/daftar.html', 'daftar.html'], ['/aturan.html', 'aturan.html'],
  ['/kebijakan-privasi.html', 'kebijakan-privasi.html'], ['/ketentuan-layanan.html', 'ketentuan-layanan.html']];

const hari = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const galat = [];

function sidik(html) {   // abaikan tag skrip/stylesheet eksternal: ganti versi atau integrity tidak dianggap perubahan isi
  const bersih = html.replace(/<script\b[^>]*\bsrc=[^>]*>\s*<\/script>/gi, '')
    .replace(/<link\b[^>]*rel=["']?(?:stylesheet|modulepreload|preload|icon)[^>]*>/gi, '').replace(/\s+/g, ' ');
  return crypto.createHash('sha1').update(bersih).digest('hex').slice(0, 16);
}

const fileState = path.join(__dirname, 'sitemap-lastmod.json');
let state = fs.existsSync(fileState) ? JSON.parse(fs.readFileSync(fileState, 'utf8')) : {};
const lama = {};   // lastmod dari sitemap lama, dipakai hanya untuk mengisi awal
if (fs.existsSync(path.join(dasar, 'sitemap.xml')))
  for (const m of baca('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) lama[m[1]] = m[2];

function entri(loc, berkas, grup) {
  const url = SITUS + loc;
  if (!fs.existsSync(path.join(dasar, berkas))) { galat.push(`${berkas}: berkas tidak ada`); return null; }
  const html = baca(berkas);
  const rob = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  if (rob && /noindex/i.test(rob[0])) galat.push(`${berkas}: bernoindex, jangan masuk sitemap`);
  const kan = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (!kan) galat.push(`${berkas}: tanpa canonical`);
  else if (kan[1] !== url) galat.push(`${berkas}: canonical ${kan[1]} berbeda dari ${url}`);
  if (grup) for (const [hl, l2] of [...grup, ['x-default', BAHASA.find(b => b[0] === X_DEFAULT)[1]]]) {
    const re = new RegExp(`<link[^>]+hreflang=["']${rx(hl)}["'][^>]*href=["']${rx(SITUS + l2)}["']`, 'i');
    if (!re.test(html)) galat.push(`${berkas}: hreflang ${hl} -> ${SITUS + l2} tidak ada di <head>`);
  }
  const s = sidik(html), st = state[berkas], s0 = st ? st.sidik : null;
  let lastmod;
  if (!st) lastmod = lama[url] || hari;
  else lastmod = st.sidik === s ? st.lastmod : hari;
  state[berkas] = { sidik: s, lastmod };
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  return { url, lastmod, grup, gambar: og ? og[1] : null, berubah: !!st && s !== s0 };
}

const grupH = BAHASA.map(([hl, l]) => [hl, l]);
const daftar = [
  ...BAHASA.map(([, l, b]) => entri(l, b, grupH)),
  ...TUNGGAL.map(([l, b]) => entri(l, b, null))
].filter(Boolean);

if (galat.length) { console.error('GAGAL, sitemap tidak ditulis:\n- ' + galat.join('\n- ')); process.exit(1); }

const baris = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
for (const e of daftar) {
  baris.push('  <url>', `    <loc>${esc(e.url)}</loc>`, `    <lastmod>${e.lastmod}</lastmod>`);
  if (e.grup) {
    for (const [hl, l] of e.grup) baris.push(`    <xhtml:link rel="alternate" hreflang="${hl}" href="${esc(SITUS + l)}"/>`);
    baris.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(SITUS + BAHASA.find(b => b[0] === X_DEFAULT)[1])}"/>`);
  }
  if (e.gambar) baris.push(`    <image:image><image:loc>${esc(e.gambar)}</image:loc></image:image>`);
  baris.push('  </url>');
}
baris.push('</urlset>', '');
fs.writeFileSync(path.join(dasar, 'sitemap.xml'), baris.join('\n'));
fs.writeFileSync(fileState, JSON.stringify(state, null, 1) + '\n');
console.log(`sitemap.xml ditulis: ${daftar.length} alamat (${BAHASA.length} bahasa landing + ${TUNGGAL.length} halaman).`);
const ubah = daftar.filter(e => e.berubah).map(e => e.url);
console.log(ubah.length ? 'Isi berubah, lastmod diperbarui ke ' + hari + ' untuk:\n  ' + ubah.join('\n  ') : 'Tidak ada isi halaman yang berubah; lastmod tetap.');

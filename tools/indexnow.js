// Memberi tahu Bing, Yandex, Naver, Seznam, dan Yep (protokol IndexNow) bahwa alamat di sitemap.xml baru/berubah.
// Google TIDAK memakai IndexNow: untuk Google tetap kirim sitemap di Search Console.
//   node tools/indexnow.js          -> kirim semua alamat di sitemap.xml
//   node tools/indexnow.js --uji    -> hanya tampilkan yang akan dikirim
// Pertama kali: skrip membuat berkas kunci <32 hex>.txt di folder utama. Commit + push, tunggu Pages terbit, lalu jalankan lagi.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dasar = path.join(__dirname, '..');
const HOST = 'jurkon.my.id';
const uji = process.argv.includes('--uji');
let berkasKunci = fs.readdirSync(dasar).find(f => /^[a-f0-9]{32}\.txt$/.test(f) && fs.readFileSync(path.join(dasar, f), 'utf8').trim() === f.slice(0, -4));
if (!berkasKunci) {
  const k = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(path.join(dasar, k + '.txt'), k);
  console.log(`Kunci dibuat: ${k}.txt\nCommit + push, tunggu Pages terbit, buka https://${HOST}/${k}.txt (harus menampilkan kuncinya), lalu jalankan skrip ini lagi.`);
  process.exit(0);
}
const kunci = berkasKunci.slice(0, -4);
const urlList = [...fs.readFileSync(path.join(dasar, 'sitemap.xml'), 'utf8').matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const badan = { host: HOST, key: kunci, keyLocation: `https://${HOST}/${berkasKunci}`, urlList };
if (uji) { console.log(JSON.stringify(badan, null, 1)); process.exit(0); }
fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(badan) })
  .then(async r => { console.log(`IndexNow: HTTP ${r.status} (200/202 = diterima)`); if (r.status >= 400) console.log(await r.text()); })
  .catch(e => { console.error('Gagal menghubungi IndexNow:', e.message); process.exit(1); });

// Memeriksa kamus terjemahan: jumlah kolom, isian {nama} yang konsisten, dan kunci yang dipakai di kode.
// Jalankan:  node tools/cek-bahasa.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const dasar = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dasar, 'js/bahasa.js'), 'utf8') + '\nthis.B = I18N_BAHASA; this.K = I18N_KAMUS;', ctx);
const B = ctx.B, K = ctx.K;
let salah = 0;
const lapor = m => { console.log('  ✗ ' + m); salah++; };
const isian = s => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');

for (const [k, baris] of Object.entries(K)) {
  if (baris.length !== B.length) { lapor(`${k}: ${baris.length} kolom, seharusnya ${B.length}`); continue; }
  const acuan = isian(baris[0]);
  baris.forEach((s, i) => {
    if (!String(s).trim()) lapor(`${k} [${B[i].kode}]: kosong`);
    else if (isian(s) !== acuan) lapor(`${k} [${B[i].kode}]: isian {…} berbeda dari Indonesia (${isian(s)} vs ${acuan})`);
    if (k.endsWith('.ph') && String(s).split('|').length !== baris[0].split('|').length) lapor(`${k} [${B[i].kode}]: jumlah placeholder bergantian berbeda`);
  });
}

// Kunci yang dipakai di kode harus ada di kamus
const pakai = new Set(), semuaTeks = [];
const baca = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (!['node_modules', '.git', 'sql', 'assets', 'bahasa'].includes(e.name)) baca(p); return; }
  if (!/\.(js|html)$/.test(e.name) || e.name === 'bahasa.js' || e.name === 'bahasa-muat.js' || e.name === 'cek-bahasa.js') return;
  const s = fs.readFileSync(p, 'utf8');
  semuaTeks.push(s);
  for (const m of s.matchAll(/\bt\('([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)'/g)) pakai.add(m[1] + '|' + e.name);
  for (const m of s.matchAll(/data-i(?:-[a-z]+)?="([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)"/g)) pakai.add(m[1] + '|' + e.name);
});
baca(dasar);
const dipakai = new Set();
for (const x of pakai) { const [k, f] = x.split('|'); dipakai.add(k); if (!K[k]) lapor(`kunci "${k}" dipakai di ${f} tapi tidak ada di kamus`); }
// Kunci yang dipilih lewat variabel (mis. t(menang ? 'a.b' : 'a.c')) tetap terdeteksi sebagai teks berkutip
const gabung = semuaTeks.join('\n');
for (const k of Object.keys(K)) if (!gabung.includes("'" + k + "'") && !gabung.includes('"' + k + '"') && !/^(filter\.|pq\.q\d+$)/.test(k)) console.log('  · tidak terpakai: ' + k);
console.log(salah ? `\n${salah} masalah.` : `\nOK: ${Object.keys(K).length} kunci × ${B.length} bahasa.`);
process.exit(salah ? 1 : 0);

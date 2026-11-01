// Memasang tema "Kaca" (glass ala iCloud) ke repo. Aman dijalankan berulang (idempoten).
// Syarat: css/tema-kaca.css sudah ada di repo.
// Jalankan dari akar repo:   node tools/pasang-kaca.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const dasar = path.join(__dirname, '..');
const baca = p => fs.readFileSync(path.join(dasar, p), 'utf8');
const tulis = (p, s) => fs.writeFileSync(path.join(dasar, p), s);
let galat = false;

function ganti(p, dari, ke, penanda) {
  const s = baca(p);
  if (s.includes(penanda)) { console.log('  sudah ada :', p); return; }
  if (!s.includes(dari)) { console.error('  GAGAL     :', p, '- teks acuan tidak ditemukan:', dari.slice(0, 60)); galat = true; return; }
  tulis(p, s.replace(dari, ke));
  console.log('  diubah    :', p);
}

if (!fs.existsSync(path.join(dasar, 'css/tema-kaca.css'))) { console.error('css/tema-kaca.css belum ada. Salin dulu berkasnya ke folder css/.'); process.exit(1); }

// 1. js/tema.js
ganti('js/tema.js', "var DAFTAR = ['kertas', 'terang', 'gelap'];", "var DAFTAR = ['kertas', 'terang', 'gelap', 'kaca'];", "'kaca'];");
ganti('js/tema.js', "var WARNA = { kertas: '#fbf9f4', terang: '#ffffff', gelap: '#1c1917' };", String.raw`var WARNA = { kertas: '#fbf9f4', terang: '#ffffff', gelap: '#1c1917', kaca: '#eef2f9' };
  // Tema Kaca punya berkas CSS sendiri; hanya dimuat saat dipakai.
  var CSS_KACA = (function () { var s = document.currentScript; return s && s.src ? s.src.replace(/js\/tema\.js(\?.*)?$/, 'css/tema-kaca.css') : '/css/tema-kaca.css'; })();
  function muatKaca() {
    if (document.getElementById('css-kaca')) return;
    if (document.readyState === 'loading') { document.write('<link rel="stylesheet" id="css-kaca" href="' + CSS_KACA + '">'); return; }
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'css-kaca'; l.href = CSS_KACA; document.head.appendChild(l);
  }`, 'muatKaca');
ganti('js/tema.js', "  function terapkan(t) {\n", "  function terapkan(t) {\n    if (t === 'kaca') muatKaca();\n", "if (t === 'kaca') muatKaca();");
ganti('js/tema.js', `'<button data-tema="gelap"><i class="g"></i>' + tr('set.gelap', 'Gelap') + '</button></div>';`,
  `'<button data-tema="gelap"><i class="g"></i>' + tr('set.gelap', 'Gelap') + '</button>' +\n      '<button data-tema="kaca"><i class="c"></i>' + tr('set.kaca', 'Kaca') + '</button></div>';`, 'data-tema="kaca"');

// 2. js/bahasa.js (sumber teks 7 bahasa)
const gelap = "  'set.gelap': ['Gelap', 'Dark', 'Gelap', 'Peteng', 'Poék', '深色', 'ダーク'],";
ganti('js/bahasa.js', gelap, gelap + "\n  'set.kaca': ['Kaca', 'Glass', 'Kaca', 'Kaca', 'Kaca', '玻璃', 'ガラス'],", "'set.kaca'");

// 3. css/style.css (kotak pilihan tema harus ada di semua tema)
ganti('css/style.css', '.tema-opsi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}', '.tema-opsi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}', 'repeat(4,1fr);gap:8px}');
const g = '.tema-opsi i.g{background:linear-gradient(135deg,#12100f 60%,#ef7a6e 60%)}';
ganti('css/style.css', g, g + '\n.tema-opsi i.c{background:linear-gradient(135deg,#f4f8ff 45%,#007aff 45%);box-shadow:inset 0 1px 0 #fff}', '.tema-opsi i.c');

// 4. sw.js (cache offline + naikkan versi supaya HP memuat CSS baru)
let sw = baca('sw.js');
if (sw.includes('/css/tema-kaca.css')) console.log('  sudah ada : sw.js');
else if (!/jurkon-v\d+/.test(sw) || !sw.includes("'/css/style.css', ")) { console.error('  GAGAL     : sw.js - pola tidak cocok'); galat = true; }
else {
  sw = sw.replace(/jurkon-v(\d+)/, (m, n) => 'jurkon-v' + (+n + 1)).replace("'/css/style.css', ", "'/css/style.css', '/css/tema-kaca.css', ");
  tulis('sw.js', sw); console.log('  diubah    : sw.js');
}

// 5. bangun ulang js/bahasa/*.js dari js/bahasa.js
if (!galat) { console.log('  membangun ulang bahasa...'); cp.execFileSync('node', [path.join(__dirname, 'pecah-bahasa.js')], { stdio: 'inherit' }); }
console.log(galat ? '\nAda langkah yang gagal, periksa pesan di atas.' : '\nSelesai. Tema Kaca terpasang.');
process.exit(galat ? 1 : 0);

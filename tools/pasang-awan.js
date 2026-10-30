// Menambah tema "Awan" (gaya iCloud mode gelap). Idempoten.
// Syarat: tema Kaca sudah terpasang (node tools/pasang-kaca.js) dan css/tema-awan.css ada.
// Jalankan dari akar repo:   node tools/pasang-awan.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const dasar = path.join(__dirname, '..');
const baca = p => fs.readFileSync(path.join(dasar, p), 'utf8');
const tulis = (p, s) => fs.writeFileSync(path.join(dasar, p), s);
let galat = false;
function ganti(p, dari, ke, penanda) {
  const s = baca(p);
  if (s.includes(penanda)) { console.log('  sudah ada :', p); return; }
  if (!s.includes(dari)) { console.error('  GAGAL     :', p, '- teks acuan tidak ditemukan:', dari.slice(0, 60)); galat = true; return; }
  tulis(p, s.replace(dari, ke)); console.log('  diubah    :', p);
}
if (!fs.existsSync(path.join(dasar, 'css/tema-awan.css'))) { console.error('css/tema-awan.css belum ada. Salin dulu ke folder css/.'); process.exit(1); }
if (!baca('js/tema.js').includes('muatKaca')) { console.error('Tema Kaca belum terpasang. Jalankan dulu: node tools/pasang-kaca.js'); process.exit(1); }

// js/tema.js
ganti('js/tema.js', "'gelap', 'kaca'];", "'gelap', 'kaca', 'awan'];", "'kaca', 'awan'];");
ganti('js/tema.js', "kaca: '#eef2f9' };", "kaca: '#eef2f9', awan: '#1c1c1e' };", "awan: '#1c1c1e'");
ganti('js/tema.js', "  function baca() {", String.raw`  function muatAwan() {
    if (document.getElementById('css-awan')) return;
    var h = CSS_KACA.replace('tema-kaca.css', 'tema-awan.css');
    if (document.readyState === 'loading') { document.write('<link rel="stylesheet" id="css-awan" href="' + h + '">'); return; }
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'css-awan'; l.href = h; document.head.appendChild(l);
  }
  function baca() {`, 'function muatAwan');
ganti('js/tema.js', "    if (t === 'kaca') muatKaca();\n", "    if (t === 'kaca') muatKaca();\n    if (t === 'awan') muatAwan();\n", "if (t === 'awan') muatAwan();");
ganti('js/tema.js', `tr('set.kaca', 'Kaca') + '</button></div>';`, `tr('set.kaca', 'Kaca') + '</button>' +\n      '<button data-tema="awan"><i class="a"></i>' + tr('set.awan', 'Awan') + '</button></div>';`, 'data-tema="awan"');

// js/bahasa.js
const kaca = "  'set.kaca': ['Kaca', 'Glass', 'Kaca', 'Kaca', 'Kaca', '玻璃', 'ガラス'],";
ganti('js/bahasa.js', kaca, kaca + "\n  'set.awan': ['Awan', 'Cloud', 'Awan', 'Mega', 'Awan', '云朵', 'クラウド'],", "'set.awan'");

// css/style.css (kotak pilihan, harus ada di semua tema)
ganti('css/style.css', 'repeat(4,1fr);gap:8px}', 'repeat(5,1fr);gap:6px}', 'repeat(5,1fr);gap:6px}');
const c = '.tema-opsi i.c{background:linear-gradient(135deg,#f4f8ff 45%,#007aff 45%);box-shadow:inset 0 1px 0 #fff}';
ganti('css/style.css', c, c + '\n.tema-opsi i.a{background:linear-gradient(135deg,#1c1c1e 50%,#0a84ff 50%)}', '.tema-opsi i.a');

// sw.js
let sw = baca('sw.js');
if (sw.includes('/css/tema-awan.css')) console.log('  sudah ada : sw.js');
else if (!sw.includes("'/css/tema-kaca.css', ")) { console.error('  GAGAL     : sw.js - tema Kaca belum terdaftar'); galat = true; }
else { sw = sw.replace(/jurkon-v(\d+)/, (m, n) => 'jurkon-v' + (+n + 1)).replace("'/css/tema-kaca.css', ", "'/css/tema-kaca.css', '/css/tema-awan.css', "); tulis('sw.js', sw); console.log('  diubah    : sw.js'); }

if (!galat) { console.log('  membangun ulang bahasa...'); cp.execFileSync('node', [path.join(__dirname, 'pecah-bahasa.js')], { stdio: 'inherit' }); }
console.log(galat ? '\nAda langkah yang gagal, periksa pesan di atas.' : '\nSelesai. Tema Awan terpasang.');
process.exit(galat ? 1 : 0);

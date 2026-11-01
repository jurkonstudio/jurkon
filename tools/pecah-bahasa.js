// Memecah js/bahasa.js (sumber, 7 bahasa) menjadi satu berkas kecil per bahasa di js/bahasa/<kode>.js,
// ditambah js/bahasa-muat.js (pemuat kecil). Browser hanya mengunduh bahasa yang dipakai (sekitar 1/7 ukuran).
// Jalankan setiap selesai mengubah js/bahasa.js:   node tools/pecah-bahasa.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const dasar = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dasar, 'js/bahasa.js'), 'utf8') + '\nthis.B = I18N_BAHASA; this.K = I18N_KAMUS;', ctx);
const B = ctx.B, K = ctx.K;
const aman = s => s.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const kepala = '// DIHASILKAN oleh tools/pecah-bahasa.js dari js/bahasa.js. Jangan diedit langsung.\n';

fs.mkdirSync(path.join(dasar, 'js/bahasa'), { recursive: true });
let total = 0;
B.forEach((b, i) => {
  const o = {};
  for (const [k, baris] of Object.entries(K)) {
    // Sel kosong memakai Inggris lalu Indonesia (sama seperti perilaku lama di t())
    const s = baris[i] != null && baris[i] !== '' ? baris[i] : (baris[1] != null && baris[1] !== '' ? baris[1] : baris[0]);
    o[k] = s;
  }
  const isi = kepala + 'var I18N_KAMUS=' + aman(JSON.stringify(o)) + ';\n';
  fs.writeFileSync(path.join(dasar, 'js/bahasa/' + b.kode + '.js'), isi);
  total += isi.length;
  console.log('  js/bahasa/' + b.kode + '.js  ' + (Buffer.byteLength(isi) / 1024).toFixed(1) + ' KB');
});

const muat = kepala + 'var I18N_BAHASA=' + JSON.stringify(B) + ';\n' +
`(function () {
  var KODE = I18N_BAHASA.map(function (b) { return b.kode; });
  var pil = 'auto';
  try { pil = localStorage.getItem('bahasa') || 'auto'; } catch (e) {}
  var kode = KODE.indexOf(pil) >= 0 ? pil : '';
  if (!kode && /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|applebot|crawler|spider/i.test(navigator.userAgent || '')) kode = 'id';   // mesin pencari melihat bahasa bawaan (sama dengan HTML statis)
  if (!kode) {
    var l = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < l.length && !kode; i++) {
      var d = String(l[i]).toLowerCase().replace('_', '-').split('-')[0];
      if (d === 'in') d = 'id'; else if (d === 'jw') d = 'jv'; else if (d === 'zsm' || d === 'zlm') d = 'ms';
      if (KODE.indexOf(d) >= 0) kode = d;
    }
    if (!kode) kode = 'en';
  }
  window.I18N_KODE = kode;
  document.write('<script src="js/bahasa/' + kode + '.js"><\\/script>');
})();
`;
fs.writeFileSync(path.join(dasar, 'js/bahasa-muat.js'), muat);
console.log('  js/bahasa-muat.js  ' + (Buffer.byteLength(muat) / 1024).toFixed(1) + ' KB');
console.log('Selesai: ' + Object.keys(K).length + ' kunci x ' + B.length + ' bahasa.');

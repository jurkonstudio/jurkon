// Tema: kertas (bawaan), terang, gelap. Dimuat di <head> agar tidak berkedip.
// Font serif dimuat lewat sini (bukan <link> di HTML) supaya tidak memblokir tampilan pertama.
// Teks langsung tampil dengan font cadangan, lalu berganti halus saat font tiba (display=swap).
(function () {
  try {
    if (document.querySelector('link[href*="fonts.googleapis.com/css2"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,650&display=swap';
    document.head.appendChild(l);
  } catch (e) {}
})();
(function () {
  var DAFTAR = ['kertas', 'terang', 'gelap', 'kaca', 'awan'];
  var tr = function (k, awal) { return window.t ? window.t(k) : awal; };
  var WARNA = { kertas: '#fbf9f4', terang: '#ffffff', gelap: '#1c1917', kaca: '#eef2f9', awan: '#1c1c1e' };
  // Tema Kaca punya berkas CSS sendiri; hanya dimuat saat dipakai.
  var CSS_KACA = (function () { var s = document.currentScript; return s && s.src ? s.src.replace(/js\/tema\.js(\?.*)?$/, 'css/tema-kaca.css') : '/css/tema-kaca.css'; })();
  function muatKaca() {
    if (document.getElementById('css-kaca')) return;
    if (document.readyState === 'loading') { document.write('<link rel="stylesheet" id="css-kaca" href="' + CSS_KACA + '">'); return; }
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'css-kaca'; l.href = CSS_KACA; document.head.appendChild(l);
  }
  function muatAwan() {
    if (document.getElementById('css-awan')) return;
    var h = CSS_KACA.replace('tema-kaca.css', 'tema-awan.css');
    if (document.readyState === 'loading') { document.write('<link rel="stylesheet" id="css-awan" href="' + h + '">'); return; }
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'css-awan'; l.href = h; document.head.appendChild(l);
  }
  function baca() { try { var t = localStorage.getItem('tema'); return DAFTAR.indexOf(t) >= 0 ? t : 'kertas'; } catch (e) { return 'kertas'; } }
  function terapkan(t) {
    if (t === 'kaca') muatKaca();
    if (t === 'awan') muatAwan();
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', WARNA[t]);
  }
  window.setTema = function (t) {
    try { localStorage.setItem('tema', t); } catch (e) {}
    terapkan(t); tandai();
  };
  function tandai() {
    var t = baca();
    document.querySelectorAll('[data-tema]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tema === t); });
  }
  window.pasangPilihTema = function (el) {
    el.innerHTML = '<h3>' + tr('set.tema', 'Tema tampilan') + '</h3><div class="tema-opsi">' +
      '<button data-tema="kertas"><i class="k"></i>' + tr('set.kertas', 'Kertas') + '</button>' +
      '<button data-tema="terang"><i class="t"></i>' + tr('set.terang', 'Terang') + '</button>' +
      '<button data-tema="gelap"><i class="g"></i>' + tr('set.gelap', 'Gelap') + '</button>' +
      '<button data-tema="kaca"><i class="c"></i>' + tr('set.kaca', 'Kaca') + '</button>' +
      '<button data-tema="awan"><i class="a"></i>' + tr('set.awan', 'Awan') + '</button></div>';
    el.querySelectorAll('[data-tema]').forEach(function (b) { b.onclick = function () { window.setTema(b.dataset.tema); }; });
    tandai();
  };
  terapkan(baca());
  document.addEventListener('DOMContentLoaded', function () { terapkan(baca()); var el = document.getElementById('tema'); if (el) window.pasangPilihTema(el); });
})();

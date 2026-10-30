// Tema: kertas (bawaan), terang, gelap. Dimuat di <head> agar tidak berkedip.
(function () {
  var DAFTAR = ['kertas', 'terang', 'gelap'];
  var WARNA = { kertas: '#f6f0e4', terang: '#ffffff', gelap: '#0b0b0c' };
  function baca() { try { var t = localStorage.getItem('tema'); return DAFTAR.indexOf(t) >= 0 ? t : 'kertas'; } catch (e) { return 'kertas'; } }
  function terapkan(t) {
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
    el.innerHTML = '<h3>Tema tampilan</h3><div class="tema-opsi">' +
      '<button data-tema="kertas"><i class="k"></i>Kertas</button>' +
      '<button data-tema="terang"><i class="t"></i>Terang</button>' +
      '<button data-tema="gelap"><i class="g"></i>Gelap</button></div>';
    el.querySelectorAll('[data-tema]').forEach(function (b) { b.onclick = function () { window.setTema(b.dataset.tema); }; });
    tandai();
  };
  terapkan(baca());
  document.addEventListener('DOMContentLoaded', function () { terapkan(baca()); var el = document.getElementById('tema'); if (el) window.pasangPilihTema(el); });
})();

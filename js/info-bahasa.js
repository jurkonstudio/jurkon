// Halaman informasi (Kebijakan privasi, Aturan, Pusat bantuan, Tentang) mengikuti bahasa tampilan.
// HTML statis di tiap halaman adalah versi Indonesia (sumber utama). Berkas ini mengganti isinya memakai
// window.INFO_T dari js/info/<kode>.js (en, ms, jv, su, zh, ja). Halaman ditandai lewat  data-info="..."  pada .dokumen.
// Bila isi versi Indonesia berubah, perbarui keenam terjemahan di js/info/ dan tanggal "terakhir diperbarui".
(function () {
  var kode = window.I18N_KODE;
  var T = window.INFO_T;
  if (!kode || kode === 'id' || !T) return;
  var kotak = document.querySelector('.dokumen[data-info]');
  if (!kotak) return;
  var d = T[kotak.getAttribute('data-info')];
  if (!d) return;

  function tautan(h, x) { return '<a href="' + h + '">' + x + '</a>'; }
  var html = d.html;
  if (d.hukum) html += '<p class="dok-catatan">' + T.catatan + '</p>';
  html += '<nav class="dok-nav" aria-label="' + T.navAria + '">' +
    tautan('kebijakan-privasi.html', T.nav[0]) + ' · ' + tautan('ketentuan-layanan.html', T.nav[1]) + ' · ' + tautan('aturan.html', T.nav[2]) + ' · ' +
    tautan('pusat-bantuan.html', T.nav[3]) + ' · ' + tautan('tentang.html', T.nav[4]) + '</nav>';
  kotak.innerHTML = html;

  var h1 = document.querySelector('.header h1');
  if (h1) h1.textContent = d.h1;
  document.title = d.h1 + ' · Jurkon';
  var meta = document.querySelector('meta[name="description"]');
  if (meta && d.desc) meta.setAttribute('content', d.desc);
})();

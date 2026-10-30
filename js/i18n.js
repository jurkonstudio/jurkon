// Bahasa tampilan: otomatis mengikuti bahasa ponsel/browser, atau dipilih manual di Pengaturan.
// Dimuat di <head> setelah js/bahasa-muat.js (yang memuat js/bahasa/<kode>.js) dan SEBELUM js/tema.js.
// Sumber kamus tetap js/bahasa.js; setelah mengubahnya jalankan: node tools/pecah-bahasa.js
//
// Pakai di JavaScript:   t('kunci')   atau   t('kunci', { n: 3 })
// Pakai di HTML:         data-i="kunci"        -> isi teks
//                        data-i-html="kunci"   -> isi HTML (hanya untuk teks bawaan sendiri, bukan dari pengguna)
//                        data-i-ph="kunci"     -> placeholder
//                        data-i-aria="kunci"   -> aria-label
//                        data-i-title="kunci"  -> atribut title
//                        data-i-phs="kunci"    -> placeholder bergantian (dipisah |), dibaca ui.js
//                        data-i-doc="kunci"    -> judul tab browser ("<teks> · Jurkon")
(function () {
  var DAFTAR = I18N_BAHASA, KAMUS = (typeof I18N_KAMUS !== 'undefined') ? I18N_KAMUS : {};   // satu bahasa saja (js/bahasa/<kode>.js), nilainya teks langsung
  var KUNCI = 'bahasa';
  var KODE = DAFTAR.map(function (b) { return b.kode; });

  function simpanan() { try { return localStorage.getItem(KUNCI) || 'auto'; } catch (e) { return 'auto'; } }

  // Cocokkan daftar bahasa perangkat (urut prioritas) dengan bahasa yang tersedia.
  // Bila tidak ada yang cocok, pakai Inggris sebagai bahasa umum.
  function deteksi() {
    var l = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || navigator.userLanguage || ''];
    for (var i = 0; i < l.length; i++) {
      var d = String(l[i]).toLowerCase().replace('_', '-').split('-')[0];
      if (d === 'in') d = 'id';                       // kode lama untuk Indonesia
      if (d === 'jw') d = 'jv';                       // kode lama untuk Jawa
      if (d === 'zsm' || d === 'zlm') d = 'ms';       // Melayu baku
      if (KODE.indexOf(d) >= 0) return d;
    }
    return 'en';
  }

  var pilihan = simpanan();
  if (pilihan !== 'auto' && KODE.indexOf(pilihan) < 0) pilihan = 'auto';
  var kode = window.I18N_KODE || (pilihan === 'auto' ? deteksi() : pilihan);
  var idx = KODE.indexOf(kode);
  var locale = DAFTAR[idx].locale;

  function t(kunci, v) {
    var s = KAMUS[kunci];
    if (s == null) return kunci;
    if (v) s = s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
    return s;
  }

  var JUDUL_AWAL = /^\(\d+\+?\)\s*/;
  function terapkan(akar) {
    akar = akar || document;
    var ambil = function (attr, fn) {
      akar.querySelectorAll('[' + attr + ']').forEach(function (el) { var k = el.getAttribute(attr); if (KAMUS[k]) fn(el, k); });   // kunci tak dikenal: pertahankan teks bawaan HTML
    };
    ambil('data-i', function (el, k) { el.textContent = t(k); });
    ambil('data-i-html', function (el, k) { el.innerHTML = t(k); });
    ambil('data-i-ph', function (el, k) { el.setAttribute('placeholder', t(k)); });
    ambil('data-i-aria', function (el, k) { el.setAttribute('aria-label', t(k)); });
    ambil('data-i-title', function (el, k) { el.setAttribute('title', t(k)); });
    var doc = document.querySelector('title[data-i-doc]');
    if (doc && akar === document) {
      var awal = JUDUL_AWAL.exec(document.title);     // pertahankan hitungan "(3) " dari notifikasi
      document.title = (awal ? awal[0] : '') + t(doc.getAttribute('data-i-doc')) + ' · Jurkon';
    }
  }

  function atur(pil) {
    try { if (pil === 'auto') localStorage.removeItem(KUNCI); else localStorage.setItem(KUNCI, pil); } catch (e) {}
  }

  // Pemilih bahasa untuk lembar Pengaturan (dan halaman masuk)
  function pasangPilih(el) {
    var opsi = '<option value="auto">' + t('bahasa.auto') + '</option>' + DAFTAR.map(function (b) {
      return '<option value="' + b.kode + '" lang="' + b.kode + '">' + b.nama + '</option>';
    }).join('');
    el.innerHTML = '<h3>' + t('bahasa.judul') + '</h3>' +
      '<select id="pilihBahasa" aria-label="' + t('bahasa.judul') + '">' + opsi + '</select>' +
      '<p class="hitung" style="margin-top:8px">' + t('bahasa.info') + '</p>';
    var s = el.querySelector('select');
    s.value = pilihan;
    s.onchange = function () {
      atur(s.value);
      try { sessionStorage.setItem('bukaPengaturan', '1'); } catch (e) {}
      location.reload();                              // isi yang dibuat lewat JavaScript ikut berganti
    };
  }

  document.documentElement.lang = kode;

  window.I18n = {
    kode: kode, locale: locale, pilihan: pilihan, daftar: DAFTAR,
    terapkan: terapkan, atur: atur, pasangPilih: pasangPilih, deteksi: deteksi
  };
  window.t = t;
  window.pasangPilihBahasa = pasangPilih;

  document.addEventListener('DOMContentLoaded', function () {
    terapkan(document);
    var el = document.getElementById('bahasa');
    if (el) pasangPilih(el);
  });
})();

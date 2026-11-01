// Memuat terjemahan halaman informasi (js/info/<kode>.js) sesuai bahasa tampilan.
// Bahasa Indonesia tidak perlu: isinya sudah ada di HTML statis (terbaca tanpa JavaScript dan oleh mesin pencari).
// Dipasang di akhir <body>, sebelum js/info-bahasa.js (yang menampilkan hasilnya) dan js/kontak.js.
(function () {
  var kode = window.I18N_KODE;
  if (!kode || kode === 'id') return;
  document.write('<script src="js/info/' + kode + '.js"><\/script>');
})();

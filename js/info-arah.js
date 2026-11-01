// DIHASILKAN oleh tools/buat-info.js. Jangan diedit langsung.
// Halaman info Indonesia (tentang.html, dst.) membuka versi statis bahasa pengguna (/en/about.html, dst.).
// Dimuat tepat setelah js/bahasa-muat.js (yang menetapkan window.I18N_KODE). replace() supaya tombol Kembali tidak terjebak.
(function () {
  var PETA = {"tentang.html":"about.html","kebijakan-privasi.html":"privacy.html","aturan.html":"rules.html","pusat-bantuan.html":"help.html","ketentuan-layanan.html":"terms.html"};
  var ADA = ["en","ms","jv","su","zh","ja"];
  var kode = window.I18N_KODE;
  var berkas = location.pathname.replace(/^.*\//, '');
  if (!kode || kode === 'id' || ADA.indexOf(kode) < 0 || !PETA[berkas]) return;
  location.replace('/' + kode + '/' + PETA[berkas] + location.search + location.hash);
})();

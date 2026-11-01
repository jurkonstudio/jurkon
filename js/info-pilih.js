// Halaman info statis per bahasa (/en/about.html dst.): memilih bahasa lewat tautan di bawah halaman
// juga disimpan sebagai bahasa tampilan, sama seperti pemilih di Pengaturan. Tanpa ini, memilih
// "Bahasa Indonesia" akan langsung dialihkan balik oleh js/info-arah.js. CSP melarang skrip sebaris, jadi dipisah.
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[data-bhs]') : null;
  if (!a) return;
  try { localStorage.setItem('bahasa', a.getAttribute('data-bhs')); } catch (x) {}
});

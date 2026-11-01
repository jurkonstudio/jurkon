// Mengisi alamat kontak di halaman informasi. Dipisah dari HTML supaya CSP tidak perlu 'unsafe-inline' untuk skrip.
(function () {
  var surel = 'jurkon@yahoo.com';
  var satu = document.getElementById('kontak');
  if (satu) satu.textContent = surel;
  document.querySelectorAll('.kontak-mail').forEach(function (e) {
    var a = document.createElement('a');
    a.href = 'mailto:' + surel;
    a.textContent = surel;
    e.appendChild(a);
  });
})();

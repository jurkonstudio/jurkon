// Alamat bersih: /login.html tampil sebagai /login, /index.html sebagai /.
// Hanya mengubah tampilan di bilah alamat (history.replaceState), tanpa memuat ulang halaman.
// GitHub Pages melayani /login dari login.html, jadi muat ulang dan tautan yang dibagikan tetap jalan.
// Alamat /@username (profil) tidak disentuh. Query (?id=...) dan hash (#...) dipertahankan.
(function () {
  try {
    var p = location.pathname;
    if (!/\.html$/.test(p) || p === '/404.html') return;
    var bersih = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (bersih !== p) history.replaceState(history.state, '', bersih + location.search + location.hash);
  } catch (e) {}
})();

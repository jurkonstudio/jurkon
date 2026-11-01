// Alamat profil yang enak dibagikan: jurkon.my.id/@username (juga jurkon.my.id/username).
// Situs ini statis di GitHub Pages, jadi tidak ada aturan "rewrite" di server. Alamat yang tidak ada
// jatuh ke 404.html, dan berkas ini (dimuat di <head> 404.html, sebelum halaman tampil) mengalihkannya
// ke profil.html?u=username. Halaman profil sendiri tetap yang melayani login dan data.
//
// Tautan yang DIBAGIKAN memakai /@username. Bentuk /username tanpa @ hanya cadangan: bila namanya sama
// dengan halaman asli (login, explore, n, chat, dst.), GitHub Pages menyajikan halaman itu lebih dulu.
(function () {
  var m = /^\/@?([A-Za-z0-9_]{3,20})\/?$/.exec(location.pathname);
  if (!m) return;                       // bukan bentuk username: biarkan 404.html tampil
  location.replace('/profil.html?u=' + m[1].toLowerCase());
})();

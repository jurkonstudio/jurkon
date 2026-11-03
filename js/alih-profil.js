// Alamat profil yang enak dibagikan: jurkon.my.id/@username (juga jurkon.my.id/username).
// Situs ini statis di GitHub Pages, jadi tidak ada aturan "rewrite" di server. Alamat yang tidak ada
// jatuh ke 404.html, dan berkas ini (dimuat di <head> 404.html, sebelum halaman tampil) mengalihkannya
// ke profil-publik.html?u=username untuk TAMU, atau profil.html?u=username untuk anggota yang sudah masuk
// (ada sesi Supabase di perangkat). profil-publik.html sendiri juga mengalihkan anggota ke profil.html.
//
// Tautan yang DIBAGIKAN memakai /@username. Bentuk /username tanpa @ hanya cadangan: bila namanya sama
// dengan halaman asli (login, explore, n, chat, dst.), GitHub Pages menyajikan halaman itu lebih dulu.
(function () {
  var m = /^\/@?([A-Za-z0-9_]{3,20})\/?$/.exec(location.pathname);
  if (!m) return;                       // bukan bentuk username: biarkan 404.html tampil
  var masuk = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k) && localStorage.getItem(k)) { masuk = true; break; }
    }
  } catch (e) {}
  location.replace((masuk ? '/profil.html?u=' : '/profil-publik.html?u=') + m[1].toLowerCase());
})();

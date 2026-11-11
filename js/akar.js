// Alamat utama (index.html) untuk pengunjung yang BELUM masuk: arahkan ke landing, bukan ke halaman login.
// Yang sudah masuk (ada sesi Supabase di perangkat) tidak terpengaruh: beranda tampil seperti biasa.
// Dimuat paling awal di <head> index.html, sebelum kamus dan skrip lain, supaya tidak ada kilatan beranda kosong.
// Tanpa jaringan: hanya membaca localStorage. Bila localStorage tidak bisa dibaca, tidak melakukan apa-apa
// (beranda lalu mengarahkan ke login seperti sebelumnya).
(function () {
  // Tautan undangan (?undang=username): simpan di perangkat supaya bertahan sampai pendaftaran selesai (dipakai js/selamat.js).
  try {
    var uq = (new URLSearchParams(location.search).get('undang') || '').trim().toLowerCase().replace(/^@/, '');
    if (/^[a-z0-9_]{3,20}$/.test(uq)) localStorage.setItem('undang', JSON.stringify({ u: uq, t: Date.now() }));
  } catch (e) {}
  // Kembali dari login Google (OAuth): alamat membawa ?code=... yang HARUS ditukar jadi sesi oleh Supabase di halaman ini.
  // Jangan dialihkan ke landing dulu, kalau tidak kode hilang dan pengguna terlihat belum masuk.
  if (/[?&](code|error|error_description)=/.test(location.search) || /(access_token|error)=/.test(location.hash)) return;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k) && localStorage.getItem(k)) return;      // ada sesi: tetap di beranda
    }
    // Bahasa landing: pilihan manual lebih dulu, lalu bahasa perangkat; di luar 12 bahasa landing -> Inggris.
    // (es, fr, ar hanya punya landing; antarmuka aplikasinya belum memuat bahasa itu, jadi pilihan tersimpan tidak pernah berisi bahasa itu.)
    var ADA = ['id', 'en', 'ms', 'jv', 'su', 'zh', 'ja', 'es', 'fr', 'hi', 'ar', 'ko'], kode = '';
    var pil = localStorage.getItem('bahasa') || '';
    if (ADA.indexOf(pil) >= 0) kode = pil;
    if (!kode) {
      var l = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
      for (var j = 0; j < l.length && !kode; j++) {
        var d = String(l[j]).toLowerCase().replace('_', '-').split('-')[0];
        if (d === 'in') d = 'id'; else if (d === 'jw') d = 'jv'; else if (d === 'zsm' || d === 'zlm') d = 'ms';
        if (ADA.indexOf(d) >= 0) kode = d;
      }
    }
    if (!kode) kode = 'en';
    location.replace(kode === 'id' ? '/landing' : '/' + kode + '/');
  } catch (e) { /* biarkan beranda yang menangani */ }
})();

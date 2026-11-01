// Angka corong pengunjung, tanpa data pribadi: hanya "langkah X terjadi sekali" + kode bahasa halaman.
// Tidak ada cookie, IP, id perangkat, atau pelacak pihak ketiga. Dicatat sekali per langkah per tab (sessionStorage).
// Dihormati: Do Not Track dan Global Privacy Control (bila aktif, tidak mencatat apa pun).
// Server (sql/035): catat_corong() hanya menerima daftar langkah tetap dan menaikkan satu hitungan harian.
// Langkah: landing, landing_mulai, jelajahi, jelajahi_baca, login_buka. "Akun baru" dan "catatan pertama"
// dihitung dari database lewat admin_corong(), jadi tidak perlu pelacakan di browser.
(function () {
  function nonaktif() {
    return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  }
  window.catatCorong = function (langkah, bahasa) {
    try {
      if (nonaktif() || typeof db === 'undefined') return;
      var kunci = 'corong:' + langkah;
      if (sessionStorage.getItem(kunci)) return;
      sessionStorage.setItem(kunci, '1');
      var h = db.rpc('catat_corong', { p_langkah: langkah, p_bahasa: String(bahasa || window.I18N_KODE || document.documentElement.lang || 'id').slice(0, 2).toLowerCase() });
      if (h && h.then) h.then(function () {}, function () {});
    } catch (e) { /* hitungan boleh hilang; halaman tidak boleh terganggu */ }
  };
})();

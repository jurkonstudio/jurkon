// Lapisan keamanan sisi klien. Dimuat PERTAMA di setiap halaman (setelah meta CSP).
// 1) Anti-framing (clickjacking): GitHub Pages tidak bisa mengirim header X-Frame-Options/frame-ancestors,
//    jadi halaman menolak tampil di dalam iframe situs lain.
(function () {
  try {
    if (window.top !== window.self) {
      document.documentElement.style.display = 'none';
      try { window.top.location.href = window.self.location.href; } catch (e) { /* dilarang lintas-asal */ }
      // Bila gagal keluar dari bingkai, jangan biarkan halaman dimuat dalam keadaan tersembunyi-tapi-aktif.
      throw new Error('Jurkon tidak boleh dimuat di dalam bingkai (iframe).');
    }
  } catch (e) {
    if (window.top !== window.self) throw e;
  }
})();

// 2) Pemeriksa kekuatan kata sandi (hanya saat daftar / ganti sandi; login lama tetap boleh).
//    Aturan sebenarnya juga harus dipasang di Supabase > Authentication > Passwords (lihat README).
window.Keamanan = {
  UMUM: ['password', 'password1', 'passw0rd', 'qwerty123', 'qwertyuiop', 'abc12345', '12345678', '123456789',
         '1234567890', '11111111', '00000000', 'iloveyou', 'sandi123', 'katasandi', 'rahasia123', 'indonesia',
         'indonesia1', 'jurkon123', 'admin123', 'welcome1', 'letmein1', 'asdfghjk', 'asdf1234'],
  sandiKuat: function (sandi, email) {
    sandi = String(sandi || '');
    if (sandi.length < 8 || sandi.length > 72) return false;
    if (!/[A-Za-zÀ-ɏ]/.test(sandi) || !/[0-9]/.test(sandi)) return false;
    var s = sandi.toLowerCase();
    if (this.UMUM.indexOf(s) >= 0) return false;
    if (/^(.)\1+$/.test(s)) return false;                                  // aaaaaaaa
    var lokal = String(email || '').toLowerCase().split('@')[0];
    if (lokal.length >= 4 && s.indexOf(lokal) >= 0) return false;         // memuat bagian depan email
    return true;
  }
};

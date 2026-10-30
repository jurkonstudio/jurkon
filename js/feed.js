let saya = null, daf = null;
function muat() { return daf.muat(); }
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  daf = daftarBerhalaman($('#daftar'), sebelum => ambilPosting({ mode: 'beranda', sebelum }, saya),
    () => kosong('pena', 'Beranda masih sepi', 'Tulis catatan pertamamu, atau temukan orang untuk diikuti lewat Jelajah.', 'post.html', 'Tulis sekarang'), saya);
  pasangAksiPost(saya, muat);
  muat();
})();

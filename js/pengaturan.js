// Navigasi panel Pengaturan: menu utama berisi kategori, tiap kategori membuka halamannya sendiri
// di dalam lembar yang sama (tombol panah kembali di kiri atas).
//   tampilan  -> tema, bahasa
//   keamanan  -> email, kata sandi, perangkat & aktivitas login
//   privasi   -> saklar Profil publik (js/privasi.js)
//   data      -> unduh data, hapus akun
//   info      -> kebijakan, aturan, bantuan, tentang
(function () {
  const lembar = document.getElementById('lembarPengaturan');
  if (!lembar) return;
  const JUDUL = { tampilan: 'set.katTampilan', keamanan: 'set.katKeamanan', privasi: 'set.katPrivasi', data: 'set.katData', info: 'set.info' };
  const kembali = document.getElementById('setKembali');
  const judul = document.getElementById('jPengaturan');
  let kini = 'beranda';

  function tampil(pane) {
    if (pane !== 'beranda' && !JUDUL[pane]) pane = 'beranda';
    kini = pane;
    lembar.querySelectorAll('.set-pane').forEach(p => { p.hidden = p.dataset.pane !== pane; });
    kembali.hidden = pane === 'beranda';
    lembar.classList.toggle('di-dalam', pane !== 'beranda');
    judul.textContent = t(pane === 'beranda' ? 'pf.pengaturan' : JUDUL[pane]);
    lembar.scrollTop = 0;
    judul.focus({ preventScroll: true });
    if (pane === 'keamanan' && window.Sesi) Sesi.muat();       // daftar perangkat dimuat saat halamannya dibuka
  }

  function buka(pane) {
    if (!lembar.open) lembar.showModal();
    tampil(pane || 'beranda');
  }

  lembar.querySelectorAll('[data-ke]').forEach(b => { b.onclick = () => tampil(b.dataset.ke); });
  kembali.onclick = () => tampil('beranda');
  // Esc / tombol kembali sistem: dari halaman kategori kembali ke menu, dari menu menutup lembar.
  lembar.addEventListener('cancel', e => { if (kini !== 'beranda') { e.preventDefault(); tampil('beranda'); } });
  lembar.addEventListener('close', () => { kini = 'beranda'; lembar.querySelectorAll('.set-pane').forEach(p => { p.hidden = p.dataset.pane !== 'beranda'; }); kembali.hidden = true; lembar.classList.remove('di-dalam'); judul.textContent = t('pf.pengaturan'); });

  window.Pengaturan = { buka: buka, tampil: tampil };
})();

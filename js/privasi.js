// Saklar "Profil publik" (butuh sql/045_profil_publik.sql). Dua tempat, satu keadaan:
//   1) Pengaturan > Privasi (#pvProfil): saklar + penjelasan + tombol salin tautan.
//   2) Profil sendiri: saklar kecil di bawah tombol (dipasang profil.js lewat Privasi.pasangSaklarProfil).
// Bawaan MATI. Saat mati, tamu yang membuka jurkon.my.id/@username hanya melihat ajakan bergabung.
// Bila migrasi 045 belum dijalankan, baris menu Privasi dan saklar di profil disembunyikan; aplikasi tetap jalan.
(function () {
  const wadah = document.getElementById('pvProfil');
  const IKON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/></svg>';
  let tersedia = true, nilai = null, username = '', sibuk = false;
  const chip = [];                       // saklar di profil (bisa dibuat ulang saat profil dimuat ulang)

  const toast = teks => { if (typeof tampilToast === 'function') tampilToast(teks); else setStatus(teks); };
  function setStatus(teks) { const el = document.getElementById('pvStatus'); if (el) el.textContent = teks || ''; }

  function segarkan() {
    const ada = nilai !== null;
    const cek = document.getElementById('pvSaklar');
    if (cek) { cek.disabled = !ada || sibuk; cek.checked = !!nilai; }
    const info = document.getElementById('pvInfo');
    if (info) info.textContent = ada ? t(nilai ? 'pv.infoAktif' : 'pv.infoMati') : t('umum.memuat');
    const salin = document.getElementById('pvSalin');
    if (salin) salin.hidden = !nilai;
    for (let i = chip.length - 1; i >= 0; i--) {
      const c = chip[i];
      if (!c.isConnected) { chip.splice(i, 1); continue; }
      c.disabled = !ada || sibuk;
      c.setAttribute('aria-checked', String(!!nilai));
      c.querySelector('span').textContent = t(nilai ? 'pv.chipAktif' : 'pv.chipMati');
    }
  }

  function sembunyikan() {
    tersedia = false;
    const m = document.getElementById('menuPrivasi');
    if (m) m.hidden = true;
    chip.forEach(c => c.remove());
    chip.length = 0;
  }

  async function atur(baru) {
    if (!tersedia || sibuk) { segarkan(); return; }
    if (baru && !confirm(t('pv.konfirmAktif'))) { segarkan(); return; }
    sibuk = true; segarkan(); setStatus('');
    const { error } = await db.rpc('atur_profil_publik', { p_publik: baru });
    sibuk = false;
    if (error) {
      setStatus(t('pv.gagal', { pesan: galatRamah(error) }));
      if (/atur_profil_publik|schema cache/i.test(String(error.message || ''))) sembunyikan();
    } else {
      nilai = baru;
      toast(t(baru ? 'pv.chipAktif' : 'pv.chipMati'));
    }
    segarkan();
  }

  async function salinTautan() {
    if (!username) return;
    const url = location.origin + '/@' + encodeURIComponent(username);
    try { await navigator.clipboard.writeText(url); toast(t('pv.tersalin')); }
    catch (e) { prompt(t('pf.salinManual'), url); }
  }

  if (wadah) {
    wadah.innerHTML = '<h3>' + esc(t('pv.judul')) + '</h3>' +
      '<label class="saklar-baris"><span class="saklar-teks">' + esc(t('pv.saklar')) + '</span><input type="checkbox" role="switch" class="saklar" id="pvSaklar" disabled></label>' +
      '<p class="hitung" id="pvInfo">' + esc(t('umum.memuat')) + '</p>' +
      '<div class="akun-aksi"><button type="button" class="btn garis" id="pvSalin" hidden>' + esc(t('pv.salin')) + '</button></div>' +
      '<p class="hitung" id="pvStatus" role="status"></p>';
    document.getElementById('pvSaklar').onchange = e => atur(e.target.checked);
    document.getElementById('pvSalin').onclick = salinTautan;
  }

  // Saklar kecil di bawah tombol profil sendiri
  function pasangSaklarProfil(el) {
    if (!el || !tersedia || el.querySelector('.chip-publik')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip-publik'; b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', 'false'); b.disabled = true;
    b.innerHTML = IKON + '<span>' + esc(t('pv.chipMati')) + '</span>';
    b.onclick = () => atur(!nilai);
    el.appendChild(b);
    chip.push(b);
    segarkan();
  }

  (async function muat() {
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) return;
      const { data, error } = await db.from('profiles').select('username,profil_publik').eq('id', session.user.id).maybeSingle();
      if (error) { if (/profil_publik/i.test(String(error.message || ''))) sembunyikan(); return; }
      username = (data && data.username) || '';
      nilai = !!(data && data.profil_publik);
      segarkan();
    } catch (e) { /* biarkan menunggu: saklar tetap nonaktif */ }
  })();

  window.Privasi = { pasangSaklarProfil: pasangSaklarProfil };
})();

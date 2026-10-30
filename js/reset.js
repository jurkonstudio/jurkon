// Halaman tujuan tautan "Lupa kata sandi". Supabase membaca token dari alamat dan membuat sesi sementara.
(function () {
  const info = $('#info'), galat = $('#galat'), simpan = $('#simpan');
  let siap = false;
  function tampilkanForm() {
    if (siap) return; siap = true;
    info.textContent = t('reset.buat');
    ['#baru', '#ulang', '#simpan'].forEach(s => { $(s).hidden = false; });
    $('#baru').focus();
  }
  db.auth.onAuthStateChange((ev, sesi) => { if (ev === 'PASSWORD_RECOVERY' || (ev === 'SIGNED_IN' && sesi)) tampilkanForm(); });
  db.auth.getSession().then(({ data }) => { if (data.session) tampilkanForm(); });
  setTimeout(() => { if (!siap) info.textContent = t('reset.basi'); }, 4000);

  simpan.onclick = async () => {
    galat.textContent = '';
    const a = $('#baru').value, b = $('#ulang').value;
    if (a.length < 6) { galat.textContent = t('auth.e.sandiPendek'); return; }
    if (a !== b) { galat.textContent = t('reset.harusSama'); return; }
    simpan.disabled = true;
    const { error } = await db.auth.updateUser({ password: a });
    simpan.disabled = false;
    if (error) { galat.textContent = t('reset.gagalSimpan', { pesan: error.message }); return; }
    info.textContent = t('reset.berhasil');
    setTimeout(() => { location.href = 'index.html'; }, 1200);
  };
})();

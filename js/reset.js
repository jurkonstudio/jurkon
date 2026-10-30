// Halaman tujuan tautan "Lupa kata sandi". Supabase membaca token dari alamat dan membuat sesi sementara.
(function () {
  const info = $('#info'), galat = $('#galat'), simpan = $('#simpan');
  let siap = false;
  function tampilkanForm() {
    if (siap) return; siap = true;
    info.textContent = 'Buat kata sandi baru untuk akunmu.';
    ['#baru', '#ulang', '#simpan'].forEach(s => { $(s).hidden = false; });
    $('#baru').focus();
  }
  db.auth.onAuthStateChange((ev, sesi) => { if (ev === 'PASSWORD_RECOVERY' || (ev === 'SIGNED_IN' && sesi)) tampilkanForm(); });
  db.auth.getSession().then(({ data }) => { if (data.session) tampilkanForm(); });
  setTimeout(() => { if (!siap) info.textContent = 'Tautan tidak valid atau sudah kedaluwarsa. Kembali ke halaman masuk lalu minta tautan baru lewat "Lupa kata sandi?".'; }, 4000);

  simpan.onclick = async () => {
    galat.textContent = '';
    const a = $('#baru').value, b = $('#ulang').value;
    if (a.length < 6) { galat.textContent = 'Kata sandi minimal 6 karakter.'; return; }
    if (a !== b) { galat.textContent = 'Kedua kata sandi harus sama.'; return; }
    simpan.disabled = true;
    const { error } = await db.auth.updateUser({ password: a });
    simpan.disabled = false;
    if (error) { galat.textContent = 'Gagal menyimpan: ' + error.message; return; }
    info.textContent = 'Kata sandi berhasil diganti. Mengalihkan…';
    setTimeout(() => { location.href = 'index.html'; }, 1200);
  };
})();

(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  pasangHitung($('#isi'), $('#hitung'), 250);
  pasangFilter($('#isi'));
  $('#kirim').onclick = async () => {
    const content = $('#isi').value.trim();
    if (!content) return;
    $('#galat').textContent = '';
    if (!bolehKirim(content, m => $('#galat').textContent = m)) return;
    $('#kirim').disabled = true;
    const { error } = await db.from('posts').insert({ user_id: saya.id, content });
    if (error) {
      $('#galat').textContent = 'Gagal mengirim: ' + (
        error.code === '23503' ? 'profilmu belum siap. Keluar lalu masuk lagi.'
        : error.code === '42501' ? 'kamu belum diizinkan memposting. Keluar lalu masuk lagi.'
        : pesanGalat(error));
      $('#kirim').disabled = false;
    } else location.href = 'index.html';
  };
})();

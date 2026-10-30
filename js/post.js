(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  pasangHitung($('#isi'), $('#hitung'), 250);
  pasangFilter($('#isi'));
  pasangMention($('#isi'), saya);
  $('#kirim').onclick = async () => {
    const content = $('#isi').value.trim();
    if (!content) return;
    $('#galat').textContent = '';
    if (!bolehKirim(content, m => $('#galat').textContent = m)) return;
    $('#kirim').disabled = true;
    const { error } = await db.from('posts').insert({ user_id: saya.id, content });
    if (error) {
      $('#galat').textContent = t('post.gagal', { pesan:
        error.code === '23503' ? t('post.e.profil')
        : error.code === '42501' ? t('post.e.izin')
        : pesanGalat(error) });
      $('#kirim').disabled = false;
    } else location.href = 'index.html';
  };
})();

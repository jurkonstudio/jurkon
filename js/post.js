(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  pasangHitung($('#isi'), $('#hitung'), 250);
  pasangFilter($('#isi'));
  pasangMention($('#isi'), saya);
  const kutipId = param('kutip');
  if (kutipId) {
    const h = $('#judulHal'); if (h) { h.dataset.i = 'post.kutipJudul'; h.textContent = t('post.kutipJudul'); }
    $('#isi').dataset.iPhs = 'post.kutipPh'; $('#isi').removeAttribute('data-ph'); $('#isi').placeholder = t('post.kutipPh');
    const { data } = await db.from('posts').select('id,content,created_at,jenis,profiles(username,nama)').eq('id', kutipId).maybeSingle();
    if (!data || data.jenis === 'ulang') { $('#galat').textContent = t('pc.kutipanHilang'); $('#kirim').disabled = true; }
    else $('#kutipan').innerHTML = htmlKutipan(data);
  }
  $('#kirim').onclick = async () => {
    const content = $('#isi').value.trim();
    if (!content) return;
    $('#galat').textContent = '';
    if (!bolehKirim(content, m => $('#galat').textContent = m)) return;
    $('#kirim').disabled = true;
    const { error } = await kirimPosting(kutipId ? { user_id: saya.id, content, jenis: 'kutip', kutip_id: kutipId } : { user_id: saya.id, content });
    if (error) {
      $('#galat').textContent = t('post.gagal', { pesan:
        error.code === '23503' ? t('post.e.profil')
        : error.code === '42501' ? t('post.e.izin')
        : pesanGalat(error) });
      $('#kirim').disabled = false;
    } else location.href = 'index.html';
  };
})();

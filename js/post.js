(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  pasangHitung($('#isi'), $('#hitung'), 250);
  $('#kirim').onclick = async () => {
    const content = $('#isi').value.trim();
    if (!content) return;
    $('#kirim').disabled = true;
    const { error } = await db.from('posts').insert({ user_id: saya.id, content });
    if (error) { $('#galat').textContent = 'Gagal mengirim: ' + error.message; $('#kirim').disabled = false; }
    else location.href = 'index.html';
  };
})();

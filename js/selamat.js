(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const { data: p } = await db.from('profiles').select('username,nama,siap').eq('id', saya.id).maybeSingle();
  if (!p) { $('#galat').textContent = t('sel.noProfil'); return; }
  if (p.siap) { location.replace('index.html'); return; }
  $('#username').value = p.username || '';
  $('#nama').value = p.nama || '';

  const POLA = /^[a-z0-9_]{3,20}$/;
  const info = $('#infoUser');
  let tunda;
  const cek = async () => {
    const u = $('#username').value.trim().toLowerCase();
    if (!POLA.test(u)) { info.textContent = t('user.hint'); info.className = 'hitung'; return false; }
    if (u === p.username) { info.textContent = t('sel.bisa'); info.className = 'hitung'; return true; }
    const { data } = await db.from('profiles').select('id').eq('username', u).maybeSingle();
    if (data) { info.textContent = t('user.dipakai'); info.className = 'hitung habis'; return false; }
    info.textContent = t('sel.tersedia'); info.className = 'hitung';
    return true;
  };
  $('#username').addEventListener('input', () => { clearTimeout(tunda); tunda = setTimeout(cek, 400); });

  $('#simpan').onclick = async () => {
    const galat = $('#galat'); galat.textContent = '';
    const username = $('#username').value.trim().toLowerCase();
    if (!POLA.test(username)) { galat.textContent = t('user.harus'); return; }
    if (!$('#setuju').checked) { galat.textContent = t('sel.centang'); return; }
    if (!bolehKirim($('#nama').value + ' \n ' + username, m => galat.textContent = m)) return;
    $('#simpan').disabled = true;
    const { error } = await db.from('profiles')
      .update({ username, nama: $('#nama').value.trim().slice(0, 40) || null, siap: true }).eq('id', saya.id);
    if (error) {
      $('#simpan').disabled = false;
      galat.textContent = error.code === '23505' ? t('sel.dipakaiCoba')
        : error.code === '23514' ? t('user.harus')
        : (pesanKontenDilarang(error) || error.message);
      return;
    }
    try { sessionStorage.setItem('siap:' + saya.id, '1'); } catch (e) {}
    location.href = 'index.html';
  };
})();

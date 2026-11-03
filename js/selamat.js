(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const { data: p } = await db.from('profiles').select('username,nama,siap').eq('id', saya.id).maybeSingle();
  if (!p) { $('#galat').textContent = t('sel.noProfil'); return; }
  if (p.siap) { location.replace('index.html'); return; }
  $('#username').value = p.username || '';
  $('#nama').value = p.nama || '';

  // Tautan undangan (?undang=username, disimpan js/akar.js / js/auth.js): tawarkan mengikuti pengundang, tanpa memaksa.
  let undangan = null, cbIkut = null;
  try {
    const x = JSON.parse(localStorage.getItem('undang') || 'null');
    if (x && /^[a-z0-9_]{3,20}$/.test(x.u) && Date.now() - x.t < 14 * 864e5) undangan = x;
  } catch (e) {}
  if (undangan) {
    try {
      const { data: pu } = await db.from('profiles').select('username,nama').eq('username', undangan.u).eq('siap', true).maybeSingle();
      if (pu && pu.username !== p.username) {
        const lab = document.createElement('label'); lab.className = 'centang';
        lab.innerHTML = '<input type="checkbox" id="ikutUndang" checked><span></span>';
        lab.querySelector('span').textContent = t('mulai.ikutiPengundang', { u: pu.username });
        $('#simpan').parentNode.insertBefore(lab, $('#simpan'));
        cbIkut = lab.querySelector('input');
      } else undangan = null;
    } catch (e) { undangan = null; }
  }

  const POLA = /^[a-z0-9_]{3,20}$/;
  const info = $('#infoUser');
  let tunda, urut = 0;
  const cek = async () => {
    const u = $('#username').value.trim().toLowerCase(), n = ++urut;
    if (!POLA.test(u)) { info.textContent = t('user.hint'); info.className = 'hitung'; return false; }
    const k = await cekUsernameServer(u);
    if (n !== urut) return false;   // pengguna sudah mengetik lagi: abaikan hasil lama
    if (k && k !== 'ok') { info.textContent = t(PESAN_USERNAME[k] || 'user.cadangan'); info.className = 'hitung habis'; return false; }
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
    const kode = await cekUsernameServer(username);
    if (kode && kode !== 'ok') { galat.textContent = t(PESAN_USERNAME[kode] || 'user.cadangan'); return; }
    if (!bolehKirim($('#nama').value + ' \n ' + username, m => galat.textContent = m)) return;
    $('#simpan').disabled = true;
    const { error } = await db.from('profiles')
      .update({ username, nama: $('#nama').value.trim().slice(0, 40) || null, siap: true }).eq('id', saya.id);
    if (error) {
      $('#simpan').disabled = false;
      galat.textContent = error.code === '23505' ? t('sel.dipakaiCoba')
        : error.code === '23514' ? t('user.harus')
        : galatRamah(error);
      return;
    }
    try { sessionStorage.setItem('siap:' + saya.id, '1'); } catch (e) {}
    if (undangan) {
      try { await db.rpc('terima_undangan', { p_username: undangan.u, p_ikuti: !!(cbIkut && cbIkut.checked) }); } catch (e) {}
      try { localStorage.removeItem('undang'); } catch (e) {}
    }
    location.href = 'mulai.html';   // onboarding 3 langkah (boleh dilewati); halaman itu sendiri tidak memaksa
  };
})();

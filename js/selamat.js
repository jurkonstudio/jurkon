(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const { data: p } = await db.from('profiles').select('username,nama,siap').eq('id', saya.id).maybeSingle();
  if (!p) { $('#galat').textContent = 'Profil tidak ditemukan. Coba keluar lalu masuk lagi.'; return; }
  if (p.siap) { location.replace('index.html'); return; }
  $('#username').value = p.username || '';
  $('#nama').value = p.nama || '';

  const POLA = /^[a-z0-9_]{3,20}$/;
  const info = $('#infoUser');
  let t;
  const cek = async () => {
    const u = $('#username').value.trim().toLowerCase();
    if (!POLA.test(u)) { info.textContent = 'Huruf kecil, angka, dan garis bawah (_), 3-20 karakter.'; info.className = 'hitung'; return false; }
    if (u === p.username) { info.textContent = 'Username ini bisa dipakai.'; info.className = 'hitung'; return true; }
    const { data } = await db.from('profiles').select('id').eq('username', u).maybeSingle();
    if (data) { info.textContent = 'Username sudah dipakai.'; info.className = 'hitung habis'; return false; }
    info.textContent = 'Username tersedia.'; info.className = 'hitung';
    return true;
  };
  $('#username').addEventListener('input', () => { clearTimeout(t); t = setTimeout(cek, 400); });

  $('#simpan').onclick = async () => {
    const galat = $('#galat'); galat.textContent = '';
    const username = $('#username').value.trim().toLowerCase();
    if (!POLA.test(username)) { galat.textContent = 'Username harus 3-20 karakter: huruf kecil, angka, atau garis bawah.'; return; }
    if (!$('#setuju').checked) { galat.textContent = 'Centang persetujuan aturan dan kebijakan privasi dulu.'; return; }
    $('#simpan').disabled = true;
    const { error } = await db.from('profiles')
      .update({ username, nama: $('#nama').value.trim().slice(0, 40) || null, siap: true }).eq('id', saya.id);
    if (error) {
      $('#simpan').disabled = false;
      galat.textContent = error.code === '23505' ? 'Username sudah dipakai. Coba yang lain.'
        : error.code === '23514' ? 'Username harus 3-20 karakter: huruf kecil, angka, atau garis bawah.'
        : error.message;
      return;
    }
    try { sessionStorage.setItem('siap:' + saya.id, '1'); } catch (e) {}
    location.href = 'index.html';
  };
})();

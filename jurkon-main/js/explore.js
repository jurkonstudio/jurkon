let saya = null, t, versi = 0, daf = null;
async function muat() {
  const kata = $('#cari').value.trim().replace(/^@/, '').slice(0, 50);
  const ini = ++versi;
  if (daf) daf.hentikan();
  const el = $('#daftar');
  let elOrang = $('#orang');
  if (!elOrang) { elOrang = document.createElement('div'); elOrang.id = 'orang'; el.parentNode.insertBefore(elOrang, el); }
  let jmlOrang = 0;
  if (kata) {
    const pola = '%' + kata.replace(/[\\%_]/g, c => '\\' + c) + '%';   // escape karakter khusus LIKE
    const [r1, r2] = await Promise.all([
      db.from('profiles').select('id,username,nama,bio,foto_url').ilike('username', pola).limit(10),
      db.from('profiles').select('id,username,nama,bio,foto_url').ilike('nama', pola).limit(10)
    ]);
    if (ini !== versi) return;
    if (r1.error && r2.error) {
      elOrang.innerHTML = '<div class="kosong"><p>Pencarian orang gagal: ' + esc(pesanGalat(r1.error)) + '</p></div>';
    } else {
      const peta = new Map();
      [...(r1.data || []), ...(r2.data || [])].forEach(o => peta.set(o.id, o));
      const orang = [...peta.values()].slice(0, 10);
      jmlOrang = orang.length;
      elOrang.innerHTML = orang.map(o => `<a class="item dgn-avatar" href="profil.html?u=${esc(o.username)}">
        ${avatar(o.nama || o.username, 44, o.foto_url)}
        <div><b>${esc(o.nama || o.username)}</b> <span class="sub">@${esc(o.username)}</span>
        <div class="sub">${esc(o.bio || '')}</div></div></a>`).join('');
    }
  } else elOrang.innerHTML = '';
  daf = daftarBerhalaman(el, sebelum => ambilPosting({ mode: kata ? 'cari' : 'semua', kata, sebelum }, saya),
    () => jmlOrang ? '' : kosong('cari', 'Tidak ditemukan', kata ? 'Tidak ada hasil untuk "' + esc(kata) + '". Coba kata lain.' : 'Belum ada yang bisa dijelajahi.'), saya);
  daf.muat();
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  $('#cari').addEventListener('input', () => { clearTimeout(t); t = setTimeout(muat, 350); });
  muat();
})();

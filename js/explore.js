let saya = null, t;
async function muat() {
  const mentah = $('#cari').value.trim().replace(/^@/, '').slice(0, 50);
  const kata = mentah;
  const pola = '%' + mentah.replace(/[\\%_]/g, c => '\\' + c) + '%';   // escape karakter khusus LIKE
  const el = $('#daftar');
  if (!el.children.length) el.innerHTML = skeleton(3);
  let html = '';
  if (kata) {
    const [r1, r2] = await Promise.all([
      db.from('profiles').select('id,username,nama,bio').ilike('username', pola).limit(10),
      db.from('profiles').select('id,username,nama,bio').ilike('nama', pola).limit(10)
    ]);
    const peta = new Map();
    [...(r1.data || []), ...(r2.data || [])].forEach(o => peta.set(o.id, o));
    const orang = [...peta.values()].slice(0, 10);
    html += (orang || []).map(o => `<a class="item dgn-avatar" href="profil.html?u=${esc(o.username)}">
      ${avatar(o.nama || o.username, 44)}
      <div><b>${esc(o.nama || o.username)}</b> <span class="sub">@${esc(o.username)}</span>
      <div class="sub">${esc(o.bio || '')}</div></div></a>`).join('');
  }
  let q = db.from('posts').select(PILIH_POST).is('parent_id', null).order('created_at', { ascending: false }).limit(30);
  if (kata) q = q.ilike('content', pola);
  const { data } = await q;
  await tandaiSuka(data || [], saya);
  html += (data || []).map(p => htmlPost(p, saya)).join('');
  el.innerHTML = html || kosong('cari', 'Tidak ditemukan', kata ? 'Tidak ada hasil untuk "' + esc(kata) + '". Coba kata lain.' : 'Belum ada yang bisa dijelajahi.');
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  $('#cari').addEventListener('input', () => { clearTimeout(t); t = setTimeout(muat, 350); });
  muat();
})();

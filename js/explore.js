let saya = null, t;
async function muat() {
  const kata = $('#cari').value.trim().replace(/[%,()]/g, '');
  const el = $('#daftar');
  let html = '';
  if (kata) {
    const { data: orang } = await db.from('profiles').select('username,nama,bio')
      .or(`username.ilike.%${kata}%,nama.ilike.%${kata}%`).limit(10);
    html += (orang || []).map(o => `<a class="item" href="profil.html?u=${esc(o.username)}">
      <b>${esc(o.nama || o.username)}</b> <span style="color:var(--redup)">@${esc(o.username)}</span>
      <div>${esc(o.bio || '')}</div></a>`).join('');
  }
  let q = db.from('posts').select(PILIH_POST).is('parent_id', null).order('created_at', { ascending: false }).limit(30);
  if (kata) q = q.ilike('content', `%${kata}%`);
  const { data } = await q;
  await tandaiSuka(data || [], saya);
  html += (data || []).map(p => htmlPost(p, saya)).join('');
  el.innerHTML = html || '<div class="kosong">Tidak ditemukan.</div>';
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  $('#cari').addEventListener('input', () => { clearTimeout(t); t = setTimeout(muat, 350); });
  muat();
})();

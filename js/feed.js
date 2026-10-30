let saya = null;
async function muat() {
  const el = $('#daftar');
  if (!el.children.length) el.innerHTML = skeleton(4);
  let q = db.from('posts').select(PILIH_POSTING).is('parent_id', null).order('created_at', { ascending: false }).limit(50);
  if (saya) {
    const { data: f } = await db.from('follows').select('following_id').eq('follower_id', saya.id);
    if (f && f.length) q = q.in('user_id', [saya.id, ...f.map(x => x.following_id)]);
  }
  const { data, error } = await q;
  if (error) { console.error(error); el.innerHTML = '<div class="kosong">Gagal memuat.<div class="hitung" style="margin-top:8px">' + esc(error.message || '') + '</div></div>'; return; }
  if (!data.length) { el.innerHTML = kosong('pena', 'Beranda masih sepi', 'Tulis catatan pertamamu, atau temukan orang untuk diikuti lewat Jelajah.', 'post.html', 'Tulis sekarang'); return; }
  await tandaiSuka(data, saya);
  el.innerHTML = data.map(p => htmlPost(p, saya)).join('');
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  muat();
})();

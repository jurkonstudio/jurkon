let saya = null;
async function muat() {
  const el = $('#daftar');
  let q = db.from('posts').select(PILIH_POST).is('parent_id', null).order('created_at', { ascending: false }).limit(50);
  if (saya) {
    const { data: f } = await db.from('follows').select('following_id').eq('follower_id', saya.id);
    if (f && f.length) q = q.in('user_id', [saya.id, ...f.map(x => x.following_id)]);
  }
  const { data, error } = await q;
  if (error) { el.innerHTML = '<div class="kosong">Gagal memuat.</div>'; return; }
  if (!data.length) { el.innerHTML = '<div class="kosong">Belum ada posting. Jadilah yang pertama!</div>'; return; }
  await tandaiSuka(data, saya);
  el.innerHTML = data.map(p => htmlPost(p, saya)).join('');
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  muat();
})();

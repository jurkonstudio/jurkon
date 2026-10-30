let saya = null;
const id = param('id');
async function muat() {
  const { data: p } = await db.from('posts').select(PILIH_POSTING).eq('id', id).single();
  if (!p) { $('#utama').innerHTML = '<div class="kosong">Posting tidak ditemukan.</div>'; return; }
  const { data: b } = await db.from('posts').select(PILIH_POSTING).eq('parent_id', id).order('created_at');
  const semua = await tandaiSuka([p, ...(b || [])], saya);
  $('#utama').innerHTML = htmlPost(semua[0], saya);
  $('#balasan').innerHTML = semua.slice(1).map(x => htmlPost(x, saya)).join('') || kosong('balas', 'Belum ada balasan', 'Jadilah yang pertama membalas.');
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangHitung($('#isi'), $('#hitung'), 250);
  pasangAksiPost(saya, muat);
  $('#kirim').onclick = async () => {
    const content = $('#isi').value.trim();
    if (!content) return;
    const { error } = await db.from('posts').insert({ user_id: saya.id, parent_id: id, content });
    if (error) $('#galat').textContent = 'Gagal: ' + error.message;
    else { $('#isi').value = ''; $('#isi').dispatchEvent(new Event('input')); muat(); }
  };
  muat();
})();

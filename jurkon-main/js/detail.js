let saya = null;
const id = param('id');
async function muat() {
  const [r1, r2] = await Promise.all([
    ambilPosting({ mode: 'satu', id, limit: 1 }, saya),
    ambilPosting({ mode: 'balasan', id, limit: 100 }, saya)
  ]);
  if (r1.error) {
    $('#utama').innerHTML = '<div class="kosong"><h3>Gagal memuat</h3><p>' + esc(pesanGalat(r1.error)) + '</p><button class="btn" id="coba">Coba lagi</button></div>';
    $('#coba').onclick = muat;
    return;
  }
  if (!r1.data.length) { $('#utama').innerHTML = '<div class="kosong">Posting tidak ditemukan.</div>'; $('#balasan').innerHTML = ''; return; }
  $('#utama').innerHTML = htmlPost(r1.data[0], saya);
  $('#balasan').innerHTML = r2.error
    ? '<div class="kosong"><p>Balasan gagal dimuat: ' + esc(pesanGalat(r2.error)) + '</p></div>'
    : r2.data.map(x => htmlPost(x, saya)).join('') || kosong('balas', 'Belum ada balasan', 'Jadilah yang pertama membalas.');
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangHitung($('#isi'), $('#hitung'), 250);
  pasangFilter($('#isi'));
  pasangMention($('#isi'), saya);
  pasangAksiPost(saya, muat);
  $('#kirim').onclick = async () => {
    const content = $('#isi').value.trim();
    if (!content) return;
    $('#galat').textContent = '';
    if (!bolehKirim(content, m => $('#galat').textContent = m)) return;
    $('#kirim').disabled = true;
    const { error } = await db.from('posts').insert({ user_id: saya.id, parent_id: id, content });
    $('#kirim').disabled = false;
    if (error) $('#galat').textContent = 'Gagal membalas: ' + pesanGalat(error);
    else { $('#galat').textContent = ''; $('#isi').value = ''; $('#isi').dispatchEvent(new Event('input')); muat(); }
  };
  muat();
})();

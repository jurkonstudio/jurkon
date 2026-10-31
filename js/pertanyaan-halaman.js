// Halaman pertanyaan.html: pertanyaan hari ini (atau ?tgl=YYYY-MM-DD, maksimal 30 hari ke belakang) dan jawaban semua orang.
// Memakai js/pertanyaan.js (daftar pertanyaan dan pembantu tanggal).
(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const hari = pqTanggal();
  let tgl = param('tgl');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl || '') || tgl > hari || tgl < pqGeser(hari, -30)) tgl = hari;
  const teks = pqTeks(tgl);
  let daf = null;

  async function kepala() {
    const s = await pqStatus(tgl, saya);
    if (!s) {
      $('#pq-kepala').innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3></div>';
      return false;
    }
    const label = tgl === hari ? t('pq.judul') : tglPanjang(tgl + 'T12:00:00+07:00');
    const sebelum = tgl > pqGeser(hari, -30) ? pqGeser(tgl, -1) : null;
    const sesudah = tgl < hari ? pqGeser(tgl, 1) : null;
    const tautan = d => 'pertanyaan.html' + (d === hari ? '' : '?tgl=' + d);
    $('#pq-kepala').innerHTML = '<div class="pq-label">' + esc(label) + '</div>' +
      '<p class="pq-teks pq-besar">' + esc(teks) + '</p><div class="pq-baris">' +
      (tgl !== hari ? '<span></span>' : s.sudah ? '<span class="pq-hitung">' + esc(t('pq.sudah')) + '</span>'
        : '<button type="button" class="btn pq-jawab">' + esc(t('pq.jawab')) + '</button>') +
      '<span class="pq-hitung">' + esc(t('pq.hitung', { n: s.jumlah })) + '</span></div>' +
      '<nav class="pq-geser">' +
      (sebelum ? '<a href="' + tautan(sebelum) + '">\u2190 ' + esc(t('pq.sebelumnya')) + '</a>' : '<span></span>') +
      (sesudah ? '<a href="' + tautan(sesudah) + '">' + esc(t('pq.berikutnya')) + ' \u2192</a>' : '<span></span>') + '</nav>';
    return true;
  }

  async function ambil(sebelum) {
    let q = db.from('posts').select(PILIH_POSTING).eq('pertanyaan_tgl', tgl).order('created_at', { ascending: false }).limit(HALAMAN);
    if (sebelum) q = q.lt('created_at', sebelum);
    const { data, error } = await q;
    if (error) return { data: null, error, limit: HALAMAN };
    await tandaiSuka(data || [], saya);
    return { data: data || [], error: null, limit: HALAMAN };
  }

  const muat = () => daf && daf.muat();
  if (!(await kepala())) return;
  daf = daftarBerhalaman($('#daftar'), ambil, () => kosong('pena', esc(t('pq.kosongJ')), esc(t('pq.kosongT'))), saya);
  pasangAksiPost(saya, muat);
  daf.muat();

  $('#pq-kepala').addEventListener('click', e => {
    if (e.target.closest('.pq-jawab') && window.Tulis) window.Tulis.buka({ pertanyaan: { tgl, teks } });
  });
  document.addEventListener('jurkon:terkirim', e => {
    if (!e.detail || e.detail.mode !== 'jawab') return;
    e.preventDefault(); kepala(); muat(); window.scrollTo({ top: 0 });
  });
})();

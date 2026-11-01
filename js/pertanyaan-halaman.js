// Halaman pertanyaan.html: pertanyaan hari ini (atau ?tgl=YYYY-MM-DD, maksimal 30 hari ke belakang) dan jawaban semua orang.
// Memakai js/pertanyaan.js (daftar pertanyaan dan pembantu tanggal).
(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const hari = pqTanggal();
  const awal = pqGeser(hari, -30);
  let tgl = param('tgl');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl || '') || tgl > hari || tgl < awal) tgl = hari;
  const teks = pqTeks(tgl);
  const kemarin = pqGeser(hari, -1);
  let daf = null;

  const ms = d => new Date(d + 'T12:00:00+07:00');
  const fmt = (d, o) => ms(d).toLocaleDateString(I18n.locale, Object.assign({ timeZone: 'Asia/Jakarta' }, o));
  const tautan = d => 'pertanyaan.html' + (d === hari ? '' : '?tgl=' + d);

  // Tujuh hari berurutan yang memuat tanggal terpilih (tidak lewat hari ini dan tidak lebih lama dari 30 hari)
  function jendela() {
    let akhir = tgl > pqGeser(hari, -3) ? hari : pqGeser(tgl, 3);
    if (akhir > hari) akhir = hari;
    let mulai = pqGeser(akhir, -6);
    if (mulai < awal) { mulai = awal; akhir = pqGeser(awal, 6); if (akhir > hari) akhir = hari; }
    const r = [];
    for (let d = mulai; d <= akhir; d = pqGeser(d, 1)) r.push(d);
    return r;
  }
  const chip = d => '<a class="pq-hari' + (d === tgl ? ' aktif' : '') + '" href="' + tautan(d) + '"' + (d === tgl ? ' aria-current="date"' : '') + '>' +
    '<span>' + esc(fmt(d, { weekday: 'short' })) + '</span><b>' + esc(fmt(d, { day: 'numeric' })) + '</b></a>';

  async function kepala() {
    const s = await pqStatus(tgl, saya);
    if (!s) {
      $('#pq-kepala').innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3></div>';
      return false;
    }
    // Server menerima jawaban untuk hari ini dan kemarin (WIB), jadi tombol Jawab juga tampil untuk kemarin
    const bisaJawab = tgl === hari || tgl === kemarin;
    const label = (tgl === hari ? t('pq.judul') + ' \u00b7 ' : '') + tglPanjang(tgl + 'T12:00:00+07:00');
    const sebelum = tgl > awal ? pqGeser(tgl, -1) : null;
    const sesudah = tgl < hari ? pqGeser(tgl, 1) : null;
    $('#pq-kepala').innerHTML = '<div class="pq-label">' + esc(label) + '</div>' +
      '<p class="pq-teks pq-besar">' + esc(pqTampil(teks)) + '</p><div class="pq-baris">' +
      (s.sudah ? '<span class="pq-hitung pq-ok">\u2713 ' + esc(t('pq.sudah')) + '</span>'
        : bisaJawab ? '<button type="button" class="btn pq-jawab">' + esc(t('pq.jawab')) + '</button>' : '<span></span>') +
      '<span class="pq-hitung">' + esc(t('pq.hitung', { n: s.jumlah })) + '</span></div>' +
      '<div class="pq-hari-baris">' + jendela().map(chip).join('') + '</div>' +
      '<nav class="pq-geser">' +
      (sebelum ? '<a href="' + tautan(sebelum) + '">\u2190 ' + esc(t('pq.sebelumnya')) + '</a>' : '<span></span>') +
      (sesudah ? '<a href="' + tautan(sesudah) + '">' + esc(t('pq.berikutnya')) + ' \u2192</a>' : '<span></span>') + '</nav>';
    return true;
  }

  // Jawaban sebuah hari. Cara utama: satu kueri dengan profil tertanam. Bila server menolaknya, cadangan: ambil
  // catatan lalu profilnya terpisah. Kode galat asli dicatat di konsol dan ditampilkan kecil di halaman.
  function catatGalat(e) {
    try { console.error('pertanyaan: gagal memuat jawaban', e); } catch (x) {}
    const el = $('#pq-diag');
    if (el && e) el.textContent = [e.code, e.status].filter(Boolean).join(' \u00b7 ');
  }
  async function ambil(sebelum) {
    const dasar = kolom => {
      let q = db.from('posts').select(kolom).eq('pertanyaan_tgl', tgl).order('created_at', { ascending: false }).limit(HALAMAN);
      return sebelum ? q.lt('created_at', sebelum) : q;
    };
    let { data, error } = await dasar(PILIH_POSTING);
    if (error && adaJaringan(error)) {
      catatGalat(error);
      const r = await dasar('*');
      if (r.error) { catatGalat(r.error); return { data: null, error: r.error, limit: HALAMAN }; }
      const ids = [...new Set((r.data || []).map(p => p.user_id))];
      const { data: pr } = ids.length ? await db.from('profiles').select('id,username,nama,foto_url').in('id', ids) : { data: [] };
      const peta = {}; (pr || []).forEach(x => { peta[x.id] = x; });
      data = (r.data || []).map(p => Object.assign(p, { profiles: peta[p.user_id] || null }));
      error = null;
    }
    if (error) return { data: null, error, limit: HALAMAN };
    await tandaiSuka(data || [], saya);
    return { data: data || [], error: null, limit: HALAMAN };
  }

  const muat = () => daf && daf.muat();
  $('#pq-kepala').innerHTML = '<div class="garis-skel" style="width:40%"></div><div class="garis-skel" style="height:22px"></div><div class="garis-skel" style="width:70%;height:22px"></div>';
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

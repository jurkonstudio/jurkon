// Halaman jurnal.html: jurnal pribadi (sql/034_jurnal.sql, draf dan batas 4000 di sql/039_jurnal_draf_4000.sql).
//  * jurnal.html          -> jurnal sendiri: tulis, simpan draf, ubah, hapus, atur pribadi/publik, unduh
//  * jurnal.html?u=nama   -> jurnal orang lain: hanya catatan yang dijadikan publik, hanya baca
// Batas isi dan jumlah ditegakkan di database; angka di bawah hanya untuk tampilan dan pesan lebih awal.
(async () => {
  const saya = await wajibLogin();
  if (!saya) return;

  const MAKS_ISI = 4000, MAKS_CATATAN = 50;
  const KOLOM = 'id,isi,publik,draf,dibuat_at,diubah_at';
  let pemilik = { id: saya.id, username: null, nama: null };
  let milikSaya = true;
  let daftar = [];
  let sedangUbah = null;      // catatan yang sedang diubah, null = catatan baru
  let versiMuat = 0;
  let menyimpan = false;
  let saring = 'semua';       // semua | draf | pribadi | publik (hanya jurnal sendiri)

  // ---------- Pemilik jurnal ----------
  const u = param('u');
  if (u) {
    const { data: p, error } = await ambilProfilInfo(u, saya);
    if (error) { tampilGalat(error); return; }
    if (!p) { $('#daftar').innerHTML = '<div class="kosong"><p>' + esc(t('pf.noProfil')) + '</p></div>'; $('#kembali').href = 'profil.html'; return; }
    pemilik = { id: p.id, username: p.username, nama: p.nama || p.username };
    milikSaya = p.id === saya.id;
  }
  if (milikSaya && !pemilik.username) {
    const { data } = await db.from('profiles').select('username,nama').eq('id', saya.id).maybeSingle();
    pemilik.username = (data && data.username) || 'saya';
    pemilik.nama = (data && (data.nama || data.username)) || pemilik.username;
  }
  $('#kembali').href = milikSaya ? 'profil.html' : 'profil.html?u=' + encodeURIComponent(pemilik.username);
  if (!milikSaya) $('#judul').textContent = t('jr.judulOrang', { nama: pemilik.nama });

  // ---------- Muat dan tampilkan ----------
  const statusCatatan = c => c.draf ? 'draf' : (c.publik ? 'publik' : 'pribadi');
  let segmen = null;
  try { if (window.Intl && Intl.Segmenter) segmen = new Intl.Segmenter(I18n.locale, { granularity: 'word' }); } catch (e) { segmen = null; }
  function hitungKata(s) {
    s = String(s || '').trim();
    if (!s) return 0;
    if (segmen) { let n = 0; for (const x of segmen.segment(s)) if (x.isWordLike) n++; return n; }
    return s.split(/\s+/).length;
  }

  function tampilGalat(e) {
    $('#daftar').innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(pesanGalat(e)) + '</p>' +
      '<button type="button" class="btn" id="jrCoba">' + esc(t('umum.cobaLagi')) + '</button></div>';
    $('#jrCoba').onclick = muat;
  }

  async function muat() {
    const ini = ++versiMuat;
    let q = db.from('jurnal').select(KOLOM).eq('user_id', pemilik.id).order('dibuat_at', { ascending: false }).limit(MAKS_CATATAN);
    if (!milikSaya) q = q.eq('publik', true);
    const { data, error } = await q;
    if (ini !== versiMuat) return;
    if (error) { tampilGalat(error); return; }
    daftar = data || [];
    gambar();
  }

  function kepala() {
    const el = $('#jr-kepala');
    if (!milikSaya) { el.hidden = true; return; }
    el.hidden = false;
    const n = { semua: daftar.length, draf: 0, pribadi: 0, publik: 0 };
    daftar.forEach(c => { n[statusCatatan(c)]++; });
    const chip = (k, label) => '<button type="button" class="jx-chip" data-saring="' + k + '" aria-pressed="' + (saring === k) + '">' +
      esc(label) + ' <b>' + n[k] + '</b></button>';
    el.innerHTML = '<div class="jx-baris"><span class="jx-jumlah" id="jrJumlah">' + esc(t('jr.hitung', { n: daftar.length, maks: MAKS_CATATAN })) + '</span>' +
      '<div class="jx-aksi-kepala"><button type="button" class="btn garis kecil" id="jrUnduh">' + esc(t('jr.unduh')) + '</button>' +
      '<button type="button" class="btn kecil" id="jrBaru">' + esc(t('jr.tulis')) + '</button></div></div>' +
      '<div class="jx-chip-baris" role="group">' + chip('semua', t('jr.semua')) + chip('draf', t('jr.draf')) + chip('pribadi', t('jr.pribadi')) + chip('publik', t('jr.publik')) + '</div>';
    $('#jrBaru').onclick = () => bukaEditor(null);
    $('#jrUnduh').onclick = bukaUnduh;
  }
  $('#jr-kepala').addEventListener('click', e => {
    const b = e.target.closest('[data-saring]');
    if (!b) return;
    saring = b.dataset.saring;
    gambar();
  });

  function kartu(c) {
    const st = statusCatatan(c);
    const diubah = new Date(c.diubah_at) - new Date(c.dibuat_at) > 60000;
    const panjang = c.isi.length > 320 || (c.isi.match(/\n/g) || []).length >= 6;
    return '<article class="jx-item' + (c.draf ? ' draf' : '') + '" data-id="' + esc(c.id) + '">' +
      '<div class="jx-meta"><span>' + esc(tglPanjang(c.dibuat_at)) + '</span>' +
      (milikSaya ? '<span class="jx-lencana ' + st + '">' + esc(t('jr.' + st)) + '</span>' : '') + '</div>' +
      '<div class="jx-isi' + (panjang ? ' klem' : '') + '">' + esc(c.isi) + '</div>' +
      (panjang ? '<button type="button" class="jx-lagi" data-lagi hidden>' + esc(t('jr.selengkapnya')) + '</button>' : '') +
      '<div class="jx-kaki-kartu"><span>' + esc(t('jr.kata', { n: hitungKata(c.isi) })) + (diubah ? ' · ' + esc(t('jr.diubah', { tgl: tglPanjang(c.diubah_at) })) : '') + '</span>' +
      (milikSaya ? '<div class="jx-aksi"><button type="button" class="btn garis kecil" data-ubah="' + esc(c.id) + '">' + esc(t('jr.ubahTombol')) + '</button>' +
        '<button type="button" class="btn garis kecil jx-hapus" data-hapus="' + esc(c.id) + '">' + esc(t('jr.hapus')) + '</button></div>' : '') +
      '</div></article>';
  }

  function gambar() {
    kepala();
    const el = $('#daftar');
    if (!daftar.length) {
      el.innerHTML = milikSaya
        ? '<div class="kosong"><div class="kosong-ikon">' + (IKON.pena || '') + '</div><h3>' + esc(t('jr.kosongJ')) + '</h3><p>' + esc(t('jr.kosongT')) + '</p>' +
          '<button type="button" class="btn" id="jrMulai">' + esc(t('jr.tulis')) + '</button></div>'
        : '<div class="kosong"><p>' + esc(t('jr.kosongOrang')) + '</p></div>';
      const m = $('#jrMulai'); if (m) m.onclick = () => bukaEditor(null);
      return;
    }
    const tampil = milikSaya && saring !== 'semua' ? daftar.filter(c => statusCatatan(c) === saring) : daftar;
    if (!tampil.length) { el.innerHTML = '<div class="kosong"><p>' + esc(t('jr.kosongSaring')) + '</p></div>'; return; }
    el.innerHTML = tampil.map(kartu).join('');
    // Tombol "Selengkapnya" hanya muncul bila isinya benar-benar terpotong
    requestAnimationFrame(() => {
      el.querySelectorAll('.jx-isi.klem').forEach(x => {
        const b = x.parentNode.querySelector('[data-lagi]');
        if (b && x.scrollHeight > x.clientHeight + 2) b.hidden = false;
        else x.classList.remove('klem');
      });
    });
  }

  $('#daftar').addEventListener('click', async e => {
    const bl = e.target.closest('[data-lagi]');
    if (bl) {
      const isi = bl.parentNode.querySelector('.jx-isi'), buka = isi.classList.toggle('klem') === false;
      bl.textContent = t(buka ? 'jr.ringkas' : 'jr.selengkapnya');
      return;
    }
    const bu = e.target.closest('[data-ubah]'), bh = e.target.closest('[data-hapus]');
    if (bu) { bukaEditor(daftar.find(c => c.id === bu.dataset.ubah) || null); return; }
    if (!bh) return;
    if (!confirm(t('jr.konfirmHapus'))) return;
    bh.disabled = true;
    const { error } = await db.from('jurnal').delete().eq('id', bh.dataset.hapus);
    if (error) { bh.disabled = false; alert(pesanGalat(error)); return; }
    daftar = daftar.filter(c => c.id !== bh.dataset.hapus);
    gambar();
    toastUmum(t('jr.terhapus'));
  });

  // ---------- Editor ----------
  const dlgTulis = $('#lembarTulis'), ta = $('#jrIsi'), galat = $('#jrGalat'), btnSimpan = $('#jrSimpan'), btnDraf = $('#jrDraf'),
    barBuang = $('#jxBuang'), meter = $('#jxMeter'), segBtn = Array.from(dlgTulis.querySelectorAll('[data-vis]'));
  let vis = 'pribadi';                       // pilihan pembaca: pribadi | publik
  let awal = { isi: '', vis: 'pribadi' };    // isi saat editor dibuka, untuk mendeteksi perubahan belum tersimpan

  const kotor = () => ta.value !== awal.isi || vis !== awal.vis;
  const bolehDraf = () => !sedangUbah || sedangUbah.draf;     // catatan yang sudah terbit tidak diubah kembali menjadi draf

  function ukuran() { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  function perbarui() {
    const n = ta.value.length;
    $('#jrHitung').textContent = n + '/' + MAKS_ISI;
    $('#jrHitung').classList.toggle('habis', n >= MAKS_ISI);
    $('#jrKata').textContent = t('jr.kata', { n: hitungKata(ta.value) });
    meter.style.width = Math.min(100, n / MAKS_ISI * 100) + '%';
    meter.parentNode.classList.toggle('hampir', n >= MAKS_ISI * 0.9 && n < MAKS_ISI);
    meter.parentNode.classList.toggle('penuh', n >= MAKS_ISI);
    $('#jxStatus').textContent = kotor() ? t('jr.belumSimpan') : (sedangUbah && sedangUbah.draf ? t('jr.draf') : '');
  }
  function aturVis(v) {
    vis = v;
    segBtn.forEach(b => b.setAttribute('aria-checked', String(b.dataset.vis === v)));
    $('#jrInfo').textContent = t(v === 'publik' ? 'jr.infoPublik' : 'jr.infoPribadi');
    perbarui();
  }
  segBtn.forEach(b => { b.onclick = () => aturVis(b.dataset.vis); });
  ta.maxLength = MAKS_ISI;
  ta.addEventListener('input', () => { ukuran(); perbarui(); barBuang.hidden = true; });

  function bukaEditor(c) {
    if (!c && daftar.length >= MAKS_CATATAN) { alert(t('jr.penuh', { maks: MAKS_CATATAN })); return; }
    sedangUbah = c;
    $('#jTulis').textContent = c ? t(c.draf ? 'jr.draf' : 'jr.ubah') : t('jr.baru');
    $('#jxTgl').textContent = new Date(c ? c.dibuat_at : Date.now())
      .toLocaleDateString(I18n.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    ta.value = c ? c.isi : '';
    awal = { isi: ta.value, vis: c && c.publik && !c.draf ? 'publik' : 'pribadi' };
    aturVis(awal.vis);
    btnDraf.hidden = !bolehDraf();
    barBuang.hidden = true;
    galat.textContent = '';
    btnSimpan.disabled = btnDraf.disabled = false;
    dlgTulis.showModal();
    ukuran(); perbarui();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  async function simpan(jadiDraf) {
    if (menyimpan) return;
    const isi = ta.value.trim();
    if (!isi) { galat.textContent = t('jr.kosongIsi'); ta.focus(); return; }
    menyimpan = true; btnSimpan.disabled = btnDraf.disabled = true; galat.textContent = '';
    const baris = { isi, draf: !!jadiDraf, publik: jadiDraf ? false : vis === 'publik' };
    try {
      const res = sedangUbah
        ? await db.from('jurnal').update(baris).eq('id', sedangUbah.id).select(KOLOM).single()
        : await db.from('jurnal').insert(Object.assign({ user_id: saya.id }, baris)).select(KOLOM).single();
      if (res.error) { galat.textContent = pesanGalat(res.error); barBuang.hidden = true; return; }
      if (sedangUbah) daftar = daftar.map(c => c.id === res.data.id ? res.data : c);
      else daftar.unshift(res.data);
      awal = { isi: ta.value, vis };           // supaya penutupan tidak lagi bertanya
      barBuang.hidden = true;
      dlgTulis.close();
      gambar();
      toastUmum(t(jadiDraf ? 'jr.drafTersimpan' : 'jr.tersimpan'));
    } finally { menyimpan = false; btnSimpan.disabled = btnDraf.disabled = false; }
  }
  btnSimpan.onclick = () => simpan(false);
  btnDraf.onclick = () => simpan(true);
  dlgTulis.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); simpan(false); } });

  // Menutup editor: bila ada tulisan yang belum tersimpan, tanya dulu (simpan sebagai draf / buang / lanjut)
  function cobaTutup() {
    if (menyimpan) return;
    if (kotor() && ta.value.trim()) {
      $('#jxBuangTeks').textContent = t(bolehDraf() ? 'jr.tutupTanya' : 'jr.tutupTanyaUbah');
      $('#jxBuangDraf').hidden = !bolehDraf();
      barBuang.hidden = false;
      return;
    }
    dlgTulis.close();
  }
  $('#jxBuangYa').onclick = () => { barBuang.hidden = true; dlgTulis.close(); };
  $('#jxBuangDraf').onclick = () => simpan(true);
  $('#jxLanjut').onclick = () => { barBuang.hidden = true; ta.focus(); };
  dlgTulis.addEventListener('cancel', e => { e.preventDefault(); cobaTutup(); });
  dlgTulis.addEventListener('click', e => { if (e.target === dlgTulis || e.target.closest('[data-tutup]')) cobaTutup(); });

  // Lembar unduh: tutup lewat tombol silang atau ketukan di luar
  document.querySelectorAll('dialog.jr-lembar').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-tutup]')) d.close(); });
  });

  // ---------- Unduh (dibuat di peramban, tidak lewat server) ----------
  const dlgUnduh = $('#lembarUnduh');
  const FORMAT = [['txt', 'TXT'], ['md', 'Markdown'], ['html', 'HTML'], ['json', 'JSON'], ['pdf', 'PDF']];
  $('#jrFormat').innerHTML = FORMAT.map(f => '<button type="button" class="btn garis" data-fmt="' + f[0] + '">' + f[1] + '</button>').join('');

  function bukaUnduh() {
    if (!daftar.length) { toastUmum(t('jr.unduhKosong')); return; }
    $('#unduhInfo').textContent = t('jr.unduhInfo', { n: daftar.length });
    dlgUnduh.showModal();
  }

  function tglWaktu(iso) {
    return new Date(iso).toLocaleString(I18n.locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function urut() { return daftar.slice().sort((a, b) => new Date(a.dibuat_at) - new Date(b.dibuat_at)); }
  const label = c => tglWaktu(c.dibuat_at) + ' · ' + t(c.draf ? 'jr.draf' : (c.publik ? 'jr.publik' : 'jr.pribadi'));
  const judulBerkas = () => t('jr.judulOrang', { nama: '@' + pemilik.username });
  const sekarang = () => tglPanjang(new Date().toISOString());

  function buatTxt() {
    const garis = '='.repeat(40);
    return judulBerkas() + '\n' + t('jr.diunduhPada', { tgl: sekarang() }) + '\n' + garis + '\n\n' +
      urut().map(c => label(c) + '\n\n' + c.isi).join('\n\n' + '-'.repeat(40) + '\n\n') + '\n';
  }
  function buatMd() {
    return '# ' + judulBerkas() + '\n\n*' + t('jr.diunduhPada', { tgl: sekarang() }) + '*\n\n' +
      urut().map(c => '## ' + label(c) + '\n\n' + c.isi.replace(/\n/g, '  \n')).join('\n\n---\n\n') + '\n';
  }
  function badanHtml() {
    return '<h1>' + esc(judulBerkas()) + '</h1><p class="sub">' + esc(t('jr.diunduhPada', { tgl: sekarang() })) + '</p>' +
      urut().map(c => '<article><h2>' + esc(label(c)) + '</h2><div class="isi">' + esc(c.isi) + '</div></article>').join('');
  }
  const GAYA_DOK = 'body{font:16px/1.6 Georgia,"Times New Roman",serif;max-width:680px;margin:32px auto;padding:0 16px;color:#231f1c;background:#fff}' +
    'h1{font-size:26px;margin:0 0 4px}.sub{color:#6b6359;font-size:14px;margin:0 0 28px}' +
    'article{border-top:1px solid #ddd5c4;padding:16px 0;break-inside:avoid}h2{font-size:14px;color:#6b6359;font-weight:600;margin:0 0 8px;font-family:Arial,sans-serif}' +
    '.isi{white-space:pre-wrap;overflow-wrap:anywhere}';
  function buatHtml() {
    return '<!DOCTYPE html>\n<html lang="' + esc(String(I18n.locale).split('-')[0]) + '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(judulBerkas()) + '</title>' +
      '<style>' + GAYA_DOK + '</style></head><body>' + badanHtml() + '</body></html>\n';
  }
  function buatJson() {
    return JSON.stringify({
      jurnal: pemilik.username, diunduh_pada: new Date().toISOString(),
      catatan: urut().map(c => ({ id: c.id, dibuat: c.dibuat_at, diubah: c.diubah_at, publik: c.publik, draf: !!c.draf, isi: c.isi }))
    }, null, 2) + '\n';
  }

  function simpanBerkas(isi, ext, mime) {
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    const nama = 'jurnal-' + String(pemilik.username).replace(/[^a-z0-9_-]/gi, '') + '-' + d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '.' + ext;
    const url = URL.createObjectURL(new Blob([isi], { type: mime + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = nama; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // PDF: isi dicetak lewat dialog cetak peramban ("Simpan sebagai PDF"), tanpa pustaka tambahan
  function cetakPdf() {
    const area = $('#areaCetak');
    area.innerHTML = '<style>' + GAYA_DOK + '</style>' + badanHtml();
    document.body.classList.add('mode-cetak');
    const dokAsli = document.title;
    document.title = judulBerkas();
    const bersih = () => { document.body.classList.remove('mode-cetak'); area.innerHTML = ''; document.title = dokAsli; window.removeEventListener('afterprint', bersih); };
    window.addEventListener('afterprint', bersih);
    setTimeout(() => window.print(), 50);
  }

  $('#jrFormat').addEventListener('click', e => {
    const b = e.target.closest('[data-fmt]');
    if (!b || !daftar.length) return;
    const f = b.dataset.fmt;
    if (f === 'pdf') { dlgUnduh.close(); cetakPdf(); return; }
    if (f === 'txt') simpanBerkas(buatTxt(), 'txt', 'text/plain');
    else if (f === 'md') simpanBerkas(buatMd(), 'md', 'text/markdown');
    else if (f === 'html') simpanBerkas(buatHtml(), 'html', 'text/html');
    else if (f === 'json') simpanBerkas(buatJson(), 'json', 'application/json');
    dlgUnduh.close();
    toastUmum(t('jr.siap'));
  });

  muat();
})();

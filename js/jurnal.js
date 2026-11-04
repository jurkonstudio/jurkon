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
  let cari = '';              // kata pencarian
  let terbaruDulu = true;     // urutan daftar

  // ---------- Pemilik jurnal ----------
  const u = param('u');
  if (u) {
    const { data: p, error } = await ambilProfilInfo(u, saya);
    if (error) { tampilGalat(error); return; }
    if (!p) { $('#daftar').innerHTML = '<div class="kosong"><p>' + esc(t('pf.noProfil')) + '</p></div>'; $('#kembali').href = 'profil'; return; }
    pemilik = { id: p.id, username: p.username, nama: p.nama || p.username };
    milikSaya = p.id === saya.id;
  }
  if (milikSaya && !pemilik.username) {
    const { data } = await db.from('profiles').select('username,nama').eq('id', saya.id).maybeSingle();
    pemilik.username = (data && data.username) || 'saya';
    pemilik.nama = (data && (data.nama || data.username)) || pemilik.username;
  }
  $('#kembali').href = milikSaya ? 'profil' : 'profil?u=' + encodeURIComponent(pemilik.username);
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
      '<div class="jx-isi md' + (panjang ? ' klem' : '') + '">' + Markdown.html(c.isi) + '</div>' +
      (panjang ? '<button type="button" class="jx-lagi" data-lagi hidden>' + esc(t('jr.selengkapnya')) + '</button>' : '') +
      '<div class="jx-kaki-kartu"><span>' + esc(t('jr.kata', { n: hitungKata(c.isi) })) + (diubah ? ' · ' + esc(t('jr.diubah', { tgl: tglPanjang(c.diubah_at) })) : '') + '</span>' +
      '<div class="jx-aksi"><button type="button" class="btn garis kecil" data-salin="' + esc(c.id) + '">' + esc(t('jr.salin')) + '</button>' +
      (milikSaya ? '<button type="button" class="btn garis kecil" data-ubah="' + esc(c.id) + '">' + esc(t('jr.ubahTombol')) + '</button>' +
        '<button type="button" class="btn garis kecil jx-hapus" data-hapus="' + esc(c.id) + '">' + esc(t('jr.hapus')) + '</button>' : '') + '</div>' +
      '</div></article>';
  }

  function gambar() {
    kepala();
    $('#jr-cari').hidden = daftar.length < 2;
    $('#jrUrut').textContent = t(terbaruDulu ? 'jr.urutBaru' : 'jr.urutLama');
    isiDaftar();
  }

  function isiDaftar() {
    const el = $('#daftar');
    if (!daftar.length) {
      el.innerHTML = milikSaya
        ? '<div class="kosong"><div class="kosong-ikon">' + (IKON.pena || '') + '</div><h3>' + esc(t('jr.kosongJ')) + '</h3><p>' + esc(t('jr.kosongT')) + '</p>' +
          '<button type="button" class="btn" id="jrMulai">' + esc(t('jr.tulis')) + '</button></div>'
        : '<div class="kosong"><p>' + esc(t('jr.kosongOrang')) + '</p></div>';
      const m = $('#jrMulai'); if (m) m.onclick = () => bukaEditor(null);
      return;
    }
    let tampil = milikSaya && saring !== 'semua' ? daftar.filter(c => statusCatatan(c) === saring) : daftar;
    const kata = cari.trim().toLowerCase();
    if (kata) tampil = tampil.filter(c => c.isi.toLowerCase().includes(kata));
    if (!terbaruDulu) tampil = tampil.slice().sort((a, b) => new Date(a.dibuat_at) - new Date(b.dibuat_at));
    if (!tampil.length) { el.innerHTML = '<div class="kosong"><p>' + esc(t(kata ? 'jr.kosongCari' : 'jr.kosongSaring')) + '</p></div>'; return; }
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

  let tundaCari = 0;
  $('#jrCari').addEventListener('input', e => { clearTimeout(tundaCari); tundaCari = setTimeout(() => { cari = e.target.value; isiDaftar(); }, 150); });
  $('#jrUrut').onclick = () => { terbaruDulu = !terbaruDulu; gambar(); };

  $('#daftar').addEventListener('click', async e => {
    const sl = e.target.closest('[data-salin]');
    if (sl) {
      const c = daftar.find(x => x.id === sl.dataset.salin);
      if (!c) return;
      try { await navigator.clipboard.writeText(c.isi); toastUmum(t('jr.tersalin')); } catch (x) { toastUmum(t('err.umum')); }
      return;
    }
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
    if (jmlKarakter(ta.value) > MAKS_ISI) ta.value = potongKarakter(ta.value, MAKS_ISI);
    const n = jmlKarakter(ta.value);
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
  ta.maxLength = MAKS_ISI * 2;   // kasar; batas tepat (titik kode) di perbarui()
  ta.addEventListener('input', () => { ukuran(); perbarui(); barBuang.hidden = true; });


  // ---------- Alat format Markdown ----------
  // Semua perubahan lewat ganti() supaya Urungkan/Ulangi peramban tetap bekerja dan batas titik kode dijaga.
  const btnLihat = $('#jxLihat'), prev = $('#jxPrev'), formTaut = $('#jxTautan'), inUrl = $('#jxUrl'), galatUrl = $('#jxUrlGalat'),
    tombolAlat = Array.from(dlgTulis.querySelectorAll('[data-f]'));
  let lihat = false, selTaut = null;

  function ganti(mulai, akhir, baru, selM, selA) {
    const v = ta.value;
    if (jmlKarakter(v) - jmlKarakter(v.slice(mulai, akhir)) + jmlKarakter(baru) > MAKS_ISI) { toastUmum(t('jr.fmt.penuh', { maks: MAKS_ISI })); return false; }
    ta.focus();
    ta.setSelectionRange(mulai, akhir);
    let ok = false;
    try { ok = baru !== '' && document.execCommand('insertText', false, baru); } catch (e) { ok = false; }
    if (!ok) { ta.setRangeText(baru, mulai, akhir, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.setSelectionRange(selM, selA == null ? selM : selA);
    return true;
  }

  // Pembungkus inline (**tebal**, *miring*, ~~coret~~, `kode`): menekan lagi melepas pembungkusnya
  function bungkus(pre, post) {
    const v = ta.value, L = pre.length, R = post.length;
    let s = ta.selectionStart, e = ta.selectionEnd;
    while (s < e && /\s/.test(v.charAt(s))) s++;
    while (e > s && /\s/.test(v.charAt(e - 1))) e--;
    const sel = v.slice(s, e), c = pre.charAt(0), tunggal = L === 1;
    if (sel && s >= L && v.slice(s - L, s) === pre && v.slice(e, e + R) === post && !(tunggal && (v.charAt(s - 2) === c || v.charAt(e + 1) === c))) {
      ganti(s - L, e + R, sel, s - L, s - L + sel.length); return;
    }
    if (sel.length > L + R && sel.startsWith(pre) && sel.endsWith(post) && !(tunggal && sel.charAt(1) === c)) {
      const dalam = sel.slice(L, sel.length - R); ganti(s, e, dalam, s, s + dalam.length); return;
    }
    const isi = sel || t('jr.fmt.contoh');
    ganti(s, e, pre + isi + post, s + L, s + L + isi.length);
  }

  // Alat per baris (judul, kutipan, daftar): berlaku untuk semua baris yang disentuh pilihan
  const RE_AWAL = /^(?:#{1,3} |> |- \[[ xX]\] |[-*+] |\d+[.)] )/;
  const JENIS = { kutipan: /^> /, daftar: /^[-*+] (?!\[[ xX]\] )/, tugas: /^- \[[ xX]\] /, nomor: /^\d+[.)] / };
  function olahBaris(fn) {
    const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    const a = s === 0 ? 0 : v.lastIndexOf('\n', s - 1) + 1;
    const e2 = e > s && v.charAt(e - 1) === '\n' ? e - 1 : e;
    let b = v.indexOf('\n', e2); if (b < 0) b = v.length;
    const baris = v.slice(a, b).split('\n'), baru = fn(baris).join('\n');
    if (s === e) ganti(a, b, baru, a + baru.length); else ganti(a, b, baru, a, a + baru.length);
  }
  function awalBaris(jenis) {
    olahBaris(baris => {
      const isi = baris.filter(x => x.trim());
      const sasaran = isi.length ? x => x.trim() : () => true;
      if (jenis === 'judul') {
        const m = /^(#{1,3}) /.exec((baris.find(sasaran) || ''));
        const lv = m ? (m[1].length >= 3 ? 0 : m[1].length + 1) : 1;
        return baris.map(x => sasaran(x) ? (lv ? '#'.repeat(lv) + ' ' : '') + x.replace(RE_AWAL, '') : x);
      }
      const lepas = baris.filter(sasaran).every(x => JENIS[jenis].test(x));
      let no = 0;
      return baris.map(x => {
        if (!sasaran(x)) return x;
        const polos = x.replace(RE_AWAL, '');
        if (lepas) return polos;
        no++;
        return (jenis === 'kutipan' ? '> ' : jenis === 'daftar' ? '- ' : jenis === 'tugas' ? '- [ ] ' : no + '. ') + polos;
      });
    });
  }

  function sisipBlok(isi) {           // blok mandiri dengan baris kosong di sekelilingnya
    const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd, sebelum = v.slice(0, s), sesudah = v.slice(e);
    const pra = !sebelum ? '' : sebelum.endsWith('\n\n') ? '' : sebelum.endsWith('\n') ? '\n' : '\n\n';
    const pasca = sesudah.startsWith('\n\n') ? '' : sesudah.startsWith('\n') ? '\n' : '\n\n';
    const teks = pra + isi + pasca;
    ganti(s, e, teks, s + teks.length);
  }

  function bukaTautan() {
    selTaut = [ta.selectionStart, ta.selectionEnd];
    galatUrl.textContent = '';
    formTaut.hidden = false;
    inUrl.value = '';
    inUrl.focus();
  }
  function tutupTautan(fokus) { formTaut.hidden = true; if (fokus) { ta.focus(); if (selTaut) ta.setSelectionRange(selTaut[0], selTaut[1]); } }
  formTaut.addEventListener('submit', e => {
    e.preventDefault();
    let u = inUrl.value.trim();
    if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && u.slice(0, 2) !== '//') u = 'https://' + u;
    const aman = Markdown.urlAman(u);
    if (!aman) { galatUrl.textContent = t('jr.fmt.tautanSalah'); inUrl.focus(); return; }
    const v = ta.value, [s, en] = selTaut || [v.length, v.length], sel = v.slice(s, en).trim() || t('jr.fmt.contoh');
    const href = aman.replace(/\(/g, '%28').replace(/\)/g, '%29');
    const teks = '[' + sel + '](' + href + ')';
    formTaut.hidden = true;
    ganti(s, en, teks, s + 1, s + 1 + sel.length);
  });
  inUrl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tutupTautan(true); } });

  function aksiAlat(f) {
    if (lihat) return;
    switch (f) {
      case 'judul': case 'kutipan': case 'daftar': case 'nomor': case 'tugas': awalBaris(f); break;
      case 'tebal': bungkus('**', '**'); break;
      case 'miring': bungkus('*', '*'); break;
      case 'coret': bungkus('~~', '~~'); break;
      case 'kode': {
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        if (sel.indexOf('\n') >= 0) sisipBlok('```\n' + sel.replace(/\n+$/, '') + '\n```'); else bungkus('`', '`');
        break;
      }
      case 'tautan': bukaTautan(); break;
      case 'garis': sisipBlok('---'); break;
      case 'urung': ta.focus(); try { document.execCommand('undo'); } catch (e) { /* peramban tanpa undo */ } break;
      case 'ulang': ta.focus(); try { document.execCommand('redo'); } catch (e) { /* peramban tanpa redo */ } break;
    }
  }
  // mousedown dicegah supaya pilihan teks dan fokus textarea tidak hilang saat menekan alat
  dlgTulis.querySelector('.jx-alat-isi').addEventListener('mousedown', e => { if (e.target.closest('[data-f]')) e.preventDefault(); });
  dlgTulis.querySelector('.jx-alat-isi').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b && !b.disabled) aksiAlat(b.dataset.f); });

  function aturLihat(on) {
    lihat = on;
    if (on) { tutupTautan(false); prev.innerHTML = ta.value.trim() ? Markdown.html(ta.value) : '<p class="redup">' + esc(t('jr.fmt.pratinjauKosong')) + '</p>'; }
    ta.hidden = on; prev.hidden = !on;
    tombolAlat.forEach(b => { b.disabled = on; });
    btnLihat.setAttribute('aria-pressed', String(on));
    btnLihat.textContent = t(on ? 'jr.fmt.kembali' : 'jr.fmt.pratinjau');
    if (on) dlgTulis.querySelector('.jx-tubuh').scrollTop = 0;
    else { ukuran(); ta.focus(); }
  }
  btnLihat.onclick = () => aturLihat(!lihat);

  // Pintasan dan lanjutan daftar otomatis
  ta.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase(), peta = { b: 'tebal', i: 'miring', k: 'tautan' };
      if (peta[k]) { e.preventDefault(); aksiAlat(peta[k]); return; }
    }
    if (e.key !== 'Enter' || mod || e.shiftKey || e.altKey || ta.selectionStart !== ta.selectionEnd) return;
    const v = ta.value, p = ta.selectionStart;
    if (p < v.length && v.charAt(p) !== '\n') return;                 // hanya di akhir baris
    const a = p === 0 ? 0 : v.lastIndexOf('\n', p - 1) + 1, baris = v.slice(a, p);
    let m = /^(\s*)(?:([-*+]) |(\d+)([.)]) )(\[[ xX]\] )?(.*)$/.exec(baris), awal = null, kosong = false;
    if (m && !/^[-*+]{3,}$/.test(baris.trim())) {
      kosong = m[6] === '' ;
      awal = m[1] + (m[2] ? m[2] + ' ' : (parseInt(m[3], 10) + 1) + m[4] + ' ') + (m[5] ? '[ ] ' : '');
    } else if ((m = /^(\s*)> (.*)$/.exec(baris))) { kosong = m[2] === ''; awal = m[1] + '> '; }
    if (awal === null) return;
    e.preventDefault();
    if (kosong) ganti(a, p, '', a);                                    // Enter di butir kosong = keluar dari daftar
    else ganti(p, p, '\n' + awal, p + 1 + awal.length);
  });

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
    tutupTautan(false);
    if (lihat) aturLihat(false);
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
  dlgTulis.addEventListener('cancel', e => { e.preventDefault(); if (!formTaut.hidden) { tutupTautan(true); return; } cobaTutup(); });
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
      urut().map(c => '<article><h2>' + esc(label(c)) + '</h2><div class="isi md">' + Markdown.html(c.isi) + '</div></article>').join('');
  }
  const GAYA_DOK = 'body{font:16px/1.6 Georgia,"Times New Roman",serif;max-width:680px;margin:32px auto;padding:0 16px;color:#231f1c;background:#fff}' +
    'h1{font-size:26px;margin:0 0 4px}.sub{color:#6b6359;font-size:14px;margin:0 0 28px}' +
    'article{border-top:1px solid #ddd5c4;padding:16px 0;break-inside:avoid}h2{font-size:14px;color:#6b6359;font-weight:600;margin:0 0 8px;font-family:Arial,sans-serif}' +
    '.isi{overflow-wrap:anywhere}.isi>*:first-child{margin-top:0}.isi>*:last-child{margin-bottom:0}.isi p{margin:.6em 0}' +
    '.isi h3,.isi h4,.isi h5{margin:1em 0 .3em;line-height:1.3;color:#231f1c}.isi h3{font-size:1.25em}.isi h4{font-size:1.12em}.isi h5{font-size:1em}' +
    '.isi blockquote{margin:.7em 0;padding:.1em 0 .1em 14px;border-left:3px solid #ddd5c4;color:#6b6359}' +
    '.isi ul,.isi ol{margin:.5em 0;padding-left:1.5em}.isi li{margin:.15em 0}.isi li.tugas{list-style:none;margin-left:-1.4em}' +
    '.isi .cb{display:inline-block;width:.9em;height:.9em;margin-right:.5em;border:1.5px solid #6b6359;border-radius:.2em;vertical-align:-.1em}.isi .cb.ya{background:#231f1c;border-color:#231f1c}' +
    '.isi code{padding:1px 5px;border-radius:4px;background:#f1ece1;font:.9em ui-monospace,Menlo,Consolas,monospace}' +
    '.isi pre{margin:.7em 0;padding:10px 12px;border-radius:8px;background:#f1ece1;overflow-x:auto;white-space:pre-wrap}.isi pre code{padding:0;background:none}' +
    '.isi hr{border:0;border-top:1px solid #ddd5c4;margin:1em 0}.isi a{color:#1f5fbf;text-decoration:underline}';
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

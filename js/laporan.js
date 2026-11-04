// Panel laporan bersama untuk akun dan catatan. Dimuat sesuai kebutuhan (lihat muatLaporan() di ui.js, n.js, profil.js).
// Pemakaian:  Laporan.buka({ jenis: 'akun', id: profilId, username: 'nama' })
//             Laporan.buka({ jenis: 'catatan', id: postId, username: 'nama', cuplikan: 'isi catatan' })
// Pilihan kategori, label isian detail, dan petunjuk berubah menurut jenis dan kategori yang dipilih.
// Kategori baru memerlukan sql/049_laporan_beragam.sql; tanpa itu laporan tetap terkirim sebagai "lainnya".
(function () {
  const KATEGORI = {
    akun: ['spam', 'penipuan', 'pelecehan', 'palsu', 'kekerasan', 'tak_pantas', 'lainnya'],
    catatan: ['spam', 'penipuan', 'pelecehan', 'hoaks', 'dewasa', 'kekerasan', 'privasi', 'bahaya_diri', 'lainnya']
  };
  // Kategori lama memakai kunci pf.lk.* yang sudah ada; kategori baru memakai lp.k.*
  const KUNCI_LABEL = k => (['spam', 'pelecehan', 'palsu', 'tak_pantas', 'lainnya'].includes(k) ? 'pf.lk.' : 'lp.k.') + k;
  const DETAIL_KHUSUS = ['palsu', 'hoaks', 'privasi', 'penipuan', 'lainnya'];   // kategori dengan label detail sendiri (lp.d.*)
  const PETUNJUK_DARURAT = ['bahaya_diri', 'kekerasan'];                         // menampilkan petunjuk keselamatan (lp.h.darurat)
  const WAJIB_DETAIL = ['lainnya'];                                              // detail wajib (min. 5 karakter)

  const hE = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const tr = (k, v) => (typeof t === 'function' ? t(k, v) : k);
  const potong = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
  const galat = e => (typeof galatRamah === 'function' ? galatRamah(e) : (e && e.message) || '');

  function toast(teks) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = teks;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('hilang'), 2200);
    setTimeout(() => el.remove(), 2600);
  }

  async function kirimKeDb(sasaran, kategori, detail, label) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return { masuk: false };
    const dasar = { reporter_id: session.user.id, ...sasaran };
    const alasan = (detail || label).slice(0, 300);
    let { error } = await db.from('reports').insert({ ...dasar, kategori, alasan });
    // Migrasi 049 (kategori baru) atau 031 (kolom kategori) belum dijalankan: kirim tetap, kategori masuk ke alasan
    if (error && (error.code === '23514' || error.code === 'PGRST204' || /kategori/i.test(error.message || ''))) {
      ({ error } = await db.from('reports').insert({ ...dasar, alasan: ('[' + kategori + '] ' + alasan).slice(0, 300) }));
    }
    return { masuk: true, error };
  }

  function buka(o) {
    const jenis = o.jenis === 'akun' ? 'akun' : 'catatan';
    const daftar = KATEGORI[jenis];
    const lama = document.getElementById('lembarLapor');
    if (lama) lama.remove();

    const judul = jenis === 'akun' ? tr('pf.laporJudul') : tr('lp.judulCatatan');
    const tanya = jenis === 'akun' ? tr('pf.laporTanya', { u: o.username || '' }) : tr('lp.tanyaCatatan');
    const konteks = jenis === 'akun'
      ? '@' + (o.username || '')
      : ((o.username ? '@' + o.username + ': ' : '') + potong(o.cuplikan, 90));
    const catatan = jenis === 'akun' ? tr('pf.laporCatatan', { u: o.username || '' }) : tr('lp.catatanCatatan');

    const d = document.createElement('dialog');
    d.id = 'lembarLapor'; d.className = 'lembar lembar-lapor'; d.setAttribute('aria-labelledby', 'jLapor');
    d.innerHTML = `<div class="lembar-kepala"><h2 id="jLapor">${hE(judul)}</h2>
      <button type="button" class="ikon-btn" id="tutupLapor" aria-label="${hE(tr('umum.tutup'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="lapor-badan">
        ${konteks.trim() ? `<p class="lapor-konteks" data-jenis="${jenis}">${hE(konteks)}</p>` : ''}
        <p class="lapor-tanya">${hE(tanya)}</p>
        <div class="lapor-daftar" role="radiogroup" aria-labelledby="jLapor">${daftar.map(k =>
          `<label class="lapor-opsi"><input type="radio" name="kategoriLapor" value="${k}"><span>${hE(tr(KUNCI_LABEL(k)))}</span></label>`).join('')}</div>
        <p class="lapor-saran" id="saranLapor" role="note" hidden>${hE(tr('lp.h.darurat'))}</p>
        <label class="lapor-rinci"><span id="labelRinci">${hE(tr('pf.laporRinci'))}</span>
          <textarea id="rinciLapor" maxlength="300" rows="3"></textarea><small class="hitung" id="hitungLapor">0/300</small></label>
        <p class="lapor-catatan">${hE(catatan)}</p>
        <div class="tombol"><button type="button" class="btn garis" id="batalLapor">${hE(tr('pf.laporBatal'))}</button>
          <button type="button" class="btn utama" id="kirimLapor" disabled>${hE(tr('pf.laporKirim'))}</button></div>
      </div>`;
    document.body.appendChild(d);

    const kirim = d.querySelector('#kirimLapor'), rinci = d.querySelector('#rinciLapor');
    const tutup = () => { try { d.close(); } catch (e) {} d.remove(); };
    const pilihan = () => { const p = d.querySelector('input[name="kategoriLapor"]:checked'); return p ? p.value : ''; };
    const segarkan = () => {
      const k = pilihan();
      kirim.disabled = !k || (WAJIB_DETAIL.includes(k) && rinci.value.trim().length < 5);
    };

    d.querySelector('#tutupLapor').onclick = tutup;
    d.querySelector('#batalLapor').onclick = tutup;
    d.onclick = e => { if (e.target === d) tutup(); };
    d.addEventListener('cancel', () => setTimeout(() => d.remove(), 0));
    d.addEventListener('change', e => {
      if (e.target.name !== 'kategoriLapor') return;
      const k = e.target.value;
      d.querySelector('#labelRinci').textContent = DETAIL_KHUSUS.includes(k) ? tr('lp.d.' + k) : tr('pf.laporRinci');
      d.querySelector('#saranLapor').hidden = !PETUNJUK_DARURAT.includes(k);
      segarkan();
    });
    rinci.oninput = () => { d.querySelector('#hitungLapor').textContent = rinci.value.length + '/300'; segarkan(); };

    kirim.onclick = async () => {
      const k = pilihan(); if (!k) return;
      kirim.disabled = true;
      const sasaran = jenis === 'akun' ? { target_user_id: o.id } : { post_id: o.id };
      let hasil;
      try { hasil = await kirimKeDb(sasaran, k, rinci.value.trim(), tr(KUNCI_LABEL(k))); }
      catch (e) { hasil = { masuk: true, error: e }; }
      if (!hasil.masuk) { location.href = 'login?lanjut=' + encodeURIComponent(location.pathname.replace(/^\//, '') + location.search); return; }
      if (hasil.error) {
        segarkan();
        const sudah = hasil.error.code === '23505';
        alert(sudah ? tr(jenis === 'akun' ? 'pf.laporSudah' : 'pc.sudahLapor') : tr('pc.gagalLapor', { pesan: galat(hasil.error) }));
        if (sudah) tutup();
        return;
      }
      tutup();
      toast(tr('pc.terkirim'));
    };
    d.showModal();
  }

  window.Laporan = { buka, KATEGORI };
})();

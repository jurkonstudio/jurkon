// Sesi login: (1) mencatat dari mana akun masuk lewat Edge Function `catat-sesi`,
// (2) menampilkan daftar perangkat di Pengaturan > Keamanan, dan mengeluarkan perangkat lain.
// Lokasi dan provider ditentukan di SERVER dari IP permintaan; klien tidak mengirim lokasi apa pun.
(function () {
  const KUNCI = 'jurkon_sesi_dicatat';
  const JEDA = 60 * 60 * 1000;                        // catat ulang paling cepat tiap 1 jam (IP bisa berganti)
  const tr = (k, v) => (window.t ? window.t(k, v) : k);
  const lolos = s => (window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  function idSesi(token) {
    try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id || null; } catch (e) { return null; }
  }

  // Dicatat paling sering sekali per jam per sesi. Tidak pernah melempar galat: bila Edge Function belum
  // dipasang, aplikasi tetap jalan normal dan daftar perangkat hanya kosong.
  async function catat(paksa) {
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) return false;
      const id = idSesi(session.access_token);
      if (!id) return false;
      let simpan = null;
      try { simpan = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) {}
      if (!paksa && simpan && simpan.id === id && Date.now() - simpan.t < JEDA) return true;
      const { error } = await db.functions.invoke('catat-sesi', { body: {} });
      if (error) return false;
      try { localStorage.setItem(KUNCI, JSON.stringify({ id: id, t: Date.now() })); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  // ---------- tampilan ----------
  const IKON = {
    ponsel: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    tablet: '<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M11 18h2"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    lain: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'
  };

  function waktuRelatif(iso) {
    const d = new Date(iso), selisih = Date.now() - d.getTime();
    if (isNaN(d.getTime())) return '';
    if (selisih < 5 * 60 * 1000) return tr('ss.sekarang');
    const loc = (window.I18n && I18n.locale) || undefined;
    try {
      const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
      const mnt = Math.round(selisih / 60000);
      if (mnt < 60) return rtf.format(-mnt, 'minute');
      const jam = Math.round(mnt / 60);
      if (jam < 24) return rtf.format(-jam, 'hour');
      const hr = Math.round(jam / 24);
      if (hr < 31) return rtf.format(-hr, 'day');
    } catch (e) {}
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function waktuLengkap(iso) {
    const d = new Date(iso); if (isNaN(d.getTime())) return '';
    return d.toLocaleString((window.I18n && I18n.locale) || undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function lokasi(s) {
    const bagian = [];
    [s.kota, s.wilayah, s.negara].forEach(x => { if (x && bagian.indexOf(x) < 0) bagian.push(x); });
    if (!bagian.length && s.kode_negara) bagian.push(s.kode_negara);
    return bagian.join(', ') || tr('ss.tidakDiketahui');
  }

  // Nama netral bahasa: "Chrome · Android" (dirangkai di klien dari bagian yang disimpan server)
  function namaPerangkat(s) {
    return [s.peramban, s.os].filter(Boolean).join(' · ') || s.perangkat || tr('ss.tidakDiketahui');
  }

  function kartu(s) {
    const ikon = IKON[s.jenis] || IKON.lain;
    const ini = !!s.ini;
    const aktif = ini || (Date.now() - new Date(s.terakhir_at).getTime() < 5 * 60 * 1000);
    return `<li class="ss-item${ini ? ' ini' : ''}" data-id="${lolos(s.session_id)}">
      <div class="ss-kepala">
        <svg class="ss-ikon" viewBox="0 0 24 24" aria-hidden="true">${ikon}</svg>
        <div class="ss-judul"><b>${lolos(namaPerangkat(s))}</b>
          ${ini ? `<span class="ss-lencana">${lolos(tr('ss.ini'))}</span>` : ''}</div>
      </div>
      <dl class="ss-rinci">
        <dt>${lolos(tr('ss.lokasi'))}</dt><dd>${lolos(lokasi(s))}</dd>
        <dt>${lolos(tr('ss.provider'))}</dt><dd>${lolos(s.provider || tr('ss.tidakDiketahui'))}</dd>
        ${s.ip_samar ? `<dt>IP</dt><dd>${lolos(s.ip_samar)}</dd>` : ''}
        <dt>${lolos(tr('ss.terakhir'))}</dt><dd${aktif ? ' class="ss-hidup"' : ''}>${lolos(ini ? tr('ss.sekarang') : waktuRelatif(s.terakhir_at))}</dd>
        <dt>${lolos(tr('ss.masuk'))}</dt><dd>${lolos(waktuLengkap(s.masuk_at))}</dd>
      </dl>
      ${ini ? '' : `<button type="button" class="btn garis kecil ss-keluarkan" data-id="${lolos(s.session_id)}" data-nama="${lolos(namaPerangkat(s))}">${lolos(tr('ss.keluarkan'))}</button>`}
    </li>`;
  }

  let el = null, lagiMuat = false;

  async function muat() {
    if (!el || lagiMuat) return;
    lagiMuat = true;
    const dafar = el.querySelector('.ss-daftar'), aksi = el.querySelector('.ss-aksi');
    dafar.innerHTML = `<li class="hitung ss-status">${lolos(tr('umum.memuat'))}</li>`;
    try {
      await catat(false);                                         // pastikan perangkat ini sudah tercatat
      const { data, error } = await db.rpc('daftar_sesi');
      if (error) throw error;
      const baris = data || [];
      if (!baris.length) { dafar.innerHTML = `<li class="hitung ss-status">${lolos(tr('ss.kosong'))}</li>`; aksi.hidden = true; return; }
      dafar.innerHTML = baris.map(kartu).join('');
      const lain = baris.filter(b => !b.ini).length;
      aksi.hidden = lain === 0;
      aksi.dataset.n = String(lain);
    } catch (e) {
      dafar.innerHTML = `<li class="ss-status"><span class="hitung">${lolos(tr('ss.gagalMuat'))}</span> <button type="button" class="tautan-btn ss-ulang">${lolos(tr('umum.cobaLagi'))}</button></li>`;
      aksi.hidden = true;
    } finally { lagiMuat = false; }
  }

  function beri(teks) { if (typeof toastUmum === 'function') toastUmum(teks); else alert(teks); }
  const pesan = e => (typeof galatRamah === 'function' ? galatRamah(e) : (e && e.message) || '');

  function pasang(wadah) {
    el = wadah;
    el.innerHTML = `<h3>${lolos(tr('ss.judul'))}</h3>
      <p class="hitung">${lolos(tr('ss.info'))}</p>
      <ul class="ss-daftar" aria-live="polite"></ul>
      <div class="ss-aksi" hidden><button type="button" class="btn bahaya garis penuh" id="keluarkanLain">${lolos(tr('ss.keluarkanLain'))}</button></div>
      <p class="hitung ss-catatan">${lolos(tr('ss.catatan'))}</p>`;
    el.addEventListener('click', async e => {
      const ulang = e.target.closest('.ss-ulang');
      if (ulang) { muat(); return; }
      const satu = e.target.closest('.ss-keluarkan');
      if (satu) {
        if (!confirm(tr('ss.konfirmasiSatu', { nama: satu.dataset.nama || tr('ss.tidakDiketahui') }))) return;
        satu.disabled = true;
        const { error } = await db.rpc('keluarkan_sesi', { p_session: satu.dataset.id });
        if (error) { satu.disabled = false; alert(tr('ss.gagal', { pesan: pesan(error) })); return; }
        beri(tr('ss.berhasil')); muat(); return;
      }
      const semua = e.target.closest('#keluarkanLain');
      if (semua) {
        const n = el.querySelector('.ss-aksi').dataset.n || '0';
        if (!confirm(tr('ss.konfirmasiLain', { n: n }))) return;
        semua.disabled = true;
        const { error } = await db.rpc('keluarkan_sesi_lain');
        semua.disabled = false;
        if (error) { alert(tr('ss.gagal', { pesan: pesan(error) })); return; }
        beri(tr('ss.berhasilLain')); muat();
      }
    });
  }

  window.Sesi = { catat: catat, pasang: pasang, muat: muat };
})();

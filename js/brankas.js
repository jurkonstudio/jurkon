// Brankas: berkas pribadi yang dienkripsi di perangkat (AES-GCM 256) sebelum diunggah ke bucket privat "brankas".
// Kunci berkas dibuat acak, lalu dibungkus kunci turunan sandi (PBKDF2-SHA256). Sandi dan kunci tidak pernah dikirim ke server,
// jadi sandi yang hilang TIDAK bisa dipulihkan. Kunci hanya ada di memori selama brankas terbuka (dikunci saat ditutup atau 5 menit diam).
// Tabel dan bucket: sql/040_brankas.sql.
(function () {
  'use strict';
  const BUCKET = 'brankas', MAKS = 10 * 1024 * 1024, MAKS_BERKAS = 25, ITER = 310000, OTOKUNCI = 5 * 60 * 1000;
  const DILARANG = /\.(zip|zipx|rar|7z|tar|gz|tgz|bz2|xz|zst|lz|lzma|cab|iso|dmg|jar|apk|aab|ipa|exe|msi|bat|cmd|com|scr|dll|sh|ps1|vbs|app|deb|rpm)$/i;
  const enc = new TextEncoder();
  let dek = null, userId = null, kunciRow = null, berkas = [], timer = null, sibuk = false;

  const $ = s => document.querySelector(s);
  const b64e = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const acak = n => crypto.getRandomValues(new Uint8Array(n));

  async function turunkan(sandi, salt, iter) {
    const km = await crypto.subtle.importKey('raw', enc.encode(sandi), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const jadiKunci = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function bungkus(sandi, raw) {
    const salt = acak(16), iv = acak(12), kek = await turunkan(sandi, salt, ITER);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw);
    return { salt: b64e(salt), iv: b64e(iv), kunci: b64e(ct), iterasi: ITER };
  }
  async function bukaRaw(sandi, row) {
    const kek = await turunkan(sandi, b64d(row.salt), row.iterasi);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(row.iv) }, kek, b64d(row.kunci));   // gagal bila sandi salah
  }
  async function enkripsi(file) {
    const iv = acak(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, await file.arrayBuffer());
    return new Blob([iv, ct], { type: 'application/octet-stream' });
  }
  async function dekripsi(blob, mime) {
    const buf = await blob.arrayBuffer();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, dek, buf.slice(12));
    return new Blob([pt], { type: mime || 'application/octet-stream' });
  }

  const tabelHilang = e => !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache|bucket not found/i.test(e.message || ''));
  const ukuranTeks = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const tglTeks = s => new Date(s).toLocaleDateString((window.I18n && I18n.locale) || undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const isi = () => $('#bkIsi');
  const galat = (teks) => { const g = $('#bkGalat'); if (!g) return teks ? toastUmum(teks) : undefined; g.textContent = teks; g.hidden = !teks; };

  // ------------------------------------------------------------------ ikon
  const sv = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IK = {
    kunci: sv('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    perisai: sv('<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    unggah: sv('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
    unduh: sv('<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>'),
    sampah: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>'),
    berkas: sv('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    gambar: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-9 9"/>'),
    video: sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>'),
    musik: sv('<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'),
    kunciGanti: sv('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'),
    awas: sv('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/>')
  };
  function ikonBerkas(b) {
    const m = (b.mime || '').toLowerCase(), n = (b.nama || '').toLowerCase();
    if (m.startsWith('image/')) return IK.gambar;
    if (m.startsWith('video/')) return IK.video;
    if (m.startsWith('audio/')) return IK.musik;
    if (/\.(png|jpe?g|gif|webp|heic|avif|svg)$/.test(n)) return IK.gambar;
    return IK.berkas;
  }
  const ekstensi = n => { const m = /\.([a-z0-9]{1,5})$/i.exec(n || ''); return m ? m[1].toUpperCase() : ''; };

  function atur() { clearTimeout(timer); if (dek) timer = setTimeout(() => { kunci(); toastUmum(t('bk.terkunciOto')); }, OTOKUNCI); }
  function kunci() {
    dek = null; berkas = []; clearTimeout(timer);
    if ($('#lembarBrankas') && $('#lembarBrankas').open && kunciRow) tampilKunci();
  }

  // ------------------------------------------------------------------ tampilan
  function tampilMuat() { isi().innerHTML = '<div class="bk-muat" aria-busy="true"><div class="garis-skel" style="width:70%"></div><div class="garis-skel" style="width:45%"></div></div>'; }
  function tampilBelumSiap() { isi().innerHTML = `<p class="bk-galat">${esc(t('bk.belumSiap'))}</p>`; }
  function tampilBuat() {
    isi().innerHTML = `<form id="bkForm" class="bk-form" autocomplete="off">
      <div class="bk-hero"><span class="bk-hero-ik">${IK.perisai}</span><h3>${esc(t('bk.buatJudul'))}</h3><p class="bk-intro">${esc(t('bk.intro'))}</p></div>
      <div class="bk-kartu">
        <label class="bk-label">${esc(t('bk.sandi'))}<input type="password" id="bkS1" autocomplete="new-password" autocapitalize="off" minlength="8" required></label>
        <label class="bk-label">${esc(t('bk.sandiUlang'))}<input type="password" id="bkS2" autocomplete="new-password" autocapitalize="off" required></label>
      </div>
      <div class="bk-peringatan" role="note">${IK.awas}<p>${esc(t('bk.peringatan'))}</p></div>
      <p class="bk-galat" id="bkGalat" role="alert" hidden></p>
      <button class="btn penuh" type="submit">${esc(t('bk.buat'))}</button></form>`;
    $('#bkForm').onsubmit = async e => {
      e.preventDefault();
      const a = $('#bkS1').value, b = $('#bkS2').value;
      if (a.length < 8) return galat(t('bk.sandiPendek'));
      if (a !== b) return galat(t('bk.sandiBeda'));
      if (sibuk) return; sibuk = true; galat('');
      const tombol = $('#bkForm button'); tombol.disabled = true;
      try {
        const raw = acak(32), paket = await bungkus(a, raw);
        const { data, error } = await db.from('brankas_kunci').insert({ user_id: userId, ...paket }).select().single();
        if (error) throw error;
        kunciRow = data; dek = await jadiKunci(raw); berkas = [];
        tampilBuka(); atur();
      } catch (er) { galat(tabelHilang(er) ? t('bk.belumSiap') : t('bk.gagal')); tombol.disabled = false; }
      finally { sibuk = false; }
    };
  }
  function tampilKunci() {
    isi().innerHTML = `<form id="bkForm" class="bk-form" autocomplete="off">
      <div class="bk-hero"><span class="bk-hero-ik">${IK.kunci}</span><p class="bk-intro">${esc(t('bk.intro'))}</p></div>
      <div class="bk-kartu">
        <label class="bk-label">${esc(t('bk.sandi'))}<input type="password" id="bkS1" autocomplete="current-password" autocapitalize="off" required></label>
      </div>
      <p class="bk-galat" id="bkGalat" role="alert" hidden></p>
      <button class="btn penuh" type="submit">${esc(t('bk.buka'))}</button>
      <button class="bk-tautan bahaya tengah" type="button" data-aksi="reset">${esc(t('bk.reset'))}</button></form>`;
    $('#bkForm').onsubmit = async e => {
      e.preventDefault();
      if (sibuk) return; sibuk = true; galat('');
      const tombol = $('#bkForm .btn'); tombol.disabled = true;
      try {
        let raw;
        try { raw = await bukaRaw($('#bkS1').value, kunciRow); } catch (er) { galat(t('bk.sandiSalah')); tombol.disabled = false; return; }
        dek = await jadiKunci(raw);
        const { data, error } = await db.from('brankas_berkas').select('*').order('dibuat_at', { ascending: false });
        if (error) throw error;
        berkas = data || []; tampilBuka(); atur();
      } catch (er) { dek = null; galat(tabelHilang(er) ? t('bk.belumSiap') : t('bk.gagal')); tombol.disabled = false; }
      finally { sibuk = false; }
    };
    setTimeout(() => { const i = $('#bkS1'); if (i) i.focus(); }, 60);
  }
  function daftarHtml() {
    if (!berkas.length) return `<div class="bk-kosong">${IK.berkas}<p>${esc(t('bk.kosong'))}</p></div>`;
    return '<ul class="bk-daftar">' + berkas.map(b => {
      const ek = ekstensi(b.nama);
      return `<li data-id="${esc(b.id)}"><span class="bk-tile">${ikonBerkas(b)}</span>
        <div class="bk-nama"><b>${esc(b.nama)}</b><span>${ek ? `<em>${esc(ek)}</em>` : ''}${esc(ukuranTeks(b.ukuran))} · ${esc(tglTeks(b.dibuat_at))}</span></div>
        <button type="button" class="bk-ikon" data-aksi="unduh" aria-label="${esc(t('bk.unduh'))}" title="${esc(t('bk.unduh'))}">${IK.unduh}</button>
        <button type="button" class="bk-ikon bahaya" data-aksi="hapus" aria-label="${esc(t('bk.hapus'))}" title="${esc(t('bk.hapus'))}">${IK.sampah}</button></li>`;
    }).join('') + '</ul>';
  }
  function tampilBuka() {
    const total = berkas.reduce((a, b) => a + (+b.ukuran || 0), 0);
    isi().innerHTML = `<div class="bk-ringkas">
        <span class="bk-tile besar">${IK.perisai}</span>
        <div class="bk-ringkas-teks"><b id="bkJumlah">${esc(t('bk.jumlah', { n: berkas.length, ukuran: ukuranTeks(total) }))}</b>
          <div class="bk-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${MAKS_BERKAS}" aria-valuenow="${berkas.length}"><i id="bkMeter" style="width:${Math.min(100, berkas.length / MAKS_BERKAS * 100)}%"></i></div></div>
        <button type="button" class="btn garis bk-kecil" data-aksi="kunci">${IK.kunci}<span>${esc(t('bk.kunci'))}</span></button></div>
      <label class="bk-unggah" id="bkZona">${IK.unggah}<b>${esc(t('bk.unggah'))}</b><small>${esc(t('bk.batas'))}</small><input type="file" id="bkBerkas" multiple hidden></label>
      <p class="bk-status hitung" id="bkStatus" role="status" hidden></p>
      <div id="bkDaftar">${daftarHtml()}</div>
      <section class="bk-aman"><h3>${esc(t('bk.keamanan'))}</h3>
        <div class="bk-baris">
          <button type="button" class="bk-aksi" data-aksi="ganti"><span class="bk-tile">${IK.kunciGanti}</span><span class="bk-aksi-teks">${esc(t('bk.ganti'))}</span></button>
          <form id="bkGanti" class="bk-form bk-ganti" hidden autocomplete="off">
            <label class="bk-label">${esc(t('bk.sandiLama'))}<input type="password" id="bkLama" autocomplete="current-password" autocapitalize="off"></label>
            <label class="bk-label">${esc(t('bk.sandiBaru'))}<input type="password" id="bkBaru" autocomplete="new-password" autocapitalize="off" minlength="8"></label>
            <label class="bk-label">${esc(t('bk.sandiUlang'))}<input type="password" id="bkBaru2" autocomplete="new-password" autocapitalize="off"></label>
            <p class="bk-galat" id="bkGalat" role="alert" hidden></p><button class="btn" type="submit">${esc(t('bk.simpan'))}</button></form>
          <button type="button" class="bk-aksi bahaya" data-aksi="reset"><span class="bk-tile">${IK.sampah}</span><span class="bk-aksi-teks">${esc(t('bk.reset'))}</span></button>
        </div></section>`;
    const zona = $('#bkZona');
    ['dragenter', 'dragover'].forEach(n => zona.addEventListener(n, e => { e.preventDefault(); zona.classList.add('seret'); }));
    ['dragleave', 'drop'].forEach(n => zona.addEventListener(n, e => { e.preventDefault(); zona.classList.remove('seret'); }));
    zona.addEventListener('drop', e => { const f = Array.from((e.dataTransfer && e.dataTransfer.files) || []); if (f.length) unggah(f); });
    $('#bkBerkas').onchange = e => { const f = Array.from(e.target.files || []); e.target.value = ''; unggah(f); };
    $('#bkGanti').onsubmit = gantiSandi;
  }
  function segarkan() {
    const total = berkas.reduce((a, b) => a + (+b.ukuran || 0), 0);
    if ($('#bkDaftar')) $('#bkDaftar').innerHTML = daftarHtml();
    if ($('#bkJumlah')) $('#bkJumlah').textContent = t('bk.jumlah', { n: berkas.length, ukuran: ukuranTeks(total) });
    const mt = $('#bkMeter'); if (mt) { mt.style.width = Math.min(100, berkas.length / MAKS_BERKAS * 100) + '%'; if (mt.parentNode) mt.parentNode.setAttribute('aria-valuenow', berkas.length); }
  }
  function status(teks) { const s = $('#bkStatus'); if (!s) return; s.textContent = teks || ''; s.hidden = !teks; }

  // ------------------------------------------------------------------ aksi
  async function unggah(daftar) {
    if (!dek || sibuk) return; sibuk = true;
    try {
      for (const f of daftar) {
        if (berkas.length >= MAKS_BERKAS) { toastUmum(t('bk.penuh', { n: MAKS_BERKAS })); break; }
        if (f.size > MAKS) { toastUmum(t('bk.terlalu')); continue; }
        if (!f.size) { toastUmum(t('bk.gagal')); continue; }
        if (DILARANG.test(f.name)) { toastUmum(t('bk.dilarang')); continue; }
        status(t('bk.mengunggah') + ' ' + f.name);
        const path = userId + '/' + crypto.randomUUID();
        const { error: eu } = await db.storage.from(BUCKET).upload(path, await enkripsi(f), { contentType: 'application/octet-stream', cacheControl: '0', upsert: false });
        if (eu) { toastUmum(tabelHilang(eu) ? t('bk.belumSiap') : t('bk.gagal')); continue; }
        const nama = f.name.length > 150 ? f.name.slice(-150) : f.name;
        const { data, error } = await db.from('brankas_berkas').insert({ user_id: userId, nama, mime: (f.type || 'application/octet-stream').slice(0, 100), ukuran: f.size, path }).select().single();
        if (error) { db.storage.from(BUCKET).remove([path]).catch(() => {}); toastUmum(tabelHilang(error) ? t('bk.belumSiap') : /penuh/.test(error.message || '') ? t('bk.penuh', { n: MAKS_BERKAS }) : t('bk.gagal')); continue; }
        berkas.unshift(data); segarkan(); atur();
      }
    } catch (er) { toastUmum(t('bk.gagal')); }
    finally { status(''); sibuk = false; }
  }
  async function unduh(b) {
    if (!dek || sibuk) return; sibuk = true;
    try {
      status(t('bk.membuka'));
      const { data, error } = await db.storage.from(BUCKET).download(b.path);
      if (error) throw error;
      const hasil = await dekripsi(data, b.mime);
      const url = URL.createObjectURL(hasil), a = document.createElement('a');
      a.href = url; a.download = b.nama; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      atur();
    } catch (er) { toastUmum(t('bk.gagal')); }
    finally { status(''); sibuk = false; }
  }
  async function hapus(b) {
    if (!confirm(t('bk.hapusTanya', { nama: b.nama }))) return;
    const { error } = await db.from('brankas_berkas').delete().eq('id', b.id);
    if (error) return toastUmum(t('bk.gagal'));
    db.storage.from(BUCKET).remove([b.path]).catch(() => {});
    berkas = berkas.filter(x => x.id !== b.id); segarkan(); atur();
  }
  async function gantiSandi(e) {
    e.preventDefault();
    const lama = $('#bkLama').value, baru = $('#bkBaru').value, ulang = $('#bkBaru2').value;
    if (baru.length < 8) return galat(t('bk.sandiPendek'));
    if (baru !== ulang) return galat(t('bk.sandiBeda'));
    if (sibuk) return; sibuk = true; galat('');
    try {
      let raw;
      try { raw = await bukaRaw(lama, kunciRow); } catch (er) { return galat(t('bk.sandiSalah')); }
      const paket = await bungkus(baru, raw);
      const { data, error } = await db.from('brankas_kunci').update({ ...paket, diubah_at: new Date().toISOString() }).eq('user_id', userId).select().single();
      if (error) throw error;
      kunciRow = data; $('#bkGanti').reset(); $('#bkGanti').hidden = true; toastUmum(t('bk.diganti'));
    } catch (er) { galat(t('bk.gagal')); }
    finally { sibuk = false; }
  }
  async function resetBrankas() {
    if (!confirm(t('bk.resetTanya'))) return;
    try {
      const { data } = await db.from('brankas_berkas').select('path');
      const paths = (data || []).map(x => x.path);
      for (let i = 0; i < paths.length; i += 100) await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      const e1 = (await db.from('brankas_berkas').delete().eq('user_id', userId)).error;
      const e2 = (await db.from('brankas_kunci').delete().eq('user_id', userId)).error;
      if (e1 || e2) throw (e1 || e2);
      dek = null; kunciRow = null; berkas = []; clearTimeout(timer);
      toastUmum(t('bk.terhapus')); tampilBuat();
    } catch (er) { toastUmum(t('bk.gagal')); }
  }

  async function buka() {
    const d = $('#lembarBrankas'); if (!d) return;
    if (!d.open) d.showModal();
    tampilMuat();
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) { location.href = 'login.html'; return; }
      userId = session.user.id;
      if (dek && kunciRow) { tampilBuka(); atur(); return; }
      const { data, error } = await db.from('brankas_kunci').select('*').maybeSingle();
      if (error) return tabelHilang(error) ? tampilBelumSiap() : (isi().innerHTML = `<p class="bk-galat">${esc(t('bk.gagal'))}</p>`);
      kunciRow = data || null;
      if (kunciRow) tampilKunci(); else tampilBuat();
    } catch (er) { isi().innerHTML = `<p class="bk-galat">${esc(t('bk.gagal'))}</p>`; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const d = $('#lembarBrankas'); if (!d) return;
    const x = $('#tutupBrankas'); if (x) x.onclick = () => d.close();
    d.addEventListener('click', e => { if (e.target === d) { d.close(); return; } atur(); });
    d.addEventListener('keydown', atur);
    d.addEventListener('close', () => { dek = null; berkas = []; clearTimeout(timer); if (isi()) isi().innerHTML = ''; });   // ditutup = terkunci
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-aksi]'); if (!b) return;
      const li = b.closest('li'), item = li ? berkas.find(x => x.id === li.dataset.id) : null;
      const a = b.dataset.aksi;
      if (a === 'kunci') { dek = null; berkas = []; clearTimeout(timer); tampilKunci(); }
      else if (a === 'unduh' && item) unduh(item);
      else if (a === 'hapus' && item) hapus(item);
      else if (a === 'ganti') { const f = $('#bkGanti'); if (f) { f.hidden = !f.hidden; if (!f.hidden) $('#bkLama').focus(); } }
      else if (a === 'reset') resetBrankas();
    });
  });
  window.Brankas = { buka };
})();

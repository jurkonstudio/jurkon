// Catatan publik: tombol di kartu catatan milik sendiri, dialog izin (dengan centang), salin/bagikan tautan,
// dan tanda "aktif" pada catatan yang sedang publik. Butuh sql/027_catatan_publik.sql.
// Dimuat setelah js/ui.js dan js/data.js; htmlPost (js/ui.js) memanggil tombolPublik().
(function () {
  const BASE = 'https://jurkon.my.id/n?id=';
  let tersedia = true;   // jadi false bila migrasi 027 belum dijalankan (tombol disembunyikan, aplikasi tetap jalan)

  const IKON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/></svg>';

  // Dipanggil htmlPost. Hanya catatan utama milik sendiri; aturan lengkapnya ditegakkan server.
  window.tombolPublik = function (p, milik) {
    if (!tersedia || !milik || p.parent_id || !p.content || p.kedaluwarsa || p.kapsul_ditulis) return '';
    const teks = t('pub.tombol');
    return '<button class="btn-publik" data-id="' + p.id + '" aria-pressed="false" aria-label="' + esc(teks) + '" title="' + esc(teks) + '">' + IKON + '</button>';
  };

  // Menandai tombol yang catatannya sedang publik (satu kueri untuk semua kartu yang tampil)
  let timer = 0;
  async function tandai() {
    timer = 0;
    const tombol = Array.from(document.querySelectorAll('.btn-publik:not([data-cek])'));
    if (!tombol.length) return;
    tombol.forEach(b => { b.dataset.cek = '1'; });
    const ids = Array.from(new Set(tombol.map(b => b.dataset.id)));
    const { data, error } = await db.from('posts').select('id,publik').in('id', ids);
    if (error) {
      if (/publik/i.test(String(error.message || ''))) { tersedia = false; tombol.forEach(b => b.remove()); }
      return;
    }
    const aktif = new Set((data || []).filter(x => x.publik).map(x => x.id));
    tombol.forEach(b => { const a = aktif.has(b.dataset.id); b.classList.toggle('aktif', a); b.setAttribute('aria-pressed', String(a)); });
  }
  function jadwal() { if (!timer) timer = setTimeout(tandai, 150); }
  new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true });
  jadwal();

  function dialog() {
    let d = document.getElementById('pubDlg');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'pubDlg'; d.className = 'pub-dlg';
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      document.body.appendChild(d);
    }
    return d;
  }
  function setTombol(id, aktif) {
    document.querySelectorAll('.btn-publik[data-id="' + id + '"]').forEach(b => { b.classList.toggle('aktif', aktif); b.setAttribute('aria-pressed', String(aktif)); });
  }

  function tampilPrivat(d, id) {
    d.innerHTML = '<h3>' + esc(t('pub.judulAktif')) + '</h3><p>' + esc(t('pub.peringatan')) + '</p>' +
      '<label class="pub-cek"><input type="checkbox" id="pubCek"><span>' + esc(t('pub.centang')) + '</span></label>' +
      '<div class="pub-galat" id="pubGalat" role="alert"></div>' +
      '<div class="pub-aksi"><button type="button" class="btn garis" id="pubBatal">' + esc(t('pub.batal')) + '</button>' +
      '<button type="button" class="btn" id="pubYa" disabled>' + esc(t('pub.btnPublik')) + '</button></div>';
    const cek = d.querySelector('#pubCek'), ya = d.querySelector('#pubYa'), galat = d.querySelector('#pubGalat');
    cek.onchange = () => { ya.disabled = !cek.checked; };
    d.querySelector('#pubBatal').onclick = () => d.close();
    ya.onclick = async () => {
      ya.disabled = true; galat.textContent = '';
      const { error } = await db.rpc('jadikan_publik', { p_id: id });
      if (error) { galat.textContent = galatRamah(error); ya.disabled = !cek.checked; return; }
      setTombol(id, true);
      tampilPublik(d, id);
    };
  }

  function tampilPublik(d, id) {
    const url = BASE + id;
    d.innerHTML = '<h3>' + esc(t('pub.judulPublik')) + '</h3><p class="pub-info">' + esc(t('pub.infoPublik')) + '</p>' +
      '<input class="pub-tautan" id="pubUrl" readonly value="' + esc(url) + '" aria-label="' + esc(t('pub.salin')) + '">' +
      '<div id="pubJelajahi"></div>' +
      '<div class="pub-galat" id="pubGalat" role="status"></div>' +
      '<div class="pub-aksi"><button type="button" class="btn garis" id="pubPrivat">' + esc(t('pub.privat')) + '</button>' +
      (navigator.share ? '<button type="button" class="btn garis" id="pubBagi">' + esc(t('pub.bagikan')) + '</button>' : '') +
      '<button type="button" class="btn" id="pubSalin">' + esc(t('pub.salin')) + '</button></div>';
    const info = d.querySelector('#pubGalat');
    // Pilihan tingkat ketiga: tampil di halaman Jelajahi publik (sql/035). Tanpa 035 baris ini tidak muncul.
    const wadahJ = d.querySelector('#pubJelajahi');
    db.rpc('status_jelajahi', { p_id: id }).then(({ data, error }) => {
      if (error || !wadahJ) return;
      wadahJ.innerHTML = '<label class="pub-cek"><input type="checkbox" id="pubJ"><span>' + esc(t('pub.jelajahi')) + '</span></label>';
      const cj = wadahJ.querySelector('#pubJ');
      cj.checked = data === true;
      cj.onchange = async () => {
        cj.disabled = true;
        const { error: e } = await db.rpc('atur_jelajahi', { p_id: id, p_tampil: cj.checked });
        cj.disabled = false;
        if (e) { cj.checked = !cj.checked; info.style.color = ''; info.textContent = galatRamah(e); return; }
        info.style.color = 'var(--redup)'; info.textContent = t(cj.checked ? 'pub.jelajahiOn' : 'pub.jelajahiOff');
      };
    });
    d.querySelector('#pubSalin').onclick = async () => {
      try { await navigator.clipboard.writeText(url); }
      catch (e) { const k = d.querySelector('#pubUrl'); k.select(); try { document.execCommand('copy'); } catch (e2) {} }
      info.style.color = 'var(--redup)'; info.textContent = t('pub.tersalin');
    };
    const bagi = d.querySelector('#pubBagi');
    if (bagi) bagi.onclick = () => navigator.share({ url, title: 'Jurkon' }).catch(() => {});
    d.querySelector('#pubPrivat').onclick = async () => {
      const { error } = await db.rpc('jadikan_privat', { p_id: id });
      if (error) { info.style.color = ''; info.textContent = galatRamah(error); return; }
      setTombol(id, false);
      d.close();
      alert(t('pub.sudahPrivat'));
    };
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('.btn-publik');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.id;
    const d = dialog();
    d.innerHTML = '<p>' + esc(t('pub.memuat')) + '</p>';
    if (!d.open) d.showModal();
    const { data, error } = await db.from('posts').select('publik').eq('id', id).maybeSingle();
    if (error || !data) { d.innerHTML = '<p class="pub-galat">' + esc(t('pub.gagal', { pesan: galatRamah(error || {}) })) + '</p><div class="pub-aksi"><button type="button" class="btn garis" id="pubTutup">' + esc(t('pub.tutup')) + '</button></div>'; d.querySelector('#pubTutup').onclick = () => d.close(); return; }
    if (data.publik) tampilPublik(d, id); else tampilPrivat(d, id);
  });
})();

// Lembar tulis: menulis catatan baru, membalas, dan mengutip tanpa pindah ke halaman layar penuh.
// Dimuat otomatis oleh js/nav.js saat tombol Tulis / Balas / Kutip diketuk.
(function () {
  let dlg = null, ta, hitung, kirimBtn, galat, judul, konteks, saya = null, kini = null, sibuk = false, bersihVV = null;
  const draf = {};   // tulisan yang belum terkirim tetap ada bila lembar ditutup tak sengaja

  const IKON_TUTUP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function pesan(e) {
    if (e && e.code === '23503') return t('post.e.profil');
    if (e && e.code === '42501') return t('post.e.izin');
    return typeof pesanGalat === 'function' ? pesanGalat(e) : ((e && e.message) || '');
  }

  function toast(teks) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = teks;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('hilang'), 2200);
    setTimeout(() => el.remove(), 2600);
  }

  function bangun() {
    dlg = document.createElement('dialog');
    dlg.className = 'lembar tulis-lembar';
    dlg.setAttribute('aria-labelledby', 'tulisJudul');
    dlg.innerHTML =
      '<div class="lembar-kepala"><h2 id="tulisJudul"></h2>' +
      '<button type="button" class="ikon-btn" data-tutup aria-label="' + esc(t('umum.tutup')) + '">' + IKON_TUTUP + '</button></div>' +
      '<div id="tulisKonteks"></div>' +
      '<div class="form"><textarea id="tulisIsi" rows="4"></textarea>' +
      '<div class="umur-catatan" id="tulisUmurBox" hidden><label for="tulisUmur">' + esc(t('tulis.umur')) + '</label>' +
      '<select id="tulisUmur"><option value="0">' + esc(t('tulis.umurTetap')) + '</option><option value="24">' + esc(t('tulis.umur24')) +
      '</option><option value="168">' + esc(t('tulis.umur7')) + '</option></select></div>' +
      '<div class="baris"><span class="hitung" id="tulisHitung"></span><button type="button" class="btn" id="tulisKirim"></button></div>' +
      '<div class="galat" id="tulisGalat" role="alert"></div></div>';
    document.body.appendChild(dlg);
    ta = dlg.querySelector('#tulisIsi'); hitung = dlg.querySelector('#tulisHitung'); kirimBtn = dlg.querySelector('#tulisKirim');
    galat = dlg.querySelector('#tulisGalat'); judul = dlg.querySelector('#tulisJudul'); konteks = dlg.querySelector('#tulisKonteks');
    pasangHitung(ta, hitung, 250);
    if (typeof pasangFilter === 'function') pasangFilter(ta);
    if (typeof pasangMention === 'function') pasangMention(ta, saya);
    ta.addEventListener('input', () => { if (kini) draf[kini.kunci] = ta.value; });
    kirimBtn.addEventListener('click', kirim);
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-tutup]')) tutup(); });
    dlg.addEventListener('close', () => { if (bersihVV) { bersihVV(); bersihVV = null; } });
    dlg.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') kirim(); });
  }

  // Lembar tetap berada di atas keyboard layar (Android/iOS)
  function ikutiKeyboard() {
    const vv = window.visualViewport; if (!vv) return;
    const atur = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      dlg.style.marginBottom = kb ? kb + 'px' : '';
      dlg.style.maxHeight = Math.max(220, vv.height - 12) + 'px';
    };
    vv.addEventListener('resize', atur); vv.addEventListener('scroll', atur); atur();
    bersihVV = () => { vv.removeEventListener('resize', atur); vv.removeEventListener('scroll', atur); dlg.style.marginBottom = ''; dlg.style.maxHeight = ''; };
  }

  function tutup() { if (dlg && dlg.open) dlg.close(); }

  function pilihPlaceholder(kunci) {
    const daftar = t(kunci).split('|');
    ta.placeholder = daftar[Math.floor(Math.random() * daftar.length)];
  }

  async function kirim() {
    const isi = ta.value.trim();
    if (!isi || sibuk || !kini) return;
    galat.textContent = '';
    if (typeof bolehKirim === 'function' && !bolehKirim(isi, m => galat.textContent = m)) return;
    sibuk = true; kirimBtn.disabled = true;
    const baris = { user_id: saya.id, content: isi };
    if (kini.mode === 'balas') baris.parent_id = kini.id;
    else if (kini.mode === 'kutip') { baris.jenis = 'kutip'; baris.kutip_id = kini.id; }
    else { const jam = +(dlg.querySelector('#tulisUmur') || {}).value || 0; if (jam > 0) baris.kedaluwarsa = new Date(Date.now() + jam * 36e5).toISOString(); }
    const { error } = await kirimPosting(baris);
    sibuk = false; kirimBtn.disabled = false;
    if (error) {
      galat.textContent = t(kini.mode === 'balas' ? 'detail.gagal' : 'post.gagal', { pesan: pesan(error) });
      return;
    }
    const info = { mode: kini.mode, id: kini.id };
    delete draf[kini.kunci];
    ta.value = ''; ta.dispatchEvent(new Event('input'));
    tutup();
    toast(t('tulis.terkirim'));
    document.dispatchEvent(new CustomEvent('jurkon:terkirim', { detail: info, cancelable: true }));
  }

  // o: {} (catatan baru) | { balas: idPosting, kartu: elemen } | { kutip: idPosting }
  async function buka(o) {
    o = o || {};
    saya = await wajibLogin();
    if (!saya) return;
    if (!dlg) bangun();
    const mode = o.balas ? 'balas' : o.kutip ? 'kutip' : 'tulis';
    const id = o.balas || o.kutip || null;
    kini = { mode, id, kunci: mode + ':' + (id || '') };
    galat.textContent = ''; kirimBtn.disabled = false; konteks.innerHTML = '';
    dlg.querySelector('#tulisUmurBox').hidden = mode !== 'tulis'; dlg.querySelector('#tulisUmur').value = '0';
    ta.value = draf[kini.kunci] || ''; ta.dispatchEvent(new Event('input'));

    if (mode === 'balas') {
      const k = o.kartu || document.querySelector('.post[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      const nama = k && k.querySelector('.nama') ? k.querySelector('.nama').textContent : '';
      const user = k && k.querySelector('.user') ? k.querySelector('.user').textContent.replace(/^@/, '') : '';
      const teks = k && k.querySelector('.isi') ? k.querySelector('.isi').textContent : '';
      judul.textContent = user ? t('pc.membalasUser', { u: user }) : t('umum.balas');
      kirimBtn.textContent = t('umum.balas');
      konteks.innerHTML = '<div class="tulis-konteks"><b>' + esc(nama) + '</b> <span>@' + esc(user) + '</span><p>' + esc(teks) + '</p></div>';
      pilihPlaceholder('detail.ph');
    } else if (mode === 'kutip') {
      judul.textContent = t('post.kutipJudul');
      kirimBtn.textContent = t('umum.kirim');
      ta.placeholder = t('post.kutipPh');
      konteks.innerHTML = '<div class="tulis-kutipan"><div class="kutipan hilang">…</div></div>';
      db.from('posts').select('id,content,created_at,jenis,profiles(username,nama)').eq('id', id).maybeSingle().then(({ data }) => {
        if (!kini || kini.id !== id) return;
        if (!data || data.jenis === 'ulang') { galat.textContent = t('pc.kutipanHilang'); kirimBtn.disabled = true; konteks.innerHTML = ''; }
        else konteks.innerHTML = '<div class="tulis-kutipan">' + htmlKutipan(data) + '</div>';
      });
    } else {
      judul.textContent = t('nav.tulis');
      kirimBtn.textContent = t('umum.kirim');
      pilihPlaceholder('post.ph');
    }

    if (!dlg.open) dlg.showModal();
    ikutiKeyboard();
    ta.focus();
  }

  window.Tulis = window.Tulis || {};
  window.Tulis.nyata = buka;
})();

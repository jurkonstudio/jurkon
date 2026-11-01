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
      '<div class="umur-catatan" id="tulisKapsulBox" hidden><label for="tulisKapsul">' + esc(t('tulis.kapsul')) + '</label>' +
      '<select id="tulisKapsul"><option value="">' + esc(t('tulis.kapsulTidak')) + '</option>' +
      '<option value="1">' + esc(t('tulis.kapsul1')) + '</option><option value="7">' + esc(t('tulis.kapsul7')) + '</option>' +
      '<option value="30">' + esc(t('tulis.kapsul30')) + '</option><option value="365">' + esc(t('tulis.kapsul365')) + '</option>' +
      '<option value="tgl">' + esc(t('tulis.kapsulTanggal')) + '</option></select>' +
      '<input type="date" id="tulisKapsulTgl" hidden>' +
      '<button type="button" class="tautan-kapsul" id="tulisKapsulLihat">' + esc(t('tulis.kapsulLihat')) + '</button></div>' +
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
    pasangKapsul();
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

  // ===== Kapsul waktu =====
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function pasangKapsul() {
    const pilih = dlg.querySelector('#tulisKapsul'), tgl = dlg.querySelector('#tulisKapsulTgl'), umur = dlg.querySelector('#tulisUmur');
    const besok = new Date(); besok.setDate(besok.getDate() + 1);
    const maks = new Date(); maks.setDate(maks.getDate() + 365);
    tgl.min = ymd(besok); tgl.max = ymd(maks);
    // Kapsul waktu dan "hilang setelah" tidak boleh dipakai bersamaan
    pilih.addEventListener('change', () => { tgl.hidden = pilih.value !== 'tgl'; if (pilih.value) umur.value = '0'; });
    umur.addEventListener('change', () => { if (umur.value !== '0') { pilih.value = ''; tgl.hidden = true; } });
    dlg.querySelector('#tulisKapsulLihat').addEventListener('click', daftarKapsul);
  }

  // Waktu buka (ISO) | null bila langsung tayang | false bila tanggal belum dipilih
  function waktuKapsul() {
    const v = dlg.querySelector('#tulisKapsul').value;
    if (!v) return null;
    if (v === 'tgl') {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dlg.querySelector('#tulisKapsulTgl').value);
      if (!m) return false;
      return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0).toISOString();
    }
    return new Date(Date.now() + (+v) * 864e5).toISOString();
  }

  let dlgK = null;
  async function daftarKapsul() {
    if (!dlgK) {
      dlgK = document.createElement('dialog');
      dlgK.className = 'lembar';
      dlgK.setAttribute('aria-labelledby', 'kapsulJudul');
      dlgK.innerHTML = '<div class="lembar-kepala"><h2 id="kapsulJudul"></h2>' +
        '<button type="button" class="ikon-btn" data-tutup aria-label="' + esc(t('umum.tutup')) + '">' + IKON_TUTUP + '</button></div>' +
        '<div class="form" id="kapsulIsi"></div>';
      document.body.appendChild(dlgK);
      dlgK.querySelector('#kapsulJudul').textContent = t('tulis.kapsulLihat');
      dlgK.addEventListener('click', async e => {
        if (e.target === dlgK || e.target.closest('[data-tutup]')) { dlgK.close(); return; }
        const b = e.target.closest('[data-batal]');
        if (!b || !confirm(t('kapsul.konfirmBatal'))) return;
        b.disabled = true;
        const { error } = await db.rpc('batalkan_kapsul', { p_id: b.dataset.batal });
        if (error) { toast(pesan(error)); b.disabled = false; return; }
        isiKapsul();
      });
    }
    dlgK.showModal();
    isiKapsul();
  }

  async function isiKapsul() {
    const kotak = dlgK.querySelector('#kapsulIsi');
    const { data, error } = await db.rpc('kapsul_saya');
    if (error) { kotak.textContent = pesan(error); return; }
    kotak.innerHTML = data && data.length
      ? data.map(k => '<div class="kapsul-item"><p>' + esc(String(k.content).slice(0, 140)) + '</p><div class="kapsul-baris"><span>' +
          esc(t('kapsul.buka', { tgl: tglPanjang(k.terbuka_pada) })) + '</span><button type="button" class="btn garis" data-batal="' +
          esc(k.id) + '">' + esc(t('kapsul.batal')) + '</button></div></div>').join('')
      : '<p class="kapsul-kosong">' + esc(t('kapsul.kosong')) + '</p>';
  }

  function tutup() { if (dlg && dlg.open) dlg.close(); }

  function pilihPlaceholder(kunci) {
    const daftar = t(kunci).split('|');
    ta.placeholder = daftar[Math.floor(Math.random() * daftar.length)];
  }

  // Teks pertanyaan ikut disimpan di jawaban (migrasi 037). Tanpa migrasi, jawaban tetap terkirim seperti biasa.
  let adaTeksPq = null;
  async function cekTeksPq() {
    if (adaTeksPq === null) { try { adaTeksPq = !(await db.from('posts').select('pertanyaan_teks').limit(1)).error; } catch (e) { adaTeksPq = false; } }
    return adaTeksPq;
  }

  async function kirim() {
    const isi = ta.value.trim();
    if (!isi || sibuk || !kini) return;
    galat.textContent = '';
    if (typeof bolehKirim === 'function' && !bolehKirim(isi, m => galat.textContent = m)) return;
    sibuk = true; kirimBtn.disabled = true;
    const baris = { user_id: saya.id, content: isi };
    if (kini.mode === 'balas') baris.parent_id = kini.id;
    else if (kini.mode === 'jawab') { baris.pertanyaan_tgl = kini.tgl; if (kini.teks && await cekTeksPq()) baris.pertanyaan_teks = kini.teks; }
    else if (kini.mode === 'kutip') { baris.jenis = 'kutip'; baris.kutip_id = kini.id; }
    else {
      const jam = +(dlg.querySelector('#tulisUmur') || {}).value || 0; if (jam > 0) baris.kedaluwarsa = new Date(Date.now() + jam * 36e5).toISOString();
      const kp = waktuKapsul();
      if (kp === false) { galat.textContent = t('tulis.kapsulPilih'); sibuk = false; kirimBtn.disabled = false; return; }
      if (kp) baris.terbuka_pada = kp;
    }
    const { error } = await kirimPosting(baris);
    sibuk = false; kirimBtn.disabled = false;
    if (error) {
      if (kini.mode === 'jawab' && error.code === '23505') { galat.textContent = t('pq.sudahGalat'); return; }
      galat.textContent = t(kini.mode === 'balas' ? 'detail.gagal' : 'post.gagal', { pesan: pesan(error) });
      return;
    }
    const info = { mode: kini.mode, id: kini.id };
    delete draf[kini.kunci];
    ta.value = ''; ta.dispatchEvent(new Event('input'));
    tutup();
    toast(info.mode === 'jawab' ? t('pq.terkirim') : baris.terbuka_pada ? t('tulis.kapsulTerkirim', { tgl: tglPanjang(baris.terbuka_pada) }) : t('tulis.terkirim'));
    document.dispatchEvent(new CustomEvent('jurkon:terkirim', { detail: info, cancelable: true }));
  }

  // o: {} (catatan baru) | { balas: idPosting, kartu: elemen } | { kutip: idPosting }
  async function buka(o) {
    o = o || {};
    saya = await wajibLogin();
    if (!saya) return;
    if (!dlg) bangun();
    const mode = o.balas ? 'balas' : o.kutip ? 'kutip' : o.pertanyaan ? 'jawab' : 'tulis';
    const id = o.balas || o.kutip || null;
    kini = { mode, id, tgl: o.pertanyaan ? o.pertanyaan.tgl : null, teks: o.pertanyaan ? o.pertanyaan.teks : null, kunci: mode + ':' + (id || (o.pertanyaan ? o.pertanyaan.tgl : '')) };
    galat.textContent = ''; kirimBtn.disabled = false; konteks.innerHTML = '';
    dlg.querySelector('#tulisUmurBox').hidden = mode !== 'tulis'; dlg.querySelector('#tulisUmur').value = '0';
    dlg.querySelector('#tulisKapsulBox').hidden = mode !== 'tulis'; dlg.querySelector('#tulisKapsul').value = ''; dlg.querySelector('#tulisKapsulTgl').value = ''; dlg.querySelector('#tulisKapsulTgl').hidden = true;
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
    } else if (mode === 'jawab') {
      judul.textContent = t('pq.judul');
      kirimBtn.textContent = t('umum.kirim');
      ta.placeholder = t('pq.ph');
      konteks.innerHTML = '<div class="tulis-konteks"><p>' + esc(o.pertanyaan.teks) + '</p></div>';
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

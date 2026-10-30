(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const tombolSemua = $('#semua'), baru = $('#baru');
  const IKON_JENIS = {
    suka: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.8 4.5 7.2 4.5c1.9 0 3.700 1 4.800 2.700 1.100-1.700 2.900-2.700 4.800-2.700 3.400 0 5.600 3.400 4.400 6.700-1.700 4.700-9.200 9.300-9.200 9.300z"/></svg>',
    balasan: IKON.balas,
    ikuti: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/></svg>',
    pesan: IKON.pesan,
    posting: IKON.pena,
    ulang: IK2.ulang,
    kutip: IK2.ulang,
    mention: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9"/></svg>'
  };

  function baris(n) {
    const k = Notif.kalimat(n);
    const a = n.actor || {};
    return `<div class="notif-baris"><a class="notif ${n.dibaca ? '' : 'baru'}" href="${esc(k.href)}" data-id="${esc(n.id)}">
      <span class="notif-ava">${avatar(a.nama || a.username, 44, a.foto_url)}<i class="notif-jenis j-${esc(n.jenis)}" aria-hidden="true">${IKON_JENIS[n.jenis] || ''}</i></span>
      <span class="notif-isi"><span class="notif-teks">${k.html}</span>
        ${k.cuplikan ? `<span class="notif-cuplikan">${esc(k.cuplikan)}</span>` : ''}
        <span class="notif-waktu">${n.dibaca ? '' : '<span class="sr">' + esc(t('notif.srBaru')) + '</span>'}${waktu(n.created_at)}</span></span>
      ${n.dibaca ? '' : '<span class="notif-titik" aria-hidden="true"></span>'}</a></div>`;
  }

  // Dua kelompok terpisah: Aktivitas (suka, balasan, pengikut baru, pesan) dan Mengikuti (catatan baru dari akun yang diikuti)
  const KUNCI_TAB = 'notifTab';
  const bacaTab = () => { try { return localStorage.getItem(KUNCI_TAB) === 'mengikuti' ? 'mengikuti' : 'aktivitas'; } catch (e) { return 'aktivitas'; } };
  let kelompok = bacaTab(), daf = null;
  const tabEl = document.querySelector('.tab-feed');

  const kosongTab = k => k === 'mengikuti'
    ? kosong('pena', t('notif.kosongIkutiJ'), t('notif.kosongIkutiT'), 'explore.html', t('umum.cariOrang'))
    : kosong('pesan', t('notif.kosongJ'), t('notif.kosongT'), 'explore.html', t('umum.cariOrang'));
  const jumlahTab = k => k === 'mengikuti' ? Notif.mengikuti : Notif.total;

  function perbaruiTombol() {
    tombolSemua.hidden = !(jumlahTab(kelompok) > 0);
    tabEl.querySelectorAll('[data-k]').forEach(b => {
      const n = jumlahTab(b.dataset.k), h = b.querySelector('.tab-hitung');
      h.hidden = n < 1; h.textContent = n > 99 ? '99+' : String(n);
    });
  }

  function pilihTab(k, fokus) {
    kelompok = k;
    try { localStorage.setItem(KUNCI_TAB, k); } catch (e) {}
    tabEl.querySelectorAll('[data-k]').forEach(b => {
      const aktif = b.dataset.k === k;
      b.setAttribute('aria-selected', aktif);
      b.tabIndex = aktif ? 0 : -1;
      if (aktif) { $('#daftar').setAttribute('aria-labelledby', b.id); if (fokus) b.focus(); }
    });
    if (daf) daf.hentikan();           // batalkan permintaan tab sebelumnya
    baru.innerHTML = '';
    // Ganti elemen daftar supaya pendengar klik lama ikut terbuang
    const lama = $('#daftar'), el = lama.cloneNode(false);
    lama.replaceWith(el);
    el.addEventListener('click', ketukItem);
    daf = daftarBerhalaman(el, async sebelum => {
      const { data, error } = await Notif.terbaru(HALAMAN, sebelum, k);
      return { data, error, limit: HALAMAN };
    }, () => kosongTab(k), saya, { render: baris, item: '.notif' });
    perbaruiTombol();
    window.scrollTo({ top: 0 });
    daf.muat();
  }

  // Ketuk item: tandai dibaca dulu (maks. 0,7 dtk) lalu buka tujuannya
  function ketukItem(e) {
    const a = e.target.closest('a.notif');
    if (!a) return;
    const biasa = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    if (!a.classList.contains('baru')) return;
    const p = Notif.tandai([a.dataset.id]);
    a.classList.remove('baru');
    const t = a.querySelector('.notif-titik'); if (t) t.remove();
    if (biasa) {
      e.preventDefault();
      Promise.race([p, new Promise(r => setTimeout(r, 700))]).then(() => { location.href = a.getAttribute('href'); });
    }
  }

  tabEl.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (b && b.dataset.k !== kelompok) pilihTab(b.dataset.k);
  });
  tabEl.addEventListener('keydown', e => {      // panah kiri/kanan berpindah tab
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    pilihTab(kelompok === 'aktivitas' ? 'mengikuti' : 'aktivitas', true);
  });

  Notif.pada(perbaruiTombol);

  // "Tandai semua dibaca" hanya untuk tab yang sedang dibuka
  tombolSemua.onclick = async () => {
    tombolSemua.disabled = true;
    const { error } = await Notif.tandai(null, kelompok);
    tombolSemua.disabled = false;
    if (error) { alert(t('notif.gagalTandai', { pesan: pesanGalat(error) })); return; }
    $('#daftar').querySelectorAll('a.notif.baru').forEach(a => { a.classList.remove('baru'); const t = a.querySelector('.notif-titik'); if (t) t.remove(); });
  };

  // Notifikasi masuk saat halaman terbuka: tawarkan muat ulang (hanya bila untuk tab yang sedang dibuka)
  Notif.padaBaru(n => {
    if ((n.jenis === 'posting') !== (kelompok === 'mengikuti')) return;
    if (baru.firstChild) return;
    baru.innerHTML = '<button class="pill-baru" type="button">' + esc(t('notif.baru')) + '</button>';
    baru.firstChild.onclick = () => { baru.innerHTML = ''; window.scrollTo(0, 0); daf.muat(); };
  });

  pilihTab(kelompok);
})();

(function () {
  const ikon = {
    beranda: '<svg viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    notifikasi: '<svg viewBox="0 0 24 24"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>',
    pesan: '<svg viewBox="0 0 24 24"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>',
    profil: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
    tulis: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };
  const menu = [
    ['index.html', t('nav.beranda'), 'beranda'],
    ['explore.html', t('nav.explore'), 'explore'],
    ['notifikasi.html', t('nav.notifikasi'), 'notifikasi'],
    ['pesan.html', t('nav.pesan'), 'pesan'],
    ['profil.html', t('nav.profil'), 'profil']
  ];
  const aktif = document.body.dataset.tab;
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', t('nav.menu'));
  nav.innerHTML = menu.map(([h, n, k]) =>
    `<a href="${h}" data-k="${k}" class="${aktif === k ? 'aktif' : ''}" aria-label="${esc(n)}" title="${esc(n)}"${aktif === k ? ' aria-current="page"' : ''}>${ikon[k]}${esc(n)}${k === 'notifikasi' || k === 'pesan' ? '<span class="lencana" hidden></span>' : ''}</a>`).join('') +
    `<a href="post.html" class="nav-tulis" aria-label="${esc(t('nav.tulis'))}" title="${esc(t('nav.tulis'))}">${ikon.tulis}${esc(t('nav.tulis'))}</a>`;
  document.body.appendChild(nav);

  // Panel kanan (tampil hanya di layar lebar)
  if (aktif) {
    const p = document.createElement('aside');
    p.className = 'panel';
    p.setAttribute('aria-label', t('panel.aria'));
    p.innerHTML = `<section id="panel-notif"><h2>${esc(t('nav.notifikasi'))}</h2>
      <ul class="panel-notif"></ul>
      <a class="lihat-semua" href="notifikasi.html">${esc(t('panel.lihatSemua'))}</a></section>
      <section><h2>${esc(t('panel.catatan'))}</h2>
      <div class="batas"><b>250</b><span>${esc(t('panel.karakter'))}</span></div>
      <p>${esc(t('panel.teks'))}</p></section>
      <section><h2>${esc(t('panel.pintasan'))}</h2><ul>
        <li><a href="post.html">${esc(t('panel.tulisBaru'))}</a></li>
        <li><a href="explore.html">${esc(t('panel.cari'))}</a></li>
        <li><a href="aturan.html">${esc(t('panel.aturan'))}</a></li></ul></section>`;
    document.body.appendChild(p);
  }

  // Lencana belum dibaca (Notifikasi = semua jenis, Pesan = jenis pesan saja)
  const teksLencana = n => n > 99 ? '99+' : String(n);
  function setLencana(k, n, nama, kunciBaca) {
    const a = nav.querySelector(`a[data-k="${k}"]`);
    if (!a) return;
    const l = a.querySelector('.lencana');
    l.hidden = n < 1;
    l.textContent = n > 0 ? teksLencana(n) : '';
    a.setAttribute('aria-label', n > 0 ? t(kunciBaca, { n }) : nama);
  }
  if (window.Notif) Notif.pada(s => {
    setLencana('notifikasi', s.total + s.mengikuti, t('nav.notifikasi'), 'nav.unreadNotif');
    setLencana('pesan', s.pesan, t('nav.pesan'), 'nav.unreadPesan');
  });

  // Ringkasan 5 notifikasi terbaru di panel kanan (hanya dimuat bila panel terlihat)
  const kotak = document.querySelector('#panel-notif .panel-notif');
  if (kotak && window.Notif) {
    let sudah = false, tunggu = null;
    const lebar = matchMedia('(min-width:1280px)');
    async function isi() {
      if (!lebar.matches || !Notif.aktif) return;
      const { data, error } = await Notif.terbaru(5, null, 'aktivitas');
      if (error) return;
      sudah = true;
      kotak.innerHTML = data.length ? data.map(n => {
        const k = Notif.kalimat(n);
        return `<li><a class="${n.dibaca ? '' : 'baru'}" href="${esc(k.href)}"><span>${k.html}</span>${n.dibaca ? '' : '<span class="titik" aria-label="' + esc(t('panel.belumDibaca')) + '"></span>'}</a></li>`;
      }).join('') : '<li class="sepi">' + esc(t('panel.sepi')) + '</li>';
    }
    const tunda = () => { clearTimeout(tunggu); tunggu = setTimeout(isi, 400); };
    Notif.pada(tunda);
    lebar.addEventListener('change', () => { if (lebar.matches && !sudah) isi(); });
  }

  // Tulis / Balas / Kutip membuka lembar kecil (js/tulis.js), bukan halaman layar penuh.
  // Tanpa JavaScript atau bila gagal dimuat, tautan tetap membuka post.html seperti biasa.
  (function () {
    const lokasi = o => o.pertanyaan ? 'pertanyaan.html' : o.balas ? 'detail.html?id=' + encodeURIComponent(o.balas)
      : o.kutip ? 'post.html?kutip=' + encodeURIComponent(o.kutip) : 'post.html';
    const butuh = [
      ['js/filter-data.js', () => typeof periksaKonten === 'function'],
      ['js/filter.js', () => typeof pasangFilter === 'function'],
      ['js/mention.js', () => typeof pasangMention === 'function'],
      ['js/tulis.js', () => !!(window.Tulis && window.Tulis.nyata)]
    ];
    let janji = null;
    const muatSkrip = src => new Promise((ok, gagal) => {
      const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = gagal;
      document.head.appendChild(s);
    });
    function siap() {
      if (!janji) janji = butuh.reduce((p, [src, ada]) => p.then(() => ada() ? null : muatSkrip(src)), Promise.resolve())
        .catch(e => { janji = null; throw e; });
      return janji;
    }
    window.Tulis = {
      buka(o) { siap().then(() => window.Tulis.nyata(o)).catch(() => { location.href = lokasi(o || {}); }); }
    };
    // Muat lebih awal saat senggang supaya lembar terbuka seketika
    (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => { siap().catch(() => {}); });

    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const h = a.getAttribute('href');
      if (h === 'post.html') { e.preventDefault(); window.Tulis.buka({}); return; }
      if (/^detail\.html\?id=/.test(h) && a.closest('.post .aksi')) {
        const kartu = a.closest('.post[data-id]');
        if (!kartu) return;
        e.preventDefault();
        // Di halaman detail, tombol Balas pada posting utama cukup mengarahkan ke kotak balasan yang sudah ada
        const kotak = document.getElementById('isi');
        if (kotak && kartu.closest('#utama')) { kotak.scrollIntoView({ block: 'center' }); kotak.focus(); return; }
        window.Tulis.buka({ balas: kartu.dataset.id, kartu });
      }
    });
  })();

  // Ambil lebih dulu halaman tab lain saat browser senggang, supaya perpindahan tab terasa cepat (dilewati bila Hemat Data aktif)
  const hemat = navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || ''));
  if (aktif && !hemat) (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => {
    menu.forEach(([h, , k]) => {
      if (k === aktif) return;
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; document.head.appendChild(l);
    });
  });
})();

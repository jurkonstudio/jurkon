(function () {
  const ikon = {
    beranda: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    notifikasi: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    pesan: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    profil: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
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
    setLencana('notifikasi', s.total, t('nav.notifikasi'), 'nav.unreadNotif');
    setLencana('pesan', s.pesan, t('nav.pesan'), 'nav.unreadPesan');
  });

  // Ringkasan 5 notifikasi terbaru di panel kanan (hanya dimuat bila panel terlihat)
  const kotak = document.querySelector('#panel-notif .panel-notif');
  if (kotak && window.Notif) {
    let sudah = false, tunggu = null;
    const lebar = matchMedia('(min-width:1280px)');
    async function isi() {
      if (!lebar.matches || !Notif.aktif) return;
      const { data, error } = await Notif.terbaru(5);
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

  // Ambil lebih dulu halaman tab lain saat browser senggang, supaya perpindahan tab terasa cepat (dilewati bila Hemat Data aktif)
  const hemat = navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || ''));
  if (aktif && !hemat) (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => {
    menu.forEach(([h, , k]) => {
      if (k === aktif) return;
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; document.head.appendChild(l);
    });
  });
})();

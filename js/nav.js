(function () {
  const ikon = {
    beranda: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    pesan: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    profil: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    tulis: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };
  const menu = [
    ['index.html', 'Beranda', 'beranda'],
    ['explore.html', 'Jelajah', 'explore'],
    ['pesan.html', 'Pesan', 'pesan'],
    ['profil.html', 'Profil', 'profil']
  ];
  const aktif = document.body.dataset.tab;
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', 'Menu utama');
  nav.innerHTML = menu.map(([h, n, k]) =>
    `<a href="${h}" class="${aktif === k ? 'aktif' : ''}" aria-label="${n}" title="${n}"${aktif === k ? ' aria-current="page"' : ''}>${ikon[k]}${n}</a>`).join('') +
    `<a href="post.html" class="nav-tulis" aria-label="Tulis" title="Tulis">${ikon.tulis}Tulis</a>`;
  document.body.appendChild(nav);

  // Panel kanan (tampil hanya di layar lebar)
  if (aktif) {
    const p = document.createElement('aside');
    p.className = 'panel';
    p.setAttribute('aria-label', 'Tentang Jurkon');
    p.innerHTML = `<section><h2>Catatan singkat</h2>
      <div class="batas"><b>250</b><span>karakter per posting</span></div>
      <p>Jurkon dibuat tenang dan ringkas. Tulis yang penting, lalu terhubung dengan orang-orang yang kamu pilih.</p></section>
      <section><h2>Pintasan</h2><ul>
        <li><a href="post.html">Tulis catatan baru</a></li>
        <li><a href="explore.html">Cari orang atau topik</a></li>
        <li><a href="aturan.html">Aturan dan privasi</a></li></ul></section>`;
    document.body.appendChild(p);
  }
})();

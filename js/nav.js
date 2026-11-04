(function () {
  const ikon = {
    beranda: '<svg viewBox="0 0 24 24"><path class="dl" d="M4.5 11 12 4l7.5 7v8a1.500 1.500 0 0 1-1.500 1.500H6A1.500 1.500 0 0 1 4.500 19z"/><path d="M12 16.800v3.700"/><circle class="sp" cx="12" cy="15" r="1.7"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle class="dl" cx="10.500" cy="10.500" r="6.500"/><path d="m15.300 15.300 4.700 4.700"/><circle class="sp" cx="10.5" cy="10.5" r="1.6"/></svg>',
    notifikasi: '<svg viewBox="0 0 24 24"><path class="dl" d="M6 17v-6a6 6 0 0 1 12 0v6l1.500 2h-15z"/><path d="M12 3.500V5"/><circle class="sp" cx="12" cy="21.4" r="1.3"/></svg>',
    pesan: '<svg viewBox="0 0 24 24"><path class="dl" d="M4 6.500A2.500 2.500 0 0 1 6.500 4h11A2.500 2.500 0 0 1 20 6.500v7a2.500 2.500 0 0 1-2.500 2.500H10l-4.500 4v-4A2.500 2.500 0 0 1 4 13.500z"/><path d="M9.600 10h4.800"/><circle class="sp" cx="8.4" cy="10" r="1.2"/><circle class="sp" cx="15.6" cy="10" r="1.2"/></svg>',
    profil: '<svg viewBox="0 0 24 24"><path class="dl" d="M5 20.500c0-3.600 3.100-6 7-6s7 2.400 7 6z"/><circle class="sp" cx="12" cy="8" r="3.4"/></svg>',
    tulis: '<svg viewBox="0 0 24 24"><path d="M12 5.500v13M5.500 12H15"/><circle class="sp" cx="18.8" cy="12" r="1.6"/></svg>'
  };
  const menu = [
    ['/', t('nav.beranda'), 'beranda'],
    ['explore', t('nav.explore'), 'explore'],
    ['notifikasi', t('nav.notifikasi'), 'notifikasi'],
    ['pesan', t('nav.pesan'), 'pesan'],
    ['profil', t('nav.profil'), 'profil']
  ];
  const aktif = document.body.dataset.tab;
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', t('nav.menu'));
  nav.innerHTML = menu.map(([h, n, k]) =>
    `<a href="${h}" data-k="${k}" class="${aktif === k ? 'aktif' : ''}" aria-label="${esc(n)}" title="${esc(n)}"${aktif === k ? ' aria-current="page"' : ''}>${ikon[k]}${esc(n)}${k === 'notifikasi' || k === 'pesan' ? '<span class="lencana" hidden></span>' : ''}</a>`).join('') +
    `<a href="post" class="nav-tulis" aria-label="${esc(t('nav.tulis'))}" title="${esc(t('nav.tulis'))}">${ikon.tulis}${esc(t('nav.tulis'))}</a>`;
  // Merek di menu samping (hanya tampil di layar lebar, lewat CSS)
  nav.insertAdjacentHTML('afterbegin', '<a href="/" class="nav-merek" aria-label="Jurkon" title="Jurkon"><img class="logo-terang" src="assets/logo-header.webp" alt="" width="136" height="46" decoding="async"><img class="logo-gelap" src="assets/logo-header-gelap.webp" alt="" width="136" height="46" decoding="async"></a>');
  document.body.appendChild(nav);
  // >>> lonceng-header >>>
  // Lonceng Notifikasi di header (HP). Di layar lebar disembunyikan CSS (menu samping dan panel kanan sudah memuatnya).
  (function () {
    const h = document.querySelector('main > .header');
    if (!h || aktif === 'notifikasi' || h.querySelector(':scope > a')) return;
    const b = document.createElement('a');
    b.className = 'header-lonceng'; b.href = 'notifikasi';
    b.setAttribute('aria-label', t('nav.notifikasi')); b.title = t('nav.notifikasi');
    b.innerHTML = ikon.notifikasi + '<span class="lencana" hidden></span>';
    const logo = h.querySelector('.logo-wrap');
    if (logo) logo.after(b); else h.insertBefore(b, h.querySelector('#keluar'));
    const l = b.querySelector('.lencana');
    if (window.Notif) Notif.pada(s => {
      const n = s.total + s.mengikuti;
      l.hidden = n < 1; l.textContent = n > 99 ? '99+' : n > 0 ? String(n) : '';
      b.setAttribute('aria-label', n > 0 ? t('nav.unreadNotif', { n }) : t('nav.notifikasi'));
    });
  })();
  // <<< lonceng-header <<<
  // Panel kanan (tampil hanya di layar lebar)
  if (aktif) {
    const p = document.createElement('aside');
    p.className = 'panel';
    p.setAttribute('aria-label', t('panel.aria'));
    const phCari = String(t('explore.ph')).split('|')[0];
    p.innerHTML = `<form class="panel-cari" action="explore" method="get" role="search"><svg aria-hidden="true" viewBox="0 0 24 24"><circle class="dl" cx="10.500" cy="10.500" r="6.500"/><path d="m15.300 15.300 4.700 4.700"/><circle class="sp" cx="10.5" cy="10.5" r="1.6"/></svg><input type="search" name="q" maxlength="50" autocomplete="off" placeholder="${esc(phCari)}" aria-label="${esc(t('explore.aria'))}"></form>
      <section id="panel-notif"><h2>${esc(t('nav.notifikasi'))}</h2>
      <ul class="panel-notif"></ul>
      <a class="lihat-semua" href="notifikasi">${esc(t('panel.lihatSemua'))}</a></section>
      <section><h2>${esc(t('panel.catatan'))}</h2>
      <div class="batas"><b>250</b><span>${esc(t('panel.karakter'))}</span></div>
      <p>${esc(t('panel.teks'))}</p></section>
      <section><h2>${esc(t('panel.pintasan'))}</h2><ul>
        <li><a href="post">${esc(t('panel.tulisBaru'))}</a></li>
        <li><a href="explore">${esc(t('panel.cari'))}</a></li>
        <li><a href="aturan">${esc(t('panel.aturan'))}</a></li></ul></section>
      <footer class="panel-kaki"><a href="tentang">${esc(t('set.tentang'))}</a><a href="pusat-bantuan">${esc(t('set.bantuan'))}</a><a href="kebijakan-privasi">${esc(t('set.privasi'))}</a><a href="ketentuan-layanan">${esc(t('set.ketentuan'))}</a><span>© 2026 Jurkon</span></footer>`;
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
    const lokasi = o => o.pertanyaan ? 'pertanyaan' : o.balas ? 'detail?id=' + encodeURIComponent(o.balas)
      : o.kutip ? 'post?kutip=' + encodeURIComponent(o.kutip) : 'post';
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
      if (h === 'post') { e.preventDefault(); window.Tulis.buka({}); return; }
      if (/^detail\?id=/.test(h) && a.closest('.post .aksi')) {
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

// Tambahan desktop (>= 768px; di HP kotak tulis disembunyikan CSS dan pintasan tidak terpakai).
(function () {
  // Kotak tulis di puncak beranda. Tautannya ke post.html, jadi penangan klik di atas membukanya sebagai lembar.
  // Teks memakai kunci yang sudah ada (tujuh bahasa), tanpa kunci baru.
  if (document.body.dataset.tab === 'beranda') {
    const kepala = document.querySelector('main > .header');
    if (kepala && !document.querySelector('.komposer')) {
      const pena = (typeof IKON !== 'undefined' && IKON.pena) || '';
      kepala.insertAdjacentHTML('afterend',
        '<a class="komposer" href="post"><span class="komposer-ikon" aria-hidden="true">' + pena + '</span>' +
        '<span class="komposer-teks">' + esc(t('pf.k.catatanT')) + '</span>' +
        '<span class="komposer-btn">' + esc(t('nav.tulis')) + '</span></a>');
    }
  }

  // Pintasan papan ketik: N tulis, / cari, J dan K pindah antar catatan. Tidak aktif saat mengetik atau ada dialog terbuka.
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const el = document.activeElement, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key;
    if (k === 'n' || k === 'N') { e.preventDefault(); if (window.Tulis) window.Tulis.buka({}); return; }
    if (k === '/') {
      e.preventDefault();
      const q = document.querySelector('.panel-cari input');
      if (q && q.offsetParent) q.focus(); else location.href = 'explore';
      return;
    }
    if (k === 'j' || k === 'k') {
      const daftar = [...document.querySelectorAll('.post[data-id]')];
      if (!daftar.length) return;
      const i = daftar.indexOf(el && el.closest ? el.closest('.post[data-id]') : null);
      const ke = daftar[k === 'j' ? Math.min(daftar.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)];
      e.preventDefault();
      ke.tabIndex = -1;
      ke.focus({ preventScroll: true });
      ke.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
    }
  });
  // Pesan sambutan otomatis untuk pengguna baru (migrasi 042). Bahasa mengikuti ponsel/browser, bukan pilihan manual.
  // Server hanya mengirim sekali per akun; di sini cukup mengingat hasilnya supaya tidak memanggil terus.
  (async function sambutan() {
    try {
      if (typeof db === 'undefined' || !db.rpc) return;   // db adalah const global (js/supabase.js), BUKAN properti window
      const { data: { session } } = await db.auth.getSession();
      if (!session) return;
      const kunci = 'sambutan:' + session.user.id;
      try { if (localStorage.getItem(kunci)) return; } catch (e) {}
      const bhs = (window.I18n && I18n.deteksi) ? I18n.deteksi() : String(navigator.language || 'id').slice(0, 2);
      const { data, error } = await db.rpc('kirim_sambutan', { p_bahasa: bhs });
      if (!error && (data === 'terkirim' || data === 'sudah')) { try { localStorage.setItem(kunci, '1'); } catch (e) {} }
    } catch (e) { /* migrasi belum dijalankan atau jaringan putus: abaikan, coba lagi di kunjungan berikutnya */ }
  })();
})();

// Gulir turun: header dan menu bawah menyingkir (HP). Gulir naik, atau di puncak: muncul lagi.
// Berlaku di Beranda, Jelajah, Pesan, dan Profil (ruang obrolan chat.html tidak memuat berkas ini).
(function () {
  if (!/^(beranda|explore|pesan|profil)$/.test(document.body.dataset.tab || '')) return;
  const HP = window.matchMedia('(max-width:767px)');
  let terakhir = window.scrollY, menunggu = false;
  function periksa() {
    menunggu = false;
    const y = Math.max(0, window.scrollY), selisih = y - terakhir;
    if (!HP.matches || y < 80) document.body.classList.remove('gulir-turun');
    else if (selisih > 12) document.body.classList.add('gulir-turun');
    else if (selisih < -8) document.body.classList.remove('gulir-turun');
    if (Math.abs(selisih) > 8) terakhir = y;
  }
  window.addEventListener('scroll', () => { if (!menunggu) { menunggu = true; requestAnimationFrame(periksa); } }, { passive: true });
})();

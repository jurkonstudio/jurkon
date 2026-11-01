// Kartu catatan: mengubah catatan milik sendiri menjadi gambar (PNG) untuk Story Instagram, WhatsApp, dan sebagainya.
// Gambar dibuat sepenuhnya di perangkat (canvas). Tidak ada yang diunggah, tidak ada tabel atau SQL baru,
// dan catatan privat pun boleh dijadikan kartu: yang memutuskan membagikan atau tidak tetap penulisnya.
// Dimuat setelah js/ui.js; htmlPost (js/ui.js) memanggil tombolKartu().
(function () {
  const IKON = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 8"/></svg>';

  // Tema kartu: warna sengaja tetap (tidak ikut tema aplikasi) supaya gambarnya konsisten di mana pun dibagikan.
  const TEMA = {
    kertas: { bg: '#fbf9f4', teks: '#231f1c', redup: '#6b6359', aksen: '#ae2a22', garis: '#ddd5c4' },
    gelap:  { bg: '#1c1917', teks: '#ece6dc', redup: '#a79f94', aksen: '#d9473b', garis: '#34302b' },
    merah:  { bg: '#ae2a22', teks: '#fff7f0', redup: '#f3cfc8', aksen: '#fff7f0', garis: 'rgba(255,247,240,.35)' }
  };
  const FORMAT = { story: [1080, 1920], persegi: [1080, 1080] };
  // Kunci kamus ditulis utuh (bukan disambung) agar terbaca oleh tools/cek-bahasa.js
  const KUNCI = { kertas: 'kartu.t.kertas', gelap: 'kartu.t.gelap', merah: 'kartu.t.merah', story: 'kartu.f.story', persegi: 'kartu.f.persegi' };
  const SERIF = '"Source Serif 4","Iowan Old Style",Charter,Georgia,serif';
  const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

  // Dipanggil htmlPost: hanya catatan milik sendiri yang punya isi (posting ulang murni tidak).
  window.tombolKartu = function (p, milik) {
    if (!milik || !p.content) return '';
    const teks = t('kartu.tombol');
    return '<button type="button" class="btn-kartu" data-id="' + p.id + '" data-isi="' + esc(p.content) + '" data-tgl="' + esc(p.created_at || '') + '" aria-label="' + esc(teks) + '" title="' + esc(teks) + '">' + IKON + '</button>';
  };

  // Memecah teks menjadi baris yang muat di lebar tertentu. Baris baru asli dipertahankan,
  // kata yang lebih panjang dari satu baris (mis. tautan) dipotong per karakter.
  function bungkus(ctx, teks, lebar) {
    const baris = [];
    teks.replace(/\r/g, '').split('\n').forEach(para => {
      if (!para.trim()) { baris.push(''); return; }
      let kini = '';
      para.split(/(\s+)/).forEach(kata => {
        if (!kata) return;
        const coba = kini + kata;
        if (ctx.measureText(coba.trimEnd()).width <= lebar) { kini = coba; return; }
        if (kini.trim()) { baris.push(kini.trimEnd()); kini = ''; }
        if (/^\s+$/.test(kata)) return;
        if (ctx.measureText(kata).width <= lebar) { kini = kata; return; }
        let potong = '';
        for (const ch of Array.from(kata)) {
          if (ctx.measureText(potong + ch).width > lebar && potong) { baris.push(potong); potong = ''; }
          potong += ch;
        }
        kini = potong;
      });
      baris.push(kini.trimEnd());
    });
    while (baris.length && baris[baris.length - 1] === '') baris.pop();
    return baris;
  }

  // Mencari ukuran huruf terbesar yang membuat seluruh isi muat di kotak; mulai besar untuk catatan pendek.
  function muatkan(ctx, teks, lebar, tinggi) {
    for (let ukuran = 84; ukuran >= 30; ukuran -= 2) {
      ctx.font = '500 ' + ukuran + 'px ' + SERIF;
      const baris = bungkus(ctx, teks, lebar), lh = Math.round(ukuran * 1.42);
      if (baris.length * lh <= tinggi) return { ukuran, baris, lh };
    }
    ctx.font = '500 30px ' + SERIF;
    const baris = bungkus(ctx, teks, lebar), lh = 43, maks = Math.floor(tinggi / lh);
    if (baris.length > maks) { baris.length = maks; baris[maks - 1] = baris[maks - 1].replace(/\s*\S?$/, '') + '…'; }
    return { ukuran: 30, baris, lh };
  }

  function gambar(o) {
    const [W, H] = FORMAT[o.format] || FORMAT.story, tm = TEMA[o.tema] || TEMA.kertas;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const m = 96, lebar = W - m * 2;
    ctx.fillStyle = tm.bg; ctx.fillRect(0, 0, W, H);

    // Kolom isi di tengah: tinggi tersedia dikurangi ruang atas (tanda kutip) dan bawah (penulis + merek)
    const atas = o.format === 'story' ? 360 : 170, bawah = 400;
    const kotak = H - atas - bawah;
    const f = muatkan(ctx, o.teks, lebar, kotak);
    const tinggiIsi = f.baris.length * f.lh;
    const y0 = atas + Math.max(0, (kotak - tinggiIsi) / 2);

    // Tanda kutip dekoratif
    ctx.fillStyle = tm.aksen; ctx.globalAlpha = o.tema === 'merah' ? 0.5 : 1;
    ctx.font = '700 180px ' + SERIF; ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', m - 8, Math.max(190, y0 - 28));
    ctx.globalAlpha = 1;

    // Isi
    ctx.fillStyle = tm.teks; ctx.font = '500 ' + f.ukuran + 'px ' + SERIF; ctx.textAlign = 'left';
    f.baris.forEach((b, i) => ctx.fillText(b, m, y0 + f.ukuran + i * f.lh));

    // Garis tipis + penulis
    const yg = H - bawah + 70;
    ctx.strokeStyle = tm.garis; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m, yg); ctx.lineTo(W - m, yg); ctx.stroke();
    let yp = yg + 78;
    if (o.nama) {
      ctx.fillStyle = tm.teks; ctx.font = '700 44px ' + SANS;
      ctx.fillText(ellipsis(ctx, o.nama, lebar), m, yp); yp += 54;
      if (o.username) { ctx.fillStyle = tm.redup; ctx.font = '400 34px ' + SANS; ctx.fillText('@' + o.username, m, yp); }
    }
    if (o.tanggal) {
      ctx.fillStyle = tm.redup; ctx.font = '400 34px ' + SANS; ctx.textAlign = 'right';
      ctx.fillText(o.tanggal, W - m, o.nama ? yg + 78 : yp);
      ctx.textAlign = 'left';
    }

    // Merek
    ctx.fillStyle = tm.aksen; ctx.beginPath(); ctx.arc(m + 12, H - 100, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tm.teks; ctx.font = '700 40px ' + SERIF;
    ctx.fillText('Jurkon', m + 40, H - 87);
    ctx.fillStyle = tm.redup; ctx.font = '400 30px ' + SANS; ctx.textAlign = 'right';
    ctx.fillText('jurkon.my.id', W - m, H - 90);
    ctx.textAlign = 'left';
    return cv;
  }

  function ellipsis(ctx, s, lebar) {
    if (ctx.measureText(s).width <= lebar) return s;
    const a = Array.from(s);
    while (a.length > 1 && ctx.measureText(a.join('') + '…').width > lebar) a.pop();
    return a.join('') + '…';
  }

  function blob(cv) { return new Promise((ok, gagal) => cv.toBlob(b => b ? ok(b) : gagal(new Error('toBlob')), 'image/png')); }

  function dialog() {
    let d = document.getElementById('kartuDlg');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'kartuDlg'; d.className = 'pub-dlg kartu-dlg';
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => { const im = d.querySelector('.kartu-pratinjau img'); if (im && im.src.startsWith('blob:')) URL.revokeObjectURL(im.src); });
      document.body.appendChild(d);
    }
    return d;
  }

  function pilihan(nama, daftar, aktif, labelFn, aria) {
    return '<div class="kartu-grup" role="radiogroup" aria-label="' + esc(aria) + '">' + daftar.map(k =>
      '<button type="button" role="radio" aria-checked="' + (k === aktif) + '" data-' + nama + '="' + k + '"' + (nama === 'tema' ? ' class="kartu-tema ' + k + '"' : '') + '>' + esc(labelFn(k)) + '</button>').join('') + '</div>';
  }

  async function buka(post, tombol) {
    const idPost = post.dataset.id;
    // Teks asli diambil dari tombol (bukan dari tampilan), supaya kartu tautan tidak ikut tertulis sebagai "Spotify · Album"
    const teks = String(tombol.dataset.isi || '').trim();
    if (!teks) return;
    const namaEl = post.querySelector('.nama'), userEl = post.querySelector('.user');
    const dasar = {
      teks, nama: namaEl ? namaEl.textContent.trim() : '', username: userEl ? userEl.textContent.replace(/^@/, '').trim() : '',
      tanggal: '', tema: 'kertas', format: 'story'
    };
    let simpan = '';
    try { simpan = localStorage.getItem('kartuPilihan') || ''; } catch (e) {}
    try { const s = JSON.parse(simpan || '{}'); if (TEMA[s.tema]) dasar.tema = s.tema; if (FORMAT[s.format]) dasar.format = s.format; } catch (e) {}
    const tampilNama = { v: true }, tampilTgl = { v: true };
    const dt = tombol.dataset.tgl;
    dasar.tanggal = dt ? new Date(dt).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    const d = dialog();
    d.innerHTML = '<h3>' + esc(t('kartu.judul')) + '</h3><p class="kartu-info">' + esc(t('kartu.info')) + '</p>' +
      '<div class="kartu-pratinjau" aria-live="polite"><span class="kartu-muat">' + esc(t('umum.memuat')) + '</span></div>' +
      pilihan('tema', Object.keys(TEMA), dasar.tema, k => t(KUNCI[k]), t('kartu.tema')) +
      pilihan('format', Object.keys(FORMAT), dasar.format, k => t(KUNCI[k]), t('kartu.format')) +
      '<label class="pub-cek"><input type="checkbox" id="kartuNama" checked><span>' + esc(t('kartu.tampilNama')) + '</span></label>' +
      '<div class="pub-galat" id="kartuGalat" role="alert"></div>' +
      '<div class="pub-aksi"><button type="button" class="btn garis" id="kartuTutup">' + esc(t('pub.tutup')) + '</button>' +
      '<button type="button" class="btn garis" id="kartuUnduh">' + esc(t('kartu.unduh')) + '</button>' +
      '<button type="button" class="btn" id="kartuBagi">' + esc(t('pub.bagikan')) + '</button></div>';
    if (!d.open) d.showModal();

    const galat = d.querySelector('#kartuGalat'), box = d.querySelector('.kartu-pratinjau');
    let terakhir = null, nomor = 0;
    async function gambarUlang() {
      const n = ++nomor;
      try {
        // Pastikan huruf serif sudah siap sebelum digambar; bila tidak ada, huruf cadangan dipakai
        if (document.fonts && document.fonts.load) { try { await document.fonts.load('500 40px ' + SERIF); } catch (e) {} }
        const cv = gambar({ ...dasar, nama: tampilNama.v ? dasar.nama : '', username: tampilNama.v ? dasar.username : '', tanggal: tampilTgl.v ? dasar.tanggal : '' });
        const b = await blob(cv);
        if (n !== nomor) return;
        terakhir = b;
        const lama = box.querySelector('img'); if (lama && lama.src.startsWith('blob:')) URL.revokeObjectURL(lama.src);
        box.innerHTML = '<img alt="' + esc(t('kartu.alt')) + '" src="' + URL.createObjectURL(b) + '">';
        box.dataset.format = dasar.format;
        galat.textContent = '';
      } catch (e) { galat.textContent = t('kartu.gagal'); }
    }
    d.querySelectorAll('[data-tema],[data-format]').forEach(b => b.onclick = () => {
      const k = b.dataset.tema ? 'tema' : 'format';
      dasar[k] = b.dataset[k];
      b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      try { localStorage.setItem('kartuPilihan', JSON.stringify({ tema: dasar.tema, format: dasar.format })); } catch (e) {}
      gambarUlang();
    });
    d.querySelector('#kartuNama').onchange = e => { tampilNama.v = e.target.checked; gambarUlang(); };
    d.querySelector('#kartuTutup').onclick = () => d.close();
    const berkas = () => new File([terakhir], 'jurkon-catatan-' + String(idPost).slice(0, 8) + '.png', { type: 'image/png' });
    d.querySelector('#kartuUnduh').onclick = () => {
      if (!terakhir) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(terakhir); a.download = berkas().name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    d.querySelector('#kartuBagi').onclick = async () => {
      if (!terakhir) return;
      const f = berkas();
      try {
        if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      d.querySelector('#kartuUnduh').click();                  // perangkat tanpa lembar bagikan berkas (mis. desktop): unduh saja
      galat.style.color = 'var(--redup)'; galat.textContent = t('kartu.diunduh');
    };
    gambarUlang();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.btn-kartu');
    if (!b) return;
    e.preventDefault();
    const post = b.closest('.post');
    if (post) buka(post, b);
  });

  window.kartuCatatan = { gambar, bungkus };   // dipakai untuk pengujian
})();

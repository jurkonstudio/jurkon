// Landing page Jurkon. Teks, pengumuman, angka, dan status pendaftaran diambil dari Supabase
// lewat landing_publik() (sql/020_panel_admin.sql), yang dibuka untuk pengunjung tanpa login.
// Bila migrasi belum dijalankan atau jaringan gagal, halaman tetap tampil dengan teks bawaan.
(async () => {
  // Bahasa halaman (data-bahasa pada <body>) menentukan teks tombol dan format angka.
  // Teks dari panel admin berbahasa Indonesia, jadi hanya menimpa halaman Indonesia.
  const kode = document.body.dataset.bahasa || 'id';
  const TS = window.LP_TEKS || {};
  const tk = TS[kode] || TS.id || {};
  const s = (k, d) => tk[k] || d;
  const lokal = tk.locale || 'id-ID';
  const asli = kode === 'id';
  const set = (k, v) => { if (v) document.querySelectorAll('[data-isi="' + k + '"]').forEach(el => { el.textContent = v; }); };

  const [sesi, hasil] = await Promise.all([
    db.auth.getSession().then(r => r.data.session).catch(() => null),
    db.rpc('landing_publik').then(r => r.error ? null : r.data).catch(() => null)
  ]);

  // Angka corong tanpa data pribadi (js/corong.js; hanya untuk yang belum masuk)
  if (!sesi && window.catatCorong) catatCorong('landing', kode);

  // Tombol: pengunjung masuk -> ke beranda
  if (sesi) {
    $('#ctaUtama').textContent = s('bukaBeranda', 'Buka beranda'); $('#ctaUtama').href = '/index.html';
    $('#ctaAkhir').textContent = s('bukaBeranda', 'Buka beranda'); $('#ctaAkhir').href = '/index.html';
    $('#navMasuk').textContent = s('beranda', 'Beranda'); $('#navMasuk').href = '/index.html';
    $('#penutupJudul').textContent = s('selamatDatang', 'Selamat datang kembali.');
  }
  if (!hasil) return;

  set('brand_nama', hasil.brand_nama);
  set('hero_judul', hasil.hero_judul);
  set('hero_sub', hasil.hero_sub);
  if (asli && hasil.hero_judul) document.title = (hasil.brand_nama || 'Jurkon') + ' · ' + hasil.hero_judul;

  if (hasil.pengumuman) { const el = $('#pengumuman'); el.textContent = hasil.pengumuman; if (!asli) el.lang = 'id'; el.hidden = false; }

  if (!hasil.pendaftaran_buka && !sesi) {
    $('#catatanDaftar').hidden = false;
    $('#ctaUtama').textContent = s('masuk', 'Masuk'); $('#ctaAkhir').textContent = s('masuk', 'Masuk');
    $('#penutupJudul').textContent = s('sampaiJumpa', 'Sampai jumpa lagi.');
  }

  if (hasil.kontak_email && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(hasil.kontak_email)) {
    const k = $('#kontak'); k.href = 'mailto:' + hasil.kontak_email; k.hidden = false;
  }

  // Angka: hitung naik pelan (dilewati bila pengguna meminta gerak dikurangi)
  const kurangiGerak = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#angka').hidden = false;
  document.querySelectorAll('[data-hitung]').forEach(el => {
    const target = Number(hasil[el.dataset.hitung]) || 0;
    if (kurangiGerak || target < 2) { el.textContent = target.toLocaleString(lokal); return; }
    const mulai = performance.now(), durasi = 900;
    const langkah = now => {
      const p = Math.min(1, (now - mulai) / durasi);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString(lokal);
      if (p < 1) requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  });
})();

// Interaksi tambahan landing: contoh tulis, tombol bagikan, animasi muncul saat digulir.
// Dipisah ke blok sendiri supaya galat di sini tidak mengganggu pemuatan data di atas.
(() => {
  try {
    const q = id => document.getElementById(id);

    // 1) Contoh menulis: hitung sisa karakter
    const t = q('demoTulis'), h = q('demoHitung');
    if (t && h) t.addEventListener('input', () => {
      const sisa = 250 - t.value.length;
      h.textContent = sisa; h.classList.toggle('habis', sisa <= 20);
    });

    // 2) Bagikan
    const tk = (window.LP_TEKS || {})[document.body.dataset.bahasa || 'id'] || (window.LP_TEKS || {}).id || {};
    const s = (k, d) => tk[k] || d;
    const url = tk.url || 'https://jurkon.my.id/landing.html';
    const teks = s('shareTeks', 'Aku nemu Jurkon, sosmed buatan orang Indonesia. Nulisnya cuma 250 karakter, feed ada ujungnya, dan bisa titip catatan buat diri sendiri setahun lagi.');
    const e = encodeURIComponent;
    const set = (id, href) => { const a = q(id); if (a) a.href = href; };
    set('bagiWa', 'https://wa.me/?text=' + e(teks + ' ' + url));
    set('bagiTg', 'https://t.me/share/url?url=' + e(url) + '&text=' + e(teks));
    set('bagiX', 'https://twitter.com/intent/tweet?text=' + e(teks) + '&url=' + e(url));
    const info = q('bagiInfo'), salin = q('bagiSalin');
    if (salin) salin.addEventListener('click', async () => {
      try {
        if (navigator.share) { await navigator.share({ title: s('shareJudul', 'Jurkon'), text: teks, url }); return; }
        await navigator.clipboard.writeText(url);
        info.textContent = s('disalin', 'Tautan disalin. Tinggal tempel ke temanmu.');
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        info.textContent = s('salinManual', 'Salin manual: ') + url;
      }
    });

    // Klik ajakan mendaftar/masuk dihitung sebagai satu langkah "mulai" (angka saja)
    ['ctaUtama', 'ctaAkhir', 'demoKirim'].forEach(id => { const a = q(id); if (a) a.addEventListener('click', () => { if (window.catatCorong) catatCorong('landing_mulai', document.body.dataset.bahasa || 'id'); }); });

    // 3) Muncul pelan saat digulir (dilewati bila gerak dikurangi)
    const kurangi = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = document.querySelectorAll('.lp-sorot-kartu, .lp-grid article, .lp-langkah li, .lp-cincin');
    if (kurangi || !('IntersectionObserver' in window)) { document.querySelectorAll('.lp-cincin').forEach(x => x.classList.add('tampil')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('tampil'); io.unobserve(en.target); }
    }), { threshold: .15 });
    target.forEach(x => { if (!x.classList.contains('lp-cincin')) x.classList.add('lp-sembunyi'); io.observe(x); });
  } catch (err) { /* hiasan saja; halaman tetap jalan */ }
})();

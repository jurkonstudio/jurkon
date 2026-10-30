// Landing page Jurkon. Teks, pengumuman, angka, dan status pendaftaran diambil dari Supabase
// lewat landing_publik() (sql/020_panel_admin.sql), yang dibuka untuk pengunjung tanpa login.
// Bila migrasi belum dijalankan atau jaringan gagal, halaman tetap tampil dengan teks bawaan.
(async () => {
  const set = (k, v) => { if (v) document.querySelectorAll('[data-isi="' + k + '"]').forEach(el => { el.textContent = v; }); };

  const [sesi, hasil] = await Promise.all([
    db.auth.getSession().then(r => r.data.session).catch(() => null),
    db.rpc('landing_publik').then(r => r.error ? null : r.data).catch(() => null)
  ]);

  // Tombol: pengunjung masuk -> ke beranda
  if (sesi) {
    $('#ctaUtama').textContent = 'Buka beranda'; $('#ctaUtama').href = 'index.html';
    $('#ctaAkhir').textContent = 'Buka beranda'; $('#ctaAkhir').href = 'index.html';
    $('#navMasuk').textContent = 'Beranda'; $('#navMasuk').href = 'index.html';
    $('#penutupJudul').textContent = 'Selamat datang kembali.';
  }
  if (!hasil) return;

  set('brand_nama', hasil.brand_nama);
  set('hero_judul', hasil.hero_judul);
  set('hero_sub', hasil.hero_sub);
  if (hasil.hero_judul) document.title = (hasil.brand_nama || 'Jurkon') + ' · ' + hasil.hero_judul;

  if (hasil.pengumuman) { const el = $('#pengumuman'); el.textContent = hasil.pengumuman; el.hidden = false; }

  if (!hasil.pendaftaran_buka && !sesi) {
    $('#catatanDaftar').hidden = false;
    $('#ctaUtama').textContent = 'Masuk'; $('#ctaAkhir').textContent = 'Masuk';
    $('#penutupJudul').textContent = 'Sampai jumpa lagi.';
  }

  if (hasil.kontak_email && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(hasil.kontak_email)) {
    const k = $('#kontak'); k.href = 'mailto:' + hasil.kontak_email; k.hidden = false;
  }

  // Angka: hitung naik pelan (dilewati bila pengguna meminta gerak dikurangi)
  const kurangiGerak = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#angka').hidden = false;
  document.querySelectorAll('[data-hitung]').forEach(el => {
    const target = Number(hasil[el.dataset.hitung]) || 0;
    if (kurangiGerak || target < 2) { el.textContent = target.toLocaleString('id-ID'); return; }
    const mulai = performance.now(), durasi = 900;
    const langkah = now => {
      const p = Math.min(1, (now - mulai) / durasi);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('id-ID');
      if (p < 1) requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  });
})();

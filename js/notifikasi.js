(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const el = $('#daftar'), tombolSemua = $('#semua'), baru = $('#baru');
  const IKON_JENIS = {
    suka: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.8 4.5 7.2 4.5c1.9 0 3.700 1 4.800 2.700 1.100-1.700 2.900-2.700 4.800-2.700 3.400 0 5.600 3.400 4.400 6.700-1.700 4.700-9.200 9.300-9.200 9.300z"/></svg>',
    balasan: IKON.balas,
    ikuti: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/></svg>',
    pesan: IKON.pesan
  };

  function baris(n) {
    const k = Notif.kalimat(n);
    const a = n.actor || {};
    return `<div class="notif-baris" role="listitem"><a class="notif ${n.dibaca ? '' : 'baru'}" href="${esc(k.href)}" data-id="${esc(n.id)}">
      <span class="notif-ava">${avatar(a.nama || a.username, 44)}<i class="notif-jenis j-${esc(n.jenis)}" aria-hidden="true">${IKON_JENIS[n.jenis] || ''}</i></span>
      <span class="notif-isi"><span class="notif-teks">${k.html}</span>
        ${k.cuplikan ? `<span class="notif-cuplikan">${esc(k.cuplikan)}</span>` : ''}
        <span class="notif-waktu">${n.dibaca ? '' : '<span class="sr">Belum dibaca. </span>'}${waktu(n.created_at)}</span></span>
      ${n.dibaca ? '' : '<span class="notif-titik" aria-hidden="true"></span>'}</a></div>`;
  }

  const daf = daftarBerhalaman(el, async sebelum => {
    const { data, error } = await Notif.terbaru(HALAMAN, sebelum);
    return { data, error, limit: HALAMAN };
  }, () => kosong('pesan', 'Belum ada notifikasi', 'Suka, balasan, pengikut baru, dan pesan untukmu akan muncul di sini.', 'explore.html', 'Cari orang'),
  saya, { render: baris, item: '.notif' });

  function perbaruiTombol() { tombolSemua.hidden = !(Notif.total > 0); }
  Notif.pada(perbaruiTombol);
  perbaruiTombol();

  // Ketuk item: tandai dibaca dulu (maks. 0,7 dtk) lalu buka tujuannya
  el.addEventListener('click', e => {
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
  });

  tombolSemua.onclick = async () => {
    tombolSemua.disabled = true;
    const { error } = await Notif.tandai(null);
    tombolSemua.disabled = false;
    if (error) { alert('Gagal menandai: ' + pesanGalat(error)); return; }
    el.querySelectorAll('a.notif.baru').forEach(a => { a.classList.remove('baru'); const t = a.querySelector('.notif-titik'); if (t) t.remove(); });
  };

  // Notifikasi masuk saat halaman terbuka: tawarkan muat ulang, jangan menggeser daftar yang sedang dibaca
  Notif.padaBaru(() => {
    if (baru.firstChild) return;
    baru.innerHTML = '<button class="pill-baru" type="button">Ada notifikasi baru \u00b7 ketuk untuk memuat</button>';
    baru.firstChild.onclick = () => { baru.innerHTML = ''; window.scrollTo(0, 0); daf.muat(); };
  });

  daf.muat();
})();

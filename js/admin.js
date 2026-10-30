// Panel admin Jurkon. Semua aksi lewat fungsi database admin_* (sql/020_panel_admin.sql),
// yang memeriksa is_admin() di server. Pemeriksaan di layar ini hanya untuk tampilan.
(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const isiEl = $('#isi'), judulEl = $('#judul'), aksiAtas = $('#aksiAtas');

  const { data: adm } = await db.from('admins').select('user_id').eq('user_id', saya.id).maybeSingle();
  if (!adm) {
    $('#menu').hidden = true;
    judulEl.textContent = 'Admin';
    isiEl.innerHTML = '<div class="kosong">Halaman ini khusus admin.</div>';
    return;
  }

  // ---------------------------------------------------------------- bantu
  const rpc = async (fn, args) => {
    const { data, error } = await db.rpc(fn, args || {});
    if (error) throw new Error(error.message);
    return data;
  };
  const angka = n => Number(n || 0).toLocaleString('id-ID');
  const tgl = iso => iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const tglJam = iso => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const wkt = iso => {
    if (!iso) return '-';
    const d = (Date.now() - new Date(iso)) / 1000;
    if (d < 60) return 'baru saja';
    if (d < 3600) return Math.floor(d / 60) + ' mnt lalu';
    if (d < 86400) return Math.floor(d / 3600) + ' jam lalu';
    if (d < 2592000) return Math.floor(d / 86400) + ' hari lalu';
    return tgl(iso);
  };
  const fotoUrl = f => !f ? '' : /^(https?:|blob:|data:)/.test(f) ? f
    : SUPABASE_URL + '/storage/v1/object/public/avatar/' + String(f).split('/').map(encodeURIComponent).join('/');
  const ava = (username, foto) => {
    const n = username || '?'; let h = 0;
    for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `<span class="adm-ava" style="background:hsl(${h} 50% 42%)">${esc(Array.from(n)[0].toUpperCase())}${foto ? `<img src="${esc(fotoUrl(foto))}" alt="" loading="lazy">` : ''}</span>`;
  };
  document.addEventListener('error', e => {
    const x = e.target;
    if (x && x.tagName === 'IMG' && x.closest && x.closest('.adm-ava')) x.remove();
  }, true);

  let tToast;
  function toast(pesan, galat) {
    const el = $('#toast');
    el.textContent = pesan; el.className = 'adm-toast' + (galat ? ' galat' : ''); el.hidden = false;
    clearTimeout(tToast); tToast = setTimeout(() => { el.hidden = true; }, galat ? 6500 : 3200);
  }

  // Dialog konfirmasi. Mengembalikan null bila dibatalkan; teks isian (boleh '') atau true bila disetujui.
  // Tombol OK ditaruh pertama di DOM (CSS membaliknya) agar Enter = OK, bukan Batal.
  function tanya({ judul, teks = '', input = null, ok = 'Lanjut', bahaya = false, harus = null }) {
    const dlg = $('#dlg');
    return new Promise(res => {
      dlg.innerHTML = `<form method="dialog"><h3>${esc(judul)}</h3><p>${esc(teks)}</p>
        ${input !== null ? `<input type="text" id="dlgIn" maxlength="300" placeholder="${esc(input)}" autocomplete="off" autocapitalize="none" spellcheck="false">` : ''}
        <div class="tombol"><button class="btn${bahaya ? ' bahaya' : ''}" value="ok" id="dlgOk">${esc(ok)}</button>
        <button class="btn garis" value="batal" formnovalidate>Batal</button></div></form>`;
      const inp = $('#dlgIn', dlg), okb = $('#dlgOk', dlg);
      if (harus !== null && inp) {
        okb.disabled = true;
        inp.addEventListener('input', () => { okb.disabled = inp.value.trim().toLowerCase() !== String(harus).toLowerCase(); });
      }
      dlg.addEventListener('close', () => res(dlg.returnValue === 'ok' ? (inp ? inp.value.trim() : true) : null), { once: true });
      dlg.returnValue = '';
      dlg.showModal();
      if (inp) inp.focus();
    });
  }

  // Jalankan aksi sambil mengunci tombol; true bila berhasil.
  async function jalankan(btn, fn, sukses) {
    btn.disabled = true;
    try { await fn(); if (sukses) toast(sukses); return true; }
    catch (e) { toast('Gagal: ' + e.message, true); btn.disabled = false; return false; }
  }

  async function segarkanLencana() {
    const { count } = await db.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'baru');
    const el = $('#lencanaLaporan');
    el.textContent = count > 99 ? '99+' : String(count || 0);
    el.hidden = !count;
  }

  const kosongHtml = (judul, teks) => `<div class="kosong"><b>${esc(judul)}</b><br>${esc(teks || '')}</div>`;
  const aksi = {};   // data-act -> fungsi(tombol)
  isiEl.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (b && aksi[b.dataset.act]) aksi[b.dataset.act](b, e);
  });

  // ---------------------------------------------------------------- router
  let gen = 0;
  const aktif = g => g === gen;
  const TAB = {
    ringkasan: { judul: 'Ringkasan', v: vRingkasan },
    laporan:   { judul: 'Laporan', v: vLaporan },
    pengguna:  { judul: 'Pengguna', v: vPengguna },
    posting:   { judul: 'Posting', v: vPosting },
    sorotan:   { judul: 'Sorotan Jelajah', v: vSorotan },
    situs:     { judul: 'Landing & situs', v: vSitus },
    admin:     { judul: 'Admin', v: vAdmin },
    log:       { judul: 'Jejak admin', v: vLog }
  };
  async function tampil() {
    const nama = TAB[location.hash.slice(1)] ? location.hash.slice(1) : 'ringkasan';
    document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('aktif', a.dataset.tab === nama));
    judulEl.textContent = TAB[nama].judul;
    aksiAtas.innerHTML = '';
    const g = ++gen;
    isiEl.innerHTML = '<div class="kosong">Memuat…</div>';
    try { await TAB[nama].v(g); }
    catch (e) {
      if (aktif(g)) isiEl.innerHTML = `<div class="kosong">Gagal memuat: ${esc(e.message)}<br><small>Pastikan <code>sql/020_panel_admin.sql</code> sudah dijalankan di Supabase.</small></div>`;
    }
    segarkanLencana().catch(() => {});
  }
  window.addEventListener('hashchange', tampil);

  // ---------------------------------------------------------------- Ringkasan
  function grafik(seri, k) {
    const W = 560, H = 170, pb = 22, pt = 18, n = seri.length, lb = W / n;
    const maks = Math.max(1, ...seri.map(x => x[k]));
    let b = '';
    seri.forEach((x, i) => {
      const v = x[k], h = Math.round((H - pb - pt) * v / maks), xx = i * lb + lb * 0.18, w = lb * 0.64, y = H - pb - h;
      b += `<rect class="batang" x="${xx.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${Math.max(h, v ? 2 : 0)}" rx="3"></rect>`;
      if (v) b += `<text class="nilai" x="${(xx + w / 2).toFixed(1)}" y="${y - 4}" text-anchor="middle">${v}</text>`;
      const [, m, d] = x.hari.split('-');
      if (i % 2 === 1) b += `<text x="${(xx + w / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d}/${m}</text>`;
    });
    return `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik 14 hari terakhir"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}"></line>${b}</svg>`;
  }
  async function vRingkasan(g) {
    const s = await rpc('admin_statistik');
    if (!aktif(g)) return;
    const K = [
      ['Pengguna', s.pengguna, 'pengguna'], ['Baru 7 hari', s.pengguna_7h], ['Aktif 24 jam', s.aktif_24j],
      ['Catatan', s.posting, 'posting'], ['Balasan', s.balasan], ['Pesan', s.pesan], ['Suka', s.suka],
      ['Laporan baru', s.laporan_baru, 'laporan', s.laporan_baru > 0], ['Dibekukan', s.dibekukan, 'pengguna'],
      ['Email belum verifikasi', s.belum_verifikasi], ['Disorot', s.disorot, 'sorotan'], ['Admin', s.admin, 'admin']
    ];
    const kartu = K.map(([l, v, tab, waspada]) => {
      const dalam = `<div class="angka">${angka(v)}</div><div class="label">${esc(l)}</div>`;
      return tab ? `<a class="stat${waspada ? ' waspada' : ''}" href="#${tab}">${dalam}</a>` : `<div class="stat">${dalam}</div>`;
    }).join('');
    const SERI = { pengguna: 'Pengguna baru', posting: 'Posting & balasan', pesan: 'Pesan' };
    let k = 'pengguna';
    const gambar = () => {
      $('#grafikIsi').innerHTML = grafik(s.seri, k);
      document.querySelectorAll('[data-act=seri]').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
    };
    isiEl.innerHTML = `<div class="grid-stat">${kartu}</div>
      <div class="kartu" style="margin-top:16px"><h2>14 hari terakhir</h2><p class="ket">Per hari, zona WIB.</p>
      <div class="seg">${Object.entries(SERI).map(([id, l]) => `<button type="button" data-act="seri" data-k="${id}">${esc(l)}</button>`).join('')}</div>
      <div id="grafikIsi"></div></div>`;
    aksi.seri = b => { k = b.dataset.k; gambar(); };
    gambar();
  }

  // ---------------------------------------------------------------- Laporan
  let fLap = 'baru';
  async function vLaporan(g) {
    const { data, error } = await db.from('reports')
      .select('id,alasan,created_at,status,post_id,profiles(username),posts(id,content,user_id,profiles(username))')
      .eq('status', fLap).order('created_at', { ascending: false }).limit(60);
    if (!aktif(g)) return;
    if (error) throw new Error(error.message);
    const seg = `<div class="seg"><button type="button" data-act="fLap" data-k="baru" aria-pressed="${fLap === 'baru'}">Baru</button>
      <button type="button" data-act="fLap" data-k="selesai" aria-pressed="${fLap === 'selesai'}">Selesai</button></div>`;
    const daftar = !data.length
      ? kosongHtml(fLap === 'baru' ? 'Tidak ada laporan baru' : 'Belum ada laporan selesai', fLap === 'baru' ? 'Semua laporan sudah ditangani.' : '')
      : data.map(r => {
        const p = r.posts, penulis = p?.profiles?.username || '?';
        const tombol = fLap === 'baru'
          ? `<button type="button" class="btn kecil garis" data-act="lapSelesai" data-r="${r.id}">Tandai selesai</button>
             ${p ? `<a class="btn kecil garis" href="detail.html?id=${esc(p.id)}" target="_blank" rel="noopener">Buka posting</a>
             <button type="button" class="btn kecil garis bahaya" data-act="lapHapus" data-p="${esc(p.id)}">Hapus posting</button>
             <button type="button" class="btn kecil garis bahaya" data-act="lapBekukan" data-u="${esc(p.user_id)}" data-n="${esc(penulis)}" data-r="${r.id}">Bekukan penulis</button>` : ''}`
          : `<button type="button" class="btn kecil garis" data-act="lapBuka" data-r="${r.id}">Buka kembali</button>`;
        return `<article class="baris-adm"><div class="badan">
          <div class="sub">Dilaporkan oleh @${esc(r.profiles?.username || '?')} · ${wkt(r.created_at)}</div>
          <div class="teks"><b>@${esc(penulis)}</b>: ${esc(p?.content || '(posting sudah dihapus)')}</div>
          <div class="alasan">Alasan: ${esc(r.alasan || '-')}</div>
          <div class="aksi-adm">${tombol}</div></div></article>`;
      }).join('');
    isiEl.innerHTML = seg + daftar;
  }
  aksi.fLap = b => { fLap = b.dataset.k; tampil(); };
  aksi.lapSelesai = async b => { if (await jalankan(b, () => rpc('admin_tangani_laporan', { p_id: b.dataset.r, p_status: 'selesai' }), 'Laporan selesai')) tampil(); };
  aksi.lapBuka = async b => { if (await jalankan(b, () => rpc('admin_tangani_laporan', { p_id: b.dataset.r, p_status: 'baru' }), 'Laporan dibuka kembali')) tampil(); };
  aksi.lapHapus = async b => {
    const a = await tanya({ judul: 'Hapus posting ini?', teks: 'Dihapus untuk semua orang dan tidak bisa dikembalikan.', input: 'Alasan (opsional, masuk jejak admin)', ok: 'Hapus', bahaya: true });
    if (a === null) return;
    if (await jalankan(b, () => rpc('admin_hapus_posting', { p_id: b.dataset.p, p_alasan: a || null }), 'Posting dihapus')) tampil();
  };
  aksi.lapBekukan = async b => {
    const a = await tanya({ judul: `Bekukan @${b.dataset.n}?`, teks: 'Ia tidak bisa posting, kirim pesan, suka, atau mengikuti, dan dikeluarkan dari semua perangkat.', input: 'Alasan (masuk jejak admin)', ok: 'Bekukan', bahaya: true });
    if (a === null) return;
    if (await jalankan(b, () => rpc('admin_bekukan_akun', { target: b.dataset.u, p_alasan: a || ('Dari laporan ' + b.dataset.r) }), 'Akun dibekukan')) tampil();
  };

  // ---------------------------------------------------------------- Pengguna
  let qPengguna = '';
  const daftarU = {};
  function barisPengguna(u) {
    daftarU[u.id] = u;
    const lencana = [
      u.adalah_admin ? '<span class="lencana aksen">Admin</span>' : '',
      u.dibekukan ? '<span class="lencana merah">Dibekukan</span>' : '',
      !u.terverifikasi ? '<span class="lencana">Email belum diverifikasi</span>' : '',
      u.laporan_baru > 0 ? `<span class="lencana merah">${u.laporan_baru} laporan baru</span>` : ''
    ].join(' ');
    const t = [];
    t.push(`<a class="btn kecil garis" href="profil.html?u=${esc(u.username)}" target="_blank" rel="noopener">Profil</a>`);
    if (u.dibekukan) t.push(`<button type="button" class="btn kecil garis" data-act="bukaU" data-id="${u.id}">Buka pembekuan</button>`);
    else if (!u.adalah_admin) t.push(`<button type="button" class="btn kecil garis bahaya" data-act="bekukanU" data-id="${u.id}">Bekukan</button>`);
    if (!u.adalah_admin && !u.dibekukan && u.terverifikasi && u.email) t.push(`<button type="button" class="btn kecil garis" data-act="jadiAdmin" data-id="${u.id}">Jadikan admin</button>`);
    if (!u.adalah_admin && u.id !== saya.id) t.push(`<button type="button" class="btn kecil garis bahaya" data-act="hapusU" data-id="${u.id}">Hapus akun</button>`);
    return `<article class="baris-adm">${ava(u.username, u.foto)}<div class="badan">
      <div class="atas"><span class="nama">${esc(u.nama || u.username)}</span><span class="sub">@${esc(u.username)}</span>${lencana}</div>
      <div class="sub">${esc(u.email || '-')} · bergabung ${tgl(u.dibuat)} · masuk terakhir ${u.masuk_terakhir ? wkt(u.masuk_terakhir) : 'belum pernah'} · ${angka(u.jml_posting)} posting</div>
      ${u.dibekukan ? `<div class="alasan">Alasan beku: ${esc(u.alasan_beku || '-')}</div>` : ''}
      <div class="aksi-adm">${t.join('')}</div></div></article>`;
  }
  async function vPengguna(g) { await daftarCari(g, 'admin_cari_pengguna', barisPengguna, 'Cari username, nama, email, atau ID…', () => qPengguna, v => { qPengguna = v; }, 'Tidak ada pengguna yang cocok.'); }

  // Daftar dengan pencarian + "Muat lagi", dipakai Pengguna dan Posting
  async function daftarCari(g, fn, baris, placeholder, ambilQ, simpanQ, teksKosong) {
    const BATAS = 30;
    isiEl.innerHTML = `<div class="bar-alat"><input type="search" id="cari" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="100"></div>
      <div id="hasil"></div><div class="bar-alat" id="lagi" hidden style="justify-content:center"><button type="button" class="btn garis" id="lagiBtn">Muat lagi</button></div>`;
    const cari = $('#cari'), hasil = $('#hasil'), lagi = $('#lagi');
    cari.value = ambilQ();
    let mulai = 0, urut = 0, tm;
    async function muat(ulang) {
      const saya_ = ++urut;
      if (ulang) { mulai = 0; hasil.innerHTML = '<div class="kosong">Memuat…</div>'; lagi.hidden = true; }
      try {
        const rows = await rpc(fn, { p_cari: ambilQ(), p_batas: BATAS, p_mulai: mulai });
        if (saya_ !== urut || !aktif(g)) return;
        if (ulang) hasil.innerHTML = rows.length ? '' : kosongHtml(teksKosong);
        hasil.insertAdjacentHTML('beforeend', rows.map(baris).join(''));
        mulai += rows.length;
        lagi.hidden = rows.length < BATAS;
      } catch (e) { if (aktif(g)) hasil.innerHTML = kosongHtml('Gagal memuat', e.message); }
    }
    cari.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { simpanQ(cari.value.trim()); muat(true); }, 300); });
    $('#lagiBtn').addEventListener('click', () => muat(false));
    await muat(true);
  }
  aksi.bekukanU = async b => {
    const u = daftarU[b.dataset.id];
    const a = await tanya({ judul: `Bekukan @${u.username}?`, teks: 'Ia tidak bisa posting, kirim pesan, suka, atau mengikuti, dan dikeluarkan dari semua perangkat.', input: 'Alasan (masuk jejak admin)', ok: 'Bekukan', bahaya: true });
    if (a === null) return;
    if (await jalankan(b, () => rpc('admin_bekukan_akun', { target: u.id, p_alasan: a || null }), 'Akun dibekukan')) tampil();
  };
  aksi.bukaU = async b => {
    const u = daftarU[b.dataset.id];
    if (await tanya({ judul: `Buka pembekuan @${u.username}?`, ok: 'Buka' }) === null) return;
    if (await jalankan(b, () => rpc('admin_buka_pembekuan', { target: u.id }), 'Pembekuan dibuka')) tampil();
  };
  aksi.jadiAdmin = async b => {
    const u = daftarU[b.dataset.id];
    if (await tanya({ judul: `Jadikan @${u.username} admin?`, teks: 'Admin bisa membaca email pengguna, menghapus posting dan akun, membekukan akun, dan mengubah landing.', ok: 'Jadikan admin' }) === null) return;
    if (await jalankan(b, () => rpc('admin_tambah_admin', { p_email: u.email }), `@${u.username} sekarang admin`)) tampil();
  };
  aksi.hapusU = async b => {
    const u = daftarU[b.dataset.id];
    const a = await tanya({ judul: `Hapus akun @${u.username}?`, teks: 'Seluruh data akun (posting, pesan, suka, ikuti) ikut terhapus permanen dan tidak bisa dikembalikan.\nKetik username-nya untuk memastikan.', input: 'Ketik username', harus: u.username, ok: 'Hapus permanen', bahaya: true });
    if (a === null) return;
    if (await jalankan(b, () => rpc('admin_hapus_akun', { target: u.id, p_alasan: null }), 'Akun dihapus')) tampil();
  };

  // ---------------------------------------------------------------- Posting
  let qPosting = '';
  const daftarP = {};
  function barisPosting(p) {
    daftarP[p.id] = p;
    const lencana = [
      p.adalah_balasan ? '<span class="lencana">Balasan</span>' : '',
      p.disorot ? '<span class="lencana aksen">Disorot</span>' : '',
      p.laporan_baru > 0 ? `<span class="lencana merah">${p.laporan_baru} laporan baru</span>` : ''
    ].join(' ');
    return `<article class="baris-adm"><div class="badan">
      <div class="atas"><span class="nama">@${esc(p.username)}</span><span class="sub">${wkt(p.dibuat)}</span>${lencana}</div>
      <div class="teks">${esc(p.isi || '(posting ulang)')}</div>
      <div class="sub" style="margin-top:6px">dilihat ${angka(p.dilihat)} · suka ${angka(p.jml_suka)}</div>
      <div class="aksi-adm"><a class="btn kecil garis" href="detail.html?id=${esc(p.id)}" target="_blank" rel="noopener">Buka</a>
        ${p.adalah_balasan ? '' : `<button type="button" class="btn kecil garis" data-act="sorotP" data-id="${p.id}" data-v="${p.disorot ? 0 : 1}">${p.disorot ? 'Cabut sorotan' : 'Sorot'}</button>`}
        <button type="button" class="btn kecil garis bahaya" data-act="hapusP" data-id="${p.id}">Hapus</button></div></div></article>`;
  }
  async function vPosting(g) { await daftarCari(g, 'admin_cari_posting', barisPosting, 'Cari isi posting, username, atau ID…', () => qPosting, v => { qPosting = v; }, 'Tidak ada posting yang cocok.'); }
  aksi.sorotP = async b => {
    const nilai = b.dataset.v === '1';
    if (await jalankan(b, () => rpc('admin_sorot', { p_id: b.dataset.id, p_nilai: nilai }), nilai ? 'Posting disorot' : 'Sorotan dicabut')) tampil();
  };
  aksi.hapusP = async b => {
    const p = daftarP[b.dataset.id];
    const a = await tanya({ judul: `Hapus posting @${p.username}?`, teks: 'Dihapus untuk semua orang (termasuk balasannya) dan tidak bisa dikembalikan.', input: 'Alasan (opsional, masuk jejak admin)', ok: 'Hapus', bahaya: true });
    if (a === null) return;
    if (await jalankan(b, () => rpc('admin_hapus_posting', { p_id: p.id, p_alasan: a || null }), 'Posting dihapus')) tampil();
  };

  // ---------------------------------------------------------------- Sorotan
  async function vSorotan(g) {
    const { data, error } = await db.from('posts').select('id,content,created_at,dilihat,profiles(username)')
      .eq('disorot', true).order('created_at', { ascending: false }).limit(50);
    if (!aktif(g)) return;
    const daftar = error ? kosongHtml('Sorotan belum aktif', 'Jalankan migrasi 012. ' + error.message)
      : !data.length ? kosongHtml('Belum ada posting yang disorot', '')
      : data.map(p => `<article class="baris-adm"><div class="badan">
          <div class="atas"><span class="nama">@${esc(p.profiles?.username || '?')}</span><span class="sub">${wkt(p.created_at)} · dilihat ${angka(p.dilihat)}</span></div>
          <div class="teks">${esc(p.content)}</div></div>
          <button type="button" class="btn kecil garis" data-act="cabutSorot" data-id="${p.id}">Cabut</button></article>`).join('');
    isiEl.innerHTML = `<div class="kartu"><h2>Tambah sorotan</h2>
      <p class="ket">Posting dengan jumlah dilihat di atas ambang otomatis tampil di Jelajah. Di sini kamu memilih posting lain secara manual. Tempel tautan posting (detail.html?id=…) atau ID-nya. Anda juga bisa menyorot dari tab Posting.</p>
      <div class="bar-alat" style="margin:0"><input type="text" id="sorotId" aria-label="Tautan atau ID posting" placeholder="Tautan atau ID posting" autocomplete="off" autocapitalize="none" spellcheck="false">
      <button type="button" class="btn" data-act="tambahSorot">Sorot posting</button></div></div>
      <div style="margin-top:16px">${daftar}</div>`;
  }
  aksi.tambahSorot = async b => {
    const m = ($('#sorotId').value || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!m) { toast('ID posting tidak ditemukan. Tempel tautan atau ID lengkap.', true); return; }
    if (await jalankan(b, () => rpc('admin_sorot', { p_id: m[0].toLowerCase(), p_nilai: true }), 'Posting disorot')) tampil();
  };
  aksi.cabutSorot = async b => { if (await jalankan(b, () => rpc('admin_sorot', { p_id: b.dataset.id, p_nilai: false }), 'Sorotan dicabut')) tampil(); };

  // ---------------------------------------------------------------- Landing & situs
  async function vSitus(g) {
    const baris = await rpc('admin_pengaturan');
    if (!aktif(g)) return;
    const v = {}; let terakhir = null;
    baris.forEach(r => { v[r.kunci] = r.nilai; if (!terakhir || r.diubah_at > terakhir) terakhir = r.diubah_at; });
    aksiAtas.innerHTML = '<a class="btn garis kecil" href="landing.html" target="_blank" rel="noopener">Pratinjau landing ↗</a>';
    const input = (k, label, ket, maks) => `<label>${esc(label)}${ket ? `<small>${esc(ket)}</small>` : ''}<input type="text" data-k="${k}" maxlength="${maks}" value="${esc(v[k] || '')}" autocomplete="off"></label>`;
    const area = (k, label, ket) => `<label>${esc(label)}${ket ? `<small>${esc(ket)}</small>` : ''}<textarea data-k="${k}" maxlength="600">${esc(v[k] || '')}</textarea></label>`;
    const sakelar = (k, label, ket) => `<label class="sakelar"><input type="checkbox" data-k="${k}" ${v[k] === '1' ? 'checked' : ''}><span>${esc(label)}<small>${esc(ket)}</small></span></label>`;
    isiEl.innerHTML = `<form id="fSitus" class="kartu form-adm">
      <h2>Isi landing page</h2>
      ${input('brand_nama', 'Nama merek', 'Tampil di header dan footer landing.', 60)}
      ${input('hero_judul', 'Judul utama', '', 120)}
      ${area('hero_sub', 'Sub judul', 'Satu atau dua kalimat di bawah judul.')}
      ${input('kontak_email', 'Email kontak', 'Tampil di footer landing. Kosongkan untuk menyembunyikan.', 120)}
      <h2 style="margin-top:8px">Pengumuman</h2>
      ${sakelar('pengumuman_aktif', 'Tampilkan pengumuman di landing', 'Pita di bagian atas halaman landing.')}
      ${area('pengumuman', 'Teks pengumuman', '')}
      <h2 style="margin-top:8px">Pendaftaran</h2>
      ${sakelar('pendaftaran_buka', 'Pendaftaran akun baru dibuka', 'Bila dimatikan, database menolak akun baru (email maupun Google). Yang sudah punya akun tetap bisa masuk.')}
      <div class="baris" style="justify-content:space-between;margin-top:4px"><span class="hitung">${terakhir ? 'Terakhir diubah ' + tglJam(terakhir) : ''}</span>
      <button type="submit" class="btn" id="simpanSitus">Simpan perubahan</button></div></form>`;
    $('#fSitus').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('#simpanSitus');
      const baru = {};
      document.querySelectorAll('#fSitus [data-k]').forEach(el => { baru[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value.trim(); });
      const ubah = Object.keys(baru).filter(k => (v[k] || '') !== baru[k]);
      if (!ubah.length) { toast('Tidak ada perubahan.'); return; }
      if (ubah.includes('pendaftaran_buka') && baru.pendaftaran_buka === '0'
          && await tanya({ judul: 'Tutup pendaftaran?', teks: 'Tidak ada orang baru yang bisa membuat akun sampai kamu membukanya lagi.', ok: 'Tutup pendaftaran', bahaya: true }) === null) return;
      btn.disabled = true;
      try {
        for (const k of ubah) { await rpc('admin_simpan_pengaturan', { p_kunci: k, p_nilai: baru[k] }); v[k] = baru[k]; }
        toast('Tersimpan. Landing langsung memakai nilai baru.');
      } catch (er) { toast('Gagal: ' + er.message, true); }
      btn.disabled = false;
    });
  }

  // ---------------------------------------------------------------- Admin
  async function vAdmin(g) {
    const data = await rpc('admin_daftar_admin');
    if (!aktif(g)) return;
    isiEl.innerHTML = `<div class="kartu"><h2>Tambah admin</h2>
      <p class="ket">Masukkan email akun Jurkon yang sudah terdaftar. Akun yang dibekukan tidak bisa dijadikan admin.</p>
      <div class="bar-alat" style="margin:0"><input type="email" id="adminEmail" placeholder="email@contoh.com" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Email calon admin">
      <button type="button" class="btn" data-act="tambahAdmin">Jadikan admin</button></div></div>
      <div style="margin-top:16px">${data.map(a => `<article class="baris-adm">${ava(a.username)}<div class="badan">
        <div class="atas"><span class="nama">@${esc(a.username || '?')}</span>${a.user_id === saya.id ? '<span class="lencana aksen">Kamu</span>' : ''}</div>
        <div class="sub">${esc(a.email || '-')}</div></div>
        ${a.user_id === saya.id ? '' : `<button type="button" class="btn kecil garis bahaya" data-act="cabutAdmin" data-id="${a.user_id}" data-n="${esc(a.username || '')}">Cabut</button>`}</article>`).join('')}</div>`;
  }
  aksi.tambahAdmin = async b => {
    const email = ($('#adminEmail').value || '').trim();
    if (!email) { toast('Isi email dulu.', true); return; }
    if (await tanya({ judul: 'Jadikan admin?', teks: `${email}\n\nAdmin bisa membaca email pengguna, menghapus posting dan akun, membekukan akun, dan mengubah landing.`, ok: 'Jadikan admin' }) === null) return;
    if (await jalankan(b, () => rpc('admin_tambah_admin', { p_email: email }), 'Admin ditambahkan')) tampil();
  };
  aksi.cabutAdmin = async b => {
    if (await tanya({ judul: `Cabut admin @${b.dataset.n}?`, ok: 'Cabut', bahaya: true }) === null) return;
    if (await jalankan(b, () => rpc('admin_cabut_admin', { target: b.dataset.id }), 'Status admin dicabut')) tampil();
  };

  // ---------------------------------------------------------------- Jejak
  const LABEL = {
    hapus_posting: 'Hapus posting', bekukan_akun: 'Bekukan akun', buka_pembekuan: 'Buka pembekuan', hapus_akun: 'Hapus akun',
    sorot: 'Sorot posting', cabut_sorot: 'Cabut sorotan', laporan_selesai: 'Laporan selesai', laporan_baru: 'Laporan dibuka kembali',
    laporan_selesai_massal: 'Laporan selesai (massal)', tambah_admin: 'Tambah admin', cabut_admin: 'Cabut admin', pengaturan: 'Ubah pengaturan'
  };
  async function vLog(g) {
    const data = await rpc('admin_log_daftar', { p_batas: 100 });
    if (!aktif(g)) return;
    if (!data.length) { isiEl.innerHTML = kosongHtml('Belum ada catatan', 'Setiap aksi admin dari panel ini tercatat di sini.'); return; }
    isiEl.innerHTML = `<div class="kartu"><p class="ket">100 aksi terakhir. Tidak bisa diubah dari panel.</p><div class="gulir-x"><table class="tabel-log">
      <thead><tr><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Target</th><th>Detail</th></tr></thead><tbody>
      ${data.map(l => `<tr><td>${esc(tglJam(l.waktu))}</td><td>@${esc(l.admin_username || '?')}</td><td>${esc(LABEL[l.aksi] || l.aksi)}</td>
        <td>${esc(String(l.target || '').slice(0, 8))}</td><td>${esc(l.detail || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  tampil();
})();

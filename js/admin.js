// Pusat Kendali Jurkon (murthehelp/031411). Semua aksi lewat fungsi database admin_* (sql/020_panel_admin.sql)
// yang memeriksa is_admin() DI SERVER. Pemeriksaan di layar ini (login, 2 langkah, kunci layar) hanya lapisan tambahan.
(() => {
  'use strict';
  const MENIT_KUNCI = 15;                 // layar terkunci otomatis setelah tidak aktif
  const el = id => document.getElementById(id);
  const ikon = n => `<svg><use href="#i-${n}"/></svg>`;

  // ---------------------------------------------------------------- tema (otomatis / terang / gelap)
  const TEMA = ['auto', 'terang', 'gelap'];
  const bacaTema = () => { try { const t = localStorage.getItem('admTema'); return TEMA.includes(t) ? t : 'auto'; } catch (e) { return 'auto'; } };
  function terapkanTema(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-tema'); else document.documentElement.setAttribute('data-tema', t);
    const gelap = t === 'gelap' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const b = el('btnTema'); if (b) { b.innerHTML = ikon(gelap ? 'matahari' : 'bulan'); b.title = 'Tema: ' + t; }
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = gelap ? '#0b0d12' : '#f4f5f7';
  }
  function gantiTema() {
    const n = TEMA[(TEMA.indexOf(bacaTema()) + 1) % TEMA.length];
    try { localStorage.setItem('admTema', n); } catch (e) {}
    terapkanTema(n); toast('Tema: ' + n);
  }
  terapkanTema(bacaTema());

  // ---------------------------------------------------------------- bantu
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
  const ava = (username, foto, besar) => {
    const n = username || '?'; let h = 0;
    for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `<span class="ava${besar ? ' besar' : ''}" style="background:hsl(${h} 52% 46%)">${esc(Array.from(n)[0].toUpperCase())}${foto ? `<img src="${esc(fotoUrl(foto))}" alt="" loading="lazy">` : ''}</span>`;
  };
  document.addEventListener('error', e => {
    const x = e.target;
    if (x && x.tagName === 'IMG' && x.closest && x.closest('.ava')) x.remove();
  }, true);

  let tToast;
  function toast(pesan, galat) {
    const t = el('toast');
    t.innerHTML = ikon(galat ? 'awas' : 'cek') + '<span></span>';
    t.lastChild.textContent = pesan;
    t.className = 'toast' + (galat ? ' galat' : ''); t.hidden = false;
    clearTimeout(tToast); tToast = setTimeout(() => { t.hidden = true; }, galat ? 6500 : 3000);
  }

  const rpc = async (fn, args) => {
    const { data, error } = await db.rpc(fn, args || {});
    if (error) throw new Error(error.message);
    return data;
  };

  // Dialog konfirmasi. null bila batal; teks isian ('' boleh) atau true bila setuju.
  // Tombol OK ditaruh pertama di DOM (CSS membaliknya) agar Enter = OK.
  function tanya({ judul, teks = '', input = null, ok = 'Lanjut', bahaya = false, harus = null }) {
    const dlg = el('dlg');
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

  async function jalankan(btn, fn, sukses) {
    btn.disabled = true;
    try { await fn(); if (sukses) toast(sukses); return true; }
    catch (e) { toast('Gagal: ' + e.message, true); btn.disabled = false; return false; }
  }

  // ================================================================ GERBANG AKSES
  const gerbangEl = el('gerbang'), gerbangIsi = el('gerbangIsi'), appEl = el('app');
  const merekHtml = '<div class="merek"><span class="merek-logo" aria-hidden="true">J</span><span class="merek-teks"><b>Jurkon</b><small>Pusat Kendali</small></span></div>';
  function tampilGerbang(html) {
    appEl.hidden = true; gerbangEl.hidden = false;
    gerbangIsi.innerHTML = merekHtml + html;
  }
  const pesanGalat = m => {
    m = String(m || '');
    if (/invalid login|invalid credentials/i.test(m)) return 'Email atau kata sandi salah.';
    if (/not confirmed/i.test(m)) return 'Email belum diverifikasi.';
    if (/captcha/i.test(m)) return 'Server meminta CAPTCHA. Masuk dulu lewat halaman login utama, lalu buka halaman ini lagi.';
    if (/rate|too many|terlalu/i.test(m)) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
    return m || 'Gagal masuk.';
  };

  // Batas percobaan di klien (pelengkap; batas sungguhan ada di Supabase Auth)
  let gagal = 0, sampai = 0;

  function gerbangLogin(info) {
    tampilGerbang(`<h2>Masuk ke Pusat Kendali</h2><p class="ket">Khusus admin Jurkon. Akun biasa tidak bisa membuka panel ini.</p>
      <form id="fMasuk" novalidate>
        ${info ? `<div class="info" role="status">${esc(info)}</div>` : ''}
        <div class="galat" id="gGalat" role="alert" hidden></div>
        <label class="medan">Email<input type="email" id="gEmail" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
        <label class="medan">Kata sandi<span class="mata-bungkus"><input type="password" id="gSandi" autocomplete="current-password" required>
          <button type="button" id="gMata" aria-label="Tampilkan kata sandi">${ikon('mata')}</button></span></label>
        <button class="btn penuh" id="gKirim" type="submit">Masuk</button>
      </form>
      <p class="kecil-ket"><a href="/index.html">← Kembali ke aplikasi</a></p>`);
    const f = el('fMasuk'), g = el('gGalat'), s = el('gSandi');
    el('gMata').onclick = () => { s.type = s.type === 'password' ? 'text' : 'password'; };
    el('gEmail').focus();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const email = el('gEmail').value.trim(), sandi = s.value;
      const salah = m => { g.textContent = m; g.hidden = false; };
      g.hidden = true;
      if (!email || !sandi) return salah('Isi email dan kata sandi.');
      if (Date.now() < sampai) return salah(`Tunggu ${Math.ceil((sampai - Date.now()) / 1000)} detik sebelum mencoba lagi.`);
      const b = el('gKirim'); b.disabled = true; b.textContent = 'Memeriksa…';
      const { error } = await db.auth.signInWithPassword({ email, password: sandi });
      if (error) {
        gagal++; if (gagal >= 5) sampai = Date.now() + Math.min(300, 15 * 2 ** (gagal - 5)) * 1000;
        b.disabled = false; b.textContent = 'Masuk'; s.value = ''; s.focus();
        return salah(pesanGalat(error.message));
      }
      gagal = 0; mulai();
    });
  }

  function gerbangMfa(faktorId) {
    tampilGerbang(`<h2>Verifikasi dua langkah</h2><p class="ket">Masukkan 6 angka dari aplikasi autentikator kamu.</p>
      <form id="fMfa" novalidate><div class="galat" id="gGalat" role="alert" hidden></div>
        <input type="text" id="gKode" class="kode-in" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" aria-label="Kode 6 angka" required>
        <button class="btn penuh" id="gKirim" type="submit">Verifikasi</button>
        <button class="btn garis penuh" id="gKeluar" type="button">Keluar</button></form>`);
    const k = el('gKode'); k.focus();
    el('gKeluar').onclick = keluar;
    el('fMfa').addEventListener('submit', async e => {
      e.preventDefault();
      const kode = k.value.replace(/\D/g, '');
      if (kode.length !== 6) return;
      const b = el('gKirim'); b.disabled = true;
      const { error } = await db.auth.mfa.challengeAndVerify({ factorId: faktorId, code: kode });
      if (error) { const g = el('gGalat'); g.textContent = 'Kode salah atau kedaluwarsa.'; g.hidden = false; b.disabled = false; k.value = ''; k.focus(); return; }
      mulai();
    });
  }

  function gerbangDitolak(user) {
    tampilGerbang(`<div class="lencana-besar">${ikon('kunci')}</div><h2>Akses ditolak</h2>
      <p class="ket">Akun <b>${esc(user.email || '')}</b> bukan admin Jurkon.</p>
      <div style="display:grid;gap:10px"><a class="btn penuh" href="/index.html">Ke aplikasi</a><button class="btn garis penuh" id="gKeluar" type="button">Ganti akun</button></div>`);
    el('gKeluar').onclick = keluar;
  }

  async function keluar() {
    try { await db.auth.signOut({ scope: 'local' }); } catch (e) {}
    location.reload();
  }

  // ---------------------------------------------------------------- alur masuk
  let saya = null;
  async function mulai() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return gerbangLogin();
    saya = session.user;
    // Dua langkah: bila akun punya TOTP terverifikasi, wajib aal2 sebelum panel dibuka
    try {
      const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const { data: fk } = await db.auth.mfa.listFactors();
        const f = fk && fk.totp && fk.totp[0];
        if (f) return gerbangMfa(f.id);
      }
    } catch (e) { /* tanpa MFA: lanjut */ }
    const { data: adm, error } = await db.from('admins').select('user_id').eq('user_id', saya.id).maybeSingle();
    if (error || !adm) return gerbangDitolak(saya);
    gerbangEl.hidden = true; appEl.hidden = false;
    await masuk();
  }

  // ================================================================ PANEL
  let siap = false, gen = 0, profilSaya = null;
  const isiEl = el('isi'), judulEl = el('judul'), aksiAtas = el('aksiAtas');
  const aktif = g => g === gen;
  const aksi = {};
  const kosongHtml = (judul, teks) => `<div class="kosong"><b>${esc(judul)}</b>${teks ? `<span>${esc(teks)}</span>` : ''}</div>`;
  const rangkaHtml = '<div class="daftar"><div class="rangka"></div><div class="rangka"></div><div class="rangka"></div></div>';

  const TAB = {
    ringkasan: { judul: 'Ringkasan', v: vRingkasan },
    laporan:   { judul: 'Laporan', v: vLaporan },
    pengguna:  { judul: 'Pengguna', v: vPengguna },
    posting:   { judul: 'Posting', v: vPosting },
    sorotan:   { judul: 'Sorotan Jelajah', v: vSorotan },
    situs:     { judul: 'Landing & situs', v: vSitus },
    admin:     { judul: 'Akses admin', v: vAdmin },
    keamanan:  { judul: 'Keamanan akun', v: vKeamanan },
    log:       { judul: 'Jejak admin', v: vLog }
  };

  async function masuk() {
    if (siap) { tampil(); return; }
    siap = true;
    const { data: pr } = await db.from('profiles').select('username,nama,foto_url').eq('id', saya.id).maybeSingle();
    profilSaya = pr || {};
    const nama = profilSaya.username || (saya.email || '?').split('@')[0];
    el('avaSaya').innerHTML = ava(nama, profilSaya.foto_url);
    el('namaSaya').textContent = nama;
    el('mAkunNama').textContent = profilSaya.nama || nama;
    el('mAkunEmail').textContent = saya.email || '';

    isiEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b && aksi[b.dataset.act]) aksi[b.dataset.act](b, e);
    });
    window.addEventListener('hashchange', tampil);
    el('btnSegar').onclick = () => { tampil(); toast('Data dimuat ulang'); };
    el('btnTema').onclick = gantiTema;
    el('btnKunci').onclick = kunci;
    el('btnPalet').onclick = bukaPalet;
    el('btnKeluar').onclick = keluar;
    const mb = el('btnAkun'), mm = el('menuAkun');
    mb.onclick = e => { e.stopPropagation(); mm.hidden = !mm.hidden; mb.setAttribute('aria-expanded', String(!mm.hidden)); };
    document.addEventListener('click', () => { mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); bukaPalet(); }
    });
    db.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
    pasangKunciOtomatis();
    terapkanTema(bacaTema());
    setInterval(() => { if (!kunciAktif) segarkanLencana().catch(() => {}); }, 60000);
    tampil();
  }

  async function segarkanLencana() {
    const { count } = await db.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'baru');
    const b = el('lencanaLaporan');
    b.textContent = count > 99 ? '99+' : String(count || 0);
    b.hidden = !count;
  }

  async function tampil() {
    const nama = TAB[location.hash.slice(1)] ? location.hash.slice(1) : 'ringkasan';
    document.querySelectorAll('#menu a').forEach(a => {
      const on = a.dataset.tab === nama;
      a.classList.toggle('aktif', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    judulEl.textContent = TAB[nama].judul;
    document.title = TAB[nama].judul + ' · Pusat Kendali Jurkon';
    aksiAtas.innerHTML = '';
    const g = ++gen;
    isiEl.innerHTML = rangkaHtml;
    try { await TAB[nama].v(g); }
    catch (e) {
      if (aktif(g)) isiEl.innerHTML = kosongHtml('Gagal memuat', e.message) +
        '<p class="hitung" style="text-align:center;margin-top:10px">Pastikan <code>sql/020_panel_admin.sql</code> sudah dijalankan di Supabase.</p>';
    }
    segarkanLencana().catch(() => {});
  }

  // ---------------------------------------------------------------- Ringkasan
  function mini(v) {
    const W = 120, H = 34, n = v.length, m = Math.max(1, ...v);
    const p = v.map((x, i) => [(i * W / (n - 1)).toFixed(1), (H - 3 - (H - 7) * x / m).toFixed(1)]);
    const a = 'M' + p.map(q => q.join(',')).join('L');
    return `<svg class="garis-mini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="b" d="${a}L${W},${H}L0,${H}Z"/><path class="a" d="${a}"/></svg>`;
  }
  function grafik(seri, k) {
    const W = 640, H = 200, pb = 24, pt = 20, n = seri.length, lb = W / n;
    const maks = Math.max(1, ...seri.map(x => x[k]));
    let b = '';
    seri.forEach((x, i) => {
      const v = x[k], h = Math.round((H - pb - pt) * v / maks), xx = i * lb + lb * 0.2, w = lb * 0.6, y = H - pb - h;
      b += `<rect class="batang" x="${xx.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${Math.max(h, v ? 3 : 0)}" rx="4"><title>${x.hari}: ${v}</title></rect>`;
      if (v) b += `<text class="nilai" x="${(xx + w / 2).toFixed(1)}" y="${y - 5}" text-anchor="middle">${v}</text>`;
      const [, m, d] = x.hari.split('-');
      if (i % 2 === 1) b += `<text x="${(xx + w / 2).toFixed(1)}" y="${H - 7}" text-anchor="middle">${d}/${m}</text>`;
    });
    return `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik 14 hari terakhir"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}"></line>${b}</svg>`;
  }
  async function vRingkasan(g) {
    const t0 = performance.now();
    const [s, peng] = await Promise.all([rpc('admin_statistik'), rpc('admin_pengaturan').catch(() => [])]);
    const ms = Math.round(performance.now() - t0);
    if (!aktif(g)) return;
    const set = {}; peng.forEach(r => { set[r.kunci] = r.nilai; });
    const sr = k => s.seri.map(x => x[k]);
    const K = [
      { l: 'Pengguna', v: s.pengguna, i: 'pengguna', tab: 'pengguna', seri: sr('pengguna'), a: `<b>+${angka(s.pengguna_24j)}</b> dalam 24 jam` },
      { l: 'Catatan', v: s.posting, i: 'posting', tab: 'posting', seri: sr('posting'), a: `${angka(s.balasan)} balasan` },
      { l: 'Pesan', v: s.pesan, i: 'surat', seri: sr('pesan'), a: 'seluruh percakapan' },
      { l: 'Aktif 24 jam', v: s.aktif_24j, i: 'denyut', a: `${angka(s.pengguna_7h)} pengguna baru 7 hari` },
      { l: 'Laporan baru', v: s.laporan_baru, i: 'laporan', tab: 'laporan', warn: s.laporan_baru > 0, a: `${angka(s.laporan_selesai)} sudah selesai` },
      { l: 'Suka', v: s.suka, i: 'hati', a: `${angka(s.disorot)} posting disorot` }
    ];
    const kartu = K.map(c => {
      const dlm = `<div class="stat-kepala"><span>${esc(c.l)}</span><span class="stat-ikon">${ikon(c.i)}</span></div>
        <div class="angka">${angka(c.v)}</div><div class="anak">${c.a || ''}</div>${c.seri ? mini(c.seri) : ''}`;
      return c.tab ? `<a class="stat${c.warn ? ' waspada' : ''}" href="#${c.tab}">${dlm}</a>` : `<div class="stat">${dlm}</div>`;
    }).join('');

    const P = [];
    if (s.laporan_baru > 0) P.push(['bh', 'laporan', `${angka(s.laporan_baru)} laporan menunggu`, 'Tinjau dan ambil tindakan', '#laporan']);
    if (s.belum_verifikasi > 0) P.push(['aw', 'surat', `${angka(s.belum_verifikasi)} email belum diverifikasi`, 'Akun ini belum bisa berinteraksi', '#pengguna']);
    if (s.dibekukan > 0) P.push(['aw', 'beku', `${angka(s.dibekukan)} akun dibekukan`, 'Lihat alasan dan buka pembekuan', '#pengguna']);
    const perhatian = P.length ? P.map(([w, i, t, d, h]) => `<a href="${h}"><span class="ik ${w}">${ikon(i)}</span><span class="t">${esc(t)}<small>${esc(d)}</small></span></a>`).join('')
      : `<div><span class="ik ok">${ikon('cek')}</span><span class="t">Semua aman<small>Tidak ada laporan atau akun yang perlu ditinjau.</small></span></div>`;

    const SERI = { pengguna: 'Pengguna baru', posting: 'Posting & balasan', pesan: 'Pesan' };
    let k = 'pengguna';
    isiEl.innerHTML = `<div class="grid-stat">${kartu}</div>
      <div class="dua-kolom">
        <div class="kartu"><div class="kepala-kartu"><div><h2>14 hari terakhir</h2><p class="ket">Per hari, zona WIB.</p></div>
          <div class="seg">${Object.entries(SERI).map(([id, l]) => `<button type="button" data-act="seri" data-k="${id}">${esc(l)}</button>`).join('')}</div></div>
          <div id="grafikIsi"></div></div>
        <div>
          <div class="kartu"><h2>Perlu perhatian</h2><p class="ket">Ringkasan hal yang butuh tindakan.</p><div class="perhatian">${perhatian}</div></div>
          <div class="kartu"><h2>Kontrol cepat</h2><p class="ket">Berlaku langsung di situs publik.</p>
            <label class="sakelar"><span class="ket-s">Pendaftaran akun baru<small>Mati = database menolak akun baru.</small></span><input type="checkbox" data-q="pendaftaran_buka" ${set.pendaftaran_buka === '0' ? '' : 'checked'}></label>
            <label class="sakelar"><span class="ket-s">Pengumuman di landing<small>Teks diatur di tab Situs.</small></span><input type="checkbox" data-q="pengumuman_aktif" ${set.pengumuman_aktif === '1' ? 'checked' : ''}></label>
          </div>
          <div class="kartu"><div class="status"><span class="titik"></span>Terhubung ke Supabase · ${ms} ms</div></div>
        </div></div>`;
    const gambar = () => {
      el('grafikIsi').innerHTML = grafik(s.seri, k);
      document.querySelectorAll('[data-act=seri]').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
    };
    aksi.seri = b => { k = b.dataset.k; gambar(); };
    gambar();
    isiEl.querySelectorAll('[data-q]').forEach(c => c.addEventListener('change', async () => {
      const kunciQ = c.dataset.q, nilai = c.checked ? '1' : '0';
      if (kunciQ === 'pendaftaran_buka' && nilai === '0' &&
          await tanya({ judul: 'Tutup pendaftaran?', teks: 'Tidak ada orang baru yang bisa membuat akun sampai dibuka lagi.', ok: 'Tutup pendaftaran', bahaya: true }) === null) { c.checked = true; return; }
      c.disabled = true;
      try { await rpc('admin_simpan_pengaturan', { p_kunci: kunciQ, p_nilai: nilai }); toast('Tersimpan'); }
      catch (e) { c.checked = !c.checked; toast('Gagal: ' + e.message, true); }
      c.disabled = false;
    }));
  }

  // ---------------------------------------------------------------- Laporan
  let fLap = 'baru';
  async function vLaporan(g) {
    const { data, error } = await db.from('reports')
      .select('id,alasan,created_at,status,post_id,profiles(username),posts(id,content,user_id,profiles(username))')
      .eq('status', fLap).order('created_at', { ascending: false }).limit(60);
    if (!aktif(g)) return;
    if (error) throw new Error(error.message);
    const seg = `<div class="bar-alat"><div class="seg"><button type="button" data-act="fLap" data-k="baru" aria-pressed="${fLap === 'baru'}">Baru</button>
      <button type="button" data-act="fLap" data-k="selesai" aria-pressed="${fLap === 'selesai'}">Selesai</button></div></div>`;
    const daftar = !data.length
      ? kosongHtml(fLap === 'baru' ? 'Tidak ada laporan baru' : 'Belum ada laporan selesai', fLap === 'baru' ? 'Semua laporan sudah ditangani.' : '')
      : '<div class="daftar">' + data.map(r => {
        const p = r.posts, penulis = p?.profiles?.username || '?';
        const tombol = fLap === 'baru'
          ? `<button type="button" class="btn kecil garis" data-act="lapSelesai" data-r="${r.id}">${ikon('cek')}Tandai selesai</button>
             ${p ? `<a class="btn kecil garis" href="/detail.html?id=${esc(p.id)}" target="_blank" rel="noopener">${ikon('luar')}Buka posting</a>
             <button type="button" class="btn kecil garis bahaya" data-act="lapHapus" data-p="${esc(p.id)}">Hapus posting</button>
             <button type="button" class="btn kecil garis bahaya" data-act="lapBekukan" data-u="${esc(p.user_id)}" data-n="${esc(penulis)}" data-r="${r.id}">Bekukan penulis</button>` : ''}`
          : `<button type="button" class="btn kecil garis" data-act="lapBuka" data-r="${r.id}">Buka kembali</button>`;
        return `<article class="baris">${ava(penulis, null, true)}<div class="badan">
          <div class="atas-b"><span class="nama">@${esc(penulis)}</span><span class="sub">dilaporkan oleh @${esc(r.profiles?.username || '?')} · ${wkt(r.created_at)}</span></div>
          <div class="teks">${esc(p?.content || '(posting sudah dihapus)')}</div>
          <div class="alasan"><b>Alasan:</b> ${esc(r.alasan || '-')}</div>
          <div class="aksi-b">${tombol}</div></div></article>`;
      }).join('') + '</div>';
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

  // ---------------------------------------------------------------- daftar dengan pencarian (Pengguna, Posting)
  async function daftarCari(g, fn, baris, placeholder, ambilQ, simpanQ, teksKosong) {
    const BATAS = 30;
    isiEl.innerHTML = `<div class="bar-alat"><div class="cari-kotak">${ikon('cari')}<input type="search" id="cari" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="100"></div></div>
      <div id="hasil" class="daftar"></div><div class="bar-alat" id="lagi" hidden style="justify-content:center;margin-top:16px"><button type="button" class="btn garis" id="lagiBtn">Muat lagi</button></div>`;
    const cari = el('cari'), hasil = el('hasil'), lagi = el('lagi');
    cari.value = ambilQ();
    let mulaiN = 0, urut = 0, tm;
    async function muat(ulang) {
      const no = ++urut;
      if (ulang) { mulaiN = 0; hasil.innerHTML = '<div class="rangka"></div><div class="rangka"></div>'; lagi.hidden = true; }
      try {
        const rows = await rpc(fn, { p_cari: ambilQ(), p_batas: BATAS, p_mulai: mulaiN });
        if (no !== urut || !aktif(g)) return;
        if (ulang) hasil.innerHTML = rows.length ? '' : kosongHtml(teksKosong);
        hasil.insertAdjacentHTML('beforeend', rows.map(baris).join(''));
        mulaiN += rows.length;
        lagi.hidden = rows.length < BATAS;
      } catch (e) { if (aktif(g)) hasil.innerHTML = kosongHtml('Gagal memuat', e.message); }
    }
    cari.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { simpanQ(cari.value.trim()); muat(true); }, 300); });
    el('lagiBtn').addEventListener('click', () => muat(false));
    await muat(true);
  }

  // ---------------------------------------------------------------- Pengguna
  let qPengguna = '';
  const daftarU = {};
  function barisPengguna(u) {
    daftarU[u.id] = u;
    const lencana = [
      u.adalah_admin ? '<span class="lencana aksen">Admin</span>' : '',
      u.dibekukan ? '<span class="lencana merah">Dibekukan</span>' : '',
      !u.terverifikasi ? '<span class="lencana kuning">Belum verifikasi</span>' : '',
      u.laporan_baru > 0 ? `<span class="lencana merah">${u.laporan_baru} laporan baru</span>` : ''
    ].join('');
    const t = [`<a class="btn kecil garis" href="/profil.html?u=${esc(u.username)}" target="_blank" rel="noopener">${ikon('luar')}Profil</a>`];
    if (u.dibekukan) t.push(`<button type="button" class="btn kecil garis" data-act="bukaU" data-id="${u.id}">Buka pembekuan</button>`);
    else if (!u.adalah_admin) t.push(`<button type="button" class="btn kecil garis bahaya" data-act="bekukanU" data-id="${u.id}">Bekukan</button>`);
    if (!u.adalah_admin && !u.dibekukan && u.terverifikasi && u.email) t.push(`<button type="button" class="btn kecil garis" data-act="jadiAdmin" data-id="${u.id}">Jadikan admin</button>`);
    if (!u.adalah_admin && u.id !== saya.id) t.push(`<button type="button" class="btn kecil garis bahaya" data-act="hapusU" data-id="${u.id}">Hapus akun</button>`);
    return `<article class="baris">${ava(u.username, u.foto, true)}<div class="badan">
      <div class="atas-b"><span class="nama">${esc(u.nama || u.username)}</span><span class="sub">@${esc(u.username)}</span>${lencana}</div>
      <div class="sub">${esc(u.email || '-')} · bergabung ${tgl(u.dibuat)} · masuk terakhir ${u.masuk_terakhir ? wkt(u.masuk_terakhir) : 'belum pernah'} · ${angka(u.jml_posting)} posting</div>
      ${u.dibekukan ? `<div class="alasan"><b>Alasan beku:</b> ${esc(u.alasan_beku || '-')}</div>` : ''}
      <div class="aksi-b">${t.join('')}</div></div></article>`;
  }
  async function vPengguna(g) { await daftarCari(g, 'admin_cari_pengguna', barisPengguna, 'Cari username, nama, email, atau ID…', () => qPengguna, v => { qPengguna = v; }, 'Tidak ada pengguna yang cocok.'); }
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
    ].join('');
    return `<article class="baris">${ava(p.username, null, true)}<div class="badan">
      <div class="atas-b"><span class="nama">@${esc(p.username)}</span><span class="sub">${wkt(p.dibuat)}</span>${lencana}</div>
      <div class="teks">${esc(p.isi || '(posting ulang)')}</div>
      <div class="sub" style="margin-top:8px">${angka(p.dilihat)} dilihat · ${angka(p.jml_suka)} suka</div>
      <div class="aksi-b"><a class="btn kecil garis" href="/detail.html?id=${esc(p.id)}" target="_blank" rel="noopener">${ikon('luar')}Buka</a>
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
      : !data.length ? kosongHtml('Belum ada posting yang disorot', 'Sorot dari tab Posting atau tempel ID di atas.')
      : '<div class="daftar">' + data.map(p => `<article class="baris">${ava(p.profiles?.username, null, true)}<div class="badan">
          <div class="atas-b"><span class="nama">@${esc(p.profiles?.username || '?')}</span><span class="sub">${wkt(p.created_at)} · ${angka(p.dilihat)} dilihat</span></div>
          <div class="teks">${esc(p.content)}</div></div>
          <button type="button" class="btn kecil garis" data-act="cabutSorot" data-id="${p.id}">Cabut</button></article>`).join('') + '</div>';
    isiEl.innerHTML = `<div class="kartu"><h2>Tambah sorotan</h2>
      <p class="ket">Posting dengan jumlah dilihat di atas ambang otomatis tampil di Jelajah. Di sini kamu memilih posting lain secara manual: tempel tautan (detail.html?id=…) atau ID-nya.</p>
      <div class="bar-alat" style="margin:0"><input type="text" id="sorotId" style="flex:1;min-width:200px;width:auto" aria-label="Tautan atau ID posting" placeholder="Tautan atau ID posting" autocomplete="off" autocapitalize="none" spellcheck="false">
      <button type="button" class="btn" data-act="tambahSorot">Sorot posting</button></div></div>
      <div style="margin-top:16px">${daftar}</div>`;
  }
  aksi.tambahSorot = async b => {
    const m = (el('sorotId').value || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
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
    aksiAtas.innerHTML = `<a class="btn garis kecil" href="/landing.html" target="_blank" rel="noopener">${ikon('luar')}Pratinjau landing</a>`;
    const input = (k, label, ket, maks) => `<label class="medan">${esc(label)}${ket ? `<small>${esc(ket)}</small>` : ''}<input type="text" data-k="${k}" maxlength="${maks}" value="${esc(v[k] || '')}" autocomplete="off"></label>`;
    const area = (k, label, ket) => `<label class="medan">${esc(label)}${ket ? `<small>${esc(ket)}</small>` : ''}<textarea data-k="${k}" maxlength="600">${esc(v[k] || '')}</textarea></label>`;
    const sakelar = (k, label, ket) => `<label class="sakelar"><span class="ket-s">${esc(label)}<small>${esc(ket)}</small></span><input type="checkbox" data-k="${k}" ${v[k] === '1' ? 'checked' : ''}></label>`;
    isiEl.innerHTML = `<form id="fSitus" class="form-adm">
      <div class="kartu form-adm"><div><h2>Isi landing page</h2><p class="ket">Teks yang tampil di halaman depan.</p></div>
        ${input('brand_nama', 'Nama merek', 'Tampil di header dan footer landing.', 60)}
        ${input('hero_judul', 'Judul utama', '', 120)}
        ${area('hero_sub', 'Sub judul', 'Satu atau dua kalimat di bawah judul.')}
        ${input('kontak_email', 'Email kontak', 'Tampil di footer landing. Kosongkan untuk menyembunyikan.', 120)}</div>
      <div class="kartu form-adm"><div><h2>Pengumuman</h2><p class="ket">Pita di bagian atas landing.</p></div>
        ${sakelar('pengumuman_aktif', 'Tampilkan pengumuman', 'Matikan untuk menyembunyikan tanpa menghapus teks.')}
        ${area('pengumuman', 'Teks pengumuman', '')}</div>
      <div class="kartu form-adm"><div><h2>Pendaftaran</h2></div>
        ${sakelar('pendaftaran_buka', 'Pendaftaran akun baru dibuka', 'Bila dimatikan, database menolak akun baru (email maupun Google). Yang sudah punya akun tetap bisa masuk.')}</div>
      <div class="baris-form"><span class="hitung">${terakhir ? 'Terakhir diubah ' + tglJam(terakhir) : ''}</span>
        <button type="submit" class="btn" id="simpanSitus">Simpan perubahan</button></div></form>`;
    el('fSitus').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = el('simpanSitus'), baru = {};
      document.querySelectorAll('#fSitus [data-k]').forEach(x => { baru[x.dataset.k] = x.type === 'checkbox' ? (x.checked ? '1' : '0') : x.value.trim(); });
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

  // ---------------------------------------------------------------- Akses admin
  async function vAdmin(g) {
    const data = await rpc('admin_daftar_admin');
    if (!aktif(g)) return;
    isiEl.innerHTML = `<div class="kartu"><h2>Beri akses admin</h2>
      <p class="ket">Masukkan email akun Jurkon yang sudah terdaftar. Akun yang dibekukan tidak bisa dijadikan admin.</p>
      <div class="bar-alat" style="margin:0"><input type="email" id="adminEmail" style="flex:1;min-width:200px;width:auto" placeholder="email@contoh.com" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Email calon admin">
      <button type="button" class="btn" data-act="tambahAdmin">Jadikan admin</button></div></div>
      <div class="daftar" style="margin-top:16px">${data.map(a => `<article class="baris" style="align-items:center">${ava(a.username, null, true)}<div class="badan">
        <div class="atas-b"><span class="nama">@${esc(a.username || '?')}</span>${a.user_id === saya.id ? '<span class="lencana aksen">Kamu</span>' : ''}</div>
        <div class="sub">${esc(a.email || '-')}</div></div>
        ${a.user_id === saya.id ? '' : `<button type="button" class="btn kecil garis bahaya" data-act="cabutAdmin" data-id="${a.user_id}" data-n="${esc(a.username || '')}">Cabut akses</button>`}</article>`).join('')}</div>`;
  }
  aksi.tambahAdmin = async b => {
    const email = (el('adminEmail').value || '').trim();
    if (!email) { toast('Isi email dulu.', true); return; }
    if (await tanya({ judul: 'Jadikan admin?', teks: `${email}\n\nAdmin bisa membaca email pengguna, menghapus posting dan akun, membekukan akun, dan mengubah landing.`, ok: 'Jadikan admin' }) === null) return;
    if (await jalankan(b, () => rpc('admin_tambah_admin', { p_email: email }), 'Admin ditambahkan')) tampil();
  };
  aksi.cabutAdmin = async b => {
    if (await tanya({ judul: `Cabut akses @${b.dataset.n}?`, ok: 'Cabut', bahaya: true }) === null) return;
    if (await jalankan(b, () => rpc('admin_cabut_admin', { target: b.dataset.id }), 'Akses admin dicabut')) tampil();
  };

  // ---------------------------------------------------------------- Keamanan akun (2 langkah / TOTP)
  // Faktor TOTP didaftarkan lewat Supabase Auth MFA. Begitu ada satu faktor terverifikasi, is_admin() di server
  // (sql/021_mfa_admin.sql) hanya menerima sesi aal2, jadi kata sandi curian saja tidak cukup memanggil fungsi admin.
  let mfaProses = null;      // id faktor yang sedang didaftarkan (belum diverifikasi)
  let mfaRahasia = '';
  async function mfaDaftar() {
    const { data, error } = await db.auth.mfa.listFactors();
    if (error) throw new Error(error.message);
    const semua = ((data && data.all) || []).filter(f => f.factor_type === 'totp');
    return { terpasang: semua.filter(f => f.status === 'verified'), tertunda: semua.filter(f => f.status !== 'verified') };
  }
  async function vKeamanan(g) {
    const [{ terpasang }, aalRes] = await Promise.all([mfaDaftar(), db.auth.mfa.getAuthenticatorAssuranceLevel()]);
    if (!aktif(g)) return;
    mfaProses = null;
    const nyala = terpasang.length > 0;
    const aal = aalRes.data && aalRes.data.currentLevel;
    const daftar = terpasang.map(f => `<article class="baris" style="align-items:center"><div class="badan">
        <div class="atas-b"><span class="nama">${esc(f.friendly_name || 'Autentikator')}</span><span class="lencana hijau">Terverifikasi</span></div>
        <div class="sub">Dipasang ${esc(tglJam(f.created_at))}</div></div>
        <button type="button" class="btn kecil garis bahaya" data-act="mfaHapus" data-id="${esc(f.id)}">Nonaktifkan</button></article>`).join('');
    isiEl.innerHTML = `<div class="kartu"><h2>Verifikasi dua langkah</h2>
      <p class="ket">Status: <span class="lencana ${nyala ? 'hijau' : 'kuning'}">${nyala ? 'Aktif' : 'Belum aktif'}</span>${nyala ? ' &middot; sesi ini: ' + (aal === 'aal2' ? 'sudah diverifikasi' : 'belum diverifikasi') : ''}</p>
      <p class="ket">${nyala
        ? 'Setiap masuk ke panel butuh kode 6 angka dari aplikasi autentikator. Server juga menolak aksi admin dari sesi tanpa kode itu, termasuk lewat API langsung.'
        : 'Tanpa ini, siapa pun yang tahu kata sandi adminmu punya kuasa penuh (hapus akun, bekukan pengguna, tambah admin). Pasang aplikasi autentikator (Google Authenticator, Authy, 2FAS, dsb.) lebih dulu. Simpan kunci teks cadangan di tempat aman supaya tidak terkunci bila HP hilang.'}</p>
      <div id="mfaIsi">${nyala ? '' : '<button type="button" class="btn" data-act="mfaMulai">Aktifkan 2 langkah</button>'}</div></div>
      ${nyala ? `<div class="daftar" style="margin-top:16px">${daftar}</div>` : ''}`;
  }
  aksi.mfaMulai = async b => {
    b.disabled = true;
    try {
      // buang pendaftaran setengah jadi dari percobaan sebelumnya supaya tidak menumpuk
      const { tertunda } = await mfaDaftar();
      for (const f of tertunda) await db.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await db.auth.mfa.enroll({ factorType: 'totp', issuer: 'Jurkon Admin', friendlyName: 'Admin ' + new Date().toISOString().slice(0, 19) });
      if (error) throw new Error(error.message);
      mfaProses = data.id;
      mfaRahasia = (data.totp && data.totp.secret) || '';
      const uri = data.totp && /^otpauth:\/\//.test(data.totp.uri || '') ? data.totp.uri : '';
      el('mfaIsi').innerHTML = `<div style="display:grid;gap:14px;justify-items:center;margin-top:16px;text-align:center">
        <p class="ket" style="margin:0">1. Scan kode QR ini dengan aplikasi autentikator, atau buka langsung dari HP ini.</p>
        <img id="mfaQr" alt="Kode QR untuk aplikasi autentikator" width="180" height="180" style="background:#fff;padding:8px;border-radius:12px">
        ${uri ? `<a class="btn garis" href="${esc(uri)}">Buka di aplikasi autentikator</a>` : ''}
        <p class="ket" style="margin:0">Atau masukkan kunci ini secara manual:</p>
        <code class="mono" style="word-break:break-all;user-select:all">${esc(mfaRahasia.replace(/(.{4})/g, '$1 ').trim())}</code>
        <button type="button" class="btn kecil garis" data-act="mfaSalin">Salin kunci</button>
        <p class="ket" style="margin:0">2. Ketik kode 6 angka yang muncul di aplikasi:</p>
        <input type="text" id="mfaKode" class="kode-in" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" aria-label="Kode 6 angka">
        <div style="display:flex;gap:10px"><button type="button" class="btn" data-act="mfaVerif">Verifikasi &amp; aktifkan</button>
        <button type="button" class="btn garis" data-act="mfaBatal">Batal</button></div></div>`;
      const q = el('mfaQr'); if (q && data.totp && data.totp.qr_code) q.src = data.totp.qr_code;   // data: URI SVG (diizinkan CSP img-src)
      el('mfaKode').focus();
    } catch (e) { toast('Gagal: ' + e.message, true); b.disabled = false; }
  };
  aksi.mfaSalin = async () => {
    try { await navigator.clipboard.writeText(mfaRahasia); toast('Kunci disalin'); }
    catch (e) { toast('Tidak bisa menyalin. Tahan dan salin teks kuncinya manual.', true); }
  };
  aksi.mfaVerif = async b => {
    const kode = (el('mfaKode').value || '').replace(/\D/g, '');
    if (kode.length !== 6) { toast('Masukkan 6 angka dari aplikasi.', true); return; }
    const ok = await jalankan(b, async () => {
      const { error } = await db.auth.mfa.challengeAndVerify({ factorId: mfaProses, code: kode });
      if (error) throw new Error('Kode salah atau kedaluwarsa.');
    }, 'Verifikasi 2 langkah aktif');
    if (ok) { mfaProses = null; mfaRahasia = ''; tampil(); }
    else { el('mfaKode').value = ''; el('mfaKode').focus(); }
  };
  aksi.mfaBatal = async () => {
    if (mfaProses) { try { await db.auth.mfa.unenroll({ factorId: mfaProses }); } catch (e) {} }
    mfaProses = null; mfaRahasia = ''; tampil();
  };
  aksi.mfaHapus = async b => {
    if (await tanya({ judul: 'Nonaktifkan 2 langkah?', teks: 'Akun admin ini kembali hanya dilindungi kata sandi. Lanjutkan hanya bila kamu mau mendaftarkan ulang.', ok: 'Nonaktifkan', bahaya: true }) === null) return;
    if (await jalankan(b, async () => {
      const { error } = await db.auth.mfa.unenroll({ factorId: b.dataset.id });
      if (error) throw new Error(error.message);
    }, '2 langkah dinonaktifkan')) tampil();
  };
  isiEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.id === 'mfaKode') {
      e.preventDefault();
      const b = isiEl.querySelector('[data-act="mfaVerif"]'); if (b && !b.disabled) b.click();
    }
  });

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
    isiEl.innerHTML = `<div class="kartu"><h2>Jejak audit</h2><p class="ket">100 aksi terakhir. Tidak bisa diubah dari panel.</p><div class="tabel-bungkus"><table class="tabel">
      <thead><tr><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Target</th><th>Detail</th></tr></thead><tbody>
      ${data.map(l => `<tr><td>${esc(tglJam(l.waktu))}</td><td>@${esc(l.admin_username || '?')}</td><td><span class="lencana">${esc(LABEL[l.aksi] || l.aksi)}</span></td>
        <td class="mono">${esc(String(l.target || '').slice(0, 8))}</td><td>${esc(l.detail || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  // ================================================================ KUNCI LAYAR
  const kunciEl = el('kunci');
  let kunciAktif = false, terakhirAktif = Date.now();
  function pasangKunciOtomatis() {
    const tanda = () => { if (!kunciAktif) terakhirAktif = Date.now(); };
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, tanda, { passive: true, capture: true }));
    setInterval(() => { if (!kunciAktif && Date.now() - terakhirAktif > MENIT_KUNCI * 60000) kunci(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !kunciAktif && Date.now() - terakhirAktif > MENIT_KUNCI * 60000) kunci(); });
  }
  async function kunci() {
    if (kunciAktif) return;
    kunciAktif = true;
    appEl.inert = true; el('menuAkun').hidden = true;
    let faktor = null;
    try { const { data } = await db.auth.mfa.listFactors(); faktor = data && data.totp && data.totp[0]; } catch (e) {}
    kunciEl.innerHTML = `<div class="gerbang-kartu">${merekHtml}<div class="lencana-besar aksen">${ikon('kunci')}</div>
      <h2 id="kunciJudul">Layar terkunci</h2><p class="ket">${esc(saya.email || '')}<br>Masukkan kata sandi untuk melanjutkan.</p>
      <form id="fBuka" novalidate><div class="galat" id="kGalat" role="alert" hidden></div>
        <label class="medan">Kata sandi<span class="mata-bungkus"><input type="password" id="kSandi" autocomplete="current-password" required><button type="button" id="kMata" aria-label="Tampilkan kata sandi">${ikon('mata')}</button></span></label>
        ${faktor ? '<label class="medan">Kode 2 langkah<input type="text" id="kKode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 angka"></label>' : ''}
        <button class="btn penuh" id="kKirim" type="submit">Buka kunci</button>
        <button class="btn garis penuh" id="kKeluar" type="button">Keluar</button></form></div>`;
    kunciEl.hidden = false;
    const s = el('kSandi'); s.focus();
    el('kMata').onclick = () => { s.type = s.type === 'password' ? 'text' : 'password'; };
    el('kKeluar').onclick = keluar;
    el('fBuka').addEventListener('submit', async e => {
      e.preventDefault();
      const g = el('kGalat'), b = el('kKirim'); g.hidden = true;
      const salah = m => { g.textContent = m; g.hidden = false; b.disabled = false; };
      if (!s.value) return salah('Isi kata sandi.');
      b.disabled = true;
      const { error } = await db.auth.signInWithPassword({ email: saya.email, password: s.value });
      if (error) { s.value = ''; return salah(pesanGalat(error.message)); }
      if (faktor) {
        const { error: e2 } = await db.auth.mfa.challengeAndVerify({ factorId: faktor.id, code: (el('kKode').value || '').replace(/\D/g, '') });
        if (e2) return salah('Kode 2 langkah salah atau kedaluwarsa.');
      }
      kunciAktif = false; terakhirAktif = Date.now();
      kunciEl.hidden = true; kunciEl.innerHTML = ''; appEl.inert = false;
    });
  }

  // ================================================================ PALET PERINTAH
  const palet = el('palet'), paletIn = el('paletIn'), paletUl = el('paletDaftar');
  let paletPilih = 0, paletItem = [];
  function perintah() {
    return [
      ...Object.keys(TAB).map(k => ({ l: 'Buka ' + TAB[k].judul, ik: k, f: () => { location.hash = '#' + k; } })),
      { l: 'Muat ulang data', ik: 'segar', f: tampil },
      { l: 'Ganti tema', ik: 'bulan', f: gantiTema },
      { l: 'Kunci layar', ik: 'kunci', f: kunci },
      { l: 'Keluar', ik: 'keluar', f: keluar }
    ];
  }
  function gambarPalet() {
    const q = paletIn.value.trim().toLowerCase();
    paletItem = perintah().filter(p => (p.l + ' ' + p.ik).toLowerCase().includes(q));
    paletPilih = Math.min(paletPilih, Math.max(0, paletItem.length - 1));
    paletUl.innerHTML = paletItem.length
      ? paletItem.map((p, i) => `<li role="option" data-i="${i}" aria-selected="${i === paletPilih}">${ikon(p.ik)}<b>${esc(p.l)}</b></li>`).join('')
      : '<li class="kosong-p">Tidak ada perintah yang cocok</li>';
  }
  function bukaPalet() { if (kunciAktif) return; paletIn.value = ''; paletPilih = 0; gambarPalet(); palet.showModal(); paletIn.focus(); }
  function jalankanPalet(i) { const p = paletItem[i]; if (!p) return; palet.close(); p.f(); }
  paletIn.addEventListener('input', () => { paletPilih = 0; gambarPalet(); });
  paletIn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); paletPilih = Math.min(paletPilih + 1, paletItem.length - 1); gambarPalet(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paletPilih = Math.max(paletPilih - 1, 0); gambarPalet(); }
    else if (e.key === 'Enter') { e.preventDefault(); jalankanPalet(paletPilih); }
  });
  paletUl.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) jalankanPalet(+li.dataset.i); });
  palet.addEventListener('click', e => { if (e.target === palet) palet.close(); });

  mulai().catch(e => {
    tampilGerbang(`<h2>Tidak bisa terhubung</h2><p class="ket">${esc(e && e.message || 'Terjadi kesalahan.')}</p><button class="btn penuh" onclick="location.reload()">Coba lagi</button>`);
  });
})();

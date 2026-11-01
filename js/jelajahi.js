// Halaman Jelajahi PUBLIK (jelajahi.html). Bisa dibuka tanpa login, boleh diindeks Google.
// Hanya memanggil jelajahi_publik() (sql/035): catatan yang penulisnya centang sendiri "tampil di Jelajahi".
// Tabel posts tetap tertutup untuk anon. Isi hanya di-escape; tidak ada tautan @ atau # otomatis.
// Berbeda dari explore.html (di dalam aplikasi, butuh login, noindex): halaman ini sengaja terpisah.
(async function () {
  const daftar = $('#daftar'), kaki = $('#kaki'), ajak = $('#ajak'), samping = $('#samping'), aksiAtas = $('#aksiAtas');
  const HALAMAN = 20;
  let kursor = null, habis = false, memuat = false;
  const sudah = new Set();
  if (window.catatCorong) catatCorong('jelajahi');

  async function sesi() { try { return (await db.auth.getSession()).data.session; } catch (e) { return null; } }
  const masuk = !!(await sesi());

  // ---- Kartu catatan ------------------------------------------------------------------------
  function kartu(c) {
    const nama = String(c.nama || c.username || '?').trim() || '?';
    let h = 0;
    for (const ch of nama) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const awal = (Array.from(nama)[0] || '?').toUpperCase();
    const d = new Date(c.publik_pada);
    const tgl = isNaN(d) ? '' : d.toLocaleDateString(I18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return '<article class="post jl-kartu" role="listitem" data-id="' + esc(c.id) + '">' +
      '<span class="ava"><span class="avatar" style="width:42px;height:42px;font-size:18px;background:hsl(' + h + ' 50% 42%)">' + esc(awal) + '</span></span>' +
      '<div class="badan"><div class="jl-nama"><span class="nama">' + esc(nama) + '</span> <span class="user">@' + esc(c.username) + '</span>' + (tgl ? ' <span class="waktu">' + esc(tgl) + '</span>' : '') + '</div>' +
      '<a class="jl-isi" href="n.html?id=' + esc(c.id) + '"><div class="isi">' + esc(c.content) + '</div></a>' +
      '<div class="aksi"><span class="btn-suka" aria-hidden="true">' + (typeof IK !== 'undefined' ? IK.suka : '♥') + '<span>' + Number(c.jumlah_suka || 0) + '</span></span></div></div></article>';
  }

  function kerangka(n) {
    let h = '';
    for (let i = 0; i < n; i++) h += '<div class="post skel jl-kerangka" aria-hidden="true"><span class="ava"><span class="avatar" style="width:42px;height:42px"></span></span><div class="badan"><div class="garis-skel" style="width:40%"></div><div class="garis-skel" style="width:92%"></div><div class="garis-skel" style="width:70%"></div></div></div>';
    return h;
  }

  // ---- Ajakan gabung: di bawah daftar (layar sempit) dan kartu samping (desktop) -------------
  function ajakan() {
    const href = masuk ? 'index.html' : 'login.html';
    const teks = masuk ? t('pub.buka') : t('pub.gabung');
    ajak.innerHTML = '<p>' + esc(t('pub.ajak')) + '</p><a class="btn" data-gabung href="' + href + '">' + esc(teks) + '</a>';
    ajak.hidden = false;
    samping.innerHTML = '<div class="jl-samping-isi"><p>' + esc(t('pub.ajak')) + '</p><a class="btn" data-gabung href="' + href + '">' + esc(teks) + '</a></div>' +
      '<nav class="jl-samping-tautan" aria-label="' + esc(t('jl.tentang')) + '"><a href="landing.html">' + esc(t('jl.tentang')) + '</a><a href="pusat-bantuan.html">' + esc(t('set.bantuan')) + '</a></nav>';
    samping.hidden = false;
    aksiAtas.innerHTML = '<a class="btn kecil' + (masuk ? '' : ' garis') + '" data-gabung href="' + href + '">' + esc(masuk ? t('pub.buka') : t('auth.masuk')) + '</a>';
    if (!masuk) document.querySelectorAll('[data-gabung]').forEach(a => a.addEventListener('click', () => { if (window.catatCorong) catatCorong('landing_mulai'); }));
  }

  // ---- Galat: bedakan jaringan, izin server, dan lainnya ------------------------------------
  function jenisGalat(e) {
    const m = String((e && e.message) || ''), k = String((e && e.code) || '');
    if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return 'jaringan';
    if (k === '42501' || k === '42883' || k === 'PGRST202' || k === 'PGRST301' || /permission denied|could not find the function|does not exist|schema cache/i.test(m)) return 'server';
    return 'lain';
  }
  function kotakGalat(e, awal) {
    const jenis = jenisGalat(e);
    if (e) console.warn('[jelajahi]', (e && e.code) || '', (e && e.message) || '');
    const pesan = jenis === 'jaringan' ? galatRamah(e) : t('err.umum');
    // Kode pendek (mis. 42501) membantu pengelola menemukan sebabnya dari HP tanpa membuka konsol; bukan pesan mentah server
    const kode = (jenis === 'server' && e && /^[A-Z0-9]{4,8}$/.test(String(e.code || ''))) ? '<p class="jl-kode">' + esc(e.code) + '</p>' : '';
    return '<div class="kosong jl-galat" role="alert"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(pesan) + '</p>' + kode + '<button class="btn" id="coba" type="button">' + esc(t('umum.cobaLagi')) + '</button></div>';
  }

  function tampilKaki() {
    if (!daftar.querySelector('.jl-kartu')) { kaki.hidden = true; return; }
    if (habis) kaki.innerHTML = '<p class="jl-ujung">' + esc(t('jl.ujung')) + '</p>';
    else kaki.innerHTML = '<button class="btn garis" id="lagi" type="button">' + esc(t('jl.lagi')) + '</button>';
    kaki.hidden = false;
  }

  async function muat() {
    if (memuat || habis) return;
    memuat = true;
    daftar.setAttribute('aria-busy', 'true');
    const pertama = !daftar.querySelector('.jl-kartu');
    if (pertama) { daftar.innerHTML = kerangka(4); kaki.hidden = true; }
    else { const b = $('#lagi'); if (b) { b.disabled = true; b.textContent = t('umum.memuat'); } }

    let hasil;
    try { hasil = await db.rpc('jelajahi_publik', { p_limit: HALAMAN, p_sebelum: kursor }); }
    catch (e) { hasil = { data: null, error: e }; }
    memuat = false;
    daftar.setAttribute('aria-busy', 'false');
    const { data, error } = hasil;

    if (error) {
      if (pertama) daftar.innerHTML = kotakGalat(error);
      else { console.warn('[jelajahi]', error.code || '', error.message || ''); kaki.innerHTML = '<p class="jl-ujung">' + esc(t('err.umum')) + '</p><button class="btn garis" id="lagi" type="button">' + esc(t('umum.cobaLagi')) + '</button>'; kaki.hidden = false; }
      return;
    }
    if (pertama) daftar.innerHTML = '';
    const baris = (data || []).filter(c => c && c.id && !sudah.has(c.id));
    (data || []).forEach(c => { if (c && c.id) sudah.add(c.id); });
    if (baris.length) daftar.insertAdjacentHTML('beforeend', baris.map(kartu).join(''));
    if (data && data.length) kursor = data[data.length - 1].publik_pada;
    if (!data || data.length < HALAMAN) habis = true;
    if (!daftar.querySelector('.jl-kartu')) {
      daftar.innerHTML = '<div class="kosong"><p>' + esc(t('jl.kosong')) + '</p></div>';
      kaki.hidden = true;
    } else tampilKaki();
  }

  // Satu pintu untuk semua tombol di halaman ini (kerangka dan kaki dibuat ulang tiap muat)
  document.addEventListener('click', e => {
    if (e.target.closest('#coba')) { habis = false; kursor = null; sudah.clear(); daftar.innerHTML = ''; muat(); return; }
    if (e.target.closest('#lagi')) { muat(); return; }
    // Membaca satu catatan dari sini dicatat sekali (angka saja)
    if (e.target.closest('.jl-isi') && window.catatCorong) catatCorong('jelajahi_baca');
  });

  ajakan();
  await muat();
})();

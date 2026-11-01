// Tampilan: avatar, keadaan kosong, efek memuat, placeholder bergantian.
// Dimuat setelah supabase.js, jadi fungsi htmlPost di sini menggantikan yang lama.

// Path foto di Supabase Storage (bucket "avatar") -> URL publik. URL penuh/blob dipakai apa adanya.
function urlFoto(f) {
  if (!f) return '';
  if (/^(https?:|blob:|data:)/.test(f)) return f;
  return SUPABASE_URL + '/storage/v1/object/public/avatar/' + String(f).split('/').map(encodeURIComponent).join('/');
}

// foto (opsional): path/URL foto profil. Huruf inisial tetap ada di bawahnya sebagai cadangan bila foto gagal dimuat.
function avatar(nama, ukuran, foto) {
  const u = ukuran || 40;
  const n = (nama || '?').trim() || '?';
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  const gb = foto ? `<img src="${esc(urlFoto(foto))}" alt="" loading="lazy" decoding="async">` : '';
  return `<span class="avatar" style="width:${u}px;height:${u}px;font-size:${Math.round(u * 0.42)}px;background:hsl(${h} 50% 42%)">${esc(Array.from(n)[0].toUpperCase())}${gb}</span>`;
}
// Lencana centang biru. Dua sumber:
//  1) AKUN_RESMI: username yang dicadangkan di SQL (migrasi 009), selalu bercentang.
//  2) Akun verified yang diberikan admin dari Pusat Kendali (migrasi 028), diambil lewat daftar_verified().
// Daftar verified disimpan di localStorage dan diperbarui di belakang layar paling cepat tiap 2 menit,
// jadi lencanaResmi() tetap sinkron dan tidak menambah kueri per kartu. Bila daftar belum pernah dimuat
// (kunjungan pertama), kartu diberi penanda kosong yang diisi begitu daftar tiba.
const AKUN_RESMI = ['jurkon', 'journalconnection', 'jurnalkoneksi'];
const VF = { set: new Set(), siap: false };
const VF_SEGEL = "M23.39 12.00 L23.31 12.59 L23.07 13.16 L22.71 13.70 L22.29 14.19 L21.85 14.64 L21.47 15.08 L21.17 15.52 L20.97 16.00 L20.87 16.52 L20.84 17.10 L20.82 17.73 L20.77 18.37 L20.65 19.01 L20.42 19.58 L20.06 20.06 L19.58 20.42 L19.01 20.65 L18.37 20.77 L17.73 20.82 L17.10 20.84 L16.52 20.87 L16.00 20.97 L15.52 21.17 L15.08 21.47 L14.64 21.85 L14.19 22.29 L13.70 22.71 L13.16 23.07 L12.59 23.31 L12.00 23.39 L11.41 23.31 L10.84 23.07 L10.30 22.71 L9.81 22.29 L9.36 21.85 L8.92 21.47 L8.48 21.17 L8.00 20.97 L7.48 20.87 L6.90 20.84 L6.27 20.82 L5.63 20.77 L4.99 20.65 L4.42 20.42 L3.94 20.06 L3.58 19.58 L3.35 19.01 L3.23 18.37 L3.18 17.73 L3.16 17.10 L3.13 16.52 L3.03 16.00 L2.83 15.52 L2.53 15.08 L2.15 14.64 L1.71 14.19 L1.29 13.70 L0.93 13.16 L0.69 12.59 L0.61 12.00 L0.69 11.41 L0.93 10.84 L1.29 10.30 L1.71 9.81 L2.15 9.36 L2.53 8.92 L2.83 8.48 L3.03 8.00 L3.13 7.48 L3.16 6.90 L3.18 6.27 L3.23 5.63 L3.35 4.99 L3.58 4.42 L3.94 3.94 L4.42 3.58 L4.99 3.35 L5.63 3.23 L6.27 3.18 L6.90 3.16 L7.48 3.13 L8.00 3.03 L8.48 2.83 L8.92 2.53 L9.36 2.15 L9.81 1.71 L10.30 1.29 L10.84 0.93 L11.41 0.69 L12.00 0.61 L12.59 0.69 L13.16 0.93 L13.70 1.29 L14.19 1.71 L14.64 2.15 L15.08 2.53 L15.52 2.83 L16.00 3.03 L16.52 3.13 L17.10 3.16 L17.73 3.18 L18.37 3.23 L19.01 3.35 L19.58 3.58 L20.06 3.94 L20.42 4.42 L20.65 4.99 L20.77 5.63 L20.82 6.27 L20.84 6.90 L20.87 7.48 L20.97 8.00 L21.17 8.48 L21.47 8.92 L21.85 9.36 L22.29 9.81 L22.71 10.30 L23.07 10.84 L23.31 11.41Z";
const VF_JENIS = { resmi: ['pc.resmi', 'pc.resmiInfo'], verified: ['pc.verified', 'pc.verifiedInfo'] };
function svgCentang(jenis) {
  const j = VF_JENIS[jenis];
  return '<svg class="vf-lencana ' + jenis + '" data-vf-jenis="' + jenis + '" viewBox="0 0 24 24" role="img" aria-label="' + esc(t(j[0])) + '"><path class="segel" d="' + VF_SEGEL + '"/><path class="kilau" d="M12 1.6c-3 0-5.600 1.700-7 4.200 1.800-1.200 4.200-1.800 7-1.800s5.200.6 7 1.800c-1.400-2.500-4-4.200-7-4.200z"/><path class="cek" d="M7.300 12.400l3 3 6.200-6.400"/></svg>';
}
function lencanaResmi(u) {
  const n = String(u || '').toLowerCase();
  if (!n) return '';
  if (AKUN_RESMI.includes(n)) return svgCentang('resmi');
  if (VF.set.has(n)) return svgCentang('verified');
  return VF.siap ? '' : '<span class="vf" data-vf="' + esc(n) + '"></span>';
}
(function () {
  const KUNCI = 'vf_daftar', TTL = 2 * 60 * 1000;
  let umur = Infinity;
  try {
    const c = JSON.parse(localStorage.getItem(KUNCI) || 'null');
    if (c && Array.isArray(c.u)) { VF.set = new Set(c.u); VF.siap = true; umur = Date.now() - (c.t || 0); }
  } catch (e) {}
  if (umur < TTL) return;
  const selesai = () => {
    VF.siap = true;
    document.querySelectorAll('.vf[data-vf]').forEach(el => { el.outerHTML = lencanaResmi(el.getAttribute('data-vf')); });
  };
  try {
    Promise.resolve(db.rpc('daftar_verified')).then(r => {
      if (r && !r.error && Array.isArray(r.data)) {
        VF.set = new Set(r.data.map(x => String(x).toLowerCase()));
        try { localStorage.setItem(KUNCI, JSON.stringify({ t: Date.now(), u: r.data })); } catch (e) {}
      }
      selesai();
    }).catch(selesai);
  } catch (e) { selesai(); }
})();

// Info lencana: tahan lama (HP) atau arahkan kursor (desktop) pada centang untuk melihat artinya.
// Ketukan singkat tetap membuka profil seperti biasa; setelah tahan lama, ketukan lanjutannya diabaikan.
(function () {
  let tip = null, timer = null, tutup = null, titik = null, baruTahan = 0;
  const hapus = () => { clearTimeout(timer); clearTimeout(tutup); if (tip) { tip.remove(); tip = null; } };
  function tampil(el) {
    const j = VF_JENIS[el.getAttribute('data-vf-jenis')];
    if (!j) return;
    hapus();
    tip = document.createElement('div');
    tip.className = 'vf-tip ' + el.getAttribute('data-vf-jenis');
    tip.setAttribute('role', 'tooltip');
    tip.innerHTML = '<b>' + esc(t(j[0])) + '</b><span>' + esc(t(j[1])) + '</span>';
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    let y = r.bottom + 10; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 10);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.style.setProperty('--panah', Math.round(Math.min(Math.max(14, r.left + r.width / 2 - x), w - 14)) + 'px');
    requestAnimationFrame(() => tip && tip.classList.add('tampil'));
    tutup = setTimeout(hapus, 4000);
  }
  const lencana = e => e.target && e.target.closest ? e.target.closest('.vf-lencana') : null;

  document.addEventListener('pointerdown', e => {
    const el = lencana(e);
    if (!el) { hapus(); return; }
    if (e.pointerType === 'mouse') return;
    titik = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => { baruTahan = Date.now(); tampil(el); }, 450);
  });
  document.addEventListener('pointermove', e => {
    if (titik && (Math.abs(e.clientX - titik.x) > 8 || Math.abs(e.clientY - titik.y) > 8)) { clearTimeout(timer); titik = null; }
  });
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, () => { clearTimeout(timer); titik = null; }));
  // Mouse: kartu muncul saat kursor diam sebentar di atas lencana
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = lencana(e); if (!el) return;
    clearTimeout(timer); timer = setTimeout(() => tampil(el), 250);
  });
  document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && lencana(e)) hapus(); });
  // Setelah tahan lama: jangan lanjut membuka profil, dan matikan menu tautan bawaan browser
  document.addEventListener('click', e => {
    if (lencana(e) && Date.now() - baruTahan < 800) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('contextmenu', e => { if (lencana(e)) e.preventDefault(); });
  window.addEventListener('scroll', hapus, { passive: true });
  window.addEventListener('resize', hapus);
})();

// Foto gagal dimuat -> buang gambarnya, huruf inisial muncul lagi
document.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.closest && t.closest('.avatar')) t.remove();
}, true);

const IK = {
  suka: '<svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  balas: '<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  lapor: '<svg viewBox="0 0 24 24"><path d="M4 22V4"/><path d="M4 4h13l-2.5 4.5L17 13H4"/></svg>',
  hapus: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>',
  bagikan: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M4 13v5a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5"/></svg>',
  mata: '<svg viewBox="0 0 24 24"><path d="M6 20v-6M12 20V4M18 20V10"/></svg>'
};

// 1.234 -> "1,2 rb", 1.500.000 -> "1,5 jt" (angka kecil apa adanya)
function ringkas(n) {
  n = Number(n) || 0;
  const loc = I18n.locale;
  const f = (x, s) => (Math.round(x * 10) / 10).toLocaleString(loc) + (s.length === 1 ? '' : ' ') + s;
  return n >= 1e6 ? f(n / 1e6, t('num.jt')) : n >= 1e4 ? f(n / 1e3, t('num.rb')) : n.toLocaleString(loc);
}

// Angka di tombol aksi (suka, tidak suka, posting ulang, tayang): nilai asli disimpan di data-n,
// angka 0 tidak ditampilkan (kosong), dan perubahan diberi animasi "tik" singkat.
// Mengembalikan true bila nilainya berubah.
function setAngka(el, n, tik) {
  if (!el) return false;
  n = Math.max(0, Math.floor(Number(n) || 0));
  const lama = el.dataset.n === undefined ? null : Number(el.dataset.n);
  if (lama === n) return false;
  el.dataset.n = n;
  el.textContent = n > 0 ? ringkas(n) : '';
  if (tik !== false && lama !== null && window.matchMedia && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.classList.remove('tik'); void el.offsetWidth; el.classList.add('tik');
  }
  return true;
}

// ---- Tautan di dalam posting ---------------------------------------------------------
// Alamat http(s) tampil sebagai kartu kecil yang menyebut TUJUANNYA ("Spotify · Album", "YouTube · Video"),
// bukan alamat panjang. Aturan keamanan: nama situs hanya dikenali dari domain yang PERSIS cocok (spotify.com
// atau subdomainnya, bukan spotify.com.situs-lain.com); domain asli selalu tampil di baris kedua; alamat dengan
// user:sandi@ ditolak (trik phishing klasik) dan tampil sebagai teks biasa; tautan pendek (bit.ly dst.) diberi tanda
// karena tujuannya tersembunyi. Tautan dibuka di tab baru dengan rel="noopener noreferrer nofollow ugc".
const POLA_URL = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const TAUTAN_PENDEK = new Set(['bit.ly', 'tinyurl.com', 's.id', 'cutt.ly', 'rb.gy', 'shorturl.at', 'is.gd', 'ow.ly', 't.ly',
  'tiny.cc', 'rebrand.ly', 't.co', 'goo.gl', 'buff.ly', 'lnkd.in', 'bit.do', 'shp.ee', 'tokopedia.link', 'linktr.ee']);
const IK_TAUTAN = {
  musik: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.200-2.500z"/></svg>',
  foto: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.500 6.500h.01"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.700-7-11a7 7 0 0 1 14 0c0 5.300-7 11-7 11z"/><circle cx="12" cy="10" r="2.500"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  kode: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  buku: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/></svg>',
  tautan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/></svg>',
  awas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>',
  luar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
};
const cocok = (h, d) => h === d || h.endsWith('.' + d);

// Kembalikan { nama, jenis (kunci kamus tt.*) atau null, ikon } bila domainnya dikenal, selain itu null.
function kenalSitus(h, u) {
  const p = u.pathname, a = p.split('/').filter(Boolean);
  if (h === 'open.spotify.com' || h === 'spotify.link' || h === 'spotify.com') {
    const m = /^\/(?:intl-[a-z-]+\/)?(album|track|playlist|artist|episode|show)\//i.exec(p);
    const peta = { album: 'album', track: 'lagu', playlist: 'playlist', artist: 'artis', episode: 'podcast', show: 'podcast' };
    return { nama: 'Spotify', jenis: m ? peta[m[1].toLowerCase()] : null, ikon: 'musik' };
  }
  if (h === 'youtu.be') return { nama: 'YouTube', jenis: 'video', ikon: 'video' };
  if (cocok(h, 'youtube.com')) {
    const j = /^\/(watch|shorts|live)\b/.test(p) ? 'video' : p.startsWith('/playlist') ? 'playlist' : /^\/(@|channel\/|c\/|user\/)/.test(p) ? 'kanal' : null;
    return { nama: h === 'music.youtube.com' ? 'YouTube Music' : 'YouTube', jenis: j, ikon: 'video' };
  }
  if (cocok(h, 'instagram.com') || h === 'instagr.am') {
    const j = /^\/p\//.test(p) ? 'postingan' : /^\/reels?\//.test(p) ? 'reel' : a.length === 1 ? 'profil' : null;
    return { nama: 'Instagram', jenis: j, ikon: 'foto' };
  }
  if (cocok(h, 'tiktok.com')) {
    const j = /\/video\//.test(p) || h.startsWith('vm.') || h.startsWith('vt.') ? 'video' : /^\/@[^/]+\/?$/.test(p) ? 'profil' : null;
    return { nama: 'TikTok', jenis: j, ikon: 'video' };
  }
  if (cocok(h, 'x.com') || cocok(h, 'twitter.com')) {
    return { nama: 'X', jenis: /\/status\//.test(p) ? 'postingan' : a.length === 1 ? 'profil' : null, ikon: 'chat' };
  }
  if (cocok(h, 'facebook.com') || h === 'fb.watch' || h === 'fb.com') return { nama: 'Facebook', jenis: h === 'fb.watch' ? 'video' : null, ikon: 'chat' };
  if (h === 'github.com') return { nama: 'GitHub', jenis: a.length >= 2 ? 'repo' : a.length === 1 ? 'profil' : null, ikon: 'kode' };
  if (cocok(h, 'wikipedia.org')) return { nama: 'Wikipedia', jenis: /^\/wiki\//.test(p) ? 'artikel' : null, ikon: 'buku' };
  if (h === 'maps.app.goo.gl' || h === 'maps.google.com' || (cocok(h, 'google.com') && /^\/maps/.test(p))) return { nama: 'Google Maps', jenis: 'lokasi', ikon: 'pin' };
  if (h === 'wa.me' || h === 'api.whatsapp.com') return { nama: 'WhatsApp', jenis: 'chat', ikon: 'chat' };
  if (h === 'chat.whatsapp.com') return { nama: 'WhatsApp', jenis: 'grup', ikon: 'chat' };
  if (h === 't.me') return { nama: 'Telegram', jenis: 'chat', ikon: 'chat' };
  return null;
}

// URL mentah (belum di-escape) -> HTML kartu tautan, atau null bila tidak aman / tidak sah (lalu ditampilkan sebagai teks).
// kompak = true: alamat di tengah kalimat -> pil satu baris yang mengalir bersama teks; false: alamat di baris sendiri -> kartu.
function htmlTautan(mentah, kompak) {
  let u;
  if (mentah.length > 2000) return null;
  try { u = new URL(mentah); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!h.includes('.') && !/^\[/.test(h)) return null;
  const kenal = TAUTAN_PENDEK.has(h) ? null : kenalSitus(h, u);
  const pendek = TAUTAN_PENDEK.has(h);
  let judul, baris2, ikon = 'tautan', kelas = 'tautan';
  if (kenal) {
    judul = kenal.nama + (kenal.jenis ? ' · ' + t('tt.' + kenal.jenis) : '');
    baris2 = h; ikon = kenal.ikon;
  } else if (pendek) {
    judul = h; baris2 = t('tt.pendek'); ikon = 'awas'; kelas += ' awas';
  } else {
    let jalur = u.pathname === '/' ? '' : u.pathname;
    try { jalur = decodeURIComponent(jalur); } catch (e) {}
    judul = h; baris2 = (jalur + (u.search ? '?…' : '')) || t('tt.tautan');
  }
  if (kompak) kelas += ' kecil';
  const tampil2 = kompak && !kenal ? '' : baris2;      // pil: domain sudah jadi judul untuk situs tak dikenal; peringatan tautan pendek lewat ikon dan label
  return '<a class="' + kelas + '" href="' + esc(u.href) + '" target="_blank" rel="noopener noreferrer nofollow ugc"'
    + ' title="' + esc(h + (pendek ? ' — ' + baris2 : '')) + '"'
    + ' aria-label="' + esc(t('tt.aria', { judul: judul + (pendek ? ' (' + baris2 + ')' : ''), host: h })) + '">'
    + '<span class="tt-ikon">' + IK_TAUTAN[ikon] + '</span>'
    + '<span class="tt-teks"><b>' + esc(judul) + '</b>' + (tampil2 ? '<small>' + esc(tampil2) + '</small>' : '') + '</span>'
    + '<span class="tt-luar">' + IK_TAUTAN.luar + '</span></a>';
}

// Teks biasa (di-escape): @username menjadi tautan ke profil, #tagar menjadi tautan ke pencarian Jelajah.
// Tagar: 2-30 huruf/angka/garis bawah, minimal satu huruf (jadi "#1" atau "#2024" bukan tagar).
// "&" dan "#" dikecualikan sebagai pendahulu supaya entitas HTML hasil esc() (misalnya &#39;) tidak ikut terbaca.
function teksHtml(t) {
  return esc(t).replace(/(^|[^a-z0-9_@])@([a-z0-9_]{3,20})(?![a-z0-9_])/gi,
    (m, a, u) => `${a}<a class="sebut" href="profil.html?u=${u.toLowerCase()}">@${u}</a>`)
    .replace(/(^|[^\p{L}\p{N}_&#])#(?=[\p{N}_]*\p{L})([\p{L}\p{N}_]{2,30})(?![\p{L}\p{N}_])/gu,
      (m, a, g) => `${a}<a class="sebut tagar" href="explore.html?q=${encodeURIComponent('#' + g)}">#${g}</a>`);
}

// Isi posting aman: teks biasa lewat teksHtml, alamat http(s) menjadi kartu tautan (htmlTautan).
function isiHtml(isi) {
  isi = String(isi == null ? '' : isi);
  let hasil = '', akhir = 0, m;
  POLA_URL.lastIndex = 0;
  while ((m = POLA_URL.exec(isi))) {
    let url = m[0], buntut = '';
    const mb = /[.,;:!?)\]}”’]+$/.exec(url);            // tanda baca penutup kalimat bukan bagian alamat
    if (mb) { buntut = mb[0]; url = url.slice(0, -buntut.length); }
    let depan = isi.slice(akhir, m.index);
    const sisa = isi.slice(m.index + m[0].length - buntut.length);
    const sendiri = /(^|\n)[ \t]*$/.test(depan) && /^[ \t]*(\n|$)/.test(sisa);   // alamat sendirian di barisnya
    const kartu = url ? htmlTautan(url, !sendiri) : null;
    if (kartu && sendiri) depan = depan.replace(/[ \t]*\n?$/, '');            // kartu sudah di baris sendiri: buang satu baris baru di depannya
    hasil += teksHtml(depan) + (kartu || esc(url));
    akhir = m.index + m[0].length - buntut.length;
    POLA_URL.lastIndex = akhir;
    if (kartu && sendiri && isi.charAt(akhir) === '\n') akhir++;               // dan satu baris baru sesudahnya
  }
  return hasil + teksHtml(isi.slice(akhir));
}

// opsi: { tanpaInduk: true } menyembunyikan baris "Membalas ..." (dipakai di halaman detail)
// Tanggal panjang sesuai bahasa aktif ("31 Oktober 2026")
function tglPanjang(iso) {
  return new Date(iso).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

// Label sisa waktu untuk catatan berumur ("Hilang dalam 3 jam")
function labelBerumur(iso) {
  const s = (new Date(iso) - Date.now()) / 1000;
  if (!(s > 0)) return '';
  if (s < 3600) return t('pc.hilangMenit', { n: Math.max(1, Math.round(s / 60)) });
  if (s < 86400) return t('pc.hilangJam', { n: Math.round(s / 3600) });
  return t('pc.hilangHari', { n: Math.round(s / 86400) });
}

function htmlPost(p, saya, opsi) {
  if (!p.content && !p.parent_id) return htmlUlang(p, saya);   // posting ulang: isinya diambil dari posting asli
  const jml = p.likes?.[0]?.count ?? 0;
  const suka = p.sudah_suka ? 'sudah' : '';
  const nama = p.profiles.nama || p.profiles.username;
  const milik = saya && saya.id === p.user_id;
  const induk = p.parent_id && !(opsi && opsi.tanpaInduk)
    ? `<div class="induk">${IK.balas}<a href="detail.html?id=${p.parent_id}">${esc(p.induk_username ? t('pc.membalasUser', { u: p.induk_username }) : t('pc.membalasCatatan'))}</a></div>` : '';
  // Tayang: tersembunyi sampai ada yang melihat; elemennya tetap ada supaya bisa muncul saat angkanya naik
  const tayang = p.dilihat == null ? ''
    : `<span class="tayang"${p.dilihat > 0 ? '' : ' hidden'} title="${esc(t('pc.dilihat', { n: p.dilihat }))}" aria-label="${esc(t('pc.dilihat', { n: p.dilihat }))}">${IK.mata}<span data-n="${Number(p.dilihat) || 0}">${p.dilihat > 0 ? ringkas(p.dilihat) : ''}</span></span>`;
  return `<article class="post" data-id="${p.id}">
    <a class="ava" href="profil.html?u=${esc(p.profiles.username)}" aria-label="${esc(t('pc.profilDari', { nama }))}">${avatar(nama, 42, p.profiles.foto_url)}</a>
    <div class="badan">
      <a href="profil.html?u=${esc(p.profiles.username)}"><span class="nama">${esc(nama)}</span>${lencanaResmi(p.profiles.username)}
      <span class="user">@${esc(p.profiles.username)}</span><span class="waktu">${waktu(p.created_at)}</span></a>
      ${induk}<div class="isi">${isiHtml(p.content)}</div>
      ${p.kedaluwarsa && labelBerumur(p.kedaluwarsa) ? `<div class="berumur">${esc(labelBerumur(p.kedaluwarsa))}</div>` : ''}
      ${p.kapsul_ditulis ? '<div class="berumur">' + esc(t('pc.kapsulDitulis', { tgl: tglPanjang(p.kapsul_ditulis) })) + '</div>' : ''}
      <div class="aksi">
        <a class="a-balas" href="detail.html?id=${p.id}" aria-label="${esc(t('umum.balas'))}">${IK.balas}<span>${esc(t('umum.balas'))}</span></a>
        <span class="grup-suka"><button class="btn-suka ${suka}" data-id="${p.id}" aria-label="${esc(t('pc.suka'))}">${IK.suka}<span data-n="${Number(jml) || 0}">${jml > 0 ? ringkas(jml) : ''}</span></button></span>
        ${tayang}
        <span class="sisi">
          <button type="button" class="btn-bagikan" aria-label="${esc(t('pc.bagikan'))}" title="${esc(t('pc.bagikan'))}">${IK.bagikan}</button>
          ${milik ? '' : `<button class="btn-lapor" data-id="${p.id}" aria-label="${esc(t('pc.lapor'))}" title="${esc(t('pc.lapor'))}">${IK.lapor}</button>`}
          ${typeof tombolSemat === 'function' ? tombolSemat(p, milik) : ''}
          ${typeof tombolKartu === 'function' ? tombolKartu(p, milik) : ''}
          ${typeof tombolPublik === 'function' ? tombolPublik(p, milik) : ''}
          ${milik ? `<button class="btn-hapus" data-id="${p.id}" aria-label="${esc(t('pc.hapus'))}" title="${esc(t('pc.hapus'))}">${IK.hapus}</button>` : ''}
        </span>
      </div>
    </div></article>`;
}

const IKON = {
  pena: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  cari: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  pesan: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  balas: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>',
  suka: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.8 4.5 7.2 4.5c1.9 0 3.700 1 4.800 2.700 1.100-1.700 2.900-2.700 4.800-2.700 3.400 0 5.600 3.400 4.400 6.700-1.700 4.700-9.200 9.300-9.200 9.300z"/></svg>'
};

function kosong(ikon, judul, teks, href, label) {
  return `<div class="kosong"><div class="kosong-ikon">${IKON[ikon] || ''}</div>
    <h3>${judul}</h3><p>${teks}</p>
    ${href ? `<a class="btn" href="${href}">${label}</a>` : ''}</div>`;
}

function skeleton(n) {
  const satu = `<div class="post skel"><span class="avatar"></span><div class="badan">
    <div class="garis-skel" style="width:40%"></div>
    <div class="garis-skel" style="width:90%"></div>
    <div class="garis-skel" style="width:65%"></div></div></div>`;
  return satu.repeat(n || 3);
}

// Placeholder bergantian: <textarea data-ph="satu|dua|tiga">
document.querySelectorAll('[data-ph],[data-i-phs]').forEach(el => {
  const daftar = (el.dataset.iPhs ? t(el.dataset.iPhs) : el.dataset.ph).split('|');
  let i = 0;
  el.placeholder = daftar[0];
  if (daftar.length > 1) {
    setInterval(() => {
      if (!el.value) { i = (i + 1) % daftar.length; el.placeholder = daftar[i]; }
    }, 3500);
  }
});

// Mengetuk isi posting membuka detail (tautan @username di dalamnya tetap ke profil)
document.addEventListener('click', e => {
  const isi = e.target.closest('.post .isi');
  if (!isi || e.target.closest('a')) return;
  if (String(window.getSelection ? getSelection() : '').length) return;   // sedang memilih teks
  const post = isi.closest('.post');
  const id = post && post.dataset.id;
  if (!id || (/detail\.html$/.test(location.pathname) && param('id') === id)) return;
  location.href = 'detail.html?id=' + id;
});

// Toast kecil yang dipakai bersama semua halaman (gaya .toast)
function toastUmum(teks) {
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = teks;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('hilang'), 2200);
  setTimeout(() => el.remove(), 2600);
}
// Bagikan catatan: lembar bagikan bawaan ponsel bila ada, kalau tidak salin tautannya.
// Tombol ini tidak butuh login, jadi dipisah dari pasangAksiPost.
document.addEventListener('click', async e => {
  const b = e.target.closest('.btn-bagikan');
  if (!b) return;
  const post = b.closest('.post'), id = post && post.dataset.id;
  if (!id) return;
  const url = location.origin + '/detail.html?id=' + encodeURIComponent(id);
  const el = post.querySelector('.nama');
  const nama = (el && el.textContent.trim()) || 'Jurkon';
  if (navigator.share) {
    try { await navigator.share({ title: t('pc.bagikanJudul', { nama }), url }); return; }
    catch (err) { if (err && err.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toastUmum(t('pub.tersalin')); }
  catch (err) { prompt(t('pc.salinManual'), url); }
});

// Satu pendengar klik untuk semua tombol posting (menggantikan versi di supabase.js)
function pasangAksiPost(saya, muat) {
  document.addEventListener('click', async e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    if (!saya) { location.href = 'login.html'; return; }
    if (b.classList.contains('btn-suka')) {
      if (b.dataset.sibuk) return;
      b.dataset.sibuk = '1';
      const sudah = b.classList.contains('sudah');
      const n = b.querySelector('span');
      const awal = Number(n.dataset.n) || 0;
      // Tampilan langsung berubah (terasa instan); dikembalikan bila server menolak
      b.classList.toggle('sudah');
      if (!sudah) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 500); }
      setAngka(n, awal + (sudah ? -1 : 1));
      const { error } = sudah
        ? await db.from('likes').delete().match({ post_id: id, user_id: saya.id })
        : await db.from('likes').insert({ post_id: id, user_id: saya.id });
      delete b.dataset.sibuk;
      if (error) {
        b.classList.toggle('sudah', sudah); setAngka(n, awal, false);
        alert(/terlalu cepat|batas/i.test(error.message || '') ? error.message : t('pc.gagalSuka'));
      }
    } else if (b.classList.contains('btn-lapor')) {
      const alasan = prompt(t('pc.alasan'));
      if (!alasan || !alasan.trim()) return;
      const { error } = await db.from('reports').insert({ reporter_id: saya.id, post_id: id, alasan: alasan.trim().slice(0, 300) });
      if (error) alert(error.code === '23505' ? t('pc.sudahLapor') : t('pc.gagalLapor', { pesan: galatRamah(error) }));
      else alert(t('pc.terkirim'));
    } else if (b.classList.contains('btn-hapus')) {
      if (!confirm(t('pc.konfirmHapus'))) return;
      const { error } = await db.from('posts').delete().eq('id', id);
      if (error) alert(t('pc.gagalHapus', { pesan: galatRamah(error) })); else muat();
    }
  });
}

// Akun yang belum memilih username diarahkan ke halaman selamat.html
(async function jagaProfilSiap() {
  const hal = location.pathname.split('/').pop();
  if (['login.html', 'selamat.html', 'aturan.html', 'reset.html'].includes(hal)) return;
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    const kunci = 'siap:' + session.user.id;
    try { if (sessionStorage.getItem(kunci) === '1') return; } catch (e) {}
    const { data } = await db.from('profiles').select('siap').eq('id', session.user.id).maybeSingle();
    if (data && data.siap === false) { location.replace('selamat.html'); return; }
    if (data && data.siap) { try { sessionStorage.setItem(kunci, '1'); } catch (e) {} }
  } catch (e) {}
})();

// Kolom posting tanpa hitungan tertanam (likes(count)) agar tidak bergantung pada pengaturan agregat Supabase
const PILIH_POSTING = '*, profiles(username,nama,foto_url)';

// Menandai suka milikku sekaligus mengisi jumlah suka tiap posting (menggantikan versi di supabase.js)
async function tandaiSuka(posts, saya) {
  if (!posts.length) return posts;
  const { data } = await db.from('likes').select('post_id,user_id').in('post_id', posts.map(p => p.id)).limit(5000);
  const hitung = {}, milik = new Set();
  (data || []).forEach(l => {
    hitung[l.post_id] = (hitung[l.post_id] || 0) + 1;
    if (saya && l.user_id === saya.id) milik.add(l.post_id);
  });
  posts.forEach(p => { p.likes = [{ count: hitung[p.id] || 0 }]; p.sudah_suka = milik.has(p.id); });
  return posts;
}

// Cache daftar posting di perangkat (untuk tampil instan) dihapus saat keluar, supaya tidak tertinggal di perangkat bersama.
function hapusCacheLokal() { try { Object.keys(localStorage).filter(k => k.startsWith('jk:')).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
try { db.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') hapusCacheLokal(); }); } catch (e) {}


// ---- Perangkat, dislike, kutip, dan posting ulang (migrasi 013) ---------------------
// Semua angka tambahan diambil satu kali lewat statistik_posting lalu ditempel ke kartu.
// Bila migrasi belum dijalankan, bagian ini berhenti diam-diam dan kartu tampil seperti biasa.
const IK2 = {
  ios: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/></svg>',
  android: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.500 5.500h3"/><path d="M10 18.500h4"/></svg>',
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  tidaksuka: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.120 10 14H4.170a2 2 0 0 1-1.920-2.560l2.330-8A2 2 0 0 1 6.500 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.760a2 2 0 0 0-1.790 1.110L12 22a3.130 3.130 0 0 1-3-3.880Z"/></svg>',
  ulang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>'
};
const NAMA_PERANGKAT = { ios: 'iOS', android: 'Android', web: 'Web' };

function deteksiPerangkat() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

// Kirim posting; bila kolom "perangkat" belum ada di database, kirim ulang tanpa kolom itu.
async function kirimPosting(baris) {
  const r = await db.from('posts').insert({ ...baris, perangkat: deteksiPerangkat() });
  if (r.error && (r.error.code === '42703' || r.error.code === 'PGRST204') && /perangkat/i.test(r.error.message || '')) {
    return db.from('posts').insert(baris);
  }
  return r;
}

// Kotak kutipan: p = { id, content, created_at, profiles: { username, nama } } atau null bila tidak tersedia
function htmlKutipan(p) {
  if (!p) return `<div class="kutipan hilang">${esc(t('pc.kutipanHilang'))}</div>`;
  const nama = p.profiles ? (p.profiles.nama || p.profiles.username) : '';
  return `<a class="kutipan" href="detail.html?id=${p.id}">
    <span class="kutipan-kepala"><b>${esc(nama)}</b> <span>@${esc(p.profiles ? p.profiles.username : '')}</span> <span>· ${waktu(p.created_at)}</span></span>
    <span class="kutipan-isi">${p.content ? esc(p.content) : ''}</span></a>`;
}

// Kartu posting ulang: kerangka dulu, posting aslinya dimasukkan setelah datanya tiba
function htmlUlang(p, saya) {
  const nama = (p.profiles && (p.profiles.nama || p.profiles.username)) || '';
  const milik = saya && saya.id === p.user_id;
  return `<div class="ulang-kartu" data-id="${p.id}">
    <div class="ulang-kepala">${IK2.ulang}
      <a href="profil.html?u=${esc(p.profiles ? p.profiles.username : '')}">${esc(t('pc.memostingUlang', { nama }))}</a>
      <span class="waktu">${waktu(p.created_at)}</span>
      ${milik ? `<button type="button" class="btn-batal-ulang" data-id="${p.id}">${esc(t('pc.batalUlang'))}</button>` : ''}
    </div>
    <div class="ulang-asli">${skeleton(1)}</div></div>`;
}

(function pasangInteraksi() {
  const stat = new Map();     // id -> baris statistik (null bila tidak terlihat)
  const asli = new Map();     // id posting asli -> data posting (null bila tidak tersedia)
  let antri = new Set(), timer = null, mati = false, sayaKini = null, ambilan = Promise.resolve();
  const PILIH = () => (typeof PILIH_POSTING !== 'undefined' ? PILIH_POSTING : '*, profiles(username,nama,foto_url)');

  async function pengguna() {
    if (sayaKini) return sayaKini;
    try { const { data: { session } } = await db.auth.getSession(); sayaKini = session ? session.user : null; } catch (e) {}
    return sayaKini;
  }

  const sel = id => CSS.escape ? CSS.escape(id) : id;

  function perbaruiTombol(id, tik) {
    const r = stat.get(id); if (!r) return;
    document.querySelectorAll('.btn-tidaksuka[data-id="' + sel(id) + '"]').forEach(b => {
      b.classList.toggle('sudah', !!r.saya_tidak_suka);
      b.setAttribute('aria-pressed', !!r.saya_tidak_suka);
      setAngka(b.querySelector('span'), r.tidak_suka, tik);
    });
    document.querySelectorAll('.btn-ulang[data-id="' + sel(id) + '"]').forEach(b => {
      b.classList.toggle('sudah', !!r.saya_ulang);
      setAngka(b.querySelector('span'), Number(r.ulang) + Number(r.kutip), tik);
    });
  }

  function hiasKartu(el, r) {
    const aksi = el.querySelector('.aksi'), badan = el.querySelector('.badan');
    if (!aksi || !badan || el.dataset.hias) return;
    el.dataset.hias = '1';
    const id = el.dataset.id;
    // Urutan akhir: Balas · Posting ulang · [Suka | Tidak suka] · Tayang · (sisi: lapor, sematkan, ...)
    const grup = aksi.querySelector('.grup-suka');
    const sebelum = grup || aksi.querySelector('.tayang') || aksi.querySelector('.sisi');
    const buat = (kelas, ikon, label) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = kelas; b.dataset.id = id;
      b.setAttribute('aria-label', label); b.title = label;
      b.innerHTML = ikon + '<span data-n="0"></span>';
      return b;
    };
    aksi.insertBefore(buat('btn-ulang', IK2.ulang, t('pc.ulangOpsi')), sebelum);
    const tdk = buat('btn-tidaksuka', IK2.tidaksuka, t('pc.tidakSuka'));
    if (grup) {
      const sekat = document.createElement('i');
      sekat.className = 'sekat'; sekat.setAttribute('aria-hidden', 'true');
      grup.append(sekat, tdk);
      grup.classList.add('dua');
    } else aksi.insertBefore(tdk, aksi.querySelector('.tayang') || aksi.querySelector('.sisi'));
    // Penanda perangkat: ikon kecil di baris nama dan waktu (bukan baris sendiri di bawah kartu)
    if (NAMA_PERANGKAT[r.perangkat]) {
      const label = t('pc.perangkat', { perangkat: NAMA_PERANGKAT[r.perangkat] });
      const waktuEl = badan.querySelector('.waktu');
      if (waktuEl) {
        const f = document.createElement('span');
        f.className = 'perangkat'; f.title = label; f.setAttribute('role', 'img'); f.setAttribute('aria-label', label);
        f.innerHTML = IK2[r.perangkat];
        waktuEl.append(f);          // di dalam elemen waktu, supaya ikon tidak turun sendirian ke baris baru
      }
    }
    if (r.jenis === 'kutip' && r.kutip_id && !el.querySelector('.kutipan')) {
      const isi = el.querySelector('.isi');
      if (isi) isi.insertAdjacentHTML('afterend', htmlKutipan(asli.get(r.kutip_id) || null));
    }
    perbaruiTombol(id, false);
  }

  async function isiUlang(el, r) {
    const wadah = el.querySelector('.ulang-asli');
    if (!wadah || wadah.dataset.siap) return;
    const kid = r && r.kutip_id;
    wadah.dataset.siap = '1';
    if (kid && !asli.has(kid)) {   // pengambilan gagal: tawarkan coba lagi
      wadah.innerHTML = `<div class="kutipan hilang">${esc(t('umum.gagalMuat'))} <button type="button" class="tautan-btn ulang-coba">${esc(t('umum.cobaLagi'))}</button></div>`;
      return;
    }
    const p = kid ? asli.get(kid) : null;
    if (p && p.content !== undefined) wadah.innerHTML = htmlPost(p, await pengguna());
    else wadah.innerHTML = htmlKutipan(null);
  }

  // Ambil posting asli. Bila gagal (jaringan/server), jangan dicatat sebagai "tidak tersedia": kartu menawarkan coba lagi.
  async function ambilAsli(ids) {
    const dapat = new Map(), gagal = new Set();
    try {
      const { data, error } = await db.from('posts').select(PILIH()).in('id', ids);
      if (error) throw error;
      (data || []).forEach(p => dapat.set(p.id, p));
    } catch (e) {
      // Cadangan: tanpa gabungan profil, satu per satu
      for (const id of ids) {
        try {
          const { data: p, error } = await db.from('posts').select('*').eq('id', id).maybeSingle();
          if (error) { gagal.add(id); continue; }
          if (!p) continue;
          const { data: pr } = await db.from('profiles').select('username,nama,foto_url').eq('id', p.user_id).maybeSingle();
          p.profiles = pr || { username: '', nama: null, foto_url: null };
          dapat.set(id, p);
        } catch (e2) { gagal.add(id); }
      }
    }
    if (dapat.size) { try { if (typeof tandaiSuka === 'function') await tandaiSuka([...dapat.values()], await pengguna()); } catch (e) {} }
    ids.forEach(id => { if (dapat.has(id)) asli.set(id, dapat.get(id)); else if (gagal.has(id)) asli.delete(id); });
  }

  // Dipakai tab Reposts di profil: baris posting ulang dan aslinya sudah di tangan, tak perlu diambil lagi
  window.siapkanUlang = function (baris, aslinya) {
    (aslinya || []).forEach(p => asli.set(p.id, p));
    (baris || []).forEach(b => {
      if (!b.kutip_id) return;
      if (!asli.has(b.kutip_id)) asli.set(b.kutip_id, null);   // sudah dicari: memang tidak tersedia
      stat.set(b.id, { id: b.id, jenis: 'ulang', kutip_id: b.kutip_id, perangkat: b.perangkat || null, tidak_suka: 0, saya_tidak_suka: false, ulang: 0, saya_ulang: false, kutip: 0 });
    });
  };

  async function proses() {
    timer = null;
    if (mati || typeof db === 'undefined') return;
    const semua = [...antri]; antri = new Set();
    const baru = semua.filter(id => !stat.has(id));
    for (let i = 0; i < baru.length; i += 100) {
      const bagian = baru.slice(i, i + 100);
      const { data, error } = await db.rpc('statistik_posting', { p_ids: bagian });
      if (error) { mati = true; return; }   // migrasi 013 belum dipasang
      bagian.forEach(id => stat.set(id, null));
      (data || []).forEach(r => stat.set(r.id, r));
    }
    // Kartu posting ulang tanpa baris statistik: baca jenis & kutip_id langsung dari tabel
    const tanpaStat = semua.filter(id => !stat.get(id) && document.querySelector('.ulang-kartu[data-id="' + sel(id) + '"]'));
    if (tanpaStat.length) {
      try {
        const { data } = await db.from('posts').select('id,jenis,kutip_id').in('id', tanpaStat);
        (data || []).forEach(r => stat.set(r.id, Object.assign({ perangkat: null, tidak_suka: 0, saya_tidak_suka: false, ulang: 0, saya_ulang: false, kutip: 0 }, r)));
      } catch (e) {}
    }
    // Ambil posting asli untuk kutipan dan posting ulang
    const perlu = [...new Set(semua.map(id => stat.get(id)).filter(r => r && r.kutip_id && !asli.has(r.kutip_id)).map(r => r.kutip_id))];
    if (perlu.length) {
      perlu.forEach(id => asli.set(id, null));
      ambilan = ambilan.then(() => ambilAsli(perlu));
    }
    // Putaran lain yang berjalan bersamaan ikut menunggu di sini, supaya kartu tidak langsung
    // menampilkan "tidak tersedia" sebelum posting aslinya selesai diambil.
    await ambilan;
    for (const id of semua) {
      const r = stat.get(id);
      document.querySelectorAll('.ulang-kartu[data-id="' + sel(id) + '"]').forEach(el => isiUlang(el, r));
      if (!r) continue;
      document.querySelectorAll('.post[data-id="' + sel(id) + '"]').forEach(el => hiasKartu(el, r));
    }
  }

  function periksa(akar) {
    const daftar = [];
    if (akar.matches && akar.matches('.post[data-id],.ulang-kartu[data-id]')) daftar.push(akar);
    if (akar.querySelectorAll) akar.querySelectorAll('.post[data-id],.ulang-kartu[data-id]').forEach(x => daftar.push(x));
    let ada = false;
    daftar.forEach(x => {
      const id = x.dataset.id;
      if (stat.has(id) && (!x.classList.contains('ulang-kartu') || asli.has((stat.get(id) || {}).kutip_id))) {
        const r = stat.get(id);
        // Kartu posting ulang yang digambar ulang (mis. dari cache lalu data segar) menunggu pengambilan
        // posting asli yang masih berjalan, bukan langsung menampilkan "tidak tersedia".
        if (x.classList.contains('ulang-kartu')) ambilan.then(() => isiUlang(x, stat.get(id))); else if (r) hiasKartu(x, r);
      } else { antri.add(id); ada = true; }
    });
    if (ada && !timer) timer = setTimeout(proses, 120);
  }

  // ---- Tindakan ----
  function galat(e) {
    const m = (e && e.message) || '';
    alert(/terlalu|batas|tidak ditemukan|tidak dapat/i.test(m) ? m : t('pc.gagalAksi'));
  }

  async function tidakSuka(b) {
    if (b.dataset.sibuk) return;
    b.dataset.sibuk = '1';
    const id = b.dataset.id, r = stat.get(id);
    const { data, error } = await db.rpc('toggle_tidak_suka', { p_id: id });
    delete b.dataset.sibuk;
    if (error) return galat(error);
    if (r) { r.tidak_suka = data.tidak_suka; r.saya_tidak_suka = data.saya_tidak_suka; }
    perbaruiTombol(id);
    // Tidak suka membatalkan suka: sesuaikan tombol suka di layar
    document.querySelectorAll('.btn-suka[data-id="' + sel(id) + '"]').forEach(k => {
      k.classList.remove('sudah');
      setAngka(k.querySelector('span'), data.suka);
    });
  }

  function menuUlang(id) {
    const r = stat.get(id) || {};
    const dlg = document.createElement('dialog');
    dlg.className = 'lembar menu-ulang';
    dlg.innerHTML = `<div class="menu-ulang-isi">
      <button type="button" data-aksi="ulang">${IK2.ulang}<span>${esc(r.saya_ulang ? t('pc.batalUlang') : t('pc.ulang'))}</span></button>
      <button type="button" data-aksi="kutip">${IKON.pena}<span>${esc(t('pc.kutip'))}</span></button>
      <button type="button" data-aksi="batal" class="batal">${esc(t('ak.batal'))}</button></div>`;
    document.body.appendChild(dlg);
    const tutup = () => { try { dlg.close(); } catch (e) {} dlg.remove(); };
    dlg.addEventListener('click', async e => {
      if (e.target === dlg) return tutup();
      const b = e.target.closest('button[data-aksi]'); if (!b) return;
      const aksi = b.dataset.aksi;
      if (aksi === 'batal') return tutup();
      if (aksi === 'kutip') {
        if (window.Tulis) { tutup(); window.Tulis.buka({ kutip: id }); }
        else location.href = 'post.html?kutip=' + encodeURIComponent(id);
        return;
      }
      b.disabled = true;
      const { data, error } = await db.rpc('toggle_ulang', { p_id: id, p_perangkat: deteksiPerangkat() });
      tutup();
      if (error) return galat(error);
      if (r) { r.ulang = data.ulang; r.saya_ulang = data.saya_ulang; }
      perbaruiTombol(id);
    });
    dlg.addEventListener('cancel', () => dlg.remove());
    dlg.showModal();
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('btn-tidaksuka') || b.classList.contains('btn-ulang') || b.classList.contains('btn-batal-ulang')) {
      if (!(await pengguna())) { location.href = 'login.html'; return; }
    }
    if (b.classList.contains('btn-tidaksuka')) tidakSuka(b);
    else if (b.classList.contains('btn-ulang')) menuUlang(b.dataset.id);
    else if (b.classList.contains('btn-batal-ulang')) {
      const { error } = await db.from('posts').delete().eq('id', b.dataset.id);
      if (error) return galat(error);
      const k = b.closest('.ulang-kartu'); if (k) k.remove();
    } else if (b.classList.contains('ulang-coba')) {
      const kartu = b.closest('.ulang-kartu'), w = kartu && kartu.querySelector('.ulang-asli');
      if (!w) return;
      w.innerHTML = skeleton(1); delete w.dataset.siap;
      antri.add(kartu.dataset.id);
      if (!timer) timer = setTimeout(proses, 0);
    } else if (b.classList.contains('btn-suka')) {
      // Menyukai membatalkan "tidak suka" (dilakukan database); samakan tampilan setelah klik diproses
      setTimeout(() => {
        if (!b.classList.contains('sudah')) return;
        const id = b.dataset.id, r = stat.get(id);
        if (r && r.saya_tidak_suka) { r.saya_tidak_suka = false; r.tidak_suka = Math.max(0, Number(r.tidak_suka) - 1); perbaruiTombol(id); }
      }, 0);
    }
  });

  function mulai() {
    if (!('MutationObserver' in window)) return;
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && periksa(n))))
      .observe(document.body, { childList: true, subtree: true });
    periksa(document.body);
  }
  if (document.body) mulai(); else document.addEventListener('DOMContentLoaded', mulai);
})();

if (typeof IKON === 'object' && !IKON.ulang && typeof IK2 === 'object') IKON.ulang = IK2.ulang;

// ---- Angka langsung (migrasi 030) ---------------------------------------------------
// Suka, tidak suka, posting ulang, dan tayang pada kartu yang sedang terlihat diperbarui sendiri.
// Satu pemanggilan angka_posting() untuk semua kartu di layar; jedanya 6 detik, melebar sampai 30 detik
// bila tidak ada perubahan, berhenti saat tab di latar belakang, dan kembali cepat saat tab dibuka lagi.
// Bila migrasinya belum dipasang, bagian ini berhenti diam-diam dan kartu tetap berfungsi seperti biasa.
(function pasangAngkaLangsung() {
  if (typeof db === 'undefined') return;
  const CEPAT = 6000, LAMBAT = 30000;
  let jeda = CEPAT, timer = null, mati = false, jalan = false, masuk = null;
  const sel = id => (window.CSS && CSS.escape) ? CSS.escape(id) : id;

  function idTerlihat() {
    const tinggi = window.innerHeight || 800, ids = new Set();
    document.querySelectorAll('.post[data-id]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom > -tinggi && r.top < tinggi * 2) ids.add(el.dataset.id);   // layar ini ditambah satu layar di atas dan bawah
    });
    return [...ids].slice(0, 60);
  }

  function terapkan(r) {
    let ubah = false;
    document.querySelectorAll('.post[data-id="' + sel(r.id) + '"]').forEach(el => {
      const suka = el.querySelector('.btn-suka');
      if (suka && !suka.dataset.sibuk) ubah = setAngka(suka.querySelector('span'), r.suka) || ubah;   // jangan menimpa klik yang sedang diproses
      const tdk = el.querySelector('.btn-tidaksuka');
      if (tdk && !tdk.dataset.sibuk) ubah = setAngka(tdk.querySelector('span'), r.tidak_suka) || ubah;
      const ulg = el.querySelector('.btn-ulang');
      if (ulg) ubah = setAngka(ulg.querySelector('span'), Number(r.ulang) + Number(r.kutip)) || ubah;
      const ty = el.querySelector('.tayang');
      if (ty && r.dilihat != null) {
        const n = Number(r.dilihat) || 0;
        if (setAngka(ty.querySelector('span'), n)) {
          ubah = true; ty.hidden = n <= 0;
          const label = t('pc.dilihat', { n: n });
          ty.title = label; ty.setAttribute('aria-label', label);
        }
      }
    });
    return ubah;
  }

  async function putaran() {
    timer = null;
    if (mati || jalan) return;
    if (document.hidden) return;   // dilanjutkan oleh visibilitychange
    jalan = true;
    let ubah = false;
    try {
      if (masuk === null) { const { data: { session } } = await db.auth.getSession(); masuk = !!session; }
      const ids = masuk ? idTerlihat() : [];
      if (ids.length) {
        const { data, error } = await db.rpc('angka_posting', { p_ids: ids });
        if (error) {
          if (/PGRST202|42883|does not exist|could not find/i.test((error.code || '') + ' ' + (error.message || ''))) { mati = true; return; }
          jeda = Math.min(LAMBAT, jeda * 2);   // gangguan sementara: pelan-pelan saja
        } else {
          (data || []).forEach(r => { ubah = terapkan(r) || ubah; });
          jeda = ubah ? CEPAT : Math.min(LAMBAT, Math.round(jeda * 1.4));
        }
      }
    } catch (e) { jeda = Math.min(LAMBAT, jeda * 2); }
    finally { jalan = false; jadwal(); }
  }

  function jadwal(tunda) {
    if (mati || timer || document.hidden) return;
    timer = setTimeout(putaran, tunda == null ? jeda : tunda);
  }

  // Dipanggil dari mana saja setelah tindakan sendiri, agar angka lain ikut menyegarkan cepat
  window.segarkanAngka = function () { jeda = CEPAT; if (timer) { clearTimeout(timer); timer = null; } jadwal(1200); };

  document.addEventListener('visibilitychange', () => { if (!document.hidden) { jeda = CEPAT; if (timer) { clearTimeout(timer); timer = null; } jadwal(400); } });
  window.addEventListener('online', () => { jeda = CEPAT; jadwal(400); });
  try { db.auth.onAuthStateChange(() => { masuk = null; }); } catch (e) {}
  jadwal(3000);
})();

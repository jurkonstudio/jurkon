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
// Lencana centang biru untuk akun resmi. Username-nya juga dicadangkan di SQL (migrasi 009).
const AKUN_RESMI = ['jurkon', 'journalconnection', 'jurnalkoneksi'];
function lencanaResmi(u) {
  if (!AKUN_RESMI.includes(String(u || '').toLowerCase())) return '';
  return '<svg class="centang" viewBox="0 0 24 24" role="img" aria-label="' + esc(t('pc.resmi')) + '"><title>' + esc(t('pc.resmi')) + '</title><circle cx="12" cy="12" r="11"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>';
}

// Foto gagal dimuat -> buang gambarnya, huruf inisial muncul lagi
document.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.closest && t.closest('.avatar')) t.remove();
}, true);

const IK = {
  suka: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.8 4.5 7.2 4.5c1.9 0 3.700 1 4.800 2.700 1.100-1.700 2.900-2.700 4.800-2.700 3.400 0 5.600 3.400 4.400 6.700-1.700 4.700-9.200 9.300-9.200 9.300z"/></svg>',
  balas: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  lapor: '<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/></svg>',
  hapus: '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>',
  mata: '<svg viewBox="0 0 24 24"><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
};

// 1.234 -> "1,2 rb", 1.500.000 -> "1,5 jt" (angka kecil apa adanya)
function ringkas(n) {
  n = Number(n) || 0;
  const loc = I18n.locale;
  const f = (x, s) => (Math.round(x * 10) / 10).toLocaleString(loc) + (s.length === 1 ? '' : ' ') + s;
  return n >= 1e6 ? f(n / 1e6, t('num.jt')) : n >= 1e4 ? f(n / 1e3, t('num.rb')) : n.toLocaleString(loc);
}

// Isi posting aman (di-escape): @username menjadi tautan ke profil, #tagar menjadi tautan ke pencarian Jelajah.
// Tagar: 2-30 huruf/angka/garis bawah, minimal satu huruf (jadi "#1" atau "#2024" bukan tagar).
// "&" dan "#" dikecualikan sebagai pendahulu supaya entitas HTML hasil esc() (misalnya &#39;) tidak ikut terbaca.
function isiHtml(t) {
  return esc(t).replace(/(^|[^a-z0-9_@])@([a-z0-9_]{3,20})(?![a-z0-9_])/gi,
    (m, a, u) => `${a}<a class="sebut" href="profil.html?u=${u.toLowerCase()}">@${u}</a>`)
    .replace(/(^|[^\p{L}\p{N}_&#])#(?=[\p{N}_]*\p{L})([\p{L}\p{N}_]{2,30})(?![\p{L}\p{N}_])/gu,
      (m, a, g) => `${a}<a class="sebut tagar" href="explore.html?q=${encodeURIComponent('#' + g)}">#${g}</a>`);
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
  const tayang = p.dilihat == null ? ''
    : `<span class="tayang" title="${esc(t('pc.dilihat', { n: p.dilihat }))}" aria-label="${esc(t('pc.dilihat', { n: p.dilihat }))}">${IK.mata}<span>${ringkas(p.dilihat)}</span></span>`;
  return `<article class="post" data-id="${p.id}">
    <a class="ava" href="profil.html?u=${esc(p.profiles.username)}" aria-label="${esc(t('pc.profilDari', { nama }))}">${avatar(nama, 42, p.profiles.foto_url)}</a>
    <div class="badan">
      <a href="profil.html?u=${esc(p.profiles.username)}"><span class="nama">${esc(nama)}</span>${lencanaResmi(p.profiles.username)}
      <span class="user">@${esc(p.profiles.username)}</span><span class="waktu">${waktu(p.created_at)}</span></a>
      ${induk}<div class="isi">${isiHtml(p.content)}</div>
      ${p.kedaluwarsa && labelBerumur(p.kedaluwarsa) ? `<div class="berumur">${esc(labelBerumur(p.kedaluwarsa))}</div>` : ''}
      ${p.kapsul_ditulis ? '<div class="berumur">' + esc(t('pc.kapsulDitulis', { tgl: tglPanjang(p.kapsul_ditulis) })) + '</div>' : ''}
      <div class="aksi">
        <button class="btn-suka ${suka}" data-id="${p.id}" aria-label="${esc(t('pc.suka'))}">${IK.suka}<span>${jml}</span></button>
        <a href="detail.html?id=${p.id}" aria-label="${esc(t('umum.balas'))}">${IK.balas}<span>${esc(t('umum.balas'))}</span></a>
        ${tayang}
        <span class="sisi">
          <button class="btn-lapor" data-id="${p.id}" aria-label="${esc(t('pc.lapor'))}" title="${esc(t('pc.lapor'))}">${IK.lapor}</button>
          ${typeof tombolSemat === 'function' ? tombolSemat(p, milik) : ''}
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
      const awal = +n.textContent || 0;
      // Tampilan langsung berubah (terasa instan); dikembalikan bila server menolak
      b.classList.toggle('sudah');
      n.textContent = Math.max(0, awal + (sudah ? -1 : 1));
      const { error } = sudah
        ? await db.from('likes').delete().match({ post_id: id, user_id: saya.id })
        : await db.from('likes').insert({ post_id: id, user_id: saya.id });
      delete b.dataset.sibuk;
      if (error) {
        b.classList.toggle('sudah', sudah); n.textContent = awal;
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

  function perbaruiTombol(id) {
    const r = stat.get(id); if (!r) return;
    document.querySelectorAll('.btn-tidaksuka[data-id="' + sel(id) + '"]').forEach(b => {
      b.classList.toggle('sudah', !!r.saya_tidak_suka);
      b.setAttribute('aria-pressed', !!r.saya_tidak_suka);
      b.querySelector('span').textContent = ringkas(r.tidak_suka);
    });
    document.querySelectorAll('.btn-ulang[data-id="' + sel(id) + '"]').forEach(b => {
      b.classList.toggle('sudah', !!r.saya_ulang);
      b.querySelector('span').textContent = ringkas(Number(r.ulang) + Number(r.kutip));
    });
  }

  function hiasKartu(el, r) {
    const aksi = el.querySelector('.aksi'), badan = el.querySelector('.badan');
    if (!aksi || !badan || el.dataset.hias) return;
    el.dataset.hias = '1';
    const id = el.dataset.id;
    const sebelum = aksi.querySelector('.tayang') || aksi.querySelector('.sisi');
    const tombol = (kelas, ikon, label) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = kelas; b.dataset.id = id;
      b.setAttribute('aria-label', label); b.title = label;
      b.innerHTML = ikon + '<span>0</span>';
      aksi.insertBefore(b, sebelum);
    };
    tombol('btn-tidaksuka', IK2.tidaksuka, t('pc.tidakSuka'));
    tombol('btn-ulang', IK2.ulang, t('pc.ulangOpsi'));
    if (NAMA_PERANGKAT[r.perangkat]) {
      const label = t('pc.perangkat', { perangkat: NAMA_PERANGKAT[r.perangkat] });
      const f = document.createElement('div');
      f.className = 'perangkat'; f.title = label; f.setAttribute('aria-label', label);
      f.innerHTML = IK2[r.perangkat] + '<span>' + NAMA_PERANGKAT[r.perangkat] + '</span>';
      aksi.after(f);
    }
    if (r.jenis === 'kutip' && r.kutip_id && !el.querySelector('.kutipan')) {
      const isi = el.querySelector('.isi');
      if (isi) isi.insertAdjacentHTML('afterend', htmlKutipan(asli.get(r.kutip_id) || null));
    }
    perbaruiTombol(id);
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
      const n = k.querySelector('span'); if (n) n.textContent = data.suka;
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

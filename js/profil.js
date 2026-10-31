let saya = null, profil = null, daf = null, tabAktif = 'catatan', tabTerpasang = false;
const SUKA_PUBLIK = true;   // false = tab Menyukai hanya terlihat oleh pemilik profil
const TAB_PROFIL = ['catatan', 'balasan', 'ulang', 'suka', 'kapsul'];
const IKP = {
  titik: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  gigi: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  bagikan: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg>',
  kalender: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
};
function tutupMenu() {
  const m = $('#menuIsi'), b = $('#menuLain');
  if (m) m.hidden = true;
  if (b) b.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', e => { if (!e.target.closest('.menu-lain')) tutupMenu(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#menuIsi') && !$('#menuIsi').hidden) { tutupMenu(); const b = $('#menuLain'); if (b) b.focus(); }
});

async function muat() {
  const { data: p, error } = await ambilProfilInfo(param('u'), saya);
  if (error) {
    $('#atas').innerHTML = '<div class="kosong"><h3>' + esc(t('pf.gagal')) + '</h3><p>' + esc(pesanGalat(error)) + '</p><button class="btn" id="coba">' + esc(t('umum.cobaLagi')) + '</button></div>';
    $('#coba').onclick = muat;
    return;
  }
  if (!p) { $('#atas').innerHTML = '<div class="kosong">' + esc(t('pf.noProfil')) + '</div>'; return; }
  profil = p;
  const milikSaya = p.id === saya.id;
  const pengikut = p.pengikut, mengikuti = p.mengikuti, ikut = p.saya_ikut, blk = p.saya_blokir;
  const nama = p.nama || p.username;
  // Apakah dia mengikuti saya (untuk label "Mengikuti kamu" dan tombol "Ikuti balik").
  // Saling mengikuti = saya mengikuti dia DAN dia mengikuti saya.
  let diaMengikuti = false;
  if (!milikSaya) {
    const { data: balik } = await db.from('follows').select('follower_id')
      .match({ follower_id: p.id, following_id: saya.id }).maybeSingle();
    diaMengikuti = !!balik;
  }
  const salingIkuti = ikut && diaMengikuti;
  $('#judul').textContent = '@' + p.username;
  $('#atas').innerHTML = `<div class="profil-atas">
    <div class="kartu-kepala">${avatar(nama, 88, p.foto)}
      <div class="profil-nama"><h2>${esc(nama)}${lencanaResmi(p.username)}</h2><div class="profil-user">@${esc(p.username)}${diaMengikuti ? ` <span class="label-ikut">${esc(t('pf.mengikutiKamu'))}</span>` : ''}</div>
        <div class="profil-gabung" id="gabung" hidden>${IKP.kalender}<span></span></div></div></div>
    <div class="bio ${p.bio ? '' : 'redup'}">${p.bio ? esc(p.bio) : esc(milikSaya ? t('pf.bioKosongSaya') : t('pf.bioKosong'))}</div>
    <div class="stat"><div class="stat-item" id="statPosting"><b id="jmlPosting">–</b><span>${esc(t('pf.posting'))}</span></div><button type="button" class="stat-btn" data-daftar="pengikut" aria-label="${esc(t('pf.lihatPengikut', { n: pengikut }))}"><b>${pengikut}</b><span>${esc(t('pf.pengikut'))}</span></button><button type="button" class="stat-btn" data-daftar="mengikuti" aria-label="${esc(t('pf.lihatMengikuti', { n: mengikuti }))}"><b>${mengikuti}</b><span>${esc(t('pf.mengikuti'))}</span></button></div>
    <div class="tombol">${milikSaya
      ? `<button class="btn utama" id="ubah">${esc(t('pf.ubah'))}</button><button class="ikon-btn" id="bagikanSaya" aria-label="${esc(t('pf.bagikan'))}">${IKP.bagikan}</button>`
      : `<button class="btn utama ${ikut ? 'garis' : ''}" id="ikuti" aria-pressed="${ikut ? 'true' : 'false'}">${esc(ikut ? t('feed.ikuti') : diaMengikuti ? t('pf.ikutiBalik') : t('pf.ikuti'))}</button>
         <button class="btn garis" id="pesan"${salingIkuti ? '' : ' disabled aria-describedby="hintPesan"'}>${esc(t('pf.kirimPesan'))}</button>
         <div class="menu-lain"><button class="ikon-btn" id="menuLain" aria-label="${esc(t('pf.aksiLain'))}" aria-haspopup="menu" aria-expanded="false">${IKP.titik}</button>
           <div class="menu-isi" id="menuIsi" role="menu" hidden><button role="menuitem" id="bagikan">${esc(t('pf.bagikan'))}</button><button role="menuitem" id="blokir" class="${blk ? '' : 'bahaya'}">${esc(blk ? t('pf.bukaBlokir') : t('pf.blokir', { u: p.username }))}</button></div></div>`}</div>
    ${milikSaya || salingIkuti ? '' : `<p class="hint-pesan" id="hintPesan">${esc(t('pf.hintPesan'))}</p>`}</div>`;
  // Jumlah posting (sama dengan isi tab Catatan: bukan balasan, bukan repost). Dihitung terpisah, tanpa migrasi SQL.
  db.from('posts').select('*', { count: 'exact', head: true })
    .eq('user_id', p.id).is('parent_id', null).neq('jenis', 'ulang')
    .then(({ count, error }) => {
      const el = $('#jmlPosting');
      if (!el || profil !== p) return;
      el.textContent = (error || count == null) ? '–' : String(count);
    });
  // Tanggal bergabung: diambil terpisah supaya tidak butuh migrasi SQL
  db.from('profiles').select('created_at').eq('id', p.id).maybeSingle().then(({ data }) => {
    const el = $('#gabung');
    if (!el || !data || !data.created_at || profil !== p) return;
    el.querySelector('span').textContent = t('pf.gabung', { tgl: new Date(data.created_at).toLocaleDateString(I18n.locale, { month: 'long', year: 'numeric' }) });
    el.hidden = false;
  });
  if (milikSaya) {
    $('#keluar').innerHTML = `<button class="ikon-btn" id="bukaPengaturan" aria-label="${esc(t('pf.pengaturan'))}">${IKP.gigi}</button>`;
    $('#bukaPengaturan').onclick = () => $('#lembarPengaturan').showModal();
    $('#tutupPengaturan').onclick = () => $('#lembarPengaturan').close();
    $('#versi').textContent = t('set.versi', { v: '1.0.0' });
    // Setelah ganti bahasa halaman dimuat ulang; buka lagi Pengaturan supaya terasa berkelanjutan
    try { if (sessionStorage.getItem('bukaPengaturan') === '1') { sessionStorage.removeItem('bukaPengaturan'); $('#lembarPengaturan').showModal(); } } catch (e) {}
    $('#lembarPengaturan').onclick = e => { if (e.target === e.currentTarget) e.currentTarget.close(); };
    $('#logout').onclick = async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'login.html'; };
    $('#ubah').onclick = ubah;
    $('#bagikanSaya').onclick = bagikanProfil;
    $('#tema').hidden = false;
    $('#akun').hidden = false;
  } else {
    $('#menuLain').onclick = e => {
      e.stopPropagation();
      const m = $('#menuIsi'), buka = m.hidden;
      m.hidden = !buka;
      $('#menuLain').setAttribute('aria-expanded', String(buka));
      if (buka) $('#menuIsi button').focus();
    };
    $('#ikuti').onclick = async () => {
      $('#ikuti').disabled = true;
      const { error } = ikut
        ? await db.from('follows').delete().match({ follower_id: saya.id, following_id: p.id })
        : await db.from('follows').insert({ follower_id: saya.id, following_id: p.id });
      if (error) alert(pesanGalat(error));
      muat();
    };
    $('#bagikan').onclick = () => { tutupMenu(); bagikanProfil(); };
    $('#blokir').onclick = async () => {
      tutupMenu();
      if (blk) { await db.from('blocks').delete().match({ blocker_id: saya.id, blocked_id: p.id }); muat(); return; }
      if (!confirm(t('pf.konfirmBlokir', { u: p.username }))) return;
      const { error } = await db.rpc('blokir', { target: p.id });
      if (error) alert(t('pf.gagalBlokir', { pesan: galatRamah(error) })); else muat();
    };
    $('#pesan').onclick = async () => {
      const { data, error } = await db.rpc('buka_percakapan', { lawan: p.id });
      if (error) alert(t('pf.gagalAksi', { pesan: galatRamah(error) })); else location.href = 'chat.html?id=' + data;
    };
  }
  if (blk) { $('#tabProfil').hidden = true; $('#daftar').innerHTML = kosong('pena', t('pf.blokirJ'), t('pf.blokirT', { u: esc(p.username) })); return; }
  $('#tabProfil').hidden = false;
  $('#tp-suka').hidden = !(SUKA_PUBLIK || milikSaya);
  $('#tp-kapsul').hidden = !milikSaya;            // Kapsul hanya terlihat oleh pemilik profil
  $('#tabProfil').classList.toggle('lima', milikSaya);
  if ((tabAktif === 'suka' && $('#tp-suka').hidden) || (tabAktif === 'kapsul' && $('#tp-kapsul').hidden)) tabAktif = 'catatan';
  if (!tabTerpasang) {
    tabTerpasang = true;
    const t = $('#tabProfil');
    t.addEventListener('click', e => { const b = e.target.closest('[data-tp]'); if (b && b.dataset.tp !== tabAktif) { tabAktif = b.dataset.tp; tampilTab(); window.scrollTo({ top: Math.min(window.scrollY, $('#atas').offsetHeight) }); } });
    t.addEventListener('keydown', e => {        // panah kiri/kanan berpindah tab
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const ada = TAB_PROFIL.filter(k => !$('#tp-' + k).hidden);
      const n = (ada.indexOf(tabAktif) + (e.key === 'ArrowRight' ? 1 : ada.length - 1)) % ada.length;
      tabAktif = ada[n]; tampilTab(true);
    });
  }
  tampilTab();
}
// Catatan tidak lagi memuat posting ulang (pindah ke tab Reposts). Fungsi daftar masih mengirim semuanya,
// jadi disaring di sini; halaman berikutnya tetap mulai dari baris terakhir yang diambil.
async function ambilTabProfil(mode, id, sebelum) {
  const r = await ambilPosting({ mode, id, sebelum }, saya);
  if (mode !== 'catatan_oleh' || r.error) return r;
  let semua = r.data || [], akhir = semua.length ? semua[semua.length - 1].created_at : null;
  let penuh = semua.length >= (r.limit || HALAMAN), sisa = semua.filter(x => x.content || x.parent_id);
  for (let i = 0; i < 4 && !sisa.length && penuh && akhir; i++) {
    const h = await ambilPosting({ mode, id, sebelum: akhir }, saya);
    if (h.error) return h;
    semua = h.data || [];
    penuh = semua.length >= (h.limit || HALAMAN);
    if (semua.length) akhir = semua[semua.length - 1].created_at;
    sisa = semua.filter(x => x.content || x.parent_id);
  }
  return { data: sisa, error: null, limit: penuh ? Math.max(1, Math.min(HALAMAN, sisa.length)) : sisa.length + 1, kursorAkhir: akhir };
}
// Isi daftar sesuai tab: Catatan (posting utama), Balasan (balasan yang ditulisnya), Menyukai (yang ia sukai)
function tampilTab(fokus) {
  clearInterval(kapsulTimer);
  const p = profil, milikSaya = p.id === saya.id, u = esc(p.username);
  TAB_PROFIL.forEach(k => {
    const b = $('#tp-' + k), aktif = k === tabAktif;
    b.setAttribute('aria-selected', aktif);
    b.tabIndex = aktif ? 0 : -1;
    if (aktif) { $('#daftar').setAttribute('aria-labelledby', b.id); if (fokus) b.focus(); }
  });
  const kosongTab = {
    catatan: () => milikSaya ? kosong('pena', t('pf.k.catatanJ'), t('pf.k.catatanT'), 'post.html', t('umum.tulisSekarang')) : kosong('pena', t('pf.k.postJ'), t('pf.k.postT', { u })),
    balasan: () => milikSaya ? kosong('balas', t('detail.noBalasanJ'), t('pf.k.balasanT'), 'explore.html', t('umum.cariCatatan')) : kosong('balas', t('detail.noBalasanJ'), t('pf.k.balasanOrangT', { u })),
    ulang: () => milikSaya ? kosong('ulang', t('pf.k.ulangJ'), t('pf.k.ulangT'), 'explore.html', t('umum.jelajahi')) : kosong('ulang', t('pf.k.ulangJ'), t('pf.k.ulangOrangT', { u })),
    suka: () => milikSaya ? kosong('suka', t('pf.k.sukaJ'), t('pf.k.sukaT'), 'explore.html', t('umum.jelajahi')) : kosong('suka', t('pf.k.sukaOrangJ'), t('pf.k.sukaOrangT', { u }))
  };
  const mode = { catatan: 'catatan_oleh', balasan: 'balasan_oleh', ulang: 'ulang_oleh', suka: 'disukai_oleh' }[tabAktif];
  if (daf) daf.hentikan();            // batalkan permintaan tab sebelumnya
  const el = $('#daftar');
  el.innerHTML = '';                  // buang pendengar lama bersama isinya agar tidak dobel
  const baru = el.cloneNode(false);
  el.replaceWith(baru);
  if (tabAktif === 'kapsul') { daf = null; tampilKapsul(baru); return; }
  daf = daftarBerhalaman(baru, sebelum => ambilTabProfil(mode, p.id, sebelum), kosongTab[tabAktif], saya,
    tabAktif === 'suka' ? { kursor: x => x.suka_pada || x.created_at } : null);
  daf.muat();
}
// ---- Tab Kapsul (khusus pemilik) -------------------------------------------
let kapsulVersi = 0, kapsulTimer = null, kapsulMuatAkhir = 0;
function sisaKapsul(iso) {
  const sisa = (new Date(iso) - Date.now()) / 1000;
  if (!(sisa > 0)) return t('kapsul.segera');
  if (sisa < 3600) return t('kapsul.sisaMenit', { n: Math.max(1, Math.ceil(sisa / 60)) });
  if (sisa < 86400) return t('kapsul.sisaJam', { n: Math.ceil(sisa / 3600) });
  return t('kapsul.sisaHari', { n: Math.ceil(sisa / 86400) });
}
async function tampilKapsul(el) {
  clearInterval(kapsulTimer);
  const ini = ++kapsulVersi;
  kapsulMuatAkhir = Date.now();
  el.innerHTML = '<p class="hitung" style="padding:16px 20px">' + esc(t('umum.memuat')) + '</p>';
  const { data, error } = await db.rpc('kapsul_saya');
  if (ini !== kapsulVersi || tabAktif !== 'kapsul' || !el.isConnected) return;
  if (error) {
    el.innerHTML = '<div class="kosong"><p>' + esc(pesanGalat(error)) + '</p><button class="btn" id="kapsulCoba">' + esc(t('umum.cobaLagi')) + '</button></div>';
    $('#kapsulCoba').onclick = () => tampilKapsul(el);
    return;
  }
  if (!data || !data.length) { el.innerHTML = kosong('pena', t('pf.k.kapsulJ'), t('pf.k.kapsulT'), 'post.html', t('umum.tulisSekarang')); return; }
  el.innerHTML = '<div class="kapsul-daftar">' + data.map(k =>
    '<div class="kapsul-item"><p>' + esc(String(k.content).slice(0, 140)) + '</p><div class="kapsul-baris">' +
    '<span class="kapsul-waktu"><b class="kapsul-sisa" data-buka="' + esc(k.terbuka_pada) + '">' + esc(sisaKapsul(k.terbuka_pada)) + '</b>' +
    '<small>' + esc(t('kapsul.buka', { tgl: tglPanjang(k.terbuka_pada) })) + '</small></span>' +
    '<button type="button" class="btn garis" data-batal="' + esc(k.id) + '">' + esc(t('kapsul.batal')) + '</button></div></div>').join('') + '</div>';
  el.onclick = async e => {
    const b = e.target.closest('[data-batal]');
    if (!b || !confirm(t('kapsul.konfirmBatal'))) return;
    b.disabled = true;
    const { error: eb } = await db.rpc('batalkan_kapsul', { p_id: b.dataset.batal });
    if (eb) { tampilToast(pesanGalat(eb)); b.disabled = false; return; }
    tampilKapsul(el);
  };
  // Hitung mundur diperbarui tiap 30 detik; daftar dimuat ulang sekali bila ada yang sudah lewat waktunya
  kapsulTimer = setInterval(() => {
    if (!el.isConnected || tabAktif !== 'kapsul') { clearInterval(kapsulTimer); return; }
    let lewat = false;
    el.querySelectorAll('[data-buka]').forEach(n => { n.textContent = sisaKapsul(n.dataset.buka); if (new Date(n.dataset.buka) <= Date.now()) lewat = true; });
    if (lewat && Date.now() - kapsulMuatAkhir > 20000) tampilKapsul(el);
  }, 30000);
}

// ---- Bagikan profil ---------------------------------------------------------
function tampilToast(teks) {
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = teks;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('hilang'), 2200);
  setTimeout(() => el.remove(), 2600);
}
async function bagikanProfil() {
  const p = profil;
  if (!p) return;
  const url = location.origin + '/profil.html?u=' + encodeURIComponent(p.username);
  if (navigator.share) {
    try { await navigator.share({ title: t('pf.bagikanJudul', { nama: p.nama || p.username, u: p.username }), url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); tampilToast(t('pf.tertaut')); }
  catch (e) { prompt(t('pf.salinManual'), url); }
}

// ---- Foto profil & batas ubah bulanan -------------------------------------
async function ambilKuota() {
  try {
    const { data, error } = await db.rpc('kuota_profil');
    return error || !data ? null : data;      // null = migrasi 008 belum dijalankan
  } catch (e) { return null; }
}
function infoKuota(k, jenis, label) {
  const q = k && k[jenis];
  if (!q) return { teks: '', habis: false, sisa: Infinity };
  const sisa = Math.max(0, q.maks - q.pakai);
  const tgl = new Date(k.reset).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  label = t(label);
  return sisa <= 0
    ? { teks: t('pf.kuotaHabis', { label, tgl }), habis: true, sisa }
    : { teks: t('pf.kuotaSisa', { label, sisa, maks: q.maks }), habis: false, sisa };
}
// Potong persegi dari tengah, kecilkan ke 320px, simpan JPEG (juga membuang data EXIF/lokasi)
function ubahUkuranFoto(file, sisi) {
  sisi = sisi || 320;
  return new Promise((ok, gagal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h);
        if (!s) throw new Error(t('pf.foto.kosong'));
        const c = document.createElement('canvas'); c.width = c.height = sisi;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, sisi, sisi);
        x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, sisi, sisi);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? ok(b) : gagal(new Error(t('pf.foto.proses'))), 'image/jpeg', 0.85);
      } catch (e) { URL.revokeObjectURL(url); gagal(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error(t('pf.foto.baca'))); };
    img.src = url;
  });
}
// Hapus semua foto lama di folder sendiri kecuali yang sedang dipakai (juga membersihkan sisa unggahan gagal)
async function bersihkanFoto(simpan) {
  try {
    const { data } = await db.storage.from('avatar').list(saya.id, { limit: 100 });
    const nama = simpan ? simpan.split('/').pop() : null;
    const buang = (data || []).filter(f => f.name !== nama && f.name !== '.emptyFolderPlaceholder').map(f => saya.id + '/' + f.name);
    if (buang.length) await db.storage.from('avatar').remove(buang);
  } catch (e) {}
}

function ubah() {
  if ($('#lembarUbah')) return;
  const d = document.createElement('dialog');
  d.id = 'lembarUbah'; d.className = 'lembar'; d.setAttribute('aria-labelledby', 'jUbah');
  d.innerHTML = `<div class="lembar-kepala"><h2 id="jUbah">${esc(t('pf.ubah'))}</h2><button class="ikon-btn" id="uTutup" aria-label="${esc(t('umum.tutup'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="pratinjau" id="uPratinjau"></div>
    <div id="formUbah" class="form">
    <label for="uPilihFoto">${esc(t('pf.u.foto'))}</label>
    <div class="foto-ubah">
      <button type="button" class="btn garis" id="uPilihFoto">${esc(t('pf.u.pilihFoto'))}</button>
      <button type="button" class="btn garis" id="uHapusFoto" hidden>${esc(t('pf.u.hapusFoto'))}</button>
      <input type="file" id="uFile" accept="image/jpeg,image/png,image/webp" hidden>
    </div>
    <div class="kuota" id="kFoto"></div>
    <label for="uNama">${esc(t('pf.u.nama'))}</label>
    <input type="text" id="uNama" maxlength="40" autocomplete="off" value="${esc(profil.nama || '')}">
    <div class="kuota" id="kNama"></div>
    <label for="uBio">${esc(t('pf.u.bio'))}</label>
    <textarea id="uBio" style="min-height:70px" aria-label="${esc(t('pf.u.bio'))}"></textarea>
    <div class="baris"><span class="hitung" id="uHitung"></span></div>
    <label for="uUser">${esc(t('pf.u.username'))}</label>
    <input type="text" id="uUser" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(profil.username)}">
    <div class="hitung">${esc(t('user.hint'))}</div>
    <div class="kuota" id="kUser"></div>
    <div class="hitung">${esc(t('pf.u.batasInfo'))}</div>
    <div class="galat" id="uGalat" role="alert"></div>
    <div class="tombol"><button class="btn utama" id="uSimpan">${esc(t('pf.u.simpan'))}</button><button class="btn garis" id="uBatal">${esc(t('pf.u.batal'))}</button></div></div>`;
  document.body.appendChild(d);

  let kuota = null, fotoBlob = null, fotoPratinjau = null, hapusFoto = false;
  const fotoKini = () => hapusFoto ? null : (fotoPratinjau || profil.foto || null);
  const lepasPratinjau = () => { if (fotoPratinjau) { URL.revokeObjectURL(fotoPratinjau); fotoPratinjau = null; } };
  d.addEventListener('close', () => { lepasPratinjau(); d.remove(); });
  d.onclick = e => { if (e.target === d) d.close(); };
  $('#uBio').value = profil.bio || '';
  pasangHitung($('#uBio'), $('#uHitung'), 160);

  const pratinjau = () => {
    const n = $('#uNama').value.trim(), u = $('#uUser').value.trim().toLowerCase();
    $('#uPratinjau').innerHTML = avatar(n || u || '?', 56, fotoKini()) + `<div class="profil-nama"><div class="pr-nama">${esc(n || u || t('pf.u.namamu'))}</div><div class="profil-user">@${esc(u || 'username')}</div></div>`;
    const ada = !!fotoKini();
    $('#uHapusFoto').hidden = !(ada || fotoBlob);
    $('#uHapusFoto').textContent = fotoBlob ? t('pf.u.batalPilihan') : t('pf.u.hapusFoto');
  };
  const terapkanKuota = () => {
    const f = infoKuota(kuota, 'foto', 'pf.l.foto'), n = infoKuota(kuota, 'nama', 'pf.l.nama'), u = infoKuota(kuota, 'username', 'pf.l.username');
    [['#kFoto', f], ['#kNama', n], ['#kUser', u]].forEach(([sel, k]) => { $(sel).textContent = k.teks; $(sel).classList.toggle('habis', k.habis); });
    $('#uPilihFoto').disabled = f.habis;
    if (f.habis) $('#uHapusFoto').disabled = true;
    $('#uNama').disabled = n.habis;
    $('#uUser').disabled = u.habis;
  };
  pratinjau();
  ambilKuota().then(k => { kuota = k; if (d.isConnected) terapkanKuota(); });

  $('#uNama').addEventListener('input', pratinjau);
  $('#uUser').addEventListener('input', pratinjau);
  $('#uPilihFoto').onclick = () => $('#uFile').click();
  $('#uFile').onchange = async () => {
    const f = $('#uFile').files[0]; $('#uFile').value = '';
    const galat = $('#uGalat'); galat.textContent = '';
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { galat.textContent = t('pf.foto.format'); return; }
    if (f.size > 15 * 1024 * 1024) { galat.textContent = t('pf.foto.besar'); return; }
    try {
      fotoBlob = await ubahUkuranFoto(f);
      lepasPratinjau();
      fotoPratinjau = URL.createObjectURL(fotoBlob);
      hapusFoto = false;
      pratinjau();
    } catch (e) { galat.textContent = e.message || t('pf.foto.tidakBisa'); }
  };
  $('#uHapusFoto').onclick = () => {
    if (fotoBlob) { fotoBlob = null; lepasPratinjau(); } else hapusFoto = true;
    pratinjau();
  };
  $('#uBatal').onclick = () => d.close();
  $('#uTutup').onclick = () => d.close();

  $('#uSimpan').onclick = async () => {
    const username = $('#uUser').value.trim().toLowerCase();
    const nama = $('#uNama').value.trim().slice(0, 40) || null;
    const galat = $('#uGalat'); galat.textContent = '';
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { galat.textContent = t('user.harus'); return; }
    const gabung = [$('#uNama').value, $('#uBio').value, username].join(' \n ');
    if (!bolehKirim(gabung, m => galat.textContent = m)) return;

    const ubahNama = nama !== (profil.nama || null), ubahUser = username !== profil.username;
    const ubahFoto = !!fotoBlob || (hapusFoto && !!profil.foto);
    const daftar = [];
    [[ubahFoto, 'foto', 'pf.l.foto'], [ubahNama, 'nama', 'pf.l.nama'], [ubahUser, 'username', 'pf.l.username']].forEach(([ya, jenis, label]) => {
      if (!ya) return;
      const k = infoKuota(kuota, jenis, label);
      if (k.habis) { galat.textContent = k.teks; daftar.push(null); return; }
      if (k.sisa !== Infinity) daftar.push(t('pf.u.itemKuota', { label: t(label), sisa: k.sisa, baru: k.sisa - 1 }));
    });
    if (daftar.includes(null)) return;
    if (daftar.length && !confirm(t('pf.u.konfirmKuota', { daftar: daftar.join('\n• ') }))) return;

    $('#uSimpan').disabled = true;
    const ubahan = { nama, bio: $('#uBio').value.trim().slice(0, 160) || null, username };
    let pathBaru = null;
    if (fotoBlob) {
      pathBaru = saya.id + '/' + Date.now() + '.jpg';
      const { error: eu } = await db.storage.from('avatar').upload(pathBaru, fotoBlob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (eu) {
        $('#uSimpan').disabled = false;
        galat.textContent = /bucket not found/i.test(eu.message || '') ? t('pf.foto.bucket') : t('pf.foto.gagalUnggah', { pesan: pesanGalat(eu) });
        return;
      }
      ubahan.foto_url = pathBaru;
    } else if (ubahFoto) ubahan.foto_url = null;

    const { error } = await db.from('profiles').update(ubahan).eq('id', saya.id);
    $('#uSimpan').disabled = false;
    if (error) {
      if (pathBaru) db.storage.from('avatar').remove([pathBaru]).catch(() => {});
      galat.textContent = error.code === '23505' ? t('user.dipakai') : error.code === '23514' ? t('user.harus') : pesanGalat(error);
      return;
    }
    if (ubahFoto) await bersihkanFoto(pathBaru);
    location.href = 'profil.html' + (username === profil.username ? '' : '?u=' + username);
  };
  d.showModal();
  $('#uNama').focus();
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  muat();
})();

// ---- Daftar pengikut / mengikuti ------------------------------------------
const MAKS_ORANG = 500, HALAMAN_ORANG = 30;
let orangVersi = 0;
document.addEventListener('click', e => {
  const b = e.target.closest('.stat-btn');
  if (b && profil) bukaDaftarOrang(b.dataset.daftar);
});

async function bukaDaftarOrang(jenis) {
  const pengikut = jenis === 'pengikut';
  let d = $('#lembarOrang');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'lembarOrang'; d.className = 'lembar'; d.setAttribute('aria-labelledby', 'jOrang');
    d.innerHTML = `<div class="lembar-kepala"><h2 id="jOrang"></h2><button class="ikon-btn" id="oTutup" aria-label="${esc(t('umum.tutup'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div id="oIsi" aria-live="polite"></div>`;
    document.body.appendChild(d);
    d.onclick = e => { if (e.target === d) d.close(); };
    $('#oTutup').onclick = () => d.close();
  }
  $('#jOrang').textContent = t(pengikut ? 'pf.o.pengikutDari' : 'pf.o.mengikutiDari', { u: profil.username });
  const isi = $('#oIsi');
  isi.innerHTML = '<p class="hitung" style="padding:16px 20px">' + esc(t('umum.memuat')) + '</p>';
  if (!d.open) d.showModal();
  const ini = ++orangVersi;
  const kolomIni = pengikut ? 'following_id' : 'follower_id';
  const kolomLain = pengikut ? 'follower_id' : 'following_id';

  const { data: rel, error } = await db.from('follows').select(kolomLain).eq(kolomIni, profil.id).limit(MAKS_ORANG);
  if (ini !== orangVersi) return;
  if (error) { isi.innerHTML = '<div class="kosong"><p>' + esc(t('pf.o.gagal', { pesan: pesanGalat(error) })) + '</p></div>'; return; }
  const ids = (rel || []).map(r => r[kolomLain]);
  if (!ids.length) {
    isi.innerHTML = kosong('cari', pengikut ? t('pf.o.belumPengikutJ') : t('pf.o.belumMengikutiJ'),
      pengikut ? t('pf.o.belumPengikutT') : t('pf.o.belumMengikutiT'));
    return;
  }
  const potong = [];
  for (let i = 0; i < ids.length; i += 100) potong.push(ids.slice(i, i + 100));
  const [hasil, blokir] = await Promise.all([
    Promise.all(potong.map(c => db.from('profiles').select('id,username,nama,foto_url').in('id', c))),
    db.from('blocks').select('blocked_id').eq('blocker_id', saya.id)
  ]);
  if (ini !== orangVersi) return;
  const galat = hasil.find(h => h.error);
  if (galat) { isi.innerHTML = '<div class="kosong"><p>' + esc(t('pf.o.gagal', { pesan: pesanGalat(galat.error) })) + '</p></div>'; return; }
  const sembunyi = new Set((blokir.data || []).map(b => b.blocked_id));
  const orang = hasil.flatMap(h => h.data || []).filter(o => !sembunyi.has(o.id))
    .sort((a, b) => (a.nama || a.username).localeCompare(b.nama || b.username, I18n.locale));
  if (!orang.length) {
    isi.innerHTML = kosong('cari', t('pf.o.kosongJ'), t('pf.o.kosongT'));
    return;
  }
  let tampil = 0;
  const baris = o => `<a class="item dgn-avatar" href="profil.html?u=${esc(o.username)}">
    ${avatar(o.nama || o.username, 44, o.foto_url)}
    <div><b>${esc(o.nama || o.username)}</b>${lencanaResmi(o.username)}${o.id === saya.id ? ' <span class="sub">' + esc(t('pf.o.kamu')) + '</span>' : ''}
    <div class="sub">@${esc(o.username)}</div></div></a>`;
  const gambar = () => {
    const potongan = orang.slice(tampil, tampil + HALAMAN_ORANG);
    tampil += potongan.length;
    const lagi = tampil < orang.length;
    const catatan = ids.length >= MAKS_ORANG && !lagi ? `<p class="hitung" style="padding:12px 20px">${esc(t('pf.o.pertama', { n: MAKS_ORANG }))}</p>` : '';
    const html = potongan.map(baris).join('');
    if (tampil === potongan.length) isi.innerHTML = '<div id="oDaftar"></div><div id="oLagi"></div>';
    $('#oDaftar').insertAdjacentHTML('beforeend', html);
    $('#oLagi').innerHTML = lagi ? '<div style="padding:12px 20px"><button type="button" class="btn garis" id="oLagiBtn">' + esc(t('pf.o.lagi')) + '</button></div>' : catatan;
    if (lagi) $('#oLagiBtn').onclick = gambar;
  };
  gambar();
}

// Catatan/balasan baru dari lembar tulis: segarkan daftar bila sedang melihat profil sendiri
document.addEventListener('jurkon:terkirim', () => {
  if (profil && saya && profil.id === saya.id && typeof tampilTab === 'function') tampilTab();
});

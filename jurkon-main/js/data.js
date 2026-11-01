// Pengambilan data posting & profil. Dimuat setelah ui.js.
// Memakai fungsi SQL cepat (migrasi 003) bila ada; bila belum terpasang atau gagal,
// otomatis memakai cara lama (beberapa permintaan) supaya aplikasi tetap berjalan.
const HALAMAN = 20;

function pesanGalat(e) { return galatRamah(e); }
const adaJaringan = e => !/failed to fetch|networkerror|load failed|network request/i.test((e && e.message) || '');

// Bila fungsi cepat gagal, jangan dicoba lagi selama 2 menit (hemat satu permintaan sia-sia tiap halaman)
function rpcMati() { try { return Date.now() - (+sessionStorage.getItem('rpcMati') || 0) < 120000; } catch (e) { return false; } }
function tandaiRpcMati() { try { sessionStorage.setItem('rpcMati', String(Date.now())); } catch (e) {} }

function dariBaris(r) {
  return {
    id: r.id, user_id: r.user_id, parent_id: r.parent_id, content: r.content, created_at: r.created_at,
    profiles: { username: r.username, nama: r.nama, foto_url: r.foto || null },
    likes: [{ count: Number(r.jumlah_suka) || 0 }],
    sudah_suka: !!r.sudah_suka,
    dilihat: r.dilihat == null ? null : Number(r.dilihat),
    induk_username: r.induk_username || null,
    suka_pada: r.suka_pada || null,
    kedaluwarsa: r.kedaluwarsa || null,
    kapsul_ditulis: r.kapsul_ditulis || null
  };
}

// Mode profil (migrasi 010). Fungsi SQL lama tidak mengenalnya dan akan membalas dengan feed biasa,
// jadi hasilnya dicek: bila barisnya tidak punya kolom "dilihat", pakai cara lama.
const MODE_PROFIL = ['catatan_oleh', 'balasan_oleh', 'disukai_oleh'];

// o: { mode: beranda|ikuti|semua|cari|pengguna|balasan|satu|catatan_oleh|balasan_oleh|disukai_oleh, id, kata, sebelum, limit }
async function ambilPosting(o, saya) {
  const limit = o.limit || HALAMAN;
  if (o.mode === 'ulang_oleh') return ambilUlangOleh(o, saya, limit);
  if (!rpcMati()) {
    const { data, error } = await db.rpc('daftar_posting', {
      p_mode: o.mode || 'beranda', p_id: o.id || null, p_kata: o.kata || null, p_limit: limit, p_sebelum: o.sebelum || null
    });
    const salah = MODE_PROFIL.includes(o.mode) && Array.isArray(data) && data.length && data[0].dilihat === undefined;
    if (!error && Array.isArray(data) && !salah) return { data: data.map(dariBaris), error: null, limit };
    if (salah) return ambilPostingLama(o, saya, limit);
    if (error && !adaJaringan(error)) return { data: null, error, limit };
    console.warn('daftar_posting belum tersedia, memakai cara lama:', error && error.message);
    tandaiRpcMati();
  }
  return ambilPostingLama(o, saya, limit);
}

// Tab Reposts di profil: posting ulang milik satu pengguna + posting aslinya, diambil langsung dari tabel
async function ambilUlangOleh(o, saya, limit) {
  let q = db.from('posts').select(PILIH_POSTING).eq('user_id', o.id).eq('jenis', 'ulang').order('created_at', { ascending: false }).limit(limit);
  if (o.sebelum) q = q.lt('created_at', o.sebelum);
  const { data, error } = await q;
  if (error) return { data: null, error, limit };
  const baris = data || [];
  const ids = [...new Set(baris.map(r => r.kutip_id).filter(Boolean))];
  let aslinya = [];
  if (ids.length) {
    const { data: a, error: ea } = await db.from('posts').select(PILIH_POSTING).in('id', ids);
    if (ea) return { data: null, error: ea, limit };
    aslinya = a || [];
    try { await tandaiSuka(aslinya, saya); } catch (e) {}
  }
  if (typeof siapkanUlang === 'function') siapkanUlang(baris, aslinya);
  return { data: baris, error: null, limit };
}

async function ambilPostingLama(o, saya, limit) {
  const mode = o.mode || 'beranda';
  if (mode === 'disukai_oleh') return ambilDisukaiLama(o, saya, limit);
  let q = db.from('posts').select(PILIH_POSTING).order('created_at', { ascending: mode === 'balasan' }).limit(limit);
  if (o.sebelum) q = q.lt('created_at', o.sebelum);
  if (mode === 'satu') q = q.eq('id', o.id);
  else if (mode === 'balasan') q = q.eq('parent_id', o.id);
  else if (mode === 'pengguna') q = q.eq('user_id', o.id);
  else if (mode === 'catatan_oleh') q = q.eq('user_id', o.id).is('parent_id', null);
  else if (mode === 'balasan_oleh') q = q.eq('user_id', o.id).not('parent_id', 'is', null);
  else {
    q = q.is('parent_id', null);
    if (mode === 'cari') q = q.ilike('content', '%' + String(o.kata || '').replace(/[\\%_]/g, c => '\\' + c) + '%');
    else if ((mode === 'beranda' || mode === 'ikuti') && saya) {
      const { data: f, error: ef } = await db.from('follows').select('following_id').eq('follower_id', saya.id);
      if (ef) return { data: null, error: ef, limit };
      // 'beranda': bila belum mengikuti siapa pun, tampilkan semua. 'ikuti': selalu hanya diri sendiri + yang diikuti.
      if (mode === 'ikuti' || (f && f.length)) q = q.in('user_id', [saya.id, ...(f || []).map(x => x.following_id)]);
    }
  }
  const { data, error } = await q;
  if (error) return { data: null, error, limit };
  await tandaiSuka(data, saya);
  return { data, error: null, limit };
}

// Cara lama untuk tab Menyukai: ambil daftar suka dulu, lalu postingnya
async function ambilDisukaiLama(o, saya, limit) {
  let ql = db.from('likes').select('post_id,created_at').eq('user_id', o.id).order('created_at', { ascending: false }).limit(limit);
  if (o.sebelum) ql = ql.lt('created_at', o.sebelum);
  const { data: l, error: el } = await ql;
  if (el) return { data: null, error: el, limit };
  if (!l || !l.length) return { data: [], error: null, limit };
  const { data: ps, error } = await db.from('posts').select(PILIH_POSTING).in('id', l.map(x => x.post_id));
  if (error) return { data: null, error, limit };
  const per = {}; (ps || []).forEach(p => { per[p.id] = p; });
  // Posting yang tersembunyi (misalnya karena blokir) dilewati, tetapi penanda halaman tetap dari daftar suka
  const hasil = l.map(x => per[x.post_id] ? Object.assign(per[x.post_id], { suka_pada: x.created_at }) : null).filter(Boolean);
  await tandaiSuka(hasil, saya);
  return { data: hasil, error: null, limit: l.length >= limit ? Math.min(limit, hasil.length) : limit, kursorAkhir: l[l.length - 1].created_at };
}

// Hasil: { data: {id, username, nama, bio, foto, pengikut, mengikuti, saya_ikut, saya_blokir} | null, error }
async function ambilProfilInfo(username, saya) {
  if (!rpcMati()) {
    const { data, error } = await db.rpc('profil_info', { p_username: username || null });
    if (!error) return { data: data && data.id ? data : null, error: null };
    if (!adaJaringan(error)) return { data: null, error };
    console.warn('profil_info belum tersedia, memakai cara lama:', error.message);
    tandaiRpcMati();
  }
  const q = db.from('profiles').select('*');
  const { data: p, error: e1 } = username ? await q.eq('username', username).maybeSingle() : await q.eq('id', saya.id).maybeSingle();
  if (e1) return { data: null, error: e1 };
  if (!p) return { data: null, error: null };
  const [a, b, c, d] = await Promise.all([
    db.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id),
    db.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', p.id),
    db.from('follows').select('*').match({ follower_id: saya.id, following_id: p.id }).maybeSingle(),
    db.from('blocks').select('blocked_id').match({ blocker_id: saya.id, blocked_id: p.id }).maybeSingle()
  ]);
  return { data: { id: p.id, username: p.username, nama: p.nama, bio: p.bio, foto: p.foto_url || null,
    pengikut: a.count || 0, mengikuti: b.count || 0, saya_ikut: !!c.data, saya_blokir: !!d.data }, error: null };
}

// Daftar posting dengan tombol "Muat lebih banyak".
// ambil(sebelum) -> { data, error, limit }. kosongHtml: teks HTML atau fungsi penghasilnya.
// opsi (opsional): { render: baris => html, item: selektor item } untuk daftar selain posting.
function daftarBerhalaman(el, ambil, kosongHtml, saya, opsi) {
  const render = (opsi && opsi.render) || (p => htmlPost(p, saya));
  const selItem = (opsi && opsi.item) || '.post';
  const kursor = (opsi && opsi.kursor) || (x => x.created_at);
  // opsi.cache: nama cache halaman pertama di perangkat. Dipakai untuk tampil instan sebelum data segar tiba.
  const kunciCache = opsi && opsi.cache && saya ? 'jk:' + saya.id + ':' + opsi.cache : null;
  const bacaCache = () => {
    if (!kunciCache) return null;
    try { const c = JSON.parse(localStorage.getItem(kunciCache) || 'null'); return c && Date.now() - c.t < 864e5 && Array.isArray(c.d) && c.d.length ? c.d : null; } catch (e) { return null; }
  };
  const simpanCache = data => { if (kunciCache) try { localStorage.setItem(kunciCache, JSON.stringify({ t: Date.now(), d: data.slice(0, HALAMAN) })); } catch (e) {} };
  const hapusCache = () => { if (kunciCache) try { localStorage.removeItem(kunciCache); } catch (e) {} };
  const tanda = ds => ds.map(p => p.id + ':' + (p.likes && p.likes[0] ? p.likes[0].count : '') + ':' + p.sudah_suka + ':' + p.dilihat).join('|');
  let akhir = null, sibuk = false, batal = false, io = null;
  const TOMBOL = '<button class="lagi" type="button">' + esc(t('umum.muatLagi')) + '</button>';
  // Muat halaman berikutnya otomatis saat tombol hampir terlihat (gulir terasa tanpa putus); tombol tetap ada sebagai cadangan
  function pantau() {
    if (!('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver(es => {
      if (!es.some(x => x.isIntersecting)) return;
      const t = el.querySelector('.lagi');
      if (t && !t.disabled && !sibuk) muat(false);
    }, { rootMargin: '700px 0px' });
    const t = el.querySelector('.lagi'); if (t) io.observe(t);
  }
  async function muat(ulang) {
    if (sibuk || batal) return;
    sibuk = true;
    let cacheData = null;
    if (ulang) {
      akhir = null;
      if (!el.querySelector(selItem)) {
        cacheData = bacaCache();
        el.innerHTML = cacheData ? cacheData.map(render).join('') : skeleton(4);
      }
    } else { const b = el.querySelector('.lagi'); if (b) { b.disabled = true; b.textContent = t('umum.memuat'); } }
    const r = await ambil(akhir);
    sibuk = false;
    if (batal) return;
    if (r.error) {
      if (ulang && cacheData) return;   // data lama tetap tampil bila sedang tanpa sinyal
      if (ulang) el.innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(pesanGalat(r.error)) + '</p><button class="btn lagi-coba" type="button">' + esc(t('umum.cobaLagi')) + '</button></div>';
      else { const b = el.querySelector('.lagi'); if (b) { b.disabled = false; b.textContent = t('umum.ketukCoba'); } }
      return;
    }
    const data = r.data || [];
    if (ulang && !data.length) { hapusCache(); el.innerHTML = typeof kosongHtml === 'function' ? kosongHtml() : (kosongHtml || ''); return; }
    const lagi = data.length >= (r.limit || HALAMAN) ? TOMBOL : '';
    const penutup = lagi || ((opsi && typeof opsi.ujung === 'function') ? opsi.ujung() : '');
    if (ulang) {
      simpanCache(data);
      // Bila sama dengan yang sudah tampil dari cache, jangan gambar ulang (tanpa kedip)
      if (cacheData && tanda(cacheData) === tanda(data.slice(0, cacheData.length)) && cacheData.length === data.length) el.insertAdjacentHTML('beforeend', penutup);
      else el.innerHTML = data.map(render).join('') + penutup;
    } else {
      const b = el.querySelector('.lagi'); if (b) { if (io) io.unobserve(b); b.remove(); }
      el.insertAdjacentHTML('beforeend', data.map(render).join('') + penutup);
    }
    if (data.length) akhir = r.kursorAkhir || kursor(data[data.length - 1]);
    if (lagi) pantau();
  }
  el.addEventListener('click', e => {
    if (e.target.closest('.lagi')) muat(false);
    else if (e.target.closest('.lagi-coba')) muat(true);
  });
  return { muat: () => muat(true), hentikan: () => { batal = true; if (io) io.disconnect(); } };
}

// ---- Views posting ----------------------------------------------------------
// Posting yang tampil di layar (>= 50%) dicatat sekali per akun lewat catat_tayang (migrasi 010).
// Bila fungsinya belum ada, pencatatan berhenti diam-diam.
(function pasangTayang() {
  if (typeof db === 'undefined' || !('IntersectionObserver' in window)) return;
  let antri = [], timer = null, mati = false;
  let sudah = new Set();
  try { sudah = new Set(JSON.parse(sessionStorage.getItem('tayang') || '[]')); } catch (e) {}
  const simpan = () => { try { sessionStorage.setItem('tayang', JSON.stringify([...sudah].slice(-500))); } catch (e) {} };
  async function kirim() {
    timer = null;
    if (mati || !antri.length) return;
    const ids = antri.splice(0, 50);
    if (antri.length) timer = setTimeout(kirim, 1000);
    try {
      const { error } = await db.rpc('catat_tayang', { p_ids: ids });
      if (error && !/failed to fetch|network|load failed/i.test(error.message || '')) mati = true;
    } catch (e) {}
  }
  const io = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.dataset.id;
      io.unobserve(en.target);
      if (!id || sudah.has(id)) return;
      sudah.add(id); simpan(); antri.push(id);
      if (!timer) timer = setTimeout(kirim, 1500);
    });
  }, { threshold: 0.5 });
  const pantau = r => r.querySelectorAll && r.querySelectorAll('.post[data-id]').forEach(el => io.observe(el));
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.matches && n.matches('.post[data-id]')) io.observe(n); else pantau(n);
  }))).observe(document.body, { childList: true, subtree: true });
  pantau(document);
})();

// Posting yang sedang ramai (migrasi 011). Cadangan bila fungsi SQL belum ada: urut dari jumlah suka.
// Hasil: { data: [posting], error, jam } -- jam = rentang yang dipakai. Bila sepi dalam 3 hari, rentang dilebarkan jadi 7 hari.
const BATAS_RAMAI = 10;
function ramaiMati() { try { return Date.now() - (+sessionStorage.getItem('ramaiMati') || 0) < 120000; } catch (e) { return false; } }
async function ambilRamaiJam(saya, jam) {
  if (!ramaiMati()) {
    const { data, error } = await db.rpc('posting_ramai', { p_limit: BATAS_RAMAI, p_jam: jam });
    if (!error && Array.isArray(data)) return { data: data.map(dariBaris), error: null };
    if (error && !adaJaringan(error)) return { data: null, error };
    console.warn('posting_ramai belum tersedia, memakai cara cadangan:', error && error.message);
    try { sessionStorage.setItem('ramaiMati', String(Date.now())); } catch (e) {}
  }
  const batas = new Date(Date.now() - jam * 3600e3).toISOString();
  const { data, error } = await db.from('posts').select(PILIH_POSTING).is('parent_id', null)
    .gt('created_at', batas).order('created_at', { ascending: false }).limit(100);
  if (error) return { data: null, error };
  await tandaiSuka(data, saya);
  const skor = p => (p.likes[0].count) / Math.pow((Date.now() - new Date(p.created_at)) / 3600e3 + 2, 1.4);
  const urut = data.filter(p => p.likes[0].count > 0).sort((a, b) => skor(b) - skor(a)).slice(0, BATAS_RAMAI);
  return { data: urut, error: null };
}
async function ambilRamai(saya) {
  let r = await ambilRamaiJam(saya, 72);
  if (!r.error && r.data.length < 3) {
    const lebar = await ambilRamaiJam(saya, 168);
    if (!lebar.error && lebar.data.length > r.data.length) r = lebar;
  }
  return r;
}

// Sorotan Jelajah (migrasi 012): posting dengan dilihat >= ambang, atau dipilih admin.
// Bentuk hasil sama dengan ambilPosting: { data, error, limit } supaya cocok dengan daftarBerhalaman.
async function ambilSorotan(o, saya) {
  const limit = (o && o.limit) || HALAMAN;
  const { data, error } = await db.rpc('posting_sorotan', { p_limit: limit, p_sebelum: (o && o.sebelum) || null });
  if (error) {
    if (/posting_sorotan|schema cache|does not exist/i.test(error.message || ''))
      return { data: null, error: { message: 'Sorotan belum aktif. Jalankan migrasi 012 di Supabase.' }, limit };
    return { data: null, error, limit };
  }
  return { data: (data || []).map(dariBaris), error: null, limit };
}

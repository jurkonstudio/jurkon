// Pengambilan data posting & profil. Dimuat setelah ui.js.
// Memakai fungsi SQL cepat (migrasi 003) bila ada; bila belum terpasang atau gagal,
// otomatis memakai cara lama (beberapa permintaan) supaya aplikasi tetap berjalan.
const HALAMAN = 20;

function pesanGalat(e) {
  const m = (e && e.message) || '';
  const dilarang = typeof pesanKontenDilarang === 'function' && pesanKontenDilarang(e);
  if (dilarang) return dilarang;
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return 'Tidak ada koneksi. Periksa sinyal lalu coba lagi.';
  if (/jwt expired|invalid jwt/i.test(m)) return 'Sesi habis. Silakan masuk lagi.';
  return m || 'Terjadi kesalahan. Coba lagi.';
}
const adaJaringan = e => !/failed to fetch|networkerror|load failed|network request/i.test((e && e.message) || '');

// Bila fungsi cepat gagal, jangan dicoba lagi selama 2 menit (hemat satu permintaan sia-sia tiap halaman)
function rpcMati() { try { return Date.now() - (+sessionStorage.getItem('rpcMati') || 0) < 120000; } catch (e) { return false; } }
function tandaiRpcMati() { try { sessionStorage.setItem('rpcMati', String(Date.now())); } catch (e) {} }

function dariBaris(r) {
  return {
    id: r.id, user_id: r.user_id, parent_id: r.parent_id, content: r.content, created_at: r.created_at,
    profiles: { username: r.username, nama: r.nama },
    likes: [{ count: Number(r.jumlah_suka) || 0 }],
    sudah_suka: !!r.sudah_suka
  };
}

// o: { mode: beranda|ikuti|semua|cari|pengguna|balasan|satu, id, kata, sebelum, limit }
async function ambilPosting(o, saya) {
  const limit = o.limit || HALAMAN;
  if (!rpcMati()) {
    const { data, error } = await db.rpc('daftar_posting', {
      p_mode: o.mode || 'beranda', p_id: o.id || null, p_kata: o.kata || null, p_limit: limit, p_sebelum: o.sebelum || null
    });
    if (!error && Array.isArray(data)) return { data: data.map(dariBaris), error: null, limit };
    if (error && !adaJaringan(error)) return { data: null, error, limit };
    console.warn('daftar_posting belum tersedia, memakai cara lama:', error && error.message);
    tandaiRpcMati();
  }
  return ambilPostingLama(o, saya, limit);
}

async function ambilPostingLama(o, saya, limit) {
  const mode = o.mode || 'beranda';
  let q = db.from('posts').select(PILIH_POSTING).order('created_at', { ascending: mode === 'balasan' }).limit(limit);
  if (o.sebelum) q = q.lt('created_at', o.sebelum);
  if (mode === 'satu') q = q.eq('id', o.id);
  else if (mode === 'balasan') q = q.eq('parent_id', o.id);
  else if (mode === 'pengguna') q = q.eq('user_id', o.id);
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

// Hasil: { data: {id, username, nama, bio, pengikut, mengikuti, saya_ikut, saya_blokir} | null, error }
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
  return { data: { id: p.id, username: p.username, nama: p.nama, bio: p.bio,
    pengikut: a.count || 0, mengikuti: b.count || 0, saya_ikut: !!c.data, saya_blokir: !!d.data }, error: null };
}

// Daftar posting dengan tombol "Muat lebih banyak".
// ambil(sebelum) -> { data, error, limit }. kosongHtml: teks HTML atau fungsi penghasilnya.
// opsi (opsional): { render: baris => html, item: selektor item } untuk daftar selain posting.
function daftarBerhalaman(el, ambil, kosongHtml, saya, opsi) {
  const render = (opsi && opsi.render) || (p => htmlPost(p, saya));
  const selItem = (opsi && opsi.item) || '.post';
  let akhir = null, sibuk = false, batal = false;
  const TOMBOL = '<button class="lagi" type="button">Muat lebih banyak</button>';
  async function muat(ulang) {
    if (sibuk || batal) return;
    sibuk = true;
    if (ulang) { akhir = null; if (!el.querySelector(selItem)) el.innerHTML = skeleton(4); }
    else { const b = el.querySelector('.lagi'); if (b) { b.disabled = true; b.textContent = 'Memuat…'; } }
    const r = await ambil(akhir);
    sibuk = false;
    if (batal) return;
    if (r.error) {
      if (ulang) el.innerHTML = '<div class="kosong"><h3>Gagal memuat</h3><p>' + esc(pesanGalat(r.error)) + '</p><button class="btn lagi-coba" type="button">Coba lagi</button></div>';
      else { const b = el.querySelector('.lagi'); if (b) { b.disabled = false; b.textContent = 'Gagal. Ketuk untuk coba lagi'; } }
      return;
    }
    const data = r.data || [];
    if (ulang && !data.length) { el.innerHTML = typeof kosongHtml === 'function' ? kosongHtml() : (kosongHtml || ''); return; }
    const html = data.map(render).join('');
    const lagi = data.length >= (r.limit || HALAMAN) ? TOMBOL : '';
    if (ulang) el.innerHTML = html + lagi;
    else { const b = el.querySelector('.lagi'); if (b) b.remove(); el.insertAdjacentHTML('beforeend', html + lagi); }
    if (data.length) akhir = data[data.length - 1].created_at;
  }
  el.addEventListener('click', e => {
    if (e.target.closest('.lagi')) muat(false);
    else if (e.target.closest('.lagi-coba')) muat(true);
  });
  return { muat: () => muat(true), hentikan: () => { batal = true; } };
}

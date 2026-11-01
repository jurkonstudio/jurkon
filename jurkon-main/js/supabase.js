// Isi dengan data dari Supabase > Project Settings > API
// HANYA pakai "anon public key". JANGAN PERNAH pakai service_role key.
const SUPABASE_URL = 'https://yghgmfvlthzcuhelqesr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kRhUqqmzTHW7igXOPPrcZA_VRHQ9C94';

// Kunci SITUS Cloudflare Turnstile (publik, aman ditaruh di sini). Kosong = CAPTCHA mati.
// WAJIB diisi bersamaan dengan mengaktifkan CAPTCHA di Supabase (Authentication > Attack Protection), lihat README.
const TURNSTILE_SITE_KEY = '0x4AAAAAAFtTIL4I3ndIIG4w';

// Pembungkus fetch untuk data (REST/RPC) supaya tidak menggantung di sinyal lemah:
// - batas waktu 12 detik per percobaan; lewat dari itu dianggap gagal jaringan (aplikasi lalu menampilkan data tersimpan / tombol coba lagi)
// - pembacaan (GET dan RPC baca-saja) diulang SEKALI bila jaringan putus, habis waktu, atau server membalas 502/503/504
// Penulisan (kirim catatan, suka, dsb.) TIDAK pernah diulang otomatis agar tidak tercatat dobel.
// Unggah file, Auth, dan realtime tidak dibatasi.
const BATAS_MS = 12000;
const RPC_BACA = /\/rest\/v1\/rpc\/(daftar_posting|profil_info|posting_ramai|posting_sorotan|jumlah_notifikasi_baru)(\?|$)/;
function satuPercobaan(url, opts) {
  const ac = new AbortController();
  const luar = opts && opts.signal;
  let habis = false;
  if (luar) { if (luar.aborted) ac.abort(); else luar.addEventListener('abort', () => ac.abort(), { once: true }); }
  const timer = setTimeout(() => { habis = true; ac.abort(); }, BATAS_MS);
  return fetch(url, Object.assign({}, opts, { signal: ac.signal }))
    .catch(err => { if (habis) throw new TypeError('Failed to fetch'); throw err; })
    .finally(() => clearTimeout(timer));
}
async function fetchStabil(url, opts) {
  const alamat = String((url && url.url) || url);
  if (alamat.indexOf('/rest/v1/') < 0) return fetch(url, opts);
  const metode = String((opts && opts.method) || (url && url.method) || 'GET').toUpperCase();
  const bisaUlang = metode === 'GET' || metode === 'HEAD' || RPC_BACA.test(alamat);
  try {
    const r = await satuPercobaan(url, opts);
    if (bisaUlang && (r.status === 502 || r.status === 503 || r.status === 504)) {
      await new Promise(ok => setTimeout(ok, 600));
      return await satuPercobaan(url, opts);
    }
    return r;
  } catch (e) {
    if (!bisaUlang || (opts && opts.signal && opts.signal.aborted)) throw e;
    await new Promise(ok => setTimeout(ok, 600));
    return satuPercobaan(url, opts);
  }
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: fetchStabil } });

const $ = (s, el = document) => el.querySelector(s);
const param = k => new URLSearchParams(location.search).get(k);

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Satu pintu untuk pesan galat yang tampil ke pengguna. Pesan mentah server (nama tabel,
// kolom, kebijakan, detail SQL) tidak boleh tampil. Hanya pesan buatan sendiri (RAISE EXCEPTION
// di SQL, kode P0001, berbahasa Indonesia) yang diteruskan apa adanya.
function galatRamah(e) {
  const tt = (k, f) => (typeof t === 'function' && t(k) !== k) ? t(k) : f;
  const m = String((e && e.message) || '');
  if (typeof pesanKontenDilarang === 'function') { const d = pesanKontenDilarang(e); if (d) return d; }
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return tt('err.offline', 'Tidak ada koneksi. Periksa sinyal lalu coba lagi.');
  if (/jwt expired|invalid jwt/i.test(m)) return tt('err.sesi', 'Sesi habis. Silakan masuk lagi.');
  if (e && e.code === 'P0001' && m) return m;
  if (m) console.warn('[galat]', (e && e.code) || '', m);
  return tt('err.umum', 'Terjadi kesalahan. Coba lagi.');
}

function waktu(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return t('waktu.baru');
  if (d < 3600) return t('waktu.menit', { n: Math.floor(d / 60) });
  if (d < 86400) return t('waktu.jam', { n: Math.floor(d / 3600) });
  if (d < 172800) return t('waktu.kemarin');
  if (d < 2592000) return t('waktu.hari', { n: Math.floor(d / 86400) });
  return new Date(iso).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Tujuan setelah masuk: hanya halaman Jurkon sendiri (nama berkas .html + query sederhana), tidak pernah alamat luar
function lanjutAman(mentah) {
  try {
    if (mentah == null) mentah = new URLSearchParams(location.search).get('lanjut');
    if (!mentah) return null;
    let s = String(mentah).replace(/^\//, '');
    if (/^[a-z0-9-]+(\?|$)/.test(s)) s = s.replace(/^([a-z0-9-]+)(\?|$)/, '$1.html$2');   // /profil -> profil.html
    if (!/^[a-z0-9-]+\.html(\?[A-Za-z0-9_=&%.\-]{0,200})?$/.test(s)) return null;
    return /^(login|reset|selamat)\.html/.test(s) ? null : s;
  } catch (e) { return null; }
}
// Ke halaman masuk sambil mengingat halaman yang sedang dibuka (mis. tautan profil yang dibagikan)
function keLogin() {
  const tujuan = lanjutAman(location.pathname + location.search);
  location.href = '/login.html' + (tujuan && !/^index\.html/.test(tujuan) ? '?lanjut=' + encodeURIComponent(tujuan) : '');
}
async function wajibLogin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { keLogin(); return null; }
  return session.user;
}

function pasangHitung(textarea, el, maks) {
  const u = () => {
    const n = textarea.value.length;
    el.textContent = n + '/' + maks;
    el.classList.toggle('habis', n >= maks);
  };
  textarea.maxLength = maks;
  textarea.addEventListener('input', u);
  u();
}

function htmlPost(p, saya) {
  const jml = p.likes?.[0]?.count ?? 0;
  const suka = p.sudah_suka ? 'sudah' : '';
  return `<article class="post" data-id="${p.id}">
    <a href="profil.html?u=${esc(p.profiles.username)}"><span class="nama">${esc(p.profiles.nama || p.profiles.username)}</span>
    <span class="user">@${esc(p.profiles.username)} · ${waktu(p.created_at)}</span></a>
    <a href="detail.html?id=${p.id}"><div class="isi">${esc(p.content)}</div></a>
    <div class="aksi">
      <button class="btn-suka ${suka}" data-id="${p.id}">♥ <span>${jml}</span></button>
      <a href="detail.html?id=${p.id}">Balas</a>
      <button class="btn-lapor" data-id="${p.id}">Laporkan</button>
      ${saya && saya.id === p.user_id ? `<button class="btn-hapus" data-id="${p.id}">Hapus</button>` : ''}
    </div></article>`;
}

// Satu pendengar klik untuk semua tombol posting
function pasangAksiPost(saya, muat) {
  document.addEventListener('click', async e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    if (!saya) { keLogin(); return; }
    if (b.classList.contains('btn-suka')) {
      const sudah = b.classList.contains('sudah');
      const n = b.querySelector('span');
      if (sudah) { await db.from('likes').delete().match({ post_id: id, user_id: saya.id }); n.textContent = +n.textContent - 1; }
      else { await db.from('likes').insert({ post_id: id, user_id: saya.id }); n.textContent = +n.textContent + 1; }
      b.classList.toggle('sudah');
    } else if (b.classList.contains('btn-lapor')) {
      const alasan = prompt('Alasan melaporkan (maks 300 karakter):');
      if (alasan) { await db.from('reports').insert({ reporter_id: saya.id, post_id: id, alasan: alasan.slice(0, 300) }); alert('Laporan terkirim. Terima kasih.'); }
    } else if (b.classList.contains('btn-hapus')) {
      if (confirm('Hapus posting ini?')) { await db.from('posts').delete().eq('id', id); muat(); }
    }
  });
}

async function tandaiSuka(posts, saya) {
  if (!saya || !posts.length) return posts;
  const { data } = await db.from('likes').select('post_id').eq('user_id', saya.id).in('post_id', posts.map(p => p.id));
  const set = new Set((data || []).map(x => x.post_id));
  posts.forEach(p => p.sudah_suka = set.has(p.id));
  return posts;
}

const PILIH_POST = '*, profiles(username,nama,foto_url), likes(count)';

// Daftarkan service worker SETELAH halaman selesai dimuat dan browser senggang,
// supaya unduhan cache pertama kali tidak berebut bandwidth dengan tampilan halaman.
if ('serviceWorker' in navigator) {
  const daftar = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  if (document.readyState === 'complete') daftar(); else addEventListener('load', daftar, { once: true });
}

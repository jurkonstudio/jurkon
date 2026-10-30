// Isi dengan data dari Supabase > Project Settings > API
// HANYA pakai "anon public key". JANGAN PERNAH pakai service_role key.
const SUPABASE_URL = 'https://yghgmfvlthzcuhelqesr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kRhUqqmzTHW7igXOPPrcZA_VRHQ9C94';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s, el = document) => el.querySelector(s);
const param = k => new URLSearchParams(location.search).get(k);

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

async function wajibLogin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'login.html'; return null; }
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
    if (!saya) { location.href = 'login.html'; return; }
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

// Tampilan: avatar, keadaan kosong, efek memuat, placeholder bergantian.
// Dimuat setelah supabase.js, jadi fungsi htmlPost di sini menggantikan yang lama.

function avatar(nama, ukuran) {
  const u = ukuran || 40;
  const n = (nama || '?').trim() || '?';
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `<span class="avatar" style="width:${u}px;height:${u}px;font-size:${Math.round(u * 0.42)}px;background:hsl(${h} 50% 42%)">${esc(Array.from(n)[0].toUpperCase())}</span>`;
}

const IK = {
  suka: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.8 4.5 7.2 4.5c1.9 0 3.700 1 4.800 2.700 1.100-1.700 2.900-2.700 4.800-2.700 3.400 0 5.600 3.400 4.400 6.700-1.700 4.700-9.200 9.300-9.200 9.300z"/></svg>',
  balas: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  lapor: '<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/></svg>',
  hapus: '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>'
};

function htmlPost(p, saya) {
  const jml = p.likes?.[0]?.count ?? 0;
  const suka = p.sudah_suka ? 'sudah' : '';
  const nama = p.profiles.nama || p.profiles.username;
  const milik = saya && saya.id === p.user_id;
  return `<article class="post" data-id="${p.id}">
    <a class="ava" href="profil.html?u=${esc(p.profiles.username)}" aria-label="Profil ${esc(nama)}">${avatar(nama, 42)}</a>
    <div class="badan">
      <a href="profil.html?u=${esc(p.profiles.username)}"><span class="nama">${esc(nama)}</span>
      <span class="user">@${esc(p.profiles.username)}</span><span class="waktu">${waktu(p.created_at)}</span></a>
      <a href="detail.html?id=${p.id}"><div class="isi">${esc(p.content)}</div></a>
      <div class="aksi">
        <button class="btn-suka ${suka}" data-id="${p.id}" aria-label="Suka">${IK.suka}<span>${jml}</span></button>
        <a href="detail.html?id=${p.id}" aria-label="Balas">${IK.balas}<span>Balas</span></a>
        <span class="sisi">
          <button class="btn-lapor" data-id="${p.id}" aria-label="Laporkan" title="Laporkan">${IK.lapor}</button>
          ${milik ? `<button class="btn-hapus" data-id="${p.id}" aria-label="Hapus" title="Hapus">${IK.hapus}</button>` : ''}
        </span>
      </div>
    </div></article>`;
}

const IKON = {
  pena: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  cari: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  pesan: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  balas: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>'
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
document.querySelectorAll('[data-ph]').forEach(el => {
  const daftar = el.dataset.ph.split('|');
  let i = 0;
  el.placeholder = daftar[0];
  if (daftar.length > 1) {
    setInterval(() => {
      if (!el.value) { i = (i + 1) % daftar.length; el.placeholder = daftar[i]; }
    }, 3500);
  }
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
      const { error } = sudah
        ? await db.from('likes').delete().match({ post_id: id, user_id: saya.id })
        : await db.from('likes').insert({ post_id: id, user_id: saya.id });
      delete b.dataset.sibuk;
      if (error) { alert('Gagal memperbarui suka. Coba lagi.'); return; }
      n.textContent = Math.max(0, +n.textContent + (sudah ? -1 : 1));
      b.classList.toggle('sudah');
    } else if (b.classList.contains('btn-lapor')) {
      const alasan = prompt('Alasan melaporkan (maks 300 karakter):');
      if (!alasan || !alasan.trim()) return;
      const { error } = await db.from('reports').insert({ reporter_id: saya.id, post_id: id, alasan: alasan.trim().slice(0, 300) });
      if (error) alert(error.code === '23505' ? 'Kamu sudah melaporkan posting ini.' : 'Gagal mengirim laporan: ' + error.message);
      else alert('Laporan terkirim. Terima kasih.');
    } else if (b.classList.contains('btn-hapus')) {
      if (!confirm('Hapus posting ini?')) return;
      const { error } = await db.from('posts').delete().eq('id', id);
      if (error) alert('Gagal menghapus: ' + error.message); else muat();
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
const PILIH_POSTING = '*, profiles(username,nama)';

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

// Tampilan: avatar, keadaan kosong, efek memuat, placeholder bergantian.
// Dimuat setelah supabase.js, jadi fungsi htmlPost di sini menggantikan yang lama.

function avatar(nama, ukuran) {
  const u = ukuran || 40;
  const n = (nama || '?').trim() || '?';
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `<span class="avatar" style="width:${u}px;height:${u}px;font-size:${Math.round(u * 0.42)}px;background:hsl(${h} 50% 42%)">${esc(Array.from(n)[0].toUpperCase())}</span>`;
}

function htmlPost(p, saya) {
  const jml = p.likes?.[0]?.count ?? 0;
  const suka = p.sudah_suka ? 'sudah' : '';
  const nama = p.profiles.nama || p.profiles.username;
  return `<article class="post" data-id="${p.id}">
    <a class="ava" href="profil.html?u=${esc(p.profiles.username)}">${avatar(nama, 40)}</a>
    <div class="badan">
      <a href="profil.html?u=${esc(p.profiles.username)}"><span class="nama">${esc(nama)}</span>
      <span class="user">@${esc(p.profiles.username)} · ${waktu(p.created_at)}</span></a>
      <a href="detail.html?id=${p.id}"><div class="isi">${esc(p.content)}</div></a>
      <div class="aksi">
        <button class="btn-suka ${suka}" data-id="${p.id}">♥ <span>${jml}</span></button>
        <a href="detail.html?id=${p.id}">Balas</a>
        <button class="btn-lapor" data-id="${p.id}">Laporkan</button>
        ${saya && saya.id === p.user_id ? `<button class="btn-hapus" data-id="${p.id}">Hapus</button>` : ''}
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

let saya = null, profil = null, daf = null;
const IKP = {
  titik: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  gigi: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
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
    $('#atas').innerHTML = '<div class="kosong"><h3>Gagal memuat profil</h3><p>' + esc(pesanGalat(error)) + '</p><button class="btn" id="coba">Coba lagi</button></div>';
    $('#coba').onclick = muat;
    return;
  }
  if (!p) { $('#atas').innerHTML = '<div class="kosong">Profil tidak ditemukan.</div>'; return; }
  profil = p;
  const milikSaya = p.id === saya.id;
  const pengikut = p.pengikut, mengikuti = p.mengikuti, ikut = p.saya_ikut, blk = p.saya_blokir;
  const nama = p.nama || p.username;
  $('#judul').textContent = '@' + p.username;
  $('#atas').innerHTML = `<div class="profil-atas">
    <div class="kartu-kepala">${avatar(nama, 88)}
      <div class="profil-nama"><h2>${esc(nama)}</h2><div class="profil-user">@${esc(p.username)}</div>
        <div class="profil-gabung" id="gabung" hidden>${IKP.kalender}<span></span></div></div></div>
    <div class="bio ${p.bio ? '' : 'redup'}">${p.bio ? esc(p.bio) : (milikSaya ? 'Belum ada bio. Ketuk "Ubah profil" untuk memperkenalkan dirimu.' : 'Belum ada bio.')}</div>
    <div class="stat"><div><b>${pengikut}</b><span>pengikut</span></div><div><b>${mengikuti}</b><span>mengikuti</span></div></div>
    <div class="tombol">${milikSaya
      ? '<button class="btn utama" id="ubah">Ubah profil</button>'
      : `<button class="btn utama ${ikut ? 'garis' : ''}" id="ikuti" aria-pressed="${ikut ? 'true' : 'false'}">${ikut ? 'Mengikuti' : 'Ikuti'}</button>
         <button class="btn garis" id="pesan">Kirim Pesan</button>
         <div class="menu-lain"><button class="ikon-btn" id="menuLain" aria-label="Aksi lain" aria-haspopup="menu" aria-expanded="false">${IKP.titik}</button>
           <div class="menu-isi" id="menuIsi" role="menu" hidden><button role="menuitem" id="blokir" class="${blk ? '' : 'bahaya'}">${blk ? 'Buka blokir' : 'Blokir @' + esc(p.username)}</button></div></div>`}</div></div>`;
  // Tanggal bergabung: diambil terpisah supaya tidak butuh migrasi SQL
  db.from('profiles').select('created_at').eq('id', p.id).maybeSingle().then(({ data }) => {
    const el = $('#gabung');
    if (!el || !data || !data.created_at || profil !== p) return;
    el.querySelector('span').textContent = 'Bergabung ' + new Date(data.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    el.hidden = false;
  });
  if (milikSaya) {
    $('#keluar').innerHTML = `<button class="ikon-btn" id="bukaPengaturan" aria-label="Pengaturan">${IKP.gigi}</button>`;
    $('#bukaPengaturan').onclick = () => $('#lembarPengaturan').showModal();
    $('#tutupPengaturan').onclick = () => $('#lembarPengaturan').close();
    $('#lembarPengaturan').onclick = e => { if (e.target === e.currentTarget) e.currentTarget.close(); };
    $('#logout').onclick = async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'login.html'; };
    $('#ubah').onclick = ubah;
    $('#tema').hidden = false;
    $('#akun').hidden = false;
  } else {
    $('#menuLain').onclick = e => {
      e.stopPropagation();
      const m = $('#menuIsi'), buka = m.hidden;
      m.hidden = !buka;
      $('#menuLain').setAttribute('aria-expanded', String(buka));
      if (buka) $('#blokir').focus();
    };
    $('#ikuti').onclick = async () => {
      $('#ikuti').disabled = true;
      if (ikut) await db.from('follows').delete().match({ follower_id: saya.id, following_id: p.id });
      else await db.from('follows').insert({ follower_id: saya.id, following_id: p.id });
      muat();
    };
    $('#blokir').onclick = async () => {
      tutupMenu();
      if (blk) { await db.from('blocks').delete().match({ blocker_id: saya.id, blocked_id: p.id }); muat(); return; }
      if (!confirm('Blokir @' + p.username + '? Posting kalian tidak akan saling terlihat dan tidak bisa saling berkirim pesan.')) return;
      const { error } = await db.rpc('blokir', { target: p.id });
      if (error) alert('Gagal memblokir: ' + error.message); else muat();
    };
    $('#pesan').onclick = async () => {
      const { data, error } = await db.rpc('buka_percakapan', { lawan: p.id });
      if (error) alert('Gagal: ' + error.message); else location.href = 'chat.html?id=' + data;
    };
  }
  if (blk) { $('#judulCatatan').hidden = true; $('#daftar').innerHTML = kosong('pena', 'Kamu memblokir akun ini', 'Posting @' + esc(p.username) + ' disembunyikan. Ketuk "Buka blokir" di menu ⋯ untuk melihatnya lagi.'); return; }
  $('#judulCatatan').hidden = false;
  if (daf) daf.hentikan();
  daf = daftarBerhalaman($('#daftar'), sebelum => ambilPosting({ mode: 'pengguna', id: p.id, sebelum }, saya),
    () => milikSaya ? kosong('pena', 'Belum ada catatan', 'Ceritakan sesuatu hari ini, sependek apa pun.', 'post.html', 'Tulis sekarang') : kosong('pena', 'Belum ada posting', '@' + esc(p.username) + ' belum menulis apa pun.'), saya);
  daf.muat();
}
function ubah() {
  if ($('#lembarUbah')) return;
  const d = document.createElement('dialog');
  d.id = 'lembarUbah'; d.className = 'lembar'; d.setAttribute('aria-labelledby', 'jUbah');
  d.innerHTML = `<div class="lembar-kepala"><h2 id="jUbah">Ubah profil</h2><button class="ikon-btn" id="uTutup" aria-label="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="pratinjau" id="uPratinjau"></div>
    <div id="formUbah" class="form">
    <label for="uNama">Nama tampilan</label>
    <input type="text" id="uNama" maxlength="40" autocomplete="off" value="${esc(profil.nama || '')}">
    <label for="uBio">Bio</label>
    <textarea id="uBio" style="min-height:70px" aria-label="Bio"></textarea>
    <div class="baris"><span class="hitung" id="uHitung"></span></div>
    <label for="uUser">Username</label>
    <input type="text" id="uUser" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(profil.username)}">
    <div class="hitung">Huruf kecil, angka, dan garis bawah (_), 3-20 karakter.</div>
    <div class="galat" id="uGalat" role="alert"></div>
    <div class="tombol"><button class="btn utama" id="uSimpan">Simpan</button><button class="btn garis" id="uBatal">Batal</button></div></div>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.onclick = e => { if (e.target === d) d.close(); };
  $('#uBio').value = profil.bio || '';
  pasangHitung($('#uBio'), $('#uHitung'), 160);
  const pratinjau = () => {
    const n = $('#uNama').value.trim(), u = $('#uUser').value.trim().toLowerCase();
    $('#uPratinjau').innerHTML = avatar(n || u || '?', 56) + `<div class="profil-nama"><div class="pr-nama">${esc(n || u || 'Namamu')}</div><div class="profil-user">@${esc(u || 'username')}</div></div>`;
  };
  pratinjau();
  $('#uNama').addEventListener('input', pratinjau);
  $('#uUser').addEventListener('input', pratinjau);
  $('#uBatal').onclick = () => d.close();
  $('#uTutup').onclick = () => d.close();
  $('#uSimpan').onclick = async () => {
    const username = $('#uUser').value.trim().toLowerCase();
    const galat = $('#uGalat'); galat.textContent = '';
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { galat.textContent = 'Username harus 3-20 karakter: huruf kecil, angka, atau garis bawah.'; return; }
    const gabung = [$('#uNama').value, $('#uBio').value, username].join(' \n ');
    if (!bolehKirim(gabung, m => galat.textContent = m)) return;
    $('#uSimpan').disabled = true;
    const { error } = await db.from('profiles').update({
      nama: $('#uNama').value.trim().slice(0, 40) || null,
      bio: $('#uBio').value.trim().slice(0, 160) || null,
      username
    }).eq('id', saya.id);
    $('#uSimpan').disabled = false;
    if (error) { galat.textContent = error.code === '23505' ? 'Username sudah dipakai.' : error.code === '23514' ? 'Username harus 3-20 karakter: huruf kecil, angka, atau garis bawah.' : pesanGalat(error); return; }
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

let saya = null, profil = null, daf = null;
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
  $('#judul').textContent = '@' + p.username;
  $('#atas').innerHTML = `<div class="profil-atas">
    <div class="baris-profil">${avatar(p.nama || p.username, 64)}
      <div><h2>${esc(p.nama || p.username)}</h2><div style="color:var(--redup)">@${esc(p.username)}</div></div></div>
    <div class="bio ${p.bio ? '' : 'redup'}">${p.bio ? esc(p.bio) : (milikSaya ? 'Belum ada bio. Ketuk "Ubah profil" untuk memperkenalkan dirimu.' : 'Belum ada bio.')}</div>
    <div class="stat">${pengikut} pengikut · ${mengikuti} mengikuti</div>
    <div class="tombol">${milikSaya
      ? '<button class="btn garis" id="ubah">Ubah profil</button>'
      : `<button class="btn ${ikut ? 'garis' : ''}" id="ikuti">${ikut ? 'Mengikuti' : 'Ikuti'}</button>
         <button class="btn garis" id="pesan">Kirim Pesan</button>
         <button class="btn garis" id="blokir">${blk ? 'Buka blokir' : 'Blokir'}</button>`}</div></div>`;
  if (milikSaya) {
    $('#keluar').innerHTML = '<a href="#" id="logout">Keluar</a>';
    $('#logout').onclick = async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'login.html'; };
    $('#ubah').onclick = ubah;
    $('#tema').hidden = false;
    $('#akun').hidden = false;
  } else {
    $('#ikuti').onclick = async () => {
      if (ikut) await db.from('follows').delete().match({ follower_id: saya.id, following_id: p.id });
      else await db.from('follows').insert({ follower_id: saya.id, following_id: p.id });
      muat();
    };
    $('#blokir').onclick = async () => {
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
  if (blk) { $('#daftar').innerHTML = kosong('pena', 'Kamu memblokir akun ini', 'Posting @' + esc(p.username) + ' disembunyikan. Ketuk "Buka blokir" untuk melihatnya lagi.'); return; }
  if (daf) daf.hentikan();
  daf = daftarBerhalaman($('#daftar'), sebelum => ambilPosting({ mode: 'pengguna', id: p.id, sebelum }, saya),
    () => milikSaya ? kosong('pena', 'Belum ada catatan', 'Ceritakan sesuatu hari ini, sependek apa pun.', 'post.html', 'Tulis sekarang') : kosong('pena', 'Belum ada posting', '@' + esc(p.username) + ' belum menulis apa pun.'), saya);
  daf.muat();
}
function ubah() {
  const el = $('#atas .tombol');
  if (!el || $('#formUbah')) return;
  const f = document.createElement('div');
  f.id = 'formUbah'; f.className = 'form'; f.style.padding = '12px 0';
  f.innerHTML = `<label for="uNama">Nama tampilan</label>
    <input type="text" id="uNama" maxlength="40" autocomplete="off" value="${esc(profil.nama || '')}">
    <label for="uBio">Bio</label>
    <textarea id="uBio" style="min-height:70px" aria-label="Bio"></textarea>
    <div class="baris"><span class="hitung" id="uHitung"></span></div>
    <label for="uUser">Username</label>
    <input type="text" id="uUser" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(profil.username)}">
    <div class="hitung">Huruf kecil, angka, dan garis bawah (_), 3-20 karakter.</div>
    <div class="galat" id="uGalat" role="alert"></div>
    <div class="tombol"><button class="btn" id="uSimpan">Simpan</button><button class="btn garis" id="uBatal">Batal</button></div>`;
  el.after(f);
  $('#uBio').value = profil.bio || '';
  pasangHitung($('#uBio'), $('#uHitung'), 160);
  $('#uBatal').onclick = () => f.remove();
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
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  muat();
})();

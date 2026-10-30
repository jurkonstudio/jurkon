let saya = null, profil = null;
async function ambilProfil() {
  const u = param('u');
  const q = db.from('profiles').select('*');
  const { data } = u ? await q.eq('username', u).maybeSingle() : await q.eq('id', saya.id).maybeSingle();
  return data;
}
async function muat() {
  const p = await ambilProfil();
  if (!p) { $('#atas').innerHTML = '<div class="kosong">Profil tidak ditemukan.</div>'; return; }
  profil = p;
  const milikSaya = p.id === saya.id;
  const [{ count: pengikut }, { count: mengikuti }, { data: ikut }] = await Promise.all([
    db.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id),
    db.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', p.id),
    db.from('follows').select('*').match({ follower_id: saya.id, following_id: p.id }).maybeSingle()
  ]);
  $('#judul').textContent = '@' + p.username;
  $('#atas').innerHTML = `<div class="profil-atas">
    <div class="baris-profil">${avatar(p.nama || p.username, 64)}
      <div><h2>${esc(p.nama || p.username)}</h2><div style="color:var(--redup)">@${esc(p.username)}</div></div></div>
    <div class="bio ${p.bio ? '' : 'redup'}">${p.bio ? esc(p.bio) : (milikSaya ? 'Belum ada bio. Ketuk "Ubah profil" untuk memperkenalkan dirimu.' : 'Belum ada bio.')}</div>
    <div class="stat">${pengikut || 0} pengikut · ${mengikuti || 0} mengikuti</div>
    <div class="tombol">${milikSaya
      ? '<button class="btn garis" id="ubah">Ubah profil</button>'
      : `<button class="btn ${ikut ? 'garis' : ''}" id="ikuti">${ikut ? 'Mengikuti' : 'Ikuti'}</button>
         <button class="btn garis" id="pesan">Kirim Pesan</button>`}</div></div>`;
  if (milikSaya) {
    $('#keluar').innerHTML = '<a href="#" id="logout">Keluar</a>';
    $('#logout').onclick = async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'login.html'; };
    $('#ubah').onclick = ubah;
  } else {
    $('#ikuti').onclick = async () => {
      if (ikut) await db.from('follows').delete().match({ follower_id: saya.id, following_id: p.id });
      else await db.from('follows').insert({ follower_id: saya.id, following_id: p.id });
      muat();
    };
    $('#pesan').onclick = async () => {
      const { data, error } = await db.rpc('buka_percakapan', { lawan: p.id });
      if (error) alert('Gagal: ' + error.message); else location.href = 'chat.html?id=' + data;
    };
  }
  const { data: posts } = await db.from('posts').select(PILIH_POST).eq('user_id', p.id).order('created_at', { ascending: false }).limit(50);
  await tandaiSuka(posts || [], saya);
  $('#daftar').innerHTML = (posts || []).map(x => htmlPost(x, saya)).join('') || (milikSaya ? kosong('pena', 'Belum ada catatan', 'Ceritakan sesuatu hari ini, sependek apa pun.', 'post.html', 'Tulis sekarang') : kosong('pena', 'Belum ada posting', '@' + esc(p.username) + ' belum menulis apa pun.'));
}
async function ubah() {
  const nama = prompt('Nama tampilan (maks 40):', profil.nama || '');
  if (nama === null) return;
  const bio = prompt('Bio (maks 160):', profil.bio || '');
  if (bio === null) return;
  const username = prompt('Username (huruf kecil, angka, _ ; 3-20):', profil.username);
  if (!username) return;
  const { error } = await db.from('profiles').update({ nama: nama.slice(0, 40), bio: bio.slice(0, 160), username: username.toLowerCase() }).eq('id', saya.id);
  if (error) alert('Gagal: ' + error.message); else location.href = 'profil.html?u=' + username.toLowerCase();
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  muat();
})();

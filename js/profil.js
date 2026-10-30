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
    <div class="kartu-kepala">${avatar(nama, 88, p.foto)}
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
      const { error } = ikut
        ? await db.from('follows').delete().match({ follower_id: saya.id, following_id: p.id })
        : await db.from('follows').insert({ follower_id: saya.id, following_id: p.id });
      if (error) alert(pesanGalat(error));
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
  const tgl = new Date(k.reset).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return sisa <= 0
    ? { teks: `Batas ganti ${label} bulan ini sudah habis. Bisa lagi mulai ${tgl}.`, habis: true, sisa }
    : { teks: `Sisa ganti ${label} bulan ini: ${sisa} dari ${q.maks}.`, habis: false, sisa };
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
        if (!s) throw new Error('Gambar kosong.');
        const c = document.createElement('canvas'); c.width = c.height = sisi;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, sisi, sisi);
        x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, sisi, sisi);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? ok(b) : gagal(new Error('Gagal memproses gambar.')), 'image/jpeg', 0.85);
      } catch (e) { URL.revokeObjectURL(url); gagal(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('File itu tidak bisa dibaca sebagai gambar.')); };
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
  d.innerHTML = `<div class="lembar-kepala"><h2 id="jUbah">Ubah profil</h2><button class="ikon-btn" id="uTutup" aria-label="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="pratinjau" id="uPratinjau"></div>
    <div id="formUbah" class="form">
    <label for="uPilihFoto">Foto profil</label>
    <div class="foto-ubah">
      <button type="button" class="btn garis" id="uPilihFoto">Pilih foto</button>
      <button type="button" class="btn garis" id="uHapusFoto" hidden>Hapus foto</button>
      <input type="file" id="uFile" accept="image/jpeg,image/png,image/webp" hidden>
    </div>
    <div class="kuota" id="kFoto"></div>
    <label for="uNama">Nama tampilan</label>
    <input type="text" id="uNama" maxlength="40" autocomplete="off" value="${esc(profil.nama || '')}">
    <div class="kuota" id="kNama"></div>
    <label for="uBio">Bio</label>
    <textarea id="uBio" style="min-height:70px" aria-label="Bio"></textarea>
    <div class="baris"><span class="hitung" id="uHitung"></span></div>
    <label for="uUser">Username</label>
    <input type="text" id="uUser" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(profil.username)}">
    <div class="hitung">Huruf kecil, angka, dan garis bawah (_), 3-20 karakter.</div>
    <div class="kuota" id="kUser"></div>
    <div class="hitung">Batas ganti foto, nama, dan username dihitung per bulan dan di-reset tiap tanggal 1.</div>
    <div class="galat" id="uGalat" role="alert"></div>
    <div class="tombol"><button class="btn utama" id="uSimpan">Simpan</button><button class="btn garis" id="uBatal">Batal</button></div></div>`;
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
    $('#uPratinjau').innerHTML = avatar(n || u || '?', 56, fotoKini()) + `<div class="profil-nama"><div class="pr-nama">${esc(n || u || 'Namamu')}</div><div class="profil-user">@${esc(u || 'username')}</div></div>`;
    const ada = !!fotoKini();
    $('#uHapusFoto').hidden = !(ada || fotoBlob);
    $('#uHapusFoto').textContent = fotoBlob ? 'Batalkan pilihan' : 'Hapus foto';
  };
  const terapkanKuota = () => {
    const f = infoKuota(kuota, 'foto', 'foto profil'), n = infoKuota(kuota, 'nama', 'nama'), u = infoKuota(kuota, 'username', 'username');
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
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { galat.textContent = 'Pakai foto berformat JPG, PNG, atau WebP.'; return; }
    if (f.size > 15 * 1024 * 1024) { galat.textContent = 'Foto terlalu besar (maksimal 15 MB).'; return; }
    try {
      fotoBlob = await ubahUkuranFoto(f);
      lepasPratinjau();
      fotoPratinjau = URL.createObjectURL(fotoBlob);
      hapusFoto = false;
      pratinjau();
    } catch (e) { galat.textContent = e.message || 'Foto tidak bisa diproses.'; }
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
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { galat.textContent = 'Username harus 3-20 karakter: huruf kecil, angka, atau garis bawah.'; return; }
    const gabung = [$('#uNama').value, $('#uBio').value, username].join(' \n ');
    if (!bolehKirim(gabung, m => galat.textContent = m)) return;

    const ubahNama = nama !== (profil.nama || null), ubahUser = username !== profil.username;
    const ubahFoto = !!fotoBlob || (hapusFoto && !!profil.foto);
    const daftar = [];
    [[ubahFoto, 'foto', 'foto profil'], [ubahNama, 'nama', 'nama'], [ubahUser, 'username', 'username']].forEach(([ya, jenis, label]) => {
      if (!ya) return;
      const k = infoKuota(kuota, jenis, label);
      if (k.habis) { galat.textContent = k.teks; daftar.push(null); return; }
      if (k.sisa !== Infinity) daftar.push(`${label} (sisa ${k.sisa} → ${k.sisa - 1})`);
    });
    if (daftar.includes(null)) return;
    if (daftar.length && !confirm('Perubahan ini memakai jatah ganti bulan ini:\n• ' + daftar.join('\n• ') + '\n\nLanjutkan?')) return;

    $('#uSimpan').disabled = true;
    const ubahan = { nama, bio: $('#uBio').value.trim().slice(0, 160) || null, username };
    let pathBaru = null;
    if (fotoBlob) {
      pathBaru = saya.id + '/' + Date.now() + '.jpg';
      const { error: eu } = await db.storage.from('avatar').upload(pathBaru, fotoBlob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (eu) {
        $('#uSimpan').disabled = false;
        galat.textContent = /bucket not found/i.test(eu.message || '') ? 'Penyimpanan foto belum disiapkan. Jalankan sql/008_foto_profil_limit.sql di Supabase.' : 'Gagal mengunggah foto: ' + pesanGalat(eu);
        return;
      }
      ubahan.foto_url = pathBaru;
    } else if (ubahFoto) ubahan.foto_url = null;

    const { error } = await db.from('profiles').update(ubahan).eq('id', saya.id);
    $('#uSimpan').disabled = false;
    if (error) {
      if (pathBaru) db.storage.from('avatar').remove([pathBaru]).catch(() => {});
      galat.textContent = error.code === '23505' ? 'Username sudah dipakai.' : error.code === '23514' ? 'Username harus 3-20 karakter: huruf kecil, angka, atau garis bawah.' : pesanGalat(error);
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

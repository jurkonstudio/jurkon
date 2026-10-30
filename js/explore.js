let saya = null, tunda, versi = 0, daf = null;
// Jelajah: tanpa kata kunci hanya menampilkan "Sorotan" (dilihat di atas ambang atau dipilih admin).
// Dengan kata kunci, pencarian tetap menjangkau semua orang dan posting.
async function muat() {
  const kata = $('#cari').value.trim().replace(/^@/, '').slice(0, 50);
  const ini = ++versi;
  if (daf) daf.hentikan();
  const el = $('#daftar');
  let elOrang = $('#orang');
  if (!elOrang) { elOrang = document.createElement('div'); elOrang.id = 'orang'; el.parentNode.insertBefore(elOrang, el); }
  let judul = $('#judulSorotan');
  if (!judul) {
    judul = document.createElement('div'); judul.id = 'judulSorotan'; judul.className = 'bagian-judul ramai-judul';
    judul.innerHTML = '<h2>' + esc(t('explore.sorotan')) + '</h2><p class="hitung">' + esc(t('explore.sorotanSub')) + '</p>';
    el.parentNode.insertBefore(judul, el);
  }
  judul.hidden = !!kata;
  let jmlOrang = 0;
  if (kata) {
    const pola = '%' + kata.replace(/[\\%_]/g, c => '\\' + c) + '%';   // escape karakter khusus LIKE
    const [r1, r2] = await Promise.all([
      db.from('profiles').select('id,username,nama,bio,foto_url').ilike('username', pola).limit(10),
      db.from('profiles').select('id,username,nama,bio,foto_url').ilike('nama', pola).limit(10)
    ]);
    if (ini !== versi) return;
    if (r1.error && r2.error) {
      elOrang.innerHTML = '<div class="kosong"><p>' + esc(t('explore.gagalOrang', { pesan: pesanGalat(r1.error) })) + '</p></div>';
    } else {
      const peta = new Map();
      [...(r1.data || []), ...(r2.data || [])].forEach(o => peta.set(o.id, o));
      const orang = [...peta.values()].slice(0, 10);
      jmlOrang = orang.length;
      elOrang.innerHTML = orang.map(o => `<a class="item dgn-avatar" href="profil.html?u=${esc(o.username)}">
        ${avatar(o.nama || o.username, 44, o.foto_url)}
        <div><b>${esc(o.nama || o.username)}</b>${lencanaResmi(o.username)} <span class="sub">@${esc(o.username)}</span>
        <div class="sub">${esc(o.bio || '')}</div></div></a>`).join('');
    }
  } else elOrang.innerHTML = '';
  daf = daftarBerhalaman(el,
    sebelum => kata ? ambilPosting({ mode: 'cari', kata, sebelum }, saya) : ambilSorotan({ sebelum }, saya),
    () => kata
      ? (jmlOrang ? '' : kosong('cari', t('explore.tidakDitemukan'), esc(t('explore.tidakAda', { kata }))))
      : kosong('cari', t('explore.belumJ'), t('explore.belumT')),
    saya, kata ? undefined : { cache: 'sorotan' });
  daf.muat();
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  $('#cari').addEventListener('input', () => { clearTimeout(tunda); tunda = setTimeout(muat, 350); });
  muat();
})();

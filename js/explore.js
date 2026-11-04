let saya = null, tunda, versi = 0, daf = null, ruangManual = null, deteksiLalu = 'semua';
// auto-cakupan v7: "@nama" otomatis mencari orang saja, "#tagar" mencari catatan saja, selain itu keduanya.
// Kapsul Semua | Orang | Catatan bisa dipilih manual; ketuk kapsul yang sedang otomatis untuk kembali ke otomatis.
// Cakupan yang tidak perlu tidak diminta ke server (lebih hemat dan cepat).
function deteksiRuang(mentah) { const c = String(mentah).trim().charAt(0); return c === '@' ? 'orang' : c === '#' ? 'catatan' : 'semua'; }
function pasangRuang() {
  if ($('#cariRuang')) return;
  const pad = $('#cari').closest('.pad') || $('#cari').parentNode;
  const bar = document.createElement('div');
  bar.id = 'cariRuang'; bar.className = 'cari-ruang'; bar.hidden = true;
  bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', t('explore.ruangAria'));
  bar.innerHTML = [['semua', 'explore.ruangSemua'], ['orang', 'explore.ruangOrang'], ['catatan', 'explore.ruangCatatan']]
    .map(([k, kunci]) => `<button type="button" role="tab" data-r="${k}" aria-selected="false">${esc(t(kunci))}</button>`).join('');
  const tips = document.createElement('p');
  tips.id = 'cariTips'; tips.className = 'cari-tips'; tips.textContent = t('explore.tips');
  pad.after(bar); bar.after(tips);
  bar.addEventListener('click', e => {
    const b = e.target.closest('button[data-r]');
    if (!b) return;
    ruangManual = b.dataset.r === deteksiRuang($('#cari').value) ? null : b.dataset.r;
    muat();
  });
}
function segarkanRuang(kata, ruang) {
  const bar = $('#cariRuang'), tips = $('#cariTips');
  if (!bar) return;
  bar.hidden = !kata; if (tips) tips.hidden = !!kata;
  const otomatis = !ruangManual && deteksiRuang($('#cari').value) !== 'semua';
  bar.querySelectorAll('button').forEach(b => {
    const aktif = b.dataset.r === ruang;
    b.setAttribute('aria-selected', aktif ? 'true' : 'false');
    const o = b.querySelector('.oto'); if (o) o.remove();
    if (aktif && otomatis) b.insertAdjacentHTML('beforeend', '<span class="oto">' + esc(t('explore.otomatis')) + '</span>');
  });
}
// Jelajah: tanpa kata kunci hanya menampilkan "Sorotan" (dilihat di atas ambang atau dipilih admin).
// Dengan kata kunci, pencarian menjangkau orang dan/atau posting sesuai cakupan.
async function muat() {
  const mentah = $('#cari').value.trim();
  const ruang = ruangManual || deteksiRuang(mentah);
  const kata = (ruang === 'catatan' ? mentah : mentah.replace(/^@/, '')).slice(0, 50);
  const cariOrang = !!kata && ruang !== 'catatan';
  const cariPosting = !kata || ruang !== 'orang';
  segarkanRuang(kata, ruang);
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
  let jmlOrang = 0, galatOrang = false;
  if (cariOrang) {
    const pola = '%' + kata.replace(/[\\%_]/g, c => '\\' + c) + '%';   // escape karakter khusus LIKE
    const [r1, r2] = await Promise.all([
      db.from('profiles').select('id,username,nama,bio,foto_url').ilike('username', pola).limit(10),
      db.from('profiles').select('id,username,nama,bio,foto_url').ilike('nama', pola).limit(10)
    ]);
    if (ini !== versi) return;
    if (r1.error && r2.error) {
      galatOrang = true;
      elOrang.innerHTML = '<div class="kosong"><p>' + esc(t('explore.gagalOrang', { pesan: pesanGalat(r1.error) })) + '</p></div>';
    } else {
      const peta = new Map();
      [...(r1.data || []), ...(r2.data || [])].forEach(o => peta.set(o.id, o));
      const orang = [...peta.values()].slice(0, 10);
      jmlOrang = orang.length;
      elOrang.innerHTML = orang.map(o => `<a class="item dgn-avatar" href="profil?u=${esc(o.username)}">
        ${avatar(o.nama || o.username, 44, o.foto_url)}
        <div><b>${esc(o.nama || o.username)}</b>${lencanaResmi(o.username)} <span class="sub">@${esc(o.username)}</span>
        <div class="sub">${esc(o.bio || '')}</div></div></a>`).join('');
    }
  } else elOrang.innerHTML = '';
  if (!cariPosting) {   // cakupan "Orang": tidak meminta posting sama sekali
    el.innerHTML = (jmlOrang || galatOrang) ? '' : kosong('cari', t('explore.tidakDitemukan'), esc(t('explore.tidakAda', { kata })));
    return;
  }
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
  pasangRuang();
  // Dari tautan #tagar di posting atau kolom cari di panel kanan: isi kolom cari lebih dulu (explore.html?q=%23tagar)
  const q = (param('q') || '').trim().slice(0, 50);
  if (q) $('#cari').value = q;
  deteksiLalu = deteksiRuang($('#cari').value);
  $('#cari').addEventListener('input', () => {
    const d = deteksiRuang($('#cari').value);
    if (d !== deteksiLalu || !$('#cari').value.trim()) ruangManual = null;   // awalan berubah: kembali otomatis
    deteksiLalu = d;
    clearTimeout(tunda); tunda = setTimeout(muat, 350);
  });
  muat();
})();

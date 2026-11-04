let saya = null, tunda, versi = 0, daf = null, ruangManual = null, deteksiLalu = 'semua', tab = 'terbaru';
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
// ---- Tab Terbaru | Sorotan ------------------------------------------------------------------
function segarkanTab() {
  document.querySelectorAll('#tabJelajah button[data-t]').forEach(b => b.setAttribute('aria-selected', b.dataset.t === tab ? 'true' : 'false'));
}
// Kosong yang mengajak: tulis catatan pertama dan undang teman (jujur, tanpa isi buatan)
function kosongTerbaru() {
  const k = kosong('pena', t('explore.kosongTerbaruJ'), t('explore.kosongTerbaruT'), 'post', t('umum.tulisSekarang'));
  return k.replace(/<\/div>\s*$/, '<button type="button" class="btn garis jl-undang-btn" data-undang>' + esc(t('explore.undang')) + '</button></div>');
}
// Tautan undangan pribadi (sama dengan langkah 3 onboarding): bagikan lewat menu ponsel, atau salin
async function undangTeman() {
  let nama = null;
  try { const r = await db.from('profiles').select('username').eq('id', saya.id).maybeSingle(); nama = r.data && r.data.username; } catch (e) {}
  if (!nama) { toastUmum(t('err.umum')); return; }
  const url = location.origin + '/?undang=' + encodeURIComponent(nama);
  if (navigator.share) { try { await navigator.share({ text: t('mulai.bagikanTeks', { url }), url }); } catch (e) {} return; }
  try { await navigator.clipboard.writeText(url); toastUmum(t('mulai.tersalin')); } catch (e) { toastUmum(url); }
}

// ---- Orang untuk diikuti (saran_akun, sql/044; bila belum ada, hanya tombol Undang yang tampil) ----
function kartuOrang(o) {
  return `<div class="jl-orang" data-id="${esc(o.id)}">
    <a class="jl-orang-tautan" href="profil?u=${esc(o.username)}">${avatar(o.nama || o.username, 48, o.foto_url, o.username)}
      <b>${esc(o.nama || o.username)}${lencanaResmi(o.username)}</b><span class="sub">@${esc(o.username)}</span></a>
    <button type="button" class="btn kecil garis jl-ikuti" aria-pressed="false">${esc(t('explore.ikuti'))}</button></div>`;
}
async function muatSaran() {
  const el = $('#saranOrang');
  if (!el) return;
  let orang = [];
  try { const r = await db.rpc('saran_akun', { p_limit: 8 }); if (!r.error && Array.isArray(r.data)) orang = r.data; } catch (e) {}
  el.innerHTML = '<div class="jl-saran-kepala"><h2>' + esc(t('explore.orangJ')) + '</h2>' +
    '<button type="button" class="jl-undang" data-undang>' + esc(t('explore.undang')) + '</button></div>' +
    (orang.length ? '<div class="jl-saran-baris">' + orang.map(kartuOrang).join('') + '</div>' : '');
  el.hidden = false;
}
function pasangSaran() {
  const el = $('#saranOrang');
  if (!el) return;
  el.addEventListener('click', async e => {
    const b = e.target.closest('.jl-ikuti');
    if (!b) return;
    const id = b.closest('.jl-orang').dataset.id, sudah = b.getAttribute('aria-pressed') === 'true';
    b.disabled = true;
    const { error } = sudah
      ? await db.from('follows').delete().match({ follower_id: saya.id, following_id: id })
      : await db.from('follows').insert({ follower_id: saya.id, following_id: id });
    b.disabled = false;
    if (error) { toastUmum(t('err.umum')); return; }
    b.setAttribute('aria-pressed', sudah ? 'false' : 'true');
    b.textContent = t(sudah ? 'explore.ikuti' : 'explore.mengikuti');
    b.classList.toggle('garis', sudah);
  });
}

// Jelajah v8: tanpa kata kunci menampilkan Pertanyaan hari ini, Orang untuk diikuti, dan dua tab:
//   Terbaru (semua catatan publik terbaru, bawaan; tidak pernah kosong selama ada satu catatan) dan
//   Sorotan (dilihat di atas ambang atau dipilih admin).
// Dengan kata kunci, bagian-bagian itu disembunyikan (kelas body.sedang-cari) dan pencarian menjangkau
// orang dan/atau posting sesuai cakupan.
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
  document.body.classList.toggle('sedang-cari', !!kata);
  let judul = $('#judulSorotan');
  if (!judul) {
    judul = document.createElement('div'); judul.id = 'judulSorotan'; judul.className = 'bagian-judul ramai-judul';
    judul.innerHTML = '<p class="hitung"></p>';
    el.parentNode.insertBefore(judul, el);
  }
  judul.hidden = !!kata;
  judul.querySelector('p').textContent = t(tab === 'sorotan' ? 'explore.sorotanSub' : 'explore.terbaruSub');
  segarkanTab();
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
        ${avatar(o.nama || o.username, 44, o.foto_url, o.username)}
        <div><b>${esc(o.nama || o.username)}</b>${lencanaResmi(o.username)} <span class="sub">@${esc(o.username)}</span>
        <div class="sub">${esc(o.bio || '')}</div></div></a>`).join('');
    }
  } else elOrang.innerHTML = '';
  if (!cariPosting) {   // cakupan "Orang": tidak meminta posting sama sekali
    el.innerHTML = (jmlOrang || galatOrang) ? '' : kosong('cari', t('explore.tidakDitemukan'), esc(t('explore.tidakAda', { kata })));
    return;
  }
  const kosongTab = tab === 'sorotan'
    ? kosong('cari', t('explore.belumJ'), t('explore.sorotanKosongT'))
    : kosongTerbaru();
  daf = daftarBerhalaman(el,
    sebelum => kata ? ambilPosting({ mode: 'cari', kata, sebelum }, saya)
      : tab === 'sorotan' ? ambilSorotan({ sebelum }, saya)
      : ambilPosting({ mode: 'semua', sebelum }, saya),
    () => kata
      ? (jmlOrang ? '' : kosong('cari', t('explore.tidakDitemukan'), esc(t('explore.tidakAda', { kata }))))
      : kosongTab,
    saya, kata ? undefined : { cache: tab });
  daf.muat();
}
(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  pasangRuang();
  pasangSaran();
  muatSaran();
  document.addEventListener('click', e => { if (e.target.closest('[data-undang]')) undangTeman(); });
  $('#tabJelajah').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]');
    if (!b || b.dataset.t === tab) return;
    tab = b.dataset.t;
    muat();
  });
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

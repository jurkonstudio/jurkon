// Halaman baca catatan publik (n.html?id=...). Bisa dibuka tanpa login.
// Hanya memanggil fungsi catatan_publik(id) (sql/027); tabel posts tetap tertutup untuk anon.
(async function () {
  const kartu = $('#kartu'), ajak = $('#ajak'), lapor = $('#lapor');
  const id = String(param('id') || '').toLowerCase();

  function setMeta(sel, atr, nilai) { const el = document.querySelector(sel); if (el) el.setAttribute(atr, nilai); }
  function potong(s, n) { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
  function noindex() { setMeta('meta[name="robots"]', 'content', 'noindex'); }

  async function sesi() { try { return (await db.auth.getSession()).data.session; } catch (e) { return null; } }

  function ajakan(masuk) {
    ajak.innerHTML = '<p>' + esc(t('pub.ajak')) + '</p><a class="btn" href="' + (masuk ? 'index.html' : 'login.html') + '">' + esc(masuk ? t('pub.buka') : t('pub.gabung')) + '</a>' +
      '<p class="jl-tentang"><a href="jelajahi.html">' + esc(t('jl.judul')) + '</a></p>';
    ajak.hidden = false;
  }

  async function kosong() {
    noindex();
    kartu.innerHTML = '<div class="kosong"><p>' + esc(t('pub.hilang')) + '</p></div>';
    ajakan(!!(await sesi()));
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return kosong();

  const { data, error } = await db.rpc('catatan_publik', { p_id: id });
  if (error) {
    kartu.innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(galatRamah(error)) + '</p><button class="btn" id="coba">' + esc(t('umum.cobaLagi')) + '</button></div>';
    $('#coba').onclick = () => location.reload();
    return;
  }
  const c = data && data[0];
  if (!c) return kosong();

  const nama = c.nama || c.username;
  let h = 0;
  for (const ch of nama) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const awal = Array.from(nama)[0].toUpperCase();
  const tgl = new Date(c.created_at).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'long', year: 'numeric' });

  // Judul dan deskripsi untuk Google/WhatsApp (crawler tanpa JS dilayani Worker; lihat worker/README.md)
  const judul = t('ui5.judulBagikan', { judul: t('pf.bagikanJudul', { nama: nama, u: c.username }), isi: potong(c.content, 70) });
  const desk = potong(c.content, 155);
  const kanon = 'https://jurkon.my.id/n?id=' + c.id;
  document.title = judul;
  setMeta('meta[name="description"]', 'content', desk);
  setMeta('link[rel="canonical"]', 'href', kanon);
  setMeta('meta[property="og:title"]', 'content', judul);
  setMeta('meta[property="og:description"]', 'content', desk);
  setMeta('meta[property="og:url"]', 'content', kanon);

  // Isi hanya di-escape (tanpa tautan @/# otomatis, karena tautan itu mengarah ke halaman yang butuh login)
  kartu.innerHTML = '<article class="post" data-id="' + esc(c.id) + '">' +
    '<span class="ava"><span class="avatar" style="width:42px;height:42px;font-size:18px;background:hsl(' + h + ' 50% 42%)">' + esc(awal) + '</span></span>' +
    '<div class="badan"><span class="nama">' + esc(nama) + '</span> <span class="user">@' + esc(c.username) + '</span> <span class="waktu">' + esc(tgl) + '</span>' +
    '<div class="isi">' + esc(c.content) + '</div>' +
    '<div class="aksi"><span class="btn-suka" aria-hidden="true">' + (typeof IK !== 'undefined' ? IK.suka : '♥') + '<span>' + Number(c.jumlah_suka || 0) + '</span></span></div></div></article>';

  const masuk = !!(await sesi());
  ajakan(masuk);

  lapor.innerHTML = '<button type="button" id="btnLapor">' + esc(t('pub.lapor')) + '</button>';
  lapor.hidden = false;
  $('#btnLapor').onclick = async () => {
    const s = await sesi();
    if (!s) { location.href = 'login.html?lanjut=' + encodeURIComponent('n.html?id=' + id); return; }
    const alasan = prompt(t('pc.alasan'));
    if (!alasan || !alasan.trim()) return;
    const { error: e } = await db.from('reports').insert({ reporter_id: s.user.id, post_id: id, alasan: alasan.trim().slice(0, 300) });
    if (e) alert(e.code === '23505' ? t('pc.sudahLapor') : t('pc.gagalLapor', { pesan: galatRamah(e) }));
    else alert(t('pc.terkirim'));
  };
})();

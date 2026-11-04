// Profil untuk TAMU (profil-publik.html, juga alamat jurkon.my.id/@username).
// - Sudah masuk: langsung ke profil.html?u=... (aplikasi anggota, tidak berubah).
// - Tamu + pemilik menyalakan "Profil publik" (sql/045): kartu profil + catatan yang dijadikan publik + ajakan bergabung.
// - Tamu + profil privat / username tidak ada / gangguan: SATU tampilan yang sama, berupa ajakan bergabung (bukan galat 404).
//   Tamu tidak bisa membedakan "privat" dan "tidak ada", jadi daftar pengguna tidak bisa ditebak.
// Hanya memanggil profil_publik_info dan profil_publik_catatan; tabel tetap tertutup untuk anon.
(async function () {
  const atas = $('#atas'), daftar = $('#daftar'), ajak = $('#ajak');
  // Alamat /@username (dilayani Worker, tanpa ?u=) atau profil-publik.html?u=username (dari 404.html)
  const dariAlamat = (/^\/@([A-Za-z0-9_]{3,20})\/?$/.exec(location.pathname) || [])[1];
  const mentah = String(param('u') || dariAlamat || '').toLowerCase().replace(/^@/, '');
  const u = /^[a-z0-9_]{3,20}$/.test(mentah) ? mentah : '';
  const HALAMAN = 20;

  async function sesi() { try { return (await db.auth.getSession()).data.session; } catch (e) { return null; } }
  if (await sesi()) { location.replace(u ? 'profil?u=' + u : '/'); return; }

  function setMeta(sel, atr, nilai) { const el = document.querySelector(sel); if (el) el.setAttribute(atr, nilai); }
  function potong(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
  function rapikan() { try { if (u && location.pathname !== '/@' + u) history.replaceState(null, '', '/@' + u); } catch (e) {} }
  const urlLogin = () => 'login' + (u ? '?lanjut=' + encodeURIComponent('profil?u=' + u) : '');

  function avatarTamu(nama, foto, ukuran) {
    let h = 0;
    for (const c of nama) h = (h * 31 + c.charCodeAt(0)) % 360;
    const gambar = foto && !/^[a-z]+:/i.test(foto)
      ? '<img src="' + esc(SUPABASE_URL + '/storage/v1/object/public/avatar/' + String(foto).split('/').map(encodeURIComponent).join('/')) + '" alt="" decoding="async">' : '';
    return '<span class="avatar" style="width:' + ukuran + 'px;height:' + ukuran + 'px;font-size:' + Math.round(ukuran * 0.42) + 'px;background:hsl(' + h + ' 50% 42%)">' +
      esc(Array.from(nama)[0].toUpperCase()) + gambar + '</span>';
  }

  // Tampilan untuk profil privat / tidak ada / gangguan: ajakan, bukan galat.
  function tampilAjakan() {
    rapikan();
    const judul = u ? t('pp.privatJudul', { u: u }) : t('pp.judulUmum');
    document.title = judul + ' · Jurkon';
    atas.innerHTML = '<div class="profil-atas pp-ajakan"><h2>' + esc(judul) + '</h2>' +
      '<p class="bio">' + esc(t('pp.privatIsi')) + '</p>' +
      '<div class="tombol"><a class="btn utama" href="daftar">' + esc(t('pp.gabung')) + '</a>' +
      '<a class="btn garis" href="' + esc(urlLogin()) + '">' + esc(t('pp.masuk')) + '</a></div>' +
      '<p class="hint-pesan">' + esc(t('pp.tentang')) + '</p>' +
      '<p class="jl-tentang"><a href="jelajahi">' + esc(t('jl.judul')) + '</a></p></div>';
    daftar.innerHTML = '';
    ajak.hidden = true;
  }

  function kartuCatatan(c, d, nama) {
    const tgl = new Date(c.publik_pada).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'long', year: 'numeric' });
    return '<article class="post" data-id="' + esc(c.id) + '"><span class="ava">' + avatarTamu(nama, d.foto, 42) + '</span>' +
      '<div class="badan"><span class="nama">' + esc(nama) + '</span> <span class="user">@' + esc(d.username) + '</span> ' +
      '<a class="waktu" href="n?id=' + esc(c.id) + '">' + esc(tgl) + '</a>' +
      '<div class="isi">' + esc(c.content) + '</div>' +
      '<div class="aksi"><span class="btn-suka" aria-hidden="true">' + (typeof IK !== 'undefined' ? IK.suka : '♥') + '<span>' + Number(c.jumlah_suka || 0) + '</span></span></div></div></article>';
  }

  async function tampilProfil(d) {
    rapikan();
    const nama = d.nama || d.username;
    const judul = t('pf.bagikanJudul', { nama: nama, u: d.username });
    const desk = potong(d.bio || t('pp.tentang'), 155);
    document.title = judul;
    setMeta('meta[name="description"]', 'content', desk);
    setMeta('meta[property="og:title"]', 'content', judul);
    setMeta('meta[property="og:description"]', 'content', desk);
    setMeta('meta[property="og:url"]', 'content', 'https://jurkon.my.id/@' + d.username);

    const gabung = d.bergabung ? new Date(d.bergabung).toLocaleDateString(I18n.locale, { month: 'short', year: 'numeric' }) : '';
    atas.innerHTML = '<div class="profil-atas"><div class="kartu-kepala">' + avatarTamu(nama, d.foto, 88) +
      '<div class="profil-nama"><h2>' + esc(nama) + '</h2><div class="profil-user">@' + esc(d.username) + '</div></div></div>' +
      (d.bio ? '<div class="bio">' + esc(d.bio) + '</div>' : '') +
      '<div class="stat"><div class="stat-item"><b>' + Number(d.jumlah_catatan || 0) + '</b><span>' + esc(t('pp.catatan')) + '</span></div>' +
      '<div class="stat-item"><b>' + Number(d.pengikut || 0) + '</b><span>' + esc(t('pf.pengikut')) + '</span></div></div>' +
      (gabung ? '<p class="hitung">' + esc(t('pf.menulisSejak', { tgl: gabung })) + '</p>' : '') + '</div>';

    ajak.innerHTML = '<p>' + esc(t('pp.ajakIkuti', { nama: nama })) + '</p>' +
      '<a class="btn" id="btnGabung" href="daftar">' + esc(t('pp.gabung')) + '</a>' +
      '<p class="jl-tentang"><a href="' + esc(urlLogin()) + '">' + esc(t('pp.masuk')) + '</a></p>';
    ajak.hidden = false;
    // Pendaftar baru lewat profil ini ditawari mengikuti pemilik profil (js/selamat.js), tanpa dipaksa.
    $('#btnGabung').addEventListener('click', () => {
      try { localStorage.setItem('undang', JSON.stringify({ u: d.username, t: Date.now() })); } catch (e) {}
    });

    daftar.innerHTML = '<h3 class="bagian-judul">' + esc(t('pp.catatan')) + '</h3><div id="isiCatatan"></div><div class="pub-lapor" id="lagiWadah" hidden><button type="button" class="btn garis" id="lagi">' + esc(t('pp.lagi')) + '</button></div>';
    const isi = $('#isiCatatan'), wadah = $('#lagiWadah'), tombol = $('#lagi');
    let sebelum = null, sibuk = false, ada = 0;

    async function muat() {
      if (sibuk) return;
      sibuk = true; tombol.disabled = true;
      const { data, error } = await db.rpc('profil_publik_catatan', { p_username: d.username, p_limit: HALAMAN, p_sebelum: sebelum });
      sibuk = false; tombol.disabled = false;
      if (error) {
        const pesan = '<div class="kosong"><p>' + esc(galatRamah(error)) + '</p></div>';
        if (!ada) isi.innerHTML = pesan; else isi.insertAdjacentHTML('beforeend', pesan);
        wadah.hidden = !ada;
        return;
      }
      const baris = data || [];
      if (baris.length) {
        ada += baris.length;
        isi.insertAdjacentHTML('beforeend', baris.map(c => kartuCatatan(c, d, nama)).join(''));
        sebelum = baris[baris.length - 1].publik_pada;
      }
      if (!ada) isi.innerHTML = '<div class="kosong"><p>' + esc(t('pp.kosong')) + '</p></div>';
      wadah.hidden = baris.length < HALAMAN;
    }
    tombol.onclick = muat;
    muat();
  }

  if (!u) return tampilAjakan();
  const { data, error } = await db.rpc('profil_publik_info', { p_username: u });
  if (error) console.warn('[profil-publik]', error.code || '', error.message || '');
  const d = !error && data && data[0];
  if (!d) return tampilAjakan();
  tampilProfil(d);
})();

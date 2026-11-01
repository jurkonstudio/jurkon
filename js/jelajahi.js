// Halaman Jelajahi PUBLIK (jelajahi.html). Bisa dibuka tanpa login, boleh diindeks Google.
// Hanya memanggil jelajahi_publik() (sql/035): catatan yang penulisnya centang sendiri "tampil di Jelajahi".
// Tabel posts tetap tertutup untuk anon. Isi hanya di-escape; tidak ada tautan @ atau # otomatis.
// Berbeda dari explore.html (di dalam aplikasi, butuh login, noindex): halaman ini sengaja terpisah.
(async function () {
  const daftar = $('#daftar'), kaki = $('#kaki'), ajak = $('#ajak');
  const HALAMAN = 20;
  let kursor = null, habis = false, memuat = false;
  if (window.catatCorong) catatCorong('jelajahi');

  async function sesi() { try { return (await db.auth.getSession()).data.session; } catch (e) { return null; } }
  const masuk = !!(await sesi());

  function kartu(c) {
    const nama = c.nama || c.username;
    let h = 0;
    for (const ch of nama) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const awal = Array.from(nama)[0].toUpperCase();
    const tgl = new Date(c.publik_pada).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return '<article class="post jl-kartu" role="listitem" data-id="' + esc(c.id) + '">' +
      '<span class="ava"><span class="avatar" style="width:42px;height:42px;font-size:18px;background:hsl(' + h + ' 50% 42%)">' + esc(awal) + '</span></span>' +
      '<div class="badan"><span class="nama">' + esc(nama) + '</span> <span class="user">@' + esc(c.username) + '</span> <span class="waktu">' + esc(tgl) + '</span>' +
      '<a class="jl-isi" href="n.html?id=' + esc(c.id) + '"><div class="isi">' + esc(c.content) + '</div></a>' +
      '<div class="aksi"><span class="btn-suka" aria-hidden="true">' + (typeof IK !== 'undefined' ? IK.suka : '♥') + '<span>' + Number(c.jumlah_suka || 0) + '</span></span></div></div></article>';
  }

  function ajakan() {
    ajak.innerHTML = '<p>' + esc(t('pub.ajak')) + '</p><a class="btn" id="jlGabung" href="' + (masuk ? 'index.html' : 'login.html') + '">' + esc(masuk ? t('pub.buka') : t('pub.gabung')) + '</a>';
    ajak.hidden = false;
    const a = $('#jlGabung');
    if (a && !masuk) a.addEventListener('click', () => { if (window.catatCorong) catatCorong('landing_mulai'); });
  }

  async function muat() {
    if (memuat || habis) return;
    memuat = true;
    kaki.hidden = true;
    const { data, error } = await db.rpc('jelajahi_publik', { p_limit: HALAMAN, p_sebelum: kursor });
    memuat = false;
    if (error) {
      // Migrasi 035 belum jalan atau jaringan gagal: tampilkan galat ramah + coba lagi, bukan halaman rusak
      if (!daftar.children.length) {
        daftar.innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(galatRamah(error)) + '</p><button class="btn" id="coba" type="button">' + esc(t('umum.cobaLagi')) + '</button></div>';
        $('#coba').onclick = () => { daftar.innerHTML = ''; muat(); };
      }
      return;
    }
    const baris = data || [];
    if (baris.length) {
      daftar.insertAdjacentHTML('beforeend', baris.map(kartu).join(''));
      kursor = baris[baris.length - 1].publik_pada;
    }
    if (baris.length < HALAMAN) habis = true;
    if (!daftar.children.length) {
      daftar.innerHTML = '<div class="kosong"><p>' + esc(t('jl.kosong')) + '</p></div>';
    } else if (habis) {
      kaki.innerHTML = '<p class="jl-ujung">' + esc(t('jl.ujung')) + '</p>';
      kaki.hidden = false;
    } else {
      kaki.innerHTML = '<button class="btn garis" id="lagi" type="button">' + esc(t('jl.lagi')) + '</button>';
      kaki.hidden = false;
      $('#lagi').onclick = muat;
    }
  }

  // Membaca satu catatan dari sini dicatat sekali (angka saja)
  daftar.addEventListener('click', e => { if (e.target.closest('.jl-isi') && window.catatCorong) catatCorong('jelajahi_baca'); });

  ajakan();
  await muat();
})();

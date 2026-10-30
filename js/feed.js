// Beranda dengan dua feed: Publik (semua orang) dan Mengikuti (diri sendiri + akun yang diikuti).
// Pilihan tab diingat di perangkat.
let saya = null, daf = null, feedAktif = 'publik';
const KUNCI_FEED = 'feedAktif';

function bacaFeed() { try { return localStorage.getItem(KUNCI_FEED) === 'ikuti' ? 'ikuti' : 'publik'; } catch (e) { return 'publik'; } }
function simpanFeed(f) { try { localStorage.setItem(KUNCI_FEED, f); } catch (e) {} }

function kosongFeed(f) {
  return f === 'ikuti'
    ? kosong('pena', 'Belum ada kiriman dari yang kamu ikuti', 'Ikuti beberapa orang lewat Jelajah, atau lihat dulu apa yang sedang ditulis di feed Publik.', 'explore.html', 'Cari orang')
    : kosong('pena', 'Beranda masih sepi', 'Tulis catatan pertamamu, atau temukan orang untuk diikuti lewat Jelajah.', 'post.html', 'Tulis sekarang');
}

function muat() { return daf && daf.muat(); }

function pilihFeed(f, fokus) {
  feedAktif = f;
  simpanFeed(f);
  document.querySelectorAll('.tab-feed [data-feed]').forEach(b => {
    const aktif = b.dataset.feed === f;
    b.setAttribute('aria-selected', aktif);
    b.tabIndex = aktif ? 0 : -1;
    if (aktif) {
      $('#daftar').setAttribute('aria-labelledby', b.id);
      if (fokus) b.focus();
    }
  });
  if (daf) daf.hentikan();            // batalkan permintaan feed sebelumnya
  const el = $('#daftar');
  el.innerHTML = '';                  // buang pendengar lama bersama isinya agar tidak dobel
  const baru = el.cloneNode(false);
  el.replaceWith(baru);
  daf = daftarBerhalaman(baru, sebelum => ambilPosting({ mode: f === 'ikuti' ? 'ikuti' : 'semua', sebelum }, saya),
    () => kosongFeed(f), saya, { cache: 'feed-' + f });
  daf.muat();
  window.scrollTo({ top: 0 });
}

(async () => {
  saya = await wajibLogin();
  if (!saya) return;
  pasangAksiPost(saya, muat);
  const tab = document.querySelector('.tab-feed');
  tab.addEventListener('click', e => {
    const b = e.target.closest('[data-feed]');
    if (b && b.dataset.feed !== feedAktif) pilihFeed(b.dataset.feed);
  });
  tab.addEventListener('keydown', e => {      // panah kiri/kanan berpindah tab
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    pilihFeed(feedAktif === 'publik' ? 'ikuti' : 'publik', true);
  });
  pilihFeed(bacaFeed());
})();

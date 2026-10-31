// Service worker Jurkon.
// Strategi: semua berkas statis disimpan SEKALIGUS per versi (CACHE) lalu dilayani dari cache lebih dulu,
// tanpa menunggu jaringan. HTML, JS, dan CSS selalu berasal dari versi yang sama, jadi tidak pernah campur lama-baru.
// Versi baru terpasang di belakang layar saat sw.js berubah.
// JANGAN edit angka CACHE secara manual: jalankan  node tools/naikkan-cache.js  sebelum unggah.
const CACHE = 'jurkon-252deb79';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

// Hanya yang dipakai hampir setiap kunjungan. Bahasa lain, tema Kaca/Awan, admin, dan landing disimpan
// otomatis saat pertama dipakai, jadi pemasangan pertama lebih ringan.
const STATIS = ['/css/style.css', '/manifest.json', '/assets/logo-header.webp', '/assets/logo-header-gelap.webp',
  '/js/bahasa-muat.js', '/js/bahasa/id.js', '/js/bahasa/en.js', '/js/i18n.js', '/js/tema.js', '/js/config.js', '/js/supabase.js', '/js/ui.js', '/js/data.js',
  '/js/filter-data.js', '/js/filter.js', '/js/notif.js', '/js/notifikasi.js', '/js/nav.js', '/js/feed.js', '/js/post.js', '/js/mention.js', '/js/tulis.js',
  '/js/detail.js', '/js/explore.js', '/js/profil.js', '/js/akun.js', '/js/pesan.js', '/js/chat.js', '/js/keamanan.js', '/js/kontak.js', '/js/auth.js',
  '/js/reset.js', '/js/selamat.js',
  '/index.html', '/login.html', '/explore.html', '/notifikasi.html', '/pesan.html', '/profil.html', '/post.html', '/detail.html', '/chat.html'];

const WAKTU_JARINGAN = 10000;     // berkas yang belum ada di cache: tunggu jaringan paling lama segini
const BISA_DISIMPAN = /\.(js|css|html|json|png|jpe?g|webp|svg|woff2?)$/;

function ambil(r, ms) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  return fetch(r, { signal: ac.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const hasil = await Promise.allSettled(STATIS.map(u => c.add(new Request(u, { cache: 'reload' }))));
    // Pustaka Supabase: sifatnya cadangan, kegagalannya tidak membatalkan pemasangan
    await c.add(new Request(LIB, { cache: 'reload', mode: 'cors', credentials: 'omit' })).catch(() => {});
    // Ada berkas sendiri yang gagal diunduh -> batalkan. Versi lama tetap aktif dan pemasangan dicoba lagi nanti,
    // supaya tidak pernah ada versi setengah jadi yang bercampur.
    if (hasil.some(h => h.status === 'rejected')) throw new Error('Pemasangan cache belum lengkap');
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function dariCache(e, r, u) {
  const c = await caches.open(CACHE);
  const navigasi = r.mode === 'navigate';
  // "/" dan "/?x=y" memakai halaman beranda yang sudah tersimpan; halaman lain dicocokkan tanpa query (detail.html?id=...)
  const kunci = navigasi ? (u.pathname === '/' ? '/index.html' : u.pathname) : r;
  const ada = await c.match(kunci, { ignoreSearch: navigasi });
  if (ada) return ada;
  try {
    const res = await ambil(r, WAKTU_JARINGAN);
    if (res.ok && res.status === 200 && res.type === 'basic' && (navigasi || BISA_DISIMPAN.test(u.pathname))) {
      const salin = res.clone();
      e.waitUntil(c.put(navigasi ? u.origin + u.pathname : r, salin).catch(() => {}));
    }
    return res;
  } catch (err) {
    // Tanpa sinyal dan belum tersimpan: untuk halaman, tampilkan beranda yang tersimpan daripada layar galat browser
    if (navigasi) { const awal = await c.match('/index.html'); if (awal) return awal; }
    return Response.error();
  }
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  // Pustaka Supabase (versi dikunci): langsung dari cache
  if (r.url === LIB) { e.respondWith(caches.match(r).then(h => h || fetch(r))); return; }
  // Permintaan lintas-asal lain (Supabase API, font, dll.) tidak disentuh
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname === '/sw.js') return;    // biar browser sendiri yang memeriksa pembaruan
  e.respondWith(dariCache(e, r, u));
});

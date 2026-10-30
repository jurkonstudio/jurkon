const CACHE = 'jurkon-v35';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const STATIS = ['/css/style.css', '/manifest.json', '/assets/logo-header.png', '/assets/logo-header-gelap.png',
  '/js/bahasa-muat.js', '/js/bahasa/id.js', '/js/bahasa/en.js', '/js/bahasa/ms.js', '/js/bahasa/jv.js', '/js/bahasa/su.js', '/js/bahasa/zh.js', '/js/bahasa/ja.js', '/js/i18n.js', '/js/tema.js', '/js/config.js', '/js/supabase.js', '/js/ui.js', '/js/data.js', '/js/filter-data.js', '/js/filter.js', '/js/notif.js', '/js/notifikasi.js', '/js/nav.js', '/js/feed.js', '/js/post.js', '/js/mention.js', '/js/tulis.js',
  '/js/detail.js', '/js/explore.js', '/js/profil.js', '/js/akun.js', '/js/pesan.js', '/js/chat.js',
  '/js/keamanan.js', '/js/kontak.js', '/js/auth.js', '/js/reset.js', '/js/selamat.js', '/js/admin.js', '/css/admin.css', '/css/landing.css', '/js/landing.js', '/landing.html', '/murthehelp/index.html',
  // Halaman utama ikut disimpan supaya tetap terbuka cepat di sinyal lemah
  '/index.html', '/explore.html', '/notifikasi.html', '/pesan.html', '/profil.html', '/post.html', '/detail.html', '/chat.html'];

// Jaringan dulu supaya selalu segar, tetapi bila lambat (> ms) langsung pakai salinan tersimpan.
// Jaringan tetap dilanjutkan di belakang dan memperbarui cache untuk kunjungan berikutnya.
const WAKTU_TUNGGU = 1500;
function jaringanDulu(e, r) {
  const jaringan = fetch(r, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const salin = res.clone(); caches.open(CACHE).then(c => c.put(r, salin)); }
    return res;
  });
  e.waitUntil(jaringan.catch(() => {}));
  const cadangan = () => caches.match(r, { ignoreSearch: r.mode === 'navigate' });
  return new Promise(selesai => {
    let beres = false;
    const timer = setTimeout(async () => {
      const h = await cadangan();
      if (h && !beres) { beres = true; selesai(h); }
    }, WAKTU_TUNGGU);
    jaringan.then(res => { if (!beres) { beres = true; clearTimeout(timer); selesai(res); } },
      async () => {
        clearTimeout(timer);
        if (beres) return;
        const h = await cadangan();
        beres = true; selesai(h || Response.error());
      });
  });
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.allSettled(STATIS.map(u => c.add(new Request(u, { cache: 'reload' }))).concat(
      [c.add(new Request(LIB, { cache: 'reload', mode: 'cors', credentials: 'omit' }))]))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  // Pustaka Supabase (versi dikunci): langsung dari cache, tanpa menunggu jaringan
  if (r.url === LIB) { e.respondWith(caches.match(r).then(h => h || fetch(r))); return; }
  // Permintaan lintas-asal lain (kecuali pustaka di atas) tidak disentuh: tidak pernah disimpan di cache
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  // Aset gambar/font/manifest: dari cache dulu, diperbarui diam-diam di belakang
  if (/\.(jpe?g|png|svg|json|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const lama = await c.match(r);
      const baru = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
        .catch(() => lama || Response.error());
      e.waitUntil(baru.catch(() => {}));
      return lama || baru;
    }));
    return;
  }
  // JS, CSS, dan halaman HTML: jaringan dulu (supaya HTML baru tidak bertemu skrip lama), cadangan dari cache bila lambat/offline
  e.respondWith(jaringanDulu(e, r));
});

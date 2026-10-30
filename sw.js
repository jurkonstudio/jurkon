const CACHE = 'jurkon-v7';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const STATIS = ['/css/style.css', '/manifest.json', '/assets/logo-header.jpg', '/assets/logo.jpg',
  '/js/tema.js', '/js/config.js', '/js/supabase.js', '/js/ui.js', '/js/data.js', '/js/nav.js', '/js/feed.js', '/js/post.js',
  '/js/detail.js', '/js/explore.js', '/js/profil.js', '/js/akun.js', '/js/pesan.js', '/js/chat.js',
  '/js/auth.js', '/js/selamat.js', '/js/admin.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.allSettled(STATIS.concat([LIB]).map(u => c.add(new Request(u, { cache: 'reload' }))))));
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
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  // File statis: tampil dari cache dulu, diperbarui diam-diam di belakang
  if (/\.(css|js|jpe?g|png|svg|json|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const lama = await c.match(r);
      const baru = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
        .catch(() => lama || Response.error());
      e.waitUntil(baru.catch(() => {}));
      return lama || baru;
    }));
    return;
  }
  // Halaman HTML: selalu coba jaringan dulu
  e.respondWith(fetch(r).catch(() => caches.match(r).then(h => h || Response.error())));
});

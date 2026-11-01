// Cloudflare Worker: pratinjau OG dinamis untuk catatan publik dan sitemap-nya.
// Kenapa perlu: situs Jurkon statis (GitHub Pages). Crawler WhatsApp/X/Facebook tidak menjalankan JavaScript,
// jadi tanpa ini semua tautan catatan tampil dengan judul generik. Worker membaca catatan lewat
// catatan_publik(id) (hanya data publik) dan menulis ulang <title>/meta di HTML n.html.
//
// Variabel (Worker > Settings > Variables): SUPABASE_URL, SUPABASE_ANON_KEY  (kunci anon/publishable, BUKAN service_role)
// Route (Worker > Settings > Triggers > Routes, bukan Custom Domain):
//   jurkon.my.id/n   jurkon.my.id/n.html   jurkon.my.id/detail.html   jurkon.my.id/sitemap-catatan.xml
// Opsional: ORIGIN (bawaan: host permintaan sendiri).

const SITUS = 'https://jurkon.my.id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function rpc(env, fn, body) {
  const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('rpc ' + fn + ' ' + r.status);
  return r.json();
}

function potong(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

async function halaman(env, url) {
  const id = (url.searchParams.get('id') || '').toLowerCase();
  const asal = await fetch((env.ORIGIN || url.origin) + '/n.html', { redirect: 'follow' });
  const kepala = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };

  let c = null;
  if (UUID.test(id)) {
    try {
      const d = await rpc(env, 'catatan_publik', { p_id: id });
      c = d && d[0];
    } catch (e) {
      // Gangguan sementara di database: jangan mengubah status indeks. 503 = "coba lagi nanti" bagi crawler.
      return new Response(asal.body, { status: 503, headers: Object.assign({ 'retry-after': '300' }, kepala) });
    }
  }
  // Tidak ada / sudah privat / dihapus / dilaporkan: 404 + noindex supaya Google menjatuhkannya dari hasil.
  if (!c) return new Response(asal.body, { status: 404, headers: Object.assign({ 'x-robots-tag': 'noindex' }, kepala) });

  const nama = c.nama || c.username;
  const judul = nama + ' (@' + c.username + ') di Jurkon: “' + potong(c.content, 70) + '”';
  const desk = potong(c.content, 155);
  const kanon = SITUS + '/n?id=' + c.id;
  const set = (atr, nilai) => ({ element(e) { e.setAttribute(atr, nilai); } });

  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(judul); } })
    .on('meta[name="description"]', set('content', desk))
    .on('meta[property="og:title"]', set('content', judul))
    .on('meta[property="og:description"]', set('content', desk))
    .on('meta[property="og:url"]', set('content', kanon))
    .on('meta[property="og:image:alt"]', set('content', judul))
    .on('meta[name="twitter:title"]', set('content', judul))
    .on('meta[name="twitter:description"]', set('content', desk))
    .on('link[rel="canonical"]', set('href', kanon))
    .on('head', { element(e) {
      const w = new Date(c.created_at);
      if (!isNaN(w)) e.append('<meta property="article:published_time" content="' + w.toISOString() + '">', { html: true });
    } })
    .transform(new Response(asal.body, { status: 200, headers: kepala }));
}

// Pratinjau untuk SEMUA catatan yang dibagikan (detail.html?id=...), lewat pratinjau_catatan (sql/036).
// Halaman aslinya tetap dilayani apa adanya (aplikasi anggota); hanya meta pratinjau yang ditulis ulang.
// Bila catatan tidak ada/tersembunyi atau fungsi belum dibuat, halaman tampil dengan pratinjau generik.
async function halamanDetail(env, url) {
  const id = (url.searchParams.get('id') || '').toLowerCase();
  const asal = await fetch((env.ORIGIN || url.origin) + '/detail.html', { redirect: 'follow' });
  const kepala = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  let c = null;
  if (UUID.test(id)) {
    try { const d = await rpc(env, 'pratinjau_catatan', { p_id: id }); c = d && d[0]; } catch (e) { c = null; }
  }
  if (!c) return new Response(asal.body, { status: asal.status, headers: kepala });
  const nama = c.nama || c.username;
  const judul = nama + ' (@' + c.username + ') di Jurkon: “' + potong(c.cuplikan, 70) + '”';
  const desk = potong(c.cuplikan, 155);
  const kanon = SITUS + '/detail.html?id=' + c.id;
  const set = (atr, nilai) => ({ element(e) { e.setAttribute(atr, nilai); } });
  return new HTMLRewriter()
    .on('meta[name="description"]', set('content', desk))
    .on('meta[property="og:title"]', set('content', judul))
    .on('meta[property="og:description"]', set('content', desk))
    .on('meta[property="og:url"]', set('content', kanon))
    .on('meta[property="og:image:alt"]', set('content', judul))
    .on('meta[name="twitter:title"]', set('content', judul))
    .on('meta[name="twitter:description"]', set('content', desk))
    .on('head', { element(e) {
      const w = new Date(c.created_at);
      if (!isNaN(w)) e.append('<meta property="article:published_time" content="' + w.toISOString() + '">', { html: true });
    } })
    .transform(new Response(asal.body, { status: 200, headers: kepala }));
}

async function sitemap(env) {
  const baris = await rpc(env, 'daftar_publik', { p_limit: 1000 });
  const isi = (baris || []).filter(x => UUID.test(x.id)).map(x =>
    '<url><loc>' + SITUS + '/n?id=' + x.id + '</loc><lastmod>' + String(x.diperbarui || '').slice(0, 10) + '</lastmod></url>').join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + isi + '</urlset>',
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/sitemap-catatan.xml') return await sitemap(env);
      if (url.pathname === '/n' || url.pathname === '/n.html') return await halaman(env, url);
      if (url.pathname === '/detail.html') return await halamanDetail(env, url);
    } catch (e) {
      return new Response('Layanan sementara tidak tersedia.', { status: 503, headers: { 'retry-after': '300' } });
    }
    return fetch(req);
  }
};

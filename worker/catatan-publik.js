// Cloudflare Worker: pratinjau OG dinamis untuk catatan publik dan sitemap-nya.
// Kenapa perlu: situs Jurkon statis (GitHub Pages). Crawler WhatsApp/X/Facebook tidak menjalankan JavaScript,
// jadi tanpa ini semua tautan catatan tampil dengan judul generik. Worker membaca catatan lewat
// catatan_publik(id) (hanya data publik) dan menulis ulang <title>/meta di HTML n.html.
//
// Variabel (Worker > Settings > Variables): SUPABASE_URL, SUPABASE_ANON_KEY  (kunci anon/publishable, BUKAN service_role)
// Route (Worker > Settings > Triggers > Routes, bukan Custom Domain):
//   jurkon.my.id/n   jurkon.my.id/n.html   jurkon.my.id/detail.html   jurkon.my.id/sitemap-catatan.xml   jurkon.my.id/sitemap-profil.xml
//   jurkon.my.id/@*   (pratinjau profil publik, butuh sql/045_profil_publik.sql)
// Opsional: ORIGIN (bawaan: host permintaan sendiri).

const SITUS = 'https://jurkon.my.id';
const USERNAME = /^[a-z0-9_]{3,20}$/;
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

// Pratinjau profil: jurkon.my.id/@username. Selalu HTTP 200 (tidak pernah 404): profil publik mendapat pratinjau
// berisi nama, bio, dan foto; profil privat, username yang tidak ada, dan gangguan database mendapat pratinjau
// generik + noindex, jadi pengunjung melihat ajakan bergabung dan penebak username tidak bisa membedakan "privat" dari "tidak ada".
// Halaman yang dilayani: profil-publik.html (js/profil-publik.js membaca username dari alamat).
async function halamanProfil(env, url, mentah) {
  const u = mentah.toLowerCase();
  const asal = await fetch((env.ORIGIN || url.origin) + '/profil-publik.html', { redirect: 'follow' });
  const kepala = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  let c = null;
  if (USERNAME.test(u)) {
    try { const d = await rpc(env, 'profil_publik_info', { p_username: u }); c = d && d[0]; } catch (e) { c = null; }
  }
  if (!c) return new Response(asal.body, { status: 200, headers: Object.assign({ 'x-robots-tag': 'noindex' }, kepala) });

  const nama = c.nama || c.username;
  const judul = nama + ' (@' + c.username + ') di Jurkon';
  const desk = potong(c.bio || 'Jurkon (Jurnal Koneksi): tempat menulis dan terhubung tanpa algoritma.', 155);
  const kanon = SITUS + '/@' + c.username;
  const foto = c.foto && !/^[a-z]+:/i.test(c.foto)
    ? env.SUPABASE_URL + '/storage/v1/object/public/avatar/' + String(c.foto).split('/').map(encodeURIComponent).join('/') : '';
  const set = (atr, nilai) => ({ element(e) { e.setAttribute(atr, nilai); } });
  let r = new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(judul); } })
    .on('meta[name="description"]', set('content', desk))
    .on('meta[property="og:title"]', set('content', judul))
    .on('meta[property="og:description"]', set('content', desk))
    .on('meta[property="og:url"]', set('content', kanon))
    .on('meta[name="twitter:title"]', set('content', judul))
    .on('meta[name="twitter:description"]', set('content', desk))
    .on('head', { element(e) {
      e.append('<meta property="profile:username" content="' + c.username.replace(/[^a-z0-9_]/g, '') + '">', { html: true });
      e.append('<meta property="og:image:alt" content="' + judul.replace(/[&<>"]/g, '') + '">', { html: true });
    } });
  if (foto) {
    // Foto profil berbentuk persegi: kartu kecil (summary) lebih rapi daripada kartu lebar
    r = r.on('meta[property="og:image"]', set('content', foto)).on('meta[name="twitter:card"]', set('content', 'summary'))
      .on('head', { element(e) { e.append('<meta name="twitter:image" content="' + foto.replace(/"/g, '%22') + '">', { html: true }); } });
  }
  return r.transform(new Response(asal.body, { status: 200, headers: kepala }));
}

async function sitemap(env) {
  const baris = await rpc(env, 'daftar_publik', { p_limit: 1000 });
  const isi = (baris || []).filter(x => UUID.test(x.id)).map(x =>
    '<url><loc>' + SITUS + '/n?id=' + x.id + '</loc><lastmod>' + String(x.diperbarui || '').slice(0, 10) + '</lastmod></url>').join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + isi + '</urlset>',
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

async function sitemapProfil(env) {
  // Profil yang pemiliknya menyalakan "profil publik" saja (lihat sql/046). Maks 5 x 1000 profil per sitemap.
  let semua = [];
  for (let i = 0; i < 5; i++) {
    const hal = await rpc(env, 'daftar_profil_publik', { p_limit: 1000, p_offset: i * 1000 });
    semua = semua.concat(hal || []);
    if (!hal || hal.length < 1000) break;
  }
  const isi = semua.filter(x => USERNAME.test(x.username || '')).map(x =>
    '<url><loc>' + SITUS + '/@' + x.username + '</loc>' +
    (x.diperbarui ? '<lastmod>' + String(x.diperbarui).slice(0, 10) + '</lastmod>' : '') + '</url>').join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + isi + '</urlset>',
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/sitemap-catatan.xml') return await sitemap(env);
      if (url.pathname === '/sitemap-profil.xml') return await sitemapProfil(env);
      if (url.pathname === '/n' || url.pathname === '/n.html') return await halaman(env, url);
      if (url.pathname === '/detail' || url.pathname === '/detail.html') return await halamanDetail(env, url);
      const pf = /^\/@([A-Za-z0-9_]{3,20})\/?$/.exec(url.pathname);
      if (pf) return await halamanProfil(env, url, pf[1]);
    } catch (e) {
      return new Response('Layanan sementara tidak tersedia.', { status: 503, headers: { 'retry-after': '300' } });
    }
    return fetch(req);
  }
};

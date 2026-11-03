// Uji asap (smoke test) di Chromium: membuka SEMUA halaman utama dengan Supabase tiruan (tanpa jaringan),
// pada beberapa tema dan lebar layar, lalu melaporkan galat JavaScript, berkas lokal 404, dan layar yang melebar ke samping.
//
// Pasang sekali (di Codespaces):   npm i --no-save playwright && npx playwright install chromium
// Jalankan:                        node tools/uji-browser.js            (lengkap: tamu + masuk, 4 tema, 3 lebar)
//                                  node tools/uji-browser.js --cepat    (hanya tema kertas, lebar 390 dan 1280)
//                                  node tools/uji-browser.js --halaman=profil.html,jurnal.html
// Keluar dengan kode 1 bila ada masalah. TIDAK menguji Supabase sungguhan (RLS, SQL, Edge Function): itu tetap uji manual.
// Yang diabaikan: ViewTransition dibatalkan saat halaman dialihkan ke login (tidak berbahaya).
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Pasang dulu: npm i --no-save playwright && npx playwright install chromium'); process.exit(2); }

const AKAR = path.join(__dirname, '..');
const arg = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const CEPAT = process.argv.includes('--cepat');
const TIRUAN = fs.readFileSync(path.join(__dirname, 'uji', 'fake-supabase.js'), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain' };
const TEMA = CEPAT ? ['kertas'] : ['kertas', 'gelap', 'kaca', 'awan'];
const LEBAR = CEPAT ? [390, 1280] : [320, 390, 1280];
const MODE = ['tamu', 'masuk'];
const SESI = { access_token: 'x', refresh_token: 'y', expires_at: 4102444800, user: { id: '11111111-1111-1111-1111-111111111111', email: 'uji@contoh.id', aud: 'authenticated' } };

let halaman = (arg('halaman') || '').split(',').filter(Boolean);
if (!halaman.length) halaman = fs.readdirSync(AKAR).filter(f => f.endsWith('.html') && f !== '404.html').concat(['en/index.html', 'ja/about.html']).sort();

function lihat(q, r) {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = path.join(AKAR, p), kode = 200;
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { f = path.join(AKAR, '404.html'); kode = 404; }
  let b = fs.readFileSync(f);
  if (f.endsWith('.html')) b = Buffer.from(b.toString().replace(/ integrity="[^"]*" crossorigin="anonymous"/g, ''));   // SRI menolak pustaka tiruan
  r.writeHead(kode, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b);
}

http.createServer(lihat).listen(0, async function () {
  const dasar = 'http://localhost:' + this.address().port;
  const br = await chromium.launch();
  const masalah = []; let n = 0;
  for (const mode of MODE) for (const tema of TEMA) for (const lebar of LEBAR) for (const h of halaman) {
    const ctx = await br.newContext({ viewport: { width: lebar, height: 800 }, serviceWorkers: 'block' });
    const pg = await ctx.newPage(); const galat = [];
    pg.on('pageerror', e => { if (!/ViewTransition/.test(e.message)) galat.push('JS: ' + e.message.split('\n')[0]); });
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|ViewTransition/.test(m.text())) galat.push('konsol: ' + m.text().slice(0, 120)); });
    pg.on('response', r => { if (r.status() >= 400 && r.url().startsWith(dasar) && !/favicon/.test(r.url())) galat.push(r.status() + ' ' + r.url().replace(dasar, '')); });
    await pg.route('**/*', rt => {
      const u = rt.request().url();
      if (u.startsWith(dasar)) return rt.continue();
      if (/jsdelivr.*supabase\.js/.test(u)) return rt.fulfill({ contentType: 'text/javascript', body: TIRUAN });
      return rt.abort();
    });
    await pg.addInitScript(([t, s]) => { try { localStorage.setItem('tema', t); localStorage.setItem('bahasa', 'id'); } catch (e) {} if (s) window.__SESI__ = s; }, [tema, mode === 'masuk' ? SESI : null]);
    try { await pg.goto(dasar + '/' + h, { waitUntil: 'load', timeout: 15000 }); await pg.waitForTimeout(350); }
    catch (e) { galat.push('NAV: ' + e.message.split('\n')[0]); }
    const lebihan = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0);
    if (lebihan > 1) galat.push('layar melebar ke samping ' + lebihan + 'px');
    n++; if (galat.length) masalah.push({ mode, tema, lebar, h, galat: [...new Set(galat)] });
    await ctx.close();
  }
  await br.close();
  console.log('Diperiksa: ' + n + ' pemuatan (' + halaman.length + ' halaman, ' + MODE.length + ' mode, ' + TEMA.length + ' tema, ' + LEBAR.length + ' lebar).');
  if (!masalah.length) console.log('Tidak ada masalah.');
  else { console.log('Bermasalah: ' + masalah.length); masalah.slice(0, 60).forEach(x => console.log(' - ' + x.h + ' [' + x.mode + ', ' + x.tema + ', ' + x.lebar + 'px] ' + x.galat.join(' ; '))); }
  process.exit(masalah.length ? 1 : 0);
});

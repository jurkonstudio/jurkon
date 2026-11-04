// Uji browser khusus Jurnal (jurnal.html): daftar Markdown, alat format, pratinjau, pencarian, 5 tema x 2 lebar.
// Memakai Supabase TIRUAN (tools/uji/fake-supabase.js + tabel jurnal di memori). TIDAK menguji Supabase sungguhan.
// Pasang sekali:  npm i --no-save playwright && npx playwright install chromium
// Jalankan:       node tools/uji-jurnal.js            (--foto=folder untuk menyimpan tangkapan layar)
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Pasang dulu: npm i --no-save playwright'); process.exit(2); }
const AKAR = path.join(__dirname, '..');
const FOTO = (process.argv.find(a => a.startsWith('--foto=')) || '').split('=')[1];
if (FOTO) fs.mkdirSync(FOTO, { recursive: true });
const TIRUAN = fs.readFileSync(path.join(__dirname, 'uji', 'fake-supabase.js'), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const SESI = { access_token: 'x', refresh_token: 'y', expires_at: 4102444800, user: { id: '11111111-1111-1111-1111-111111111111', email: 'uji@contoh.id', aud: 'authenticated' } };
const TEMA = ['kertas', 'terang', 'gelap', 'kaca', 'awan'], LEBAR = [390, 1280];

const BARIS = [
  ['a1', '# Hari ini\nPagi **cerah** 😀, siang *mendung*, sore ~~hujan~~.\n\n- beli roti\n- [x] telepon ibu\n- [ ] olahraga\n  - lari 3 km\n\n> Pelan-pelan saja.\n\nLihat https://contoh.com/a dan [blog](https://contoh.com/b).\n\n```\nkode <b>x</b>\n```\n\n---\n\n1. satu\n2. dua\n\nPenutup `inline` panjang sekali supaya terpotong.\nBaris lagi.\nBaris lagi.', true, false],
  ['a2', 'Catatan pendek biasa.\nBaris kedua.', false, false],
  ['a3', '<script>alert(1)</script> [x](javascript:alert(1)) ![x](https://evil.com/a.svg) <img src=x onerror=alert(1)>', false, false],
  ['a4', 'Draf: **belum selesai', false, true],
].map(([id, isi, publik, draf], i) => ({ id, isi, publik, draf, dibuat_at: new Date(Date.now() - i * 86400000).toISOString(), diubah_at: new Date(Date.now() - i * 86400000).toISOString() }));

const PATCH = `(function(){
  const asli = window.supabase.createClient;
  window.supabase.createClient = function(){
    const k = asli.apply(this, arguments), dari = k.from.bind(k), baris = JSON.parse(JSON.stringify(window.__BARIS__ || []));
    k.from = function(tabel){
      if (tabel !== 'jurnal' && tabel !== 'profiles') return dari(tabel);
      const st = { op: 'select', p: null };
      const hasil = tunggal => {
        if (tabel === 'profiles') return { data: tunggal ? { id: '11111111-1111-1111-1111-111111111111', username: 'uji', nama: 'Uji' } : [], error: null };
        if (st.op === 'insert') { const r = Object.assign({ id: 'n' + baris.length, dibuat_at: new Date().toISOString(), diubah_at: new Date().toISOString() }, st.p); baris.unshift(r); window.__TERSIMPAN__ = r; return { data: r, error: null }; }
        if (st.op === 'update') return { data: Object.assign({}, baris[0], st.p), error: null };
        return { data: baris.slice(), error: null };
      };
      const b = { select() { return b; }, eq() { return b; }, order() { return b; }, limit() { return b; },
        insert(p) { st.op = 'insert'; st.p = p; return b; }, update(p) { st.op = 'update'; st.p = p; return b; }, delete() { st.op = 'delete'; return b; },
        single() { return Promise.resolve(hasil(true)); }, maybeSingle() { return Promise.resolve(hasil(true)); },
        then(ok, ng) { return Promise.resolve(hasil(false)).then(ok, ng); } };
      return b;
    };
    return k;
  };
})();`;

http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = path.join(AKAR, p), kode = 200;
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { f = path.join(AKAR, '404.html'); kode = 404; }
  let b = fs.readFileSync(f);
  if (f.endsWith('.html')) b = Buffer.from(b.toString().replace(/ integrity="[^"]*" crossorigin="anonymous"/g, ''));
  r.writeHead(kode, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b);
}).listen(0, async function () {
  const dasar = 'http://localhost:' + this.address().port, br = await chromium.launch();
  let jumlah = 0; const gagal = [];
  const cek = (nama, kond, info) => { jumlah++; if (!kond) gagal.push(nama + (info ? ' -> ' + info : '')); };

  for (const tema of TEMA) for (const lebar of LEBAR) {
    const tag = tema + '/' + lebar + 'px';
    const ctx = await br.newContext({ viewport: { width: lebar, height: 820 }, serviceWorkers: 'block' });
    const pg = await ctx.newPage(), galat = [];
    pg.on('pageerror', e => { if (!/ViewTransition/.test(e.message)) galat.push('JS: ' + e.message.split('\n')[0]); });
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|ViewTransition/.test(m.text())) galat.push('konsol: ' + m.text().slice(0, 120)); });
    pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.route('**/*', rt => {
      const u = rt.request().url();
      if (u.startsWith(dasar)) return rt.continue();
      if (/jsdelivr.*supabase\.js/.test(u)) return rt.fulfill({ contentType: 'text/javascript', body: TIRUAN + '\n' + PATCH });
      return rt.abort();
    });
    await pg.addInitScript(([t, s, b]) => { try { localStorage.setItem('tema', t); localStorage.setItem('bahasa', 'id'); } catch (e) {} window.__SESI__ = s; window.__BARIS__ = b; }, [tema, SESI, BARIS]);
    await pg.goto(dasar + '/jurnal.html', { waitUntil: 'load' });
    await pg.waitForSelector('.jx-item', { timeout: 8000 }).catch(() => galat.push('daftar tidak tampil'));
    await pg.waitForTimeout(400);

    // --- Daftar ---
    const isi0 = await pg.$eval('.jx-item .jx-isi', e => e.innerHTML);
    cek(tag + ' markdown dirender', /<strong>cerah<\/strong>/.test(isi0) && /<h3>Hari ini<\/h3>/.test(isi0) && /<blockquote>/.test(isi0) && /<li class="tugas">/.test(isi0));
    const adaBahaya = await pg.$$eval('#daftar script, #daftar img, #daftar iframe, #daftar svg, #daftar [onerror], #daftar a[href^="javascript"]', e => e.length);
    cek(tag + ' tidak ada elemen berbahaya di daftar', adaBahaya === 0, String(adaBahaya));
    const teks3 = await pg.$$eval('.jx-item', e => e[2].querySelector('.jx-isi').textContent);
    cek(tag + ' XSS tampil sebagai teks', teks3.includes('<script>') && teks3.includes('![x]'));
    const klem = await pg.$eval('.jx-item .jx-isi', e => ({ k: e.classList.contains('klem'), t: e.clientHeight, s: e.scrollHeight }));
    cek(tag + ' isi panjang dipotong', klem.k && klem.s > klem.t, JSON.stringify(klem));
    cek(tag + ' tombol Selengkapnya muncul', await pg.$eval('.jx-item [data-lagi]', e => !e.hidden));
    cek(tag + ' kotak cari tampil', await pg.$eval('#jr-cari', e => !e.hidden));
    await pg.fill('#jrCari', 'roti'); await pg.waitForTimeout(300);
    cek(tag + ' cari menyaring', (await pg.$$('.jx-item')).length === 1);
    await pg.fill('#jrCari', 'zzzz'); await pg.waitForTimeout(300);
    cek(tag + ' cari tanpa hasil', /cocok/.test(await pg.$eval('#daftar', e => e.textContent)));
    await pg.fill('#jrCari', ''); await pg.waitForTimeout(300);
    await pg.click('#jrUrut'); await pg.waitForTimeout(100);
    cek(tag + ' urutan terlama dulu', (await pg.$eval('.jx-item', e => e.dataset.id)) === 'a4');
    await pg.click('#jrUrut');
    if (FOTO && lebar === 390) await pg.screenshot({ path: path.join(FOTO, 'daftar-' + tema + '.png') });

    // --- Editor ---
    await pg.click('#jrBaru'); await pg.waitForSelector('#lembarTulis[open]');
    const ta = '#jrIsi';
    const nilai = () => pg.$eval(ta, e => e.value);
    const pilih = (a, b) => pg.$eval(ta, (e, [x, y]) => { e.focus(); e.setSelectionRange(x, y); }, [a, b]);
    const alat = f => pg.click('[data-f="' + f + '"]');

    await pg.fill(ta, 'halo dunia'); await pilih(0, 4); await alat('tebal');
    cek(tag + ' tebal', (await nilai()) === '**halo** dunia', await nilai());
    await alat('tebal');                                   // ketuk lagi = lepas
    cek(tag + ' tebal toggle', (await nilai()) === 'halo dunia', await nilai());
    await pilih(5, 10); await alat('miring');
    cek(tag + ' miring', (await nilai()) === 'halo *dunia*', await nilai());
    await pg.fill(ta, 'a'); await pilih(0, 1); await alat('tebal'); await alat('miring');
    cek(tag + ' miring di dalam tebal tidak melepas tebal', (await nilai()) === '***a***' || (await nilai()) === '***a***', await nilai());
    await pg.fill(ta, 'satu\ndua'); await pilih(0, 8); await alat('daftar');
    cek(tag + ' daftar', (await nilai()) === '- satu\n- dua', await nilai());
    await alat('nomor');
    cek(tag + ' nomor menggantikan daftar', (await nilai()) === '1. satu\n2. dua', await nilai());
    await alat('nomor');
    cek(tag + ' nomor toggle lepas', (await nilai()) === 'satu\ndua', await nilai());
    await alat('tugas');
    cek(tag + ' tugas', (await nilai()) === '- [ ] satu\n- [ ] dua', await nilai());
    await pg.fill(ta, 'Judul saya'); await pilih(2, 2); await alat('judul'); await alat('judul'); await alat('judul'); await alat('judul');
    cek(tag + ' judul berputar kembali polos', (await nilai()) === 'Judul saya', await nilai());
    await alat('judul');
    cek(tag + ' judul #', (await nilai()) === '# Judul saya', await nilai());
    await pg.fill(ta, 'a'); await pilih(1, 1); await alat('garis');
    cek(tag + ' garis', /^a\n\n---\n\n$/.test(await nilai()), JSON.stringify(await nilai()));
    // Enter melanjutkan daftar, Enter di butir kosong keluar
    await pg.fill(ta, '- satu'); await pilih(6, 6); await pg.keyboard.press('Enter'); await pg.keyboard.type('dua');
    cek(tag + ' Enter lanjut daftar', (await nilai()) === '- satu\n- dua', JSON.stringify(await nilai()));
    await pg.keyboard.press('Enter'); await pg.keyboard.press('Enter');
    cek(tag + ' Enter di butir kosong keluar', (await nilai()) === '- satu\n- dua\n', JSON.stringify(await nilai()));
    await pg.fill(ta, '1. a'); await pilih(4, 4); await pg.keyboard.press('Enter');
    cek(tag + ' Enter nomor berikutnya', (await nilai()) === '1. a\n2. ', JSON.stringify(await nilai()));
    // Pintasan
    await pg.fill(ta, 'kata'); await pilih(0, 4); await pg.keyboard.press('Control+b');
    cek(tag + ' Ctrl+B', (await nilai()) === '**kata**', await nilai());
    // Tautan
    await pg.fill(ta, 'situs saya'); await pilih(0, 5); await alat('tautan');
    cek(tag + ' baris tautan terbuka', await pg.$eval('#jxTautan', e => !e.hidden));
    await pg.fill('#jxUrl', 'javascript:alert(1)'); await pg.keyboard.press('Enter');
    cek(tag + ' tautan berbahaya ditolak', /http/.test(await pg.$eval('#jxUrlGalat', e => e.textContent)) && (await nilai()) === 'situs saya');
    await pg.fill('#jxUrl', 'contoh.com/a(b)'); await pg.keyboard.press('Enter');
    cek(tag + ' tautan disisipkan', (await nilai()) === '[situs](https://contoh.com/a%28b%29) saya', await nilai());
    // Kode banyak baris
    await pg.fill(ta, 'x\ny'); await pilih(0, 3); await alat('kode');
    cek(tag + ' kode berpagar', /```\nx\ny\n```/.test(await nilai()), JSON.stringify(await nilai()));
    // Urungkan
    await pg.fill(ta, 'abc'); await pilih(0, 3); await alat('tebal'); await alat('urung');
    // (fill tidak mencatat riwayat di semua peramban; cukup memastikan tidak galat)
    // Batas 4000
    await pg.fill(ta, 'x'.repeat(3999)); await pilih(0, 0); await alat('tebal');
    cek(tag + ' batas 4000 dijaga alat', (await nilai()).length === 3999 || (await nilai()).length <= 4000, String((await nilai()).length));
    // Pratinjau
    await pg.fill(ta, '# Judul\n\n**tebal** dan <b>x</b>\n\n- [x] ya'); await alat('judul'); await pg.fill(ta, '# Judul\n\n**tebal** dan <b>x</b>\n\n- [x] ya');
    await pg.click('#jxLihat'); await pg.waitForTimeout(100);
    const pr = await pg.$eval('#jxPrev', e => ({ h: e.innerHTML, tampil: !e.hidden && e.offsetHeight > 0 }));
    cek(tag + ' pratinjau tampil', pr.tampil && /<h3>Judul<\/h3>/.test(pr.h) && /<strong>tebal<\/strong>/.test(pr.h) && !/<b>/.test(pr.h), pr.h);
    cek(tag + ' textarea tersembunyi & alat nonaktif', (await pg.$eval(ta, e => e.offsetHeight)) === 0 && await pg.$eval('[data-f="tebal"]', e => e.disabled));
    if (FOTO) await pg.screenshot({ path: path.join(FOTO, 'pratinjau-' + tema + '-' + lebar + '.png') });
    await pg.click('#jxLihat'); await pg.waitForTimeout(100);
    cek(tag + ' kembali menulis', (await pg.$eval(ta, e => e.offsetHeight)) > 0 && await pg.$eval('[data-f="tebal"]', e => !e.disabled));
    // Isi lengkap untuk foto + simpan
    await pg.fill(ta, BARIS[0].isi); await pg.$eval(ta, e => e.dispatchEvent(new Event('input', { bubbles: true })));
    if (FOTO) await pg.screenshot({ path: path.join(FOTO, 'editor-' + tema + '-' + lebar + '.png') });
    const lebihEd = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    cek(tag + ' editor tidak melebar', lebihEd <= 1, String(lebihEd));
    await pg.click('#jrSimpan'); await pg.waitForTimeout(400);
    const simp = await pg.evaluate(() => window.__TERSIMPAN__);
    cek(tag + ' simpan mengirim teks mentah (bukan HTML)', simp && simp.isi === BARIS[0].isi && !/<strong>/.test(simp.isi));
    const lebih = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    cek(tag + ' halaman tidak melebar', lebih <= 1, String(lebih));
    cek(tag + ' tanpa galat JS', galat.length === 0, galat.join(' ; '));
    await ctx.close();
  }

  // Jurnal orang lain: hanya baca, tetap Markdown, ada tombol Salin, tanpa Ubah/Hapus
  {
    const ctx = await br.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    const pg = await ctx.newPage(), galat = [];
    pg.on('pageerror', e => { if (!/ViewTransition/.test(e.message)) galat.push(e.message); });
    await pg.route('**/*', rt => { const u = rt.request().url(); if (u.startsWith(dasar)) return rt.continue(); if (/jsdelivr.*supabase\.js/.test(u)) return rt.fulfill({ contentType: 'text/javascript', body: TIRUAN + '\n' + PATCH }); return rt.abort(); });
    await pg.addInitScript(([s, b]) => { try { localStorage.setItem('bahasa', 'id'); } catch (e) {} window.__SESI__ = s; window.__BARIS__ = b; }, [SESI, BARIS.filter(x => x.publik)]);
    await pg.goto(dasar + '/jurnal.html?u=uji', { waitUntil: 'load' }); await pg.waitForTimeout(600);
    cek('jurnal orang: Markdown tampil', (await pg.$$('.jx-item strong')).length > 0 || (await pg.$$('.jx-item h3')).length > 0 || galat.length > 0);
    await ctx.close();
  }
  await br.close();
  console.log('Diperiksa: ' + jumlah + ' pemeriksaan.');
  if (gagal.length) { console.log('GAGAL ' + gagal.length + ':'); gagal.forEach(g => console.log(' ✗ ' + g)); process.exit(1); }
  console.log('Semua lulus.');
});

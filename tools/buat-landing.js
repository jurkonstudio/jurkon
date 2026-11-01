// Membuat landing page per bahasa dari satu template dan satu kamus.
// Jalankan:  node tools/buat-landing.js
// Menulis:   landing.html (Indonesia), en/index.html, ms/, jv/, su/, zh/, ja/, js/landing-teks.js, dan memperbarui sitemap.xml.
// Aman dijalankan ulang (hasil sama). Berhenti dengan galat bila ada kunci terjemahan yang hilang.
const fs = require('fs'), path = require('path');
const dasar = path.join(__dirname, '..');
const { BAHASA, HALAMAN, TERBIT, DINAMIS, T } = require('./landing-teks.js');
const HOST = 'https://jurkon.my.id';
const tpl = fs.readFileSync(path.join(__dirname, 'landing-templat.html'), 'utf8');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urlLengkap = k => k === 'id' ? HOST + '/landing.html' : HOST + '/' + k + '/';
const jalur = (k, dari) => k === 'id' ? (dari === 'id' ? 'landing.html' : '/landing.html') : '/' + k + '/';   // tautan ke landing bahasa k, dari halaman bahasa `dari`
const awalan = k => k === 'id' ? '' : '/';                                  // untuk berkas aset
const tautanHalaman = (k, h) => (k !== 'id' && TERBIT[h].includes(k)) ? '/' + k + '/' + HALAMAN[h].slug + '/' : awalan(k) + HALAMAN[h].id;

// Pemeriksaan kelengkapan kamus
const acuan = Object.keys(T.id);
for (const b of BAHASA) {
  const t = T[b.kode];
  if (!t) throw new Error('Blok terjemahan hilang: ' + b.kode);
  const hilang = acuan.filter(k => !String(t[k] == null ? '' : t[k]).trim());
  const lebih = Object.keys(t).filter(k => !(k in T.id));
  if (hilang.length || lebih.length) throw new Error(`[${b.kode}] hilang: ${hilang.join(',') || '-'}; kunci asing: ${lebih.join(',') || '-'}`);
}

const hreflang = BAHASA.map(b => `<link rel="alternate" hreflang="${b.hreflang}" href="${urlLengkap(b.kode)}">`).join('\n')
  + `\n<link rel="alternate" hreflang="x-default" href="${urlLengkap('en')}">`;

let tulis = 0;
const simpan = (rel, isi) => {
  const p = path.join(dasar, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== isi) { fs.writeFileSync(p, isi); tulis++; console.log('  tulis ' + rel); }
};

for (const b of BAHASA) {
  const k = b.kode, t = T[k], asli = k === 'id';
  const faq = [1, 2, 3, 4, 5].map(n => ({ '@type': 'Question', name: t['q' + n], acceptedAnswer: { '@type': 'Answer', text: t['a' + n] } }));
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': HOST + '/#situs', name: t.brand, alternateName: ['Jurkon', 'Jurnal Koneksi'], url: urlLengkap(k), inLanguage: b.hreflang, description: t.desc, publisher: { '@id': HOST + '/#org' } },
      { '@type': 'Organization', '@id': HOST + '/#org', name: 'Jurnal Koneksi', alternateName: 'Jurkon', url: HOST + '/', logo: HOST + '/assets/icons/icon-512.png' },
      { '@type': 'WebApplication', name: t.brand, url: urlLengkap(k), applicationCategory: 'SocialNetworkingApplication', operatingSystem: 'Any (web browser)', inLanguage: BAHASA.map(x => x.hreflang), description: t.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' } },
      { '@type': 'FAQPage', inLanguage: b.hreflang, mainEntity: faq }
    ]
  }).replace(/</g, '\\u003c');
  const v = Object.assign({}, t, {
    kode: k, htmlLang: b.htmlLang, ogLocale: b.ogLocale, r: awalan(k), url: urlLengkap(k), lnkSelf: jalur(k, k),
    lnkTentang: tautanHalaman(k, 'tentang'), lnkBantuan: tautanHalaman(k, 'bantuan'), lnkAturan: tautanHalaman(k, 'aturan'),
    lnkKetentuan: tautanHalaman(k, 'ketentuan'), lnkPrivasi: tautanHalaman(k, 'privasi'),
    hreflang, jsonld,
    ogAlt: BAHASA.filter(x => x.kode !== k).map(x => `<meta property="og:locale:alternate" content="${x.ogLocale}">`).join('\n'),
    // Teks bawaan dari panel admin (berbahasa Indonesia) hanya boleh menimpa halaman Indonesia
    isiBrand: asli ? ' data-isi="brand_nama"' : '', isiJudul: asli ? ' data-isi="hero_judul"' : '', isiSub: asli ? ' data-isi="hero_sub"' : '',
    bahasaNav: BAHASA.map(x => `<a href="${jalur(x.kode, k)}" lang="${x.htmlLang}" hreflang="${x.hreflang}"${x.kode === k ? ' aria-current="page"' : ''}>${esc(x.nama)}</a>`).join('')
  });
  const mentah = new Set(['hreflang', 'jsonld', 'ogAlt', 'isiBrand', 'isiJudul', 'isiSub', 'bahasaNav']);
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (m, kunci) => {
    if (!(kunci in v)) throw new Error(`Placeholder {{${kunci}}} tidak punya nilai (${k})`);
    return mentah.has(kunci) ? v[kunci] : esc(v[kunci]);
  });
  simpan(asli ? 'landing.html' : k + '/index.html', html);
}

// Teks dinamis untuk js/landing.js
const dinamis = {};
for (const b of BAHASA) {
  dinamis[b.kode] = { locale: b.locale, url: urlLengkap(b.kode) };
  DINAMIS.forEach(x => { dinamis[b.kode][x] = T[b.kode][x]; });
}
simpan('js/landing-teks.js', '// DIHASILKAN oleh tools/buat-landing.js dari tools/landing-teks.js. Jangan diedit langsung.\nvar LP_TEKS=' + JSON.stringify(dinamis) + ';\n');

// Sitemap: tiap versi bahasa mendaftar semua alternatifnya (termasuk dirinya sendiri) + x-default
const smPath = path.join(dasar, 'sitemap.xml');
const lama = fs.existsSync(smPath) ? fs.readFileSync(smPath, 'utf8') : '';
const blok = new Map();
for (const m of lama.matchAll(/<url>[\s\S]*?<\/url>/g)) { const loc = (m[0].match(/<loc>([^<]+)<\/loc>/) || [])[1]; if (loc) blok.set(loc, m[0]); }
const tgl = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // WIB
const alt = BAHASA.map(b => `<xhtml:link rel="alternate" hreflang="${b.hreflang}" href="${urlLengkap(b.kode)}"/>`).join('')
  + `<xhtml:link rel="alternate" hreflang="x-default" href="${urlLengkap('en')}"/>`;
for (const b of BAHASA) {
  const loc = urlLengkap(b.kode), ada = blok.get(loc);
  // Tanggal lama dipertahankan agar menjalankan skrip ulang tidak mengubah sitemap; hapus entri itu bila ingin lastmod diperbarui
  const lama_ = ada && ada.includes('xhtml:link') ? (ada.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] : null;
  const baru = `<url><loc>${loc}</loc><lastmod>${lama_ || tgl}</lastmod>${alt}</url>`;
  blok.set(loc, baru);
}
const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + [...blok.values()].join('\n') + '\n</urlset>\n';
simpan('sitemap.xml', sm);

console.log(tulis ? `Selesai: ${tulis} berkas diperbarui.` : 'Tidak ada perubahan.');

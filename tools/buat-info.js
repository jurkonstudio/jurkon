// Membuat halaman info statis per bahasa: /<kode>/about.html, privacy.html, rules.html, help.html, terms.html
// (kode = en, ms, jv, su, zh, ja). Isinya sudah ada di HTML (terbaca mesin pencari tanpa JavaScript).
// Jalankan:  node tools/buat-info.js
// Membaca:   js/info/<kode>.js (window.INFO_T), js/ketentuan-bahasa.js (Ketentuan), js/bahasa.js (label umum), tentang.html (CSP)
// Menulis:   <kode>/*.html, js/info-arah.js, dan blok hreflang di kelima halaman Indonesia (tentang.html dst.)
// Jangan edit hasilnya langsung. Aman dijalankan ulang. Berhenti dengan galat bila ada yang tidak lengkap.
// Mengatur bahasa yang ditunda: tools/info-config.js (TUNDA).
const fs = require('fs'), path = require('path'), vm = require('vm');
const dasar = path.join(__dirname, '..');
const { BAHASA, HALAMAN, AKTIF, TUNDA, alamat, X_DEFAULT } = require('./info-config.js');
const HOST = 'https://jurkon.my.id';
const baca = p => fs.readFileSync(path.join(dasar, p), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const galat = [];
let tulis = 0;
const simpan = (rel, isi) => {
  const p = path.join(dasar, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== isi) { fs.writeFileSync(p, isi); tulis++; console.log('  tulis ' + rel); }
};

// ---- Sumber teks ----------------------------------------------------------------------------------------
const NON_ID = AKTIF.filter(b => b.kode !== 'id');
const INFO = {};
for (const b of BAHASA.filter(b => b.kode !== 'id')) {
  const w = {}; vm.runInNewContext(baca('js/info/' + b.kode + '.js'), { window: w });
  if (!w.INFO_T) throw new Error('js/info/' + b.kode + '.js tidak mengisi window.INFO_T');
  INFO[b.kode] = w.INFO_T;
}
// Ketentuan layanan: objek D ada di dalam IIFE js/ketentuan-bahasa.js; diambil dari teks sumbernya (berkas itu tidak diubah)
const kt = baca('js/ketentuan-bahasa.js').match(/\n  var D = (\{[\s\S]*?\n  \});\n\n  var d = D\[kode\]/);
if (!kt) throw new Error('Struktur js/ketentuan-bahasa.js berubah: objek D tidak ditemukan. Perbarui pengurai di tools/buat-info.js.');
const KET = vm.runInNewContext('(' + kt[1] + ')');
// Label umum dari kamus aplikasi (satu sumber dengan teks di aplikasi)
const kamus = {}; vm.runInNewContext(baca('js/bahasa.js') + '\nthis.B = I18N_BAHASA; this.K = I18N_KAMUS;', kamus);
const kolom = kode => kamus.B.findIndex(b => b.kode === kode);
const label = (kunci, kode) => { const v = kamus.K[kunci] && kamus.K[kunci][kolom(kode)]; if (!v) throw new Error('Kamus tanpa ' + kunci + ' untuk ' + kode); return v; };
const CSP = (baca('tentang.html').match(/<meta http-equiv="Content-Security-Policy"[^>]*>/) || [])[0];
if (!CSP) throw new Error('CSP tidak ditemukan di tentang.html');

// Tautan antar-halaman info di dalam teks terjemahan: dari berkas Indonesia ke berkas bahasa yang sama
const PETA_TAUTAN = {}; for (const h of Object.values(HALAMAN)) PETA_TAUTAN[h.id] = h.slug + '.html';
const lokal = html => html.replace(/href="([a-z-]+\.html)"/g, (m, f) => PETA_TAUTAN[f] ? 'href="' + PETA_TAUTAN[f] + '"' : m);

const teksBersih = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function deskripsiKetentuan(d) {   // kalimat pertama pengantar, tanpa tag dan tanpa tanda {k}/{a}
  const t = teksBersih(d.intro.replace(/\{k\}/g, d.k).replace(/\{a\}/g, d.a));
  const m = t.match(/^[\s\S]*?[.。!?](?=\s|$)/);
  let s = m ? m[0] : t;
  if (s.length < 60 && m) { const n = t.slice(s.length).match(/^\s*[\s\S]*?[.。!?](?=\s|$)/); if (n) s += n[0]; }
  return s.trim();
}

// Isi satu halaman: { h1, desc, isi (HTML), hukum, catatan, nav, navAria }
function halaman(k, h) {
  if (h === 'ketentuan') {
    const d = KET[k]; if (!d) throw new Error('Ketentuan: bahasa ' + k + ' tidak ada');
    const tautan = (f, x) => '<a href="' + f + '">' + x + '</a>';
    const isi = s => s.replace(/\{k\}/g, tautan('privacy.html', d.k)).replace(/\{a\}/g, tautan('rules.html', d.a));
    let html = '<p class="tgl">' + d.tgl + '</p>\n<p>' + isi(d.intro) + '</p>\n';
    d.s.forEach(x => { html += '<h3>' + x[0] + '</h3>\n' + isi(x[1]) + '\n'; });
    return { h1: d.h1, desc: deskripsiKetentuan(d), isi: html, hukum: true, catatan: d.catatan, nav: d.nav, navAria: d.navAria };
  }
  const T = INFO[k], d = T[HALAMAN[h].info];
  if (!d) throw new Error('INFO_T.' + HALAMAN[h].info + ' tidak ada untuk ' + k);
  return { h1: d.h1, desc: d.desc, isi: lokal(d.html), hukum: !!d.hukum, catatan: T.catatan, nav: T.nav, navAria: T.navAria };
}

// ---- Blok umum -----------------------------------------------------------------------------------------
const hreflang = h => AKTIF.map(b => `<link rel="alternate" hreflang="${b.hl}" href="${HOST + alamat(b.kode, h)}">`).join('\n')
  + `\n<link rel="alternate" hreflang="x-default" href="${HOST + alamat(X_DEFAULT, h)}">`;

const URUT_NAV = ['privasi', 'ketentuan', 'aturan', 'bantuan', 'tentang'];   // sama dengan urutan INFO_T.nav

function buat(k, h) {
  const b = BAHASA.find(x => x.kode === k), p = halaman(k, h), slug = HALAMAN[h].slug;
  const url = HOST + alamat(k, h), landing = HOST + '/' + k + '/';
  if (!p.h1 || !p.desc || !p.isi.trim()) galat.push(`${k}/${slug}: judul, deskripsi, atau isi kosong`);
  if (!p.nav || p.nav.length !== 5) galat.push(`${k}/${slug}: nav harus 5 butir`);
  const ogJudul = p.h1 + ' · Jurnal Koneksi';
  const nav = URUT_NAV.map((x, i) => `<a href="${HALAMAN[x].slug}.html"${x === h ? ' aria-current="page"' : ''}>${p.nav[i]}</a>`).join(' · ')
    + ' · <a href="/' + k + '/">Jurnal Koneksi</a>';
  const bahasaNav = AKTIF.map(x => `<a href="${alamat(x.kode, h)}" lang="${x.htmlLang}" hreflang="${x.hl}" data-bhs="${x.kode}"${x.kode === k ? ' aria-current="page"' : ''}>${esc(x.nama)}</a>`).join(' ');
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': HOST + '/#situs', name: 'Jurnal Koneksi', alternateName: ['Jurkon'], url: landing, inLanguage: b.hl },
      { '@type': 'WebPage', '@id': url + '#halaman', url, name: ogJudul, description: p.desc, inLanguage: b.hl,
        isPartOf: { '@id': HOST + '/#situs' }, breadcrumb: { '@id': url + '#remah' } },
      { '@type': 'BreadcrumbList', '@id': url + '#remah', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Jurnal Koneksi', item: landing },
        { '@type': 'ListItem', position: 2, name: p.h1, item: url } ] }
    ]
  }).replace(/</g, '\\u003c');
  const ogAlt = AKTIF.filter(x => x.kode !== k).map(x => `<meta property="og:locale:alternate" content="${x.ogLocale}">`).join('\n');
  const catatan = p.hukum && p.catatan ? `<p class="dok-catatan">${p.catatan}</p>\n` : '';

  return `<!DOCTYPE html>
<html lang="${b.htmlLang}"><head><meta charset="utf-8">
${CSP}
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/js/keamanan.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#fbf9f4">
<link rel="manifest" href="/manifest.json">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<script src="/js/tema.js"></script>
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/dokumen.css">
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
${hreflang(h)}
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Jurnal Koneksi">
<meta property="og:locale" content="${b.ogLocale}">
${ogAlt}
<meta property="og:title" content="${esc(ogJudul)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${HOST}/assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogJudul)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<script type="application/ld+json">${jsonld}</script>
<title>${esc(ogJudul)}</title></head><body data-bahasa="${k}">
<main><div class="header"><a href="/${k}/" data-kembali>${label('detail.kembali', k)}</a><h1>${esc(p.h1)}</h1><span></span></div>
<div class="pad dokumen" data-info="${HALAMAN[h].info || 'ketentuan'}">
${p.isi.trim()}
${catatan}<nav class="dok-nav" aria-label="${esc(p.navAria)}">
${nav}
</nav>
</div>
<nav class="dok-bahasa-tautan" aria-label="${esc(label('bahasa.judul', k))}">${bahasaNav}</nav></main>
<script src="/js/config.js"></script>
<script src="/js/info-pilih.js"></script>
<script src="/js/kontak.js"></script>
</body></html>
`;
}

for (const b of NON_ID) for (const h of Object.keys(HALAMAN)) simpan(b.kode + '/' + HALAMAN[h].slug + '.html', buat(b.kode, h));

// ---- Pemeriksaan hasil -----------------------------------------------------------------------------------
for (const b of NON_ID) for (const h of Object.keys(HALAMAN)) {
  const rel = b.kode + '/' + HALAMAN[h].slug + '.html', s = baca(rel);
  if (/\{[ka]\}/.test(s)) galat.push(rel + ': masih ada placeholder {k}/{a}');
  for (const m of s.matchAll(/href="([^"]+)"/g)) if (PETA_TAUTAN[m[1]]) galat.push(`${rel}: tautan ke halaman Indonesia (${m[1]})`);
  if ((s.match(/<link rel="alternate" hreflang=/g) || []).length !== AKTIF.length + 1) galat.push(rel + ': jumlah hreflang tidak sesuai');
  if (/<script[^>]+(bahasa-muat|i18n|info-bahasa|info-muat)\.js/.test(s)) galat.push(rel + ': memuat skrip pengganti bahasa');
}

// ---- Halaman Indonesia: hreflang timbal balik + pengalihan -------------------------------------------------
const M1 = '<!-- hreflang-info:mulai -->', M2 = '<!-- hreflang-info:selesai -->';
for (const [h, x] of Object.entries(HALAMAN)) {
  let s = baca(x.id); const asal = s;
  const blok = M1 + '\n' + hreflang(h) + '\n' + M2;
  if (s.includes(M1)) s = s.replace(new RegExp(M1 + '[\\s\\S]*?' + M2), () => blok);
  else if (/<link rel="canonical"[^>]*>/.test(s)) s = s.replace(/(<link rel="canonical"[^>]*>)/, (m) => m + '\n' + blok);
  else galat.push(x.id + ': tanpa canonical, hreflang tidak bisa dipasang');
  if (!s.includes('js/info-arah.js')) {
    if (!s.includes('<script src="js/bahasa-muat.js"></script>')) galat.push(x.id + ': tanpa js/bahasa-muat.js');
    s = s.replace('<script src="js/bahasa-muat.js"></script>', '<script src="js/bahasa-muat.js"></script><script src="js/info-arah.js"></script>');
  }
  if (s !== asal) { fs.writeFileSync(path.join(dasar, x.id), s); tulis++; console.log('  tulis ' + x.id); }
}

// Pengalihan: pengguna dengan bahasa tampilan non-Indonesia yang membuka halaman Indonesia dikirim ke versi statisnya.
// Mesin pencari tetap melihat halaman Indonesia (js/bahasa-muat.js memaksa 'id' untuk bot), jadi tidak terkena.
const peta = {}; for (const x of Object.values(HALAMAN)) peta[x.id] = x.slug + '.html';
simpan('js/info-arah.js', `// DIHASILKAN oleh tools/buat-info.js. Jangan diedit langsung.
// Halaman info Indonesia (tentang.html, dst.) membuka versi statis bahasa pengguna (/en/about.html, dst.).
// Dimuat tepat setelah js/bahasa-muat.js (yang menetapkan window.I18N_KODE). replace() supaya tombol Kembali tidak terjebak.
(function () {
  var PETA = ${JSON.stringify(peta)};
  var ADA = ${JSON.stringify(NON_ID.map(b => b.kode))};
  var kode = window.I18N_KODE;
  var berkas = location.pathname.replace(/^.*\\//, '');
  if (!kode || kode === 'id' || ADA.indexOf(kode) < 0 || !PETA[berkas]) return;
  location.replace('/' + kode + '/' + PETA[berkas] + location.search + location.hash);
})();
`);

if (galat.length) { console.error('GAGAL:\n- ' + galat.join('\n- ')); process.exit(1); }
console.log(tulis ? `Selesai: ${tulis} berkas diperbarui.` : 'Tidak ada perubahan.' );
console.log(`Bahasa terbit: ${NON_ID.map(b => b.kode).join(', ')}${TUNDA.length ? ' (ditunda: ' + TUNDA.join(', ') + ')' : ''}.`);

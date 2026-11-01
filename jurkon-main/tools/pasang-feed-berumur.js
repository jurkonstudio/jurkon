// Memasang: (1) feed ada ujungnya + Ringkasan hari ini, (2) catatan berumur (hilang otomatis).
// Idempoten dan semua-atau-tidak-sama-sekali: bila titik sisip berubah, skrip berhenti SEBELUM menulis.
// Urutan: jalankan sql/023_catatan_berumur.sql di Supabase DULU, baru unggah kode ini.
// Pakai: node tools/pasang-feed-berumur.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const akar = path.join(__dirname, '..');

const LABEL = `// Label sisa waktu untuk catatan berumur ("Hilang dalam 3 jam")
function labelBerumur(iso) {
  const s = (new Date(iso) - Date.now()) / 1000;
  if (!(s > 0)) return '';
  if (s < 3600) return t('pc.hilangMenit', { n: Math.max(1, Math.round(s / 60)) });
  if (s < 86400) return t('pc.hilangJam', { n: Math.round(s / 3600) });
  return t('pc.hilangHari', { n: Math.round(s / 86400) });
}

`;

const FEED_FUNGSI = `// Penutup feed: tanda "sudah sampai ujung" supaya gulir tidak terasa tanpa akhir
function ujungFeed() {
  return '<div class="ujung-feed" role="status"><b>' + esc(t('feed.ujungJ')) + '</b><p>' + esc(t('feed.ujungT')) +
    '</p><a class="btn" href="explore.html">' + esc(t('feed.ujungTombol')) + '</a></div>';
}

// Ringkasan hari ini: catatan paling ramai 24 jam terakhir (memakai posting_ramai, migrasi 011).
// Disembunyikan bila kosong, atau sampai besok bila ditutup.
const KUNCI_RINGKAS = 'ringkasanTutup';
function hariIni() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
async function ringkasanHarian() {
  const kotak = $('#ringkasan');
  if (!kotak) return;
  try { if (localStorage.getItem(KUNCI_RINGKAS) === hariIni()) return; } catch (e) {}
  const { data, error } = await db.rpc('posting_ramai', { p_limit: 5, p_jam: 24 });
  if (error || !Array.isArray(data) || !data.length) return;
  kotak.innerHTML = '<div class="ringkasan-kepala"><b>' + esc(t('feed.ringkasan')) + '</b>' +
    '<button type="button" class="ringkasan-tutup" aria-label="' + esc(t('feed.ringkasanTutup')) + '" title="' + esc(t('feed.ringkasanTutup')) + '">\\u00d7</button></div>' +
    data.map(r => '<a class="ringkasan-baris" href="detail.html?id=' + encodeURIComponent(r.id) + '"><span class="ringkasan-nama">' +
      esc(r.nama || r.username || '') + '</span><span class="ringkasan-isi">' + esc(String(r.content || '').slice(0, 110)) + '</span></a>').join('');
  kotak.hidden = false;
  kotak.querySelector('.ringkasan-tutup').addEventListener('click', () => {
    try { localStorage.setItem(KUNCI_RINGKAS, hariIni()); } catch (e) {}
    kotak.hidden = true;
  });
}

`;

const UMUR_HTML = `'<div class="form"><textarea id="tulisIsi" rows="4"></textarea>' +
      '<div class="umur-catatan" id="tulisUmurBox" hidden><label for="tulisUmur">' + esc(t('tulis.umur')) + '</label>' +
      '<select id="tulisUmur"><option value="0">' + esc(t('tulis.umurTetap')) + '</option><option value="24">' + esc(t('tulis.umur24')) +
      '</option><option value="168">' + esc(t('tulis.umur7')) + '</option></select></div>' +`;

// [berkas, lama, baru, tandaSudahAda]   (lama harus muncul tepat 1x)
const GANTI = [
  ['js/data.js', "const lagi = data.length >= (r.limit || HALAMAN) ? TOMBOL : '';",
    "const lagi = data.length >= (r.limit || HALAMAN) ? TOMBOL : '';\n    const penutup = lagi || ((opsi && typeof opsi.ujung === 'function') ? opsi.ujung() : '');", 'const penutup ='],
  ['js/data.js', "el.insertAdjacentHTML('beforeend', lagi);", "el.insertAdjacentHTML('beforeend', penutup);", "'beforeend', penutup);"],
  ['js/data.js', "else el.innerHTML = data.map(render).join('') + lagi;", "else el.innerHTML = data.map(render).join('') + penutup;", "join('') + penutup;"],
  ['js/data.js', "el.insertAdjacentHTML('beforeend', data.map(render).join('') + lagi);", "el.insertAdjacentHTML('beforeend', data.map(render).join('') + penutup);", "join('') + penutup);"],
  ['js/data.js', "suka_pada: r.suka_pada || null", "suka_pada: r.suka_pada || null,\n    kedaluwarsa: r.kedaluwarsa || null", 'kedaluwarsa: r.kedaluwarsa'],
  ['js/ui.js', "function htmlPost(p, saya, opsi) {", LABEL + "function htmlPost(p, saya, opsi) {", 'function labelBerumur('],
  ['js/ui.js', '${induk}<div class="isi">${isiHtml(p.content)}</div>',
    '${induk}<div class="isi">${isiHtml(p.content)}</div>\n      ${p.kedaluwarsa && labelBerumur(p.kedaluwarsa) ? `<div class="berumur">${esc(labelBerumur(p.kedaluwarsa))}</div>` : \'\'}', 'class="berumur"'],
  ['js/tulis.js', `'<div class="form"><textarea id="tulisIsi" rows="4"></textarea>' +`, UMUR_HTML, 'id="tulisUmurBox"'],
  ['js/tulis.js', "galat.textContent = ''; kirimBtn.disabled = false; konteks.innerHTML = '';",
    "galat.textContent = ''; kirimBtn.disabled = false; konteks.innerHTML = '';\n    dlg.querySelector('#tulisUmurBox').hidden = mode !== 'tulis'; dlg.querySelector('#tulisUmur').value = '0';", "#tulisUmurBox').hidden"],
  ['js/tulis.js', "else if (kini.mode === 'kutip') { baris.jenis = 'kutip'; baris.kutip_id = kini.id; }",
    "else if (kini.mode === 'kutip') { baris.jenis = 'kutip'; baris.kutip_id = kini.id; }\n    else { const jam = +(dlg.querySelector('#tulisUmur') || {}).value || 0; if (jam > 0) baris.kedaluwarsa = new Date(Date.now() + jam * 36e5).toISOString(); }", 'baris.kedaluwarsa ='],
  ['js/feed.js', "function muat() { return daf && daf.muat(); }", FEED_FUNGSI + "function muat() { return daf && daf.muat(); }", 'function ujungFeed('],
  ['js/feed.js', "{ cache: 'feed-' + f }", "{ cache: 'feed-' + f, ujung: ujungFeed }", 'ujung: ujungFeed'],
  ['js/feed.js', "pilihFeed(bacaFeed());", "pilihFeed(bacaFeed());\n  ringkasanHarian();", 'ringkasanHarian();'],
  ['index.html', '<div id="daftar" role="tabpanel"', '<div id="ringkasan" class="ringkasan" hidden></div><div id="daftar" role="tabpanel"', 'id="ringkasan"'],
];

const KAMUS = {
  'feed.ujungJ': ['Kamu sudah sampai ujung', 'You\u2019ve reached the end', 'Anda sudah sampai ke hujung', 'Sampeyan wis tekan pungkasan', 'Anjeun parantos dugi ka tungtung', '\u4f60\u5df2\u7ecf\u770b\u5b8c\u4e86', '\u3053\u3053\u307e\u3067\u3067\u3059'],
  'feed.ujungT': ['Tidak ada catatan baru lagi. Istirahat dulu, atau temukan orang baru di Jelajah.', 'No more new notes. Take a break, or find new people in Explore.', 'Tiada lagi catatan baharu. Berehatlah, atau cari orang baharu di Teroka.', 'Wis ora ana cathetan anyar. Ngaso sik, utawa golek wong anyar ing Jelajah.', 'Teu aya deui catetan anyar. Reureuh heula, atawa milarian jalma anyar di Jelajah.', '\u6ca1\u6709\u66f4\u591a\u65b0\u7b14\u8bb0\u4e86\u3002\u4f11\u606f\u4e00\u4e0b\uff0c\u6216\u5230\u201c\u63a2\u7d22\u201d\u53d1\u73b0\u65b0\u670b\u53cb\u3002', '\u3053\u308c\u4ee5\u4e0a\u65b0\u3057\u3044\u30ce\u30fc\u30c8\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u3072\u3068\u4f11\u307f\u3059\u308b\u304b\u3001\u300c\u63a2\u7d22\u300d\u3067\u65b0\u3057\u3044\u4eba\u3092\u898b\u3064\u3051\u307e\u3057\u3087\u3046\u3002'],
  'feed.ujungTombol': ['Buka Jelajah', 'Open Explore', 'Buka Teroka', 'Bukak Jelajah', 'Buka Jelajah', '\u6253\u5f00\u63a2\u7d22', '\u63a2\u7d22\u3092\u958b\u304f'],
  'feed.ringkasan': ['Ringkasan hari ini', 'Today\u2019s digest', 'Ringkasan hari ini', 'Ringkesan dina iki', 'Ringkesan po\u00e9 ayeuna', '\u4eca\u65e5\u6458\u8981', '\u4eca\u65e5\u306e\u307e\u3068\u3081'],
  'feed.ringkasanTutup': ['Sembunyikan sampai besok', 'Hide until tomorrow', 'Sembunyikan sehingga esok', 'Singidake nganti sesuk', 'Sumputkeun nepi ka isukan', '\u660e\u5929\u518d\u663e\u793a', '\u660e\u65e5\u307e\u3067\u975e\u8868\u793a'],
  'tulis.umur': ['Hilang setelah', 'Disappears after', 'Hilang selepas', 'Ilang sawise', 'Leungit sanggeus', '\u591a\u4e45\u540e\u6d88\u5931', '\u6d88\u3048\u308b\u307e\u3067'],
  'tulis.umurTetap': ['Tidak pernah', 'Never', 'Tidak pernah', 'Ora tau', 'Moal pernah', '\u4e0d\u6d88\u5931', '\u306a\u3057'],
  'tulis.umur24': ['24 jam', '24 hours', '24 jam', '24 jam', '24 jam', '24 \u5c0f\u65f6', '24\u6642\u9593'],
  'tulis.umur7': ['7 hari', '7 days', '7 hari', '7 dina', '7 po\u00e9', '7 \u5929', '7\u65e5\u9593'],
  'pc.hilangMenit': ['Hilang dalam {n} menit', 'Disappears in {n} min', 'Hilang dalam {n} minit', 'Ilang ing {n} menit', 'Leungit dina {n} menit', '{n} \u5206\u949f\u540e\u6d88\u5931', '{n}\u5206\u5f8c\u306b\u6d88\u3048\u307e\u3059'],
  'pc.hilangJam': ['Hilang dalam {n} jam', 'Disappears in {n} hr', 'Hilang dalam {n} jam', 'Ilang ing {n} jam', 'Leungit dina {n} jam', '{n} \u5c0f\u65f6\u540e\u6d88\u5931', '{n}\u6642\u9593\u5f8c\u306b\u6d88\u3048\u307e\u3059'],
  'pc.hilangHari': ['Hilang dalam {n} hari', 'Disappears in {n} days', 'Hilang dalam {n} hari', 'Ilang ing {n} dina', 'Leungit dina {n} poé', '{n} \u5929\u540e\u6d88\u5931', '{n}\u65e5\u5f8c\u306b\u6d88\u3048\u307e\u3059'],
};
KAMUS['pc.hilangHari'][4] = 'Leungit dina {n} po\u00e9';

const CSS = `
/* ===== Ujung feed, Ringkasan hari ini, catatan berumur ===== */
.ujung-feed{padding:28px 20px 36px;text-align:center;color:var(--redup);border-bottom:1px solid var(--garis)}
.ujung-feed b{display:block;color:var(--teks);font-size:16px;margin-bottom:4px}
.ujung-feed p{margin:0 0 14px;font-size:14px}
.ringkasan{margin:12px 16px;padding:12px 14px;border:1px solid var(--garis);border-radius:14px;background:color-mix(in srgb,var(--aksen) 6%,var(--bg))}
.ringkasan[hidden]{display:none}
.ringkasan-kepala{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.ringkasan-kepala b{font-size:14px}
.ringkasan-tutup{background:none;border:0;color:var(--redup);font:inherit;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px}
.ringkasan-baris{display:block;padding:8px 0;border-top:1px solid var(--garis)}
.ringkasan-nama{display:block;font-weight:600;font-size:14px}
.ringkasan-isi{display:block;color:var(--redup);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.berumur{margin-top:6px;font-size:13px;color:var(--redup)}
.umur-catatan{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px;color:var(--redup)}
.umur-catatan[hidden]{display:none}
.umur-catatan select{background:transparent;color:var(--teks);border:1px solid var(--garis);border-radius:8px;padding:6px 8px;font:inherit}
`;

const isi = {};
const baca = b => (isi[b] ??= fs.readFileSync(path.join(akar, b), 'utf8'));
const galat = [], log = [];

for (const [b, lama, baru, ada] of GANTI) {
  const s = baca(b);
  if (s.includes(ada)) { log.push('lewati (sudah)  ' + b + '  ' + lama.slice(0, 36).replace(/\n/g, ' ')); continue; }
  const n = s.split(lama).length - 1;
  if (n !== 1) { galat.push(`${b}: titik sisip ditemukan ${n}x (harus 1): ${lama.slice(0, 60).replace(/\n/g, ' ')}`); continue; }
  isi[b] = s.replace(lama, () => baru);
  log.push('terapkan        ' + b);
}

// Kamus: tambah kunci yang belum ada sebelum penutup objek I18N_KAMUS
{
  const b = 'js/bahasa.js';
  const s = baca(b);
  const baru = Object.entries(KAMUS).filter(([k]) => !s.includes("'" + k + "'"));
  if (baru.length) {
    const baris = baru.map(([k, v]) => `  '${k}': [${v.map(x => JSON.stringify(x)).join(', ')}]`).join(',\n');
    const re = /\]\s*\n\};\s*$/;
    if (!re.test(s)) galat.push('js/bahasa.js: penutup I18N_KAMUS tidak dikenali');
    else { isi[b] = s.replace(re, () => `],\n${baris}\n};\n`); log.push(`terapkan        ${b}  +${baru.length} kunci`); }
  } else log.push('lewati (sudah)  js/bahasa.js');
}

{
  const b = 'css/style.css';
  const s = baca(b);
  if (s.includes('.ujung-feed')) log.push('lewati (sudah)  ' + b);
  else { isi[b] = s.replace(/\s*$/, '\n') + CSS; log.push('terapkan        ' + b); }
}

if (galat.length) { console.error('BERHENTI, tidak ada berkas yang ditulis:\n- ' + galat.join('\n- ')); process.exit(1); }

let ubah = 0;
for (const b of Object.keys(isi)) {
  const asli = fs.readFileSync(path.join(akar, b), 'utf8');
  if (asli !== isi[b]) { fs.writeFileSync(path.join(akar, b), isi[b]); ubah++; }
}
console.log(log.join('\n'));
console.log(`\n${ubah} berkas diubah.`);
if (ubah) {
  for (const alat of ['pecah-bahasa.js', 'cek-bahasa.js']) {
    try { execFileSync('node', [path.join(akar, 'tools', alat)], { stdio: 'inherit' }); }
    catch (e) { console.error('PERINGATAN: tools/' + alat + ' gagal; periksa keluarannya.'); process.exitCode = 1; }
  }
  console.log('\nLanjut: node tools/naikkan-cache.js');
}

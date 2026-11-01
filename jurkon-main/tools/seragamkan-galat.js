// Menyeragamkan pesan galat: pesan mentah dari server tidak lagi tampil ke pengguna.
// Idempoten: aman dijalankan ulang. Bila ada titik sisip yang berubah, skrip berhenti
// SEBELUM menulis apa pun (semua-atau-tidak-sama-sekali).
// Pakai: node tools/seragamkan-galat.js
const fs = require('fs');
const path = require('path');
const akar = path.join(__dirname, '..');

const FUNGSI = `// Satu pintu untuk pesan galat yang tampil ke pengguna. Pesan mentah server (nama tabel,
// kolom, kebijakan, detail SQL) tidak boleh tampil. Hanya pesan buatan sendiri (RAISE EXCEPTION
// di SQL, kode P0001, berbahasa Indonesia) yang diteruskan apa adanya.
function galatRamah(e) {
  const tt = (k, f) => (typeof t === 'function' && t(k) !== k) ? t(k) : f;
  const m = String((e && e.message) || '');
  if (typeof pesanKontenDilarang === 'function') { const d = pesanKontenDilarang(e); if (d) return d; }
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return tt('err.offline', 'Tidak ada koneksi. Periksa sinyal lalu coba lagi.');
  if (/jwt expired|invalid jwt/i.test(m)) return tt('err.sesi', 'Sesi habis. Silakan masuk lagi.');
  if (e && e.code === 'P0001' && m) return m;
  if (m) console.warn('[galat]', (e && e.code) || '', m);
  return tt('err.umum', 'Terjadi kesalahan. Coba lagi.');
}

`;

// [berkas, lama, baru, sudahAda]  (lama harus muncul tepat 1 kali, kecuali sudah diterapkan)
const GANTI = [
  ['js/supabase.js', 'function waktu(iso) {', FUNGSI + 'function waktu(iso) {', 'function galatRamah('],
  ['js/data.js',
`function pesanGalat(e) {
  const m = (e && e.message) || '';
  const dilarang = typeof pesanKontenDilarang === 'function' && pesanKontenDilarang(e);
  if (dilarang) return dilarang;
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return t('err.offline');
  if (/jwt expired|invalid jwt/i.test(m)) return t('err.sesi');
  return m || t('err.umum');
}`,
`function pesanGalat(e) { return galatRamah(e); }`, 'return galatRamah(e); }'],
  ['js/chat.js',
`  function pesanGalatChat(e) {
    const m = (e && e.message) || '';
    const dilarang = pesanKontenDilarang(e);
    if (dilarang) return dilarang;
    if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return t('err.offline');
    return m || t('err.umum');
  }`,
`  function pesanGalatChat(e) { return galatRamah(e); }`, 'return galatRamah(e); }'],
  ['js/chat.js', "t('chat.gagalMuat', { pesan: ep.message })", "t('chat.gagalMuat', { pesan: galatRamah(ep) })", 'pesan: galatRamah(ep)'],
  ['js/pesan.js', "esc(error.message)", "esc(galatRamah(error))", 'esc(galatRamah(error))'],
  ['js/akun.js', "t('ak.gagalGanti', { pesan: m })", "t('ak.gagalGanti', { pesan: galatRamah(error) })", 'gagalGanti\', { pesan: galatRamah'],
  ['js/akun.js', "t('ak.gagalUnduh', { pesan: error.message })", "t('ak.gagalUnduh', { pesan: galatRamah(error) })", 'gagalUnduh\', { pesan: galatRamah'],
  ['js/akun.js', "t('ak.gagalHapus', { pesan: error.message })", "t('ak.gagalHapus', { pesan: galatRamah(error) })", 'gagalHapus\', { pesan: galatRamah'],
  ['js/profil.js', "t('pf.gagalBlokir', { pesan: error.message })", "t('pf.gagalBlokir', { pesan: galatRamah(error) })", 'gagalBlokir\', { pesan: galatRamah'],
  ['js/profil.js', "t('pf.gagalAksi', { pesan: error.message })", "t('pf.gagalAksi', { pesan: galatRamah(error) })", 'gagalAksi\', { pesan: galatRamah'],
  ['js/ui.js', "t('pc.gagalLapor', { pesan: error.message })", "t('pc.gagalLapor', { pesan: galatRamah(error) })", 'gagalLapor\', { pesan: galatRamah'],
  ['js/ui.js', "t('pc.gagalHapus', { pesan: error.message })", "t('pc.gagalHapus', { pesan: galatRamah(error) })", 'gagalHapus\', { pesan: galatRamah'],
  ['js/selamat.js', "(pesanKontenDilarang(error) || error.message)", "galatRamah(error)", ': galatRamah(error);'],
];

// Panel admin: semua pemakaian dihitung dan dilaporkan (bisa lebih dari satu).
const ADMIN = [
  [/throw new Error\(error\.message\)/g, 'throw error'],
  [/'Gagal: ' \+ e\.message/g, "'Gagal: ' + galatRamah(e)"],
  [/'Gagal: ' \+ er\.message/g, "'Gagal: ' + galatRamah(er)"],
  [/kosongHtml\('Gagal memuat', e\.message\)/g, "kosongHtml('Gagal memuat', galatRamah(e))"],
  [/'Jalankan migrasi 012\. ' \+ error\.message/g, "'Jalankan migrasi 012. ' + galatRamah(error)"],
  [/esc\(e && e\.message \|\| 'Terjadi kesalahan\.'\)/g, 'esc(galatRamah(e))'],
  [/return m \|\| 'Gagal masuk\.';/g, "return 'Gagal masuk.';   // jangan tampilkan pesan mentah dari server"],
];

const isi = {};
const baca = b => (isi[b] ??= fs.readFileSync(path.join(akar, b), 'utf8'));
const galat = [];
const log = [];

for (const [b, lama, baru, ada] of GANTI) {
  const s = baca(b);
  if (s.includes(ada)) { log.push('lewati (sudah)  ' + b + '  ' + lama.slice(0, 40).replace(/\n/g, ' ')); continue; }
  const n = s.split(lama).length - 1;
  if (n !== 1) { galat.push(`${b}: titik sisip ditemukan ${n}x (harus 1): ${lama.slice(0, 50).replace(/\n/g, ' ')}`); continue; }
  isi[b] = s.replace(lama, () => baru);
  log.push('terapkan        ' + b);
}

const adm = 'js/admin.js';
if (fs.existsSync(path.join(akar, adm))) {
  let s = baca(adm);
  for (const [re, baru] of ADMIN) {
    const n = (s.match(re) || []).length;
    if (n) { s = s.replace(re, baru); log.push(`terapkan        ${adm}  x${n}  ${baru.slice(0, 40)}`); }
  }
  isi[adm] = s;
}

if (galat.length) { console.error('BERHENTI, tidak ada berkas yang ditulis:\n- ' + galat.join('\n- ')); process.exit(1); }

let ubah = 0;
for (const b of Object.keys(isi)) {
  const asli = fs.readFileSync(path.join(akar, b), 'utf8');
  if (asli !== isi[b]) { fs.writeFileSync(path.join(akar, b), isi[b]); ubah++; }
}
console.log(log.join('\n'));
console.log(`\nSelesai: ${ubah} berkas diubah. Jalankan: node tools/naikkan-cache.js`);

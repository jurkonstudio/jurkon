// Memasang layar "Keamanan akun" (pendaftaran TOTP) ke panel admin. Aman dijalankan ulang (tidak menggandakan).
// Pakai di folder repo:  node tools/pasang-mfa.js   lalu   node tools/naikkan-cache.js
// Skrip berhenti dengan pesan jelas bila titik sisip tidak ditemukan (berkas sudah berubah), tanpa merusak apa pun.
const fs = require('fs'), path = require('path');
const dasar = path.join(__dirname, '..');
const baca = p => fs.readFileSync(path.join(dasar, p), 'utf8');
const tulis = (p, s) => fs.writeFileSync(path.join(dasar, p), s);
function sisip(s, jangkar, baru, sesudah, nama) {
  const n = s.split(jangkar).length - 1;
  if (n !== 1) throw new Error(`${nama}: titik sisip ditemukan ${n}x (harus 1x). Berkas sudah berubah; kirim ke Claude untuk disesuaikan.`);
  return sesudah ? s.replace(jangkar, () => jangkar + baru) : s.replace(jangkar, () => baru + jangkar);
}
let ubah = 0;

// 1. js/admin.js: entri tab + blok fungsi
let a = baca('js/admin.js');
if (a.includes('vKeamanan')) console.log('admin.js: sudah terpasang, dilewati');
else {
  a = sisip(a, "    admin:     { judul: 'Akses admin', v: vAdmin },\n", "    keamanan:  { judul: 'Keamanan akun', v: vKeamanan },\n", true, 'admin.js (TAB)');
  const blok = fs.readFileSync(path.join(__dirname, '_blok-mfa.txt'), 'utf8');
  a = sisip(a, '  // ---------------------------------------------------------------- Jejak\n', blok, false, 'admin.js (blok)');
  tulis('js/admin.js', a); ubah++; console.log('admin.js: dipasang');
}

// 2. murthehelp/031411.html: tautan menu
let h = baca('murthehelp/031411.html');
if (h.includes('data-tab="keamanan"')) console.log('031411.html: sudah terpasang, dilewati');
else {
  const j = '<a href="#admin" data-tab="admin"><svg><use href="#i-admin"/></svg><span>Akses admin</span></a>\n';
  h = sisip(h, j, '      <a href="#keamanan" data-tab="keamanan"><svg><use href="#i-kunci"/></svg><span>Keamanan</span></a>\n', true, '031411.html (menu)');
  tulis('murthehelp/031411.html', h); ubah++; console.log('031411.html: dipasang');
}

// 3. sql/README.md: baris tabel
let r = baca('sql/README.md');
if (r.includes('021_mfa_admin.sql')) console.log('sql/README.md: sudah ada, dilewati');
else {
  const m = r.match(/^\| `020_panel_admin\.sql`.*\n/m);
  if (!m) throw new Error('sql/README.md: baris 020 tidak ditemukan');
  r = r.replace(m[0], () => m[0] + '| `021_mfa_admin.sql` | `is_admin()` mewajibkan sesi 2 langkah (aal2) bila admin sudah punya TOTP | setelah 020; hasil akhir: daftar admin dan status 2 langkah |\n');
  tulis('sql/README.md', r); ubah++; console.log('sql/README.md: diperbarui');
}
console.log(ubah ? 'Selesai. Jalankan: node tools/naikkan-cache.js' : 'Tidak ada perubahan.');

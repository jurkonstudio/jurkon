// Menambah tombol "+" (Tulis) melayang di Jelajah, Notifikasi, dan Profil.
// Lembar tulis sudah ada di semua halaman (js/nav.js); yang kurang hanya tombolnya.
// Aman dijalankan ulang. Jalankan dari akar repo:  node tools/pasang-fab-tulis.js
const fs = require('fs');
const FAB = '<a class="fab" href="post.html" aria-label="Tulis" data-i-aria="nav.tulis">+</a>\n';
const ANCHOR = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js';
let ubah = 0;
for (const f of ['explore.html', 'notifikasi.html', 'profil.html']) {
  if (!fs.existsSync(f)) { console.log('LEWAT (tidak ada): ' + f); continue; }
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('class="fab"')) { console.log('sudah ada: ' + f); continue; }
  const i = s.indexOf(ANCHOR);
  if (i < 0) { console.log('BERHENTI: titik sisip tidak ditemukan di ' + f); process.exit(1); }
  fs.writeFileSync(f, s.slice(0, i) + FAB + s.slice(i));
  console.log('dipasang: ' + f); ubah++;
}
console.log(ubah ? '\nLanjut: node tools/naikkan-cache.js' : '\nTidak ada perubahan.');

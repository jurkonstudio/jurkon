// Memasang fitur Pertanyaan harian. Aman dijalankan ulang; berhenti SEBELUM menulis apa pun bila ada titik sisip yang berubah.
// Jalankan dari akar repo (setelah SQL 032 dijalankan di Supabase):  node tools/pasang-pertanyaan-harian.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const akar = path.join(__dirname, '..');
const baca = f => fs.readFileSync(path.join(akar, f), 'utf8');
const ada = f => fs.existsSync(path.join(akar, f));
const keluar = m => { console.error('BERHENTI: ' + m + '\nTidak ada berkas yang diubah.'); process.exit(1); };

for (const f of ['pertanyaan.html', 'js/pertanyaan.js', 'js/pertanyaan-halaman.js', 'sql/032_pertanyaan_harian.sql',
  'js/tulis.js', 'js/nav.js', 'index.html', 'css/style.css', 'sw.js', 'js/bahasa.js']) if (!ada(f)) keluar('berkas tidak ada: ' + f + ' (sudah unzip pertanyaan-harian.zip?)');

const hasil = {};     // berkas -> isi baru
const log = [];
function sunting(f, penanda, kerja) {
  const lama = baca(f);
  if (lama.includes(penanda)) { log.push('sudah ada: ' + f); return; }
  hasil[f] = kerja(lama);
  log.push('diubah: ' + f);
}
function ganti(s, f, dari, ke) {
  const n = s.split(dari).length - 1;
  if (n !== 1) keluar(f + ': titik sisip ditemukan ' + n + 'x (harus 1x): ' + dari.trim().slice(0, 70));
  return s.replace(dari, () => ke);
}

// 1. Lembar tulis: mode "jawab"
sunting('js/tulis.js', "mode === 'jawab'", s => {
  const f = 'js/tulis.js';
  s = ganti(s, f, "const mode = o.balas ? 'balas' : o.kutip ? 'kutip' : 'tulis';",
    "const mode = o.balas ? 'balas' : o.kutip ? 'kutip' : o.pertanyaan ? 'jawab' : 'tulis';");
  s = ganti(s, f, "kini = { mode, id, kunci: mode + ':' + (id || '') };",
    "kini = { mode, id, tgl: o.pertanyaan ? o.pertanyaan.tgl : null, kunci: mode + ':' + (id || (o.pertanyaan ? o.pertanyaan.tgl : '')) };");
  s = ganti(s, f, "    } else if (mode === 'kutip') {",
    "    } else if (mode === 'jawab') {\n" +
    "      judul.textContent = t('pq.judul');\n" +
    "      kirimBtn.textContent = t('umum.kirim');\n" +
    "      ta.placeholder = t('pq.ph');\n" +
    "      konteks.innerHTML = '<div class=\"tulis-konteks\"><p>' + esc(o.pertanyaan.teks) + '</p></div>';\n" +
    "    } else if (mode === 'kutip') {");
  s = ganti(s, f, "    else if (kini.mode === 'kutip') { baris.jenis = 'kutip'; baris.kutip_id = kini.id; }",
    "    else if (kini.mode === 'jawab') { baris.pertanyaan_tgl = kini.tgl; }\n" +
    "    else if (kini.mode === 'kutip') { baris.jenis = 'kutip'; baris.kutip_id = kini.id; }");
  s = ganti(s, f, "      galat.textContent = t(kini.mode === 'balas' ? 'detail.gagal' : 'post.gagal', { pesan: pesan(error) });",
    "      if (kini.mode === 'jawab' && error.code === '23505') { galat.textContent = t('pq.sudahGalat'); return; }\n" +
    "      galat.textContent = t(kini.mode === 'balas' ? 'detail.gagal' : 'post.gagal', { pesan: pesan(error) });");
  s = ganti(s, f, "    toast(baris.terbuka_pada ? t('tulis.kapsulTerkirim'",
    "    toast(info.mode === 'jawab' ? t('pq.terkirim') : baris.terbuka_pada ? t('tulis.kapsulTerkirim'");
  return s;
});

// 2. nav.js: bila lembar gagal dimuat, arahkan ke halaman pertanyaan
sunting('js/nav.js', 'o.pertanyaan ?', s =>
  ganti(s, 'js/nav.js', "const lokasi = o => o.balas ?", "const lokasi = o => o.pertanyaan ? 'pertanyaan.html' : o.balas ?"));

// 3. Beranda: kartu + skrip
sunting('index.html', 'id="pertanyaan"', s => {
  s = ganti(s, 'index.html', '<div id="ringkasan" class="ringkasan" hidden></div>',
    '<div id="ringkasan" class="ringkasan" hidden></div><div id="pertanyaan" class="ringkasan pq-kartu" hidden></div>');
  return ganti(s, 'index.html', '<script src="js/feed.js"></script>', '<script src="js/feed.js"></script>\n<script src="js/pertanyaan.js"></script>');
});

// 4. CSS
sunting('css/style.css', '/* Pertanyaan harian */', s => s.replace(/\s*$/, '\n') + `
/* Pertanyaan harian */
.pq-teks{margin:4px 0 12px;font-size:17px;line-height:1.45;font-weight:600}
.pq-baris{display:flex;justify-content:space-between;align-items:center;gap:12px}
.pq-hitung{font-size:13px;color:var(--redup)}
.pq-lihat{font-size:13px;font-weight:600;color:var(--aksen);text-decoration:none}
.pq-kepala{margin:12px 16px;padding:16px;border:1px solid var(--garis);border-radius:14px;background:color-mix(in srgb,var(--aksen) 6%,var(--bg))}
.pq-label{font-size:13px;font-weight:600;color:var(--aksen)}
.pq-kepala .pq-besar{font-size:20px}
.pq-geser{display:flex;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid var(--garis);font-size:14px}
.pq-geser a{color:var(--aksen);text-decoration:none;font-weight:600}
`);

// 5. Service worker: daftar berkas offline
sunting('sw.js', '/pertanyaan.html', s => {
  s = ganti(s, 'sw.js', "'/js/selamat.js', '/js/publik.js',", "'/js/selamat.js', '/js/publik.js', '/js/pertanyaan.js', '/js/pertanyaan-halaman.js',");
  return ganti(s, 'sw.js', "'/chat.html'];", "'/chat.html', '/pertanyaan.html'];");
});

// 6. Kamus 7 bahasa (urutan: id, en, ms, jv, su, zh, ja), lalu dipecah per bahasa
const KAMUS = [
  ['pq.judul', 'Pertanyaan hari ini', 'Question of the day', 'Soalan hari ini', 'Pitakonan dina iki', 'Patarosan poé ieu', '今日的问题', '今日の質問'],
  ['pq.harian', 'Pertanyaan harian', 'Daily question', 'Soalan harian', 'Pitakonan saben dina', 'Patarosan poéan', '每日一问', '毎日の質問'],
  ['pq.jawab', 'Jawab', 'Answer', 'Jawab', 'Wangsulana', 'Jawab', '回答', '答える'],
  ['pq.lihat', 'Lihat jawaban', 'See answers', 'Lihat jawapan', 'Delengen wangsulan', 'Tingali jawaban', '查看回答', '回答を見る'],
  ['pq.hitung', '{n} jawaban', '{n} answers', '{n} jawapan', '{n} wangsulan', '{n} jawaban', '{n} 个回答', '{n} 件の回答'],
  ['pq.sudah', 'Kamu sudah menjawab hari ini', 'You answered today', 'Anda sudah menjawab hari ini', 'Sampeyan wis mangsuli dina iki', 'Anjeun parantos ngajawab poé ieu', '你今天已经回答了', '今日はもう回答しました'],
  ['pq.kosongJ', 'Belum ada jawaban', 'No answers yet', 'Belum ada jawapan', 'Durung ana wangsulan', 'Acan aya jawaban', '还没有回答', 'まだ回答がありません'],
  ['pq.kosongT', 'Jadilah yang pertama menjawab pertanyaan ini.', 'Be the first to answer this question.', 'Jadilah yang pertama menjawab soalan ini.', 'Dadia sing pisanan mangsuli pitakonan iki.', 'Jadi nu kahiji ngajawab patarosan ieu.', '来做第一个回答的人吧。', '最初に答えてみましょう。'],
  ['pq.sebelumnya', 'Sebelumnya', 'Previous', 'Sebelumnya', 'Sadurunge', 'Samemehna', '前一天', '前の日'],
  ['pq.berikutnya', 'Berikutnya', 'Next', 'Seterusnya', 'Sabanjure', 'Salajengna', '后一天', '次の日'],
  ['pq.terkirim', 'Jawabanmu terkirim.', 'Your answer was posted.', 'Jawapan anda dihantar.', 'Wangsulanmu wis kekirim.', 'Jawaban anjeun geus kakirim.', '回答已发送。', '回答を送信しました。'],
  ['pq.sudahGalat', 'Kamu sudah menjawab pertanyaan ini.', 'You already answered this question.', 'Anda sudah menjawab soalan ini.', 'Sampeyan wis mangsuli pitakonan iki.', 'Anjeun geus ngajawab patarosan ieu.', '你已经回答过这个问题了。', 'この質問にはすでに回答しています。'],
  ['pq.ph', 'Tulis jawabanmu…', 'Write your answer…', 'Tulis jawapan anda…', 'Tulisen wangsulanmu…', 'Tulis jawaban anjeun…', '写下你的回答…', '回答を書いてください…']
];
let kamusBaru = false;
sunting('js/bahasa.js', "'pq.judul'", s => {
  const i = s.lastIndexOf('\n};');
  if (i < 0 || !s.slice(0, i).trimEnd().endsWith(']')) keluar('js/bahasa.js: akhir I18N_KAMUS tidak dikenali');
  const baris = KAMUS.map(([k, ...v]) => "  '" + k + "': [" + v.map(x => JSON.stringify(x)).join(', ') + ']').join(',\n');
  kamusBaru = true;
  return s.slice(0, i).trimEnd() + ',\n  // ---- Pertanyaan harian ----\n' + baris + s.slice(i);
});

// 7. Dokumentasi (opsional)
if (ada('sql/README.md')) sunting('sql/README.md', '032_pertanyaan_harian', s => {
  const m = s.match(/^\| `031_laporan_akun\.sql`.*$/m);
  if (!m) return s;
  return s.replace(m[0], () => m[0] + '\n| `032_pertanyaan_harian.sql` | pertanyaan harian: kolom `posts.pertanyaan_tgl`, satu jawaban per akun per hari, trigger penjaga | setelah 024; hasil cek: 1 baris, 2 baris, 1 baris |');
});
if (ada('docs/fitur.md')) sunting('docs/fitur.md', '## Pertanyaan harian', s => s.replace(/\s*$/, '\n') + `
## Pertanyaan harian

Satu pertanyaan sama untuk semua orang tiap hari (hari menurut WIB), dipilih dari daftar \`PQ_BANK\` di \`js/pertanyaan.js\` (hari ke-N mod jumlah pertanyaan). Kartunya tampil di Beranda; halaman penuh \`pertanyaan.html\` menampilkan semua jawaban dan bisa membuka pertanyaan 30 hari ke belakang (\`?tgl=YYYY-MM-DD\`).

- **Database:** jalankan \`sql/032_pertanyaan_harian.sql\` (setelah 024) SEBELUM mengunggah kode JS. Jawaban adalah catatan biasa dengan \`posts.pertanyaan_tgl\`; satu jawaban per akun per hari, tanggal harus hari ini atau kemarin (WIB), hanya catatan utama biasa.
- **Klien:** kartu dan data di \`js/pertanyaan.js\`, halaman di \`js/pertanyaan-halaman.js\`, mode \`jawab\` di lembar tulis (\`js/tulis.js\`). Tanpa migrasi 032 kartu otomatis tidak tampil.
- **Teks pertanyaan hanya berbahasa Indonesia**; teks antarmukanya (\`pq.*\`) tersedia di 7 bahasa.
`);

// Tulis semuanya
for (const [f, isi] of Object.entries(hasil)) fs.writeFileSync(path.join(akar, f), isi);
console.log(log.join('\n'));
if (kamusBaru) {
  console.log('\nMemecah kamus bahasa...');
  cp.execSync('node tools/pecah-bahasa.js', { cwd: akar, stdio: 'inherit' });
  console.log('\nMemeriksa kamus (kunci lama yang yatim, bila ada, bukan dari paket ini):');
  try { cp.execSync('node tools/cek-bahasa.js', { cwd: akar, stdio: 'inherit' }); } catch (e) { console.log('(cek-bahasa melaporkan catatan di atas)'); }
}
console.log('\nLanjut: node tools/naikkan-cache.js');

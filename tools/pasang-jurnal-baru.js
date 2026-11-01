// Jurnal baru: editor modern, draf, batas 4000. Berkas yang ditimpa dari zip: jurnal.html, js/jurnal.js, css/jurnal.css.
// Skrip ini menambah teks terjemahan (7 bahasa) ke js/bahasa.js lalu memecah bahasa, dan memperbarui catatan di docs/sql.
// Aman dijalankan ulang. Jalankan dari akar repo SETELAH  unzip -o jurkon-jurnal-baru.zip :  node tools/pasang-jurnal-baru.js
const fs = require('fs'), cp = require('child_process');
let ubah = 0;

// Urutan kolom: id, en, ms, jv, su, zh, ja
const TEKS = {
  'jr.draf': ['Draf', 'Draft', 'Draf', 'Konsep', 'Draf', '草稿', '下書き'],
  'jr.simpanDraf': ['Simpan draf', 'Save draft', 'Simpan draf', 'Simpen konsep', 'Simpen draf', '保存草稿', '下書きを保存'],
  'jr.drafTersimpan': ['Draf tersimpan', 'Draft saved', 'Draf disimpan', 'Konsep wis kasimpen', 'Draf geus disimpen', '草稿已保存', '下書きを保存しました'],
  'jr.semua': ['Semua', 'All', 'Semua', 'Kabeh', 'Kabéh', '全部', 'すべて'],
  'jr.belumSimpan': ['Belum disimpan', 'Not saved yet', 'Belum disimpan', 'Durung kasimpen', 'Acan disimpen', '尚未保存', '未保存'],
  'jr.tutupTanya': ['Tulisanmu belum disimpan. Simpan sebagai draf?', 'Your writing is not saved. Save it as a draft?', 'Tulisan anda belum disimpan. Simpan sebagai draf?', 'Tulisanmu durung kasimpen. Simpen minangka konsep?', 'Tulisan anjeun acan disimpen. Simpen jadi draf?', '你的内容尚未保存。要保存为草稿吗？', '内容がまだ保存されていません。下書きとして保存しますか？'],
  'jr.tutupTanyaUbah': ['Perubahan belum disimpan.', 'Your changes are not saved.', 'Perubahan belum disimpan.', 'Owahan durung kasimpen.', 'Parobahan acan disimpen.', '更改尚未保存。', '変更が保存されていません。'],
  'jr.buang': ['Buang', 'Discard', 'Buang', 'Buwang', 'Buang', '放弃', '破棄'],
  'jr.lanjut': ['Lanjut menulis', 'Keep writing', 'Teruskan menulis', 'Terusake nulis', 'Teruskeun nulis', '继续写', '書き続ける'],
  'jr.kata': ['{n} kata', '{n} words', '{n} perkataan', '{n} tembung', '{n} kecap', '{n} 词', '{n} 語'],
  'jr.selengkapnya': ['Selengkapnya', 'Read more', 'Selanjutnya', 'Candhakane', 'Salengkepna', '展开', '続きを読む'],
  'jr.ringkas': ['Ringkas', 'Show less', 'Ringkaskan', 'Ringkes', 'Ringkes', '收起', '閉じる'],
  'jr.infoPribadi': ['Hanya kamu yang bisa membacanya.', 'Only you can read this.', 'Hanya anda yang boleh membacanya.', 'Mung sampeyan sing bisa maca.', 'Ngan anjeun anu bisa maca.', '只有你能阅读。', 'あなただけが読めます。'],
  'jr.kosongSaring': ['Belum ada catatan di kategori ini.', 'No entries in this category yet.', 'Belum ada catatan dalam kategori ini.', 'Durung ana cathetan ing kategori iki.', 'Acan aya catetan dina kategori ieu.', '此分类下还没有日记。', 'このカテゴリにはまだ日記がありません。'],
  'jr.phBaru': ['Apa yang ingin kamu catat hari ini?', 'What’s on your mind today?', 'Apa yang ingin anda catat hari ini?', 'Apa sing arep dicathet dina iki?', 'Naon anu hoyong dicatet ayeuna?', '今天想记下什么？', '今日は何を書き留めますか？'],
  'jr.privasi': ['Siapa yang bisa membaca', 'Who can read this', 'Siapa yang boleh membaca', 'Sapa sing bisa maca', 'Saha anu bisa maca', '谁可以阅读', '閲覧できる人']
};

(function () {
  const f = 'js/bahasa.js';
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes("'jr.simpanDraf'")) { console.log('sudah ada: teks terjemahan di ' + f); return; }
  const re = /^ {2}'jr\.siap': \[.*\],?[ \t]*$/m;
  const m = s.match(re);
  if (!m) { console.log("BERHENTI: baris 'jr.siap' tidak ditemukan di " + f); process.exit(1); }
  const baris = Object.entries(TEKS).map(([k, v]) => "  '" + k + "': [" + v.map(x => JSON.stringify(x)).join(', ') + '],').join('\n');
  const akhir = m[0].replace(/[ \t]*$/, '').endsWith(',') ? m[0] : m[0] + ',';
  s = s.replace(re, () => akhir + '\n' + baris);
  fs.writeFileSync(f, s); console.log('dipasang: teks terjemahan (' + Object.keys(TEKS).length + ' kunci) di ' + f); ubah++;
})();

function lunak(berkas, sudah, cari, ganti) {
  if (!fs.existsSync(berkas)) return;
  const s = fs.readFileSync(berkas, 'utf8');
  if (s.includes(sudah)) return;
  if (!s.includes(cari)) { console.log('LEWAT (catatan, tidak wajib): ' + berkas); return; }
  fs.writeFileSync(berkas, s.replace(cari, () => ganti)); console.log('dipasang: ' + berkas); ubah++;
}
lunak('docs/fitur.md', 'sejak 039', '- Isi teks 1-2000 karakter, maksimal 50 catatan per akun',
  '- Isi teks 1-4000 karakter (sejak 039), maksimal 50 catatan per akun (draf ikut dihitung). Draf selalu pribadi: simpan dulu, lanjutkan nanti dari filter Draf');
(function () {
  const f = 'sql/README.md';
  if (!fs.existsSync(f)) return;
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('039_jurnal_draf_4000')) return;
  const baris = s.split('\n'); let i = -1;
  baris.forEach((l, n) => { if (/^\| `0\d\d[ab]?_/.test(l)) i = n; });
  if (i < 0) { console.log('LEWAT (catatan, tidak wajib): sql/README.md'); return; }
  baris.splice(i + 1, 0, '| `039_jurnal_draf_4000.sql` | Jurnal: kolom `draf` (draf selalu pribadi) dan batas isi 4000 karakter, kebijakan baca menolak draf | setelah 034; hasil cek: 1 baris, 2 baris, 5 baris |');
  fs.writeFileSync(f, baris.join('\n')); console.log('dipasang: ' + f); ubah++;
})();

if (ubah) {
  console.log('\nMemecah bahasa...');
  cp.execSync('node tools/pecah-bahasa.js', { stdio: 'inherit' });
  console.log('\nLanjut: node tools/cek-bahasa.js && node tools/naikkan-cache.js');
} else console.log('\nTidak ada perubahan.');

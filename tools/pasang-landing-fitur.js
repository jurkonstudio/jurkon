// Memperbarui landing page 7 bahasa: (1) kartu "Pesan pribadi" dan "Foto di chat..." kini menyebut dokumen,
// (2) dua kartu fitur baru: Jurnal pribadi dan Pertanyaan harian. Menyunting tools/landing-teks.js dan
// tools/landing-templat.html, lalu menjalankan tools/buat-landing.js (menulis ulang landing.html, en/, ms/, jv/, su/, zh/, ja/, sitemap).
// Aman dijalankan ulang. Jalankan dari akar repo:  node tools/pasang-landing-fitur.js
const fs = require('fs'), cp = require('child_process');
const BAHASA = ['id', 'en', 'ms', 'jv', 'su', 'zh', 'ja'];
const BARU = {
  f1p: {
    id: 'Kirim teks, foto, suara, dan dokumen (PDF, Word, Excel, PowerPoint, dan lainnya, maks 5 MB) ke orang yang saling mengikuti. Semua berkas hilang sendiri setelah 10 menit.',
    en: 'Send text, photos, voice, and documents (PDF, Word, Excel, PowerPoint, and more, up to 5 MB) to people who follow each other. Every file disappears on its own after 10 minutes.',
    ms: 'Hantar teks, foto, suara dan dokumen (PDF, Word, Excel, PowerPoint dan lain-lain, maks 5 MB) kepada orang yang saling mengikuti. Semua fail hilang sendiri selepas 10 minit.',
    jv: 'Kirimen teks, foto, swara, lan dokumen (PDF, Word, Excel, PowerPoint, lan liyane, maks 5 MB) marang wong sing padha-padha ngetutake. Kabeh berkas ilang dhewe sawise 10 menit.',
    su: 'Kirim téks, poto, sora, jeung dokumén (PDF, Word, Excel, PowerPoint, jeung sajabana, maks 5 MB) ka jalma anu silih turutan. Sakabéh berkas leungit sorangan sanggeus 10 menit.',
    zh: '向互相关注的人发送文字、照片、语音和文档（PDF、Word、Excel、PowerPoint 等，最大 5 MB）。所有文件在 10 分钟后自动消失。',
    ja: '相互フォローの相手に、テキスト・写真・音声・ドキュメント（PDF、Word、Excel、PowerPoint など、最大5 MB）を送れます。ファイルは10分後に自動で消えます。' },
  a4h: {
    id: 'Berkas di chat tidak menumpuk', en: 'Chat files don’t pile up', ms: 'Fail sembang tidak bertimbun', jv: 'Berkas ing chat ora numpuk',
    su: 'Berkas di obrolan teu numpuk', zh: '聊天文件不会堆积', ja: 'チャットのファイルが溜まらない' },
  a4p: {
    id: 'Foto, pesan suara, dan dokumen hanya bisa dibuka 10 menit sejak dikirim, lalu dibuang otomatis. Ditegakkan di database.',
    en: 'Photos, voice messages, and documents can only be opened for 10 minutes after they’re sent, then they’re deleted automatically. Enforced in the database.',
    ms: 'Foto, mesej suara dan dokumen hanya boleh dibuka selama 10 minit selepas dihantar, kemudian dipadam secara automatik. Dikuatkuasakan dalam pangkalan data.',
    jv: 'Foto, pesen swara, lan dokumen mung bisa dibukak 10 menit sawise dikirim, banjur dibusak otomatis. Ditegakake ing database.',
    su: 'Poto, pesen sora, jeung dokumén ngan bisa dibuka 10 menit sanggeus dikirim, tuluy dihapus otomatis. Ditegakkeun dina database.',
    zh: '照片、语音消息和文档发送后只能在 10 分钟内打开，随后自动删除，由数据库强制执行。',
    ja: '写真・音声メッセージ・ドキュメントは、送信から10分間だけ開け、その後は自動で削除されます。この仕組みはデータベースで強制されています。' },
  f7h: { id: 'Jurnal pribadi', en: 'Personal journal', ms: 'Jurnal peribadi', jv: 'Jurnal pribadi', su: 'Jurnal pribadi', zh: '私人日记', ja: 'プライベート日記' },
  f7p: {
    id: 'Tulis sampai 4.000 karakter, simpan dulu sebagai draf, lalu pilih tiap catatan: pribadi atau bisa dibaca sesama anggota. Bawaannya hanya kamu yang membaca.',
    en: 'Write up to 4,000 characters, save as a draft first, then choose for each entry: private or readable by other members. By default only you can read it.',
    ms: 'Tulis sehingga 4,000 aksara, simpan dahulu sebagai draf, kemudian pilih setiap catatan: peribadi atau boleh dibaca sesama ahli. Secara lalai hanya anda yang membacanya.',
    jv: 'Tulisen nganti 4.000 aksara, simpenen dhisik minangka konsep, banjur pilihen saben cathetan: pribadi utawa bisa diwaca anggota liyane. Standhare mung sampeyan sing maca.',
    su: 'Tulis nepi ka 4.000 aksara, simpen heula jadi draf, tuluy pilih unggal catetan: pribadi atawa bisa dibaca ku sasama anggota. Biasana ngan anjeun anu maca.',
    zh: '最多可写 4000 字，可先存为草稿，再为每条日记选择：私密，或让其他成员阅读。默认只有你能看到。',
    ja: '4,000文字まで書けて、まず下書きとして保存できます。ノートごとに「非公開」か「メンバーに公開」を選べ、初期設定ではあなただけが読めます。' },
  f8h: { id: 'Pertanyaan harian', en: 'Daily question', ms: 'Soalan harian', jv: 'Pitakon saben dina', su: 'Patarosan unggal poé', zh: '每日一问', ja: '今日の質問' },
  f8p: {
    id: 'Satu pertanyaan yang sama untuk semua orang setiap hari. Bingung mau menulis apa? Mulai dari sini.',
    en: 'One question, the same for everyone, every day. Not sure what to write? Start here.',
    ms: 'Satu soalan yang sama untuk semua orang setiap hari. Tidak pasti mahu tulis apa? Mulakan dari sini.',
    jv: 'Siji pitakon sing padha kanggo kabeh wong saben dina. Bingung arep nulis apa? Wiwiti saka kene.',
    su: 'Hiji patarosan anu sarua pikeun kabéh jalma unggal poé. Bingung rék nulis naon? Mimitian ti dieu.',
    zh: '每天一个问题，所有人都一样。不知道写什么？从这里开始。',
    ja: '毎日、全員に同じ質問がひとつ。何を書こうか迷ったら、ここから始めましょう。' }
};
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
let ubah = 0;

// 1. landing-teks.js, per blok bahasa
const fT = 'tools/landing-teks.js';
let teks = fs.readFileSync(fT, 'utf8');
for (const b of BAHASA) {
  const awal = teks.indexOf('T.' + b + ' = {');
  if (awal < 0) { console.log('BERHENTI: blok T.' + b + ' tidak ditemukan'); process.exit(1); }
  let akhir = teks.indexOf('\n};', awal); if (akhir < 0) { console.log('BERHENTI: akhir blok T.' + b); process.exit(1); }
  let blok = teks.slice(awal, akhir);
  if (blok.includes('f7h:')) { console.log('sudah ada: ' + b); continue; }
  const ganti = (kunci) => {
    const re = new RegExp(kunci + ": '(?:[^'\\\\]|\\\\.)*'");
    if (!re.test(blok)) { console.log('BERHENTI: ' + kunci + ' tidak ditemukan di blok ' + b); process.exit(1); }
    blok = blok.replace(re, () => kunci + ': ' + q(BARU[kunci][b]));
  };
  ['f1p', 'a4h', 'a4p'].forEach(ganti);
  const re6 = /(f6h: '(?:[^'\\]|\\.)*', f6p: '(?:[^'\\]|\\.)*',?)/;
  if (!re6.test(blok)) { console.log('BERHENTI: baris f6 tidak ditemukan di blok ' + b); process.exit(1); }
  blok = blok.replace(re6, (m0, m1) => m1.replace(/,?$/, ',') + '\n  f7h: ' + q(BARU.f7h[b]) + ', f7p: ' + q(BARU.f7p[b]) + ',\n  f8h: ' + q(BARU.f8h[b]) + ', f8p: ' + q(BARU.f8p[b]) + ',');
  teks = teks.slice(0, awal) + blok + teks.slice(akhir);
  console.log('dipasang: teks ' + b); ubah++;
  }
if (ubah) fs.writeFileSync(fT, teks);

// 2. Templat: dua kartu baru setelah f6
const fP = 'tools/landing-templat.html';
let tp = fs.readFileSync(fP, 'utf8');
if (tp.includes('{{f7h}}')) console.log('sudah ada: templat');
else {
  const i = tp.indexOf('<h3>{{f6h}}</h3><p>{{f6p}}</p></article>');
  if (i < 0) { console.log('BERHENTI: kartu f6 tidak ditemukan di templat'); process.exit(1); }
  const j = i + '<h3>{{f6h}}</h3><p>{{f6p}}</p></article>'.length;
  const k7 = '\n    <article><svg viewBox="0 0 24 24"><path d="M4 19.500A2.500 2.500 0 0 1 6.500 17H20"/><path d="M6.500 2H20v20H6.500A2.500 2.500 0 0 1 4 19.500v-15A2.500 2.500 0 0 1 6.500 2z"/></svg><h3>{{f7h}}</h3><p>{{f7p}}</p></article>';
  const k8 = '\n    <article><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 .900-1 1.700"/><path d="M12 17h.010"/></svg><h3>{{f8h}}</h3><p>{{f8p}}</p></article>';
  fs.writeFileSync(fP, tp.slice(0, j) + k7 + k8 + tp.slice(j)); console.log('dipasang: templat'); ubah++;
}

// 3. Catatan docs (tidak wajib)
(function () {
  const f = 'docs/fitur.md';
  if (!fs.existsSync(f)) return;
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('Landing: kartu fitur')) return;
  const t = '\n- Landing: kartu fitur kini 8 (ditambah Jurnal pribadi dan Pertanyaan harian) dan kartu pesan/keamanan menyebut dokumen. Teks di `tools/landing-teks.js`, kartu di `tools/landing-templat.html`; jalankan `node tools/buat-landing.js` setelah mengubahnya.\n';
  const m = s.indexOf('## Landing page 7 bahasa');
  if (m < 0) return;
  const akhir = s.indexOf('\n## ', m + 5);
  const sisip = akhir < 0 ? s.length : akhir;
  fs.writeFileSync(f, s.slice(0, sisip).replace(/\s*$/, '') + '\n' + t + s.slice(sisip)); console.log('dipasang: ' + f); ubah++;
})();

if (ubah) {
  console.log('\nMembuat ulang landing page...');
  cp.execSync('node tools/buat-landing.js', { stdio: 'inherit' });
  console.log('\nLanjut: node tools/naikkan-cache.js');
} else console.log('\nTidak ada perubahan.');

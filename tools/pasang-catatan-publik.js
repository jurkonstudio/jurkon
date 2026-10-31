// Memasang catatan publik: tombol di kartu (js/ui.js), skrip di 4 halaman, CSS, 21 kunci kamus (7 bahasa),
// label tab "Publik" -> "Semua", cache service worker, Sitemap di robots.txt, teks kebijakan privasi, dan dokumen.
// Idempoten dan semua-atau-tidak-sama-sekali: bila titik sisip berubah, skrip berhenti SEBELUM menulis.
// Urutan: jalankan sql/027_catatan_publik.sql di Supabase DULU, baru unggah kode ini.
// Pakai: node tools/pasang-catatan-publik.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const akar = path.join(__dirname, '..');
const baca = f => fs.readFileSync(path.join(akar, f), 'utf8');

// Berkas baru dari paket harus sudah ada (hasil unzip)
['sql/027_catatan_publik.sql', 'js/publik.js', 'js/n.js', 'n.html', 'worker/catatan-publik.js'].forEach(f => {
  if (!fs.existsSync(path.join(akar, f))) { console.error('Berkas paket belum ada: ' + f + '. Unzip paketnya dulu.'); process.exit(1); }
});

// Urutan bahasa: id, en, ms, jv, su, zh, ja (sama dengan js/bahasa.js)
const KAMUS = {
  'feed.publik': ['Semua', 'All', 'Semua', 'Kabèh', 'Sadaya', '全部', 'すべて'],
  'pub.tombol': ['Atur catatan publik', 'Public note settings', 'Tetapan nota awam', 'Setelan cathetan umum', 'Setélan catetan umum', '公开笔记设置', '公開ノートの設定'],
  'pub.judulAktif': ['Jadikan catatan ini publik?', 'Make this note public?', 'Jadikan nota ini awam?', 'Dadekake cathetan iki umum?', 'Jadikeun catetan ieu umum?', '要将这条笔记设为公开吗？', 'このノートを公開しますか？'],
  'pub.peringatan': [
    'Siapa pun bisa membacanya lewat tautan, termasuk orang tanpa akun dan mesin pencari seperti Google. Yang tampil: isi catatan, namamu, dan @username-mu. Salinan di luar Jurkon (tangkapan layar, cache mesin pencari) tidak bisa kami tarik kembali. Kamu bisa menjadikannya privat lagi kapan saja.',
    'Anyone can read it through the link, including people without an account and search engines like Google. What shows: the note, your name, and your @username. Copies outside Jurkon (screenshots, search engine caches) cannot be taken back by us. You can make it private again at any time.',
    'Sesiapa sahaja boleh membacanya melalui pautan, termasuk orang tanpa akaun dan enjin carian seperti Google. Yang dipaparkan: isi nota, nama anda, dan @username anda. Salinan di luar Jurkon (tangkap layar, cache enjin carian) tidak dapat kami tarik balik. Anda boleh menjadikannya persendirian semula pada bila-bila masa.',
    'Sapa wae bisa maca liwat tautan, kalebu wong tanpa akun lan mesin panggoleki kaya Google. Sing katon: isi cathetan, jenengmu, lan @username. Salinan ing njaba Jurkon (tangkepan layar, cache mesin panggoleki) ora bisa kita tarik maneh. Sampeyan bisa ndadekake privat manèh kapan wae.',
    'Saha waé tiasa maca ngaliwatan tautan, kaasup jalma tanpa akun jeung mesin pamaluruh sapertos Google. Anu mucunghul: eusi catetan, nami anjeun, jeung @username. Salinan di luar Jurkon (potrét layar, cache mesin pamaluruh) teu tiasa kami tarik deui. Anjeun tiasa ngajantenkeunana pribadi deui iraha waé.',
    '任何人都可以通过链接阅读，包括没有账号的人和 Google 等搜索引擎。显示内容：笔记内容、你的名字和 @用户名。Jurkon 之外的副本（截图、搜索引擎缓存）我们无法收回。你可以随时改回私密。',
    'リンクを知っている人なら誰でも、アカウントがない人や Google などの検索エンジンも含めて読めます。表示されるのは、ノートの内容、あなたの名前、@ユーザー名です。Jurkon の外にできたコピー（スクリーンショットや検索エンジンのキャッシュ）は取り消せません。いつでも非公開に戻せます。'],
  'pub.centang': ['Saya paham, dan catatan ini tidak berisi data pribadi.', 'I understand, and this note contains no personal data.', 'Saya faham, dan nota ini tidak mengandungi data peribadi.', 'Aku ngerti, lan cathetan iki ora ngemot data pribadi.', 'Abdi ngartos, jeung catetan ieu teu ngandung data pribadi.', '我明白，且这条笔记不含个人信息。', '理解しました。このノートに個人情報は含まれていません。'],
  'pub.btnPublik': ['Jadikan publik', 'Make public', 'Jadikan awam', 'Dadekake umum', 'Jadikeun umum', '设为公开', '公開する'],
  'pub.batal': ['Batal', 'Cancel', 'Batal', 'Batal', 'Batal', '取消', 'キャンセル'],
  'pub.judulPublik': ['Catatan ini publik', 'This note is public', 'Nota ini awam', 'Cathetan iki umum', 'Catetan ieu umum', '这条笔记是公开的', 'このノートは公開中です'],
  'pub.infoPublik': ['Siapa pun yang punya tautan ini bisa membukanya.', 'Anyone with this link can open it.', 'Sesiapa yang ada pautan ini boleh membukanya.', 'Sapa wae sing duwe tautan iki bisa mbukak.', 'Saha waé anu gaduh tautan ieu tiasa muka.', '任何拥有此链接的人都可以打开。', 'このリンクを知っている人は誰でも開けます。'],
  'pub.salin': ['Salin tautan', 'Copy link', 'Salin pautan', 'Salin tautan', 'Salin tautan', '复制链接', 'リンクをコピー'],
  'pub.bagikan': ['Bagikan', 'Share', 'Kongsi', 'Bagekna', 'Bagikeun', '分享', '共有'],
  'pub.privat': ['Jadikan privat lagi', 'Make private again', 'Jadikan persendirian semula', 'Dadekake privat manèh', 'Jadikeun pribadi deui', '改回私密', '非公開に戻す'],
  'pub.tutup': ['Tutup', 'Close', 'Tutup', 'Tutup', 'Tutup', '关闭', '閉じる'],
  'pub.tersalin': ['Tautan disalin.', 'Link copied.', 'Pautan disalin.', 'Tautan wis disalin.', 'Tautan disalin.', '链接已复制。', 'リンクをコピーしました。'],
  'pub.sudahPrivat': ['Catatan kembali privat. Tautan tidak berlaku lagi; mesin pencari butuh waktu untuk memperbarui hasilnya.', 'The note is private again. The link no longer works; search engines need some time to update their results.', 'Nota kembali persendirian. Pautan tidak lagi berfungsi; enjin carian perlukan masa untuk mengemas kini hasilnya.', 'Cathetan bali privat. Tautan ora bisa dienggo maneh; mesin panggoleki butuh wektu kanggo nganyari asile.', 'Catetan balik pribadi. Tautan teu tiasa dianggo deui; mesin pamaluruh peryogi waktos pikeun ngapdet hasilna.', '笔记已改回私密。链接已失效，搜索引擎需要一些时间更新结果。', 'ノートは非公開に戻りました。リンクは使えなくなります。検索エンジンの結果が更新されるまで時間がかかります。'],
  'pub.gagal': ['Gagal: {pesan}', 'Failed: {pesan}', 'Gagal: {pesan}', 'Gagal: {pesan}', 'Gagal: {pesan}', '失败：{pesan}', '失敗しました：{pesan}'],
  'pub.memuat': ['Memeriksa…', 'Checking…', 'Menyemak…', 'Mriksa…', 'Mariksa…', '检查中…', '確認中…'],
  'pub.hilang': ['Catatan ini tidak tersedia. Mungkin sudah dijadikan privat atau dihapus.', 'This note is not available. It may have been made private or deleted.', 'Nota ini tidak tersedia. Mungkin telah dijadikan persendirian atau dipadam.', 'Cathetan iki ora kasedhiya. Mungkin wis didadekake privat utawa dibusak.', 'Catetan ieu teu sayogi. Meureun parantos dijantenkeun pribadi atawa dihapus.', '这条笔记不可用，可能已改为私密或被删除。', 'このノートは利用できません。非公開になったか、削除された可能性があります。'],
  'pub.ajak': ['Jurkon adalah sosmed catatan singkat buatan orang Indonesia: 250 karakter, feed ada ujungnya.', 'Jurkon is a short-notes social network made in Indonesia: 250 characters, and a feed that ends.', 'Jurkon ialah media sosial nota ringkas buatan Indonesia: 250 aksara, suapan ada hujungnya.', 'Jurkon iku sosmed cathetan cekak gawéan Indonesia: 250 aksara, feed ana pungkasané.', 'Jurkon nyaéta sosmed catetan pondok damelan Indonésia: 250 aksara, feed aya tungtungna.', 'Jurkon 是印度尼西亚制造的短笔记社交网络：250 字以内，信息流有尽头。', 'Jurkon はインドネシア生まれの短文ノートSNS。250文字、終わりのあるフィードです。'],
  'pub.gabung': ['Gabung atau masuk', 'Join or log in', 'Sertai atau log masuk', 'Gabung utawa mlebu', 'Gabung atanapi lebet', '加入或登录', '参加またはログイン'],
  'pub.buka': ['Buka Jurkon', 'Open Jurkon', 'Buka Jurkon', 'Bukak Jurkon', 'Buka Jurkon', '打开 Jurkon', 'Jurkon を開く'],
  'pub.lapor': ['Laporkan catatan ini', 'Report this note', 'Laporkan nota ini', 'Laporake cathetan iki', 'Laporkeun catetan ieu', '举报这条笔记', 'このノートを報告']
};

const CSS = `
/* Catatan publik */
.post .aksi .btn-publik:hover,.post .aksi .btn-publik.aktif{color:var(--aksen)}
.post .aksi .btn-publik svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pub-dlg{border:1px solid var(--garis);border-radius:14px;background:var(--bg);color:var(--teks);padding:18px;width:min(92vw,440px)}
.pub-dlg::backdrop{background:rgba(0,0,0,.45)}
.pub-dlg h3{font-size:18px;margin-bottom:8px}
.pub-dlg p{color:var(--redup);font-size:14px;line-height:1.55;margin-bottom:12px}
.pub-dlg .pub-info{font-size:13px;margin-bottom:8px}
.pub-cek{display:flex;gap:8px;align-items:flex-start;font-size:14px;margin-bottom:10px}
.pub-cek input{margin-top:3px}
.pub-galat{color:var(--bahaya);font-size:14px;margin-bottom:8px}
.pub-galat:empty{display:none}
.pub-aksi{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pub-tautan{width:100%;padding:10px;border:1px solid var(--garis);border-radius:10px;background:var(--latar);color:var(--teks);font:inherit;font-size:14px;margin-bottom:10px}
.pub-halaman .post{border-bottom:0}
.pub-ajak{margin:16px;padding:16px;border:1px solid var(--garis);border-radius:14px;background:var(--latar);text-align:center}
.pub-ajak p{color:var(--redup);margin-bottom:12px}
.pub-lapor{margin:0 16px 8px;text-align:center}
.pub-lapor button{background:none;border:0;color:var(--redup);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}
`;

const PRIVASI_LAMA = '<li><b>Profil dan posting:</b> hanya anggota Jurkon yang sudah masuk. Orang yang belum masuk tidak bisa membacanya.</li>';
const PRIVASI_BARU = '<li><b>Profil dan posting:</b> hanya anggota Jurkon yang sudah masuk. Orang yang belum masuk tidak bisa membacanya, kecuali catatan yang kamu sendiri jadikan publik (lihat poin berikut).</li>\n' +
  '<li><b>Catatan publik (pilihan, per catatan):</b> secara bawaan semua catatanmu privat. Bila kamu menjadikan satu catatan utama publik, catatan itu, namamu, dan @username-mu bisa dibaca siapa pun lewat tautannya dan bisa diindeks mesin pencari seperti Google. Kamu bisa menjadikannya privat lagi kapan saja; tautannya langsung berhenti bekerja, tetapi salinan di luar Jurkon (tangkapan layar, cache mesin pencari) tidak bisa kami tarik kembali. Catatan publik tidak boleh memuat tautan, email, nomor telepon, atau sebutan @pengguna, dan pengelola dapat mencabut status publik catatan yang melanggar aturan.</li>';

const FITUR = `
## Catatan publik

Jalur masuk organik: penulis boleh menjadikan **satu catatan** bisa dibaca siapa pun (tanpa login) lewat tautan \`https://jurkon.my.id/n?id=<id>\`. Bawaan tetap privat.

- **Database:** jalankan \`sql/027_catatan_publik.sql\` (setelah 026). Tabel \`posts\` tetap tertutup untuk anon; dunia luar hanya lewat \`catatan_publik(id)\` dan \`daftar_publik()\`.
- **Cara pakai:** ikon globe di kartu catatan milik sendiri. Dialog menjelaskan akibatnya dan mewajibkan centang sebelum tombol "Jadikan publik" aktif. Ikon berwarna aksen = sedang publik. Di dialog yang sama ada Salin tautan, Bagikan, dan "Jadikan privat lagi".
- **Syarat (ditegakkan server):** email terverifikasi, akun tidak dibekukan, akun berumur 3 hari, maks 5 catatan publik per 24 jam, hanya catatan utama biasa (bukan balasan, kutipan, posting ulang, catatan berumur, kapsul waktu), lolos filter konten, tanpa tautan/email/nomor telepon/@sebutan, tidak sedang dilaporkan, dan tidak dikunci pengelola.
- **Yang tampil ke publik:** isi, tanggal, nama, @username, jumlah suka. Tanpa foto dan data profil lain.
- **Hilang otomatis dari publik:** dijadikan privat, dihapus, akun dibekukan, 3 laporan baru, atau dikunci pengelola. Pengelola: \`select admin_kunci_publik('<uuid catatan>', 'alasan');\` (buka kunci: \`admin_buka_kunci_publik\`).
- **Klien:** \`n.html\` + \`js/n.js\` (halaman baca, boleh diindeks, tombol Laporkan untuk anggota yang login), \`js/publik.js\` (tombol dan dialog), kamus \`pub.*\`.
- **Pratinjau WhatsApp/X dan sitemap:** butuh Worker Cloudflare, lihat \`worker/README.md\`. Tanpa Worker, fitur tetap jalan tetapi pratinjau tautan generik.
- Tab Beranda "Publik" diganti label "Semua" karena artinya hanya "semua catatan untuk anggota", bukan publik di internet.
`;

const HANDOFF = `## Migrasi 027: catatan publik

Kode selesai, **belum diuji** (sandbox tanpa Postgres dan browser). Urutan: jalankan \`sql/027_catatan_publik.sql\` dan pemeriksaannya, unggah kode, lalu (opsional) pasang Worker (\`worker/README.md\`). Ringkasan fitur dan syarat ada di \`docs/fitur.md\`, bagian "Catatan publik".

Uji: (1) di catatan sendiri ketuk ikon globe, tombol "Jadikan publik" harus mati sampai kotak dicentang; (2) buka \`n.html?id=<id>\` di jendela privat, catatan tampil tanpa login; (3) catatan berisi tautan, email, nomor telepon, atau @sebutan harus ditolak dengan pesan jelas; (4) "Jadikan privat lagi" lalu muat ulang halaman publik: harus tampil "tidak tersedia"; (5) balasan, kutipan, catatan berumur, kapsul: ditolak server; (6) anon tidak bisa \`select\` dari \`posts\`.
Catatan: setelah 019 dijalankan ulang, hak anon untuk \`catatan_publik\` dan \`daftar_publik\` harus dipasang lagi (bagian F di 027).

`;

const rencana = [];
function ubah(file, fn) {
  const asli = baca(file);
  const baru = fn(asli);
  if (baru !== asli) rencana.push([file, baru]);
}
function sisip(s, penanda, jangkar, ganti, nama) {
  if (s.includes(penanda)) return s;
  if (!s.includes(jangkar)) throw new Error('Titik sisip tidak ditemukan: ' + nama);
  return s.replace(jangkar, () => ganti);
}

// 1. Tombol di kartu catatan
ubah('js/ui.js', s => sisip(s, 'tombolPublik',
  "${typeof tombolSemat === 'function' ? tombolSemat(p, milik) : ''}",
  "${typeof tombolSemat === 'function' ? tombolSemat(p, milik) : ''}\n          ${typeof tombolPublik === 'function' ? tombolPublik(p, milik) : ''}",
  'js/ui.js (tombolSemat)'));

// 2. Skrip di halaman yang menampilkan kartu catatan
['index.html', 'detail.html', 'profil.html', 'explore.html'].forEach(f => ubah(f, s => sisip(s, 'js/publik.js',
  '<script src="js/data.js"></script>', '<script src="js/data.js"></script>\n<script src="js/publik.js"></script>', f + ' (data.js)')));

// 3. CSS
ubah('css/style.css', s => s.includes('/* Catatan publik */') ? s : s.replace(/\s*$/, '\n') + CSS);

// 4. Cache service worker
ubah('sw.js', s => sisip(s, "'/js/publik.js'", "'/js/reset.js', '/js/selamat.js',", "'/js/reset.js', '/js/selamat.js', '/js/publik.js',", 'sw.js (STATIS)'));

// 5. robots.txt
ubah('robots.txt', s => s.includes('sitemap-catatan.xml') ? s : s.replace(/\s*$/, '\n') + 'Sitemap: https://jurkon.my.id/sitemap-catatan.xml\n');

// 6. Kebijakan privasi
ubah('kebijakan-privasi.html', s => sisip(s, 'Catatan publik (pilihan', PRIVASI_LAMA, PRIVASI_BARU, 'kebijakan-privasi.html'));

// 7. Kamus (js/bahasa.js lalu dipecah ke js/bahasa/*.js)
ubah('js/bahasa.js', s => {
  if (s.includes("'pub.tombol'")) return s;
  const re = /'feed\.publik': \[[^\]]*\],/;
  if (!re.test(s)) throw new Error("Titik sisip tidak ditemukan: js/bahasa.js ('feed.publik')");
  const baris = Object.keys(KAMUS).map(k => "'" + k + "': " + JSON.stringify(KAMUS[k]) + ',').join('\n  ');
  return s.replace(re, () => baris);
});

// 8-10. Dokumen
ubah('sql/README.md', s => {
  if (s.includes('027_catatan_publik')) return s;
  const re = /(\| `026_sematkan_catatan\.sql`[^\n]*\n)/;
  if (!re.test(s)) throw new Error('Titik sisip tidak ditemukan: sql/README.md (baris 026)');
  return s.replace(re, (m) => m + '| `027_catatan_publik.sql` | catatan publik per catatan: kolom `publik`, `jadikan_publik()`/`jadikan_privat()`, `catatan_publik()` dan `daftar_publik()` (boleh anon), kunci pengelola | setelah 026; hasil cek: tepat 3 fungsi yang boleh dipanggil anon |\n');
});
ubah('docs/fitur.md', s => s.includes('## Catatan publik') ? s : s.replace(/\s*$/, '\n') + FITUR);
ubah('HANDOFF.md', s => {
  if (s.includes('Migrasi 027')) return s;
  const j = '## Aturan tetap';
  if (!s.includes(j)) throw new Error('Titik sisip tidak ditemukan: HANDOFF.md (Aturan tetap)');
  return s.replace(j, () => HANDOFF + j).replace(', jalur publik untuk pertumbuhan.', ', jalur publik untuk pertumbuhan (dikerjakan di Migrasi 027).');
});

// Semua titik sisip lolos: baru tulis
rencana.forEach(([f, isi]) => fs.writeFileSync(path.join(akar, f), isi));
console.log(rencana.length ? 'Diubah: ' + rencana.map(r => r[0]).join(', ') : 'Tidak ada yang perlu diubah (sudah terpasang).');

if (rencana.some(r => r[0] === 'js/bahasa.js')) {
  execFileSync('node', [path.join(__dirname, 'pecah-bahasa.js')], { cwd: akar, stdio: 'inherit' });
}
if (rencana.length) {
  execFileSync('node', [path.join(__dirname, 'naikkan-cache.js')], { cwd: akar, stdio: 'inherit' });
}
console.log('Selesai. Berikutnya: unggah semua berkas yang berubah + berkas baru dari paket.');

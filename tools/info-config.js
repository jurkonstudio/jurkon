// Konfigurasi bersama untuk halaman info statis per bahasa (Tentang, Privasi, Aturan, Bantuan, Ketentuan).
// Dipakai oleh tools/buat-info.js, tools/buat-sitemap.js, dan tools/landing-teks.js (tautan footer landing).
//
// TUNDA: kode bahasa yang halaman infonya sengaja BELUM diterbitkan (tidak dibuat, tidak masuk hreflang,
// sitemap, maupun footer landing). Contoh: const TUNDA = ['jv', 'su'];  untuk menunggu tinjauan penutur asli.
// Setelah mengubahnya jalankan:  node tools/buat-info.js && node tools/buat-landing.js && node tools/buat-sitemap.js
// Berkas hasil bahasa yang ditunda tidak dihapus otomatis; hapus sendiri folder/berkasnya bila pernah dibuat.
const TUNDA = [];

const BAHASA = [
  { kode: 'id', hl: 'id',      htmlLang: 'id',      ogLocale: 'id_ID', nama: 'Bahasa Indonesia' },
  { kode: 'en', hl: 'en',      htmlLang: 'en',      ogLocale: 'en_US', nama: 'English' },
  { kode: 'ms', hl: 'ms',      htmlLang: 'ms',      ogLocale: 'ms_MY', nama: 'Bahasa Melayu' },
  { kode: 'jv', hl: 'jv',      htmlLang: 'jv',      ogLocale: 'jv_ID', nama: 'Basa Jawa' },
  { kode: 'su', hl: 'su',      htmlLang: 'su',      ogLocale: 'su_ID', nama: 'Basa Sunda' },
  { kode: 'zh', hl: 'zh-Hans', htmlLang: 'zh-Hans', ogLocale: 'zh_CN', nama: '中文（简体）' },
  { kode: 'ja', hl: 'ja',      htmlLang: 'ja',      ogLocale: 'ja_JP', nama: '日本語' }
];

// kunci -> berkas Indonesia, nama berkas di /<kode>/<slug>.html, kunci di INFO_T (null = Ketentuan, dari ketentuan-bahasa.js)
const HALAMAN = {
  tentang:   { id: 'tentang.html',           slug: 'about',   info: 'tentang' },
  privasi:   { id: 'kebijakan-privasi.html', slug: 'privacy', info: 'privasi' },
  aturan:    { id: 'aturan.html',            slug: 'rules',   info: 'aturan' },
  bantuan:   { id: 'pusat-bantuan.html',     slug: 'help',    info: 'bantuan' },
  ketentuan: { id: 'ketentuan-layanan.html', slug: 'terms',   info: null }
};

const AKTIF = BAHASA.filter(b => b.kode === 'id' || !TUNDA.includes(b.kode));          // termasuk Indonesia
const TERBIT = {};                                                                      // halaman -> kode bahasa non-Indonesia yang terbit
for (const h of Object.keys(HALAMAN)) TERBIT[h] = AKTIF.filter(b => b.kode !== 'id').map(b => b.kode);

const alamat = (kode, h) => kode === 'id' ? '/' + HALAMAN[h].id : '/' + kode + '/' + HALAMAN[h].slug + '.html';
const X_DEFAULT = 'en';

module.exports = { TUNDA, BAHASA, HALAMAN, AKTIF, TERBIT, alamat, X_DEFAULT };

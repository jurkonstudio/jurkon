// Daftar kata & frasa yang tidak diperbolehkan. SATU-SATUNYA sumber data filter.
// Dipakai oleh js/filter.js (peringatan langsung di layar) dan tools/buat-filter-sql.js
// (membuat sql/004_filter_konten.sql agar aturan yang sama dijaga di database).
//
// Cara mengubah daftar:
//   1. Tambah/hapus istilah di bawah. Tulis huruf kecil biasa; variasi seperti "j0di", "j.u.d.i",
//      atau "juuudi" otomatis ikut terdeteksi.
//   2. Jalankan:  node tools/buat-filter-sql.js
//   3. Jalankan isi sql/004_filter_konten.sql lagi di Supabase (aman diulang).
//
// Tingkat:
//   'blokir'     = tidak bisa dikirim sama sekali (dicek juga di database).
//   'peringatan' = pengguna diberi tahu dan boleh memperhalus atau tetap mengirim.
//
// Prinsip: hanya frasa yang jelas bermasalah yang diblokir. Kata yang punya arti sehari-hari
// ("judi" sebagai topik diskusi, "anjing" sebagai hewan) cukup diberi peringatan atau tidak
// dimasukkan, supaya tidak menghalangi percakapan biasa.

const FILTER_KATEGORI = {
  judi: {
    tingkat: 'blokir',
    pesan: 'Promosi judi (judi online, togel, slot) dilarang di Indonesia dan tidak diperbolehkan di Jurkon.',
    istilah: [
      'judi online', 'judol', 'judi slot', 'situs judi', 'agen judi', 'bandar judi', 'link judi', 'daftar judi',
      'slot gacor', 'slot online', 'slot maxwin', 'situs slot', 'link slot', 'daftar slot', 'bandar slot', 'agen slot',
      'togel', 'bandar togel', 'agen togel', 'sbobet', 'casino online', 'kasino online', 'agen bola', 'taruhan bola',
      'judi bola', 'judi poker', 'link alternatif'
    ]
  },
  dewasa: {
    tingkat: 'blokir',
    pesan: 'Konten dewasa atau kata vulgar bersifat seksual tidak diperbolehkan di Jurkon.',
    istilah: [
      'bokep', 'video bokep', 'link bokep', 'video syur', 'ngentot', 'ngewe', 'memek', 'kontol', 'peler',
      'open bo', 'jasa open bo', 'pijat plus', 'layanan esek', 'jual video dewasa'
    ]
  },
  narkoba: {
    tingkat: 'blokir',
    pesan: 'Jual-beli atau ajakan memakai narkoba melanggar hukum dan tidak diperbolehkan di Jurkon.',
    istilah: [
      'jual sabu', 'beli sabu', 'sabu murah', 'ready sabu', 'jual ganja', 'beli ganja', 'ready ganja',
      'jual narkoba', 'beli narkoba', 'jual ekstasi', 'jual pil koplo', 'jual tembakau gorila', 'jual inex'
    ]
  },
  penipuan: {
    tingkat: 'blokir',
    pesan: 'Tawaran yang mengarah ke penipuan, pembobolan, atau jual-beli data pribadi tidak diperbolehkan di Jurkon.',
    istilah: [
      'jual data nasabah', 'jual data pribadi', 'jual ktp', 'beli ktp', 'jasa bobol', 'jasa pembobolan', 'jasa hack',
      'jasa hacker', 'jual akun bank', 'sewa rekening', 'jual rekening', 'carding', 'pinjol cair', 'pinjaman cair'
    ]
  },
  ancaman: {
    tingkat: 'blokir',
    pesan: 'Ancaman kepada orang lain tidak diperbolehkan. Kalau sedang kesal, coba tarik napas dulu atau ceritakan dengan kalimat yang tenang.',
    istilah: [
      'kubunuh', 'ku bunuh', 'aku bunuh', 'gue bunuh', 'gua bunuh', 'saya bunuh', 'bunuh kamu', 'bunuh lu', 'bunuh lo',
      'bunuh elu', 'bunuh kau', 'bunuh dia', 'kuhabisi', 'ku habisi', 'habisi kamu', 'habisi lu', 'habisi lo', 'kubacok', 'ku bacok',
      'tak bacok', 'bakar rumahmu', 'bakar rumah lu', 'bakar rumah kamu', 'kuperkosa', 'ku perkosa'
    ]
  },
  sara: {
    tingkat: 'blokir',
    pesan: 'Ujaran kebencian terhadap suku, agama, ras, atau golongan tidak diperbolehkan di Jurkon.',
    istilah: [
      'cina babi', 'kafir laknat', 'bunuh semua', 'bantai semua', 'halal darahnya', 'halalkan darah',
      'papua monyet', 'monyet papua', 'usir semua cina', 'usir cina'
    ]
  },
  kasar: {
    tingkat: 'peringatan',
    pesan: 'Tulisanmu memuat kata kasar. Mau diperhalus supaya lebih nyaman dibaca orang lain?',
    istilah: [
      'anjing', 'anjg', 'bangsat', 'bajingan', 'brengsek', 'tolol', 'goblok', 'idiot', 'sialan', 'keparat',
      'asu', 'babi', 'bacot', 'jancok', 'jancuk', 'mampus', 'lonte', 'pelacur', 'jablay', 'sampah masyarakat',
      'kampungan', 'dasar monyet', 'setan lu', 'setan lo'
    ]
  }
};

// Pola mentah (regex) untuk data pribadi. Dicocokkan ke teks asli (huruf kecil), bukan teks yang disamarkan.
const FILTER_POLA = [
  {
    k: 'nik', tingkat: 'blokir',
    pola: '(^|[^0-9])[0-9]{16}([^0-9]|$)',
    pesan: 'Sepertinya ada nomor KTP/NIK (16 digit). Jangan bagikan data pribadi, milikmu maupun orang lain.'
  },
  {
    k: 'telepon', tingkat: 'peringatan',
    pola: '(^|[^0-9])(\\+62|62|0)[ .-]?8[1-9][0-9]([ .-]?[0-9]){6,9}([^0-9]|$)',
    pesan: 'Sepertinya ada nomor telepon. Posting terlihat oleh semua anggota, jadi pastikan itu milikmu dan kamu memang ingin membagikannya.'
  }
];

// Huruf yang sering diganti angka/simbol untuk menyamarkan kata ("j0di", "t0g3l", "s1t5").
const FILTER_SAMAR = { a: '4@', e: '3', i: '1!|', o: '0', s: '5$' };

if (typeof module !== 'undefined') module.exports = { FILTER_KATEGORI, FILTER_POLA, FILTER_SAMAR };

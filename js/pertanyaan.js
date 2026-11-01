// Pertanyaan harian: satu pertanyaan sama untuk semua orang tiap hari (hari menurut WIB).
// Jawabannya catatan biasa yang ditandai posts.pertanyaan_tgl (sql/032_pertanyaan_harian.sql).
// Berkas ini memuat daftar pertanyaan, pembantu tanggal, dan kartu di Beranda (#pertanyaan).
// Halaman penuh ada di pertanyaan.html + js/pertanyaan-halaman.js.
//
// Menambah pertanyaan: tambahkan di AKHIR daftar, lalu jalankan  node tools/buat-bank-pertanyaan-sql.js  dan tempel
// hasilnya di Supabase SEBELUM mengunggah berkas ini (server memeriksa teks pertanyaan di tiap jawaban).
//  Urutan memakai sisa bagi (hari ke-N mod jumlah),
// jadi menambah jumlah pertanyaan mengubah pertanyaan untuk hari-hari berikutnya.
const PQ_BANK = [
  'Apa satu hal kecil yang bikin harimu lebih baik hari ini?',
  'Siapa yang ingin kamu ucapkan terima kasih, tapi belum sempat?',
  'Kalau hari ini punya judul, apa judulnya?',
  'Apa yang kamu pelajari minggu ini?',
  'Makanan apa yang paling bikin kamu merasa pulang ke rumah?',
  'Apa yang ingin kamu ingat dari hari ini setahun lagi?',
  'Satu kebiasaan kecil apa yang pelan-pelan mengubah hidupmu?',
  'Lagu apa yang paling sering kamu putar akhir-akhir ini, dan kenapa?',
  'Apa yang sedang kamu tunggu-tunggu?',
  'Kapan terakhir kali kamu tertawa sampai lupa waktu?',
  'Apa nasihat terbaik yang pernah kamu terima?',
  'Kalau boleh bicara dengan dirimu lima tahun lalu, apa yang kamu bilang?',
  'Tempat mana yang membuatmu paling tenang?',
  'Apa yang kamu syukuri hari ini, sekecil apa pun?',
  'Pekerjaan rumah apa yang diam-diam kamu nikmati?',
  'Apa yang ingin kamu coba, tapi belum berani?',
  'Siapa yang paling sering terlintas di pikiranmu minggu ini?',
  'Apa satu hal yang ingin kamu lepaskan bulan ini?',
  'Ceritakan satu kenangan masa kecil yang masih hangat.',
  'Apa yang membuatmu merasa cukup?',
  'Buku, film, atau tontonan apa yang meninggalkan bekas di kepalamu?',
  'Kebaikan kecil apa yang pernah orang lakukan untukmu?',
  'Kalau besok libur penuh, apa yang akan kamu lakukan?',
  'Apa yang kamu harapkan dari dirimu sendiri bulan depan?',
  'Hal apa yang dulu terasa besar, sekarang terasa kecil?',
  'Apa yang kamu banggakan minggu ini, walau tidak ada yang tahu?',
  'Aroma apa yang langsung mengingatkanmu pada sesuatu?',
  'Apa yang sedang kamu belajar terima?',
  'Apa yang kamu lakukan saat butuh menenangkan diri?',
  'Kalau kamu menulis surat untuk dirimu setahun lagi, kalimat pertamanya apa?',
  'Siapa yang membuatmu merasa dimengerti?',
  'Apa satu hal sederhana yang selalu memperbaiki suasana hatimu?',
  'Apa yang ingin kamu lakukan lebih sering?',
  'Apa yang ingin kamu lakukan lebih jarang?',
  'Momen paling tenang apa yang kamu alami hari ini?',
  'Mimpi kecil apa yang masih kamu simpan?',
  'Kata apa yang paling menggambarkan minggumu?',
  'Apa yang kamu rindukan akhir-akhir ini?',
  'Ceritakan seseorang yang diam-diam kamu kagumi.',
  'Keputusan kecil apa yang ternyata berdampak besar?',
  'Hal baik apa yang terjadi tanpa kamu duga?',
  'Apa yang ingin kamu katakan pada dirimu pagi ini?',
  'Kebiasaan apa dari keluargamu yang ingin kamu bawa terus?',
  'Apa yang membuatmu merasa hidup?',
  'Tulis satu hal yang ingin kamu maafkan, dari dirimu atau orang lain.',
  'Apa yang kamu cari dari hari-hari biasa?',
  'Siapa yang ingin kamu hubungi lagi?',
  'Apa yang kamu harap orang tahu tentangmu?',
  'Pencapaian kecil apa yang kemarin belum terasa, tapi hari ini terasa?',
  'Kalau hidupmu sebuah buku, bab yang sedang kamu jalani bercerita tentang apa?',
  'Benda apa yang paling punya cerita di kamarmu?',
  'Apa yang ingin kamu pelajari tahun depan?',
  'Apa yang kamu lakukan hari ini yang akan kamu syukuri nanti?',
  'Apa tujuan kecilmu untuk besok?',
  'Apa yang membuatmu merasa tenang sebelum tidur?',
  'Ceritakan hari terbaik yang bisa kamu ingat.',
  'Apa yang sedang kamu syukuri dari orang di sekitarmu?',
  'Apa yang kamu ingin dunia punya lebih banyak?',
  'Apa satu janji kecil yang ingin kamu tepati pada dirimu sendiri?',
  'Apa kabarmu sebenarnya hari ini, jujur saja?'
];
const PQ_AWAL = Date.UTC(2026, 0, 1);

// Tanggal WIB (YYYY-MM-DD) dari milidetik; bebas dari zona waktu perangkat, sama dengan aturan server (Asia/Jakarta)
function pqTanggal(ms) { return new Date((ms == null ? Date.now() : ms) + 7 * 36e5).toISOString().slice(0, 10); }
function pqGeser(tgl, n) { const [y, m, d] = tgl.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
function pqTeks(tgl) {
  const [y, m, d] = tgl.split('-').map(Number);
  const hari = Math.round((Date.UTC(y, m - 1, d) - PQ_AWAL) / 864e5), n = PQ_BANK.length;
  return PQ_BANK[((hari % n) + n) % n];
}

// { jumlah, sudah } untuk satu tanggal; null bila migrasi 032 belum dijalankan (fitur diam-diam tidak tampil)
async function pqStatus(tgl, saya) {
  const [a, b] = await Promise.all([
    db.from('posts').select('id', { count: 'exact', head: true }).eq('pertanyaan_tgl', tgl),
    db.from('posts').select('id').eq('user_id', saya.id).eq('pertanyaan_tgl', tgl).limit(1)
  ]);
  if (a.error || b.error) return null;
  return { jumlah: a.count || 0, sudah: !!(b.data && b.data.length) };
}

// Kartu di Beranda
(async function pqKartu() {
  const el = document.getElementById('pertanyaan');
  if (!el) return;
  const saya = await wajibLogin();
  if (!saya) return;
  const tgl = pqTanggal(), teks = pqTeks(tgl);
  async function gambar() {
    const s = await pqStatus(tgl, saya);
    if (!s) { el.hidden = true; return; }
    el.innerHTML = '<div class="ringkasan-kepala"><b>' + esc(t('pq.judul')) + '</b></div>' +
      '<p class="pq-teks">' + esc(teks) + '</p><div class="pq-baris">' +
      (s.sudah ? '<span class="pq-hitung pq-ok">\u2713 ' + esc(t('pq.sudah')) + '</span>'
        : '<button type="button" class="btn kecil pq-jawab">' + esc(t('pq.jawab')) + '</button>') +
      '<a class="pq-lihat" href="pertanyaan.html">' + esc(s.jumlah ? t('pq.hitung', { n: s.jumlah }) : t('pq.lihat')) + ' \u2192</a></div>';
    el.hidden = false;
  }
  el.addEventListener('click', e => {
    if (e.target.closest('.pq-jawab') && window.Tulis) window.Tulis.buka({ pertanyaan: { tgl, teks } });
  });
  document.addEventListener('jurkon:terkirim', e => { if (e.detail && e.detail.mode === 'jawab') gambar(); });
  gambar();
})();

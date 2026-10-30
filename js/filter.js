// Pemeriksa konten: kata/frasa yang dilarang di Indonesia atau aturan Jurkon.
// Bergantung pada js/filter-data.js (dimuat sebelum file ini).
// Pemeriksaan di sini untuk kenyamanan pengguna (peringatan langsung). Penjagaan sebenarnya
// ada di database (sql/004_filter_konten.sql), jadi tidak bisa dilewati lewat skrip.

const FILTER_PISAH = '[._*-]*';      // pemisah yang disisipkan untuk menyamarkan kata: "j.u.d.i"
const FILTER_PAGAR_KIRI = '(^|[^a-z0-9])';
const FILTER_PAGAR_KANAN = '($|[^a-z0-9])';

function filterPolaIstilah(istilah) {
  const kata = istilah.split(' ').map(k => Array.from(k).map(h => {
    const ganti = FILTER_SAMAR[h] || '';
    const kelas = ganti ? '[' + h + ganti + ']' : h;
    return kelas + '+';
  }).join(FILTER_PISAH));
  return FILTER_PAGAR_KIRI + kata.join('[^a-z0-9]+') + FILTER_PAGAR_KANAN;
}

// Daftar aturan siap pakai: { k, tingkat, pesan, re, nama }
const FILTER_ATURAN = [];
for (const [k, kat] of Object.entries(FILTER_KATEGORI)) {
  for (const istilah of kat.istilah) {
    FILTER_ATURAN.push({ k, tingkat: kat.tingkat, pesan: kat.pesan, istilah, re: new RegExp(filterPolaIstilah(istilah), 'i') });
  }
}
for (const p of FILTER_POLA) {
  FILTER_ATURAN.push({ k: p.k, tingkat: p.tingkat, pesan: p.pesan, istilah: null, re: new RegExp(p.pola, 'i'), mentah: true });
}

function filterNormal(teks) {
  return String(teks || '')
    .normalize('NFKD').replace(/[\u0300-\u036f\u200b-\u200d\ufeff]/g, '')
    .toLowerCase();
}

// Hasil: { tingkat: 'blokir' | 'peringatan' | null, kategori, pesan, kata }
// Jika ada beberapa temuan, tingkat 'blokir' didahulukan.
function periksaKonten(teks) {
  const t = filterNormal(teks);
  if (!t.trim()) return { tingkat: null };
  let peringatan = null;
  for (const a of FILTER_ATURAN) {
    if (!a.re.test(t)) continue;
    const hasil = { tingkat: a.tingkat, kategori: a.k, pesan: a.pesan, kata: a.istilah };
    if (a.tingkat === 'blokir') return hasil;
    if (!peringatan) peringatan = hasil;
  }
  return peringatan || { tingkat: null };
}

// Kata yang ditandai untuk ditampilkan dalam pesan, mis. "anjing". Data pribadi tidak diulang.
function filterSebut(h) { return h.kata ? ' (' + t('filter.kata', { kata: h.kata }) + ')' : ''; }

// Teks peringatan dalam bahasa yang sedang dipakai. Cadangan: teks Indonesia bawaan di filter-data.js.
function filterPesan(h) {
  const kunci = 'filter.' + h.kategori;
  return (typeof I18N_KAMUS !== 'undefined' && I18N_KAMUS[kunci]) ? t(kunci) : h.pesan;
}

// Dipanggil tepat sebelum mengirim. Mengembalikan true jika boleh lanjut.
//   tampilkan(pesan) dipakai untuk menampilkan alasan penolakan (mis. mengisi elemen galat).
function bolehKirim(teks, tampilkan) {
  const h = periksaKonten(teks);
  if (h.tingkat === 'blokir') { tampilkan(filterPesan(h) + filterSebut(h)); return false; }
  if (h.tingkat === 'peringatan') return confirm(filterPesan(h) + filterSebut(h) + '\n\n' + t('filter.konfirmasi'));
  return true;
}

// Saran langsung saat mengetik: muncul di bawah kotak tulis sebelum pengguna menekan Kirim.
function pasangFilter(textarea) {
  const el = document.createElement('div');
  el.className = 'saran'; el.setAttribute('role', 'status'); el.hidden = true;
  const sisip = textarea.closest('.form, .kirim') ? (textarea.parentNode.querySelector('.baris') || textarea) : textarea;
  sisip.after(el);
  let t;
  textarea.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const h = periksaKonten(textarea.value);
      el.hidden = !h.tingkat;
      if (!h.tingkat) return;
      el.className = 'saran ' + h.tingkat;
      el.textContent = filterPesan(h) + filterSebut(h);
    }, 350);
  });
  return el;
}

// Pesan dari database bila lolos dari pemeriksaan di layar. Format: KONTEN_DILARANG|kategori
function pesanKontenDilarang(error) {
  const m = (error && error.message) || '';
  if (!m.includes('KONTEN_DILARANG')) return null;
  const k = (m.split('KONTEN_DILARANG|')[1] || '').trim().split(/\s/)[0];
  return filterPesan({ kategori: k, pesan: (FILTER_KATEGORI[k] && FILTER_KATEGORI[k].pesan) || (FILTER_POLA.find(p => p.k === k) || {}).pesan || t('filter.umum') });
}

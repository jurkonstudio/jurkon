// Memasang kapsul waktu: pilihan "Kapsul waktu" di lembar tulis, daftar "Kapsul saya" (lihat/batalkan),
// label "Kapsul waktu, ditulis ..." di kartu, 14 kunci kamus, dan baris di sql/README.md.
// Idempoten dan semua-atau-tidak-sama-sekali: bila titik sisip berubah, skrip berhenti SEBELUM menulis.
// Urutan: jalankan sql/024_kapsul_waktu.sql di Supabase DULU, baru unggah kode ini.
// Pakai: node tools/pasang-kapsul-waktu.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const akar = path.join(__dirname, '..');

// ---------- Kode yang disisipkan ----------
const TGL = String.raw`// Tanggal panjang sesuai bahasa aktif ("31 Oktober 2026")
function tglPanjang(iso) {
  return new Date(iso).toLocaleDateString(I18n.locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

`;

const KAPSUL_HTML = String.raw`'</option><option value="168">' + esc(t('tulis.umur7')) + '</option></select></div>' +
      '<div class="umur-catatan" id="tulisKapsulBox" hidden><label for="tulisKapsul">' + esc(t('tulis.kapsul')) + '</label>' +
      '<select id="tulisKapsul"><option value="">' + esc(t('tulis.kapsulTidak')) + '</option>' +
      '<option value="1">' + esc(t('tulis.kapsul1')) + '</option><option value="7">' + esc(t('tulis.kapsul7')) + '</option>' +
      '<option value="30">' + esc(t('tulis.kapsul30')) + '</option><option value="365">' + esc(t('tulis.kapsul365')) + '</option>' +
      '<option value="tgl">' + esc(t('tulis.kapsulTanggal')) + '</option></select>' +
      '<input type="date" id="tulisKapsulTgl" hidden>' +
      '<button type="button" class="tautan-kapsul" id="tulisKapsulLihat">' + esc(t('tulis.kapsulLihat')) + '</button></div>' +`;

const FUNGSI = String.raw`// ===== Kapsul waktu =====
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function pasangKapsul() {
    const pilih = dlg.querySelector('#tulisKapsul'), tgl = dlg.querySelector('#tulisKapsulTgl'), umur = dlg.querySelector('#tulisUmur');
    const besok = new Date(); besok.setDate(besok.getDate() + 1);
    const maks = new Date(); maks.setDate(maks.getDate() + 365);
    tgl.min = ymd(besok); tgl.max = ymd(maks);
    // Kapsul waktu dan "hilang setelah" tidak boleh dipakai bersamaan
    pilih.addEventListener('change', () => { tgl.hidden = pilih.value !== 'tgl'; if (pilih.value) umur.value = '0'; });
    umur.addEventListener('change', () => { if (umur.value !== '0') { pilih.value = ''; tgl.hidden = true; } });
    dlg.querySelector('#tulisKapsulLihat').addEventListener('click', daftarKapsul);
  }

  // Waktu buka (ISO) | null bila langsung tayang | false bila tanggal belum dipilih
  function waktuKapsul() {
    const v = dlg.querySelector('#tulisKapsul').value;
    if (!v) return null;
    if (v === 'tgl') {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dlg.querySelector('#tulisKapsulTgl').value);
      if (!m) return false;
      return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0).toISOString();
    }
    return new Date(Date.now() + (+v) * 864e5).toISOString();
  }

  let dlgK = null;
  async function daftarKapsul() {
    if (!dlgK) {
      dlgK = document.createElement('dialog');
      dlgK.className = 'lembar';
      dlgK.setAttribute('aria-labelledby', 'kapsulJudul');
      dlgK.innerHTML = '<div class="lembar-kepala"><h2 id="kapsulJudul"></h2>' +
        '<button type="button" class="ikon-btn" data-tutup aria-label="' + esc(t('umum.tutup')) + '">' + IKON_TUTUP + '</button></div>' +
        '<div class="form" id="kapsulIsi"></div>';
      document.body.appendChild(dlgK);
      dlgK.querySelector('#kapsulJudul').textContent = t('tulis.kapsulLihat');
      dlgK.addEventListener('click', async e => {
        if (e.target === dlgK || e.target.closest('[data-tutup]')) { dlgK.close(); return; }
        const b = e.target.closest('[data-batal]');
        if (!b || !confirm(t('kapsul.konfirmBatal'))) return;
        b.disabled = true;
        const { error } = await db.rpc('batalkan_kapsul', { p_id: b.dataset.batal });
        if (error) { toast(pesan(error)); b.disabled = false; return; }
        isiKapsul();
      });
    }
    dlgK.showModal();
    isiKapsul();
  }

  async function isiKapsul() {
    const kotak = dlgK.querySelector('#kapsulIsi');
    const { data, error } = await db.rpc('kapsul_saya');
    if (error) { kotak.textContent = pesan(error); return; }
    kotak.innerHTML = data && data.length
      ? data.map(k => '<div class="kapsul-item"><p>' + esc(String(k.content).slice(0, 140)) + '</p><div class="kapsul-baris"><span>' +
          esc(t('kapsul.buka', { tgl: tglPanjang(k.terbuka_pada) })) + '</span><button type="button" class="btn garis" data-batal="' +
          esc(k.id) + '">' + esc(t('kapsul.batal')) + '</button></div></div>').join('')
      : '<p class="kapsul-kosong">' + esc(t('kapsul.kosong')) + '</p>';
  }

  `;

const LABEL_KARTU = '\n      ${p.kapsul_ditulis ? \'<div class="berumur">\' + esc(t(\'pc.kapsulDitulis\', { tgl: tglPanjang(p.kapsul_ditulis) })) + \'</div>\' : \'\'}';

const KIRIM_LAMA = "else { const jam = +(dlg.querySelector('#tulisUmur') || {}).value || 0; if (jam > 0) baris.kedaluwarsa = new Date(Date.now() + jam * 36e5).toISOString(); }";
const KIRIM_BARU = "else {\n      const jam = +(dlg.querySelector('#tulisUmur') || {}).value || 0; if (jam > 0) baris.kedaluwarsa = new Date(Date.now() + jam * 36e5).toISOString();\n" +
  "      const kp = waktuKapsul();\n" +
  "      if (kp === false) { galat.textContent = t('tulis.kapsulPilih'); sibuk = false; kirimBtn.disabled = false; return; }\n" +
  "      if (kp) baris.terbuka_pada = kp;\n    }";

const BUKA_LAMA = "dlg.querySelector('#tulisUmurBox').hidden = mode !== 'tulis'; dlg.querySelector('#tulisUmur').value = '0';";
const BUKA_BARU = BUKA_LAMA + "\n    dlg.querySelector('#tulisKapsulBox').hidden = mode !== 'tulis'; dlg.querySelector('#tulisKapsul').value = ''; dlg.querySelector('#tulisKapsulTgl').value = ''; dlg.querySelector('#tulisKapsulTgl').hidden = true;";

// [berkas, lama, baru, tandaSudahAda]   (lama harus muncul tepat 1x)
const GANTI = [
  ['js/data.js', 'kedaluwarsa: r.kedaluwarsa || null', 'kedaluwarsa: r.kedaluwarsa || null,\n    kapsul_ditulis: r.kapsul_ditulis || null', 'kapsul_ditulis: r.kapsul_ditulis'],
  ['js/ui.js', '// Label sisa waktu untuk catatan berumur', TGL + '// Label sisa waktu untuk catatan berumur', 'function tglPanjang('],
  ['js/ui.js', '<div class="berumur">${esc(labelBerumur(p.kedaluwarsa))}</div>` : \'\'}',
    '<div class="berumur">${esc(labelBerumur(p.kedaluwarsa))}</div>` : \'\'}' + LABEL_KARTU, "t('pc.kapsulDitulis'"],
  ['js/tulis.js', `'</option><option value="168">' + esc(t('tulis.umur7')) + '</option></select></div>' +`, KAPSUL_HTML, 'id="tulisKapsulBox"'],
  ['js/tulis.js', "kirimBtn.addEventListener('click', kirim);", "kirimBtn.addEventListener('click', kirim);\n    pasangKapsul();", 'pasangKapsul();'],
  ['js/tulis.js', 'function tutup() { if (dlg && dlg.open) dlg.close(); }', FUNGSI + 'function tutup() { if (dlg && dlg.open) dlg.close(); }', 'function pasangKapsul('],
  ['js/tulis.js', KIRIM_LAMA, KIRIM_BARU, 'baris.terbuka_pada = kp'],
  ['js/tulis.js', BUKA_LAMA, BUKA_BARU, "'#tulisKapsulBox').hidden"],
  ['js/tulis.js', "toast(t('tulis.terkirim'));", "toast(baris.terbuka_pada ? t('tulis.kapsulTerkirim', { tgl: tglPanjang(baris.terbuka_pada) }) : t('tulis.terkirim'));", "t('tulis.kapsulTerkirim'"],
  ['sql/README.md', '\n\nCatatan nama: `014a` dan', '\n| `023_catatan_berumur.sql` | catatan berumur (hilang otomatis), kolom `kedaluwarsa` di feed | setelah 021 |\n\nCatatan nama: `014a` dan', '023_catatan_berumur'],
  ['sql/README.md', '\n\nCatatan nama: `014a` dan', '\n| `024_kapsul_waktu.sql` | kapsul waktu: kolom `terbuka_pada`, kebijakan baca, `kapsul_saya()`, `batalkan_kapsul()`, kolom `kapsul_ditulis` di feed | setelah 023 |\n\nCatatan nama: `014a` dan', '024_kapsul_waktu'],
];

const KAMUS = {
  'tulis.kapsul': ['Kapsul waktu', 'Time capsule', 'Kapsul masa', 'Kapsul wektu', 'Kapsul waktos', '时间胶囊', 'タイムカプセル'],
  'tulis.kapsulTidak': ['Langsung tayang', 'Post now', 'Terbit sekarang', 'Langsung tayang', 'Langsung tayang', '立即发布', 'すぐに公開'],
  'tulis.kapsul1': ['Buka besok', 'Opens tomorrow', 'Dibuka esok', 'Dibukak sesuk', 'Dibuka isukan', '明天开启', '明日開く'],
  'tulis.kapsul7': ['Buka 1 minggu lagi', 'Opens in 1 week', 'Dibuka dalam 1 minggu', 'Dibukak seminggu maneh', 'Dibuka saminggu deui', '1 周后开启', '1週間後に開く'],
  'tulis.kapsul30': ['Buka 1 bulan lagi', 'Opens in 1 month', 'Dibuka dalam 1 bulan', 'Dibukak sewulan maneh', 'Dibuka sabulan deui', '1 个月后开启', '1か月後に開く'],
  'tulis.kapsul365': ['Buka 1 tahun lagi', 'Opens in 1 year', 'Dibuka dalam 1 tahun', 'Dibukak setaun maneh', 'Dibuka sataun deui', '1 年后开启', '1年後に開く'],
  'tulis.kapsulTanggal': ['Pilih tanggal…', 'Pick a date…', 'Pilih tarikh…', 'Pilih tanggal…', 'Pilih tanggal…', '选择日期…', '日付を選ぶ…'],
  'tulis.kapsulPilih': ['Pilih tanggal buka kapsul dulu.', 'Pick the capsule’s opening date first.', 'Pilih tarikh buka kapsul dahulu.', 'Pilih tanggal bukak kapsul disik.', 'Pilih tanggal muka kapsul heula.', '请先选择胶囊开启日期。', '先にカプセルを開く日付を選んでください。'],
  'tulis.kapsulTerkirim': ['Kapsul tersimpan. Terbuka {tgl}.', 'Capsule saved. Opens {tgl}.', 'Kapsul disimpan. Dibuka {tgl}.', 'Kapsul disimpen. Dibukak {tgl}.', 'Kapsul disimpen. Dibuka {tgl}.', '胶囊已保存，将于 {tgl} 开启。', 'カプセルを保存しました。{tgl}に開きます。'],
  'tulis.kapsulLihat': ['Kapsul saya', 'My capsules', 'Kapsul saya', 'Kapsulku', 'Kapsul abdi', '我的胶囊', '自分のカプセル'],
  'kapsul.kosong': ['Belum ada kapsul yang menunggu.', 'No capsules waiting yet.', 'Belum ada kapsul yang menunggu.', 'Durung ana kapsul sing nunggu.', 'Acan aya kapsul anu ngantosan.', '还没有等待开启的胶囊。', '待機中のカプセルはありません。'],
  'kapsul.buka': ['Terbuka {tgl}', 'Opens {tgl}', 'Dibuka {tgl}', 'Dibukak {tgl}', 'Dibuka {tgl}', '{tgl} 开启', '{tgl}に開きます'],
  'kapsul.batal': ['Batalkan', 'Cancel', 'Batalkan', 'Batalna', 'Batalkeun', '取消', '取り消す'],
  'kapsul.konfirmBatal': ['Batalkan kapsul ini? Catatannya akan dihapus.', 'Cancel this capsule? The note will be deleted.', 'Batalkan kapsul ini? Catatannya akan dipadam.', 'Batalna kapsul iki? Cathetane bakal dibusak.', 'Batalkeun kapsul ieu? Catetanna bakal dihapus.', '取消此胶囊？笔记将被删除。', 'このカプセルを取り消しますか？ノートは削除されます。'],
  'pc.kapsulDitulis': ['Kapsul waktu, ditulis {tgl}', 'Time capsule, written {tgl}', 'Kapsul masa, ditulis {tgl}', 'Kapsul wektu, ditulis {tgl}', 'Kapsul waktos, ditulis {tgl}', '时间胶囊，写于 {tgl}', 'タイムカプセル（{tgl}に作成）'],
};

const CSS = `
/* ===== Kapsul waktu ===== */
.umur-catatan{flex-wrap:wrap}
.umur-catatan input[type=date]{background:transparent;color:var(--teks);border:1px solid var(--garis);border-radius:8px;padding:6px 8px;font:inherit}
.umur-catatan input[type=date][hidden]{display:none}
.tautan-kapsul{margin-left:auto;background:none;border:0;color:var(--aksen);font:inherit;font-size:14px;cursor:pointer;padding:4px 0}
.kapsul-item{padding:12px 0;border-bottom:1px solid var(--garis)}
.kapsul-item p{margin:0 0 8px;overflow-wrap:anywhere}
.kapsul-baris{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px;color:var(--redup)}
.kapsul-baris .btn{min-height:36px;padding:4px 14px}
.kapsul-kosong{color:var(--redup);text-align:center;padding:16px 0;margin:0}
`;

// ---------- Penerapan ----------
const isi = {};
const baca = b => (isi[b] ??= fs.readFileSync(path.join(akar, b), 'utf8'));
const galat = [], log = [];

for (const [b, lama, baru, ada] of GANTI) {
  let s;
  try { s = baca(b); } catch (e) { galat.push(`${b}: berkas tidak ditemukan`); continue; }
  if (s.includes(ada)) { log.push('lewati (sudah)  ' + b + '  ' + lama.slice(0, 36).replace(/\n/g, ' ')); continue; }
  const n = s.split(lama).length - 1;
  if (n !== 1) { galat.push(`${b}: titik sisip ditemukan ${n}x (harus 1): ${lama.slice(0, 60).replace(/\n/g, ' ')}`); continue; }
  isi[b] = s.replace(lama, () => baru);
  log.push('terapkan        ' + b);
}

// Kamus: tambah kunci yang belum ada sebelum penutup objek I18N_KAMUS
{
  const b = 'js/bahasa.js';
  const s = baca(b);
  const baru = Object.entries(KAMUS).filter(([k]) => !s.includes("'" + k + "'"));
  if (baru.length) {
    const baris = baru.map(([k, v]) => `  '${k}': [${v.map(x => JSON.stringify(x)).join(', ')}]`).join(',\n');
    const re = /\]\s*\n\};\s*$/;
    if (!re.test(s)) galat.push('js/bahasa.js: penutup I18N_KAMUS tidak dikenali');
    else { isi[b] = s.replace(re, () => `],\n${baris}\n};\n`); log.push(`terapkan        ${b}  +${baru.length} kunci`); }
  } else log.push('lewati (sudah)  js/bahasa.js');
}

{
  const b = 'css/style.css';
  const s = baca(b);
  if (s.includes('/* ===== Kapsul waktu ===== */')) log.push('lewati (sudah)  ' + b);
  else { isi[b] = s.replace(/\s*$/, '\n') + CSS; log.push('terapkan        ' + b); }
}

if (galat.length) { console.error('BERHENTI, tidak ada berkas yang ditulis:\n- ' + galat.join('\n- ')); process.exit(1); }

let ubah = 0;
for (const b of Object.keys(isi)) {
  const asli = fs.readFileSync(path.join(akar, b), 'utf8');
  if (asli !== isi[b]) { fs.writeFileSync(path.join(akar, b), isi[b]); ubah++; }
}
console.log(log.join('\n'));
console.log(`\n${ubah} berkas diubah.`);
if (ubah) {
  for (const alat of ['pecah-bahasa.js', 'cek-bahasa.js']) {
    try { execFileSync('node', [path.join(akar, 'tools', alat)], { stdio: 'inherit' }); }
    catch (e) { console.error('PERINGATAN: tools/' + alat + ' gagal; periksa keluarannya.'); process.exitCode = 1; }
  }
  console.log('\nLanjut: node tools/naikkan-cache.js');
}

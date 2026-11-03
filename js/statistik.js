// Statistik pendaftaran untuk pengelola. Sumber: admin_corong() (sql/035) dan admin_retensi() (sql/044).
// Fungsi server menolak non-pengelola, jadi halaman ini aman walau alamatnya diketahui orang lain.
(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  let hari = 30;
  const KOLOM = [['landing', 'Landing'], ['landing_mulai', 'Klik mulai'], ['jelajahi', 'Jelajahi'], ['login_buka', 'Buka masuk'], ['daftar_buka', 'Buka daftar'],
    ['akun_baru', 'Akun baru'], ['onboarding_mulai', 'Onboarding'], ['onboarding_selesai', 'Selesai'], ['catatan_pertama', 'Catatan 1']];
  const tgl = d => String(d).slice(5);
  const pct = (a, b) => b > 0 ? Math.round(a * 100 / b) + '%' : '-';
  const sel = x => x == null ? '-' : x;

  async function muat() {
    $('#galat').textContent = '';
    document.querySelectorAll('#rentang button').forEach(b => b.setAttribute('aria-selected', +b.dataset.h === hari ? 'true' : 'false'));
    const [a, b] = await Promise.all([db.rpc('admin_corong', { p_hari: hari }), db.rpc('admin_retensi', { p_hari: hari })]);
    if (a.error) { $('#galat').textContent = /pengelola/i.test(a.error.message || '') ? 'Khusus pengelola.' : 'Gagal memuat: ' + (a.error.message || ''); return; }
    const jml = {}, peta = {};
    (a.data || []).forEach(r => {
      jml[r.langkah] = (jml[r.langkah] || 0) + Number(r.jumlah);
      (peta[r.hari] = peta[r.hari] || {})[r.langkah] = Number(r.jumlah);
    });
    const kartu = (n, l) => `<div class="stat-k"><b>${esc(String(n))}</b><span>${esc(l)}</span></div>`;
    $('#ringkas').innerHTML =
      kartu(jml.akun_baru || 0, 'Akun baru') + kartu(pct(jml.akun_baru || 0, jml.daftar_buka || 0), 'Buka daftar -> akun') +
      kartu(pct(jml.onboarding_selesai || 0, jml.akun_baru || 0), 'Akun -> onboarding selesai') +
      kartu(pct(jml.catatan_pertama || 0, jml.akun_baru || 0), 'Akun -> catatan pertama') +
      kartu(jml.landing || 0, 'Kunjungan landing');
    const hh = Object.keys(peta).sort().reverse();
    $('#harian').innerHTML = '<table><thead><tr><th>Tgl</th>' + KOLOM.map(k => `<th>${k[1]}</th>`).join('') + '</tr></thead><tbody>' +
      hh.map(d => `<tr><td>${tgl(d)}</td>` + KOLOM.map(k => `<td>${peta[d][k[0]] || 0}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
    if (b.error) { $('#kohort').innerHTML = '<p class="hitung" style="padding:12px">Kohort belum tersedia (jalankan sql/044).</p>'; return; }
    $('#kohort').innerHTML = '<table><thead><tr><th>Daftar</th><th>Akun</th><th>Profil siap</th><th>Mengikuti</th><th>Catatan 7h</th><th>Aktif D1</th><th>Aktif D7</th><th>Undangan</th></tr></thead><tbody>' +
      (b.data || []).map(r => `<tr><td>${tgl(r.hari)}</td><td>${r.akun_baru}</td><td>${r.selesai_profil}</td><td>${r.ikut_akun}</td><td>${r.catatan_7h}</td><td>${sel(r.aktif_d1)}</td><td>${sel(r.aktif_d7)}</td><td>${r.lewat_undangan}</td></tr>`).join('') + '</tbody></table>';
  }
  document.querySelectorAll('#rentang button').forEach(b => b.onclick = () => { hari = +b.dataset.h; muat(); });
  muat();
})();

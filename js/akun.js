// Bagian "Data & akun" di profil sendiri: unduh data, hapus akun, panel admin.
(function () {
  const el = document.getElementById('akun');
  if (!el) return;
  el.innerHTML = `<h3>Data &amp; akun</h3>
    <div class="akun-aksi">
      <button class="btn garis" id="unduhData">Unduh data saya</button>
      <button class="btn garis" id="hapusAkun" style="color:var(--bahaya)">Hapus akun</button>
      <a id="linkAdmin" href="admin.html" hidden>Panel admin</a>
    </div>
    <p class="hitung" style="margin-top:8px">Unduh berisi profil, posting, suka, dan pesanmu dalam satu berkas. Hapus akun bersifat permanen.</p>`;

  document.getElementById('unduhData').onclick = async () => {
    const { data, error } = await db.rpc('ekspor_data');
    if (error) { alert('Gagal mengunduh data: ' + error.message); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data-jurkon-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  document.getElementById('hapusAkun').onclick = async () => {
    const k = prompt('Ini menghapus akunmu beserta semua posting, suka, dan pesan yang kamu kirim secara PERMANEN.\nKetik HAPUS untuk melanjutkan:');
    if (k !== 'HAPUS') return;
    const { error } = await db.rpc('hapus_akun');
    if (error) { alert('Gagal menghapus akun: ' + error.message); return; }
    try { sessionStorage.clear(); } catch (e) {}
    await db.auth.signOut();
    alert('Akunmu sudah dihapus.');
    location.href = 'login.html';
  };

  db.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const { data } = await db.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (data) document.getElementById('linkAdmin').hidden = false;
  });
})();

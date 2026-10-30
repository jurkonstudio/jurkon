// Bagian "Email" dan "Data & akun" di profil sendiri: ganti email, unduh data, hapus akun, panel admin.
(function () {
  const el = document.getElementById('akun');
  if (!el) return;
  el.innerHTML = `<h3>Email</h3>
    <p class="hitung" id="emailKini" style="margin:0 0 8px">Memuat…</p>
    <input type="email" id="emailBaru" aria-label="Email baru" placeholder="Email baru" autocomplete="email" autocapitalize="none" spellcheck="false">
    <div class="akun-aksi" style="margin-top:8px"><button class="btn garis" id="gantiEmail">Ganti email</button></div>
    <p class="hitung" id="emailInfo" role="status" style="margin-top:8px">Tautan konfirmasi dikirim ke email baru (dan bisa juga ke email lama). Email baru baru berlaku setelah tautannya diklik.</p>
    <h3 style="margin-top:20px">Data &amp; akun</h3>
    <div class="akun-aksi">
      <button class="btn garis" id="unduhData">Unduh data saya</button>
      <button class="btn garis" id="hapusAkun" style="color:var(--bahaya)">Hapus akun</button>
      <a id="linkAdmin" href="admin.html" hidden>Panel admin</a>
    </div>
    <p class="hitung" style="margin-top:8px">Unduh berisi profil, posting, suka, dan pesanmu dalam satu berkas. Hapus akun bersifat permanen.</p>`;

  const infoEmail = document.getElementById('emailInfo');
  db.auth.getSession().then(({ data: { session } }) => {
    document.getElementById('emailKini').textContent = session ? 'Email saat ini: ' + session.user.email : '';
  });
  document.getElementById('gantiEmail').onclick = async () => {
    const baru = document.getElementById('emailBaru').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(baru)) { infoEmail.textContent = 'Isi email baru yang valid.'; return; }
    const { data: { session } } = await db.auth.getSession();
    if (session && session.user.email && session.user.email.toLowerCase() === baru) { infoEmail.textContent = 'Itu sudah email akunmu saat ini.'; return; }
    const tbl = document.getElementById('gantiEmail');
    tbl.disabled = true;
    const { error } = await db.auth.updateUser({ email: baru }, { emailRedirectTo: location.origin + '/profil.html' });
    tbl.disabled = false;
    if (error) {
      const m = error.message || '';
      infoEmail.textContent = /already|registered/i.test(m) ? 'Email ini sudah dipakai akun lain.'
        : /rate limit|seconds/i.test(m) ? 'Terlalu sering mencoba. Tunggu beberapa saat lalu coba lagi.'
        : /valid|invalid/i.test(m) ? 'Format email tidak valid.' : 'Gagal mengganti email: ' + m;
      return;
    }
    infoEmail.textContent = 'Cek kotak masuk (dan folder spam) email baru, lalu klik tautan konfirmasinya. Kalau diminta, konfirmasi juga di email lama.';
    document.getElementById('emailBaru').value = '';
  };

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

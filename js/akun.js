// Bagian "Email" dan "Data & akun" di profil sendiri: ganti email, unduh data, hapus akun, panel admin.
(function () {
  const el = document.getElementById('akun');
  if (!el) return;
  el.innerHTML = `<h3>${esc(t('ak.email'))}</h3>
    <p class="hitung" id="emailKini" style="margin:0 0 8px">${esc(t('umum.memuat'))}</p>
    <input type="email" id="emailBaru" aria-label="${esc(t('ak.emailBaruPh'))}" placeholder="${esc(t('ak.emailBaruPh'))}" autocomplete="email" autocapitalize="none" spellcheck="false">
    <div class="akun-aksi" style="margin-top:8px"><button class="btn garis" id="gantiEmail">${esc(t('ak.ganti'))}</button></div>
    <p class="hitung" id="emailInfo" role="status" style="margin-top:8px">${esc(t('ak.infoGanti'))}</p>
    <h3 style="margin-top:20px">${esc(t('ak.dataAkun'))}</h3>
    <div class="akun-aksi">
      <button class="btn garis" id="unduhData">${esc(t('ak.unduh'))}</button>
      <button class="btn garis" id="hapusAkun" style="color:var(--bahaya)">${esc(t('ak.hapus'))}</button>
      <a id="linkAdmin" href="admin.html" hidden>${esc(t('ak.admin'))}</a>
    </div>
    <p class="hitung" style="margin-top:8px">${esc(t('ak.infoData'))}</p>`;

  const infoEmail = document.getElementById('emailInfo');
  db.auth.getSession().then(({ data: { session } }) => {
    document.getElementById('emailKini').textContent = session ? t('ak.emailKini', { email: session.user.email }) : '';
  });
  document.getElementById('gantiEmail').onclick = async () => {
    const baru = document.getElementById('emailBaru').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(baru)) { infoEmail.textContent = t('ak.isiValid'); return; }
    const { data: { session } } = await db.auth.getSession();
    if (session && session.user.email && session.user.email.toLowerCase() === baru) { infoEmail.textContent = t('ak.sudahItu'); return; }
    const tbl = document.getElementById('gantiEmail');
    tbl.disabled = true;
    const { error } = await db.auth.updateUser({ email: baru }, { emailRedirectTo: location.origin + '/profil.html' });
    tbl.disabled = false;
    if (error) {
      const m = error.message || '';
      infoEmail.textContent = /already|registered/i.test(m) ? t('ak.dipakaiLain')
        : /rate limit|seconds/i.test(m) ? t('ak.terlaluSering')
        : /valid|invalid/i.test(m) ? t('auth.e.emailInvalid') : t('ak.gagalGanti', { pesan: m });
      return;
    }
    infoEmail.textContent = t('ak.cek');
    document.getElementById('emailBaru').value = '';
  };

  document.getElementById('unduhData').onclick = async () => {
    const { data, error } = await db.rpc('ekspor_data');
    if (error) { alert(t('ak.gagalUnduh', { pesan: error.message })); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data-jurkon-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  document.getElementById('hapusAkun').onclick = async () => {
    const kata = t('ak.kataHapus');
    const k = prompt(t('ak.konfirmHapus', { kata }));
    // Kata konfirmasi dalam bahasa yang dipakai; "HAPUS" tetap diterima di semua bahasa
    if (!k || ![kata.toLowerCase(), 'hapus'].includes(k.trim().toLowerCase())) return;
    const { error } = await db.rpc('hapus_akun');
    if (error) { alert(t('ak.gagalHapus', { pesan: error.message })); return; }
    try { sessionStorage.clear(); } catch (e) {}
    await db.auth.signOut();
    alert(t('ak.terhapus'));
    location.href = 'login.html';
  };

  db.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const { data } = await db.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (data) document.getElementById('linkAdmin').hidden = false;
  });
})();

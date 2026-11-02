// Isi panel Pengaturan yang berhubungan dengan akun, dibagi per kategori:
//   Keamanan        -> #kmEmail (ganti email), #kmSandi (ganti kata sandi), #kmSesi (perangkat login, lihat js/sesi.js)
//   Data & privasi  -> #dpData (unduh data), #dpBahaya (hapus akun)
//   Menu utama      -> #linkAdmin (hanya admin)
(function () {
  const wEmail = document.getElementById('kmEmail');
  if (!wEmail) return;
  const I = id => document.getElementById(id);

  // ---------- Keamanan: email ----------
  wEmail.innerHTML = `<h3>${esc(t('ak.email'))}</h3>
      <p class="set-nilai" id="emailKini">${esc(t('umum.memuat'))}</p>
      <div class="set-isian">
        <input type="email" id="emailBaru" aria-label="${esc(t('ak.emailBaruPh'))}" placeholder="${esc(t('ak.emailBaruPh'))}" autocomplete="email" autocapitalize="none" spellcheck="false">
        <button class="btn garis" id="gantiEmail">${esc(t('ak.ganti'))}</button>
      </div>
      <p class="hitung" id="emailInfo" role="status">${esc(t('ak.infoGanti'))}</p>`;

  // ---------- Keamanan: kata sandi ----------
  I('kmSandi').innerHTML = `<h3>${esc(t('kt.sandi'))}</h3>
      <div class="set-isian set-kolom">
        <input type="password" id="sandiBaru" aria-label="${esc(t('kt.sandiBaru'))}" placeholder="${esc(t('kt.sandiBaru'))}" autocomplete="new-password" maxlength="72">
        <input type="password" id="sandiUlang" aria-label="${esc(t('kt.sandiUlang'))}" placeholder="${esc(t('kt.sandiUlang'))}" autocomplete="new-password" maxlength="72">
        <button class="btn garis" id="gantiSandi">${esc(t('kt.sandiUbah'))}</button>
      </div>
      <p class="hitung" id="sandiInfo" role="status">${esc(t('kt.sandiInfo'))}</p>`;

  // ---------- Keamanan: perangkat & aktivitas login ----------
  if (window.Sesi) Sesi.pasang(I('kmSesi'));

  // ---------- Data & privasi ----------
  I('dpData').innerHTML = `<h3>${esc(t('ak.dataAkun'))}</h3>
      <div class="akun-aksi"><button class="btn garis" id="unduhData">${esc(t('ak.unduh'))}</button></div>
      <p class="hitung">${esc(t('ak.infoData'))}</p>
      <p class="hitung">${esc(t('dp.sesi'))}</p>`;
  I('dpBahaya').innerHTML = `<h3>${esc(t('ak.zona'))}</h3>
      <p class="hitung">${esc(t('ak.zonaInfo'))}</p>
      <button class="btn bahaya garis" id="hapusAkun">${esc(t('ak.hapus'))}</button>`;

  const infoEmail = I('emailInfo');
  db.auth.getSession().then(({ data: { session } }) => {
    I('emailKini').textContent = session ? t('ak.emailKini', { email: session.user.email }) : '';
  });
  I('gantiEmail').onclick = async () => {
    const baru = I('emailBaru').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(baru)) { infoEmail.textContent = t('ak.isiValid'); return; }
    const { data: { session } } = await db.auth.getSession();
    if (session && session.user.email && session.user.email.toLowerCase() === baru) { infoEmail.textContent = t('ak.sudahItu'); return; }
    const tbl = I('gantiEmail');
    tbl.disabled = true;
    const { error } = await db.auth.updateUser({ email: baru }, { emailRedirectTo: location.origin + '/profil.html' });
    tbl.disabled = false;
    if (error) {
      const m = error.message || '';
      infoEmail.textContent = /already|registered/i.test(m) ? t('ak.dipakaiLain')
        : /rate limit|seconds/i.test(m) ? t('ak.terlaluSering')
        : /valid|invalid/i.test(m) ? t('auth.e.emailInvalid') : t('ak.gagalGanti', { pesan: galatRamah(error) });
      return;
    }
    infoEmail.textContent = t('ak.cek');
    I('emailBaru').value = '';
  };

  // Ganti kata sandi: aturan kekuatan sama dengan saat daftar (js/keamanan.js). Supabase tetap menegakkan aturannya sendiri.
  const infoSandi = I('sandiInfo');
  I('gantiSandi').onclick = async () => {
    const a = I('sandiBaru').value, b = I('sandiUlang').value;
    if (a.length < 8) { infoSandi.textContent = t('auth.e.sandiPendek'); return; }
    if (a !== b) { infoSandi.textContent = t('kt.sandiBeda'); return; }
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    if (window.Keamanan && !Keamanan.sandiKuat(a, session.user.email)) { infoSandi.textContent = t('auth.e.sandiLemah'); return; }
    const tbl = I('gantiSandi');
    tbl.disabled = true;
    const { error } = await db.auth.updateUser({ password: a });
    tbl.disabled = false;
    if (error) {
      const m = error.message || '';
      infoSandi.textContent = /different from the old|same as the old|should be different/i.test(m) ? t('kt.sandiSama')
        : /reauthenticat|recent|nonce/i.test(m) ? t('kt.sandiMasukLagi')
        : /weak|pwned|easy to guess|at least|characters/i.test(m) ? t('auth.e.sandiLemah')
        : t('kt.sandiGagal', { pesan: galatRamah(error) });
      return;
    }
    infoSandi.textContent = t('kt.sandiOk');
    I('sandiBaru').value = ''; I('sandiUlang').value = '';
  };

  I('unduhData').onclick = async () => {
    const { data, error } = await db.rpc('ekspor_data');
    if (error) { alert(t('ak.gagalUnduh', { pesan: galatRamah(error) })); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data-jurkon-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  // Hapus akun ala GitHub: dialog peringatan, ketik username untuk konfirmasi, tombol baru aktif bila cocok.
  I('hapusAkun').onclick = async () => {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    const { data: pr } = await db.from('profiles').select('username').eq('id', session.user.id).maybeSingle();
    const nama = (pr && pr.username) || '';
    if (!nama) return;
    const dlg = document.createElement('dialog');
    dlg.className = 'lembar hapus-dialog';
    dlg.setAttribute('aria-labelledby', 'hapusJudul');
    dlg.innerHTML = `<div class="lembar-kepala"><h2 id="hapusJudul">${esc(t('ak.hapusJudul'))}</h2>
        <button type="button" class="ikon-btn" id="hdTutup" aria-label="${esc(t('umum.tutup'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="form">
        <p class="hapus-peringatan" role="alert">${esc(t('ak.hapusPeringatan', { username: '@' + nama }))}</p>
        <ul class="hapus-daftar"><li>${esc(t('ak.hapusDaftar1'))}</li><li>${esc(t('ak.hapusDaftar2'))}</li><li>${esc(t('ak.hapusDaftar3'))}</li></ul>
        <p><button type="button" class="tautan-btn" id="hdUnduh">${esc(t('ak.hapusUnduh'))}</button></p>
        <label for="hdKetik" class="hapus-label">${esc(t('ak.hapusKetik', { username: nama }))}</label>
        <input type="text" id="hdKetik" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
        <div class="tombol" style="margin-top:14px">
          <button type="button" class="btn garis" id="hdBatal">${esc(t('ak.batal'))}</button>
          <button type="button" class="btn bahaya utama" id="hdHapus" disabled>${esc(t('ak.hapusTombol'))}</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    const tutup = () => { dlg.close(); dlg.remove(); };
    const input = dlg.querySelector('#hdKetik'), tombol = dlg.querySelector('#hdHapus');
    input.addEventListener('input', () => {
      tombol.disabled = input.value.trim().replace(/^@/, '').toLowerCase() !== nama.toLowerCase();
    });
    dlg.querySelector('#hdTutup').onclick = tutup;
    dlg.querySelector('#hdBatal').onclick = tutup;
    dlg.addEventListener('cancel', () => dlg.remove());
    dlg.querySelector('#hdUnduh').onclick = () => I('unduhData').click();
    tombol.onclick = async () => {
      if (tombol.disabled) return;
      tombol.disabled = true; input.disabled = true;
      tombol.textContent = t('ak.hapusProses');
      const { error } = await db.rpc('hapus_akun');
      if (error) {
        alert(t('ak.gagalHapus', { pesan: galatRamah(error) }));
        input.disabled = false; tombol.textContent = t('ak.hapusTombol'); tombol.disabled = false;
        return;
      }
      try { sessionStorage.clear(); } catch (e) {}
      await db.auth.signOut();
      alert(t('ak.terhapus'));
      location.href = 'login.html';
    };
    dlg.showModal();
    input.focus();
  };

  // Tautan Panel admin di menu utama Pengaturan, hanya untuk admin.
  db.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const { data } = await db.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (data && I('linkAdmin')) I('linkAdmin').hidden = false;
  });
})();

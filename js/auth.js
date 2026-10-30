const galat = $('#galat');
const ambil = () => ({ email: $('#email').value.trim(), password: $('#sandi').value });
db.auth.getSession().then(({ data }) => { if (data.session) location.href = 'index.html'; });

function terjemah(m) {
  m = m || '';
  if (/invalid login credentials/i.test(m)) return t('auth.e.salah');
  if (/email not confirmed/i.test(m)) return t('auth.e.belumKonfirmasi');
  if (/already registered|already been registered/i.test(m)) return t('auth.e.sudahAda');
  if (/password should be at least|weak password/i.test(m)) return t('auth.e.sandiPendek');
  if (/valid email|invalid email|unable to validate email/i.test(m)) return t('auth.e.emailInvalid');
  if (/rate limit|too many/i.test(m)) return t('auth.e.terlaluBanyak');
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return t('err.offline');
  return m || t('err.umum');
}
function periksa(perluSandi) {
  const a = ambil();
  if (!/^\S+@\S+\.\S+$/.test(a.email)) { galat.textContent = t('auth.isiEmail'); return null; }
  if (perluSandi && a.password.length < 6) { galat.textContent = t('auth.e.sandiPendek'); return null; }
  return a;
}
async function jalankan(tombol, fn) {
  galat.textContent = '';
  const teks = tombol.textContent;
  tombol.disabled = true; tombol.textContent = t('auth.memproses');
  try { await fn(); } finally { tombol.disabled = false; tombol.textContent = teks; }
}

$('#masuk').onclick = function () {
  const a = periksa(true); if (!a) return;
  jalankan(this, async () => {
    const { error } = await db.auth.signInWithPassword(a);
    if (error) galat.textContent = t('auth.gagalMasuk', { pesan: terjemah(error.message) });
    else location.href = 'index.html';
  });
};
$('#daftar').onclick = function () {
  const a = periksa(true); if (!a) return;
  jalankan(this, async () => {
    const { data, error } = await db.auth.signUp(a);
    if (error) galat.textContent = t('auth.gagalDaftar', { pesan: terjemah(error.message) });
    // Email yang sudah terdaftar tidak memberi galat (perlindungan Supabase): identities kosong
    else if (data.user && data.user.identities && data.user.identities.length === 0) galat.textContent = t('auth.sudahTerdaftarLupa');
    else if (!data.session) galat.textContent = t('auth.cekEmail');
    else location.href = 'index.html';
  });
};
$('#google').onclick = async () => {
  galat.textContent = '';
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/index.html' } });
  if (error) galat.textContent = t('auth.gagalGoogle', { pesan: terjemah(error.message) });
};
$('#lupa').onclick = function (e) {
  e.preventDefault();
  const a = periksa(false); if (!a) { galat.textContent = t('auth.isiEmailDulu'); return; }
  jalankan(this, async () => {
    const { error } = await db.auth.resetPasswordForEmail(a.email, { redirectTo: location.origin + '/reset.html' });
    galat.textContent = error ? t('auth.gagalKirim', { pesan: terjemah(error.message) }) : t('auth.resetTerkirim');
  });
};

const galat = $('#galat');
const ambil = () => ({ email: $('#email').value.trim(), password: $('#sandi').value });
db.auth.getSession().then(({ data }) => { if (data.session) location.href = 'index.html'; });

function terjemah(m) {
  m = m || '';
  if (/invalid login credentials/i.test(m)) return 'Email atau kata sandi salah.';
  if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Cek kotak masuk (dan folder spam) lalu klik tautannya.';
  if (/already registered|already been registered/i.test(m)) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (/password should be at least|weak password/i.test(m)) return 'Kata sandi minimal 6 karakter.';
  if (/valid email|invalid email|unable to validate email/i.test(m)) return 'Format email tidak valid.';
  if (/rate limit|too many/i.test(m)) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return 'Tidak ada koneksi. Periksa sinyal lalu coba lagi.';
  return m || 'Terjadi kesalahan. Coba lagi.';
}
function periksa(perluSandi) {
  const a = ambil();
  if (!/^\S+@\S+\.\S+$/.test(a.email)) { galat.textContent = 'Isi email yang valid.'; return null; }
  if (perluSandi && a.password.length < 6) { galat.textContent = 'Kata sandi minimal 6 karakter.'; return null; }
  return a;
}
async function jalankan(tombol, fn) {
  galat.textContent = '';
  const teks = tombol.textContent;
  tombol.disabled = true; tombol.textContent = 'Memproses…';
  try { await fn(); } finally { tombol.disabled = false; tombol.textContent = teks; }
}

$('#masuk').onclick = function () {
  const a = periksa(true); if (!a) return;
  jalankan(this, async () => {
    const { error } = await db.auth.signInWithPassword(a);
    if (error) galat.textContent = 'Gagal masuk: ' + terjemah(error.message);
    else location.href = 'index.html';
  });
};
$('#daftar').onclick = function () {
  const a = periksa(true); if (!a) return;
  jalankan(this, async () => {
    const { data, error } = await db.auth.signUp(a);
    if (error) galat.textContent = 'Gagal daftar: ' + terjemah(error.message);
    // Email yang sudah terdaftar tidak memberi galat (perlindungan Supabase): identities kosong
    else if (data.user && data.user.identities && data.user.identities.length === 0) galat.textContent = 'Email ini sudah terdaftar. Silakan masuk atau pakai "Lupa kata sandi".';
    else if (!data.session) galat.textContent = 'Cek email kamu untuk konfirmasi, lalu masuk.';
    else location.href = 'index.html';
  });
};
$('#google').onclick = async () => {
  galat.textContent = '';
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/index.html' } });
  if (error) galat.textContent = 'Gagal masuk dengan Google: ' + terjemah(error.message);
};
$('#lupa').onclick = function (e) {
  e.preventDefault();
  const a = periksa(false); if (!a) { galat.textContent = 'Isi emailmu di kolom atas, lalu tekan "Lupa kata sandi?" lagi.'; return; }
  jalankan(this, async () => {
    const { error } = await db.auth.resetPasswordForEmail(a.email, { redirectTo: location.origin + '/reset.html' });
    galat.textContent = error ? 'Gagal mengirim: ' + terjemah(error.message) : 'Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Cek kotak masuk dan spam.';
  });
};

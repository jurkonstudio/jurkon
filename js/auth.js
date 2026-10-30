const galat = $('#galat');
const ambil = () => ({ email: $('#email').value.trim(), password: $('#sandi').value });
db.auth.getSession().then(({ data }) => { if (data.session) location.href = 'index.html'; });

$('#masuk').onclick = async () => {
  const { error } = await db.auth.signInWithPassword(ambil());
  if (error) galat.textContent = 'Gagal masuk: ' + error.message;
  else location.href = 'index.html';
};
$('#daftar').onclick = async () => {
  const { data, error } = await db.auth.signUp(ambil());
  if (error) galat.textContent = 'Gagal daftar: ' + error.message;
  else if (!data.session) galat.textContent = 'Cek email kamu untuk konfirmasi, lalu masuk.';
  else location.href = 'index.html';
};
$('#google').onclick = () => db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/index.html' } });

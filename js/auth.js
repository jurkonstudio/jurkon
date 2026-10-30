const galat = $('#galat');
const ambil = () => ({ email: $('#email').value.trim(), password: $('#sandi').value });
const MULAI = Date.now();
db.auth.getSession().then(({ data }) => { if (data.session) location.href = 'index.html'; });

// ---- Anti-bot sisi klien -----------------------------------------------------------------------
// Catatan jujur: lapisan di klien hanya menahan skrip yang memakai halaman ini. Bot yang langsung memanggil
// API Supabase hanya bisa dihentikan oleh pengaturan di server (CAPTCHA + batas laju + trigger di sql/019).
const KUNCI_GAGAL = 'gagalMasuk';
function bacaGagal() {
  try { return JSON.parse(localStorage.getItem(KUNCI_GAGAL) || 'null') || { n: 0, sampai: 0, t: 0 }; }
  catch (e) { return { n: 0, sampai: 0, t: 0 }; }
}
function simpanGagal(g) { try { localStorage.setItem(KUNCI_GAGAL, JSON.stringify(g)); } catch (e) {} }
function sisaKunci() { return Math.max(0, Math.ceil((bacaGagal().sampai - Date.now()) / 1000)); }
function catatGagal() {
  const g = bacaGagal(), kini = Date.now();
  if (kini - g.t > 15 * 60 * 1000) g.n = 0;                 // hitungan menyegar setelah 15 menit tenang
  g.n += 1; g.t = kini;
  if (g.n >= 5) g.sampai = kini + Math.min(15 * 60, 30 * Math.pow(2, g.n - 5)) * 1000;   // 30 dtk, 1, 2, 4 ... maks 15 menit
  simpanGagal(g);
}
function catatBerhasil() { simpanGagal({ n: 0, sampai: 0, t: 0 }); }

// Jebakan (honeypot) dan waktu isi: manusia tidak mengisi kolom tersembunyi dan tidak menekan tombol < 1,2 dtk sejak halaman dibuka
function mencurigakan() {
  if ($('#situs') && $('#situs').value) return true;
  return Date.now() - MULAI < 1200;
}

// ---- Cloudflare Turnstile (aktif hanya bila TURNSTILE_SITE_KEY terisi) ---------------------------
let widgetId = null, tokenCaptcha = null;
function pasangCaptcha() {
  if (!TURNSTILE_SITE_KEY) return;
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true; s.defer = true;
  s.onload = () => {
    widgetId = window.turnstile.render('#captcha', {
      sitekey: TURNSTILE_SITE_KEY,
      callback: tk => { tokenCaptcha = tk; },
      'expired-callback': () => { tokenCaptcha = null; },
      'error-callback': () => { tokenCaptcha = null; }
    });
  };
  document.head.appendChild(s);
}
function adaCaptcha() { return !!TURNSTILE_SITE_KEY; }
// Token Turnstile hanya berlaku sekali; setelah dipakai (berhasil atau gagal) minta yang baru
function pakaiToken() {
  const tk = tokenCaptcha;
  tokenCaptcha = null;
  if (widgetId !== null && window.turnstile) { try { window.turnstile.reset(widgetId); } catch (e) {} }
  return tk;
}
pasangCaptcha();

function terjemah(m) {
  m = m || '';
  if (/captcha/i.test(m)) return t('auth.e.captcha');
  if (/invalid login credentials/i.test(m)) return t('auth.e.salah');
  if (/email not confirmed/i.test(m)) return t('auth.e.belumKonfirmasi');
  if (/already registered|already been registered/i.test(m)) return t('auth.e.sudahAda');
  if (/password should be at least|weak password/i.test(m)) return t('auth.e.sandiLemah');
  if (/valid email|invalid email|unable to validate email/i.test(m)) return t('auth.e.emailInvalid');
  if (/rate limit|too many/i.test(m)) return t('auth.e.terlaluBanyak');
  if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return t('err.offline');
  return t('err.umum');   // jangan menampilkan pesan mentah dari server
}
function periksa(perluSandi, daftar) {
  const a = ambil();
  if (!/^\S+@\S+\.\S+$/.test(a.email) || a.email.length > 254) { galat.textContent = t('auth.isiEmail'); return null; }
  if (perluSandi && a.password.length < 6) { galat.textContent = t('auth.e.sandiPendek'); return null; }
  // Kekuatan sandi hanya dituntut saat membuat akun; akun lama dengan sandi 6 karakter tetap bisa masuk
  if (daftar && !Keamanan.sandiKuat(a.password, a.email)) { galat.textContent = a.password.length < 8 ? t('auth.e.sandiPendek') : t('auth.e.sandiLemah'); return null; }
  return a;
}
// Gerbang bersama: honeypot, waktu isi, kunci setelah gagal berulang, dan CAPTCHA.
// Mengembalikan { ok, captchaToken } atau { ok: false } (galat sudah ditampilkan).
function gerbang(lewatiKunci) {
  if (mencurigakan()) { galat.textContent = t('auth.e.terlaluBanyak'); return { ok: false }; }
  const s = sisaKunci();
  if (!lewatiKunci && s > 0) { galat.textContent = t('auth.e.terkunci', { detik: s }); return { ok: false }; }
  if (adaCaptcha() && !tokenCaptcha) { galat.textContent = t('auth.e.captcha'); return { ok: false }; }
  return { ok: true };
}
async function jalankan(tombol, fn) {
  galat.textContent = '';
  const teks = tombol.textContent;
  tombol.disabled = true; tombol.textContent = t('auth.memproses');
  try { await fn(); } finally { tombol.disabled = false; tombol.textContent = teks; }
}

$('#masuk').onclick = function () {
  const a = periksa(true); if (!a) return;
  if (!gerbang(false).ok) return;
  jalankan(this, async () => {
    const opsi = adaCaptcha() ? { captchaToken: pakaiToken() } : undefined;
    const { error } = await db.auth.signInWithPassword(opsi ? { ...a, options: opsi } : a);
    if (error) { catatGagal(); galat.textContent = t('auth.gagalMasuk', { pesan: terjemah(error.message) }); $('#sandi').value = ''; $('#sandi').focus(); }   // sandi salah: kosongkan, ketik ulang
    else { catatBerhasil(); location.href = 'index.html'; }
  });
};
$('#daftar').onclick = function () {
  const a = periksa(true, true); if (!a) return;
  if (!gerbang(false).ok) return;
  jalankan(this, async () => {
    const opsi = adaCaptcha() ? { captchaToken: pakaiToken() } : undefined;
    const { data, error } = await db.auth.signUp(opsi ? { ...a, options: opsi } : a);
    if (error) { catatGagal(); galat.textContent = t('auth.gagalDaftar', { pesan: terjemah(error.message) }); }
    // Email yang sudah terdaftar tidak memberi galat (perlindungan Supabase): identities kosong
    else if (data.user && data.user.identities && data.user.identities.length === 0) galat.textContent = t('auth.sudahTerdaftarLupa');
    else if (!data.session) galat.textContent = t('auth.cekEmail');
    else location.href = 'index.html';
  });
};
// Login Google dinonaktifkan sementara (belum dikonfigurasi). Untuk mengaktifkan lagi: pasang tombol #google di login.html dan
// handler db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/index.html' } }).
$('#lupa').onclick = function (e) {
  e.preventDefault();
  const a = periksa(false); if (!a) { galat.textContent = t('auth.isiEmailDulu'); return; }
  if (!gerbang(false).ok) return;
  jalankan(this, async () => {
    const opsi = { redirectTo: location.origin + '/reset.html' };
    if (adaCaptcha()) opsi.captchaToken = pakaiToken();
    const { error } = await db.auth.resetPasswordForEmail(a.email, opsi);
    // Pesan sama apa pun hasilnya agar tidak membocorkan email mana yang terdaftar;
    // hanya pembatasan laju / CAPTCHA yang ditampilkan apa adanya karena tidak terkait data akun.
    if (error) catatGagal();
    const dibatasi = error && /rate limit|too many|captcha/i.test(error.message);
    galat.textContent = dibatasi ? t('auth.gagalKirim', { pesan: terjemah(error.message) }) : t('auth.resetTerkirim');
  });
};

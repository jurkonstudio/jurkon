const galat = $('#galat');
const ambil = () => ({ email: $('#email').value.trim(), password: $('#sandi').value });
const MULAI = Date.now();
if (window.catatCorong && !$('#daftar')) catatCorong('login_buka');   // angka corong tanpa data pribadi (js/corong.js)
// Tautan undangan langsung ke daftar.html?undang=username: simpan di perangkat (dipakai js/selamat.js setelah username dipilih).
try {
  const uq = (new URLSearchParams(location.search).get('undang') || '').trim().toLowerCase().replace(/^@/, '');
  if (/^[a-z0-9_]{3,20}$/.test(uq)) localStorage.setItem('undang', JSON.stringify({ u: uq, t: Date.now() }));
} catch (e) {}
if (window.catatCorong && $('#daftar')) catatCorong('daftar_buka');
db.auth.getSession().then(({ data }) => { if (data.session) location.href = lanjutAman() || '/'; });

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
function periksa(perluSandi, daftar, bolehUsername) {
  const a = ambil();
  // Halaman masuk menerima username ATAU email. Tanpa "@" dianggap username (huruf kecil, angka, garis bawah; 3-20 karakter).
  if (bolehUsername && a.email.indexOf('@') === -1) {
    a.email = a.email.replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(a.email)) { galat.textContent = t('auth.isiMasuk'); return null; }
  } else if (!/^\S+@\S+\.\S+$/.test(a.email) || a.email.length > 254) { galat.textContent = bolehUsername ? t('auth.isiMasuk') : t('auth.isiEmail'); return null; }
  if (perluSandi && a.password.length < 6) { galat.textContent = t('auth.e.sandiPendek'); return null; }
  // Kekuatan sandi hanya dituntut saat membuat akun; akun lama dengan sandi 6 karakter tetap bisa masuk
  if (daftar && !Keamanan.sandiKuat(a.password, a.email)) { galat.textContent = a.password.length < 8 ? t('auth.e.sandiPendek') : t('auth.e.sandiLemah'); return null; }
  if (daftar && $('#sandi2') && $('#sandi2').value !== a.password) { galat.textContent = t('reset.harusSama'); return null; }
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
  galat.textContent = ''; galat.classList.remove('ok'); galat.setAttribute('role', 'alert');
  const teks = tombol.textContent;
  tombol.disabled = true; tombol.textContent = t('auth.memproses');
  try { await fn(); } finally { tombol.disabled = false; tombol.textContent = teks; }
}

// Catat lokasi/perangkat sesi baru (js/sesi.js). Gagal atau lambat tidak boleh menghalangi masuk: tunggu paling lama 2,5 detik.
async function catatSesiCepat() {
  try { if (window.Sesi) await Promise.race([Sesi.catat(true), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
}

// Masuk dengan username: Edge Function masuk-username mencari emailnya DI SERVER (email tidak pernah dikirim ke browser),
// masuk atas nama pengguna, lalu mengembalikan sesinya untuk dipasang di sini. Pesan galatnya sama dengan masuk lewat
// email, jadi terjemah() dan penghitung gagal (catatGagal) tetap bekerja.
async function masukUsername(username, password, captchaToken) {
  try {
    const { data, error } = await db.functions.invoke('masuk-username', { body: { username, password, captchaToken } });
    if (error) {
      let pesan = 'Failed to fetch';
      try { const j = await error.context.json(); if (j && j.error) pesan = String(j.error); } catch (e) {}
      return { error: { message: pesan } };
    }
    if (!data || !data.session) return { error: { message: 'Invalid login credentials' } };
    return await db.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (e) { return { error: { message: 'Failed to fetch' } }; }
}
if ($('#masuk')) $('#masuk').onclick = function () {
  const a = periksa(true, false, true); if (!a) return;
  const pakaiUsername = a.email.indexOf('@') === -1;
  if (!gerbang(false).ok) return;
  jalankan(this, async () => {
    const opsi = adaCaptcha() ? { captchaToken: pakaiToken() } : undefined;
    const { error } = pakaiUsername
      ? await masukUsername(a.email, a.password, opsi && opsi.captchaToken)
      : await db.auth.signInWithPassword(opsi ? { ...a, options: opsi } : a);
    if (error) { catatGagal(); galat.textContent = t('auth.gagalMasuk', { pesan: terjemah(error.message) }); $('#sandi').value = ''; $('#sandi').focus(); }   // sandi salah: kosongkan, ketik ulang
    else { catatBerhasil(); await catatSesiCepat(); location.href = lanjutAman() || '/'; }
  });
};
if ($('#daftar')) $('#daftar').onclick = function () {
  const a = periksa(true, true); if (!a) return;
  if (!gerbang(false).ok) return;
  jalankan(this, async () => {
    const opsi = adaCaptcha() ? { captchaToken: pakaiToken() } : undefined;
    const { data, error } = await db.auth.signUp(opsi ? { ...a, options: opsi } : a);
    if (error) { catatGagal(); galat.textContent = t('auth.gagalDaftar', { pesan: terjemah(error.message) }); }
    // Email yang sudah terdaftar tidak memberi galat (perlindungan Supabase): identities kosong
    else if (data.user && data.user.identities && data.user.identities.length === 0) galat.textContent = t('auth.sudahTerdaftarLupa');
    else if (!data.session) { galat.classList.add('ok'); galat.setAttribute('role', 'status'); galat.textContent = t('auth.cekEmail'); }
    else { await catatSesiCepat(); location.href = lanjutAman() || '/'; }
  });
};
// Masuk dengan Google (OAuth lewat Supabase)
if ($('#google')) $('#google').onclick = function () {
  jalankan(this, async () => {
    const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
    if (error) galat.textContent = t('auth.gagalGoogle', { pesan: terjemah(error.message) });
  });
};
if ($('#lupa')) $('#lupa').onclick = function (e) {
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
    if (!dibatasi) galat.classList.add('ok');
    galat.textContent = dibatasi ? t('auth.gagalKirim', { pesan: terjemah(error.message) }) : t('auth.resetTerkirim');
  });
};

// Tautan antar halaman masuk dan daftar tetap membawa tujuan (?lanjut=), yang divalidasi ulang oleh lanjutAman() di halaman tujuan
(function () {
  const l = new URLSearchParams(location.search).get('lanjut');
  const a = $('#ke-daftar') || $('#ke-masuk');
  if (l && a) a.href = a.getAttribute('href') + '?lanjut=' + encodeURIComponent(l);
})();

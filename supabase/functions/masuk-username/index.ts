// Edge Function: masuk dengan USERNAME (Supabase Auth hanya mengenal email/telepon).
// Alur: klien kirim { username, password, captchaToken } -> fungsi mencari email pemilik username DI SERVER
// (service role) -> masuk lewat Supabase Auth -> mengembalikan HANYA access_token + refresh_token.
// Email tidak pernah dikirim ke browser, jadi username tidak bisa dipakai untuk memanen email orang.
// Username yang tidak ada dan sandi yang salah mendapat jawaban yang sama.
//
// Pasang (verify_jwt HARUS mati, karena pemanggilnya belum masuk):
//   supabase functions deploy masuk-username --no-verify-jwt
// SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY sudah disediakan otomatis oleh Supabase.
// Bila CAPTCHA Supabase Auth aktif, token Turnstile dari klien diteruskan apa adanya.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Hanya situs Jurkon yang boleh memanggil fungsi ini dari browser. Tambah asal lain (mis. pratinjau Codespaces)
// tanpa mengubah kode:  supabase secrets set ALLOWED_ORIGINS="https://jurkon.my.id,https://www.jurkon.my.id,https://xxxx.app.github.dev"
const IZIN = (Deno.env.get('ALLOWED_ORIGINS') || 'https://jurkon.my.id,https://www.jurkon.my.id').split(',').map(x => x.trim()).filter(Boolean);
function cors(req: Request): Record<string, string> {
  const asal = req.headers.get('origin') || '';
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (IZIN.includes(asal)) h['Access-Control-Allow-Origin'] = asal;
  return h;
}
const json = (b: unknown, s: number, c: Record<string, string>) => new Response(JSON.stringify(b), { status: s, headers: { ...c, 'Content-Type': 'application/json' } });
const SALAH = { error: 'Invalid login credentials' };
const TANPA_SESI = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

// IP asli pengguna untuk batas laju Supabase Auth. JANGAN percaya entri PERTAMA x-forwarded-for: itu diisi klien dan
// bisa dipalsukan untuk melewati batas laju. cf-connecting-ip diisi Cloudflare (klien tidak bisa menimpanya);
// cadangannya entri TERAKHIR x-forwarded-for, yaitu yang ditambahkan proxy terdekat. x-real-ip tidak dipakai.
const IP_SAH = /^[0-9a-fA-F:.]{3,45}$/;
function ambilIp(req: Request): string | null {
  const cf = (req.headers.get('cf-connecting-ip') || '').trim();
  if (IP_SAH.test(cf)) return cf;
  const xff = (req.headers.get('x-forwarded-for') || '').split(',').map(x => x.trim()).filter(Boolean);
  const akhir = xff.length ? xff[xff.length - 1] : '';
  return IP_SAH.test(akhir) ? akhir : null;
}

// Galat Supabase yang BOLEH diteruskan karena berguna bagi pengguna dan tidak membocorkan apakah username ada:
// CAPTCHA gagal, batas laju, dan "email belum dikonfirmasi" (Supabase hanya mengirimnya bila sandi sudah benar).
// Selain itu semuanya dijawab sama: SALAH.
const BOLEH_TERUS = /captcha|rate limit|too many|email not confirmed/i;

Deno.serve(async (req: Request) => {
  const c = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: c });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, c);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(SALAH, 400, c); }
  const username = typeof b.username === 'string' ? b.username.trim().replace(/^@/, '').toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const captchaToken = typeof b.captchaToken === 'string' && b.captchaToken.length < 4096 ? b.captchaToken : undefined;
  if (!/^[a-z0-9_]{3,20}$/.test(username) || password.length < 6 || password.length > 200) return json(SALAH, 400, c);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, TANPA_SESI);

  // Teruskan IP asli pengguna agar batas laju Supabase Auth tidak menghitung semua orang sebagai satu IP.
  const ip = ambilIp(req);
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { ...TANPA_SESI, global: { headers: ip ? { 'x-forwarded-for': ip } : {} } });
  const opsi = captchaToken ? { captchaToken } : undefined;

  // Username tidak ada: tetap lakukan satu percobaan masuk palsu supaya waktu jawabnya mirip username yang ada
  // (tanpa ini, jawaban yang jauh lebih cepat membocorkan bahwa username itu tidak terdaftar).
  const tiruan = async () => { try { await anon.auth.signInWithPassword({ email: 'tidak-ada@example.invalid', password, options: opsi }); } catch { /* diabaikan */ } };

  const { data: profil } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!profil) { await tiruan(); return json(SALAH, 400, c); }
  const { data: akun } = await admin.auth.admin.getUserById(profil.id);
  const email = akun?.user?.email;
  if (!email) { await tiruan(); return json(SALAH, 400, c); }

  const { data, error } = await anon.auth.signInWithPassword({ email, password, options: opsi });
  if (error || !data.session) {
    const pesan = error?.message || '';
    return json(BOLEH_TERUS.test(pesan) ? { error: pesan } : SALAH, 400, c);
  }

  return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } }, 200, c);
});

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const SALAH = { error: 'Invalid login credentials' };
const TANPA_SESI = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

function ambilIp(req: Request): string | null {
  const kandidat = [req.headers.get('cf-connecting-ip'), (req.headers.get('x-forwarded-for') || '').split(',')[0], req.headers.get('x-real-ip')];
  for (const k of kandidat) { const ip = (k || '').trim(); if (ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip)) return ip; }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(SALAH, 400); }
  const username = typeof b.username === 'string' ? b.username.trim().replace(/^@/, '').toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const captchaToken = typeof b.captchaToken === 'string' && b.captchaToken.length < 4096 ? b.captchaToken : undefined;
  if (!/^[a-z0-9_]{3,20}$/.test(username) || password.length < 6 || password.length > 200) return json(SALAH, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, TANPA_SESI);

  const { data: profil } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!profil) return json(SALAH, 400);
  const { data: akun } = await admin.auth.admin.getUserById(profil.id);
  const email = akun?.user?.email;
  if (!email) return json(SALAH, 400);

  // Teruskan IP asli pengguna agar batas laju Supabase Auth tidak menghitung semua orang sebagai satu IP.
  const ip = ambilIp(req);
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { ...TANPA_SESI, global: { headers: ip ? { 'x-forwarded-for': ip } : {} } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined });
  if (error || !data.session) return json({ error: error?.message || SALAH.error }, 400);

  return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
});

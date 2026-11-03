// Edge Function: mencatat dari mana sebuah sesi login berasal (kota, negara, provider) dan perangkatnya.
// Dipanggil klien (js/sesi.js) dengan token login pengguna. Lokasi dan provider dicari DI SINI dari IP
// permintaan, bukan dikirim klien, jadi tidak bisa dipalsukan dari browser.
//
// Pasang:   supabase functions deploy catat-sesi
// (verify_jwt bawaan aktif: hanya pengguna yang sedang masuk yang bisa memanggil.)
// Opsional: supabase secrets set GEO_URL="https://ipwho.is/{ip}"   (lihat catatan layanan di bawah)
//
// Layanan bawaan ipwho.is: gratis, HTTPS, tanpa kunci, memberi kota + ISP + ASN. Batas dan syaratnya ditentukan
// penyedia; bila trafik Jurkon besar, ganti ke layanan berbayar (ipinfo, ipapi, MaxMind) lewat GEO_URL / kode bawah.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

function bersih(v: unknown, maks: number): string | null {
  if (typeof v !== 'string') return null;
  // buang karakter kontrol; potong panjang
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, maks);
  return s || null;
}

function ambilIp(req: Request): string | null {
  const kandidat = [req.headers.get('cf-connecting-ip'), (req.headers.get('x-forwarded-for') || '').split(',')[0], req.headers.get('x-real-ip')];
  for (const k of kandidat) { const ip = (k || '').trim(); if (ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip)) return ip; }
  return null;
}

// 203.0.113.57 -> 203.0.113.x   |   2001:db8:85a3:8d3:1319:8a2e:370:7348 -> 2001:db8:85a3::x
function samarkan(ip: string): string {
  if (ip.includes(':')) {
    const b = ip.split(':').filter((x, i, a) => !(x === '' && a[i - 1] === ''));
    return b.slice(0, 3).join(':') + '::x';
  }
  const o = ip.split('.');
  return o.length === 4 ? o.slice(0, 3).join('.') + '.x' : 'x';
}

function privat(ip: string): boolean {
  return /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) || ip === '::1' || /^f[cd]/i.test(ip) || /^fe80/i.test(ip);
}

// Penguraian User-Agent sederhana (cukup untuk label yang mudah dibaca).
function uraiUA(ua: string) {
  let os = 'Perangkat', jenis: 'ponsel' | 'tablet' | 'desktop' | 'lain' = 'lain';
  if (/iPhone/.test(ua)) { os = 'iOS'; jenis = 'ponsel'; }
  else if (/iPad/.test(ua)) { os = 'iPadOS'; jenis = 'tablet'; }
  else if (/Android/.test(ua)) { os = 'Android'; jenis = /Mobile/.test(ua) ? 'ponsel' : 'tablet'; }
  else if (/Windows NT/.test(ua)) { os = 'Windows'; jenis = 'desktop'; }
  else if (/Mac OS X|Macintosh/.test(ua)) { os = 'macOS'; jenis = 'desktop'; }
  else if (/CrOS/.test(ua)) { os = 'ChromeOS'; jenis = 'desktop'; }
  else if (/Linux|X11/.test(ua)) { os = 'Linux'; jenis = 'desktop'; }
  let peramban = 'Peramban';
  if (/Edg\//.test(ua)) peramban = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) peramban = 'Opera';
  else if (/SamsungBrowser/.test(ua)) peramban = 'Samsung Internet';
  else if (/Firefox\/|FxiOS/.test(ua)) peramban = 'Firefox';
  else if (/Chrome\/|CriOS/.test(ua)) peramban = 'Chrome';
  else if (/Safari\//.test(ua)) peramban = 'Safari';
  // Versi (kasar, cukup untuk label). Chrome modern membekukan versi OS di UA; yang lebih akurat datang dari
  // Client Hints yang dikirim klien (lihat `petunjuk` di bawah) dan menimpa nilai ini bila ada.
  let osVersi: string | null = null, perVersi: string | null = null;
  const mA = ua.match(/Android (\d+(?:\.\d+)?)/), mI = ua.match(/OS (\d+)[_.](\d+)/);
  if (os === 'Android' && mA) osVersi = mA[1];
  else if ((os === 'iOS' || os === 'iPadOS') && mI) osVersi = mI[1] + '.' + mI[2];
  else if (os === 'macOS') { const m = ua.match(/Mac OS X (\d+)[_.](\d+)/); if (m) osVersi = m[1] + '.' + m[2]; }
  const mv = peramban === 'Edge' ? ua.match(/Edg\/(\d+)/) : peramban === 'Opera' ? ua.match(/OPR\/(\d+)/)
    : peramban === 'Samsung Internet' ? ua.match(/SamsungBrowser\/(\d+)/) : peramban === 'Firefox' ? ua.match(/(?:Firefox|FxiOS)\/(\d+)/)
    : peramban === 'Chrome' ? ua.match(/(?:Chrome|CriOS)\/(\d+)/) : peramban === 'Safari' ? ua.match(/Version\/(\d+)/) : null;
  if (mv) perVersi = mv[1];
  return { os, jenis, peramban, osVersi, perVersi };
}

// Client Hints dari klien (navigator.userAgentData). Hanya label tampilan untuk akun si pemilik sendiri,
// jadi dibersihkan dan dibatasi panjangnya; lokasi/provider TIDAK pernah diambil dari klien.
function petunjuk(b: any) {
  const o = b && typeof b === 'object' ? b : {};
  return { model: bersih(o.model, 60), osVersi: bersih(o.os_versi, 30), perVersi: bersih(o.peramban_versi, 30) };
}

// Cara masuk dari klaim `amr` di JWT (password / oauth / otp ...).
function metodeDariJwt(token: string, appMeta: any): string | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const m = Array.isArray(p.amr) && p.amr[0] ? String(p.amr[0].method || '') : '';
    if (m === 'password') return 'email';
    if (m === 'oauth') return bersih(appMeta?.provider, 20) || 'oauth';
    if (m === 'otp' || m === 'magiclink') return 'email';
    return null;                                      // 'token' (penyegaran) dll: biarkan nilai lama di basis data
  } catch { return null; }
}

function sesiDariJwt(token: string): string | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof p.session_id === 'string' ? p.session_id : null;
  } catch { return null; }
}

async function cariLokasi(ip: string, req: Request) {
  const hasil = { kota: null as string | null, wilayah: null as string | null, negara: null as string | null,
                  kode: null as string | null, provider: null as string | null, asn: null as string | null };
  // Cadangan paling murah: negara dari header Cloudflare (tersedia di depan Supabase).
  const cc = (req.headers.get('cf-ipcountry') || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1') hasil.kode = cc;
  if (privat(ip)) return hasil;
  const tpl = Deno.env.get('GEO_URL') || 'https://ipwho.is/{ip}?fields=success,country,country_code,region,city,connection';
  const ambil = async (url: string) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    try {
      const r = await fetch(url.replace('{ip}', encodeURIComponent(ip)), { signal: ctl.signal, headers: { Accept: 'application/json' } });
      return r.ok ? await r.json() : null;
    } catch { return null; } finally { clearTimeout(timer); }
  };
  const isi = (d: any) => {
    hasil.kota = bersih(d.city, 80) || hasil.kota;
    hasil.wilayah = bersih(d.region ?? d.region_name, 80) || hasil.wilayah;
    hasil.negara = bersih(d.country ?? d.country_name, 80) || hasil.negara;
    hasil.kode = bersih(d.country_code, 2) || hasil.kode;
    const c = d.connection || {};
    hasil.provider = bersih(c.isp, 120) || bersih(c.org, 120) || bersih(d.isp, 120) || bersih(d.org, 120) || hasil.provider;
    hasil.asn = bersih(String(c.asn ?? d.asn ?? ''), 20) || hasil.asn;
  };
  // Layanan utama dulu; bila gagal (batas permintaan / down) atau provider kosong, coba layanan cadangan.
  const utama = await ambil(tpl);
  if (utama && utama.success !== false) isi(utama);
  if (!hasil.kota || !hasil.provider) {
    const cadangan = await ambil('https://ipapi.co/{ip}/json/');
    if (cadangan && !cadangan.error) isi(cadangan);
  }
  return hasil;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, galat: 'tanpa token' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return json({ ok: false, galat: 'token tidak valid' }, 401);
  const sesi = sesiDariJwt(token);
  if (!sesi) return json({ ok: false, galat: 'sesi tidak dikenali' }, 400);

  // Label perangkat: User-Agent dari header (dikirim browser, bukan isian bebas klien).
  const ua = (req.headers.get('user-agent') || '').slice(0, 400);
  const { os, jenis, peramban, osVersi, perVersi } = uraiUA(ua);
  let badan: any = null;
  try { badan = await req.json(); } catch { /* badan kosong: tidak apa-apa */ }
  const h = petunjuk(badan);
  const ip = ambilIp(req);
  const lok = ip ? await cariLokasi(ip, req) : { kota: null, wilayah: null, negara: null, kode: null, provider: null, asn: null };

  const { error } = await admin.rpc('catat_sesi', {
    p_user: u.user.id, p_session: sesi,
    p_perangkat: peramban + ' di ' + os, p_jenis: jenis, p_os: os, p_peramban: peramban,
    p_ip_samar: ip ? samarkan(ip) : null,
    p_kota: lok.kota, p_wilayah: lok.wilayah, p_negara: lok.negara, p_kode_negara: lok.kode,
    p_provider: lok.provider, p_asn: lok.asn,
    p_model: h.model, p_os_versi: h.osVersi || osVersi, p_peramban_versi: h.perVersi || perVersi,
    p_metode: metodeDariJwt(token, u.user.app_metadata),
  });
  if (error) return json({ ok: false, galat: error.message }, 500);
  return json({ ok: true });
});

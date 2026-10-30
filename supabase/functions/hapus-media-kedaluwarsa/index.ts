// Edge Function: membuang foto/pesan suara chat yang sudah lewat 10 menit.
// Jadwalkan tiap 5 menit (lihat README, bagian "Foto & pesan suara"). Kunci service_role disediakan
// otomatis oleh Supabase di lingkungan fungsi ini; JANGAN menaruhnya di kode atau di repo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Fungsi ini hanya boleh dipanggil oleh penjadwal Anda sendiri. Kunci anon bersifat publik, jadi tanpa rahasia
// bersama ini siapa pun (termasuk bot) bisa memicunya. Atur rahasia:  supabase secrets set CRON_SECRET=<acak panjang>
// lalu kirim header  x-cron-secret: <nilai yang sama>  dari pg_cron/penjadwal.
function samaWaktuTetap(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const rahasia = Deno.env.get('CRON_SECRET') ?? '';
  const kiriman = req.headers.get('x-cron-secret') ?? '';
  if (rahasia.length < 24 || !samaWaktuTetap(rahasia, kiriman)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await db.rpc('media_pesan_kedaluwarsa', { p_batas: 500 });
  if (error) return new Response(error.message, { status: 500 });
  const nama = (data ?? []) as string[];
  if (nama.length) {
    const r = await db.storage.from('media-pesan').remove(nama);
    if (r.error) return new Response(r.error.message, { status: 500 });
  }
  return Response.json({ dihapus: nama.length });
});

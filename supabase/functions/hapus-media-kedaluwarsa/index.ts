// Edge Function: membuang foto/pesan suara chat yang sudah lewat 10 menit.
// Jadwalkan tiap 5 menit (lihat README, bagian "Foto & pesan suara"). Kunci service_role disediakan
// otomatis oleh Supabase di lingkungan fungsi ini; JANGAN menaruhnya di kode atau di repo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

Deno.serve(async () => {
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

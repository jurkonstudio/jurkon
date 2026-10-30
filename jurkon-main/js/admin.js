(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const el = $('#daftar');
  const { data: adm } = await db.from('admins').select('user_id').eq('user_id', saya.id).maybeSingle();
  if (!adm) { el.innerHTML = '<div class="kosong">Halaman ini khusus admin.</div>'; return; }

  async function muat() {
    el.innerHTML = skeleton(2);
    const { data, error } = await db.from('reports')
      .select('id,alasan,created_at,post_id,profiles(username),posts(id,content,profiles(username))')
      .eq('status', 'baru').order('created_at', { ascending: false }).limit(50);
    if (error) { el.innerHTML = '<div class="kosong">Gagal memuat: ' + esc(error.message) + '</div>'; return; }
    if (!data.length) { el.innerHTML = kosong('pena', 'Tidak ada laporan baru', 'Semua laporan sudah ditangani.'); return; }
    el.innerHTML = data.map(r => `<article class="post" style="display:block" data-r="${r.id}">
      <div class="user">Dilaporkan oleh @${esc(r.profiles?.username || '?')} · ${waktu(r.created_at)}</div>
      <div class="isi"><b>@${esc(r.posts?.profiles?.username || '?')}</b>: ${esc(r.posts?.content || '(posting sudah dihapus)')}</div>
      <div class="isi redup" style="margin-top:6px">Alasan: ${esc(r.alasan || '-')}</div>
      <div class="aksi">
        <button data-act="selesai" data-r="${r.id}">Tandai selesai</button>
        ${r.posts ? `<button data-act="hapus" data-r="${r.id}" data-p="${r.post_id}" style="color:var(--bahaya)">Hapus posting</button>` : ''}
      </div></article>`).join('');
  }
  el.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'hapus') {
      if (!confirm('Hapus posting ini untuk semua orang?')) return;
      const { error } = await db.from('posts').delete().eq('id', b.dataset.p);
      if (error) { alert('Gagal: ' + error.message); return; }
    } else {
      const { error } = await db.from('reports').update({ status: 'selesai' }).eq('id', b.dataset.r);
      if (error) { alert('Gagal: ' + error.message); return; }
    }
    muat();
  });
  muat();
})();

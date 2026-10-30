(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const el = $('#daftar');
  const { data: adm } = await db.from('admins').select('user_id').eq('user_id', saya.id).maybeSingle();
  if (!adm) { el.innerHTML = '<div class="kosong">Halaman ini khusus admin.</div>'; return; }

  // ---- Sorotan Jelajah: tandai / cabut posting pilihan ----------------------
  const elSorot = $('#sorotan');
  async function muatSorotan() {
    const { data, error } = await db.from('posts').select('id,content,created_at,dilihat,profiles(username)')
      .eq('disorot', true).order('created_at', { ascending: false }).limit(50);
    const daftar = error
      ? '<p class="hitung">Sorotan belum aktif (jalankan migrasi 012): ' + esc(error.message) + '</p>'
      : !data.length ? '<p class="hitung">Belum ada posting yang kamu sorot.</p>'
      : data.map(p => `<div class="item" style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between">
          <div><b>@${esc(p.profiles?.username || '?')}</b> <span class="sub">${waktu(p.created_at)} · dilihat ${p.dilihat ?? 0}</span>
          <div class="isi">${esc(p.content)}</div></div>
          <button class="btn garis" data-cabut="${p.id}">Cabut</button></div>`).join('');
    elSorot.innerHTML = `<h3 style="font-family:var(--serif);font-size:17px;margin-bottom:6px">Sorotan Jelajah</h3>
      <p class="hitung" style="margin-bottom:8px">Posting dengan dilihat di atas ambang otomatis tampil di Jelajah. Di sini kamu bisa memilih posting lain secara manual. Tempel tautan posting (detail.html?id=…) atau ID-nya.</p>
      <input type="text" id="sorotId" aria-label="Tautan atau ID posting" placeholder="Tautan atau ID posting" autocomplete="off" autocapitalize="none" spellcheck="false">
      <div style="margin:8px 0 14px"><button class="btn utama" id="sorotTambah">Sorot posting</button></div>${daftar}`;
  }
  elSorot.addEventListener('click', async e => {
    const cabut = e.target.closest('button[data-cabut]');
    if (cabut) {
      const { error } = await db.rpc('sorot_posting', { p_id: cabut.dataset.cabut, p_nilai: false });
      if (error) { alert('Gagal: ' + error.message); return; }
      muatSorotan(); return;
    }
    if (!e.target.closest('#sorotTambah')) return;
    const m = ($('#sorotId').value || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!m) { alert('ID posting tidak ditemukan. Tempel tautan atau ID lengkap.'); return; }
    const { error } = await db.rpc('sorot_posting', { p_id: m[0].toLowerCase(), p_nilai: true });
    if (error) { alert('Gagal: ' + error.message); return; }
    muatSorotan();
  });
  muatSorotan();

  async function muat() {
    el.innerHTML = skeleton(2);
    const { data, error } = await db.from('reports')
      .select('id,alasan,created_at,post_id,profiles(username),posts(id,content,user_id,profiles(username))')
      .eq('status', 'baru').order('created_at', { ascending: false }).limit(50);
    if (error) { el.innerHTML = '<div class="kosong">Gagal memuat: ' + esc(error.message) + '</div>'; return; }
    if (!data.length) { el.innerHTML = kosong('pena', 'Tidak ada laporan baru', 'Semua laporan sudah ditangani.'); return; }
    el.innerHTML = data.map(r => `<article class="post" style="display:block" data-r="${r.id}">
      <div class="user">Dilaporkan oleh @${esc(r.profiles?.username || '?')} · ${waktu(r.created_at)}</div>
      <div class="isi"><b>@${esc(r.posts?.profiles?.username || '?')}</b>: ${esc(r.posts?.content || '(posting sudah dihapus)')}</div>
      <div class="isi redup" style="margin-top:6px">Alasan: ${esc(r.alasan || '-')}</div>
      <div class="aksi">
        <button data-act="selesai" data-r="${r.id}">Tandai selesai</button>
        ${r.posts ? `<button data-act="hapus" data-r="${r.id}" data-p="${r.post_id}" style="color:var(--bahaya)">Hapus posting</button>
        <button data-act="bekukan" data-r="${r.id}" data-u="${esc(r.posts.user_id)}" style="color:var(--bahaya)">Bekukan penulis</button>` : ''}
      </div></article>`).join('');
  }
  el.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'bekukan') {
      if (!confirm('Bekukan akun penulis? Ia tidak bisa posting, kirim pesan, suka, atau mengikuti, dan dikeluarkan dari semua perangkat.')) return;
      const { error } = await db.rpc('bekukan_akun', { target: b.dataset.u, p_alasan: 'Dibekukan dari laporan ' + b.dataset.r });
      if (error) { alert('Gagal: ' + error.message); return; }
      alert('Akun dibekukan. Hapus posting dan tandai laporan selesai bila perlu.');
      return;
    }
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

(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const el = $('#daftar');
  el.innerHTML = skeleton(3);
  const { data, error } = await db.from('conversations').select('id,user_a,user_b,created_at');
  if (error) { el.innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(galatRamah(error)) + '</p></div>'; return; }
  if (!data || !data.length) { el.innerHTML = kosong('pesan', t('pesan.kosongJ'), t('pesan.kosongT'), 'explore.html', t('umum.cariOrang')); return; }

  // Pesan terakhir tiap percakapan, supaya daftar urut menurut aktivitas terbaru
  const cids = data.map(c => c.id);
  const ambilPesan = kolom => db.from('messages').select(kolom)
    .in('conversation_id', cids).order('created_at', { ascending: false }).limit(300);
  let { data: pesan, error: ep } = await ambilPesan('conversation_id,sender_id,content,created_at,media_jenis,media_path');
  if (ep) ({ data: pesan } = await ambilPesan('conversation_id,sender_id,content,created_at'));   // migrasi 017 belum dijalankan
  const terakhir = {};
  (pesan || []).forEach(m => { if (!terakhir[m.conversation_id]) terakhir[m.conversation_id] = m; });
  const waktuC = c => new Date((terakhir[c.id] || c).created_at).getTime();
  data.sort((a, b) => waktuC(b) - waktuC(a));

  const ids = data.map(c => c.user_a === saya.id ? c.user_b : c.user_a);
  const { data: orang } = await db.from('profiles').select('id,username,nama,foto_url').in('id', ids);
  const peta = Object.fromEntries((orang || []).map(o => [o.id, o]));

  // Percakapan yang punya pesan belum dibaca (notifikasi jenis "pesan"). Gagal = tanpa penanda, daftar tetap jalan.
  const belum = new Set();
  try {
    const { data: nb } = await db.from('notifications').select('conversation_id')
      .eq('user_id', saya.id).eq('jenis', 'pesan').eq('dibaca', false).limit(200);
    (nb || []).forEach(n => { if (n.conversation_id) belum.add(n.conversation_id); });
  } catch (e) {}

  // Waktu ringkas ala aplikasi chat: jam hari ini, "kemarin", nama hari dalam seminggu, selebihnya tanggal
  function waktuRingkas(iso) {
    const d = new Date(iso), sekarang = new Date();
    const awalHari = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const selisih = Math.round((awalHari(sekarang) - awalHari(d)) / 86400000);
    if (selisih <= 0) return d.toLocaleTimeString(I18n.locale, { hour: '2-digit', minute: '2-digit' });
    if (selisih === 1) return t('waktu.kemarin');
    if (selisih < 7) return d.toLocaleDateString(I18n.locale, { weekday: 'short' });
    return d.toLocaleDateString(I18n.locale, { day: 'numeric', month: 'short', year: d.getFullYear() === sekarang.getFullYear() ? undefined : 'numeric' });
  }

  const baris = data.map((c, i) => {
    const o = peta[ids[i]] || {};
    const m = terakhir[c.id];
    const nama = o.nama || o.username || t('pesan.pengguna');
    const awal = m && m.sender_id === saya.id ? t('pesan.kamu') : '';
    const cuplikan = m ? awal + (m.media_path ? t(m.media_jenis === 'foto' ? 'pesan.foto' : 'pesan.suara') : m.content) : t('pesan.belum');
    const baru = belum.has(c.id);
    const cari = (nama + ' ' + (o.username || '')).toLowerCase();
    return `<a class="psn-item${baru ? ' baru' : ''}" href="chat.html?id=${c.id}" data-cari="${esc(cari)}"${baru ? ' aria-label="' + esc(nama + ', ' + t('panel.belumDibaca')) + '"' : ''}>
      <span class="psn-ava">${avatar(nama, 52, o.foto_url)}</span>
      <span class="psn-isi">
        <span class="psn-atas"><span class="psn-nama">${esc(nama)}</span>${lencanaResmi(o.username)}<time class="psn-waktu" datetime="${esc((m || c).created_at)}">${esc(waktuRingkas((m || c).created_at))}</time></span>
        <span class="psn-bawah"><span class="psn-cuplikan">${esc(cuplikan)}</span>${baru ? '<span class="psn-titik" aria-hidden="true"></span>' : ''}</span>
      </span></a>`;
  });
  el.innerHTML = '<div class="psn-daftar">' + baris.join('') + '</div><p class="psn-kosong" id="cariKosong" hidden></p>';

  // Kolom cari: menyaring daftar di perangkat (nama dan username), tanpa kueri baru
  const wadah = $('#cariWadah'), kolom = $('#cari'), kosongEl = $('#cariKosong');
  if (data.length > 4) {
    wadah.hidden = false;
    kolom.addEventListener('input', () => {
      const q = kolom.value.trim().toLowerCase().replace(/^@/, '');
      let ada = 0;
      el.querySelectorAll('.psn-item').forEach(a => { const cocok = !q || a.dataset.cari.includes(q); a.hidden = !cocok; if (cocok) ada++; });
      kosongEl.hidden = ada > 0;
      kosongEl.textContent = ada ? '' : t('pesan.cariKosong', { kata: kolom.value.trim() });
    });
  }
})();

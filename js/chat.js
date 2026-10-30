(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const cid = param('id');
  const { data: c } = await db.from('conversations').select('*').eq('id', cid).maybeSingle();
  if (!c) { $('#isi').innerHTML = '<div class="kosong">Percakapan tidak ditemukan.</div>'; return; }
  const { data: o } = await db.from('profiles').select('username,nama,foto_url').eq('id', c.user_a === saya.id ? c.user_b : c.user_a).maybeSingle();
  const namaLawan = o ? (o.nama || o.username) : 'Pengguna';
  $('#lawan').innerHTML = avatar(namaLawan, 30, o && o.foto_url) + '<span>' + esc(namaLawan) + '</span>';
  $('#teks').placeholder = 'Tulis pesan untuk ' + namaLawan + '...';
  pasangHitung($('#teks'), $('#hitung'), 750);
  pasangFilter($('#teks'));

  const sudah = new Set();
  const tampil = m => {
    if (sudah.has(m.id)) return;
    const k = $('#isi .kosong'); if (k) k.remove();
    sudah.add(m.id);
    const d = document.createElement('div');
    d.className = 'bubble ' + (m.sender_id === saya.id ? 'saya' : 'lawan');
    d.textContent = m.content;
    $('#isi').appendChild(d);
    window.scrollTo(0, document.body.scrollHeight);
  };

  // Ambil 200 pesan TERBARU (tanpa batas, Supabase hanya mengembalikan 1000 pesan TERLAMA)
  const { data: pesan, error: ep } = await db.from('messages').select('*')
    .eq('conversation_id', cid).order('created_at', { ascending: false }).limit(200);
  if (ep) { $('#isi').innerHTML = '<div class="kosong">Gagal memuat pesan: ' + esc(ep.message) + '</div>'; return; }
  (pesan || []).slice().reverse().forEach(tampil);
  if (!pesan || !pesan.length) $('#isi').innerHTML = kosong('pesan', 'Mulai percakapan', 'Sapa ' + esc(namaLawan) + ' dengan pesan pertamamu.');

  db.channel('chat-' + cid).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid },
    p => { tampil(p.new); if (p.new.sender_id !== saya.id && window.Notif) Notif.tandaiPercakapan(cid); }).subscribe();
  if (window.Notif) Notif.tandaiPercakapan(cid);

  const kirim = async () => {
    const tombol = $('#kirim'), kotak = $('#teks');
    const content = kotak.value.trim();
    if (!content || tombol.disabled) return;
    if (!bolehKirim(content, m => alert(m))) return;
    tombol.disabled = true;
    // Pesan sendiri langsung tampil dari hasil insert, tidak bergantung pada realtime
    const { data, error } = await db.from('messages')
      .insert({ conversation_id: cid, sender_id: saya.id, content }).select().single();
    tombol.disabled = false;
    if (error) {
      // Teks dipertahankan agar tidak hilang saat gagal
      alert('Gagal mengirim: ' + (error.code === '42501' ? 'Tidak dapat mengirim pesan ke pengguna ini.' : pesanGalatChat(error)));
      return;
    }
    kotak.value = ''; kotak.dispatchEvent(new Event('input'));
    tampil(data);
  };
  function pesanGalatChat(e) {
    const m = (e && e.message) || '';
    const dilarang = pesanKontenDilarang(e);
    if (dilarang) return dilarang;
    if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return 'Tidak ada koneksi. Periksa sinyal lalu coba lagi.';
    return m || 'Terjadi kesalahan. Coba lagi.';
  }
  $('#kirim').onclick = kirim;
  $('#teks').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); kirim(); } });
})();

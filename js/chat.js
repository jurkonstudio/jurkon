(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const cid = param('id');
  const { data: c } = await db.from('conversations').select('*').eq('id', cid).maybeSingle();
  if (!c) { $('#isi').innerHTML = '<div class="kosong">Percakapan tidak ditemukan.</div>'; return; }
  const { data: o } = await db.from('profiles').select('username,nama').eq('id', c.user_a === saya.id ? c.user_b : c.user_a).single();
  $('#lawan').textContent = o.nama || o.username;
  pasangHitung($('#teks'), $('#hitung'), 750);

  const sudah = new Set();
  const tampil = m => {
    if (sudah.has(m.id)) return;
    sudah.add(m.id);
    const d = document.createElement('div');
    d.className = 'bubble ' + (m.sender_id === saya.id ? 'saya' : 'lawan');
    d.textContent = m.content;
    $('#isi').appendChild(d);
    window.scrollTo(0, document.body.scrollHeight);
  };
  const { data: pesan } = await db.from('messages').select('*').eq('conversation_id', cid).order('created_at');
  (pesan || []).forEach(tampil);

  db.channel('chat-' + cid).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid },
    p => tampil(p.new)).subscribe();

  $('#kirim').onclick = async () => {
    const content = $('#teks').value.trim();
    if (!content) return;
    $('#teks').value = ''; $('#teks').dispatchEvent(new Event('input'));
    const { error } = await db.from('messages').insert({ conversation_id: cid, sender_id: saya.id, content });
    if (error) alert('Gagal mengirim: ' + error.message);
  };
})();

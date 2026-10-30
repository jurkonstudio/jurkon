(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const cid = param('id');
  const { data: c } = await db.from('conversations').select('*').eq('id', cid).maybeSingle();
  if (!c) { $('#isi').innerHTML = '<div class="kosong">' + esc(t('chat.noConv')) + '</div>'; return; }
  const { data: o } = await db.from('profiles').select('username,nama,foto_url').eq('id', c.user_a === saya.id ? c.user_b : c.user_a).maybeSingle();
  const namaLawan = o ? (o.nama || o.username) : t('pesan.pengguna');
  $('#lawan').innerHTML = avatar(namaLawan, 30, o && o.foto_url) + '<span>' + esc(namaLawan) + '</span>' + lencanaResmi(o && o.username);
  $('#teks').placeholder = t('chat.phNama', { nama: namaLawan });
  pasangHitung($('#teks'), $('#hitung'), 750);
  pasangFilter($('#teks'));

  // Pesan hanya boleh dikirim bila kedua akun saling mengikuti (juga ditegakkan di database, migrasi 014).
  // Riwayat tetap terbaca; hanya kotak kirim yang dikunci.
  const lawanId = c.user_a === saya.id ? c.user_b : c.user_a;
  let boleh = true;
  const placeholderAsli = $('#teks').placeholder;
  function aturKirim(ok) {
    boleh = ok;
    const syarat = $('#syarat');
    $('#teks').disabled = !ok; $('#kirim').disabled = !ok;
    $('#teks').placeholder = ok ? placeholderAsli : t('chat.phKunci');
    syarat.hidden = ok;
    if (!ok) {
      syarat.innerHTML = esc(t('chat.syarat', { nama: namaLawan })) +
        (o && o.username ? ' <a href="profil.html?u=' + encodeURIComponent(o.username) + '">' + esc(t('chat.lihatProfil')) + '</a>' : '');
    }
  }
  // true bila saling mengikuti. Bila jaringan gagal, anggap boleh: database tetap yang memutuskan.
  async function cekSalingIkuti() {
    const { data, error } = await db.from('follows').select('follower_id,following_id')
      .or('and(follower_id.eq.' + saya.id + ',following_id.eq.' + lawanId + '),and(follower_id.eq.' + lawanId + ',following_id.eq.' + saya.id + ')');
    if (error) return true;
    return (data || []).length >= 2;
  }
  aturKirim(await cekSalingIkuti());
  // Status bisa berubah saat tab ditinggalkan (mis. dia berhenti mengikuti): cek ulang ketika kembali
  document.addEventListener('visibilitychange', async () => { if (!document.hidden) aturKirim(await cekSalingIkuti()); });

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
  if (ep) { $('#isi').innerHTML = '<div class="kosong">' + esc(t('chat.gagalMuat', { pesan: ep.message })) + '</div>'; return; }
  (pesan || []).slice().reverse().forEach(tampil);
  if (!pesan || !pesan.length) $('#isi').innerHTML = kosong('pesan', t('chat.mulaiJ'), esc(t('chat.sapa', { nama: namaLawan })));

  db.channel('chat-' + cid).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid },
    p => { tampil(p.new); if (p.new.sender_id !== saya.id && window.Notif) Notif.tandaiPercakapan(cid); }).subscribe();
  if (window.Notif) Notif.tandaiPercakapan(cid);

  const kirim = async () => {
    const tombol = $('#kirim'), kotak = $('#teks');
    const content = kotak.value.trim();
    if (!boleh || !content || tombol.disabled) return;
    if (!bolehKirim(content, m => alert(m))) return;
    tombol.disabled = true;
    // Pesan sendiri langsung tampil dari hasil insert, tidak bergantung pada realtime
    const { data, error } = await db.from('messages')
      .insert({ conversation_id: cid, sender_id: saya.id, content }).select().single();
    tombol.disabled = false;
    if (error) {
      // Teks dipertahankan agar tidak hilang saat gagal
      if (error.code === '42501') {
        // Ditolak database: paling sering karena tidak lagi saling mengikuti
        const ok = await cekSalingIkuti();
        aturKirim(ok);
        alert(t('chat.gagalKirim', { pesan: ok ? t('chat.tidakBisa') : t('chat.syaratPendek') }));
        return;
      }
      alert(t('chat.gagalKirim', { pesan: pesanGalatChat(error) }));
      return;
    }
    kotak.value = ''; kotak.dispatchEvent(new Event('input'));
    tampil(data);
  };
  function pesanGalatChat(e) {
    const m = (e && e.message) || '';
    const dilarang = pesanKontenDilarang(e);
    if (dilarang) return dilarang;
    if (/failed to fetch|networkerror|load failed|network request/i.test(m)) return t('err.offline');
    return m || t('err.umum');
  }
  $('#kirim').onclick = kirim;
  $('#teks').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); kirim(); } });
})();

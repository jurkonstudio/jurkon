// Notifikasi: jumlah belum dibaca, realtime, dan bantuan penyusun kalimat.
// Dimuat setelah supabase.js/ui.js dan SEBELUM nav.js. Aman bila migrasi 005 belum dijalankan.
(function () {
  if (window.Notif) return;
  const KUNCI = 'notifJumlah';
  const PILIH = 'id,jenis,dibaca,created_at,post_id,conversation_id,' +
    'actor:profiles!actor_id(id,username,nama),post:posts!post_id(id,content,parent_id)';
  const pendengar = [], pendengarBaru = [];
  const s = { total: 0, pesan: 0, siap: false, aktif: true };
  let uid = null, timer = null;

  // Tampilkan jumlah terakhir yang diketahui supaya lencana langsung muncul saat pindah halaman
  try {
    const c = JSON.parse(sessionStorage.getItem(KUNCI) || 'null');
    if (c) { s.total = c.t | 0; s.pesan = c.p | 0; }
  } catch (e) {}

  function simpan() {
    try { sessionStorage.setItem(KUNCI, JSON.stringify({ u: uid, t: s.total, p: s.pesan })); } catch (e) {}
  }
  function kabari() {
    pendengar.forEach(f => { try { f(s); } catch (e) {} });
    const dasar = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = s.total > 0 ? '(' + (s.total > 99 ? '99+' : s.total) + ') ' + dasar : dasar;
  }
  function setJumlah(t, p) {
    const berubah = t !== s.total || p !== s.pesan;
    s.total = Math.max(0, t); s.pesan = Math.max(0, p);
    simpan();
    if (berubah || !s.siap) { s.siap = true; kabari(); }
  }

  async function muat() {
    if (!uid) return;
    const { data, error } = await db.rpc('jumlah_notifikasi_baru');
    if (error || !data) { s.aktif = false; return; }
    s.aktif = true;
    setJumlah(Number(data.total) || 0, Number(data.pesan) || 0);
  }
  function muatTunda() { clearTimeout(timer); timer = setTimeout(muat, 300); }

  // Menandai dibaca. ids = array id notifikasi, atau null untuk semua.
  async function tandai(ids) {
    const { data, error } = await db.rpc('tandai_notifikasi_dibaca', { ids: ids && ids.length ? ids : null });
    if (error) return { error };
    await muat();
    return { jumlah: data };
  }
  // Dipakai chat.js: pesan di percakapan yang sedang dibuka otomatis dianggap dibaca
  async function tandaiPercakapan(cid) {
    if (!uid || !cid) return;
    const { error } = await db.from('notifications').update({ dibaca: true })
      .eq('user_id', uid).eq('conversation_id', cid).eq('dibaca', false);
    if (!error) muatTunda();
  }

  const potong = (t, n) => { const a = Array.from(String(t || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, n).join('') + '\u2026' : a.join(''); };

  // Baris notifikasi -> { html: kalimat (sudah di-escape), cuplikan (teks biasa), href }
  function kalimat(n) {
    const a = n.actor || {};
    const nama = '<b>' + esc(a.nama || a.username || 'Seseorang') + '</b>';
    const profil = a.username ? 'profil.html?u=' + encodeURIComponent(a.username) : 'notifikasi.html';
    const p = n.post;
    if (n.jenis === 'suka') return { html: nama + ' menyukai catatanmu', cuplikan: p ? potong(p.content, 90) : '', href: p ? 'detail.html?id=' + p.id : profil };
    if (n.jenis === 'balasan') return { html: nama + ' membalas catatanmu', cuplikan: p ? potong(p.content, 90) : '', href: p && p.parent_id ? 'detail.html?id=' + p.parent_id : profil };
    if (n.jenis === 'ikuti') return { html: nama + ' mulai mengikutimu', cuplikan: '', href: profil };
    if (n.jenis === 'pesan') return { html: nama + ' mengirim pesan baru', cuplikan: '', href: n.conversation_id ? 'chat.html?id=' + n.conversation_id : 'pesan.html' };
    return { html: nama + ' berinteraksi denganmu', cuplikan: '', href: profil };
  }

  async function terbaru(jumlah, sebelum) {
    let q = db.from('notifications').select(PILIH).order('created_at', { ascending: false }).limit(jumlah || 5);
    if (sebelum) q = q.lt('created_at', sebelum);
    return q;
  }

  async function mulai() {
    let sesi = null;
    try { sesi = (await db.auth.getSession()).data.session; } catch (e) {}
    if (!sesi) return;
    uid = sesi.user.id;
    try {
      const c = JSON.parse(sessionStorage.getItem(KUNCI) || 'null');
      if (c && c.u && c.u !== uid) { s.total = 0; s.pesan = 0; }
    } catch (e) {}
    await muat();
    if (!s.aktif) return; // migrasi belum dijalankan: tanpa lencana, tanpa langganan realtime
    db.channel('notif-' + uid).on('postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid },
      p => {
        if (p.eventType === 'INSERT') pendengarBaru.forEach(f => { try { f(p.new); } catch (e) {} });
        muatTunda();
      }).subscribe();
    // Cadangan bila koneksi realtime terputus (mis. tab di latar belakang)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) muat(); });
    window.addEventListener('online', muat);
  }

  window.Notif = {
    get total() { return s.total; }, get pesan() { return s.pesan; }, get aktif() { return s.aktif; },
    pada(f) { pendengar.push(f); if (s.siap || s.total || s.pesan) { try { f(s); } catch (e) {} } },
    padaBaru(f) { pendengarBaru.push(f); },
    muat, tandai, tandaiPercakapan, terbaru, kalimat, potong
  };
  mulai();
})();

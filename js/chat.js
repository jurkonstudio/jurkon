(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const cid = param('id');
  const { data: c } = await db.from('conversations').select('id,user_a,user_b').eq('id', cid).maybeSingle();
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
    $('#teks').disabled = !ok; $('#kirim').disabled = !ok; $('#btnFoto').disabled = !ok; $('#btnMik').disabled = !ok;
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

  // Foto & pesan suara (migrasi 017). Tanpa migrasi, tombol media disembunyikan dan chat teks tetap jalan.
  const adaMedia = !(await db.from('messages').select('media_path').limit(1)).error;
  const KOLOM = 'id,conversation_id,sender_id,content,created_at' + (adaMedia ? ',media_jenis,media_path' : '');
  const bisaSuara = adaMedia && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  $('#btnFoto').hidden = !adaMedia; $('#btnMik').hidden = !bisaSuara;

  // Berkas media hanya bisa dibuka 10 menit sejak dikirim. Ditegakkan di database (kebijakan baca storage);
  // di sini layar menghitung mundur lalu menggantinya dengan penanda "sudah hilang".
  const BUCKET = 'media-pesan', MASA = 10 * 60 * 1000, MAKS_SUARA = 60;
  const aktif = new Map();   // id pesan -> { d, m }: gelembung media yang sedang menghitung mundur
  let jam = null;
  const sisaMs = m => new Date(m.created_at).getTime() + MASA - Date.now();
  const labelSisa = ms => ms < 60000 ? t('chat.hilangSebentar') : t('chat.hilangDalam', { n: Math.ceil(ms / 60000) });
  function kedaluwarsa(d, m) {
    aktif.delete(m.id);
    d.querySelectorAll('audio').forEach(a => { a.pause(); a.removeAttribute('src'); a.load(); });
    d.classList.add('hilang');
    d.textContent = '🕒 ' + t(m.media_jenis === 'foto' ? 'chat.fotoKedaluwarsa' : 'chat.suaraKedaluwarsa');
  }
  function detakJam() {
    aktif.forEach(({ d, m }) => {
      const s = sisaMs(m);
      if (s <= 0) { kedaluwarsa(d, m); return; }
      const l = d.querySelector('.sisa'); if (l) l.textContent = labelSisa(s);
    });
    if (!aktif.size && jam) { clearInterval(jam); jam = null; }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) detakJam(); });
  async function isiMedia(d, m) {
    const s = sisaMs(m);
    if (s <= 0) return kedaluwarsa(d, m);
    // Tautan bertanda tangan berlaku hanya sampai sisa waktu; bila database menolak (sudah lewat), tampil "hilang"
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(m.media_path, Math.ceil(s / 1000));
    if (error || !data) return kedaluwarsa(d, m);
    let el;
    if (m.media_jenis === 'foto') {
      el = new Image(); el.alt = t('chat.fotoAlt'); el.decoding = 'async';
      el.onload = () => window.scrollTo(0, document.body.scrollHeight);
    } else {
      el = document.createElement('audio'); el.controls = true; el.preload = 'metadata';
      el.setAttribute('aria-label', t('chat.suaraAria'));
    }
    el.src = data.signedUrl;
    const l = document.createElement('div'); l.className = 'sisa'; l.textContent = labelSisa(s);
    d.textContent = ''; d.append(el, l);
    aktif.set(m.id, { d, m });
    if (!jam) jam = setInterval(detakJam, 5000);
  }
  const sudah = new Set();
  let terakhir = null;   // waktu pesan terbaru yang sudah tampil (untuk menyusul pesan yang terlewat)
  const tampil = m => {
    if (sudah.has(m.id)) return;
    const k = $('#isi .kosong'); if (k) k.remove();
    sudah.add(m.id);
    if (!terakhir || m.created_at > terakhir) terakhir = m.created_at;
    const d = document.createElement('div');
    d.className = 'bubble ' + (m.sender_id === saya.id ? 'saya' : 'lawan');
    if (m.media_path) { d.className += ' media'; isiMedia(d, m); } else d.textContent = m.content;
    $('#isi').appendChild(d);
    window.scrollTo(0, document.body.scrollHeight);
  };

  // Ambil 200 pesan TERBARU (tanpa batas, Supabase hanya mengembalikan 1000 pesan TERLAMA)
  const { data: pesan, error: ep } = await db.from('messages').select(KOLOM)
    .eq('conversation_id', cid).order('created_at', { ascending: false }).limit(200);
  if (ep) { $('#isi').innerHTML = '<div class="kosong">' + esc(t('chat.gagalMuat', { pesan: galatRamah(ep) })) + '</div>'; return; }
  (pesan || []).slice().reverse().forEach(tampil);
  // Cadangan pembersihan: pengirim membuang berkas miliknya yang sudah kedaluwarsa (24 jam terakhir).
  // Pembuangan menyeluruh dilakukan Edge Function terjadwal (lihat README).
  if (adaMedia) {
    const lama = (pesan || []).filter(m => m.media_path && m.sender_id === saya.id && sisaMs(m) <= 0 && sisaMs(m) > -86400000)
      .map(m => m.media_path).slice(0, 50);
    if (lama.length) db.storage.from(BUCKET).remove(lama).catch(() => {});
  }
  if (!pesan || !pesan.length) $('#isi').innerHTML = kosong('pesan', t('chat.mulaiJ'), esc(t('chat.sapa', { nama: namaLawan })));

  // Menyusul pesan yang terlewat saat koneksi realtime putus (sinyal hilang, tab di latar belakang).
  // Aman dipanggil berulang: pesan yang sudah tampil dilewati.
  let susulSibuk = false;
  async function susul() {
    if (susulSibuk) return;
    susulSibuk = true;
    try {
      let q = db.from('messages').select(KOLOM).eq('conversation_id', cid)
        .order('created_at', { ascending: true }).limit(200);
      if (terakhir) q = q.gte('created_at', terakhir);
      const { data, error } = await q;
      if (!error && data) {
        const baru = data.filter(m => !sudah.has(m.id));
        baru.forEach(tampil);
        if (baru.some(m => m.sender_id !== saya.id) && window.Notif) Notif.tandaiPercakapan(cid);
      }
    } catch (e) {} finally { susulSibuk = false; }
  }
  db.channel('chat-' + cid).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid },
    p => { tampil(p.new); if (p.new.sender_id !== saya.id && window.Notif) Notif.tandaiPercakapan(cid); })
    .subscribe(status => { if (status === 'SUBSCRIBED') susul(); });   // juga menutup celah antara muat awal dan langganan aktif
  document.addEventListener('visibilitychange', () => { if (!document.hidden) susul(); });
  window.addEventListener('online', susul);
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
    if (error) { await galatKirim(error); return; }   // teks dipertahankan agar tidak hilang saat gagal
    kotak.value = ''; kotak.dispatchEvent(new Event('input'));
    tampil(data);
  };
  function pesanGalatChat(e) { return galatRamah(e); }
  $('#kirim').onclick = kirim;
  $('#teks').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); kirim(); } });
  // Galat kirim (teks maupun media). dariUnggah = galat berasal dari unggahan berkas.
  async function galatKirim(error, dariUnggah) {
    const pesan = (error && error.message) || '';
    if (/bucket not found/i.test(pesan)) { alert(t('chat.mediaBucket')); return; }
    if (error.code === '42501' || (dariUnggah && /row-level security|unauthorized|403/i.test(pesan + ' ' + (error.statusCode || '')))) {
      // Ditolak database: paling sering karena tidak lagi saling mengikuti (atau batas media tercapai)
      const ok = await cekSalingIkuti();
      aturKirim(ok);
      alert(t('chat.gagalKirim', { pesan: ok ? t(dariUnggah ? 'chat.mediaBatas' : 'chat.tidakBisa') : t('chat.syaratPendek') }));
      return;
    }
    alert(t('chat.gagalKirim', { pesan: pesanGalatChat(error) }));
  }

  // ---- Kirim foto & pesan suara ----
  let sibuk = false;
  const idAcak = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  function kunciMedia(ya) { sibuk = ya; $('#btnFoto').disabled = ya || !boleh; $('#btnMik').disabled = ya || !boleh; }
  async function kirimMedia(blob, jenis, mime, ekstensi) {
    if (!boleh || sibuk) return;
    kunciMedia(true);
    const path = cid + '/' + saya.id + '/' + idAcak() + '.' + ekstensi;
    try {
      const { error: eu } = await db.storage.from(BUCKET).upload(path, blob, { contentType: mime, cacheControl: '60', upsert: false });
      if (eu) { await galatKirim(eu, true); return; }
      const { data, error } = await db.from('messages')
        .insert({ conversation_id: cid, sender_id: saya.id, content: '', media_jenis: jenis, media_path: path }).select().single();
      if (error) { db.storage.from(BUCKET).remove([path]).catch(() => {}); await galatKirim(error); return; }
      tampil(data);
    } catch (e) {
      alert(t('chat.gagalKirim', { pesan: pesanGalatChat(e) }));
    } finally { kunciMedia(false); }
  }

  // Foto: dikecilkan (maks 1280px) dan disimpan ulang sebagai JPEG, sehingga data EXIF/lokasi hilang
  function kecilkanFoto(file, maks) {
    maks = maks || 1280;
    return new Promise((ok, gagal) => {
      if (!/^image\//.test(file.type)) return gagal(new Error(t('pf.foto.format')));
      if (file.size > 15 * 1024 * 1024) return gagal(new Error(t('pf.foto.besar')));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error(t('pf.foto.kosong'));
          const k = Math.min(1, maks / Math.max(w, h));
          const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(b => b ? ok(b) : gagal(new Error(t('pf.foto.proses'))), 'image/jpeg', 0.8);
        } catch (e) { URL.revokeObjectURL(url); gagal(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error(t('pf.foto.baca'))); };
      img.src = url;
    });
  }
  $('#btnFoto').onclick = () => { if (boleh && !sibuk) $('#foto').click(); };
  $('#foto').onchange = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f || !boleh || sibuk) return;
    let blob;
    try { blob = await kecilkanFoto(f); } catch (err) { alert(err.message); return; }
    if (!confirm(t('chat.konfirmFoto'))) return;
    await kirimMedia(blob, 'foto', 'image/jpeg', 'jpg');
  };

  // Pesan suara: rekam maks 60 detik. mp4/AAC didahulukan karena paling luas bisa diputar (termasuk iPhone).
  const EKSTENSI_SUARA = { 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/x-m4a': 'm4a' };
  const mimeSuara = () => ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x)) || '';
  let rec = null, strm = null, potong = [], mulai = 0, penghitung = null;
  const tampilRekam = on => { $('#rekam').hidden = !on; $('#teks').hidden = on; $('#barisKirim').hidden = on; };
  async function mulaiRekam() {
    if (!boleh || sibuk || rec) return;
    try { strm = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { alert(t('chat.mikTolak')); return; }
    const mime = mimeSuara();
    try { rec = new MediaRecorder(strm, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined); }
    catch (e) { strm.getTracks().forEach(x => x.stop()); strm = null; alert(t('chat.mikTolak')); return; }
    potong = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) potong.push(e.data); };
    rec.start();
    mulai = Date.now();
    $('#rekamWaktu').textContent = '0:00';
    tampilRekam(true);
    penghitung = setInterval(() => {
      const d = Math.floor((Date.now() - mulai) / 1000);
      $('#rekamWaktu').textContent = Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0');
      if (d >= MAKS_SUARA) akhiriRekam(true);
    }, 250);
  }
  function akhiriRekam(kirimkan) {
    if (!rec) return;
    const r = rec, lama = Date.now() - mulai;
    rec = null; clearInterval(penghitung);
    r.onstop = async () => {
      if (strm) strm.getTracks().forEach(x => x.stop());
      strm = null; tampilRekam(false);
      if (!kirimkan) return;
      if (lama < 800 || !potong.length) { alert(t('chat.suaraPendek')); return; }
      const tipe = (r.mimeType || potong[0].type || 'audio/webm').split(';')[0];
      await kirimMedia(new Blob(potong, { type: tipe }), 'suara', tipe, EKSTENSI_SUARA[tipe] || 'webm');
    };
    try { r.stop(); } catch (e) { r.onstop(); }
  }
  $('#btnMik').onclick = mulaiRekam;
  $('#rekamBatal').onclick = () => akhiriRekam(false);
  $('#rekamKirim').onclick = () => akhiriRekam(true);
  window.addEventListener('pagehide', () => akhiriRekam(false));
})();

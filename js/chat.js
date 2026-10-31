(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const cid = param('id');
  const { data: c } = await db.from('conversations').select('id,user_a,user_b').eq('id', cid).maybeSingle();
  if (!c) { $('#isi').innerHTML = '<div class="kosong">' + esc(t('chat.noConv')) + '</div>'; return; }
  const { data: o } = await db.from('profiles').select('username,nama,foto_url').eq('id', c.user_a === saya.id ? c.user_b : c.user_a).maybeSingle();
  const namaLawan = o ? (o.nama || o.username) : t('pesan.pengguna');
  const isiLawan = avatar(namaLawan, 38, o && o.foto_url) +
    '<span class="psn-nm"><b>' + esc(namaLawan) + lencanaResmi(o && o.username) + '</b>' + (o && o.username ? '<small>@' + esc(o.username) + '</small>' : '') + '</span>';
  $('#lawan').innerHTML = o && o.username
    ? '<a class="psn-profil" href="profil.html?u=' + encodeURIComponent(o.username) + '">' + isiLawan + '</a>'
    : '<span class="psn-profil">' + isiLawan + '</span>';
  if (o && o.username) document.title = namaLawan + ' · Jurkon';
  $('#teks').placeholder = t('chat.ph');   // nama lawan bicara sudah tampil di kepala halaman
  pasangHitung($('#teks'), $('#hitung'), 750);
  pasangFilter($('#teks'));
  // Kotak tulis tumbuh sampai ±5 baris; tombol kirim redup saat kosong; penghitung hanya muncul mendekati batas
  (function () {
    const kotak = $('#teks'), btn = $('#kirim'), hit = $('#hitung');
    const atur = () => {
      kotak.style.height = '';
      if (kotak.value) kotak.style.height = Math.min(kotak.scrollHeight, 128) + 'px';
      btn.classList.toggle('kosong', !kotak.value.trim());
      hit.classList.toggle('tampil', kotak.value.length >= 600);
    };
    kotak.addEventListener('input', atur);
    atur();
  })();

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
  // Edit & hapus pesan (migrasi 033). Tanpa migrasi, menu pesan hanya menawarkan Salin dan chat tetap jalan.
  const adaEdit = !(await db.from('messages').select('dihapus_at').limit(1)).error;
  const KOLOM = 'id,conversation_id,sender_id,content,created_at' + (adaMedia ? ',media_jenis,media_path' : '') + (adaEdit ? ',diedit_at,dihapus_at' : '');
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
  const peta = new Map();   // id pesan -> { d, m }: gelembung yang tampil, untuk pembaruan (edit/hapus) tanpa muat ulang
  let terakhir = null;   // waktu pesan terbaru yang sudah tampil (untuk menyusul pesan yang terlewat)
  // Pemisah waktu ala aplikasi chat: label hari saat hari berganti, jam saja bila jeda > 30 menit.
  // Gelembung beruntun dari pengirim yang sama (jeda < 5 menit) dirapatkan dan sudutnya disambung.
  let tglAkhir = '', waktuAkhir = 0, pengirimAkhir = null;
  const jamTeks = d => d.toLocaleTimeString(I18n.locale, { hour: '2-digit', minute: '2-digit' });
  const huruf = x => x.charAt(0).toUpperCase() + x.slice(1);
  function labelHari(d) {
    const awal = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const sel = Math.round((awal(new Date()) - awal(d)) / 86400000);
    if (sel <= 0) return t('chat.hariIni');
    if (sel === 1) return huruf(t('waktu.kemarin'));
    return d.toLocaleDateString(I18n.locale, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  const tampil = m => {
    if (sudah.has(m.id)) return;
    const k = $('#isi .kosong'); if (k) k.remove();
    sudah.add(m.id);
    if (!terakhir || m.created_at > terakhir) terakhir = m.created_at;
    const waktuM = new Date(m.created_at), ms = waktuM.getTime();
    const kunciTgl = waktuM.getFullYear() + '-' + waktuM.getMonth() + '-' + waktuM.getDate();
    let label = '';
    if (kunciTgl !== tglAkhir) label = labelHari(waktuM) + ' · ' + jamTeks(waktuM);
    else if (ms - waktuAkhir > 30 * 60000) label = jamTeks(waktuM);
    if (label) { const p = document.createElement('div'); p.className = 'psn-hari'; p.textContent = label; $('#isi').appendChild(p); }
    const dari = m.sender_id === saya.id ? 'saya' : 'lawan';
    const d = document.createElement('div');
    d.className = 'bubble ' + dari;
    if (!label && pengirimAkhir === dari && ms - waktuAkhir < 5 * 60000) d.className += ' sambung';
    d.title = waktuM.toLocaleString(I18n.locale, { dateStyle: 'medium', timeStyle: 'short' });
    tglAkhir = kunciTgl; waktuAkhir = ms; pengirimAkhir = dari;
    d.dataset.id = m.id;
    peta.set(m.id, { d, m });
    isiGelembung(d, m);
    $('#isi').appendChild(d);
    window.scrollTo(0, document.body.scrollHeight);
  };


  // ---- Isi gelembung, menu pesan (salin / edit / hapus), dan mode edit ----
  const MASA_EDIT = 24 * 3600 * 1000;   // harus sama dengan batas di edit_pesan() (migrasi 033)
  function isiGelembung(d, m) {
    d.classList.remove('media', 'hilang', 'dihapus');
    if (m.dihapus_at) {
      aktif.delete(m.id);
      d.querySelectorAll('audio').forEach(a => { a.pause(); a.removeAttribute('src'); a.load(); });
      d.classList.add('hilang', 'dihapus');
      d.textContent = '🚫 ' + t('chat.dihapus');
    } else if (m.media_path) {
      d.classList.add('media');
      isiMedia(d, m);
    } else {
      d.textContent = m.content;
      if (m.diedit_at) {
        const l = document.createElement('span');
        l.className = 'diedit'; l.textContent = t('chat.diedit');
        d.append(' ', l);
      }
    }
    const ada = daftarAksi(m).length > 0;
    if (ada) { d.tabIndex = 0; d.setAttribute('aria-haspopup', 'dialog'); }
    else { d.removeAttribute('tabindex'); d.removeAttribute('aria-haspopup'); }
  }
  // Menerapkan perubahan dari server atau dari aksi sendiri. Dilewati bila tidak ada yang berubah
  // (susul() memanggilnya berulang; gelembung media tidak boleh digambar ulang tanpa perlu).
  function perbarui(baru) {
    const e = peta.get(baru.id);
    if (!e) return;
    const sama = (a, b) => (a || null) === (b || null);
    if (sama(baru.dihapus_at, e.m.dihapus_at) && sama(baru.diedit_at, e.m.diedit_at)) return;
    e.m = Object.assign({}, e.m, baru);
    isiGelembung(e.d, e.m);
    if (editId === e.m.id && e.m.dihapus_at) keluarEdit();   // pesan yang sedang diedit dihapus dari perangkat lain
  }
  const bisaEdit = m => adaEdit && boleh && m.sender_id === saya.id && !m.dihapus_at && !m.media_path &&
    Date.now() - new Date(m.created_at).getTime() < MASA_EDIT;
  function daftarAksi(m) {
    if (m.dihapus_at) return [];
    const a = [];
    if (!m.media_path && m.content) a.push('salin');
    if (bisaEdit(m)) a.push('edit');
    if (adaEdit && m.sender_id === saya.id) a.push('hapus');
    return a;
  }
  const IKON = {
    salin: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    hapus: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
  };
  const svgIkon = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + IKON[k] + '</svg>';

  function bukaMenu(m) {
    const aksi = daftarAksi(m);
    if (!aksi.length) return;
    const lama = document.getElementById('menuPesan'); if (lama) lama.remove();
    const d = document.createElement('dialog');
    d.id = 'menuPesan'; d.className = 'lembar lembar-psn'; d.setAttribute('aria-label', t('chat.menuAria'));
    const cuplik = m.media_path ? '' : '<p class="psn-cuplik">' + esc(m.content) + '</p>';
    d.innerHTML = cuplik + '<div class="psn-aksi">' + aksi.map(k =>
      '<button type="button" data-k="' + k + '"' + (k === 'hapus' ? ' class="bahaya"' : '') + '>' + svgIkon(k) + '<span>' + esc(t('chat.' + k)) + '</span></button>').join('') + '</div>';
    document.body.appendChild(d);
    const tutup = () => { if (d.open) d.close(); d.remove(); };
    d.onclick = e => {
      if (e.target === d) return tutup();
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      if (b.dataset.k === 'salin') { tutup(); salinPesan(m); }
      else if (b.dataset.k === 'edit') { tutup(); mulaiEdit(m); }
      else if (b.dataset.k === 'hapus') {
        // Konfirmasi di dalam lembar yang sama (tanpa kotak dialog bawaan browser)
        d.innerHTML = '<div class="lembar-kepala"><h2>' + esc(t('chat.hapusJ')) + '</h2></div>' +
          '<p class="psn-hapus-t">' + esc(t('chat.hapusT', { nama: namaLawan })) + '</p>' +
          '<div class="form"><div class="tombol"><button type="button" class="btn garis" data-k="batal">' + esc(t('chat.batal')) + '</button>' +
          '<button type="button" class="btn bahaya utama" data-k="ya">' + esc(t('chat.hapus')) + '</button></div></div>';
        const ya = d.querySelector('[data-k="ya"]'); if (ya) ya.focus();
      }
      else if (b.dataset.k === 'batal') tutup();
      else if (b.dataset.k === 'ya') { tutup(); hapusPesan(m); }
    };
    d.addEventListener('cancel', () => setTimeout(() => d.remove(), 0));
    d.showModal();
  }
  async function salinPesan(m) {
    try { await navigator.clipboard.writeText(m.content); toastUmum(t('chat.salinOk')); }
    catch (e) { prompt(t('pc.salinManual'), m.content); }
  }
  async function hapusPesan(m) {
    const { data, error } = await db.rpc('hapus_pesan', { p_id: m.id });
    if (error) { alert(t('chat.gagalHapus', { pesan: galatRamah(error) })); return; }
    if (data) db.storage.from(BUCKET).remove([data]).catch(() => {});   // foto/suara ikut dibuang dari storage
    perbarui({ id: m.id, dihapus_at: new Date().toISOString(), diedit_at: null });
  }
  // Ketuk gelembung (atau Enter/Spasi saat terfokus) membuka menu. Memilih teks atau memutar suara tidak membukanya.
  $('#isi').addEventListener('click', e => {
    const d = e.target.closest('.bubble[data-id]');
    if (!d || e.target.closest('audio, a')) return;
    const sel = window.getSelection && window.getSelection().toString();
    if (sel) return;
    const x = peta.get(d.dataset.id);
    if (x) bukaMenu(x.m);
  });
  $('#isi').addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== ' ') || e.target.nodeName === 'AUDIO') return;
    const d = e.target.closest && e.target.closest('.bubble[data-id][tabindex]');
    if (!d || d !== e.target) return;
    e.preventDefault();
    const x = peta.get(d.dataset.id);
    if (x) bukaMenu(x.m);
  });

  // Mode edit: kotak tulis dipakai ulang. Draf yang sedang diketik disimpan lalu dipulihkan setelah selesai.
  let editId = null, drafAsli = '';
  function mulaiEdit(m) {
    if (!bisaEdit(m)) return;
    const kotak = $('#teks');
    editId = m.id; drafAsli = kotak.value;
    kotak.value = m.content; kotak.dispatchEvent(new Event('input'));
    $('#editCuplikan').textContent = m.content;
    $('#editBar').hidden = false;
    $('#kirim').classList.add('simpan'); $('#kirim').setAttribute('aria-label', t('chat.simpan'));
    $('#btnFoto').hidden = true; $('#btnMik').hidden = true;
    kotak.focus(); kotak.setSelectionRange(kotak.value.length, kotak.value.length);
  }
  function keluarEdit() {
    if (editId === null) return;
    editId = null;
    $('#editBar').hidden = true;
    $('#kirim').classList.remove('simpan'); $('#kirim').setAttribute('aria-label', t('umum.kirim'));
    $('#btnFoto').hidden = !adaMedia; $('#btnMik').hidden = !bisaSuara;
    $('#teks').value = drafAsli; $('#teks').dispatchEvent(new Event('input'));
  }
  async function simpanEdit(isi) {
    const e = peta.get(editId), tombol = $('#kirim');
    if (!e || e.m.dihapus_at) { keluarEdit(); return; }
    if (isi === e.m.content) { keluarEdit(); return; }
    if (!bolehKirim(isi, m => alert(m))) return;
    tombol.disabled = true;
    const { data, error } = await db.rpc('edit_pesan', { p_id: editId, p_isi: isi });
    tombol.disabled = !boleh;
    if (error) {
      // Paling sering: tidak lagi saling mengikuti, lebih dari 24 jam, atau kata terlarang. Teks tetap di kotak.
      const ok = await cekSalingIkuti();
      aturKirim(ok);
      alert(t('chat.gagalEdit', { pesan: galatRamah(error) }));
      if (!ok) keluarEdit();
      return;
    }
    const id = editId;
    keluarEdit();
    perbarui({ id, content: isi, diedit_at: data || new Date().toISOString() });
  }
  $('#editBatal').onclick = keluarEdit;
  $('#teks').addEventListener('keydown', e => { if (e.key === 'Escape' && editId !== null) { e.preventDefault(); keluarEdit(); } });

  // Draf per percakapan disimpan di perangkat (dihapus otomatis saat keluar akun, awalan jk:)
  const KUNCI_DRAF = 'jk:draf:' + cid;
  $('#teks').addEventListener('input', () => {
    if (editId !== null) return;
    try { const v = $('#teks').value; if (v) localStorage.setItem(KUNCI_DRAF, v); else localStorage.removeItem(KUNCI_DRAF); } catch (e) {}
  });
  try { const dr = localStorage.getItem(KUNCI_DRAF); if (dr && !$('#teks').value) { $('#teks').value = dr; $('#teks').dispatchEvent(new Event('input')); } } catch (e) {}

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
      // Edit/hapus yang terjadi saat koneksi putus: periksa 50 pesan terbaru yang sudah tampil
      if (adaEdit) {
        const { data: terbaru } = await db.from('messages').select(KOLOM).eq('conversation_id', cid)
          .order('created_at', { ascending: false }).limit(50);
        (terbaru || []).forEach(m => { if (sudah.has(m.id)) perbarui(m); });
      }
    } catch (e) {} finally { susulSibuk = false; }
  }
  db.channel('chat-' + cid).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid },
    p => { tampil(p.new); if (p.new.sender_id !== saya.id && window.Notif) Notif.tandaiPercakapan(cid); })
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid },
      p => perbarui(p.new))
    .subscribe(status => { if (status === 'SUBSCRIBED') susul(); });   // juga menutup celah antara muat awal dan langganan aktif
  document.addEventListener('visibilitychange', () => { if (!document.hidden) susul(); });
  window.addEventListener('online', susul);
  if (window.Notif) Notif.tandaiPercakapan(cid);

  const kirim = async () => {
    const tombol = $('#kirim'), kotak = $('#teks');
    const content = kotak.value.trim();
    if (!boleh || !content || tombol.disabled) return;
    if (editId !== null) return simpanEdit(content);
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

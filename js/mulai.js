// Onboarding 3 langkah setelah pengguna baru memilih username (selamat.html -> mulai.html). Semua langkah boleh dilewati.
//   1) ikuti beberapa akun (saran_akun, sql/044)   2) tulis catatan pertama   3) bagikan tautan undangan + pasang ke layar utama
// Angka corong tanpa data pribadi: onboarding_mulai dan onboarding_selesai (js/corong.js). Halaman ini bisa dibuka lagi kapan saja.
(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const { data: prof } = await db.from('profiles').select('username,nama').eq('id', saya.id).maybeSingle();
  const username = prof ? prof.username : '';
  const kotak = $('#mulai');
  const PEMANTIK = ['mulai.p1', 'mulai.p2', 'mulai.p3', 'mulai.p4'];
  let langkah = 1, saran = null, jumlahIkut = 0, terpasang = null;
  if (window.catatCorong) catatCorong('onboarding_mulai');

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); terpasang = e; const b = $('#pasang'); if (b) b.hidden = false; });

  const kepala = (n, j, tk) => `<p class="mulai-langkah">${esc(t('mulai.langkah', { n }))}</p>
    <div class="mulai-titik" aria-hidden="true">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}"></span>`).join('')}</div>
    <h2>${esc(t(j))}</h2><p class="mulai-teks">${esc(t(tk))}</p>`;

  async function langkah1() {
    kotak.innerHTML = kepala(1, 'mulai.s1.j', 'mulai.s1.t') + '<div id="saran" class="mulai-saran"><p class="hitung">' + esc(t('umum.memuat')) + '</p></div>' +
      '<div class="mulai-aksi"><button class="btn" id="lanjut">' + esc(t('mulai.lanjut')) + '</button></div>';
    $('#lanjut').onclick = () => { langkah = 2; tampil(); };
    if (saran === null) {
      try { const r = await db.rpc('saran_akun', { p_limit: 8 }); saran = r.error ? false : (r.data || []); } catch (e) { saran = false; }
    }
    const el = $('#saran'); if (!el) return;
    if (saran === false) { el.innerHTML = '<p class="hitung">' + esc(t('mulai.s1.gagal')) + '</p>'; return; }
    if (!saran.length) { el.innerHTML = '<p class="hitung">' + esc(t('mulai.s1.kosong')) + '</p>'; return; }
    el.innerHTML = saran.map(o => `<div class="mulai-orang" data-id="${esc(o.id)}">
      ${avatar(o.nama || o.username, 44, o.foto_url)}
      <div class="mulai-info"><b>${esc(o.nama || o.username)}</b>${typeof lencanaResmi === 'function' ? lencanaResmi(o.username) : ''}
        <span class="sub">@${esc(o.username)}</span><div class="sub">${esc(o.bio || '')}</div></div>
      <button type="button" class="btn garis mulai-ikuti" aria-pressed="false">${esc(t('mulai.ikuti'))}</button></div>`).join('');
    el.querySelectorAll('.mulai-orang').forEach(row => {
      const b = row.querySelector('button'), id = row.dataset.id;
      b.onclick = async () => {
        b.disabled = true;
        const sudah = b.getAttribute('aria-pressed') === 'true';
        const { error } = sudah
          ? await db.from('follows').delete().match({ follower_id: saya.id, following_id: id })
          : await db.from('follows').insert({ follower_id: saya.id, following_id: id });
        b.disabled = false;
        if (error) { toastUmum(t('err.umum')); return; }
        b.setAttribute('aria-pressed', sudah ? 'false' : 'true');
        b.textContent = t(sudah ? 'mulai.ikuti' : 'mulai.mengikuti');
        b.classList.toggle('garis', sudah);
        jumlahIkut += sudah ? -1 : 1;
      };
    });
  }

  function langkah2() {
    kotak.innerHTML = kepala(2, 'mulai.s2.j', 'mulai.s2.t') +
      `<p class="mulai-label">${esc(t('mulai.p.label'))}</p>
       <div class="mulai-chip-baris">${PEMANTIK.map(k => `<button type="button" class="mulai-chip" data-k="${k}">${esc(t(k))}</button>`).join('')}</div>
       <textarea id="isi" rows="5" maxlength="250" placeholder="${esc(t('mulai.ph'))}" aria-label="${esc(t('mulai.s2.j'))}"></textarea>
       <div class="hitung" id="hit">0/250</div>
       <div class="galat" id="galat" role="alert"></div>
       <div class="mulai-aksi"><button class="btn" id="kirim">${esc(t('mulai.kirim'))}</button>
       <button class="btn garis" id="nanti">${esc(t('mulai.s2.lewati'))}</button></div>`;
    const ta = $('#isi');
    ta.addEventListener('input', () => { $('#hit').textContent = ta.value.length + '/250'; });
    kotak.querySelectorAll('.mulai-chip').forEach(c => c.onclick = () => { ta.placeholder = t(c.dataset.k); ta.focus(); });
    $('#nanti').onclick = () => { langkah = 3; tampil(); };
    $('#kirim').onclick = async () => {
      const isi = ta.value.trim(), galat = $('#galat'); galat.textContent = '';
      if (!isi) { galat.textContent = t('mulai.s2.kosong'); return; }
      if (typeof bolehKirim === 'function' && !bolehKirim(isi, m => galat.textContent = m)) return;
      $('#kirim').disabled = true;
      const { error } = await kirimPosting({ user_id: saya.id, content: isi });
      if (error) { $('#kirim').disabled = false; galat.textContent = galatRamah(error); return; }
      toastUmum(t('mulai.s2.terkirim'));
      langkah = 3; tampil();
    };
  }

  async function langkah3() {
    const url = location.origin + '/?undang=' + encodeURIComponent(username);
    kotak.innerHTML = kepala(3, 'mulai.s3.j', 'mulai.s3.t') +
      `<label class="mulai-label" for="tautan">${esc(t('mulai.tautan'))}</label>
       <input type="text" id="tautan" readonly value="${esc(url)}" onfocus="this.select()">
       <div class="mulai-aksi">${navigator.share ? `<button class="btn" id="bagikan">${esc(t('mulai.bagikan'))}</button>` : ''}
       <button class="btn ${navigator.share ? 'garis' : ''}" id="salin">${esc(t('mulai.salin'))}</button></div>
       <p class="hitung" id="jml" hidden></p>
       <div class="mulai-pasang"><button class="btn garis" id="pasang" hidden>${esc(t('mulai.pasang'))}</button>
       <p class="hitung" id="ios" hidden>${esc(t('mulai.pasangIos'))}</p></div>
       <div class="mulai-aksi"><button class="btn" id="selesai">${esc(t('mulai.selesai'))}</button></div>`;
    $('#salin').onclick = async () => {
      try { await navigator.clipboard.writeText(url); toastUmum(t('mulai.tersalin')); } catch (e) { $('#tautan').select(); }
    };
    if ($('#bagikan')) $('#bagikan').onclick = () => { navigator.share({ text: t('mulai.bagikanTeks', { url }), url }).catch(() => {}); };
    if (terpasang) $('#pasang').hidden = false;
    $('#pasang').onclick = async () => { if (!terpasang) return; terpasang.prompt(); try { await terpasang.userChoice; } catch (e) {} terpasang = null; $('#pasang').hidden = true; };
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) $('#ios').hidden = false;
    $('#selesai').onclick = () => {
      if (window.catatCorong) catatCorong('onboarding_selesai');
      try { localStorage.setItem('mulai:' + saya.id, 'selesai'); } catch (e) {}
      location.href = 'index.html';
    };
    try {
      const r = await db.rpc('jumlah_undangan');
      if (!r.error && r.data > 0 && $('#jml')) { $('#jml').textContent = t('mulai.jumlah', { n: r.data }); $('#jml').hidden = false; }
    } catch (e) {}
  }

  function tampil() {
    window.scrollTo(0, 0);
    if (langkah === 1) langkah1(); else if (langkah === 2) langkah2(); else langkah3();
  }
  tampil();
})();

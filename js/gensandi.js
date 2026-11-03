// Pembuat kata sandi (js/gensandi.js). Aktif HANYA di kolom autocomplete="new-password" (daftar.html, reset.html);
// di login.html (current-password) tidak melakukan apa pun.
// - Acak dari crypto.getRandomValues + rejection sampling (tanpa modulo bias). Tidak ada Math.random.
// - Dibuat di perangkat; tidak dikirim, tidak disimpan, tidak dicatat.
// - Dua mode: "Mudah diucapkan" (suku kata CV bahasa Indonesia, enak diketik di HP) dan "Acak penuh".
// - Entropi dihitung dari cara pembuatannya (bukan menebak pola), jadi angkanya jujur.
// - Hasil diperiksa Keamanan.sandiKuat() supaya pasti lolos aturan situs.
(function () {
  'use strict';
  var f = document.getElementById('sandi') || document.getElementById('baru');
  if (!f || f.getAttribute('autocomplete') !== 'new-password' || !window.crypto || !crypto.getRandomValues) return;
  var f2 = document.getElementById('sandi2') || document.getElementById('ulang');
  var surel = document.getElementById('email');

  var ID = String(document.documentElement.lang || 'id').slice(0, 2) === 'id';
  var T = ID ? {
    buka: 'Buatkan sandi yang kuat', tutup: 'Tutup', ucap: 'Mudah diucapkan', acak: 'Acak penuh',
    suku: 'Panjang: {n} suku kata', pjg: 'Panjang: {n} karakter', besar: 'Huruf besar', angka: 'Angka', simbol: 'Simbol',
    mirip: 'Hindari karakter mirip (0 O l 1 I)', pakai: 'Pakai sandi ini', salin: 'Salin', ulang: 'Buat ulang',
    bit: '{b} bit', waktu: 'Perkiraan waktu bobol: {w}', waktuKet: 'Serangan offline, 1 triliun tebakan per detik.',
    aman: 'Dibuat di perangkatmu, tidak dikirim ke server. Simpan di pengelola sandi; bila lupa, kamu bisa atur ulang lewat email.',
    terisi: 'Terisi di kolom sandi. Pastikan sudah tersimpan sebelum menekan tombol.', tersalin: 'Tersalin.', gagalSalin: 'Gagal menyalin; tekan lama sandinya lalu salin.',
    lvl: ['Lemah', 'Cukup', 'Kuat', 'Sangat kuat', 'Luar biasa'],
    w: ['kurang dari sehari', '{n} hari', '{n} tahun', '{n} ribu tahun', '{n} juta tahun', '{n} miliar tahun', 'lebih dari 1 triliun tahun']
  } : {
    buka: 'Generate a strong password', tutup: 'Close', ucap: 'Easy to say', acak: 'Fully random',
    suku: 'Length: {n} syllables', pjg: 'Length: {n} characters', besar: 'Uppercase', angka: 'Digits', simbol: 'Symbols',
    mirip: 'Avoid look-alike characters (0 O l 1 I)', pakai: 'Use this password', salin: 'Copy', ulang: 'Regenerate',
    bit: '{b} bits', waktu: 'Estimated time to crack: {w}', waktuKet: 'Offline attack, 1 trillion guesses per second.',
    aman: 'Made on your device, never sent to a server. Save it in a password manager; if you forget, you can reset it by email.',
    terisi: 'Filled in the password field. Make sure it is saved before you continue.', tersalin: 'Copied.', gagalSalin: 'Copy failed; long-press the password and copy it.',
    lvl: ['Weak', 'Fair', 'Strong', 'Very strong', 'Exceptional'],
    w: ['less than a day', '{n} days', '{n} years', '{n} thousand years', '{n} million years', '{n} billion years', 'more than 1 trillion years']
  };
  var isi = function (s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); };

  // ---- Acak aman: bilangan bulat seragam 0..n-1 ----
  var buf = new Uint32Array(1);
  function acakInt(n) {
    var batas = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(buf); } while (buf[0] >= batas);
    return buf[0] % n;
  }
  var ambil = function (s) { return s.charAt(acakInt(s.length)); };

  // ---- Mode 1: suku kata CV (16 konsonan x 5 vokal = 80 suku kata, 6,32 bit tiap suku kata) ----
  var KON = 'bcdghjklmnprstwy', VOK = 'aiueo', log2 = function (x) { return Math.log(x) / Math.LN2; };
  function buatUcap(suku) {
    var g = [], i, j, s, n = suku / 2;
    for (i = 0; i < n; i++) { s = ''; for (j = 0; j < 2; j++) s += ambil(KON) + ambil(VOK); g.push(s); }
    var k = acakInt(n); g[k] = g[k].charAt(0).toUpperCase() + g[k].slice(1);          // satu kelompok berhuruf besar
    g.splice(acakInt(n + 1), 0, ('0' + acakInt(100)).slice(-2));                      // dua angka di posisi acak
    return { teks: g.join('-'), bit: suku * log2(80) + log2(n) + log2(n + 1) + log2(100) };
  }

  // ---- Mode 2: acak penuh, rejection sampling agar tiap golongan yang dipilih pasti muncul ----
  function buatAcak(p, o) {
    var bukan = o.mirip ? /[0Ool1I|]/g : /$^/g;
    var gol = ['abcdefghijklmnopqrstuvwxyz'];
    if (o.besar) gol.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (o.angka) gol.push('0123456789');
    if (o.simbol) gol.push('!@#$%&*?-_+=');
    gol = gol.map(function (g) { return g.replace(bukan, ''); });
    var semua = gol.join(''), t, ok, i;
    do {
      t = ''; for (i = 0; i < p; i++) t += ambil(semua);
      ok = gol.every(function (g) { return t.split('').some(function (c) { return g.indexOf(c) >= 0; }); });
    } while (!ok);
    return { teks: t, bit: p * log2(semua.length) };    // batas atas; selisih akibat syarat golongan di bawah 0,1 bit pada panjang >= 12
  }

  function waktu(bit) {
    var d = Math.pow(2, bit - 1) / 1e12 / 86400, w = T.w, y = d / 365;
    if (d < 1) return w[0];
    if (y < 1) return isi(w[1], { n: Math.round(d) });
    if (y < 1e3) return isi(w[2], { n: Math.round(y) });
    if (y < 1e6) return isi(w[3], { n: Math.round(y / 1e3) });
    if (y < 1e9) return isi(w[4], { n: Math.round(y / 1e6) });
    if (y < 1e12) return isi(w[5], { n: Math.round(y / 1e9) });
    return w[6];
  }

  // ---- Tampilan ----
  var st = { mode: 'ucap', suku: 12, pjg: 20, besar: true, angka: true, simbol: true, mirip: true, hasil: '' };
  var induk = f.closest('.lg-f') || f.parentNode;
  var tombol = document.createElement('button');
  tombol.type = 'button'; tombol.className = 'gs-buka'; tombol.textContent = T.buka;
  tombol.setAttribute('aria-expanded', 'false'); tombol.setAttribute('aria-controls', 'gs-panel');
  var panel = document.createElement('div');
  panel.id = 'gs-panel'; panel.className = 'gs-panel'; panel.hidden = true;
  panel.innerHTML =
    '<div class="gs-mode" role="group"><button type="button" data-m="ucap" class="gs-seg">' + T.ucap + '</button><button type="button" data-m="acak" class="gs-seg">' + T.acak + '</button></div>' +
    '<div class="gs-hasil"><code id="gs-teks" translate="no" spellcheck="false"></code><button type="button" id="gs-ulang" class="gs-ikon" aria-label="' + T.ulang + '" title="' + T.ulang + '">↻</button></div>' +
    '<div class="gs-meter"><span id="gs-bar"></span></div>' +
    '<p class="gs-info"><strong id="gs-lvl"></strong> · <span id="gs-bit"></span></p>' +
    '<p class="gs-info" id="gs-waktu"></p>' +
    '<label class="gs-geser"><span id="gs-pjg"></span><input type="range" id="gs-rentang"></label>' +
    '<div class="gs-opsi" id="gs-opsi"><label><input type="checkbox" data-o="besar"> ' + T.besar + '</label><label><input type="checkbox" data-o="angka"> ' + T.angka + '</label><label><input type="checkbox" data-o="simbol"> ' + T.simbol + '</label><label><input type="checkbox" data-o="mirip"> ' + T.mirip + '</label></div>' +
    '<div class="gs-aksi"><button type="button" id="gs-pakai" class="btn">' + T.pakai + '</button><button type="button" id="gs-salin" class="gs-sek">' + T.salin + '</button></div>' +
    '<p class="gs-info" id="gs-status" role="status"></p>' +
    '<p class="gs-info gs-kecil">' + T.aman + '</p>';
  var q = function (s) { return panel.querySelector(s); };
  induk.parentNode.insertBefore(tombol, induk.nextSibling);
  tombol.parentNode.insertBefore(panel, tombol.nextSibling);

  function buat() {
    var r, n = 0, email = surel ? surel.value : '';
    do {
      r = st.mode === 'ucap' ? buatUcap(st.suku) : buatAcak(st.pjg, st);
      n++;
    } while (window.Keamanan && Keamanan.sandiKuat && !Keamanan.sandiKuat(r.teks, email) && n < 50);
    st.hasil = r.teks;
    var bit = Math.floor(r.bit), lv = bit < 50 ? 0 : bit < 64 ? 1 : bit < 80 ? 2 : bit < 110 ? 3 : 4;
    q('#gs-teks').textContent = r.teks;
    q('#gs-bar').style.width = Math.min(100, bit / 128 * 100) + '%';
    q('#gs-bar').setAttribute('data-l', lv);
    q('#gs-lvl').textContent = T.lvl[lv];
    q('#gs-bit').textContent = isi(T.bit, { b: bit });
    q('#gs-waktu').textContent = isi(T.waktu, { w: waktu(r.bit) });
    q('#gs-waktu').title = T.waktuKet;
    q('#gs-status').textContent = '';
  }
  function atur() {
    var u = st.mode === 'ucap', r = q('#gs-rentang');
    panel.querySelectorAll('.gs-seg').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === st.mode)); });
    q('#gs-opsi').hidden = u;
    r.min = u ? 8 : 12; r.max = u ? 18 : 40; r.step = u ? 2 : 1; r.value = u ? st.suku : st.pjg;
    q('#gs-pjg').textContent = isi(u ? T.suku : T.pjg, { n: r.value });
    panel.querySelectorAll('[data-o]').forEach(function (c) { c.checked = st[c.dataset.o]; });
    buat();
  }
  function kolom(el, v) { if (!el) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }

  tombol.onclick = function () {
    panel.hidden = !panel.hidden;
    tombol.setAttribute('aria-expanded', String(!panel.hidden));
    tombol.textContent = panel.hidden ? T.buka : T.tutup;
    if (!panel.hidden && !st.hasil) atur();
  };
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) { st.mode = b.dataset.m; atur(); }
    else if (b.id === 'gs-ulang') buat();
    else if (b.id === 'gs-pakai') { kolom(f, st.hasil); kolom(f2, st.hasil); q('#gs-status').textContent = T.terisi; }
    else if (b.id === 'gs-salin') {
      (navigator.clipboard ? navigator.clipboard.writeText(st.hasil) : Promise.reject())
        .then(function () { q('#gs-status').textContent = T.tersalin; }, function () { q('#gs-status').textContent = T.gagalSalin; });
    }
  });
  panel.addEventListener('input', function (e) {
    var el = e.target;
    if (el.id === 'gs-rentang') { st[st.mode === 'ucap' ? 'suku' : 'pjg'] = +el.value; q('#gs-pjg').textContent = isi(st.mode === 'ucap' ? T.suku : T.pjg, { n: el.value }); buat(); }
    else if (el.dataset.o) { st[el.dataset.o] = el.checked; buat(); }
  });

  // reset.html: kolom sandi baru disembunyikan sampai tautan dicek; tombol ikut tampil/sembunyi
  function ikut() { tombol.hidden = f.hidden; if (f.hidden) { panel.hidden = true; } }
  ikut();
  if (window.MutationObserver) new MutationObserver(ikut).observe(f, { attributes: true, attributeFilter: ['hidden'] });
})();

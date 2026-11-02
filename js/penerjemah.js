// Penerjemah: Latin <-> aksara Jawa, Morse, dan biner. Semua dihitung di perangkat, tanpa jaringan.
// Mesin konversi (PenerjemahMesin) dipisah dari tampilan supaya mudah diuji dengan node.
(function (akar) {
  'use strict';

  // ---------------------------------------------------------------- Aksara Jawa (Unicode U+A980..U+A9DF)
  const C = {
    h: '\uA9B2', n: '\uA9A4', c: '\uA995', r: '\uA9AB', k: '\uA98F', d: '\uA9A2', t: '\uA9A0', s: '\uA9B1', w: '\uA9AE', l: '\uA9AD',
    p: '\uA9A5', dh: '\uA99D', j: '\uA997', y: '\uA9AA', ny: '\uA99A', m: '\uA9A9', g: '\uA992', b: '\uA9A7', th: '\uA99B', ng: '\uA994'
  };
  const PANGKON = '\uA9C0', CECAK = '\uA981', LAYAR = '\uA982', WIGNYAN = '\uA983', CECAK_TELU = '\uA9B3';
  const WULU = '\uA9B6', SUKU = '\uA9B8', TALING = '\uA9BA', TARUNG = '\uA9B4', PEPET = '\uA9BC';
  const KERET = '\uA9BD', PENGKAL = '\uA9BE', CAKRA = '\uA9BF', PA_CEREK = '\uA989', NGA_LELET = '\uA98A';
  const SWARA = { a: '\uA984', i: '\uA986', u: '\uA988', e: '\uA98C', o: '\uA98E' };   // e = taling; pepet = a + pepet
  const ANGKA = '\uA9D0';
  const VOKAL = 'aiueoéèêě';

  // Huruf asing: dasar + cecak telu
  const ASING = { f: 'p', v: 'p', z: 'j', q: 'k', x: 'ks', kh: 'k', gh: 'g', sy: 's' };
  const ASING_TITIK = { f: 1, v: 1, z: 1, kh: 1, gh: 1 };

  function tokenKata(kata) {
    // Pecah satu kata Latin menjadi token konsonan {k:'ng'} dan vokal {v:'a'}; selain itu dibiarkan (null)
    let s = kata.toLowerCase();
    const out = [];
    let i = 0;
    while (i < s.length) {
      const two = s.substr(i, 2), one = s[i];
      if (two === 'ng' || two === 'ny' || two === 'th' || two === 'dh' || two === 'kh' || two === 'gh' || two === 'sy') { out.push({ k: two }); i += 2; continue; }
      if (VOKAL.indexOf(one) >= 0) { out.push({ v: one === 'è' ? 'é' : one === 'ě' ? 'ê' : one === 'e' ? 'ê' : one }); i++; continue; }
      if (/[a-z]/.test(one)) { out.push({ k: one }); i++; continue; }
      out.push({ lain: one }); i++;
    }
    return out;
  }

  function huruf(k) {
    // Konsonan Latin -> {huruf, titik}
    if (ASING[k] !== undefined && !C[k]) {
      const dasar = ASING[k];
      if (dasar === 'ks') return { teks: C.k + PANGKON + C.s, titik: false, dua: true };
      return { teks: C[dasar], titik: !!ASING_TITIK[k] };
    }
    return { teks: C[k], titik: false };
  }

  function keAksaraKata(kata) {
    const tk = tokenKata(kata);
    let out = '', i = 0, terbuka = false;   // terbuka: unit terakhir punya huruf hidup (boleh diberi cecak/layar/wignyan)
    const adaK = j => j < tk.length && tk[j].k !== undefined;
    const adaV = j => j < tk.length && tk[j].v !== undefined;
    // Konsonan di i adalah awal suku bila diikuti vokal, atau y/r (sisipan) lalu vokal
    const awalSuku = j => adaV(j + 1) || (adaK(j + 1) && (tk[j + 1].k === 'y' || tk[j + 1].k === 'r') && adaV(j + 2));
    while (i < tk.length) {
      const tok = tk[i];
      if (tok.lain !== undefined) {
        const ch = tok.lain;
        if (/[0-9]/.test(ch)) out += String.fromCharCode(ANGKA.charCodeAt(0) + (+ch));
        else if (ch === ',') out += '\uA9C8';
        else if (ch === '.') out += '\uA9C9';
        else out += ch;
        terbuka = false; i++; continue;
      }
      if (tok.v !== undefined) {   // vokal berdiri sendiri
        const v = tok.v;
        // Vokal yang langsung menyusul vokal (sinau, kaum): ditulis dengan ha + sandhangan, bukan aksara swara
        if (i > 0 && tk[i - 1].v !== undefined && v !== 'a') {
          out += C.h + (v === 'i' ? WULU : v === 'u' ? SUKU : v === 'é' ? TALING : v === 'o' ? TALING + TARUNG : PEPET);
          terbuka = true; i++; continue;
        }
        if (v === 'ê') out += SWARA.a + PEPET;
        else if (v === 'é') out += SWARA.e;
        else out += SWARA[v];
        terbuka = true; i++; continue;
      }
      // Konsonan
      const k = tok.k;
      if (!awalSuku(i)) {
        // Penutup suku: ng/r/h menjadi cecak/layar/wignyan bila menempel pada unit hidup; selain itu huruf mati (pangkon)
        if (terbuka && k === 'ng') { out += CECAK; i++; continue; }
        if (terbuka && k === 'r') { out += LAYAR; i++; continue; }
        if (terbuka && k === 'h') { out += WIGNYAN; i++; continue; }
        const h = huruf(k);
        if (!h.teks) { i++; continue; }
        out += h.teks + (h.titik ? CECAK_TELU : '') + PANGKON;
        terbuka = false; i++; continue;
      }
      // Awal suku: huruf dasar + sisipan + vokal
      i++;
      let med = '';
      if (adaK(i) && (tk[i].k === 'y' || tk[i].k === 'r') && adaV(i + 1)) { med = tk[i].k; i++; }
      const v = adaV(i) ? tk[i].v : 'a';
      if (adaV(i)) i++;
      // rê / lê berdiri sendiri: pa cerek / nga lelet
      if (!med && v === 'ê' && (k === 'r' || k === 'l')) { out += (k === 'r' ? PA_CEREK : NGA_LELET); terbuka = true; continue; }
      const h = huruf(k);
      if (!h.teks) { continue; }
      out += h.teks + (h.titik ? CECAK_TELU : '');
      if (med === 'y') out += PENGKAL;
      if (med === 'r') out += (v === 'ê' ? KERET : CAKRA);
      if (v === 'i') out += WULU;
      else if (v === 'u') out += SUKU;
      else if (v === 'é') out += TALING;
      else if (v === 'o') out += TALING + TARUNG;
      else if (v === 'ê' && !(med === 'r')) out += PEPET;
      terbuka = true;
    }
    return out;
  }

  function keAksara(teks) {
    return keAksaraKata(String(teks));   // spasi dan tanda baca ikut sebagai penanda batas kata
  }

  // Aksara -> Latin
  const LATIN = {};
  const set = (cp, v) => { LATIN[String.fromCharCode(cp)] = v; };
  [['\uA98F', 'k'], ['\uA990', 'k'], ['\uA991', 'k'], ['\uA992', 'g'], ['\uA993', 'g'], ['\uA994', 'ng'], ['\uA995', 'c'], ['\uA996', 'c'], ['\uA997', 'j'],
   ['\uA998', 'ny'], ['\uA999', 'j'], ['\uA99A', 'ny'], ['\uA99B', 'th'], ['\uA99C', 'th'], ['\uA99D', 'dh'], ['\uA99E', 'dh'], ['\uA99F', 'n'], ['\uA9A0', 't'],
   ['\uA9A1', 't'], ['\uA9A2', 'd'], ['\uA9A3', 'd'], ['\uA9A4', 'n'], ['\uA9A5', 'p'], ['\uA9A6', 'p'], ['\uA9A7', 'b'], ['\uA9A8', 'b'], ['\uA9A9', 'm'],
   ['\uA9AA', 'y'], ['\uA9AB', 'r'], ['\uA9AC', 'r'], ['\uA9AD', 'l'], ['\uA9AE', 'w'], ['\uA9AF', 's'], ['\uA9B0', 's'], ['\uA9B1', 's'], ['\uA9B2', 'h']]
    .forEach(([a, b]) => { LATIN[a] = b; });
  const SWARA_LATIN = { '\uA984': 'a', '\uA985': 'i', '\uA986': 'i', '\uA987': 'i', '\uA988': 'u', '\uA989': 'rê', '\uA98A': 'lê', '\uA98B': 'lê', '\uA98C': 'é', '\uA98D': 'ai', '\uA98E': 'o' };
  const TITIK = { p: 'f', j: 'z', k: 'kh', g: 'gh', s: 'sy' };

  function dariAksara(teks) {
    const a = Array.from(String(teks));
    let out = '', i = 0, tak = 0;
    while (i < a.length) {
      const ch = a[i], cp = ch.codePointAt(0);
      if (LATIN[ch] !== undefined) {
        let base = LATIN[ch]; i++;
        if (a[i] === CECAK_TELU) { base = TITIK[base] || base; i++; }
        if (a[i] === PANGKON) { out += base; i++; continue; }          // huruf mati / pasangan mengikuti
        let med = '', v = 'a';
        if (a[i] === PENGKAL) { med += 'y'; i++; }
        if (a[i] === CAKRA) { med += 'r'; i++; }
        else if (a[i] === KERET) { med += 'r'; v = 'ê'; i++; }
        const s = a[i];
        if (s === WULU || s === '\uA9B7') { v = 'i'; i++; }
        else if (s === SUKU || s === '\uA9B9') { v = 'u'; i++; }
        else if (s === TALING) { i++; if (a[i] === TARUNG) { v = 'o'; i++; } else v = 'é'; }
        else if (s === '\uA9BB') { v = 'ai'; i++; }
        else if (s === PEPET) { v = 'ê'; i++; }
        else if (s === TARUNG) { v = 'a'; i++; }
        let fin = '';
        for (;;) {
          if (a[i] === CECAK || a[i] === '\uA980') fin += 'ng';
          else if (a[i] === LAYAR) fin += 'r';
          else if (a[i] === WIGNYAN) fin += 'h';
          else break;
          i++;
        }
        out += base + med + v + fin;
        continue;
      }
      if (SWARA_LATIN[ch] !== undefined) {
        let v = SWARA_LATIN[ch]; i++;
        if (ch === '\uA984' && a[i] === PEPET) { v = 'ê'; i++; }
        else if (ch === '\uA984' && a[i] === TARUNG) i++;
        let fin = '';
        for (;;) {
          if (a[i] === CECAK) fin += 'ng'; else if (a[i] === LAYAR) fin += 'r'; else if (a[i] === WIGNYAN) fin += 'h'; else break;
          i++;
        }
        out += v + fin;
        continue;
      }
      if (cp >= 0xA9D0 && cp <= 0xA9D9) { out += String(cp - 0xA9D0); i++; continue; }
      if (ch === '\uA9C8') { out += ','; i++; continue; }
      if (ch === '\uA9C9') { out += '.'; i++; continue; }
      if (ch === PANGKON) { i++; continue; }
      if (cp >= 0xA980 && cp <= 0xA9DF) { tak++; i++; continue; }
      out += ch; i++;
    }
    return { teks: out, tak: tak };
  }

  // ---------------------------------------------------------------- Morse
  const MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
    O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
    ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
  };
  const MORSE_BALIK = {};
  Object.keys(MORSE).forEach(k => { MORSE_BALIK[MORSE[k]] = k; });
  const TANPA_AKSEN = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function keMorse(teks) {
    let tak = 0;
    const kata = TANPA_AKSEN(String(teks)).toUpperCase().split(/\s+/).filter(Boolean).map(w =>
      Array.from(w).map(ch => { if (MORSE[ch]) return MORSE[ch]; tak++; return null; }).filter(Boolean).join(' ')).filter(Boolean);
    return { teks: kata.join(' / '), tak: tak };
  }
  function dariMorse(teks) {
    let tak = 0;
    const norm = String(teks).replace(/[·•∙]/g, '.').replace(/[−–—_]/g, '-').replace(/[|\\]/g, '/');
    const kata = norm.split('/').map(w => w.trim().split(/\s+/).filter(Boolean).map(kode => {
      if (MORSE_BALIK[kode]) return MORSE_BALIK[kode];
      tak++; return '?';
    }).join('')).filter((w, i, arr) => w !== '' || arr.length === 1);
    return { teks: kata.join(' '), tak: tak };
  }

  // ---------------------------------------------------------------- Biner (UTF-8, 8 digit per byte)
  function keBiner(teks) {
    const bytes = new TextEncoder().encode(String(teks));
    return { teks: Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' '), tak: 0 };
  }
  function dariBiner(teks) {
    const bersih = String(teks).replace(/\s+/g, '');
    if (!bersih) return { teks: '', tak: 0 };
    if (/[^01]/.test(bersih) || bersih.length % 8 !== 0) return { teks: '', tak: 0, salah: true };
    const bytes = new Uint8Array(bersih.length / 8);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bersih.substr(i * 8, 8), 2);
    return { teks: new TextDecoder('utf-8').decode(bytes), tak: 0 };
  }

  akar.PenerjemahMesin = { keAksara: s => ({ teks: keAksara(s), tak: 0 }), dariAksara, keMorse, dariMorse, keBiner, dariBiner };

  // ---------------------------------------------------------------- Tampilan
  if (typeof document === 'undefined') return;
  const MODE = ['aksara', 'morse', 'biner'];
  let mode = 'aksara', arah = 0, fontMuat = false;   // arah 0: Latin -> sandi, 1: sandi -> Latin

  function muatFont() {
    if (fontMuat) return; fontMuat = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Javanese:wght@400;700&display=swap';
    document.head.appendChild(l);
  }
  const nama = m => t(m === 'aksara' ? 'pn.aksara' : m === 'morse' ? 'pn.morse' : 'pn.biner');
  function isiLembar() {
    const d = document.getElementById('lembarPenerjemah'), isi = document.getElementById('pnIsi');
    if (!d || !isi) return null;
    return isi;
  }
  function render() {
    const isi = isiLembar(); if (!isi) return;
    const masukJawa = mode === 'aksara' && arah === 1, hasilJawa = mode === 'aksara' && arah === 0;
    const label = arah === 0 ? t('pn.latin') + ' → ' + nama(mode) : nama(mode) + ' → ' + t('pn.latin');
    const catatan = mode === 'aksara' ? t('pn.catAksara') : mode === 'morse' ? t('pn.catMorse') : t('pn.catBiner');
    const dari = arah === 0 ? t('pn.latin') : nama(mode), ke = arah === 0 ? nama(mode) : t('pn.latin');
    isi.innerHTML = `<div class="pn-tab" role="tablist">${MODE.map(m => `<button type="button" role="tab" data-mode="${m}" aria-selected="${m === mode}">${esc(nama(m))}</button>`).join('')}</div>
      <div class="pn-arah" id="pnArah" role="group" aria-label="${esc(label)}"><span class="pn-sisi">${esc(dari)}</span>
        <button type="button" class="pn-tukar" id="pnTukar" aria-label="${esc(t('pn.tukar'))}" title="${esc(t('pn.tukar'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h15M17 20l4-4-4-4M21 16H6"/></svg></button>
        <span class="pn-sisi">${esc(ke)}</span></div>
      <section class="pn-kartu">
        <div class="pn-kartu-kepala"><span class="pn-label">${esc(dari)}</span><button type="button" class="pn-mini" id="pnBersih" hidden aria-label="${esc(t('pn.bersihkan'))}" title="${esc(t('pn.bersihkan'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <textarea id="pnMasuk" class="pn-masuk${masukJawa ? ' pn-jawa' : ''}" rows="4" spellcheck="false" autocapitalize="off" aria-label="${esc(t('pn.masuk'))}" placeholder="${esc(t('pn.masuk'))}"></textarea>
      </section>
      <section class="pn-kartu pn-kartu-hasil">
        <div class="pn-kartu-kepala"><span class="pn-label">${esc(t('pn.hasil'))} · ${esc(ke)}</span><button type="button" class="pn-mini teks" id="pnSalin" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><span>${esc(t('pn.salin'))}</span></button></div>
        <div id="pnHasil" class="pn-hasil${hasilJawa ? ' pn-jawa' : ''}" aria-live="polite"></div>
      </section>
      <p class="pn-galat" id="pnGalat" role="status" hidden></p>
      <div class="pn-info"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg><div><p>${esc(catatan)}</p>${mode === 'aksara' ? `<p>${esc(t('pn.fontJawa'))}</p>` : ''}</div></div>`;
    if (mode === 'aksara') muatFont();
    isi.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { if (b.dataset.mode !== mode) { mode = b.dataset.mode; arah = 0; render(); } }; });
    document.getElementById('pnTukar').onclick = () => {
      const hasil = document.getElementById('pnHasil').dataset.teks || '';
      arah = 1 - arah; render();
      const m = document.getElementById('pnMasuk'); m.value = hasil; hitung();
    };
    document.getElementById('pnMasuk').oninput = hitung;
    document.getElementById('pnBersih').onclick = () => { const m = document.getElementById('pnMasuk'); m.value = ''; hitung(); m.focus(); };
    document.getElementById('pnSalin').onclick = salin;
    hitung();
  }
  function hitung() {
    const masuk = document.getElementById('pnMasuk'), hasil = document.getElementById('pnHasil'), galat = document.getElementById('pnGalat'), salinBtn = document.getElementById('pnSalin');
    if (!masuk || !hasil) return;
    const M = akar.PenerjemahMesin, v = masuk.value;
    let r;
    if (mode === 'aksara') r = arah === 0 ? M.keAksara(v) : M.dariAksara(v);
    else if (mode === 'morse') r = arah === 0 ? M.keMorse(v) : M.dariMorse(v);
    else r = arah === 0 ? M.keBiner(v) : M.dariBiner(v);
    const bersih = document.getElementById('pnBersih'); if (bersih) bersih.hidden = !v;
    hasil.dataset.teks = r.teks || '';
    if (r.teks) { hasil.textContent = r.teks; hasil.classList.remove('kosong'); }
    else { hasil.textContent = t('pn.kosong'); hasil.classList.add('kosong'); }
    salinBtn.disabled = !r.teks;
    galat.hidden = !(r.salah || r.tak);
    galat.textContent = r.salah ? t('pn.binerSalah') : r.tak ? t('pn.tidakDikenal') : '';
  }
  async function salin() {
    const teks = document.getElementById('pnHasil').dataset.teks || '';
    if (!teks) return;
    try { await navigator.clipboard.writeText(teks); toastUmum(t('pn.tersalin')); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = teks; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toastUmum(t('pn.tersalin')); } catch (e2) {}
      ta.remove();
    }
  }
  akar.Penerjemah = {
    buka() {
      const d = document.getElementById('lembarPenerjemah'); if (!d) return;
      render();
      if (!d.open) d.showModal();
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.getElementById('lembarPenerjemah'); if (!d) return;
    const x = document.getElementById('tutupPenerjemah'); if (x) x.onclick = () => d.close();
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  });
})(typeof window !== 'undefined' ? window : globalThis);

// Penerjemah Markdown kecil untuk Jurnal (jurnal.html). Ditulis sendiri, tanpa pustaka.
//   Markdown.html(teks)    -> string HTML aman (hanya tag buatan kode ini)
//   Markdown.urlAman(url)  -> alamat http(s) yang sudah dirapikan, atau null
// Tanpa efek samping dan tanpa DOM, jadi bisa dites di Node (tools/uji-markdown.js).
//
// KEAMANAN: setiap potongan teks lewat esc() SEBELUM diberi tag; tag dibuat oleh kode, bukan dari input.
// Tidak ada jalur HTML mentah, tidak ada gambar (![x](y) tampil sebagai teks), tautan hanya http: dan https:.
// Inline memakai pemindai karakter (bukan regex bersarang) dengan anggaran langkah, jadi aman dari ReDoS.
//
// Blok: # ## ### (jadi h3-h5), paragraf, > kutipan, daftar - * + dan 1. (maks 3 tingkat, ada - [ ] / - [x]),
//       --- garis, ``` kode. Inline: **tebal** *miring* _miring_ ~~coret~~ `kode` [teks](url) dan alamat polos.
// Baris baru tunggal tetap baris baru (<br>), seperti kebiasaan menulis jurnal.
var Markdown = (function () {
  'use strict';

  var MAKS_MASUK = 20000, MAKS_BLOK = 300, MAKS_DALAM = 4, MAKS_TINGKAT = 3, MAKS_URL = 2000, ANGGARAN = 400000;

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Tautan ----------
  var RE_SKEMA = /^https?:\/\/[^\s<>"'`\\\u0000-\u001f\u007f]+$/i;
  function urlAman(mentah) {
    var s = String(mentah == null ? '' : mentah).trim();
    if (!s || s.length > MAKS_URL || !RE_SKEMA.test(s)) return null;      // tanpa skema, javascript:, data:, //evil, spasi, kontrol
    var host = s.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0];
    if (!host || host.indexOf('@') >= 0) return null;                      // tanpa user:sandi@
    if (typeof URL === 'function') {
      var u; try { u = new URL(s); } catch (e) { return null; }
      if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username || u.password || !u.hostname) return null;
      return u.href.length <= MAKS_URL ? u.href : null;
    }
    return /^[a-z0-9][a-z0-9.-]*(:\d{1,5})?$/i.test(host) ? s : null;      // cadangan (Node tanpa URL global)
  }
  function tagA(href, dalam) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer nofollow ugc">' + dalam + '</a>';
  }

  // ---------- Inline ----------
  var HURUF = /[\p{L}\p{N}]/u;
  var SPASI = /\s/;
  var PUNKT = '\\`*_~[]()#>-!.+<{}|';

  function inline(s, dalam, st, bolehTautan) {
    var out = '', buf = '', i = 0, n = s.length;
    function tulis() { if (buf) { out += esc(buf); buf = ''; } }
    function adaHuruf(c) { return !!c && HURUF.test(c); }
    function awasi(k) { st.sisa -= k || 1; return st.sisa > 0; }

    // Cari penutup `tanda` mulai dari `dari`. Penutup tidak boleh didahului spasi (atau diawali \ ).
    function cariTutup(tanda, dari, kecualiRun) {
      var L = tanda.length, c = tanda.charAt(0);
      for (var j = dari; j <= n - L; j++) {
        if (!awasi()) return -1;
        var ch = s.charAt(j);
        if (ch === '\\') { j++; continue; }
        if (ch === '`') { var e = s.indexOf('`', j + 1); if (e < 0) continue; j = e; continue; }   // lewati kode
        if (ch !== c || s.substr(j, L) !== tanda) continue;
        if (j === dari || SPASI.test(s.charAt(j - 1))) continue;
        if (kecualiRun) {                      // * tunggal: jangan menutup di tengah ** atau ***
          if (s.charAt(j - 1) === c || s.charAt(j + 1) === c) continue;
        } else if (L === 2 && c !== '~' && s.charAt(j + 2) === c && s.charAt(j + 3) !== c) {
          continue;                            // ** di depan *** : biarkan tiga bintang menutup bersama
        }
        if (c === '_' && adaHuruf(s.charAt(j + L))) continue;   // snake_case tidak jadi miring
        return j;
      }
      return -1;
    }

    // Ambil [teks](url) mulai dari posisi `[`. Mengembalikan {akhir, teks, url} atau null.
    function bacaTautan(mulai) {
      var dalamK = 0, j = mulai;
      for (; j < n; j++) {
        if (!awasi()) return null;
        var ch = s.charAt(j);
        if (ch === '\\') { j++; continue; }
        if (ch === '[') dalamK++;
        else if (ch === ']') { dalamK--; if (dalamK === 0) break; }
      }
      if (j >= n || s.charAt(j + 1) !== '(') return null;
      var teks = s.slice(mulai + 1, j), k = j + 2, p = 1, url = '';
      for (; k < n; k++) {
        if (!awasi()) return null;
        var c = s.charAt(k);
        if (c === '(') p++;
        else if (c === ')') { p--; if (p === 0) break; }
        else if (SPASI.test(c)) return null;
        url += c;
      }
      if (k >= n) return null;
      return { akhir: k + 1, teks: teks, url: url };
    }

    while (i < n) {
      if (st.sisa <= 0) { buf += s.slice(i); i = n; break; }       // anggaran habis: sisanya tampil apa adanya
      var c = s.charAt(i);

      if (c === '\n') { tulis(); out += '<br>'; i++; continue; }

      if (c === '\\' && i + 1 < n && PUNKT.indexOf(s.charAt(i + 1)) >= 0) { buf += s.charAt(i + 1); i += 2; continue; }

      if (c === '`') {
        var run = 1; while (s.charAt(i + run) === '`') run++;
        var pagar = new Array(run + 1).join('`'), e = s.indexOf(pagar, i + run);
        while (e >= 0 && s.charAt(e + run) === '`') e = s.indexOf(pagar, e + run + 1);   // penutup harus run yang sama panjang
        if (e > i + run) {
          tulis(); out += '<code>' + esc(s.slice(i + run, e).replace(/^ (.*) $/, '$1')) + '</code>'; i = e + run; continue;
        }
        buf += s.substr(i, run); i += run; continue;
      }

      // Gambar tidak didukung: tampil sebagai teks biasa persis seperti ditulis
      if (c === '!' && s.charAt(i + 1) === '[') {
        var gb = bacaTautan(i + 1);
        if (gb) { buf += s.slice(i, gb.akhir); i = gb.akhir; continue; }
      }

      if (c === '[' && bolehTautan && dalam < MAKS_DALAM) {
        var tb = bacaTautan(i), href = tb && urlAman(tb.url);
        if (tb && href) {
          tulis();
          out += tagA(href, tb.teks.trim() ? inline(tb.teks, dalam + 1, st, false) : esc(href));
          i = tb.akhir; continue;
        }
      }

      // Alamat polos -> tautan (hanya http/https, didahului batas kata)
      if ((c === 'h' || c === 'H') && bolehTautan && /^https?:\/\//i.test(s.substr(i, 8)) && !adaHuruf(s.charAt(i - 1))) {
        var a = i; while (a < n && !/[\s<>"]/.test(s.charAt(a))) a++;
        var mentah = s.slice(i, a);
        while (mentah.length && /[.,;:!?)\]}'*_~]/.test(mentah.charAt(mentah.length - 1))) {
          if (mentah.charAt(mentah.length - 1) === ')' && (mentah.match(/\(/g) || []).length >= (mentah.match(/\)/g) || []).length) break;
          mentah = mentah.slice(0, -1);
        }
        var h2 = urlAman(mentah);
        if (h2) { tulis(); out += tagA(h2, esc(mentah)); i += mentah.length; continue; }
      }

      if ((c === '*' || c === '_') && dalam < MAKS_DALAM) {
        var r = 1; while (s.charAt(i + r) === c) r++;
        var buka = !SPASI.test(s.charAt(i + 1)) && s.charAt(i + 1) !== '';
        if (c === '_' && adaHuruf(s.charAt(i - 1))) buka = false;       // snake_case
        var sudah = false;
        if (buka) {
          for (var k = Math.min(r, 3); k >= 1 && !sudah; k--) {
            var tanda = new Array(k + 1).join(c);
            var aw = i + k;
            if (SPASI.test(s.charAt(aw)) || aw >= n) continue;
            var t = cariTutup(tanda, aw, k === 1);
            if (t > aw) {
              var isi = inline(s.slice(aw, t), dalam + 1, st, bolehTautan);
              tulis();
              out += k === 3 ? '<strong><em>' + isi + '</em></strong>' : (k === 2 ? '<strong>' + isi + '</strong>' : '<em>' + isi + '</em>');
              i = t + k; sudah = true;
            }
          }
        }
        if (sudah) continue;
        buf += s.substr(i, r); i += r; continue;                      // tidak berpasangan: tampil apa adanya
      }

      if (c === '~' && s.charAt(i + 1) === '~' && s.charAt(i + 2) !== '~' && dalam < MAKS_DALAM) {
        var tc = cariTutup('~~', i + 2, false);
        if (tc > i + 2 && !SPASI.test(s.charAt(i + 2))) {
          var isiC = inline(s.slice(i + 2, tc), dalam + 1, st, bolehTautan);
          tulis(); out += '<del>' + isiC + '</del>'; i = tc + 2; continue;
        }
        buf += '~~'; i += 2; continue;
      }

      buf += c; i++;
    }
    tulis();
    return out;
  }

  // ---------- Blok ----------
  var RE_JUDUL = /^(#{1,3})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
  var RE_GARIS = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
  var RE_DAFTAR = /^([ \t]*)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
  var RE_PAGAR = /^ {0,3}(`{3,})[ \t]*[^`]*$/;
  var RE_TUGAS = /^\[([ xX])\][ \t]+([\s\S]*)$/;

  function mulaiBlok(baris, adaParagraf) {
    if (RE_PAGAR.test(baris) || RE_JUDUL.test(baris) || RE_GARIS.test(baris) || /^ {0,3}>/.test(baris)) return true;
    var m = RE_DAFTAR.exec(baris);
    if (!m) return false;
    return !adaParagraf || /^([-*+]|1[.)])$/.test(m[2]);     // daftar hanya memotong paragraf bila bertanda - * + atau 1.
  }

  function html(teks) {
    var sumber = String(teks == null ? '' : teks).replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
    if (sumber.length > MAKS_MASUK) sumber = sumber.slice(0, MAKS_MASUK);
    var baris = sumber.replace(/\t/g, '  ').split('\n'), st = { sisa: ANGGARAN }, hasil = [], i = 0, blok = 0;
    var il = function (x) { return inline(x, 0, st, true); };

    while (i < baris.length) {
      var b = baris[i];
      if (!/\S/.test(b)) { i++; continue; }
      if (++blok > MAKS_BLOK) {                       // terlalu banyak blok: sisanya tampil sebagai teks biasa
        hasil.push('<p>' + esc(baris.slice(i).join('\n')).replace(/\n/g, '<br>') + '</p>');
        break;
      }

      var m = RE_PAGAR.exec(b);
      if (m) {                                        // blok kode berpagar; tak tertutup = sampai akhir
        var pagar = m[1], kode = [];
        i++;
        while (i < baris.length && !(new RegExp('^ {0,3}`{' + pagar.length + ',}[ \\t]*$').test(baris[i]))) { kode.push(baris[i]); i++; }
        i++;
        hasil.push('<pre><code>' + esc(kode.join('\n')) + '</code></pre>');
        continue;
      }

      m = RE_JUDUL.exec(b);
      if (m) { var h = m[1].length + 2; hasil.push('<h' + h + '>' + il(m[2]) + '</h' + h + '>'); i++; continue; }

      if (RE_GARIS.test(b)) { hasil.push('<hr>'); i++; continue; }

      if (/^ {0,3}>/.test(b)) {
        var q = [];
        while (i < baris.length && /^ {0,3}>/.test(baris[i])) { q.push(baris[i].replace(/^ {0,3}> ?/, '')); i++; }
        hasil.push('<blockquote>' + il(q.join('\n').replace(/^\n+|\n+$/g, '')) + '</blockquote>');
        continue;
      }

      if (RE_DAFTAR.test(b)) {
        var item = [];
        while (i < baris.length) {
          var lm = RE_DAFTAR.exec(baris[i]);
          if (lm && !RE_GARIS.test(baris[i])) {
            item.push({ indent: lm[1].length, tag: /^\d/.test(lm[2]) ? 'ol' : 'ul', no: parseInt(lm[2], 10), teks: lm[3] });
          } else if (item.length && /\S/.test(baris[i]) && /^ {2,}/.test(baris[i]) && !mulaiBlok(baris[i].replace(/^ +/, ''), false)) {
            item[item.length - 1].teks += '\n' + baris[i].replace(/^ +/, '');   // lanjutan baris dalam butir
          } else break;
          i++;
        }
        hasil.push(daftarHtml(item, il));
        continue;
      }

      var p = [];
      while (i < baris.length && /\S/.test(baris[i]) && (p.length === 0 || !mulaiBlok(baris[i], true))) { p.push(baris[i]); i++; }
      hasil.push('<p>' + il(p.join('\n')) + '</p>');
    }
    return hasil.join('');
  }

  function daftarHtml(item, il) {
    var tumpuk = [], out = '';
    function buka(it) {
      var mulai = it.tag === 'ol' && isFinite(it.no) && it.no !== 1 && it.no > 0 && it.no < 1000000000 ? ' start="' + it.no + '"' : '';
      out += '<' + it.tag + mulai + '>'; tumpuk.push({ tag: it.tag, indent: it.indent });
    }
    item.forEach(function (it) {
      while (tumpuk.length && it.indent < tumpuk[tumpuk.length - 1].indent) {
        var t = tumpuk.pop(); out += '</li></' + t.tag + '>';
      }
      if (!tumpuk.length) buka(it);
      else {
        var atas = tumpuk[tumpuk.length - 1];
        if (it.indent > atas.indent && tumpuk.length < MAKS_TINGKAT) buka(it);
        else if (atas.tag !== it.tag) { out += '</li></' + atas.tag + '>'; tumpuk.pop(); buka(it); }
        else out += '</li>';
      }
      var tg = RE_TUGAS.exec(it.teks);
      if (tg) out += '<li class="tugas"><span class="cb' + (tg[1] === ' ' ? '' : ' ya') + '" aria-hidden="true"></span>' + il(tg[2]);
      else out += '<li>' + il(it.teks);
    });
    while (tumpuk.length) { var z = tumpuk.pop(); out += '</li></' + z.tag + '>'; }
    return out;
  }

  return { html: html, urlAman: urlAman };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Markdown;

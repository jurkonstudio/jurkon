// Uji Markdown.html (js/markdown.js): keluaran benar, aman dari XSS, dan cepat untuk masukan jahat.
// Jalankan:  node tools/uji-markdown.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/markdown.js'), 'utf8') + '\nthis.M = Markdown;', ctx);
const M = ctx.M;
let salah = 0, lulus = 0;
const ok = (nama, kond, info) => { if (kond) lulus++; else { salah++; console.log('  ✗ ' + nama + (info ? '\n      ' + info : '')); } };
const sama = (nama, masuk, harap) => { const h = M.html(masuk); ok(nama, h === harap, 'masuk: ' + JSON.stringify(masuk) + '\n      dapat:  ' + h + '\n      harap:  ' + harap); };

// ---- Fungsi ----
sama('paragraf + baris baru', 'a\nb\n\nc', '<p>a<br>b</p><p>c</p>');
sama('judul', '# A\n## B\n### C', '<h3>A</h3><h4>B</h4><h5>C</h5>');
sama('#### bukan judul', '#### A', '<p>#### A</p>');
sama('tebal miring coret kode', '**t** *m* _m_ ~~c~~ `k`', '<p><strong>t</strong> <em>m</em> <em>m</em> <del>c</del> <code>k</code></p>');
sama('tebal-miring', '***x***', '<p><strong><em>x</em></strong></p>');
sama('tebal berisi miring', '**a *b* c**', '<p><strong>a <em>b</em> c</strong></p>');
sama('snake_case tetap', 'nama_variabel_ini', '<p>nama_variabel_ini</p>');
sama('2 * 3 * 4 tetap', '2 * 3 * 4', '<p>2 * 3 * 4</p>');
sama('tak berpasangan tetap', '**a dan *b', '<p>**a dan *b</p>');
sama('escape', '\\*bukan\\*', '<p>*bukan*</p>');
sama('daftar', '- a\n- b', '<ul><li>a</li><li>b</li></ul>');
sama('daftar nomor mulai 3', '3. a\n4. b', '<ol start="3"><li>a</li><li>b</li></ol>');
sama('daftar bersarang', '- a\n  - b\n- c', '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
sama('tugas', '- [ ] a\n- [x] b', '<ul><li class="tugas"><span class="cb" aria-hidden="true"></span>a</li><li class="tugas"><span class="cb ya" aria-hidden="true"></span>b</li></ul>');
sama('kutipan', '> a\n> b', '<blockquote>a<br>b</blockquote>');
sama('garis', 'a\n\n---\n\nb', '<p>a</p><hr><p>b</p>');
sama('kode berpagar', '```\n<b>x</b>\n*a*\n```', '<pre><code>&lt;b&gt;x&lt;/b&gt;\n*a*</code></pre>');
sama('kode tak tertutup', '```\n<i>', '<pre><code>&lt;i&gt;</code></pre>');
sama('tautan', '[a](https://x.com/p?q=1)', '<p><a href="https://x.com/p?q=1" target="_blank" rel="noopener noreferrer nofollow ugc">a</a></p>');
sama('alamat polos + titik', 'lihat https://x.com/a.', '<p>lihat <a href="https://x.com/a" target="_blank" rel="noopener noreferrer nofollow ugc">https://x.com/a</a>.</p>');
sama('emoji utuh', '**😀 hai** 🌍', '<p><strong>😀 hai</strong> 🌍</p>');
sama('kosong', '', '');
sama('daftar memotong paragraf', 'a\n- b', '<p>a</p><ul><li>b</li></ul>');
sama('nomor biasa tidak memotong', 'tahun\n2024. bagus', '<p>tahun<br>2024. bagus</p>');

// ---- XSS ----
const jahat = [
  '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '[x](javascript:alert(1))', '[x](JaVaScRiPt:alert(1))',
  '[x](data:text/html,<script>alert(1)</script>)', '[x](//evil.com)', '[x](https://a.com" onmouseover="alert(1))', '[x](https://a.com"onmouseover="alert(1))',
  '![x](https://evil.com/a.svg)', '![x](javascript:alert(1))', '**<b>**', '[<img src=x onerror=alert(1)>](https://a.com)',
  '[x](vbscript:msgbox(1))', '[x](file:///etc/passwd)', '[x](https://user:pw@evil.com)', '[x](https://a.com/ b)', '[x]( javascript:alert(1))',
  '[x](&#106;avascript:alert(1))', '[x](\tjavascript:alert(1))', '`<script>`', '```\n<script>alert(1)</script>\n```', '# <svg onload=alert(1)>',
  '> <iframe src=javascript:alert(1)>', '- <a href="javascript:alert(1)">x</a>', '<a href="javascript:alert(1)">x</a>', '"><script>alert(1)</script>',
  'https://a.com/"onmouseover="alert(1)', 'https://a.com/<script>', '[a](https://a.com/ b)', '[x](https://a.com)(javascript:alert(1))',
];
// Daftar tag yang boleh muncul di keluaran
const BOLEH = new Set(['p', 'h3', 'h4', 'h5', 'blockquote', 'ul', 'ol', 'li', 'hr', 'pre', 'code', 'strong', 'em', 'del', 'a', 'br', 'span']);
function periksa(nama, h) {
  const tags = [...h.matchAll(/<\/?([a-z0-9]+)([^>]*)>/gi)];
  for (const t of tags) {
    if (!BOLEH.has(t[1].toLowerCase())) return ok(nama, false, 'tag terlarang: ' + t[0]);
    if (t[1] === 'a' && t[0][1] !== '/' && !/^ href="https?:\/\/[^"<>\s]*" target="_blank" rel="noopener noreferrer nofollow ugc"$/.test(t[2])) return ok(nama, false, 'atribut <a> aneh: ' + t[0]);
    if (!['a', 'ol', 'li', 'span'].includes(t[1]) && t[2].trim()) return ok(nama, false, 'atribut tak terduga: ' + t[0]);
  }
  // Setelah semua tag buatan kode dibuang, tidak boleh ada < atau > mentah tersisa
  const sisa = h.replace(/<\/?[a-z0-9]+[^>]*>/gi, '');
  if (/[<>]/.test(sisa)) return ok(nama, false, 'ada < atau > mentah: ' + sisa);
  if (/\son\w+\s*=/i.test(h.replace(/<a href="[^"]*"/g, '').replace(/&quot;|&#39;/g, '')) && /<[^>]*\son\w+=/i.test(h)) return ok(nama, false, 'atribut on*: ' + h);
  if (/href="\s*(javascript|data|vbscript|file):/i.test(h)) return ok(nama, false, 'href berbahaya: ' + h);
  if (/<img|<svg|<script|<iframe/i.test(h)) return ok(nama, false, 'tag berbahaya: ' + h);
  ok(nama, true);
}
jahat.forEach(j => periksa('XSS ' + JSON.stringify(j).slice(0, 60), M.html(j)));
ok('![x](svg) tampil sebagai teks', M.html('![x](https://evil.com/a.svg)') === '<p>![x](https://evil.com/a.svg)</p>', M.html('![x](https://evil.com/a.svg)'));
ok('javascript: tidak jadi tautan', !/<a /.test(M.html('[x](javascript:alert(1))')));
ok('// tidak jadi tautan', !/<a /.test(M.html('[x](//evil.com)')));
ok('kutip tertutup di href', !/"\s*onmouseover/.test(M.html('[x](https://a.com" onmouseover="alert(1))')));
ok('urlAman userinfo', M.urlAman('https://u:p@a.com') === null && M.urlAman('https://a.com@evil.com') === null);
ok('urlAman skema', M.urlAman('ftp://a.com') === null && M.urlAman('a.com') === null && M.urlAman('http://a.com') === 'http://a.com/');

// ---- Kinerja (isi maks. 4000 karakter; uji juga jauh lebih besar) ----
const kasus = {
  '* x4000': '*'.repeat(4000), '_ x4000': '_'.repeat(4000), '[ x4000': '['.repeat(4000), '[] x2000': '[]'.repeat(2000), '[]( x1300': '[](' .repeat(1300),
  '~ x4000': '~'.repeat(4000), '` x4000': '`'.repeat(4000), '*a x2000': '*a'.repeat(2000), '**a x1300': '**a'.repeat(1300), '_a x2000': '_a'.repeat(2000),
  '[a]( x1300': '[a]('.repeat(1300), '- x4000': '-'.repeat(4000), '> x4000': '>'.repeat(4000), '- - x2000 baris': '- \n'.repeat(2000),
  'daftar dalam': Array.from({ length: 200 }, (_, i) => ' '.repeat(i % 12) + '- a').join('\n'), '# x2000 baris': '#\n'.repeat(2000),
  '```x1300': '```a\n'.repeat(800), 'https x500': 'https://a.b/'.repeat(300), '*[*[ x1000': '*[*['.repeat(1000), '(*)': '[*'.repeat(2000) + ']('.repeat(2000),
  '***a** x': '***a**'.repeat(600), 'besar 20000': '*a_[b](c)`'.repeat(2000),
};
for (const [nama, s] of Object.entries(kasus)) {
  const t0 = process.hrtime.bigint(); const h = M.html(s); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  ok('kinerja ' + nama + ' (' + ms.toFixed(0) + ' ms)', ms < 400, ms.toFixed(0) + ' ms');
  periksa('aman ' + nama, h);
}
console.log(salah ? '\nGAGAL: ' + salah + ' dari ' + (salah + lulus) : 'OK: ' + lulus + ' pemeriksaan lulus.');
process.exit(salah ? 1 : 0);

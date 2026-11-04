// Avatar: foto profil + ilustrasi bawaan "benang jahit". Dimuat sebelum js/ui.js (dan di profil-publik.html).
// Butuh esc() dan SUPABASE_URL saat avatar() dipanggil.

// Path foto di Supabase Storage (bucket "avatar") -> URL publik. URL penuh/blob dipakai apa adanya.
function urlFoto(f) {
  if (!f) return '';
  if (/^(https?:|blob:|data:)/.test(f)) return f;
  return SUPABASE_URL + '/storage/v1/object/public/avatar/' + String(f).split('/').map(encodeURIComponent).join('/');
}

// Ilustrasi avatar bawaan "benang jahit": karya orisinal Jurkon yang digambar oleh algoritma di bawah (bukan foto, bukan aset
// pihak lain). Terinspirasi logo Jurkon (kertas sobek dengan benang merah yang menghubungkan titik). Setiap akun mendapat
// komposisi sendiri (warna kertas, warna benang, jumlah dan letak titik) yang tetap sama selama seed-nya sama.
// Seed = username (stabil walau nama tampilan diganti). Tanpa seed, dipakai teks nama.
function benihAvatar(teks) {            // FNV-1a 32 bit
  let h = 2166136261;
  for (const c of String(teks)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function acakAvatar(a) {                // mulberry32
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function ilustrasiAvatar(seed) {
  const r = acakAvatar(benihAvatar(String(seed || '?').toLowerCase()));
  const hKertas = Math.floor(r() * 360), hBenang = (hKertas + 150 + Math.floor(r() * 60)) % 360;
  const kertas = `hsl(${hKertas} 46% 87%)`, kertas2 = `hsl(${hKertas} 40% 78%)`, benang = `hsl(${hBenang} 68% 44%)`, tinta = `hsl(${hKertas} 25% 22%)`;
  const n = 3 + Math.floor(r() * 3);                       // 3 sampai 5 titik
  const pts = [];
  for (let i = 0; i < n; i++) {                            // titik tersebar pada cincin, dengan sedikit goyangan
    const sudut = (i + r() * 0.6) / n * Math.PI * 2 + r() * 0.4, jari = 15 + r() * 12;
    pts.push([50 + Math.cos(sudut) * jari, 50 + Math.sin(sudut) * jari]);
  }
  const f = v => v.toFixed(1);
  let garis = '';
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; garis += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`; }
  const j = pts[0], k = pts[Math.floor(n / 2)];
  garis += `M${f(j[0])} ${f(j[1])}L${f(k[0])} ${f(k[1])}`;      // satu jahitan silang, seperti pada logo
  const titik = pts.map(p => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="2.6" fill="${tinta}"/>`).join('');
  const miring = Math.floor(r() * 360);
  return `<svg class="avatar-seni" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect width="100" height="100" fill="${kertas}"/>` +
    `<circle cx="${f(20 + r() * 60)}" cy="${f(20 + r() * 60)}" r="${f(26 + r() * 20)}" fill="${kertas2}" opacity=".7"/>` +
    `<rect x="12" y="12" width="76" height="76" rx="6" fill="none" stroke="${tinta}" stroke-width="1.4" stroke-dasharray="3 3.4" opacity=".55" transform="rotate(${miring} 50 50)"/>` +
    `<path d="${garis}" fill="none" stroke="${benang}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${titik}</svg>`;
}

// foto (opsional): path/URL foto profil, tampil di atas ilustrasi bawaan (juga jadi cadangan bila foto gagal dimuat).
// seed (opsional tapi disarankan): username pemilik, supaya ilustrasi tidak berubah saat nama tampilan diganti.
function avatar(nama, ukuran, foto, seed) {
  const u = ukuran || 40;
  const n = (nama || '?').trim() || '?';
  const gb = foto ? `<img src="${esc(urlFoto(foto))}" alt="" loading="lazy" decoding="async">` : '';
  return `<span class="avatar" style="width:${u}px;height:${u}px">${ilustrasiAvatar(seed || n)}${gb}</span>`;
}

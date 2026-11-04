// Sampul foto, lokasi, dan tautan tambahan di profil (butuh sql/048_profil_sampul_tautan_lokasi.sql).
// Dipakai profil.js (anggota) dan profil-publik.js (tamu). Nilai dari database tetap diperiksa lagi saat ditampilkan:
// hanya alamat https yang menjadi tautan, selalu dengan rel="noopener noreferrer nofollow ugc".
var ProfilEkstra = (function () {
  var MAKS_TAUTAN = 4, MAKS_LOKASI = 40, MAKS_LABEL = 30, MAKS_URL = 200;
  var RE_HOST = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i;   // sama dengan aturan di database (bukan IP)
  var S = 'viewBox="0 0 24 24" aria-hidden="true"';
  var ikon = {
    pin: '<svg ' + S + '><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    tautan: '<svg ' + S + '><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    kamera: '<svg ' + S + '><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    plus: '<svg ' + S + '><path d="M12 5v14M5 12h14"/></svg>',
    silang: '<svg ' + S + '><path d="M6 6l12 12M18 6L6 18"/></svg>',
    kalender: '<svg ' + S + '><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
  };

  function urlSampul(path) {
    if (!path) return '';
    return SUPABASE_URL + '/storage/v1/object/public/sampul/' + String(path).split('/').map(encodeURIComponent).join('/');
  }

  // Ubah masukan pengguna ("contoh.com/saya") menjadi alamat https yang rapi, atau null bila tidak sah.
  function rapikanUrl(mentah) {
    var s = String(mentah == null ? '' : mentah).trim();
    if (!s) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return null;   // javascript:, mailto:, data:, dll.
    s = s.replace(/^https?:\/\//i, '').replace(/^\/\//, '');
    var u; try { u = new URL('https://' + s); } catch (e) { return null; }
    if (u.username || u.password || u.port || !RE_HOST.test(u.hostname)) return null;
    var url = u.href;
    if (u.pathname === '/' && !u.search && !u.hash) url = url.slice(0, -1);
    return url.length <= MAKS_URL ? url : null;
  }

  // Daftar tautan dari database -> [{label, url}] yang aman ditampilkan
  function bersih(daftar) {
    if (typeof daftar === 'string') { try { daftar = JSON.parse(daftar); } catch (e) { daftar = []; } }
    if (!Array.isArray(daftar)) return [];
    var hasil = [];
    daftar.forEach(function (x) {
      if (hasil.length >= MAKS_TAUTAN || !x || typeof x !== 'object') return;
      var url = rapikanUrl(x.url);
      if (!url || url !== x.url) return;
      var label = String(x.label || '').trim().slice(0, MAKS_LABEL);
      hasil.push({ label: label || null, url: url });
    });
    return hasil;
  }

  function namaTampil(x) {
    if (x.label) return x.label;
    try { return new URL(x.url).hostname.replace(/^www\./, ''); } catch (e) { return x.url; }
  }

  function htmlSampul(path) {
    return '<img class="sampul-foto" src="' + esc(urlSampul(path)) + '" alt="" decoding="async" fetchpriority="high">';
  }

  // Baris lokasi + tautan di bawah bio. Bila kosong: pemilik melihat ajakan mengisi, orang lain tidak melihat apa-apa.
  function htmlInfo(p, milikSaya) {
    var lokasi = String(p.lokasi || '').trim().slice(0, MAKS_LOKASI);
    var daftar = bersih(p.tautan);
    var h = '';
    if (lokasi) h += '<span class="pi-item pi-lokasi" title="' + esc(t('pe.lokasi')) + '">' + ikon.pin + '<span>' + esc(lokasi) + '</span></span>';
    daftar.forEach(function (x) {
      h += '<a class="pi-item pi-link" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer nofollow ugc" title="' + esc(x.url) + '">' +
        ikon.tautan + '<span>' + esc(namaTampil(x)) + '</span></a>';
    });
    if (!h && milikSaya) h = '<button type="button" class="pi-item pi-tambah" id="tambahInfo">' + ikon.plus + '<span>' + esc(t('pe.tambah')) + '</span></button>';
    return h ? '<div class="profil-info">' + h + '</div>' : '';
  }

  return { MAKS_TAUTAN: MAKS_TAUTAN, MAKS_LOKASI: MAKS_LOKASI, MAKS_LABEL: MAKS_LABEL, ikon: ikon,
    urlSampul: urlSampul, rapikanUrl: rapikanUrl, bersih: bersih, htmlSampul: htmlSampul, htmlInfo: htmlInfo };
})();

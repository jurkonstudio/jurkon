// DIHASILKAN oleh tools/pecah-bahasa.js dari js/bahasa.js. Jangan diedit langsung.
var I18N_BAHASA=[{"kode":"id","nama":"Bahasa Indonesia","locale":"id-ID"},{"kode":"en","nama":"English","locale":"en-US"},{"kode":"ms","nama":"Bahasa Melayu","locale":"ms-MY"},{"kode":"jv","nama":"Basa Jawa","locale":"jv-ID"},{"kode":"su","nama":"Basa Sunda","locale":"su-ID"},{"kode":"zh","nama":"中文（简体）","locale":"zh-CN"},{"kode":"ja","nama":"日本語","locale":"ja-JP"}];
(function () {
  var KODE = I18N_BAHASA.map(function (b) { return b.kode; });
  var pil = 'auto';
  try { pil = localStorage.getItem('bahasa') || 'auto'; } catch (e) {}
  var kode = KODE.indexOf(pil) >= 0 ? pil : '';
  if (!kode) {
    var l = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < l.length && !kode; i++) {
      var d = String(l[i]).toLowerCase().replace('_', '-').split('-')[0];
      if (d === 'in') d = 'id'; else if (d === 'jw') d = 'jv'; else if (d === 'zsm' || d === 'zlm') d = 'ms';
      if (KODE.indexOf(d) >= 0) kode = d;
    }
    if (!kode) kode = 'en';
  }
  window.I18N_KODE = kode;
  document.write('<script src="js/bahasa/' + kode + '.js"><\/script>');
})();

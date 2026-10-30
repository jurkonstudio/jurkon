// Saran @username saat mengetik (mention), seperti di Threads.
// Ketik "@" lalu huruf: muncul saran akun. Ketuk (atau Enter/Tab) untuk menyisipkan.
// Dimuat setelah supabase.js dan ui.js. Pakai: pasangMention(textarea, saya)
function pasangMention(ta, saya) {
  if (!ta || !saya) return;
  const wrap = document.createElement('div');
  wrap.className = 'sebut-wrap';
  ta.parentNode.insertBefore(wrap, ta);
  wrap.appendChild(ta);
  const list = document.createElement('ul');
  list.className = 'sebut-list';
  list.id = 'sebut-' + Math.random().toString(36).slice(2, 8);
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Saran username');
  list.hidden = true;
  wrap.appendChild(list);
  ta.setAttribute('aria-autocomplete', 'list');
  ta.setAttribute('aria-controls', list.id);

  let items = [], idx = 0, versi = 0, tunda = null, ikuti = null;

  // Kata "@..." tepat sebelum kursor; "@" harus di awal teks atau setelah spasi/tanda baca
  function token() {
    if (ta.selectionStart !== ta.selectionEnd) return null;
    const pos = ta.selectionStart;
    const m = /(^|[^a-z0-9_@])@([a-z0-9_]{0,20})$/i.exec(ta.value.slice(0, pos));
    return m ? { mulai: pos - m[2].length - 1, kata: m[2].toLowerCase(), pos } : null;
  }

  // Akun yang kuikuti (sekali muat): dipakai untuk saran awal dan untuk mengurutkan hasil
  async function muatIkuti() {
    if (ikuti) return ikuti;
    ikuti = { ids: new Set(), profil: [] };
    try {
      const { data: f } = await db.from('follows').select('following_id').eq('follower_id', saya.id).limit(200);
      const ids = (f || []).map(x => x.following_id);
      ids.forEach(i => ikuti.ids.add(i));
      if (ids.length) {
        const { data: p } = await db.from('profiles').select('id,username,nama').in('id', ids.slice(0, 100)).order('username').limit(8);
        ikuti.profil = p || [];
      }
    } catch (e) {}
    return ikuti;
  }

  function tutup() {
    list.hidden = true; items = []; idx = 0; versi++;
    ta.removeAttribute('aria-activedescendant');
  }

  function gambar() {
    if (!items.length) { tutup(); return; }
    list.innerHTML = items.map((p, i) => `<li role="option" id="${list.id}-${i}" data-i="${i}" aria-selected="${i === idx}" class="${i === idx ? 'aktif' : ''}">
      ${avatar(p.nama || p.username, 32)}
      <span class="sebut-teks"><b>${esc(p.nama || p.username)}</b><span>@${esc(p.username)}</span></span></li>`).join('');
    list.hidden = false;
    ta.setAttribute('aria-activedescendant', `${list.id}-${idx}`);
    const aktif = list.children[idx];
    if (aktif && aktif.scrollIntoView) aktif.scrollIntoView({ block: 'nearest' });
  }

  async function cari(kata) {
    const v = ++versi;
    let hasil = [];
    try {
      const k = await muatIkuti();
      if (!kata) hasil = k.profil;
      else {
        const { data } = await db.from('profiles').select('id,username,nama')
          .ilike('username', kata.replace(/_/g, '\\_') + '%').order('username').limit(8);
        hasil = (data || []).slice().sort((a, b) => (k.ids.has(b.id) - k.ids.has(a.id)));
      }
    } catch (e) { hasil = []; }
    if (v !== versi) return;                       // sudah ada ketikan lebih baru
    const tk = token();
    if (!tk || tk.kata !== kata) { tutup(); return; }
    items = hasil.filter(p => p.id !== saya.id).slice(0, 5);
    idx = 0;
    gambar();
  }

  function jadwalkan() {
    clearTimeout(tunda);
    const tk = token();
    if (!tk) { tutup(); return; }
    tunda = setTimeout(() => cari(tk.kata), tk.kata ? 150 : 0);
  }

  function pilih(i) {
    const tk = token(), p = items[i];
    if (!tk || !p) { tutup(); return; }
    const sisip = '@' + p.username + ' ';
    ta.value = ta.value.slice(0, tk.mulai) + sisip + ta.value.slice(tk.pos);
    const c = tk.mulai + sisip.length;
    ta.setSelectionRange(c, c);
    tutup();
    ta.dispatchEvent(new Event('input', { bubbles: true }));   // perbarui hitungan karakter & filter
    ta.focus();
  }

  ta.addEventListener('input', jadwalkan);
  ta.addEventListener('click', jadwalkan);
  ta.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) jadwalkan(); });
  ta.addEventListener('blur', () => setTimeout(tutup, 120));
  ta.addEventListener('keydown', e => {
    if (list.hidden || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      idx = (idx + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      gambar();
    } else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pilih(idx); }
    else if (e.key === 'Escape') { e.preventDefault(); tutup(); }
  });
  // pointerdown + preventDefault: kolom tulis tetap fokus, papan ketik tidak menutup
  list.addEventListener('pointerdown', e => {
    const li = e.target.closest('li[data-i]');
    if (!li) return;
    e.preventDefault();
    pilih(+li.dataset.i);
  });
}

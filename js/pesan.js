(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const { data } = await db.from('conversations').select('id,user_a,user_b').order('created_at', { ascending: false });
  if (!data || !data.length) { $('#daftar').innerHTML = '<div class="kosong">Belum ada percakapan.<br>Buka profil seseorang lalu tekan "Kirim Pesan".</div>'; return; }
  const ids = data.map(c => c.user_a === saya.id ? c.user_b : c.user_a);
  const { data: orang } = await db.from('profiles').select('id,username,nama').in('id', ids);
  const peta = Object.fromEntries((orang || []).map(o => [o.id, o]));
  $('#daftar').innerHTML = data.map((c, i) => {
    const o = peta[ids[i]] || {};
    return `<a class="item" href="chat.html?id=${c.id}"><b>${esc(o.nama || o.username)}</b>
      <span style="color:var(--redup)">@${esc(o.username)}</span></a>`;
  }).join('');
})();

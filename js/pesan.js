(async () => {
  const saya = await wajibLogin();
  if (!saya) return;
  const el = $('#daftar');
  el.innerHTML = skeleton(3);
  const { data, error } = await db.from('conversations').select('id,user_a,user_b,created_at');
  if (error) { el.innerHTML = '<div class="kosong"><h3>' + esc(t('umum.gagalMuat')) + '</h3><p>' + esc(error.message) + '</p></div>'; return; }
  if (!data || !data.length) { el.innerHTML = kosong('pesan', t('pesan.kosongJ'), t('pesan.kosongT'), 'explore.html', t('umum.cariOrang')); return; }

  // Pesan terakhir tiap percakapan, supaya daftar urut menurut aktivitas terbaru
  const cids = data.map(c => c.id);
  const { data: pesan } = await db.from('messages').select('conversation_id,sender_id,content,created_at')
    .in('conversation_id', cids).order('created_at', { ascending: false }).limit(300);
  const terakhir = {};
  (pesan || []).forEach(m => { if (!terakhir[m.conversation_id]) terakhir[m.conversation_id] = m; });
  const waktuC = c => new Date((terakhir[c.id] || c).created_at).getTime();
  data.sort((a, b) => waktuC(b) - waktuC(a));

  const ids = data.map(c => c.user_a === saya.id ? c.user_b : c.user_a);
  const { data: orang } = await db.from('profiles').select('id,username,nama,foto_url').in('id', ids);
  const peta = Object.fromEntries((orang || []).map(o => [o.id, o]));
  el.innerHTML = data.map((c, i) => {
    const o = peta[ids[i]] || {};
    const m = terakhir[c.id];
    const cuplikan = m ? (m.sender_id === saya.id ? t('pesan.kamu') : '') + m.content : t('pesan.belum');
    return `<a class="item dgn-avatar" href="chat.html?id=${c.id}">${avatar(o.nama || o.username, 44, o.foto_url)}
      <div style="min-width:0"><b>${esc(o.nama || o.username || t('pesan.pengguna'))}</b>${lencanaResmi(o.username)} <span class="sub">${m ? waktu(m.created_at) : ''}</span>
      <div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cuplikan)}</div></div></a>`;
  }).join('');
})();

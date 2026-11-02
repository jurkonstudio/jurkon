-- JURKON 042: pesan sambutan otomatis untuk pengguna baru + kerangka asisten (balasan "hi/halo").
--
-- Cara kerja:
--   * Akun resmi pengirim: username 'jurkon'. Akun ini HARUS ada (lihat 009_akun_resmi.sql).
--   * Klien (js/nav.js) memanggil kirim_sambutan(bahasa_perangkat) sekali per pengguna. Bahasa dibaca dari ponsel/browser
--     (I18n.deteksi), bukan pilihan manual. Fungsi ini idempoten: tiap pengguna hanya dikirimi satu kali.
--   * Semua pengguna yang SUDAH ada saat migrasi ini dijalankan ditandai "sudah", jadi tidak ikut dikirimi.
--   * Pengguna boleh membalas akun resmi tanpa saling mengikuti (kebijakan kirim pesan diperbarui di bawah).
--   * Pesan dari akun resmi tidak terkena pembatas laju (batasi_pesan diperbarui), supaya sambutan tidak macet
--     saat banyak pendaftar dalam satu hari.
--   * Bila pengguna menyapa (hi/halo/hello...) ke akun resmi, trigger memanggil asisten_balas().
--     SEKARANG fungsi itu hanya mengirim balasan sementara (teks_asisten_sementara). Saat asisten sudah jadi,
--     ganti isi asisten_balas() (mis. panggil Edge Function lewat pg_net) tanpa mengubah bagian lain.
--
-- Jalankan di Supabase SQL Editor SEBELUM mengunggah kode JS terbaru. Aman diulang.

-- ---------------------------------------------------------------- A. tabel penanda
create table if not exists sambutan_terkirim (
  user_id    uuid primary key references profiles(id) on delete cascade,
  bahasa     text,
  dikirim_at timestamptz not null default now()
);
alter table sambutan_terkirim enable row level security;   -- tanpa kebijakan: hanya fungsi security definer yang bisa menyentuhnya
revoke all on sambutan_terkirim from anon, authenticated;

-- Pengguna lama: tandai sudah (bahasa 'lama'), supaya hanya pendaftar baru yang dikirimi.
insert into sambutan_terkirim (user_id, bahasa)
  select id, 'lama' from profiles
  on conflict (user_id) do nothing;

-- ---------------------------------------------------------------- B. pembantu
create or replace function akun_resmi_uid(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                  where id = uid and username in ('jurkon', 'journalconnection', 'jurnalkoneksi'));
$$;
revoke execute on function akun_resmi_uid(uuid) from public, anon;
grant execute on function akun_resmi_uid(uuid) to authenticated;

create or replace function teks_sambutan(bhs text, nama text) returns text
language sql immutable as $$
  select replace(case bhs
    when 'id' then $t$Halo, {nama}. Selamat datang di Jurkon.

Tarik napas panjang. Di sini, kamu nggak perlu buru-buru, nggak perlu pamer, dan nggak ada algoritma yang menuntutmu untuk terus scroll.

Catatanmu privat secara bawaan. Kamu bisa mulai dengan menulis jurnal pribadi, atau menjawab Pertanyaan Harian. Kalau belum mau nulis apa-apa, nggak apa-apa.

Nikmati ketenangannya. Kalau butuh bantuan, ketik "hi" atau "halo" di sini.

Salam hangat,
Tim Journal Connection$t$
    when 'en' then $t$Hi, {nama}. Welcome to Jurkon.

Take a deep breath. Here, you don't have to rush, you don't have to show off, and there's no algorithm pushing you to keep scrolling.

Your notes are private by default. You can start by writing a personal journal entry, or by answering the Daily Question. If you're not ready to write anything yet, that's okay too.

Enjoy the calm. If you need help, type "hi" or "hello" here.

Warmly,
The Journal Connection Team$t$
    when 'ms' then $t$Hai, {nama}. Selamat datang ke Jurkon.

Tarik nafas dalam-dalam. Di sini, awak tak perlu tergesa-gesa, tak perlu menunjuk-nunjuk, dan tiada algoritma yang memaksa awak terus menatal.

Nota awak peribadi secara lalai. Awak boleh mulakan dengan menulis jurnal peribadi, atau menjawab Soalan Harian. Kalau belum mahu menulis apa-apa, tak mengapa.

Nikmati ketenangannya. Kalau perlukan bantuan, taip "hi" atau "helo" di sini.

Salam hangat,
Pasukan Journal Connection$t$
    when 'jv' then $t$Halo, {nama}. Sugeng rawuh ing Jurkon.

Narik napas dawa. Ing kene, kowe ora perlu kesusu, ora perlu pamer, lan ora ana algoritma sing meksa kowe terus nggulung layar.

Catetanmu pribadi sacara bawaan. Kowe bisa miwiti nulis jurnal pribadi, utawa mangsuli Pitakonan Saben Dina. Yen durung pengin nulis apa-apa, ora apa-apa.

Nikmatana katentremane. Yen butuh pitulungan, ketik "hi" utawa "halo" ing kene.

Salam anget,
Tim Journal Connection$t$
    when 'su' then $t$Halo, {nama}. Wilujeng sumping di Jurkon.

Tarik napas panjang. Di dieu, anjeun teu kedah buru-buru, teu kedah pamer, sareng teu aya algoritma anu maksa anjeun terus ngagulung.

Catetan anjeun pribadi sacara bawaan. Anjeun tiasa ngamimitian ku nulis jurnal pribadi, atanapi ngajawab Patarosan Poéan. Upami acan hoyong nulis nanaon, teu nanaon.

Nikmati katengtremanana. Upami peryogi pitulung, ketik "hi" atanapi "halo" di dieu.

Salam anget,
Tim Journal Connection$t$
    when 'zh' then $t$你好，{nama}。欢迎来到 Jurkon。

深呼吸一下。在这里，你不用着急，不用炫耀，也没有算法逼着你不停地刷。

你的笔记默认是私密的。你可以从写一篇私人日记开始，或者回答“每日一问”。如果现在还不想写什么，也没关系。

慢慢享受这份宁静。需要帮助的话，在这里输入“hi”或“你好”。

温暖问候，
Journal Connection 团队$t$
    when 'ja' then $t$こんにちは、{nama}さん。Jurkonへようこそ。

ゆっくり深呼吸をしてください。ここでは、急ぐ必要も、自慢する必要もありません。スクロールし続けるよう迫るアルゴリズムもありません。

あなたのノートは、初期設定で非公開です。まずは個人的な日記を書くか、「毎日の質問」に答えてみてください。まだ何も書きたくなければ、それでも大丈夫です。

静けさをゆっくり味わってください。困ったときは、ここに「hi」または「こんにちは」と入力してください。

あたたかい気持ちを込めて、
Journal Connection チーム$t$
    when 'ko' then $t$안녕하세요, {nama}님. Jurkon에 오신 것을 환영합니다.

숨을 크게 들이쉬어 보세요. 여기서는 서두르지 않아도 되고, 자랑하지 않아도 되며, 계속 스크롤하라고 재촉하는 알고리즘도 없습니다.

기록은 기본적으로 비공개입니다. 개인 일기를 쓰는 것으로 시작하거나 '일일 질문'에 답해 보세요. 아직 아무것도 쓰고 싶지 않다면, 그래도 괜찮아요.

고요함을 마음껏 누리세요. 도움이 필요하면 여기에 "hi" 또는 "안녕"이라고 입력해 주세요.

따뜻한 마음을 담아,
Journal Connection 팀$t$
    when 'hi' then $t$नमस्ते, {nama}। Jurkon में आपका स्वागत है।

एक गहरी साँस लीजिए। यहाँ आपको जल्दबाज़ी करने की ज़रूरत नहीं है, दिखावा करने की ज़रूरत नहीं है, और कोई एल्गोरिदम आपको लगातार स्क्रॉल करने के लिए मजबूर नहीं करता।

आपके नोट्स डिफ़ॉल्ट रूप से निजी हैं। आप अपनी निजी डायरी लिखकर शुरुआत कर सकते हैं, या "रोज़ का सवाल" का जवाब दे सकते हैं। अगर अभी कुछ लिखने का मन नहीं है, तो कोई बात नहीं।

इस शांति का आनंद लीजिए। मदद चाहिए तो यहाँ "hi" या "नमस्ते" लिखिए।

गर्मजोशी के साथ,
Journal Connection टीम$t$
    else $t$Hi, {nama}. Welcome to Jurkon.

Take a deep breath. Here, you don't have to rush, you don't have to show off, and there's no algorithm pushing you to keep scrolling.

Your notes are private by default. You can start by writing a personal journal entry, or by answering the Daily Question. If you're not ready to write anything yet, that's okay too.

Enjoy the calm. If you need help, type "hi" or "hello" here.

Warmly,
The Journal Connection Team$t$ end, '{nama}', nama);
$$;

create or replace function teks_asisten_sementara(bhs text, nama text) returns text
language sql immutable as $$
  select replace(case bhs
    when 'id' then $t$Halo, {nama}! Senang kamu menyapa.

Asisten Jurkon masih kami siapkan, jadi balasan otomatis belum tersedia. Sementara itu, kamu bisa mulai menulis di Jurnal, menjawab Pertanyaan Harian, atau membuka Pusat bantuan di Pengaturan.$t$
    when 'en' then $t$Hi, {nama}! Nice to hear from you.

The Jurkon assistant is still being prepared, so automatic replies aren't available yet. In the meantime, you can start writing in Journal, answer the Daily Question, or open the Help center in Settings.$t$
    when 'ms' then $t$Hai, {nama}! Seronok awak menyapa.

Pembantu Jurkon masih kami sediakan, jadi balasan automatik belum tersedia. Sementara itu, awak boleh mula menulis dalam Jurnal, menjawab Soalan Harian, atau membuka Pusat bantuan di Tetapan.$t$
    when 'jv' then $t$Halo, {nama}! Seneng kowe nyapa.

Asisten Jurkon isih kita siapake, dadi wangsulan otomatis durung kasedhiya. Sauntara kuwi, kowe bisa miwiti nulis ing Jurnal, mangsuli Pitakonan Saben Dina, utawa mbukak Pusat bantuan ing Pengaturan.$t$
    when 'su' then $t$Halo, {nama}! Bagja anjeun nyapa.

Asisten Jurkon masih disiapkeun, janten waleran otomatis acan sayogi. Samentawis éta, anjeun tiasa ngamimitian nulis dina Jurnal, ngajawab Patarosan Poéan, atanapi muka Pusat bantuan di Pengaturan.$t$
    when 'zh' then $t$你好，{nama}！很高兴收到你的问候。

Jurkon 助手还在准备中，暂时无法自动回复。在此期间，你可以开始写日记、回答“每日一问”，或在设置中打开帮助中心。$t$
    when 'ja' then $t$こんにちは、{nama}さん。メッセージありがとうございます。

Jurkonのアシスタントは現在準備中のため、自動返信はまだご利用いただけません。それまでの間は、日記を書いたり、「毎日の質問」に答えたり、設定からヘルプセンターを開いたりしてみてください。$t$
    when 'ko' then $t$안녕하세요, {nama}님! 인사해 주셔서 반가워요.

Jurkon 도우미는 아직 준비 중이라 자동 답장을 보내 드릴 수 없어요. 그동안 일기를 쓰거나 '일일 질문'에 답하거나, 설정에서 고객센터를 열어 보세요.$t$
    when 'hi' then $t$नमस्ते, {nama}! आपका संदेश पाकर अच्छा लगा।

Jurkon असिस्टेंट अभी तैयार किया जा रहा है, इसलिए अपने-आप जवाब देना अभी शुरू नहीं हुआ है। तब तक आप डायरी लिख सकते हैं, "रोज़ का सवाल" का जवाब दे सकते हैं, या सेटिंग्स में सहायता केंद्र खोल सकते हैं।$t$
    else $t$Hi, {nama}! Nice to hear from you.

The Jurkon assistant is still being prepared, so automatic replies aren't available yet. In the meantime, you can start writing in Journal, answer the Daily Question, or open the Help center in Settings.$t$ end, '{nama}', nama);
$$;
revoke execute on function teks_sambutan(text, text), teks_asisten_sementara(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- C. izinkan membalas akun resmi + lewati pembatas laju untuknya
drop policy if exists "pesan dikirim peserta" on messages;
create policy "pesan dikirim peserta" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from conversations c
          where c.id = conversation_id
            and auth.uid() in (c.user_a, c.user_b)
            and not ada_blokir(c.user_a, c.user_b)
            and (saling_ikuti(c.user_a, c.user_b) or akun_resmi_uid(c.user_a) or akun_resmi_uid(c.user_b))));

create or replace function batasi_pesan() returns trigger
language plpgsql security definer set search_path = public as $$
declare menit int; hari int; baru boolean; siaran int; lawan int; sudah boolean; jml_media int;
begin
  -- Pesan otomatis dari akun resmi (sambutan, asisten) tidak dibatasi laju. Penanda hanya bisa dipasang fungsi di bawah.
  if current_setting('jurkon.kirim_sistem', true) = '1' and akun_resmi_uid(new.sender_id) then return new; end if;
  baru := akun_baru(new.sender_id);
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into menit, hari
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if menit >= (case when baru then 8 else 15 end) then raise exception 'Terlalu cepat. Tunggu sebentar lalu coba lagi.'; end if;
  if hari >= (case when baru then 100 else 300 end) then raise exception 'Batas pesan harian tercapai. Coba lagi besok.'; end if;
  if new.media_path is not null then
    select count(*) into jml_media from messages
      where sender_id = new.sender_id and media_path is not null and created_at > now() - interval '1 hour';
    if jml_media >= (case when baru then 10 else 40 end) then
      raise exception 'Terlalu banyak foto atau pesan suara dalam satu jam. Coba lagi nanti.';
    end if;
  end if;
  perform cek_isi_spam(new.content, baru);
  if new.media_path is null then
    select count(distinct conversation_id) into siaran from messages
      where sender_id = new.sender_id and created_at > now() - interval '1 hour'
        and conversation_id <> new.conversation_id and norm_teks(content) = norm_teks(new.content);
    if siaran >= 2 then raise exception 'Pesan yang sama sudah kamu kirim ke beberapa orang. Ubah isinya atau tunggu dulu.'; end if;
  end if;
  select count(distinct conversation_id), coalesce(bool_or(conversation_id = new.conversation_id), false)
    into lawan, sudah
    from messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if not sudah and lawan >= (case when baru then 5 else 30 end) then
    raise exception 'Kamu sudah menghubungi terlalu banyak orang hari ini. Coba lagi besok.';
  end if;
  return new;
end $$;
drop trigger if exists batasi_pesan_trg on messages;
create trigger batasi_pesan_trg before insert on messages
  for each row execute function batasi_pesan();

-- ---------------------------------------------------------------- D. kirim sambutan
create or replace function kirim_sambutan(p_bahasa text default 'id') returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); bhs text; pengirim uuid; nama_p text; uname text;
  a uuid; b uuid; cid uuid; baris int; berhasil boolean := false;
begin
  if uid is null then return 'tanpa_sesi'; end if;
  bhs := lower(split_part(replace(coalesce(p_bahasa, 'id'), '_', '-'), '-', 1));
  if bhs not in ('id','en','ms','jv','su','zh','ja','ko','hi') then bhs := 'en'; end if;

  -- Klaim dulu (atomik): dua tab yang memanggil bersamaan hanya satu yang lolos.
  insert into sambutan_terkirim (user_id, bahasa) values (uid, bhs) on conflict (user_id) do nothing;
  get diagnostics baris = row_count;
  if baris = 0 then return 'sudah'; end if;

  select id into pengirim from profiles where username = 'jurkon';
  select coalesce(nullif(btrim(nama), ''), username), username into nama_p, uname from profiles where id = uid;
  if pengirim is null or pengirim = uid or nama_p is null then
    delete from sambutan_terkirim where user_id = uid;       -- belum bisa; coba lagi di kunjungan berikutnya
    return case when pengirim is null then 'tanpa_pengirim' else 'tanpa_profil' end;
  end if;

  a := least(uid, pengirim); b := greatest(uid, pengirim);
  insert into conversations (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from conversations where user_a = a and user_b = b;

  perform set_config('jurkon.kirim_sistem', '1', true);
  begin
    insert into messages (conversation_id, sender_id, content) values (cid, pengirim, teks_sambutan(bhs, nama_p));
    berhasil := true;
  exception when others then
    -- Nama bisa tertahan filter konten; coba sekali lagi dengan username.
    begin
      insert into messages (conversation_id, sender_id, content) values (cid, pengirim, teks_sambutan(bhs, uname));
      berhasil := true;
    exception when others then
      raise warning 'kirim_sambutan gagal: %', sqlerrm;
    end;
  end;
  perform set_config('jurkon.kirim_sistem', '', true);

  if not berhasil then
    delete from sambutan_terkirim where user_id = uid;
    return 'gagal';
  end if;
  return 'terkirim';
end $$;
revoke execute on function kirim_sambutan(text) from public, anon;
grant execute on function kirim_sambutan(text) to authenticated;

-- ---------------------------------------------------------------- E. kerangka asisten
-- Titik sambung asisten. Dipanggil untuk SETIAP pesan pengguna ke akun resmi 'jurkon'.
-- Sekarang: hanya menjawab sapaan dengan balasan sementara. Nanti: ganti isi fungsi ini dengan pemanggilan asisten sungguhan.
create or replace function asisten_balas(p_percakapan uuid, p_pengguna uuid, p_pengirim uuid, p_teks text) returns void
language plpgsql security definer set search_path = public as $$
declare bhs text; nama_p text; sapaan boolean;
begin
  sapaan := lower(btrim(p_teks)) ~ '^(hi+|hai+|halo+|hallo|hello|hey+|hei|helo|hola|oi|selamat (pagi|siang|sore|malam)|assalamu.?alaikum|salam|你好|您好|こんにちは|안녕|안녕하세요|नमस्ते)[ !.,?]*$';
  if not sapaan then return; end if;
  -- Jangan membalas bertubi-tubi bila pengguna mengirim sapaan berulang.
  if exists (select 1 from messages where conversation_id = p_percakapan and sender_id = p_pengirim
               and created_at > now() - interval '30 seconds') then return; end if;
  select coalesce(nullif(bahasa, 'lama'), 'id') into bhs from sambutan_terkirim where user_id = p_pengguna;
  select coalesce(nullif(btrim(nama), ''), username) into nama_p from profiles where id = p_pengguna;
  perform set_config('jurkon.kirim_sistem', '1', true);
  insert into messages (conversation_id, sender_id, content)
    values (p_percakapan, p_pengirim, teks_asisten_sementara(coalesce(bhs, 'id'), coalesce(nama_p, '')));
  perform set_config('jurkon.kirim_sistem', '', true);
end $$;
revoke execute on function asisten_balas(uuid, uuid, uuid, text) from public, anon, authenticated;

create or replace function asisten_pesan_masuk() returns trigger
language plpgsql security definer set search_path = public as $$
declare pengirim uuid; pengguna uuid;
begin
  select id into pengirim from profiles where username = 'jurkon';
  if pengirim is null or new.sender_id = pengirim then return new; end if;
  select case when user_a = pengirim then user_b when user_b = pengirim then user_a end
    into pengguna from conversations where id = new.conversation_id;
  if pengguna is null or pengguna <> new.sender_id or new.content is null then return new; end if;
  perform asisten_balas(new.conversation_id, pengguna, pengirim, new.content);
  return new;
exception when others then
  raise warning 'asisten_pesan_masuk gagal: %', sqlerrm;   -- kegagalan asisten tidak boleh menggagalkan pesan pengguna
  return new;
end $$;
drop trigger if exists asisten_pesan_trg on messages;
create trigger asisten_pesan_trg after insert on messages
  for each row execute function asisten_pesan_masuk();

notify pgrst, 'reload schema';

-- PEMERIKSAAN (jalankan terpisah):
--   select count(*) from sambutan_terkirim;                     -- = jumlah profil saat migrasi
--   select id from profiles where username = 'jurkon';          -- harus 1 baris
-- MEMBATALKAN:
--   drop trigger asisten_pesan_trg on messages;
--   drop function kirim_sambutan(text), asisten_balas(uuid,uuid,uuid,text), asisten_pesan_masuk();

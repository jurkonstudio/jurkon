// Ketentuan layanan dalam 7 bahasa. HTML statis di ketentuan-layanan.html adalah versi Indonesia (sumber utama,
// terbaca tanpa JavaScript dan oleh mesin pencari). Berkas ini mengganti isinya bila bahasa tampilan bukan Indonesia.
// Bahasa dipilih oleh js/bahasa-muat.js (window.I18N_KODE): pilihan manual, lalu bahasa perangkat.
// Bila isi versi Indonesia berubah, perbarui keenam terjemahan di bawah dan tanggal "terakhir diperbarui".
(function () {
  var kode = window.I18N_KODE;
  if (!kode || kode === 'id') return;

  var D = {
    en: {
      h1: 'Terms of Service', tgl: 'Last updated: 31 October 2026', k: 'Privacy Policy', a: 'Rules of Use',
      intro: 'By creating an account or using Jurnal Koneksi (“Jurkon”), you agree to these terms. If you do not agree, please do not use the service. These terms are read together with the {k} and the {a}.',
      s: [
        ['1. About the service', '<p>Jurkon is a space to write short notes (up to 250 characters), reply, like, follow other users, and send direct messages (up to 750 characters). The service is provided as is and may change over time.</p>'],
        ['2. Your account', '<ul><li>You must be at least 17 years old and provide a correct email address that you can access.</li><li>You are responsible for keeping your password confidential and for everything that happens through your account.</li><li>One account per person is enough. Impersonating another person or organization, or using a username that imitates an official Jurkon account, is prohibited.</li><li>Official Jurkon accounts are marked with a gold check badge, and accounts verified by the Jurkon team are marked with a blue check. Certain usernames are reserved for official accounts and cannot be used by regular users.</li><li>Changes to your photo, name, and username are limited per month, and your username can only be changed once a day.</li></ul>'],
        ['3. Your content', '<p>The text and photos you upload remain yours. By uploading them, you grant Jurkon a non-exclusive, royalty-free, limited permission to store and display them to other users within the service, according to the applicable privacy settings. This permission ends when your content or your account is deleted, except for copies that have already been shared or screenshotted by other users outside our control.</p><p>You represent that you have the right to upload that content and that it does not infringe the rights of others or applicable law.</p>'],
        ['4. What is not allowed', '<p>You agree not to:</p><ul><li>violate the {a} (spam, fraud, hate speech, harassment, adult content, threats, gambling promotion, drugs, or sharing other people’s personal data);</li><li>access other people’s accounts, data, or systems without permission;</li><li>disrupt, overload, or try to breach the security of the service, including using bots, scripts, or automated means to create accounts, posts, likes, or messages in bulk;</li><li>scrape user data in bulk or use it for purposes outside Jurkon;</li><li>use the service for purposes that violate the law of the Republic of Indonesia.</li></ul>'],
        ['5. Moderation and our actions', '<p>We automatically check writing and review reports. We reserve the right, without any obligation to notify you first, to reject or remove content, limit features, suspend, or delete accounts that violate these terms or the rules, or that put other users and the service at risk. Automated checks can be wrong; if you believe our decision is mistaken, contact us and we will review it again.</p>'],
        ['6. Ending your use', '<p>You can stop at any time by deleting your account via Settings on the Profile page. Deletion is permanent. Terms that by their nature must remain in effect after an account is deleted (for example, limitations of liability) continue to apply.</p>'],
        ['7. No warranty', '<p>We work to keep Jurkon running well, but we do not guarantee that the service will always be available, uninterrupted, or error-free. Content is created by users; opinions in posts belong to their authors, not Jurkon, and we do not guarantee their accuracy.</p>'],
        ['8. Limitation of liability', '<p>To the extent permitted by law, Jurkon and its operators are not liable for indirect losses, loss of data, or losses arising from the content or actions of other users, or from service disruptions beyond our reasonable control. These terms do not remove rights that cannot be waived under the law, including consumer rights and rights over personal data.</p>'],
        ['9. Changes to the terms', '<p>We may update these terms. The date of the latest update is shown above. If you keep using Jurkon after a change takes effect, you are considered to have accepted it. For important changes, we will notify you through the app.</p>'],
        ['10. Governing law', '<p>These terms are governed by the law of the Republic of Indonesia. We prefer to resolve disputes through discussion first; if that fails, disputes are settled by the competent courts in Indonesia.</p>'],
        ['11. Contact', '<p>Questions about these terms: <span class="kontak-mail"></span></p>']
      ],
      nav: ['Privacy Policy', 'Terms of Service', 'Rules', 'Help Center', 'About'], navAria: 'Information pages',
      catatan: 'If this translation differs from the Indonesian version, the Indonesian version prevails.'
    },

    ms: {
      h1: 'Terma Perkhidmatan', tgl: 'Kali terakhir dikemas kini: 31 Oktober 2026', k: 'Dasar Privasi', a: 'Peraturan Penggunaan',
      intro: 'Dengan mencipta akaun atau menggunakan Jurnal Koneksi (“Jurkon”), anda bersetuju dengan terma ini. Jika anda tidak bersetuju, sila jangan gunakan perkhidmatan ini. Terma ini dibaca bersama {k} dan {a}.',
      s: [
        ['1. Tentang perkhidmatan', '<p>Jurkon ialah ruang untuk menulis catatan ringkas (maksimum 250 aksara), membalas, menyukai, mengikuti pengguna lain, dan menghantar mesej terus (maksimum 750 aksara). Perkhidmatan ini disediakan sebagaimana adanya dan boleh berubah dari semasa ke semasa.</p>'],
        ['2. Akaun anda', '<ul><li>Anda mesti berumur sekurang-kurangnya 17 tahun dan memberikan e-mel yang betul serta boleh anda akses.</li><li>Anda bertanggungjawab menjaga kerahsiaan kata laluan dan segala yang berlaku melalui akaun anda.</li><li>Satu orang cukup satu akaun. Dilarang menyamar sebagai orang atau pertubuhan lain, atau menggunakan nama pengguna yang meniru akaun rasmi Jurkon.</li><li>Akaun rasmi Jurkon ditandai lencana tanda semak emas, dan akaun yang telah disahkan oleh pasukan Jurkon ditandai tanda semak biru. Nama pengguna tertentu dikhaskan untuk akaun rasmi dan tidak boleh digunakan oleh pengguna biasa.</li><li>Perubahan foto, nama, dan nama pengguna dihadkan setiap bulan, dan nama pengguna hanya boleh ditukar sekali sehari.</li></ul>'],
        ['3. Kandungan anda', '<p>Tulisan dan foto yang anda muat naik kekal milik anda. Dengan memuat naiknya, anda memberi Jurkon kebenaran yang tidak eksklusif, bebas royalti, dan terhad untuk menyimpan serta memaparkannya kepada pengguna lain dalam perkhidmatan, mengikut tetapan privasi yang berkuat kuasa. Kebenaran ini tamat apabila kandungan atau akaun anda dipadam, kecuali salinan yang telah dikongsi atau ditangkap skrinnya oleh pengguna lain di luar kawalan kami.</p><p>Anda menyatakan bahawa anda berhak memuat naik kandungan tersebut dan bahawa kandungan itu tidak melanggar hak orang lain atau undang-undang yang berkuat kuasa.</p>'],
        ['4. Perkara yang tidak dibenarkan', '<p>Anda bersetuju untuk tidak:</p><ul><li>melanggar {a} (spam, penipuan, ucapan kebencian, gangguan, kandungan dewasa, ugutan, promosi judi, dadah, atau berkongsi data peribadi orang lain);</li><li>mengakses akaun, data, atau sistem milik orang lain tanpa kebenaran;</li><li>mengganggu, membebankan, atau cuba menembusi keselamatan perkhidmatan, termasuk menggunakan bot, skrip, atau cara automatik untuk mencipta akaun, siaran, suka, atau mesej secara besar-besaran;</li><li>mengambil data pengguna secara besar-besaran (scraping) atau menggunakannya untuk tujuan di luar Jurkon;</li><li>menggunakan perkhidmatan untuk tujuan yang melanggar undang-undang Republik Indonesia.</li></ul>'],
        ['5. Moderasi dan tindakan kami', '<p>Kami memeriksa tulisan secara automatik dan menyemak laporan. Kami berhak, tanpa kewajipan memaklumkan terlebih dahulu, untuk menolak atau memadam kandungan, menghadkan ciri, menggantung, atau memadam akaun yang melanggar terma atau peraturan, atau yang berisiko kepada pengguna lain dan perkhidmatan. Pemeriksaan automatik boleh tersilap; jika anda merasakan keputusan kami salah, hubungi kami dan kami akan menyemaknya semula.</p>'],
        ['6. Menghentikan penggunaan', '<p>Anda boleh berhenti pada bila-bila masa dengan memadam akaun melalui Tetapan di halaman Profil. Pemadaman bersifat kekal. Terma yang menurut sifatnya mesti terus berkuat kuasa selepas akaun dipadam (contohnya had tanggungjawab) kekal terpakai.</p>'],
        ['7. Tanpa jaminan', '<p>Kami berusaha menjaga Jurkon agar terus berjalan dengan baik, tetapi tidak menjamin perkhidmatan sentiasa tersedia, bebas gangguan, atau bebas ralat. Kandungan dibuat oleh pengguna; pendapat dalam siaran ialah milik penulisnya, bukan pendapat Jurkon, dan kami tidak menjamin kebenarannya.</p>'],
        ['8. Had tanggungjawab', '<p>Setakat yang dibenarkan undang-undang, Jurkon dan pengurusnya tidak bertanggungjawab atas kerugian tidak langsung, kehilangan data, atau kerugian akibat kandungan atau tindakan pengguna lain, mahupun akibat gangguan perkhidmatan di luar kawalan munasabah kami. Terma ini tidak menghapuskan hak yang tidak boleh diketepikan menurut undang-undang, termasuk hak pengguna dan hak ke atas data peribadi.</p>'],
        ['9. Perubahan terma', '<p>Kami boleh mengemas kini terma ini. Tarikh kemas kini terakhir dinyatakan di atas. Jika anda terus menggunakan Jurkon selepas perubahan berkuat kuasa, anda dianggap bersetuju dengannya. Untuk perubahan penting, kami akan memaklumkan melalui aplikasi.</p>'],
        ['10. Undang-undang yang terpakai', '<p>Terma ini tertakluk kepada undang-undang Republik Indonesia. Kami mengutamakan penyelesaian pertikaian secara muafakat terlebih dahulu; jika tidak tercapai, pertikaian diselesaikan melalui mahkamah yang berwibawa di Indonesia.</p>'],
        ['11. Hubungi kami', '<p>Pertanyaan tentang terma ini: <span class="kontak-mail"></span></p>']
      ],
      nav: ['Dasar Privasi', 'Terma Perkhidmatan', 'Peraturan', 'Pusat Bantuan', 'Tentang'], navAria: 'Halaman maklumat',
      catatan: 'Jika terjemahan ini berbeza daripada versi Bahasa Indonesia, versi Bahasa Indonesia yang terpakai.'
    },

    jv: {
      h1: 'Katentuan Layanan', tgl: 'Pungkasan dianyari: 31 Oktober 2026', k: 'Kabijakan privasi', a: 'Aturan panggunaan',
      intro: 'Kanthi nggawe akun utawa nganggo Jurnal Koneksi (“Jurkon”), sampeyan nyetujoni katentuan iki. Yen ora setuju, mangga aja nganggo layanan iki. Katentuan iki diwaca bareng {k} lan {a}.',
      s: [
        ['1. Bab layanan', '<p>Jurkon iku papan kanggo nulis cathetan cekak (maksimal 250 aksara), mbales, menehi seneng, ngetutake pangguna liyane, lan ngirim pesen langsung (maksimal 750 aksara). Layanan iki diwenehake apa anane lan bisa owah saka wektu menyang wektu.</p>'],
        ['2. Akun sampeyan', '<ul><li>Sampeyan kudu umure paling sethithik 17 taun lan masrahake email sing bener sarta bisa sampeyan akses.</li><li>Sampeyan tanggung jawab njaga rahasiane tembung sandi lan sakabehe sing kedadeyan liwat akun sampeyan.</li><li>Siji wong cukup siji akun. Dilarang nyamar dadi wong utawa lembaga liya, utawa nganggo username sing niru akun resmi Jurkon.</li><li>Akun resmi Jurkon dikenali saka lencana centhang emas, lan akun sing wis diverifikasi tim Jurkon dikenali saka centhang biru. Username tartamtu disimpen kanggo akun resmi lan ora bisa dienggo pangguna biasa.</li><li>Owah-owahan foto, jeneng, lan username diwatesi saben sasi, lan username mung bisa diganti sepisan saben dina.</li></ul>'],
        ['3. Konten duweke sampeyan', '<p>Tulisan lan foto sing sampeyan unggah tetep duweke sampeyan. Kanthi ngunggahe, sampeyan maringi Jurkon idin sing ora eksklusif, bebas royalti, lan winates kanggo nyimpen sarta nampilake marang pangguna liyane ing njero layanan, miturut pangaturan privasi sing lagi lumaku. Idin iki rampung nalika konten utawa akun sampeyan dibusak, kajaba salinan sing wis dituduhake utawa di-screenshot pangguna liya ing njaba kontrol kita.</p><p>Sampeyan nyatakake yen sampeyan nduweni hak ngunggah konten kasebut lan konten kuwi ora nerak hak wong liya utawa hukum sing lumaku.</p>'],
        ['4. Sing ora diidini', '<p>Sampeyan sarujuk ora bakal:</p><ul><li>nerak {a} (spam, penipuan, ujaran sengit, pelecehan, konten diwasa, ancaman, promosi judi, narkoba, utawa nuduhake data pribadi wong liya);</li><li>ngakses akun, data, utawa sistem duweke wong liya tanpa idin;</li><li>ngganggu, mbebani, utawa nyoba nembus keamanan layanan, kalebu nganggo bot, skrip, utawa cara otomatis kanggo nggawe akun, kiriman, seneng, utawa pesen kanthi akeh;</li><li>njupuk data pangguna kanthi akeh (scraping) utawa nganggo kanggo tujuan ing njaba Jurkon;</li><li>nganggo layanan kanggo tujuan sing nerak hukum Republik Indonesia.</li></ul>'],
        ['5. Moderasi lan tindakan kita', '<p>Kita mriksa tulisan sacara otomatis lan nelaah laporan. Kita nduweni hak, tanpa kewajiban ngandhani dhisik, kanggo nolak utawa mbusak konten, mbatesi fitur, nundha, utawa mbusak akun sing nerak katentuan utawa aturan, utawa sing mbebayani kanggo pangguna liyane lan layanan. Pamriksan otomatis bisa kleru; yen sampeyan rumangsa kaputusan kita salah, hubungi kita lan bakal kita tinjau maneh.</p>'],
        ['6. Mandhegake panggunaan', '<p>Sampeyan bisa mandheg kapan wae kanthi mbusak akun liwat Pangaturan ing kaca Profil. Pambusakan sipate permanen. Katentuan sing miturut sifate kudu tetep lumaku sawise akun dibusak (umpamane watesan tanggung jawab) tetep lumaku.</p>'],
        ['7. Tanpa jaminan', '<p>Kita nyoba njaga Jurkon tetep mlaku apik, nanging ora njamin layanan mesthi kasedhiya, bebas gangguan, utawa bebas kaluputan. Konten digawe dening pangguna; panemu ing kiriman iku duweke penulise, dudu panemune Jurkon, lan kita ora njamin kabenerane.</p>'],
        ['8. Watesan tanggung jawab', '<p>Sajrone diidini hukum, Jurkon lan pangurus ora tanggung jawab marang karugian ora langsung, ilange data, utawa karugian amarga konten utawa tumindak pangguna liyane, uga amarga gangguan layanan ing njaba kontrol sing wajar. Katentuan iki ora ngilangi hak sing ora bisa disingkirake miturut hukum, kalebu hak konsumen lan hak ing data pribadi.</p>'],
        ['9. Owah-owahan katentuan', '<p>Kita bisa nganyari katentuan iki. Tanggal pambaharuan pungkasan kacathet ing ndhuwur. Yen sampeyan terus nganggo Jurkon sawise owah-owahan lumaku, sampeyan dianggep nyetujoni. Kanggo owah-owahan penting, kita bakal menehi kabar liwat aplikasi.</p>'],
        ['10. Hukum sing lumaku', '<p>Katentuan iki tundhuk marang hukum Republik Indonesia. Kita ngutamakake ngrampungake sengketa kanthi musyawarah dhisik; yen ora kasil, sengketa dirampungake liwat pengadilan sing wenang ing Indonesia.</p>'],
        ['11. Kontak', '<p>Pitakon bab katentuan iki: <span class="kontak-mail"></span></p>']
      ],
      nav: ['Kabijakan privasi', 'Katentuan layanan', 'Aturan', 'Pusat bantuan', 'Bab Jurkon'], navAria: 'Kaca informasi',
      catatan: 'Yen terjemahan iki beda karo versi Basa Indonesia, sing lumaku yaiku versi Basa Indonesia.'
    },

    su: {
      h1: 'Katangtuan Layanan', tgl: 'Panungtungan dimutahirkeun: 31 Oktober 2026', k: 'Kawijakan privasi', a: 'Aturan pamakéan',
      intro: 'Ku nyieun akun atawa maké Jurnal Koneksi (“Jurkon”), anjeun satuju kana katangtuan ieu. Lamun teu satuju, mangga ulah maké layanan ieu. Katangtuan ieu dibaca babarengan jeung {k} sarta {a}.',
      s: [
        ['1. Ngeunaan layanan', '<p>Jurkon téh tempat pikeun nulis catetan pondok (maksimal 250 aksara), males, méré resep, nuturkeun pamaké séjén, sarta ngirim pesen langsung (maksimal 750 aksara). Layanan ieu disadiakeun sakumaha anjeunna aya jeung bisa robah ti mangsa ka mangsa.</p>'],
        ['2. Akun anjeun', '<ul><li>Anjeun kudu umurna sahenteuna 17 taun sarta méré surélék nu bener tur bisa anjeun aksés.</li><li>Anjeun tanggung jawab ngajaga karahasiaan kecap sandi jeung sagala nu kajadian ngaliwatan akun anjeun.</li><li>Hiji jalma cukup hiji akun. Dilarang nyamar jadi jalma atawa lembaga séjén, atawa maké username nu niru akun resmi Jurkon.</li><li>Akun resmi Jurkon dicirian ku lencana centang emas, jeung akun nu geus diverifikasi ku tim Jurkon dicirian ku centang biru. Username tangtu dicadangkeun pikeun akun resmi tur teu bisa dipaké ku pamaké biasa.</li><li>Parobahan poto, ngaran, jeung username dibatesan unggal bulan, jeung username ngan bisa diganti sakali sapoé.</li></ul>'],
        ['3. Eusi kagungan anjeun', '<p>Tulisan jeung poto nu anjeun unggah tetep kagungan anjeun. Ku ngaunggahna, anjeun méré Jurkon idin nu teu éksklusif, bébas royalti, jeung kawates pikeun nyimpen sarta mintonkeunana ka pamaké séjén di jero layanan, luyu jeung setélan privasi nu lumaku. Idin ieu réngsé lamun eusi atawa akun anjeun dihapus, iwal salinan nu geus dibagikeun atawa di-screenshot ku pamaké séjén di luar kadali urang.</p><p>Anjeun nyatakeun yén anjeun boga hak ngaunggah eusi éta jeung yén eusi éta teu ngalanggar hak batur atawa hukum nu lumaku.</p>'],
        ['4. Nu teu meunang dilakukeun', '<p>Anjeun satuju moal:</p><ul><li>ngalanggar {a} (spam, panipuan, ujaran kabencian, pelecehan, eusi déwasa, ancaman, promosi judi, narkoba, atawa ngabagikeun data pribadi batur);</li><li>ngaksés akun, data, atawa sistem kagungan batur tanpa idin;</li><li>ngaganggu, ngabebanan, atawa nyoba nembus kaamanan layanan, kaasup maké bot, skrip, atawa cara otomatis pikeun nyieun akun, kiriman, resep, atawa pesen sacara masal;</li><li>nyokot data pamaké sacara masal (scraping) atawa maké pikeun tujuan di luar Jurkon;</li><li>maké layanan pikeun tujuan nu ngalanggar hukum Républik Indonésia.</li></ul>'],
        ['5. Moderasi jeung tindakan urang', '<p>Urang mariksa tulisan sacara otomatis jeung nalungtik laporan. Urang boga hak, tanpa kawajiban méré nyaho heula, pikeun nolak atawa mupus eusi, ngawatesan fitur, ngagantung, atawa mupus akun nu ngalanggar katangtuan atawa aturan, atawa nu ngabahayakeun pamaké séjén jeung layanan. Pamariksaan otomatis bisa salah; lamun anjeun ngarasa kaputusan urang salah, hubungi urang jeung urang bakal marios deui.</p>'],
        ['6. Eureun maké', '<p>Anjeun bisa eureun iraha waé ku cara mupus akun ngaliwatan Setélan di kaca Profil. Pamupusan sifatna permanén. Katangtuan nu ku sifatna kudu tetep lumaku sanggeus akun dipupus (upamana watesan tanggung jawab) tetep lumaku.</p>'],
        ['7. Tanpa jaminan', '<p>Urang usaha ngajaga Jurkon tetep jalan alus, tapi teu ngajamin layanan sok sayaga, bébas gangguan, atawa bébas kasalahan. Eusi dijieun ku pamaké; pamadegan dina kiriman téh kagungan panulisna, lain pamadegan Jurkon, jeung urang teu ngajamin kabeneranana.</p>'],
        ['8. Watesan tanggung jawab', '<p>Sajauh diidinan ku hukum, Jurkon jeung pangurusna teu tanggung jawab kana karugian teu langsung, leungitna data, atawa karugian alatan eusi atawa tindakan pamaké séjén, kitu deui alatan gangguan layanan di luar kadali nu wajar. Katangtuan ieu teu ngaleungitkeun hak nu teu bisa dikaluarkeun numutkeun hukum, kaasup hak konsumén jeung hak kana data pribadi.</p>'],
        ['9. Parobahan katangtuan', '<p>Urang bisa ngamutahirkeun katangtuan ieu. Tanggal pamutahiran panungtungan dicutat di luhur. Lamun anjeun tetep maké Jurkon sanggeus parobahan lumaku, anjeun dianggap satuju. Pikeun parobahan penting, urang bakal méré béja ngaliwatan aplikasi.</p>'],
        ['10. Hukum nu lumaku', '<p>Katangtuan ieu tunduk kana hukum Républik Indonésia. Urang ngutamakeun ngarengsekeun sengketa sacara musyawarah heula; lamun teu hasil, sengketa diréngsékeun ngaliwatan pangadilan nu wenang di Indonésia.</p>'],
        ['11. Kontak', '<p>Pertanyaan ngeunaan katangtuan ieu: <span class="kontak-mail"></span></p>']
      ],
      nav: ['Kawijakan privasi', 'Katangtuan layanan', 'Aturan', 'Pusat bantuan', 'Ngeunaan'], navAria: 'Kaca émbaran',
      catatan: 'Lamun tarjamahan ieu béda jeung vérsi Basa Indonésia, nu lumaku nyaéta vérsi Basa Indonésia.'
    },

    zh: {
      h1: '服务条款', tgl: '最后更新：2026 年 10 月 31 日', k: '隐私政策', a: '使用规则',
      intro: '创建账号或使用 Jurnal Koneksi（“Jurkon”），即表示你同意本条款。如果不同意，请不要使用本服务。本条款需与{k}和{a}一并阅读。',
      s: [
        ['1. 关于本服务', '<p>Jurkon 是一个用来撰写简短笔记（最多 250 个字符）、回复、点赞、关注其他用户以及发送私信（最多 750 个字符）的空间。本服务按“现状”提供，可能会随时间变化。</p>'],
        ['2. 你的账号', '<ul><li>你必须年满 17 周岁，并提供正确且你能够访问的邮箱。</li><li>你有责任保管好密码，并对通过你的账号发生的一切行为负责。</li><li>每人一个账号即可。禁止冒充他人或机构，或使用模仿 Jurkon 官方账号的用户名。</li><li>Jurkon 官方账号带有金色对勾徽章，经 Jurkon 团队验证的账号带有蓝色对勾。部分用户名保留给官方账号，普通用户无法使用。</li><li>头像、名称和用户名的修改次数每月有限制，且用户名每天只能修改一次。</li></ul>'],
        ['3. 你的内容', '<p>你上传的文字和照片仍归你所有。上传即表示你授予 Jurkon 一项非独占、免版税且有限的许可，使其可根据当时适用的隐私设置，在服务内保存并向其他用户展示这些内容。当你的内容或账号被删除时，该许可即终止，但其他用户已分享或截图、且不受我们控制的副本除外。</p><p>你声明你有权上传这些内容，并且这些内容不侵犯他人权利，也不违反适用法律。</p>'],
        ['4. 禁止行为', '<p>你同意不会：</p><ul><li>违反{a}（垃圾信息、欺诈、仇恨言论、骚扰、成人内容、威胁、赌博推广、毒品，或分享他人的个人数据）；</li><li>未经许可访问他人的账号、数据或系统；</li><li>干扰、加重负担或试图破坏服务安全，包括使用机器人、脚本或自动化方式批量创建账号、发帖、点赞或发送消息；</li><li>批量抓取用户数据（scraping），或将其用于 Jurkon 以外的目的；</li><li>将本服务用于违反印度尼西亚共和国法律的目的。</li></ul>'],
        ['5. 审核与我们的措施', '<p>我们会自动检查内容并审查举报。我们有权在无需事先通知的情况下，拒绝或删除内容、限制功能、暂停或删除违反本条款或规则、或对其他用户和服务构成风险的账号。自动检查可能出错；如果你认为我们的决定有误，请联系我们，我们会重新审查。</p>'],
        ['6. 停止使用', '<p>你可以随时通过“个人资料”页面的“设置”删除账号来停止使用。删除是永久性的。按其性质在账号删除后仍应继续有效的条款（例如责任限制）将继续适用。</p>'],
        ['7. 不作保证', '<p>我们会努力让 Jurkon 保持良好运行，但不保证服务始终可用、不中断或无错误。内容由用户创建；帖子中的观点属于作者，而非 Jurkon 的观点，我们也不保证其真实性。</p>'],
        ['8. 责任限制', '<p>在法律允许的范围内，Jurkon 及其运营者不对间接损失、数据丢失，或因其他用户的内容或行为、以及我们合理控制范围之外的服务中断所造成的损失承担责任。本条款不排除依法不可放弃的权利，包括消费者权利和个人数据相关权利。</p>'],
        ['9. 条款变更', '<p>我们可能更新本条款，最近更新日期见上方。变更生效后你继续使用 Jurkon，即视为接受变更。对于重要变更，我们会通过应用通知你。</p>'],
        ['10. 适用法律', '<p>本条款受印度尼西亚共和国法律管辖。我们优先通过协商解决争议；协商不成的，由印度尼西亚有管辖权的法院裁决。</p>'],
        ['11. 联系方式', '<p>关于本条款的问题：<span class="kontak-mail"></span></p>']
      ],
      nav: ['隐私政策', '服务条款', '使用规则', '帮助中心', '关于'], navAria: '信息页面',
      catatan: '如本译文与印度尼西亚语版本有出入，以印度尼西亚语版本为准。'
    },

    ja: {
      h1: '利用規約', tgl: '最終更新日：2026年10月31日', k: 'プライバシーポリシー', a: '利用ルール',
      intro: 'アカウントを作成するか Jurnal Koneksi（「Jurkon」）を利用することで、本規約に同意したものとみなされます。同意いただけない場合は、本サービスを利用しないでください。本規約は{k}および{a}とあわせてお読みください。',
      s: [
        ['1. サービスについて', '<p>Jurkon は、短いメモ（最大250文字）を書いたり、返信、いいね、他のユーザーのフォロー、ダイレクトメッセージ（最大750文字）の送信ができる場です。本サービスは現状有姿で提供され、時間とともに変更されることがあります。</p>'],
        ['2. あなたのアカウント', '<ul><li>17歳以上であり、正しく、かつ自分がアクセスできるメールアドレスを登録する必要があります。</li><li>パスワードの機密保持と、あなたのアカウントを通じて行われるすべての行為について、あなたが責任を負います。</li><li>アカウントは1人につき1つで十分です。他の人物や団体へのなりすまし、Jurkon の公式アカウントに似せたユーザー名の使用は禁止です。</li><li>Jurkon の公式アカウントには金色のチェックバッジ、Jurkon チームが確認したアカウントには青色のチェックが付きます。一部のユーザー名は公式アカウント用に予約されており、一般ユーザーは使用できません。</li><li>写真、名前、ユーザー名の変更は月ごとに回数が制限され、ユーザー名は1日に1回しか変更できません。</li></ul>'],
        ['3. あなたのコンテンツ', '<p>アップロードした文章や写真はあなたのものです。アップロードすることで、適用されるプライバシー設定に従い、サービス内で保存し他のユーザーに表示するための、非独占的・無償・限定的な許諾を Jurkon に付与したものとします。この許諾は、コンテンツまたはアカウントが削除された時点で終了します。ただし、他のユーザーがすでに共有またはスクリーンショットを撮った、当社の管理が及ばないコピーは除きます。</p><p>あなたは、そのコンテンツをアップロードする権利があり、他者の権利や適用法令を侵害しないことを表明します。</p>'],
        ['4. 禁止事項', '<p>次のことをしないことに同意します。</p><ul><li>{a}に違反すること（スパム、詐欺、ヘイトスピーチ、嫌がらせ、成人向けコンテンツ、脅迫、賭博の宣伝、薬物、他人の個人データの共有）</li><li>許可なく他人のアカウント、データ、システムにアクセスすること</li><li>サービスを妨害・過負荷にする、またはセキュリティを破ろうとすること（ボット、スクリプト、自動化手段によるアカウント・投稿・いいね・メッセージの大量作成を含む）</li><li>ユーザーデータを大量に収集（スクレイピング）すること、または Jurkon 以外の目的で使用すること</li><li>インドネシア共和国の法律に違反する目的でサービスを利用すること</li></ul>'],
        ['5. モデレーションと当社の対応', '<p>当社は文章を自動的にチェックし、通報を確認します。当社は、事前に通知する義務なく、本規約やルールに違反するアカウント、または他のユーザーやサービスにリスクをもたらすアカウントについて、コンテンツの拒否・削除、機能の制限、停止、削除を行う権利を有します。自動チェックは誤ることがあります。当社の判断が誤りだと思われる場合は、ご連絡ください。再確認いたします。</p>'],
        ['6. 利用の終了', '<p>プロフィールページの設定からアカウントを削除すれば、いつでも利用をやめられます。削除は元に戻せません。性質上、アカウント削除後も有効であるべき条項（責任の制限など）は引き続き適用されます。</p>'],
        ['7. 保証の否認', '<p>当社は Jurkon を良好に運営するよう努めますが、サービスが常に利用可能であること、中断がないこと、エラーがないことを保証しません。コンテンツはユーザーが作成したものです。投稿内の意見は投稿者のものであり Jurkon の意見ではなく、その正確性も保証しません。</p>'],
        ['8. 責任の制限', '<p>法律で認められる範囲で、Jurkon およびその運営者は、間接的な損害、データの損失、他のユーザーのコンテンツや行為による損害、当社の合理的な管理を超えるサービス障害による損害について責任を負いません。本規約は、消費者の権利や個人データに関する権利など、法律上放棄できない権利を排除するものではありません。</p>'],
        ['9. 規約の変更', '<p>当社は本規約を更新することがあります。最終更新日は上記のとおりです。変更の発効後も Jurkon を利用し続けた場合、変更に同意したものとみなします。重要な変更はアプリ内でお知らせします。</p>'],
        ['10. 準拠法', '<p>本規約はインドネシア共和国の法律に準拠します。紛争はまず話し合いによる解決を優先し、それができない場合はインドネシアの管轄裁判所で解決します。</p>'],
        ['11. お問い合わせ', '<p>本規約に関するご質問：<span class="kontak-mail"></span></p>']
      ],
      nav: ['プライバシーポリシー', '利用規約', 'ルール', 'ヘルプセンター', 'Jurkon について'], navAria: '情報ページ',
      catatan: 'この翻訳とインドネシア語版に相違がある場合は、インドネシア語版が優先されます。'
    }
  };

  var d = D[kode];
  if (!d) return;
  var kotak = document.querySelector('.dokumen');
  if (!kotak) return;

  function tautan(h, x) { return '<a href="' + h + '">' + x + '</a>'; }
  function isi(s) { return s.replace(/\{k\}/g, tautan('kebijakan-privasi.html', d.k)).replace(/\{a\}/g, tautan('aturan.html', d.a)); }

  var html = '<p class="tgl">' + d.tgl + '</p><p>' + isi(d.intro) + '</p>';
  d.s.forEach(function (x) { html += '<h3>' + x[0] + '</h3>' + isi(x[1]); });
  html += '<p class="dok-catatan">' + d.catatan + '</p>';
  html += '<nav class="dok-nav" aria-label="' + d.navAria + '">' +
    tautan('kebijakan-privasi.html', d.nav[0]) + ' · ' + tautan('ketentuan-layanan.html', d.nav[1]) + ' · ' + tautan('aturan.html', d.nav[2]) + ' · ' +
    tautan('pusat-bantuan.html', d.nav[3]) + ' · ' + tautan('tentang.html', d.nav[4]) + '</nav>';

  // Pemilih bahasa tetap di bawah, di luar kotak yang diganti
  var h1 = document.querySelector('.header h1');
  if (h1) h1.textContent = d.h1;
  document.title = d.h1 + ' · Jurkon';
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', d.h1 + ' · Jurnal Koneksi');
  kotak.innerHTML = html;
})();

// Terjemahan Inggris untuk halaman informasi. Sumber utama: HTML Indonesia di tiap halaman. Ditampilkan oleh js/info-bahasa.js.
window.INFO_T = {
  navAria: 'Information pages',
  nav: ['Privacy Policy', 'Terms of Service', 'Rules', 'Help Center', 'About'],
  catatan: 'If this translation differs from the Indonesian version, the Indonesian version prevails.',

  tentang: {
    h1: 'About Jurkon',
    desc: 'A social app made in Indonesia. Notes are just 250 characters, the feed has an end, and you can leave a note for yourself a year from now.',
    html: `
<p><b>Jurnal Koneksi</b> (Jurkon) is a minimalist social network where you write short notes and connect with other people without the excess noise.</p>

<h3>What we stand for</h3>
<ul>
<li><b>Short and clear.</b> Notes are up to 250 characters, messages up to 750 characters.</li>
<li><b>Comfortable and safe.</b> There is writing review, spam limits, reporting, and blocking.</li>
<li><b>No ads.</b> We do not sell your data and do not use ad trackers.</li>
<li><b>You are in control.</b> Download your data or delete your account at any time.</li>
</ul>

<h3>How it works</h3>
<p>Jurkon is built with plain HTML, CSS, and JavaScript, with Supabase for the database and authentication, and is hosted on GitHub Pages. You can add it to your phone’s home screen like an app.</p>

<h3>Important pages</h3>
<ul>
<li><a href="kebijakan-privasi.html">Privacy Policy</a></li>
<li><a href="ketentuan-layanan.html">Terms of Service</a></li>
<li><a href="aturan.html">Rules of Use</a></li>
<li><a href="pusat-bantuan.html">Help Center</a></li>
</ul>

<h3>Contact us</h3>
<p>Suggestions, problems, or reports: <span class="kontak-mail"></span></p>`
  },

  aturan: {
    h1: 'Rules',
    desc: 'Rules of use, a privacy summary, and how to manage your data on Jurnal Koneksi.',
    hukum: true,
    html: `
<h3>Rules of use</h3>
<p>Not allowed: spam, fraud, hate speech, harassment, adult content, threats, and sharing other people’s personal data. Posts and accounts that violate these rules may be removed. You can report posts and block other users at any time.</p>
<p>Jurkon checks writing before it is sent to keep things comfortable and in line with the laws that apply in Indonesia:</p>
<ul>
<li><b>Cannot be sent:</b> gambling promotion (online gambling, togel, slots), adult content and sexually vulgar words, drug sales, fraudulent offers or sales of personal data, threats against others, hate speech against ethnic, religious, racial, or social groups, and national ID (KTP/NIK) numbers.</li>
<li><b>Shown a warning:</b> rude words and phone numbers. You can soften your writing or send it anyway, but a reported post can still be reviewed and removed.</li>
</ul>
<p>Automatic checks can be wrong. If your reasonable writing is rejected, change the wording a little or contact us using the details below.</p>
<p>To prevent spam, the number of posts, messages, and reports per day is limited.</p>
<h3>Privacy Policy (summary)</h3>
<p>We store your email, profile, posts, likes, follow list, and messages to run the service. Your data is not sold. Your email is not shown to other users. Profiles and posts can only be seen by members who are signed in. Direct messages can only be read by the two people in the conversation. The full explanation is in the <a href="kebijakan-privasi.html" style="text-decoration:underline">Privacy Policy</a>.</p>
<h3>Your data and account</h3>
<p>On the Profile page you can download your data and delete your account. Deleting your account permanently removes your profile, posts, likes, and the messages you sent.</p>
<p style="margin-top:16px">More: <a href="kebijakan-privasi.html" style="text-decoration:underline">Privacy Policy</a> · <a href="ketentuan-layanan.html" style="text-decoration:underline">Terms of Service</a> · <a href="pusat-bantuan.html" style="text-decoration:underline">Help Center</a> · <a href="tentang.html" style="text-decoration:underline">About</a></p>
<p style="margin-top:16px">Contact: <span class="kontak-mail"></span></p>`
  },

  bantuan: {
    h1: 'Help Center',
    desc: 'Answers to the most common questions about Jurnal Koneksi: account, writing, safety, and privacy.',
    html: `
<p>Answers to the questions that come up most often. If you can’t find yours, write to us at the very bottom.</p>
<h3>Account</h3>
<details class="faq"><summary>How do I sign up and sign in?</summary><div><p>Open the Sign in page, then sign up with your email and a password, or choose to sign in with Google. Pick a username of 3–20 characters (lowercase letters, numbers, or underscores).</p></div></details>
<details class="faq"><summary>I forgot my password.</summary><div><p>On the Sign in page, choose <b>Forgot password</b>, enter your email, then follow the link sent to that email. Check your spam folder if it hasn’t arrived within a few minutes.</p></div></details>
<details class="faq"><summary>How do I change my email?</summary><div><p>Open Profile, tap the gear icon (Settings), fill in <b>New email</b>, then tap <b>Change email</b>. A confirmation link is sent to the new email (and may also go to the old one). The new email only takes effect after you click the link.</p></div></details>
<details class="faq"><summary>Why can’t I change my name, username, or photo?</summary><div><p>Changes are limited per month so accounts can’t be used to impersonate or deceive. The limit resets on the 1st of each month, and your remaining allowance is shown on the Edit profile screen. A username can also only be changed once a day.</p></div></details>
<details class="faq"><summary>What do the blue and gold checkmarks mean?</summary><div><p>A blue checkmark means the account has been reviewed and verified by the Jurkon team. A gold checkmark means an official account run directly by the Jurkon team. Press and hold the checkmark to see its description.</p></div></details>
<h3>Writing and interacting</h3>
<details class="faq"><summary>Why was my writing rejected or shown a warning?</summary><div><p>Jurkon checks writing before it is sent. Content such as gambling promotion, adult content, fraud, threats, hate speech, and national ID (KTP/NIK) numbers cannot be sent, while rude words and phone numbers only get a warning. Automatic checks can be wrong, so try changing your wording a little. Details are on the <a href="aturan.html">Rules</a> page.</p></div></details>
<details class="faq"><summary>Why do I see “Too fast” or “Daily limit reached”?</summary><div><p>There are limits on the number of posts, replies, messages, and likes to prevent spam. Newer accounts (roughly the first 3 days) have stricter limits. Wait a moment or try again tomorrow.</p></div></details>
<details class="faq"><summary>How do I delete my post?</summary><div><p>Tap the trash icon on your own post, then confirm. A deleted post cannot be restored.</p></div></details>
<details class="faq"><summary>What is the “views” count?</summary><div><p>The number of different people who have seen a post. Each person is counted once, and your own posts are not counted.</p></div></details>
<details class="faq"><summary>What is the difference between the Public and Following feeds?</summary><div><p><b>Public</b> shows notes from all members. <b>Following</b> shows only your notes and those of the accounts you follow.</p></div></details>
<h3>Safety and privacy</h3>
<details class="faq"><summary>How do I report a problem post?</summary><div><p>Tap the Report icon on the post, write your reason (up to 300 characters), then send. Reports are only seen by the administrators for review.</p></div></details>
<details class="faq"><summary>How do I block someone?</summary><div><p>Open the person’s profile, tap the ⋯ menu, then choose block. Their posts will be hidden from you. To unblock, choose <b>Unblock</b> in the same menu.</p></div></details>
<details class="faq"><summary>Who can read my messages?</summary><div><p>Only you and the person you are talking to. Your email is not shown to other users. More in the <a href="kebijakan-privasi.html">Privacy Policy</a>.</p></div></details>
<details class="faq"><summary>How do I download my data?</summary><div><p>Open Profile, tap the gear icon (Settings), then choose <b>Download my data</b>. You will get a single file containing your profile, posts, likes, and messages.</p></div></details>
<details class="faq"><summary>How do I delete my account?</summary><div><p>Open Settings then choose <b>Delete account</b>. You need to type HAPUS to confirm. Deletion is permanent: your profile, posts, likes, and the messages you sent are removed and cannot be recovered. It’s best to download your data first.</p></div></details>
<h3>Appearance</h3>
<details class="faq"><summary>How do I change the theme?</summary><div><p>In Settings there are three theme options: Paper, Light, and Dark.</p></div></details>
<details class="faq"><summary>Can Jurkon be installed like an app?</summary><div><p>Yes. In your phone’s browser, open the menu and choose <b>Add to Home Screen</b> or <b>Install app</b>.</p></div></details>
<h3>Still need help?</h3>
<p>Write to <span class="kontak-mail"></span>. Include your username and describe the problem (a screenshot helps). Never send your password.</p>`
  },

  privasi: {
    h1: 'Privacy Policy',
    desc: 'What data Jurnal Koneksi collects, how it is used, who can see it, and your rights over your data.',
    hukum: true,
    html: `
<p class="tgl">Last updated: 1 November 2026</p>

<p>This policy explains what data Jurnal Koneksi (“Jurkon”, “we”) collects, what it is used for, who can see it, and what you can do with your data. We have written it as briefly and clearly as we can.</p>

<h3>1. In short</h3>
<ul>
<li>We only keep the data needed to run the service.</li>
<li>Your data is <b>not sold</b>, and Jurkon <b>shows no ads</b> and uses no ad trackers or third-party analytics tools.</li>
<li>Your email and direct messages are not shown to other users.</li>
<li>You can download all your data and delete your account at any time from Settings on the Profile page.</li>
</ul>

<h3>2. Data we collect</h3>
<p><b>Account data.</b> Email address and password (stored in encrypted form by the authentication service; we cannot read your password). If you sign in with Google, we receive your email and account identity from Google to create your account.</p>
<p><b>Profile data.</b> The username, display name, bio, and profile photo you fill in yourself.</p>
<p><b>Content and activity.</b> Posts and replies, likes (and when they were made), the list of accounts you follow, accounts you block, direct messages, reports you send, and your notifications.</p>
<p><b>View counts.</b> So that every post can show a “views” count, we record which posts have been shown to you (once per person per post). This record is private and cannot be read by other users; only the total number is shown.</p>
<p><b>Technical data.</b> Like most web services, our hosting and infrastructure providers may log IP addresses, browser type, and access times for security and to keep the service running. We do not use this data to build ad profiles.</p>

<h3>3. What the data is used for</h3>
<ul>
<li>Creating and securing your account, and letting you sign in and recover your password.</li>
<li>Showing profiles, posts, likes, messages, and notifications.</li>
<li>Preventing spam and abuse: limits on posts, messages, likes, and reports; automatic checking of writing before it is sent; and review of reports.</li>
<li>Responding to questions, reports, or requests you send us.</li>
<li>Meeting legal obligations where required by the regulations that apply in Indonesia.</li>
</ul>

<h3>4. Who can see what</h3>
<ul>
<li><b>Profiles and posts:</b> only Jurkon members who are signed in. People who are not signed in cannot read them, except for notes you yourself make public (see the next point).</li>
<li><b>Public notes (optional, per note):</b> by default all your notes are private. If you make a note public, that note, your name, and your @username can be read by anyone through its link and can be indexed by search engines such as Google. Separately, you can tick a box so the note also appears on the public Explore page (jelajahi.html); without that tick, the note can only be read through its link. Notes that were already public before this feature existed do not appear in the list unless you tick the box yourself. You can make a note private again at any time; the link stops working immediately, but copies outside Jurkon (screenshots, search engine caches) cannot be taken back by us. Public notes must not contain links, emails, phone numbers, or @mentions, and administrators may revoke the public status of notes that break the rules.</li>
<li><b>Profile photo:</b> stored in storage that can be opened through a direct link. Anyone with the link can open the image without signing in. Do not upload photos you do not want to share openly.</li>
<li><b>Follower and following lists:</b> can be seen by signed-in members, including who follows whom.</li>
<li><b>Direct messages:</b> can only be read by the two people in the conversation.</li>
<li><b>Email:</b> not shown to other users.</li>
<li><b>Reports:</b> can only be seen by administrators for review.</li>
</ul>
<p>Please remember: anything you write in a post can be copied or screenshotted by other members, outside our control.</p>

<h3>5. Third parties that help us</h3>
<p>We use the following services to run Jurkon. They process data according to their function and are subject to their own policies:</p>
<ul>
<li><b>Supabase</b>: database, authentication, and file storage (profile photos).</li>
<li><b>GitHub Pages</b>: hosting of the site’s pages.</li>
<li><b>jsDelivr</b>: delivery of JavaScript libraries (CDN).</li>
<li><b>Google Fonts</b>: loading of fonts. When loading them, your browser contacts Google’s servers and your IP address is visible to Google.</li>
<li><b>Google</b>: only if you choose to sign in with Google.</li>
<li><b>Cloudflare Turnstile</b>: an anti-bot security check on the sign in and sign up pages. While the check runs, your browser contacts Cloudflare’s servers.</li>
</ul>
<p>Some of these services may store data on servers outside Indonesia. By using Jurkon, you understand that your data may be processed abroad by these providers.</p>

<h3>6. Data stored on your device</h3>
<p>Jurkon does not use advertising cookies or trackers. To work, the app stores in your browser: your sign-in session, your display theme choice, your language choice, your feed choice (Public or Following), a temporary count of failed sign-in attempts (to slow down repeated password guessing), a temporary cache so pages load quickly and can open with a weak signal, and temporary markers for view counts and notifications. This data can be cleared through your browser settings or when you sign out.</p>
<p>To understand where new visitors drop off, Jurkon counts common steps (opening the landing page, pressing the start button, opening Explore, opening the sign in page) as daily totals per language in our own database. These counts contain no IP address, device ID, cookie, or data that could point to a single person, use no third-party analytics service, and are not recorded if the browser sends a Do Not Track or Global Privacy Control signal.</p>

<h3>7. How long data is kept and how to delete it</h3>
<p>Data is kept while your account is active. You can delete a single post at any time. If you use <b>Delete account</b> in Settings, your profile, posts, likes, and the messages you sent are permanently deleted and cannot be recovered. Backup copies managed by the infrastructure provider may remain for a limited period before being deleted automatically. Reports needed to maintain security and legal compliance may be kept for as long as needed for those purposes.</p>

<h3>8. Your rights over your data</h3>
<p>Under the Personal Data Protection Law (Law No. 27 of 2022), you have the right to:</p>
<ul>
<li>know and access your personal data (use <b>Download my data</b> in Settings);</li>
<li>correct inaccurate data (change it through <b>Edit profile</b>);</li>
<li>delete your data (use <b>Delete account</b>);</li>
<li>withdraw consent and limit or object to certain processing;</li>
<li>lodge a complaint with us, or with the competent authority where needed.</li>
</ul>
<p>For anything you cannot do yourself in the app, contact us using the details below. We try to respond within a reasonable time, generally no more than 14 days.</p>

<h3>9. Security</h3>
<p>We use database-level access restrictions, encrypted connections (HTTPS), and rate limiting to protect your data. Even so, no system is completely immune. Use a strong, unique password, do not share it with anyone, and contact us right away if you suspect your account is being misused. If a data breach occurs that puts you at risk, we will notify you as required by applicable law.</p>

<h3>10. Age of users</h3>
<p>Jurkon is intended for users aged 17 or older. We do not knowingly collect data from children under that age. If you are a parent or guardian and know that your child has signed up, contact us so the account can be deleted.</p>

<h3>11. Changes to this policy</h3>
<p>This policy may be updated. The date of the latest update is shown at the top of the page. For important changes, we will notify you through the app.</p>

<h3>12. Contact</h3>
<p>Questions about privacy or requests about your data: <span class="kontak-mail"></span></p>`
  }
};

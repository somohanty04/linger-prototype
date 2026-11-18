// Linger toolbar menu: settings, Explain this page, eye tracking, phone pairing and saved words.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tidy = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pretty = (c) => tidy(c).replace(/(.{4})(?=.)/g, '$1-');

// The menu in the reader's language ("My language"): each language is translated once (Chrome's translator, or Claude
// through the background worker) and kept in chrome.storage, shared with the page script.
const UI = {};
const L = (t) => UI[t] || t;
const EXTRA = ['Not available here', 'Reload this page to start Linger here.', 'Reload this page to use the new version of Linger.', 'The code has 12 letters and numbers.', 'Checking…',
  'Couldn’t reach Linger. Check your internet connection.', 'Show the original page', 'Translate this page', 'Starting…', 'Couldn’t translate this page. Reload it and try again.',
  'Click on an underlined word, then the bookmark icon.', 'My language (pick one below)', 'Eye tracking finds hard words through the underlines. Turn on Underline hard words.', 'Ask Linger needs AI explanations turned on.', 'Linger is off for this site, so the ✦ button is hidden.', 'Linger is off on every website. Turn on the Linger switch to use it.', 'The ✦ button should be at the bottom right of this page. If it isn’t, reload the page.'];
async function localize(lang) {
  if (!lang || lang === 'en') return;
  const skip = (el) => el.closest('[translate="no"], #transLang, script, style, textarea, input'); // language names stay as written
  const nodes = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\p{L}/u.test(n.nodeValue) && !skip(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  let n; while ((n = w.nextNode())) nodes.push(n);
  const attrs = [...document.querySelectorAll('[placeholder], [aria-label], [title]')].filter((el) => !skip(el));
  const strings = [...new Set([...nodes.map((x) => x.nodeValue.trim()), ...attrs.flatMap((el) => ['placeholder', 'aria-label', 'title'].map((a) => el.getAttribute(a)).filter(Boolean)), ...EXTRA])];
  const key = 'uiTr.' + lang;
  Object.assign(UI, (await chrome.storage.local.get({ [key]: {} }))[key]);
  const missing = strings.filter((t) => !UI[t]);
  if (missing.length) {
    let t = null;
    try { if (typeof Translator !== 'undefined' && (await Translator.availability({ sourceLanguage: 'en', targetLanguage: lang })) === 'available') t = await Translator.create({ sourceLanguage: 'en', targetLanguage: lang }); } catch {}
    if (t) { for (const m of missing) { try { UI[m] = await t.translate(m); } catch {} } }
    else {
      const name = (self.lingerLang(lang) || { name: lang }).name;
      for (let i = 0; i < missing.length; i += 40) {
        const chunk = missing.slice(i, i + 40);
        const r = await chrome.runtime.sendMessage({ type: 'ai', mode: 'translate-many', lang, langName: name, from: 'en', texts: chunk }).catch(() => null);
        if (r && Array.isArray(r.translations) && r.translations.length === chunk.length) chunk.forEach((m, j) => { if (r.translations[j]) UI[m] = r.translations[j]; });
      }
    }
    await chrome.storage.local.set({ [key]: UI });
  }
  nodes.forEach((x) => { const v = x.nodeValue, c = UI[v.trim()]; if (c) x.nodeValue = v.replace(v.trim(), c); });
  attrs.forEach((el) => ['placeholder', 'aria-label', 'title'].forEach((a) => { const v = el.getAttribute(a); if (v && UI[v]) el.setAttribute(a, UI[v]); }));
  document.documentElement.lang = lang;
  document.documentElement.dir = self.lingerRTL(lang) ? 'rtl' : 'ltr';
}

// The bar's filled part shows the pause time.
function fill(id = 'secs') { const r = $(id); r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); }

(async () => {
  // Words already translated for this language, so messages set below are in it right away.
  const { transLang: mine } = await chrome.storage.local.get({ transLang: '' });
  if (mine && mine !== 'en') Object.assign(UI, (await chrome.storage.local.get({ ['uiTr.' + mine]: {} }))['uiTr.' + mine]);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url ? new URL(tab.url) : null;
  const usable = !!url && /^(https?|file):$/.test(url.protocol) && !/chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(url.href);
  const host = url ? url.hostname || 'file' : '';
  $('siteLabel').textContent = usable ? host : L('Not available here');
  const status = usable ? await chrome.tabs.sendMessage(tab.id, { type: 'status' }).catch(() => null) : null;
  if (!usable || !status) { $('blocked').hidden = false; ['site', 'explain'].forEach((id) => { $(id).disabled = true; }); }
  if (usable && !status) $('blocked').textContent = L('Reload this page to start Linger here.');
  // This tab still runs an older copy of Linger (Chrome keeps it after an update until the page reloads).
  if (status && status.version && status.version !== chrome.runtime.getManifest().version) { $('blocked').hidden = false; $('blocked').textContent = L('Reload this page to use the new version of Linger.'); }
  // Why the ✦ Ask Linger button isn't on the page.
  const askWhy = () => {
    const why = status && status.ask, el = $('askWhy');
    const text = why === 'ai-off' ? 'Ask Linger needs AI explanations turned on.' : why === 'all-off' ? 'Linger is off on every website. Turn on the Linger switch to use it.' : why === 'site-off' ? 'Linger is off for this site, so the ✦ button is hidden.' : why === 'missing' ? 'The ✦ button should be at the bottom right of this page. If it isn’t, reload the page.' : '';
    el.hidden = !text; el.textContent = L(text);
  };

  const st = await chrome.storage.local.get({ highlight: false, paused: [], bigger: false, aiOn: false, aiConsent: '', assistant: true, pauseSecs: 3, showGaze: true, spread: false, handSwipe: true, pairCode: '', saved: [], gazeProblem: null, eyeOn: false, gazeModel: null, handOn: false, handSecs: 2 });
  if (st.gazeProblem && Date.now() - st.gazeProblem.t < 30 * 60 * 1000) { $('eyeProblem').hidden = false; $('eyeProblem').textContent = 'Last problem: ' + st.gazeProblem.why + '. Open Recalibrate to check the camera.'; }
  $('highlight').checked = st.highlight;
  $('site').checked = !st.paused.includes(host);
  // The main switch: Linger off on every website (the "On this site" switch is for this one site only).
  const { off } = await chrome.storage.local.get({ off: false });
  $('power').checked = !off; document.body.classList.toggle('all-off', off);
  $('power').onchange = (e) => { chrome.storage.local.set({ off: !e.target.checked }); document.body.classList.toggle('all-off', !e.target.checked); $('askWhy').hidden = true; };
  $('bigger').checked = st.bigger;
  // AI explanations: on only with explicit consent (aiConsent: 'yes'), kept apart from the switch itself. An older
  // aiOn: true without consent shows as off, and turning it on asks first.
  const aiOK = () => st.aiConsent === 'yes' && st.aiOn === true;
  $('aiOn').checked = aiOK();
  const aiAsk = (show) => { $('aiAsk').hidden = !show; if (show) $('aiNo').focus(); }; // focus the safe choice; the group's text is read first
  $('aiOn').onchange = (e) => {
    if (!e.target.checked) { st.aiOn = false; aiAsk(false); chrome.storage.local.set({ aiOn: false }); return; }
    if (st.aiConsent === 'yes') { st.aiOn = true; chrome.storage.local.set({ aiOn: true }); return; }
    e.target.checked = false; aiAsk(true); // not on until they choose Allow
  };
  const choose = (yes) => {
    Object.assign(st, { aiOn: yes, aiConsent: yes ? 'yes' : 'no' });
    chrome.storage.local.set({ aiOn: yes, aiConsent: st.aiConsent, aiConsentAt: Date.now() });
    $('aiOn').checked = yes; aiAsk(false); $('aiOn').focus();
  };
  $('aiYes').onclick = () => choose(true);
  $('aiNo').onclick = () => choose(false);
  $('assistant').checked = st.assistant;
  $('assistant').onchange = (e) => chrome.storage.local.set({ assistant: e.target.checked });
  $('showGaze').checked = st.showGaze;
  $('spread').checked = st.spread;
  $('handSwipe').checked = st.handSwipe;
  $('secs').value = st.pauseSecs; $('secsOut').textContent = st.pauseSecs; fill();
  $('eye').checked = st.eyeOn;
  $('recal').hidden = !st.gazeModel;
  const acc = st.gazeModel && st.gazeModel.acc;
  if (acc) $('recal').title = `Set up ${new Date(st.gazeModel.at).toLocaleDateString()}: lands about ${acc.err}px from where you look`;

  // Eye tracking looks for underlined words, so it needs "Underline hard words" (which now starts off).
  const eyeHint = () => {
    const need = $('eye').checked && !$('highlight').checked;
    if (need) { $('eyeProblem').hidden = false; $('eyeProblem').textContent = L('Eye tracking finds hard words through the underlines. Turn on Underline hard words.'); }
    else if ($('eyeProblem').dataset.hint) $('eyeProblem').hidden = true;
    $('eyeProblem').dataset.hint = need ? '1' : '';
  };
  eyeHint();
  $('highlight').onchange = (e) => { chrome.storage.local.set({ highlight: e.target.checked }); eyeHint(); };
  $('bigger').onchange = (e) => chrome.storage.local.set({ bigger: e.target.checked });
  $('showGaze').onchange = (e) => chrome.storage.local.set({ showGaze: e.target.checked });
  $('spread').onchange = (e) => chrome.storage.local.set({ spread: e.target.checked });
  $('handSwipe').onchange = (e) => chrome.storage.local.set({ handSwipe: e.target.checked });
  $('site').onchange = async (e) => {
    const { paused } = await chrome.storage.local.get({ paused: [] });
    chrome.storage.local.set({ paused: e.target.checked ? paused.filter((h) => h !== host) : [...new Set([...paused, host])] });
  };
  $('explain').onclick = async () => { await chrome.tabs.sendMessage(tab.id, { type: 'explain' }).catch(() => {}); window.close(); };

  // Eye tracking runs once for the whole browser; the first time, it opens the setup page.
  $('eye').onchange = async (e) => {
    const r = await chrome.runtime.sendMessage({ type: e.target.checked ? 'eye-on' : 'eye-off', tabId: tab && tab.id });
    if (r && r.setup) e.target.checked = false;
    window.close();
  };
  $('practice').onclick = async () => { await chrome.runtime.sendMessage({ type: 'open-practice' }); window.close(); };
  $('recal').onclick = async () => { await chrome.runtime.sendMessage({ type: 'eye-recal', tabId: tab && tab.id }); window.close(); };
  $('secs').oninput = (e) => { $('secsOut').textContent = e.target.value; fill(); };
  $('secs').onchange = (e) => chrome.storage.local.set({ pauseSecs: Number(e.target.value) });

  // Hand gestures: a feature of its own (no eye-tracking setup needed). The camera has to be allowed once, on the
  // practice page (Chrome only asks on a page you can see), so the first time the switch opens that page.
  $('hand').checked = st.handOn;
  $('handSecs').value = st.handSecs; $('handSecsOut').textContent = st.handSecs; fill('handSecs');
  const camOK = async () => { try { return (await navigator.permissions.query({ name: 'camera' })).state === 'granted'; } catch { return false; } };
  $('hand').onchange = async (e) => {
    if (!e.target.checked) { chrome.storage.local.set({ handOn: false }); return; }
    if (await camOK()) { chrome.storage.local.set({ handOn: true }); return; }
    e.target.checked = false;
    await chrome.runtime.sendMessage({ type: 'hand-setup' }); window.close();
  };
  $('handPractice').onclick = async () => { await chrome.runtime.sendMessage({ type: 'hand-setup' }); window.close(); };
  $('handSecs').oninput = (e) => { $('handSecsOut').textContent = e.target.value; fill('handSecs'); };
  $('handSecs').onchange = (e) => chrome.storage.local.set({ handSecs: Number(e.target.value) });

  // Phone pairing: the same 12-character code the phone app shows under Words → live sync.
  const showPair = (code) => { $('paired').hidden = !code; $('pairForm').hidden = !!code; $('pairHint').hidden = !!code; $('codeShow').textContent = pretty(code); };
  showPair(st.pairCode);
  $('pairForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = tidy($('code').value);
    if (code.length < 10) { $('pairMsg').textContent = L('The code has 12 letters and numbers.'); return; }
    $('pairMsg').textContent = L('Checking…');
    const r = await chrome.runtime.sendMessage({ type: 'check-code', code });
    if (!r || r.result === 'error') { $('pairMsg').textContent = L('Couldn’t reach Linger. Check your internet connection.'); return; }
    await chrome.storage.local.set({ pairCode: code });
    $('pairMsg').textContent = '';
    showPair(code);
  };
  $('unpair').onclick = async () => { await chrome.storage.local.set({ pairCode: '' }); showPair(''); };

  // Linger account: the same email and password as the phone app (background.js does the signing in).
  const acctMsg = (t) => { $('acctMsg').textContent = t ? L(t) : ''; };
  const showAcct = (email) => { $('acctOn').hidden = !email; $('acctForm').hidden = !!email; $('acctHint').hidden = !!email; $('acctShow').textContent = email || ''; };
  showAcct((await chrome.runtime.sendMessage({ type: 'acct-state' }) || {}).email);
  const acctGo = async (type) => {
    const email = $('acctEmail').value.trim(), password = $('acctPw').value;
    if (!email || !password) { acctMsg('Type your email and password.'); return; }
    $('acctIn').disabled = $('acctUp').disabled = true;
    acctMsg(type === 'acct-signup' ? 'Creating your account…' : 'Signing in…');
    const r = await chrome.runtime.sendMessage({ type, email, password }) || {};
    $('acctIn').disabled = $('acctUp').disabled = false;
    if (!r.ok) { acctMsg(r.error || 'Something went wrong. Try again.'); return; }
    $('acctPw').value = '';
    showAcct(r.email);
    acctMsg(r.uploaded ? `Done. ${r.uploaded} saved ${r.uploaded === 1 ? 'word is' : 'words are'} now in your account.` : '');
  };
  $('acctForm').onsubmit = (e) => { e.preventDefault(); acctGo('acct-signin'); };
  $('acctUp').onclick = () => { if ($('acctForm').reportValidity()) acctGo('acct-signup'); };
  $('acctReset').onclick = async () => {
    const email = $('acctEmail').value.trim();
    if (!email) { acctMsg('Type your email first, then tap Forgot password.'); $('acctEmail').focus(); return; }
    const r = await chrome.runtime.sendMessage({ type: 'acct-reset', email }) || {};
    acctMsg(r.ok ? 'Check your email for a link to set a new password.' : r.error);
  };
  $('acctOut').onclick = async () => { await chrome.runtime.sendMessage({ type: 'acct-signout' }); showAcct(''); acctMsg('Signed out. Words you saved stay in your account.'); };

  // Translation: "My language" for the cards, and the whole page on request.
  const { transLang } = await chrome.storage.local.get({ transLang: '' });
  $('transLang').insertAdjacentHTML('beforeend', self.LINGER_LANGS.map((l) => `<option value="${l.code}">${esc(l.own === l.name ? l.name : `${l.own} · ${l.name}`)}</option>`).join(''));
  $('transLang').value = transLang;
  // Hard words show as: original, easier English, or My language (needs a language picked below).
  const { swap } = await chrome.storage.local.get({ swap: '' });
  const mineLang = self.lingerLang(transLang);
  $('swapMine').textContent = mineLang && transLang !== 'en' ? mineLang.own : L('My language (pick one below)');
  $('swapMine').disabled = !(mineLang && transLang !== 'en');
  if (!$('swapMine').disabled) $('swapMine').setAttribute('translate', 'no');
  $('swap').value = swap === 'mine' && $('swapMine').disabled ? '' : swap;
  $('swap').onchange = (e) => chrome.storage.local.set({ swap: e.target.value });
  const pageBtn = () => {
    const on = status && status.translated;
    $('translatePage').disabled = !status || (!on && !$('transLang').value);
    $('translatePage').textContent = L(on ? 'Show the original page' : 'Translate this page');
  };
  pageBtn();
  // A new language: save it and redraw the menu in that language.
  $('transLang').onchange = async (e) => { await chrome.storage.local.set({ transLang: e.target.value }); location.reload(); };
  $('translatePage').onclick = async () => {
    const lang = $('transLang').value, msg = (t) => { $('transMsg').textContent = t; };
    // Chrome downloads a language the first time and only allows that right after a click, so the download starts
    // here (the click was in this menu, not on the page). After that the page can use it straight away.
    if (!(status && status.translated) && typeof Translator !== 'undefined') {
      const p = await chrome.tabs.sendMessage(tab.id, { type: 'page-lang', lang }).catch(() => null);
      if (p && p.from && p.from.split('-')[0] !== p.to.split('-')[0]) {
        const pair = { sourceLanguage: p.from, targetLanguage: p.to }, name = (c) => (self.lingerLang(c) || { name: c }).name;
        // If Chrome can't (unavailable, or the download fails), the page falls back to Claude instead of giving up.
        try {
          const a = await Translator.availability(pair);
          if (a === 'downloadable' || a === 'downloading') {
            msg(`Getting ${name(p.to)} ready (first time only)…`);
            await Translator.create({ ...pair, monitor: (m) => m.addEventListener('downloadprogress', (e) => msg(`Getting ${name(p.to)} ready (first time only)… ${Math.round(e.loaded * 100)}%`)) });
          }
        } catch {}
      }
    }
    msg(L('Starting…'));
    const r = await chrome.tabs.sendMessage(tab.id, { type: 'translate-page', lang }).catch(() => null);
    if (r && r.ok) return window.close();
    $('transMsg').textContent = (r && r.why) || L('Couldn’t translate this page. Reload it and try again.');
  };

  $('savedCount').textContent = st.saved.length;
  $('saved').innerHTML = st.saved.length
    ? st.saved.slice(0, 12).map((w) => `<li><b>${esc(w.w)}</b> <span>· ${esc(w.m || '')}</span></li>`).join('')
    : `<li class="empty"><span>${esc(L('Click on an underlined word, then the bookmark icon.'))}</span></li>`;
  askWhy();
  localize(transLang).then(() => { askWhy(); pageBtn(); if (!st.saved.length) $('saved').innerHTML = `<li class="empty"><span>${esc(L('Click on an underlined word, then the bookmark icon.'))}</span></li>`; });
})();

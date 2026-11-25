// Linger toolbar menu: settings, Explain this page, translation, phone sync and saved words.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tidy = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pretty = (c) => tidy(c).replace(/(.{4})(?=.)/g, '$1-');

// Phone code problems, each with what to do next (the code is in the phone app under Words → Turn on live sync).
const WHERE = 'In the Linger app on your phone, open Words → Turn on live sync to see your code.';
const PAIR_MSG = {
  empty: 'Type the 12-letter code from your phone. ' + WHERE,
  length: 'That isn’t a whole code: codes have 12 letters and numbers, like abcd-efgh-jkmn. ' + WHERE,
  chars: 'Linger codes never use 0, O, 1, I or L, so one of those letters is a typo. Check the code: ' + WHERE,
  offline: 'You’re offline. Connect to the internet, then press Connect again.',
  denied: 'Linger couldn’t use that code. Check each letter against your phone and type it again. ' + WHERE,
  error: 'Linger’s server didn’t answer. Wait a minute, then press Connect again.',
  new: 'Connected. Your phone hasn’t saved a word with this code yet, so Linger can’t check it. If words you save here don’t reach your phone, press Disconnect and check the code (Words → Turn on live sync).'
};
// Newer version check: the published manifest on the Linger website, at most every 6 hours.
const SITE = 'https://somohanty04.github.io/linger-prototype/';
const newer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; } return false; };
async function checkUpdate() {
  const mine = chrome.runtime.getManifest().version;
  let { updateCheck: c, updateDismissed } = await chrome.storage.local.get({ updateCheck: null, updateDismissed: '' });
  if (!c || !(Date.now() - c.t < 6 * 60 * 60 * 1000)) {
    try {
      const r = await fetch(SITE + 'extension/manifest.json', { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      const v = r.ok ? (await r.json()).version : null;
      if (typeof v === 'string' && /^\d+(\.\d+)*$/.test(v)) { c = { t: Date.now(), latest: v }; await chrome.storage.local.set({ updateCheck: c }); }
    } catch {} // offline or the site is down: say nothing, try again next time
  }
  if (!c || !newer(c.latest, mine) || updateDismissed === c.latest) return;
  $('updateText').textContent = `A newer Linger (${c.latest}) is available`;
  $('update').hidden = false;
  $('updateX').onclick = () => { chrome.storage.local.set({ updateDismissed: c.latest }); $('update').hidden = true; };
}
// Chrome's PDF viewer: content scripts can't run inside it. The page's own content type says for sure when Linger can
// look; otherwise go by the address (ends in .pdf, or a pdf path or parameter).
async function isPdf(tab, url, status) {
  if (!url) return false;
  let type = null;
  try { const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.contentType }); type = r && r.result; } catch {}
  if (type) return type === 'application/pdf';
  const looks = /\.pdf$/i.test(url.pathname) || /\/pdf\//i.test(url.pathname) || /[?&](format|type|output)=pdf\b/i.test(url.search);
  return looks && (!status || /\.pdf$/i.test(url.pathname));
}

// The menu in the reader's language ("My language"): each language is translated once (Chrome's translator, or Claude
// through the background worker) and kept in chrome.storage, shared with the page script.
const UI = {};
const L = (t) => UI[t] || t;
const EXTRA = ['Not available here', 'Reload this page to start Linger here.', 'Reload this page to use the new version of Linger.', 'The code has 12 letters and numbers.', 'Checking…',
  'Couldn’t reach Linger. Check your internet connection.', 'Show the original page', 'Translate this page', 'Starting…', 'Couldn’t translate this page. Reload it and try again.',
  'Click on an underlined word, then the bookmark icon.', 'in my language (pick one above)', 'On', 'Off', 'Reload this page to use Ask Linger.', 'Ask Linger needs AI explanations turned on.', 'Linger is off for this site, so the ✦ button is hidden.', 'Linger is off on every website. Turn on the Linger switch to use it.', 'The ✦ button should be at the bottom right of this page. If it isn’t, reload the page.',
  ...Object.values(PAIR_MSG), 'Sending…', 'Thanks. The Linger team will look at this site.', 'Couldn’t send it. You’re offline: connect to the internet and try again.', 'Couldn’t send it right now. Try again in a minute.'];
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
  if (!usable || !status) { $('blocked').hidden = false; ['site', 'explain', 'askOpen'].forEach((id) => { $(id).disabled = true; }); }
  if (usable && !status) $('blocked').textContent = L('Reload this page to start Linger here.');
  // A PDF: say why instead of the generic message, and offer the app's Paste screen.
  const pdf = await isPdf(tab, url, status);
  if (pdf) {
    $('blocked').hidden = true; $('pdf').hidden = false;
    ['site', 'explain', 'askOpen'].forEach((id) => { $(id).disabled = true; });
    if (/Mac/i.test(navigator.platform)) $('pdfTip').textContent = 'Select all (Cmd+A), copy, then paste.';
  }
  checkUpdate();
  // "Not working on this site?": on normal web pages (not a PDF, not Chrome's own pages).
  if (usable && !pdf && url.hostname) {
    $('issueOpen').hidden = false;
    $('issueOpen').onclick = () => {
      const open = $('issue').hidden;
      $('issue').hidden = !open; $('issueOpen').setAttribute('aria-expanded', String(open));
      if (open) $('issueNote').focus();
    };
    $('issueSend').onclick = async () => {
      const msg = (t) => { $('issueMsg').textContent = L(t); };
      if (!navigator.onLine) return msg('Couldn’t send it. You’re offline: connect to the internet and try again.');
      $('issueSend').disabled = true; msg('Sending…');
      const r = await chrome.runtime.sendMessage({ type: 'site-report', site: url.hostname, note: $('issueNote').value.slice(0, 500) }).catch(() => null);
      if (r && r.ok) { msg('Thanks. The Linger team will look at this site.'); $('issueNote').value = ''; $('issueNote').disabled = true; return; }
      $('issueSend').disabled = false;
      msg(r && r.why === 'offline' ? 'Couldn’t send it. You’re offline: connect to the internet and try again.' : 'Couldn’t send it right now. Try again in a minute.');
    };
  }
  // This tab still runs an older copy of Linger (Chrome keeps it after an update until the page reloads).
  if (status && status.version && status.version !== chrome.runtime.getManifest().version) { $('blocked').hidden = false; $('blocked').textContent = L('Reload this page to use the new version of Linger.'); }
  // Why the ✦ Ask Linger button isn't on the page.
  const askWhy = () => {
    const why = status && status.ask, el = $('askWhy');
    const text = why === 'ai-off' ? 'Ask Linger needs AI explanations turned on.' : why === 'all-off' ? 'Linger is off on every website. Turn on the Linger switch to use it.' : why === 'site-off' ? 'Linger is off for this site, so the ✦ button is hidden.' : why === 'missing' ? 'The ✦ button should be at the bottom right of this page. If it isn’t, reload the page.' : '';
    el.hidden = !text; el.textContent = L(text);
  };

  const st = await chrome.storage.local.get({ highlight: false, paused: [], bigger: false, aiOn: false, aiConsent: '', assistant: true, pairCode: '', saved: [], density: 'normal' });
  $('highlight').checked = st.highlight;
  $('site').checked = !st.paused.includes(host);
  // The main switch: Linger off on every website (the "On this site" switch is for this one site only).
  const { off } = await chrome.storage.local.get({ off: false });
  const powerShow = (on) => { document.body.classList.toggle('all-off', !on); $('powerTxt').textContent = L(on ? 'On' : 'Off'); };
  $('power').checked = !off; powerShow(!off);
  $('power').onchange = (e) => { chrome.storage.local.set({ off: !e.target.checked }); powerShow(e.target.checked); $('askWhy').hidden = true; };
  $('bigger').checked = st.bigger;
  // AI explanations: on only with explicit consent (aiConsent: 'yes'), kept apart from the switch itself. An older
  // aiOn: true without consent shows as off, and turning it on asks first.
  const aiOK = () => st.aiConsent === 'yes' && st.aiOn === true;
  $('aiOn').checked = aiOK();
  const aiAsk = (show) => { $('aiAsk').hidden = !show; if (show) { $('aiNo').focus(); $('aiAsk').scrollIntoView({ block: 'nearest' }); } };
  let askAfter = false; // they pressed Ask Linger with AI off: open the chat once they allow it // focus the safe choice; the group's text is read first
  $('aiOn').onchange = (e) => {
    if (!e.target.checked) { st.aiOn = false; aiAsk(false); chrome.storage.local.set({ aiOn: false }); return; }
    if (st.aiConsent === 'yes') { st.aiOn = true; chrome.storage.local.set({ aiOn: true }); return; }
    e.target.checked = false; aiAsk(true); // not on until they choose Allow
  };
  const choose = (yes) => {
    Object.assign(st, { aiOn: yes, aiConsent: yes ? 'yes' : 'no' });
    chrome.storage.local.set({ aiOn: yes, aiConsent: st.aiConsent, aiConsentAt: Date.now() });
    $('aiOn').checked = yes; aiAsk(false); $('aiOn').focus();
    if (yes && askAfter) openChat();
    askAfter = false;
  };
  $('aiYes').onclick = () => choose(true);
  $('aiNo').onclick = () => choose(false);
  $('assistant').checked = st.assistant;
  $('assistant').onchange = (e) => chrome.storage.local.set({ assistant: e.target.checked });
  $('highlight').onchange = (e) => chrome.storage.local.set({ highlight: e.target.checked });
  $('bigger').onchange = (e) => chrome.storage.local.set({ bigger: e.target.checked });
  $('site').onchange = async (e) => {
    const { paused } = await chrome.storage.local.get({ paused: [] });
    chrome.storage.local.set({ paused: e.target.checked ? paused.filter((h) => h !== host) : [...new Set([...paused, host])] });
  };
  $('explain').onclick = async () => { await chrome.tabs.sendMessage(tab.id, { type: 'explain' }).catch(() => {}); window.close(); };
  // Ask Linger: opens the chat on the page. It needs AI explanations, so ask for that first if it's off.
  const openChat = async () => {
    if ($('power').checked === false) { chrome.storage.local.set({ off: false }); $('power').checked = true; powerShow(true); }
    const r = await chrome.tabs.sendMessage(tab.id, { type: 'ask' }).catch(() => null);
    if (r && r.ok) return window.close();
    $('askWhy').hidden = false; $('askWhy').textContent = L('Reload this page to use Ask Linger.');
  };
  $('askOpen').onclick = () => { if (aiOK()) openChat(); else { askAfter = true; aiAsk(true); } };

  // Phone pairing: the same 12-character code the phone app shows under Words → live sync.
  const showPair = (code) => { $('paired').hidden = !code; $('codeOpen').hidden = !!code; if (code) $('codeBox').hidden = true; $('codeShow').textContent = pretty(code); };
  showPair(st.pairCode);
  $('codeOpen').onclick = () => {
    const open = $('codeBox').hidden;
    $('codeBox').hidden = !open; $('codeOpen').setAttribute('aria-expanded', String(open));
    if (open) $('code').focus();
  };
  const pairMsg = (key, bad) => {
    $('pairMsg').textContent = key ? L(PAIR_MSG[key] || key) : '';
    $('code').setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (bad) $('code').setAttribute('aria-describedby', 'pairMsg'); else $('code').removeAttribute('aria-describedby');
  };
  $('pairForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = tidy($('code').value);
    // Format first (no need to ask the server): 12 letters and numbers, from the app's alphabet (no 0, o, 1, l or i).
    const bad = !code ? 'empty' : code.length !== 12 ? 'length' : /[01oil]/.test(code) ? 'chars' : '';
    if (bad) { pairMsg(bad, true); $('code').focus(); return; }
    if (!navigator.onLine) { pairMsg('offline', false); return; }
    pairMsg('Checking…', false);
    const r = await chrome.runtime.sendMessage({ type: 'check-code', code }).catch(() => null);
    const res = (r && r.result) || 'error';
    if (res !== 'found' && res !== 'new') { pairMsg(res === 'offline' || res === 'denied' ? res : 'error', res === 'denied'); if (res === 'denied') $('code').focus(); return; }
    await chrome.storage.local.set({ pairCode: code });
    pairMsg(res === 'new' ? 'new' : '', false);
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
  $('swapMine').textContent = mineLang && transLang !== 'en' ? `in ${mineLang.own}` : L('in my language (pick one above)');
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

// Linger toolbar menu: settings, Explain this page, eye tracking, phone pairing and saved words.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tidy = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pretty = (c) => tidy(c).replace(/(.{4})(?=.)/g, '$1-');

// The bar's filled part shows the pause time.
function fill() { const r = $('secs'); r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); }

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url ? new URL(tab.url) : null;
  const usable = !!url && /^(https?|file):$/.test(url.protocol) && !/chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(url.href);
  const host = url ? url.hostname || 'file' : '';
  $('siteLabel').textContent = usable ? host : 'Not available here';
  const status = usable ? await chrome.tabs.sendMessage(tab.id, { type: 'status' }).catch(() => null) : null;
  if (!usable || !status) { $('blocked').hidden = false; ['site', 'explain'].forEach((id) => { $(id).disabled = true; }); }
  if (usable && !status) $('blocked').textContent = 'Reload this page to start Linger here.';

  const st = await chrome.storage.local.get({ highlight: true, paused: [], bigger: false, aiOn: true, assistant: true, pauseSecs: 3, showGaze: true, spread: false, handSwipe: true, pairCode: '', saved: [], gazeProblem: null, eyeOn: false, gazeModel: null });
  if (st.gazeProblem && Date.now() - st.gazeProblem.t < 30 * 60 * 1000) { $('eyeProblem').hidden = false; $('eyeProblem').textContent = 'Last problem: ' + st.gazeProblem.why + '. Open Recalibrate to check the camera.'; }
  $('highlight').checked = st.highlight;
  $('site').checked = !st.paused.includes(host);
  $('bigger').checked = st.bigger;
  $('aiOn').checked = st.aiOn;
  $('aiOn').onchange = (e) => chrome.storage.local.set({ aiOn: e.target.checked });
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

  $('highlight').onchange = (e) => chrome.storage.local.set({ highlight: e.target.checked });
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

  // Phone pairing: the same 12-character code the phone app shows under Words → live sync.
  const showPair = (code) => { $('paired').hidden = !code; $('pairForm').hidden = !!code; $('pairHint').hidden = !!code; $('codeShow').textContent = pretty(code); };
  showPair(st.pairCode);
  $('pairForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = tidy($('code').value);
    if (code.length < 10) { $('pairMsg').textContent = 'The code has 12 letters and numbers.'; return; }
    $('pairMsg').textContent = 'Checking…';
    const r = await chrome.runtime.sendMessage({ type: 'check-code', code });
    if (!r || r.result === 'error') { $('pairMsg').textContent = 'Couldn’t reach Linger. Check your internet connection.'; return; }
    await chrome.storage.local.set({ pairCode: code });
    $('pairMsg').textContent = '';
    showPair(code);
  };
  $('unpair').onclick = async () => { await chrome.storage.local.set({ pairCode: '' }); showPair(''); };

  // Translation: "My language" for the cards, and the whole page on request.
  const { transLang } = await chrome.storage.local.get({ transLang: '' });
  $('transLang').insertAdjacentHTML('beforeend', self.LINGER_LANGS.map((l) => `<option value="${l.code}">${esc(l.own === l.name ? l.name : `${l.own} · ${l.name}`)}</option>`).join(''));
  $('transLang').value = transLang;
  const pageBtn = () => {
    const on = status && status.translated;
    $('translatePage').disabled = !status || (!on && !$('transLang').value);
    $('translatePage').textContent = on ? 'Show the original page' : 'Translate this page';
  };
  pageBtn();
  $('transLang').onchange = (e) => { chrome.storage.local.set({ transLang: e.target.value }); $('transMsg').textContent = ''; pageBtn(); };
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
    msg('Starting…');
    const r = await chrome.tabs.sendMessage(tab.id, { type: 'translate-page', lang }).catch(() => null);
    if (r && r.ok) return window.close();
    $('transMsg').textContent = (r && r.why) || 'Couldn’t translate this page. Reload it and try again.';
  };

  $('savedCount').textContent = st.saved.length;
  $('saved').innerHTML = st.saved.length
    ? st.saved.slice(0, 12).map((w) => `<li><b>${esc(w.w)}</b> <span>· ${esc(w.m || '')}</span></li>`).join('')
    : '<li class="empty"><span>Click on an underlined word, then the bookmark icon.</span></li>';
})();

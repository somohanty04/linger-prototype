// Linger toolbar menu: settings, Explain this page, eye tracking, phone pairing and saved words.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tidy = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pretty = (c) => tidy(c).replace(/(.{4})(?=.)/g, '$1-');

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url ? new URL(tab.url) : null;
  const usable = !!url && /^(https?|file):$/.test(url.protocol) && !/chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(url.href);
  const host = url ? url.hostname || 'file' : '';
  $('host').textContent = usable ? host : 'this page';
  $('siteLabel').textContent = usable ? host : 'Not available here';
  const status = usable ? await chrome.tabs.sendMessage(tab.id, { type: 'status' }).catch(() => null) : null;
  if (!usable || !status) { $('blocked').hidden = false; ['site', 'explain', 'eye', 'recal', 'secs'].forEach((id) => { $(id).disabled = true; }); }
  if (usable && !status) $('blocked').textContent = 'Reload this page to start Linger here.';

  const st = await chrome.storage.local.get({ highlight: true, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, pairCode: '', saved: [] });
  $('highlight').checked = st.highlight;
  $('site').checked = !st.paused.includes(host);
  $('bigger').checked = st.bigger;
  $('showGaze').checked = st.showGaze;
  $('spread').checked = st.spread;
  $('secs').value = st.pauseSecs; $('secsOut').textContent = st.pauseSecs;
  $('eye').checked = !!(status && status.eye);
  $('recal').hidden = !$('eye').checked;

  $('highlight').onchange = (e) => chrome.storage.local.set({ highlight: e.target.checked });
  $('bigger').onchange = (e) => chrome.storage.local.set({ bigger: e.target.checked });
  $('showGaze').onchange = (e) => chrome.storage.local.set({ showGaze: e.target.checked });
  $('spread').onchange = (e) => chrome.storage.local.set({ spread: e.target.checked });
  $('site').onchange = async (e) => {
    const { paused } = await chrome.storage.local.get({ paused: [] });
    chrome.storage.local.set({ paused: e.target.checked ? paused.filter((h) => h !== host) : [...new Set([...paused, host])] });
  };
  $('explain').onclick = async () => { await chrome.tabs.sendMessage(tab.id, { type: 'explain' }).catch(() => {}); window.close(); };

  // Eye tracking runs inside the page (it needs the page's camera permission and layout).
  $('eye').onchange = async (e) => {
    if (e.target.checked) { await chrome.runtime.sendMessage({ type: 'eye-on', tabId: tab.id }); window.close(); }
    else { await chrome.runtime.sendMessage({ type: 'eye-off', tabId: tab.id }); $('recal').hidden = true; }
  };
  $('recal').onclick = async () => { await chrome.runtime.sendMessage({ type: 'eye-recal', tabId: tab.id }); window.close(); };
  $('secs').oninput = (e) => { $('secsOut').textContent = e.target.value; };
  $('secs').onchange = (e) => {
    const secs = Number(e.target.value);
    chrome.storage.local.set({ pauseSecs: secs });
    if ($('eye').checked) chrome.runtime.sendMessage({ type: 'eye-secs', tabId: tab.id, secs });
  };

  // Phone pairing: the same 12-character code the phone app shows under Words → live sync.
  const showPair = (code) => { $('paired').hidden = !code; $('pairForm').hidden = !!code; $('codeShow').textContent = pretty(code); };
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

  $('savedCount').textContent = st.saved.length;
  $('saved').innerHTML = st.saved.length
    ? st.saved.slice(0, 12).map((w) => `<li><b>${esc(w.w)}</b> <span>· ${esc(w.m || '')}</span></li>`).join('')
    : '<li><span>Click an underlined word, then ★ Save to Linger.</span></li>';
})();

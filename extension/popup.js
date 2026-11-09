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
  const isPdf = /\.pdf($|[?#])/i.test(url ? url.href : '');
  // Reading the screen works on PDFs and picture-only pages too, where the rest of Linger can't run.
  $('readScreen').disabled = !usable;
  $('readScreen').textContent = isPdf ? '📄 Read this PDF' : '📷 Read this screen';
  $('readScreen').onclick = () => {
    chrome.storage.session.set({ lingerRead: { source: isPdf ? 'pdf' : 'screen', url: tab.url, page: tab.url, tabId: tab.id, windowId: tab.windowId, at: Date.now() } });
    chrome.sidePanel.open({ windowId: tab.windowId }); // must run right away, inside the click
    window.close();
  };
  if (!usable || !status) { $('blocked').hidden = false; ['site', 'explain', 'ask'].forEach((id) => { $(id).disabled = true; }); }
  if (usable && !status) $('blocked').textContent = isPdf ? 'This is a PDF. Use 📄 Read this PDF to see and highlight its text in Linger.' : 'Reload this page to start Linger here.';

  const st = await chrome.storage.local.get({ highlight: true, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, pairCode: '', saved: [], gazeProblem: null, eyeOn: false, gazeModel: null, aiKey: '', inlineLang: 'easy' });
  if (st.gazeProblem && Date.now() - st.gazeProblem.t < 30 * 60 * 1000) { $('eyeProblem').hidden = false; $('eyeProblem').textContent = 'Last problem: ' + st.gazeProblem.why + '. Open Recalibrate to check the camera.'; }
  $('highlight').checked = st.highlight;
  $('site').checked = !st.paused.includes(host);
  $('bigger').checked = st.bigger;
  $('showGaze').checked = st.showGaze;
  $('spread').checked = st.spread;
  $('secs').value = st.pauseSecs; $('secsOut').textContent = st.pauseSecs;
  $('eye').checked = st.eyeOn;
  $('recal').hidden = !st.gazeModel;
  const acc = st.gazeModel && st.gazeModel.acc;
  if (acc) $('eyeHint').textContent = `Set up ${new Date(st.gazeModel.at).toLocaleDateString()}: lands about ${acc.err}px from where you look. Works on every tab. Clicking around helps it keep learning.`;

  $('highlight').onchange = (e) => chrome.storage.local.set({ highlight: e.target.checked });
  $('bigger').onchange = (e) => chrome.storage.local.set({ bigger: e.target.checked });
  $('showGaze').onchange = (e) => chrome.storage.local.set({ showGaze: e.target.checked });
  $('spread').onchange = (e) => chrome.storage.local.set({ spread: e.target.checked });
  $('site').onchange = async (e) => {
    const { paused } = await chrome.storage.local.get({ paused: [] });
    chrome.storage.local.set({ paused: e.target.checked ? paused.filter((h) => h !== host) : [...new Set([...paused, host])] });
  };
  $('explain').onclick = async () => { await chrome.tabs.sendMessage(tab.id, { type: 'explain' }).catch(() => {}); window.close(); };
  $('ask').onclick = async () => { await chrome.tabs.sendMessage(tab.id, { type: 'ask' }).catch(() => {}); window.close(); };
  $('aiKey').value = st.aiKey;
  $('aiMsg').textContent = st.aiKey ? 'AI is on.' : 'Without a key, Linger uses its word list and free synonym lookups.';
  $('aiKey').onchange = async (e) => { const k = e.target.value.trim(); await chrome.storage.local.set({ aiKey: k }); $('aiMsg').textContent = k ? 'Saved. AI is on.' : 'Key removed. Linger uses its word list and free synonym lookups.'; };
  $('inlineLang').value = st.inlineLang;
  $('inlineLang').onchange = (e) => chrome.storage.local.set({ inlineLang: e.target.value });

  // Eye tracking runs once for the whole browser; the first time, it opens the setup page.
  $('eye').onchange = async (e) => {
    const r = await chrome.runtime.sendMessage({ type: e.target.checked ? 'eye-on' : 'eye-off', tabId: tab && tab.id });
    if (r && r.setup) e.target.checked = false;
    window.close();
  };
  $('recal').onclick = async () => { await chrome.runtime.sendMessage({ type: 'eye-recal', tabId: tab && tab.id }); window.close(); };
  $('secs').oninput = (e) => { $('secsOut').textContent = e.target.value; };
  $('secs').onchange = (e) => chrome.storage.local.set({ pauseSecs: Number(e.target.value) });

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
    ? st.saved.slice(0, 12).map((w) => `<li><b>${esc(w.w)}</b> <span>· ${esc(w.m || '')}</span>${w.syn ? `<em>Easier: ${esc(w.syn)}</em>` : ''}${w.s && w.kind !== 'sentence' ? `<q>${esc(w.s)}</q>` : ''}</li>`).join('')
    : '<li><span>Click an underlined word, then ★ Save to Linger.</span></li>';
})();

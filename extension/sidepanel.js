// Linger side panel: reads photos, picture menus and PDFs with AI, then shows the text so it can be
// highlighted (content.js runs here too) and asked about with Ask Linger.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isPdfUrl = (u) => /\.pdf($|[?#])/i.test(u || '');
let busy = false;

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}
function setStatus(html, err) { $('status').innerHTML = html; $('status').classList.toggle('err', !!err); }

// A dish note starting with 🌶 gets the chili part in red so spicy dishes stand out.
function noteHtml(note) {
  const m = note.match(/^(🌶[^.]*\.)\s*(.*)$/);
  return m ? `<span class="hot">${esc(m[1])}</span> ${esc(m[2])}` : esc(note);
}
function show(res, req) {
  $('title').textContent = res.title || 'What’s on your screen';
  $('summary').textContent = res.summary || '';
  $('summary').hidden = !res.summary;
  $('sections').innerHTML = res.sections.map((s) => `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.lines.map((l) => `<div class="item"><p class="t">${esc(l.text)}</p>${l.note ? `<p class="n">${noteHtml(l.note)}</p>` : ''}</div>`).join('')}`).join('');
  const what = req.source === 'pdf' ? 'the whole PDF' : req.source === 'image' ? 'the image' : 'a picture of your screen';
  $('from').textContent = `Read from ${what} · ${req.page || req.url || ''}`;
  $('out').hidden = false;
}

async function read(req) {
  if (busy) return;
  busy = true;
  $('readScreen').disabled = $('readPdf').disabled = true;
  setStatus(`<span class="spin"></span>Reading ${req.source === 'pdf' ? 'the PDF' : req.source === 'image' ? 'the image' : 'your screen'}… this takes a few seconds.`);
  try {
    const r = await chrome.runtime.sendMessage({ type: 'ai-read', ...req });
    if (r && r.sections) {
      show(r, req);
      const n = r.sections.reduce((a, s) => a + s.lines.length, 0);
      setStatus(n ? `Done. ${n} line${n === 1 ? '' : 's'} read. Read again after you scroll to see more.` : 'Linger couldn’t find any text. Try zooming in on the menu, then read again.', !n);
    } else if (r && r.noKey) {
      setStatus('Reading photos and PDFs needs AI. Open the Linger menu (toolbar icon) and add a key under ✦ AI explanations.', true);
    } else {
      setStatus('Couldn’t read this right now. ' + esc((r && r.error) || 'Check your internet connection and try again.'), true);
    }
  } catch (e) {
    setStatus('Couldn’t read this right now. ' + esc(e.message || e), true);
  }
  busy = false;
  $('readScreen').disabled = $('readPdf').disabled = false;
}

async function readFromTab(source) {
  const tab = await currentTab();
  if (!tab) return;
  read({ source, url: tab.url, page: tab.url, tabId: tab.id, windowId: tab.windowId });
}
$('readScreen').onclick = () => readFromTab('screen');
$('readPdf').onclick = () => readFromTab('pdf');
$('ask').onclick = () => window.__lingerAPI && window.__lingerAPI.openAsk();

// Show "Read the whole PDF" when the tab is a PDF.
async function updatePdfButton() { const tab = await currentTab(); $('readPdf').hidden = !(tab && isPdfUrl(tab.url)); }
chrome.tabs.onActivated.addListener(updatePdfButton);
chrome.tabs.onUpdated.addListener((id, info) => { if (info.url || info.status === 'complete') updatePdfButton(); });
updatePdfButton();

// The toolbar menu and right-click menu leave a request here, then open this panel.
async function takeRequest() {
  const { lingerRead } = await chrome.storage.session.get('lingerRead');
  if (!lingerRead || Date.now() - lingerRead.at > 60000) return;
  await chrome.storage.session.remove('lingerRead');
  read(lingerRead);
}
chrome.storage.session.onChanged.addListener((ch) => { if (ch.lingerRead && ch.lingerRead.newValue) takeRequest(); });
takeRequest();

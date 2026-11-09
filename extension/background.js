// Linger background worker: dictionary lookups, saving words, sending them to the phone (Firestore REST),
// and running eye tracking (one hidden tracker page for the whole browser, plus the setup page).
importScripts('explain.js');

const FIREBASE = { projectId: 'linger-f41a7', apiKey: 'AIzaSyDxWUp1eTp8bXZV-GV13XQAHI_Q4fL0GCU' };
const DOC = (code) => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/pairs/${code}`;

// Wiktionary definitions come as HTML; strip it and keep a short one.
async function lookup(word) {
  try {
    const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word));
    if (!r.ok) return null;
    const j = await r.json();
    const defs = (j.en || []).flatMap((x) => x.definitions || []).map((d) => (d.definition || '')
      .replace(/<style[\s\S]*?<\/style>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim())
      .filter((t) => t && !/^(obsolete|archaic|plural of|alternative)/i.test(t));
    const def = defs.find((t) => t.length <= 140) || defs[0];
    return def ? def.charAt(0).toUpperCase() + def.slice(1) : null;
  } catch { return null; }
}

// Add one word to pairs/{code}.words without touching the others (same document the phone app listens to).
async function pushWord(code, key, w) {
  const str = (v) => ({ stringValue: String(v || '') });
  const fields = { w: str(w.w), m: str(w.m), syn: str(w.syn), kind: str(w.kind || 'word'), s: str(w.s), p: str(w.p), place: str(w.place), date: str(w.date) };
  const path = 'words.`' + key.replace(/`/g, '') + '`';
  const url = `${DOC(code)}?key=${FIREBASE.apiKey}&updateMask.fieldPaths=${encodeURIComponent(path)}`;
  const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { words: { mapValue: { fields: { [key]: { mapValue: { fields } } } } } } }) });
  if (!r.ok) throw new Error('firestore ' + r.status);
}
async function checkCode(code) {
  const r = await fetch(`${DOC(code)}?key=${FIREBASE.apiKey}`);
  return r.ok ? 'found' : r.status === 404 ? 'new' : 'error';
}

// ---------- eye tracker page ----------
let creating = null;
async function hasTracker() { return (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0; }
async function ensureTracker() {
  if (await hasTracker()) return;
  if (!creating) creating = chrome.offscreen.createDocument({ url: 'tracker.html', reasons: ['USER_MEDIA'], justification: 'Webcam eye tracking that notices when you are stuck on a word' }).finally(() => { creating = null; });
  await creating;
}
async function closeTracker() { if (await hasTracker()) await chrome.offscreen.closeDocument().catch(() => {}); }
async function openSetup(fromTab) {
  await chrome.storage.session.set({ setupFrom: fromTab || null });
  // Reuse the setup tab if it's still open. (Don't find it with tabs.query({ url }): without the "tabs"
  // permission Chrome ignores the url filter and returns every tab, so it would just switch to some other tab.)
  const { setupTab } = await chrome.storage.session.get({ setupTab: null });
  const open = setupTab && await chrome.tabs.get(setupTab).catch(() => null);
  if (open && (open.url || open.pendingUrl || '').includes('/calibrate.html')) {
    await chrome.tabs.update(open.id, { active: true });
    await chrome.windows.update(open.windowId, { focused: true }).catch(() => {});
    return;
  }
  const tab = await chrome.tabs.create({ url: chrome.runtime.getURL('calibrate.html') });
  await chrome.storage.session.set({ setupTab: tab.id });
}
// Keep eye tracking on after Chrome restarts.
const resume = async () => { const { eyeOn } = await chrome.storage.local.get({ eyeOn: false }); if (eyeOn) ensureTracker(); };
chrome.runtime.onStartup.addListener(resume);
chrome.runtime.onInstalled.addListener(resume);

// ---------- Read this screen: photos, picture menus and PDFs ----------
const toBase64 = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
async function screenshot(windowId) {
  const url = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 85 });
  return { image: url.slice(url.indexOf(',') + 1), mediaType: 'image/jpeg' };
}
// What to send: the whole PDF, the right-clicked image, or (if those can't be fetched) a picture of the screen.
async function grab({ source, url, windowId }) {
  if ((source === 'pdf' || source === 'image') && url && /^https?:/.test(url)) {
    try {
      const r = await fetch(url, { credentials: 'include' });
      if (r.ok) {
        const type = (r.headers.get('content-type') || '').split(';')[0].trim();
        const buf = await r.arrayBuffer();
        if (source === 'pdf' && type.includes('pdf') && buf.byteLength < 25e6) return { pdf: toBase64(buf) };
        if (source === 'image' && IMAGE_TYPES.includes(type) && buf.byteLength < 4.5e6) return { image: toBase64(buf), mediaType: type };
      }
    } catch {}
  }
  return screenshot(windowId);
}
const isPdfUrl = (u) => /\.pdf($|[?#])/i.test(u || '');
function startRead(tab, source, url) {
  // Tell the side panel what to read, then open it (opening must happen right away, in the click).
  chrome.storage.session.set({ lingerRead: { source, url: url || tab.url, tabId: tab.id, windowId: tab.windowId, page: tab.url, at: Date.now() } });
  chrome.sidePanel.open({ windowId: tab.windowId });
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'linger-image', title: 'Read this image with Linger', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'linger-screen', title: 'Read this screen with Linger', contexts: ['page'] });
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  if (info.menuItemId === 'linger-image') startRead(tab, 'image', info.srcUrl);
  else startRead(tab, isPdfUrl(tab.url) ? 'pdf' : 'screen');
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === 'lookup') return reply({ meaning: await lookup(msg.word) });
    if (msg.type === 'save') {
      const { saved = [], pairCode = '' } = await chrome.storage.local.get({ saved: [], pairCode: '' });
      const list = [{ key: msg.key, ...msg.word, at: Date.now() }, ...saved.filter((x) => x.key !== msg.key)].slice(0, 200);
      await chrome.storage.local.set({ saved: list });
      if (!pairCode) return reply({ ok: true, paired: false });
      try { await pushWord(pairCode, msg.key, msg.word); reply({ ok: true, synced: true }); }
      catch { reply({ ok: true, synced: false, error: true }); }
      return;
    }
    if (msg.type === 'ai-read') {
      const { aiKey = '' } = await chrome.storage.local.get({ aiKey: '' });
      if (!aiKey) return reply({ noKey: true });
      try { return reply(await LingerAI.read({ ...(await grab(msg)), key: aiKey })); }
      catch (e) { return reply({ error: String(e.message || e) }); }
    }
    if (msg.type === 'synonyms') return reply({ list: await LingerAI.synonyms(msg.word) });
    if (msg.type === 'translate') return reply({ text: await LingerAI.translate(msg.text, msg.lang) });
    if (msg.type === 'check-code') return reply({ result: await checkCode(msg.code) });
    // ---------- eye tracking ----------
    if (msg.type === 'eye-on') {
      const { gazeModel } = await chrome.storage.local.get({ gazeModel: null });
      if (!gazeModel) { await openSetup(msg.tabId); return reply({ ok: true, setup: true }); }
      await chrome.storage.local.set({ eyeOn: true, gazeProblem: null });
      await ensureTracker();
      return reply({ ok: true });
    }
    if (msg.type === 'eye-off') { await chrome.storage.local.set({ eyeOn: false }); await closeTracker(); return reply({ ok: true }); }
    if (msg.type === 'eye-recal') { await openSetup(msg.tabId || (sender.tab && sender.tab.id)); return reply({ ok: true }); }
    if (msg.type === 'eye-ensure') { const { eyeOn } = await chrome.storage.local.get({ eyeOn: false }); if (eyeOn) await ensureTracker(); return reply({ ok: true }); }
    if (msg.type === 'eye-start') { if (msg.restart) await closeTracker(); await ensureTracker(); return reply({ ok: true }); }
    if (msg.type === 'get-model') { const { gazeModel } = await chrome.storage.local.get({ gazeModel: null }); return reply({ model: gazeModel }); }
    if (msg.type === 'save-model') { await chrome.storage.local.set({ gazeModel: msg.model }); return reply({ ok: true }); }
    if (msg.type === 'gaze-problem') { await chrome.storage.local.set({ gazeProblem: { t: Date.now(), site: 'eye tracking', why: msg.why } }); return reply({ ok: true }); }
    if (msg.type === 'calib-done' || msg.type === 'calib-cancel') {
      if (msg.type === 'calib-done') await chrome.storage.local.set({ gazeModel: msg.model, eyeOn: true, gazeProblem: null });
      const { eyeOn } = await chrome.storage.local.get({ eyeOn: false });
      if (!eyeOn) await closeTracker();
      // Go back to the page the person came from.
      const { setupFrom } = await chrome.storage.session.get({ setupFrom: null });
      if (setupFrom) chrome.tabs.update(setupFrom, { active: true }).catch(() => {});
      if (sender.tab) chrome.tabs.remove(sender.tab.id).catch(() => {});
      return reply({ ok: true });
    }
    reply({ ok: false });
  })().catch((e) => reply({ ok: false, error: String(e) }));
  return true; // keep the channel open for the async reply
});

// ---------- Developer mode: no reinstalling ----------
// When Linger is loaded with "Load unpacked", it checks its own files every 1.5 s. After you save a change,
// it reloads itself and the tab you're on, so the change shows up without touching chrome://extensions.
// (Installs from the Chrome Web Store have an update_url, so this never runs there.)
if (!('update_url' in chrome.runtime.getManifest())) {
  const FILES = ['manifest.json', 'background.js', 'content.js', 'explain.js', 'words.js', 'cities.js', 'gaze.js', 'popup.html', 'popup.js', 'popup.css', 'sidepanel.html', 'sidepanel.js', 'sidepanel.css', 'sidepanel-setup.js', 'calibrate.html', 'calibrate.js', 'tracker.html', 'tracker.js'];
  let last = null;
  const check = async () => {
    try {
      const now = (await Promise.all(FILES.map((f) => fetch(chrome.runtime.getURL(f), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : ''))))).join('\u0000');
      if (last !== null && now !== last) { await chrome.storage.local.set({ devReloadTab: true }); chrome.runtime.reload(); return; }
      last = now;
      chrome.runtime.getPlatformInfo(); // an extension call keeps the worker awake while you develop
    } catch {}
  };
  setInterval(check, 1500); check();
  chrome.storage.local.get({ devReloadTab: false }, async ({ devReloadTab }) => {
    if (!devReloadTab) return;
    await chrome.storage.local.set({ devReloadTab: false });
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && /^(https?|file):/.test(tab.url || '')) chrome.tabs.reload(tab.id);
  });
}

// Linger background worker: dictionary lookups, saving words, sending them to the phone (Firestore REST),
// and running eye tracking (one hidden tracker page for the whole browser, plus the setup page).
const FIREBASE = { projectId: 'linger-f41a7', apiKey: 'AIzaSyDxWUp1eTp8bXZV-GV13XQAHI_Q4fL0GCU' };
const DOC = (code) => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/pairs/${code}`;

importScripts('dict.js');

// Meaning and an example sentence from Wiktionary.
const dictCache = new Map();
const dictWait = new Map();
function lookup(word) {
  if (dictCache.has(word)) return Promise.resolve(dictCache.get(word));
  if (!dictWait.has(word)) dictWait.set(word, lookupNow(word).finally(() => dictWait.delete(word)));
  return dictWait.get(word);
}
async function lookupNow(word) {
  try {
    const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word));
    const e = r.ok ? self.lingerDictEntry(await r.json(), word) : { meaning: null, example: null };
    dictCache.set(word, e);
    return e;
  } catch { return { meaning: null, example: null }; }
}

// Linger AI: meaning in context from Claude, through the Firebase function in /functions (which holds the API key).
// After deploying, put the URL the deploy prints here. Empty = AI off (cards use the dictionary only).
const AI_URL = 'https://us-central1-linger-f41a7.cloudfunctions.net/explain';
const aiCache = new Map();
// A random ID for this browser, sent with AI requests so the server's "too many requests" limit counts each person
// separately. Before, it counted per internet address, and a whole class on campus Wi-Fi shares one address, so AI
// answers stopped for everyone after 30 a minute.
let installId = null;
async function getInstallId() {
  if (installId) return installId;
  const { lingerId } = await chrome.storage.local.get({ lingerId: '' });
  installId = lingerId || crypto.randomUUID();
  if (!lingerId) await chrome.storage.local.set({ lingerId: installId });
  return installId;
}
// POST to the Linger AI server. A busy server, a cold start or a network blip gets one more try after a short pause.
async function postAI(body, ms) {
  const headers = { 'Content-Type': 'application/json', 'X-Linger-Id': await getInstallId() };
  for (let attempt = 0; ; attempt++) {
    const stop = new AbortController(), t = setTimeout(() => stop.abort(), ms);
    let r = null;
    try { r = await fetch(AI_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: stop.signal }); } catch {} finally { clearTimeout(t); }
    const retry = !r || r.status === 429 || r.status >= 500;
    if (!retry || attempt >= 1) return r;
    await new Promise((res) => setTimeout(res, r && r.status === 429 ? 2500 : 1200));
  }
}
// Nothing goes to Claude unless the reader explicitly allowed it (aiConsent: 'yes', asked on a word card or in the menu)
// AND the AI explanations switch is on. Every AI request (cards, hover prefetch, eye tracking, swaps, translation, the
// menu's own translation, Ask Linger) passes through askAI or askPage, so this is the one place that enforces it.
async function aiAllowed() {
  const { aiOn, aiConsent } = await chrome.storage.local.get({ aiOn: false, aiConsent: '' });
  return !!AI_URL && aiOn === true && aiConsent === 'yes';
}
async function askAI({ mode, text, context, lang, langName, from, sentence, texts, items }) {
  if (!(await aiAllowed())) return null;
  const extra = mode === 'translate' ? { lang, langName, from, sentence: !!sentence } : mode === 'translate-many' ? { lang, langName, from, texts } : mode === 'swap-many' ? { lang, langName, items } : {};
  const key = JSON.stringify([mode, text, context, extra]);
  if (aiCache.has(key)) return aiCache.get(key);
  const keep = mode !== 'translate-many'; // page batches are big and rarely repeat
  if (keep) { const saved = await diskGet(key); if (saved) { aiCache.set(key, saved); return saved; } }
  // The same question already on its way (hovering started it, then the click asked again): wait for that one.
  if (inFlight.has(key)) return inFlight.get(key);
  const p = (async () => {
    try {
      const r = await postAI({ mode, text, context, ...extra }, mode === 'translate-many' ? 55000 : 25000);
      const out = r && r.ok ? await r.json() : null;
      if (!out || out.error) return null;
      aiCache.set(key, out);
      if (aiCache.size > 300) aiCache.delete(aiCache.keys().next().value);
      if (keep) diskPut(key, out);
      return out;
    } catch { return null; }
  })();
  inFlight.set(key, p);
  p.finally(() => inFlight.delete(key));
  return p;
}
// AI answers are also kept on disk (the newest 500), because Chrome stops this background worker after about 30
// seconds idle and its memory goes with it. A word you met yesterday, or on another page, now opens instantly.
const inFlight = new Map();
let disk = null, diskT = null;
async function diskLoad() { if (!disk) disk = (await chrome.storage.local.get({ aiDisk: {} })).aiDisk || {}; return disk; }
async function diskGet(key) { const d = await diskLoad(); const e = d[key]; if (e) e.t = Date.now(); return e ? e.v : null; }
async function diskPut(key, v) {
  const d = await diskLoad();
  d[key] = { v, t: Date.now() };
  const keys = Object.keys(d);
  if (keys.length > 500) keys.sort((a, b) => d[a].t - d[b].t).slice(0, keys.length - 500).forEach((k) => delete d[k]);
  clearTimeout(diskT); diskT = setTimeout(() => chrome.storage.local.set({ aiDisk: d }), 500);
}

// Ask Linger: a question about the whole page (no caching: every question is different).
async function askPage(body) {
  if (!(await aiAllowed())) return { error: 'off' };
  try {
    const r = await postAI({ ...body, mode: 'ask' }, 50000);
    if (r && r.status === 429) return { error: 'busy' };
    return r && r.ok ? await r.json() : { error: 'failed' };
  } catch { return { error: 'failed' }; }
}

// Synonyms with how common each word is (Datamuse, which uses WordNet and word counts from books and the web).
const synCache = new Map();
const synWait = new Map();
function synonyms(word) {
  if (synCache.has(word)) return Promise.resolve(synCache.get(word));
  if (!synWait.has(word)) synWait.set(word, synonymsNow(word).finally(() => synWait.delete(word)));
  return synWait.get(word);
}
async function synonymsNow(word) {
  const D = 'https://api.datamuse.com/words';
  const f = (x) => Number(((x.tags || []).find((t) => t.startsWith('f:')) || 'f:0').slice(2));
  try {
    const [syn, me] = await Promise.all([fetch(`${D}?rel_syn=${encodeURIComponent(word)}&md=f&max=12`).then((r) => r.json()), fetch(`${D}?sp=${encodeURIComponent(word)}&md=f&max=1`).then((r) => r.json())]);
    const out = { self: me[0] && me[0].word === word ? f(me[0]) : 0, list: syn.map((x) => ({ w: x.word, f: f(x) })) };
    synCache.set(word, out);
    return out;
  } catch { return null; }
}

// Add one word to pairs/{code}.words without touching the others (same document the phone app listens to).
async function pushWord(code, key, w) {
  const str = (v) => ({ stringValue: String(v || '') });
  const fields = { w: str(w.w), m: str(w.m), s: str(w.s), p: str(w.p), place: str(w.place), date: str(w.date) };
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
  if (!creating) creating = chrome.offscreen.createDocument({ url: 'tracker.html', reasons: ['USER_MEDIA'], justification: 'Webcam eye tracking that offers help when you pause on a word' }).finally(() => { creating = null; });
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
// The reading test page (Task A / Task B on a letter). Reuse the tab if it came from there.
async function openPractice(fromTab) {
  const url = chrome.runtime.getURL('practice.html');
  const t = fromTab && await chrome.tabs.get(fromTab).catch(() => null);
  if (t && (t.url || t.pendingUrl || '').startsWith(url)) return chrome.tabs.update(t.id, { active: true });
  await chrome.tabs.create({ url });
}
// Keep eye tracking on after Chrome restarts.
const resume = async () => { const { eyeOn, off } = await chrome.storage.local.get({ eyeOn: false, off: false }); offBadge(off); if (eyeOn && !off) ensureTracker(); };
chrome.runtime.onStartup.addListener(resume);
// The main Linger switch (off on every website): mark the toolbar icon, and turn the camera off while Linger is off.
function offBadge(off) {
  chrome.action.setBadgeText({ text: off ? 'OFF' : '' }).catch(() => {});
  if (off) chrome.action.setBadgeBackgroundColor({ color: '#6B6F80' }).catch(() => {});
}
chrome.storage.onChanged.addListener(async (ch, area) => {
  if (area !== 'local' || !ch.off) return;
  const off = !!ch.off.newValue;
  offBadge(off);
  if (off) closeTracker();
  else { const { eyeOn } = await chrome.storage.local.get({ eyeOn: false }); if (eyeOn) ensureTracker(); }
});
// Chrome only adds content scripts to pages loaded after Linger is installed or updated. Tabs that were already open
// either had no Linger at all ("works on some tabs, not others") or kept an old copy that can't reach the extension.
// Put a fresh copy into every open web page; content.js and gaze.js make the old copy step aside.
async function injectOpenTabs() {
  const files = chrome.runtime.getManifest().content_scripts[0].js;
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter((t) => /^(https?|file):/.test(t.url || '') && !/chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(t.url))
    .map((t) => chrome.scripting.executeScript({ target: { tabId: t.id }, files }).catch(() => {})));
}
// Underline hard words starts off for new installs (people turn it on in the menu). People updating from a version
// where it was on by default keep it on, unless they had turned it off themselves.
async function underlineDefault(reason) {
  const { highlight } = await chrome.storage.local.get('highlight');
  if (highlight === undefined) await chrome.storage.local.set({ highlight: reason === 'update' });
}
chrome.runtime.onInstalled.addListener(async (d) => {
  resume();
  if (d.reason === 'install' || d.reason === 'update') { await underlineDefault(d.reason); injectOpenTabs(); }
  chrome.storage.local.get({ off: false }).then((v) => offBadge(v.off));
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === 'lookup') return reply(await lookup(msg.word));
    if (msg.type === 'synonyms') return reply(await synonyms(msg.word));
    if (msg.type === 'ai') return reply(await askAI(msg));
    if (msg.type === 'ai-ask') return reply(await askPage(msg.body || {}));
    if (msg.type === 'save') {
      const { saved = [], pairCode = '' } = await chrome.storage.local.get({ saved: [], pairCode: '' });
      const list = [{ key: msg.key, ...msg.word, at: Date.now() }, ...saved.filter((x) => x.key !== msg.key)].slice(0, 200);
      await chrome.storage.local.set({ saved: list });
      if (!pairCode) return reply({ ok: true, paired: false });
      try { await pushWord(pairCode, msg.key, msg.word); reply({ ok: true, synced: true }); }
      catch { reply({ ok: true, synced: false, error: true }); }
      return;
    }
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
    if (msg.type === 'open-practice') { await openPractice(null); return reply({ ok: true }); }
    if (msg.type === 'eye-recal') { await openSetup(msg.tabId || (sender.tab && sender.tab.id)); return reply({ ok: true }); }
    if (msg.type === 'eye-ensure') { const { eyeOn, off } = await chrome.storage.local.get({ eyeOn: false, off: false }); if (eyeOn && !off) await ensureTracker(); return reply({ ok: true }); }
    if (msg.type === 'eye-start') { if (msg.restart) await closeTracker(); await ensureTracker(); return reply({ ok: true }); }
    if (msg.type === 'get-model') { const { gazeModel } = await chrome.storage.local.get({ gazeModel: null }); return reply({ model: gazeModel }); }
    if (msg.type === 'save-model') { await chrome.storage.local.set({ gazeModel: msg.model }); return reply({ ok: true }); }
    if (msg.type === 'gaze-problem') { await chrome.storage.local.set({ gazeProblem: { t: Date.now(), site: 'eye tracking', why: msg.why } }); return reply({ ok: true }); }
    if (msg.type === 'calib-done' || msg.type === 'calib-cancel') {
      if (msg.type === 'calib-done') await chrome.storage.local.set({ gazeModel: msg.model, eyeOn: true, gazeProblem: null });
      const { eyeOn } = await chrome.storage.local.get({ eyeOn: false });
      if (!eyeOn) await closeTracker();
      // Go back to the page the person came from (or open the reading test, if they picked that).
      const { setupFrom } = await chrome.storage.session.get({ setupFrom: null });
      if (msg.practice) await openPractice(setupFrom);
      else if (setupFrom) chrome.tabs.update(setupFrom, { active: true }).catch(() => {});
      if (sender.tab) chrome.tabs.remove(sender.tab.id).catch(() => {});
      return reply({ ok: true });
    }
    reply({ ok: false });
  })().catch((e) => reply({ ok: false, error: String(e) }));
  return true; // keep the channel open for the async reply
});

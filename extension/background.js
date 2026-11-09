// Linger background worker: dictionary lookups, saving words, sending them to the phone (Firestore REST),
// and running eye tracking (one hidden tracker page for the whole browser, plus the setup page).
const FIREBASE = { projectId: 'linger-f41a7', apiKey: 'AIzaSyDxWUp1eTp8bXZV-GV13XQAHI_Q4fL0GCU' };
const DOC = (code) => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/pairs/${code}`;

importScripts('dict.js');

// Meaning and an example sentence from Wiktionary.
const dictCache = new Map();
async function lookup(word) {
  if (dictCache.has(word)) return dictCache.get(word);
  try {
    const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word));
    const e = r.ok ? self.lingerDictEntry(await r.json(), word) : { meaning: null, example: null };
    dictCache.set(word, e);
    return e;
  } catch { return { meaning: null, example: null }; }
}

// Synonyms with how common each word is (Datamuse, which uses WordNet and word counts from books and the web).
const synCache = new Map();
async function synonyms(word) {
  if (synCache.has(word)) return synCache.get(word);
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
// The reading test page (Task A / Task B on a letter). Reuse the tab if it came from there.
async function openPractice(fromTab) {
  const url = chrome.runtime.getURL('practice.html');
  const t = fromTab && await chrome.tabs.get(fromTab).catch(() => null);
  if (t && (t.url || t.pendingUrl || '').startsWith(url)) return chrome.tabs.update(t.id, { active: true });
  await chrome.tabs.create({ url });
}
// Keep eye tracking on after Chrome restarts.
const resume = async () => { const { eyeOn } = await chrome.storage.local.get({ eyeOn: false }); if (eyeOn) ensureTracker(); };
chrome.runtime.onStartup.addListener(resume);
chrome.runtime.onInstalled.addListener(resume);

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === 'lookup') return reply(await lookup(msg.word));
    if (msg.type === 'synonyms') return reply(await synonyms(msg.word));
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
    if (msg.type === 'eye-ensure') { const { eyeOn } = await chrome.storage.local.get({ eyeOn: false }); if (eyeOn) await ensureTracker(); return reply({ ok: true }); }
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

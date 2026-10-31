// Linger background worker: dictionary lookups, saving words, sending them to the phone (Firestore REST),
// and running eye tracking (one hidden tracker page for the whole browser, plus the setup page).
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
  const url = chrome.runtime.getURL('calibrate.html');
  const [open] = await chrome.tabs.query({ url });
  if (open) await chrome.tabs.update(open.id, { active: true }); else await chrome.tabs.create({ url });
}
// Keep eye tracking on after Chrome restarts.
const resume = async () => { const { eyeOn } = await chrome.storage.local.get({ eyeOn: false }); if (eyeOn) ensureTracker(); };
chrome.runtime.onStartup.addListener(resume);
chrome.runtime.onInstalled.addListener(resume);

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

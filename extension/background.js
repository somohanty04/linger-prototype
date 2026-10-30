// Linger background worker: dictionary lookups, saving words, sending them to the phone (Firestore REST),
// and starting eye tracking in a tab.
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
    if (msg.type === 'eye-on') {
      await chrome.scripting.executeScript({ target: { tabId: msg.tabId }, files: ['vendor/webgazer.js', 'gaze.js'] });
      return reply({ ok: true });
    }
    if (msg.type === 'eye-off' || msg.type === 'eye-recal' || msg.type === 'eye-secs') {
      await chrome.scripting.executeScript({ target: { tabId: msg.tabId }, func: (t, secs) => { const g = window.__lingerGaze; if (!g) return; if (t === 'eye-off') g.stop(); else if (t === 'eye-recal') g.calibrate(); else g.setSecs(secs); }, args: [msg.type, msg.secs || 3] });
      return reply({ ok: true });
    }
    reply({ ok: false });
  })().catch((e) => reply({ ok: false, error: String(e) }));
  return true; // keep the channel open for the async reply
});

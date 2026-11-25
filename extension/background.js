// Linger background worker: dictionary lookups, AI requests, saving words and sending them to the phone (Firestore REST).
const FIREBASE = { projectId: 'linger-f41a7', apiKey: 'AIzaSyDxWUp1eTp8bXZV-GV13XQAHI_Q4fL0GCU' };
// Tests point the worker at the local Firebase emulators (self.LINGER_EMULATOR); the real extension never sets it.
const EMU = typeof self !== 'undefined' && !!self.LINGER_EMULATOR;
const FS_HOST = EMU ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
const ID_HOST = EMU ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
const TOKEN_HOST = EMU ? 'http://127.0.0.1:9099/securetoken.googleapis.com' : 'https://securetoken.googleapis.com';
const DOC = (code) => `${FS_HOST}/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/pairs/${code}`;

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
// AND the AI explanations switch is on. Every AI request (cards, hover prefetch, swaps, translation, the
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
// ---------- Linger account (the same accounts as the phone app; see ACCOUNTS.md) ----------
// Firebase Authentication and Firestore over REST, so the extension needs no Firebase SDK. The sign-in is kept in
// chrome.storage.local as { uid, email, idToken, refreshToken, exp } and the ID token is refreshed when it expires.
// Saved words go to users/{uid}/words/{key}, the documents the phone app listens to, with the same fields.
const AUTH = (path) => `${ID_HOST}/v1/accounts:${path}?key=${FIREBASE.apiKey}`;
const FS = `${FS_HOST}/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
const AUTH_ERR = {
  EMAIL_EXISTS: 'There’s already an account with this email. Sign in instead.',
  EMAIL_NOT_FOUND: 'That email or password doesn’t match an account.',
  INVALID_PASSWORD: 'That email or password doesn’t match an account.',
  INVALID_LOGIN_CREDENTIALS: 'That email or password doesn’t match an account.',
  INVALID_EMAIL: 'That doesn’t look like an email address.',
  MISSING_PASSWORD: 'Type your password.',
  WEAK_PASSWORD: 'Use a password with at least 6 characters.',
  USER_DISABLED: 'This account was turned off.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many tries. Wait a few minutes and try again.',
  OPERATION_NOT_ALLOWED: 'Accounts aren’t turned on for Linger yet.'
};
class AcctError extends Error {}
async function authPost(url, body, form) {
  let r;
  try {
    r = await fetch(url, form ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch { throw new AcctError('Couldn’t reach Linger. Check your internet connection.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const code = String((j.error && j.error.message) || '').split(' ')[0]; const e = new AcctError(AUTH_ERR[code] || 'Something went wrong. Try again.'); e.code = code; throw e; }
  return j;
}
const keepSignIn = (j) => ({ uid: j.localId || j.user_id, email: j.email || '', idToken: j.idToken || j.id_token, refreshToken: j.refreshToken || j.refresh_token, exp: Date.now() + Number(j.expiresIn || j.expires_in || 3600) * 1000 });
async function account() { return (await chrome.storage.local.get({ acct: null })).acct; }
async function idToken() {
  const a = await account();
  if (!a) return null;
  if (a.exp - Date.now() > 60000) return a;
  try {
    const j = await authPost(`${TOKEN_HOST}/v1/token?key=${FIREBASE.apiKey}`, { grant_type: 'refresh_token', refresh_token: a.refreshToken }, true);
    const next = { ...keepSignIn(j), email: a.email };
    await chrome.storage.local.set({ acct: next });
    return next;
  } catch (e) {
    // The account was deleted, its password changed, or it was turned off: sign out here.
    if (e.code && /TOKEN_EXPIRED|USER_NOT_FOUND|USER_DISABLED|INVALID_REFRESH_TOKEN/.test(e.code)) await chrome.storage.local.set({ acct: null });
    throw e;
  }
}
const str = (v) => ({ stringValue: String(v || '') });
const wordFields = (w) => ({ w: str(w.w), m: str(w.m), s: str(w.s), p: str(w.p), place: str(w.place), date: str(w.date) });
// onlyIfNew: used when uploading the laptop's list after signing in, so a word already in the account keeps its text
// (and its learning progress) from the phone.
async function putAccountWord(key, w, onlyIfNew) {
  const a = await idToken();
  if (!a) return false;
  const url = (q) => `${FS}/users/${a.uid}/words/${encodeURIComponent(key)}?${q}`;
  const now = { timestampValue: new Date().toISOString() };
  const call = (q, fields) => fetch(url(q), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.idToken }, body: JSON.stringify({ fields }) });
  const mask = [...Object.keys(wordFields(w)), 'updatedAt'].map((f) => 'updateMask.fieldPaths=' + f).join('&');
  // Create it (with createdAt) if it's new…
  let r = await call('currentDocument.exists=false', { ...wordFields(w), createdAt: now, updatedAt: now });
  if (r.ok) return true;
  if (r.status !== 400 && r.status !== 409) throw new Error('firestore ' + r.status);
  if (onlyIfNew) return true;
  // …otherwise update just these fields, leaving status, reviews and the rest alone.
  r = await call(mask, { ...wordFields(w), updatedAt: now });
  if (!r.ok) throw new Error('firestore ' + r.status);
  return true;
}
async function startAccount(a, created) {
  const before = await account();
  // A different account on this laptop: the previous one's words leave first, so two people's words never mix.
  if (before && before.uid !== a.uid) await forgetAccountWords(before.uid);
  await chrome.storage.local.set({ acct: a });
  if (created) { // the same profile document the phone app makes
    const now = { timestampValue: new Date().toISOString() };
    await fetch(`${FS}/users/${a.uid}?updateMask.fieldPaths=createdAt&updateMask.fieldPaths=schema`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.idToken }, body: JSON.stringify({ fields: { createdAt: now, schema: { integerValue: '1' } } }) }).catch(() => {});
  }
  const r = await syncNow('signin');
  return { ok: true, email: a.email, uploaded: r.uploaded || 0, added: r.added || 0 };
}
async function acctMessage(msg) {
  try {
    if (msg.type === 'acct-state') { const a = await account(); return { ok: true, email: a ? a.email : '' }; }
    if (msg.type === 'acct-signout') { // like the phone app: the account's words leave this laptop (they stay in the account)
      const a = await account();
      await serial(async () => { if (a) await forgetAccountWords(a.uid); await chrome.storage.local.set({ acct: null }); });
      return { ok: true };
    }
    const email = String(msg.email || '').trim(), password = String(msg.password || '');
    if (msg.type === 'acct-reset') { await authPost(AUTH('sendOobCode'), { requestType: 'PASSWORD_RESET', email }); return { ok: true }; }
    if (msg.type === 'acct-signin') return await startAccount(keepSignIn(await authPost(AUTH('signInWithPassword'), { email, password, returnSecureToken: true })), false);
    if (msg.type === 'acct-signup') return await startAccount(keepSignIn(await authPost(AUTH('signUp'), { email, password, returnSecureToken: true })), true);
  } catch (e) { return { ok: false, error: e instanceof AcctError ? e.message : 'Something went wrong. Try again.' }; }
  return { ok: false };
}

// ---------- Two-way sync of saved words ----------
// The signed-in account's words (users/{uid}/words) are the source of truth; a paired phone's pairs/{code}.words is
// kept in step the same way. This laptop's list (chrome.storage.local "saved") is the offline copy.
// To tell "deleted on the phone" from "saved here while offline", the worker remembers which words it has seen in the
// account (acctSynced[uid]) and in the pairing document (pairSynced[code]):
//   in the account, not here                     → saved elsewhere: add it here (unless it was just deleted here)
//   here, not in the account, seen there before  → deleted elsewhere: remove it here (never upload it again)
//   here, not in the account, never seen there   → saved here (offline, or before signing in): upload it
// Deleting here queues the key (acctDeleted[uid], pairDeleted[code]) until the delete reaches Firestore, so a word
// deleted offline doesn't come back from the account in the meantime. Every sync step runs one at a time (serial),
// so saves, deletes and pulls never interleave.
let chain = Promise.resolve();
function serial(fn) { const run = chain.then(() => fn()); chain = run.catch(() => {}); return run; }
const unstr = (f) => (f && typeof f.stringValue === 'string' ? f.stringValue : '');
const fromFields = (f = {}) => ({ w: unstr(f.w), m: unstr(f.m), s: unstr(f.s), p: unstr(f.p), place: unstr(f.place), date: unstr(f.date) });
const keyOfDoc = (name) => decodeURIComponent(String(name).split('/').pop());
// Every word in the account (paged), as { key: { w, m, s, p, place, date, at } }.
async function listAccountWords(a) {
  const out = {}; let page = '';
  do {
    const r = await fetch(`${FS}/users/${a.uid}/words?pageSize=300${page ? '&pageToken=' + encodeURIComponent(page) : ''}`, { headers: { Authorization: 'Bearer ' + a.idToken } });
    if (!r.ok) throw new Error('firestore ' + r.status);
    const j = await r.json();
    for (const d of j.documents || []) out[keyOfDoc(d.name)] = { ...fromFields(d.fields), at: Date.parse((d.fields && d.fields.createdAt && d.fields.createdAt.timestampValue) || d.createTime) || 0 };
    page = j.nextPageToken || '';
  } while (page);
  return out;
}
async function accountProfileExists(a) {
  const r = await fetch(`${FS}/users/${a.uid}`, { headers: { Authorization: 'Bearer ' + a.idToken } });
  if (r.status === 404) return false;
  if (!r.ok) throw new Error('firestore ' + r.status);
  return true;
}
async function deleteAccountWord(a, key) {
  const r = await fetch(`${FS}/users/${a.uid}/words/${encodeURIComponent(key)}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + a.idToken } });
  if (!r.ok && r.status !== 404) throw new Error('firestore ' + r.status);
}
async function getPairWords(code) {
  const r = await fetch(`${DOC(code)}?key=${FIREBASE.apiKey}`);
  if (r.status === 404) return {};
  if (!r.ok) throw new Error('firestore ' + r.status);
  const j = await r.json(), m = (j.fields && j.fields.words && j.fields.words.mapValue && j.fields.words.mapValue.fields) || {};
  const out = {};
  for (const [k, v] of Object.entries(m)) { const f = (v.mapValue && v.mapValue.fields) || {}; if (unstr(f.w)) out[k] = { ...fromFields(f), at: 0 }; }
  return out;
}
// Remove one word from the pairing document: a field mask naming it, with no value, deletes just that word.
async function removePairWord(code, key) {
  const path = 'words.`' + key.replace(/`/g, '') + '`';
  const r = await fetch(`${DOC(code)}?key=${FIREBASE.apiKey}&updateMask.fieldPaths=${encodeURIComponent(path)}&currentDocument.exists=true`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} }) });
  if (!r.ok && r.status !== 404 && r.status !== 400) throw new Error('firestore ' + r.status);
}
const SAVED_MAX = 1000;
const WORD_FIELDS = ['w', 'm', 's', 'p', 'place', 'date'];
// One side (the account or a pairing document) against the local list. Returns { saved, seen, pending, added, dropped, uploaded }.
async function reconcileWith(side, remote, saved, seen, pending, ignore = new Set()) {
  const local = new Map(saved.map((x) => [x.key, x]));
  // Deletes made here first (unless the word was saved again since).
  for (const k of [...pending]) {
    if (local.has(k)) { pending.delete(k); continue; }
    if (remote[k]) { try { await side.remove(k); delete remote[k]; } catch { continue; } }
    pending.delete(k); seen.delete(k);
  }
  const addHere = [], dropHere = new Set(); let uploaded = 0;
  for (const [k, r] of Object.entries(remote)) {
    if (pending.has(k)) continue;
    ignore.delete(k); // shared now
    const x = local.get(k);
    if (!x) addHere.push({ key: k, ...r, at: r.at || Date.now() });
    else WORD_FIELDS.forEach((f) => { if (r[f] && r[f] !== x[f]) x[f] = r[f]; }); // the shared copy's text wins
  }
  for (const [k, x] of local) {
    if (remote[k] || ignore.has(k)) continue; // ignore: kept here, never sent (see the pairing note in syncNow)
    if (seen.has(k)) { dropHere.add(k); seen.delete(k); continue; } // deleted on the phone (or another laptop)
    try { await side.put(k, x); remote[k] = x; uploaded++; } catch {}   // saved here: send it up
  }
  const next = [...addHere, ...saved.filter((x) => !dropHere.has(x.key))].sort((p, q) => (q.at || 0) - (p.at || 0)).slice(0, SAVED_MAX);
  const nextSeen = new Set(next.map((x) => x.key).filter((k) => remote[k]));
  return { saved: next, seen: nextSeen, pending, ignore, added: addHere.length, dropped: dropHere.size, uploaded };
}
// Words that came from (or went to) this account leave the laptop; the account keeps them.
async function forgetAccountWords(uid) {
  const st = await chrome.storage.local.get({ saved: [], acctSynced: {}, acctDeleted: {} });
  const mine = new Set(st.acctSynced[uid] || []);
  await chrome.storage.local.set({ saved: st.saved.filter((x) => !mine.has(x.key)) });
}
let lastSync = 0;
// Pull and push both sides. reason: 'signin' | 'open' (menu or a word card opened) | 'alarm' | 'save' | 'unsave'.
function syncNow(reason) {
  return serial(async () => {
    const out = { ok: true, added: 0, dropped: 0, uploaded: 0 };
    let st = await chrome.storage.local.get({ saved: [], acct: null, pairCode: '', acctSynced: {}, acctDeleted: {}, pairSynced: {}, pairDeleted: {}, pairIgnore: {} });
    let saved = st.saved.slice(); const acctSynced = { ...st.acctSynced }, acctDeleted = { ...st.acctDeleted }, pairSynced = { ...st.pairSynced }, pairDeleted = { ...st.pairDeleted }, pairIgnore = { ...st.pairIgnore };
    if (st.acct) {
      let a = null; try { a = await idToken(); } catch {}
      if (a) {
        try {
          const remote = await listAccountWords(a);
          // Never synced on this laptop while already signed in (an older version uploaded without keeping track):
          // treat its whole list as already sent, so words deleted on the phone don't come back.
          if (!(a.uid in acctSynced) && reason !== 'signin') acctSynced[a.uid] = saved.map((x) => x.key);
          const seen = new Set(acctSynced[a.uid] || []), pending = new Set(acctDeleted[a.uid] || []);
          // Every word gone: either they deleted them all on the phone, or the account itself was deleted.
          if (!Object.keys(remote).length && seen.size && !(await accountProfileExists(a))) {
            saved = saved.filter((x) => !seen.has(x.key)); delete acctSynced[a.uid]; delete acctDeleted[a.uid];
            await chrome.storage.local.set({ saved, acctSynced, acctDeleted, acct: null });
            return { ...out, signedOut: true };
          }
          const side = { put: (k, x) => putAccountWord(k, x, true), remove: (k) => deleteAccountWord(a, k) };
          const r = await reconcileWith(side, remote, saved, seen, pending);
          saved = r.saved; acctSynced[a.uid] = [...r.seen]; acctDeleted[a.uid] = [...r.pending];
          out.added += r.added; out.dropped += r.dropped; out.uploaded += r.uploaded;
        } catch { out.ok = false; } // offline or Firestore busy: try again on the next sync
      }
    }
    if (st.pairCode) {
      try {
        const code = st.pairCode, remote = await getPairWords(code);
        // Paired before this version: words only here were either saved before pairing (never sent) or deleted on the
        // phone; Linger can't tell which, so they stay on this laptop but aren't sent to the phone (pairIgnore).
        // A code connected from now on starts fresh (pairSynced[code] = [], set when the code changes).
        if (!(code in pairSynced)) { pairSynced[code] = saved.map((x) => x.key).filter((k) => remote[k]); pairIgnore[code] = saved.map((x) => x.key).filter((k) => !remote[k]); }
        const side = { put: (k, x) => pushWord(code, k, x), remove: (k) => removePairWord(code, k) };
        const r = await reconcileWith(side, remote, saved, new Set(pairSynced[code] || []), new Set(pairDeleted[code] || []), new Set(pairIgnore[code] || []));
        saved = r.saved; pairSynced[code] = [...r.seen]; pairDeleted[code] = [...r.pending]; pairIgnore[code] = [...r.ignore];
        out.added += r.added; out.dropped += r.dropped; out.uploaded += r.uploaded;
      } catch { out.ok = false; }
    }
    // Write only what changed (the menu and word cards redraw from chrome.storage.onChanged).
    const now = await chrome.storage.local.get({ saved: [] });
    const changed = JSON.stringify(now.saved.map((x) => [x.key, ...WORD_FIELDS.map((f) => x[f])])) !== JSON.stringify(saved.map((x) => [x.key, ...WORD_FIELDS.map((f) => x[f])]));
    await chrome.storage.local.set({ ...(changed ? { saved } : {}), acctSynced, acctDeleted, pairSynced, pairDeleted, pairIgnore, syncAt: Date.now(), syncOk: out.ok });
    lastSync = Date.now();
    return out;
  });
}
// A pull when something shows saved words (menu, a word card), at most every 15 s; and every minute in the background.
const syncSoon = () => (Date.now() - lastSync > 15000 ? syncNow('open') : Promise.resolve({ ok: true, skipped: true }));
// A newly connected code starts fresh: this laptop's words go to the phone, the phone's come here.
chrome.storage.onChanged.addListener(async (ch, area) => {
  if (area !== 'local' || !ch.pairCode || !ch.pairCode.newValue) return;
  const code = ch.pairCode.newValue, { pairSynced = {} } = await chrome.storage.local.get({ pairSynced: {} });
  if (!(code in pairSynced)) await chrome.storage.local.set({ pairSynced: { ...pairSynced, [code]: [] } });
  lastSync = 0; syncNow('pair');
});
if (chrome.alarms) {
  chrome.alarms.create('linger-sync', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((al) => { if (al.name === 'linger-sync') syncNow('alarm'); });
}
// Save: on this laptop right away, then to the account and the paired phone.
function saveWord(key, word) {
  return serial(async () => {
    const st = await chrome.storage.local.get({ saved: [], pairCode: '', acct: null, acctSynced: {}, acctDeleted: {}, pairSynced: {}, pairDeleted: {} });
    const list = [{ key, ...word, at: Date.now() }, ...st.saved.filter((x) => x.key !== key)].slice(0, SAVED_MAX);
    const acctDeleted = { ...st.acctDeleted }, pairDeleted = { ...st.pairDeleted }, acctSynced = { ...st.acctSynced }, pairSynced = { ...st.pairSynced };
    const uid = st.acct && st.acct.uid;
    if (uid) acctDeleted[uid] = (acctDeleted[uid] || []).filter((k) => k !== key);
    if (st.pairCode) pairDeleted[st.pairCode] = (pairDeleted[st.pairCode] || []).filter((k) => k !== key);
    const pairIgnore = { ...(await chrome.storage.local.get({ pairIgnore: {} })).pairIgnore };
    if (st.pairCode && pairIgnore[st.pairCode]) pairIgnore[st.pairCode] = pairIgnore[st.pairCode].filter((k) => k !== key); // saved again on purpose: share it
    await chrome.storage.local.set({ saved: list, acctDeleted, pairDeleted, pairIgnore });
    if (!st.pairCode && !st.acct) return { ok: true, paired: false };
    const tries = await Promise.allSettled([st.acct ? putAccountWord(key, word) : null, st.pairCode ? pushWord(st.pairCode, key, word) : null]);
    const toAcct = !!st.acct && tries[0].status === 'fulfilled' && tries[0].value !== false, toPair = !!st.pairCode && tries[1].status === 'fulfilled';
    if (toAcct) acctSynced[uid] = [...new Set([...(acctSynced[uid] || []), key])];
    if (toPair) pairSynced[st.pairCode] = [...new Set([...(pairSynced[st.pairCode] || []), key])];
    await chrome.storage.local.set({ acctSynced, pairSynced });
    const sent = toAcct || toPair;
    return { ok: true, synced: sent, account: toAcct, error: !sent };
  });
}
// Unsave: off this laptop right away; the delete is queued until it reaches the account and the paired phone.
function unsaveWord(key) {
  return serial(async () => {
    const st = await chrome.storage.local.get({ saved: [], pairCode: '', acct: null, acctDeleted: {}, pairDeleted: {} });
    const acctDeleted = { ...st.acctDeleted }, pairDeleted = { ...st.pairDeleted }, uid = st.acct && st.acct.uid;
    if (uid) acctDeleted[uid] = [...new Set([...(acctDeleted[uid] || []), key])];
    if (st.pairCode) pairDeleted[st.pairCode] = [...new Set([...(pairDeleted[st.pairCode] || []), key])];
    await chrome.storage.local.set({ saved: st.saved.filter((x) => x.key !== key), acctDeleted, pairDeleted });
    return { ok: true, queued: !!(uid || st.pairCode) };
  }).then(async (r) => { if (r.queued) { lastSync = 0; await syncNow('unsave'); } return r; });
}

// What the menu can tell apart about a code: 'found' (the phone has used it), 'new' (no document yet: either a fresh
// code from a phone with no saved words, or a typo; codes never expire, so Linger can't tell which), 'denied' (Firestore
// refused it), 'offline' (no connection at all) or 'error' (Linger's server didn't answer properly).
async function checkCode(code) {
  let r;
  try { r = await fetch(`${DOC(code)}?key=${FIREBASE.apiKey}`); } catch { return 'offline'; }
  return r.ok ? 'found' : r.status === 404 ? 'new' : r.status === 403 || r.status === 400 ? 'denied' : 'error';
}

// "Not working on this site?" in the menu: one document in feedback/{autoId}, the collection the beta app's feedback
// goes to. firestore.rules only allows its listed fields (text, kind, screen, email, version, platform, ua, at,
// sentAt…), so the site and note go into text, and sentAt is set by the server (the rule wants it to equal request.time).
function siteReportWrite(site, note) {
  const str = (v) => ({ stringValue: String(v) });
  const host = String(site || '').slice(0, 200), extra = String(note || '').trim().slice(0, 500);
  const text = `Linger for Chrome isn't working on ${host || 'a page'}` + (extra ? `\n\n${extra}` : '');
  const id = [...crypto.getRandomValues(new Uint8Array(20))].map((n) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[n % 62]).join('');
  const fields = { text: str(text), kind: str('bug'), screen: str('extension:not-working'), email: str(''), version: str(chrome.runtime.getManifest().version), platform: str('chrome-extension'), ua: str(navigator.userAgent.slice(0, 300)), at: str(new Date().toISOString()) };
  const name = `projects/${FIREBASE.projectId}/databases/(default)/documents/feedback/${id}`; // (always production)
  return { writes: [{ update: { name, fields }, updateTransforms: [{ fieldPath: 'sentAt', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] };
}
async function sendSiteReport(site, note) {
  let r;
  try { r = await fetch(`${FS}:commit?key=${FIREBASE.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(siteReportWrite(site, note)) }); }
  catch { return { ok: false, why: 'offline' }; }
  return r.ok ? { ok: true } : { ok: false, why: 'error', status: r.status };
}

// Settings left over from the removed eye tracking and hand gestures (including the saved gaze model).
const OLD_KEYS = ['eyeOn', 'handOn', 'gazeModel', 'gazeProblem', 'gazeEnv', 'gazeSnooze', 'pauseSecs', 'showGaze', 'spread', 'handSwipe', 'handSecs', 'handLog', 'gazeLog'];
const resume = async () => { const { off } = await chrome.storage.local.get({ off: false }); offBadge(off); };
chrome.runtime.onStartup.addListener(resume);
// The main Linger switch (off on every website): mark the toolbar icon.
function offBadge(off) {
  chrome.action.setBadgeText({ text: off ? 'OFF' : '' }).catch(() => {});
  if (off) chrome.action.setBadgeBackgroundColor({ color: '#6B6F80' }).catch(() => {});
}
chrome.storage.onChanged.addListener(async (ch, area) => {
  if (area !== 'local') return;
  if (ch.off) offBadge(!!ch.off.newValue);
});
// Chrome only adds content scripts to pages loaded after Linger is installed or updated. Tabs that were already open
// either had no Linger at all ("works on some tabs, not others") or kept an old copy that can't reach the extension.
// Put a fresh copy into every open web page; content.js makes the old copy step aside.
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
  if (d.reason === 'update') chrome.storage.local.remove(OLD_KEYS);
  if (d.reason === 'install' || d.reason === 'update') { await underlineDefault(d.reason); injectOpenTabs(); }
  chrome.storage.local.get({ off: false }).then((v) => offBadge(v.off));
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === 'lookup') return reply(await lookup(msg.word));
    if (msg.type === 'synonyms') return reply(await synonyms(msg.word));
    if (msg.type === 'ai') return reply(await askAI(msg));
    if (msg.type === 'ai-ask') return reply(await askPage(msg.body || {}));
    if (msg.type === 'save') return reply(await saveWord(msg.key, msg.word));
    if (msg.type === 'unsave') return reply(await unsaveWord(msg.key));
    if (msg.type === 'sync-now') return reply(await (msg.force ? syncNow('open') : syncSoon()));
    if (msg.type === 'check-code') return reply({ result: await checkCode(msg.code) });
    if (msg.type === 'site-report') return reply(await sendSiteReport(msg.site, msg.note));
    if (msg.type && msg.type.startsWith('acct-')) return reply(await acctMessage(msg));
    reply({ ok: false });
  })().catch((e) => reply({ ok: false, error: String(e) }));
  return true; // keep the channel open for the async reply
});

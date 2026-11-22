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
// ---------- Linger account (the same accounts as the phone app; see ACCOUNTS.md) ----------
// Firebase Authentication and Firestore over REST, so the extension needs no Firebase SDK. The sign-in is kept in
// chrome.storage.local as { uid, email, idToken, refreshToken, exp } and the ID token is refreshed when it expires.
// Saved words go to users/{uid}/words/{key}, the documents the phone app listens to, with the same fields.
const AUTH = (path) => `https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${FIREBASE.apiKey}`;
const FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
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
    const j = await authPost(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`, { grant_type: 'refresh_token', refresh_token: a.refreshToken }, true);
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
async function uploadSaved() {
  const { saved = [] } = await chrome.storage.local.get({ saved: [] });
  let n = 0;
  for (const x of saved) { try { if (x.key && x.w) { await putAccountWord(x.key, x, true); n++; } } catch {} }
  return n;
}
async function startAccount(a, created) {
  await chrome.storage.local.set({ acct: a });
  if (created) { // the same profile document the phone app makes
    const now = { timestampValue: new Date().toISOString() };
    await fetch(`${FS}/users/${a.uid}?updateMask.fieldPaths=createdAt&updateMask.fieldPaths=schema`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.idToken }, body: JSON.stringify({ fields: { createdAt: now, schema: { integerValue: '1' } } }) }).catch(() => {});
  }
  const uploaded = await uploadSaved();
  return { ok: true, email: a.email, uploaded };
}
async function acctMessage(msg) {
  try {
    if (msg.type === 'acct-state') { const a = await account(); return { ok: true, email: a ? a.email : '' }; }
    if (msg.type === 'acct-signout') { await chrome.storage.local.set({ acct: null }); return { ok: true }; }
    const email = String(msg.email || '').trim(), password = String(msg.password || '');
    if (msg.type === 'acct-reset') { await authPost(AUTH('sendOobCode'), { requestType: 'PASSWORD_RESET', email }); return { ok: true }; }
    if (msg.type === 'acct-signin') return await startAccount(keepSignIn(await authPost(AUTH('signInWithPassword'), { email, password, returnSecureToken: true })), false);
    if (msg.type === 'acct-signup') return await startAccount(keepSignIn(await authPost(AUTH('signUp'), { email, password, returnSecureToken: true })), true);
  } catch (e) { return { ok: false, error: e instanceof AcctError ? e.message : 'Something went wrong. Try again.' }; }
  return { ok: false };
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
  const name = `projects/${FIREBASE.projectId}/databases/(default)/documents/feedback/${id}`;
  return { writes: [{ update: { name, fields }, updateTransforms: [{ fieldPath: 'sentAt', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] };
}
async function sendSiteReport(site, note) {
  let r;
  try { r = await fetch(`${FS}:commit?key=${FIREBASE.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(siteReportWrite(site, note)) }); }
  catch { return { ok: false, why: 'offline' }; }
  return r.ok ? { ok: true } : { ok: false, why: 'error', status: r.status };
}

// ---------- eye tracker page ----------
let creating = null;
async function hasTracker() { return (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0; }
async function ensureTracker() {
  if (await hasTracker()) return;
  if (!creating) creating = chrome.offscreen.createDocument({ url: 'tracker.html', reasons: ['USER_MEDIA'], justification: 'Webcam eye tracking and hand gestures that offer help with words' }).finally(() => { creating = null; });
  await creating;
}
async function closeTracker() { if (await hasTracker()) await chrome.offscreen.closeDocument().catch(() => {}); }
// The camera runs while eye tracking or hand gestures is on (and Linger isn't switched off everywhere).
async function syncTracker() {
  const { eyeOn, handOn, off } = await chrome.storage.local.get({ eyeOn: false, handOn: false, off: false });
  if ((eyeOn || handOn) && !off) await ensureTracker(); else await closeTracker();
}
// Hand gestures: Chrome's own zoom steps for this tab.
const ZOOMS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
async function zoomTab(tabId, dir) {
  const now = await chrome.tabs.getZoom(tabId);
  let i = ZOOMS.findIndex((z) => z >= now - 0.01);
  if (i < 0) i = ZOOMS.length - 1;
  const next = dir === 'reset' ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + (dir === 'in' ? (ZOOMS[i] > now + 0.01 ? 0 : 1) : -1)))];
  if (Math.abs(next - now) > 0.001) await chrome.tabs.setZoom(tabId, next);
  return next;
}
// The hand gestures page: asks for the camera once, and lets people practise each gesture.
async function openHands() {
  const url = chrome.runtime.getURL('hands.html');
  const { handsTab } = await chrome.storage.session.get({ handsTab: null });
  const open = handsTab && await chrome.tabs.get(handsTab).catch(() => null);
  if (open && (open.url || open.pendingUrl || '').startsWith(url)) { await chrome.tabs.update(open.id, { active: true }); return; }
  const tab = await chrome.tabs.create({ url });
  await chrome.storage.session.set({ handsTab: tab.id });
}
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
const resume = async () => { const { off } = await chrome.storage.local.get({ off: false }); offBadge(off); syncTracker(); };
chrome.runtime.onStartup.addListener(resume);
// The main Linger switch (off on every website): mark the toolbar icon, and turn the camera off while Linger is off.
function offBadge(off) {
  chrome.action.setBadgeText({ text: off ? 'OFF' : '' }).catch(() => {});
  if (off) chrome.action.setBadgeBackgroundColor({ color: '#6B6F80' }).catch(() => {});
}
chrome.storage.onChanged.addListener(async (ch, area) => {
  if (area !== 'local') return;
  if (ch.off) offBadge(!!ch.off.newValue);
  if (ch.off || ch.handOn) syncTracker();
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
      const { saved = [], pairCode = '', acct = null } = await chrome.storage.local.get({ saved: [], pairCode: '', acct: null });
      const list = [{ key: msg.key, ...msg.word, at: Date.now() }, ...saved.filter((x) => x.key !== msg.key)].slice(0, 200);
      await chrome.storage.local.set({ saved: list });
      if (!pairCode && !acct) return reply({ ok: true, paired: false });
      // To the account (if signed in) and to a paired phone (if any); either one reaching Linger counts.
      const tries = await Promise.allSettled([acct ? putAccountWord(msg.key, msg.word) : null, pairCode ? pushWord(pairCode, msg.key, msg.word) : null]);
      const sent = tries.some((t, i) => (i === 0 ? acct : pairCode) && t.status === 'fulfilled');
      return reply({ ok: true, synced: sent, account: !!acct && tries[0].status === 'fulfilled', error: !sent });
    }
    if (msg.type === 'check-code') return reply({ result: await checkCode(msg.code) });
    if (msg.type === 'site-report') return reply(await sendSiteReport(msg.site, msg.note));
    if (msg.type && msg.type.startsWith('acct-')) return reply(await acctMessage(msg));
    // ---------- eye tracking ----------
    if (msg.type === 'eye-on') {
      const { gazeModel } = await chrome.storage.local.get({ gazeModel: null });
      if (!gazeModel) { await openSetup(msg.tabId); return reply({ ok: true, setup: true }); }
      await chrome.storage.local.set({ eyeOn: true, gazeProblem: null });
      await ensureTracker();
      return reply({ ok: true });
    }
    if (msg.type === 'eye-off') { await chrome.storage.local.set({ eyeOn: false }); await syncTracker(); return reply({ ok: true }); }
    // ---------- hand gestures ----------
    if (msg.type === 'hand-zoom') { if (!sender.tab) return reply({ ok: false }); return reply({ ok: true, zoom: await zoomTab(sender.tab.id, msg.dir) }); }
    if (msg.type === 'hand-setup') { await openHands(); return reply({ ok: true }); }
    if (msg.type === 'hand-ensure') { await syncTracker(); return reply({ ok: true }); }
    if (msg.type === 'open-practice') { await openPractice(null); return reply({ ok: true }); }
    if (msg.type === 'eye-recal') { await openSetup(msg.tabId || (sender.tab && sender.tab.id)); return reply({ ok: true }); }
    if (msg.type === 'eye-ensure') { const { eyeOn, off } = await chrome.storage.local.get({ eyeOn: false, off: false }); if (eyeOn && !off) await ensureTracker(); return reply({ ok: true }); }
    if (msg.type === 'camera-ready') { await closeTracker(); await syncTracker(); return reply({ ok: true }); } // camera just allowed: restart
    if (msg.type === 'eye-start') { if (msg.restart) await closeTracker(); await ensureTracker(); return reply({ ok: true }); }
    if (msg.type === 'get-model') { const { gazeModel } = await chrome.storage.local.get({ gazeModel: null }); return reply({ model: gazeModel }); }
    if (msg.type === 'save-model') { await chrome.storage.local.set({ gazeModel: msg.model }); return reply({ ok: true }); }
    // Light and faces in the camera picture (tracker.js runs in an offscreen page, which can't use chrome.storage).
    if (msg.type === 'gaze-env') { await chrome.storage.local.set({ gazeEnv: { t: Date.now(), dark: !!msg.dark, faces: Number(msg.faces) || 0 } }); return reply({ ok: true }); }
    if (msg.type === 'gaze-problem') { await chrome.storage.local.set({ gazeProblem: { t: Date.now(), site: 'eye tracking', why: msg.why } }); return reply({ ok: true }); }
    if (msg.type === 'calib-done' || msg.type === 'calib-cancel') {
      if (msg.type === 'calib-done') await chrome.storage.local.set({ gazeModel: msg.model, eyeOn: true, gazeProblem: null });
      await syncTracker();
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

// Runs the extension's real background.js against the Firebase emulators and checks that signing up, signing in,
// saving words and the upload of the laptop's saved list all land in users/{uid}/words, where the phone app reads them.
//   npx firebase-tools emulators:start --only auth,firestore --project linger-f41a7
//   node tests/extension-account.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dir = new URL('../extension/', import.meta.url);
const store = {};
let listener = null;
const chrome = {
  storage: {
    local: {
      get: async (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, k in store ? store[k] : v])),
      set: async (o) => { Object.assign(store, o); }
    },
    session: { get: async (d) => d, set: async () => {} },
    onChanged: { addListener() {} }
  },
  runtime: { onMessage: { addListener: (f) => { listener = f; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getContexts: async () => [] },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
  tabs: { onRemoved: { addListener() {} }, onUpdated: { addListener() {} } },
  offscreen: {}, scripting: {}
};
// Point the real Google endpoints at the emulators.
const emu = (u) => String(u)
  .replace('https://identitytoolkit.googleapis.com/', 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/')
  .replace('https://securetoken.googleapis.com/', 'http://127.0.0.1:9099/securetoken.googleapis.com/')
  .replace('https://firestore.googleapis.com/', 'http://127.0.0.1:8080/');
const ctx = vm.createContext({
  chrome, console, URL, URLSearchParams, setTimeout, clearTimeout, Date, JSON, Promise, Error, encodeURIComponent,
  fetch: (u, o) => globalThis.fetch(emu(u), o),
  importScripts: (...files) => files.forEach((f) => vm.runInContext(readFileSync(new URL(f, dir), 'utf8'), ctx))
});
ctx.self = ctx;
vm.runInContext(readFileSync(new URL('background.js', dir), 'utf8'), ctx);
const send = (msg) => new Promise((res) => listener(msg, {}, res));

const FS = 'http://127.0.0.1:8080/v1/projects/linger-f41a7/databases/(default)/documents';
const words = async (a) => {
  const r = await fetch(`${FS}/users/${a.uid}/words`, { headers: { Authorization: 'Bearer ' + a.idToken } });
  const j = await r.json();
  return Object.fromEntries((j.documents || []).map((d) => [decodeURIComponent(d.name.split('/').pop()), Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue ?? v.timestampValue ?? v.integerValue]))]));
};

const email = `t${Date.now()}@example.com`;
// 1. A word saved before signing in stays on the laptop…
store.saved = [{ key: 'arrears', w: 'arrears', m: 'Money owed that is late', s: 'Your rent is in arrears.', p: '', place: 'example.com', date: 'Nov 18', at: 1 }];
let r = await send({ type: 'save', key: 'lessor', word: { w: 'lessor', m: 'The owner who rents out a place', s: 'The lessor owns the building.', p: '', place: 'example.com', date: 'Nov 18' } });
assert.equal(r.paired, false, 'not signed in: saved only on the laptop');

// 2. …and goes to the account on sign-up, along with the rest of the saved list.
assert.equal((await send({ type: 'acct-signup', email, password: 'short' })).ok, false, 'weak password refused');
r = await send({ type: 'acct-signup', email, password: 'linger-test-1' });
assert.equal(r.ok, true, 'sign up: ' + JSON.stringify(r));
assert.equal(r.uploaded, 2);
const a = store.acct;
let w = await words(a);
assert.deepEqual(Object.keys(w).sort(), ['arrears', 'lessor']);
assert.equal(w.lessor.m, 'The owner who rents out a place');
assert.ok(w.lessor.createdAt && w.lessor.updatedAt);

// 3. Saving while signed in writes straight to the account.
r = await send({ type: 'save', key: 'premises', word: { w: 'premises', m: 'The building and land', s: 'No pets on the premises.', p: '', place: 'example.com', date: 'Nov 18' } });
assert.deepEqual([r.synced, r.account], [true, true]);
w = await words(a);
assert.equal(w.premises.s, 'No pets on the premises.');

// 4. Saving a word again updates its text but keeps fields the phone added (status, learning progress).
await fetch(`${FS}/users/${a.uid}/words/premises?updateMask.fieldPaths=status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.idToken }, body: JSON.stringify({ fields: { status: { stringValue: 'mastered' } } }) });
await send({ type: 'save', key: 'premises', word: { w: 'premises', m: 'A building and the land around it', s: 'No pets on the premises.', p: '', place: 'example.com', date: 'Nov 18' } });
w = await words(a);
assert.equal(w.premises.m, 'A building and the land around it');
assert.equal(w.premises.status, 'mastered');

// 5. Sign out, sign back in (wrong password first); an expired token is refreshed.
await send({ type: 'acct-signout' });
assert.equal(store.acct, null);
assert.match((await send({ type: 'acct-signin', email, password: 'nope-nope' })).error, /doesn’t match/);
r = await send({ type: 'acct-signin', email, password: 'linger-test-1' });
assert.equal(r.ok, true);
store.acct = { ...store.acct, exp: 0 };
r = await send({ type: 'save', key: 'sublet', word: { w: 'sublet', m: 'Rent your place to someone else', s: '', p: '', place: '', date: '' } });
assert.equal(r.account, true, 'saved after refreshing the token');
assert.ok(store.acct.exp > Date.now());
assert.deepEqual(Object.keys(await words(store.acct)).sort(), ['arrears', 'lessor', 'premises', 'sublet']);

// 6. Another account can't read these words.
const b = (await send({ type: 'acct-signup', email: 'other' + email, password: 'linger-test-2' }), store.acct);
const peek = await fetch(`${FS}/users/${a.uid}/words`, { headers: { Authorization: 'Bearer ' + b.idToken } });
assert.equal(peek.status, 403, 'other accounts are blocked by the rules');

console.log('extension account: all checks passed');

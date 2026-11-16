// Security-rule tests for accounts and pairing, against the Firebase emulators (never the live project).
// 1. npx firebase-tools emulators:start --only auth,firestore --project linger-f41a7
// 2. node tests/accounts.rules.test.mjs
// Uses real sign-in tokens from the Auth emulator and the Firestore REST API, so firestore.rules is what decides.
const PROJECT = 'linger-f41a7';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts';
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const run = Date.now().toString(36);

async function signUp(email) {
  const r = await fetch(`${AUTH}:signUp?key=emulator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'test-pass-123', returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error('sign-up failed: ' + JSON.stringify(j)); return { uid: j.localId, token: j.idToken };
}
const val = (v) => (typeof v === 'string' ? { stringValue: v } : typeof v === 'number' ? { integerValue: String(v) } : v);
const body = (o) => JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)])) });
async function req(method, path, who, data) {
  const h = { 'Content-Type': 'application/json' }; if (who) h.Authorization = 'Bearer ' + who.token;
  const r = await fetch(`${DB}/${path}`, { method, headers: h, body: data ? body(data) : undefined });
  return r.status;
}
let pass = 0, fail = 0;
async function expect(name, p, ok) {
  const s = await p, good = ok ? s === 200 : s === 403;
  console.log(`${good ? '✓' : '✗'} ${name} → ${s}${good ? '' : ok ? ' (expected allowed)' : ' (expected denied)'}`);
  good ? pass++ : fail++;
}

const alice = await signUp(`alice-${run}@example.com`), bob = await signUp(`bob-${run}@example.com`);
const word = { w: 'arrears', m: 'Money owed that is already late.', s: 'Any arrears must be remitted by the 1st.', p: 'late rent', place: 'Lease letter', date: 'Nov 16' };
const A = `users/${alice.uid}`;

console.log('Own data');
await expect('alice creates her profile', req('PATCH', A, alice, { schema: 1 }), true);
await expect('alice saves a word', req('PATCH', `${A}/words/arrears`, alice, word), true);
await expect('alice reads her word', req('GET', `${A}/words/arrears`, alice), true);
await expect('alice lists her words', req('GET', `${A}/words`, alice), true);
await expect('alice adds a future field (status: mastered, lookups)', req('PATCH', `${A}/words/arrears`, alice, { ...word, status: 'mastered', lookups: 3 }), true);
await expect('alice deletes her word', req('DELETE', `${A}/words/arrears`, alice), true);
await req('PATCH', `${A}/words/arrears`, alice, word);

console.log('Other accounts and signed-out users');
await expect('bob reads alice’s word', req('GET', `${A}/words/arrears`, bob), false);
await expect('bob lists alice’s words', req('GET', `${A}/words`, bob), false);
await expect('bob reads alice’s profile', req('GET', A, bob), false);
await expect('bob writes into alice’s words', req('PATCH', `${A}/words/hacked`, bob, word), false);
await expect('bob overwrites alice’s word', req('PATCH', `${A}/words/arrears`, bob, { ...word, m: 'changed' }), false);
await expect('bob deletes alice’s word', req('DELETE', `${A}/words/arrears`, bob), false);
await expect('signed-out read of alice’s words', req('GET', `${A}/words`, null), false);
await expect('signed-out write into alice’s words', req('PATCH', `${A}/words/x`, null, word), false);

console.log('Bad data');
await expect('word without w', req('PATCH', `${A}/words/nw`, alice, { m: 'x' }), false);
await expect('w longer than 80', req('PATCH', `${A}/words/long`, alice, { ...word, w: 'x'.repeat(81) }), false);
await expect('meaning longer than 2000', req('PATCH', `${A}/words/longm`, alice, { ...word, m: 'x'.repeat(2001) }), false);
await expect('status not learning/mastered', req('PATCH', `${A}/words/st`, alice, { ...word, status: 'done' }), false);
await expect('more than 40 fields', req('PATCH', `${A}/words/many`, alice, { ...word, ...Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['f' + i, 'x'])) }), false);

console.log('Pairing codes (unchanged rules)');
const code = 'test' + run.padEnd(8, '0').slice(0, 8);
await expect('anyone creates a pairing document', req('PATCH', `pairs/${code}`, null, { words: { mapValue: { fields: { arrears: { mapValue: { fields: { w: { stringValue: 'arrears' } } } } } } } }), true);
await expect('anyone with the code reads it', req('GET', `pairs/${code}`, null), true);
await expect('pairing document can’t be deleted', req('DELETE', `pairs/${code}`, null), false);
await expect('pairing document with other fields', req('PATCH', `pairs/${code}x`, null, { words: { mapValue: {} }, other: 'x' }), false);
await expect('code shorter than 10', req('PATCH', `pairs/short`, null, { words: { mapValue: {} } }), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

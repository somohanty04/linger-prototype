// Linger accounts: sign in with email and password (Firebase Authentication, the same Firebase project as sync.js)
// and keep saved words under the account, so every device you sign in on has the same list.
//
// Data (see firestore.rules):
//   users/{uid}               profile: { createdAt, schema }
//   users/{uid}/words/{key}   one document per saved word, key = the app's word key (keyOf), with the same fields the
//                             pairing sync uses: w, m, s, p, place, date (all strings), plus createdAt, updatedAt.
//                             Later features add their own fields to the same document (status: 'learning' |
//                             'mastered', lookups, familiarity, reviews…). This file never overwrites fields it
//                             doesn't know, and a missing status means "learning".
//
// Syncing both ways, safely:
//   - Words only on this device are uploaded; words only in the account are added here. A word in both keeps the
//     account's text, and any field the account is missing is filled in from this device. So signing in for the first
//     time merges the two lists by word, with no duplicates and nothing lost.
//   - A word is deleted from the account only when you remove it here (tracked as a pending deletion, so it also works
//     after going offline), never just because it is missing on a device.
//   - A word deleted on another device is removed here (it was in the account before and now isn't).
//   - Before the first sign-in on this device, a copy of the saved words is kept in localStorage
//     (linger.words.v1.backup.<uid>).
// Pairing codes (sync.js) keep working, with or without an account.
//
// Testing without Firebase: ?accounttest=1 uses a same-browser stand-in (fake sign-in; localStorage + BroadcastChannel,
// so two tabs act like two devices). ?emulator=1 uses the Firebase emulators on this computer (see README).
(() => {
  'use strict';
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.4/';
  const flag = (name, key) => { try { const q = new URLSearchParams(location.search).get(name); if (q === '1') localStorage.setItem(key, '1'); if (q === '0') localStorage.removeItem(key); return localStorage.getItem(key) === '1'; } catch { return false; } };
  const testMode = flag('accounttest', 'linger.accounttest');
  const hasFirebase = () => !!(window.LINGER_FIREBASE && window.LINGER_FIREBASE.projectId && window.LingerSync && LingerSync.firebase);
  const FIELDS = ['w', 'm', 's', 'p', 'place', 'date'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  // ---------- backends ----------
  let fbp = null;
  function firebase() {
    if (!fbp) fbp = (async () => {
      const base = await LingerSync.firebase();
      const A = await import(SDK + 'firebase-auth.js');
      const auth = A.getAuth(base.app);
      if (base.emulator) A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      return { ...base, A, auth };
    })();
    return fbp;
  }
  const wordDoc = (b, uid, key) => b.F.doc(b.db, 'users', uid, 'words', key);
  const firebaseBackend = {
    async onAuth(cb) { const b = await firebase(); b.A.onAuthStateChanged(b.auth, (u) => cb(u ? { uid: u.uid, email: u.email || '' } : null)); },
    async signIn(email, pw) { const b = await firebase(); await b.A.signInWithEmailAndPassword(b.auth, email, pw); },
    async signUp(email, pw) {
      const b = await firebase();
      const { user } = await b.A.createUserWithEmailAndPassword(b.auth, email, pw);
      await b.F.setDoc(b.F.doc(b.db, 'users', user.uid), { createdAt: b.F.serverTimestamp(), schema: 1 }, { merge: true });
    },
    async reset(email) { const b = await firebase(); await b.A.sendPasswordResetEmail(b.auth, email); },
    async signOut() { const b = await firebase(); await b.A.signOut(b.auth); },
    async listen(uid, cb, onError) {
      const b = await firebase();
      return b.F.onSnapshot(b.F.collection(b.db, 'users', uid, 'words'), (snap) => {
        const map = {}; snap.forEach((d) => { map[d.id] = d.data(); }); cb(map, snap.metadata.hasPendingWrites);
      }, onError);
    },
    // New word: its fields plus createdAt. merge: true, so fields another device or a later feature added stay.
    async create(uid, key, data) { const b = await firebase(); await b.F.setDoc(wordDoc(b, uid, key), { ...data, createdAt: b.F.serverTimestamp(), updatedAt: b.F.serverTimestamp() }, { merge: true }); },
    async fill(uid, key, fields) { const b = await firebase(); await b.F.setDoc(wordDoc(b, uid, key), { ...fields, updatedAt: b.F.serverTimestamp() }, { merge: true }); },
    async remove(uid, key) { const b = await firebase(); await b.F.deleteDoc(wordDoc(b, uid, key)); }
  };

  // Same-browser stand-in for testing (no real passwords: it only checks the one you made in this browser).
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('linger-account-test') : null;
  const T = { users: () => store.get('acctTest.users', {}), words: (uid) => store.get('acctTest.words.' + uid, {}), cur: () => store.get('acctTest.current', null) };
  const tellTabs = (what) => { if (bc) bc.postMessage(what); };
  const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
  const testBackend = {
    async onAuth(cb) { setTimeout(() => cb(T.cur()), 0); if (bc) bc.addEventListener('message', (e) => { if (e.data === 'auth') cb(T.cur()); }); this._cb = cb; },
    async signIn(email, pw) { const u = T.users()[email.toLowerCase()]; if (!u || u.pw !== pw) fail('auth/invalid-credential'); store.set('acctTest.current', { uid: u.uid, email }); tellTabs('auth'); this._cb(T.cur()); },
    async signUp(email, pw) {
      const all = T.users(), k = email.toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('auth/invalid-email');
      if (all[k]) fail('auth/email-already-in-use');
      if (pw.length < 6) fail('auth/weak-password');
      all[k] = { uid: 'test-' + Math.random().toString(36).slice(2, 10), pw }; store.set('acctTest.users', all);
      await this.signIn(email, pw);
    },
    async reset() {},
    async signOut() { localStorage.removeItem('acctTest.current'); tellTabs('auth'); this._cb(null); },
    async listen(uid, cb) {
      const h = (e) => { if (e.data === 'words:' + uid) cb(T.words(uid), false); };
      if (bc) bc.addEventListener('message', h);
      setTimeout(() => cb(T.words(uid), false), 0);
      return () => { if (bc) bc.removeEventListener('message', h); };
    },
    async create(uid, key, data) { const w = T.words(uid); w[key] = { ...(w[key] || {}), ...data, createdAt: Date.now(), updatedAt: Date.now() }; store.set('acctTest.words.' + uid, w); tellTabs('words:' + uid); this._self(uid); },
    async fill(uid, key, fields) { const w = T.words(uid); w[key] = { ...(w[key] || {}), ...fields, updatedAt: Date.now() }; store.set('acctTest.words.' + uid, w); tellTabs('words:' + uid); this._self(uid); },
    async remove(uid, key) { const w = T.words(uid); delete w[key]; store.set('acctTest.words.' + uid, w); tellTabs('words:' + uid); this._self(uid); },
    _self(uid) { if (onRemoteRef) setTimeout(() => onRemoteRef(T.words(uid), false), 0); } // like Firestore, the writer's own listener sees its writes
  };
  let onRemoteRef = null;
  const backend = () => (testMode ? testBackend : hasFirebase() ? firebaseBackend : null);

  // ---------- state ----------
  // auth: 'loading' | 'out' | 'in'.  sync: '' | 'syncing' | 'on' | 'error'
  const A = { auth: 'loading', user: null, sync: '', msg: '', open: false, busy: false, email: '', pw: '', err: '', note: '' };
  let adapter = null, remote = null, unlisten = null, applying = false, prev = null, timer = null;
  const syncedKey = () => 'linger.acct.' + A.user.uid + '.synced', pendingKey = () => 'linger.acct.' + A.user.uid + '.deleted';
  const inflight = new Set(); // creates sent, not yet seen in the account

  // Compare this device's saved words with the account and fix both sides (see the notes at the top).
  function reconcile() {
    if (!adapter || A.auth !== 'in' || !remote) return;
    const b = backend(), uid = A.user.uid, L = adapter.words();
    const synced = new Set(store.get(syncedKey(), [])), pending = new Set(store.get(pendingKey(), []));
    const add = {}, drop = [];
    for (const k of pending) {
      if (L[k]) { pending.delete(k); continue; } // saved again since
      if (remote[k]) b.remove(uid, k).catch(onErr); else pending.delete(k);
    }
    for (const [k, r] of Object.entries(remote)) {
      if (L[k] || pending.has(k)) continue;
      add[k] = Object.fromEntries(FIELDS.map((f) => [f, String(r[f] || '')]));
    }
    // In the account before and not now: deleted on another device. (If the whole account came back empty while
    // this device had synced words, don't trust it: upload instead of deleting everything here.)
    const wipe = !Object.keys(remote).length && synced.size > 0;
    for (const [k, w] of Object.entries(L)) {
      const r = remote[k];
      if (!r) {
        if (synced.has(k) && !wipe && !inflight.has(k)) drop.push(k);
        else if (!inflight.has(k)) { inflight.add(k); b.create(uid, k, w).catch((e) => { inflight.delete(k); onErr(e); }); }
        continue;
      }
      inflight.delete(k);
      const missing = {}; FIELDS.forEach((f) => { if (!r[f] && w[f]) missing[f] = w[f]; });
      if (Object.keys(missing).length) b.fill(uid, k, missing).catch(onErr);
    }
    const now = new Set([...Object.keys(L), ...Object.keys(add)].filter((k) => !drop.includes(k) && (remote[k] || inflight.has(k))));
    store.set(syncedKey(), [...now]); store.set(pendingKey(), [...pending]);
    if (Object.keys(add).length || drop.length) { applying = true; try { adapter.apply({ add, remove: drop }); } finally { applying = false; } }
    prev = adapter.words();
  }
  function onErr(e) { A.sync = 'error'; A.msg = friendly(e); paint(); }

  async function startListening() {
    stopListening();
    const uid = A.user.uid;
    // First sign-in on this device for this account: keep a copy of the saved words before merging.
    if (!store.get('linger.acct.' + uid + '.synced', null)) { try { const cur = localStorage.getItem('linger.words.v1'); if (cur) localStorage.setItem('linger.words.v1.backup.' + uid, JSON.stringify({ at: new Date().toISOString(), data: JSON.parse(cur) })); } catch {} }
    A.sync = 'syncing'; paint();
    const onRemote = (map) => { if (!A.user || A.user.uid !== uid) return; remote = map; A.sync = 'on'; A.msg = ''; reconcile(); paint(); };
    onRemoteRef = onRemote;
    try { unlisten = await backend().listen(uid, onRemote, onErr); } catch (e) { onErr(e); }
  }
  function stopListening() { if (unlisten) { try { unlisten(); } catch {} } unlisten = null; remote = null; inflight.clear(); onRemoteRef = null; }

  // The app calls this whenever its saved words change (save, remove, pairing, import).
  function localChanged() {
    if (!adapter) return;
    if (applying) return;
    const L = adapter.words();
    if (A.auth === 'in' && prev) {
      const gone = Object.keys(prev).filter((k) => !L[k]);
      if (gone.length) { const p = new Set(store.get(pendingKey(), [])); gone.forEach((k) => p.add(k)); store.set(pendingKey(), [...p]); }
    }
    prev = L;
    clearTimeout(timer); timer = setTimeout(reconcile, 250);
  }

  // ---------- sign in / out ----------
  const MSG = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/email-already-in-use': 'There’s already an account with this email. Sign in instead.',
    'auth/invalid-credential': 'Email or password is wrong.', 'auth/wrong-password': 'Email or password is wrong.', 'auth/user-not-found': 'Email or password is wrong.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/operation-not-allowed': 'Email sign-in isn’t turned on for Linger yet (Firebase console → Authentication → Sign-in method).',
    'auth/configuration-not-found': 'Email sign-in isn’t turned on for Linger yet (Firebase console → Authentication → Sign-in method).',
    'auth/unauthorized-domain': 'This website isn’t allowed to sign in yet (Firebase console → Authentication → Settings → Authorized domains).',
    'permission-denied': 'Your account’s words couldn’t be reached: the Firestore security rules for accounts aren’t deployed yet.'
  };
  const friendly = (e) => MSG[(e && e.code) || ''] || 'Something went wrong. Try again.';
  async function run(fn, done) {
    if (A.busy) return;
    A.busy = true; A.err = ''; A.note = ''; paint();
    try { await fn(); if (done) done(); } catch (e) { A.err = friendly(e); }
    A.busy = false; paint();
  }
  const email = () => A.email.trim();
  const ACT = {
    open: () => { A.open = true; A.err = ''; paint(); setTimeout(() => { const el = document.getElementById('acctEmail'); if (el) el.focus(); }, 0); },
    close: () => { A.open = false; A.err = ''; A.note = ''; paint(); },
    signup: () => run(() => backend().signUp(email(), A.pw), () => { A.pw = ''; A.open = false; }),
    reset: () => { if (!email()) { A.err = 'Type your email first, then tap “Forgot password?”.'; paint(); return; } run(() => backend().reset(email()), () => { A.note = 'If there’s an account for ' + email() + ', a reset link is on its way.'; }); },
    // Signing out takes this account's words off the device (they stay in the account and come back on sign-in).
    // Otherwise the next person to sign in on this browser would get them merged into their own account.
    signout: () => run(async () => {
      const mine = store.get(syncedKey(), []), L = adapter ? adapter.words() : {};
      await backend().signOut();
      const remove = mine.filter((k) => L[k]);
      if (adapter && remove.length) { applying = true; try { adapter.apply({ add: {}, remove, quiet: true }); } finally { applying = false; } prev = adapter.words(); }
      A.note = remove.length ? `Signed out. Your ${remove.length === 1 ? 'word is' : remove.length + ' words are'} safe in your account.` : '';
    })
  };
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-acct]'); if (b && ACT[b.dataset.acct]) { ev.preventDefault(); ACT[b.dataset.acct](); } });
  document.addEventListener('submit', (ev) => { if (ev.target.id !== 'acctForm') return; ev.preventDefault(); run(() => backend().signIn(email(), A.pw), () => { A.pw = ''; A.open = false; }); });
  document.addEventListener('input', (ev) => { if (ev.target.id === 'acctEmail') A.email = ev.target.value; if (ev.target.id === 'acctPw') A.pw = ev.target.value; });

  // ---------- the card on the Words screen ----------
  const paint = () => { if (adapter && adapter.render) adapter.render(); };
  const inputStyle = 'min-height: 0; height: 44px; resize: none';
  function card() {
    if (!backend() || A.auth === 'loading') return '';
    if (A.auth === 'in') {
      const n = remote ? Object.keys(remote).length : 0;
      const line = A.sync === 'error' ? esc(A.msg) : A.sync === 'syncing' ? 'Connecting to your account…' : `Your ${n === 1 ? '1 saved word is' : n + ' saved words are'} in your account and on every device you sign in on.`;
      return `<div class="sync-card ${A.sync === 'error' ? '' : 'on'}" id="acctCard"><div class="sync-h">${A.sync === 'on' ? '<span class="dot-live"></span>' : '👤'}<strong>Signed in as ${esc(A.user.email)}</strong></div>
        <div class="small">${line}</div>
        <div class="sync-acts"><button type="button" class="link-btn" data-acct="signout" ${A.busy ? 'disabled' : ''}>Sign out</button></div></div>`;
    }
    if (!A.open) return `<div class="sync-card" id="acctCard"><div class="sync-h">👤 <strong>Keep your words in an account</strong></div>
      <div class="small">${A.note ? esc(A.note) : 'Sign in to have the same saved words on your phone and laptop, without a pairing code.'}</div>
      <button type="button" class="btn primary small-btn" data-acct="open">Sign in or create account</button></div>`;
    return `<form class="sync-card" id="acctForm" novalidate><div class="sync-h">👤 <strong>Sign in to Linger</strong></div>
      <input class="paste-box" style="${inputStyle}" id="acctEmail" type="email" autocomplete="email" placeholder="Email" value="${esc(A.email)}" required>
      <input class="paste-box" style="${inputStyle}" id="acctPw" type="password" autocomplete="current-password" placeholder="Password (6+ characters)" value="${esc(A.pw)}" required>
      ${A.err ? `<div class="small" role="alert" style="color: var(--bad, #A81F64)">${esc(A.err)}</div>` : ''}${A.note ? `<div class="small" role="status">${esc(A.note)}</div>` : ''}
      <div class="sync-acts" style="flex-wrap: wrap; align-items: center"><button type="submit" class="btn primary small-btn" ${A.busy ? 'disabled' : ''}>${A.busy ? 'One moment…' : 'Sign in'}</button>
        <button type="button" class="btn small-btn" data-acct="signup" ${A.busy ? 'disabled' : ''}>Create account</button></div>
      <div class="sync-acts"><button type="button" class="link-btn" data-acct="reset">Forgot password?</button><button type="button" class="link-btn" data-acct="close">Cancel</button></div></form>`;
  }

  // ---------- start ----------
  window.LingerAccount = {
    available: () => !!backend(),
    mode: () => (testMode ? 'test' : hasFirebase() ? 'firebase' : 'off'),
    state: () => ({ auth: A.auth, email: A.user && A.user.email, sync: A.sync, words: remote ? Object.keys(remote).length : 0 }),
    card,
    localChanged,
    // adapter: { words(): { key: { w, m, s, p, place, date } }, apply({ add, remove }), render() }
    attach(a) {
      adapter = a; prev = a.words();
      const b = backend(); if (!b) return;
      b.onAuth((u) => {
        const was = A.user && A.user.uid;
        A.user = u; A.auth = u ? 'in' : 'out';
        if (u && u.uid !== was) startListening(); else if (!u) { stopListening(); A.sync = ''; }
        paint();
      }).catch((e) => { A.auth = 'out'; A.err = friendly(e); paint(); });
    }
  };
})();

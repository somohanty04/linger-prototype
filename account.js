// Linger accounts: sign in with email and password (Firebase Authentication, the same Firebase project as sync.js)
// and keep saved words under the account, so every device you sign in on has the same list.
//
// Data (see firestore.rules):
//   users/{uid}               profile: { createdAt, schema, prefs, photo } (prefs: the onboarding answers, photo: a
//                             small JPEG data URL for the profile picture; both set by app.js through saveProfile)
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
// Deleting the account (account sheet → Delete account and data): after the password is checked again, the profile
// (reading setup, learning history, picture), every saved word and then the sign-in itself are deleted, and this
// device forgets the account. Words shared through a pairing code (pairs/{code}) aren't part of the account and stay.
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
    async onAuth(cb) { const b = await firebase(); b.A.onAuthStateChanged(b.auth, (u) => cb(u ? { uid: u.uid, email: u.email || '', verified: !!u.emailVerified } : null)); },
    async verify() { const b = await firebase(); if (b.auth.currentUser) await b.A.sendEmailVerification(b.auth.currentUser); },
    async reloadUser() { const b = await firebase(); const u = b.auth.currentUser; if (!u) return false; await u.reload(); return !!u.emailVerified; },
    async signIn(email, pw) { const b = await firebase(); await b.A.signInWithEmailAndPassword(b.auth, email, pw); },
    async signUp(email, pw) {
      const b = await firebase();
      const { user } = await b.A.createUserWithEmailAndPassword(b.auth, email, pw);
      await b.F.setDoc(b.F.doc(b.db, 'users', user.uid), { createdAt: b.F.serverTimestamp(), schema: 1 }, { merge: true });
      try { await b.A.sendEmailVerification(user); } catch {} // a mistyped email is caught here: the link never arrives
    },
    async reset(email) { const b = await firebase(); await b.A.sendPasswordResetEmail(b.auth, email); },
    async signOut() { const b = await firebase(); await b.A.signOut(b.auth); },
    async getProfile(uid) { const b = await firebase(); const d = await b.F.getDoc(b.F.doc(b.db, 'users', uid)); return d.exists() ? d.data() : {}; },
    async saveProfile(uid, fields) { const b = await firebase(); await b.F.setDoc(b.F.doc(b.db, 'users', uid), { ...fields, updatedAt: b.F.serverTimestamp() }, { merge: true }); },
    async listen(uid, cb, onError) {
      const b = await firebase();
      return b.F.onSnapshot(b.F.collection(b.db, 'users', uid, 'words'), (snap) => {
        const map = {}; snap.forEach((d) => { map[d.id] = d.data(); }); cb(map, snap.metadata.hasPendingWrites);
      }, onError);
    },
    // New word: its fields plus createdAt. merge: true, so fields another device or a later feature added stay.
    async create(uid, key, data) { const b = await firebase(); await b.F.setDoc(wordDoc(b, uid, key), { ...data, createdAt: b.F.serverTimestamp(), updatedAt: b.F.serverTimestamp() }, { merge: true }); },
    async fill(uid, key, fields) { const b = await firebase(); await b.F.setDoc(wordDoc(b, uid, key), { ...fields, updatedAt: b.F.serverTimestamp() }, { merge: true }); },
    async remove(uid, key) { const b = await firebase(); await b.F.deleteDoc(wordDoc(b, uid, key)); },
    async profileExists(uid) { const b = await firebase(); return (await b.F.getDoc(b.F.doc(b.db, 'users', uid))).exists(); },
    // Check the password again (Firebase only deletes a sign-in that was used recently), then delete the profile
    // first (other signed-in devices take a missing profile as "this account was deleted", so they don't upload
    // their copy back), then every saved word, then make sure none are left, then the sign-in itself.
    async deleteAccount(pw, step) {
      const b = await firebase(), u = b.auth.currentUser;
      if (!u) fail('auth/no-current-user');
      await b.A.reauthenticateWithCredential(u, b.A.EmailAuthProvider.credential(u.email, pw));
      step('data');
      const words = () => b.F.getDocs(b.F.collection(b.db, 'users', u.uid, 'words'));
      await b.F.deleteDoc(b.F.doc(b.db, 'users', u.uid));
      step('words'); // the profile (reading setup, learning history, picture) is gone from here on
      const refs = (await words()).docs.map((d) => d.ref);
      for (let i = 0; i < refs.length; i += 400) { const wb = b.F.writeBatch(b.db); refs.slice(i, i + 400).forEach((r) => wb.delete(r)); await wb.commit(); }
      if (!(await words()).empty || (await b.F.getDoc(b.F.doc(b.db, 'users', u.uid))).exists()) fail('linger/data-left');
      step('auth');
      await b.A.deleteUser(u);
    }
  };

  // Same-browser stand-in for testing (no real passwords: it only checks the one you made in this browser).
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('linger-account-test') : null;
  const T = { users: () => store.get('acctTest.users', {}), words: (uid) => store.get('acctTest.words.' + uid, {}), cur: () => store.get('acctTest.current', null) };
  const tellTabs = (what) => { if (bc) bc.postMessage(what); };
  const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
  const testBackend = {
    async onAuth(cb) { setTimeout(() => cb(T.cur()), 0); if (bc) bc.addEventListener('message', (e) => { if (e.data === 'auth') cb(T.cur()); }); this._cb = cb; },
    async signIn(email, pw) { const u = T.users()[email.toLowerCase()]; if (!u || u.pw !== pw) fail('auth/invalid-credential'); store.set('acctTest.current', { uid: u.uid, email, verified: !!u.verified }); tellTabs('auth'); this._cb(T.cur()); },
    async verify() {},
    async reloadUser() { const c = T.cur(), all = T.users(), k = c && c.email.toLowerCase(); if (!k || !all[k]) return false; all[k].verified = true; store.set('acctTest.users', all); store.set('acctTest.current', { ...c, verified: true }); return true; }, // test mode: "clicking the link"
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
    async getProfile(uid) { return store.get('acctTest.profile.' + uid, {}); },
    async saveProfile(uid, fields) { store.set('acctTest.profile.' + uid, { ...store.get('acctTest.profile.' + uid, {}), ...fields }); },
    async listen(uid, cb) {
      const h = (e) => { if (e.data === 'words:' + uid) cb(T.words(uid), false); };
      if (bc) bc.addEventListener('message', h);
      setTimeout(() => cb(T.words(uid), false), 0);
      return () => { if (bc) bc.removeEventListener('message', h); };
    },
    async create(uid, key, data) { const w = T.words(uid); w[key] = { ...(w[key] || {}), ...data, createdAt: Date.now(), updatedAt: Date.now() }; store.set('acctTest.words.' + uid, w); tellTabs('words:' + uid); this._self(uid); },
    async fill(uid, key, fields) { const w = T.words(uid); w[key] = { ...(w[key] || {}), ...fields, updatedAt: Date.now() }; store.set('acctTest.words.' + uid, w); tellTabs('words:' + uid); this._self(uid); },
    async remove(uid, key) { const w = T.words(uid); delete w[key]; store.set('acctTest.words.' + uid, w); tellTabs('words:' + uid); this._self(uid); },
    async profileExists(uid) { return Object.values(T.users()).some((u) => u.uid === uid); },
    async deleteAccount(pw, step) {
      const cur = T.cur(), all = T.users(), k = cur && cur.email.toLowerCase();
      if (!cur || !all[k] || all[k].pw !== pw) fail('auth/invalid-credential');
      step('data');
      localStorage.removeItem('acctTest.profile.' + cur.uid);
      step('words');
      localStorage.removeItem('acctTest.words.' + cur.uid); tellTabs('words:' + cur.uid);
      step('auth');
      delete all[k]; store.set('acctTest.users', all);
      await this.signOut();
    },
    _self(uid) { if (onRemoteRef) setTimeout(() => onRemoteRef(T.words(uid), false), 0); } // like Firestore, the writer's own listener sees its writes
  };
  let onRemoteRef = null;
  const backend = () => (testMode ? testBackend : hasFirebase() ? firebaseBackend : null);

  // ---------- state ----------
  // auth: 'loading' | 'out' | 'in'.  sync: '' | 'syncing' | 'on' | 'error'
  const A = { confirmOut: false, resetSent: null, firstSync: false, verifyNote: '', auth: 'loading', user: null, sync: '', msg: '', open: false, busy: false, email: '', pw: '', err: '', note: '', del: false, delPw: '', delDevice: false, delStep: '', deleting: false };
  // After an account is deleted the page reloads (to clear what's in memory); this note says what happened.
  try { const n = sessionStorage.getItem('linger.acct.deletedNote'); if (n) { A.note = n; sessionStorage.removeItem('linger.acct.deletedNote'); } } catch {}
  let adapter = null, remote = null, unlisten = null, applying = false, prev = null, timer = null;
  const syncedKey = () => 'linger.acct.' + A.user.uid + '.synced', pendingKey = () => 'linger.acct.' + A.user.uid + '.deleted';
  const inflight = new Set(); // creates sent, not yet seen in the account

  // Compare this device's saved words with the account and fix both sides (see the notes at the top).
  function reconcile() {
    if (!adapter || A.auth !== 'in' || !remote || A.deleting) return;
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
    if (A.firstSync) { A.firstSync = false; const n = Object.keys(add).length; if (n && adapter.notify) adapter.notify(`Welcome back! ${n} ${n === 1 ? 'word' : 'words'} restored from your account.`); }
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
    const onRemote = async (map) => {
      if (!A.user || A.user.uid !== uid || A.deleting) return;
      // Every word gone while this device had synced some: if the profile is gone too, the account was deleted on
      // another device. Then forget it here instead of uploading this device's copy back into it.
      if (!Object.keys(map).length && store.get(syncedKey(), []).length) {
        let gone = false;
        try { gone = !(await backend().profileExists(uid)); } catch {}
        if (!A.user || A.user.uid !== uid) return;
        if (gone) { await forgetAccount(uid, A.user.email, false); A.note = 'This account was deleted on another device, so it was removed from this one too.'; try { await backend().signOut(); } catch {} paint(); return; }
      }
      remote = map; A.sync = 'on'; A.msg = ''; reconcile(); paint();
    };
    onRemoteRef = onRemote;
    try { unlisten = await backend().listen(uid, onRemote, onErr); } catch (e) { onErr(e); }
  }
  function stopListening() { if (unlisten) { try { unlisten(); } catch {} } unlisten = null; remote = null; inflight.clear(); onRemoteRef = null; }

  // The app calls this whenever its saved words change (save, remove, pairing, import).
  function localChanged() {
    if (!adapter || A.deleting) return;
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
    'permission-denied': 'Your account’s words couldn’t be reached: the Firestore security rules for accounts aren’t deployed yet.',
    'auth/requires-recent-login': 'For your security, sign out, sign in again, then delete your account.',
    'auth/user-mismatch': 'That password is for a different account.',
    'linger/data-left': 'Some of your data couldn’t be deleted, so your sign-in was kept. Check your connection and try again.'
  };
  const friendly = (e) => MSG[(e && e.code) || ''] || 'Something went wrong. Try again.';
  async function run(fn, done) {
    if (A.busy) return;
    A.busy = true; A.err = ''; A.note = ''; paint();
    try { await fn(); if (done) done(); } catch (e) { A.err = friendly(e); }
    A.busy = false; paint();
  }
  const email = () => A.email.trim();
  // Takes the account off this device: its words (the pairing document isn't touched), what this device kept about it,
  // and, if asked, this device's own reading setup and learning history.
  async function forgetAccount(uid, email, device) {
    const mine = store.get('linger.acct.' + uid + '.synced', []), L = adapter ? adapter.words() : {};
    const remove = mine.filter((k) => L[k]);
    if (adapter && remove.length) { applying = true; try { adapter.apply({ add: {}, remove, quiet: true }); } finally { applying = false; } prev = adapter.words(); }
    stopListening();
    const keys = ['linger.acct.' + uid + '.synced', 'linger.acct.' + uid + '.deleted', 'linger.words.v1.backup.' + uid, 'linger.photo.' + email];
    if (device) keys.push('linger.prefs.v1', 'linger.learn.v1', 'linger.langs', 'linger.lang');
    keys.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
  }
  async function deleteAccount() {
    if (A.busy || A.auth !== 'in') return;
    if (!A.delPw) { A.err = 'Enter your password to confirm.'; paint(); return; }
    const uid = A.user.uid, email = A.user.email, device = A.delDevice;
    A.busy = true; A.err = ''; A.delStep = 'check'; paint();
    try {
      await backend().deleteAccount(A.delPw, (s) => {
        A.delStep = s;
        if (s === 'data') { A.deleting = true; stopListening(); } // nothing re-uploads while deleting
        paint();
      });
    } catch (e) {
      const code = (e && e.code) || '';
      // Say exactly what is already gone. Once anything was deleted, syncing stays paused (A.deleting) so this
      // device doesn't upload its copy back into a half-deleted account; trying again finishes the job.
      const at = A.delStep, partly = at === 'words' || at === 'auth';
      A.busy = false; A.delStep = ''; A.deleting = partly;
      if (at === 'auth') A.err = 'Your profile (reading setup, learning history and picture) and all your saved words were deleted, but your sign-in couldn’t be removed yet. Try again to finish.';
      else if (at === 'words') A.err = 'Your profile (reading setup, learning history and picture) was deleted, but some saved words couldn’t be deleted yet, and your sign-in still exists. Try again to finish deleting.';
      else A.err = friendly(e);
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') A.err = 'That password isn’t right.';
      if (!partly && A.auth === 'in' && !unlisten) startListening();
      paint(); return;
    }
    await forgetAccount(uid, email, device);
    A.delPw = ''; A.del = false; A.busy = false;
    try { sessionStorage.setItem('linger.acct.deletedNote', 'Your Linger account and the data in it were deleted.' + (device ? ' This phone’s reading setup and learning history were cleared too.' : '')); } catch {}
    location.reload(); // start clean: the reading setup and learning history are also kept in memory
  }
  const ACT = {
    delopen: () => { A.del = true; A.err = ''; A.delPw = ''; A.delDevice = false; paint(); setTimeout(() => { const el = document.getElementById('acctDelPw'); if (el) el.focus(); }, 0); },
    delcancel: () => { if (A.busy) return; A.del = false; A.err = ''; A.delPw = ''; paint(); },
    open: () => { A.open = true; A.err = ''; paint(); setTimeout(() => { const el = document.getElementById('acctEmail'); if (el) el.focus(); }, 0); },
    close: () => { A.open = false; A.err = ''; A.note = ''; paint(); },
    signup: () => run(() => backend().signUp(email(), A.pw), () => { A.pw = ''; A.open = false; }),
    reset: () => { if (!email()) { A.err = 'Type your email first, then tap “Forgot password?”.'; paint(); return; } const to = email(); run(() => backend().reset(to), () => { A.resetSent = { email: to, at: Date.now() }; }); },
    resetagain: () => { if (!A.resetSent || Date.now() - A.resetSent.at < 60000) return; const to = A.resetSent.email; run(() => backend().reset(to), () => { A.resetSent = { email: to, at: Date.now() }; }); },
    resetback: () => { A.resetSent = null; A.err = ''; A.email = ''; A.open = true; paint(); setTimeout(() => { const el = document.getElementById('acctEmail'); if (el) el.focus(); }, 0); },
    resetdone: () => { A.resetSent = null; A.err = ''; A.open = true; paint(); setTimeout(() => { const el = document.getElementById('acctPw'); if (el) el.focus(); }, 0); },
    resendverify: () => run(() => backend().verify(), () => { A.verifyNote = 'Sent. Check your inbox and spam folder.'; }),
    verified: () => run(async () => { const ok = await backend().reloadUser(); if (ok) { A.user = { ...A.user, verified: true }; A.verifyNote = ''; } else A.verifyNote = 'Not confirmed yet. Open the link in the email, then try again.'; }),
    wrongemail: () => { A.verifyNote = 'To use a different email, delete this account (nothing is saved in it yet if you just made it) and create a new one.'; A.del = true; A.delPw = ''; paint(); },
    signoutno: () => { A.confirmOut = false; paint(); },
    // Signing out takes this account's words off the device (they stay in the account and come back on sign-in).
    // Otherwise the next person to sign in on this browser would get them merged into their own account.
    signout: () => { A.confirmOut = true; A.err = ''; paint(); },
    signoutyes: () => run(async () => {
      A.confirmOut = false;
      const mine = store.get(syncedKey(), []), L = adapter ? adapter.words() : {};
      await backend().signOut();
      const remove = mine.filter((k) => L[k]);
      if (adapter && remove.length) { applying = true; try { adapter.apply({ add: {}, remove, quiet: true }); } finally { applying = false; } prev = adapter.words(); }
      A.note = remove.length ? `Signed out. Your ${remove.length === 1 ? 'word is' : remove.length + ' words are'} safe in your account.` : '';
    })
  };
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-acct]'); if (b && ACT[b.dataset.acct]) { ev.preventDefault(); ACT[b.dataset.acct](); } });
  document.addEventListener('submit', (ev) => { if (ev.target.id === 'acctDelForm') { ev.preventDefault(); deleteAccount(); } });
  document.addEventListener('change', (ev) => { if (ev.target.id === 'acctDelDevice') A.delDevice = ev.target.checked; });
  document.addEventListener('submit', (ev) => { if (ev.target.id !== 'acctForm') return; ev.preventDefault(); run(() => backend().signIn(email(), A.pw), () => { A.pw = ''; A.open = false; }); });
  document.addEventListener('input', (ev) => { if (ev.target.id === 'acctEmail') A.email = ev.target.value; if (ev.target.id === 'acctPw') A.pw = ev.target.value; if (ev.target.id === 'acctDelPw') A.delPw = ev.target.value; });

  // ---------- the account card (in the account sheet) ----------
  const paint = () => { if (adapter && adapter.render) adapter.render(); };
  const inputStyle = 'min-height: 0; height: 44px; resize: none';
  // opts.inSheet: inside the account sheet, which already shows the email under the profile picture.
  function card(opts = {}) {
    if (!backend() || A.auth === 'loading') return '';
    if (A.auth === 'in' && A.del) return deleteCard();
    if (A.auth === 'in' && A.confirmOut) {
      const n = remote ? Object.keys(remote).length : 0;
      return `<div class="sync-card" id="acctCard" role="group" aria-labelledby="acctOutH"><div class="sync-h" id="acctOutH"><strong>Sign out of ${esc(A.user.email)}?</strong></div>
        <div class="small">${n ? `Your ${n === 1 ? 'word stays' : n + ' words stay'} safe in your account and ${n === 1 ? 'comes' : 'come'} back when you sign in again. Until then ${n === 1 ? 'it’s' : 'they’re'} taken off this phone, so the next person can’t see ${n === 1 ? 'it' : 'them'}.` : 'You can sign back in any time.'}</div>
        <div class="sync-acts"><button type="button" class="btn small-btn" data-acct="signoutno">Cancel</button><button type="button" class="btn primary small-btn" data-acct="signoutyes" ${A.busy ? 'disabled' : ''}>Sign out</button></div></div>`;
    }
    if (A.auth === 'in') {
      const n = remote ? Object.keys(remote).length : 0;
      const verify = A.user.verified ? '' : `<div class="verify-box" role="status"><strong>Confirm your email</strong><span>We sent a link to <b>${esc(A.user.email)}</b>. Tap it to confirm this email is yours, so you can reset your password if you forget it.</span>
          ${A.verifyNote ? `<span class="small">${esc(A.verifyNote)}</span>` : ''}
          <span class="sync-acts"><button type="button" class="link-btn" data-acct="verified">I’ve confirmed it</button><button type="button" class="link-btn" data-acct="resendverify">Send again</button><button type="button" class="link-btn" data-acct="wrongemail">Wrong email?</button></span></div>`;
      const line = A.sync === 'error' ? esc(A.msg) : A.sync === 'syncing' ? 'Connecting to your account…' : `Your ${n === 1 ? '1 saved word is' : n + ' saved words are'} in your account and on every device you sign in on.`;
      return `<div class="sync-card ${A.sync === 'error' ? '' : 'on'}" id="acctCard"><div class="sync-h">${A.sync === 'on' ? '<span class="dot-live"></span>' : ''}<strong>${opts.inSheet ? (A.sync === 'error' ? 'Words not syncing' : 'Words synced') : 'Signed in as ' + esc(A.user.email)}</strong></div>
        <div class="small">${line}</div>${verify}
        <div class="sync-acts"><button type="button" class="link-btn" data-acct="signout" ${A.busy ? 'disabled' : ''}>Sign out</button>${opts.inSheet ? `<button type="button" class="link-btn del-link" data-acct="delopen" ${A.busy ? 'disabled' : ''}>Delete account and data</button>` : ''}</div></div>`;
    }
    if (!A.open) return `<div class="sync-card" id="acctCard"><div class="sync-h"><strong>Keep your words in an account</strong></div>
      <div class="small">${A.note ? esc(A.note) : 'Sign in to have the same saved words on your phone and laptop, without a pairing code.'}</div>
      <button type="button" class="btn primary small-btn" data-acct="open">Sign in or create account</button></div>`;
    if (A.resetSent) {
      const left = Math.max(0, 60 - Math.round((Date.now() - A.resetSent.at) / 1000));
      clearTimeout(card.t); if (left > 0) card.t = setTimeout(paint, 1000); // count down the resend wait
      return `<div class="sync-card" id="acctCard" role="group" aria-labelledby="acctResetH"><div class="sync-h" id="acctResetH"><strong>Check your email</strong></div>
        <div class="small">If there’s a Linger account for <b>${esc(A.resetSent.email)}</b>, a link to reset your password is on its way. It can take a few minutes. Check your spam or junk folder too.</div>
        ${A.err ? `<div class="small" role="alert" style="color: var(--bad, #A81F64)">${esc(A.err)}</div>` : ''}
        <div class="sync-acts" style="flex-wrap: wrap"><button type="button" class="btn small-btn" data-acct="resetagain" ${left || A.busy ? 'disabled' : ''}>${left ? `Send again in ${left}s` : 'Send again'}</button><button type="button" class="link-btn" data-acct="resetback">Use a different email</button></div>
        <div class="sync-acts"><button type="button" class="link-btn" data-acct="resetdone">Back to sign in</button></div></div>`;
    }
    return `<form class="sync-card" id="acctForm" novalidate><div class="sync-h"><strong>Sign in to Linger</strong></div>
      <input class="paste-box" style="${inputStyle}" id="acctEmail" type="email" autocomplete="email" placeholder="Email" value="${esc(A.email)}" required>
      <input class="paste-box" style="${inputStyle}" id="acctPw" type="password" autocomplete="current-password" placeholder="Password (6+ characters)" value="${esc(A.pw)}" required>
      ${A.err ? `<div class="small" role="alert" style="color: var(--bad, #A81F64)">${esc(A.err)}</div>` : ''}${A.note ? `<div class="small" role="status">${esc(A.note)}</div>` : ''}
      <div class="sync-acts" style="flex-wrap: wrap; align-items: center"><button type="submit" class="btn primary small-btn" ${A.busy ? 'disabled' : ''}>${A.busy ? 'One moment…' : 'Sign in'}</button>
        <button type="button" class="btn small-btn" data-acct="signup" ${A.busy ? 'disabled' : ''}>Create account</button></div>
      <div class="sync-acts"><button type="button" class="link-btn" data-acct="reset">Forgot password?</button><button type="button" class="link-btn" data-acct="close">Cancel</button></div></form>`;
  }

  // Says exactly what is and isn't deleted before anything happens.
  function deleteCard() {
    const n = remote ? Object.keys(remote).length : 0;
    let code = ''; try { code = localStorage.getItem('linger.sync.code') || ''; } catch {}
    const pretty = code && window.LingerSync ? LingerSync.pretty(code) : code;
    const step = A.delStep === 'check' ? 'Checking your password…' : A.delStep === 'data' ? 'Deleting your profile…' : A.delStep === 'words' ? 'Deleting your saved words…' : A.delStep === 'auth' ? 'Deleting your sign-in…' : '';
    return `<form class="sync-card del-card" id="acctDelForm" novalidate aria-labelledby="acctDelH"><div class="sync-h" id="acctDelH"><strong>Delete your account and data?</strong></div>
      <div class="small">This permanently deletes, for ${esc(A.user.email)}:</div>
      <ul class="small del-list"><li>Your Linger sign-in (this email and password)</li>
        <li>The ${n === 1 ? 'saved word' : n + ' saved words'} in your account, with their meanings, sentences, places and dates</li>
        <li>Your learning history</li><li>Your reading setup: what you read, your languages and English level</li><li>Your profile picture</li></ul>
      <div class="small">The account’s words are also removed from this phone. This can’t be undone.</div>
      <div class="small"><strong>Not deleted:</strong> words shared through a pairing code (live sync) aren’t part of your account, so they stay in that code’s shared list, which anyone with the code can read${code ? ` (this phone uses <span translate="no">${esc(pretty)}</span>)` : ''}. To clear them, remove those words while live sync is on, then turn it off. The Chrome extension keeps its own saved list on your laptop.</div>
      <label class="small del-dev"><input type="checkbox" id="acctDelDevice" ${A.delDevice ? 'checked' : ''} ${A.busy ? 'disabled' : ''}> Also clear this phone’s reading setup and learning history</label>
      <input class="paste-box" style="${inputStyle}" id="acctDelPw" type="password" autocomplete="current-password" placeholder="Your password, to confirm" aria-label="Your password, to confirm" value="${esc(A.delPw)}" ${A.busy ? 'disabled' : ''}>
      ${A.err ? `<div class="small" role="alert" style="color: var(--bad-ink, #A81F64)">${esc(A.err)}</div>` : ''}${step ? `<div class="small" role="status">${step}</div>` : ''}
      <div class="sync-acts" style="align-items: center"><button type="submit" class="btn small-btn danger-btn" ${A.busy ? 'disabled' : ''}>${A.busy ? 'Deleting…' : 'Delete permanently'}</button>
        <button type="button" class="link-btn" data-acct="delcancel" ${A.busy ? 'disabled' : ''}>Cancel</button></div></form>`;
  }

  // ---------- profile (the account's settings: onboarding answers, profile picture) ----------
  async function loadProfile() {
    const uid = A.user && A.user.uid;
    let p = {};
    try { p = (await backend().getProfile(uid)) || {}; } catch {}
    if (!A.user || A.user.uid !== uid) return; // signed out (or someone else signed in) meanwhile
    A.profile = p;
    if (adapter && adapter.profile) adapter.profile(p);
  }
  async function saveProfile(fields) {
    if (A.auth !== 'in' || A.deleting) return false;
    A.profile = { ...(A.profile || {}), ...fields };
    try { await backend().saveProfile(A.user.uid, fields); return true; } catch (e) { onErr(e); return false; }
  }

  // ---------- start ----------
  window.LingerAccount = {
    saveProfile,
    available: () => !!backend(),
    mode: () => (testMode ? 'test' : hasFirebase() ? 'firebase' : 'off'),
    state: () => ({ auth: A.auth, email: A.user && A.user.email, sync: A.sync, words: remote ? Object.keys(remote).length : 0, profile: A.profile || null, formOpen: !!A.open || !!A.resetSent, verified: !!(A.user && A.user.verified),
      unsynced: A.auth === 'in' && remote && adapter ? Object.keys(adapter.words()).filter((k) => !remote[k]).length : 0, msg: A.note || A.err || '' }),
    card,
    localChanged,
    // adapter: { words(): { key: { w, m, s, p, place, date } }, apply({ add, remove }), render() }
    attach(a) {
      adapter = a; prev = a.words();
      const b = backend(); if (!b) return;
      b.onAuth((u) => {
        const was = A.user && A.user.uid;
        A.user = u; A.auth = u ? 'in' : 'out';
        if (u && u.uid !== was) A.firstSync = true; // the first sync after signing in says how many words came back
        A.confirmOut = false;
        if (u && u.uid !== was) { startListening(); loadProfile(); } else if (!u) { stopListening(); A.sync = ''; A.profile = null; if (adapter.profile) adapter.profile(null); }
        paint();
      }).catch((e) => { A.auth = 'out'; A.err = friendly(e); paint(); });
    }
  };
})();

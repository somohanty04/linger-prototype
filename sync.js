// Live sync of saved words between the laptop Reader and the phone app.
// Both sides share one Firestore document, pairs/{code}, keyed by a random pairing code.
// Without a Firebase config, ?synctest=1 uses a same-browser stand-in (two tabs) for testing.
(() => {
  'use strict';
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.4/';
  const testMode = (() => { try { if (new URLSearchParams(location.search).get('synctest') === '1') localStorage.setItem('linger.synctest', '1'); return localStorage.getItem('linger.synctest') === '1'; } catch { return false; } })();
  const hasFirebase = () => !!(window.LINGER_FIREBASE && window.LINGER_FIREBASE.projectId);

  // Codes avoid look-alike characters (0/o, 1/l/i) so they're easy to type.
  const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
  const newCode = () => { const a = new Uint32Array(12); crypto.getRandomValues(a); return [...a].map((n) => ALPHA[n % ALPHA.length]).join(''); };
  const tidy = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const pretty = (c) => tidy(c).replace(/(.{4})(?=.)/g, '$1-');

  let fb = null;
  async function firestore() {
    if (fb) return fb;
    const [{ initializeApp }, F] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
    const app = initializeApp(window.LINGER_FIREBASE);
    fb = { db: F.getFirestore(app), F };
    return fb;
  }

  const firebaseBackend = {
    async listen(code, cb, onError) {
      const { db, F } = await firestore();
      return F.onSnapshot(F.doc(db, 'pairs', code), (snap) => cb((snap.exists() && snap.data().words) || {}), onError);
    },
    async put(code, words) {
      const { db, F } = await firestore();
      await F.setDoc(F.doc(db, 'pairs', code), { words, updated: F.serverTimestamp() }, { merge: true });
    },
    async remove(code, key) {
      const { db, F } = await firestore();
      await F.setDoc(F.doc(db, 'pairs', code), { words: { [key]: F.deleteField() }, updated: F.serverTimestamp() }, { merge: true });
    }
  };

  // Same-browser stand-in: localStorage holds the document, BroadcastChannel tells the other tab.
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('linger-sync') : null;
  const readLocal = (code) => { try { return JSON.parse(localStorage.getItem('lingersync:' + code) || '{}'); } catch { return {}; } };
  const localBackend = {
    async listen(code, cb) {
      const h = (e) => { if (e.data && e.data.code === code) cb(readLocal(code)); };
      if (bc) bc.addEventListener('message', h);
      setTimeout(() => cb(readLocal(code)), 0);
      return () => { if (bc) bc.removeEventListener('message', h); };
    },
    async put(code, words) { const d = { ...readLocal(code), ...words }; localStorage.setItem('lingersync:' + code, JSON.stringify(d)); if (bc) bc.postMessage({ code }); },
    async remove(code, key) { const d = readLocal(code); delete d[key]; localStorage.setItem('lingersync:' + code, JSON.stringify(d)); if (bc) bc.postMessage({ code }); }
  };

  const backend = () => (hasFirebase() ? firebaseBackend : testMode ? localBackend : null);

  window.LingerSync = {
    available: () => !!backend(),
    mode: () => (hasFirebase() ? 'firebase' : testMode ? 'test' : 'off'),
    newCode, tidy, pretty,
    // Start syncing: onWords gets the full shared word map whenever it changes.
    async connect(code, onWords, onError) {
      const b = backend(); if (!b) throw new Error('not-configured');
      code = tidy(code);
      if (code.length < 10) throw new Error('bad-code');
      // A Firestore listener ends for good after any error, so reconnect a few times before giving up.
      let stop = null, tries = 0, closed = false;
      const start = async () => {
        stop = await b.listen(code, (m) => { tries = 0; onWords(m); }, (e) => {
          if (closed) return;
          if (++tries <= 5) setTimeout(() => { if (!closed) start().catch(() => {}); }, 1500 * tries);
          else if (onError) onError(e);
        });
      };
      await start();
      return {
        code,
        put: (key, word) => b.put(code, { [key]: word }).catch(onError || (() => {})),
        putMany: (words) => (Object.keys(words).length ? b.put(code, words).catch(onError || (() => {})) : Promise.resolve()),
        remove: (key) => b.remove(code, key).catch(onError || (() => {})),
        stop: () => { closed = true; try { stop && stop(); } catch {} }
      };
    }
  };
})();

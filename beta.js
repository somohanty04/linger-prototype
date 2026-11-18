// Linger Beta: helpers used only on the beta page (beta/index.html sets window.LINGER_BETA before this loads).
//   - which version testers are on
//   - whether the app is installed to the Home Screen, and on which kind of phone
//   - sending feedback: one Firestore document per message in feedback/{autoId} (create-only, see firestore.rules).
//     If the phone is offline or the send fails, the message waits in localStorage and is sent the next time
//     the app is online.
(() => {
  'use strict';
  const B = window.LINGER_BETA;
  if (!B) return;
  const QUEUE = 'linger.beta.feedback.queue';
  const TESTER = 'linger.beta.tester';
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const ua = navigator.userAgent || '';
  const platform = /Android/.test(ua) ? 'android'
    : /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'other'; // iPadOS says it's a Mac
  // Inside the iPhone app (ios/), the page runs in a WKWebView with a "linger" message handler.
  const bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.linger;
  const native = !!bridge;
  const standalone = () => native || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // A random ID per phone, so feedback from one tester can be grouped without knowing who they are.
  const tester = () => { let t = read(TESTER, ''); if (!t) { t = Math.random().toString(36).slice(2, 10); write(TESTER, t); } return t; };

  async function send(item) {
    if (!(window.LingerSync && LingerSync.firebase && window.LINGER_FIREBASE)) throw new Error('offline');
    const { db, F } = await LingerSync.firebase();
    await F.addDoc(F.collection(db, 'feedback'), { ...item, sentAt: F.serverTimestamp() });
  }
  let flushing = false;
  async function flush() {
    if (flushing || !navigator.onLine) return;
    flushing = true;
    try {
      let q = read(QUEUE, []);
      while (q.length) { await send(q[0]); q = read(QUEUE, []).slice(1); write(QUEUE, q); }
    } catch {} finally { flushing = false; }
  }
  window.addEventListener('online', flush);
  setTimeout(flush, 3000);

  window.LingerBeta = {
    version: B.version,
    date: B.date,
    platform: native ? 'ios-app' : platform,
    native,
    post: (m) => { try { bridge.postMessage(m); } catch {} },
    standalone,
    pending: () => read(QUEUE, []).length,
    // text: what the tester wrote. ctx: { kind: 'bug' | 'idea' | 'other', screen, email? }
    // Returns 'sent', or 'queued' when it will be sent later.
    async sendFeedback(text, ctx = {}) {
      const item = {
        text: String(text).slice(0, 4000),
        kind: ['bug', 'idea', 'other'].includes(ctx.kind) ? ctx.kind : 'other',
        screen: String(ctx.screen || '').slice(0, 40),
        email: String(ctx.email || '').slice(0, 200),
        version: B.version,
        platform: native ? 'ios-app' : platform,
        installed: standalone(),
        tester: tester(),
        ua: ua.slice(0, 300),
        at: new Date().toISOString()
      };
      try { await send(item); return 'sent'; }
      catch { write(QUEUE, [...read(QUEUE, []), item].slice(-20)); return 'queued'; }
    }
  };
})();

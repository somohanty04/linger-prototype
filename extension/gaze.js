// Linger eye tracking on any page. The tracking itself runs once for the whole browser (tracker.js);
// this script gets the gaze point for this tab.
// Pause = eyes stay on one line of text for a few seconds, or go back up to re-read it.
// Then Linger opens the card for the hard word on that line closest to where you're looking.
(() => {
  'use strict';
  if (window.__lingerGaze) return;
  const L = window.__lingerAPI;
  if (!L) return;
  const G = { on: false, status: 'off', msg: '', secs: L.settings.pauseSecs || 3, last: 0, port: null, dpr: null };
  const BAND = 30; // px: one "line" of text for the webcam's accuracy

  // ---------- small UI (shadow DOM) ----------
  const host = document.createElement('div');
  host.id = 'linger-gaze';
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    * { box-sizing: border-box; font-family: 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .chip { position: fixed; left: 16px; bottom: 16px; pointer-events: auto; display: flex; align-items: center; gap: 8px; background: #1F2AA8; color: #FFFFFF; border-radius: 99px; padding: 6px 8px 6px 12px; font-size: 13px; font-weight: 700; box-shadow: 0 8px 20px rgba(16, 20, 80, 0.3); }
    .chip button { border: 0; border-radius: 99px; height: 28px; padding: 0 10px; font: inherit; font-size: 12px; cursor: pointer; background: rgba(255, 255, 255, 0.18); color: #FFFFFF; }
    .live { width: 8px; height: 8px; border-radius: 50%; background: #9BE3C4; }
    .chip.lost { background: #A81F64; } .chip.lost .live { background: #FFD98A; }
    .cursor { position: fixed; height: 3px; border-radius: 3px; background: rgba(109, 121, 255, 0.55); box-shadow: 0 0 8px rgba(109, 121, 255, 0.5); transition: top .25s ease, left .25s ease, width .25s ease; pointer-events: none; }
    .shade { position: fixed; inset: 0; background: rgba(246, 248, 255, 0.92); pointer-events: auto; }
    .msg { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); max-width: 400px; text-align: center; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 16px; padding: 20px; color: #14161F; font-size: 14px; }
    .msg h2 { margin: 0 0 6px; color: #1F2AA8; font-size: 20px; }
    .msg button { margin-top: 12px; height: 40px; padding: 0 18px; border-radius: 99px; border: 0; background: linear-gradient(90deg, #6D79FF, #2B39B2); color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer; }
    .msg .ghost { background: #FFFFFF; color: #1F2AA8; border: 1px solid #B1B7FF; margin-left: 6px; }
    .dot { position: fixed; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: #6D79FF; box-shadow: 0 0 0 10px rgba(109, 121, 255, 0.22); transition: left .35s ease, top .35s ease, transform .35s ease; }
    .dot::after { content: ""; position: absolute; inset: 11px; border-radius: 50%; background: #FFFFFF; }
    .dot.rec { transform: scale(0.7); }
    .bar { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); width: min(360px, 80vw); height: 8px; border-radius: 99px; background: #EAEFFF; overflow: hidden; }
    .bar span { display: block; height: 100%; width: 0; background: #6D79FF; }
    .ask { position: fixed; pointer-events: auto; background: #1F2AA8; color: #FFFFFF; border-radius: 14px; padding: 10px 12px; font-size: 13px; display: flex; gap: 8px; align-items: center; box-shadow: 0 10px 24px rgba(16, 20, 80, 0.35); }
    .ask button { border: 0; border-radius: 99px; height: 30px; padding: 0 12px; font: inherit; font-weight: 700; font-size: 12px; cursor: pointer; }
    .ask .yes { background: #FFFFFF; color: #1F2AA8; } .ask .no { background: transparent; color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.4); }
  </style><div id="ui"></div>`;
  const ui = root.getElementById('ui');
  const attach = () => { if (!host.isConnected) document.documentElement.appendChild(host); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function chip() {
    let c = root.querySelector('.chip');
    if (!G.on) { if (c) c.remove(); return; }
    if (!c) {
      c = document.createElement('div'); c.className = 'chip'; ui.appendChild(c);
      c.innerHTML = '<span class="live"></span><span class="label"></span><button data-a="recal">Recalibrate</button><button data-a="off">Turn off</button>';
      c.onclick = (e) => { const a = e.target.dataset && e.target.dataset.a; if (a && api) chrome.runtime.sendMessage({ type: a === 'recal' ? 'eye-recal' : 'eye-off' }).catch(() => {}); };
    }
    const bad = G.status !== 'ok' && G.status !== 'loading';
    c.classList.toggle('lost', bad);
    c.querySelector('.label').textContent = (bad && G.msg) || LABEL[G.status] || LABEL.ok;
    c.querySelector('[data-a="recal"]').textContent = G.status === 'nomodel' || G.status === 'error' ? 'Set up' : 'Recalibrate';
  }

  // ---------- connection to the tracker ----------
  // The camera and face model run once for the whole browser (tracker.html). This tab just receives where
  // on the screen you're looking, converts it to a spot on this page, and decides if you're stuck.
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  const zoom = () => (G.dpr ? devicePixelRatio / G.dpr : 1);
  const toPage = (sx, sy) => { const z = zoom(); return [(sx - screenX - (outerWidth - innerWidth * z) / 2) / z, (sy - screenY - (outerHeight - innerHeight * z)) / z]; };
  const toScreen = (x, y) => { const z = zoom(); return [screenX + (outerWidth - innerWidth * z) / 2 + x * z, screenY + (outerHeight - innerHeight * z) + y * z]; };
  const LABEL = { loading: 'Starting eye tracking…', ok: 'Linger eye tracking', noface: 'Can’t see your eyes. Face the camera.', moved: 'Sit like you did when you set it up', nomodel: 'Eye tracking needs setting up', error: 'Eye tracking stopped' };
  function setStatus(st) { G.status = st.s; G.msg = st.msg || ''; chip(); }
  function connect() {
    if (!api) return;
    const want = G.on && !document.hidden;
    if (!want) { if (G.port) { try { G.port.disconnect(); } catch {} G.port = null; } return; }
    if (G.port) return;
    const port = chrome.runtime.connect({ name: 'gaze' });
    G.port = port;
    port.onMessage.addListener((m) => {
      if (m.status) setStatus(m.status);
      if (m.g && document.hasFocus()) { const [x, y] = toPage(m.g[0], m.g[1]); onGaze({ x, y }); }
    });
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      if (G.port === port) G.port = null;
      if (!G.on) return;
      // The tracker isn't running (browser restarted, or it was closed): ask for it, then try again.
      setStatus({ s: 'loading' });
      chrome.runtime.sendMessage({ type: 'eye-ensure' }).catch(() => {});
      setTimeout(connect, 1500);
    });
  }
  function setOn(on) {
    if (on === G.on) return;
    G.on = on; G.status = on ? 'loading' : 'off';
    if (on) attach(); else { ui.querySelectorAll('.ask').forEach((n) => n.remove()); L.askOpen = false; clearLine(); showCursor(null); }
    hist.length = 0; trail.length = 0;
    chip(); connect();
  }
  const send = (m) => { if (G.port) try { G.port.postMessage(m); } catch {} };
  if (api) {
    chrome.storage.local.get({ eyeOn: false, gazeModel: null, pauseSecs: 3 }, (v) => { G.dpr = v.gazeModel && v.gazeModel.dpr; G.acc = v.gazeModel && v.gazeModel.acc; G.secs = v.pauseSecs; setOn(!!v.eyeOn); });
    chrome.storage.onChanged.addListener((ch) => {
      if (ch.pauseSecs) G.secs = ch.pauseSecs.newValue;
      if (ch.gazeModel) G.dpr = ch.gazeModel.newValue && ch.gazeModel.newValue.dpr;
      if (ch.eyeOn) setOn(!!ch.eyeOn.newValue);
    });
    document.addEventListener('visibilitychange', connect);
  }

  // ---------- pause detection ----------
  // Webcam gaze jumps a line or two at a time, so don't time one exact line. Instead, look at the
  // last few seconds as a whole: if most of the gaze landed on one line (or right next to it), that's a pause.
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const hist = [];   // recent samples: { t, x, y } with y in page coordinates (so scrolling doesn't matter)
  const trail = [];  // where the eyes settled every ~0.5 s, for spotting re-reading
  const fired = [];  // recent prompts, so the same line doesn't prompt again right away
  let lastSettle = 0;
  // Snap a point to the real line of text under it.
  function lineAt(x, y) {
    host.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    host.style.display = '';
    if (!el || el.closest('#linger-ui')) return null;
    const block = el.closest('p, li, td, dd, blockquote, h1, h2, h3, h4, h5, h6, figcaption, article, section, div');
    if (!block) return null;
    let rect = null;
    if (r && r.startContainer.nodeType === 3 && block.contains(r.startContainer)) {
      const rr = document.createRange(), n = r.startContainer, o = Math.min(r.startOffset, n.length - 1);
      if (o >= 0) { rr.setStart(n, o); rr.setEnd(n, Math.min(n.length, o + 1)); rect = rr.getBoundingClientRect(); }
    }
    if (!rect || !rect.height) return { block, top: Math.round((y + scrollY) / BAND) * BAND, h: BAND };
    return { block, top: Math.round(rect.top + scrollY), h: Math.round(rect.height) };
  }
  const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) * f)]; };
  const recentNear = (top, h) => fired.some((f) => performance.now() - f.t < 12000 && Math.abs(f.top - top) < h);
  // Webcam gaze is noisy (often more than a line off), so don't trust single points. Use medians:
  // reading = eyes sweep across the line and drift down the page; stuck = they stay in one place.
  function onGaze(d) {
    if (!d || !G.on || document.hidden) return;
    const now = performance.now();
    if (G.last && now - G.last > 700) { hist.length = 0; trail.length = 0; } // a gap: start fresh
    G.last = now;
    hist.push({ t: now, x: d.x, y: d.y + scrollY });
    const W = G.secs * 1000;
    while (hist.length && now - hist[0].t > W) hist.shift();
    // Every half second, note where the eyes have settled (also drives the "where I'm looking" bar).
    if (now - lastSettle > 500) {
      lastSettle = now;
      const recent = hist.filter((s) => now - s.t < 800);
      if (recent.length >= 8) {
        const mx = median(recent.map((s) => s.x)), my = median(recent.map((s) => s.y));
        const ln = lineAt(mx, my - scrollY);
        trail.push({ t: now, x: mx, y: my, ln });
        showCursor(ln);
      }
      while (trail.length && now - trail[0].t > 8000) trail.shift();
    }
    if (L.askOpen || now < (G.cool || 0) || hist.length < 20) return;
    // Long look: over the last few seconds the eyes neither moved down a line nor swept across it.
    if (now - hist[0].t >= W * 0.9) {
      const third = Math.max(5, Math.floor(hist.length / 3));
      const yStart = median(hist.slice(0, third).map((s) => s.y)), yEnd = median(hist.slice(-third).map((s) => s.y));
      const xs = hist.map((s) => s.x), spread = q(xs, 0.75) - q(xs, 0.25);
      const mx = median(xs), my = median(hist.map((s) => s.y));
      const ln = lineAt(mx, my - scrollY);
      if (ln) {
        const h = Math.max(ln.h, 18), width = ln.block.getBoundingClientRect().width;
        const still = Math.abs(yEnd - yStart) < h * 0.8 && spread < Math.max(200, width * 0.3);
        if (still && !recentNear(ln.top, h)) return fire(ln, mx, 'You looked at this spot for ' + G.secs + 's');
      }
    }
    // Re-read: the eyes settled clearly higher than where they had already been, twice in a row (~1 s).
    const n = trail.length;
    if (n >= 4) {
      const cur = trail[n - 1], prev = trail[n - 2];
      const h = Math.max((cur.ln && cur.ln.h) || 24, 18);
      if (cur.ln && Math.abs(cur.y - prev.y) < h * 0.7) {
        const lowest = Math.max(...trail.slice(0, n - 2).map((t) => t.y));
        if (lowest - cur.y > h * 1.5 && !recentNear(cur.ln.top, h)) return fire(cur.ln, cur.x, 'You went back to re-read this line');
      }
    }
  }
  // Light bar under the line Linger thinks you're reading (helps people trust and adjust the tracking).
  function showCursor(b) {
    let c = root.querySelector('.cursor');
    if (!b || !L.settings.showGaze || !b.block) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.className = 'cursor'; ui.appendChild(c); }
    const br = b.block.getBoundingClientRect();
    c.style.left = br.left + 'px'; c.style.width = br.width + 'px';
    c.style.top = (b.top - scrollY + b.h) + 'px';
  }
  let lineEl = null;
  const clearLine = () => { if (lineEl) lineEl.classList.remove('linger-line'); lineEl = null; };
  // Pick the underlined word on that line (or the line next to it) nearest to where the eyes were.
  function fire(b, x, why) {
    fired.push({ t: performance.now(), top: b.top });
    hist.length = 0; trail.length = 0;
    const words = [...document.querySelectorAll('.linger-w')].filter((w) => { const r = w.getBoundingClientRect(); const top = r.top + scrollY; return r.height && Math.abs(top - b.top) <= b.h * 1.7; });
    let best = null, bestD = Infinity;
    words.forEach((w) => { const r = w.getBoundingClientRect(); const dy = Math.abs(r.top + scrollY - b.top) / Math.max(b.h, 1); const dd = dy * 400 + Math.abs((r.left + r.right) / 2 - x); if (dd < bestD) { bestD = dd; best = w; } });
    if (!best) return; // nothing hard on this line: just reading
    clearLine(); lineEl = best; best.classList.add('linger-line');
    ask(best, why);
  }
  function closeAsk() { const a = root.querySelector('.ask'); if (a) a.remove(); if (L) L.askOpen = false; }
  // Ask first (like the phone app); answers are logged so the team can see how often it was right.
  function ask(word, why) {
    closeAsk(); L.askOpen = true;
    const r = word.getBoundingClientRect();
    const a = document.createElement('div'); a.className = 'ask'; a.dataset.why = why;
    const w = word.textContent.replace(/[<>&"]/g, '');
    a.innerHTML = `<span>👁 Stuck on <b>${w}</b>?</span><button class="no">No</button><button class="yes">Yes, explain</button>`;
    a.style.left = Math.min(Math.max(8, r.left), innerWidth - 300) + 'px';
    a.style.top = Math.min(r.bottom + 8, innerHeight - 60) + 'px';
    ui.appendChild(a);
    const log = (ans) => { try { chrome.storage.local.get({ gazeLog: [] }, (v) => chrome.storage.local.set({ gazeLog: [...v.gazeLog, { t: Date.now(), site: location.hostname, word: w, why, ans, err: G.acc }].slice(-500) })); } catch {} };
    a.querySelector('.no').onclick = () => { log('no'); closeAsk(); clearLine(); G.cool = performance.now() + 6000; hist.length = 0; trail.length = 0; }; // don't nag
    a.querySelector('.yes').onclick = () => {
      log('yes'); closeAsk(); clearLine();
      // They were looking at this word: use it as one more calibration point.
      const c = word.getBoundingClientRect(); send({ type: 'learn', s: toScreen((c.left + c.right) / 2, (c.top + c.bottom) / 2), strong: true });
      L.openCard(word, why);
    };
  }
  window.addEventListener('linger-card-closed', () => { G.cool = performance.now() + 4000; hist.length = 0; trail.length = 0; });
  // People look where they click, so every click on the page teaches the tracker a little more.
  document.addEventListener('click', (e) => { if (G.on && e.isTrusted) send({ type: 'learn', s: toScreen(e.clientX, e.clientY) }); }, true);
  // feed/simOn are for the noisy-gaze simulation on the test page (no extension there).
  window.__lingerGaze = { get on() { return G.on; }, setSecs: (s) => { G.secs = s; }, simOn: () => { attach(); G.on = true; G.status = 'ok'; chip(); }, feed: (x, y) => onGaze({ x, y }) };
})();

// Linger eye tracking on any page (injected with WebGazer only when the user turns it on).
// Pause = eyes stay on one line of text for a few seconds, or go back up to re-read it.
// Then Linger opens the card for the hard word on that line closest to where you're looking.
(() => {
  'use strict';
  if (window.__lingerGaze) { if (!window.__lingerGaze.on) window.__lingerGaze.start(); return; }
  const L = window.__lingerAPI;
  const wg = window.webgazer;
  const G = { on: false, calibrating: false, secs: (L && L.settings.pauseSecs) || 3, samples: [], last: 0, trained: !!window.__lingerSim, err: null };
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
    if (!c) { c = document.createElement('div'); c.className = 'chip'; ui.appendChild(c); }
    c.innerHTML = '<span class="live"></span><span class="label">Linger eye tracking</span><button data-a="recal">Recalibrate</button><button data-a="off">Turn off</button>';
    c.onclick = (e) => { const a = e.target.dataset && e.target.dataset.a; if (a === 'recal') calibrate(); if (a === 'off') stop(); };
  }

  // ---------- start / stop ----------
  // Start-up, step by step with visible progress, so nothing fails silently.
  // (WebGazer's own begin() never finishes if the camera can't start, so check the camera ourselves first.)
  async function start() {
    attach();
    const fail = (title, body, why) => { busyMsg(null); message(title, body); report(why || title); G.on = false; chip(); };
    if (!wg) return fail('Eye tracking couldn’t load', 'Reload the page and try again.', 'webgazer missing');
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      return fail('This page can’t use the camera', 'Eye tracking works on secure (https) websites. Try another page, like the Linger test page.', 'insecure context');
    try { if (document.featurePolicy && !document.featurePolicy.allowsFeature('camera')) return fail('This website blocks the camera', 'Some sites don’t allow any camera use. Try eye tracking on another website, like the Linger test page.', 'camera blocked by site policy'); } catch {}
    busyMsg('Starting the camera…', 'If Chrome asks to use your camera, click Allow.');
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      probe.getTracks().forEach((t) => t.stop());
    } catch (e) {
      const n = e && e.name;
      if (n === 'NotAllowedError' || n === 'SecurityError') return fail('Camera access is blocked', 'Click the camera icon at the right of the address bar, choose “Always allow”, then turn eye tracking on again.', 'camera ' + n);
      if (n === 'NotFoundError' || n === 'OverconstrainedError') return fail('No camera found', 'Linger needs a webcam for eye tracking.', 'camera ' + n);
      if (n === 'NotReadableError' || n === 'AbortError') return fail('The camera is busy', 'Another app (like Zoom or FaceTime) may be using it. Close it and try again.', 'camera ' + n);
      return fail('Couldn’t turn on the camera', String((e && e.message) || e), 'camera ' + n);
    }
    busyMsg('Loading eye tracking…', 'The first time can take 10–20 seconds while the face model downloads.');
    try {
      wg.params.camConstraints = { video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' } };
      wg.saveDataAcrossSessions(true);
      wg.setRegression('weightedRidge').setGazeListener(onGaze); // weighted: recent clicks and calibration count more
      const began = await Promise.race([
        new Promise((res) => { wg.begin(() => res('fail')).then(() => res('ok'), (e) => res('error: ' + ((e && e.message) || e))); }),
        wait(45000).then(() => 'timeout')
      ]);
      if (began !== 'ok') return fail('Eye tracking couldn’t start', began === 'timeout' ? 'The face model didn’t load. Check your internet connection and try again.' : 'Try reloading the page, then turn it on again.', 'begin ' + began);
      wg.removeMouseEventListeners();
      wg.showVideoPreview(false).showFaceOverlay(false).showFaceFeedbackBox(false).showPredictionPoints(false).applyKalmanFilter(true);
      // Wait until the tracker actually sees a face before calibrating.
      G.on = true; chip();
      busyMsg('Looking for your face…', 'Sit in front of the camera with light on your face.');
      const t0 = performance.now();
      while (!(G.last > t0) && performance.now() - t0 < 20000) { const p = await wg.getCurrentPrediction().catch(() => null); if (p) break; await wait(300); }
      busyMsg(null);
      report('');
      calibrate();
    } catch (e) {
      fail('Eye tracking couldn’t start', 'Try reloading the page, then turn it on again.', 'start ' + ((e && e.message) || e));
    }
  }
  // A small "working on it" box, so people know something is happening.
  function busyMsg(title, body) {
    let b = root.querySelector('.busy');
    if (!title) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.className = 'shade busy'; ui.appendChild(b); }
    b.innerHTML = `<div class="msg"><h2>${title}</h2><div>${body || ''}</div></div>`;
  }
  // Remember the last problem so the Linger menu can show it.
  function report(why) { try { chrome.storage.local.set({ gazeProblem: why ? { t: Date.now(), site: location.hostname, why } : null }); } catch {} }
  function stop() {
    G.on = false; G.calibrating = false;
    try { wg.end(); } catch {}
    ui.querySelectorAll('.shade, .ask').forEach((n) => n.remove());
    clearLine(); showCursor(null); chip();
  }
  function message(title, body) {
    const s = document.createElement('div'); s.className = 'shade';
    s.innerHTML = `<div class="msg"><h2>${title}</h2><div>${body}</div><button>OK</button></div>`;
    s.querySelector('button').onclick = () => s.remove();
    ui.appendChild(s);
  }

  // ---------- calibration: follow a dot through 16 spots (~20 s), then a quick accuracy check ----------
  const pts16 = () => { const W = innerWidth, H = innerHeight, out = []; [0.1, 0.37, 0.63, 0.9].forEach((fy, j) => { const xs = [0.08, 0.36, 0.64, 0.92].map((fx) => W * fx); (j % 2 ? xs.reverse() : xs).forEach((x) => out.push([Math.round(x), Math.round(H * fy)])); }); return out; };
  async function calibrate() {
    if (!G.on) return;
    G.calibrating = true; closeAsk(); clearLine(); hist.length = 0;
    ui.querySelectorAll('.shade').forEach((n) => n.remove());
    const s = document.createElement('div'); s.className = 'shade';
    s.innerHTML = `<div class="msg"><h2>Follow the dot</h2><div>Sit how you’ll read, about an arm’s length from the screen, face lit from the front. Keep your eyes on the dot and your head still. About 20 seconds.</div><button id="go">Start</button>${G.trained ? '<button class="ghost" id="skip">Skip</button>' : ''}</div>`;
    ui.appendChild(s);
    const choice = await new Promise((res) => { s.querySelector('#go').onclick = () => res('go'); const k = s.querySelector('#skip'); if (k) k.onclick = () => res('skip'); });
    s.querySelector('.msg').remove();
    if (choice === 'go') {
      const pts = pts16();
      const dot = document.createElement('div'); dot.className = 'dot'; s.appendChild(dot);
      const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = '<span></span>'; s.appendChild(bar);
      dot.style.left = pts[0][0] + 'px'; dot.style.top = pts[0][1] + 'px';
      await wait(700);
      for (let k = 0; k < pts.length && G.on; k++) {
        const [x, y] = pts[k];
        dot.classList.remove('rec'); dot.style.left = x + 'px'; dot.style.top = y + 'px';
        await wait(420); dot.classList.add('rec'); // let the eyes land first
        const end = performance.now() + 520;
        while (performance.now() < end) { wg.recordScreenPosition(x, y, 'click'); await wait(35); }
        bar.firstChild.style.width = Math.round((k + 1) / pts.length * 100) + '%';
      }
      G.trained = true;
      // Accuracy check: up-and-down error is what matters for telling lines apart.
      const checks = [[0.25, 0.5], [0.5, 0.5], [0.75, 0.5]].map(([fx, fy]) => [Math.round(innerWidth * fx), Math.round(innerHeight * fy)]);
      bar.remove();
      const errs = [];
      for (const [x, y] of checks) {
        dot.classList.remove('rec'); dot.style.left = x + 'px'; dot.style.top = y + 'px';
        await wait(500);
        const end = performance.now() + 900;
        while (performance.now() < end) { const p = await wg.getCurrentPrediction(); if (p) errs.push(Math.abs(p.y - y)); await wait(60); }
      }
      dot.remove();
      const err = errs.length ? Math.round(median(errs)) : null;
      G.err = err;
      const verdict = err === null ? ['Linger can’t see your eyes', 'Check that your face is in front of the camera with light on it.']
        : err <= 45 ? ['Ready', `Gaze lands about ${err}px from where you look. That’s good enough to tell lines apart.`]
        : err <= 90 ? ['Usable', `Gaze lands about ${err}px off. Turn on “More space between lines” in the Linger menu for better results.`]
        : ['Too noisy', `Gaze lands about ${err}px off. Face a window or lamp, keep your head still, and calibrate again.`];
      const m = document.createElement('div'); m.className = 'msg';
      m.innerHTML = `<h2>${verdict[0]}</h2><div>${verdict[1]}</div><button id="ok">Start reading</button><button class="ghost" id="again">Calibrate again</button>`;
      s.appendChild(m);
      const again = await new Promise((res) => { m.querySelector('#ok').onclick = () => res(false); m.querySelector('#again').onclick = () => res(true); });
      if (again) { s.remove(); G.calibrating = false; return calibrate(); }
    }
    s.remove();
    G.calibrating = false; G.samples = []; hist.length = 0; trail.length = 0; G.cool = performance.now() + 1500;
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
    if (!d || !G.on || G.calibrating || document.hidden) return;
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
    const log = (ans) => { try { chrome.storage.local.get({ gazeLog: [] }, (v) => chrome.storage.local.set({ gazeLog: [...v.gazeLog, { t: Date.now(), site: location.hostname, word: w, why, ans, err: G.err }].slice(-500) })); } catch {} };
    a.querySelector('.no').onclick = () => { log('no'); closeAsk(); clearLine(); G.cool = performance.now() + 6000; hist.length = 0; trail.length = 0; }; // don't nag
    a.querySelector('.yes').onclick = () => {
      log('yes'); closeAsk(); clearLine();
      // They were looking at this word: use it as one more calibration point.
      const c = word.getBoundingClientRect(); for (let i = 0; i < 6; i++) wg.recordScreenPosition((c.left + c.right) / 2, (c.top + c.bottom) / 2, 'click');
      L.openCard(word, why);
    };
  }
  window.addEventListener('linger-card-closed', () => { G.cool = performance.now() + 4000; hist.length = 0; trail.length = 0; });
  // People look where they click, so every click on the page teaches the tracker a little more.
  document.addEventListener('click', (e) => { if (G.on && !G.calibrating && e.isTrusted) wg.recordScreenPosition(e.clientX, e.clientY, 'click'); }, true);
  // Tell people when the camera loses their eyes, instead of silently doing nothing.
  setInterval(() => {
    if (!G.on || G.calibrating) return;
    const lost = performance.now() - (G.last || 0) > 1500;
    const c = root.querySelector('.chip .label');
    if (c) c.textContent = lost ? 'Can’t see your eyes. Face the camera.' : 'Linger eye tracking';
    root.querySelector('.chip') && root.querySelector('.chip').classList.toggle('lost', lost);
  }, 700);

  window.__lingerGaze = { get on() { return G.on; }, start, stop, calibrate, setSecs: (s) => { G.secs = s; } };
  start();
})();

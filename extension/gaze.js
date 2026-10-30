// Linger eye tracking on any page (injected with WebGazer only when the user turns it on).
// Pause = eyes stay on one line of text for a few seconds, or go back up to re-read it.
// Then Linger opens the card for the hard word on that line closest to where you're looking.
(() => {
  'use strict';
  if (window.__lingerGaze) { if (!window.__lingerGaze.on) window.__lingerGaze.start(); return; }
  const L = window.__lingerAPI;
  const wg = window.webgazer;
  const G = { on: false, calibrating: false, secs: (L && L.settings.pauseSecs) || 3, samples: [], last: 0 };
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
    c.innerHTML = '<span class="live"></span>Linger eye tracking<button data-a="recal">Recalibrate</button><button data-a="off">Turn off</button>';
    c.onclick = (e) => { const a = e.target.dataset && e.target.dataset.a; if (a === 'recal') calibrate(); if (a === 'off') stop(); };
  }

  // ---------- start / stop ----------
  async function start() {
    attach();
    if (!wg) { message('Eye tracking couldn’t load', 'Reload the page and try again.'); return; }
    try {
      wg.params.camConstraints = { video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' } };
      wg.saveDataAcrossSessions(true);
      wg.setRegression('ridge').setGazeListener(onGaze);
      await wg.begin();
      wg.removeMouseEventListeners();
      wg.showVideoPreview(false).showFaceOverlay(false).showFaceFeedbackBox(false).showPredictionPoints(false).applyKalmanFilter(true);
      G.on = true; chip();
      calibrate();
    } catch (e) {
      message('Couldn’t turn on the camera', 'Allow camera access for this site (the camera icon in the address bar), then try again.');
    }
  }
  function stop() {
    G.on = false; G.calibrating = false;
    try { wg.end(); } catch {}
    ui.querySelectorAll('.shade, .ask').forEach((n) => n.remove());
    clearLine(); chip();
  }
  function message(title, body) {
    const s = document.createElement('div'); s.className = 'shade';
    s.innerHTML = `<div class="msg"><h2>${title}</h2><div>${body}</div><button>OK</button></div>`;
    s.querySelector('button').onclick = () => s.remove();
    ui.appendChild(s);
  }

  // ---------- calibration: follow a moving dot for ~15 s (no clicking) ----------
  async function calibrate() {
    if (!G.on) return;
    G.calibrating = true; closeAsk(); clearLine();
    ui.querySelectorAll('.shade').forEach((n) => n.remove());
    const s = document.createElement('div'); s.className = 'shade';
    s.innerHTML = '<div class="msg"><h2>Follow the dot</h2><div>Keep your eyes on the blue dot as it moves. Keep your head still. About 15 seconds.</div><button id="go">Start</button><button class="ghost" id="skip">Skip</button></div>';
    ui.appendChild(s);
    const choice = await new Promise((res) => { s.querySelector('#go').onclick = () => res('go'); s.querySelector('#skip').onclick = () => res('skip'); });
    s.querySelector('.msg').remove();
    if (choice === 'go') {
      const W = innerWidth, H = innerHeight, pts = [];
      for (let j = 0; j < 4; j++) { const y = H * (0.12 + 0.76 * j / 3); const xs = [0.1, 0.5, 0.9].map((f) => W * f); (j % 2 ? xs.reverse() : xs).forEach((x) => pts.push([Math.round(x), Math.round(y)])); }
      const dot = document.createElement('div'); dot.className = 'dot'; s.appendChild(dot);
      const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = '<span></span>'; s.appendChild(bar);
      dot.style.left = pts[0][0] + 'px'; dot.style.top = pts[0][1] + 'px';
      await wait(600);
      for (let k = 0; k < pts.length && G.on; k++) {
        const [x, y] = pts[k];
        dot.classList.remove('rec'); dot.style.left = x + 'px'; dot.style.top = y + 'px';
        await wait(450); dot.classList.add('rec');
        const end = performance.now() + 550;
        while (performance.now() < end) { wg.recordScreenPosition(x, y, 'click'); await wait(40); }
        bar.firstChild.style.width = Math.round((k + 1) / pts.length * 100) + '%';
      }
    }
    s.remove();
    G.calibrating = false; G.samples = []; G.cool = performance.now() + 1500; reset();
  }

  // ---------- pause detection ----------
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  let cur = null, since = 0, cand = null, candSince = 0, prev = null, prevDwell = 0, maxBand = -1, curBlock = null;
  const recent = new Map();
  const reset = () => { cur = cand = prev = null; since = candSince = performance.now(); maxBand = -1; curBlock = null; };
  function blockAt(x, y) {
    host.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    host.style.display = '';
    if (!el || el.closest('#linger-ui')) return null;
    return el.closest('p, li, td, dd, blockquote, h1, h2, h3, h4, h5, h6, article, section, div');
  }
  function onGaze(d) {
    if (!d || !G.on || G.calibrating || L.askOpen || document.hidden) return;
    const now = performance.now();
    G.samples.push({ x: d.x, y: d.y, t: now });
    while (G.samples.length && now - G.samples[0].t > 200) G.samples.shift();
    if (G.samples.length < 2) return;
    const x = median(G.samples.map((s) => s.x)), y = median(G.samples.map((s) => s.y));
    const block = blockAt(x, y);
    const band = block ? Math.round((y + scrollY) / BAND) : null;
    const key = block ? band : null;
    if (key !== cand) { cand = key; candSince = now; }
    if (key !== cur && now - candSince >= 120) { // eyes moved to another line
      if (cur !== null) { prev = cur; prevDwell = now - since; }
      if (block !== curBlock) maxBand = -1;
      cur = key; since = candSince; curBlock = block;
      if (key !== null) maxBand = Math.max(maxBand, key);
    }
    if (cur === null || now < (G.cool || 0)) return;
    if (recent.get(cur) && now - recent.get(cur) < 10000) return;
    const dwell = now - since;
    if (dwell >= G.secs * 1000) return fire(x, y, 'You looked at this line for ' + (dwell / 1000).toFixed(1) + 's');
    if (prev !== null && cur < prev && maxBand > cur && prevDwell > 400 && dwell >= 900) return fire(x, y, 'You went back to re-read this line');
  }
  let lineEl = null;
  const clearLine = () => { if (lineEl) lineEl.classList.remove('linger-line'); lineEl = null; };
  // Find the underlined word on the line you're looking at, nearest to your gaze.
  function fire(x, y, why) {
    recent.set(cur, performance.now());
    const words = curBlock ? [...curBlock.querySelectorAll('.linger-w')] : [];
    let best = null, bestD = Infinity;
    words.forEach((w) => { const r = w.getBoundingClientRect(); if (Math.abs((r.top + r.bottom) / 2 - y) > BAND * 1.4) return; const dd = Math.abs((r.left + r.right) / 2 - x); if (dd < bestD) { bestD = dd; best = w; } });
    if (!best) return; // nothing hard on this line: just reading
    clearLine(); lineEl = best; best.classList.add('linger-line');
    ask(best, why);
  }
  function closeAsk() { const a = root.querySelector('.ask'); if (a) a.remove(); if (L) L.askOpen = false; }
  // Ask first (like the phone app); the answer is logged so the team can see how often it was right.
  function ask(word, why) {
    closeAsk(); L.askOpen = true;
    const r = word.getBoundingClientRect();
    const a = document.createElement('div'); a.className = 'ask';
    a.innerHTML = `<span>👁 Stuck on <b>${word.textContent.replace(/[<>&]/g, '')}</b>?</span><button class="no">No</button><button class="yes">Yes, explain</button>`;
    a.style.left = Math.min(Math.max(8, r.left), innerWidth - 300) + 'px';
    a.style.top = Math.min(r.bottom + 8, innerHeight - 60) + 'px';
    ui.appendChild(a);
    const log = (ans) => { try { chrome.storage.local.get({ gazeLog: [] }, (v) => chrome.storage.local.set({ gazeLog: [...v.gazeLog, { t: Date.now(), site: location.hostname, word: word.textContent, why, ans }].slice(-500) })); } catch {} };
    a.querySelector('.no').onclick = () => { log('no'); closeAsk(); clearLine(); G.cool = performance.now() + 2000; since = performance.now(); };
    a.querySelector('.yes').onclick = () => { log('yes'); closeAsk(); clearLine(); L.openCard(word, why); };
  }
  window.addEventListener('linger-card-closed', () => { G.cool = performance.now() + 2000; since = performance.now(); });

  window.__lingerGaze = { get on() { return G.on; }, start, stop, calibrate, setSecs: (s) => { G.secs = s; } };
  start();
})();

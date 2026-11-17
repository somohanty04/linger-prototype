// Linger hand gestures on any page: a feature of its own, separate from eye tracking (Linger menu → Hand gestures).
// The camera and hand model run once for the whole browser (tracker.js); this script gets, for this tab:
//   the pointer (your index fingertip) → a dot on the page. Hold it on a word for a couple of seconds and Linger asks
//     "Want help with this word?"; swipe an open hand right for yes, left for no (or click).
//   open hand swiped up / down → scroll down / up by most of a screen.
//   pinch (thumb on index fingertip), hold, then move up / down → zoom this tab in / out.
// The gestures themselves are worked out in gestures.mjs.
(() => {
  'use strict';
  if (window.__lingerHand && window.__lingerHand.alive && window.__lingerHand.alive()) return;
  document.querySelectorAll('#linger-hand').forEach((n) => n.remove());
  const L = window.__lingerAPI;
  if (!L) return;
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  let dead = false;
  const H = { on: false, port: null, status: 'off', msg: '', secs: 2, cool: 0, zoomShown: 0 };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- UI (shadow DOM, never catches clicks except its own buttons) ----------
  const host = document.createElement('div');
  host.id = 'linger-hand';
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    * { box-sizing: border-box; font-family: 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .ptr { position: fixed; left: 0; top: 0; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; pointer-events: none; will-change: transform;
      background: conic-gradient(#1F2AA8 calc(var(--p, 0) * 1turn), rgba(31, 42, 168, 0.18) 0); box-shadow: 0 0 0 2px #FFFFFF, 0 2px 8px rgba(16, 20, 80, 0.35); }
    .ptr::after { content: ""; position: absolute; inset: 7px; border-radius: 50%; background: #FFFFFF; }
    .box { position: fixed; border-radius: 4px; outline: 2px solid #1F2AA8; outline-offset: 2px; background: rgba(255, 217, 138, 0.45); pointer-events: none; }
    .ask { position: fixed; pointer-events: auto; background: #1F2AA8; color: #FFFFFF; border-radius: 14px; padding: 10px 12px; font-size: 13px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: min(460px, calc(100vw - 16px)); box-shadow: 0 10px 24px rgba(16, 20, 80, 0.35); }
    .ask button { border: 0; border-radius: 99px; height: 30px; padding: 0 12px; font: inherit; font-weight: 700; font-size: 12px; cursor: pointer; }
    .ask .yes { background: #FFFFFF; color: #1F2AA8; } .ask .no { background: transparent; color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.6); }
    .ask button:focus-visible { outline: 3px solid #FFFFFF; outline-offset: 2px; }
    .ask button.picked { outline: 3px solid #9BE3C4; outline-offset: 2px; }
    .ask .hint { font-size: 11px; font-weight: 600; white-space: nowrap; }
    .chip { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); pointer-events: auto; display: flex; align-items: center; gap: 8px; background: #1F2AA8; color: #FFFFFF; border-radius: 99px; padding: 6px 8px 6px 12px; font-size: 13px; font-weight: 700; box-shadow: 0 8px 20px rgba(16, 20, 80, 0.3); white-space: nowrap; }
    .chip button { border: 0; border-radius: 99px; height: 28px; padding: 0 10px; font: inherit; font-size: 12px; cursor: pointer; background: rgba(255, 255, 255, 0.18); color: #FFFFFF; }
    .chip button:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
    .chip.lost { background: #A81F64; }
    .live { width: 8px; height: 8px; border-radius: 50%; background: #9BE3C4; } .chip.idle .live { background: rgba(255, 255, 255, 0.5); }
    .zoom { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); background: #14161F; color: #FFFFFF; border-radius: 99px; padding: 8px 14px; font-size: 14px; font-weight: 700; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
  </style><div id="ui"></div>`;
  const ui = root.getElementById('ui');
  const attach = () => { if (!host.isConnected) document.documentElement.appendChild(host); };
  const el = (cls) => { let e = root.querySelector('.' + cls); if (!e) { e = document.createElement('div'); e.className = cls; ui.appendChild(e); } return e; };
  const drop = (cls) => { const e = root.querySelector('.' + cls); if (e) e.remove(); };

  // Status chip: shows hand gestures are on, what the hand is doing, and a way to turn it off.
  const LABEL = { loading: 'Starting hand gestures…', ok: '👋 Point at a word to get help', point: '👆 Hold on a word for help', palm: '✋ Swipe up or down to scroll', pinch: '🤏 Move up or down to zoom', nohand: '👋 Hand gestures on' };
  let chipState = '';
  function chip(state) {
    if (!H.on) { drop('chip'); chipState = ''; return; }
    const bad = H.status === 'error';
    const key = bad ? 'error:' + H.msg : state || H.status;
    if (key === chipState) return;
    chipState = key;
    const c = el('chip');
    if (!c.dataset.ready) {
      c.dataset.ready = '1'; c.setAttribute('role', 'status');
      c.innerHTML = '<span class="live"></span><span class="label"></span><button type="button" data-a="fix" hidden>Fix</button><button type="button" data-a="off">Turn off</button>';
      c.onclick = (e) => {
        const a = e.target.dataset && e.target.dataset.a;
        if (!a || !api) return;
        try {
          if (a === 'off') chrome.storage.local.set({ handOn: false });
          if (a === 'fix') chrome.runtime.sendMessage({ type: 'hand-setup' }).catch(() => {});
        } catch { stale(); }
      };
    }
    c.classList.toggle('lost', bad);
    c.classList.toggle('idle', !bad && (state === 'nohand' || H.status === 'loading'));
    c.querySelector('.label').textContent = bad ? H.msg : LABEL[state] || LABEL[H.status] || LABEL.ok;
    c.querySelector('[data-a="fix"]').hidden = !bad;
  }
  function stale() { H.status = 'error'; H.msg = 'Linger was updated. Reload this page.'; chip(); }

  // ---------- pointer and "hold on a word" ----------
  const R = 28;             // px: how still the pointer must be to count as holding
  const trail = [];         // recent pointer spots { t, x, y }
  const asked = [];         // recent questions { t, word }, so the same word isn't asked about again right away
  let ask = null;           // the open question: { word, hit, el }
  function hideHost(fn) { const d = host.style.display; host.style.display = 'none'; try { return fn(); } finally { host.style.display = d; } }
  function onPointer(p) {
    const x = p.x * innerWidth, y = p.y * innerHeight, now = performance.now();
    const dot = el('ptr');
    dot.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    trail.push({ t: now, x, y });
    const W = H.secs * 1000;
    while (trail.length && now - trail[0].t > W) trail.shift();
    // Progress: how long the pointer has stayed within R of where it is now.
    let since = now;
    for (let i = trail.length - 1; i >= 0; i--) { if (Math.hypot(trail[i].x - x, trail[i].y - y) > R) break; since = trail[i].t; }
    const held = now - since;
    const busy = ask || L.askOpen || now < H.cool;
    dot.style.setProperty('--p', busy ? 0 : Math.min(1, held / W).toFixed(3));
    if (busy || held < W * 0.97) return;
    // Held still long enough: the word under the pointer (centre of where it stayed).
    const pts = trail.filter((s) => s.t >= since), mx = pts.reduce((a, s) => a + s.x, 0) / pts.length, my = pts.reduce((a, s) => a + s.y, 0) / pts.length;
    trail.length = 0;
    const hit = hideHost(() => L.wordAt(mx, my));
    if (!hit) { H.cool = now + 600; return; }
    if (asked.some((a) => a.word === hit.word.toLowerCase() && now - a.t < 10000)) { H.cool = now + 1500; return; }
    asked.push({ t: now, word: hit.word.toLowerCase() });
    while (asked.length > 20) asked.shift();
    openAsk(hit);
  }
  function placeAsk() {
    if (!ask) return;
    const r = ask.hit.span && ask.hit.span.isConnected ? ask.hit.span.getBoundingClientRect() : ask.hit.range.getBoundingClientRect();
    const box = el('box');
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const a = ask.el, h = a.offsetHeight || 50;
    a.style.left = Math.max(8, Math.min(r.left, innerWidth - (a.offsetWidth || 320) - 8)) + 'px';
    a.style.top = (r.bottom + 8 + h > innerHeight - 8 ? Math.max(8, r.top - h - 8) : r.bottom + 8) + 'px';
  }
  function openAsk(hit) {
    closeAsk();
    L.askOpen = true; // eye tracking won't ask at the same time
    if (hit.span && L.prefetch) L.prefetch(hit.span);
    const a = document.createElement('div');
    a.className = 'ask'; a.setAttribute('role', 'dialog'); a.setAttribute('aria-label', 'Want help with this word?');
    const w = hit.word.replace(/[<>&"]/g, '');
    // No on the left and Yes on the right, matching the swipes (to your right = yes, to your left = no).
    a.innerHTML = `<span>👆 Want help with this word? <b>${w}</b></span><button type="button" class="no">No</button><button type="button" class="yes">Yes, explain</button><span class="hint">✋ swipe ← no · yes →</span>`;
    ui.appendChild(a);
    ask = { word: w, hit, el: a };
    placeAsk();
    const log = (ans, how) => { try { chrome.storage.local.get({ handLog: [] }, (v) => chrome.storage.local.set({ handLog: [...v.handLog, { t: Date.now(), site: location.hostname, word: w, ans, how }].slice(-500) })); } catch {} };
    a.querySelector('.no').onclick = () => { log('no', a.dataset.how || 'click'); closeAsk(); H.cool = performance.now() + 3000; };
    a.querySelector('.yes').onclick = () => {
      log('yes', a.dataset.how || 'click');
      const span = hit.span && hit.span.isConnected ? hit.span : null, r = hit.range.getBoundingClientRect();
      closeAsk();
      if (span) L.openCard(span, 'hand'); else hideHost(() => L.openWordAt((r.left + r.right) / 2, (r.top + r.bottom) / 2, 'hand'));
      H.cool = performance.now() + 2500;
    };
  }
  function closeAsk() {
    if (!ask) return;
    ask.el.remove(); drop('box'); ask = null; L.askOpen = false;
  }
  // Open hand swiped while the question is open: to your right = "Yes, explain", to your left = "No".
  function answer(dir) {
    if (!ask) return false;
    const b = ask.el.querySelector(dir === 'right' ? '.yes' : '.no');
    b.classList.add('picked'); ask.el.dataset.how = 'swipe';
    setTimeout(() => b.click(), 220); // a short flash so it's clear which answer the swipe picked
    return true;
  }

  // ---------- scrolling and zoom ----------
  // Scroll whatever is scrollable in the middle of the page (many web apps scroll a panel, not the window).
  function scroller() {
    let e = hideHost(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2));
    for (; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 20) return e;
    }
    return null;
  }
  function scroll(down) {
    closeAsk();
    const s = scroller(), dy = (down ? 1 : -1) * Math.round((s ? s.clientHeight : innerHeight) * 0.8);
    (s || window).scrollBy({ top: dy, behavior: reduce() ? 'auto' : 'smooth' });
  }
  function zoom(dir) {
    if (!api) return;
    try {
      chrome.runtime.sendMessage({ type: 'hand-zoom', dir }).then((r) => {
        if (!r || !r.ok) return;
        const z = el('zoom'); z.textContent = '🔍 ' + Math.round(r.zoom * 100) + '%';
        const t = (H.zoomShown = performance.now());
        setTimeout(() => { if (H.zoomShown === t) drop('zoom'); }, 1500);
      }).catch(() => {});
    } catch { stale(); }
  }

  // ---------- each message from the tracker ----------
  function onHand(h) {
    if (!H.on || document.hidden || !document.hasFocus()) { drop('ptr'); return; }
    const pose = h.hand ? h.pose : null;
    for (const e of h.events || []) {
      if (e === 'left' || e === 'right') answer(e);
      else if (e === 'scroll-down' || e === 'scroll-up') { if (!ask) scroll(e === 'scroll-down'); }
      else if (e === 'zoom-in' || e === 'zoom-out') zoom(e === 'zoom-in' ? 'in' : 'out');
    }
    if (pose === 'point' && h.pointer) onPointer(h.pointer);
    else { drop('ptr'); trail.length = 0; }
    chip(!h.hand ? 'nohand' : pose === 'point' || pose === 'palm' || pose === 'pinch' ? pose : 'ok');
  }

  // ---------- connection ----------
  function setStatus(st) { H.status = st.s; H.msg = st.msg || ''; chip(); }
  function connect() {
    if (!api || dead) return;
    const want = H.on && !document.hidden;
    if (!want) { if (H.port) { try { H.port.disconnect(); } catch {} H.port = null; } return; }
    if (H.port) return;
    let port;
    try { port = chrome.runtime.connect({ name: 'hand' }); } catch { stale(); return; }
    H.port = port;
    port.onMessage.addListener((m) => { if (m.hstatus) setStatus(m.hstatus); if (m.h) onHand(m.h); });
    port.onDisconnect.addListener(() => {
      try { void chrome.runtime.lastError; } catch {}
      if (H.port === port) H.port = null;
      if (!(chrome.runtime && chrome.runtime.id)) { dead = true; H.on = false; host.remove(); return; }
      if (!H.on) return;
      // The camera page isn't running (browser restarted, or it was closed): ask for it, then try again.
      setStatus({ s: 'loading' });
      chrome.runtime.sendMessage({ type: 'hand-ensure' }).catch(() => {});
      setTimeout(connect, 1500);
    });
  }
  function setOn(on) {
    if (dead || on === H.on) return;
    H.on = on; H.status = on ? 'loading' : 'off';
    if (on) attach(); else { closeAsk(); drop('ptr'); drop('zoom'); trail.length = 0; }
    chip(); connect();
  }
  if (api) {
    const E = { handOn: false, off: false, paused: [] }, site = location.hostname || 'file';
    const sync = () => setOn(!!E.handOn && !E.off && !(E.paused || []).includes(site) && window === window.top);
    chrome.storage.local.get({ handOn: false, off: false, paused: [], handSecs: 2 }, (v) => { H.secs = v.handSecs; Object.assign(E, { handOn: v.handOn, off: v.off, paused: v.paused }); sync(); });
    chrome.storage.onChanged.addListener((ch) => {
      if (dead) return;
      if (ch.handSecs) H.secs = ch.handSecs.newValue;
      ['handOn', 'off', 'paused'].forEach((k) => { if (ch[k]) E[k] = ch[k].newValue; });
      if (ch.handOn || ch.off || ch.paused) sync();
    });
    document.addEventListener('visibilitychange', connect);
    document.addEventListener('linger-retire', () => {
      dead = true; H.on = false;
      if (H.port) { try { H.port.disconnect(); } catch {} H.port = null; }
      host.remove();
    });
  }
  window.addEventListener('scroll', placeAsk, { passive: true });
  window.addEventListener('resize', placeAsk);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ask) closeAsk(); }, true);
  // For the test page (no extension there): turn it on and feed tracker messages by hand.
  window.__lingerHand = { alive: () => !dead && (!api || !!(chrome.runtime && chrome.runtime.id)), simOn: (secs) => { if (secs) H.secs = secs; attach(); H.on = true; H.status = 'ok'; chip(); }, feed: (h) => onHand(h), get asking() { return ask ? ask.word : null; } };
})();

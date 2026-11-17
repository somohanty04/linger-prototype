// Linger hand gestures page: allows the camera (Chrome only asks on a page you can see), turns hand gestures on,
// and ticks off each gesture as you try it. The pointer, question, scrolling and zoom are hand.js, the same script
// Linger runs on every website; this page listens to the same tracker to show what it sees.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  if (!api) return;
  const NAME = { point: '👆 Pointing', palm: '✋ Open hand', pinch: '🤏 Pinch', other: 'Hand seen' };
  let port = null, stream = null;

  const tick = (c) => { const li = document.querySelector(`[data-c="${c}"]`); if (li) li.classList.add('done'); };
  async function preview() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' } });
      $('video').srcObject = stream; await $('video').play().catch(() => {});
      return true;
    } catch (e) {
      const n = e && e.name;
      $('setup').hidden = false;
      $('setupMsg').textContent = n === 'NotAllowedError' ? 'The camera is blocked for Linger. Click the camera icon in the address bar, choose Allow, then try again.'
        : n === 'NotFoundError' ? 'No camera found. Connect a webcam and try again.'
          : n === 'NotReadableError' ? 'The camera is busy. Close Zoom, FaceTime or other apps using it, then try again.' : 'Couldn’t turn on the camera. Try again.';
      $('setupBtn').textContent = 'Try again';
      return false;
    }
  }
  async function turnOn() {
    if (!(await preview())) return;
    $('setup').hidden = true;
    // The camera page started before the camera was allowed: restart it so it can use the camera now.
    await chrome.runtime.sendMessage({ type: 'camera-ready' }).catch(() => {});
    await chrome.storage.local.set({ handOn: true });
  }
  $('setupBtn').onclick = turnOn;

  function listen() {
    if (port) return;
    port = chrome.runtime.connect({ name: 'hand' });
    port.onMessage.addListener((m) => {
      if (m.hstatus) $('state').textContent = m.hstatus.s === 'ok' ? 'on' : m.hstatus.s === 'error' ? m.hstatus.msg : 'starting…';
      if (!m.h) return;
      $('now').textContent = m.h.hand ? NAME[m.h.pose] || NAME.other : 'No hand in view';
      if (m.h.hand && m.h.pose === 'point') tick('point');
      for (const e of m.h.events || []) {
        if (e === 'scroll-up' || e === 'scroll-down') tick('scroll');
        if (e === 'zoom-in' || e === 'zoom-out') tick('zoom');
      }
    });
    port.onDisconnect.addListener(() => { void chrome.runtime.lastError; port = null; setTimeout(() => chrome.storage.local.get({ handOn: false }, (v) => { if (v.handOn) listen(); }), 1500); });
  }
  // hand.js tells the page when it asks and when it's answered (only on Linger's own pages).
  const ask = new MutationObserver(() => {
    const ui = document.getElementById('linger-hand');
    const a = ui && ui.shadowRoot && ui.shadowRoot.querySelector('.ask');
    if (a) { tick('ask'); if (a.dataset.how === 'swipe') tick('answer'); a.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (a.dataset.how === 'swipe') tick('answer'); }, { once: true })); }
  });
  const watch = () => { const ui = document.getElementById('linger-hand'); if (ui && ui.shadowRoot) ask.observe(ui.shadowRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-how'] }); else setTimeout(watch, 500); };
  watch();

  function show(on) {
    $('toggle').hidden = false;
    $('toggle').textContent = on ? 'Turn off hand gestures' : 'Turn on hand gestures';
    if (on) { listen(); $('setup').hidden = true; if (!stream) preview(); }
    else { if (port) { try { port.disconnect(); } catch {} port = null; } $('state').textContent = 'off'; $('now').textContent = '–'; }
  }
  $('toggle').onclick = async () => { const { handOn } = await chrome.storage.local.get({ handOn: false }); if (handOn) chrome.storage.local.set({ handOn: false }); else turnOn(); };
  chrome.storage.onChanged.addListener((ch) => { if (ch.handOn) show(!!ch.handOn.newValue); if (ch.handSecs) { $('secs').value = ch.handSecs.newValue; $('secsOut').textContent = ch.handSecs.newValue; } });
  chrome.storage.local.get({ handOn: false, handSecs: 2 }, async (v) => {
    $('secs').value = v.handSecs; $('secsOut').textContent = v.handSecs;
    // Already allowed: no need to ask again.
    let granted = false;
    try { granted = (await navigator.permissions.query({ name: 'camera' })).state === 'granted'; } catch {}
    if (v.handOn && granted) show(true);
    else if (granted) { $('setupMsg').textContent = 'Turn on hand gestures to try them here and on every website.'; $('setupBtn').textContent = 'Turn on hand gestures'; }
  });
  $('secs').oninput = (e) => { $('secsOut').textContent = e.target.value; };
  $('secs').onchange = (e) => chrome.storage.local.set({ handSecs: Number(e.target.value) });
})();

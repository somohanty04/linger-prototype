(() => {
  'use strict';

  // ---------- content ----------
  const LINES = [
    { t: 'Dear Tenant,' },
    { t: 'You are hereby notified that the premises at 412 Liberty Ave', plain: 'This letter is your official notice about your building at 412 Liberty Ave.' },
    { t: 'will undergo routine maintenance on November 3.', plain: 'Workers will do regular repairs on November 3.' },
    { t: 'Please ensure the unit is accessible between 9 a.m. and 5 p.m.', plain: 'Make sure workers can get into your apartment between 9 and 5.' },
    { t: 'Any arrears must be remitted in full by the 1st of the month.', plain: 'If you owe late rent, pay all of it by the 1st.' },
    { t: 'Failure to do so may result in a late fee of $75.', plain: 'If you don’t, you may be charged a $75 late fee.' },
    { t: 'Subletting is prohibited without prior written consent', plain: 'You can’t rent your place to someone else unless the landlord agrees in writing first…' },
    { t: 'from the lessor. Pets are not permitted on the premises.', plain: '…from the landlord. No pets are allowed in the building.' },
    { t: 'Please retain this notice for your records.', plain: 'Keep this letter.' },
    { t: 'Sincerely, Allegheny Property Management' }
  ];
  const HARD = {
    hereby: 'by means of this letter', notified: 'officially told', premises: 'the building and the land it sits on', undergo: 'go through; have done to it',
    routine: 'regular, normal', ensure: 'make sure', accessible: 'possible to get into', arrears: 'money owed that is already late', remitted: 'paid or sent (money)',
    failure: 'not doing something you should', subletting: 'renting your place to someone else while you still rent it', prohibited: 'not allowed',
    prior: 'before', consent: 'permission', lessor: 'the landlord', permitted: 'allowed', retain: 'keep'
  };
  const UNDERLINE = ['hereby', 'premises', 'undergo', 'arrears', 'remitted', 'subletting', 'prohibited', 'consent', 'lessor', 'permitted', 'retain'];
  const TASKS = {
    normal: '<b>Task A:</b> read the letter at your normal speed, top to bottom. Don’t stop on purpose. Every pop-up here is probably a false alarm, so answer honestly.',
    stuck: '<b>Task B:</b> read again, but when you reach a word you don’t know, stop and stare at it or go back and re-read the line. Then answer whether the pop-up was right.'
  };

  // ---------- state ----------
  const S = {
    mode: 'normal', manual: false, tracking: false, calibrating: false, popOpen: false,
    samples: [], lastSample: 0,
    line: null, lineSince: 0, candidate: null, candSince: 0,
    prevLine: null, prevDwell: 0, maxLine: -1,
    cooldownUntil: 0, lastPrompted: {}, events: [], current: null,
    thresholdMs: 3000, accuracyPx: null
  };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = (w) => w.toLowerCase().replace(/[^a-z]/g, '');
  const letter = $('letter'), pop = $('pop'), panel = $('readerPanel');
  panel.style.position = 'relative';

  // ---------- render the letter ----------
  letter.innerHTML = LINES.map((l, i) => `<span class="ln" data-i="${i}">${l.t.split(' ').map((w) => UNDERLINE.includes(clean(w)) ? `<span class="hw">${esc(w)}</span>` : esc(w)).join(' ')}</span>`).join('');
  const lineEls = [...letter.querySelectorAll('.ln')];
  const setTask = () => { $('taskText').innerHTML = TASKS[S.mode]; document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode))); };
  setTask();

  // ---------- steps ----------
  function step(n) {
    [1, 2, 3].forEach((i) => { const el = $('step' + i); el.classList.toggle('on', i === n); el.classList.toggle('done', i < n); });
  }

  // ---------- gaze → line ----------
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  function lineAt(x, y) {
    const box = letter.getBoundingClientRect();
    if (x < box.left - 120 || x > box.right + 120 || y < box.top - 60 || y > box.bottom + 60) return null;
    let best = null, bestD = Infinity;
    lineEls.forEach((el, i) => { const r = el.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - y); if (d < bestD) { bestD = d; best = i; } });
    return best;
  }
  function onGaze(data, t) {
    if (!data || S.calibrating) return;
    const now = performance.now();
    S.samples.push({ x: data.x, y: data.y, t: now });
    S.lastSample = now;
    while (S.samples.length && now - S.samples[0].t > 300) S.samples.shift();
    if (S.samples.length < 3) return;
    const x = median(S.samples.map((s) => s.x)), y = median(S.samples.map((s) => s.y));
    track(lineAt(x, y), now);
  }
  // Switch lines only after the eyes stay on the new one for 200 ms, so noise doesn't flicker.
  function track(cand, now) {
    if (cand !== S.candidate) { S.candidate = cand; S.candSince = now; }
    if (cand === S.line || now - S.candSince < 200) return checkPause(now);
    if (S.line !== null) { S.prevLine = S.line; S.prevDwell = now - S.lineSince; }
    S.line = cand; S.lineSince = S.candSince;
    if (cand !== null) S.maxLine = Math.max(S.maxLine, cand);
    lineEls.forEach((el, i) => el.classList.toggle('look', i === cand && !S.manual));
    checkPause(now);
  }
  function checkPause(now) {
    if (S.popOpen || S.line === null || now < S.cooldownUntil || panel.hidden || !$('calib').hidden) return;
    if (!LINES[S.line].plain) return; // greeting and sign-off have nothing to explain
    if (S.lastPrompted[S.line] && now - S.lastPrompted[S.line] < 10000) return;
    const dwell = now - S.lineSince;
    if (dwell >= S.thresholdMs) return prompt(S.line, 'long look', dwell);
    // Re-read: eyes jumped back above a line they had already moved past, and stayed a moment.
    const back = S.prevLine !== null && S.line < S.prevLine && S.maxLine > S.line && S.prevDwell > 400;
    if (back && dwell >= 900) return prompt(S.line, 're-read', dwell);
  }

  // ---------- prompt ----------
  function placePop(i) {
    const el = lineEls[i];
    pop.style.top = (letter.offsetTop + el.offsetTop + el.offsetHeight + 10) + 'px';
  }
  function prompt(i, trigger, dwell) {
    S.popOpen = true;
    S.lastPrompted[i] = performance.now();
    S.current = { t: new Date(), mode: S.mode, line: i + 1, trigger, dwell: Math.round(dwell), answer: null };
    lineEls.forEach((el, j) => el.classList.toggle('stuck', j === i));
    const why = trigger === 're-read' ? 'went back to re-read this line' : trigger === 'click' ? 'clicked this line' : `looked at this line for ${(dwell / 1000).toFixed(1)}s`;
    pop.innerHTML = `<div class="q">You ${why}. <strong>Stuck on this line?</strong></div>
      <div class="acts"><button type="button" class="no" data-ans="no">No, I was just reading</button><button type="button" class="yes" data-ans="yes">Yes, explain it</button></div>`;
    placePop(i); pop.hidden = false;
    pop.querySelector('.yes').focus({ preventScroll: true });
  }
  function explain(i) {
    const words = LINES[i].t.split(' ').map(clean).filter((w, k, a) => HARD[w] && a.indexOf(w) === k);
    pop.innerHTML = `<div class="expl"><div class="plain">${esc(LINES[i].plain)}</div>
      ${words.length ? `<dl>${words.map((w) => `<dt>${esc(w)}</dt><dd>${esc(HARD[w])}</dd>`).join('')}</dl>` : ''}</div>
      <div class="acts"><button type="button" class="yes" data-ans="done">Got it</button></div>`;
    placePop(i);
  }
  function closePop() {
    pop.hidden = true; S.popOpen = false;
    lineEls.forEach((el) => el.classList.remove('stuck'));
    S.cooldownUntil = performance.now() + 1500;
    S.lineSince = performance.now(); // restart the dwell clock so it doesn't fire again at once
  }
  pop.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ans]'); if (!b) return;
    if (b.dataset.ans === 'done') return closePop();
    S.current.answer = b.dataset.ans;
    S.events.push(S.current); renderLog();
    if (b.dataset.ans === 'yes') explain(S.current.line - 1); else closePop();
  });

  // ---------- results ----------
  function renderLog() {
    const ev = S.events, yes = ev.filter((e) => e.answer === 'yes').length, no = ev.length - yes;
    $('sPrompts').textContent = ev.length; $('sYes').textContent = yes; $('sNo').textContent = no;
    const a = ev.filter((e) => e.mode === 'normal'), b = ev.filter((e) => e.mode === 'stuck');
    const by = b.filter((e) => e.answer === 'yes').length;
    $('precision').textContent = ev.length
      ? `Right ${yes} of ${ev.length} times (${Math.round(yes / ev.length * 100)}%). Task A false alarms: ${a.filter((e) => e.answer === 'no').length}. Task B correct: ${by} of ${b.length}.`
      : 'Each prompt asks if it was right. That tells you how often the camera is correct.';
    $('log').innerHTML = ev.slice().reverse().map((e) => `<li><span class="${e.answer === 'yes' ? 'y' : 'n'}">${e.answer === 'yes' ? 'Stuck ✓' : 'False alarm'}</span> · line ${e.line} · ${e.trigger} · ${e.mode === 'normal' ? 'Task A' : 'Task B'}</li>`).join('');
  }
  $('copy').addEventListener('click', async () => {
    const head = 'time\ttask\tline\ttrigger\tdwell_ms\tanswer';
    const rows = S.events.map((e) => [e.t.toLocaleTimeString(), e.mode === 'normal' ? 'A read normally' : 'B stuck on purpose', e.line, e.trigger, e.dwell, e.answer].join('\t'));
    const meta = `calibration_error_px\t${S.accuracyPx ?? 'n/a'}\nthreshold_s\t${S.thresholdMs / 1000}\nmode\t${S.manual ? 'click (no camera)' : 'webcam'}\n`;
    const text = meta + head + '\n' + rows.join('\n');
    try { await navigator.clipboard.writeText(text); $('copy').textContent = 'Copied ✓'; }
    catch { window.prompt('Copy these results:', text); }
    setTimeout(() => { $('copy').textContent = 'Copy results'; }, 1600);
  });
  $('clear').addEventListener('click', () => { S.events = []; S.lastPrompted = {}; renderLog(); });

  // ---------- live meter ----------
  function tick() {
    const now = performance.now();
    const lost = S.tracking && now - S.lastSample > 1200;
    $('liveLine').textContent = S.manual ? 'click mode' : !S.tracking ? 'camera off' : lost ? 'can’t see your eyes' : S.line === null ? 'off the letter' : 'line ' + (S.line + 1);
    const dwell = S.line === null || S.popOpen || lost ? 0 : now - S.lineSince;
    $('liveDwell').textContent = S.manual ? '–' : (dwell / 1000).toFixed(1) + ' s';
    const pct = Math.min(100, dwell / S.thresholdMs * 100);
    $('dwellBar').style.width = pct + '%';
    $('dwellBar').classList.toggle('full', pct >= 100);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- controls ----------
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { S.mode = b.dataset.mode; setTask(); }));
  $('threshold').addEventListener('input', (e) => { S.thresholdMs = Number(e.target.value) * 1000; $('thrOut').textContent = Number(e.target.value).toFixed(1); });
  $('showDot').addEventListener('change', (e) => { if (window.webgazer && S.tracking) webgazer.showPredictionPoints(e.target.checked); });
  $('showVideo').addEventListener('change', (e) => { if (window.webgazer && S.tracking) { webgazer.showVideoPreview(e.target.checked); webgazer.showFaceOverlay(e.target.checked); webgazer.showFaceFeedbackBox(e.target.checked); } });
  $('recal').addEventListener('click', calibrate);
  letter.addEventListener('click', (e) => {
    if (!S.manual || S.popOpen) return;
    const el = e.target.closest('.ln'); if (!el) return;
    const i = Number(el.dataset.i);
    if (LINES[i].plain) prompt(i, 'click', 0);
  });

  // ---------- start ----------
  $('manual').addEventListener('click', () => {
    S.manual = true; letter.classList.add('manual');
    $('intro').hidden = true; panel.hidden = false; step(3);
    $('taskText').innerHTML = '<b>Click-to-pause mode:</b> no camera. Click any line to pretend your eyes stopped there, to try the pop-up and the explanations.';
    document.querySelector('.seg').hidden = true;
  });
  $('start').addEventListener('click', async () => {
    const st = $('startStatus');
    if (!window.webgazer) { st.textContent = 'The eye-tracking library didn’t load. Check your internet connection and reload the page.'; st.classList.add('err'); return; }
    st.classList.remove('err'); st.textContent = 'Starting camera… allow camera access if your browser asks.';
    $('start').disabled = true;
    try {
      webgazer.saveDataAcrossSessions(false);
      webgazer.setRegression('ridge');
      webgazer.setGazeListener(onGaze);
      await webgazer.begin();
      webgazer.showVideoPreview(true).showPredictionPoints(false).applyKalmanFilter(true);
      S.tracking = true;
      $('recal').hidden = false;
      st.textContent = '';
      calibrate();
    } catch (err) {
      st.classList.add('err');
      st.textContent = 'Couldn’t start the camera (' + (err && err.name ? err.name : 'unknown error') + '). Check camera permission, or use click-to-pause mode.';
      $('start').disabled = false;
    }
  });

  // ---------- calibration ----------
  const POS = [[10, 12], [50, 12], [90, 12], [10, 50], [50, 50], [90, 50], [10, 88], [50, 88], [90, 88]];
  function calibrate() {
    S.calibrating = true; step(2);
    const c = $('calib');
    c.querySelectorAll('.cdot, .target').forEach((d) => d.remove());
    $('calibMsg').innerHTML = '<h2>Calibrate</h2><p>Look at each dot and click it <b>5 times</b>, keeping your eyes on it while you click. Dots turn green when done.</p>';
    $('calibMsg').hidden = false;
    let done = 0;
    POS.forEach(([x, y]) => {
      const d = document.createElement('button');
      d.type = 'button'; d.className = 'cdot'; d.style.left = x + '%'; d.style.top = y + '%'; d.setAttribute('aria-label', 'Calibration dot');
      let n = 0;
      d.addEventListener('click', () => { // WebGazer also learns from each click
        n++; d.style.opacity = String(0.25 + n * 0.15);
        if (n >= 5) { d.classList.add('done'); if (++done === POS.length) measure(); }
      });
      c.appendChild(d);
    });
    c.hidden = false;
  }
  // Stare at a center dot for 3 s and measure how far the predictions land from it.
  function measure() {
    const c = $('calib');
    c.querySelectorAll('.cdot').forEach((d) => d.remove());
    $('calibMsg').innerHTML = '<h2>Accuracy check</h2><p>Stare at the blue dot for 3 seconds without moving your mouse.</p>';
    $('calibMsg').style.top = '30%';
    const t = document.createElement('div'); t.className = 'target'; c.appendChild(t);
    const pts = [];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    S.calibrating = false; // let samples flow, but nothing on the page reacts while the overlay is up
    const startAt = performance.now();
    const collect = setInterval(async () => {
      const el = performance.now() - startAt;
      if (el > 600) { const p = await webgazer.getCurrentPrediction(); if (p) pts.push(Math.hypot(p.x - cx, p.y - cy)); }
      if (el > 3600) {
        clearInterval(collect);
        const err = pts.length ? Math.round(median(pts)) : null;
        S.accuracyPx = err;
        const r = lineEls.map((l) => l.getBoundingClientRect());
        const gap = Math.round((r[2].top + r[2].bottom) / 2 - (r[1].top + r[1].bottom) / 2);
        $('accuracy').textContent = err === null ? 'no data' : `~${err}px (lines are ${gap}px apart)`;
        $('calibMsg').style.top = '';
        $('calibMsg').innerHTML = err === null
          ? '<h2>No gaze data</h2><p>Make sure your face is visible in the camera preview, then recalibrate.</p>'
          : `<h2>${err <= gap ? 'Good enough for line-level' : err <= gap * 2 ? 'Rough, but worth a try' : 'Too noisy'}</h2><p>Typical error: about <b>${err}px</b>. Lines in the letter are ${gap}px apart. ${err > gap ? 'More light, a still head and recalibrating usually help.' : ''}</p><p style="margin-top:12px"><button type="button" class="btn primary" id="toRead">Start reading</button> <button type="button" class="btn ghost" id="again">Recalibrate</button></p>`;
        t.remove();
        const go = $('toRead'), again = $('again');
        if (go) go.addEventListener('click', () => { c.hidden = true; $('intro').hidden = true; panel.hidden = false; step(3); S.lineSince = performance.now(); S.cooldownUntil = performance.now() + 1500; });
        if (again) again.addEventListener('click', calibrate);
        if (err === null) { const b = document.createElement('p'); b.innerHTML = '<button type="button" class="btn primary">Recalibrate</button>'; b.firstChild.addEventListener('click', calibrate); $('calibMsg').appendChild(b); }
      }
    }, 100);
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.popOpen) closePop(); });

  // Test hook: feed fake gaze points without a webcam (used for checking the detection logic).
  window.lingerTest = {
    open() { S.tracking = true; $('intro').hidden = true; panel.hidden = false; step(3); },
    gaze(x, y) { S.lastSample = performance.now(); onGaze({ x, y }); },
    lineCenter(i) { const r = lineEls[i].getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; }
  };
})();

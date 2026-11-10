// Linger reading test: the reader-page letter, with Task A (read normally) and Task B (get stuck on purpose).
// The eye tracking, "Stuck on …?" question, hand swipes and word cards are the same scripts Linger runs on every
// website (content.js and gaze.js, loaded by practice.html). This page only records each answer under the open task.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HOW = {
    A: '<b>Task A:</b> read the letter at your normal speed, top to bottom. Don’t stop on purpose. If Linger asks “Stuck on …?”, it’s probably a false alarm, so answer <b>No</b> unless you really were stuck.',
    B: '<b>Task B:</b> read it again. When you reach a word you don’t know, stop and stare at it, or go back and re-read the line. Answer honestly when Linger asks. If you got stuck and it didn’t ask, press <b>I got stuck and Linger didn’t ask</b>.'
  };
  const KEY = 'linger.practice';
  const S = { task: 'A', events: [] };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ task: S.task, events: S.events })); } catch {} };

  // ---------- tasks ----------
  function setTask(t) {
    S.task = t; save();
    document.querySelectorAll('[data-task]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.task === t)));
    $('howto').innerHTML = HOW[t];
    $('missed').hidden = t !== 'B';
    $('next').textContent = t === 'A' ? 'Done reading · go to Task B' : 'Done reading · see results';
  }
  document.querySelectorAll('[data-task]').forEach((b) => { b.onclick = () => setTask(b.dataset.task); });
  $('next').onclick = () => {
    if (S.task === 'A') { setTask('B'); document.querySelector('.tasks').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else $('summary').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ---------- answers ----------
  // gaze.js announces each answer to "Stuck on …?" on Linger's own pages (never on websites).
  window.addEventListener('linger-answer', (e) => {
    let d; try { d = JSON.parse(e.detail); } catch { return; }
    S.events.push({ t: Date.now(), task: S.task, word: d.word, why: d.why, ans: d.ans, how: d.how });
    save(); render();
  });
  $('missed').onclick = () => { S.events.push({ t: Date.now(), task: 'B', ans: 'missed' }); save(); render(); };

  function render() {
    const A = S.events.filter((e) => e.task === 'A' && e.ans !== 'missed'), B = S.events.filter((e) => e.task === 'B' && e.ans !== 'missed');
    const aNo = A.filter((e) => e.ans === 'no').length, bYes = B.filter((e) => e.ans === 'yes').length;
    const miss = S.events.filter((e) => e.ans === 'missed').length;
    $('nA').textContent = aNo; $('nB').textContent = bYes; $('nBof').textContent = `of ${B.length} ask${B.length === 1 ? '' : 's'}`; $('nMiss').textContent = miss;
    let sum = 'Nothing yet. Start with Task A.';
    if (S.events.length) {
      sum = `Task A: Linger asked ${A.length} time${A.length === 1 ? '' : 's'} while you read normally (${aNo} false alarm${aNo === 1 ? '' : 's'}). `
        + `Task B: right ${bYes} of ${B.length} time${B.length === 1 ? '' : 's'} it asked, and missed ${miss} time${miss === 1 ? '' : 's'} you were stuck.`;
      if (bYes + miss) sum += ` It caught ${Math.round(bYes / (bYes + miss) * 100)}% of the times you were stuck.`;
    }
    $('summary').textContent = sum;
    const tag = (e) => e.ans === 'missed' ? '<span class="m">Missed</span>' : e.ans === 'yes' ? '<span class="y">Stuck ✓</span>' : `<span class="n">${e.task === 'A' ? 'False alarm' : 'Not stuck'}</span>`;
    const why = (w) => (/re-read/.test(w || '') ? 're-read' : w ? 'long look' : '');
    $('log').innerHTML = S.events.slice().reverse().map((e) => `<li>${tag(e)} · Task ${e.task}${e.word ? ` · “${esc(e.word)}”` : ''}${why(e.why) ? ' · ' + why(e.why) : ''}${e.how === 'swipe' ? ' · 👋 swipe' : ''}</li>`).join('');
  }
  $('clear').onclick = () => { if (!S.events.length || confirm('Clear all results from this test?')) { S.events = []; save(); render(); } };
  $('copy').onclick = async () => {
    const m = G.model, acc = m && m.acc;
    const meta = `setup_error_px\t${acc ? acc.err : 'n/a'}\nsetup_updown_error_px\t${acc ? acc.vErr : 'n/a'}\nask_after_s\t${G.secs}\n`;
    const rows = S.events.map((e) => [new Date(e.t).toISOString(), 'Task ' + e.task, e.word || '', e.ans === 'missed' ? '' : (/re-read/.test(e.why || '') ? 're-read' : 'long look'), e.ans, e.how || ''].join('\t'));
    const txt = meta + '\ntime\ttask\tword\ttrigger\tanswer\thow\n' + rows.join('\n');
    try { await navigator.clipboard.writeText(txt); $('copy').textContent = 'Copied ✓'; setTimeout(() => { $('copy').textContent = 'Copy results'; }, 1600); }
    catch { prompt('Copy these results:', txt); }
  };

  // ---------- eye tracking status and settings ----------
  const G = { model: null, secs: 3 };
  const tabId = () => new Promise((r) => (api && chrome.tabs && chrome.tabs.getCurrent ? chrome.tabs.getCurrent((t) => r(t && t.id)) : r(null)));
  function banner(msg, btn, fn) {
    $('setup').hidden = !msg;
    if (!msg) return;
    $('setupMsg').textContent = msg; $('setupBtn').textContent = btn; $('setupBtn').onclick = fn;
  }
  function refresh() {
    chrome.storage.local.get({ eyeOn: false, gazeModel: null, pauseSecs: 3, showGaze: true, handSwipe: true }, (v) => {
      G.model = v.gazeModel; G.secs = v.pauseSecs;
      const st = $('eyeState');
      st.textContent = !v.gazeModel ? 'not set up' : v.eyeOn ? 'on' : 'off';
      st.className = v.eyeOn && v.gazeModel ? 'good' : 'bad';
      const acc = v.gazeModel && v.gazeModel.acc;
      $('acc').textContent = acc ? `${acc.err}px off (${acc.vErr}px up/down)` : '–';
      $('acc').className = acc ? (acc.vErr <= 35 ? 'good' : acc.vErr > 70 ? 'bad' : '') : '';
      $('secs').value = v.pauseSecs; $('secsOut').textContent = v.pauseSecs;
      $('showGaze').checked = v.showGaze; $('handSwipe').checked = v.handSwipe;
      $('recal').hidden = !v.gazeModel;
      const on = async () => chrome.runtime.sendMessage({ type: 'eye-on', tabId: await tabId() });
      if (!v.gazeModel) banner('Eye tracking isn’t set up yet. Setup takes about 35 seconds, then you come back here.', 'Set up eye tracking', on);
      else if (!v.eyeOn) banner('Eye tracking is off.', 'Turn it on', on);
      else banner('');
    });
  }
  if (api) {
    refresh();
    chrome.storage.onChanged.addListener(refresh);
    $('secs').oninput = (e) => { $('secsOut').textContent = e.target.value; };
    $('secs').onchange = (e) => chrome.storage.local.set({ pauseSecs: Number(e.target.value) });
    $('showGaze').onchange = (e) => chrome.storage.local.set({ showGaze: e.target.checked });
    $('handSwipe').onchange = (e) => chrome.storage.local.set({ handSwipe: e.target.checked });
    $('recal').onclick = async () => chrome.runtime.sendMessage({ type: 'eye-recal', tabId: await tabId() });
  } else {
    $('eyeState').textContent = 'needs the extension';
    banner('Open this page from the Linger extension: Linger menu → Reading test.', 'OK', () => banner(''));
  }

  setTask(S.task === 'B' ? 'B' : 'A');
  render();
})();

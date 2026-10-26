(() => {
  'use strict';

  const TEXTS = {
    cafe: "Heads up, yinz! The back lot gets slippy after snow. Please don't move the parking chairs — neighbors shoveled those spots. Grab a jumbo sandwich and a pop, then redd up your table before the game n'at.",
    lease: 'Tenants are hereby notified that the premises will undergo routine maintenance on Nov 3. Any arrears must be remitted by the 1st. Subletting is prohibited without prior written consent from the lessor.'
  };
  const PLACES = { cafe: 'Café board, Lawrenceville', lease: 'Lease letter, home' };
  const WHERE = { cafe: 'Lawrenceville · Pittsburgh', lease: 'Home · reading mail' };
  const ALIAS = { chairs: 'parkingchair', redd: 'reddup', "n'at": 'nat' };
  const D = {
    yinz: { word: 'yinz', kind: 'slang', meaning: 'You all. Pittsburgh’s plural “you”.', local: 'friendly and very local.' },
    slippy: { word: 'slippy', kind: 'slang', meaning: 'Slippery.', local: 'common in western Pennsylvania.' },
    parkingchair: { word: 'parking chair', kind: 'custom', meaning: 'A chair saving a street spot someone shoveled out.', local: 'moving one is seen as rude.' },
    jumbo: { word: 'jumbo', kind: 'slang', meaning: 'Bologna, the lunch meat.', local: 'a “jumbo sandwich” is bologna, not a big sandwich.' },
    pop: { word: 'pop', kind: 'slang', meaning: 'Soda, a soft drink.', local: 'people say “pop”, not “soda”.' },
    reddup: { word: 'redd up', kind: 'slang', meaning: 'To tidy or clean up.', local: 'you’ll hear it at home too.' },
    nat: { word: "n'at", kind: 'slang', meaning: '“And that”, like “and so on”.', local: 'added to the end of sentences.' },
    hereby: { word: 'hereby', kind: 'hard', meaning: 'By means of this letter.' },
    premises: { word: 'premises', kind: 'hard', meaning: 'The building and its land: your apartment building.' },
    arrears: { word: 'arrears', kind: 'hard', meaning: 'Money owed that is already late.' },
    remitted: { word: 'remitted', kind: 'hard', meaning: 'Paid or sent (money).' },
    subletting: { word: 'subletting', kind: 'hard', meaning: 'Renting your place to someone else while you’re still the tenant.' },
    prohibited: { word: 'prohibited', kind: 'hard', meaning: 'Not allowed.' },
    lessor: { word: 'lessor', kind: 'hard', meaning: 'The landlord.' }
  };

  const $ = (id) => document.getElementById(id);
  const keyOf = (tok) => { const k = tok.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, '').replace(/^'+|'+$/g, ''); return ALIAS[k] || k; };

  const S = { source: 'cafe', playing: false, gaze: -1, dwell: 0, status: 'Ready', prompt: null, card: null, cardAuto: false, toast: '', saved: [] };
  let timers = [], dwellTimer = null, toastTimer = null;

  function set(patch) { Object.assign(S, typeof patch === 'function' ? patch(S) : patch); render(); }
  function stopAll() { timers.forEach(clearTimeout); timers = []; clearDwell(); }
  function clearDwell() { if (dwellTimer) { clearInterval(dwellTimer); dwellTimer = null; } }

  // ---------- rendering ----------
  const paper = $('paper');
  let builtFor = null;
  function buildTokens() {
    paper.replaceChildren(...TEXTS[S.source].split(' ').map((raw, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tok' + (D[keyOf(raw)] ? ' hard' : '');
      b.dataset.i = i;
      b.textContent = raw;
      return b;
    }));
    builtFor = S.source;
  }
  function render() {
    if (builtFor !== S.source) buildTokens();
    paper.querySelectorAll('.tok').forEach((b, i) => {
      if (i === S.gaze) {
        const a = 0.25 + S.dwell * 0.55;
        b.style.background = `rgba(255,200,97,${a.toFixed(2)})`;
        b.style.boxShadow = `0 0 0 ${2 + Math.round(S.dwell * 4)}px rgba(255,200,97,0.45)`;
      } else { b.style.background = ''; b.style.boxShadow = ''; }
    });
    document.querySelectorAll('[data-source]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.source === S.source)));
    $('play').textContent = S.playing ? 'Stop' : 'Play demo';
    $('play').classList.toggle('on', S.playing);
    $('status').textContent = S.status;
    $('eye').classList.toggle('on', S.gaze >= 0);
    $('meter').style.width = Math.round(S.dwell * 100) + '%';
    $('where').textContent = WHERE[S.source];

    $('prompt').hidden = !(S.prompt && !S.card);
    if (S.prompt && D[S.prompt]) $('prompt-word').textContent = '“' + D[S.prompt].word + '”';

    $('card').hidden = !S.card;
    if (S.card && D[S.card]) {
      const e = D[S.card];
      $('card-word').textContent = e.word;
      $('card-tag').textContent = S.cardAuto ? 'Hard word · auto' : (e.kind === 'custom' ? 'Local custom' : 'Local slang');
      $('card-meaning').textContent = e.meaning;
      $('card-local').textContent = e.local ? 'Around here: ' + e.local : '';
    }

    $('toast').hidden = !S.toast;
    $('toast').textContent = S.toast;

    const box = $('saved');
    if (!S.saved.length) {
      if (!box.querySelector('.phone-empty')) box.innerHTML = '<div class="phone-empty">Words you save from the glasses show up here, with the sentence and the place you saw them.</div>';
    } else {
      box.replaceChildren(...S.saved.map((k) => {
        const e = D[k];
        const item = document.createElement('div');
        item.className = 'saved-item';
        const top = document.createElement('div'); top.className = 'top';
        const w = document.createElement('b'); w.textContent = e.word;
        const t = document.createElement('small'); t.textContent = 'just now';
        top.append(w, t);
        const m = document.createElement('div'); m.className = 'm'; m.textContent = e.meaning;
        const p = document.createElement('div'); p.className = 'p'; p.textContent = e.kind === 'hard' ? PLACES.lease : PLACES.cafe;
        item.append(top, m, p);
        return item;
      }));
    }
  }

  function saveKey(key) {
    return (st) => ({ saved: [key, ...st.saved.filter((k) => k !== key)], card: null, prompt: null, toast: 'Saved “' + D[key].word + '” to your phone', status: 'Temple tap · saved' });
  }
  function flashToastClear() { clearTimeout(toastTimer); toastTimer = setTimeout(() => set({ toast: '' }), 1800); }

  // ---------- scripted demo ----------
  function play() {
    stopAll();
    const toks = TEXTS[S.source].split(' ');
    const stall = S.source === 'cafe' ? { yinz: 'ask', jumbo: 'reread' } : { arrears: 'save' };
    let t = 400;
    const at = (dt, patch) => { t += dt; timers.push(setTimeout(() => set(patch), t)); };
    set({ playing: true, gaze: -1, dwell: 0, prompt: null, card: null, toast: '', status: 'Reading' });
    toks.forEach((raw, i) => {
      const key = keyOf(raw), e = D[key];
      at(i === 0 ? 0 : 230, { gaze: i, dwell: 0, status: 'Reading', toast: '' });
      if (e && e.kind === 'hard') {
        at(180, { card: key, cardAuto: true, status: 'Hard word · explained automatically' });
        if (stall[key] === 'save') { at(1500, saveKey(key)); at(1300, { toast: '' }); }
        else at(1500, { card: null });
        return;
      }
      if (!stall[key]) return;
      if (stall[key] === 'reread') { at(320, { gaze: i - 1, status: 'Re-reading' }); at(360, { gaze: i, status: 'Re-reading' }); }
      for (let k = 1; k <= 8; k++) at(150, { dwell: k / 8, status: 'Pause ' + (k * 0.15).toFixed(1) + 's' });
      at(120, { prompt: key, status: 'Pause detected' });
      at(1600, { prompt: null, card: key, cardAuto: false, status: 'Nod · showing meaning' });
      if (stall[key] === 'ask') { at(2400, saveKey(key)); at(1300, { toast: '' }); }
      else at(2400, { card: null });
    });
    at(700, { playing: false, gaze: -1, dwell: 0, status: 'Done', toast: '' });
  }

  // ---------- try it yourself: cursor rest (desktop) or tap (phone) ----------
  function startDwell(i) {
    if (S.playing) return;
    clearDwell();
    const key = keyOf(TEXTS[S.source].split(' ')[i]);
    const e = D[key];
    set({ gaze: i, dwell: 0, status: 'Reading' });
    if (!e) return;
    if (e.kind === 'hard') { set({ card: key, cardAuto: true, prompt: null, status: 'Hard word · explained automatically' }); return; }
    let p = 0;
    dwellTimer = setInterval(() => {
      p += 0.1;
      if (p >= 1) { clearDwell(); set({ dwell: 1, prompt: key, card: null, status: 'Pause detected' }); }
      else set({ dwell: p, status: 'Pause ' + (p * 1.2).toFixed(1) + 's' });
    }, 120);
  }
  paper.addEventListener('mouseover', (ev) => {
    const b = ev.target.closest('.tok');
    if (!b || Number(b.dataset.i) === S.gaze) return;
    startDwell(Number(b.dataset.i));
  });
  paper.addEventListener('mouseleave', () => {
    if (S.playing) return;
    clearDwell();
    if (!S.prompt && !S.card) set({ gaze: -1, dwell: 0, status: 'Reading' });
  });
  paper.addEventListener('click', (ev) => {
    const b = ev.target.closest('.tok');
    if (!b || S.playing) return;
    const i = Number(b.dataset.i);
    const key = keyOf(b.textContent), e = D[key];
    clearDwell();
    if (!e) { set({ gaze: i, dwell: 0, status: 'Reading' }); return; }
    if (e.kind === 'hard') set({ gaze: i, card: key, cardAuto: true, prompt: null });
    else set({ gaze: i, dwell: 1, prompt: key, card: null, status: 'Pause detected' });
  });

  $('prompt-yes').addEventListener('click', () => set({ card: S.prompt, cardAuto: false, prompt: null, status: 'Nod · showing meaning' }));
  $('prompt-no').addEventListener('click', () => set({ prompt: null, gaze: -1, dwell: 0, status: 'Looked away · dismissed' }));
  $('card-save').addEventListener('click', () => { if (S.card) { set(saveKey(S.card)); flashToastClear(); } });
  $('card-close').addEventListener('click', () => set({ card: null, prompt: null, gaze: -1, dwell: 0, status: 'Reading' }));
  $('play').addEventListener('click', () => {
    if (S.playing) { stopAll(); set({ playing: false, gaze: -1, dwell: 0, prompt: null, card: null, toast: '', status: 'Stopped' }); }
    else play();
  });
  document.querySelectorAll('[data-source]').forEach((b) => b.addEventListener('click', () => {
    stopAll();
    set({ source: b.dataset.source, playing: false, gaze: -1, dwell: 0, prompt: null, card: null, toast: '', status: 'Ready' });
  }));

  render();
})();

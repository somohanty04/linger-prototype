(() => {
  'use strict';

  // ---------- content ----------
  const PLACES = { cafe: 'Café board, Lawrenceville', lease: 'Lease letter, home', guide: 'the local guide' };
  const TEXTS = {
    cafe: "Heads up, yinz! The back lot gets slippy after snow. Please don't move the parking chairs — neighbors shoveled those spots. Grab a jumbo sandwich and a pop, then redd up your table before the game n'at.",
    lease: 'Tenants are hereby notified that the premises will undergo routine maintenance on Nov 3. Any arrears must be remitted by the 1st. Subletting is prohibited without prior written consent from the lessor.'
  };
  const ALIAS = { chairs: 'parkingchair', redd: 'reddup', "n'at": 'nat' };
  const D = {
    yinz: { word: 'yinz', kind: 'slang', say: 'yinz', meaning: 'You all. Pittsburgh’s way of saying “you” to a group.', ctx: 'The sign is talking to everyone who reads it: “Heads up, all of you!”', local: 'Friendly and very local. Newcomers using it usually get a smile.', sentence: 'Heads up, yinz!', src: 'cafe' },
    slippy: { word: 'slippy', kind: 'slang', say: 'SLIP-ee', meaning: 'Slippery.', ctx: 'The back parking lot gets slippery once it snows.', local: 'Common across western Pennsylvania. It is not a typo.', sentence: 'The back lot gets slippy after snow.', src: 'cafe' },
    parkingchair: { word: 'parking chair', kind: 'custom', meaning: 'A chair left in a street spot to save it after someone shoveled it out.', ctx: 'Leave the chairs alone: they are saving spots that neighbors dug out of the snow.', local: 'It isn’t an official rule, but moving someone’s parking chair is seen as rude here. See Local › Customs.', sentence: "Please don't move the parking chairs — neighbors shoveled those spots.", src: 'cafe' },
    jumbo: { word: 'jumbo', kind: 'slang', say: 'JUM-bo', meaning: 'Bologna, the lunch meat.', ctx: 'A “jumbo sandwich” is a bologna sandwich, not a big one.', local: 'Order “a jumbo sandwich” at a local deli and you will get bologna.', sentence: 'Grab a jumbo sandwich and a pop.', src: 'cafe' },
    pop: { word: 'pop', kind: 'slang', say: 'pop', meaning: 'Soda, a soft drink.', ctx: 'Get a soft drink to go with your sandwich.', local: 'Most of the Midwest and western Pennsylvania say “pop”, not “soda”.', sentence: 'Grab a jumbo sandwich and a pop.', src: 'cafe' },
    reddup: { word: 'redd up', kind: 'slang', say: 'red up', meaning: 'To tidy or clean up.', ctx: 'Clean up your table before you leave.', local: 'You will hear it at home too: “Redd up your room.”', sentence: 'Redd up your table before the game.', src: 'cafe' },
    nat: { word: "n'at", kind: 'slang', say: 'nat', meaning: '“And that”, like saying “and so on”.', ctx: 'Clean up before the game, and all that.', local: 'Tacked onto the end of sentences. Very Pittsburgh.', sentence: "Before the game n'at.", src: 'cafe' },
    hereby: { word: 'hereby', kind: 'hard', meaning: 'By means of this (letter or statement).', ctx: 'This letter itself is the official notice to tenants.', sentence: 'Tenants are hereby notified…', src: 'lease' },
    premises: { word: 'premises', kind: 'hard', meaning: 'A building and the land it sits on.', ctx: 'Here it means your apartment building.', sentence: 'The premises will undergo routine maintenance on Nov 3.', src: 'lease' },
    arrears: { word: 'arrears', kind: 'hard', meaning: 'Money owed that is already late.', ctx: 'Any rent you are behind on has to be paid by the 1st.', sentence: 'Any arrears must be remitted by the 1st.', src: 'lease' },
    remitted: { word: 'remitted', kind: 'hard', meaning: 'Paid or sent (money).', ctx: 'The overdue money has to be paid by the 1st.', sentence: 'Any arrears must be remitted by the 1st.', src: 'lease' },
    subletting: { word: 'subletting', kind: 'hard', meaning: 'Renting your place to someone else while you are still the tenant.', ctx: 'You can’t rent your apartment out to another person without permission.', sentence: 'Subletting is prohibited without prior written consent.', src: 'lease' },
    prohibited: { word: 'prohibited', kind: 'hard', meaning: 'Not allowed.', ctx: 'Subletting isn’t allowed unless the landlord agrees in writing.', sentence: 'Subletting is prohibited without prior written consent.', src: 'lease' },
    lessor: { word: 'lessor', kind: 'hard', meaning: 'The landlord: the person or company renting the place to you.', ctx: 'You need written permission from your landlord.', sentence: '…without prior written consent from the lessor.', src: 'lease' },
    nebby: { word: 'nebby', kind: 'slang', say: 'NEB-ee', meaning: 'Nosy.', ctx: 'Someone is being too curious about other people’s business.', local: 'Usually teasing, not harsh.', sentence: "Don't be so nebby about the neighbors.", place: 'the 61C bus' },
    jitney: { word: 'jitney', kind: 'slang', say: 'JIT-nee', meaning: 'An informal, cash ride service, like an unofficial taxi.', ctx: 'They are getting an informal ride home.', local: 'Jitneys have a long history in Pittsburgh, especially in the Hill District.', sentence: "I'll catch a jitney home from the Hill.", place: 'Centre Ave' },
    gumband: { word: 'gumband', kind: 'slang', say: 'GUM-band', meaning: 'A rubber band.', ctx: 'They need a rubber band.', local: 'Ask for a “gumband” and locals will know exactly what you mean.', sentence: 'Hand me a gumband for these papers.', src: 'guide' },
    buggy: { word: 'buggy', kind: 'slang', say: 'BUG-ee', meaning: 'A shopping cart.', ctx: 'Bring the shopping cart back to the store.', local: 'Heard at grocery stores all over the region.', sentence: 'Put the buggy back when you’re done.', src: 'guide' },
    dahntahn: { word: 'dahntahn', kind: 'slang', say: 'dahn-TAHN', meaning: 'Downtown, said with a strong local accent.', ctx: 'They are heading downtown.', local: 'You’ll see it on T-shirts and signs as a point of pride.', sentence: 'We’re going dahntahn for the game.', src: 'guide' },
    jagoff: { word: 'jagoff', kind: 'slang', say: 'JAG-off', meaning: 'An annoying or inconsiderate person. Mildly rude.', ctx: 'Someone did something rude.', local: 'Good to recognize. Be careful using it yourself.', sentence: 'Some jagoff moved my parking chair.', src: 'guide' }
  };
  const SLANG = ['yinz', 'nat', 'nebby', 'reddup', 'slippy', 'jumbo', 'pop', 'jitney', 'gumband', 'buggy', 'dahntahn', 'jagoff'];
  const CUSTOMS = [
    { tag: 'Winter', title: 'Parking chairs', body: 'After a snowfall, people who shovel out a street spot often save it with a chair or cone. It isn’t official, but moving one is seen as rude.' },
    { tag: 'Getting around', title: 'Inbound and outbound', body: 'Bus signs say Inbound (toward Downtown) or Outbound (away from it), not north or south.' },
    { tag: 'Celebrations', title: 'The cookie table', body: 'At many local weddings, families bake trays of cookies for a shared cookie table. Taking a few home is normal.' },
    { tag: 'Sports', title: 'Black and gold game days', body: 'On Steelers game days, lots of people wear black and gold and bars fill up early. The game is an easy topic for small talk.' },
    { tag: 'Driving', title: 'The “Pittsburgh left”', body: 'Some drivers let the first car turning left go first when the light turns green. It’s a local habit, not a rule, so never assume it.' }
  ];
  const HOTSPOTS = [
    { label: '“Inbound” / “Outbound”', where: 'Bus stops, Oakland', n: 218, note: 'Inbound means toward Downtown.' },
    { label: 'Parking chairs', where: 'Side streets, South Side Slopes', n: 164, note: 'Spots saved after shoveling. Leave them.' },
    { label: '“Jumbo”', where: 'Deli menus, Bloomfield', n: 121, note: 'It’s bologna, not a size.' },
    { label: '“Jitney”', where: 'Centre Ave, Hill District', n: 87, note: 'Informal, cash ride service.' }
  ];
  const BADGES = { slang: ['Local slang', 'b-slang'], custom: ['Local custom', 'b-custom'], hard: ['Hard word', 'b-hard'], common: ['Everyday word', 'b-common'] };

  // ---------- state ----------
  const S = {
    tab: 'lens', source: 'cafe', askFirst: true, autoHard: true,
    pending: null, pendingRaw: '', sheet: null, sheetRaw: '',
    saved: ['arrears', 'jitney', 'nebby'], savedDates: { arrears: 'Oct 24', jitney: 'Oct 23', nebby: 'Oct 22' },
    wordFilter: 'all', localSeg: 'slang', reviewIdx: 0, revealed: false
  };

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const keyOf = (tok) => { const k = tok.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, '').replace(/^'+|'+$/g, ''); return ALIAS[k] || k; };
  const placeOf = (e) => e.place || PLACES[e.src] || 'the lens';
  const badge = (kind) => { const b = BADGES[kind] || BADGES.common; return `<span class="badge ${b[1]}">${b[0]}</span>`; };
  const pin = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const isSaved = (k) => S.saved.includes(k);
  function toggleSave(k) {
    const i = S.saved.indexOf(k);
    if (i >= 0) S.saved.splice(i, 1);
    else { S.saved.unshift(k); S.savedDates[k] = 'Today'; }
  }
  const tokens = () => TEXTS[S.source].split(' ');

  // ---------- views ----------
  function viewLens() {
    const active = S.pending || S.sheet;
    const toks = tokens().map((raw, i) => {
      const k = keyOf(raw), e = D[k];
      let cls = 'tok';
      if (e && (e.kind !== 'hard' || S.autoHard)) cls += ' hard';
      if (active && k === active) cls += ' on';
      return `<button type="button" class="${cls}" data-action="word" data-i="${i}">${esc(raw)}</button>`;
    }).join('');
    const autos = S.autoHard ? Object.keys(D).filter((k) => D[k].kind === 'hard' && D[k].src === S.source) : [];
    return `<div class="pad">
      <div class="seg">
        <button type="button" class="${S.source === 'cafe' ? 'on' : ''}" data-action="source" data-v="cafe">Café sign</button>
        <button type="button" class="${S.source === 'lease' ? 'on' : ''}" data-action="source" data-v="lease">Lease letter</button>
      </div>
      <div class="lens">
        <span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>
        <div class="lens-label">${S.source === 'cafe' ? 'Camera · café notice board' : 'Camera · letter from landlord'}</div>
        <div class="paper">${toks}</div>
      </div>
      <p class="small" style="margin: -4px 4px 0">Tap a word you would pause on. On the glasses, your eyes do this part: Linger notices when you stop or re-read. <span class="dotted-key">Dotted</span> words are ones newcomers often pause on.</p>
      <div class="card">
        <div class="switch-row"><div><strong>Ask before showing</strong><span class="small">When you linger, Linger checks first</span></div>
          <button type="button" class="switch" role="switch" aria-label="Ask before showing" aria-checked="${S.askFirst}" data-action="ask"></button></div>
        <div class="switch-row"><div><strong>Auto-define hard words</strong><span class="small">Underlined and explained right away</span></div>
          <button type="button" class="switch" role="switch" aria-label="Auto-define hard words" aria-checked="${S.autoHard}" data-action="auto"></button></div>
      </div>
      ${autos.length ? `<div style="display: flex; flex-direction: column; gap: 8px">
        <div class="label" style="color: var(--amber-ink)">Auto-defined on this page</div>
        ${autos.map((k) => `<button type="button" class="auto" data-action="open" data-k="${k}"><strong>${esc(D[k].word)}</strong> · ${esc(D[k].meaning)}</button>`).join('')}
      </div>` : ''}
    </div>`;
  }

  function viewWords() {
    const list = S.saved.filter((k) => D[k]).filter((k) => S.wordFilter === 'all' || (S.wordFilter === 'hard' ? D[k].kind === 'hard' : D[k].kind !== 'hard'));
    const n = S.saved.length;
    const filters = [['all', 'All'], ['slang', 'Slang & customs'], ['hard', 'Hard words']];
    return `<div class="pad">
      <div><h2 class="title">Your words</h2><div class="sub">${n === 1 ? '1 word saved' : n + ' words saved'}, with where you met them</div></div>
      <div class="chips">${filters.map(([id, l]) => `<button type="button" class="chip ${S.wordFilter === id ? 'on' : ''}" data-action="filter" data-v="${id}">${esc(l)}</button>`).join('')}</div>
      ${list.length ? list.map((k) => { const e = D[k]; return `<button type="button" class="item" data-action="open" data-k="${k}">
        <span class="item-head"><span class="word">${esc(e.word)}</span>${badge(e.kind)}</span>
        <span style="font-size: 14px">${esc(e.meaning)}</span>
        <span class="quote">“${esc(e.sentence)}”</span>
        <span class="meta">${pin}${esc(placeOf(e))} · ${esc(S.savedDates[k] || 'Today')}</span></button>`; }).join('')
        : '<div class="empty">Nothing here yet. Words you save from the lens or the local guide show up here.</div>'}
    </div>`;
  }

  function viewLocal() {
    const segs = [['slang', 'Slang'], ['customs', 'Customs'], ['hotspots', 'Pause map']];
    let body = '';
    if (S.localSeg === 'slang') {
      body = SLANG.map((k) => { const e = D[k], s = isSaved(k); return `<div class="item" style="gap: 4px">
        <div class="item-head"><div><span class="word">${esc(e.word)}</span> <span class="small">/${esc(e.say)}/</span></div>
        <button type="button" class="save ${s ? 'saved' : ''}" data-action="save" data-k="${k}">${s ? 'Saved ✓' : 'Save'}</button></div>
        <div style="font-size: 14px">${esc(e.meaning)}</div><div class="quote">“${esc(e.sentence)}”</div></div>`; }).join('');
    } else if (S.localSeg === 'customs') {
      body = CUSTOMS.map((c) => `<div class="item"><span class="tag">${esc(c.tag)}</span><div class="word" style="font-size: 17px">${esc(c.title)}</div><div style="font-size: 14px; color: var(--ink-2)">${esc(c.body)}</div></div>`).join('');
    } else {
      const max = Math.max(...HOTSPOTS.map((h) => h.n));
      body = `<div class="dark"><div style="font-weight: 800; font-size: 16px; margin-bottom: 4px">Where newcomers pause</div>When lots of people new to the area linger on the same word in the same neighborhood, Linger adds it to this guide. Only the word and the area are shared, never your eye data.</div>`
        + HOTSPOTS.map((h) => `<div class="item">
          <div class="item-head" style="align-items: baseline"><span class="word" style="font-size: 16px">${esc(h.label)}</span><span style="font-size: 13px; font-weight: 700; color: var(--amber-ink)">${h.n} paused</span></div>
          <div class="small" style="font-size: 12px">${esc(h.where)}</div>
          <div class="bar"><span style="width: ${Math.round(h.n / max * 100)}%"></span></div>
          <div style="font-size: 14px">${esc(h.note)}</div></div>`).join('')
        + '<div class="small" style="font-size: 12px; text-align: center">Sample data for the prototype</div>';
    }
    return `<div class="pad">
      <div><div class="label" style="color: var(--accent); display: flex; align-items: center; gap: 6px">${pin}Based on where you are</div><h2 class="title" style="margin-top: 2px">Pittsburgh, PA</h2></div>
      <div class="seg">${segs.map(([id, l]) => `<button type="button" class="${S.localSeg === id ? 'on' : ''}" data-action="seg" data-v="${id}">${l}</button>`).join('')}</div>
      <div style="display: flex; flex-direction: column; gap: 10px">${body}</div>
    </div>`;
  }

  function viewReview() {
    const deck = S.saved.filter((k) => D[k]);
    const has = S.reviewIdx < deck.length;
    const left = Math.max(deck.length - S.reviewIdx, 0);
    let body;
    if (has) {
      const e = D[deck[S.reviewIdx]];
      body = `<div class="flash">${badge(e.kind)}<div class="big">${esc(e.word)}</div>
        <div class="quote" style="font-size: 14px">“${esc(e.sentence)}”</div>
        <div class="small" style="font-size: 12px">You met this at ${esc(placeOf(e))}</div>
        ${S.revealed ? `<div class="answer">${esc(e.meaning)}</div>` : ''}</div>
        ${S.revealed ? `<div class="grid2"><button type="button" class="btn" data-action="next">Again soon</button><button type="button" class="btn primary" data-action="next">Got it</button></div>`
          : '<button type="button" class="btn dark-btn" data-action="reveal">Show meaning</button>'}`;
    } else {
      body = `<div class="empty" style="border-style: solid; display: flex; flex-direction: column; gap: 10px; align-items: center">
        <div style="font-size: 20px; font-weight: 800; color: var(--ink)">All caught up</div>
        <div>You reviewed ${deck.length} ${deck.length === 1 ? 'word' : 'words'}. Save more from the lens or the local guide.</div>
        <button type="button" class="btn" style="height: 44px; padding: 0 18px" data-action="restart">Review again</button></div>`;
    }
    return `<div class="pad">
      <div><h2 class="title">Review</h2><div class="sub">${has ? `${left} ${left === 1 ? 'word' : 'words'} to review, using the sentence where you first met each one` : 'Nothing left for today'}</div></div>
      ${body}</div>`;
  }

  function overlay() {
    let html = '';
    if (S.pending && S.tab === 'lens') {
      const secs = (1.1 + (S.pendingRaw.length % 7) * 0.15).toFixed(1);
      html += `<div class="prompt" role="dialog" aria-label="Linger noticed a pause">
        <div style="display: flex; align-items: center; gap: 10px">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFC861" stroke-width="2" aria-hidden="true" style="flex: none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          <div style="font-size: 14px">You lingered on <strong>“${esc(S.pendingRaw)}”</strong> for ${secs}s. Want the meaning?</div></div>
        <div class="prompt-actions"><button type="button" class="p-no" data-action="dismiss">Not now</button><button type="button" class="p-yes" data-action="accept">Show me</button></div></div>`;
    }
    if (S.sheet) {
      const e = D[S.sheet];
      let inner;
      if (e) {
        const s = isSaved(S.sheet);
        inner = `<div class="item-head"><div class="sheet-word">${esc(e.word)}</div>${badge(e.kind)}</div>
          <div class="meaning">${esc(e.meaning)}</div>
          <div style="display: flex; flex-direction: column; gap: 4px"><div class="label" style="color: var(--muted)">In this sentence</div><div>${esc(e.ctx)}</div><div class="ctx">“${esc(e.sentence)}”</div></div>
          ${e.local ? `<div class="local"><div class="label">${pin}Around here</div><div style="font-size: 14px">${esc(e.local)}</div></div>` : ''}
          <div class="small" style="font-size: 12px">Seen at ${esc(placeOf(e))}</div>
          <div class="grid2"><button type="button" class="btn" data-action="close">Close</button><button type="button" class="btn ${s ? 'saved' : 'primary'}" data-action="save" data-k="${S.sheet}">${s ? 'Saved ✓' : 'Save to Words'}</button></div>`;
      } else {
        const sentence = TEXTS[S.source].split(/(?<=[.!?])\s/).find((x) => x.includes(S.sheetRaw)) || '';
        inner = `<div class="item-head"><div class="sheet-word">${esc(S.sheetRaw)}</div>${badge('common')}</div>
          <div class="meaning">An everyday word.</div>
          <div style="display: flex; flex-direction: column; gap: 4px"><div class="label" style="color: var(--muted)">In this sentence</div>
          <div>In the full app, Linger would explain this word in the context of the sentence you were reading. This prototype only has detailed entries for the slang and hard words.</div>
          ${sentence ? `<div class="ctx">“${esc(sentence)}”</div>` : ''}</div>
          <div class="grid2"><button type="button" class="btn" data-action="close">Close</button><button type="button" class="btn primary" data-action="close">Got it</button></div>`;
      }
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close definition" data-action="close"></button>
        <div class="panel" role="dialog" aria-label="Word meaning"><div class="grab"></div>${inner}</div></div>`;
    }
    return html;
  }

  const header = `<div class="top">
    <div class="brand"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="#14161F"/><circle cx="14" cy="14" r="5" fill="#FFC861"/><circle cx="14" cy="14" r="9" fill="none" stroke="#FFC861" stroke-width="1.5" opacity="0.5"/></svg>Linger</div>
    <div class="pair"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><path d="M10 14h4M2 12l2-5M22 12l-2-5"/></svg>Phone mode · glasses not paired</div>
  </div>`;

  // ---------- render ----------
  const scroll = document.getElementById('scroll');
  const over = document.getElementById('overlay');
  let lastTab = null;
  function render() {
    const views = { lens: viewLens, words: viewWords, local: viewLocal, review: viewReview };
    const top = scroll.scrollTop;
    scroll.innerHTML = header + views[S.tab]();
    scroll.scrollTop = lastTab === S.tab ? top : 0;
    lastTab = S.tab;
    over.innerHTML = overlay();
    document.querySelectorAll('.tabbar button').forEach((b) => {
      if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  // ---------- actions ----------
  const actions = {
    tab: (d) => { S.tab = d.tab; S.pending = null; S.sheet = null; },
    source: (d) => { S.source = d.v; S.pending = null; S.sheet = null; },
    word: (d) => {
      const raw = tokens()[Number(d.i)];
      const k = keyOf(raw);
      if (!k) return;
      const clean = raw.replace(/[.,!?;:]+$/, '');
      if (S.askFirst) { S.pending = k; S.pendingRaw = clean; S.sheet = null; }
      else { S.sheet = k; S.sheetRaw = clean; S.pending = null; }
    },
    open: (d) => { S.sheet = d.k; S.sheetRaw = d.k; S.pending = null; },
    accept: () => { S.sheet = S.pending; S.sheetRaw = S.pendingRaw; S.pending = null; },
    dismiss: () => { S.pending = null; },
    close: () => { S.sheet = null; },
    ask: () => { S.askFirst = !S.askFirst; },
    auto: () => { S.autoHard = !S.autoHard; },
    save: (d) => { toggleSave(d.k); },
    filter: (d) => { S.wordFilter = d.v; },
    seg: (d) => { S.localSeg = d.v; },
    reveal: () => { S.revealed = true; },
    next: () => { S.reviewIdx += 1; S.revealed = false; },
    restart: () => { S.reviewIdx = 0; S.revealed = false; }
  };
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]');
    if (!b || !actions[b.dataset.action]) return;
    actions[b.dataset.action](b.dataset);
    render();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && (S.sheet || S.pending)) { S.sheet = null; S.pending = null; render(); }
  });

  // Shrink the phone frame to fit shorter desktop windows.
  function fit() {
    const f = Math.min(1, Math.max(0.55, (window.innerHeight - 48) / 868));
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  window.addEventListener('resize', fit);
  fit();

  render();
})();

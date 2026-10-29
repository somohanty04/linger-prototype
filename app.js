(() => {
  'use strict';

  // ---------- content ----------
  const PLACES = { cafe: 'Café board, Lawrenceville', lease: 'Lease letter, home', guide: 'the local guide' };
  const TEXTS = {
    cafe: "Heads up, yinz! The back lot gets slippy after snow. Please don't move the parking chairs — neighbors shoveled those spots. Grab a jumbo sandwich and a pop, then redd up your table before the game n'at.",
    lease: 'Tenants are hereby notified that the premises will undergo routine maintenance on Nov 3. Any arrears must be remitted by the 1st. Subletting is prohibited without prior written consent from the lessor.'
  };
  // Plain-language summaries for "Explain this letter / sign"
  const SUMMARY = {
    lease: {
      title: 'What this letter wants from you',
      points: [
        ['💵', '<b>If you are behind on rent, pay it by the 1st.</b> “Arrears” means money you owe that is already late.'],
        ['🔧', '<b>Workers will do routine repairs in your building on Nov 3.</b> You don’t need to do anything, but expect people around.'],
        ['🚫', '<b>Don’t rent your apartment to anyone else</b> unless your landlord agrees in writing first.']
      ],
      dates: ['Nov 3 · repairs', '1st · late rent due'],
      note: 'This is a formal letter from your landlord (the “lessor”). It uses legal words, but nothing in it is unusual.'
    },
    cafe: {
      title: 'What this sign says',
      points: [
        ['❄️', '<b>Be careful: the back parking lot gets slippery after snow.</b>'],
        ['🪑', '<b>Don’t move chairs left in parking spots.</b> Neighbors use them to save spots they shoveled.'],
        ['🥪', '<b>Get a bologna sandwich and a soda, then clean up your table</b> before the football game.']
      ],
      dates: [],
      note: 'This is a friendly sign written in local Pittsburgh slang: yinz, slippy, jumbo, pop, redd up and n’at.'
    }
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
  // Fill in the story: [text, blank answer key, text, ...]. Blanks are the odd items.
  const STORIES = [
    { title: 'My First Week Here', parts: ['My neighbor is so ', 'nebby', '. She asked about the letter on my door, which said my rent is in ', 'arrears', '. So, I grabbed a ', 'jumbo', ' sandwich at the corner store, then caught a ', 'jitney', ' home from the Hill.'] },
    { title: 'The First Snow', parts: ['The sidewalk was so ', 'slippy', ' I almost fell. My neighbor saved her spot with a ', 'parkingchair', '. She waved and said, “', 'yinz', ' should come over for the game!” So I helped her ', 'reddup', ' the kitchen first.'] },
    { title: 'Reading My Lease', parts: ['The ', 'lessor', ' owns my building. Pets are ', 'prohibited', ', so my cat has to stay with a friend. Repairs to the ', 'premises', ' happen in November, and ', 'subletting', ' my room needs written permission.'] }
  ];
  const BADGES = { slang: ['Local slang', 'b-slang'], custom: ['Local custom', 'b-custom'], hard: ['Hard Word', 'b-hard'], common: ['Everyday word', 'b-common'] };

  // ---------- state ----------
  const S = {
    tab: 'words', source: 'lease', askFirst: true, autoHard: true,
    pending: null, pendingRaw: '', sheet: null, sheetRaw: '', explain: false,
    saved: ['arrears', 'jitney', 'nebby'], savedDates: { arrears: 'Oct 24', jitney: 'Oct 23', nebby: 'Oct 22' },
    wordFilter: 'all', query: '', localSeg: 'slang',
    activity: null, // 'story' | 'cards'
    cards: { idx: 0, revealed: false },
    game: null,
    speaking: null // which text is being read aloud
  };

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const keyOf = (tok) => { const k = tok.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, '').replace(/^'+|'+$/g, ''); return ALIAS[k] || k; };
  const placeOf = (e) => e.place || PLACES[e.src] || 'the lens';
  const badge = (kind) => { const b = BADGES[kind] || BADGES.common; return `<span class="badge ${b[1]}">${b[0]}</span>`; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pin = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const speaker = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const xIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const logo = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="11.5" fill="none" stroke="#44C9E6" stroke-width="3"/><circle cx="15" cy="15" r="5" fill="#44C9E6"/></svg>';
  const isSaved = (k) => S.saved.includes(k);
  function toggleSave(k) {
    const i = S.saved.indexOf(k);
    if (i >= 0) S.saved.splice(i, 1);
    else { S.saved.unshift(k); S.savedDates[k] = 'Today'; }
  }
  const tokens = () => TEXTS[S.source].split(' ');
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  // ---------- read aloud ----------
  const canSpeak = 'speechSynthesis' in window;
  function stopSpeaking() {
    if (canSpeak) window.speechSynthesis.cancel();
    S.speaking = null;
    document.querySelectorAll('.tok.speaking').forEach((t) => t.classList.remove('speaking'));
  }
  function speak(id, text, onWord) {
    if (!canSpeak) return;
    const again = S.speaking === id;
    stopSpeaking();
    if (again) { render(); return; } // second tap stops
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    if (onWord) u.onboundary = (e) => { if (e.name === 'word' || e.name === undefined) onWord(e.charIndex); };
    u.onend = u.onerror = () => { if (S.speaking === id) { S.speaking = null; document.querySelectorAll('.tok.speaking').forEach((t) => t.classList.remove('speaking')); render(); } };
    S.speaking = id;
    window.speechSynthesis.speak(u);
  }
  // Highlight the word being read in the lens
  function readLens() {
    const toks = tokens();
    const starts = []; let pos = 0;
    toks.forEach((t) => { starts.push(pos); pos += t.length + 1; });
    speak('lens', TEXTS[S.source], (ci) => {
      let i = 0; while (i + 1 < starts.length && starts[i + 1] <= ci) i++;
      document.querySelectorAll('.tok.speaking').forEach((t) => t.classList.remove('speaking'));
      const el = document.querySelector(`.tok[data-i="${i}"]`);
      if (el) el.classList.add('speaking');
    });
  }
  const summaryText = (s) => [s.title + '.', ...s.points.map((p) => p[1].replace(/<[^>]+>/g, ''))].join(' ');

  // ---------- views ----------
  const rings = (a) => a.map(([cls, st]) => `<span class="${cls}" style="${st}"></span>`).join('');
  const heroDeco = rings([['ring', 'width:190px;height:190px;right:-50px;top:-70px'], ['dot', 'width:78px;height:78px;right:24px;top:-18px']]);
  const pairPill = `<a class="pair" href="glasses.html" aria-label="Phone mode, glasses not paired. Open the glasses simulation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><path d="M10 14h4M2 12l2-5M22 12l-2-5"/></svg>Phone mode</a>`;
  const hero = (title, sub, over) => `<header class="hero">${heroDeco}
    <div class="hero-top">${logo}${pairPill}</div>
    ${over ? `<div class="over">${pin}${esc(over)}</div>` : ''}
    <h1>${esc(title)}</h1>${sub ? `<div class="hsub">${esc(sub)}</div>` : ''}</header>`;

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
    const what = S.source === 'lease' ? 'letter' : 'sign';
    const reading = S.speaking === 'lens';
    return `${hero('Lens', 'Point your camera at a sign or letter')}
    <div class="body">
      <div class="seg">
        <button type="button" class="${S.source === 'lease' ? 'on' : ''}" data-action="source" data-v="lease">Lease letter</button>
        <button type="button" class="${S.source === 'cafe' ? 'on' : ''}" data-action="source" data-v="cafe">Café sign</button>
      </div>
      <div class="lens">
        <span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>
        <div class="lens-label">${S.source === 'cafe' ? 'Camera · café notice board' : 'Camera · letter from landlord'}</div>
        <div class="paper">${toks}</div>
      </div>
      <div class="lens-actions">
        <button type="button" class="btn primary" data-action="explain">✦ Explain this ${what}</button>
        <button type="button" class="btn ${reading ? 'deep' : 'ghost'}" data-action="read" ${canSpeak ? '' : 'disabled'}>${speaker}${reading ? 'Stop' : 'Read aloud'}</button>
      </div>
      <p class="small" style="margin: -2px 4px 0">Tap a word you would pause on. On the glasses, your eyes do this part. <span class="dotted-key">Dotted</span> words are ones newcomers often pause on.</p>
      <div class="card">
        <div class="switch-row"><div><strong>Ask before showing</strong><span class="small">When you linger, Linger checks first</span></div>
          <button type="button" class="switch" role="switch" aria-label="Ask before showing" aria-checked="${S.askFirst}" data-action="ask"></button></div>
        <div class="switch-row"><div><strong>Auto-define hard words</strong><span class="small">Underlined and explained right away</span></div>
          <button type="button" class="switch" role="switch" aria-label="Auto-define hard words" aria-checked="${S.autoHard}" data-action="auto"></button></div>
      </div>
      ${autos.length ? `<div style="display: flex; flex-direction: column; gap: 8px">
        <div class="label" style="color: var(--indigo-500)">Auto-defined on this page</div>
        ${autos.map((k) => `<button type="button" class="auto" data-action="open" data-k="${k}"><strong>${esc(D[k].word)}</strong> · ${esc(D[k].meaning)}</button>`).join('')}
      </div>` : ''}
    </div>`;
  }

  function viewWords() {
    const q = S.query.trim().toLowerCase();
    const list = S.saved.filter((k) => D[k])
      .filter((k) => S.wordFilter === 'all' || (S.wordFilter === 'hard' ? D[k].kind === 'hard' : D[k].kind !== 'hard'))
      .filter((k) => !q || D[k].word.includes(q) || D[k].meaning.toLowerCase().includes(q));
    const n = S.saved.length;
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const days = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    const filters = [['all', 'All words'], ['slang', 'Slang/customs'], ['hard', 'Hard words']];
    return `<header class="hero">${rings([['ring', 'width:230px;height:230px;right:-70px;top:-40px'], ['dot', 'width:96px;height:96px;right:20px;top:-26px']])}
      <div class="hero-top">${logo}<span class="cal" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span></div>
      <h1>${esc(day)},<br>${esc(date)}</h1>
      <div class="hsub">${n === 1 ? '1 word saved' : n + ' words saved'}</div>
      <div class="week"><span class="arrow">◀</span>${days.map((d, i) => `<span class="d ${i === now.getDay() ? 'on' : ''}">${d}</span>`).join('')}<span class="arrow">▶</span></div>
    </header>
    <div class="body">
      <label class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="Search" value="${esc(S.query)}" aria-label="Search your words"></label>
      <div class="chips">${filters.map(([id, l]) => `<button type="button" class="chip ${S.wordFilter === id ? 'on' : ''}" data-action="filter" data-v="${id}">${esc(l)}</button>`).join('')}</div>
      ${list.length ? list.map((k) => { const e = D[k]; return `<button type="button" class="item" data-action="open" data-k="${k}">
        <span class="item-head"><span class="word">${esc(cap(e.word))}</span>${badge(e.kind)}</span>
        <span style="font-size: 14px">${esc(e.meaning)}</span>
        <span class="quote">“${esc(e.sentence)}”</span>
        <span class="meta">${pin}${esc(placeOf(e))} · ${esc(S.savedDates[k] || 'Today')}</span></button>`; }).join('')
        : `<div class="empty">${q ? 'No saved words match your search.' : 'Nothing here yet. Words you save from the lens or the local guide show up here.'}</div>`}
      <button type="button" class="btn primary start" data-action="play" data-v="story">✦ Start Activity</button>
    </div>`;
  }

  function viewLocal() {
    const segs = [['slang', 'Slang'], ['customs', 'Customs'], ['hotspots', 'Pause map']];
    let body = '';
    if (S.localSeg === 'slang') {
      body = SLANG.map((k) => { const e = D[k], s = isSaved(k); return `<div class="item">
        <div class="item-head"><div><span class="word sm">${esc(e.word)}</span> <span class="small">/${esc(e.say)}/</span></div>
        <button type="button" class="save ${s ? 'saved' : ''}" data-action="save" data-k="${k}">${s ? 'Saved ✓' : 'Save'}</button></div>
        <div style="font-size: 14px">${esc(e.meaning)}</div><div class="quote">“${esc(e.sentence)}”</div></div>`; }).join('');
    } else if (S.localSeg === 'customs') {
      body = CUSTOMS.map((c) => `<div class="item"><span class="tag">${esc(c.tag)}</span><div class="word sm">${esc(c.title)}</div><div style="font-size: 14px; color: var(--ink-2)">${esc(c.body)}</div></div>`).join('');
    } else {
      const max = Math.max(...HOTSPOTS.map((h) => h.n));
      body = `<div class="dark"><div style="font-weight: 800; font-size: 16px; margin-bottom: 4px">Where newcomers pause</div>When lots of people new to the area linger on the same word in the same neighborhood, Linger adds it to this guide. Only the word and the area are shared, never your eye data.</div>`
        + HOTSPOTS.map((h) => `<div class="item">
          <div class="item-head" style="align-items: baseline"><span class="word sm" style="font-size: 16px">${esc(h.label)}</span><span class="count">${h.n} paused</span></div>
          <div class="small" style="font-size: 12px">${esc(h.where)}</div>
          <div class="bar"><span style="width: ${Math.round(h.n / max * 100)}%"></span></div>
          <div style="font-size: 14px">${esc(h.note)}</div></div>`).join('')
        + '<div class="small" style="font-size: 12px; text-align: center">Sample data for the prototype</div>';
    }
    return `${hero('Pittsburgh, PA', null, 'Based on where you are')}
    <div class="body">
      <div class="seg">${segs.map(([id, l]) => `<button type="button" class="${S.localSeg === id ? 'on' : ''}" data-action="seg" data-v="${id}">${l}</button>`).join('')}</div>
      <div style="display: flex; flex-direction: column; gap: 10px">${body}</div>
    </div>`;
  }

  function viewReview() {
    const n = S.saved.filter((k) => D[k]).length;
    const act = (id, ic, title, sub) => `<button type="button" class="act" data-action="play" data-v="${id}"><span class="ic">${ic}</span><span><strong>${title}</strong><span class="small">${sub}</span></span><span class="go">›</span></button>`;
    const soon = (ic, title, sub) => `<div class="act soon"><span class="ic">${ic}</span><span><strong>${title}</strong><span class="small">${sub}</span></span><span class="go">Soon</span></div>`;
    return `${hero('Review', 'Practice the words you met')}
    <div class="body">
      <div class="label" style="color: var(--indigo-500)">Activities</div>
      ${act('story', '✍️', 'Fill in the story', 'Put your words back into a short story')}
      ${act('cards', '🃏', 'Flashcards', `${n} ${n === 1 ? 'word' : 'words'}, with the sentence where you met each one`)}
      <div class="label" style="color: var(--muted); margin-top: 6px">Coming soon</div>
      ${soon('📬', 'Read the notice', 'A short text using your words, then a question')}
      ${soon('⚖️', 'Landlord or friend?', 'Sort words by how formal they are')}
      ${soon('📖', 'Dictionary or local?', 'Pick the meaning that fits here')}
    </div>`;
  }

  // ---------- full-screen activities ----------
  function viewCards() {
    const deck = S.saved.filter((k) => D[k]);
    const c = S.cards;
    const deco = rings([['ring', 'width:240px;height:240px;left:-110px;top:-70px'], ['dot', 'width:76px;height:76px;left:-10px;top:0'], ['ring', 'width:240px;height:240px;right:-90px;bottom:-60px'], ['dot', 'width:90px;height:90px;right:-4px;bottom:20px']]);
    const top = `<div class="topbar"><button type="button" class="x" data-action="quit" aria-label="Close flashcards">${xIcon}</button><span class="t">Flashcards</span><span class="n">${Math.min(c.idx + 1, deck.length)} of ${deck.length}</span></div>`;
    if (c.idx >= deck.length) {
      return `<div class="full-view cards-view">${deco}${top}
        <div class="flash" style="justify-content: center; align-items: center; text-align: center"><div class="big" style="margin: 0">All caught up</div><div class="small">You reviewed ${deck.length} ${deck.length === 1 ? 'word' : 'words'}. Try Fill in the story next.</div></div>
        <div class="actions"><button type="button" class="btn white" data-action="play" data-v="story">Fill in the story</button><button type="button" class="btn primary" data-action="quit">Done</button></div></div>`;
    }
    const e = D[deck[c.idx]];
    const q = esc(e.sentence).replace(new RegExp(esc(e.word), 'i'), (m) => `<b>${m}</b>`);
    return `<div class="full-view cards-view">${deco}${top}
      <div class="flash"><div class="fh">${badge(e.kind)}<svg width="18" height="18" viewBox="0 0 24 24" fill="#5B6070" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H7v9z"/></svg></div>
        <div class="big">${esc(cap(e.word))}</div>
        <div class="q">“${q}”</div>
        <div class="meta">${pin}${esc(placeOf(e))}</div>
        ${c.revealed ? `<div class="answer">${esc(e.meaning)}</div>` : ''}</div>
      <div class="actions">${c.revealed
        ? '<div class="grid2"><button type="button" class="btn white" data-action="card-next">Again soon</button><button type="button" class="btn white" data-action="card-next">Got it</button></div>'
        : '<button type="button" class="btn primary" data-action="card-reveal">Show meaning</button>'}</div></div>`;
  }

  function newGame(storyIdx) {
    const st = STORIES[storyIdx];
    const answers = st.parts.filter((_, i) => i % 2 === 1);
    S.game = { story: storyIdx, placed: answers.map(() => null), bank: shuffle(answers), sel: null, checked: false, fixed: false, missIdx: 0 };
  }

  function viewStory() {
    const g = S.game, st = STORIES[g.story];
    const answers = st.parts.filter((_, i) => i % 2 === 1);
    let b = -1;
    const text = st.parts.map((p, i) => {
      if (i % 2 === 0) return esc(p);
      b++;
      const w = g.placed[b];
      let cls = 'blank';
      if (g.checked) cls += w === answers[b] ? ' right' : ' wrong';
      else if (w) cls += ' filled';
      else if (g.sel) cls += ' target';
      return `<button type="button" class="${cls}" data-action="blank" data-b="${b}" aria-label="${w ? 'Blank filled with ' + esc(D[w].word) : 'Empty blank ' + (b + 1)}">${w ? esc(D[w].word) : ''}</button>`;
    }).join('');
    const left = g.placed.filter((x) => !x).length;
    let tray;
    if (!g.checked) {
      const hint = g.sel ? `Now tap the blank where <b>${esc(cap(D[g.sel].word))}</b> fits.` : 'Tap a word, then a blank.';
      tray = `<div class="hint">${hint}</div>
        <div class="bank">${g.bank.map((k) => { const used = g.placed.includes(k); return `<button type="button" class="wchip ${g.sel === k ? 'sel' : ''} ${used ? 'used' : ''}" data-action="pick" data-k="${k}" ${used ? 'tabindex="-1" aria-hidden="true"' : ''}>${esc(cap(D[k].word))}</button>`; }).join('')}</div>
        <button type="button" class="left ${left ? '' : 'ready'}" data-action="check" ${left ? 'disabled' : ''}>${left ? `${left} ${left === 1 ? 'word' : 'words'} left` : 'Check answers'}</button>`;
    } else {
      const wrong = answers.map((a, i) => (g.placed[i] !== a ? i : -1)).filter((i) => i >= 0);
      const right = answers.length - wrong.length;
      let sub;
      if (!wrong.length) sub = g.fixed ? 'Here’s the story with every word in place.' : 'Nice work! Every word is in the right place.';
      else if (wrong.length === 2 && g.placed[wrong[0]] === answers[wrong[1]] && g.placed[wrong[1]] === answers[wrong[0]]) sub = `<b>${esc(cap(D[answers[wrong[0]]].word))}</b> and <b>${esc(cap(D[answers[wrong[1]]].word))}</b> got swapped.`;
      else sub = 'Look again at: ' + wrong.map((i) => `<b>${esc(cap(D[answers[i]].word))}</b>`).join(', ') + '.';
      const pool = wrong.length ? wrong.map((i) => answers[i]) : answers;
      const e = D[pool[g.missIdx % pool.length]];
      const last = g.story === STORIES.length - 1;
      const second = wrong.length
        ? `<button type="button" class="btn deep" data-action="fix">${wrong.length === 2 && sub.includes('swapped') ? 'Swap words' : 'Show answers'}</button>`
        : `<button type="button" class="btn deep" data-action="next-story">${last ? 'Finish' : 'Next story'}</button>`;
      tray = `<div class="result"><h3>${right} of ${answers.length} right</h3><div class="sub">${sub}</div></div>
        <div class="explain"><div class="item-head"><span class="word">${esc(cap(e.word))}</span>${badge(e.kind)}</div><div style="font-size: 14px">${esc(e.meaning)}</div></div>
        <div class="grid2"><button type="button" class="btn" data-action="miss-next">Next word</button>${second}</div>`;
    }
    return `<div class="full-view story-view">
      <div class="story-top"><div class="topbar"><button type="button" class="x" data-action="quit" aria-label="Close activity">${xIcon}</button><span class="t">Fill in the story</span><span class="n">${g.story + 1} of ${STORIES.length}</span></div></div>
      <div class="story"><h2>${esc(st.title)}</h2><p>${text}</p></div>
      <div class="tray">${tray}</div></div>`;
  }

  function overlay() {
    if (S.activity === 'cards') return viewCards();
    if (S.activity === 'story') return viewStory();
    let html = '';
    if (S.pending && S.tab === 'lens') {
      const secs = (1.1 + (S.pendingRaw.length % 7) * 0.15).toFixed(1);
      html += `<div class="prompt" role="dialog" aria-label="Linger noticed a pause">
        <div style="display: flex; align-items: center; gap: 10px">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9FEAFF" stroke-width="2" aria-hidden="true" style="flex: none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          <div style="font-size: 14px">You lingered on <strong>“${esc(S.pendingRaw)}”</strong> for ${secs}s. Want the meaning?</div></div>
        <div class="prompt-actions"><button type="button" class="p-no" data-action="dismiss">Not now</button><button type="button" class="p-yes" data-action="accept">Show me</button></div></div>`;
    }
    if (S.explain) {
      const s = SUMMARY[S.source];
      const n = Object.keys(D).filter((k) => D[k].src === S.source).length;
      const on = S.speaking === 'summary';
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close summary" data-action="close"></button>
        <div class="panel" role="dialog" aria-label="${esc(s.title)}"><div class="grab"></div>
          <div class="item-head" style="align-items: flex-start"><div class="sum-title">${esc(s.title)}</div>
            <button type="button" class="speak ${on ? 'on' : ''}" data-action="speak-summary" aria-label="${on ? 'Stop reading' : 'Read summary aloud'}" ${canSpeak ? '' : 'disabled'}>${speaker}</button></div>
          <ul class="points">${s.points.map(([ic, t]) => `<li><span class="pi" aria-hidden="true">${ic}</span><span>${t}</span></li>`).join('')}</ul>
          ${s.dates.length ? `<div style="display: flex; flex-direction: column; gap: 6px"><div class="label" style="color: var(--muted)">Key dates</div><div class="dates">${s.dates.map((d) => `<span class="date">${esc(d)}</span>`).join('')}</div></div>` : ''}
          <div class="small">${esc(s.note)} ${n} words on this page are underlined. Tap one for its meaning.</div>
          <button type="button" class="btn primary" data-action="close">Got it</button></div></div>`;
    }
    if (S.sheet) {
      const e = D[S.sheet];
      let inner;
      const on = S.speaking === 'word';
      const spk = `<button type="button" class="speak ${on ? 'on' : ''}" data-action="speak-word" aria-label="Say it aloud" ${canSpeak ? '' : 'disabled'}>${speaker}</button>`;
      if (e) {
        const s = isSaved(S.sheet);
        inner = `<div class="item-head"><div style="display: flex; align-items: center; gap: 10px"><div class="sheet-word">${esc(e.word)}</div>${spk}</div>${badge(e.kind)}</div>
          <div class="meaning">${esc(e.meaning)}</div>
          <div style="display: flex; flex-direction: column; gap: 4px"><div class="label" style="color: var(--muted)">In this sentence</div><div>${esc(e.ctx)}</div><div class="ctx">“${esc(e.sentence)}”</div></div>
          ${e.local ? `<div class="local"><div class="label">${pin}Around here</div><div style="font-size: 14px">${esc(e.local)}</div></div>` : ''}
          <div class="small" style="font-size: 12px">Seen at ${esc(placeOf(e))}</div>
          <div class="grid2"><button type="button" class="btn" data-action="close">Close</button><button type="button" class="btn ${s ? 'saved' : 'primary'}" data-action="save" data-k="${S.sheet}">${s ? 'Saved ✓' : 'Save to Words'}</button></div>`;
      } else {
        const sentence = TEXTS[S.source].split(/(?<=[.!?])\s/).find((x) => x.includes(S.sheetRaw)) || '';
        inner = `<div class="item-head"><div style="display: flex; align-items: center; gap: 10px"><div class="sheet-word">${esc(S.sheetRaw)}</div>${spk}</div>${badge('common')}</div>
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

  // ---------- render ----------
  const scroll = document.getElementById('scroll');
  const over = document.getElementById('overlay');
  const screenEl = document.querySelector('.screen');
  let lastTab = null;
  function render() {
    const views = { lens: viewLens, words: viewWords, local: viewLocal, review: viewReview };
    const top = scroll.scrollTop;
    const focusQ = document.activeElement && document.activeElement.id === 'q';
    const caret = focusQ ? document.activeElement.selectionStart : 0;
    scroll.innerHTML = views[S.tab]();
    scroll.scrollTop = lastTab === S.tab ? top : 0;
    lastTab = S.tab;
    over.innerHTML = overlay();
    screenEl.classList.toggle('full', !!S.activity);
    document.querySelectorAll('.tabbar button').forEach((b) => {
      if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (focusQ) { const q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(caret, caret); } }
  }

  // ---------- actions ----------
  const actions = {
    tab: (d) => { stopSpeaking(); S.tab = d.tab; S.pending = null; S.sheet = null; S.explain = false; },
    source: (d) => { stopSpeaking(); S.source = d.v; S.pending = null; S.sheet = null; S.explain = false; },
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
    close: () => { if (S.speaking === 'summary' || S.speaking === 'word') stopSpeaking(); S.sheet = null; S.explain = false; },
    explain: () => { stopSpeaking(); S.explain = true; S.pending = null; S.sheet = null; },
    read: () => { readLens(); },
    'speak-summary': () => { speak('summary', summaryText(SUMMARY[S.source])); },
    'speak-word': () => { const e = D[S.sheet]; speak('word', e ? `${e.word}. ${e.meaning} ${e.sentence}` : S.sheetRaw); },
    ask: () => { S.askFirst = !S.askFirst; },
    auto: () => { S.autoHard = !S.autoHard; },
    save: (d) => { toggleSave(d.k); },
    filter: (d) => { S.wordFilter = d.v; },
    seg: (d) => { S.localSeg = d.v; },
    play: (d) => { stopSpeaking(); S.sheet = null; S.explain = false; S.activity = d.v; if (d.v === 'story') newGame(0); else S.cards = { idx: 0, revealed: false }; },
    quit: () => { S.activity = null; S.game = null; },
    'card-reveal': () => { S.cards.revealed = true; },
    'card-next': () => { S.cards.idx += 1; S.cards.revealed = false; },
    pick: (d) => { const g = S.game; g.sel = g.sel === d.k ? null : d.k; },
    blank: (d) => {
      const g = S.game, b = Number(d.b);
      if (g.checked) return;
      if (g.sel) { const prev = g.placed.indexOf(g.sel); if (prev >= 0) g.placed[prev] = null; g.placed[b] = g.sel; g.sel = null; }
      else if (g.placed[b]) { g.placed[b] = null; } // tap a filled blank to send the word back
    },
    check: () => { if (!S.game.placed.includes(null)) { S.game.checked = true; S.game.missIdx = 0; } },
    'miss-next': () => { S.game.missIdx += 1; },
    fix: () => { const g = S.game; g.placed = STORIES[g.story].parts.filter((_, i) => i % 2 === 1); g.fixed = true; g.missIdx = 0; },
    'next-story': () => { const n = S.game.story + 1; if (n < STORIES.length) newGame(n); else { S.activity = null; S.game = null; S.tab = 'review'; } }
  };
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]');
    if (!b || !actions[b.dataset.action]) return;
    actions[b.dataset.action](b.dataset);
    render();
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'q') { S.query = ev.target.value; render(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (S.sheet || S.pending || S.explain) { S.sheet = null; S.pending = null; S.explain = false; render(); }
    else if (S.activity) { S.activity = null; S.game = null; render(); }
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

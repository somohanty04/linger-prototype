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
  // Plain swaps for formal words, used to explain text the camera reads (no AI in this prototype).
  const PLAIN = {
    arrears: 'late rent or money owed', remit: 'pay', remitted: 'paid', remittance: 'payment', premises: 'building', lessor: 'landlord', lessee: 'renter',
    tenant: 'renter', tenants: 'renters', hereby: '', herein: 'in this letter', thereof: 'of it', pursuant: 'according', prohibited: 'not allowed',
    permitted: 'allowed', prior: 'before', consent: 'permission', retain: 'keep', commence: 'start', commencement: 'start', terminate: 'end',
    termination: 'ending', delinquent: 'late', eviction: 'being made to move out', notwithstanding: 'even so', aforementioned: 'mentioned above',
    undergo: 'go through', ensure: 'make sure', accessible: 'open to enter', failure: 'not doing it', subletting: 'renting your place to someone else',
    sublet: 'rent your place to someone else', obligated: 'required', obligation: 'duty', stipulated: 'stated', forfeit: 'lose', forfeiture: 'losing',
    liable: 'responsible', liability: 'responsibility', deductible: 'amount you pay first', premium: 'regular payment', balance: 'amount owed',
    overdue: 'late', penalty: 'fine', assessed: 'charged', statement: 'bill', applicable: 'that applies', accordance: 'agreement',
    renewal: 'renewal (extension)', expiration: 'end date', vacate: 'move out of', utilities: 'water, power and gas', jurisdiction: 'area of authority'
  };
  const PHRASES = [[/failure to (\w+) (may|will|could) result in/gi, 'if you don’t $1, it could lead to'], [/failure to/gi, 'if you don’t'], [/may result in/gi, 'could lead to'], [/termination of (your )?service/gi, 'your service being cut off'], [/for your records/gi, 'so you have it later'], [/prior written consent/gi, 'written permission first'], [/in full/gi, 'completely'], [/no later than/gi, 'by'], [/in accordance with/gi, 'following'], [/you are hereby notified that/gi, 'this letter tells you that'], [/is hereby/gi, 'is'], [/are hereby/gi, 'are']];
  const SCAN_PLACE = 'Camera scan';
  const ORIGIN_LABEL = { camera: 'Your scan', share: 'Shared from another app', paste: 'Pasted text' };
  const SHARE_URL = 'https://somohanty04.github.io/linger-prototype/';
  const SHARE_SAMPLE = 'Your water bill has a past due balance of $86.40. Payment must be received no later than November 18 to avoid a late fee. Failure to pay may result in termination of service.';
  TEXTS.camera = '';
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
    tab: 'lens', source: 'lease', askFirst: true, autoHard: true,
    pending: null, pendingRaw: '', sheet: null, sheetRaw: '', explain: false,
    saved: ['arrears', 'jitney', 'nebby'], savedDates: { arrears: 'Oct 24', jitney: 'Oct 23', nebby: 'Oct 22' },
    wordFilter: 'all', query: '', localSeg: 'slang',
    activity: null, // 'story' | 'cards'
    cards: { idx: 0, revealed: false },
    game: null,
    speaking: null, // which text is being read aloud
    scan: { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }, // camera: idle | live | reading | done | error; origin: camera | share | paste
    paste: false, shareHelp: false, toast: '', sync: { status: 'off', code: '', msg: '' },
    chat: { msgs: [], busy: false }
  };
  let camStream = null;

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
    else { S.saved.unshift(k); S.savedDates[k] = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    persist();
    if (syncConn) { if (isSaved(k)) syncConn.put(k, wordData(k)); else syncConn.remove(k); }
  }
  // Saved words live in this browser only (localStorage), so they survive a reload.
  const STORE = 'linger.words.v1';
  function persist() {
    const custom = {};
    S.saved.forEach((k) => { const e = D[k]; if (e && (e.scanned || e.imported)) { const { pending, ...rest } = e; custom[k] = rest; } });
    try { localStorage.setItem(STORE, JSON.stringify({ saved: S.saved, savedDates: S.savedDates, custom })); } catch {}
  }
  (function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch {}
    if (!data || !Array.isArray(data.saved)) return;
    Object.entries(data.custom || {}).forEach(([k, e]) => { if (!D[k]) D[k] = e; });
    S.saved = data.saved.filter((k) => D[k]);
    S.savedDates = data.savedDates || {};
  })();
  // ---------- live sync with the laptop Reader (Firebase; see sync.js) ----------
  let syncConn = null;
  const SYNC_KEY = 'linger.sync.code';
  const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // The shape both apps share for one saved word. Firestore rejects undefined, so every field is a string.
  function wordData(k) {
    const e = D[k] || { word: k };
    const plain = e.ctx && e.ctx.startsWith('In plain English: ') ? e.ctx.slice(18) : '';
    return { w: String(e.word || k), m: String(e.meaning || ''), s: String(e.sentence || ''), p: plain, place: String(e.place || PLACES[e.src] || ''), date: String(S.savedDates[k] || today()) };
  }
  function onRemoteWords(map) {
    let n = 0;
    Object.entries(map || {}).forEach(([k, it]) => {
      if (!it || !it.w) return;
      if (!D[k]) D[k] = { word: String(it.w).toLowerCase(), kind: 'hard', meaning: String(it.m || ''), ctx: it.p ? 'In plain English: ' + it.p : 'Saved on your laptop.', sentence: String(it.s || ''), place: String(it.place || 'Laptop · Linger Reader'), imported: true };
      if (!isSaved(k)) { S.saved.unshift(k); S.savedDates[k] = it.date || today(); n++; }
    });
    if (S.sync.first) { // first contact: send the phone's own words up too
      S.sync.first = false;
      const mine = {}; S.saved.forEach((k) => { if (!map[k]) mine[k] = wordData(k); });
      syncConn.putMany(mine);
    }
    if (n) { persist(); showToast(`${n} ${n === 1 ? 'word' : 'words'} arrived from your laptop`); }
    render();
  }
  function showToast(t) { S.toast = t; clearTimeout(showToast.t); showToast.t = setTimeout(() => { S.toast = ''; render(); }, 3500); }
  async function startSync(code) {
    if (!window.LingerSync || !LingerSync.available()) return;
    S.sync = { status: 'connecting', code, msg: '', first: true }; render();
    try {
      syncConn = await LingerSync.connect(code, onRemoteWords, () => { S.sync.status = 'error'; S.sync.msg = 'Sync stopped. Check your connection and try again.'; render(); });
      S.sync.status = 'on'; S.sync.code = syncConn.code;
      try { localStorage.setItem(SYNC_KEY, syncConn.code); } catch {}
    } catch { S.sync.status = 'error'; S.sync.msg = 'Couldn’t start sync. Check your connection and try again.'; }
    render();
  }
  function stopSync() { if (syncConn) syncConn.stop(); syncConn = null; S.sync = { status: 'off', code: '', msg: '' }; try { localStorage.removeItem(SYNC_KEY); } catch {} }
  function syncCard() {
    if (!window.LingerSync || !LingerSync.available()) return '';
    const sy = S.sync, readerUrl = new URL('reader.html', location.href).href;
    if (sy.status === 'on') return `<div class="sync-card on"><div class="sync-h"><span class="dot-live"></span><strong>Live sync with your laptop is on</strong></div>
      <div class="small">On your laptop, open <b>Linger Reader</b> and enter this code. Words you save there appear here right away.</div>
      <div class="sync-code">${esc(LingerSync.pretty(sy.code))}</div>
      <div class="sync-acts"><button type="button" class="link-btn" data-action="sync-copy">Copy Reader link</button><button type="button" class="link-btn" data-action="sync-off">Turn off</button></div>
      <span hidden id="readerUrl">${esc(readerUrl + '?pair=' + sy.code)}</span></div>`;
    if (sy.status === 'connecting') return '<div class="sync-card"><strong>Connecting…</strong></div>';
    return `<div class="sync-card"><div class="sync-h">💻 <strong>Sync with your laptop</strong></div>
      <div class="small">${sy.status === 'error' ? esc(sy.msg) : 'Save words while reading on your laptop and practice them here.'}</div>
      <button type="button" class="btn primary small-btn" data-action="sync-on">${sy.status === 'error' ? 'Try again' : 'Turn on live sync'}</button></div>`;
  }

  // Words sent from the laptop Reader arrive as ?import=<base64 JSON> (from its QR code).
  function importWords(code) {
    let list = [];
    try { list = JSON.parse(decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return 0; }
    let n = 0;
    (Array.isArray(list) ? list : []).slice(0, 20).forEach((it) => {
      const k = keyOf(String(it.w || '')); if (!k) return;
      if (!D[k]) D[k] = { word: String(it.w).toLowerCase(), kind: 'hard', meaning: String(it.m || ''), ctx: it.p ? 'In plain English: ' + String(it.p) : 'Saved on your laptop.', sentence: String(it.s || ''), place: 'Laptop · Linger Reader', imported: true };
      if (!isSaved(k)) { S.saved.unshift(k); S.savedDates[k] = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); n++; }
    });
    persist();
    return n;
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

  // ---------- understanding text from a photo ----------
  const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const DATE_SRC = `\\b(?:(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|the\\s+\\d{1,2}(?:st|nd|rd|th))\\b`;
  const MONEY_RE = /\$\s?\d[\d,]*(?:\.\d{2})?/g;
  const ACTION_RE = /\b(must|required|due|please|prohibited|not permitted|failure|deadline|pay|payment|no later than|shall|need to|by the|overdue|delinquent|owe)\b/i;
  const plainify = (s) => {
    let t = s; PHRASES.forEach(([re, r]) => { t = t.replace(re, r); });
    t = t.replace(/[A-Za-z]+/g, (w) => { const p = PLAIN[w.toLowerCase()]; if (p === undefined) return w; if (!p) return ''; return w[0] === w[0].toUpperCase() ? cap(p) : p; });
    t = t.replace(/\b([Aa]) ([aeiou])/g, (m, a, v) => a + 'n ' + v).replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const sentencesOf = (text) => (text || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(' ').length > 2);
  const isHeading = (s) => s.replace(/[^A-Za-z]/g, '').length > 0 && s === s.toUpperCase();
  const isHard = (k) => (D[k] && D[k].kind !== 'common') || PLAIN[k] !== undefined || k.length >= 11;
  function summarize(text) {
    const sents = sentencesOf(text);
    sents.forEach((x, i) => { sents[i] = x.replace(/^(dear [^,]{1,40}|hi|hello|hey|good (morning|afternoon|evening))( [^,]{1,25})?,\s*/i, ''); });
    // Important = asks you to do something, or has a date or an amount in it.
    let acts = sents.filter((s) => !isHeading(s) && (ACTION_RE.test(s) || new RegExp(DATE_SRC, 'i').test(s) || /\$\s?\d/.test(s)));
    if (!acts.length) acts = sents.slice(0, 3);
    const points = acts.slice(0, 4).map((s) => [/\$/.test(s) ? '💵' : new RegExp(DATE_SRC, 'i').test(s) ? '📅' : /prohibit|not permitted|not allowed/i.test(s) ? '🚫' : '📌', `<b>${esc(plainify(s))}</b>`]);
    const dates = [...new Set([...(text.match(new RegExp(DATE_SRC, 'gi')) || []), ...(text.match(MONEY_RE) || [])].map((d) => d.trim()))].slice(0, 5);
    return { title: 'What this wants from you', points, dates, note: 'Made automatically from the text Linger read, by swapping formal words for plain ones. In the full app, an AI would write this summary.' };
  }
  // Words met in scanned text get an entry on the fly: a plain swap if we have one, otherwise a dictionary lookup.
  function makeEntry(k, text, place) {
    if (D[k]) return D[k];
    const sentence = sentencesOf(text).find((s) => s.toLowerCase().includes(k)) || '';
    const p = PLAIN[k];
    D[k] = { word: k, kind: isHard(k) ? 'hard' : 'common', meaning: p ? cap(p) + '.' : 'Looking up…', ctx: sentence ? 'In plain English: ' + plainify(sentence) : 'A word you looked up.', sentence, place, scanned: true };
    if (!p) D[k].pending = lookup(k);
    return D[k];
  }
  async function lookup(k) {
    try {
      // Wiktionary's free API; definitions come as HTML, so strip tags and pick a short one.
      const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(k));
      const j = r.ok ? await r.json() : null;
      const defs = ((j && j.en) || []).flatMap((x) => x.definitions || []).map((d) => {
        const doc = new DOMParser().parseFromString(d.definition || '', 'text/html');
        doc.querySelectorAll('style, sup').forEach((n) => n.remove());
        return doc.body.textContent.replace(/\s+/g, ' ').trim();
      }).filter((t) => t && !/^(obsolete|archaic|plural of|alternative)/i.test(t));
      const def = defs.find((t) => t.length <= 140) || defs[0];
      D[k].meaning = def ? def.charAt(0).toUpperCase() + def.slice(1) : 'Not in the dictionary yet.';
    } catch { D[k].meaning = 'Couldn’t look this word up right now.'; }
    delete D[k].pending;
    render();
  }

  // ---------- camera and text reading (Tesseract.js runs in the browser) ----------
  let tessLoading = null, workerP = null, onOcr = () => {};
  const loadTesseract = () => tessLoading || (tessLoading = new Promise((res, rej) => {
    if (window.Tesseract) return res();
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = res; s.onerror = () => { tessLoading = null; rej(new Error('load')); }; document.head.appendChild(s);
  }));
  // One reader is kept warm, so later scans don't reload anything.
  const getWorker = () => workerP || (workerP = loadTesseract()
    .then(() => window.Tesseract.createWorker('eng', 1, { logger: (m) => { if (m.status === 'recognizing text') onOcr(Math.round(m.progress * 100)); } }))
    .catch((e) => { workerP = null; throw e; }));
  const warmUp = () => { getWorker().catch(() => {}); };
  // Drop the stray marks OCR picks up from shadows and edges.
  const cleanText = (t) => t.replace(/[|_~^`{}<>[\]\\]/g, ' ').split(/\s+/)
    .filter((w) => /[A-Za-z0-9$]/.test(w) && (w.replace(/[^A-Za-z0-9]/g, '').length > 1 || /^(a|A|I|&|\d)[.,]?$/.test(w)))
    .slice(0, 180).join(' ');
  // Shrink big photos, make them grey and stretch the contrast: Tesseract reads that more reliably.
  const prepare = (src, max = 2000) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height), px = d.data, hist = new Uint32Array(256);
      for (let i = 0; i < px.length; i += 4) { const y = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000 | 0; px[i] = y; hist[y]++; }
      const n = px.length / 4; let lo = 0, hi = 255, acc = 0;
      while (lo < 255 && (acc += hist[lo]) < n * 0.02) lo++;
      acc = 0; while (hi > 0 && (acc += hist[hi]) < n * 0.02) hi--;
      const span = Math.max(1, hi - lo);
      for (let i = 0; i < px.length; i += 4) { const v = Math.max(0, Math.min(255, (px[i] - lo) * 255 / span)); px[i] = px[i + 1] = px[i + 2] = v; }
      g.putImageData(d, 0, 0); res(c.toDataURL('image/png'));
    };
    img.onerror = () => res(src); img.src = src;
  });
  async function readImage(src, onProgress) {
    const w = await getWorker();
    onOcr = onProgress;
    try { const { data } = await w.recognize(await prepare(src)); return { text: cleanText(data.text), conf: Math.round(data.confidence || 0) }; }
    finally { onOcr = () => {}; }
  }
  const fileToDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  async function startCamera() {
    stopSpeaking(); warmUp();
    S.pending = null; S.sheet = null; S.explain = false;
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false });
      S.activity = 'camera';
    } catch {
      S.tab = 'lens'; S.source = 'camera';
      S.scan = { status: 'error', progress: 0, img: null, msg: 'Couldn’t open the camera. Allow camera access in your browser, or upload a photo instead.', conf: 0 };
    }
    render();
  }
  function stopCamera() { if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
  function closeCamera() { stopCamera(); if (S.activity === 'camera') S.activity = null; }
  // Keep only the part of the picture inside the on-screen frame (the video is shown with object-fit: cover).
  function capture() {
    const v = document.getElementById('cam'), f = document.getElementById('camFrame'); if (!v || !v.videoWidth || !f) return;
    const vr = v.getBoundingClientRect(), f0 = f.getBoundingClientRect();
    // Take a little more than the frame, so letters touching its edge aren't cut off.
    const mx = f0.width * 0.06, my = f0.height * 0.04;
    const fr = { left: f0.left - mx, top: f0.top - my, width: f0.width + mx * 2, height: f0.height + my * 2 };
    const k = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight);
    const ox = (v.videoWidth * k - vr.width) / 2, oy = (v.videoHeight * k - vr.height) / 2;
    const sx = Math.max(0, (fr.left - vr.left + ox) / k), sy = Math.max(0, (fr.top - vr.top + oy) / k);
    const sw = Math.min(v.videoWidth - sx, fr.width / k), sh = Math.min(v.videoHeight - sy, fr.height / k);
    const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
    c.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
    scanImage(c.toDataURL('image/jpeg', 0.95));
  }
  async function scanImage(src) {
    closeCamera(); stopSpeaking();
    S.tab = 'lens'; S.source = 'camera';
    S.pending = null; S.sheet = null; S.explain = false;
    S.scan = { status: 'reading', progress: 0, img: src, msg: '', conf: 0, origin: 'camera' }; render();
    try {
      const { text, conf } = await readImage(src, (p) => { S.scan.progress = p; const el = document.getElementById('scanPct'); if (el) el.textContent = p + '%'; });
      if (text.split(' ').length < 3) throw new Error('empty');
      Object.keys(D).forEach((k) => { if (D[k].scanned && !isSaved(k)) delete D[k]; });
      TEXTS.camera = text; SUMMARY.camera = summarize(text);
      S.scan.status = 'done'; S.scan.conf = conf;
      S.explain = true; // show the plain-English summary right away
    } catch (e) {
      S.scan.status = 'error';
      S.scan.msg = e.message === 'empty' ? 'Linger couldn’t find readable text. Try again closer, flatter and in better light.' : 'Couldn’t read the photo. Check your internet connection and try again.';
    }
    render();
  }

  // ---------- WhatsApp helper (simulated chat) ----------
  function openChat() {
    warmUp();
    if (S.chat.msgs.length) return;
    S.chat.msgs.push({ from: 'bot', html: 'Hi! I’m Linger 👋 Send me anything in English that confuses you and I’ll explain it in plain words.' });
    S.chat.msgs.push({ from: 'bot', html: '📷 <b>Send a photo</b> of a letter, sign or bill<br>📋 <b>Paste</b> the text of an email or message<br>🔤 <b>Type one word</b> to get its meaning' });
  }
  const botSay = (m, delay = 750) => new Promise((res) => { S.chat.busy = true; render(); setTimeout(() => { S.chat.msgs.push({ from: 'bot', ...m }); S.chat.busy = false; render(); res(); }, delay); });
  async function chatDocument(kind, img, pasted) {
    if (S.chat.busy) return;
    let text, sum, place;
    if (img) {
      S.chat.msgs.push({ from: 'me', img });
      const m = { from: 'bot', html: 'Reading your photo… <span id="chatPct">0%</span>' };
      S.chat.msgs.push(m); S.chat.busy = true; render();
      let conf = 0;
      try { const r = await readImage(img, (p) => { m.html = `Reading your photo… <span id="chatPct">${p}%</span>`; const el = document.getElementById('chatPct'); if (el) el.textContent = p + '%'; }); text = r.text; conf = r.conf; } catch { text = ''; }
      S.chat.busy = false;
      if (text.split(' ').length < 3) { m.html = 'Sorry, I couldn’t read that photo. Try again closer, flatter and in better light.'; render(); return; }
      m.html = conf && conf < 60 ? 'I read your photo, but some words may be wrong. A flatter, brighter photo helps. Here’s the short version:' : 'Got it, I read your photo. Here’s the short version:';
      sum = summarize(text); place = 'WhatsApp photo';
    } else if (pasted) {
      S.chat.msgs.push({ from: 'me', html: esc(pasted.length > 280 ? pasted.slice(0, 280) + '…' : pasted) });
      text = cleanText(pasted); sum = summarize(text); place = 'Pasted text';
    } else { S.chat.msgs.push({ from: 'me', card: kind }); text = TEXTS[kind]; sum = SUMMARY[kind]; place = PLACES[kind]; }
    render();
    await botSay({ html: `<b>${esc(sum.title)}:</b><ul>${sum.points.map(([ic, t]) => `<li>${ic} ${t}</li>`).join('')}</ul>` }, 1000);
    if (sum.dates.length) await botSay({ html: '<b>Key dates and amounts:</b> ' + sum.dates.map(esc).join(' · ') });
    const said = summaryText(sum);
    await botSay({ voice: said, secs: Math.max(5, Math.round(said.split(' ').length / 2.6)) });
    const keys = [...new Set(text.split(' ').map(keyOf))].filter((k) => k && (D[k] ? D[k].kind !== 'common' : PLAIN[k] !== undefined)).slice(0, 5);
    keys.forEach((k) => { makeEntry(k, text, place); if (!isSaved(k)) toggleSave(k); });
    if (keys.length) await botSay({ html: `I saved ${keys.length} hard ${keys.length === 1 ? 'word' : 'words'} to your Linger Words for practice: <b>${keys.map((k) => esc(D[k].word)).join(', ')}</b>. Reply with any word to get its meaning.` });
  }
  // Several words = a pasted message to explain; one or two = look the word up.
  async function chatInput(t) {
    if (S.chat.busy) return;
    if (t.split(/\s+/).length >= 6) return chatDocument(null, null, t);
    const k = keyOf(t); if (!k) return;
    S.chat.msgs.push({ from: 'me', html: esc(t) }); render();
    const e = makeEntry(k, '', 'WhatsApp');
    if (e.pending) { S.chat.busy = true; render(); await e.pending; }
    await botSay({ html: `<b>${esc(e.word)}</b>: ${esc(e.meaning)}${e.local ? '<br><i>Around here:</i> ' + esc(e.local) : ''}` }, 500);
  }

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
    const cam = S.source === 'camera';
    const toks = tokens().map((raw, i) => {
      if (!raw) return '';
      const k = keyOf(raw), e = D[k];
      let cls = 'tok';
      if (cam ? k && isHard(k) : e && (e.kind !== 'hard' || S.autoHard)) cls += ' hard';
      if (active && k === active) cls += ' on';
      return `<button type="button" class="${cls}" data-action="word" data-i="${i}">${esc(raw)}</button>`;
    }).join('');
    const sc = S.scan, scanned = !!TEXTS.camera;
    let autos = [];
    if (S.autoHard && cam && sc.status === 'done') { autos = [...new Set(tokens().map(keyOf))].filter((k) => k && PLAIN[k]).slice(0, 8); autos.forEach((k) => makeEntry(k, TEXTS.camera, SCAN_PLACE)); }
    else if (S.autoHard && !cam) autos = Object.keys(D).filter((k) => D[k].kind === 'hard' && D[k].src === S.source);
    const what = S.source === 'lease' ? 'letter' : S.source === 'cafe' ? 'sign' : 'text';
    const reading = S.speaking === 'lens';
    let inner, hasText = true;
    if (cam && sc.status === 'reading') { hasText = false; inner = `<div class="lens-label">Reading your photo…</div><img class="cam" src="${sc.img}" alt="Your photo"><div class="scan-pct">Reading text <span id="scanPct">${sc.progress}%</span></div>`; }
    else if (cam && sc.status === 'error') { hasText = false; inner = `<div class="lens-label">Camera</div><div class="cam-empty"><p>${esc(sc.msg)}</p><div class="cam-buttons"><button type="button" class="btn primary" data-action="cam-start">📷 Try the camera again</button><label class="btn white">Upload a photo<input type="file" accept="image/*" id="photo" hidden></label></div></div>`; }
    else {
      const label = cam ? ORIGIN_LABEL[sc.origin] : S.source === 'cafe' ? 'Sample · café notice board' : 'Sample · letter from landlord';
      inner = `<div class="lens-label">${label}</div><div class="paper">${toks}</div>
        ${cam && sc.conf && sc.conf < 60 ? '<p class="cam-warn">Some words may be misread. A flatter, brighter photo helps.</p>' : ''}
        ${cam ? '<button type="button" class="rescan" data-action="cam-start">📷 Scan something else</button>' : ''}`;
    }
    const samples = [['lease', 'Lease letter'], ['cafe', 'Café sign']].concat(scanned || cam ? [['camera', sc.origin === 'camera' ? '📷 Your scan' : '📋 Your text']] : []);
    return `<header class="hero lens-hero">${heroDeco}
      <div class="hero-top">${logo}${pairPill}</div>
      <h1>What do you need to read?</h1>
      <div class="hsub">Scan it or text it. Linger explains it in plain English.</div>
      <div class="big-actions">
        <button type="button" class="big" data-action="cam-start"><span class="big-ic" aria-hidden="true">📷</span><strong>Scan with camera</strong><span>Letters, signs, bills</span></button>
        <button type="button" class="big" data-action="play" data-v="chat"><span class="big-ic" aria-hidden="true">💬</span><strong>Text it to Linger</strong><span>Send a photo on WhatsApp</span></button>
      </div>
      <div class="hero-links"><label class="upload-link">Upload a photo<input type="file" accept="image/*" id="photo" hidden></label><span aria-hidden="true">·</span><button type="button" class="upload-link" data-action="paste-open">Paste text</button></div>
    </header>
    <div class="body">
      <div class="sample-row"><span class="label" style="color: var(--muted)">${cam ? 'Showing' : 'Or try a sample'}</span>
        <div class="chips">${samples.map(([id, l]) => `<button type="button" class="chip ${S.source === id ? 'on' : ''}" data-action="source" data-v="${id}">${l}</button>`).join('')}</div></div>
      <div class="lens">
        <span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>
        ${inner}
      </div>
      ${hasText ? `<div class="lens-actions">
        <button type="button" class="btn primary" data-action="explain">✦ Explain this ${what}</button>
        <button type="button" class="btn ${reading ? 'deep' : 'ghost'}" data-action="read" ${canSpeak ? '' : 'disabled'}>${speaker}${reading ? 'Stop' : 'Read aloud'}</button>
      </div>
      <p class="small" style="margin: -2px 4px 0">Tap a word you would pause on. On the glasses, your eyes do this part. <span class="dotted-key">Dotted</span> words are ${cam ? 'ones Linger thinks are hard' : 'ones newcomers often pause on'}.</p>` : ''}
      <button type="button" class="act share-card" data-action="share-help"><span class="ic">↗️</span><span><strong>Use Linger in any app</strong><span class="small">Select text anywhere, tap Share, then “Explain with Linger”</span></span><span class="go">›</span></button>
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

  function viewCamera() {
    return `<div class="full-view camera-view">
      <video id="cam" playsinline muted autoplay></video>
      <div class="cam-frame" id="camFrame"><i class="k k1"></i><i class="k k2"></i><i class="k k3"></i><i class="k k4"></i></div>
      <div class="cam-top"><button type="button" class="x" data-action="cam-close" aria-label="Close camera">${xIcon}</button><span>Scan a letter, sign or bill</span><span class="spacer"></span></div>
      <p class="cam-hint">Fit the text inside the frame. Hold steady, in good light.</p>
      <div class="cam-bottom">
        <label class="cam-side"><span class="cs-ic" aria-hidden="true">🖼️</span><span>Upload</span><input type="file" accept="image/*" id="photo" hidden></label>
        <button type="button" class="shutter" data-action="capture" aria-label="Take photo"></button>
        <button type="button" class="cam-side" data-action="cam-text"><span class="cs-ic" aria-hidden="true">💬</span><span>Text it</span></button>
      </div>
    </div>`;
  }

  function viewChat() {
    const msgs = S.chat.msgs.map((m, i) => {
      const who = m.from === 'me' ? 'me' : 'bot';
      if (m.img) return `<div class="bubble ${who} pic"><img src="${m.img}" alt="Photo you sent"></div>`;
      if (m.card) return `<div class="bubble ${who} doc"><span class="doc-ic">📄</span><span><b>${m.card === 'lease' ? 'Lease letter.jpg' : 'Cafe sign.jpg'}</b><span class="doc-prev">${esc(TEXTS[m.card].split(' ').slice(0, 9).join(' '))}…</span></span></div>`;
      if (m.voice) { const on = S.speaking === 'voice' + i; return `<div class="bubble ${who} voice"><button type="button" class="play" data-action="voice" data-i="${i}" aria-label="${on ? 'Stop voice note' : 'Play voice note'}">${on ? '■' : '▶'}</button><span class="wave" aria-hidden="true">${'<i></i>'.repeat(22)}</span><span class="dur">0:${String(m.secs).padStart(2, '0')}</span></div>`; }
      return `<div class="bubble ${who}">${m.html}</div>`;
    }).join('');
    return `<div class="full-view chat-view">
      <div class="chat-top"><button type="button" class="x" data-action="quit" aria-label="Close chat">${xIcon}</button>
        <span class="avatar">${logo}</span><div><strong>Linger</strong><span>WhatsApp helper · simulated</span></div></div>
      <div class="chat-msgs" id="chatMsgs">${msgs}${S.chat.busy ? '<div class="bubble bot typing" aria-label="Linger is typing"><i></i><i></i><i></i></div>' : ''}</div>
      ${S.chat.msgs.length <= 2 && !S.chat.busy ? `<div class="quick"><label class="qphoto">📷 Send a photo<input type="file" accept="image/*" id="chatPhoto2" hidden></label><button type="button" data-action="chat-sample" data-v="lease">Try: lease letter</button><button type="button" data-action="chat-sample" data-v="cafe">Try: café sign</button></div>` : ''}
      <form class="composer" id="chatForm"><label class="cbtn" aria-label="Send a photo">📷<input type="file" accept="image/*" id="chatPhoto" hidden></label>
        <input id="chatInput" placeholder="Type a word or paste a message" autocomplete="off" aria-label="Message"><button type="submit" class="cbtn send" aria-label="Send">➤</button></form>
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
      ${syncCard()}
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
    if (S.activity === 'chat') return viewChat();
    if (S.activity === 'camera') return viewCamera();
    let html = '';
    if (S.pending && S.tab === 'lens') {
      const secs = (1.1 + (S.pendingRaw.length % 7) * 0.15).toFixed(1);
      html += `<div class="prompt" role="dialog" aria-label="Linger noticed a pause">
        <div style="display: flex; align-items: center; gap: 10px">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9FEAFF" stroke-width="2" aria-hidden="true" style="flex: none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          <div style="font-size: 14px">You lingered on <strong>“${esc(S.pendingRaw)}”</strong> for ${secs}s. Want the meaning?</div></div>
        <div class="prompt-actions"><button type="button" class="p-no" data-action="dismiss">Not now</button><button type="button" class="p-yes" data-action="accept">Show me</button></div></div>`;
    }
    if (S.paste) {
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
        <div class="panel" role="dialog" aria-label="Paste text"><div class="grab"></div>
          <div class="sum-title">Paste text to explain</div>
          <div class="small">Copy a confusing email, text message or web page, paste it here, and Linger explains it.</div>
          <textarea id="pasteBox" class="paste-box" rows="7" placeholder="Paste text here…"></textarea>
          <div class="grid2"><button type="button" class="btn" data-action="close">Cancel</button><button type="button" class="btn primary" data-action="paste-go">✦ Explain</button></div></div></div>`;
    }
    if (S.shareHelp) {
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
        <div class="panel" role="dialog" aria-label="Use Linger in any app"><div class="grab"></div>
          <div class="sum-title">Use Linger in any app</div>
          <div class="small">Select text in a text message, email, web page or PDF, tap <b>Share</b>, and pick Linger. It opens with the explanation ready.</div>
          <div class="howto"><div class="howto-h">🤖 Android</div>
            <ol><li>Install Linger: ${installEvt ? '<button type="button" class="link-btn" data-action="install">tap here to install</button>' : 'in Chrome, tap <b>⋮</b> then <b>Install app</b> (or <b>Add to Home screen</b>)'}.</li>
            <li>In any app, select text and tap <b>Share</b>.</li><li>Choose <b>Linger</b>.</li></ol></div>
          <div class="howto"><div class="howto-h">🍎 iPhone</div>
            <div class="small" style="margin-bottom: 6px">iPhones don’t let websites join the Share menu, so a free Shortcut does it:</div>
            <ol><li>Open the <b>Shortcuts</b> app and tap <b>+</b>. Name it <b>Explain with Linger</b>.</li>
            <li>Tap the <b>ⓘ</b> button and turn on <b>Show in Share Sheet</b>, receiving <b>Text</b>.</li>
            <li>Add the action <b>URL Encode</b> (it uses Shortcut Input).</li>
            <li>Add <b>Open URLs</b> with this address, then put <b>URL Encoded Text</b> at the end:<code class="url">${esc(SHARE_URL)}?text=</code></li>
            <li>Now select text anywhere, tap <b>Share</b>, then <b>Explain with Linger</b>.</li></ol></div>
          <div class="grid2"><button type="button" class="btn" data-action="close">Close</button><button type="button" class="btn primary" data-action="share-try">Try a sample</button></div></div></div>`;
    }
    if (S.explain) {
      const s = SUMMARY[S.source];
      const n = S.source === 'camera' ? new Set(tokens().map(keyOf).filter((k) => k && isHard(k))).size : Object.keys(D).filter((k) => D[k].src === S.source).length;
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
    if (S.toast) html += `<div class="toast" role="status">💻 → 📱 ${esc(S.toast)}</div>`;
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
  let chatDraft = { value: '', focus: false };
  function render() {
    const views = { lens: viewLens, words: viewWords, local: viewLocal, review: viewReview };
    const top = scroll.scrollTop;
    const focusQ = document.activeElement && document.activeElement.id === 'q';
    const ciOld = document.getElementById('chatInput'); chatDraft = { value: ciOld ? ciOld.value : '', focus: document.activeElement === ciOld };
    const caret = focusQ ? document.activeElement.selectionStart : 0;
    scroll.innerHTML = views[S.tab]();
    scroll.scrollTop = lastTab === S.tab ? top : 0;
    lastTab = S.tab;
    over.innerHTML = overlay();
    screenEl.classList.toggle('full', !!S.activity);
    const camEl = document.getElementById('cam');
    if (camEl && camStream && camEl.srcObject !== camStream) { camEl.srcObject = camStream; camEl.play().catch(() => {}); }
    const cm = document.getElementById('chatMsgs'); if (cm) cm.scrollTop = cm.scrollHeight;
    const ci = document.getElementById('chatInput'); if (ci) { if (chatDraft.value) ci.value = chatDraft.value; if (chatDraft.focus) ci.focus({ preventScroll: true }); }
    document.querySelectorAll('.tabbar button').forEach((b) => {
      if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (focusQ) { const q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(caret, caret); } }
  }

  // ---------- actions ----------
  const actions = {
    tab: (d) => { stopSpeaking(); closeCamera(); S.tab = d.tab; S.pending = null; S.sheet = null; S.explain = false; },
    source: (d) => { stopSpeaking(); S.source = d.v; S.pending = null; S.sheet = null; S.explain = false; },
    word: (d) => {
      const raw = tokens()[Number(d.i)];
      const k = keyOf(raw);
      if (k && S.source === 'camera') makeEntry(k, TEXTS.camera, SCAN_PLACE);
      if (!k) return;
      const clean = raw.replace(/[.,!?;:]+$/, '');
      if (S.askFirst) { S.pending = k; S.pendingRaw = clean; S.sheet = null; }
      else { S.sheet = k; S.sheetRaw = clean; S.pending = null; }
    },
    open: (d) => { S.sheet = d.k; S.sheetRaw = d.k; S.pending = null; },
    accept: () => { S.sheet = S.pending; S.sheetRaw = S.pendingRaw; S.pending = null; },
    dismiss: () => { S.pending = null; },
    close: () => { S.paste = false; S.shareHelp = false; if (S.speaking === 'summary' || S.speaking === 'word') stopSpeaking(); S.sheet = null; S.explain = false; },
    explain: () => { stopSpeaking(); S.explain = true; S.pending = null; S.sheet = null; },
    read: () => { readLens(); },
    'speak-summary': () => { speak('summary', summaryText(SUMMARY[S.source])); },
    'speak-word': () => { const e = D[S.sheet]; speak('word', e ? `${e.word}. ${e.meaning} ${e.sentence}` : S.sheetRaw); },
    ask: () => { S.askFirst = !S.askFirst; },
    auto: () => { S.autoHard = !S.autoHard; },
    save: (d) => { toggleSave(d.k); },
    filter: (d) => { S.wordFilter = d.v; },
    seg: (d) => { S.localSeg = d.v; },
    play: (d) => { stopSpeaking(); S.sheet = null; S.explain = false; S.activity = d.v; if (d.v === 'story') newGame(0); else if (d.v === 'chat') openChat(); else S.cards = { idx: 0, revealed: false }; },
    'cam-start': () => { startCamera(); },
    'cam-close': () => { closeCamera(); },
    'paste-open': () => { stopSpeaking(); S.paste = true; S.pending = null; S.sheet = null; S.explain = false; },
    'paste-go': () => { const t = (document.getElementById('pasteBox') || {}).value || ''; S.paste = false; if (t.trim()) handleText(t, 'paste'); },
    'share-help': () => { S.shareHelp = true; },
    'sync-on': () => { startSync(S.sync.code || LingerSync.newCode()); },
    'sync-off': () => { stopSync(); },
    'sync-copy': async () => { const u = (document.getElementById('readerUrl') || {}).textContent || ''; try { await navigator.clipboard.writeText(u); showToast('Reader link copied'); } catch { window.prompt('Open this on your laptop:', u); } },
    'share-try': () => { S.shareHelp = false; handleText(SHARE_SAMPLE, 'share'); },
    install: async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; },
    'cam-text': () => { closeCamera(); S.activity = 'chat'; openChat(); },
    capture: () => { capture(); },
    voice: (d) => { const m = S.chat.msgs[Number(d.i)]; if (m) speak('voice' + d.i, m.voice); },
    'chat-sample': (d) => { chatDocument(d.v); },
    quit: () => { if (S.activity === 'chat') stopSpeaking(); S.activity = null; S.game = null; },
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
  document.addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f || !['photo', 'chatPhoto', 'chatPhoto2'].includes(ev.target.id)) return;
    ev.target.value = '';
    const src = await fileToDataURL(f);
    if (ev.target.id === 'photo') scanImage(src); else chatDocument(null, src);
  });
  document.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'chatForm') return;
    ev.preventDefault();
    const inp = document.getElementById('chatInput'); const w = inp.value.trim();
    inp.value = ''; chatDraft = { value: '', focus: true };
    if (w) chatInput(w);
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'q') { S.query = ev.target.value; render(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (S.sheet || S.pending || S.explain || S.paste || S.shareHelp) { S.sheet = null; S.pending = null; S.explain = false; S.paste = false; S.shareHelp = false; render(); }
    else if (S.activity) { closeCamera(); S.activity = null; S.game = null; render(); }
  });

  // Test hook: feed an image to the scanner or chat without a camera.
  window.lingerTest = { scan: (src) => scanImage(src), chatPhoto: (src) => chatDocument(null, src), chatText: (t) => chatInput(t) };

  // ---------- shared or pasted text ----------
  // Text arrives from the phone's Share menu as ?text=… (Android share target, or the iPhone Shortcut).
  function handleText(raw, origin) {
    stopSpeaking(); closeCamera();
    const t = raw.replace(/\s+/g, ' ').trim();
    if (!t) return;
    S.tab = 'lens'; S.activity = null; S.pending = null; S.sheet = null; S.explain = false;
    const words = t.split(' ');
    if (words.length <= 3) { // a word or short phrase: show its meaning
      const k = keyOf(words.find((w) => keyOf(w).length > 2) || words[0]);
      if (!k) return;
      makeEntry(k, t, origin === 'share' ? 'Shared text' : 'Pasted text');
      S.sheet = k; S.sheetRaw = k;
      return;
    }
    Object.keys(D).forEach((k) => { if (D[k].scanned && !isSaved(k)) delete D[k]; });
    TEXTS.camera = cleanText(t); SUMMARY.camera = summarize(TEXTS.camera);
    S.source = 'camera'; S.scan = { status: 'done', progress: 100, img: null, msg: '', conf: 0, origin };
    S.explain = true;
  }
  const params = new URLSearchParams(location.search);
  const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join(' ');
  if (shared) { handleText(shared, 'share'); history.replaceState(null, '', location.pathname); }
  { const saved = (() => { try { return localStorage.getItem(SYNC_KEY); } catch { return null; } })(); if (saved) startSync(saved); }
  if (params.get('import')) {
    const n = importWords(params.get('import'));
    S.tab = 'words';
    S.toast = n ? `${n} ${n === 1 ? 'word' : 'words'} added from your laptop` : 'These words are already in your list';
    history.replaceState(null, '', location.pathname);
    setTimeout(() => { S.toast = ''; render(); }, 3500);
  }

  // Installing the app is what puts Linger in Android's Share menu.
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

  // Shrink the phone frame to fit shorter desktop windows.
  function fit() {
    const f = Math.min(1, Math.max(0.55, (window.innerHeight - 48) / 868));
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  window.addEventListener('resize', fit);
  fit();

  render();
})();

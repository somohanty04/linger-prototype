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
  const PHRASES = [[/remit (the )?payment/gi, 'pay'], [/failure to (\w+) (may|will|could) result in/gi, 'if you don’t $1, it could lead to'], [/failure to/gi, 'if you don’t'], [/may result in/gi, 'could lead to'], [/termination of (your )?service/gi, 'your service being cut off'], [/for your records/gi, 'so you have it later'], [/prior written consent/gi, 'written permission first'], [/in full/gi, 'completely'], [/no later than/gi, 'by'], [/in accordance with/gi, 'following'], [/you are hereby notified that/gi, 'this letter tells you that'], [/is hereby/gi, 'is'], [/are hereby/gi, 'are']];
  const SCAN_PLACE = 'Camera scan';
  const ORIGIN_LABEL = { camera: 'Your scan', upload: 'Your photo', share: 'Shared from another app', paste: 'Pasted text' };
  const SHARE_URL = 'https://somohanty04.github.io/linger-prototype/' + (window.LINGER_BETA ? 'beta/' : '');
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
  // Local → Mix-ups: everyday English that works differently in the US. Same for every city.
  const MIXUPS = [
    { tag: 'Letters', title: 'Dates', no: '03/04 means 3 April', yes: '03/04 means March 4', why: 'In the US the month comes first. Check due dates on bills and letters twice.' },
    { tag: 'Weather', title: 'Temperature', no: '“It’s 30 degrees, so it’s warm.”', yes: '30°F is below freezing', why: 'The US uses Fahrenheit. 32°F is 0°C, 70°F is a nice day, 100°F is very hot.' },
    { tag: 'Buildings', title: 'First floor', no: 'The first floor is one level up', yes: 'The first floor is the ground floor', why: 'In the US you enter a building on the first floor. There’s usually no “ground floor.”' },
    { tag: 'Eating out', title: 'Paying', no: '“Can I have the bill?”', yes: '“Can I get the check?”', why: 'People will understand “bill,” but “check” is what you’ll hear. Tip 18–20% at sit-down places.' },
    { tag: 'Small talk', title: '“How’s it going?”', no: 'Telling them how your week really went', yes: '“Good, you?”', why: 'It’s a greeting, like “hi.” A short answer is normal and polite.' },
    { tag: 'School', title: 'Eraser', no: '“Can I borrow a rubber?”', yes: '“Can I borrow an eraser?”', why: 'In the US, “rubber” can mean a condom. Say “eraser.”' },
    { tag: 'Clothes', title: 'Pants', no: 'Pants means underwear', yes: 'Pants means trousers', why: 'Say “underwear” for what’s underneath.' },
    { tag: 'Sports', title: 'Football', no: '“Football” means soccer', yes: '“Football” is American football', why: 'Say “soccer” for the game with the round ball. In Pittsburgh, football means the Steelers.' }
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
    tab: 'lens', source: 'camera', askFirst: true, autoHard: true,
    pending: null, pendingRaw: '', sheet: null, sheetRaw: '', explain: false,
    lensMode: 'scan', pasteDraft: '', // Lens switch: scan | upload | paste, and the text being pasted
    saved: [], savedDates: {}, // nothing saved until they save something (or sign in to an account that has words)
    wordFilter: 'all', query: '', localSeg: 'slang', city: (() => { try { return localStorage.getItem('linger.city') || 'pgh'; } catch { return 'pgh'; } })(), cityPick: false,
    activity: null, // 'story' | 'cards'
    cards: { idx: 0, revealed: false },
    game: null,
    speaking: null, // which text is being read aloud
    scan: { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }, // idle | live (camera on) | reading | done | error; origin: camera | share | paste
    paste: false, shareHelp: false, toast: '', sync: { status: 'off', code: '', msg: '' }
  };
  // ---------- reading setup (the onboarding answers) ----------
  // Asked once, the first time someone opens the app (and saved to their account, so other devices skip it).
  // What they read picks the Lens mode that opens first; their level sets which words count as hard.
  const PREFS_KEY = 'linger.prefs.v1';
  S.prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); } catch { return null; } })() || { reads: [], level: '', done: false, at: 0 };
  // [id, icon, label, Lens mode, Lens subtitle]. "Everything" can't be combined with the others; "Something else" asks
  // them to type what it is.
  const READS = [
    ['emails', '✉️', 'Emails & messages', 'paste', 'Paste an email or message'],
    ['news', '📰', 'Articles & news', 'paste', 'Paste an article or news story'],
    ['forms', '📄', 'Forms & documents', 'upload', 'Upload a form, letter or bill'],
    ['social', '💬', 'Social media', 'paste', 'Paste a post or comment'],
    ['all', '✨', 'Everything', 'scan', 'Point at a letter, sign or bill'],
    ['other', '✏️', 'Something else', 'scan', 'Point at a letter, sign or bill']
  ];
  // [id, icon, label, description, words this long or longer count as hard (plus Linger's own list of formal words)]
  const LEVELS = [
    ['beginner', 'A', 'Beginner', 'A1–A2 · I know everyday words', 8],
    ['intermediate', 'B', 'Intermediate', 'B1–B2 · Formal words slow me down', 11],
    ['advanced', 'C', 'Rare or very hard words', 'C1–C2 · Only these slow me down', 13],
    ['unsure', '?', 'Not sure', 'Take a quick check, or start in the middle', 11]
  ];
  const hardLen = () => (LEVELS.find((l) => l[0] === S.prefs.level) || LEVELS[1])[4];
  const firstRead = () => READS.find((r) => r[0] === S.prefs.reads[0]) || null;
  if (firstRead()) S.lensMode = firstRead()[3];
  S.onb = null; S.acct = false; S.acctFromOnb = false; S.photo = '';
  let camStream = null;
  // Which camera: 'environment' (back) or 'user' (front). Remembered between visits.
  let facing = (() => { try { return localStorage.getItem('linger.facing') || 'environment'; } catch { return 'environment'; } })();
  let camCount = 0; // how many cameras the phone has (known after the first camera permission)

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const keyOf = (tok) => { const k = tok.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, '').replace(/^'+|'+$/g, ''); return ALIAS[k] || k; };
  const placeOf = (e) => e.place || PLACES[e.src] || 'the lens';
  const badge = (kind) => { const b = BADGES[kind] || BADGES.common; return `<span class="badge ${b[1]}">${b[0]}</span>`; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Line icons for list cards (instead of emojis), in the design system's blue.
  const ICO = {
    flame: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c4 0 7-2.7 7-6.8 0-3.2-2-5.6-4-7.7.2 2.2-.8 3.6-2 4C13 8 11.6 4.6 9 2c.3 3.5-4 6.5-4 12.2C5 18.6 8 22 12 22z"/></svg>',
    check: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    chart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
    user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    laptop: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
    book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/></svg>',
    palette: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/></svg>',
    access: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M9 21l3-6.5 3 6.5"/></svg>',
    camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    mic: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
    ban: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    cloud: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z"/></svg>',
    doc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    trash: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>',
    flask: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/></svg>',
    globe: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    share: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    update: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16V8M8 12l4-4 4 4"/></svg>',
    chat: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>',
    phone: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    lock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
    pin: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    spark: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 17v4M17 19h4"/></svg>',
    info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
  };
  const pin = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const speaker = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const xIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const BETA = window.LINGER_BETA && window.LingerBeta ? window.LingerBeta : null; // beta/index.html only
  const logo = '<img class="logo" src="icons/figma/logo.svg" width="33" height="33.48" alt="Linger">' + (BETA ? '<span class="beta-tag" aria-label="Beta version">Beta</span>' : '');
  const isSaved = (k) => S.saved.includes(k);
  const calIcon = '<svg class="date-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  // ---------- microinteractions ----------
  // FX: one-shot effects for the next render only (a word just placed, a card just flipped). The screen is redrawn on
  // every tap, so an effect that lived in the state would replay each time; FX is cleared after each render.
  const FX = {};
  S.seenToks = new Set(); // hard words already looked at in this text: their dotted underline turns solid
  const fx = (k, v = true) => { FX[k] = v; };
  // ---------- appearance and accessibility (Settings) ----------
  const A11Y_KEY = 'linger.a11y';
  const A11Y_DEF = { theme: 'system', text: 1, zoom: 1, contrast: false, filter: 'none', motion: false };
  const A11Y = (() => { try { return { ...A11Y_DEF, ...JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') }; } catch { return { ...A11Y_DEF }; } })();
  const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function applyA11y() {
    const r = document.documentElement, dark = A11Y.theme === 'dark' || (A11Y.theme === 'system' && darkMQ && darkMQ.matches);
    r.dataset.theme = dark ? 'dark' : 'light';
    r.style.setProperty('--ts', String(A11Y.text));
    r.style.zoom = A11Y.zoom === 1 ? '' : String(A11Y.zoom);
    if (A11Y.contrast) r.dataset.contrast = 'high'; else delete r.dataset.contrast;
    if (A11Y.motion) r.dataset.motion = 'reduce'; else delete r.dataset.motion;
    if (A11Y.filter !== 'none') r.dataset.filter = A11Y.filter; else delete r.dataset.filter;
    const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = dark ? '#0B0D14' : '#1F2DA8';
    if (!document.getElementById('lingerFilters')) {
      const m = (v) => `<feColorMatrix type="matrix" values="${v}"/>`;
      document.body.insertAdjacentHTML('beforeend', `<svg id="lingerFilters" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
        <filter id="lf-protan" color-interpolation-filters="linearRGB">${m('1 0 0 0 0  0.479 0.477 0.044 0 0  0.597 -0.689 1.091 0 0  0 0 0 1 0')}</filter>
        <filter id="lf-deutan" color-interpolation-filters="linearRGB">${m('1.437 -0.631 0.195 0 0  0 1 0 0 0  -0.184 0.186 0.998 0 0  0 0 0 1 0')}</filter>
        <filter id="lf-tritan" color-interpolation-filters="linearRGB">${m('0.741 -0.407 0.666 0 0  0.075 0.585 0.340 0 0  0 0 1 0 0  0 0 0 1 0')}</filter></defs></svg>`);
    }
  }
  function setA11y(k, v) { A11Y[k] = v; try { localStorage.setItem(A11Y_KEY, JSON.stringify(A11Y)); } catch {} applyA11y(); }
  applyA11y();
  if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', () => { if (A11Y.theme === 'system') applyA11y(); });
  const calm = () => A11Y.motion || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // A light tap you can feel: the iPhone app plays a real haptic; Android vibrates; Safari has neither.
  const buzz = (ms = 10) => {
    if (calm()) return;
    if (BETA && BETA.native) { BETA.post({ haptic: Array.isArray(ms) ? 'success' : ms >= 15 ? 'medium' : 'light' }); return; }
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
  };
  // A small copy of something flies from one element to another along an arc (above everything, then removed).
  function fly(fromEl, toEl, html, cls = '') {
    if (calm() || !fromEl || !toEl || !document.body.animate) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (!a.width || !b.width) return Promise.resolve();
    const el = document.createElement('div');
    el.className = 'fly ' + cls; el.setAttribute('aria-hidden', 'true'); el.innerHTML = html;
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    const x0 = a.left + a.width / 2 - w / 2, y0 = a.top + a.height / 2 - h / 2;
    const x1 = b.left + b.width / 2 - w / 2, y1 = b.top + b.height / 2 - h / 2;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 60;
    const anim = el.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${mx}px, ${my}px) scale(0.9)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.35)`, opacity: 0.2 }
    ], { duration: 620, easing: 'cubic-bezier(.45,.05,.35,1)' });
    return Promise.race([anim.finished.catch(() => {}), new Promise((r) => setTimeout(r, 900))]).then(() => el.remove());
  }
  // A wrong answer or a form problem: a short side-to-side shake.
  function shake(el) { if (!el || calm()) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true }); }
  // Numbers that count up from 0 the first time a page shows them.
  function runCounts() {
    const els = [...document.querySelectorAll('.count:not(.counted)')];
    els.forEach((el) => {
      el.classList.add('counted');
      const n = Number(el.dataset.n) || 0;
      if (calm() || !n) { el.textContent = n; return; }
      const t0 = performance.now(), dur = Math.min(900, 350 + n * 40);
      const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(n * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }
  // Tap feedback: a soft ripple spreads from where the finger lands on buttons, cards and menu rows. It's drawn in its
  // own layer over the element (clipped to its shape), so it keeps playing when the tap redraws the screen.
  document.addEventListener('pointerdown', (ev) => {
    if (calm() || ev.button > 0) return;
    const el = ev.target.closest('.btn, .menu-row, .rv-act, .act, .item, .city-row, .loc-item, .lh-seg, .setup-strip');
    if (!el || el.disabled) return;
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const box = document.createElement('span'); box.className = 'ripple-box'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = `left:${r.left / z}px;top:${r.top / z}px;width:${r.width / z}px;height:${r.height / z}px;border-radius:${cs.borderRadius}`;
    const size = Math.max(r.width, r.height) * 2.4 / z, dot = document.createElement('span'); dot.className = 'ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${(ev.clientX - r.left) / z - size / 2}px;top:${(ev.clientY - r.top) / z - size / 2}px`;
    if (el.matches('.btn.primary, .lh-seg.on')) dot.classList.add('light');
    box.appendChild(dot); document.body.appendChild(box);
    dot.addEventListener('animationend', () => box.remove(), { once: true });
  }, { passive: true });
  function bump(el) { if (!el || calm()) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); el.addEventListener('animationend', () => el.classList.remove('bump'), { once: true }); }
  function toggleSave(k) {
    const i = S.saved.indexOf(k);
    if (i >= 0) { S.saved.splice(i, 1); track(k, 'unsave'); S.lastRemoved = { k, date: S.savedDates[k] }; showToast(`Removed “${D[k] ? D[k].word : k}”`, { label: 'Undo', action: 'undo-unsave' }); }
    else { S.saved.unshift(k); S.savedDates[k] = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); track(k, 'save'); }
    persist();
    if (syncConn) { if (isSaved(k)) syncConn.put(k, wordData(k)); else syncConn.remove(k); }
  }
  // Saved words live in this browser only (localStorage), so they survive a reload.
  const STORE = 'linger.words.v1';
  function persist() {
    const custom = {};
    S.saved.forEach((k) => { const e = D[k]; if (e && (e.scanned || e.imported || e.city)) { const { pending, ...rest } = e; custom[k] = rest; } });
    try { localStorage.setItem(STORE, JSON.stringify({ saved: S.saved, savedDates: S.savedDates, custom })); }
    catch { if (!persist.warned) { persist.warned = true; setTimeout(() => { showToast(signedInAs() ? 'This phone is out of space, but your words are safe in your account.' : 'Linger can’t save on this phone (private browsing or out of space). Sign in to keep your words.'); render(); }, 0); } }
    if (window.LingerAccount) LingerAccount.localChanged(); // signed in: account.js syncs the change
  }
  // Older versions started everyone with three example words, and some of those copies were sent to a pairing code
  // or an account. They're recognized by their exact example dates, so a word someone really saved is never touched.
  const SEED = { arrears: 'Oct 24', jitney: 'Oct 23', nebby: 'Oct 22' };
  const isSeed = (k, date) => SEED[k] !== undefined && SEED[k] === date;
  (function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch {}
    if (!data || !Array.isArray(data.saved)) return;
    Object.entries(data.custom || {}).forEach(([k, e]) => { if (!D[k]) D[k] = e; });
    S.saved = data.saved.filter((k) => D[k]);
    S.savedDates = data.savedDates || {};
    const seeded = Object.keys(SEED).filter((k) => isSeed(k, S.savedDates[k]) && S.saved.includes(k));
    if (seeded.length) {
      S.saved = S.saved.filter((k) => !seeded.includes(k)); seeded.forEach((k) => delete S.savedDates[k]);
      try { localStorage.setItem(STORE, JSON.stringify({ ...data, saved: S.saved, savedDates: S.savedDates })); } catch {}
    }
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
      if (isSeed(k, it.date)) { if (syncConn) syncConn.remove(k); return; } // an old example word: take it off the shared list
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
  function showToast(t, act) { S.toast = t; S.toastAct = act || null; clearTimeout(showToast.t); showToast.t = setTimeout(() => { S.toast = ''; S.toastAct = null; render(); }, act ? 6000 : 3500); }
  const toastHtml = () => (S.toast ? `<div class="toast${S.toastAct ? ' with-act' : ''}" role="status">${esc(S.toast)}${S.toastAct ? `<button type="button" data-action="${S.toastAct.action}">${esc(S.toastAct.label)}</button>` : ''}</div>` : '');
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
    const sy = S.sync, readerUrl = new URL('reader.html', document.baseURI).href;
    if (sy.status === 'on') return `<div class="sync-card on"><div class="sync-h"><span class="dot-live"></span><strong>Connected with a code</strong></div>
      <div class="small">Type this code in the Linger Chrome extension menu, under <b>Or connect with a code</b> (or in Linger Reader). Words you save there appear here right away.</div>
      <div class="sync-code">${esc(LingerSync.pretty(sy.code))}</div>
      <div class="sync-acts"><button type="button" class="link-btn" data-action="sync-copy">Copy Reader link</button><button type="button" class="link-btn" data-action="sync-off">Turn off</button></div>
      <span hidden id="readerUrl">${esc(readerUrl + '?pair=' + sy.code)}</span></div>`;
    if (sy.status === 'connecting') return '<div class="sync-card"><strong>Connecting…</strong></div>';
    return `<div class="sync-card"><div class="sync-h"><strong>Connect with a code</strong></div>
      <div class="small">${sy.status === 'error' ? esc(sy.msg) : 'Get a code here, then type it in the Linger Chrome extension menu (or Linger Reader). Words saved there show up here.'}</div>
      <button type="button" class="btn primary small-btn" data-action="sync-on">${sy.status === 'error' ? 'Try again' : 'Get a code'}</button></div>`;
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
    document.querySelectorAll('.read-mark').forEach((m) => m.remove());
  }
  function speak(id, text, onWord, lang = 'en-US', rate = 0.9) {
    if (!canSpeak) return;
    const again = S.speaking === id;
    stopSpeaking();
    if (again) { render(); return; } // second tap stops
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
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
      if (el) { el.classList.add('speaking'); markTok(el); }
    });
  }
  // Reading along: one soft highlight glides from word to word (instead of jumping), and the text scrolls with it.
  function markTok(el) {
    const box = el.parentElement; if (!box) return;
    let m = box.querySelector(':scope > .read-mark');
    const place = () => { m.style.transform = `translate(${el.offsetLeft - 2}px, ${el.offsetTop}px)`; m.style.width = el.offsetWidth + 4 + 'px'; m.style.height = el.offsetHeight + 'px'; };
    if (!m) { m = document.createElement('span'); m.className = 'read-mark'; m.setAttribute('aria-hidden', 'true'); box.prepend(m); place(); void m.offsetWidth; m.classList.add('on'); }
    else place();
    try { el.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' }); } catch {}
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
  const isHard = (k) => (D[k] && D[k].kind !== 'common') || PLAIN[k] !== undefined || k.length >= hardLen(); // hardLen: from the English level
  // The learning model (learn.js): how likely they are to know a word, from lookups, saves and reviews.
  const L = window.LingerLearn || null;
  const know = (k) => (L ? L.estimate(k, { kind: D[k] && D[k].kind, hard: isHard(k), len: k.length, level: S.prefs.level }) : { p: 0, label: 'Learning', due: false, seen: false });
  const learned = (k) => { const e = know(k); return e.seen && e.p >= 0.8; }; // known from their own history: stop underlining it
  const track = (k, type, ok) => { if (L && k) L.record(k, type, ok); };
  // Flashcards: the words they most need first (due for review, then least known).
  // Missed at least twice and not known yet: worth a focused round.
  const trickyWords = () => S.saved.filter((k) => D[k]).map((k) => ({ k, e: know(k) })).filter((x) => (x.e.wrong || 0) >= 2 && x.e.p < 0.7).sort((a, b) => (b.e.wrong - a.e.wrong) || (a.e.p - b.e.p)).slice(0, 8).map((x) => x.k);
  const SESSION = 10; // flashcards come in rounds of 10 so a long list never feels endless
  const practiceOrder = () => S.saved.filter((k) => D[k]).map((k) => ({ k, e: know(k) })).sort((a, b) => (b.e.due - a.e.due) || (a.e.p - b.e.p)).map((x) => x.k);
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
    if (D[k] && D[k].lookFail && !D[k].pending) { delete D[k].lookFail; D[k].meaning = 'Looking up…'; D[k].pending = lookup(k); } // try again
    if (D[k]) return D[k];
    const wre = new RegExp(`(^|[^a-z'])${k.replace(/[^a-z']/g, '')}($|[^a-z'])`, 'i'), sents = sentencesOf(text);
    const sentence = sents.find((s) => wre.test(s)) || (text.length < 400 ? text.trim() : '');
    const p = PLAIN[k];
    D[k] = { word: k, kind: isHard(k) ? 'hard' : 'common', meaning: p ? cap(p) + '.' : 'Looking up…', ctx: sentence ? 'In plain English: ' + plainify(sentence) : 'A word you looked up.', sentence, place, scanned: true };
    if (!p) D[k].pending = lookup(k);
    return D[k];
  }
  // Wiktionary's free API. Definitions come as HTML, so strip tags. Scanned words are often inflected ("payments",
  // "received", "leasing"), and Wiktionary only says "plural of payment" for those, so follow the form to its base
  // word and use that word's main meaning. A word it doesn't know at all is retried without a common ending.
  const FORM_RE = /\b(?:plural|participle|past tense|simple past|third-person singular|gerund|comparative|superlative|inflection|alternative (?:form|spelling)|misspelling|obsolete form|archaic form)\b[^.;]*? of ([a-z][a-z'-]+)/i;
  async function wikDefs(w) {
    const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(w));
    if (r.status === 404) return [];
    if (!r.ok) throw new Error('http');
    const j = await r.json();
    return ((j && j.en) || []).map((x) => ({ pos: x.partOfSpeech, defs: (x.definitions || []).map((d) => {
      const doc = new DOMParser().parseFromString(d.definition || '', 'text/html');
      doc.querySelectorAll('style, sup, .usage-label-sense').forEach((n) => n.remove());
      return doc.body.textContent.replace(/\s+/g, ' ').trim();
    }).filter((t) => t && !/^(obsolete|archaic|dated)\b/i.test(t)) })).filter((e) => e.defs.length && !/^(proper noun|symbol|letter)$/i.test(e.pos));
  }
  const firstDef = (entries) => { const defs = entries.flatMap((e) => e.defs).filter((t) => !FORM_RE.test(t)); return defs.find((t) => t.length <= 140) || defs[0] || ''; };
  const baseGuesses = (k) => [...new Set([
    k.replace(/ies$/, 'y'), k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/ied$/, 'y'), k.replace(/ed$/, ''), k.replace(/d$/, ''),
    k.replace(/ing$/, ''), k.replace(/ing$/, 'e'), k.replace(/([b-df-hj-np-tv-z])\1(ed|ing)$/, '$1'), k.replace(/ly$/, ''), k.replace(/er$/, ''),
  ])].filter((b) => b !== k && b.length >= 3);
  async function define(k) {
    const entries = await wikDefs(k);
    const form = entries.flatMap((e) => e.defs).map((t) => t.match(FORM_RE)).find(Boolean);
    if (form && form[1].toLowerCase() !== k) { // an inflected form: explain the base word
      const base = form[1].toLowerCase(), d = firstDef(await wikDefs(base));
      if (d) return { meaning: d, base };
    }
    const own = firstDef(entries);
    if (own) return { meaning: own };
    if (!entries.length) for (const b of baseGuesses(k).slice(0, 4)) { const d = firstDef(await wikDefs(b)); if (d) return { meaning: d, base: b }; }
    return null;
  }
  async function lookup(k) {
    try {
      const r = await define(k);
      const m = r && r.meaning.replace(/^\(.*?\)\s*/, '');
      if (!m) D[k].meaning = 'Not in the dictionary yet.';
      else { D[k].meaning = m.charAt(0).toUpperCase() + m.slice(1); if (r.base) D[k].base = r.base; }
    } catch { D[k].meaning = navigator.onLine ? 'Couldn’t look this word up right now.' : 'You’re offline. Open this word again when you’re back online.'; D[k].lookFail = true; }
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
  // Get a photo ready for Tesseract: resize so letters are big enough (small pictures are enlarged), make it grey and
  // even out the lighting. Each pixel is divided by the brightness of the paper around it, so shadows, glare and blank
  // paper turn plain white and only ink stays dark. (Tested on camera-like photos of a letter: 720p shots went from
  // 23% to 66% of words read, and shadowed paper stopped producing made-up words.)
  const prepare = (src, target = 2400) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(3, target / Math.max(img.width, img.height));
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h), px = d.data, n = w * h, y = new Float32Array(n);
      for (let i = 0, j = 0; j < n; i += 4, j++) y[j] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
      const W1 = w + 1, sum = new Float64Array(W1 * (h + 1)); // running totals, for the average of any rectangle
      for (let r = 0; r < h; r++) { let row = 0; for (let x = 0; x < w; x++) { row += y[r * w + x]; sum[(r + 1) * W1 + x + 1] = sum[r * W1 + x + 1] + row; } }
      const R = Math.max(8, Math.round(Math.max(w, h) * 0.03)), lo = 0.35, hi = 0.97;
      for (let r = 0; r < h; r++) {
        const y0 = Math.max(0, r - R), y1 = Math.min(h, r + R + 1);
        for (let x = 0; x < w; x++) {
          const x0 = Math.max(0, x - R), x1 = Math.min(w, x + R + 1);
          const paper = (sum[y1 * W1 + x1] - sum[y0 * W1 + x1] - sum[y1 * W1 + x0] + sum[y0 * W1 + x0]) / ((x1 - x0) * (y1 - y0));
          const v = Math.max(0, Math.min(255, (y[r * w + x] / Math.max(1, paper) - lo) / (hi - lo) * 255)), i = (r * w + x) * 4;
          px[i] = px[i + 1] = px[i + 2] = v;
        }
      }
      g.putImageData(d, 0, 0); res({ src: c.toDataURL('image/png'), w, h });
    };
    img.onerror = () => res({ src, w: 0, h: 0 }); img.src = src;
  });
  // Keep only words Tesseract is reasonably sure of (drops most of the made-up words from smudges and edges).
  // conf: how sure it is, on average, of the words it kept.
  const sureText = (data) => {
    const kept = (data.lines || []).map((l) => l.words.filter((w) => w.confidence >= 40));
    const all = kept.flat();
    if (!all.length) return { text: data.text || '', conf: data.confidence || 0 };
    return { text: kept.map((ws) => ws.map((w) => w.text).join(' ')).join('\n'), conf: all.reduce((s, w) => s + w.confidence, 0) / all.length };
  };
  async function readImage(src, onProgress) {
    const w = await getWorker();
    onOcr = onProgress;
    try {
      const p = await prepare(src);
      const { data } = await w.recognize(p.src);
      const r = sureText(data);
      // Where each word sits on the picture (as % of its width and height), in the same order as the text, so the
      // photo itself can be tapped. A word Tesseract read as two (e.g. "rent,|due") shares its box.
      const words = [];
      if (p.w && p.h) (data.lines || []).forEach((l) => l.words.filter((x) => x.confidence >= 40).forEach((x) => {
        const b = x.bbox, box = { x: b.x0 / p.w * 100, y: b.y0 / p.h * 100, w: (b.x1 - b.x0) / p.w * 100, h: (b.y1 - b.y0) / p.h * 100 };
        cleanText(x.text).split(' ').filter(Boolean).forEach((t) => words.push({ t, box }));
      }));
      // A word split across two lines ("pay-" then "ment") is one word again.
      for (let i = words.length - 2; i >= 0; i--) if (/[a-z]-$/i.test(words[i].t) && /^[a-z]/.test(words[i + 1].t)) { words[i].t = words[i].t.slice(0, -1) + words[i + 1].t; words.splice(i + 1, 1); }
      const kept = words.slice(0, 180);
      if (kept.length >= 3) return { text: kept.map((x) => x.t).join(' '), conf: Math.round(r.conf), boxes: kept.map((x) => x.box) };
      return { text: cleanText(r.text.replace(/([a-z])-\s*\n\s*([a-z])/gi, '$1$2')), conf: Math.round(r.conf), boxes: null };
    }
    finally { onOcr = () => {}; }
  }
  const fileToDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  async function startCamera() {
    if (needPrivacy(startCamera)) return;
    stopSpeaking(); warmUp();
    S.pending = null; S.sheet = null; S.explain = false;
    try {
      if (camLive()) resumeCamera(); else camStream = await openStream(facing, false); // reuse the stream: no new permission prompt
      countCameras();
      S.tab = 'lens'; S.source = 'camera';
      S.scan = { status: 'live', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' };
    } catch (e) {
      const kind = camErrKind(e);
      S.tab = 'lens'; S.source = 'camera';
      S.scan = { status: 'error', progress: 0, img: null, msg: CAM_ERR[kind][1], camErr: kind, conf: 0, origin: 'camera' };
    }
    render();
  }
  const openStream = (mode, exact) => navigator.mediaDevices.getUserMedia({ video: { facingMode: exact ? { exact: mode } : { ideal: mode }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false });
  async function countCameras() {
    try { const n = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput').length; if (n !== camCount) { camCount = n; render(); } } catch {}
  }
  // Switch between the back and front camera. Before the camera is on, it turns the camera on with the other one.
  async function flipCamera() {
    const next = facing === 'environment' ? 'user' : 'environment';
    if (S.scan.status !== 'live') { facing = next; try { localStorage.setItem('linger.facing', facing); } catch {} return startCamera(); }
    stopCamera();
    try {
      camStream = await openStream(next, true);
      facing = next; try { localStorage.setItem('linger.facing', facing); } catch {}
    } catch {
      // No camera facing that way: go back to the one that worked.
      try { camStream = await openStream(facing, false); showToast('This device has only one camera'); }
      catch { S.scan = { status: 'error', progress: 0, img: null, msg: 'Couldn’t switch cameras. Tap the button to try again.', conf: 0, origin: 'camera' }; }
    }
    render();
  }
  // Why the camera couldn't open, so the screen can say what to do next.
  const CAM_ERR = {
    denied: ['Camera access is off', 'Linger needs the camera to read letters, signs and bills. Turn it back on, or use a photo or paste text instead.'],
    nocam: ['No camera found', 'Linger couldn’t find a camera on this device. Upload a photo or paste the text instead.'],
    busy: ['The camera is busy', 'Another app may be using the camera. Close it and tap Try again, or upload a photo instead.'],
    other: ['Couldn’t open the camera', 'Tap Try again. If it still doesn’t work, upload a photo or paste the text instead.']
  };
  const camErrKind = (e) => { const n = e && e.name; return n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? 'nocam' : n === 'NotReadableError' || n === 'AbortError' ? 'busy' : 'other'; };
  // The iPhone app (shell build 2+) can open its own page in Settings, where camera access is turned back on.
  const SHELL_BUILD = BETA && BETA.native ? Number((window.LINGER_SHELL && LINGER_SHELL.build) || 1) : 0;
  const LATEST_SHELL = 3, REQUIRED_SHELL = 1; // build 3: current app icon, no pinch zoom
  // A photo Linger couldn't read: work out the likely reason from the picture itself (light, glare, focus).
  const RETAKE = {
    dark: ['Too dark to read', 'Turn on a light or move closer to a window, then take it again.'],
    glare: ['Too much glare', 'Tilt the page a little so the light doesn’t shine back off it.'],
    blur: ['The photo is blurry', 'Hold the phone still for a second, and tap the screen to focus before you take it.'],
    far: ['The words are too small', 'Move closer so the text fills the frame, and flatten the page if it’s folded.']
  };
  function photoCheck(src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const w = 240, h = Math.max(1, Math.round(im.height * w / im.width)), c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h);
          const p = g.getImageData(0, 0, w, h).data; let sum = 0, bright = 0;
          for (let i = 0; i < p.length; i += 4) { const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; sum += y; if (y > 248) bright++; }
          const n = p.length / 4, mean = sum / n, sharp = sharpness(c) / (w * h);
          // Measured on test photos: blurry pages score under 30, sharp ones 200+. Glare is a blown-out patch (part of the
          // picture pure white), not a whole white page.
          const b = bright / n;
          res(mean < 70 ? 'dark' : sharp < 60 ? 'blur' : b > 0.15 && b < 0.8 ? 'glare' : 'far');
        } catch { res('far'); }
      };
      im.onerror = () => res('far'); im.src = src;
    });
  }
  // Text that isn't English (or is handwriting) reads as nonsense: almost none of the most common English words appear.
  const COMMON_EN = new Set('the a an and or to of in on at for from by with is are was were be been will would can could should must you your we our they their it this that these those he she his her i me my not no yes if as do does did have has had please pay'.split(' '));
  const looksEnglish = (text) => { const w = text.toLowerCase().match(/[a-z']+/g) || []; if (w.length < 12) return true; return w.filter((x) => COMMON_EN.has(x)).length / w.length >= 0.06; };
  // Important letters: deadlines, money owed, legal steps. Linger points them out and says where to get free help.
  const IMPORTANT_RE = /\b(evict(ion|ed)?|notice to (quit|vacate)|court|summons|hearing|lawsuit|judg(e)?ment|penalt(y|ies)|late fees?|past due|overdue|final notice|shut ?off|disconnect(ion|ed)?|terminat(e|ion|ed)|deadline|must (pay|respond|reply|appear|submit)|failure to|collections?|garnish|IRS|immigration|USCIS|deport(ation)?|benefits|SNAP|Medicaid|Medicare)\b/i;
  const isImportant = (text) => IMPORTANT_RE.test(text || '');
  function importantCard(dates) {
    return `<div class="imp-card" role="note"><div class="imp-h"><span class="imp-ic" aria-hidden="true">${ICO.info}</span><strong>This looks important</strong></div>
      <span>It mentions a deadline, money or a legal step. Read it carefully and don’t wait until the last day.</span>
      ${dates && dates.length ? `<div class="dates">${dates.map((d) => `<span class="date">${esc(d)}</span>`).join('')}</div>` : ''}
      <span class="small">Linger isn’t legal advice. If you’re not sure what to do, free help is available:</span>
      <ul class="imp-help"><li><a href="tel:211">Call 211</a>: free, any time, connects you to local help with housing, bills and benefits</li>
        <li><a href="https://www.lawhelp.org" target="_blank" rel="noopener">LawHelp.org</a>: free legal aid near you</li>
        <li><a href="tel:311">Call 311</a>: your city’s services line, in most US cities</li></ul></div>`;
  }
  // The last scan's text stays on this phone (not the picture) so it can be opened again, unless they say not to.
  const LAST_SCAN = 'linger.lastScan', SCAN_BUSY = 'linger.scanBusy', KEEP_SCANS = 'linger.keepScans', PRIVACY_SEEN = 'linger.privacy.v1';
  const keepScans = () => { try { return localStorage.getItem(KEEP_SCANS) !== 'no'; } catch { return true; } };
  function rememberScan() {
    try { localStorage.removeItem(SCAN_BUSY); if (!keepScans() || S.scan.noKeep) { localStorage.removeItem(LAST_SCAN); return; }
      localStorage.setItem(LAST_SCAN, JSON.stringify({ text: TEXTS.camera, origin: S.scan.origin, pages: S.scan.pages || 1, conf: S.scan.conf || 0, at: Date.now() })); } catch {}
  }
  const lastScan = () => { try { return JSON.parse(localStorage.getItem(LAST_SCAN) || 'null'); } catch { return null; } };
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour ago' : ' hours ago') : Math.round(m / 1440) === 1 ? 'yesterday' : Math.round(m / 1440) + ' days ago'; };
  // Shown once, before the first scan, photo or paste: what happens to what they scan.
  const privacySeen = () => { try { return !!localStorage.getItem(PRIVACY_SEEN); } catch { return true; } };
  function needPrivacy(next) { if (privacySeen()) return false; S.privacy = true; S.privacyNext = next; render(); return true; }
  function stopCamera() { if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
  // After a photo (or switching to Upload / Paste) the camera is paused, not closed: asking for it again would show the
  // browser's permission prompt again. It's closed for real when you leave Lens or the app goes to the background.
  const camLive = () => !!camStream && camStream.getVideoTracks().some((t) => t.readyState === 'live');
  function pauseCamera() { if (camStream) camStream.getVideoTracks().forEach((t) => { t.enabled = false; }); if (S.scan.status === 'live') S.scan.status = 'idle'; }
  function resumeCamera() { if (camStream) camStream.getVideoTracks().forEach((t) => { t.enabled = true; }); }
  // Back to the camera after Clear (or the Scan tab): straight to the live view when the camera is still open.
  function backToCamera() { if (camLive()) { resumeCamera(); S.source = 'camera'; S.lensMode = 'scan'; S.scan = { status: 'live', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }; } }
  document.addEventListener('visibilitychange', () => { if (document.hidden && camStream && S.scan.status !== 'live') stopCamera(); });
  function closeCamera() { stopCamera(); if (S.scan.status === 'live') S.scan.status = 'idle'; }
  // Keep only the part of the picture inside the on-screen frame (the video is shown with object-fit: cover).
  function shutterFlash(card) {
    buzz(15);
    if (!card || calm()) return;
    const fl = document.createElement('div'); fl.className = 'lh-flash'; fl.setAttribute('aria-hidden', 'true');
    card.appendChild(fl); fl.addEventListener('animationend', () => fl.remove(), { once: true });
  }
  async function capture() {
    const v = document.getElementById('cam'), f = document.getElementById('camFrame'); if (!v || !v.videoWidth || !f) return;
    const vr = v.getBoundingClientRect(), f0 = f.getBoundingClientRect();
    // Take a little more than the frame, so letters touching its edge aren't cut off.
    const mx = f0.width * 0.06, my = f0.height * 0.04;
    const fr = { left: f0.left - mx, top: f0.top - my, width: f0.width + mx * 2, height: f0.height + my * 2 };
    const k = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight);
    const ox = (v.videoWidth * k - vr.width) / 2, oy = (v.videoHeight * k - vr.height) / 2;
    const sx = Math.max(0, (fr.left - vr.left + ox) / k), sy = Math.max(0, (fr.top - vr.top + oy) / k);
    const sw = Math.min(v.videoWidth - sx, fr.width / k), sh = Math.min(v.videoHeight - sy, fr.height / k);
    // Tapping shakes the phone, so take a few frames over half a second and keep the sharpest.
    if (capture.busy) return; capture.busy = true;
    shutterFlash(f.closest('.lh-card'));
    let best = null, bestScore = -1;
    for (let i = 0; i < 6; i++) {
      if (i) await new Promise((r) => setTimeout(r, 90));
      if (!v.videoWidth) break;
      const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
      c.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const score = sharpness(c);
      if (score > bestScore) { best = c; bestScore = score; }
    }
    capture.busy = false;
    if (best) scanImage(best.toDataURL('image/jpeg', 0.95));
  }
  // How sharp a picture is: how much neighbouring pixels differ (blurry pictures have soft edges), on a small copy.
  function sharpness(c) {
    const w = 320, h = Math.max(1, Math.round(c.height * w / c.width));
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0, w, h);
    const p = g.getImageData(0, 0, w, h).data; let s = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4, lap = 4 * p[i + 1] - p[i - 3] - p[i + 5] - p[i - w * 4 + 1] - p[i + w * 4 + 1];
      s += lap * lap;
    }
    return s;
  }
  const scanStage = (p) => (p < 30 ? 'Finding the words…' : p < 70 ? 'Reading each line…' : p < 95 ? 'Checking the hard words…' : 'Almost there…');
  async function scanImage(src, origin = 'camera') {
    if (needPrivacy(() => scanImage(src, origin))) return;
    pauseCamera(); stopSpeaking(); lensExpand(false);
    const more = S.addPage; // adding a page to the scan already on screen
    try { localStorage.setItem(SCAN_BUSY, String(Date.now())); } catch {}
    S.tab = 'lens'; S.source = 'camera';
    S.pending = null; S.sheet = null; S.explain = false;
    S.lensMode = origin === 'upload' ? 'upload' : 'scan';
    S.scan = { status: 'reading', progress: 0, img: src, msg: '', conf: 0, origin, page: more ? more.pages + 1 : 1 }; render();
    try {
      const { text, conf, boxes } = await readImage(src, (p) => { S.scan.progress = p; const el = document.getElementById('scanPct'); if (el) el.textContent = p + '%'; const st = document.getElementById('scanStage'); if (st && st.textContent !== scanStage(p)) { st.textContent = scanStage(p); st.classList.remove('swap'); void st.offsetWidth; st.classList.add('swap'); } });
      if (text.split(' ').length < 3) throw new Error('empty');
      if (!more) Object.keys(D).forEach((k) => { if (D[k].scanned && !isSaved(k)) delete D[k]; });
      const all = more ? more.text + ' ' + text : text;
      TEXTS.camera = all; SUMMARY.camera = summarize(all);
      S.scan.status = 'done'; S.scan.conf = more ? Math.min(conf, more.scan.conf || conf) : conf; S.scan.pages = more ? more.pages + 1 : 1;
      S.scan.boxes = more ? null : boxes; S.shotView = S.scan.boxes ? 'picture' : 'text'; if (S.scan.boxes) fx('shot', 1);
      S.scan.notEnglish = !looksEnglish(all); S.addPage = null; S.textTr = false;
      rememberScan();
      S.explain = true; // show the plain-English summary right away
      if (src) setTimeout(() => { if (S.tab === 'lens' && S.scan.status === 'done') sheetTo(true); }, 0);
    } catch (e) {
      try { localStorage.removeItem(SCAN_BUSY); } catch {}
      S.scan.status = 'error';
      if (e.message === 'empty') { S.scan.reason = await photoCheck(src); S.scan.msg = RETAKE[S.scan.reason][0] + '. ' + RETAKE[S.scan.reason][1]; }
      else S.scan.msg = navigator.onLine ? 'Couldn’t read the photo. Try again in a moment.' : 'You’re offline. Linger needs the internet the first time it reads a photo. Try again when you’re back online.';
    }
    render();
  }

  // ---------- my language ----------
  // The reader picks their own language (Lens → globe button, or Settings). Word sheets and the "Explain" summary then
  // also show the meaning in that language. Phones don't have Chrome's on-device translator, so the Linger AI server
  // (Claude) translates; on a laptop Chrome that has the translator, it's used first (free, stays on the computer).
  const LANGS = window.LINGER_LANGS || [];
  const langOf = (c) => LANGS.find((l) => l.code === c) || null;
  const rtl = (c) => !!(window.lingerRTL && window.lingerRTL(c));
  const AI_URL = 'https://us-central1-linger-f41a7.cloudfunctions.net/explain';
  const LANG_KEY = 'linger.lang';
  // The reader's languages (they can pick more than one). The first is the main one: summaries, the Lens button and
  // read-aloud use it; word sheets show a translation for each (up to 3).
  const LANGS_KEY = 'linger.langs';
  const okLangs = (a) => [...new Set((Array.isArray(a) ? a : []).filter((c) => c !== 'en' && langOf(c)))].slice(0, 3);
  S.langs = (() => { try { const a = JSON.parse(localStorage.getItem(LANGS_KEY) || 'null'); if (Array.isArray(a)) return okLangs(a); const v = localStorage.getItem(LANG_KEY) || ''; return okLangs([v]); } catch { return []; } })();
  S.lang = S.langs[0] || '';
  S.langPick = false; S.langQuery = '';
  // Random ID for the server's per-person limit (shared Wi-Fi shouldn't block a whole class).
  const lingerId = (() => { try { let v = localStorage.getItem('linger.id'); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem('linger.id', v); } return v; } catch { return 'anon-' + Date.now(); } })();
  const TR = new Map(); // `${lang}|${text}|${context}` → { status: 'wait' | 'ok' | 'fail', t, sentence, note }
  const onDevice = new Map();
  // The browser's own translator can stall (or be slow to start), so anything it doesn't do within a few seconds goes
  // to Linger's server instead.
  const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), ms))]);
  async function deviceTranslator(to) {
    if (typeof window.Translator === 'undefined') return null;
    if (onDevice.has(to)) return onDevice.get(to);
    try {
      if ((await within(Translator.availability({ sourceLanguage: 'en', targetLanguage: to }), 3000)) !== 'available') { onDevice.set(to, null); return null; }
      const t = await within(Translator.create({ sourceLanguage: 'en', targetLanguage: to }), 4000);
      onDevice.set(to, t); return t;
    } catch { onDevice.set(to, null); return null; }
  }
  async function fetchTr(text, context, withSentence, to) {
    const dev = await deviceTranslator(to);
    if (dev) {
      try { return { t: await within(dev.translate(text), 4000), sentence: withSentence && context ? await within(dev.translate(context), 4000) : '', note: '' }; } catch { onDevice.set(to, null); }
    }
    if (!aiOK()) return null; // the phone's own translator above is fine; Linger's server only with consent
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Linger-Id': lingerId },
          body: JSON.stringify({ mode: 'translate', text, context, lang: to, langName: (langOf(to) || {}).name || to, sentence: withSentence }) });
        const j = r.ok ? await r.json() : null;
        if (j && j.translation) return { t: j.translation, sentence: j.sentence || '', note: j.note || '' };
        if (r.status !== 429 && r.status < 500) return null;
      } catch {}
      await new Promise((res) => setTimeout(res, 1500));
    }
    return null;
  }
  // Linger AI explanations, like the Chrome extension's card: a word in its sentence (meaning here, easier words, an
  // example) or a highlighted phrase (meaning, plain English, the hard words in it). Cached; the screen redraws when
  // the answer arrives.
  const AIX = new Map();
  // Consent for Linger AI, asked on the first word card (and switchable in Settings). 'yes' | 'no' | '' (not asked yet).
  const AI_CONSENT = 'linger.aiConsent';
  S.aiConsent = (() => { try { return localStorage.getItem(AI_CONSENT) || ''; } catch { return ''; } })();
  const aiOK = () => S.aiConsent === 'yes';
  function setAiConsent(v) { S.aiConsent = v; try { localStorage.setItem(AI_CONSENT, v); localStorage.setItem(AI_CONSENT + 'At', String(Date.now())); } catch {} }
  function explainAI(mode, text, context) {
    if (!text) return null;
    if (!aiOK()) return { status: 'off' };
    const key = `${mode}|${text}|${context || ''}`;
    if (!AIX.has(key)) {
      AIX.set(key, { status: 'wait', t0: Date.now() });
      setTimeout(() => { const v = AIX.get(key); if (v && v.status === 'wait') render(); }, 5200); // "taking longer than usual"
      (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Linger-Id': lingerId }, body: JSON.stringify({ mode, text, context: context || '' }) });
            const j = r.ok ? await r.json() : null;
            if (j && j.meaning) { AIX.set(key, { status: 'ok', ...j }); render(); return; }
            if (r.status !== 429 && r.status < 500) break;
          } catch {}
          await new Promise((res) => setTimeout(res, 1500));
        }
        AIX.set(key, { status: 'fail' }); render();
      })();
    }
    return AIX.get(key);
  }
  // The sentence a word of the Lens text sits in (token index → sentence).
  function sentenceAt(i, j = i) {
    const t = tokens(); let a = i, b = j;
    while (a > 0 && !/[.!?]["”’)]*$/.test(t[a - 1])) a--;
    while (b < t.length - 1 && !/[.!?]["”’)]*$/.test(t[b])) b++;
    return t.slice(a, b + 1).join(' ').slice(0, 600);
  }

  // The translation if it's ready (and starts it if not). The screen redraws when it arrives.
  function tr(text, context = '', withSentence = false, to = S.lang) {
    if (!to || !text) return null;
    const key = `${to}|${text}|${withSentence ? context : ''}`;
    if (!TR.has(key)) {
      TR.set(key, { status: 'wait' });
      fetchTr(text, context, withSentence, to).then((r) => { TR.set(key, r ? { status: 'ok', ...r } : { status: 'fail' }); render(); });
    }
    return TR.get(key);
  }
  const langAttrs = (c = S.lang) => `lang="${esc(c)}" dir="${rtl(c) ? 'rtl' : 'auto'}"`;
  const langLabel = () => { const l = langOf(S.lang); return l ? l.own + (S.langs.length > 1 ? ` +${S.langs.length - 1}` : '') : 'English only'; };
  const langsLabel = () => S.langs.map((c) => langOf(c).own).join(', ');
  // The "In <language>" boxes on a word sheet: one per language they picked.
  function trBox(word, meaning, sentence) { return S.langs.map((c) => trBoxIn(c, word, meaning, sentence)).join(''); }
  function trBoxIn(code, word, meaning, sentence) {
    const w = tr(word, sentence, !!sentence, code), m = meaning ? tr(meaning, '', false, code) : null;
    const L = langOf(code), A = langAttrs(code);
    const waiting = (w && w.status === 'wait') || (m && m.status === 'wait');
    const failed = w && w.status === 'fail';
    let body;
    if (failed) body = '<div class="small">Couldn’t translate right now. Check your internet connection and open the word again.</div>';
    else body = `${w && w.status === 'ok' ? `<div class="tr-word" ${A}>${esc(w.t)}<button type="button" class="speak tr-say" data-action="speak-tr" data-t="${esc(w.t)}" data-l="${esc(code)}" aria-label="Say it in ${esc(L.name)}" ${canSpeak ? '' : 'disabled'}>${speaker}</button></div>` : ''}
      ${m && m.status === 'ok' ? `<div ${A}>${esc(m.t)}</div>` : ''}
      ${w && w.sentence ? `<div class="ctx" ${A}>“${esc(w.sentence)}”</div>` : ''}
      ${w && w.note ? `<div class="small" ${A}>${esc(w.note)}</div>` : ''}
      ${waiting ? '<div class="small">Translating…</div>' : ''}`;
    return `<div class="tr-box"><div class="label">In ${esc(L.own)}</div>${body}</div>`;
  }
  function langSheet() {
    const q = S.langQuery.trim().toLowerCase();
    const list = LANGS.filter((l) => l.code !== 'en' && (!q || l.name.toLowerCase().includes(q) || l.own.toLowerCase().includes(q)))
      .sort((a, b) => (S.langs.includes(b.code) - S.langs.includes(a.code)) || (S.langs.indexOf(a.code) - S.langs.indexOf(b.code))); // picked ones first
    const on = (code) => (code ? S.langs.includes(code) : !S.langs.length);
    // Tapping a language makes it the main one (summaries, scans and the Lens button use it); ✕ removes one.
    const row = (code, own, name) => { const main = code ? S.langs[0] === code : !S.langs.length, extra = code && on(code) && !main;
      return `<div class="lang-rowwrap"><button type="button" class="city-row ${on(code) ? 'on' : ''}" role="radio" aria-checked="${main}" data-action="lang-set" data-v="${code}"><span class="city-txt"><strong ${code ? `lang="${code}" dir="auto"` : ''}>${esc(own)}</strong>${name ? `<small>${esc(name)}</small>` : ''}</span>${main ? `<span class="tick">${code ? 'Main' : '✓'}</span>` : extra ? '<span class="tick tick-2">Also</span>' : ''}</button>${code && on(code) ? `<button type="button" class="lang-rm" data-action="lang-rm" data-v="${code}" aria-label="Remove ${esc(own)}">✕</button>` : ''}</div>`; };
    return `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
      <div class="panel" role="dialog" aria-label="Choose your languages"><div class="grab"></div>
        <div class="lang-head"><div class="sum-title">Your languages</div><button type="button" class="btn primary small-btn" data-action="close">Done</button></div>
        <div class="small">Tap a language to read your scans and summaries in it. Word meanings also show in up to 2 more. Linger still teaches the English.</div>
        <label class="search"><input id="langQ" type="search" placeholder="Search languages" value="${esc(S.langQuery)}" aria-label="Search languages"></label>
        <div class="city-list lang-list">${!q ? row('', 'English only', 'No translation') : ''}${list.map((l) => row(l.code, l.own, l.own === l.name ? '' : l.name)).join('')}
          ${list.length ? '' : '<div class="small">No language matches. Try its English name.</div>'}</div></div></div>`;
  }

  // ---------- account button (top right of every header) and the account sheet ----------
  const personIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  const camSmall = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  const acctState = () => (window.LingerAccount ? LingerAccount.state() : null);
  const remembered = () => { try { const r = JSON.parse(localStorage.getItem('linger.rememberAcct') || 'null'); return r && r.email ? r : null; } catch { return null; } };
  const signedInAs = () => { const st = acctState(); return st && st.auth === 'in' ? st.email || '' : ''; };
  // The profile picture: the photo they added, else the first letter of their email, else a person outline.
  function avatar(size) {
    const email = signedInAs(), photo = email && (S.photo || photoCache(email));
    const inner = photo ? `<img src="${esc(photo)}" alt="">` : email ? `<span>${esc(email.charAt(0).toUpperCase())}</span>` : personIcon;
    return `<span class="avatar ${size}${email ? ' in' : ''}" aria-hidden="true">${inner}</span>`;
  }
  const avatarBtn = () => { const e = signedInAs(); return `<button type="button" class="av-btn" data-action="acct-open" aria-haspopup="dialog" aria-label="${e ? 'Your account: ' + esc(e) : 'Sign in or create an account'}${S.prefs.done ? '' : '. Setup not finished'}">${avatar('av-sm')}${S.prefs.done ? '' : '<span class="av-dot" aria-hidden="true"></span>'}</button>`; };
  const readsLabel = () => S.prefs.reads.map((id) => (id === 'other' && S.prefs.other ? S.prefs.other : (READS.find((r) => r[0] === id) || [])[2])).filter(Boolean).join(', ');
  function acctSheet() {
    const email = signedInAs(), pitch = S.acctPitch && !email, lvl = LEVELS.find((l) => l[0] === S.prefs.level);
    const row = (k, v, attrs = '') => `<div class="acct-row"><span>${k}</span><span ${attrs}>${esc(v)}</span></div>`;
    return `<div class="sheet acct-sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
      <div class="panel" role="dialog" aria-label="Your account"><div class="grab"></div>
        <div class="acct-head">
          <div class="acct-pic">${avatar('av-lg')}${email ? `<label class="acct-cam" title="${S.photo ? 'Change' : 'Add a'} profile picture"><input type="file" id="acctPhoto" accept="image/*" aria-label="${S.photo ? 'Change' : 'Add a'} profile picture">${camSmall}</label>` : ''}</div>
          <div class="acct-who"><div class="sum-title">${pitch ? 'Make your free profile' : email ? 'Your account' : 'Guest User'}</div>
            <div class="small">${email ? esc(email) : pitch ? 'Last step. It takes 30 seconds, and you can skip it.' : 'Not signed in. Your words are saved on this phone only.'}</div></div>
        </div>
        ${pitch ? `<ul class="acct-why">
          <li><span aria-hidden="true">💾</span><span><b>Keep your words</b> if you lose or change your phone.</span></li>
          <li><span aria-hidden="true">💻</span><span><b>Use Linger on your laptop</b> with the same words and progress.</span></li>
          <li><span aria-hidden="true">🔒</span><span><b>Just an email and password.</b> No ads, and you can delete it anytime.</span></li></ul>` : ''}
        ${window.LingerAccount ? LingerAccount.card({ inSheet: true }) : ''}
        ${pitch ? '<button type="button" class="btn acct-later" data-action="acct-later">Not now, keep words on this phone</button>' : !S.prefs.done || !S.prefs.level ? `<div class="acct-setup acct-start"><strong>Finish setting up Linger</strong>
          <span>3 quick questions: what you read, your languages, and your English level (with an optional English check).</span>
          <button type="button" class="btn primary small-btn" data-action="onb-first">Set up now</button></div>` : `<div class="acct-setup">
          <div class="acct-setup-h"><strong>Reading setup</strong><button type="button" class="link-btn" data-action="onb-edit">Change</button></div>
          ${row('Reading', readsLabel() || 'Not set yet')}
          ${row(S.langs.length > 1 ? 'Languages' : 'Language', S.langs.length ? langsLabel() + ' + English' : 'Simple English', S.lang ? 'dir="auto"' : '')}
          ${row('English level', lvl ? lvl[2] + (S.prefs.test && S.prefs.test.agreed && S.prefs.test.level === S.prefs.level ? ` (check: about ${S.prefs.test.cefr})` : '') : 'Not set yet')}
        </div>`}</div></div>`;
  }
  // ---------- Profile: progress dashboard, account, laptop & extension, reading setup ----------
  const LEVEL_NAME = { beginner: 'Beginner (A1–A2)', intermediate: 'Intermediate (B1–B2)', advanced: 'Advanced (C1–C2)', unsure: 'Intermediate (B1–B2)' };
  const NEXT = { beginner: ['intermediate', 25], intermediate: ['advanced', 60], unsure: ['advanced', 60], advanced: [null, 120] };
  function stats() {
    const words = S.saved.filter((k) => D[k]), est = words.map((k) => know(k).label);
    const known = est.filter((x) => x === 'Known').length, almost = est.filter((x) => x === 'Almost').length;
    const all = L ? Object.values(L.all()) : [];
    const right = all.reduce((a, e) => a + (e.c || 0), 0), wrong = all.reduce((a, e) => a + (e.w || 0), 0);
    // Days with any activity: a lookup, a review or a save.
    const days = new Set();
    all.forEach((e) => [e.lr, e.ll, e.u].forEach((t) => { if (t) days.add(dayKey(new Date(t))); }));
    words.forEach((k) => { const d = savedDay(k); if (d) days.add(d); });
    let streak = 0; const d = startOfDay(new Date());
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet: the streak still counts from yesterday
    while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    return { total: words.length, known, almost, learning: words.length - known - almost, right, wrong, days, streak, looked: all.filter((e) => e.n).length };
  }
  // Settings and Profile pages: the same Linger header as the tabs (gradient, turning rings, logo), with a back arrow.
  const pageHero = (title, back, backLabel) => `<header class="hero wh lh2 set-hero">
      <div class="wh-rings" aria-hidden="true"><img src="icons/figma/rings-words.svg" width="351.387" height="351.387" alt=""></div>
      ${logo}
      <div class="wh-title"><div class="wh-row set-title"><button type="button" class="set-back" ${back} aria-label="${backLabel}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><h1>${title}</h1></div></div>
    </header>`;
  // Your name (shown on Profile). Kept on this device, and in your account when you're signed in.
  const NAME_KEY = 'linger.name';
  S.name = (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } })();
  S.nameFromAcct = (() => { try { return localStorage.getItem(NAME_KEY + '.acct') === '1'; } catch { return false; } })();
  const displayName = () => S.name || (signedInAs() ? signedInAs().split('@')[0] : 'Guest User');
  // A number that counts up when the page opens (only the first time it's shown, and never with Reduce motion).
  const countUp = (n) => `<span class="count" data-n="${n}">${calm() ? n : 0}</span>`;
  const PROF_SECS = { account: 'Account', laptop: 'Laptop & extension', setup: 'Reading setup' };
  function progressBlock(st) {
    const [nextId, target] = NEXT[S.prefs.level] || NEXT.intermediate, next = LEVELS.find((l) => l[0] === nextId);
    const pts = st.known + st.almost * 0.5, pct = Math.min(100, Math.round(pts / target * 100));
    const today = startOfDay(new Date()), counts = savedOn();
    const week = Array.from({ length: 7 }, (_, i) => { const x = new Date(today); x.setDate(today.getDate() - 6 + i); return { d: x, n: counts[dayKey(x)] || 0, on: st.days.has(dayKey(x)) }; });
    const peak = Math.max(1, ...week.map((w) => w.n));
    const acc = st.right + st.wrong ? Math.round(st.right / (st.right + st.wrong) * 100) : 0;
    const tile = (n, l, cls = '') => `<div class="db-tile ${cls}"><strong>${countUp(n)}</strong><span>${l}</span></div>`;
    const bests = [['match', 'Match up', '★'], ['bubbles', 'Bubble catch', ' pts'], ['scramble', 'Unscramble', '★'], ['say', 'Say it', '★'], ['city.' + S.city, city().name + ' quiz', '★']].map(([g, n, u]) => [n, best(g), u]).filter((x) => x[1]);
    return `<div class="card db-level">
        <div class="db-lh"><div><span class="label">${next ? `Next: ${esc(LEVEL_NAME[next[0]])}` : 'Top level'}</span><strong>${esc(LEVEL_NAME[S.prefs.level] || LEVEL_NAME.intermediate)}</strong></div>
          <div class="db-ring" style="--p:${pct}" role="img" aria-label="${pct}% of the way"><span>${countUp(pct)}%</span></div></div>
        <div class="db-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <div class="small">${!st.total ? 'Save words from Lens or Local, then practice them in Review. Your progress shows up here.' : next ? `Know ${target} of your saved words to move up. You know ${st.known}${st.almost ? `, and ${st.almost} more ${st.almost === 1 ? 'is' : 'are'} almost there` : ''}.` : `You know ${st.known} of your saved words. Keep it up!`}</div>
        ${pct >= 100 && next ? '<button type="button" class="btn primary small-btn" data-action="level-check">Ready to move up? Change your level</button>' : ''}
      </div>
      <div class="db-tiles">${tile(st.total, 'saved')}${tile(st.known, 'known', 'k')}${tile(st.almost, 'almost', 'a')}${tile(st.learning, 'learning', 'l')}</div>
      <div class="db-split" aria-hidden="true">${st.total ? `<span class="k" style="flex:${st.known}"></span><span class="a" style="flex:${st.almost}"></span><span class="l" style="flex:${st.learning}"></span>` : '<span class="e"></span>'}</div>
      <div class="card db-week">
        <div class="db-wh"><strong><span class="streak-ic${st.streak ? ' lit' : ''}" aria-hidden="true">${ICO.flame}</span>${st.streak}-day streak</strong><span class="small">Words saved, last 7 days</span></div>
        <div class="db-bars">${week.map((w, i) => `<div class="db-col${w.on ? ' on' : ''}" style="--i:${i}"><span class="db-n">${w.n || ''}</span><span class="db-b" style="height:${Math.round(w.n / peak * 100)}%"></span><span class="db-d">${'SMTWTFS'[w.d.getDay()]}</span></div>`).join('')}</div>
        <div class="small">${st.right + st.wrong ? `Practice: ${st.right} right, ${st.wrong} to try again (${acc}%). ` : ''}Days with a dot under them are days you used Linger.</div>
      </div>
      ${bests.length ? `<div class="card db-best"><strong>Best scores</strong>${bests.map(([n, v, u]) => `<div class="acct-row"><span>${esc(n)}</span><span>${v}${u}</span></div>`).join('')}</div>` : ''}`;
  }
  function viewProfile() {
    const email = signedInAs(), st = stats(), lvl = LEVELS.find((l) => l[0] === S.prefs.level) || null;
    const sec = PROF_SECS[S.profSec] ? S.profSec : null;
    const head = sec ? pageHero(PROF_SECS[sec], 'data-action="prof-sec" data-v=""', 'Back to Profile') : pageHero('Profile', 'data-action="profile-back"', 'Back');
    const row = (k, v) => `<div class="acct-row"><span>${k}</span><span>${esc(v)}</span></div>`;
    const acct = acctState();
    if (!sec) {
      const setupDone = S.prefs.done && S.prefs.level;
      // Signed out: a Sign in button beside the picture, and the sign-in form opens right under it.
      const canSignIn = !!(window.LingerAccount && LingerAccount.available() && acct && acct.auth === 'out');
      const learn = [
        ['setup', ICO.book, 'Reading setup', setupDone ? esc([lvl && lvl[0] !== 'unsure' ? LEVEL_NAME[lvl[0]] : '', readsLabel()].filter(Boolean).join(' · ')) : 'Not finished · 3 quick questions', setupDone ? '' : 'data-dot="1"']
      ];
      const devices = [
        ['account', ICO.user, 'Account', email ? esc(email) : acct && acct.auth === 'loading' ? 'Checking…' : 'Not signed in · sign in to keep your words'],
        ['laptop', ICO.laptop, 'Laptop & extension', email ? 'Syncs with your account' : S.sync.status === 'on' ? 'Connected with a code' : 'Use Linger on your computer too']
      ];
      return `${head}<div class="body set-body prof-body">
        ${!setupDone ? '<button type="button" class="setup-strip" data-action="onb-first"><span class="setup-ic" aria-hidden="true">' + ICO.spark + '</span><span class="setup-txt"><strong>Finish setting up Linger</strong><span>3 quick questions</span></span><span class="setup-go">Set up ›</span></button>' : ''}
        <div class="prof-top">
          <div class="acct-pic">${avatar('av-lg')}${email ? `<label class="acct-cam" title="${S.photo ? 'Change' : 'Add a'} profile picture"><input type="file" id="acctPhoto" accept="image/*" aria-label="${S.photo ? 'Change' : 'Add a'} profile picture">${camSmall}</label>` : ''}</div>
          <div class="prof-who"><div class="prof-name">${esc(displayName())}</div>${email ? `<div class="small">${esc(email)}</div>` : canSignIn ? '<div class="small prof-cta">Sign in to back up your words and see them on your laptop too.</div>' : ''}
            ${lvl && lvl[0] !== 'unsure' ? `<span class="prof-level">${esc(LEVEL_NAME[lvl[0]])}</span>` : ''}</div>
          ${!email && canSignIn && !acct.formOpen ? '<button type="button" class="btn primary small-btn prof-signin" data-acct="open">Sign in</button>' : ''}
        </div>
        ${!email && acct && acct.formOpen ? LingerAccount.card({ inSheet: true }) : ''}
        <p class="set-label">Your progress</p>
        ${progressBlock(st)}
        <p class="set-label">Learning</p>
        ${menuList([...learn, ['', ICO.globe, 'My languages', esc(S.langs.length ? langsLabel() + ' + English' : 'Simple English'), 'data-action="lang-open"'], ['', ICO.check, 'English check', S.prefs.test ? `Last result: about ${esc(S.prefs.test.cefr || '')}` : 'A 2-minute check to find your level', 'data-action="level-test"']], 'prof-sec')}
        <p class="set-label">Account and devices</p>
        ${menuList(devices, 'prof-sec')}
        <p class="set-label">App</p>
        ${menuList([['', gear, 'Settings', 'Reading, display, accessibility'], ['privacy', ICO.lock, 'Privacy', 'What Linger keeps and how to delete it']], 'set-sec')}
      </div>`;
    }
    let body = '';
    if (sec === 'account') {
      const nameCard = `<form class="card name-card" id="nameForm" novalidate><label class="name-l" for="nameIn"><strong>Your name</strong><span class="small">Shown on your profile. ${email ? 'You sign in with your email, not your name.' : 'Kept on this phone.'}</span></label>
        <div class="name-row"><input id="nameIn" type="text" maxlength="40" autocomplete="name" placeholder="${esc(email ? email.split('@')[0] : 'Your name')}" value="${esc(S.name)}" aria-describedby="nameMsg"><button type="submit" class="btn primary small-btn" ${S.nameBusy ? 'disabled' : ''}>${S.nameBusy ? 'Saving…' : 'Save'}</button></div>
        <div class="small name-msg${S.nameMsg && S.nameMsg.bad ? ' bad' : ''}" id="nameMsg" role="status">${S.nameMsg ? (S.nameMsg.bad ? '' : '<span class="ok-tick" aria-hidden="true">' + ICO.check + '</span>') + esc(S.nameMsg.t) : ''}</div></form>`;
      if (!window.LingerAccount || !LingerAccount.available()) body = nameCard + '<div class="card warn-card"><strong>Accounts aren’t available right now</strong><span class="small">Your words are still saved on this phone. Check your connection, then reopen Linger.</span></div>';
      else if (acct && acct.auth === 'loading') body = nameCard + LingerAccount.card({ inSheet: true });
      else body = nameCard + (email ? LingerAccount.security() : '') + LingerAccount.card({ inSheet: true });
    } else if (sec === 'laptop') {
      body = `<div class="card prof-ext"><strong>${email ? 'Syncs with your account' : 'Sign in to sync'}</strong>
        <span class="small">${email ? 'Sign in to the Linger Chrome extension with this same account, and words you save there show up here by themselves. No code needed.' : 'Sign in here and in the Linger Chrome extension with the same account, and your words sync by themselves.'}</span>
        <span class="small">Not working? Connect with a code instead:</span></div>
      ${syncCard()}`;
    } else if (sec === 'setup') {
      body = !S.prefs.done || !S.prefs.level ? `<div class="acct-setup acct-start"><strong>Finish setting up Linger</strong>
          <span>3 quick questions: what you read, your languages, and your English level (with an optional English check).</span>
          <button type="button" class="btn primary small-btn" data-action="onb-first">Set up now</button></div>` : `<div class="acct-setup">
          <div class="acct-setup-h"><strong>Reading setup</strong><button type="button" class="link-btn" data-action="onb-edit">Change</button></div>
          ${row('Reading', readsLabel() || 'Not set yet')}
          ${row(S.langs.length > 1 ? 'Languages' : 'Language', S.langs.length ? langsLabel() + ' + English' : 'Simple English')}
          ${row('English level', lvl && lvl[0] !== 'unsure' ? LEVEL_NAME[lvl[0]] : 'Not set yet')}
          <button type="button" class="link-btn acct-test" data-action="level-test">${S.prefs.test ? 'Retake the English check' : 'Not sure? Take the English check'}</button></div>`;
    }
    return `${head}<div class="body set-body prof-body">${body}</div>`;
  }

  // A square, small profile picture (it's stored in the account, so keep it to a few KB).
  const squarePhoto = (src) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const n = 160, c = document.createElement('canvas'), side = Math.min(img.width, img.height);
      c.width = c.height = n;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, n, n);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = rej; img.src = src;
  });
  // Kept on the phone too, so the picture shows right away (before the account answers, or offline).
  const photoCache = (email, v) => { try { if (v === undefined) return localStorage.getItem('linger.photo.' + email) || ''; if (v) localStorage.setItem('linger.photo.' + email, v); else localStorage.removeItem('linger.photo.' + email); } catch {} return ''; };

  // ---------- onboarding: three short questions the first time ----------
  // 1. What they read (any of six, "Everything" alone, or "Something else" with their own words).
  // 2. Their languages: a dropdown where they can pick up to three (none = Simple English).
  // 3. Their English level, or "Not sure" → a quick English check (entest.js) that suggests a level they can accept
  //    or overrule. The answers change the app: see READS, LEVELS and setLangs.
  function deviceLang() {
    for (const t of navigator.languages || [navigator.language || '']) {
      if (/^zh/i.test(t)) return /hant|tw|hk|mo/i.test(t) ? 'zh-Hant' : 'zh';
      const b = String(t).split('-')[0].toLowerCase();
      if (b && b !== 'en' && langOf(b)) return b;
    }
    return '';
  }
  const glyph = (l) => { const g = [...l.own]; return /[A-Za-z]/.test(g[0]) ? g[0] + (g[1] || '') : g[0]; };
  const prefsOut = () => ({ reads: S.prefs.reads, other: S.prefs.other || '', level: S.prefs.level, test: S.prefs.test || null, lang: S.lang, langs: S.langs, at: S.prefs.at });
  function startOnb(edit, step = 0) {
    S.onb = { step, reads: [...S.prefs.reads], other: S.prefs.other || '', langs: edit ? [...S.langs] : S.langs.length ? [...S.langs] : okLangs([deviceLang()]),
      langOpen: false, q: '', level: S.prefs.level, test: null, suggested: '', edit: !!edit };
  }
  function setLangs(list) {
    S.langs = okLangs(list); S.lang = S.langs[0] || '';
    try { localStorage.setItem(LANGS_KEY, JSON.stringify(S.langs)); localStorage.setItem(LANG_KEY, S.lang); } catch {}
  }
  function savePrefs(p) {
    S.prefs = { ...S.prefs, ...p, at: Date.now() };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(S.prefs)); } catch {}
    if (window.LingerAccount) LingerAccount.saveProfile({ prefs: prefsOut() });
  }
  function finishOnb(skipped) {
    const o = S.onb;
    if (!skipped) setLangs(o.langs);
    savePrefs(skipped ? { done: true } : { reads: o.reads, other: o.reads.includes('other') ? o.other.trim().slice(0, 80) : '', level: o.level, test: o.testResult || S.prefs.test || null, done: true });
    if (firstRead() && S.scan.status === 'idle') S.lensMode = firstRead()[3];
    S.onb = null;
    if (o.edit) { showToast('Reading setup saved'); return; }
    S.tab = 'lens';
    // New here and not signed in: the last part of setup is the "make a profile" pop-up (they can say Not now).
    const st = acctState();
    if (window.LingerAccount && LingerAccount.available() && st && st.auth !== 'in') { LingerAccount.openForm(remembered() ? 'in' : 'up'); S.acct = true; S.acctPitch = true; return; }
    showToast(skipped ? 'Set it up anytime from your picture ↗' : 'All set!');
  }
  const levelName = (id) => (LEVELS.find((l) => l[0] === id) || [])[2] || '';
  const LEVEL_SAYS = {
    beginner: 'Everyday words are fine. Linger will underline more words and explain them simply.',
    intermediate: 'Everyday English is fine, but formal words in letters, forms and leases slow you down. Linger underlines those.',
    advanced: 'You read most English well. Linger only underlines rare words, legal words and local slang.'
  };
  const backIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  const onbOpt = (on, ic, title, sub, action, v, multi, attrs = '') => `<button type="button" class="onb-opt${on ? ' on' : ''}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}" data-action="${action}" data-v="${esc(v)}">
      ${ic ? `<span class="onb-ic" aria-hidden="true">${ic}</span>` : ''}<span class="onb-txt"><strong ${attrs}>${esc(title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="onb-check${multi ? ' box' : ''}" aria-hidden="true"></span></button>`;
  // The page: header (title, progress), white sheet (body), and the buttons at the bottom.
  const onbFrame = ({ title, sub, kicker = '', dots, top, body, foot, label }) => `<div class="onb" role="dialog" aria-modal="true" aria-labelledby="onbT">
      <header class="onb-hero">
        <div class="onb-rings" aria-hidden="true"><img src="icons/figma/rings-words.svg" width="351.387" height="351.387" alt=""></div>
        <div class="onb-top">${logo}${top}</div>
        ${dots}${kicker ? `<div class="onb-kicker">${esc(kicker)}</div>` : ''}
        <h1 id="onbT">${title}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}
      </header>
      <div class="onb-body" ${label ? `aria-label="${esc(label)}"` : ''}>${body}</div>
      <div class="onb-foot">${foot}</div></div>`;
  function viewOnb() {
    const o = S.onb;
    if (o.test) return viewTest();
    const step = o.step;
    const dots = `<div class="onb-dots" role="img" aria-label="Question ${step + 1} of 3">${[0, 1, 2].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    let title, sub, body, can = true;
    if (step === 0) {
      title = 'What do you need help reading?'; sub = 'Pick all that apply.';
      body = `<div class="onb-list" role="group" aria-labelledby="onbT">${READS.map((r) => onbOpt(o.reads.includes(r[0]), '', r[2], r[0] === 'all' ? 'A bit of everything' : '', 'onb-read', r[0], true)).join('')}</div>
        ${o.reads.includes('other') ? `<label class="onb-field"><span>What do you read?</span><input id="onbOther" type="text" maxlength="80" placeholder="For example: school notes, recipes, contracts" value="${esc(o.other)}" autocomplete="off"></label>` : ''}`;
      can = o.reads.length > 0 && (!o.reads.includes('other') || !!o.other.trim());
      const st = acctState();
      if (!o.edit && st && st.auth === 'out') body += '<p class="onb-have">Used Linger on another device? <button type="button" class="link-btn" data-action="onb-signin">Sign in</button></p>';
    } else if (step === 1) {
      title = 'Which languages do you speak?'; sub = 'Linger always teaches the English, and shows meanings in your languages too.';
      const chips = o.langs.map((c) => { const l = langOf(c); return `<span class="onb-chip" lang="${esc(c)}" dir="auto">${esc(l.own)}<button type="button" data-action="onb-lang" data-v="${esc(c)}" aria-label="Remove ${esc(l.name)}">✕</button></span>`; }).join('');
      const q = o.q.trim().toLowerCase();
      const list = LANGS.filter((l) => l.code !== 'en' && (!q || l.name.toLowerCase().includes(q) || l.own.toLowerCase().includes(q)));
      body = `<div class="onb-dd${o.langOpen ? ' open' : ''}">
          <button type="button" class="onb-dd-btn" data-action="onb-dd" aria-haspopup="listbox" aria-expanded="${o.langOpen}">
            <span>${o.langs.length ? `${o.langs.length} selected` : 'Choose languages'}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
          ${o.langOpen ? `<div class="onb-dd-panel"><label class="search onb-search"><input id="onbQ" type="search" placeholder="Search languages" value="${esc(o.q)}" aria-label="Search languages"></label>
            <div class="onb-dd-list" role="listbox" aria-multiselectable="true" aria-label="Languages">${list.map((l) => { const on = o.langs.includes(l.code); return `<button type="button" class="onb-dd-row${on ? ' on' : ''}" role="option" aria-selected="${on}" data-action="onb-lang" data-v="${l.code}"><span class="onb-check box" aria-hidden="true"></span><span class="onb-dd-txt"><strong lang="${l.code}" dir="auto">${esc(l.own)}</strong>${l.own === l.name ? '' : `<small>${esc(l.name)}</small>`}</span></button>`; }).join('') || '<div class="small" style="padding: 12px">No language matches. Try its English name.</div>'}</div></div>` : ''}
        </div>
        <div class="onb-chips">${chips || '<span class="onb-none">None picked: Linger explains in <b>Simple English</b>.</span>'}</div>
        ${o.langs.length > 1 ? '<p class="onb-hint">Summaries use the first one. Word meanings show in each.</p>' : ''}`;
    } else {
      title = 'Your English level'; sub = 'It sets which words Linger underlines. You can change it anytime.';
      // The English check comes first, as its own card with a button, so people who don't know their level find it.
      const picked = o.level && o.level !== 'unsure' ? o.level : '';
      body = `<div class="onb-why" role="note"><strong>Why Linger asks</strong>
          <ul><li>It decides <b>which words get underlined</b>, so you don’t see every word marked, or miss the hard ones.</li>
          <li>It sets <b>how simply</b> meanings and summaries are written.</li>
          <li>It picks <b>which words to practice</b> in Review.</li></ul>
          <span>It isn’t a grade. Nobody else sees it, and you can change it anytime.</span></div>
        <div class="onb-test-card onb-test-top"><strong>Not sure? Take the English check</strong>
          <span>About 4 minutes: tap whether you know some words, then answer 10 questions about meanings. Linger suggests a level, and you decide.</span>
          <button type="button" class="btn primary small-btn" data-action="test-start">Take the English check</button></div>
        ${o.suggested ? `<p class="onb-hint">The check suggested <b>${esc(levelName(o.suggested))}</b>. Pick the one that fits you.</p>` : ''}
        <p class="onb-or" id="onbLvl">Or choose your level</p>
        <div class="onb-list" role="radiogroup" aria-labelledby="onbLvl">${LEVELS.filter((l) => l[0] !== 'unsure').map((l) => onbOpt(picked === l[0], l[1], l[2], l[3], 'onb-level', l[0], false)).join('')}</div>`;
      can = !!picked;
    }
    const foot = `${step > 0 ? `<button type="button" class="lh-round onb-back" data-action="onb-back" aria-label="Back">${backIcon}</button>` : ''}
      <button type="button" class="btn primary lh-cta" data-action="onb-next" ${can ? '' : 'disabled'}>${step < 2 ? 'Continue' : o.edit ? 'Save' : 'Start reading'}</button>`;
    return onbFrame({ title: esc(title), sub, kicker: step === 0 && !o.edit ? 'Welcome to Linger' : '', dots, top: `<button type="button" class="onb-skip" data-action="onb-skip">${o.edit ? 'Cancel' : 'Skip'}</button>`, body, foot });
  }
  // The English check (entest.js): part 1 "Do you know this word?" taps, part 2 meaning questions, then the suggested
  // level to accept or overrule.
  function viewTest() {
    const o = S.onb, t = o.test.t, T = window.LingerTest;
    const n = T.progress(t) + 1, stop = '<button type="button" class="onb-skip" data-action="test-stop">Stop</button>';
    const bar = (done) => `<div class="onb-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${T.QUESTIONS}" aria-valuenow="${done}" aria-label="${done} of ${T.QUESTIONS} answered"><span style="width:${done / T.QUESTIONS * 100}%"></span></div>`;
    if (t.phase === 'words') {
      const w = t.yn[t.i].w, part1 = t.yn.length;
      const body = `<div class="yn-card"><span class="yn-n">Word ${t.i + 1} of ${part1}</span><p class="yn-word" lang="en">${esc(w)}</p></div>
        <p class="yn-note">Some of these words are made up. Only say yes if you know what it means.</p>`;
      return onbFrame({ title: 'Do you know this word?', sub: 'Part 1 of 2 · quick taps', dots: bar(n - 1), label: 'Word', top: stop, body,
        foot: `<button type="button" class="btn white lh-cta onb-no" data-action="test-word" data-v="no">No</button><button type="button" class="btn primary lh-cta" data-action="test-word" data-v="yes">Yes, I know it</button>` });
    }
    if (!o.test.res) {
      const q = t.q, k = t.asked.length + 1, re = new RegExp(`\\b(${q.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
      const body = `<div class="test-q"><p class="test-s">“${esc(q.s).replace(re, '<b>$1</b>')}”</p><p class="test-ask">What does <b>${esc(q.w)}</b> mean here?</p></div>
        <div class="onb-list" role="radiogroup" aria-label="Answers">${q.choices.map((c, i) => `<button type="button" class="onb-opt test-opt" data-action="test-answer" data-v="${esc(c)}"><span class="onb-ic" aria-hidden="true">${'ABCD'[i]}</span><span class="onb-txt"><strong>${esc(c)}</strong></span></button>`).join('')}
          <button type="button" class="test-idk" data-action="test-answer" data-v="">I don’t know</button></div>`;
      return onbFrame({ title: 'What does it mean here?', sub: `Part 2 of 2 · question ${k} of 10. Don’t guess: “I don’t know” helps Linger more.`, dots: bar(n - 1), label: 'Question', top: stop, body,
        foot: '<p class="test-foot">Almost done · it only sets your starting level</p>' });
    }
    const r = o.test.res, L = LEVELS.find((l) => l[0] === r.level);
    const body = `<div class="test-res"><span class="onb-ic test-res-ic" aria-hidden="true">${L[1]}</span>
        <div><div class="test-res-lvl">${esc(L[2])}</div><div class="small">About ${r.cefr} on the CEFR scale</div></div></div>
      <div class="test-detail">
        <div><b>${r.words.toLocaleString('en-US')}</b><span>of the 5,000 most common English words you probably know</span></div>
        <div><b>${r.right} of ${r.total}</b><span>meanings right in context</span></div></div>
      ${r.overclaim ? '<p class="test-warn">You said yes to some made-up words, so Linger relied more on part 2.</p>' : ''}
      <p class="test-says">${esc(LEVEL_SAYS[r.level])}</p>
      <p class="test-q2">Does this sound like you?</p>`;
    return onbFrame({ title: 'Your result', sub: 'Linger’s best guess from your answers.', dots: bar(T.QUESTIONS),
      top: '<button type="button" class="onb-skip" data-action="test-stop">Back</button>', body,
      foot: `<button type="button" class="btn white lh-cta onb-no" data-action="test-disagree">No, I’ll choose</button><button type="button" class="btn primary lh-cta" data-action="test-agree">Yes, that’s me</button>` });
  }

  // ---------- views ----------
  const rings = (a) => a.map(([cls, st]) => `<span class="${cls}" style="${st}"></span>`).join('');
  const heroDeco = rings([['ring', 'width:190px;height:190px;right:-50px;top:-70px'], ['dot', 'width:78px;height:78px;right:24px;top:-18px']]);
  const hero = (title, sub, over) => `<header class="hero">${heroDeco}
    <div class="hero-top">${logo}</div>
    ${over ? `<div class="over">${pin}${esc(over)}</div>` : ''}
    <h1>${esc(title)}</h1>${sub ? `<div class="hsub">${esc(sub)}</div>` : ''}</header>`;

  // Lens (Figma: "final draft · Lens home"): a viewfinder with the scan frame and capture button. The camera only
  // turns on when the capture button is tapped. After a scan, upload or paste, the results show on the same screen.
  const gear = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  const flipIcon = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7h-3.2l-1.6-2.4A1.3 1.3 0 0 0 14.1 4H9.9a1.3 1.3 0 0 0-1.1.6L7.2 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M8.5 12.5a3.6 3.6 0 0 1 6.2-2"/><path d="M15.5 13.5a3.6 3.6 0 0 1-6.2 2"/><path d="M15 8.4v2.3h-2.3"/><path d="M9 17.6v-2.3h2.3"/></svg>';
  // Lens header and mode switch, from Figma "final draft · Lens home v2 (Words style)" (node 257:545):
  // the same header as Words (gradient, rings, logo, 36px title, subtitle), then the switch on the white sheet.
  const lensHero = () => `<header class="hero wh lh2">
      <div class="wh-rings" aria-hidden="true"><img src="icons/figma/rings-words.svg" width="351.387" height="351.387" alt=""></div>
      ${logo}<div class="lh-topbar"><button type="button" class="lh-lang" data-action="lang-open" aria-label="Your language: ${esc(langLabel())}. Change it">${ICO.globe}<span ${S.lang ? langAttrs() : ''}>${esc(S.lang ? langLabel() : 'Language')}</span></button><button type="button" class="lh-gear" data-action="settings" aria-label="Settings">${gear}</button>${avatarBtn()}</div>
      <div class="wh-title"><div class="wh-row"><h1>Lens</h1></div></div>
    </header>`;
  const lensSwitch = (mode) => `<div class="lh-switch" role="group" aria-label="How to read something">
        ${[['scan', 'Scan'], ['upload', 'Upload a photo'], ['paste', 'Paste text']].map(([m, l]) => `<button type="button" class="lh-seg ${mode === m ? 'on' : ''}" data-action="lens-mode" data-v="${m}" aria-pressed="${mode === m}">${l}</button>`).join('')}
      </div>`;
  const camIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  // Lens: one screen. The switch changes what's in the card (camera, a photo picker or a text box), and whatever
  // Linger reads shows up in that same card, so there are no extra pages or pop-ups to find your way back from.
  const imgIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/></svg>';
  const sparkIcon = '<img src="icons/figma/sparkle.svg" width="19.534" height="20.078" alt="">';
  function viewLens() {
    const sc = S.scan, mode = S.lensMode;
    const reading = sc.status === 'reading', done = sc.status === 'done' && !!TEXTS.camera;
    let card, cta;
    if (reading) {
      card = `<div class="lh-card lh-reading"><img class="lh-photo" src="${sc.img}" alt="Your photo"><span class="lh-scanline" aria-hidden="true"></span><p class="lh-hint">${sc.page > 1 ? `Page ${sc.page}: ` : ''}<span id="scanStage">${scanStage(sc.progress)}</span> <span id="scanPct">${sc.progress}%</span></p></div>`;
      cta = `<button type="button" class="btn primary lh-cta" disabled>Reading…</button>`;
    } else if (done) {
      const active = S.pending || S.sheet, speaking = S.speaking === 'lens';
      const boxes = sc.img && sc.boxes && sc.boxes.length === tokens().length ? sc.boxes : null;
      const picture = boxes && S.shotView !== 'text';
      const toks = tokens().map((raw, i) => {
        if (!raw) return '';
        const k = keyOf(raw);
        const hard = k && isHard(k) && !learned(k);
        const cls = `tok${hard ? ' hard' : ''}${hard && S.seenToks.has(k) ? ' seen' : ''}${active && k === active ? ' on' : ''}${FX.ink === i ? ' ink' : ''}`;
        if (!picture) return `<button type="button" class="${cls}" data-action="word" data-i="${i}">${esc(raw)}</button>`;
        // On the photo: a see-through button over the word itself, a little bigger than the word so it's easy to hit.
        const b = boxes[i], px = Math.min(0.8, b.h * 0.25), py = b.h * 0.3;
        return `<button type="button" class="${cls} hot" data-action="word" data-i="${i}" style="--d:${Math.round(b.y * 6)};left:${(b.x - px).toFixed(2)}%;top:${(b.y - py).toFixed(2)}%;width:${(b.w + 2 * px).toFixed(2)}%;height:${(b.h + 2 * py).toFixed(2)}%">${esc(raw)}</button>`;
      }).join('');
      let autos = [];
      if (S.autoHard) { autos = [...new Set(tokens().map(keyOf))].filter((k) => k && PLAIN[k]).slice(0, 8); autos.forEach((k) => makeEntry(k, TEXTS.camera, SCAN_PLACE)); }
      card = `<div class="lh-card lh-result">
          <div class="lh-rhead"><span>${ORIGIN_LABEL[sc.origin] || 'Your text'}${sc.pages > 1 ? ` · ${sc.pages} pages` : ''}</span><span class="lh-rspace"></span>${boxes ? `<span class="lh-views" role="group" aria-label="Show as"><button type="button" class="${picture ? 'on' : ''}" data-action="shot-view" data-v="picture" aria-pressed="${!!picture}">Picture</button><button type="button" class="${picture ? '' : 'on'}" data-action="shot-view" data-v="text" aria-pressed="${!picture}">Text</button></span>` : ''}<button type="button" class="lh-clear" data-action="lens-clear">Clear</button></div>
          <p class="lh-tip">Tap a word. Press and drag across words to explain a phrase.</p>
          ${isImportant(TEXTS.camera) ? importantCard(SUMMARY.camera && SUMMARY.camera.dates) : ''}
          ${sc.notEnglish ? `<div class="lh-notice" role="note"><strong>This may not be English</strong><span>Linger reads printed English. Handwriting and other languages often come out wrong.</span><span class="lh-acts">${S.lang ? `<button type="button" class="link-btn" data-action="text-tr">${S.textTr ? 'Hide the translation' : 'Translate it into ' + esc(langOf(S.lang).own)}</button>` : '<button type="button" class="link-btn" data-action="lang-open">Pick your language to translate it</button>'}${sc.origin === 'camera' ? '<button type="button" class="link-btn" data-action="retake">Retake</button>' : ''}</span></div>` : ''}
          ${picture ? `<div class="lh-shot${FX.shot ? ' fresh' : ''}"><img src="${sc.img}" alt="${esc(ORIGIN_LABEL[sc.origin] || 'Your photo')}. The words on it are buttons.">${toks}</div>` : `<div class="lh-text">${toks}</div>`}
          ${S.textTr && S.lang ? textTrBox() : ''}
          ${sc.conf && sc.conf < 60 ? `<div class="lh-warn" role="note"><span>Some words may be wrong. Tap a word to fix it, or take a flatter, brighter photo.</span>${sc.origin === 'camera' ? '<button type="button" class="link-btn" data-action="retake">Retake</button>' : ''}</div>` : ''}
          <div class="lh-more">${sc.origin === 'camera' || sc.origin === 'upload' ? '<button type="button" class="link-btn" data-action="add-page">+ Add another page</button>' : ''}${keepScans() && !sc.noKeep ? '<button type="button" class="link-btn lh-forget" data-action="forget-scan">Don’t keep this scan</button>' : '<span class="small">Not kept on this phone</span>'}</div>
          ${autos.length ? `<p class="lh-sub">Hard words here</p><div class="lh-chips">${autos.map((k) => `<button type="button" class="lh-chip" data-action="open" data-k="${k}">${esc(cap(D[k].word))}</button>`).join('')}</div>` : ''}
        </div>`;
      cta = `<div class="lh-ctarow"><button type="button" class="btn primary lh-cta" data-action="explain">${sparkIcon}Explain this text</button>
          <button type="button" class="lh-round ${speaking ? 'on' : ''}" data-action="read" ${canSpeak ? '' : 'disabled'} aria-label="${speaking ? 'Stop reading' : 'Read aloud'}">${speaker}</button></div>`;
    } else if (mode === 'upload') {
      card = `<label class="lh-card lh-drop" for="photo">
          <span class="lh-dropic">${imgIcon}</span>
          <strong>Choose a photo</strong>
          <span>A letter, sign or bill from your photos</span>
          ${sc.status === 'error' && sc.origin === 'upload' ? `<span class="lh-err" role="alert">${esc(sc.msg)}</span>` : ''}
          ${S.addPage ? `<span class="small">Adding page ${S.addPage.pages + 1} to your scan</span>` : ''}
        </label>`;
      cta = `<label class="btn primary lh-cta" for="photo">${imgIcon}Choose photo</label>`;
    } else if (mode === 'paste') {
      const clip = !!(navigator.clipboard && navigator.clipboard.readText);
      card = `<div class="lh-card lh-pastecard">
          <textarea id="pasteText" class="lh-paste" placeholder="Paste a letter, email or message here" aria-label="Text to explain">${esc(S.pasteDraft)}</textarea>
          ${clip ? `<button type="button" class="lh-pastebtn" data-action="paste-clip" ${S.pasteDraft ? 'hidden' : ''}>Paste</button>` : ''}
        </div>`;
      cta = `<button type="button" class="btn primary lh-cta" id="pasteGo" data-action="paste-go" ${S.pasteDraft.trim() ? '' : 'disabled'}>${sparkIcon}Explain this text</button>`;
    } else {
      const live = sc.status === 'live', corners = '<i class="k k1"></i><i class="k k2"></i><i class="k k3"></i><i class="k k4"></i>';
      const err = sc.status === 'error' && sc.origin !== 'upload';
      const hint = live ? (S.addPage ? `Page ${S.addPage.pages + 1}: fit the whole page inside the frame` : 'Fit the whole page inside the frame') : '';
      const ce = err && sc.camErr ? CAM_ERR[sc.camErr] : null, rt = err && sc.reason ? RETAKE[sc.reason] : null;
      const settingsHelp = sc.camErr !== 'denied' ? '' : SHELL_BUILD >= 2 ? '<button type="button" class="btn small-btn" data-action="open-settings">Open Settings</button>'
        : BETA && BETA.native ? '<p class="small">Open the Settings app, tap <b>Linger</b>, then turn on <b>Camera</b>.</p>' : '<p class="small">Allow the camera for this site in your browser’s settings (the icon next to the address), then tap Try again.</p>';
      const inside = ce ? `<div class="lh-blocked" role="alert"><strong>${esc(ce[0])}</strong><p>${esc(ce[1])}</p>${settingsHelp}
            <div class="lh-alt"><button type="button" class="btn small-btn" data-action="lens-mode" data-v="upload">Upload a photo</button><button type="button" class="btn small-btn" data-action="lens-mode" data-v="paste">Paste text</button></div></div>`
        : rt ? `<div class="lh-blocked lh-retake" role="alert">${sc.img ? `<img class="lh-thumb" src="${sc.img}" alt="The photo Linger couldn’t read">` : ''}<strong>${esc(rt[0])}</strong><p>${esc(rt[1])}</p>
            <div class="lh-alt"><button type="button" class="btn small-btn" data-action="lens-mode" data-v="upload">Upload instead</button>${S.addPage ? '<button type="button" class="btn small-btn" data-action="add-page-cancel">Back to your scan</button>' : ''}</div></div>`
        : err ? `<div class="lh-empty"><p>${esc(sc.msg)}</p></div>` : '';
      const last = !live && !err && !S.addPage ? lastScan() : null;
      let busy = null; try { busy = Number(localStorage.getItem(SCAN_BUSY) || 0); } catch {}
      const resume = busy && Date.now() - busy < 86400000 && S.scan.status !== 'reading' ? `<div class="lh-resume" role="status"><span><strong>Your last scan didn’t finish</strong><span class="small">The app closed while Linger was reading it.</span></span><button type="button" class="link-btn" data-action="resume-dismiss">OK</button></div>`
        : last && last.text ? `<div class="lh-resume"><span><strong>Your last scan</strong><span class="small">${esc(ORIGIN_LABEL[last.origin] || 'Scan')}${last.pages > 1 ? ` · ${last.pages} pages` : ''} · ${ago(last.at)}</span></span><button type="button" class="btn small-btn" data-action="resume-open">Open</button><button type="button" class="lh-x" data-action="forget-scan" aria-label="Forget your last scan">✕</button></div>` : '';
      card = `${resume}<div class="lh-card">
          ${live ? '<video id="cam" playsinline muted autoplay></video>' : inside || '<div class="lh-empty"><p>Linger reads it and explains the hard words.</p></div>'}${S.addPage && !err ? '<button type="button" class="link-btn lh-cancel-page" data-action="add-page-cancel">Cancel adding a page</button>' : ''}
          ${inside ? '' : `<div class="lh-frame" id="camFrame">${corners}</div>`}
          ${hint ? `<p class="lh-hint">${hint}</p>` : ''}
          ${camCount !== 1 ? `<button type="button" class="lh-flip" data-action="cam-flip" aria-label="Switch to the ${facing === 'environment' ? 'front' : 'back'} camera">${flipIcon}</button>` : ''}
        </div>`;
      cta = `<button type="button" class="btn primary lh-cta" data-action="${rt ? 'retake' : 'shutter'}">${camIcon}${live ? 'Take photo' : rt ? 'Retake' : err ? 'Try again' : 'Turn on camera'}</button>`;
    }
    const shown = done || reading ? (sc.origin === 'upload' ? 'upload' : sc.origin === 'paste' || sc.origin === 'share' ? 'paste' : 'scan') : mode;
    return `<div class="lens-home lh2-home">${lensHero()}
      <div class="body wb lb${done ? ' lb-result' : ''}">
        ${lensSwitch(shown)}
        ${card}
        ${cta}
        <input type="file" accept="image/*" id="photo" hidden>
      </div></div>`;
  }

  // A list of sections (iOS-style): each row opens its own page, so there's never a wall of switches at once.
  // rows: [section id, icon, title, one-line summary]; act: the data-action each row uses.
  const menuList = (rows, act) => `<nav class="menu card" aria-label="Sections">${rows.map(([id, ic, t, sub, attrs]) =>
    `<button type="button" class="menu-row" ${/data-action=/.test(attrs || '') ? '' : `data-action="${act}" data-v="${id}"`} ${attrs || ''}><span class="menu-ic" aria-hidden="true">${ic}</span><span class="menu-txt"><strong>${t}</strong><span class="small">${sub}</span></span><span class="go" aria-hidden="true">›</span></button>`).join('')}</nav>`;
  const SET_SECS = { reading: 'Reading', display: 'Display', access: 'Accessibility', privacy: 'Privacy', beta: 'Beta' };
  // Settings (the gear on Lens, or from Profile): a menu of sections, then one section at a time.
  function viewSettings() {
    const sec = SET_SECS[S.setSec] ? S.setSec : null;
    const head = sec ? pageHero(SET_SECS[sec], 'data-action="set-sec" data-v=""', 'Back to Settings')
      : pageHero('Settings', 'data-action="set-close"', `Back to ${S.setFrom === 'profile' ? 'Profile' : 'Lens'}`);
    if (!sec) {
      const theme = { system: 'Match phone', light: 'Light', dark: 'Dark' }[A11Y.theme] || 'Match phone';
      const size = { 0.9: 'Small', 1: 'Default', 1.15: 'Large', 1.3: 'Largest' }[A11Y.text] || 'Default';
      const on = [A11Y.contrast && 'High contrast', A11Y.motion && 'Reduce motion', A11Y.filter !== 'none' && 'Color filter'].filter(Boolean);
      const rows = [
        ['reading', ICO.book, 'Reading', `${S.autoHard ? 'Underlines on' : 'Underlines off'} · ${esc(S.lang ? langLabel() : 'Simple English')}`],
        ['display', ICO.palette, 'Display', `${theme} · ${size} text`],
        ['access', ICO.access, 'Accessibility', on.length ? on.join(', ') : 'Contrast, motion and color filters'],
        ['privacy', ICO.lock, 'Privacy', signedInAs() ? 'Your data, your account and deleting it' : 'What Linger keeps and what it sends']
      ];
      if (BETA) rows.push(SHELL_BUILD && SHELL_BUILD < LATEST_SHELL ? ['beta', ICO.flask, 'Beta', 'App update ready in TestFlight', 'data-dot="1"'] : ['beta', ICO.flask, 'Beta', 'Send feedback, add to Home Screen']);
      return `${head}<div class="body set-body">${menuList(rows, 'set-sec')}
        <p class="small set-foot">Linger keeps these settings on this ${BETA && BETA.native ? 'iPhone' : 'device'}.</p></div>`;
    }
    const seg = (key, opts, cls = '') => `<div class="set-seg ${cls}" role="radiogroup">${opts.map(([v, l, aria]) => `<button type="button" class="${A11Y[key] === v ? 'on' : ''}" role="radio" aria-checked="${A11Y[key] === v}" data-action="a11y" data-k="${key}" data-v="${v}" ${aria ? `aria-label="${aria}"` : ''}>${l}</button>`).join('')}</div>`;
    const sw = (key, label, sub) => `<div class="switch-row"><div><strong>${label}</strong><span class="small">${sub}</span></div>
      <button type="button" class="switch" role="switch" aria-label="${label}" aria-checked="${!!A11Y[key]}" data-action="a11y-toggle" data-k="${key}"></button></div>`;
    const filters = [['none', 'None'], ['gray', 'Grayscale'], ['protan', 'Red-green (protanopia)'], ['deutan', 'Green-red (deuteranopia)'], ['tritan', 'Blue-yellow (tritanopia)']];
    let body = '';
    if (sec === 'reading') body = `
      <div class="card">
        <div class="switch-row"><div><strong>Underline hard words</strong><span class="small">Words that may be hard for your level get a dotted underline</span></div>
          <button type="button" class="switch" role="switch" aria-label="Underline hard words" aria-checked="${S.autoHard}" data-action="auto"></button></div>
      </div>
      <div class="card">
        <div class="switch-row"><div><strong>AI explanations</strong><span class="small">What a word means in its sentence, from Claude (an AI by Anthropic). Sends the word or highlight and its sentence to Linger’s server. Also used to translate when your phone can’t, and to make new city guides.</span></div>
          <button type="button" class="switch" role="switch" aria-label="AI explanations" aria-checked="${aiOK()}" data-action="ai-toggle"></button></div>
      </div>
      <button type="button" class="act share-card" data-action="lang-open"><span class="ic">${ICO.globe}</span><span><strong>My language</strong><span class="small" ${S.lang ? langAttrs() : ''}>${esc(langLabel())} · meanings and summaries also show in it</span></span><span class="go">›</span></button>
      <button type="button" class="act share-card" data-action="share-help"><span class="ic">${ICO.share}</span><span><strong>Use Linger in any app</strong><span class="small">${BETA && BETA.native ? 'Take a screenshot or select text, tap Share, then Linger' : 'Select text anywhere, tap Share, then “Explain with Linger”'}</span></span><span class="go">›</span></button>`;
    else if (sec === 'display') body = `
      <div class="card">
        <div class="set-row"><div><strong>Appearance</strong></div>${seg('theme', [['system', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        <div class="set-row"><div><strong>Text size</strong><span class="small">Makes the words bigger without changing the layout</span></div>
          ${seg('text', [[0.9, 'A', 'Small'], [1, 'A', 'Default'], [1.15, 'A', 'Large'], [1.3, 'A', 'Largest']], 'aa')}
          <div class="set-preview">Your rent is due on the 1st. Tap any word to see what it means.</div></div>
        <div class="set-row"><div><strong>Display zoom</strong><span class="small">Makes everything bigger, buttons too</span></div>
          ${seg('zoom', [[0.9, 'Smaller'], [1, 'Default'], [1.1, 'Larger'], [1.25, 'Largest']])}</div>
      </div>
      <button type="button" class="set-reset" data-action="a11y-reset">Reset display and accessibility</button>`;
    else if (sec === 'access') body = `
      <div class="card">
        ${sw('contrast', 'High contrast', 'Darker text, stronger outlines and solid underlines')}
        ${sw('motion', 'Reduce motion', 'Turns off animations. Also on when your phone’s Reduce Motion is on.')}
      </div>
      <div class="card">
        <div class="set-row"><div><strong>Color filter</strong><span class="small">Helps if some colors are hard to tell apart</span></div>
          <div class="filters" role="radiogroup">${filters.map(([v, l]) => `<button type="button" class="${v}${A11Y.filter === v ? ' on' : ''}" role="radio" aria-checked="${A11Y.filter === v}" data-action="a11y" data-k="filter" data-v="${v}"><span class="sw4" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${l}</button>`).join('')}</div></div>
      </div>
      <button type="button" class="set-reset" data-action="a11y-reset">Reset display and accessibility</button>`;
    else if (sec === 'privacy') body = privacySection();
    else if (sec === 'beta' && BETA) body = betaSettings();
    return `${head}<div class="body set-body">${body}</div>`;
  }
  // Settings → Privacy: the short version of the policy, where this person's words are, and how to delete them.
  function privacySection() {
    const email = signedInAs(), n = S.saved.filter((k) => D[k]).length;
    const words = n === 0 ? 'saved words' : n === 1 ? '1 saved word' : n + ' saved words';
    const pt = (ic, html) => `<li><span class="pv-ic" aria-hidden="true">${ic}</span><span>${html}</span></li>`;
    return `
      <div class="card pv-where"><span class="pv-ic" aria-hidden="true">${email ? ICO.cloud : ICO.phone}</span><div><strong>${email ? 'Saved in your account' : 'Saved on this device only'}</strong>
        <span class="small">${email ? `Your ${words}, reading setup and progress are in the account for ${esc(email)}. Only you can see them.` : `Your ${words}, settings and progress never leave this device unless you make an account.`}</span></div></div>
      <p class="set-label">In short</p>
      <ul class="card pv-list">
        ${pt(ICO.camera, '<strong>Photos stay on your phone.</strong> Linger reads the text on your device. The picture isn’t uploaded or kept.')}
        ${pt(ICO.spark, '<strong>Only what you ask about is sent.</strong> A word or phrase and its sentence go to Linger AI to explain it. It isn’t stored. You can turn AI explanations off in Settings → Reading.')}
        ${pt(ICO.mic, '<strong>The microphone is only on in Say it,</strong> and only while you’re saying a word.')}
        ${pt(ICO.ban, '<strong>No ads, no tracking.</strong> Linger doesn’t sell or share your data.')}
      </ul>
      <a class="act share-card" href="privacy.html"><span class="ic">${ICO.doc}</span><span><strong>Read the full privacy policy</strong><span class="small">What Linger keeps, what it sends, and to whom</span></span><span class="go">›</span></a>
      <p class="set-label">Your data</p>
      ${email
        ? `<button type="button" class="act share-card" data-action="prof-sec" data-v="account"><span class="ic">${ICO.trash}</span><span><strong>Delete account and data</strong><span class="small">In Profile → Account. Deletes your saved words, setup, progress and picture.</span></span><span class="go">›</span></button>`
        : S.pvClear
          ? `<div class="card pv-confirm"><strong>Clear everything on this device?</strong><span class="small">This deletes your ${words}, reading setup, progress, settings and city guides from this device. It can’t be undone.</span>
              <div class="grid2"><button type="button" class="btn" data-action="pv-clear" data-v="no">Cancel</button><button type="button" class="btn danger-btn" data-action="pv-clear" data-v="yes">Clear everything</button></div></div>`
          : `<button type="button" class="act share-card" data-action="pv-clear" data-v="ask"><span class="ic">${ICO.trash}</span><span><strong>Clear Linger data on this device</strong><span class="small">Saved words, setup, progress and settings</span></span><span class="go">›</span></button>`}`;
  }
  // ---------- beta ----------
  const planeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';
  // Feedback sent: a paper plane takes off across the top of the screen.
  function paperPlane() {
    if (calm()) return;
    const p = document.createElement('div'); p.className = 'plane-fly'; p.setAttribute('aria-hidden', 'true'); p.innerHTML = planeIcon;
    screenEl.appendChild(p); p.addEventListener('animationend', () => p.remove(), { once: true });
  }
  function betaSettings() {
    const queued = BETA.pending();
    const shellOld = SHELL_BUILD && SHELL_BUILD < LATEST_SHELL;
    return `<div class="beta-sec">
      ${shellOld ? '<a class="act share-card" href="itms-beta://"><span class="ic">' + ICO.update + '</span><span><strong>Update the Linger app</strong><span class="small">A newer version is ready in TestFlight. Open TestFlight and tap Update.</span></span><span class="go">›</span></a>' : ''}
      <button type="button" class="act share-card" data-action="beta-feedback"><span class="ic">${ICO.chat}</span><span><strong>Send feedback</strong><span class="small">Tell us what broke, what was confusing, or what you wish Linger did</span></span><span class="go">›</span></button>
      ${BETA.standalone() ? '' : `<button type="button" class="act share-card" data-action="beta-install"><span class="ic">${ICO.phone}</span><span><strong>Add Linger to your Home Screen</strong><span class="small">Then it opens full screen, like an app</span></span><span class="go">›</span></button>`}
      <p class="small beta-ver">Linger Beta ${esc(BETA.version)} · ${esc(BETA.date)}${BETA.standalone() ? ' · installed' : ''}${queued ? ` · <span class="plane-wait" aria-hidden="true">${planeIcon}</span>${queued} feedback ${queued === 1 ? 'message' : 'messages'} waiting to send` : ''}</p></div>`;
  }
  function betaOverlay() {
    let html = '';
    if (S.feedback) {
      const f = S.feedback, kinds = [['bug', 'Something broke'], ['idea', 'An idea'], ['other', 'Something else']];
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close feedback" data-action="beta-close"></button>
        <div class="panel" role="dialog" aria-labelledby="fbTitle"><div class="grab"></div>
          <div class="sheet-word" id="fbTitle" style="font-size: calc(26px * var(--ts, 1))">Send feedback</div>
          <div class="lh-switch" role="group" aria-label="What kind of feedback">${kinds.map(([id, l]) => `<button type="button" class="lh-seg ${f.kind === id ? 'on' : ''}" data-action="beta-kind" data-v="${id}" aria-pressed="${f.kind === id}">${esc(l)}</button>`).join('')}</div>
          <textarea id="fbText" class="paste-box" placeholder="${f.kind === 'bug' ? 'What happened? What did you expect?' : f.kind === 'idea' ? 'What would make Linger more useful for you?' : 'Tell us anything'}" aria-label="Your feedback">${esc(f.text)}</textarea>
          <label class="small fb-email">Email, if you'd like a reply (optional)<input id="fbEmail" type="email" autocomplete="email" value="${esc(f.email)}"></label>
          <p class="small">We also send your app version and phone type, so we can find the problem. Not your words or scans.</p>
          <button type="button" class="btn primary" id="fbSend" data-action="beta-send" ${f.text.trim() && !f.sending ? '' : 'disabled'}>${f.sending ? 'Sending…' : 'Send'}</button></div></div>`;
    }
    if (S.installHelp) {
      const ios = BETA.platform === 'ios';
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="beta-close"></button>
        <div class="panel" role="dialog" aria-labelledby="ihTitle"><div class="grab"></div>
          <div class="sheet-word" id="ihTitle" style="font-size: calc(26px * var(--ts, 1))">Add Linger to your Home Screen</div>
          ${ios ? `<ol class="beta-steps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button <span aria-hidden="true">(the square with an arrow)</span>.</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open Linger from your Home Screen.</li></ol>`
            : installEvt ? '<p>Tap <b>Install</b> and Linger will open full screen, like an app. It also shows up in your Share menu.</p>'
            : '<ol class="beta-steps"><li>In Chrome, tap <b>⋮</b> at the top right.</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Open Linger from your Home Screen.</li></ol>'}
          <div class="grid2"><button type="button" class="btn" data-action="beta-close">Not now</button>${!ios && installEvt ? '<button type="button" class="btn primary" data-action="install">Install</button>' : '<button type="button" class="btn primary" data-action="beta-close">Got it</button>'}</div></div></div>`;
    }
    // One-time tip on the phone, after setup, when Linger isn't on the Home Screen yet.
    if (S.installTip && !html && S.tab !== 'settings' && !S.coach && !S.sheet && !S.pending && !S.explain && !S.paste && !S.shareHelp && !S.langPick && !S.cityPick && !S.acct && !S.onb && !S.activity)
      html += `<div class="beta-tip" role="dialog" aria-label="Add Linger to your Home Screen"><span><strong>Add Linger to your Home Screen</strong> so it opens like an app.</span>
        <span class="coach-acts"><button type="button" class="link-btn" data-action="beta-tip-later">Later</button><button type="button" class="btn primary small-btn" data-action="beta-install">Show me</button></span></div>`;
    return html;
  }

  // How well they know a saved word: a short meter, the label, and why.
  // The level each word showed last time, so a word that moved up (Learning → Almost → Known) gets a small moment the
  // first time it's seen again: its bar fills from where it was, and Known gets a tick.
  const KN_KEY = 'linger.kn.shown', KN_RANK = { Learning: 0, Almost: 1, Known: 2 };
  const knShown = (() => { try { return JSON.parse(localStorage.getItem(KN_KEY) || '{}') || {}; } catch { return {}; } })();
  let knSaveT = null;
  function progress(k) {
    const e = know(k), pct = Math.round(e.p * 100);
    const why = !e.seen ? 'Not practiced yet' : e.right || e.wrong ? `${e.right} right · ${e.wrong} missed` : e.lookups ? `Looked up ${e.lookups === 1 ? 'once' : e.lookups + ' times'}` : 'Saved';
    const prev = knShown[k], up = prev && KN_RANK[e.label] > KN_RANK[prev[0]];
    if (!prev || prev[0] !== e.label || prev[1] !== pct) { knShown[k] = [e.label, pct]; clearTimeout(knSaveT); knSaveT = setTimeout(() => { try { localStorage.setItem(KN_KEY, JSON.stringify(knShown)); } catch {} }, 300); }
    return `<span class="kn kn-${e.label.toLowerCase()}${up ? ' kn-up' : ''}" aria-label="${e.label}: about ${pct}% sure you know it. ${why}${e.due ? '. Due for review' : ''}">
      <span class="kn-bar" aria-hidden="true"><span style="width:${Math.max(6, pct)}%${up ? `; --from:${Math.max(6, prev[1])}%` : ''}"></span></span><span class="kn-txt" aria-hidden="true">${up && e.label === 'Known' ? '<span class="kn-tick">✓</span>' : ''}<b>${e.label}</b> · ${why}${e.due ? ' · <i>Review today</i>' : ''}</span></span>`;
  }
  // ---------- Words calendar ----------
  // Save dates are kept as "Nov 18" (no year): it's this year, unless that would be in the future.
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function savedDay(k) {
    const t = S.savedDates[k]; if (!t) return null;
    const now = new Date(), d = new Date(`${t}, ${now.getFullYear()}`);
    if (isNaN(d)) return null;
    if (d > now) d.setFullYear(now.getFullYear() - 1);
    return dayKey(d);
  }
  const savedOn = () => { const m = {}; S.saved.forEach((k) => { if (!D[k]) return; const d = savedDay(k); if (d) m[d] = (m[d] || 0) + 1; }); return m; };
  const shownDay = () => (S.calDay ? new Date(...S.calDay.split('-').map((x, i) => (i === 1 ? x - 1 : +x))) : new Date());
  function weekStrip(counts) {
    const today = startOfDay(new Date()), sel = S.calDay || dayKey(today);
    const first = new Date(today); first.setDate(today.getDate() - today.getDay() + (S.calWeek || 0) * 7);
    const letters = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    const days = letters.map((l, i) => {
      const d = new Date(first); d.setDate(first.getDate() + i);
      const key = dayKey(d), n = counts[key] || 0, future = d > today;
      const label = `${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${n ? `, ${n} ${n === 1 ? 'word' : 'words'} saved` : ''}`;
      return `<button type="button" class="d${key === sel ? ' on' : ''}${key === dayKey(today) ? ' today' : ''}${future ? ' future' : ''}" data-action="cal-day" data-v="${key}" aria-label="${esc(label)}" aria-pressed="${key === sel}" ${future ? 'disabled' : ''}><span class="dl">${l}</span><span class="dn">${d.getDate()}</span>${n ? '<i class="dot" aria-hidden="true"></i>' : ''}</button>`;
    }).join('');
    const arrow = (dir, lbl) => `<button type="button" class="wk-arrow" data-action="cal-week" data-v="${dir}" aria-label="${lbl}" ${dir > 0 && (S.calWeek || 0) >= 0 ? 'disabled' : ''}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"${dir < 0 ? ' style="transform: scaleX(-1)"' : ''}><path d="M8 5v14l11-7z" fill="#FFFFFF"/></svg></button>`;
    return `<div class="week cal-week${FX.wk ? ' wk-' + FX.wk : ''}" id="calWeek">${arrow(-1, 'Previous week')}<div class="wk-days">${days}</div>${arrow(1, 'Next week')}</div>`;
  }
  function monthSheet(counts) {
    const today = startOfDay(new Date()), m = S.calMonth || { y: today.getFullYear(), m: today.getMonth() };
    const first = new Date(m.y, m.m, 1), len = new Date(m.y, m.m + 1, 0).getDate(), sel = S.calDay || dayKey(today);
    const cells = Array(first.getDay()).fill('<span></span>').concat(Array.from({ length: len }, (_, i) => {
      const d = new Date(m.y, m.m, i + 1), key = dayKey(d), n = counts[key] || 0, future = d > today;
      return `<button type="button" class="mc${key === sel ? ' on' : ''}${key === dayKey(today) ? ' today' : ''}${n ? ' has' : ''}" data-action="cal-pick" data-v="${key}" ${future ? 'disabled' : ''} aria-label="${esc(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))}${n ? `, ${n} saved` : ''}">${i + 1}${n ? `<i>${n}</i>` : ''}</button>`;
    }));
    const thisMonth = m.y === today.getFullYear() && m.m === today.getMonth();
    return `<div class="sheet"><button type="button" class="scrim" aria-label="Close calendar" data-action="cal-close"></button>
      <div class="panel cal-panel" role="dialog" aria-label="Pick a day"><div class="grab"></div>
        <div class="mc-head"><button type="button" class="mc-nav" data-action="cal-month" data-v="-1" aria-label="Previous month">‹</button><strong>${esc(first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</strong><button type="button" class="mc-nav" data-action="cal-month" data-v="1" aria-label="Next month" ${thisMonth ? 'disabled' : ''}>›</button></div>
        <div class="mc-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span class="mc-dow">${x}</span>`).join('')}${cells.join('')}</div>
        <p class="small mc-note">Numbers show how many words you saved that day.</p>
        <div class="grid2"><button type="button" class="btn" data-action="cal-all">Show all words</button><button type="button" class="btn primary" data-action="cal-today">Today</button></div></div></div>`;
  }

  // Show the week that has this day in the strip.
  function calWeekFor(key) {
    const [y, m, d] = key.split('-').map(Number), t = startOfDay(new Date());
    const thisSun = new Date(t); thisSun.setDate(t.getDate() - t.getDay());
    const day = new Date(y, m - 1, d), sun = new Date(day); sun.setDate(day.getDate() - day.getDay());
    S.calWeek = Math.round((sun - thisSun) / (7 * 86400000));
  }
  // Swipe the week strip left or right to move a week.
  let wkSwipe = null;
  document.addEventListener('pointerdown', (e) => { const w = e.target.closest && e.target.closest('#calWeek'); if (w) wkSwipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  document.addEventListener('pointerup', (e) => {
    const s = wkSwipe; wkSwipe = null; if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x; if (Math.abs(dx) < 45 || Math.abs(e.clientY - s.y) > Math.abs(dx)) return;
    const dir = dx < 0 ? 1 : -1; if (dir > 0 && (S.calWeek || 0) >= 0) return;
    S.calWeek = Math.min(0, (S.calWeek || 0) + dir); fx('wk', dir > 0 ? 'next' : 'prev'); buzz(6); swallowClick = true; render();
  });
  let swallowClick = false;
  document.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; if (e.target.closest && e.target.closest('#calWeek')) { e.stopPropagation(); e.preventDefault(); } } }, true);

  // Signed in: whether the words on this phone have reached the account yet.
  function syncLine() {
    const a = acctState(); if (!a || a.auth !== 'in') return '';
    const n = a.unsynced || 0, w = (x) => `${x} ${x === 1 ? 'word' : 'words'}`;
    const [cls, t] = !navigator.onLine ? ['wait', n ? `Offline. ${w(n)} will sync when you’re back online.` : 'Offline. Your words will sync when you’re back online.']
      : a.sync === 'error' ? ['bad', 'Words aren’t syncing right now. They’re safe on this phone.']
      : a.sync === 'syncing' || n ? ['wait', n ? `Syncing ${w(n)}…` : 'Syncing…'] : ['ok', 'All words synced'];
    return `<p class="sync-line ${cls}" role="status"><span class="dot" aria-hidden="true"></span>${t}</p>`;
  }
  function viewWords() {
    const q = S.query.trim().toLowerCase();
    const counts = savedOn();
    const list = S.saved.filter((k) => D[k])
      .filter((k) => !S.calDay || savedDay(k) === S.calDay)
      .filter((k) => S.wordFilter === 'all' || (S.wordFilter === 'hard' ? D[k].kind === 'hard' : D[k].kind !== 'hard'))
      .filter((k) => !q || D[k].word.includes(q) || D[k].meaning.toLowerCase().includes(q));
    const n = S.saved.length, known = S.saved.filter((k) => D[k] && know(k).label === 'Known').length;
    const now = shownDay();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const onDay = S.calDay ? counts[S.calDay] || 0 : 0;
    const filters = [['all', 'All words'], ['slang', 'Slang/customs'], ['hard', 'Hard words']];
    // Layout from Figma "final draft" (node 28:3330).
    return `<header class="hero wh">
      <div class="wh-rings" aria-hidden="true"><img src="icons/figma/rings-words.svg" width="351.387" height="351.387" alt=""></div>
      ${logo}${avatarBtn()}
      <div class="wh-title"><div class="wh-row"><h1>${esc(day)},<br> ${esc(date)}</h1><button type="button" class="cal" data-action="cal-open" aria-label="Open the calendar" aria-haspopup="dialog"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></button></div>
        <div class="hsub">${S.calDay ? `${onDay ? `${onDay} ${onDay === 1 ? 'word' : 'words'} saved this day` : 'No words saved this day'} · <button type="button" class="hsub-link" data-action="cal-all">Show all</button>` : `${n === 1 ? '1 word saved' : n + ' words saved'}${known ? ` · ${known} known` : ''}`}</div></div>
      ${weekStrip(counts)}
    </header>
    <div class="body wb">
      ${syncLine()}
      <label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="Search" value="${esc(S.query)}" aria-label="Search your words"></label>
      <div class="lh-switch" role="group" aria-label="Show which words">${filters.map(([id, l]) => `<button type="button" class="lh-seg ${S.wordFilter === id ? 'on' : ''}" data-action="filter" data-v="${id}" aria-pressed="${S.wordFilter === id}">${esc(l)}</button>`).join('')}</div>
      <div class="wlist">${list.length ? list.map((k) => { const e = D[k]; return `<button type="button" class="item" data-action="open" data-k="${k}">
        <span class="item-head"><span class="word">${esc(cap(e.word))}</span>${badge(e.kind)}</span>
        <span class="mean">${esc(e.meaning)}</span>
        <span class="quote">“${esc(e.sentence)}”</span>
        <span class="meta"><img src="icons/figma/pin.svg" width="12" height="12" alt="">${esc(placeOf(e))}</span>${progress(k)}</button>`; }).join('')
        : `<div class="empty">${q ? `<strong>No saved words match “${esc(S.query)}”</strong><button type="button" class="link-btn" data-action="clear-search">Clear search</button>` : S.calDay ? 'You didn’t save any words this day. Days with a dot have words.' : S.saved.length && S.wordFilter !== 'all' ? `<strong>No ${S.wordFilter === 'hard' ? 'hard words' : 'slang or customs'} saved yet</strong><button type="button" class="link-btn" data-action="filter" data-v="all">Show all words</button>` : '<strong>No saved words yet</strong><span>Scan or paste a letter, sign or message, tap a hard word, then tap Save. It shows up here.</span><button type="button" class="btn primary small-btn" data-action="tab" data-tab="lens">Go to Lens</button>'}</div>`}
</div>
      <div class="start-wrap"><button type="button" class="btn primary start" data-action="tab" data-tab="review"><img src="icons/figma/sparkle.svg" width="19.534" height="20.078" alt="">Start Activity</button></div>
    </div>`;
  }

  // ---------- Local: city guides (cities.js) ----------
  const CITIES = window.LINGER_CITIES || {};
  // Guides Linger AI wrote for cities the reader searched for (kept on this device).
  const CUSTOM_CITIES = 'linger.cities.custom';
  try { Object.assign(CITIES, JSON.parse(localStorage.getItem(CUSTOM_CITIES) || '{}')); } catch {}
  async function makeCity(q) {
    if (!aiOK()) { S.cityMake = { q, status: 'off' }; render(); return; }
    S.cityMake = { q, status: 'wait' }; render();
    try {
      const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Linger-Id': lingerId }, body: JSON.stringify({ mode: 'city', text: q }) });
      const j = r.ok ? await r.json() : null;
      if (!j || !('city' in j)) throw new Error('no answer');
      if (!j.city) { S.cityMake = { q, status: 'none' }; render(); return; }
      const c = j.city, same = Object.entries(CITIES).find(([, x]) => x.name.toLowerCase() === c.name.toLowerCase() && x.state === c.state);
      let id = same && same[0];
      if (!id) {
        id = 'c-' + (c.name + '-' + c.state).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        CITIES[id] = { ...c, ai: true };
        try { const all = JSON.parse(localStorage.getItem(CUSTOM_CITIES) || '{}'); all[id] = CITIES[id]; localStorage.setItem(CUSTOM_CITIES, JSON.stringify(all)); } catch {}
      }
      S.cityMake = null; S.cityQuery = ''; pickCity(id);
      showToast(same ? `${c.name} already has a guide` : `Linger wrote a guide for ${c.name}`);
    } catch { S.cityMake = { q, status: 'fail' }; }
    render();
  }
  const PGH_IC = { Winter: '🪑', 'Getting around': '🧭', Celebrations: '🍪', Sports: '🏈', Driving: '🚗' };
  const city = () => CITIES[S.city] || CITIES.pgh;
  const cityName = (c) => (c.name.includes(c.state.replace(/(.)(.)/, '$1.$2.')) ? c.name : `${c.name}, ${c.state}`); // "Washington, D.C.", not "…, DC"
  // Slang from other cities becomes a normal word entry, so Save and Words work the same everywhere.
  function citySlang(id) {
    if (id === 'pgh') return SLANG;
    const c = CITIES[id];
    return (c.slang || []).map((it) => { if (!D[it.k]) D[it.k] = { word: it.word, kind: 'slang', say: it.say, meaning: it.meaning, ctx: it.meaning, local: it.local, sentence: it.sentence, place: cityName(c), city: true }; return it.k; });
  }
  const cityCustoms = (id) => (id === 'pgh' ? CUSTOMS.map((x) => ({ ...x, ic: PGH_IC[x.tag] || '📌' })) : CITIES[id].customs || []);
  const distKm = (a, b, c2, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c2) / 2 * r), y = (c2 - a) * r; return Math.sqrt(x * x + y * y) * 6371; };
  function locateCity() {
    if (!navigator.geolocation) { showToast('Location isn’t available on this device'); return; }
    showToast('Finding where you are…');
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      const [best, km] = Object.entries(CITIES).map(([id, c]) => [id, distKm(la, lo, c.lat, c.lon)]).sort((p, q) => p[1] - q[1])[0];
      setCity(best);
      showToast(km < 120 ? `Showing ${CITIES[best].name}, near you` : `No guide here yet. Closest: ${CITIES[best].name}`);
      render();
    }, () => { S.cityPick = true; S.cityQuery = ''; showToast('Couldn’t get your location. Pick your city from the list.'); render(); }, { timeout: 10000, maximumAge: 600000 });
  }
  function setCity(id) { if (!CITIES[id]) return; S.city = id; S.cityPick = false; try { localStorage.setItem('linger.city', id); } catch {} }

  // Local: the same layout as Lens and Words (gradient header, white sheet, a switch, plain cards), in teal.
  const bookmarkIcon = (on) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
  const locateIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="#FFFFFF"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
  // Local: a simple city skyline along the bottom of the header (one drawing for every city).
  const skyline = '<svg class="loc-sky" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70V52h14V38h10v-8h8v8h10v14h12V24h6V14h4v10h6v46h8V44h18V30h8v-8h6v8h8v40h10V48h14V20l10-8 10 8v50h8V40h16v-6h10v6h6v30h10V28h6V16h8v12h6v42h10V46h20V36h12v34h8V52h14V30h10v-8h6v8h8v40h10V48h22v22z"/></svg>';
  const MIX_IC = { Letters: '📅', Weather: '🌡️', Buildings: '🏢', 'Eating out': '🍽️', 'Small talk': '👋', School: '✏️', Clothes: '👖', Sports: '🏈' };
  function viewLocal() {
    const c = city(), id = CITIES[S.city] ? S.city : 'pgh';
    const segs = [['slang', 'Slang'], ['customs', 'Customs'], ['around', 'Transit'], ['mixups', 'Mix-ups']];
    let note = '', items = '';
    if (S.localSeg === 'slang') {
      note = `Words you’ll hear around ${esc(c.name)}.`;
      items = citySlang(id).map((k, i) => { const e = D[k], sv = isSaved(k); return `<article class="loc-item loc-slang">
        <div class="item-head"><div class="loc-wl"><span class="loc-sticker s${i % 4}" aria-hidden="true">${esc((e.word || '?').charAt(0).toUpperCase())}</span><span class="word loc-word">${esc(e.word)}</span>${e.say ? `<span class="loc-say">/${esc(e.say)}/</span>` : ''}</div>
          <div class="loc-acts"><button type="button" class="loc-ic" data-action="hear" data-k="${k}" aria-label="Hear ${esc(e.word)}">${speaker}</button>
          <button type="button" class="loc-ic ${sv ? 'on' : ''}" data-action="save" data-k="${k}" aria-pressed="${sv}" aria-label="${sv ? 'Saved to Words' : 'Save to Words'}">${bookmarkIcon(sv)}</button></div></div>
        <span class="mean">${esc(e.meaning)}</span>
        <span class="quote">“${esc(e.sentence)}”</span>
        ${e.local ? `<span class="meta loc-meta">${pin}${esc(e.local)}</span>` : ''}</article>`; }).join('');
    } else if (S.localSeg === 'customs') {
      note = 'Unwritten rules that help you fit in.';
      items = cityCustoms(id).map((t, i) => `<article class="loc-item loc-tiled"><span class="loc-emo t${i % 4}" aria-hidden="true">${esc(t.ic || '📌')}</span><div class="loc-tx"><div class="item-head"><span class="loc-title">${esc(t.title)}</span><span class="badge b-loc">${esc(t.tag)}</span></div><span class="mean">${esc(t.body)}</span></div></article>`).join('');
    } else if (S.localSeg === 'around') {
      note = `How people get around ${esc(c.name)}, and the words on the signs.`;
      items = `<article class="loc-item loc-route">${(c.around || []).map((r) => `<div class="loc-stop"><span class="loc-emo stop" aria-hidden="true">${esc(r.ic || '🧭')}</span><div class="loc-tx"><span class="loc-title">${esc(r.title)}</span><span class="mean">${esc(r.body)}</span></div></div>`).join('')}</article>`;
    } else {
      note = 'Common mistakes newcomers make with everyday English in the US, and what to say instead.';
      items = MIXUPS.map((m) => `<article class="loc-item mx-item"><div class="item-head"><span class="loc-title"><span class="mx-emo" aria-hidden="true">${MIX_IC[m.tag] || '💡'}</span>${esc(m.title)}</span><span class="badge b-loc">${esc(m.tag)}</span></div>
          <div class="mx-row mx-no"><span class="mx-ic" aria-hidden="true">✕</span><span><span class="sr-only">Not quite: </span><span class="mx-t">${esc(m.no)}</span></span></div>
          <div class="mx-row mx-yes"><span class="mx-ic" aria-hidden="true">✓</span><span><span class="sr-only">In the US: </span>${esc(m.yes)}</span></div>
          <span class="mean">${esc(m.why)}</span></article>`).join('');
    }
    const ess = [['🚨', '911', 'Emergencies: police, fire, ambulance', 'red'], ['☎️', '311', 'City help: trash, noise, potholes', 'blue'], ['🚌', 'Transit', c.transit, 'teal'], ['💵', 'Tipping', '18–20% at sit-down restaurants', 'gold']];
    const segIc = { slang: '💬', customs: '🤝', around: '🚌', mixups: '🔀' };
    return `<header class="hero wh lh2 loc-hero">
      <div class="wh-rings" aria-hidden="true"><img src="icons/figma/rings-words.svg" width="351.387" height="351.387" alt=""></div>
      ${skyline}<span class="loc-badge" aria-hidden="true">${esc(c.emoji || '📍')}</span>
      ${logo}${avatarBtn()}
      <div class="wh-title"><div class="wh-row"><button type="button" class="loc-city" data-action="city-pick" aria-haspopup="dialog" aria-label="City: ${esc(cityName(c))}. Change city"><h1>${esc(c.name)}</h1><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
          <button type="button" class="lh-gear" data-action="city-locate" aria-label="Use my location">${locateIcon}</button></div>
        <div class="hsub">${esc(c.state)} · ${esc(c.nick)}</div></div>
    </header>
    <div class="body wb loc-body">
      <section class="loc-gk2" aria-labelledby="gkH"><h2 class="loc-h" id="gkH">Good to know</h2>
        <div class="gk-grid">${ess.map(([ic, t, d, col]) => `<div class="gk-tile ${col}"><span class="gk-ic" aria-hidden="true">${ic}</span><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`).join('')}</div></section>
      <div class="lh-switch loc-switch" role="group" aria-label="City guide sections">${segs.map(([v, l]) => `<button type="button" class="lh-seg ${S.localSeg === v ? 'on' : ''}" data-action="seg" data-v="${v}" aria-pressed="${S.localSeg === v}">${l}</button>`).join('')}</div>
      <p class="loc-note"><span class="loc-note-ic" aria-hidden="true">${segIc[S.localSeg] || '💡'}</span>${note}${c.ai && S.localSeg !== 'mixups' ? ' <span class="ai-note">Written by Linger AI. Double-check anything important.</span>' : ''}</p>
      <div class="wlist">${items}</div>
      <article class="loc-item loc-talk"><span class="talk-ic" aria-hidden="true">💬</span><div class="loc-tx"><span class="loc-title">Small talk starter</span><span class="talk-bubble">${esc(c.talk)}</span></div></article>
    </div>`;
  }

  // Review: the Lens/Words layout. Two activities you can do now; what's coming is one quiet card.
  const storyIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M4 11h7M4 16h5"/><rect x="13" y="13" width="7" height="5" rx="1.5" stroke-dasharray="2 2"/></svg>';
  function viewReview() {
    const n = S.saved.filter((k) => D[k]).length, words = `${n} ${n === 1 ? 'word' : 'words'}`;
    const due = S.saved.filter((k) => D[k] && know(k).due).length;
    const tricky = trickyWords();
    const act = (id, icon, title, sub, attrs = '') => `<button type="button" class="rv-act" data-action="play" data-v="${id}" ${attrs}>
        <span class="rv-ic" aria-hidden="true">${icon}</span>
        <span class="rv-txt"><span class="rv-title">${title}</span><span class="mean">${sub}</span></span>
        <span class="rv-go">Start</span></button>`;
    return `<header class="hero wh lh2">
      <div class="wh-rings" aria-hidden="true"><img src="icons/figma/rings-words.svg" width="351.387" height="351.387" alt=""></div>
      ${logo}${avatarBtn()}
      <div class="wh-title"><div class="wh-row"><h1>Review</h1></div>
        <div class="hsub">${!n ? 'Save words to practice them here' : due ? `${due} ${due === 1 ? 'word' : 'words'} to review today` : `${words} ready to practice`}</div></div>
    </header>
    <div class="body wb rv-body">
      ${!n ? '<div class="empty rv-empty"><strong>Nothing to practice yet</strong><span>Save words from Lens or Local and they show up here. The city quiz works any time.</span><button type="button" class="btn primary small-btn" data-action="tab" data-tab="lens">Go to Lens</button></div>' : ''}
      ${tricky.length ? `<div class="card rv-tricky"><strong>Tricky words</strong><span class="small">You’ve missed these a few times. A short round on just these helps.</span><div class="syns">${tricky.map((k) => `<span class="syn">${esc(D[k].word)}</span>`).join('')}</div><button type="button" class="btn small-btn" data-action="tricky-go">Practice these ${tricky.length}</button></div>` : ''}
      <p class="rv-label rv-first">Flashcards</p>
      ${act('cards', '<i class="ti" style="--ic: url(icons/figma/tab-cards.svg)"></i>', 'Flashcards', due ? `Starts with the ${due === 1 ? 'word' : due + ' words'} you need most, in the sentence where you met ${due === 1 ? 'it' : 'them'}.` : `Go through your ${words}, with the sentence where you met each one.`)}
      <p class="rv-label">Games</p>
      ${act('story', storyIcon, 'Fill in the story', 'Put your words back into a short story.')}
      ${act('match', gameIcons.match, 'Match up', 'Pair each word with its meaning. Can you clear the board with no mistakes?')}
      ${act('bubbles', gameIcons.bubbles, 'Bubble catch', 'A meaning appears. Pop the word that fits before it floats away.')}
      ${act('scramble', gameIcons.scramble, 'Unscramble', 'Rebuild each word from its letters, with the sentence as your clue.')}
      ${act('say', gameIcons.say, 'Say it', 'Hear each word, then say it. Linger listens and tells you how close you were.')}
      <p class="rv-label">City quizzes</p>
      ${act('cityquiz', gameIcons.city, `${esc(city().name)} quiz`, `How well do you know ${esc(city().name)}? Slang, customs and getting around.`, 'data-city="home"')}
      <button type="button" class="rv-act" data-action="city-pick" data-v="quiz">
        <span class="rv-ic" aria-hidden="true">${gameIcons.globe}</span>
        <span class="rv-txt"><span class="rv-title">Quiz a different city</span><span class="mean">Moving, visiting or just curious? Pick any U.S. city and test what you know.</span></span>
        <span class="rv-go">Pick</span></button>
      ${bestLine()}
    </div>`;
  }
  const WORD_GAMES = ['match', 'bubbles', 'scramble', 'say'];
  const gameIcons = {
    globe: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    say: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
    city: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V9l5-3v15M10 21V4l9 4v13"/><path d="M13 10h3M13 14h3"/></svg>',
    match: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7h2a2 2 0 0 1 2 2v8"/></svg>',
    bubbles: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="14" r="5"/><circle cx="17" cy="7" r="3"/><circle cx="18.5" cy="16.5" r="1.5"/><path d="M7 12.5a2 2 0 0 1 2-1.5"/></svg>',
    scramble: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="8" width="6" height="7" rx="1.5" transform="rotate(-8 5.5 11.5)"/><rect x="9" y="7" width="6" height="7" rx="1.5"/><rect x="15.5" y="8" width="6" height="7" rx="1.5" transform="rotate(8 18.5 11.5)"/><path d="M5 19h14"/></svg>'
  };
  const best = (g) => { try { return Number(localStorage.getItem('linger.best.' + g) || 0); } catch { return 0; } };
  const setBest = (g, v) => { const was = best(g); if (v > was) { try { localStorage.setItem('linger.best.' + g, String(v)); } catch {} return true; } return false; };
  function bestLine() {
    const m = best('match'), b = best('bubbles'), u = best('scramble'), y = best('say'), c = best('city.' + S.city);
    if (!m && !b && !u && !y && !c) return '';
    return `<p class="rv-best">Your best: ${[m && `Match up ${m}★`, b && `Bubble catch ${b} pts`, u && `Unscramble ${u}★`, y && `Say it ${y}★`, c && `${esc(city().name)} quiz ${c}★`].filter(Boolean).join(' · ')}</p>`;
  }


  // ---------- full-screen activities ----------
  function viewCards() {
    const c = S.cards;
    const deck = [...(c.order || practiceOrder()), ...(c.again || [])]; // flagged or missed words come back once at the end
    const deco = rings([['ring', 'width:240px;height:240px;left:-110px;top:-70px'], ['dot', 'width:76px;height:76px;left:-10px;top:0'], ['ring', 'width:240px;height:240px;right:-90px;bottom:-60px'], ['dot', 'width:90px;height:90px;right:-4px;bottom:20px']]);
    const top = `<div class="topbar"><button type="button" class="x" data-action="quit" aria-label="Close flashcards">${xIcon}</button><span class="t">Flashcards</span><span class="n">${Math.min(c.idx + 1, deck.length)} of ${deck.length}</span></div>`;
    if (!deck.length) {
      return `<div class="full-view cards-view">${deco}<div class="topbar"><button type="button" class="x" data-action="quit" aria-label="Close flashcards">${xIcon}</button><span class="t">Flashcards</span><span class="n"></span></div>
        <div class="flash" style="justify-content: center; align-items: center; text-align: center"><div class="big empty-float" style="margin: 0">No cards yet</div><div class="small">Flashcards are made from the words you save. Save a few from Lens or Local, then come back. Or warm up with a game that uses Linger’s own words.</div></div>
        <div class="actions"><button type="button" class="btn white" data-action="play" data-v="match">Play Match up</button><button type="button" class="btn primary" data-action="cards-empty-lens">Find words on Lens</button></div></div>`;
    }
    if (c.idx >= deck.length) {
      return `<div class="full-view cards-view">${deco}${top}
        <div class="flash" style="justify-content: center; align-items: center; text-align: center"><div class="big" style="margin: 0">${(c.rest || []).length ? 'Round done!' : 'All caught up'}</div><div class="small">You reviewed ${(c.done || 0) + deck.length} ${(c.done || 0) + deck.length === 1 ? 'word' : 'words'}.${(c.rest || []).length ? ` ${c.rest.length} more ${c.rest.length === 1 ? 'is' : 'are'} waiting, whenever you’re ready.` : ' Try Fill in the story next.'}</div></div>
        <div class="actions">${(c.rest || []).length ? `<button type="button" class="btn white" data-action="cards-more">Keep going (${Math.min(SESSION, c.rest.length)} more)</button>` : '<button type="button" class="btn white" data-action="play" data-v="story">Fill in the story</button>'}<button type="button" class="btn primary" data-action="quit">Done</button></div></div>`;
    }
    const e = D[deck[c.idx]];
    const q = esc(e.sentence).replace(new RegExp(esc(e.word), 'i'), (m) => `<b>${m}</b>`);
    // Layout from Figma "final draft" (nodes 40:3801 front, 40:4073 after "Show meaning").
    const flag = `<button type="button" class="fc-flag" data-action="card-flag" aria-pressed="${!!c.flag}" aria-label="${c.flag ? 'Flagged: this word comes back at the end' : 'Flag to practice this word again'}"><svg width="24" height="24" viewBox="0 0 24 24" fill="${c.flag ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg></button>`;
    return `<div class="full-view cards-view fc">
      <div class="fc-rings fc-r1" aria-hidden="true"><img src="icons/figma/rings-card-bottom.svg" width="453.097" height="496.459" alt=""></div>
      <div class="fc-rings fc-r2" aria-hidden="true"><img src="icons/figma/rings-card-top.svg" width="351.387" height="351.387" alt=""></div>
      <div class="fc-top"><button type="button" class="x" data-action="quit" aria-label="Close flashcards"><img src="icons/figma/x.svg" width="23" height="23" alt=""></button><span class="n">${Math.min(c.idx + 1, deck.length)} of ${deck.length}</span></div>
      <div class="fc-stack">
        <div class="fc-card${FX.flip ? ' flip-in' : ''}${FX.deal ? ' deal-in' : ''}">
          <div class="fc-head"><div class="fc-row">${badge(e.kind)}${flag}</div><div class="fc-word">${esc(cap(e.word))}</div></div>
          <div class="fc-body"><p class="fc-q">“${q}”</p>${c.revealed ? `<p class="fc-ans">${esc(e.meaning)}</p>` : ''}<div class="fc-meta"><img src="icons/figma/pin-16.svg" width="16" height="16" alt="">${esc(placeOf(e))}</div></div>
        </div>
        ${c.revealed ? '<div class="fc-answer"><button type="button" class="btn fc-btn white" data-action="card-next" data-v="again">Still learning</button><button type="button" class="btn fc-btn primary" data-action="card-next" data-v="knew">I knew it</button></div>' : '<button type="button" class="btn fc-btn primary" data-action="card-reveal">Show meaning</button>'}
      </div></div>`;
  }

  // Show meaning: the card turns edge-on, the meaning is drawn, and it turns back (the second half is CSS: .flip-in).
  function revealCard(from) {
    const el = document.querySelector('.fc-card');
    const done = () => { if (!S.cards || S.cards.revealed) return; S.cards.revealed = true; fx('flip'); buzz(8); render(); };
    if (calm() || !el || !el.animate) { done(); return false; }
    el.animate([{ transform: from || 'none' }, { transform: 'perspective(900px) rotateY(90deg)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).finished.then(done, done);
    setTimeout(done, 400); // animations can be paused (a background tab): never leave the card stuck edge-on
    return false;
  }
  // Flashcards can be pulled: drag the front a little and let go to turn it over; once the meaning shows, drag right
  // for "I knew it" or left for "Still learning". A short drag springs back.
  let fcDrag = null;
  document.addEventListener('pointerdown', (e) => {
    const c = e.target.closest && e.target.closest('.fc-card');
    if (!c || S.activity !== 'cards' || e.target.closest('button')) return;
    fcDrag = { c, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, on: false };
  });
  document.addEventListener('pointermove', (e) => {
    const d = fcDrag; if (!d || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.x0;
    if (!d.on) { if (Math.abs(d.dx) < 8 || Math.abs(e.clientY - d.y0) > Math.abs(d.dx)) return; d.on = true; try { d.c.setPointerCapture(e.pointerId); } catch {} d.c.style.transition = 'none'; }
    const t = Math.sign(d.dx) * Math.min(Math.abs(d.dx), 160) * (S.cards.revealed ? 0.8 : 0.45); // the front resists: it's a peek
    d.c.style.transform = `translateX(${t}px) rotate(${t / 22}deg)`;
    d.c.classList.toggle('lean-yes', S.cards.revealed && t > 50); d.c.classList.toggle('lean-no', S.cards.revealed && t < -50);
  });
  const fcEnd = (e) => {
    const d = fcDrag; if (!d || e.pointerId !== d.id) return; fcDrag = null;
    if (!d.on) return;
    const c = d.c, far = Math.abs(d.dx) > 80;
    if (far && !S.cards.revealed) { revealCard(c.style.transform); return; }
    if (far && S.cards.revealed && c.animate && !calm()) {
      const out = d.dx > 0 ? 1 : -1;
      let moved = false;
      const next = () => { if (moved) return; moved = true; actions['card-next']({ v: out > 0 ? 'knew' : 'again' }); render(); };
      c.animate([{ transform: c.style.transform, opacity: 1 }, { transform: `translateX(${out * 420}px) rotate(${out * 14}deg)`, opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' })
        .finished.then(next, next);
      setTimeout(next, 450);
      return;
    }
    if (far && S.cards.revealed) { actions['card-next']({ v: d.dx > 0 ? 'knew' : 'again' }); render(); return; }
    c.style.transition = 'transform .35s cubic-bezier(.3,1.6,.5,1)'; c.style.transform = ''; c.classList.remove('lean-yes', 'lean-no');
  };
  document.addEventListener('pointerup', fcEnd);
  document.addEventListener('pointercancel', fcEnd);

  function newGame(storyIdx) {
    const st = STORIES[storyIdx];
    const answers = st.parts.filter((_, i) => i % 2 === 1);
    S.game = { story: storyIdx, placed: answers.map(() => null), bank: shuffle(answers), sel: null, checked: false, fixed: false, missIdx: 0 };
  }

  function viewStory() {
    const g = S.game, st = STORIES[g.story];
    const answers = st.parts.filter((_, i) => i % 2 === 1);
    let b = -1;
    // Punctuation right after a blank stays with it, so a line never starts with ". She".
    const punct = (i) => ((st.parts[i + 1] || '').match(/^[.,;:!?”’)]+/) || [''])[0];
    const text = st.parts.map((p, i) => {
      if (i % 2 === 0) return esc(i > 0 ? p.slice(punct(i - 1).length) : p);
      b++;
      const w = g.placed[b];
      let cls = 'blank';
      const ok = w === answers[b];
      if (g.checked) cls += ok ? ' right' : ' wrong';
      else if (w) cls += ' filled';
      else if (g.sel) cls += ' target';
      if (FX.land === b) cls += ' land'; // a word just dropped in
      if (FX.checked) cls += ok ? ' settle' : ' nudge'; // just checked: right words settle, wrong ones shake gently
      // A wrong word shows the right one faintly beside it (no red X).
      const ans = g.checked && !ok && !g.fixed ? `<span class="blank-ans" aria-label="Right word: ${esc(D[answers[b]].word)}">${esc(D[answers[b]].word)}</span>` : '';
      return `<span class="bw"><button type="button" class="${cls}" style="--i:${b}" data-action="blank" data-b="${b}" aria-label="${w ? 'Blank filled with ' + esc(D[w].word) : 'Empty blank ' + (b + 1)}">${w ? esc(D[w].word) : ''}</button>${ans}${esc(punct(i))}</span>`;
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
        <div class="explain"><div class="item-head"><span class="word">${esc(cap(e.word))}</span>${badge(e.kind)}</div><div style="font-size: calc(14px * var(--ts, 1))">${esc(e.meaning)}</div></div>
        <div class="grid2"><button type="button" class="btn" data-action="miss-next">Next word</button>${second}</div>`;
    }
    return `<div class="full-view story-view">
      <div class="story-top"><div class="st-bar"><button type="button" class="x" data-action="quit" aria-label="Close activity"><img src="icons/figma/x.svg" width="23" height="23" alt=""></button><div class="st-tt"><span class="t">Fill in the story</span><span class="n">${g.story + 1} of ${STORIES.length}</span></div></div></div>
      <div class="story"><h2>${esc(st.title)}</h2><p>${text}</p></div>
      <div class="tray">${tray}</div></div>`;
  }

  // ---------- games: any saved words (padded with Linger's own words when there are only a few) ----------
  const goodEntry = (e) => e && e.word && e.meaning && !/^Looking up/.test(e.meaning) && !e.pending;
  // The words for a game: the ones picked in the word picker, or (Surprise me) saved words first, padded with
  // Linger's own words. min: the fewest the game needs; picked lists shorter than that are padded.
  function gamePool(n, ok = () => true, min = 1) {
    if (S.gameWords) {
      const picked = S.gameWords.filter((k) => goodEntry(D[k]) && ok(D[k]));
      if (picked.length >= min) return shuffle(picked).slice(0, n);
      const extra = shuffle(Object.keys(D).filter((k) => !picked.includes(k) && goodEntry(D[k]) && ok(D[k])));
      return [...picked, ...extra].slice(0, Math.max(min, picked.length));
    }
    const mine = practiceOrder().filter((k) => goodEntry(D[k]) && ok(D[k]));
    const more = shuffle(Object.keys(D).filter((k) => !mine.includes(k) && goodEntry(D[k]) && ok(D[k])));
    // One word per family (remit / remitted), so two answers are never nearly the same.
    const out = [], stem = (w) => w.toLowerCase().replace(/(ted|ed|ing|es|s)$/, '');
    for (const k of [...mine, ...more]) { if (out.length >= n) break; const a = stem(D[k].word); if (!out.some((j) => { const b = stem(D[j].word); return a.startsWith(b) || b.startsWith(a); })) out.push(k); }
    return out;
  }
  // A short form of a meaning that fits on a tile.
  const shortMeaning = (m) => { const t = String(m || '').replace(/\s+/g, ' ').trim().replace(/\.$/, ''); const one = t.split(/[.;]\s/)[0]; return one.length > 64 ? one.slice(0, 62).replace(/[\s,]+\S*$/, '') + '…' : one; };
  const blankIn = (e) => { const s = e.sentence || ''; const re = new RegExp('\\b' + e.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'i'); return re.test(s) ? s.replace(re, '_____') : ''; };
  const stars = (n) => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
  const gameTop = (title, right) => `<div class="g-top"><button type="button" class="x" data-action="quit" aria-label="Close ${esc(title)}"><img src="icons/figma/x.svg" width="23" height="23" alt=""></button><span class="g-title">${esc(title)}</span><span class="g-right">${right || ''}</span></div>`;
  const gameEnd = (cls, title, big, sub, again) => `<div class="full-view game-view ${cls}">${gameTop(title)}
      <div class="g-end"><div class="g-burst" aria-hidden="true">${'<i></i>'.repeat(12)}</div><div class="g-big">${big}</div><p>${sub}</p></div>
      <div class="g-acts"><button type="button" class="btn white" data-action="quit">Done</button><button type="button" class="btn primary" data-action="play" data-v="${again}" data-go="1">Play again</button></div></div>`;

  // Match up: words on the left, meanings on the right. Tap one of each; a pair clears, a wrong pair wobbles.
  function startMatch() {
    const words = gamePool(6, undefined, 3);
    S.match = { words, left: shuffle(words), right: shuffle(words), sel: null, done: [], miss: 0, missed: [], t0: Date.now(), t: 0 };
  }
  function matchPick(side, k) {
    const m = S.match; if (!m || m.done.includes(k)) return;
    if (!m.sel || m.sel.side === side) { m.sel = m.sel && m.sel.side === side && m.sel.k === k ? null : { side, k }; buzz(6); return; }
    const other = m.sel.k; m.sel = null;
    if (other === k) {
      m.done.push(k); fx('mtHit', k); buzz(12); track(k, 'review', !m.missed.includes(k));
      if (m.done.length === m.words.length) { m.t = Math.round((Date.now() - m.t0) / 1000); m.stars = m.miss === 0 ? 3 : m.miss <= 2 ? 2 : 1; m.best = setBest('match', m.stars); buzz([12, 60, 12]); }
    } else {
      m.miss++; fx('mtMiss', [side === 'w' ? k : other, side === 'm' ? k : other]); buzz(20);
      const w = side === 'w' ? k : other; if (!m.missed.includes(w)) m.missed.push(w);
    }
  }
  function viewMatch() {
    const m = S.match;
    if (m.done.length === m.words.length) return gameEnd('match-view', 'Match up', `<span class="g-stars">${stars(m.stars)}</span>`,
      `${m.words.length} pairs in ${m.t} seconds${m.miss ? `, ${m.miss} ${m.miss === 1 ? 'mix-up' : 'mix-ups'}` : ', no mistakes'}.${m.best ? ' New best!' : ''}`, 'match');
    const miss = FX.mtMiss || [];
    const tile = (side, k) => {
      const e = D[k], done = m.done.includes(k), sel = m.sel && m.sel.side === side && m.sel.k === k;
      const cls = `mt-tile mt-${side}${sel ? ' sel' : ''}${done ? ' done' : ''}${FX.mtHit === k ? ' hit' : ''}${!done && ((side === 'w' && miss[0] === k) || (side === 'm' && miss[1] === k)) ? ' miss' : ''}`;
      return `<button type="button" class="${cls}" data-action="mt-pick" data-side="${side}" data-k="${k}" ${done ? 'disabled aria-label="Matched"' : ''}>${side === 'w' ? esc(cap(e.word)) : esc(shortMeaning(e.meaning))}</button>`;
    };
    return `<div class="full-view game-view match-view">${gameTop('Match up', `${m.done.length}/${m.words.length}`)}
      <p class="g-hint">${m.sel ? (m.sel.side === 'w' ? `Now tap what <b>${esc(cap(D[m.sel.k].word))}</b> means.` : 'Now tap the word that means this.') : 'Tap a word, then its meaning.'}</p>
      <div class="mt-board"><div class="mt-col">${m.left.map((k) => tile('w', k)).join('')}</div><div class="mt-col">${m.right.map((k) => tile('m', k)).join('')}</div></div>
      <div class="g-foot">${m.miss ? `${m.miss} ${m.miss === 1 ? 'mix-up' : 'mix-ups'}` : 'No mistakes yet'}</div></div>`;
  }

  // Bubble catch: a meaning at the top, word bubbles float up. Pop the right one before it gets away. Three hearts.
  // The screen can be redrawn mid-round, so each bubble's animation picks up from the time the round started.
  let bbTimers = [];
  const stopBubbles = () => { bbTimers.forEach(clearTimeout); bbTimers = []; };
  function startBubbles() {
    const pool = gamePool(12);
    // Wrong answers can come from any word, so a short pick still has four bubbles.
    const others = Object.keys(D).filter((k) => !pool.includes(k) && goodEntry(D[k]));
    S.bubbles = { pool, others, round: 0, rounds: S.gameWords ? Math.min(10, Math.max(pool.length, 4)) : Math.min(10, Math.max(6, pool.length)), score: 0, streak: 0, bestStreak: 0, hearts: 3, r: null, over: false };
    bubbleRound();
  }
  function bubbleRound() {
    stopBubbles();
    const b = S.bubbles; if (!b) return;
    if (b.round >= b.rounds || b.hearts <= 0) { b.over = true; b.best = setBest('bubbles', b.score); return; }
    const k = b.pool[b.round % b.pool.length];
    const opts = shuffle([k, ...shuffle(b.pool.filter((x) => x !== k)).concat(shuffle(b.others)).slice(0, 3)]);
    const dur = Math.max(5.5, 9 - b.round * 0.35), lanes = shuffle([24, 76, 42, 60]);
    b.r = { k, t0: performance.now(), opts: opts.map((o, i) => ({ k: o, lane: lanes[i], delay: i * 1.05 + Math.random() * 0.25, dur: dur + Math.random() * 0.8 })), gone: [], won: false, lost: false };
    b.round++;
    if (calm()) return; // Reduce motion: bubbles sit still and don't get away
    const mine = b.r, right = mine.opts.find((o) => o.k === k);
    bbTimers.push(setTimeout(() => { if (S.bubbles !== b || b.r !== mine || mine.won) return; mine.lost = true; b.hearts--; b.streak = 0; track(k, 'review', false); buzz(20); render(); bbTimers.push(setTimeout(() => { bubbleRound(); render(); }, 1500)); }, (right.delay + right.dur) * 1000 - 300));
  }
  function bubblePop(k) {
    const b = S.bubbles; if (!b || !b.r || b.r.won || b.r.lost || b.r.gone.includes(k)) return;
    if (k === b.r.k) {
      b.r.won = true; b.streak++; b.bestStreak = Math.max(b.bestStreak, b.streak); b.score += 10 + (b.streak - 1) * 5;
      fx('bbPop', k); buzz(12); track(k, 'review', true);
      stopBubbles(); bbTimers.push(setTimeout(() => { bubbleRound(); render(); }, 750));
    } else {
      b.r.gone.push(k); b.hearts--; b.streak = 0; fx('bbMiss', k); buzz(20);
      if (b.hearts <= 0) { stopBubbles(); bbTimers.push(setTimeout(() => { b.over = true; b.best = setBest('bubbles', b.score); render(); }, 700)); }
    }
  }
  function viewBubbles() {
    const b = S.bubbles;
    if (b.over) return gameEnd('bubble-view', 'Bubble catch', `${b.score}<small>points</small>`,
      `${b.hearts > 0 ? 'You made it through!' : 'Out of hearts.'} Best streak: ${b.bestStreak}.${b.best ? ' New best score!' : ''}`, 'bubbles');
    const r = b.r, el = performance.now() - r.t0, still = calm();
    const hearts = `<span class="bb-hearts" aria-label="${b.hearts} hearts left">${'<i class="on">♥</i>'.repeat(Math.max(0, b.hearts))}${'<i>♥</i>'.repeat(3 - Math.max(0, b.hearts))}</span>`;
    const bubbles = r.opts.map((o, i) => {
      if (r.gone.includes(o.k) && FX.bbMiss !== o.k) return '';
      if (r.won && o.k === r.k && FX.bbPop !== o.k) return ''; // already popped
      const st = FX.bbPop === o.k ? ' pop' : FX.bbMiss === o.k ? ' miss' : r.won || r.lost ? (o.k === r.k ? ' show' : ' fade') : '';
      const style = still ? `left:${o.lane}%;top:${30 + (i % 2) * 22}%` : `left:${o.lane}%;animation-duration:${o.dur}s;animation-delay:${Math.round(o.delay * 1000 - el)}ms`;
      return `<button type="button" class="bubble${still ? ' still' : ''}${st}" style="${style}" data-action="bb-pop" data-k="${o.k}"><span>${esc(D[o.k].word)}</span></button>`;
    }).join('');
    return `<div class="full-view game-view bubble-view">${gameTop('Bubble catch', hearts)}
      <div class="bb-meaning${FX.bbMiss ? ' shake' : ''}"><span class="bb-n">${b.round} of ${b.rounds}</span>${esc(shortMeaning(D[r.k].meaning))}${r.lost ? `<span class="bb-was">It was <b>${esc(D[r.k].word)}</b></span>` : ''}</div>
      <div class="bb-sky" aria-label="Word bubbles">${bubbles}</div>
      <div class="g-foot bb-foot"><span>${b.score} pts</span>${b.streak > 1 ? `<span class="bb-streak">${b.streak} in a row</span>` : ''}</div></div>`;
  }

  // Unscramble: the meaning and the sentence (with a gap) are the clue; tap letters to spell the word.
  function startScramble() {
    const words = gamePool(6, (e) => /^[a-z]{3,11}$/i.test(e.word));
    S.scramble = { words, i: 0, right: 0, hints: 0 };
    scrambleSetup();
  }
  function scrambleSetup() {
    const u = S.scramble, w = D[u.words[u.i]].word.toLowerCase();
    let tiles; do { tiles = shuffle(w.split('')); } while (w.length > 2 && tiles.join('') === w);
    u.tiles = tiles.map((c, id) => ({ c, id })); u.slots = Array(w.length).fill(null); u.state = ''; u.used = 0;
  }
  function scrambleTile(id) {
    const u = S.scramble; if (!u || u.state === 'right') return;
    const at = u.slots.indexOf(null); if (at < 0 || u.slots.includes(id)) return;
    u.slots[at] = id; u.state = ''; buzz(5); fx('usLand', at);
    if (!u.slots.includes(null)) scrambleCheck();
  }
  function scrambleSlot(s) {
    const u = S.scramble; if (!u || u.state === 'right' || u.slots[s] === null || u.locked === s) return;
    u.slots[s] = null; u.state = ''; buzz(5);
  }
  function scrambleCheck() {
    const u = S.scramble, w = D[u.words[u.i]].word.toLowerCase();
    const got = u.slots.map((id) => u.tiles[id].c).join('');
    if (got === w) { u.state = 'right'; u.right += u.used ? 0.5 : 1; track(u.words[u.i], 'review', !u.used); buzz([12, 60, 12]); fx('usWin'); }
    else { u.state = 'wrong'; buzz(20); fx('usWrong'); }
  }
  function scrambleHint() {
    const u = S.scramble; if (!u || u.state === 'right') return;
    const w = D[u.words[u.i]].word.toLowerCase();
    const at = u.slots.findIndex((id, i) => id === null || u.tiles[id].c !== w[i]); if (at < 0) return;
    if (u.slots[at] !== null) u.slots[at] = null;
    const id = u.tiles.find((t) => t.c === w[at] && !u.slots.includes(t.id)).id;
    const from = u.slots.indexOf(id); if (from >= 0) u.slots[from] = null;
    u.slots[at] = id; u.used++; u.hints++; u.state = ''; fx('usLand', at); buzz(8);
    if (!u.slots.includes(null)) scrambleCheck();
  }
  function scrambleNext() {
    const u = S.scramble; u.i++;
    if (u.i >= u.words.length) { u.over = true; u.stars = u.right >= u.words.length - 0.5 ? 3 : u.right >= u.words.length / 2 ? 2 : 1; u.best = setBest('scramble', u.stars); return; }
    scrambleSetup(); fx('usNew');
  }
  function viewScramble() {
    const u = S.scramble;
    if (u.over) return gameEnd('scramble-view', 'Unscramble', `<span class="g-stars">${stars(u.stars)}</span>`,
      `${Math.floor(u.right)} of ${u.words.length} words spelled${u.hints ? `, ${u.hints} ${u.hints === 1 ? 'hint' : 'hints'} used` : ' with no hints'}.${u.best ? ' New best!' : ''}`, 'scramble');
    const e = D[u.words[u.i]], gap = blankIn(e), done = u.state === 'right';
    const slots = u.slots.map((id, s) => `<button type="button" class="us-slot${id !== null ? ' full' : ''}${FX.usLand === s ? ' land' : ''}${done ? ' win' : ''}${u.state === 'wrong' ? ' wrong' : ''}" style="--i:${s}" data-action="us-slot" data-s="${s}" aria-label="${id !== null ? 'Letter ' + u.tiles[id].c + ', tap to take it back' : 'Empty'}">${id !== null ? esc(u.tiles[id].c) : ''}</button>`).join('');
    const tiles = u.tiles.map((t) => { const used = u.slots.includes(t.id); return `<button type="button" class="us-tile${used ? ' used' : ''}" data-action="us-tile" data-t="${t.id}" ${used ? 'tabindex="-1" aria-hidden="true"' : ''}>${esc(t.c)}</button>`; }).join('');
    return `<div class="full-view game-view scramble-view">${gameTop('Unscramble', `${u.i + 1} of ${u.words.length}`)}
      <div class="us-clue${FX.usNew ? ' new' : ''}"><span class="badge b-loc">Clue</span><p class="us-mean">${esc(cap(shortMeaning(e.meaning)))}</p>${gap ? `<p class="us-sent">“${esc(gap)}”</p>` : ''}
        <button type="button" class="us-hear" data-action="us-hear" aria-label="Hear the word">${speaker}</button></div>
      <div class="us-slots${FX.usWrong ? ' shake' : ''}" style="--n:${u.slots.length}">${slots}</div>
      <p class="g-hint">${done ? `<b>${esc(cap(e.word))}</b>! ${u.used ? 'Spelled with a hint.' : 'Spelled on your own.'}` : u.state === 'wrong' ? 'Not quite. Tap a letter to take it back.' : 'Tap the letters in order.'}</p>
      ${done ? '' : `<div class="us-tiles">${tiles}</div>`}
      <div class="g-acts">${done ? `<button type="button" class="btn primary wide-btn" data-action="us-next">${u.i + 1 < u.words.length ? 'Next word' : 'See results'}</button>` : `<button type="button" class="btn white wide-btn" data-action="us-hint">Hint: next letter</button>`}</div></div>`;
  }

  // ---------- word picker: choose the words for a game, or Surprise me ----------
  const pickable = (game) => S.saved.filter((k) => goodEntry(D[k]) && (game !== 'scramble' || /^[a-z]{3,11}$/i.test(D[k].word)));
  function pickSheet() {
    const p = S.pick, all = pickable(p.game), names = { match: 'Match up', bubbles: 'Bubble catch', scramble: 'Unscramble', say: 'Say it' };
    const need = { match: 3, bubbles: 1, scramble: 1, say: 1 }[p.game], n = p.sel.length;
    return `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="pk-close"></button>
      <div class="panel pk-panel" role="dialog" aria-labelledby="pkTitle"><div class="grab"></div>
        <div class="pk-head"><div><div class="sheet-word" id="pkTitle" style="font-size: calc(24px * var(--ts, 1))">${names[p.game]}</div><p class="small">Pick the words to play with, or let Linger choose.</p></div>
          ${all.length ? `<button type="button" class="link-btn" data-action="pk-all">${n === all.length ? 'Clear' : 'Select all'}</button>` : ''}</div>
        ${all.length ? `<div class="pk-list">${all.map((k) => { const on = p.sel.includes(k); return `<button type="button" class="pk-chip${on ? ' on' : ''}" data-action="pk-word" data-k="${k}" aria-pressed="${on}"><span class="pk-tick" aria-hidden="true">${on ? '✓' : '+'}</span>${esc(cap(D[k].word))}</button>`; }).join('')}</div>`
          : '<p class="pk-empty">You haven’t saved any words that fit this game yet. Surprise me uses Linger’s own words.</p>'}
        ${n && n < need ? `<p class="small pk-note">Pick at least ${need}, or Linger adds a few of its own.</p>` : ''}
        <div class="grid2"><button type="button" class="btn" data-action="pk-random">Surprise me</button><button type="button" class="btn primary" data-action="pk-go" ${n ? '' : 'disabled'}>${n ? `Play with ${n}` : 'Pick words'}</button></div></div></div>`;
  }

  // ---------- Say it: hear the word, say it, Linger checks how close it was ----------
  // Uses the browser's speech recognition (Chrome, Safari), or the iPhone app's (Apple's speech recognizer).
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canListen = () => !!((BETA && BETA.native) || SR);
  let rec = null, listenTimer = null;
  function stopListening() { clearTimeout(listenTimer); try { if (rec) rec.abort(); } catch {} rec = null; if (BETA && BETA.native && S.say && S.say.listening) BETA.post({ listen: 'stop' }); }
  function startSay() { S.say = { words: gamePool(6), i: 0, scores: [], tries: 0, heard: null, result: null, listening: false }; }
  const normWord = (t) => String(t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  function editDist(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // How close the best thing heard is to the word: 3 = exactly it, 2 = close, 1 = getting there, 0 = something else.
  function sayScore(target, heard) {
    const t = normWord(target), tl = t.replace(/ /g, '');
    let best = 0, said = heard[0] || '';
    for (const h of heard) {
      const n = normWord(h); if (!n) continue;
      if (n === t || n.split(' ').includes(t) || n.replace(/ /g, '') === tl) return { stars: 3, said: h };
      // compare with the part of what was heard that's closest in length
      const ws = n.split(' '), cands = [n.replace(/ /g, ''), ...ws, ...ws.slice(1).map((w, i) => ws[i] + w)];
      for (const c of cands) { const sim = 1 - editDist(c, tl) / Math.max(c.length, tl.length); const st = sim >= 0.8 ? 2 : sim >= 0.55 ? 1 : 0; if (st > best) { best = st; said = h; } }
    }
    return { stars: best, said };
  }
  function sayHeard(texts, err) {
    const g = S.say; if (!g || !g.listening) return;
    g.listening = false; clearTimeout(listenTimer); rec = null;
    if (err || !texts || !texts.length) { g.result = { stars: -1, msg: err === 'denied' ? 'Linger needs the microphone. Allow it in Settings, then try again.' : 'Linger didn’t catch that. Tap the mic and say the word clearly.' }; render(); return; }
    const k = g.words[g.i], r = sayScore(D[k].word, texts);
    g.tries++; g.result = r; g.heard = r.said;
    if (r.stars === 3 || g.tries >= 3) { g.scores[g.i] = Math.max(g.scores[g.i] || 0, r.stars); track(k, 'review', r.stars >= 2); }
    else g.scores[g.i] = Math.max(g.scores[g.i] || 0, r.stars);
    buzz(r.stars === 3 ? [12, 60, 12] : r.stars >= 2 ? 12 : 20); fx('sayResult');
    render();
  }
  function sayListen() {
    const g = S.say; if (!g || g.listening) return;
    stopSpeaking(); g.result = null; g.heard = null; g.listening = true; buzz(8);
    if (BETA && BETA.native) {
      BETA.post({ listen: 'start' });
      listenTimer = setTimeout(() => sayHeard([], 'none'), 9000);
      return;
    }
    if (!SR) { g.listening = false; g.result = { stars: -1, msg: 'This browser can’t listen. Try Chrome or Safari, or the Linger iPhone app.' }; return; }
    try {
      rec = new SR(); rec.lang = 'en-US'; rec.maxAlternatives = 5; rec.interimResults = false; rec.continuous = false;
      rec.onresult = (e) => sayHeard([...e.results[0]].map((a) => a.transcript));
      rec.onerror = (e) => sayHeard([], e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'none');
      rec.onend = () => { if (S.say && S.say.listening) sayHeard([], 'none'); };
      rec.start();
      listenTimer = setTimeout(() => { try { rec && rec.stop(); } catch {} }, 6000);
    } catch { sayHeard([], 'none'); }
  }
  function sayNext() {
    const g = S.say; if (g.scores[g.i] === undefined) g.scores[g.i] = 0;
    g.i++; g.tries = 0; g.result = null; g.heard = null;
    if (g.i >= g.words.length) { const total = g.scores.reduce((a, b) => a + Math.max(0, b), 0); g.stars = total >= g.words.length * 2.5 ? 3 : total >= g.words.length * 1.5 ? 2 : 1; g.best = setBest('say', g.stars); g.over = true; }
    else fx('sayNew');
  }
  function viewSay() {
    const g = S.say;
    if (g.over) return gameEnd('say-view', 'Say it', `<span class="g-stars">${stars(g.stars)}</span>`,
      `${g.scores.filter((x) => x === 3).length} of ${g.words.length} said just right.${g.best ? ' New best!' : ''}`, 'say');
    const e = D[g.words[g.i]], r = g.result, done = r && (r.stars === 3 || g.tries >= 3);
    const say = e.say || '';
    const verdict = !r ? (g.listening ? 'Listening… say the word now.' : canListen() ? 'Tap the mic, then say the word.' : 'This browser can’t listen. Try Chrome or Safari.')
      : r.stars < 0 ? esc(r.msg)
      : r.stars === 3 ? 'Perfect! That’s exactly it.'
      : r.stars === 2 ? 'So close! Listen once more and try again.'
      : r.stars === 1 ? 'Getting there. Listen, then say it slowly.'
      : 'That sounded like a different word. Listen and try again.';
    return `<div class="full-view game-view say-view">${gameTop('Say it', `${g.i + 1} of ${g.words.length}`)}
      <div class="say-card${FX.sayNew ? ' new' : ''}">
        <div class="say-word">${esc(e.word)}</div>${say ? `<div class="say-ph">/${esc(say)}/</div>` : ''}
        <p class="say-mean">${esc(shortMeaning(e.meaning))}</p>
        <button type="button" class="btn white say-hear" data-action="say-hear">${speaker} Listen</button></div>
      <div class="say-stage">
        <button type="button" class="say-mic${g.listening ? ' on' : ''}" data-action="say-mic" aria-label="${g.listening ? 'Listening' : 'Say the word'}" ${done || !canListen() ? 'disabled' : ''}>
          <span class="say-ring" aria-hidden="true"></span><span class="say-ring r2" aria-hidden="true"></span>${gameIcons.say}</button>
        ${r && r.stars >= 0 ? `<div class="say-score${FX.sayResult ? ' pop' : ''}" aria-label="${r.stars} of 3">${stars(r.stars)}</div>` : ''}
        <p class="say-verdict" role="status">${verdict}</p>
        ${r && r.stars >= 0 && r.stars < 3 && g.heard ? `<p class="say-heard">Linger heard “${esc(g.heard)}”</p>` : ''}
      </div>
      <div class="g-acts">${done || (r && r.stars >= 0) ? `<button type="button" class="btn ${done ? 'primary' : 'white'} wide-btn" data-action="say-next">${g.i + 1 < g.words.length ? (done ? 'Next word' : 'Skip to next word') : 'See results'}</button>` : ''}</div></div>`;
  }

  // ---------- City quiz: slang, customs and getting around for the city you picked ----------
  function cityQuestions(id) {
    const c = CITIES[id] || CITIES.pgh, name = c.name, qs = [];
    const slang = citySlang(id).filter((k) => D[k]).map((k) => D[k]);
    const customs = cityCustoms(id), around = c.around || [];
    const otherSlang = Object.keys(CITIES).filter((x) => x !== id).flatMap((x) => citySlang(x)).filter((k) => D[k]).map((k) => D[k]);
    const pickOthers = (list, not, n, f) => shuffle(list.filter((x) => f(x) !== f(not))).slice(0, n).map(f);
    shuffle(slang).slice(0, 3).forEach((e) => qs.push({ q: `In ${name}, what does “${e.word}” mean?`, right: e.meaning, wrong: pickOthers([...slang, ...otherSlang], e, 2, (x) => x.meaning), more: e.local || '' }));
    if (slang.length && otherSlang.length) { const e = shuffle(slang)[0]; qs.push({ q: `Which word would you most likely hear in ${name}?`, right: e.word, wrong: pickOthers(otherSlang, e, 2, (x) => x.word), more: `“${e.word}”: ${e.meaning}` }); }
    shuffle(customs).slice(0, 3).forEach((t) => qs.push({ q: `${t.title}. What’s the custom in ${name}?`, right: t.body, wrong: pickOthers(customs, t, 2, (x) => x.body), more: '' }));
    shuffle(around).slice(0, 2).forEach((t) => qs.push({ q: `Getting around ${name}: “${t.title}”. What does it mean?`, right: t.body, wrong: pickOthers(around, t, 2, (x) => x.body), more: '' }));
    return shuffle(qs).slice(0, 8).map((q) => ({ ...q, opts: shuffle([q.right, ...q.wrong]) }));
  }
  function startCityQuiz() { const id = [S.quizCity, S.city].find((x) => x && CITIES[x]) || 'pgh'; S.cq = { city: id, qs: cityQuestions(id), i: 0, right: 0, picked: null }; }
  // A city chosen in the city sheet: from Review's "Quiz a different city" it starts that city's quiz (your own city on
  // Local stays the same); from Local it becomes your city.
  function pickCity(id) {
    if (!CITIES[id]) return;
    if (S.cityPickFor !== 'quiz') { setCity(id); return; }
    S.cityPick = false; S.cityPickFor = null; S.quizCity = id;
    stopSpeaking(); S.sheet = null; S.explain = false; S.activity = 'cityquiz'; startCityQuiz();
  }
  function cityAnswer(i) {
    const g = S.cq, q = g.qs[g.i]; if (g.picked !== null) return;
    g.picked = i; const ok = q.opts[i] === q.right; if (ok) g.right++;
    buzz(ok ? 12 : 20); fx(ok ? 'cqRight' : 'cqWrong');
  }
  function cityNext() {
    const g = S.cq; g.i++; g.picked = null;
    if (g.i >= g.qs.length) { g.stars = g.right >= g.qs.length - 1 ? 3 : g.right >= g.qs.length / 2 ? 2 : 1; g.best = setBest('city.' + g.city, g.stars); g.over = true; }
    else fx('cqNew');
  }
  function viewCityQuiz() {
    const g = S.cq, c = CITIES[g.city] || CITIES.pgh, title = `${c.name} quiz`;
    if (!g.qs.length) return gameEnd('city-view', title, '', 'There isn’t enough about this city yet for a quiz. Try another city.', 'cityquiz');
    if (g.over) return gameEnd('city-view', title, `<span class="g-stars">${stars(g.stars)}</span>`, `${g.right} of ${g.qs.length} right. ${g.stars === 3 ? `You know ${esc(c.name)} like a local!` : 'Read the Local tab and try again.'}${g.best ? ' New best!' : ''}`, 'cityquiz');
    const q = g.qs[g.i], answered = g.picked !== null;
    const opts = q.opts.map((o, i) => {
      const st = !answered ? '' : o === q.right ? ' right' : i === g.picked ? ' wrong' : ' dim';
      return `<button type="button" class="cq-opt${st}" style="--i:${i}" data-action="cq-answer" data-i="${i}" ${answered ? 'disabled' : ''}><span class="cq-l" aria-hidden="true">${'ABC'[i]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    const ok = answered && q.opts[g.picked] === q.right;
    return `<div class="full-view game-view city-view">${gameTop(title, `${g.i + 1} of ${g.qs.length}`)}
      <div class="cq-progress" aria-hidden="true"><span style="width:${Math.round(g.i / g.qs.length * 100)}%"></span></div>
      <div class="cq-q${FX.cqNew ? ' new' : ''}"><span class="cq-city">${esc(cityName(c))}</span>${esc(q.q)}</div>
      <div class="cq-opts${FX.cqNew ? ' new' : ''}">${opts}</div>
      ${answered ? `<p class="g-hint cq-verdict${ok ? ' ok' : ''}">${ok ? '✓ Right!' : '✕ Not quite.'}${q.more ? ' ' + esc(q.more) : ''}</p>` : ''}
      <div class="g-acts">${answered ? `<button type="button" class="btn primary wide-btn" data-action="cq-next">${g.i + 1 < g.qs.length ? 'Next question' : 'See results'}</button>` : ''}</div></div>`;
  }

  // The whole Lens text in the reader's language (one request for all the sentences).
  const TTR = new Map();
  function textTrBox() {
    const L = S.lang, sents = sentencesOf(TEXTS[S.source]).slice(0, 40), key = L + '|' + sents.join('|');
    if (!TTR.has(key)) {
      TTR.set(key, { status: 'wait' });
      (async () => {
        try {
          const dev = await deviceTranslator(L);
          if (dev) { try { const out = []; for (const x of sents) out.push(await within(dev.translate(x), 4000)); TTR.set(key, { status: 'ok', t: out }); render(); return; } catch { onDevice.set(L, null); } }
          if (!aiOK()) { TTR.delete(key); TTR.set(key, { status: 'off' }); render(); return; }
          const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Linger-Id': lingerId }, body: JSON.stringify({ mode: 'translate-many', texts: sents, lang: L, langName: langOf(L).name, from: 'en' }) });
          const j = r.ok ? await r.json() : null;
          TTR.set(key, j && j.translations ? { status: 'ok', t: j.translations } : { status: 'fail' });
        } catch { TTR.set(key, { status: 'fail' }); }
        render();
      })();
    }
    const x = TTR.get(key);
    return `<div class="lh-trtext"><div class="label">In ${esc(langOf(L).own)} <button type="button" class="link-btn" data-action="lang-open">Change</button></div>
      ${x.status === 'ok' ? `<p ${langAttrs(L)}>${x.t.map(esc).join(' ')}</p>` : x.status === 'wait' ? thinking('Translating…') : x.status === 'off' ? '<p class="small">Your phone can’t translate this by itself. Turn on AI explanations in Settings to translate with Linger.</p>' : '<p class="small">Couldn’t translate right now. Try again in a moment.</p>'}</div>`;
  }

  // Press and drag across words (on the text or the picture) to explain a phrase. With a mouse the drag starts right
  // away; on a touch screen, press and hold a word first, so a normal swipe still scrolls.
  let pick = null, eatClick = false;
  const tokAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.lh-text .tok, .lh-shot .tok') : null; };
  function markPick() {
    const [a, b] = [Math.min(pick.a, pick.b), Math.max(pick.a, pick.b)];
    document.querySelectorAll('.lh-text .tok, .lh-shot .tok').forEach((t) => { const i = Number(t.dataset.i); t.classList.toggle('picked', i >= a && i <= b); });
  }
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest && e.target.closest('.lh-text .tok, .lh-shot .tok'); if (!t) return;
    pick = { a: Number(t.dataset.i), b: Number(t.dataset.i), id: e.pointerId, x: e.clientX, y: e.clientY, on: false, touch: e.pointerType !== 'mouse' };
    if (pick.touch) pick.timer = setTimeout(() => { if (!pick) return; pick.on = true; buzz(10); markPick(); }, 380);
  });
  document.addEventListener('pointermove', (e) => {
    if (!pick || e.pointerId !== pick.id) return;
    if (!pick.on) {
      const far = Math.hypot(e.clientX - pick.x, e.clientY - pick.y) > 10;
      if (pick.touch) { if (far) { clearTimeout(pick.timer); pick = null; } return; } // a swipe: let it scroll
      const t = tokAt(e.clientX, e.clientY); if (!t || Number(t.dataset.i) === pick.a) return;
      pick.on = true;
    }
    const t = tokAt(e.clientX, e.clientY); if (t) { pick.b = Number(t.dataset.i); markPick(); }
  });
  document.addEventListener('touchmove', (e) => { if (pick && pick.on) e.preventDefault(); }, { passive: false });
  const endPick = (e) => {
    if (!pick || e.pointerId !== pick.id) return;
    clearTimeout(pick.timer); const p = pick; pick = null;
    if (!p.on) return;
    eatClick = true; setTimeout(() => { eatClick = false; }, 400);
    const [a, b] = [Math.min(p.a, p.b), Math.max(p.a, p.b)];
    if (a === b) { actions.word({ i: a }); render(); return; }
    const text = tokens().slice(a, b + 1).join(' ').slice(0, 600);
    openPhrase(text, sentenceAt(a, b)); render();
  };
  document.addEventListener('pointerup', endPick);
  document.addEventListener('pointercancel', (e) => { if (pick && e.pointerId === pick.id) { clearTimeout(pick.timer); pick = null; document.querySelectorAll('.tok.picked').forEach((t) => t.classList.remove('picked')); } });
  document.addEventListener('click', (e) => { if (eatClick && e.target.closest && e.target.closest('.tok')) { e.stopPropagation(); e.preventDefault(); eatClick = false; } }, true);

  function openWord(k, raw, ctx) {
    S.sheet = k; S.sheetRaw = raw || k; S.sheetCtx = ctx || (D[k] && D[k].sentence) || ''; S.phrase = null; S.pending = null;
    track(k, 'lookup'); S.seenToks.add(k);
  }
  function openPhrase(text, ctx) {
    S.phrase = { text: text.replace(/^[^A-Za-z0-9“"]+|[^A-Za-z0-9.?!”"]+$/g, ''), ctx }; S.sheet = null; S.pending = null; buzz(10);
  }
  const phraseKey = (t) => 'phrase-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  function savePhrase() {
    const p = S.phrase; if (!p) return;
    const k = phraseKey(p.text), ai = explainAI('phrase', p.text, p.ctx) || {};
    if (!D[k]) D[k] = { word: p.text, kind: 'common', phrase: true, meaning: ai.meaning || 'A phrase you highlighted.', ctx: ai.plain ? 'In plain English: ' + ai.plain : '', sentence: p.ctx, place: SCAN_PLACE };
    if (!isSaved(k)) actions.save({ k }); else showToast('Already in Words');
  }
  // Show text in the language picked on the card ('' = English), or the English while the translation loads.
  function inLang(text, L) {
    if (!L || !text) return esc(text);
    const t = tr(text, '', false, L);
    return t && t.status === 'ok' ? `<span ${langAttrs(L)}>${esc(t.t)}</span>` : t && t.status === 'wait' ? `<span class="tr-wait">${esc(text)}</span>` : esc(text);
  }
  function cardLangs() {
    if (!S.langs.length) return `<button type="button" class="card-addlang" data-action="lang-open">Show in my language</button>`;
    const cur = S.langs.includes(S.cardLang) ? S.cardLang : '';
    return `<div class="card-langs" role="group" aria-label="Show this card in">${[['', 'English'], ...S.langs.map((c) => [c, langOf(c).own])].map(([c, n]) => `<button type="button" class="${cur === c ? 'on' : ''}" data-action="card-lang" data-v="${c}" aria-pressed="${cur === c}" ${c ? `lang="${esc(c)}"` : ''}>${esc(n)}</button>`).join('')}</div>`;
  }
  const boldIn = (sentence, w) => { const x = esc(sentence); if (!w) return x; const re = new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); return x.replace(re, (m) => `<b>${m}</b>`); };
  const thinking = (t) => `<div class="ai-wait"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${t}</div>`;
  const aiFor = (key) => { for (const [k, v] of AIX) if (k.startsWith(key + '|') && v.status === 'ok') return v; return null; };
  const slow = (ai) => ai && ai.status === 'wait' && ai.t0 && Date.now() - ai.t0 > 5000;
  // AI off: ask once (what is sent, to whom), and after "Not now" a gentle reminder at most once a week.
  function aiAsk(what) {
    if (S.aiConsent === 'no') {
      let last = 0; try { last = Number(localStorage.getItem('linger.aiNudge') || 0); } catch {}
      if (!S.aiNudged && Date.now() - last < 7 * 86400000) return '<div class="small">AI explanations are off. You can turn them on in Settings.</div>';
      if (!S.aiNudged) { S.aiNudged = true; try { localStorage.setItem('linger.aiNudge', String(Date.now())); } catch {} }
      return `<div class="ai-ask"><span>Want to know what it means in this ${what === 'phrase' ? 'text' : 'sentence'}? Linger AI can explain it.</span><button type="button" class="link-btn" data-action="ai-allow">Turn on AI explanations</button></div>`;
    }
    return `<div class="ai-ask" role="group" aria-labelledby="aiAskH"><strong id="aiAskH">Explain this with AI?</strong>
      <span>Linger can send ${what === 'phrase' ? 'this text' : 'this word and the sentence around it'} to Linger’s server and Claude (an AI by Anthropic) to explain what it means here. Nothing is sent unless you allow it. You can change this in Settings.</span>
      <span class="sync-acts"><button type="button" class="btn small-btn" data-action="ai-deny">Not now</button><button type="button" class="btn primary small-btn" data-action="ai-allow">Allow</button></span></div>`;
  }
  // Beta testers can say whether an AI explanation helped (only the word and Linger's answer are sent, not the sentence).
  const aiRate = (key) => !BETA ? '' : S.rated && S.rated[key] ? '<div class="small ai-rated" role="status">Thanks for telling us.</div>'
    : `<div class="ai-rate" role="group" aria-label="Was this explanation helpful?"><span>Helpful?</span><button type="button" data-action="ai-rate" data-v="up" data-key="${esc(key)}" aria-label="Yes, it helped">👍</button><button type="button" data-action="ai-rate" data-v="down" data-key="${esc(key)}" aria-label="No, it didn’t help">👎</button><button type="button" class="link-btn" data-action="ai-report" data-key="${esc(key)}">Report a problem</button></div>`;
  // The word card: dictionary meaning, what it means in this sentence, easier words and an example (Linger AI).
  function wordCard() {
    const k = S.sheet, e = D[k], word = (e && e.word) || S.sheetRaw, ctx = S.sheetCtx || (e && e.sentence) || '';
    const L = S.langs.includes(S.cardLang) ? S.cardLang : '';
    const ai = /[A-Za-z]/.test(word) ? explainAI('word', S.sheetRaw || word, ctx) : null;
    const ok = ai && ai.status === 'ok', s = isSaved(k), on = S.speaking === 'word';
    const dict = e && e.meaning && !/^Looking up/.test(e.meaning) ? e.meaning : '';
    const wT = L ? tr(word, ctx, false, L) : null;
    return `<div class="item-head"><div class="wc-title"><div class="sheet-word">${esc(word)}</div>
        <button type="button" class="speak ${on ? 'on' : ''}" data-action="speak-word" aria-label="Say it aloud" ${canSpeak ? '' : 'disabled'}>${speaker}</button></div>${badge(e ? e.kind : 'common')}</div>
      ${e && e.say ? `<div class="wc-say">/${esc(e.say)}/</div>` : ''}
      ${cardLangs()}
      ${wT && wT.status === 'ok' ? `<div class="wc-tr" ${langAttrs(L)}>${esc(wT.t)}</div>` : ''}
      <div class="wc-sec"><div class="label">Meaning</div>${e && e.base && dict ? `<div class="small wc-base">A form of “${esc(e.base)}”</div>` : ''}<div class="meaning">${dict ? inLang(dict, L) : ok ? inLang(ai.meaning, L) : e && e.pending ? thinking('Looking it up…') : '<span class="small">No dictionary entry. See what it means here, below.</span>'}</div></div>
      <div class="wc-sec wc-here"><div class="label">In this sentence</div>
        ${ok ? `<div>${inLang(ai.meaning, L)}</div>${aiRate('word|' + word)}` : ai && ai.status === 'off' ? aiAsk('word') : slow(ai) ? thinking('Still working on it. This is taking longer than usual.') + (dict ? '<div class="small">The dictionary meaning is above in the meantime.</div>' : '') : ai && ai.status === 'wait' ? thinking('Linger is reading the sentence…') : `<div class="small">${e && e.ctx ? inLang(e.ctx, L) : navigator.onLine ? 'Couldn’t reach Linger AI. Open the word again in a moment.' : 'You’re offline. Open the word again when you’re back online.'}</div>`}
        ${S.sheetI != null && S.source === 'camera' && S.scan.status === 'done' ? (S.fixing ? `<div class="wc-fix-row"><label class="small" for="fixWord">What does the word really say?</label><input id="fixWord" class="paste-box" style="min-height:0;height:40px" value="${esc(word)}" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="sync-acts"><button type="button" class="btn small-btn" data-action="fix-cancel">Cancel</button><button type="button" class="btn primary small-btn" data-action="fix-save">Fix it</button></span></div>` : '<button type="button" class="link-btn wc-fix" data-action="fix-open">Misread? Fix this word</button>') : ''}
        ${ctx ? `<div class="ctx">“${boldIn(ctx, S.sheetRaw || word)}”</div>` : ''}</div>
      ${ok && ai.synonyms && ai.synonyms.length ? `<div class="wc-sec"><div class="label">Easier words</div><div class="syns">${ai.synonyms.map((x) => `<span class="syn">${esc(x)}</span>`).join('')}</div></div>` : ''}
      ${ok && ai.example ? `<div class="wc-sec"><div class="label">Example</div><div class="wc-ex">“${esc(ai.example)}”</div>${L ? `<div class="small">${inLang(ai.example, L)}</div>` : ''}</div>` : ''}
      ${e && e.local ? `<div class="local"><div class="label">${pin}Around here</div><div style="font-size: calc(14px * var(--ts, 1))">${inLang(e.local, L)}</div></div>` : ''}
      ${e ? `<div class="small" style="font-size: calc(12px * var(--ts, 1))">Seen at ${esc(placeOf(e))}</div>` : ''}
      <div class="grid2"><button type="button" class="btn" data-action="close">Close</button>${e ? `<button type="button" class="btn ${s ? 'saved' : 'primary'}${FX.saved === k ? ' pop' : ''}" data-action="save" data-k="${k}">${s ? 'Saved ✓' : 'Save to Words'}</button>` : '<button type="button" class="btn primary" data-action="close">Got it</button>'}</div>`;
  }
  // The phrase card: what a highlighted stretch of text means, in plain English, and the hard words in it.
  function phraseCard() {
    const p = S.phrase, ai = explainAI('phrase', p.text, p.ctx), ok = ai && ai.status === 'ok';
    const inside = ok ? (ai.hardWords || []).filter((h) => p.text.toLowerCase().includes(String(h.word).toLowerCase())) : [];
    const L = S.langs.includes(S.cardLang) ? S.cardLang : '', s = isSaved(phraseKey(p.text)), on = S.speaking === 'word';
    return `<div class="item-head"><div class="wc-title"><div class="label">Your highlight</div>
        <button type="button" class="speak ${on ? 'on' : ''}" data-action="speak-word" aria-label="Read it aloud" ${canSpeak ? '' : 'disabled'}>${speaker}</button></div></div>
      <div class="ph-text">“${esc(p.text)}”</div>
      ${cardLangs()}
      ${ok ? `<div class="wc-sec"><div class="label">What it means</div><div class="meaning">${inLang(ai.meaning, L)}</div></div>
        ${ai.plain ? `<div class="wc-sec"><div class="label">In plain English</div><div>${inLang(ai.plain, L)}</div></div>` : ''}
        ${inside.length ? `<div class="wc-sec"><div class="label">Words in it</div><div class="ph-words">${inside.map((h) => `<button type="button" class="ph-word" data-action="phrase-word" data-w="${esc(h.word)}"><strong>${esc(h.word)}</strong><span>${inLang(h.meaning, L)}${h.easier ? ` · <i>${esc(h.easier)}</i>` : ''}</span></button>`).join('')}</div></div>` : ''}`
        : ai && ai.status === 'off' ? aiAsk('phrase') : slow(ai) ? thinking('Still working on it. This is taking longer than usual.') : ai && ai.status === 'wait' ? thinking('Linger is reading your highlight…') : '<div class="small">Couldn’t reach Linger AI. Check your connection and try again.</div>'}
      ${ok ? aiRate('phrase|' + p.text.slice(0, 80)) : ''}
      <div class="grid2"><button type="button" class="btn" data-action="close">Close</button><button type="button" class="btn ${s ? 'saved' : 'primary'}" data-action="phrase-save" ${ok ? '' : 'disabled'}>${s ? 'Saved ✓' : 'Save to Words'}</button></div>`;
  }

  function overlay() {
    if (S.onb || S.acct) return (S.onb ? viewOnb() : '') + (S.acct ? acctSheet() : '') + toastHtml();
    if (S.activity === 'cards') return viewCards();
    if (S.activity === 'story') return viewStory();
    if (S.activity === 'match') return viewMatch();
    if (S.activity === 'bubbles') return viewBubbles();
    if (S.activity === 'scramble') return viewScramble();
    if (S.activity === 'say') return viewSay();
    if (S.activity === 'cityquiz') return viewCityQuiz();
    let html = '';
    if (S.pick) html += pickSheet();
    if (S.pending && S.tab === 'lens') {
      const secs = (1.1 + (S.pendingRaw.length % 7) * 0.15).toFixed(1);
      html += `<div class="prompt" role="dialog" aria-label="Linger noticed a pause">
        <div style="display: flex; align-items: center; gap: 10px">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9FEAFF" stroke-width="2" aria-hidden="true" style="flex: none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          <div style="font-size: calc(14px * var(--ts, 1))">You lingered on <strong>“${esc(S.pendingRaw)}”</strong> for ${secs}s. Want the meaning?</div></div>
        <div class="prompt-actions"><button type="button" class="p-no" data-action="dismiss">Not now</button><button type="button" class="p-yes" data-action="accept">Show me</button></div></div>`;
    }
    if (S.cityPick) {
      const q = (S.cityQuery || '').trim(), ql = q.toLowerCase();
      const list = Object.entries(CITIES).filter(([, c]) => !ql || [c.name, c.state, c.nick, cityName(c)].some((x) => String(x || '').toLowerCase().includes(ql))).sort((x, y) => x[1].name.localeCompare(y[1].name));
      const forQuiz = S.cityPickFor === 'quiz', mark = forQuiz ? (S.cq && S.activity === 'cityquiz' ? S.cq.city : '') : S.city;
      const exact = list.some(([, c]) => c.name.toLowerCase() === ql || cityName(c).toLowerCase() === ql), mk = S.cityMake && S.cityMake.q === q ? S.cityMake : null;
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
        <div class="panel city-panel" role="dialog" aria-label="${forQuiz ? 'Choose a city to quiz' : 'Choose a city'}"><div class="grab"></div>
          <div class="sum-title">${forQuiz ? 'Which city’s quiz?' : 'Where are you?'}</div>
          <label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="cityQ" type="search" placeholder="Search any U.S. city" value="${esc(q)}" aria-label="Search any U.S. city" autocomplete="off"></label>
          ${!q && !forQuiz ? '<button type="button" class="btn ghost" data-action="city-locate">◎ Use my location</button>' : ''}
          <div class="city-list">${list.map(([id, c]) => `<button type="button" class="city-row ${mark === id ? 'on' : ''}" data-action="city-set" data-v="${id}"><span class="city-emoji" aria-hidden="true">${ICO.pin}</span><span class="city-txt"><strong>${esc(cityName(c))}</strong><small>${esc(c.nick)}${c.ai ? ' · made by Linger AI' : ''}${forQuiz && best('city.' + id) ? ` · best ${stars(best('city.' + id))}` : ''}</small></span>${mark === id ? '<span class="tick">✓</span>' : forQuiz ? '<span class="rv-go">Quiz</span>' : ''}</button>`).join('')}</div>
          ${q.length >= 2 && !exact ? `<button type="button" class="city-make" data-action="city-make" ${mk && mk.status === 'wait' ? 'disabled' : ''}>
            ${mk && mk.status === 'wait' ? thinking(`Writing a guide for ${esc(q)}…`) : `<span class="city-emoji" aria-hidden="true">${ICO.spark}</span><span class="city-txt"><strong>Make a guide for “${esc(q)}”</strong><small>Linger AI writes slang, customs and getting around</small></span>`}</button>
            ${mk && mk.status === 'none' ? `<div class="small">Linger couldn’t find a U.S. city called “${esc(q)}”. Check the spelling, or add the state (like “Springfield, IL”).</div>` : ''}
            ${mk && mk.status === 'fail' ? '<div class="small">Couldn’t reach Linger AI. Check your connection and try again.</div>' : ''}
            ${mk && mk.status === 'off' ? '<div class="small">Making a new guide uses Linger AI. Turn on AI explanations in Settings first.</div>' : ''}` : ''}
          ${q.length >= 2 && !list.length ? `<div class="city-none"><strong>We don’t have a guide for “${esc(q)}” yet</strong>
            <div class="sync-acts">${BETA ? '<button type="button" class="link-btn" data-action="city-request">Ask us to add it</button>' : ''}<button type="button" class="link-btn" data-action="city-locate">Show the nearest city we have</button></div></div>` : ''}
          ${q ? '' : `<div class="small">${forQuiz ? 'Your own city on Local stays the same. Search for any U.S. city to add a quiz for it.' : 'Each guide has slang, customs, getting around and common mix-ups. Search for any U.S. city to add one.'}</div>`}</div></div>`;
    }
    if (S.langPick) html += langSheet();
    if (S.shareHelp && BETA && BETA.native) {
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
        <div class="panel" role="dialog" aria-label="Use Linger in any app"><div class="grab"></div>
          <div class="sum-title">Use Linger in any app</div>
          <ol class="beta-steps"><li>Take a screenshot, or select text in any app.</li><li>Tap <b>Share</b>.</li><li>Tap <b>Linger</b>. If you don't see it, scroll the app row to the end, tap <b>More</b>, and turn Linger on.</li></ol>
          <div class="small">Linger opens with the text read and explained.</div>
          <div class="grid2"><button type="button" class="btn" data-action="close">Close</button><button type="button" class="btn primary" data-action="share-try">Try a sample</button></div></div></div>`;
    } else if (S.shareHelp) {
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
        <div class="panel" role="dialog" aria-label="Use Linger in any app"><div class="grab"></div>
          <div class="sum-title">Use Linger in any app</div>
          <div class="small">Select text in a text message, email, web page or PDF, tap <b>Share</b>, and pick Linger. It opens with the explanation ready.</div>
          <div class="howto"><div class="howto-h">Android</div>
            <ol><li>Install Linger: ${installEvt ? '<button type="button" class="link-btn" data-action="install">tap here to install</button>' : 'in Chrome, tap <b>⋮</b> then <b>Install app</b> (or <b>Add to Home screen</b>)'}.</li>
            <li>In any app, select text and tap <b>Share</b>.</li><li>Choose <b>Linger</b>.</li></ol></div>
          <div class="howto"><div class="howto-h">iPhone</div>
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
          <ul class="points">${s.points.map(([ic, t], pi) => { const x = tr(t.replace(/<[^>]+>/g, '')); return `<li style="--i:${pi}"><span class="pi" aria-hidden="true"></span><span>${t}${x ? `<span class="tr-line" ${langAttrs()}>${x.status === 'ok' ? esc(x.t) : x.status === 'wait' ? 'Translating…' : ''}</span>` : ''}</span></li>`; }).join('')}</ul>
          ${S.lang ? `<div class="small">Also in ${esc(langLabel())}. <button type="button" class="link-btn" data-action="lang-open">Change</button></div>` : ''}
          ${s.dates.length ? `<div style="display: flex; flex-direction: column; gap: 6px"><div class="label" style="color: var(--muted)">Key dates</div><div class="dates" style="--n:${s.points.length}">${s.dates.map((d, di) => `<span class="date" style="--i:${di}">${/^\s*\$/.test(d) ? '' : calIcon}${esc(d)}</span>`).join('')}</div></div>` : ''}
          ${S.source === 'camera' && isImportant(TEXTS.camera) ? importantCard([]) : ''}
          <div class="small">${esc(s.note)} ${n} words on this page are underlined. Tap one for its meaning.</div>
          <button type="button" class="btn primary" data-action="close">Got it</button></div></div>`;
    }
    if (S.calOpen && S.tab === 'words') html += monthSheet(savedOn());
    if (S.privacy) html += `<div class="sheet"><div class="scrim" aria-hidden="true"></div>
        <div class="panel" role="dialog" aria-labelledby="pvTitle"><div class="grab"></div>
          <div class="sum-title" id="pvTitle">Before you scan</div>
          <ul class="points pv-points">
            <li><span class="pi" aria-hidden="true"></span><span><b>Photos are read on this phone.</b> The picture itself isn’t uploaded.</span></li>
            <li><span class="pi" aria-hidden="true"></span><span>If you turn on <b>AI explanations</b>, a word you open and the sentence around it go to Linger’s server and to Claude (an AI by Anthropic). Nothing is sent unless you allow it.</span></li>
            <li><span class="pi" aria-hidden="true"></span><span>Bank, medical or immigration papers? Only scan what you’re comfortable with.</span></li>
          </ul>
          <label class="pv-keep"><input type="checkbox" data-action="privacy-keep" ${keepScans() ? 'checked' : ''}> Keep the text of my last scan on this phone, so I can open it again</label>
          <button type="button" class="btn primary" data-action="privacy-ok">Got it</button></div></div>`;
    if (BETA) html += betaOverlay();
    html += toastHtml();
    if (S.offline && !S.offlineHidden) html += `<div class="offline-bar" role="status"><span><strong>You’re offline.</strong> Saved words, Review and Local still work. AI explanations and sync wait until you’re back online.</span><button type="button" data-action="offline-hide" aria-label="Hide this message">✕</button></div>`;
    if (SHELL_BUILD && SHELL_BUILD < REQUIRED_SHELL) html += `<div class="shell-block" role="alertdialog" aria-labelledby="shH"><strong id="shH">Update Linger in TestFlight</strong><span>This version of the Linger app is too old for the latest beta. Open TestFlight and tap Update.</span><a class="btn primary" href="itms-beta://">Open TestFlight</a></div>`;
    if (S.sheet || S.phrase) {
      html += `<div class="sheet"><button type="button" class="scrim" aria-label="Close" data-action="close"></button>
        <div class="panel word-card" role="dialog" aria-label="${S.phrase ? 'What your highlight means' : 'Word meaning'}"><div class="grab"></div>${S.phrase ? phraseCard() : wordCard()}</div></div>`;
    }
    return html;
  }

  // ---------- render ----------
  const scroll = document.getElementById('scroll');
  const over = document.getElementById('overlay');
  const screenEl = document.querySelector('.screen');
  let lastTab = null, lastPanelSig = null, lastToast = '', lastViewKey = '', justSwitched = '';
  // Segmented switches (Scan / Upload / Paste, All / Slang / Hard, Slang / Customs / …): the screen is redrawn on every
  // tap, so the highlight is slid by hand from where it was to the new choice.
  function segPlaces() {
    const m = {};
    scroll.querySelectorAll('.lh-switch').forEach((g) => { const on = g.querySelector('.on'); if (on) m[g.getAttribute('aria-label')] = { x: on.offsetLeft, w: on.offsetWidth }; });
    return m;
  }
  function segSlide(prev) {
    if (calm()) return;
    scroll.querySelectorAll('.lh-switch').forEach((g) => {
      const p = prev[g.getAttribute('aria-label')], on = g.querySelector('.on');
      if (!p || !on || Math.abs(p.x - on.offsetLeft) < 2 || !on.animate) return;
      const ghost = document.createElement('span');
      ghost.className = 'seg-ghost';
      ghost.style.cssText = `left:${on.offsetLeft}px;top:${on.offsetTop}px;height:${on.offsetHeight}px;width:${on.offsetWidth}px;background:${getComputedStyle(on).backgroundColor}`;
      g.classList.add('sliding'); g.prepend(ghost);
      buzz(6);
      const a = ghost.animate([{ transform: `translateX(${p.x - on.offsetLeft}px)`, width: p.w + 'px' }, { transform: 'none', width: on.offsetWidth + 'px' }], { duration: 280, easing: 'cubic-bezier(.3, 1.25, .5, 1)' });
      const done = () => { ghost.remove(); g.classList.remove('sliding'); };
      a.onfinish = done; a.oncancel = done;
    });
  }
  // Settings switches: the knob slides across instead of jumping.
  function switchFlip() {
    if (!justSwitched) return;
    const sw = scroll.querySelector(`.switch[data-action="${justSwitched}"]`);
    justSwitched = '';
    if (sw && !calm()) { sw.classList.add('just'); buzz(8); }
  }
  // The rings in the header turn very slowly. The header is redrawn on every tap, so each new copy picks up the turn
  // where the last one was.
  const ringT0 = performance.now();
  function ringDrift() { scroll.querySelectorAll('.wh-rings img').forEach((el) => { el.style.animationDelay = -((performance.now() - ringT0) % 90000) + 'ms'; }); }
  function render() {
    const views = { lens: viewLens, words: viewWords, local: viewLocal, review: viewReview, settings: viewSettings, profile: viewProfile };
    const top = scroll.scrollTop;
    const focusQ = document.activeElement && document.activeElement.id === 'q';
    const caret = focusQ ? document.activeElement.selectionStart : 0;
    const segs = segPlaces();
    scroll.innerHTML = views[S.tab]();
    scroll.scrollTop = lastTab === S.tab ? top : 0;
    // A new screen rises in; a new section or filter on the same screen deals its cards in. Other taps redraw in place.
    const viewKey = [S.tab, S.localSeg, S.wordFilter, S.city, S.activity, S.calDay, S.setSec, S.profSec].join('|');
    scroll.classList.remove('view-in', 'list-in');
    if (!calm() && lastTab !== S.tab) scroll.classList.add('view-in');
    else if (!calm() && viewKey !== lastViewKey) scroll.classList.add('list-in');
    if (lastTab !== null && lastTab !== S.tab) buzz(8);
    if (lastTab !== S.tab && S.tab !== 'lens') S.sheetUp = { ...(S.sheetUp || {}), [S.tab]: false }; // a fresh screen starts at the top, header showing
    lastTab = S.tab; lastViewKey = viewKey;
    segSlide(segs);
    switchFlip();
    ringDrift();
    over.innerHTML = overlay();
    // The overlay is redrawn on every tap: a sheet or toast that was already showing stays put instead of sliding in again.
    const panelSig = [S.calOpen, S.phrase && S.phrase.text, S.sheet, S.explain, S.cityPick, S.langPick, S.shareHelp, !!S.feedback, S.installHelp, S.acct, S.onb ? 'onb' + S.onb.step + (S.onb.test ? 't' : '') : '', S.activity, S.coach].join('|');
    over.classList.toggle('keep-panel', panelSig === lastPanelSig);
    over.classList.toggle('keep-toast', S.toast === lastToast);
    lastPanelSig = panelSig; lastToast = S.toast;
    for (const k in FX) delete FX[k];
    screenEl.classList.toggle('full', !!S.activity);
    screenEl.classList.toggle('on-lens', S.tab === 'lens');
    const camEl = document.getElementById('cam');
    if (camEl && camStream && camEl.srcObject !== camStream) { camEl.srcObject = camStream; camEl.play().catch(() => {}); }
    document.querySelectorAll('.tabbar button').forEach((b, i) => {
      if (b.dataset.tab === S.tab) { b.setAttribute('aria-current', 'page'); b.parentNode.style.setProperty('--tab', i); } else b.removeAttribute('aria-current');
    });
    const bar = document.querySelector('.tabbar'); if (bar) bar.classList.toggle('no-tab', !['lens', 'words', 'local', 'review'].includes(S.tab));
    if (focusQ) { const q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(caret, caret); } }
    sheetSetup();
    runCounts();
  }

  // ---------- pull-up sheet ----------
  // The handle at the top of each white sheet works like a phone's bottom sheet: drag it up and the sheet covers
  // the page (the header shrinks to a thin strip), drag it down to bring the header back. Tapping it toggles.
  const SHEET_TOP = 80; // the tucked-away header: a 56px sticky banner plus the drawer's 24px rounded top (plus the status bar)
  let safeTop = null;
  const statusBar = () => {
    if (safeTop === null) { const p = document.createElement('div'); p.style.cssText = 'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'; document.body.appendChild(p); safeTop = p.offsetHeight; p.remove(); }
    return safeTop;
  };
  const sheetIsUp = () => !!(S.sheetUp && S.sheetUp[S.tab]);
  const lensExpand = (up) => { S.sheetUp = { ...(S.sheetUp || {}), lens: up }; };
  function sheetSetup() {
    // A freshly drawn screen takes its sheet position at once (no animation when switching tabs).
    screenEl.classList.add('sheet-drag');
    screenEl.classList.toggle('sheet-up', sheetIsUp());
    void screenEl.offsetHeight;
    screenEl.classList.remove('sheet-drag');
    const body = scroll.querySelector('.hero + .body');
    if (!body || body.querySelector(':scope > .sheet-grab')) return;
    if (!(S.tab === 'lens' && body.classList.contains('lb-result'))) return; // only a Lens result has a handle; Words, Local and Review follow the scroll
    body.insertAdjacentHTML('afterbegin', `<button type="button" class="sheet-grab" aria-expanded="${sheetIsUp()}" aria-label="${sheetIsUp() ? 'Show the header again' : 'Pull the sheet up to fill the screen'}"></button>`);
  }
  // Animate the header to a height, then hand control back to CSS.
  // The parts that stay on screen in both looks (title, account, and on Lens Language and Settings) glide and shrink
  // from the big header into the banner and back ("smart animate"); everything else fades.
  const keepers = (hero) => [hero.querySelector('.wh-title .loc-city') || hero.querySelector('.wh-title h1'), hero.querySelector(':scope > .lh-topbar') || hero.querySelector(':scope > .av-btn')].filter(Boolean);
  function sheetTo(up) {
    const hero = scroll.querySelector('.hero');
    if (!hero) return;
    const from = hero.getBoundingClientRect().height;
    const keep = keepers(hero), first = keep.map((el) => el.getBoundingClientRect());
    const fs0 = keep.map((el) => parseFloat(getComputedStyle(el.matches('h1') ? el : el.querySelector('h1') || el).fontSize));
    // Measure the end height with animations off (otherwise the browser reports the starting height).
    screenEl.classList.add('sheet-drag');
    screenEl.classList.toggle('sheet-up', up); hero.style.height = '';
    const to = hero.getBoundingClientRect().height;
    const last = keep.map((el) => el.getBoundingClientRect());
    hero.style.height = from + 'px'; hero.style.setProperty('--fade', up ? 1 : 0);
    const glide = !calm();
    if (glide) keep.forEach((el, i) => {
      const a = first[i], b = last[i], f1 = parseFloat(getComputedStyle(el.matches('h1') ? el : el.querySelector('h1') || el).fontSize), s = i === 0 && f1 ? fs0[i] / f1 : 1; // the title scales by its font size
      el.style.transformOrigin = '0 0'; el.style.transition = 'none';
      el.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${s})`;
    });
    void hero.offsetHeight;
    screenEl.classList.remove('sheet-drag');
    void hero.offsetHeight;
    hero.style.height = to + 'px'; hero.style.setProperty('--fade', up ? 0 : 1);
    if (glide) keep.forEach((el) => { el.style.transition = 'transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1)'; el.style.transform = ''; el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transformOrigin = ''; }, { once: true }); });
    const done = () => { hero.style.height = ''; hero.style.removeProperty('--fade'); };
    hero.addEventListener('transitionend', done, { once: true }); setTimeout(done, 450);
    S.sheetUp = { ...(S.sheetUp || {}), [S.tab]: up };
    const g = scroll.querySelector('.sheet-grab');
    if (g) { g.setAttribute('aria-expanded', String(up)); g.setAttribute('aria-label', up ? 'Show the header again' : 'Pull the sheet up to fill the screen'); }
  }
  // Words, Local and Review: scrolling the drawer down tucks the header away (the drawer stops at the top of the
  // screen), scrolling back up brings the header back. Pages too short to scroll keep their header.
  const AUTO_TABS = new Set(['words', 'local', 'review', 'settings', 'profile']);
  let sLast = 0, sAcc = 0, sLock = 0;
  scroll.addEventListener('scroll', () => {
    const st = scroll.scrollTop, dy = st - sLast; sLast = st;
    if (!AUTO_TABS.has(S.tab) || drag) return;
    if (performance.now() < sLock) { sAcc = 0; return; } // the header is still moving (its own height change scrolls too)
    sAcc = (sAcc > 0) === (dy > 0) ? sAcc + dy : dy;
    const up = sheetIsUp();
    if (!up && sAcc > 12 && st > 4) autoSheet(true);
    else if (up && (sAcc < -12 || st < 0)) autoSheet(false);
  }, { passive: true });
  function autoSheet(up) {
    if (!scroll.querySelector('.hero')) return;
    // Tucked away, the drawer fills the whole screen even when its list is short (so it can't bounce back by itself).
    if (up) screenEl.style.setProperty('--fill', (scroll.clientHeight - SHEET_TOP - statusBar() + 24) + 'px');
    sLock = performance.now() + 450; sAcc = 0; sheetTo(up);
  }
  // Already at the top of the drawer: pulling down (mouse wheel, trackpad or finger) brings the header back.
  const atTop = () => AUTO_TABS.has(S.tab) && sheetIsUp() && scroll.scrollTop <= 0 && performance.now() >= sLock;
  scroll.addEventListener('wheel', (e) => { if (e.deltaY < 0 && atTop()) autoSheet(false); }, { passive: true });
  let tY = null;
  scroll.addEventListener('touchstart', (e) => { tY = e.touches[0].clientY; }, { passive: true });
  scroll.addEventListener('touchmove', (e) => { if (tY !== null && e.touches[0].clientY - tY > 24 && atTop()) { tY = null; autoSheet(false); } }, { passive: true });
  scroll.addEventListener('touchend', () => { tY = null; }, { passive: true });
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const g = e.target.closest && e.target.closest('.sheet-grab'); if (!g) return;
    const hero = scroll.querySelector('.hero'); if (!hero) return;
    const up = sheetIsUp();
    screenEl.classList.add('sheet-drag'); // measure with animations off
    screenEl.classList.remove('sheet-up'); hero.style.height = '';
    const full = hero.getBoundingClientRect().height; // the header's normal height
    screenEl.classList.toggle('sheet-up', up);
    void hero.offsetHeight;
    screenEl.classList.remove('sheet-drag');
    drag = { g, hero, y0: e.clientY, h0: hero.getBoundingClientRect().height, min: SHEET_TOP + statusBar(), max: full, moved: false };
    try { g.setPointerCapture(e.pointerId); } catch {}
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dy) < 6) return;
    if (!drag.moved) { drag.moved = true; screenEl.classList.add('sheet-drag'); }
    const h = Math.max(drag.min, Math.min(drag.max, drag.h0 + dy));
    drag.hero.style.height = h + 'px';
    drag.hero.style.setProperty('--fade', ((h - drag.min) / (drag.max - drag.min)).toFixed(3));
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    screenEl.classList.remove('sheet-drag');
    if (!d.moved) return; // a tap: the click below toggles
    d.g.dataset.dragged = '1';
    const h = d.hero.getBoundingClientRect().height, dy = e.clientY - d.y0;
    sheetTo(dy < -40 || (dy <= 40 && h < (d.min + d.max) / 2)); // a clear flick wins; otherwise the nearer end
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('click', (e) => {
    const g = e.target.closest && e.target.closest('.sheet-grab'); if (!g) return;
    if (g.dataset.dragged) { delete g.dataset.dragged; return; }
    sheetTo(!sheetIsUp());
  });

  // ---------- actions ----------
  const actions = {
    tab: (d) => { stopSpeaking(); closeCamera(); S.tab = d.tab; S.pending = null; S.sheet = null; S.explain = false; },
    word: (d) => {
      S.sheetI = Number(d.i); S.fixing = false;
      fx('ink', Number(d.i));
      const raw = tokens()[Number(d.i)];
      const k = keyOf(raw);
      if (k && S.source === 'camera') makeEntry(k, TEXTS.camera, SCAN_PLACE);
      if (!k) return;
      const clean = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
      openWord(k, clean, sentenceAt(Number(d.i)));
    },
    open: (d) => { openWord(d.k, D[d.k] ? D[d.k].word : d.k, D[d.k] ? D[d.k].sentence : ''); },
    'card-lang': (d) => { S.cardLang = d.v; buzz(5); },
    'phrase-word': (d) => { const k = keyOf(d.w); if (!k) return; if (!D[k]) makeEntry(k, S.phrase ? S.phrase.ctx : '', SCAN_PLACE); openWord(k, d.w, S.phrase ? S.phrase.ctx : ''); },
    'phrase-save': () => savePhrase(),
    'text-tr': () => { if (!S.lang) { S.langPick = true; return; } S.textTr = !S.textTr; },
    accept: () => { S.sheet = S.pending; S.sheetRaw = S.pendingRaw; S.pending = null; track(S.sheet, 'lookup'); S.seenToks.add(S.sheet); },
    dismiss: () => { track(S.pending, 'dismiss'); S.pending = null; },
    'acct-open': () => { S.coach = false; S.sheet = null; S.phrase = null; S.pending = null; S.profSec = null; if (S.tab !== 'profile') { S.prevTab = S.tab === 'settings' ? 'lens' : S.tab; S.tab = 'profile'; } },
    'profile-back': () => { S.tab = S.prevTab || 'lens'; S.profSec = null; },
    'prof-sec': (d) => { if (S.tab !== 'profile') { S.prevTab = S.tab === 'settings' ? S.setFrom || 'lens' : S.tab; S.tab = 'profile'; } S.profSec = d.v || null; S.pvClear = false; S.nameMsg = null; scroll.scrollTop = 0; },
    'set-sec': (d) => { if (S.tab !== 'settings') { stopSpeaking(); closeCamera(); S.setFrom = S.tab; S.tab = 'settings'; S.pending = null; S.sheet = null; S.explain = false; } S.setSec = d.v || null; S.pvClear = false; scroll.scrollTop = 0; },
    'set-close': () => { S.tab = S.setFrom === 'profile' ? 'profile' : 'lens'; S.setFrom = null; S.setSec = null; },
    'pv-clear': (d) => {
      if (d.v === 'ask') { S.pvClear = true; return; }
      if (d.v !== 'yes') { S.pvClear = false; return; }
      if (signedInAs()) return; // signed in: deleting goes through Profile → Account
      stopSync();
      try { Object.keys(localStorage).filter((k) => k.startsWith('linger.')).forEach((k) => localStorage.removeItem(k)); } catch {}
      location.reload(); return false;
    },
    'level-check': () => { startOnb(true, 2); },
    'level-test': () => { startOnb(true, 2); if (window.LingerTest) S.onb.test = { t: LingerTest.start(), res: null }; },
    'onb-first': () => { S.acct = false; startOnb(false); },
    'onb-read': (d) => {
      const o = S.onb, r = o.reads, i = r.indexOf(d.v);
      if (i >= 0) r.splice(i, 1);
      else if (d.v === 'all') o.reads = ['all']; // "Everything" stands alone
      else { o.reads = r.filter((x) => x !== 'all'); o.reads.push(d.v); }
      if (d.v === 'other' && o.reads.includes('other')) setTimeout(() => { const f = document.getElementById('onbOther'); if (f) f.focus(); }, 0);
    },
    'onb-dd': () => { S.onb.langOpen = !S.onb.langOpen; S.onb.q = ''; if (S.onb.langOpen) setTimeout(() => { const q = document.getElementById('onbQ'); if (q) q.focus(); }, 0); },
    'onb-lang': (d) => {
      const o = S.onb, i = o.langs.indexOf(d.v);
      if (i >= 0) o.langs.splice(i, 1);
      else if (o.langs.length >= 3) showToast('Up to 3 languages. Remove one first.');
      else o.langs.push(d.v);
    },
    'onb-level': (d) => { S.onb.level = d.v; },
    'onb-next': () => { const o = S.onb; o.langOpen = false; if (o.step < 2) o.step += 1; else finishOnb(false); },
    'onb-back': () => { S.onb.step = Math.max(0, S.onb.step - 1); S.onb.langOpen = false; },
    'onb-skip': () => { if (S.onb.edit) S.onb = null; else finishOnb(true); },
    'onb-edit': () => { S.acct = false; startOnb(true); },
    'test-start': () => { if (window.LingerTest) S.onb.test = { t: LingerTest.start(), res: null }; },
    'test-answer': (d) => { const x = S.onb.test; LingerTest.answer(x.t, d.v); if (LingerTest.done(x.t)) x.res = LingerTest.result(x.t); },
    'test-word': (d) => { LingerTest.sayWord(S.onb.test.t, d.v === 'yes'); },
    'test-stop': () => { S.onb.test = null; },
    'test-agree': () => { const o = S.onb, r = o.test.res; o.level = r.level; o.testResult = { cefr: r.cefr, level: r.level, right: r.right, total: r.total, words: r.words, agreed: true, at: Date.now() }; o.test = null; finishOnb(false); },
    'test-disagree': () => { const o = S.onb, r = o.test.res; o.suggested = r.level; o.level = ''; o.testResult = { cefr: r.cefr, level: r.level, right: r.right, total: r.total, words: r.words, agreed: false, at: Date.now() }; o.test = null; },
    'onb-signin': () => { S.acct = true; S.acctFromOnb = true; },
    'acct-later': () => { S.acct = false; S.acctPitch = false; if (window.LingerAccount) LingerAccount.openForm('in'); showToast('All set! Make a profile anytime from your picture ↗'); },
    close: () => { if (S.langPick && S.langBack === 'explain' && S.tab === 'lens' && TEXTS[S.source]) { S.langPick = false; S.langBack = null; S.explain = true; return; } S.langBack = null; S.cityPickFor = null; S.phrase = null; S.acct = false; S.acctPitch = false; S.acctFromOnb = false; S.paste = false; S.shareHelp = false; S.cityPick = false; S.langPick = false; if (S.speaking === 'summary' || S.speaking === 'word') stopSpeaking(); S.sheet = null; S.explain = false; },
    explain: () => { stopSpeaking(); S.explain = true; S.pending = null; S.sheet = null; },
    read: () => { readLens(); },
    'speak-summary': () => { speak('summary', summaryText(SUMMARY[S.source])); },
    'speak-word': () => { if (S.phrase) { speak('word', S.phrase.text); return; } const e = D[S.sheet]; speak('word', e ? e.word : S.sheetRaw); },
    ask: () => { S.askFirst = !S.askFirst; },
    a11y: (d) => { const v = ['text', 'zoom'].includes(d.k) ? Number(d.v) : d.v; setA11y(d.k, v); buzz(6); },
    'a11y-toggle': (d) => { setA11y(d.k, !A11Y[d.k]); },
    'a11y-reset': () => { Object.assign(A11Y, A11Y_DEF); setA11y('theme', 'system'); showToast('Display and accessibility reset'); },
    'lang-open': () => { S.langPick = true; S.langQuery = ''; S.langBack = S.explain ? 'explain' : null; S.sheet = null; S.explain = false; },
    // The language they tap becomes the main one (first), so the scan's translation and summary switch to it right away.
    'lang-set': (d) => {
      const before = S.langs.slice(), name = d.v && langOf(d.v) ? langOf(d.v).own : '';
      if (!d.v) setLangs([]);
      else if (S.langs[0] === d.v) return;
      else setLangs([d.v, ...S.langs.filter((c) => c !== d.v)].slice(0, 3));
      if (S.prefs.done) savePrefs({});
      if (S.langs.join() !== before.join()) { S.langUndo = before; TTR.forEach((v, k) => { if (v.status === 'fail') TTR.delete(k); }); showToast(!d.v ? 'English only' : `Now reading in ${name}`, { label: 'Undo', action: 'lang-undo' }); }
    },
    'lang-rm': (d) => {
      const before = S.langs.slice(), name = langOf(d.v) ? langOf(d.v).own : '';
      setLangs(S.langs.filter((c) => c !== d.v)); if (S.prefs.done) savePrefs({});
      S.langUndo = before; showToast(`Removed ${name}`, { label: 'Undo', action: 'lang-undo' });
    },
    'speak-tr': (d) => { speak('tr', d.t, null, d.l || S.lang); },
    auto: () => { S.autoHard = !S.autoHard; },
    save: (d, el) => {
      const adding = !isSaved(d.k);
      toggleSave(d.k);
      if (!adding) return;
      fx('saved', d.k); buzz(12);
      const tab = document.querySelector('.tabbar [data-tab="words"]'), w = D[d.k] ? D[d.k].word : d.k;
      fly(el, tab, esc(cap(w)), 'fly-word').then(() => bump(tab));
    },
    filter: (d) => { S.wordFilter = d.v; },
    seg: (d) => { S.localSeg = d.v; },
    'city-pick': (d) => { S.cityPick = true; S.cityPickFor = d.v || null; S.cityQuery = ''; S.cityMake = null; },
    'city-make': () => { const q = (S.cityQuery || '').trim(); if (q) makeCity(q); },
    'city-set': (d) => { stopSpeaking(); pickCity(d.v); },
    'city-locate': () => { S.cityPick = false; locateCity(); },
    hear: (d) => { const e = D[d.k]; if (e) speak('hear-' + d.k, `${e.word}. ${e.sentence}`); },
    play: (d) => {
      if (WORD_GAMES.includes(d.v) && !d.go) { S.pick = { game: d.v, sel: S.pick && S.pick.game === d.v ? S.pick.sel : [] }; return; }
      stopSpeaking(); stopBubbles(); stopListening(); S.pick = null; S.sheet = null; S.explain = false; S.activity = d.v;
      if (d.v === 'story') newGame(0);
      else if (d.v === 'match') startMatch();
      else if (d.v === 'bubbles') startBubbles();
      else if (d.v === 'scramble') startScramble();
      else if (d.v === 'say') startSay();
      else if (d.v === 'cityquiz') { if (d.city === 'home') S.quizCity = null; startCityQuiz(); }
      else { const all = d.only ? d.only : practiceOrder(); S.cards = { idx: 0, revealed: false, order: all.slice(0, SESSION), rest: all.slice(SESSION), done: 0 }; }
    },
    'mt-pick': (d) => matchPick(d.side, d.k),
    'pk-word': (d) => { const p = S.pick, i = p.sel.indexOf(d.k); if (i >= 0) p.sel.splice(i, 1); else p.sel.push(d.k); buzz(5); },
    'pk-all': () => { const p = S.pick, all = pickable(p.game); p.sel = p.sel.length === all.length ? [] : all.slice(); },
    'pk-go': () => { S.gameWords = S.pick.sel.slice(); actions.play({ v: S.pick.game, go: 1 }); },
    'pk-random': () => { S.gameWords = null; actions.play({ v: S.pick.game, go: 1 }); },
    'pk-close': () => { S.pick = null; },
    'say-hear': () => { const g = S.say; if (g) speak('say', D[g.words[g.i]].word, null, 'en-US', 0.75); },
    'say-mic': () => sayListen(),
    'say-next': () => sayNext(),
    'cq-answer': (d) => cityAnswer(Number(d.i)),
    'cq-next': () => cityNext(),
    'bb-pop': (d) => bubblePop(d.k),
    'us-tile': (d) => scrambleTile(Number(d.t)),
    'us-slot': (d) => scrambleSlot(Number(d.s)),
    'us-hint': () => scrambleHint(),
    'us-hear': () => { const u = S.scramble; if (u) speak('word', D[u.words[u.i]].word); },
    'us-next': () => scrambleNext(),
    'cam-start': () => { startCamera(); },
    'cam-close': () => { closeCamera(); },
    'cam-flip': () => { flipCamera(); },
    // The capture button: turns the camera on the first time, then takes the photo.
    shutter: () => { if (S.scan.status === 'live') capture(); else startCamera(); },
    // The Lens switch: picking a mode clears what was read and shows that mode's card.
    'lens-mode': (d) => {
      stopSpeaking(); S.pending = null; S.sheet = null; S.explain = false; lensExpand(false);
      if (d.v !== 'scan') pauseCamera();
      const busy = S.scan.status === 'reading';
      if (!busy) S.scan = { status: S.scan.status === 'live' && d.v === 'scan' ? 'live' : 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' };
      S.lensMode = d.v;
      if (!busy && d.v === 'scan') backToCamera();
    },
    retake: () => { stopSpeaking(); lensExpand(false); S.pending = null; S.sheet = null; S.explain = false; S.lensMode = 'scan'; S.scan = { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }; backToCamera(); if (S.scan.status !== 'live') startCamera(); },
    'open-settings': () => { if (BETA) BETA.post({ open: 'settings' }); },
    'add-page': () => {
      S.addPage = { text: TEXTS.camera, pages: S.scan.pages || 1, scan: { ...S.scan } };
      stopSpeaking(); lensExpand(false); S.pending = null; S.sheet = null; S.explain = false;
      if (S.scan.origin === 'upload') { S.lensMode = 'upload'; S.scan = { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'upload' }; return; }
      S.lensMode = 'scan'; S.scan = { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }; backToCamera(); if (S.scan.status !== 'live') startCamera();
    },
    'add-page-cancel': () => { const a = S.addPage; if (!a) return; S.addPage = null; pauseCamera(); TEXTS.camera = a.text; S.source = 'camera'; S.scan = a.scan; S.lensMode = a.scan.origin === 'upload' ? 'upload' : 'scan'; },
    'forget-scan': () => { try { localStorage.removeItem(LAST_SCAN); } catch {} if (S.scan.status === 'done') S.scan.noKeep = true; showToast('Not kept. This scan is gone when you clear it or close Linger.'); },
    'resume-open': () => { const l = lastScan(); if (!l) return; stopSpeaking(); pauseCamera(); TEXTS.camera = l.text; SUMMARY.camera = summarize(l.text); S.source = 'camera'; S.tab = 'lens'; S.scan = { status: 'done', progress: 100, img: null, msg: '', conf: l.conf || 0, origin: l.origin || 'camera', pages: l.pages || 1, notEnglish: !looksEnglish(l.text) }; S.shotView = 'text'; },
    'resume-dismiss': () => { try { localStorage.removeItem(SCAN_BUSY); } catch {} },
    'privacy-ok': () => { try { localStorage.setItem(PRIVACY_SEEN, String(Date.now())); } catch {} S.privacy = false; const n = S.privacyNext; S.privacyNext = null; if (n) setTimeout(n, 0); },
    'privacy-keep': () => { try { localStorage.setItem(KEEP_SCANS, keepScans() ? 'no' : 'yes'); if (!keepScans()) localStorage.removeItem(LAST_SCAN); } catch {} },
    'lens-clear': () => {
      stopSpeaking(); lensExpand(false);
      const wasPhoto = S.scan.origin === 'camera';
      S.scan = { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }; S.pasteDraft = ''; S.pending = null; S.sheet = null; S.explain = false;
      if (wasPhoto && S.lensMode === 'scan') backToCamera(); // ready for the next photo, no new permission prompt
    },
    'paste-clip': async () => { try { const t = await navigator.clipboard.readText(); if (t) { S.pasteDraft = t; render(); } } catch { const b = document.getElementById('pasteText'); if (b) b.focus(); } },
    rescan: () => { stopSpeaking(); S.scan = { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }; S.pending = null; S.sheet = null; S.explain = false; },
    settings: () => { stopSpeaking(); closeCamera(); S.setFrom = S.tab; S.setSec = null; S.tab = 'settings'; S.pending = null; S.sheet = null; S.explain = false; },
    'paste-open': () => { stopSpeaking(); closeCamera(); S.tab = 'lens'; S.lensMode = 'paste'; S.scan = { status: 'idle', progress: 0, img: null, msg: '', conf: 0, origin: 'camera' }; S.pending = null; S.sheet = null; S.explain = false; },
    'cal-day': (d) => { const same = S.calDay === d.v || (!S.calDay && d.v === dayKey(new Date())); S.calDay = same && S.calDay ? null : d.v; buzz(6); },
    'cal-week': (d) => { S.calWeek = Math.min(0, (S.calWeek || 0) + Number(d.v)); fx('wk', Number(d.v) > 0 ? 'next' : 'prev'); },
    'cal-open': () => { const t = shownDay(); S.calMonth = { y: t.getFullYear(), m: t.getMonth() }; S.calOpen = true; },
    'cal-close': () => { S.calOpen = false; },
    'cal-month': (d) => { const m = S.calMonth, x = new Date(m.y, m.m + Number(d.v), 1); S.calMonth = { y: x.getFullYear(), m: x.getMonth() }; },
    'cal-pick': (d) => { S.calDay = d.v; S.calOpen = false; calWeekFor(d.v); },
    'cal-all': () => { S.calDay = null; S.calOpen = false; },
    'cal-today': () => { S.calDay = null; S.calWeek = 0; S.calOpen = false; },
    'shot-view': (d) => { S.shotView = d.v; stopSpeaking(); },
    'paste-go': () => { const t = S.pasteDraft; if (t.trim()) handleText(t, 'paste'); },
    'share-help': () => { S.shareHelp = true; },
    'sync-on': () => { startSync(S.sync.code || LingerSync.newCode()); },
    'sync-off': () => { stopSync(); },
    'sync-copy': async () => { const u = (document.getElementById('readerUrl') || {}).textContent || ''; try { await navigator.clipboard.writeText(u); showToast('Reader link copied'); } catch { window.prompt('Open this on your laptop:', u); } },
    'share-try': () => { S.shareHelp = false; handleText(SHARE_SAMPLE, 'share'); },
    'beta-feedback': () => { S.feedback = { kind: 'bug', text: '', email: signedInAs() || '', screen: S.tab, sending: false }; },
    'beta-kind': (d) => { S.feedback.kind = d.v; },
    'beta-send': async () => {
      const f = S.feedback; if (!f || !f.text.trim() || f.sending) return;
      f.sending = true; render();
      const r = await BETA.sendFeedback(f.text, { kind: f.kind, screen: f.screen, email: f.email });
      S.feedback = null;
      showToast(r === 'sent' ? 'Thanks! Your feedback was sent.' : 'Saved on this phone. Linger will send it later.');
      if (r === 'sent') paperPlane();
      render();
    },
    'beta-install': () => { S.installHelp = true; S.installTip = false; betaTipLater(); },
    'beta-tip-later': () => { S.installTip = false; betaTipLater(); },
    'beta-close': () => { S.feedback = null; S.installHelp = false; },
    install: async () => { S.installHelp = false; if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; },
    capture: () => { capture(); },
    quit: () => { stopBubbles(); stopListening(); S.activity = null; S.game = null; S.match = null; S.bubbles = null; S.scramble = null; S.say = null; S.cq = null; },
    'card-reveal': () => revealCard(),
    'cards-empty-lens': () => { S.activity = null; S.tab = 'lens'; },
    'card-next': (d) => {
      const c = S.cards, deck = [...(c.order || practiceOrder()), ...(c.again || [])], k = deck[c.idx];
      if (k && d.v) track(k, 'review', d.v === 'knew'); // their answer feeds the learning model
      if ((c.flag || d.v === 'again') && k && !(c.again || []).includes(k)) c.again = [...(c.again || []), k];
      c.idx += 1; c.revealed = false; c.flag = false; fx('deal');
      if (d.v === 'knew') buzz(12);
    },
    'card-flag': () => { S.cards.flag = !S.cards.flag; },
    'cards-more': () => { const c = S.cards; const done = (c.done || 0) + (c.order || []).length + (c.again || []).length; S.cards = { idx: 0, revealed: false, order: c.rest.slice(0, SESSION), rest: c.rest.slice(SESSION), done }; },
    'tricky-go': () => actions.play({ v: 'cards', only: trickyWords() }),
    'clear-search': () => { S.query = ''; },
    'undo-unsave': () => { const r = S.lastRemoved; S.toast = ''; S.toastAct = null; if (!r || isSaved(r.k)) return; toggleSave(r.k); if (r.date) { S.savedDates[r.k] = r.date; persist(); } S.lastRemoved = null; },
    'lang-undo': () => { if (S.langUndo) { setLangs(S.langUndo); if (S.prefs.done) savePrefs({}); } S.langUndo = null; S.toast = ''; S.toastAct = null; },
    'offline-hide': () => { S.offlineHidden = true; },
    'ai-allow': () => { setAiConsent('yes'); },
    'ai-deny': () => { setAiConsent('no'); S.aiNudged = true; try { localStorage.setItem('linger.aiNudge', String(Date.now())); } catch {} },
    'ai-toggle': () => { setAiConsent(aiOK() ? 'no' : 'yes'); },
    'ai-rate': (d) => { S.rated = { ...(S.rated || {}), [d.key]: d.v }; const ai = aiFor(d.key); BETA.sendFeedback(`AI explanation ${d.v === 'up' ? 'helped' : 'did not help'}: ${d.key.split('|').slice(1).join('|')} → ${ai ? ai.meaning : ''}`.slice(0, 600), { kind: d.v === 'up' ? 'other' : 'bug', screen: 'word-card' }); },
    'ai-report': (d) => { S.sheet = null; S.phrase = null; S.feedback = { kind: 'bug', text: `Problem with the AI explanation of “${d.key.split('|').slice(1).join('|')}”: `, email: signedInAs() || '', screen: 'word-card', sending: false }; },
    'fix-open': () => { S.fixing = true; setTimeout(() => { const el = document.getElementById('fixWord'); if (el) { el.focus(); el.select(); } }, 0); },
    'fix-cancel': () => { S.fixing = false; },
    'fix-save': () => {
      const el = document.getElementById('fixWord'), w = el ? el.value.trim() : '', i = S.sheetI, toks = tokens();
      if (!/^[A-Za-z][A-Za-z'’-]{0,30}$/.test(w) || i == null || !toks[i]) { showToast('Type one word, using letters only.'); return; }
      const m = toks[i].match(/^([^A-Za-z]*)[\s\S]*?([^A-Za-z]*)$/); toks[i] = (m ? m[1] : '') + w + (m ? m[2] : '');
      TEXTS.camera = toks.join(' '); SUMMARY.camera = summarize(TEXTS.camera); S.fixing = false; rememberScan();
      const k = keyOf(w); if (k) { makeEntry(k, TEXTS.camera, SCAN_PLACE); openWord(k, w, sentenceAt(i)); }
      showToast(`Fixed. Now it says “${w}”.`);
    },
    'city-request': () => { const q = (S.cityQuery || '').trim(); if (!q || !BETA) return; BETA.sendFeedback('City request: ' + q, { kind: 'idea', screen: 'city' }); showToast(`Thanks! We’ll pass “${q}” on to the team.`); },
    'open-testflight': () => { location.href = 'itms-beta://'; },
    pick: (d) => { const g = S.game; g.sel = g.sel === d.k ? null : d.k; },
    blank: (d) => {
      const g = S.game, b = Number(d.b);
      if (g.checked) return;
      if (g.sel) { const prev = g.placed.indexOf(g.sel); if (prev >= 0) g.placed[prev] = null; g.placed[b] = g.sel; g.sel = null; fx('land', b); buzz(8); }
      else if (g.placed[b]) { g.placed[b] = null; } // tap a filled blank to send the word back
    },
    check: () => {
      const g = S.game;
      if (g.placed.includes(null)) return;
      g.checked = true; g.missIdx = 0; fx('checked');
      buzz(g.placed.every((w, i) => w === STORIES[g.story].parts[i * 2 + 1]) ? [12, 60, 12] : 20);
      STORIES[g.story].parts.filter((_, i) => i % 2 === 1).forEach((a, i) => track(a, 'review', g.placed[i] === a));
    },
    'miss-next': () => { S.game.missIdx += 1; },
    fix: () => { const g = S.game; g.placed = STORIES[g.story].parts.filter((_, i) => i % 2 === 1); g.fixed = true; g.missIdx = 0; },
    'next-story': () => { const n = S.game.story + 1; if (n < STORIES.length) newGame(n); else { S.activity = null; S.game = null; S.tab = 'review'; } }
  };
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]');
    if (!b || !actions[b.dataset.action]) return;
    if (b.classList.contains('switch')) justSwitched = b.dataset.action;
    if (actions[b.dataset.action](b.dataset, b) !== false) render(); // false: the action animates first, then redraws itself
  });
  // Profile → Account → Your name.
  document.addEventListener('submit', async (ev) => {
    if (ev.target.id !== 'nameForm') return;
    ev.preventDefault();
    const el = document.getElementById('nameIn'), v = (el ? el.value : '').replace(/\s+/g, ' ').trim();
    if (v.length > 40) { S.nameMsg = { bad: true, t: 'Use 40 letters or fewer.' }; shake(ev.target); render(); return; }
    if (/[<>{}]/.test(v)) { S.nameMsg = { bad: true, t: 'Use letters, numbers and spaces only.' }; shake(ev.target); render(); return; }
    if (v === S.name) { S.nameMsg = { bad: false, t: v ? 'That’s already your name.' : 'No name set. Your email name is shown.' }; render(); return; }
    S.name = v; try { if (v) localStorage.setItem(NAME_KEY, v); else localStorage.removeItem(NAME_KEY); } catch {}
    if (!signedInAs()) { S.nameMsg = { bad: false, t: v ? 'Saved on this phone.' : 'Name removed.' }; render(); return; }
    S.nameBusy = true; render();
    const ok = navigator.onLine && await LingerAccount.saveProfile({ name: v });
    S.nameBusy = false;
    S.nameMsg = ok ? { bad: false, t: v ? 'Saved to your account.' : 'Name removed.' } : { bad: true, t: 'Saved on this phone. It will go to your account when you’re back online.' };
    if (!ok) S.namePending = true;
    render();
  });
  document.addEventListener('change', async (ev) => {
    if (ev.target.id === 'acctPhoto') {
      const pf = ev.target.files && ev.target.files[0], email = signedInAs();
      ev.target.value = '';
      if (!pf || !email) return;
      if (pf.type && !/^image\//.test(pf.type)) { showToast('That file isn’t a picture. Choose a photo instead.'); render(); return; }
      if (pf.size > 25 * 1024 * 1024) { showToast('That picture is too big. Choose one under 25 MB.'); render(); return; }
      try { S.photo = await squarePhoto(await fileToDataURL(pf)); } catch { showToast('That picture couldn’t be opened. Try another one.'); render(); return; }
      photoCache(email, S.photo); render();
      const ok = await LingerAccount.saveProfile({ photo: S.photo });
      showToast(ok ? 'Profile picture saved' : 'Saved on this phone. It couldn’t reach your account right now.'); render();
      return;
    }
    const f = ev.target.files && ev.target.files[0];
    if (!f || ev.target.id !== 'photo') return;
    ev.target.value = '';
    scanImage(await fileToDataURL(f), 'upload');
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'q') { S.query = ev.target.value; render(); }
    if (ev.target.id === 'onbOther' && S.onb) {
      S.onb.other = ev.target.value;
      const b = document.querySelector('[data-action=onb-next]'); if (b) b.disabled = !S.onb.other.trim();
    }
    if (ev.target.id === 'onbQ' && S.onb) {
      S.onb.q = ev.target.value; const pos = ev.target.selectionStart;
      over.innerHTML = overlay();
      const q = document.getElementById('onbQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
    if (ev.target.id === 'cityQ') {
      S.cityQuery = ev.target.value; const pos = ev.target.selectionStart;
      over.innerHTML = overlay();
      const q = document.getElementById('cityQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
    if (ev.target.id === 'langQ') {
      S.langQuery = ev.target.value; const pos = ev.target.selectionStart;
      over.innerHTML = overlay();
      const q = document.getElementById('langQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
    if (ev.target.id === 'fbText' && S.feedback) { S.feedback.text = ev.target.value; const b = document.getElementById('fbSend'); if (b) b.disabled = !S.feedback.text.trim(); }
    if (ev.target.id === 'fbEmail' && S.feedback) S.feedback.email = ev.target.value;
    if (ev.target.id === 'pasteText') {
      S.pasteDraft = ev.target.value;
      const go = document.getElementById('pasteGo'); if (go) go.disabled = !S.pasteDraft.trim();
      const pb = document.querySelector('.lh-pastebtn'); if (pb) pb.hidden = !!S.pasteDraft;
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (S.feedback || S.installHelp) { S.feedback = null; S.installHelp = false; render(); return; }
    if (S.acct) { S.acct = false; S.acctPitch = false; S.acctFromOnb = false; render(); return; }
    if (S.onb) { if (S.onb.edit) { S.onb = null; render(); } return; } // first-time setup: use Skip
    if (S.sheet || S.pending || S.explain || S.paste || S.shareHelp || S.cityPick || S.langPick) { S.sheet = null; S.pending = null; S.explain = false; S.paste = false; S.shareHelp = false; S.cityPick = false; S.langPick = false; render(); }
    else if (S.activity) { S.activity = null; S.game = null; render(); }
    else if (S.tab === 'settings') { if (S.setSec) S.setSec = null; else { S.tab = S.setFrom === 'profile' ? 'profile' : 'lens'; S.setFrom = null; } render(); }
    else if (S.tab === 'profile' && S.profSec) { S.profSec = null; render(); }
  });

  // Test hook: feed an image to the scanner without a camera.
  window.lingerTest = { scan: (src) => scanImage(src) };

  // ---------- shared or pasted text ----------
  // Text arrives from the phone's Share menu as ?text=… (Android share target, or the iPhone Shortcut).
  function handleText(raw, origin) {
    if (origin === 'paste' && needPrivacy(() => handleText(raw, origin))) return;
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
    S.explain = true; rememberScan();
  }
  S.offline = !navigator.onLine;
  window.addEventListener('offline', () => { S.offline = true; S.offlineHidden = false; render(); });
  window.addEventListener('online', () => { S.offline = false; showToast('Back online'); if (S.namePending && signedInAs()) { S.namePending = false; LingerAccount.saveProfile({ name: S.name }); } render(); });
  // The iPhone app is older than the newest shell in TestFlight: say so once a day.
  if (SHELL_BUILD && SHELL_BUILD < LATEST_SHELL) { let t = 0; try { t = Number(localStorage.getItem('linger.shellNag') || 0); } catch {} if (Date.now() - t > 86400000) { try { localStorage.setItem('linger.shellNag', String(Date.now())); } catch {} setTimeout(() => { showToast('A newer Linger app is ready in TestFlight', { label: 'Open', action: 'open-testflight' }); render(); }, 2500); } }
  const params = new URLSearchParams(location.search);
  if (['paste', 'upload', 'scan'].includes(params.get('lens'))) { S.tab = 'lens'; S.lensMode = params.get('lens'); }
  const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join(' ');
  if (shared) { handleText(shared, 'share'); history.replaceState(null, '', location.pathname); }
  { const saved = (() => { try { return localStorage.getItem(SYNC_KEY); } catch { return null; } })(); if (saved) startSync(saved); }
  // Account sync (account.js): the same word shape as pairing, kept under the signed-in user. Works alongside pairing.
  // Learning progress follows the account (debounced inside learn.js; one small map in the profile).
  if (L && window.LingerAccount) L.onChange(() => { if (signedInAs()) LingerAccount.saveProfile({ learn: L.all() }); });
  if (window.LingerAccount) LingerAccount.attach({
    skip: (k, it) => isSeed(k, it && it.date), // old example words in the account are deleted, not restored
    words: () => Object.fromEntries(S.saved.filter((k) => D[k]).map((k) => [k, wordData(k)])),
    apply: ({ add = {}, remove = [], quiet = false }) => {
      Object.entries(add).forEach(([k, it]) => {
        if (!D[k]) D[k] = { word: String(it.w || k).toLowerCase(), kind: 'hard', meaning: String(it.m || ''), ctx: it.p ? 'In plain English: ' + it.p : 'Saved on another device.', sentence: String(it.s || ''), place: String(it.place || 'Another device'), imported: true };
        if (!isSaved(k)) { S.saved.unshift(k); S.savedDates[k] = it.date || today(); }
      });
      remove.forEach((k) => { const i = S.saved.indexOf(k); if (i >= 0) S.saved.splice(i, 1); if (syncConn && !quiet) syncConn.remove(k); }); // quiet: signing out, leave the pairing document alone
      persist(); render();
    },
    render: () => render(),
    notify: (m) => { showToast(m); render(); },
    // Signed in: the account's reading setup and profile picture. (null: signed out.)
    profile: (p) => {
      if (!p) { S.photo = ''; if (S.nameFromAcct) { S.name = ''; S.nameFromAcct = false; try { localStorage.removeItem(NAME_KEY); localStorage.removeItem(NAME_KEY + '.acct'); } catch {} } render(); return; } // signed out: the account's name leaves this phone too
      const email = signedInAs();
      if (typeof p.photo === 'string') { S.photo = p.photo; photoCache(email, p.photo); }
      // Name: the account's wins; if the account has none yet, send this phone's.
      S.nameFromAcct = true; try { localStorage.setItem(NAME_KEY + '.acct', '1'); } catch {}
      if (typeof p.name === 'string' && p.name && !S.namePending) { S.name = p.name; try { localStorage.setItem(NAME_KEY, p.name); } catch {} }
      else if (S.name && (!p.name || S.namePending)) { S.namePending = false; LingerAccount.saveProfile({ name: S.name }); }
      // Learning progress: keep the newest copy of each word, then send back anything this device knows better.
      if (L) { L.merge(p.learn); if (L.newerThan(p.learn)) LingerAccount.saveProfile({ learn: L.all() }); }
      const r = p.prefs && typeof p.prefs === 'object' ? p.prefs : null;
      if (r && (!S.prefs.done || (r.at || 0) > (S.prefs.at || 0))) {
        // The account's setup is newer (or this device has none): use it here, so this device skips onboarding.
        S.prefs = { reads: Array.isArray(r.reads) ? r.reads.filter((id) => READS.some((x) => x[0] === id)) : [], other: typeof r.other === 'string' ? r.other.slice(0, 80) : '',
          level: LEVELS.some((l) => l[0] === r.level) ? r.level : '', test: r.test && typeof r.test === 'object' ? r.test : null, done: true, at: r.at || Date.now() };
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(S.prefs)); } catch {}
        if (Array.isArray(r.langs)) setLangs(r.langs); else if (typeof r.lang === 'string') setLangs(r.lang ? [r.lang] : []);
        if (firstRead() && S.scan.status === 'idle') S.lensMode = firstRead()[3];
        if (S.onb && !S.onb.edit) { S.onb = null; S.acct = false; S.tab = 'lens'; showToast('Welcome back! Your setup is loaded.'); }
      } else if (S.prefs.done && S.prefs.at && (!r || S.prefs.at > (r.at || 0))) {
        LingerAccount.saveProfile({ prefs: prefsOut() });
      }
      if (S.acctFromOnb && S.onb) S.acct = false; // signed in from onboarding: back to the questions
      if (S.acctPitch) { S.acctPitch = false; S.acct = false; showToast('All set! Your words now save to your account.'); } // made a profile at the end of setup
      S.acctFromOnb = false;
      render();
    }
  });
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
    // Phones show the app full screen (no frame to shrink). And never refit while typing: the keyboard shrinks the
    // window, which used to zoom the whole app in and out.
    if (window.innerWidth <= 520 || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) return;
    const f = Math.min(1, Math.max(0.55, (window.innerHeight - 48) / 868));
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  window.addEventListener('resize', fit);
  fit();
  // First visit: the three setup questions open right away, each with Skip (not when Linger was opened to explain
  // something shared from another app, or to import words). Signing in on the first question loads an existing setup.
  S.coach = false;
  if (!S.prefs.done && !shared && !params.get('import')) startOnb(false);
  // iPhone app (ios/): the Share extension hands over a screenshot or text; the app passes it in here.
  window.LingerNative = {
    heard(m) { sayHeard((m && m.texts) || [], m && m.error); }, // the iPhone app's speech recognizer (Say it)
    receive(m) {
      if (!m) return;
      S.acct = false; S.onb = null; S.activity = null; S.coach = false; S.installTip = false; S.feedback = null; S.installHelp = false;
      if (m.type === 'image' && m.data) scanImage(m.data, 'upload');
      else if (m.type === 'text' && m.text) { handleText(m.text, 'share'); render(); }
    }
  };
  // Beta: offer the Home Screen once on a phone (not again for a week after "Later").
  const TIP_KEY = 'linger.beta.installtip';
  function betaTipLater() { try { localStorage.setItem(TIP_KEY, String(Date.now())); } catch {} }
  if (BETA && !BETA.standalone() && BETA.platform !== 'other')
    S.installTip = (() => { try { return Date.now() - Number(localStorage.getItem(TIP_KEY) || 0) > 7 * 86400000; } catch { return false; } })();

  render();
  if (BETA && BETA.native) BETA.post({ ready: true }); // the iPhone app sends anything waiting from the Share menu
})();

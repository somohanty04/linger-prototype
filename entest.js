// Linger's English check (onboarding → "Not sure" → "Take the English check"). About 4 minutes, two parts.
//
// Part 1, word recognition (32 quick taps): "Do you know this word?" for 24 real words, 4 from each of six frequency
// bands, and 8 made-up words. This is the yes/no method of Meara and of LexTALE (Lemhöfer & Broersma 2012): saying
// yes to made-up words shows how much someone over-claims, and each band's "yes" rate is corrected for it:
// known = (yes to real − yes to made-up) / (1 − yes to made-up). From that, Linger estimates how many of the 5,000 most
// common English words they know and maps it to a CEFR level with the approximate ranges from Milton & Alexiou (2009):
// under 1,500 A1, 2,500 A2, 3,250 B1, 3,750 B2, 4,500 C1, then C2. The words and bands come from wordfreq (Speer,
// frequencies of English across many sources), checked against the dictionary: base words only, no names. The test
// items are Linger's own; no items are copied from those tests.
//
// Part 2, meaning in context (10 questions): a word in an everyday sentence (letters, stores, work, leases) with four
// meanings and "I don't know". 48 questions in six bands of 8, ordered by how common the word is. It starts at the band
// part 1 suggested, moves up after a right answer and down after a wrong one, and is scored by the level that best
// explains the answers (allowing for 1-in-4 lucky guesses).
//
// The result weighs part 2 more (it checks understanding, not just recognition). If someone said yes to many made-up
// words, part 1 counts for less. Linger shows the level and lets the reader agree or choose their own.
(() => {
  'use strict';
  const BANDS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  // Word recognition: 12 real words per band (band = rank among common English base words, from wordfreq),
  // and made-up words that look like English (checked: not in wordfreq or the dictionary).
  const REAL = [
    ["mouth", "money", "family", "police", "problem", "surprise", "knowledge", "reduce", "negative", "generation", "approach", "throw"],
    ["salary", "comfort", "penalty", "stranger", "passenger", "stomach", "charity", "opposite", "surgery", "phrase", "absence", "regulation"],
    ["harvest", "attendance", "prospect", "proportion", "anxious", "medication", "loyalty", "immigrant", "nutrition", "rhythm", "cottage", "requirement"],
    ["energetic", "absorb", "vague", "coupon", "dentist", "debris", "illusion", "geometry", "hollow", "cough", "violin", "prone"],
    ["postpone", "pavement", "congestion", "banquet", "alleviate", "prudent", "mitigate", "attire", "rinse", "evade", "competence", "invaluable"],
    ["deteriorate", "enigma", "melancholy", "pristine", "tempest", "harrowing", "shoddy", "unwittingly", "versatility", "attributable", "modernity", "exclamation"]
  ];
  const FAKE = ["brontile", "plensive", "mulvery", "crandish", "stoffle", "pernicate", "glimber", "fennow", "trudgeon", "silvate", "clowery", "morphant", "quindle", "spratten", "dorrible", "fluncheon", "grastic", "melvoid", "yornish", "branical", "scrandle", "haffitude", "vorpid", "tresimate"];
  // Meaning in context: [band, word, sentence, right answer, three wrong answers, Zipf frequency]. Ordered by how common
  // the word is (wordfreq), 8 per band.
  const MEANING = [
    [0, "free", "Children ride the bus for free.", "Without paying", ["With a parent", "Only on weekends", "Very fast"], 5.63],
    [0, "available", "The manager is not available today.", "Free to talk or meet", ["Polite", "In a bad mood", "Paid"], 5.28],
    [0, "previous", "Please list your previous address.", "The one before now", ["Your work address", "Your next address", "Your email"], 5.0],
    [0, "heavy", "This box is too heavy for me.", "Hard to lift", ["Too small", "Very soft", "Easy to open"], 4.96],
    [0, "insurance", "Your insurance covers the visit.", "A plan that pays some costs for you", ["A doctor’s note", "A tax form", "A bank account"], 4.94],
    [0, "busy", "The doctor is busy right now.", "Has a lot to do", ["Not at work", "Sick", "Happy"], 4.75],
    [0, "cheap", "These shoes are cheap.", "Low in price", ["Very old", "Too big", "Easy to break"], 4.71],
    [0, "tired", "I am tired after work.", "Needing rest or sleep", ["Very hungry", "Late", "Angry"], 4.71],
    [1, "quiet", "Please be quiet in the library.", "Not making noise", ["Very clean", "Quick", "Careful"], 4.65],
    [1, "empty", "The bus was almost empty.", "With no one inside", ["Very fast", "Full of people", "Broken"], 4.59],
    [1, "rent", "My rent is due on the first of the month.", "Money you pay to live in a place", ["A gas bill", "A bank loan", "Your salary"], 4.58],
    [1, "deliver", "They will deliver the package on Monday.", "Bring it to you", ["Open it", "Pay for it", "Send it back"], 4.55],
    [1, "appointment", "I have a doctor’s appointment at 3.", "A planned time to meet", ["A bill to pay", "A kind of medicine", "A phone call"], 4.49],
    [1, "symptoms", "Call us if your symptoms get worse.", "Signs that you are sick", ["Medicine bills", "Doctor visits", "Test results"], 4.48],
    [1, "arrive", "The train will arrive at 5.", "Get there", ["Leave", "Stop working", "Be late"], 4.38],
    [1, "premium", "The monthly premium is $40.", "What you pay for insurance", ["A discount", "A reward you get", "A tip"], 4.33],
    [2, "eligible", "You are eligible for a discount.", "Allowed to get it", ["Too late for it", "Asked to pay for it", "Not interested in it"], 4.29],
    [2, "deposit", "You will get your deposit back when you move out.", "Money paid at the start and held for you", ["Your last rent payment", "A late fee", "A gift from the landlord"], 4.24],
    [2, "fever", "My son has a fever.", "A high body temperature", ["A cough", "A cold drink", "A bad dream"], 4.22],
    [2, "cancel", "They had to cancel the flight because of snow.", "Say it will not happen", ["Move it earlier", "Fill every seat", "Make it cheaper"], 4.18],
    [2, "mandatory", "Training is mandatory for all staff.", "Required", ["Optional", "Paid extra", "Online only"], 4.13],
    [2, "deadline", "The deadline to apply is Friday.", "The last day you can do it", ["The first day", "A meeting", "The price"], 4.12],
    [2, "comply", "All visitors must comply with the rules.", "Follow", ["Write", "Question", "Change"], 4.04],
    [2, "borrow", "Can I borrow your pen?", "Use it and give it back", ["Buy it", "Break it", "Clean it"], 4.0],
    [3, "refund", "The store gave me a refund.", "My money back", ["A free gift", "A receipt", "A discount card"], 3.94],
    [3, "receipt", "Keep your receipt in case you return it.", "The paper that shows you paid", ["The box it came in", "A coupon", "The price tag"], 3.92],
    [3, "landlord", "Tell your landlord about the leak.", "The person who owns your rental home", ["Your neighbor", "A plumber", "A city worker"], 3.89],
    [3, "liable", "You are liable for any damage to the car.", "Responsible and must pay", ["Protected", "Not allowed to drive", "Thanked"], 3.89],
    [3, "verify", "We need to verify your identity.", "Check that it is true", ["Change it", "Hide it", "Forget it"], 3.88],
    [3, "tenant", "The tenant must pay rent on the 1st.", "A person who rents a home", ["The building owner", "A neighbor", "A repair worker"], 3.78],
    [3, "overdue", "Your library book is overdue.", "Late", ["Damaged", "Lost", "Very popular"], 3.5],
    [3, "postpone", "We had to postpone the meeting.", "Move it to a later time", ["End it forever", "Start it early", "Record it"], 3.48],
    [4, "notwithstanding", "Notwithstanding the above, rent is due monthly.", "Even so; despite that", ["Because of that", "Before that", "Instead of rent"], 3.48],
    [4, "subpoena", "She received a subpoena to appear in court.", "An order to come to court", ["A thank-you letter", "A job offer", "A parking permit"], 3.34],
    [4, "waive", "The bank will waive the fee this month.", "Not charge it", ["Double it", "Explain it", "Add it later"], 3.24],
    [4, "lien", "There is a lien on the car.", "A legal claim until a debt is paid", ["A broken part", "A new paint job", "A parking ticket"], 3.2],
    [4, "severance", "He got two months of severance pay.", "Money paid when a job ends", ["Extra pay for overtime", "A holiday bonus", "Money for travel"], 3.16],
    [4, "grievance", "Employees may file a grievance with HR.", "A formal complaint", ["A request for a raise", "A thank-you note", "A vacation request"], 3.15],
    [4, "jeopardize", "Late payments can jeopardize your credit.", "Put it at risk", ["Improve it", "Measure it", "Hide it"], 3.1],
    [4, "reimburse", "The company will reimburse your travel costs.", "Pay you back for them", ["Check them", "Lower them", "Refuse them"], 3.06],
    [5, "arrears", "Any arrears must be paid by the 1st.", "Money owed that is already late", ["Parking fees", "Money paid early", "A security deposit"], 3.05],
    [5, "garnish", "The court may garnish your wages.", "Take part of them to pay a debt", ["Raise them", "Count them", "Pay them early"], 3.04],
    [5, "hereinafter", "Maria Lopez, hereinafter “the Buyer”, agrees to pay.", "From now on in this document", ["Before this date", "Only in the title", "In another language"], 2.95],
    [5, "accrue", "Interest will accrue daily.", "Build up over time", ["Be removed", "Be paid back", "Stay the same"], 2.91],
    [5, "stipulates", "The contract stipulates 30 days’ notice.", "Clearly requires", ["Suggests", "Forgets to mention", "Shortens"], 2.86],
    [5, "forthwith", "Payment is due forthwith.", "Right away", ["Next month", "In small parts", "After a reminder"], 2.65],
    [5, "indemnify", "The tenant agrees to indemnify the landlord.", "Pay for any loss or damage", ["Live with", "Report to", "Thank"], 2.61],
    [5, "abrogated", "The agreement may be abrogated by either party.", "Officially ended", ["Signed again", "Translated", "Copied"], 2.38]
  ].map(([b, w, s, a, o, z]) => ({ b, w, s, a, o, z }));

  // Where each recognition band sits in the frequency list (rank among base words), to estimate words known.
  const RANKS = [[0, 1500], [1500, 3000], [3000, 4500], [4500, 6500], [6500, 9500], [9500, 14000]];
  const MILTON = [1500, 2500, 3250, 3750, 4500]; // words known of the first 5,000 → A1 … C2 (approximate)
  const PER_BAND = 4, FAKES = 8, MEANING_QS = 10;
  const QUESTIONS = 6 * PER_BAND + FAKES + MEANING_QS;

  const shuffle = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  function start(rnd = Math.random) {
    const words = [];
    REAL.forEach((list, b) => shuffle(list, rnd).slice(0, PER_BAND).forEach((w) => words.push({ w, b, real: true })));
    shuffle(FAKE, rnd).slice(0, FAKES).forEach((w) => words.push({ w, real: false }));
    // Easier words a little earlier, so the start isn't discouraging; made-up ones spread through.
    const yn = shuffle(words, rnd).sort((a, b) => ((a.real ? a.b : 2.5) + rnd() * 3) - ((b.real ? b.b : 2.5) + rnd() * 3));
    return { phase: 'words', yn, i: 0, said: [], asked: [], band: 2, rnd, q: null };
  }
  // Part 1: they said yes (true) or no (false) to the current word.
  function sayWord(t, yes) {
    t.said.push({ ...t.yn[t.i], yes }); t.i += 1;
    if (t.i >= t.yn.length) { t.phase = 'meaning'; t.words = scoreWords(t); t.band = Math.min(4, t.words.band); t.q = pick(t); }
  }
  function scoreWords(t) {
    const fake = t.said.filter((x) => !x.real), F = fake.length ? fake.filter((x) => x.yes).length / fake.length : 0;
    const known = RANKS.map((_, b) => {
      const r = t.said.filter((x) => x.real && x.b === b); if (!r.length) return 0;
      const H = r.filter((x) => x.yes).length / r.length;
      return F >= 1 ? 0 : Math.max(0, Math.min(1, (H - F) / (1 - F)));
    });
    // Words known among the 5,000 most common: each band's share of that range × how much of the band they know.
    const of5k = RANKS.reduce((s, [a, b], i) => s + Math.max(0, Math.min(b, 5000) - a) * known[i], 0);
    let band = MILTON.findIndex((x) => of5k < x); if (band < 0) band = 5;
    if (band === 5 && known[5] < 0.5) band = 4; // C2 also needs the rare band
    return { of5k: Math.round(of5k / 50) * 50, band, falseYes: F, known };
  }
  // Part 2: the next meaning question near the current band.
  function pick(t) {
    const used = new Set(t.asked.map((a) => a.w));
    const left = MEANING.filter((x) => !used.has(x.w));
    const near = Math.min(...left.map((x) => Math.abs(x.b - t.band)));
    const pool = left.filter((x) => Math.abs(x.b - t.band) === near);
    const it = pool[Math.floor(t.rnd() * pool.length)];
    return { ...it, choices: shuffle([it.a, ...it.o], t.rnd) };
  }
  // choice: the answer text, or '' for "I don't know".
  function answer(t, choice) {
    const q = t.q, ok = choice === q.a;
    t.asked.push({ w: q.w, b: q.b, ok, idk: choice === '' });
    t.band = Math.max(0, Math.min(5, t.band + (ok ? 1 : -1)));
    t.q = t.asked.length < MEANING_QS ? pick(t) : null;
    if (!t.q) t.phase = 'done';
    return ok;
  }
  const done = (t) => t.phase === 'done';
  const progress = (t) => (t.phase === 'words' ? t.i : t.yn.length + t.asked.length);
  // Part 2's level: the one that best explains the answers (right 95% at or below it; above it only lucky guesses,
  // and an honest "I don't know" counts more strongly against knowing it). Ties go to the lower level.
  function scoreMeaning(t) {
    let best = 0, bestL = -Infinity;
    for (let lvl = -1; lvl <= 5; lvl++) {
      let L = 0;
      for (const a of t.asked) { const k = a.b <= lvl; L += Math.log(a.ok ? (k ? 0.95 : 0.25) : a.idk ? (k ? 0.02 : 0.5) : (k ? 0.03 : 0.25)); }
      if (L > bestL + 1e-9) { bestL = L; best = lvl; }
    }
    return Math.max(0, best);
  }
  function result(t) {
    const words = t.words || scoreWords(t), meaning = scoreMeaning(t);
    const wWords = words.falseYes > 0.25 ? 0.15 : 0.4; // many yeses to made-up words: trust part 1 less
    const band = Math.max(0, Math.min(5, Math.round(wWords * words.band + (1 - wWords) * meaning)));
    return { band, cefr: BANDS[band], level: band <= 1 ? 'beginner' : band <= 3 ? 'intermediate' : 'advanced',
      right: t.asked.filter((a) => a.ok).length, total: t.asked.length, words: words.of5k, wordsCefr: BANDS[words.band], meaningCefr: BANDS[meaning],
      overclaim: words.falseYes > 0.25 };
  }
  window.LingerTest = { start, sayWord, answer, done, result, progress, BANDS, REAL, FAKE, MEANING, QUESTIONS, ITEMS: MEANING };
})();

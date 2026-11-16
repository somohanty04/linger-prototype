// Linger's learning model: from what someone does with a word, estimate how likely they are to know it.
//
// Signals, per word:
//   lookup   opened the word's meaning (tapped it in Lens, said "Show me" after lingering, opened it from Words)
//   repeat   a lookup within 7 days of the last one: a strong sign the word hasn't stuck yet
//   dismiss  Linger noticed a pause and they said "Not now": a weak sign they know it
//   save     saved the word: they care about it and are still learning it
//   review   a flashcard ("I knew it" / "Still learning") or a blank in Fill in the story (right / wrong)
//
// The estimate, p = chance they know the word right now (0 to 1):
//   1. A starting guess from their English level (onboarding) against how hard the word is
//      (everyday word, Linger's hard-word list, local slang, longer words), as log-odds.
//   2. Lookups, repeats, saves and dismissals move that guess (also in log-odds). A word looked up once long
//      ago and never again drifts back up: they probably got it.
//   3. Reviews are the strongest evidence. Each word has a memory half-life in days (how long until they'd have
//      a 50% chance of remembering it): a right answer multiplies it (more when the review came late, like
//      spaced repetition), a wrong answer cuts it. Recall today = 2^(-days since last review / half-life).
//      Once a word has been reviewed, recall counts for most of the estimate. After a wrong answer, recall stays
//      low (they just saw the answer, but that isn't knowing it) until they get it right again.
//
// Labels: Known (p ≥ 0.8), Almost (0.5 to 0.8), Learning (below 0.5). Due for review: reviewed words whose
// recall has dropped below 0.6, and saved words never reviewed.
//
// Stored on the device (localStorage 'linger.learn.v1') and, when signed in, in the account profile (`learn`),
// merged word by word: the copy with the newest change wins.
(() => {
  'use strict';
  const KEY = 'linger.learn.v1';
  const DAY = 86400000;
  const REPEAT_DAYS = 7;
  const sig = (x) => 1 / (1 + Math.exp(-x));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  let now = () => Date.now();
  let W = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } })();
  let onChange = null, saveT = null;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch {} if (onChange) onChange(); }, 300); };

  // A word's record: n lookups, r repeats, x dismissals, s saved (0/1), c right, w wrong, k streak of right answers,
  // h half-life in days, lr last review, ll last lookup, u last change (all times in ms).
  const blank = () => ({ n: 0, r: 0, x: 0, s: 0, c: 0, w: 0, k: 0, h: 0, lr: 0, ll: 0, u: 0 });
  function record(word, type, ok) {
    if (!word) return;
    const t = now(), e = W[word] || (W[word] = blank());
    if (type === 'lookup') { if (e.ll && t - e.ll < REPEAT_DAYS * DAY) e.r += 1; e.n += 1; e.ll = t; }
    else if (type === 'dismiss') e.x += 1;
    else if (type === 'save') e.s = 1;
    else if (type === 'unsave') e.s = 0;
    else if (type === 'review') {
      const gap = e.lr ? (t - e.lr) / DAY : 0;
      const before = e.h ? Math.pow(2, -gap / e.h) : 0; // how likely they were to remember it just now
      if (ok) {
        e.c += 1; e.k += 1;
        // Remembering after a long gap (low expected recall) says more than remembering a minute later.
        e.h = e.h ? clamp(e.h * (1.8 + 1.4 * (1 - before)), 1, 365) : 2;
      } else { e.w += 1; e.k = 0; e.h = e.h ? Math.max(0.25, e.h * 0.35) : 0.25; }
      e.lr = t;
    } else return;
    e.u = t; save();
  }

  // How hard a word is (log-odds against knowing it) and how strong the reader is, from what the app knows.
  const ABILITY = { beginner: -1.2, intermediate: 0.2, advanced: 1.6, unsure: 0 };
  function prior(info = {}) {
    let diff = info.kind === 'slang' ? 1.8 : info.hard ? 1.2 : -1.6; // everyday words: most people know them
    diff += clamp(((info.len || 6) - 7) * 0.18, -0.4, 1);
    return (ABILITY[info.level] ?? 0) - diff;
  }
  // p: chance they know the word now. info: { kind, hard, len, level } from the app.
  function estimate(word, info) {
    const e = W[word], base = prior(info);
    if (!e) return { p: sig(base), label: label(sig(base)), due: false, seen: false };
    const t = now();
    let L = base;
    if (e.n) {
      L -= 1.3 + 0.45 * Math.min(e.n - 1, 4) + 0.7 * Math.min(e.r, 4);
      // Looked up, then not again for a while: it probably stuck (up to +1.2 after a month).
      if (!e.c && !e.w) L += clamp((t - e.ll) / DAY / 25, 0, 1.2);
    }
    L -= 0.5 * e.s;
    L += 0.4 * Math.min(e.x, 3);
    const fromUse = sig(L);
    let p = fromUse, recall = null;
    if (e.lr) {
      recall = Math.pow(2, -((t - e.lr) / DAY) / e.h);
      if (e.w && !e.k) recall = Math.min(recall, 0.3); // the last answer was wrong: still learning until they get it right
      const weight = clamp(0.55 + 0.1 * (e.c + e.w), 0.55, 0.85);
      p = weight * recall + (1 - weight) * fromUse;
    }
    p = clamp(p, 0.01, 0.99);
    const due = e.lr ? recall < 0.6 : !!e.s;
    return { p, label: label(p), due, seen: true, lookups: e.n, right: e.c, wrong: e.w, recall };
  }
  const label = (p) => (p >= 0.8 ? 'Known' : p >= 0.5 ? 'Almost' : 'Learning');

  // Account sync: keep the newest copy of each word.
  function merge(remote) {
    if (!remote || typeof remote !== 'object') return false;
    let changed = false;
    for (const [k, r] of Object.entries(remote)) {
      if (!r || typeof r !== 'object' || typeof r.u !== 'number') continue;
      if (!W[k] || r.u > (W[k].u || 0)) { W[k] = { ...blank(), ...r }; changed = true; }
    }
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch {} }
    return changed;
  }
  const newerThan = (remote) => !remote || Object.entries(W).some(([k, e]) => !remote[k] || e.u > (remote[k].u || 0));

  window.LingerLearn = {
    record, estimate, prior, merge, newerThan,
    all: () => W,
    onChange: (f) => { onChange = f; },
    // For tests: a fixed clock and a clean slate.
    _test: { setNow: (f) => { now = f; }, reset: () => { W = {}; } }
  };
})();

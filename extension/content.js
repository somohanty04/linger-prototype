// Linger content script: underlines hard words on the page, shows a word card on click,
// saves words to the phone app, and explains the page in plain English.
(() => {
  'use strict';
  // After Linger is updated or reloaded, tabs that were already open keep running the old copy of this script, which
  // can't reach the extension any more (Chrome throws "Extension context invalidated"): cards got stuck on
  // "Looking up…" and Ask Linger stopped answering. Now the background worker puts a fresh copy into open tabs, and
  // the old copy steps aside (retire). A copy that's still working stays, so nothing runs twice.
  const VERSION = (() => { try { return chrome.runtime.getManifest().version; } catch { return 'test'; } })();
  const prev = window.__lingerAPI;
  // Same version already working here: stop. A different version (Chrome can keep the old one in this tab after an
  // update) is told to step aside, so the new code is what runs.
  if (prev && prev.alive && prev.alive() && prev.version === VERSION) return;
  try { if (prev && prev.retire) prev.retire(false); } catch {}
  document.dispatchEvent(new CustomEvent('linger-retire')); // tell an old copy (in its own script world) to step aside
  document.querySelectorAll('#linger-ui').forEach((n) => n.remove()); // what versions before 0.7 left behind
  const { PLAIN, D, PHRASES, COMMON } = self.LINGER_WORDS;
  const CITIES = window.LINGER_CITIES || {};
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id ? chrome : null;
  const alive = () => !api || !!(chrome.runtime && chrome.runtime.id);
  let dead = false;
  function send(msg) {
    if (!api) return Promise.resolve(null);
    if (!alive()) { retire(true); return Promise.resolve(null); }
    try { return chrome.runtime.sendMessage(msg).catch(() => { if (!alive()) retire(true); return null; }); }
    catch { retire(true); return Promise.resolve(null); }
  }
  // Settings reads that can't throw on an old copy.
  const store = (defs, cb) => { if (!api || !alive()) return; try { chrome.storage.local.get(defs, cb); } catch {} };

  // ---------- words ----------
  const RANK = new Map([...COMMON].map((w, i) => [w, i]));
  const keyOf = (w) => w.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  // Local slang from the phone app's city guides (single-word entries only, so they can be found on a page).
  const SLANG = {};
  Object.entries(D).forEach(([k, e]) => { if ((e.kind === 'slang' || e.kind === 'custom') && !/\s/.test(e.word)) SLANG[k] = { ...e, city: 'Pittsburgh, PA' }; });
  Object.values(CITIES).forEach((c) => (c.slang || []).forEach((it) => { if (!/\s/.test(it.word) && !SLANG[it.k]) SLANG[it.k] = { ...it, kind: 'slang', city: `${c.name}, ${c.state}` }; }));
  const isCommon = (k) => {
    if (COMMON.has(k)) return true;
    const stems = [k.replace(/ies$/, 'y'), k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/ed$/, ''), k.replace(/ed$/, 'e'), k.replace(/d$/, ''), k.replace(/ing$/, ''), k.replace(/ing$/, 'e'), k.replace(/ly$/, ''), k.replace(/er$/, ''), k.replace(/est$/, '')];
    return stems.some((s) => s.length > 2 && COMMON.has(s));
  };
  // hard = not among the ~10,000 most common words, or a formal word Linger knows (unless it's very common).
  function classify(raw, sentenceStart) {
    const k = keyOf(raw);
    if (k.length < 3 || /\d/.test(raw)) return null;
    if (SLANG[k]) return 'slang';
    const known = PLAIN[k] !== undefined || (D[k] && D[k].kind === 'hard');
    if (known) return (RANK.get(k) ?? 99999) > 2500 ? 'hard' : null;
    if (/^[A-Z]/.test(raw) && !sentenceStart) return null; // names and places
    if (raw.length > 1 && raw === raw.toUpperCase()) return null; // acronyms
    if (k.length < 6 || k.includes("'")) return null;
    return isCommon(k) ? null : 'hard';
  }

  // ---------- settings ----------
  const S = { off: false, highlight: false, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, handSwipe: true, aiOn: null, aiConsent: '', assistant: true, transLang: '', swap: '' };
  // AI explanations (Claude) are off until the reader explicitly allows them. aiConsent records that choice ('yes' or
  // 'no') separately from the on/off switch (aiOn): an older aiOn: true is not consent. Nothing goes to Claude without both.
  const aiOK = () => S.aiConsent === 'yes' && S.aiOn === true;
  // Not asked yet (and not switched off in the menu): the card asks before the first AI request.
  const aiUndecided = () => S.aiConsent !== 'yes' && S.aiConsent !== 'no' && S.aiOn !== false;
  const host = location.hostname || 'file';
  // Off everywhere (the main Linger switch) or just on this site ("On this site").
  const offHere = () => !!S.off || S.paused.includes(host);
  let pageTr = null; // set while the whole page is translated (see translatePage)
  if (!api) S.highlight = true; // the test page (no extension features) is there to check the underlines
  // Words are found (and underlined) when underlining is on, or when hard words are being swapped.
  const active = () => (S.highlight || !!S.swap) && !offHere() && !pageTr;

  // ---------- styles on the page ----------
  const style = document.createElement('style');
  style.textContent = `
    .linger-w { text-decoration: underline dotted #B86E00 2px !important; text-underline-offset: 3px !important; cursor: help !important; border-radius: 3px; transition: background .12s; }
    @media (prefers-reduced-motion: reduce) { .linger-w { transition: none !important; } }
    .linger-w:focus-visible { outline: 2px solid #1F2AA8 !important; outline-offset: 2px !important; }
    .linger-w:hover, .linger-w.linger-on { background: rgba(255, 217, 138, 0.45) !important; }
    .linger-w.linger-seen:not(.linger-swapped) { text-decoration-style: solid !important; text-decoration-color: rgba(184, 110, 0, 0.5) !important; }
    .linger-w.linger-swapped { text-decoration: underline solid #1F8A57 2px !important; text-underline-offset: 3px !important; background: rgba(189, 232, 215, 0.35) !important; }
    .linger-nounder .linger-w:not(.linger-swapped) { text-decoration: none !important; cursor: inherit !important; background: none !important; }
    .linger-big .linger-w { font-size: 1.25em !important; padding: 0 2px !important; }
    .linger-spread p, .linger-spread li, .linger-spread dd, .linger-spread td, .linger-spread blockquote { line-height: 2.1 !important; }
    .linger-line { background: rgba(255, 217, 138, 0.28) !important; box-shadow: 0 0 0 3px rgba(255, 190, 70, 0.25) !important; border-radius: 4px; }
    ::highlight(linger-sel) { background-color: rgba(255, 217, 138, 0.55); }`;
  (document.head || document.documentElement).appendChild(style);

  // ---------- underlining ----------
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'CANVAS', 'IFRAME', 'BUTTON', 'KBD', 'SAMP', 'MATH', 'HEAD', 'TITLE', 'A', 'LABEL']);
  const MAX = 900;
  let count = 0;
  function okParent(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (SKIP.has(el.tagName) || el.isContentEditable || el.id === 'linger-ui' || el.hasAttribute('data-linger-skip') || el.classList.contains('linger-w')) return false;
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
    }
    return true;
  }
  const WORD_RE = /[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g;
  function processText(node) {
    const text = node.nodeValue;
    if (!text || text.length < 3 || !/[A-Za-z]{3,}/.test(text)) return;
    const hits = [];
    let m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text))) {
      const before = text.slice(0, m.index).trimEnd();
      const kind = classify(m[0], !before || /[.!?:"“]$/.test(before));
      if (kind) hits.push([m.index, m[0], kind]);
    }
    if (!hits.length) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const [i, w, kind] of hits) {
      if (count >= MAX) break;
      if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)));
      const sp = document.createElement('span');
      sp.className = 'linger-w'; sp.dataset.k = keyOf(w); sp.dataset.kind = kind; sp.textContent = w;
      kbdWord(sp, S.highlight);
      frag.appendChild(sp); count++;
      last = i + w.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
    if (S.swap) scheduleSwap();
  }
  function scan(root) {
    if (!active() || !root || count >= MAX) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (okParent(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    // Work in small batches so long pages don't freeze.
    let i = 0;
    const step = (deadline) => {
      const until = performance.now() + 12;
      while (i < nodes.length && count < MAX && (deadline ? deadline.timeRemaining() > 2 : performance.now() < until)) { if (nodes[i].parentNode) processText(nodes[i]); i++; }
      if (i < nodes.length && count < MAX) schedule(step);
    };
    schedule(step);
  }
  const schedule = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 16));
  function unwrapAll() {
    document.querySelectorAll('.linger-w').forEach((sp) => { const p = sp.parentNode; p.replaceChild(document.createTextNode(sp.dataset.orig || sp.textContent), sp); p.normalize(); });
    count = 0;
  }
  // Pages like Gmail keep adding content; underline new parts as they appear.
  let pendingRoots = new Set(), flushT = null;
  const mo = new MutationObserver((list) => {
    if (dead) return;
    if (!alive()) { retire(false); return; } // turned off on chrome://extensions: stop underlining new text
    if (!active()) return;
    for (const r of list) r.addedNodes.forEach((nd) => { if (nd.nodeType === 1 && nd.id !== 'linger-ui' && !nd.classList.contains('linger-w')) pendingRoots.add(nd); else if (nd.nodeType === 3 && nd.parentElement) pendingRoots.add(nd.parentElement); });
    clearTimeout(flushT);
    flushT = setTimeout(() => { const roots = [...pendingRoots]; pendingRoots = new Set(); roots.forEach((r) => r.isConnected && scan(r)); }, 400);
  });

  // ---------- plain English ----------
  const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const DATE_SRC = `\\b(?:(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|the\\s+\\d{1,2}(?:st|nd|rd|th))\\b`;
  const MONEY_RE = /\$\s?\d[\d,]*(?:\.\d{2})?/g;
  const ACTION_RE = /\b(must|required|due|please|prohibited|not permitted|failure|deadline|pay|payment|no later than|shall|need to|by the|overdue|delinquent|owe)\b/i;
  const plainify = (s) => {
    let t = s; PHRASES.forEach(([re, r]) => { t = t.replace(re, r); });
    t = t.replace(/[A-Za-z]+/g, (w) => { const p = PLAIN[w.toLowerCase()]; if (p === undefined) return w; if (!p) return ''; return w[0] === w[0].toUpperCase() ? cap(p) : p; });
    t = t.replace(/\b([Aa]) ([aeiou])/g, (m, a, v) => a + 'n ' + v).replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
    return cap(t);
  };
  // Split on line breaks first (headings and list items have no full stop), then on sentence ends.
  const sentencesOf = (text) => (text || '').split(/\n+/).flatMap((line) => line.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)).map((s) => s.trim()).filter((s) => s.split(' ').length > 2);
  function summarize(text) {
    const sents = sentencesOf(text).slice(0, 120).map((x) => x.replace(/^(dear [^,]{1,40}|hi|hello|hey)( [^,]{1,25})?,\s*/i, ''));
    let acts = sents.filter((s) => s !== s.toUpperCase() && s.length < 320 && (ACTION_RE.test(s) || new RegExp(DATE_SRC, 'i').test(s) || /\$\s?\d/.test(s)));
    if (!acts.length) acts = sents.slice(0, 3);
    const points = acts.slice(0, 5).map((s) => [/\$/.test(s) ? '💵' : new RegExp(DATE_SRC, 'i').test(s) ? '📅' : /prohibit|not permitted|not allowed/i.test(s) ? '🚫' : '📌', plainify(s)]);
    const dates = [...new Set([...(text.match(new RegExp(DATE_SRC, 'gi')) || []), ...(text.match(MONEY_RE) || [])].map((d) => d.trim()))].slice(0, 6);
    return { points, dates };
  }
  function sentenceAround(sp) {
    const block = sp.closest('p, li, td, th, dd, dt, blockquote, h1, h2, h3, h4, h5, h6, figcaption, article, section, div') || sp.parentElement;
    // Swapped words read as their originals here, so the sentence matches what the page really says.
    let text;
    if (block.querySelector('.linger-w[data-orig]')) { const c = block.cloneNode(true); c.querySelectorAll('.linger-w[data-orig]').forEach((x) => { x.textContent = x.dataset.orig; }); text = c.textContent || ''; }
    else text = block.innerText || block.textContent || '';
    text = text.replace(/\s+/g, ' ');
    const w = sp.dataset.orig || sp.textContent;
    const s = sentencesOf(text).find((x) => x.includes(w)) || text;
    return s.length > 260 ? s.slice(Math.max(0, s.indexOf(w) - 120), s.indexOf(w) + 140).trim() + '…' : s;
  }

  // ---------- Linger UI (shadow DOM keeps page styles out) ----------
  const host$ = document.createElement('div');
  host$.id = 'linger-ui';
  host$.style.cssText = 'all: initial; position: fixed; inset: 0 auto auto 0; z-index: 2147483647; width: 0; height: 0;';
  const root = host$.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host { all: initial; }
    * { box-sizing: border-box; font-family: 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .x { border: 0; background: #EAEFFF; color: #1F2AA8; width: 28px; height: 28px; border-radius: 50%; font-size: 14px; cursor: pointer; flex: none; }
    .lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5B6070; }
    .row { display: flex; gap: 8px; margin-top: 2px; }
    .btn { flex: 1; height: 40px; border-radius: 99px; border: 1px solid #B1B7FF; background: #FFFFFF; color: #1F2AA8; font-weight: 700; font-size: 14px; cursor: pointer; }
    .btn.primary { border: 1px solid #5362FF; background: linear-gradient(90deg, #5362FF, #2B39B2); color: #FFFFFF; }
    .btn.done { background: #F0FFFA; color: #115940; border-color: #BDE8D7; }
    .note { font-size: 12px; color: #5B6070; }
    /* Word card (Figma: Linger – App – Design System, node 140:523) */
    .wc { position: fixed; width: 439px; max-width: calc(100vw - 16px); display: flex; flex-direction: column; border-radius: 12px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.28); font-family: 'Linger Figtree', 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .wc * { font-family: inherit; }
    .wc p { margin: 0; }
    .wc-top { position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 14px; border: 1px solid #E8E8E8; border-bottom: 0; border-radius: 12px 12px 0 0; background: linear-gradient(177.958deg, rgb(31, 45, 168) 1.4073%, rgb(84, 100, 217) 105.55%); }
    .wc-rings { position: absolute; left: 173.32px; top: -136.47px; width: 344.934px; height: 344.934px; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    .wc-rings img { display: block; transform: rotate(-30deg); flex: none; }
    .wc-head { position: relative; display: flex; flex-direction: column; gap: 30px; padding-bottom: 4px; }
    .wc-row { display: flex; align-items: center; justify-content: space-between; }
    .wc-badge { display: flex; align-items: center; height: 22px; padding: 3px 8px; border-radius: 4px; background: #2E50D8; color: #FFFFFF; font-size: 14px; font-weight: 700; line-height: 14px; letter-spacing: 0.14px; white-space: nowrap; }
    .wc-icons { display: flex; gap: 4px; align-items: center; justify-content: flex-end; }
    .wc-icon { width: 24px; height: 24px; padding: 0; border: 0; background: none; border-radius: 6px; cursor: pointer; display: block; }
    .wc-icon img { display: block; }
    .wc-icon:hover { background: rgba(255, 255, 255, 0.16); }
    .wc-icon:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
    .wc-saved { color: #FFFFFF; font-size: 12px; font-weight: 700; line-height: 14px; padding: 4px 8px; border-radius: 99px; background: rgba(255, 255, 255, 0.2); margin-right: 4px; }
    .wc-word { color: #FFFFFF; font-size: 32px; font-weight: 800; line-height: 24px; min-height: 27.668px; overflow-wrap: anywhere; }
    .wc-body { display: flex; flex-direction: column; gap: 16px; padding: 14px 14px 18px; border: 1px solid #E8E8E8; border-radius: 0 0 12px 12px; background: linear-gradient(to right, #FFFFFF, #FCFDFF); }
    .wc-meaning { color: #252A39; font-size: 20px; font-weight: 600; line-height: 22px; }
    .wc-ctx { display: flex; flex-direction: column; gap: 8px; }
    .wc-syn { display: flex; flex-direction: column; gap: 16px; }
    .wc-syn[hidden], .wc-ctx[hidden] { display: none; }
    .wc-chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .wc-chip { display: inline-flex; align-items: center; height: 36px; padding: 0 18px; border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 999px; background: #EAEFFF; color: #4451E0; font-size: 14px; font-weight: 700; line-height: 20px; white-space: nowrap; }
    .wc-lbl { color: #5B6070; font-size: 16px; font-weight: 600; line-height: 22px; }
    .wc-box { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: #F6F7FF; }
    .wc-s { color: #252A39; font-size: 16px; font-weight: 600; font-style: italic; line-height: 22px; overflow-wrap: anywhere; }
    .wc-s b { color: #4451E0; font-weight: 700; font-style: italic; }
    .wc-local { color: #252A39; font-size: 16px; font-weight: 600; line-height: 22px; }
    .wc-note { color: #5B6070; font-size: 13px; font-weight: 600; line-height: 18px; }
    .wc-note:empty { display: none; }
    .wc-consent { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: #F6F7FF; color: #252A39; font-weight: 500; }
    .wc-consent b { font-weight: 700; color: #14161F; }
    .wc-consent-btns { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
    .wc-consent button { height: 36px; padding: 0 14px; border-radius: 99px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
    .wc-consent .wc-no { border: 1px solid #B1B7FF; background: #FFFFFF; color: #1F2AA8; }
    .wc-consent .wc-yes { border: 0; background: linear-gradient(90deg, #5362FF, #2B39B2); color: #FFFFFF; }
    .wc-consent button:focus-visible { outline: 3px solid #1F2AA8; outline-offset: 2px; }
    .wc-words { display: flex; flex-direction: column; gap: 12px; }
    .wc-msg { color: #FFFFFF; font-size: 20px; font-weight: 600; line-height: 22px; }
    /* Highlighted phrase or sentence: same card, the text as the title, plain words + hard words in the body */
    .wc-word.wc-phrase { font-size: 22px; line-height: 28px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
    .wc-def { color: #252A39; font-size: 16px; font-weight: 600; line-height: 22px; overflow-wrap: anywhere; }
    .wc-def b { color: #2B39B2; font-weight: 800; }
    .wc-easy { color: #5B6070; }
    .wc-trbox { background: #F0FFFA; }
    .wc-trhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .wc-lang { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 0 4px 0 10px; height: 32px; border: 1px solid #6D79FF; border-radius: 99px; background: #FFFFFF; color: #1F2AA8; font-size: 13px; font-weight: 700; cursor: pointer; }
    .wc-lang select { max-width: 170px; height: 30px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
    .wc-lang:focus-within { outline: 2px solid #4451E0; outline-offset: 2px; }
    .wc-tr { color: #115940; font-size: 20px; font-weight: 700; line-height: 26px; overflow-wrap: anywhere; }
    /* Whole-page translation bar */
    .tbar { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; max-width: calc(100vw - 24px); padding: 8px 8px 8px 16px; border-radius: 99px; background: linear-gradient(90deg, #1F2DA8, #5464D9); color: #FFFFFF; font-size: 14px; font-weight: 700; box-shadow: 0 8px 24px rgba(16, 20, 80, 0.3); font-family: 'Linger Figtree', 'Figtree', system-ui, sans-serif; }
    .tbar span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tbar button { flex: none; height: 32px; padding: 0 14px; border: 0; border-radius: 99px; background: #FFFFFF; color: #1F2AA8; font: inherit; cursor: pointer; }
    .tbar button:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
    .wc-easy b { color: #4451E0; }
    .selchip { position: fixed; height: 32px; padding: 0 14px; border: 0; border-radius: 99px; background: linear-gradient(90deg, #5362FF, #2B39B2); color: #FFFFFF; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(16, 20, 80, 0.3); white-space: nowrap; }
    .selchip:focus-visible { outline: 2px solid #1F2AA8; outline-offset: 2px; }
    /* Ask Linger: the page assistant (button + chat panel) */
    .ask-fab { position: fixed; right: 16px; bottom: 16px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: linear-gradient(135deg, #5362FF, #2B39B2); color: #FFFFFF; font-size: 20px; line-height: 1; cursor: pointer; box-shadow: 0 8px 20px rgba(16, 20, 80, 0.3); transition: transform .12s; }
    .ask-fab:hover { transform: scale(1.07); }
    .ask-fab:focus-visible, .ask-panel button:focus-visible, .ask-panel textarea:focus-visible { outline: 2px solid #1F2AA8; outline-offset: 2px; }
    /* Chat panel: Figma "Frame 48" (node 272:2933) */
    /* zoom: the Figma frame shrunk evenly to 85% (327 x 472) so the chat covers less of the page. */
    .ask-panel { zoom: 0.85; position: fixed; right: calc(16px / 0.85); bottom: calc(72px / 0.85); width: 385px; max-width: calc(100vw - 32px); height: min(555px, calc(100vh - 96px)); display: flex; flex-direction: column; background: #FFFFFF; border-radius: 12px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.28); overflow: hidden; font-family: 'Linger Figtree', 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif; color: #252A39; }
    .ask-panel * { font-family: inherit; box-sizing: border-box; }
    .ask-head { position: relative; overflow: hidden; flex: none; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 14px 18px; border: 1px solid #E8E8E8; border-bottom: 0; border-radius: 12px 12px 0 0; background: linear-gradient(178.77deg, #1F2DA8 1.41%, #5464D9 105.55%); color: #FFFFFF; }
    .ask-rings { position: absolute; left: 219.53px; top: -90.26px; width: 252.51px; height: 252.51px; transform: rotate(-30deg); pointer-events: none; }
    .ask-head strong { position: relative; display: block; height: 27.668px; font-size: 20px; font-weight: 800; line-height: 24px; }
    .ask-tools { position: relative; display: flex; align-items: center; gap: 4px; }
    .ask-x { width: 28px; height: 28px; padding: 0; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #FFFFFF; cursor: pointer; }
    .ask-x:hover { background: rgba(255, 255, 255, 0.16); }
    .ask-x img, .ask-x svg { display: block; width: 22px; height: 22px; }
    .ask-x.small { width: 22px; height: 22px; color: #1F2AA8; flex: none; }
    .ask-x.small svg { width: 14px; height: 14px; }
    .ask-x.small:hover { background: rgba(31, 42, 168, 0.1); }
    .ask-log { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 14px 18px; display: flex; flex-direction: column; gap: 16px; border: 1px solid #E8E8E8; background: linear-gradient(90deg, #FFFFFF, #FCFDFF); }
    .msg-ai { align-self: stretch; padding: 12px; border-radius: 12px; background: #F6F7FF; color: #252A39; font-size: 14px; font-weight: 600; line-height: 22px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .msg-me { align-self: flex-end; max-width: 85%; padding: 10px 12px; border-radius: 12px; background: #5362FF; color: #FFFFFF; font-size: 14px; font-weight: 600; line-height: 20px; overflow-wrap: anywhere; }
    .msg-ai.wait { color: #5B6070; font-style: italic; }
    .msg-ai.err { background: #FFE7DF; color: #A81F64; }
    .ask-hear { display: block; margin-top: 6px; padding: 0; border: 0; background: none; color: #4451E0; font-size: 12px; font-weight: 700; line-height: 16px; cursor: pointer; }
    .ask-sugg { display: flex; flex-direction: column; gap: 6px; }
    .ask-sugg button { height: 36px; padding: 0 16px; text-align: left; border: 1px solid #B1B7FF; border-radius: 9999px; background: transparent; color: #1F2AA8; font-size: 12px; font-weight: 600; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
    .ask-sugg button:hover { background: #F6F7FF; }
    .ask-foot { flex: none; display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid #E8E8E8; border-top: 0; border-radius: 0 0 12px 12px; background: #FDFDFF; }
    .ask-focus { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 12px; border-radius: 12px; background: #EAEFFF; color: #1F2AA8; font-size: 12px; font-weight: 600; line-height: 16px; }
    .ask-focus[hidden] { display: none; }
    .ask-form { display: flex; align-items: flex-end; gap: 8px; margin: 0; }
    .ask-form textarea { flex: 1; min-width: 0; height: 49px; min-height: 49px; max-height: 110px; resize: none; padding: 13.5px 16px; border: 2px solid #868B99; border-radius: 16px; background: #FFFFFF; color: #252A39; font-size: 16px; font-weight: 600; line-height: 18px; }
    .ask-form textarea::placeholder { color: #5B6070; }
    .ask-form textarea:focus { outline: 2px solid #4451E0; outline-offset: 1px; border-color: #4451E0; }
    .ask-send { width: 49px; height: 49px; flex: none; padding: 0; display: grid; place-items: center; border: 2px solid #2533AD; border-radius: 9999px; background: linear-gradient(90deg, #5362FF, #2B39B2); color: #FFFFFF; cursor: pointer; }
    .ask-send svg { width: 24px; height: 24px; display: block; }
    /* Not in the dictionary (Figma node 140:496): red, header only, 20px icons */
    .wc.wc-missing { width: 372px; }
    .wc-missing .wc-top { border-radius: 12px; background: linear-gradient(176.9195deg, rgb(168, 31, 31) 1.4073%, rgb(217, 84, 84) 105.55%); }
    .wc-missing .wc-rings { left: 107.32px; }
    .wc-missing .wc-badge { background: #D82E2E; }
    .wc-missing .wc-icon { width: 20px; height: 20px; }
    .wc-missing .wc-body { display: none; }
    /* Not in the dictionary, and AI not asked about yet: keep just the "Explain this with AI?" question under the red header */
    .wc-missing.wc-ask .wc-top { border-radius: 12px 12px 0 0; }
    .wc-missing.wc-ask .wc-body { display: flex; }
    .wc-missing.wc-ask .wc-body > :not(#ai) { display: none; }
    .panel { position: fixed; top: 16px; right: 16px; width: 360px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow-y: auto; background: #FFFFFF; color: #14161F; border-radius: 18px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.3); border: 1px solid #E8E8E8; font-size: 14px; line-height: 1.45; }
    .phead { background: linear-gradient(160deg, #1F2DA8, #5464D9); color: #FFFFFF; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 8px; border-radius: 18px 18px 0 0; }
    .phead strong { font-size: 18px; }
    .phead .x { background: rgba(255, 255, 255, 0.2); color: #FFFFFF; }
    .pbody { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    li { display: flex; gap: 10px; background: #F6F8FF; border: 1px solid #EAEFFF; border-radius: 12px; padding: 10px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border-radius: 99px; padding: 4px 10px; background: #F0FFFA; border: 1px solid #BDE8D7; color: #115940; font-size: 12px; font-weight: 700; }
    /* Microinteractions (Reduce motion turns them off: the rule below, and calm() in the script) */
    .wc.wc-in { animation: wc-in .2s cubic-bezier(.2, .8, .25, 1); }
    @keyframes wc-in { from { opacity: 0; transform: scale(.94) translateY(var(--wc-dy, -4px)); } to { opacity: 1; transform: none; } }
    .wc::before { content: ''; position: absolute; left: var(--tail-x, 24px); width: 12px; height: 12px; margin-left: -6px; transform: rotate(45deg); border-radius: 2px; pointer-events: none; }
    .wc.wc-below::before { top: -5px; background: #1F2DA8; }
    .wc.wc-above::before { bottom: -5px; background: #FCFDFF; box-shadow: 1px 1px 0 #E8E8E8; }
    .wc.wc-missing.wc-below::before { background: #A81F1F; }
    .wc.wc-missing:not(.wc-ask).wc-above::before { background: #D65252; box-shadow: none; }
    .ink { position: fixed; z-index: 0; border-radius: 3px; background: rgba(255, 205, 100, .55); mix-blend-mode: multiply; transform-origin: left center; pointer-events: none; animation: ink .34s cubic-bezier(.2, .7, .2, 1) both, ink-out .3s ease-in .55s forwards; }
    @keyframes ink { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes ink-out { to { opacity: 0; } }
    .selchip { animation: chip-in .18s cubic-bezier(.3, 1.4, .5, 1); }
    @keyframes chip-in { from { opacity: 0; transform: translateY(4px) scale(.9); } to { opacity: 1; transform: none; } }
    .wc-chip { transition: background .15s, color .15s; cursor: default; }
    .wc-chip.on { background: #4451E0; color: #FFFFFF; }
    .wc-s b.wc-try { animation: wc-try .22s ease-out; background: #FFF0C8; border-radius: 3px; }
    @keyframes wc-try { from { opacity: 0; } to { opacity: 1; } }
    .wc-icon.wc-pop { animation: wc-pop .42s cubic-bezier(.3, 1.6, .5, 1); }
    @keyframes wc-pop { 0% { transform: scale(.8); } 60% { transform: scale(1.2); } 100% { transform: none; } }
    .wc-saved:not([hidden]) { animation: chip-in .25s ease-out; }
    .fly-word { position: fixed; left: 0; top: 0; padding: 6px 12px; border-radius: 99px; background: #5362FF; color: #FFFFFF; font: 700 13px/16px 'Linger Figtree', 'Figtree', system-ui, sans-serif; white-space: nowrap; box-shadow: 0 6px 16px rgba(31, 42, 168, .35); pointer-events: none; }
    .dock { position: fixed; right: 18px; bottom: 72px; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: #FFFFFF; color: #1F2AA8; box-shadow: 0 8px 20px rgba(16, 20, 80, .25); pointer-events: none; animation: dock 1.5s ease-in-out forwards; }
    .dock svg { width: 22px; height: 22px; display: block; }
    @keyframes dock { 0% { opacity: 0; transform: translateY(8px) scale(.9); } 15% { opacity: 1; transform: none; } 55% { transform: none; } 65% { transform: scale(1.15); } 75% { transform: none; } 88% { opacity: 1; } 100% { opacity: 0; transform: translateY(4px); } }
    .wc-note.wc-wait, .msg-ai.wait { transition: opacity .18s; }
    .wc-note.wc-wait.out, .msg-ai.wait.out { opacity: 0; }
    ::highlight(linger-read) { background-color: #DCE1FF; color: #1F2AA8; }
    .panel li { animation: rise .32s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(.08s + var(--i, 0) * .06s); }
    .panel .chip { animation: chip-pop .45s cubic-bezier(.3, 1.45, .5, 1) both; animation-delay: calc(.3s + var(--i, 0) * .08s); }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes chip-pop { from { opacity: 0; transform: scale(.85); } 60% { opacity: 1; transform: scale(1.05); } to { transform: none; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; transition-delay: 0s !important; } }
  </style><div id="layer"></div>`;
  const layer = root.getElementById('layer');
  const attach = () => { if (!host$.isConnected) document.documentElement.appendChild(host$); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const asset = (p) => (api ? chrome.runtime.getURL(p) : p);
  // ---------- microinteractions ----------
  const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Highlighter ink sweeps over what was just picked, left to right, then fades into the steady highlight.
  function ink(rects) {
    if (calm()) return;
    [...rects].filter((r) => r.width > 1 && r.height > 1).slice(0, 12).forEach((r, i) => {
      const d = document.createElement('div'); d.className = 'ink';
      d.style.cssText = `left:${r.left - 1}px;top:${r.top}px;width:${r.width + 2}px;height:${r.height}px;animation-delay:${i * 60}ms, ${550 + i * 60}ms`;
      layer.prepend(d); setTimeout(() => d.remove(), 1000 + i * 60);
    });
  }
  // While Linger AI works, the waiting line says what it's doing (stops as soon as anything else is written there).
  const waitSteps = () => [AI_WAIT, '✦ Finding what it means in this sentence…', '✦ Writing it in simple words…'];
  function waitCycle(el, steps = waitSteps()) {
    if (!el) return;
    let i = 0;
    el.classList.add('wc-wait');
    const t = setInterval(() => {
      if (!el.isConnected || el.textContent !== steps[i] || i >= steps.length - 1) { clearInterval(t); el.classList.remove('out'); return; }
      el.classList.add('out');
      setTimeout(() => { if (el.textContent !== steps[i]) return; i += 1; el.textContent = steps[i]; el.classList.remove('out'); }, 180);
    }, 1800);
  }
  // Saved: the bookmark pops; when the word went to the phone, it flies into a phone that shows up in the corner.
  const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>';
  function savedFx(btn, label, synced) {
    if (!btn) return;
    btn.classList.remove('wc-pop'); void btn.offsetWidth; btn.classList.add('wc-pop');
    if (!synced || calm() || !btn.animate) return;
    const dock = document.createElement('div'); dock.className = 'dock'; dock.setAttribute('aria-hidden', 'true'); dock.innerHTML = PHONE_SVG;
    layer.appendChild(dock); setTimeout(() => dock.remove(), 1600);
    const w = document.createElement('div'); w.className = 'fly-word'; w.setAttribute('aria-hidden', 'true');
    w.textContent = label.length > 28 ? label.slice(0, 27) + '…' : label;
    layer.appendChild(w);
    const a = btn.getBoundingClientRect(), b = dock.getBoundingClientRect(), ww = w.offsetWidth, wh = w.offsetHeight;
    const x0 = a.left + a.width / 2 - ww / 2, y0 = a.top + a.height / 2 - wh / 2, x1 = b.left + b.width / 2 - ww / 2, y1 = b.top + b.height / 2 - wh / 2;
    w.animate([{ transform: `translate(${x0}px, ${y0}px)`, opacity: 1 }, { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 70}px) scale(.9)`, opacity: 1, offset: 0.45 }, { transform: `translate(${x1}px, ${y1}px) scale(.3)`, opacity: 0 }], { duration: 700, delay: 120, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both' })
      .finished.catch(() => {}).then(() => w.remove());
    setTimeout(() => w.remove(), 1100); // in case animations are paused
  }
  // Figtree (the Linger app font) for the word card; most websites don't have it.
  let fontsAdded = false;
  function addFonts() {
    if (fontsAdded || !document.fonts || typeof FontFace !== 'function') return;
    fontsAdded = true;
    [['fonts/figtree-latin.woff2', 'normal'], ['fonts/figtree-latin-italic.woff2', 'italic']].forEach(([f, style]) => {
      try { const ff = new FontFace('Linger Figtree', `url(${asset(f)})`, { style, weight: '300 900' }); document.fonts.add(ff); ff.load().catch(() => {}); } catch {}
    });
  }
  // Linger AI (Claude): meaning in context. In the extension the background worker calls the Linger server; on the
  // test page, window.LINGER_AI_URL can point at it. Returns null when AI is off or unreachable (cards still work).
  async function askAI(mode, text, context, extra = {}) {
    if (!aiOK()) return null;
    if (api) return send({ type: 'ai', mode, text, context, ...extra });
    if (!window.LINGER_AI_URL) return null;
    try {
      const r = await fetch(window.LINGER_AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, text, context, ...extra }) });
      const out = r.ok ? await r.json() : null;
      return out && !out.error ? out : null;
    } catch { return null; }
  }
  const AI_WAIT = '✦ Checking what it means here…';
  // Asks before anything is sent to Claude. Allow: remembered, then this card asks Claude. Not now: remembered too, and
  // the card keeps the dictionary meaning. Either can be changed later with the AI explanations switch in the Linger menu.
  function setConsent(yes) {
    Object.assign(S, { aiConsent: yes ? 'yes' : 'no', aiOn: yes });
    if (!api || !alive()) return Promise.resolve();
    return new Promise((res) => { try { chrome.storage.local.set({ aiConsent: S.aiConsent, aiOn: yes, aiConsentAt: Date.now() }, () => res()); } catch { res(); } });
  }
  function consentPrompt(note, onAllow) {
    note.classList.add('wc-consent');
    note.innerHTML = '<span><b>Explain this with AI?</b> Linger will send text to Claude (an AI by Anthropic): the text you select and the paragraph around it, and, when you use Ask Linger, translate a page or switch hard words into your language, text from the page (for Ask Linger, also its title and website). Nothing is sent unless you allow it. You can change this later in the Linger menu.</span>'
      + '<span class="wc-consent-btns"><button type="button" class="wc-no">Not now</button><button type="button" class="wc-yes">Allow AI explanations</button></span>';
    note.querySelector('.wc-no').onclick = async () => { await setConsent(false); note.classList.remove('wc-consent'); note.textContent = 'OK. Nothing was sent. Linger will keep using its dictionary. You can turn on AI explanations in the Linger menu.'; };
    note.querySelector('.wc-yes').onclick = async () => { await setConsent(true); note.classList.remove('wc-consent'); note.textContent = AI_WAIT; waitCycle(note); onAllow(); };
  }
  // Read an answer aloud with the word being said highlighted (CSS Custom Highlight: the text itself isn't changed).
  function speakAlong(el, t, lang = 'en-US') {
    const node = el && el.firstChild;
    if (HL) HL.delete('linger-read');
    if (!HL || !node || node.nodeType !== 3 || node.nodeValue !== t) return speakIt(t, lang);
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t); u.lang = lang; u.rate = 0.9;
      u.onboundary = (e) => {
        if (e.name && e.name !== 'word') return;
        const a = e.charIndex, sp = t.slice(a).search(/\s/), b = e.charLength ? a + e.charLength : sp < 0 ? t.length : a + sp;
        try { const r = document.createRange(); r.setStart(node, a); r.setEnd(node, Math.min(b, t.length)); HL.set('linger-read', new Highlight(r)); } catch {}
      };
      u.onend = u.onerror = () => HL.delete('linger-read');
      speechSynthesis.speak(u);
    } catch {}
  }
  const speakIt = (t, lang = 'en-US') => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = lang; u.rate = 0.9; speechSynthesis.speak(u); } catch {} };

  // ---------- translation ----------
  // Chrome's built-in translator first: it runs on this laptop, is free, and nothing leaves the computer. When Chrome
  // doesn't know the language pair (or is too old to have a translator), Claude translates through the Linger server,
  // but only when AI explanations are on.
  const LANG = (c) => (self.lingerLang && self.lingerLang(c)) || { code: c, name: c, own: c };
  const rtl = (c) => !!(self.lingerRTL && self.lingerRTL(c));
  const translators = new Map();
  async function chromeTranslator(from, to, onProgress) {
    if (typeof Translator === 'undefined') return null;
    const key = from + '>' + to;
    if (translators.has(key)) return translators.get(key);
    try {
      const a = await Translator.availability({ sourceLanguage: from, targetLanguage: to });
      if (a === 'unavailable') return null;
      // The first time, Chrome downloads the language, and only allows that right after a click or key press
      // (create() then throws, and the caller falls back to Claude). The toolbar menu starts the download itself.
      const t = await Translator.create({ sourceLanguage: from, targetLanguage: to, monitor: (m) => m.addEventListener('downloadprogress', (e) => onProgress && onProgress(e.loaded)) });
      translators.set(key, t);
      return t;
    } catch { return null; }
  }
  // { text, sentence, note, by } or null. With withSentence, context (the sentence around a word) is translated too.
  async function translate(text, { to = S.transLang, from = 'en', context = '', withSentence = false, onProgress } = {}) {
    if (!to || to === from || !text) return null;
    const t = await chromeTranslator(from, to, onProgress);
    if (t) {
      try {
        const [tt, ss] = await Promise.all([t.translate(text), withSentence && context && context !== text ? t.translate(context) : '']);
        if (tt) return { text: tt, sentence: ss, note: '', by: 'chrome' };
      } catch {}
    }
    const a = await askAI('translate', text, context, { lang: to, langName: LANG(to).name, from, sentence: withSentence });
    return a && a.translation ? { text: a.translation, sentence: withSentence ? a.sentence || '' : '', note: a.note || '', by: 'claude' } : null;
  }
  // The "In <your language>" box on a word or phrase card. isCurrent: is this card still the open one.
  // A language menu on the card itself: pick or switch the language right there (it also becomes "My language").
  function langMenu(to) {
    const opts = (self.LINGER_LANGS || []).filter((l) => l.code !== 'en')
      .map((l) => `<option value="${l.code}"${l.code === to ? ' selected' : ''}>${esc(l.own === l.name ? l.name : `${l.own} · ${l.name}`)}</option>`).join('');
    return `<label class="wc-lang"><span aria-hidden="true">🌐</span><select id="trLang" aria-label="${to ? 'Change the translation language' : 'Translate into your language'}">
      <option value="">${to ? 'No translation' : 'Translate to…'}</option>${opts}</select></label>`;
  }
  function addTranslation(isCurrent, rect, text, context, withSentence) {
    const to = S.transLang;
    if (!card) return;
    const el = card.querySelector('#tr');
    const again = () => addTranslation(isCurrent, rect, text, context, withSentence);
    const wire = () => {
      el.querySelector('#trLang').onchange = (e) => {
        S.transLang = e.target.value;
        try { if (api && alive()) chrome.storage.local.set({ transLang: S.transLang }); } catch {}
        again(); place(card, rect());
      };
    };
    el.hidden = false;
    if (!to) { el.innerHTML = `<div class="wc-trhead">${langMenu('')}</div>`; wire(); return; }
    const L = LANG(to), dir = rtl(to) ? 'rtl' : 'auto';
    const tl = (t, cls, quote) => `<p class="${cls}" dir="${dir}" lang="${esc(to)}">${quote ? '“' : ''}${esc(t)}${quote ? '”' : ''}</p>`;
    el.innerHTML = `<div class="wc-trhead"><p class="wc-lbl">In ${esc(L.own)}:</p>${langMenu(to)}</div><div class="wc-box wc-trbox"><p class="wc-note">Translating…</p></div>`;
    wire();
    const box = el.querySelector('.wc-trbox');
    const onProgress = (p) => { if (isCurrent()) box.innerHTML = `<p class="wc-note">Getting ${esc(L.name)} ready on this laptop (first time only)… ${Math.round(p * 100)}%</p>`; };
    translate(text, { to, context, withSentence, onProgress }).then((r) => {
      if (!isCurrent() || S.transLang !== to) return; // closed, or switched to another language meanwhile
      box.innerHTML = r
        ? tl(r.text, 'wc-tr') + (r.sentence ? tl(r.sentence, 'wc-s', true) : '') + (r.note ? tl(r.note, 'wc-def') : '') +
          `<p class="wc-note">${r.by === 'chrome' ? 'Translated by Chrome on this laptop' : 'Translated by Claude'}</p>`
        : `<p class="wc-note">${aiOK() ? 'Couldn’t translate this right now. Check your internet connection.' : `Chrome can’t translate into ${esc(L.name)} on this laptop. Turn on AI explanations in the Linger menu to translate with Claude.`}</p>`;
      place(card, rect());
    });
  }

  let card = null, cardSpan = null, cardRange = null;
  // Highlighted phrases stay marked while their card is open (CSS Custom Highlight: no changes to the page's HTML).
  const HL = typeof Highlight === 'function' && window.CSS && CSS.highlights ? CSS.highlights : null;
  // Keyboard and screen readers: an underlined word is a button (Tab to it, Enter or Space opens its card).
  function kbdWord(sp, on) { if (on) { sp.tabIndex = 0; sp.setAttribute('role', 'button'); sp.setAttribute('aria-haspopup', 'dialog'); } else { sp.removeAttribute('tabindex'); sp.removeAttribute('role'); sp.removeAttribute('aria-haspopup'); } }
  let cardOpener = null; // the word to return focus to when a card opened from the keyboard closes
  function focusCard() { if (!card || !cardOpener) return; card.tabIndex = -1; card.focus({ preventScroll: true }); }
  function closeCard() {
    const back = card && cardOpener && cardOpener.isConnected ? cardOpener : null; cardOpener = null;
    if (card) card.remove(); card = null;
    if (back) back.focus({ preventScroll: true });
    if (cardSpan) { cardSpan.classList.remove('linger-on'); if (cardSpan.classList.contains('linger-w')) cardSpan.classList.add('linger-seen'); } cardSpan = null;
    if (cardRange && HL) HL.delete('linger-sel'); cardRange = null;
    window.dispatchEvent(new CustomEvent('linger-card-closed'));
  }
  function place(el, rect) {
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = Math.min(Math.max(8, rect.left), innerWidth - w - 8);
    let y = rect.bottom + 8;
    const below = !(y + h > innerHeight - 8);
    if (!below) y = Math.max(8, rect.top - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (!el.classList.contains('wc')) return;
    // The tail points at the word (when the card sits right next to it), and the card grows out of that point.
    const tail = Math.min(Math.max(18, rect.left + Math.min(rect.width, 160) / 2 - x), w - 18);
    const near = below ? y - rect.bottom < 14 : rect.top - (y + h) < 14;
    el.classList.toggle('wc-below', near && below); el.classList.toggle('wc-above', near && !below);
    el.style.setProperty('--tail-x', tail + 'px');
    if (!el.dataset.shown) {
      el.dataset.shown = '1';
      el.style.transformOrigin = `${tail}px ${below ? 0 : h}px`;
      el.style.setProperty('--wc-dy', below ? '-6px' : '6px');
      if (!calm()) el.classList.add('wc-in');
    }
  }
  // Open the card for an underlined word (or any word picked with a double-click).
  async function openCard(sp, why) {
    if (dead) return;
    attach(); closeCard();
    cardSpan = sp; sp.classList.add('linger-on'); ink(sp.getClientRects());
    const raw = sp.dataset.orig || sp.textContent, k = keyOf(raw); // a swapped word opens the original word's card
    const sl = SLANG[k], d = D[k];
    const kind = sl ? 'slang' : sp.dataset.kind || (PLAIN[k] !== undefined ? 'hard' : 'common');
    let meaning = (sl && sl.meaning) || (d && d.meaning) || (PLAIN[k] ? cap(PLAIN[k]) + '.' : '');
    const sentence = sentenceAround(sp);
    const plain = plainify(sentence);
    addFonts();
    // Synonyms (chips) and "In context": a NEW, much simpler sentence that uses the word, and the same sentence with
    // the easiest synonym. Never the sentence the word is already in on the page; the reader has just read that one.
    const wordRe = new RegExp('\\b' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const locIn = (t, w, re) => { const m = t ? (re || new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')).exec(t) : null; return m ? { at: m.index, len: m[0].length, word: m[0] } : null; };
    const locate = (t) => locIn(t, raw, wordRe) || locIn(t, '', new RegExp('\\b' + k.slice(0, Math.max(4, k.length - 3)) + '\\w*', 'i'));
    // A real sentence: 4+ words that end like a sentence, or 8+ words (not a heading, menu item or label).
    const usable = (t) => { const n = t ? t.trim().split(/\s+/).length : 0; return !!(t && locate(t) && n >= 4 && (/[.!?…"”’)]\s*$/.test(t.trim()) || n >= 8)); };
    // The same sentence as the one on the page (most of its words shared)?
    const words = (t) => new Set(String(t || '').toLowerCase().match(/[a-z']+/g) || []);
    const samePage = (t) => { const A = words(t), B = words(sentence); if (!A.size || !B.size) return false; let n = 0; A.forEach((x) => { if (B.has(x)) n++; }); return n / Math.min(A.size, B.size) > 0.6; };
    const simple = (t) => usable(t) && t.trim().split(/\s+/).length <= 16 && !samePage(t);
    const ctx = { ex: '', loc: null, easy: '', syns: [], ai: false };
    const useExample = (t, easy) => { ctx.ex = t; ctx.loc = locate(t); ctx.easy = easy || ''; };
    const addSyns = (list) => { list.forEach((w) => { w = String(w || '').trim(); if (w && w.toLowerCase() !== k && w.split(/\s+/).length <= 3 && !ctx.syns.some((x) => x.toLowerCase() === w.toLowerCase())) ctx.syns.push(w); }); ctx.syns = ctx.syns.slice(0, 3); };
    // Ask Claude right away (in parallel with the dictionary) what the word means here, easier words, and a simple example.
    const aiP = askAI('word', raw, sentence);
    if (dead) return closeCard(); // this copy just found out the extension was updated
    if (d && simple(d.sentence)) useExample(d.sentence);
    else if (sl && simple(sl.sentence)) useExample(sl.sentence);
    if (PLAIN[k] && PLAIN[k].split(/\s+/).length <= 2) addSyns([PLAIN[k]]);
    const hl = (t, loc) => `${esc(t.slice(0, loc.at))}<b>${esc(t.slice(loc.at, loc.at + loc.len))}</b>${esc(t.slice(loc.at + loc.len))}`;
    // The example with the easiest synonym: Claude's version if it wrote one, else the synonym put in the word's place.
    function easyHtml() {
      const w = ctx.syns[0];
      if (!ctx.loc || !w) return '';
      if (ctx.easy) { const l = locIn(ctx.easy, w); return l ? hl(ctx.easy, l) : esc(ctx.easy); }
      // Without Claude, only swap when it's safe: the word in exactly this form, and a one-word synonym
      // (otherwise "prohibits" → "not allowed" breaks the grammar).
      const { at, len, word } = ctx.loc, sw = /^[A-Z]/.test(word) ? cap(w) : w;
      if (word.toLowerCase() !== raw.toLowerCase() || /\s/.test(w)) return '';
      return `${esc(ctx.ex.slice(0, at))}<b>${esc(sw)}</b>${esc(ctx.ex.slice(at + len))}`;
    }
    function synHtml() {
      return ctx.syns.length ? `<p class="wc-lbl">Synonyms:</p><div class="wc-chips">${ctx.syns.map((w) => `<span class="wc-chip">${esc(cap(w))}</span>`).join('')}</div>` : '';
    }
    function ctxHtml() {
      const local = sl && sl.local ? `<p class="wc-lbl">Local note (${esc(sl.city)}):</p><p class="wc-local">${esc(sl.local)}</p>` : '';
      const easy = easyHtml();
      if (!ctx.loc && !local) return '';
      return `<p class="wc-lbl">In context:</p><div class="wc-box">
          ${ctx.loc ? `<p class="wc-lbl">This word:</p><p class="wc-s">“${hl(ctx.ex, ctx.loc)}”</p>` : ''}
          ${easy ? `<p class="wc-lbl">Synonym:</p><p class="wc-s">“${easy}”</p>` : ''}
          ${local}</div>`;
    }
    const redraw = () => {
      if (!card || cardSpan !== sp) return;
      const sy = card.querySelector('#syn'), el = card.querySelector('#ctx');
      sy.innerHTML = synHtml(); sy.hidden = !sy.innerHTML.trim();
      el.innerHTML = ctxHtml(); el.hidden = !el.innerHTML.trim();
      place(card, sp.getBoundingClientRect());
    };
    const badge = kind === 'slang' ? 'Local Slang' : kind === 'hard' ? 'Hard Word' : 'Word';
    card = document.createElement('div');
    card.className = 'wc'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Meaning of ' + raw);
    card.innerHTML = `<div class="wc-top">
        <div class="wc-rings"><img src="${asset('icons/card/header-rings.svg')}" width="252.51" height="252.51" alt=""></div>
        <div class="wc-head">
          <div class="wc-row"><span class="wc-badge">${badge}</span>
            <div class="wc-icons"><span class="wc-saved" id="saved" hidden>Saved</span>
              <button class="wc-icon" id="hear" aria-label="Say ${esc(raw)} out loud" title="Hear it"><img src="${asset('icons/card/volume.svg')}" width="24" height="24" alt=""></button>
              <button class="wc-icon" id="save" aria-label="Save ${esc(raw)} to Linger" aria-pressed="false" title="Save to Linger"><img src="${asset('icons/card/bookmark.svg')}" width="24" height="24" alt=""></button></div></div>
          <div class="wc-words"><p class="wc-word">${esc(cap(raw))}</p></div>
        </div></div>
      <div class="wc-body">
        <p class="wc-meaning" id="m">${meaning ? esc(meaning) : 'Looking up…'}</p>
        <div class="wc-syn" id="syn"></div>
        <div class="wc-ctx" id="ctx"></div>
        <div class="wc-ctx" id="tr" hidden></div>
        <p class="wc-note" id="ai">${aiOK() ? AI_WAIT : ''}</p>
        <p class="wc-note" id="note"></p>
      </div>`;
    layer.appendChild(card);
    redraw();
    if (aiOK()) waitCycle(card.querySelector('#ai'));
    addTranslation(() => card && cardSpan === sp, () => sp.getBoundingClientRect(), raw, usable(sentence) ? sentence : '', true);
    card.querySelector('#hear').onclick = () => speakIt(raw);
    // Try an easier word: point at a synonym and it takes the word's place in the "This word" sentence.
    const tryWord = (chipEl) => {
      const b = card && card.querySelector('#ctx .wc-s b');
      card.querySelectorAll('.wc-chip.on').forEach((c) => c.classList.remove('on'));
      if (!b) return;
      if (!b.dataset.orig) b.dataset.orig = b.textContent;
      const o = b.dataset.orig, w = chipEl ? chipEl.textContent.trim() : o;
      b.textContent = chipEl ? (/^[A-Z]/.test(o) ? cap(w) : w.toLowerCase()) : o;
      b.classList.remove('wc-try'); void b.offsetWidth;
      if (chipEl) { chipEl.classList.add('on'); b.classList.add('wc-try'); }
    };
    card.addEventListener('pointerover', (e) => { const c = e.target.closest('.wc-chip'); if (c && !c.classList.contains('on')) tryWord(c); });
    card.addEventListener('pointerout', (e) => { const c = e.target.closest('.wc-chip'); if (c && !(e.relatedTarget && c.contains(e.relatedTarget))) tryWord(null); });
    // Claude's answer: the meaning in this sentence, and easier words that fit here.
    const useAI = (a) => {
      if (!card || cardSpan !== sp) return;
      card.querySelector('#ai').textContent = !a && aiOK() ? 'Linger AI didn’t answer this time, so this is the dictionary meaning. Click the word again to retry.' : '';
      if (!a || !a.meaning) return;
      meaning = a.meaning; ctx.ai = true;
      card.querySelector('#m').textContent = meaning;
      if ((a.synonyms || []).length) { ctx.syns = []; addSyns(a.synonyms); }
      // Claude's own simple sentence (needs the updated AI server; older servers don't send one).
      if (a.example && locate(a.example) && !samePage(a.example)) useExample(a.example, a.exampleEasy);
      redraw();
    };
    if (aiOK()) aiP.then(useAI);
    // Allowed from this card: ask Claude now. If the card already turned red (not in the dictionary), open it again,
    // so Claude gets its turn at the meaning, just as it would have with AI already on.
    let allowP = null;
    if (!aiOK() && aiUndecided()) consentPrompt(card.querySelector('#ai'), () => {
      if (card && cardSpan === sp && card.classList.contains('wc-missing')) {
        const opener = cardOpener; // opened from the keyboard: keep focus in the new card
        openCard(sp, why).catch(() => {}); if (opener) { cardOpener = opener; focusCard(); }
        return;
      }
      allowP = askAI('word', raw, sentence); allowP.then(useAI);
    });
    // Not in the dictionary: the red card with just the word (and the speaker and bookmark still work).
    function showMissing() {
      if (!card || cardSpan !== sp) return;
      card.classList.add('wc-missing');
      card.querySelector('.wc-rings img').src = asset('icons/card/header-rings-red.svg');
      const icon = (sel, f) => { const img = card.querySelector(sel + ' img'); img.src = asset('icons/card/' + f); img.width = 20; img.height = 20; };
      icon('#hear', 'volume-20.svg'); icon('#save', 'bookmark-20.svg');
      card.querySelector('.wc-words').insertAdjacentHTML('beforeend', '<p class="wc-msg">Not in the dictionary yet.</p>');
      place(card, sp.getBoundingClientRect());
    }
    const showSaved = () => { card.querySelector('#saved').hidden = false; card.querySelector('#save').setAttribute('aria-pressed', 'true'); card.querySelector('#save').title = 'Saved to Linger'; };
    store({ saved: [] }, (v) => { if (card && cardSpan === sp && v.saved.some((x) => x.key === k)) showSaved(); });
    card.querySelector('#save').onclick = async () => {
      const r = await send({ type: 'save', key: k, word: { w: raw.toLowerCase(), m: meaning, s: sentence, p: plain !== sentence ? plain : '', place: host, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } });
      if (!card || cardSpan !== sp) return;
      showSaved(); savedFx(card.querySelector('#save'), cap(raw), r && r.synced);
      card.querySelector('#note').textContent = r && r.synced ? 'Saved. Sent to the Linger app on your phone.' : r && r.paired === false ? 'Saved here. Connect your phone in the Linger menu to send words there.' : r && r.error ? 'Saved here. Couldn’t reach your phone right now.' : 'Saved.';
    };
    const wantSyn = !ctx.syns.length && kind !== 'slang';
    const synP = wantSyn ? (api ? send({ type: 'synonyms', word: k }) : directSynonyms(k)) : null;
    let dict = null;
    if (!meaning || !ctx.ex) {
      dict = api ? await send({ type: 'lookup', word: k }) : await directLookup(k);
      if (!meaning && !(dict && dict.meaning)) {
        // Not in the dictionary: Claude may still know it (new words, slang, names of things).
        const a = await (allowP || aiP);
        if (!(a && a.meaning)) {
          if (card && cardSpan === sp) {
            const note = card.querySelector('#ai');
            // Still asking about AI: keep the question on the red card (these are the words Claude helps with most).
            if (note.classList.contains('wc-consent')) card.classList.add('wc-ask'); else note.textContent = '';
          }
          showMissing(); return;
        }
      }
      if (!meaning) meaning = ctx.ai ? meaning : dict.meaning;
      if (card && cardSpan === sp) card.querySelector('#m').textContent = meaning;
      if (!ctx.ex && dict && simple(dict.example)) { useExample(dict.example); redraw(); }
    }
    // Still no simple sentence: try the dictionary's example for the base word (tenants → tenant). If there's none,
    // "In context" waits for Claude's sentence (or stays hidden); it never repeats the page's sentence.
    if (!ctx.ex) {
      for (const base of [...new Set([k.replace(/ies$/, 'y'), k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/ed$/, ''), k.replace(/ed$/, 'e'), k.replace(/ing$/, ''), k.replace(/ing$/, 'e')])].filter((b) => b !== k && b.length > 3)) {
        const e = api ? await send({ type: 'lookup', word: base }) : await directLookup(base);
        if (ctx.ex) break; // Claude's sentence arrived meanwhile
        if (e && simple(e.example)) { useExample(e.example); break; }
      }
      redraw();
    }
    // An easier synonym from the thesaurus, checked against the meaning so it's the right sense of the word.
    if (synP) { const w = easier(k, await synP, meaning); if (w && !ctx.syns.length) { addSyns([w]); redraw(); } }
  }
  // An easier synonym: a single, clearly more common word from the thesaurus that the dictionary meaning also uses.
  // The thesaurus mixes every sense of a word (turnout → "output", replicate → "double"); the meaning shown on the
  // card is the sense we mean, so a synonym it mentions (replicate: "To repeat, duplicate…" → repeat) fits.
  function easier(k, r, meaning) {
    if (!r || !r.list || !meaning) return '';
    for (const c of r.list) {
      if (!/^[a-z]+$/.test(c.w) || c.w.slice(0, 4) === k.slice(0, 4)) continue;
      if (!(c.f >= Math.max(3 * (r.self || 0), 5) && (isCommon(c.w) || c.f >= 20))) continue;
      if (new RegExp('\\b' + c.w + '(s|es|ed|d|ing)?\\b', 'i').test(meaning)) return c.w;
    }
    return '';
  }
  const DATAMUSE = 'https://api.datamuse.com/words';
  async function directSynonyms(k) {
    try {
      const [syn, self] = await Promise.all([fetch(`${DATAMUSE}?rel_syn=${encodeURIComponent(k)}&md=f&max=12`).then((r) => r.json()), fetch(`${DATAMUSE}?sp=${encodeURIComponent(k)}&md=f&max=1`).then((r) => r.json())]);
      const f = (x) => Number(((x.tags || []).find((t) => t.startsWith('f:')) || 'f:0').slice(2));
      return { self: self[0] && self[0].word === k ? f(self[0]) : 0, list: syn.map((x) => ({ w: x.word, f: f(x) })) };
    } catch { return null; }
  }
  // Without the extension (test pages), look words up directly (same as the background worker).
  async function directLookup(k) {
    try {
      const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(k));
      return r.ok ? self.lingerDictEntry(await r.json(), k) : null;
    } catch { return null; }
  }

  // ---------- highlight a phrase or sentence ----------
  // Select any text and an "Explain" button appears next to it. One word opens the normal word card; a phrase or
  // sentence opens the same card with the text in plain words, the sentence it came from, and its hard words
  // (meaning + an easier word).
  let chip = null, chipT = null;
  const MAX_WORDS = 80;
  function hideChip() { clearTimeout(chipT); if (chip) chip.remove(); chip = null; }
  const selOk = (node) => {
    for (let el = node && (node.nodeType === 1 ? node : node.parentElement); el; el = el.parentElement) {
      if (/^(TEXTAREA|INPUT|SELECT)$/.test(el.tagName) || el.isContentEditable || el.id === 'linger-ui' || el.id === 'linger-gaze') return false;
    }
    return !!node;
  };
  function showChip() {
    hideChip();
    if (offHere() || card) return; // works with underlines off, and while the page is translated
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (!/\p{L}/u.test(text) || text.split(' ').length > MAX_WORDS || text.length > 700) return; // any language
    const range = sel.getRangeAt(0).cloneRange();
    if (!selOk(range.startContainer) || !selOk(range.endContainer)) return;
    const rects = range.getClientRects(), first = rects[0], last = rects[rects.length - 1];
    if (!last) return;
    attach();
    chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'selchip'; chip.textContent = '✦ Explain';
    chip.setAttribute('aria-label', 'Explain the highlighted text');
    layer.appendChild(chip);
    const w = chip.offsetWidth, h = chip.offsetHeight;
    let y = last.bottom + 8;
    if (y + h > innerHeight - 8) y = Math.max(8, first.top - h - 8);
    chip.style.left = Math.min(Math.max(8, last.right - w / 2), innerWidth - w - 8) + 'px';
    chip.style.top = y + 'px';
    chip.onmousedown = (e) => e.preventDefault(); // keep the page's selection
    chip.onclick = () => { hideChip(); explainRange(range, text); };
  }
  // A single word: use the word card (underline it the same way a double-click does).
  function wordSpan(range) {
    const n = range.startContainer;
    if (n !== range.endContainer || n.nodeType !== 3) return null;
    const on = n.parentElement && n.parentElement.closest('.linger-w');
    if (on) return on;
    const t = n.nodeValue;
    let a = range.startOffset, b = range.endOffset;
    while (a < b && !/[A-Za-z]/.test(t[a])) a++;
    while (b > a && !/[A-Za-z]/.test(t[b - 1])) b--;
    const w = t.slice(a, b);
    if (!/^[A-Za-z][A-Za-z'’-]{0,30}$/.test(w)) return null;
    const r = document.createRange(); r.setStart(n, a); r.setEnd(n, b);
    const sp = document.createElement('span'); sp.className = 'linger-w'; sp.dataset.kind = classify(w, true) || 'common'; sp.dataset.k = keyOf(w);
    try { r.surroundContents(sp); } catch { return null; }
    return sp;
  }
  async function explainRange(range, text) {
    getSelection().removeAllRanges();
    const from = await foreignLang(text);
    if (from !== 'en') return openForeign(range, text, from);
    const sp = text.split(' ').length === 1 ? wordSpan(range) : null;
    if (sp) openCard(sp); else openPhrase(range, text);
  }
  const localMeaning = (k) => (SLANG[k] && SLANG[k].meaning) || (D[k] && D[k].meaning) || '';
  async function openPhrase(range, text) {
    if (dead) return;
    attach(); closeCard();
    cardRange = range;
    if (HL) HL.set('linger-sel', new Highlight(range));
    ink(range.getClientRects());
    addFonts();
    const nWords = text.split(' ').length;
    const badge = /[.!?…]["”’)]?$/.test(text) || nWords >= 10 ? 'Sentence' : 'Phrase';
    // The sentence it came from (only worth showing when the highlight is part of a longer sentence).
    const node = range.commonAncestorContainer, el = node.nodeType === 1 ? node : node.parentElement;
    const block = (el && el.closest('p, li, td, th, dd, dt, blockquote, h1, h2, h3, h4, h5, h6, figcaption, article, section, div')) || el;
    const sentence = (block && sentencesOf(block.innerText || block.textContent || '').find((s) => s.includes(text))) || '';
    const fromText = sentence.length > text.length + 3 ? sentence : '';
    // In plain words: Linger's phrase rules and easy-word swaps (the same ones "Explain this page" uses).
    const plain = plainify(text);
    const letters = (s) => s.replace(/[^a-z]/gi, '').toLowerCase();
    const changed = letters(plain) !== letters(text);
    // The hard words inside it.
    const hard = [], seen = new Set(), re = new RegExp(WORD_RE.source, 'g');
    let m;
    while ((m = re.exec(text)) && hard.length < 5) {
      const k = keyOf(m[0]);
      if (seen.has(k)) continue;
      seen.add(k);
      const kind = classify(m[0], false);
      if (!kind) continue;
      const meaning = localMeaning(k);
      hard.push({ raw: m[0], k, kind, meaning: meaning || (PLAIN[k] ? cap(PLAIN[k]) + '.' : ''), easy: meaning ? PLAIN[k] || '' : '', done: !!(meaning || PLAIN[k]) });
    }
    // Ask Claude for the meaning here, with the whole paragraph as context (or the sentence, if it's very long).
    const para = (block ? block.innerText || block.textContent || '' : '').replace(/\s+/g, ' ').trim();
    let ai = null;
    const aiCtx = para.length <= 1500 ? para : fromText || text;
    const aiP = askAI('phrase', text, aiCtx);
    if (dead) return closeCard();
    const defHtml = (x) => `<p class="wc-def"><b>${esc(x.raw)}</b>: ${x.meaning ? esc(x.meaning) : x.done ? 'Not in the dictionary yet.' : 'Looking up…'}${x.easy ? ` <span class="wc-easy">Easier word: <b>${esc(x.easy)}</b></span>` : ''}</p>`;
    function ctxHtml() {
      const words = ai ? ai.hardWords.map((h) => ({ raw: h.word, meaning: h.meaning, easy: h.easier, done: true })) : hard;
      if (!fromText && !words.length) return '';
      const at = fromText.indexOf(text);
      return `<p class="wc-lbl">In context:</p><div class="wc-box">
          ${fromText ? `<p class="wc-lbl">From the text:</p><p class="wc-s">“${esc(fromText.slice(0, at))}<b>${esc(text)}</b>${esc(fromText.slice(at + text.length))}”</p>` : ''}
          ${words.length ? `<p class="wc-lbl">Hard words:</p>${words.map(defHtml).join('')}` : ''}</div>`;
    }
    const meaningText = changed ? plain : hard.length ? 'No simpler way to say this yet. The hard words are explained below.' : 'These are everyday words. Linger doesn’t have a simpler way to say this yet.';
    // Top of the body: Claude's meaning + plain version when there is one; otherwise Linger's own plain-words swap.
    function mainHtml() {
      if (ai) {
        const showPlain = ai.plain && letters(ai.plain) !== letters(text) && letters(ai.plain) !== letters(ai.meaning);
        return `<p class="wc-lbl">What it means here:</p><p class="wc-meaning" id="m">${esc(ai.meaning)}</p>
          ${showPlain ? `<p class="wc-lbl">In plain words:</p><p class="wc-local">${esc(ai.plain)}</p>` : ''}`;
      }
      return `${changed ? '<p class="wc-lbl">In plain words:</p>' : ''}<p class="wc-meaning" id="m">${esc(meaningText)}</p>`;
    }
    const redraw = () => {
      if (!card || cardRange !== range) return;
      card.querySelector('#main').innerHTML = mainHtml();
      const c = card.querySelector('#ctx'); c.innerHTML = ctxHtml(); c.hidden = !c.innerHTML.trim();
      place(card, range.getBoundingClientRect());
    };
    card = document.createElement('div');
    card.className = 'wc'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Explanation of the highlighted ' + badge.toLowerCase());
    card.innerHTML = `<div class="wc-top">
        <div class="wc-rings"><img src="${asset('icons/card/header-rings.svg')}" width="252.51" height="252.51" alt=""></div>
        <div class="wc-head">
          <div class="wc-row"><span class="wc-badge">${badge}</span>
            <div class="wc-icons"><span class="wc-saved" id="saved" hidden>Saved</span>
              <button class="wc-icon" id="hear" aria-label="Read it out loud" title="Hear it"><img src="${asset('icons/card/volume.svg')}" width="24" height="24" alt=""></button>
              <button class="wc-icon" id="save" aria-label="Save to Linger" aria-pressed="false" title="Save to Linger"><img src="${asset('icons/card/bookmark.svg')}" width="24" height="24" alt=""></button></div></div>
          <div class="wc-words"><p class="wc-word wc-phrase" title="${esc(text)}">${esc(text)}</p></div>
        </div></div>
      <div class="wc-body">
        <div class="wc-ctx" id="main"></div>
        <div class="wc-ctx" id="ctx"></div>
        <div class="wc-ctx" id="tr" hidden></div>
        <p class="wc-note" id="ai">${aiOK() ? AI_WAIT : ''}</p>
        <p class="wc-note" id="note"></p>
      </div>`;
    layer.appendChild(card);
    redraw();
    if (aiOK()) waitCycle(card.querySelector('#ai'));
    addTranslation(() => card && cardRange === range, () => range.getBoundingClientRect(), text, fromText || para.slice(0, 1500), false);
    card.querySelector('#hear').onclick = () => speakIt(text);
    const useAI = (a) => {
      if (!card || cardRange !== range) return;
      card.querySelector('#ai').textContent = !a && aiOK() ? 'Linger AI didn’t answer this time. Highlight it again to retry.' : '';
      if (a && a.meaning) { ai = { meaning: a.meaning, plain: a.plain || '', hardWords: a.hardWords || [] }; redraw(); }
    };
    if (aiOK()) aiP.then(useAI);
    else if (aiUndecided()) consentPrompt(card.querySelector('#ai'), () => askAI('phrase', text, aiCtx).then(useAI));
    const key = 'phrase-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const showSaved = () => { card.querySelector('#saved').hidden = false; card.querySelector('#save').setAttribute('aria-pressed', 'true'); card.querySelector('#save').title = 'Saved to Linger'; };
    store({ saved: [] }, (v) => { if (card && cardRange === range && v.saved.some((x) => x.key === key)) showSaved(); });
    card.querySelector('#save').onclick = async () => {
      const m = ai ? ai.meaning : changed ? plain : hard.filter((x) => x.meaning).map((x) => `${x.raw}: ${x.meaning}`).join(' ');
      const p = ai ? ai.plain : changed ? plain : '';
      const r = await send({ type: 'save', key, word: { w: text, m, s: fromText || text, p, place: host, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } });
      if (!card || cardRange !== range) return;
      showSaved(); savedFx(card.querySelector('#save'), text, r && r.synced);
      card.querySelector('#note').textContent = r && r.synced ? 'Saved. Sent to the Linger app on your phone.' : r && r.paired === false ? 'Saved here. Connect your phone in the Linger menu to send it there.' : r && r.error ? 'Saved here. Couldn’t reach your phone right now.' : 'Saved.';
    };
    // Look up the hard words Linger doesn't know yet, and find easier synonyms.
    await Promise.all(hard.map(async (x) => {
      if (!x.done) {
        const d = api ? await send({ type: 'lookup', word: x.k }) : await directLookup(x.k);
        x.meaning = (d && d.meaning) || ''; x.done = true;
        redraw();
      }
      if (!x.easy && x.meaning && x.kind !== 'slang') {
        const r = api ? await send({ type: 'synonyms', word: x.k }) : await directSynonyms(x.k);
        const e = easier(x.k, r, x.meaning);
        if (e) { x.easy = e; redraw(); }
      }
    }));
  }
  // Faster cards: start the AI explanation, the dictionary meaning and the synonyms while the pointer rests on an
  // underlined word (people hover for a moment before they click). The card then finds them ready, or already on the
  // way, instead of starting from zero on click. Same requests the card makes, so nothing is fetched twice.
  const prefetched = new Set();
  function prefetch(sp) {
    if (dead || !sp || !sp.isConnected) return;
    const raw = sp.dataset.orig || sp.textContent, k = keyOf(raw), sentence = sentenceAround(sp), id = raw + '\n' + sentence;
    if (prefetched.has(id)) return;
    prefetched.add(id);
    askAI('word', raw, sentence);
    const sl = SLANG[k], d = D[k];
    if (!((sl && sl.meaning) || (d && d.meaning) || PLAIN[k])) send({ type: 'lookup', word: k });
    if (!PLAIN[k] && !sl) send({ type: 'synonyms', word: k });
  }
  let hoverT = null;
  window.addEventListener('mouseover', (e) => {
    if (dead) return;
    const sp = e.target.closest && e.target.closest('.linger-w');
    clearTimeout(hoverT);
    if (sp) hoverT = setTimeout(() => prefetch(sp), 120);
  }, { passive: true, capture: true });

  window.addEventListener('mouseup', (e) => {
    if (dead || e.button !== 0 || (e.composedPath && e.composedPath().includes(host$))) return;
    clearTimeout(chipT);
    chipT = setTimeout(showChip, 220); // after a double-click has had its turn
  }, true); // capture: runs before a site's own scripts can stop the event
  document.addEventListener('selectionchange', () => { if (!dead && chip) { const s = getSelection(); if (!s || s.isCollapsed) hideChip(); } });

  window.addEventListener('click', (e) => {
    if (dead || (e.composedPath && e.composedPath().includes(host$))) return;
    let sp = e.target.closest && e.target.closest('.linger-w');
    if (sp && !S.highlight && !sp.classList.contains('linger-swapped')) sp = null; // underlines off: plain text stays plain
    if (sp) { e.preventDefault(); e.stopPropagation(); openCard(sp); return; }
    if (card) closeCard();
  }, true);
  window.addEventListener('keydown', (e) => {
    if (dead || (e.key !== 'Enter' && e.key !== ' ') || e.altKey || e.ctrlKey || e.metaKey) return;
    const sp = e.target && e.target.closest && e.target.closest('.linger-w');
    if (!sp || (!S.highlight && !sp.classList.contains('linger-swapped'))) return;
    e.preventDefault(); e.stopPropagation();
    openCard(sp).catch(() => {}); cardOpener = sp; focusCard();
  }, true);
  // Double-click any word (even one that isn't underlined) to look it up.
  window.addEventListener('dblclick', (e) => {
    if (dead || offHere() || pageTr || (e.composedPath && e.composedPath().includes(host$))) return; // underlines can be off
    const sel = getSelection(); const w = (sel && sel.toString().trim()) || '';
    if (!/^[A-Za-z][A-Za-z'’-]{1,30}$/.test(w) || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!okParent(r.startContainer)) return;
    const sp = document.createElement('span'); sp.className = 'linger-w'; sp.dataset.kind = classify(w, true) || 'common'; sp.dataset.k = keyOf(w);
    try { r.surroundContents(sp); sel.removeAllRanges(); openCard(sp); } catch {}
  }, true); // capture: runs before a site's own scripts can stop the event
  window.addEventListener('keydown', (e) => { if (!dead && e.key === 'Escape') { hideChip(); closeCard(); closePanel(); closeAsk(); } }, true);
  window.addEventListener('scroll', () => {
    if (dead) return;
    hideChip();
    if (card && (cardSpan || cardRange)) place(card, (cardSpan || cardRange).getBoundingClientRect());
  }, { passive: true });

  // ---------- hard words in easier English or the reader's language ----------
  // "Hard words show as" (Linger menu, or Alt+Shift+L on the page): the original word, an easier English word, or the
  // word in the reader's language, swapped right in the text. Fast because: Linger's own plain-word list answers many
  // words instantly, Chrome's on-device translator does the reader's language without the internet, everything else
  // goes to Claude in batches of 60 words (what's on screen first), and every answer is remembered.
  const SWAPS = new Map(); // `${lang}|${word}` → replacement ('' = no easier word)
  let swapT = null, swapping = false, swapAgain = false;
  const swapLang = () => (S.swap === 'easy' ? 'en' : S.swap === 'mine' && S.transLang && S.transLang !== 'en' ? S.transLang : '');
  const origOf = (sp) => sp.dataset.orig || sp.textContent;
  function unshow(sp) {
    if (sp.dataset.orig) { sp.textContent = sp.dataset.orig; delete sp.dataset.orig; }
    delete sp.dataset.swapLang;
    sp.classList.remove('linger-swapped'); sp.removeAttribute('title'); sp.removeAttribute('lang'); sp.removeAttribute('dir');
  }
  function showWord(sp, rep, lang) {
    const orig = origOf(sp);
    if (rep) rep = rep.split(/\s*[,;/、，]\s*/)[0].trim(); // one word only: "कद, प्रतिष्ठा" → "कद" (it sits inside the sentence)
    if (!rep || rep.toLowerCase() === orig.toLowerCase()) { unshow(sp); return; }
    sp.dataset.orig = orig; sp.dataset.swapLang = lang;
    sp.textContent = /^[A-Z]/.test(orig) && lang === 'en' ? cap(rep) : rep;
    sp.classList.add('linger-swapped'); sp.title = orig;
    if (lang !== 'en') { sp.lang = lang; sp.dir = 'auto'; }
  }
  function scheduleSwap() { clearTimeout(swapT); swapT = setTimeout(runSwap, 60); }
  async function runSwap() {
    if (dead) return;
    const lang = swapLang(), spans = [...document.querySelectorAll('.linger-w')];
    if (!lang) { spans.forEach(unshow); return; }
    const need = new Map();
    for (const sp of spans) {
      if (sp.dataset.swapLang && sp.dataset.swapLang !== lang) unshow(sp);
      const orig = origOf(sp), k = keyOf(orig), key = lang + '|' + k;
      if (SWAPS.has(key)) { showWord(sp, SWAPS.get(key), lang); continue; }
      // Linger's own list of plain words: instant, no internet (short ones only, so the sentence still reads well).
      if (lang === 'en' && PLAIN[k] && PLAIN[k].split(' ').length <= 3) { SWAPS.set(key, PLAIN[k]); showWord(sp, PLAIN[k], lang); continue; }
      if (!need.has(k)) need.set(k, { w: orig, spans: [] });
      need.get(k).spans.push(sp);
    }
    if (!need.size) return;
    if (swapping) { swapAgain = true; return; }
    swapping = true;
    try {
      const list = [...need.values()];
      list.forEach((x) => { const r = x.spans[0].getBoundingClientRect(); x.rank = r.bottom < 0 ? 2e6 - r.bottom : r.top > innerHeight ? 1e6 + r.top : r.top; });
      list.sort((a, b) => a.rank - b.rank);
      const done = (x, rep) => { SWAPS.set(lang + '|' + keyOf(x.w), rep || ''); x.spans.forEach((sp) => { if (sp.isConnected) showWord(sp, rep, lang); }); };
      const t = lang !== 'en' ? await chromeTranslator('en', lang) : null;
      if (t) {
        for (const x of list) { if (swapLang() !== lang) return; try { done(x, await t.translate(x.w)); } catch {} }
      } else {
        for (let i = 0; i < list.length && i < 300; i += 60) {
          const chunk = list.slice(i, i + 60);
          const items = chunk.map((x) => ({ w: x.w, s: sentenceAround(x.spans[0]).slice(0, 300) }));
          const r = await askAI('swap-many', '', '', { lang, langName: LANG(lang).name, items });
          if (swapLang() !== lang) return;
          if (!r || !Array.isArray(r.swaps) || r.swaps.length !== chunk.length) {
            // Claude can't be reached (AI off, offline, or the server not updated yet). Easier English still works:
            // the thesaurus Linger uses for synonyms suggests a clearly more common word (fast, free, no AI).
            if (lang === 'en') {
              const got = await thesaurusSwaps(list.slice(i, i + 150), done); // a page's worth, not hundreds of lookups
              swapNote(got ? 'Linger AI isn’t reachable, so easier words come from a thesaurus and may not always fit.' : 'Linger couldn’t get easier words right now. Only words from its own list switched.');
            } else swapNote(!aiOK() ? 'Turn on AI explanations in the Linger menu to switch more words.' : 'Linger couldn’t translate the hard words right now. Check your internet connection.');
            break;
          }
          chunk.forEach((x, j) => done(x, r.swaps[j]));
        }
      }
    } finally { swapping = false; if (swapAgain) { swapAgain = false; scheduleSwap(); } }
  }
  // Easier words from the thesaurus (Datamuse: synonyms with how common each one is), 8 lookups at a time.
  // Picks a single, clearly more common word, the same rule word cards use for "Easier word".
  async function thesaurusSwaps(list, done) {
    let got = 0, next = 0;
    const one = async () => {
      while (next < list.length) {
        const x = list[next++], k = keyOf(x.w);
        if (swapLang() !== 'en') return;
        if (SLANG[k]) continue; // local slang has a local meaning the thesaurus gets wrong (jumbo isn't "large" here)
        const r = await send({ type: 'synonyms', word: k });
        const c = r && r.list && r.list.find((c) => /^[a-z]+$/.test(c.w) && c.w.slice(0, 4) !== k.slice(0, 4) && c.f >= Math.max(3 * (r.self || 0), 5) && (isCommon(c.w) || c.f >= 20));
        if (c && swapLang() === 'en') { done(x, c.w); got++; }
      }
    };
    await Promise.all(Array.from({ length: 8 }, one));
    return got;
  }
  // A short message at the top of the page (for the Alt+Shift+L shortcut).
  let toastEl = null, toastT = null;
  function toast(text) {
    if (dead) return;
    attach();
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'tbar'; toastEl.setAttribute('role', 'status'); toastEl.innerHTML = '<span></span>'; }
    if (!toastEl.isConnected) layer.appendChild(toastEl);
    toastEl.querySelector('span').textContent = text;
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.remove(), 2500);
  }
  const SWAP_UI = ['Hard words: easier English', 'Hard words: original', 'Turn on AI explanations in the Linger menu to switch more words.', 'Linger AI isn’t reachable, so easier words come from a thesaurus and may not always fit.',
    'Linger couldn’t get easier words right now. Only words from its own list switched.', 'Linger couldn’t translate the hard words right now. Check your internet connection.'];
  let noted = '';
  function swapNote(msg) { if (noted === msg) return; noted = msg; const L = myLang(); (L ? loadUI(L, SWAP_UI) : Promise.resolve()).then(() => toast(T(msg))); }
  const swapLabel = () => (S.swap === 'easy' ? 'Hard words: easier English' : S.swap === 'mine' && swapLang() ? `Hard words: ${LANG(S.transLang).own}` : 'Hard words: original');
  // Alt+Shift+L: original → easier English → my language → original.
  window.addEventListener('keydown', (e) => {
    if (dead || !(e.altKey && e.shiftKey && e.code === 'KeyL') || offHere()) return;
    e.preventDefault();
    const order = ['', 'easy', ...(S.transLang && S.transLang !== 'en' ? ['mine'] : [])];
    S.swap = order[(order.indexOf(S.swap) + 1) % order.length];
    try { if (api && alive()) chrome.storage.local.set({ swap: S.swap }); } catch {}
    apply(); noted = '';
    const L = myLang();
    (L ? loadUI(L, SWAP_UI) : Promise.resolve()).then(() => toast(T(swapLabel()) + ' · Alt+Shift+L')); // in the reader's language
  }, true);

  // ---------- highlighted text in another language ----------
  // On a page Linger translated (or one written in another language), highlighting text used to do nothing: the
  // Explain button only appeared for English letters. Now it shows the text in English, the original English from the
  // page when Linger did the translating, and what it means (also in the reader's language).
  let pageLangCache = null;
  const NON_LATIN = /[^\u0000-ɏḀ-ỿ\s\d\p{P}\p{S}]/u;
  async function detectText(text) {
    try {
      if (typeof LanguageDetector !== 'undefined' && (await LanguageDetector.availability()) === 'available') {
        const [best] = await (await LanguageDetector.create()).detect(text);
        if (best && best.confidence > 0.5 && best.detectedLanguage !== 'und') return best.detectedLanguage;
      }
    } catch {}
    return '';
  }
  async function foreignLang(text) {
    if (pageTr) return pageTr.to;
    const d = await detectText(text);
    if (d) return d;
    if (!pageLangCache) pageLangCache = pageLang();
    const p = await pageLangCache;
    return base(p) !== 'en' ? p : NON_LATIN.test(text) ? 'und' : 'en';
  }
  async function openForeign(range, text, from) {
    if (dead) return;
    attach(); closeCard(); hideChip();
    cardRange = range;
    if (HL) HL.set('linger-sel', new Highlight(range));
    ink(range.getClientRects());
    addFonts();
    const isCur = () => card && cardRange === range;
    const orig = pageTr ? [...new Set([range.startContainer, range.endContainer].map((n) => pageTr.orig.get(n)).filter(Boolean))].map((x) => x.trim()).join(' … ') : '';
    const dir = rtl(from) ? 'rtl' : 'auto', mine = S.transLang && S.transLang !== 'en' ? S.transLang : '';
    let english = '', meaning = '';
    card = document.createElement('div');
    card.className = 'wc'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Meaning of the highlighted text');
    card.innerHTML = `<div class="wc-top">
        <div class="wc-rings"><img src="${asset('icons/card/header-rings.svg')}" width="252.51" height="252.51" alt=""></div>
        <div class="wc-head">
          <div class="wc-row"><span class="wc-badge">${from === 'und' ? 'Translation' : esc(LANG(from).name)}</span>
            <div class="wc-icons"><span class="wc-saved" id="saved" hidden>Saved</span>
              <button class="wc-icon" id="hear" aria-label="Hear it in English" title="Hear it in English"><img src="${asset('icons/card/volume.svg')}" width="24" height="24" alt=""></button>
              <button class="wc-icon" id="save" aria-label="Save to Linger" aria-pressed="false" title="Save to Linger"><img src="${asset('icons/card/bookmark.svg')}" width="24" height="24" alt=""></button></div></div>
          <div class="wc-words"><p class="wc-word wc-phrase" lang="${esc(from)}" dir="${dir}" title="${esc(text)}">${esc(text)}</p></div>
        </div></div>
      <div class="wc-body">
        <div class="wc-ctx"><p class="wc-lbl">In English:</p><p class="wc-meaning" id="en">Translating…</p></div>
        ${orig ? `<div class="wc-ctx"><p class="wc-lbl">On the original page:</p><div class="wc-box"><p class="wc-s">“${esc(orig.length > 400 ? orig.slice(0, 400) + '…' : orig)}”</p></div></div>` : ''}
        <div class="wc-ctx" id="mean" hidden></div>
        <p class="wc-note" id="note"></p>
      </div>`;
    layer.appendChild(card);
    place(card, range.getBoundingClientRect());
    card.querySelector('#hear').onclick = () => speakIt(english || orig);
    card.querySelector('#save').onclick = async () => {
      const r = await send({ type: 'save', key: 'phrase-' + (english || text).toLowerCase().replace(/[^\p{L}0-9]+/gu, '-').slice(0, 60), word: { w: english || text, m: meaning || text, s: orig || text, p: '', place: host, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } });
      if (!isCur()) return;
      card.querySelector('#saved').hidden = false; card.querySelector('#save').setAttribute('aria-pressed', 'true');
      savedFx(card.querySelector('#save'), english || text, r && r.synced);
      card.querySelector('#note').textContent = r && r.synced ? 'Saved. Sent to the Linger app on your phone.' : 'Saved.';
    };
    // 1. In English (the original English is already right there when Linger translated this page).
    const en = from === 'en' ? { text } : await translate(text, { from, to: 'en' });
    if (!isCur()) return;
    english = (en && en.text) || '';
    card.querySelector('#en').textContent = english || (aiOK() ? 'Couldn’t translate this right now. Check your internet connection.' : 'Turn on AI explanations in the Linger menu to translate this.');
    place(card, range.getBoundingClientRect());
    if (!english) return;
    // 2. What it means, in plain English, and in the reader's language.
    const words = english.split(/\s+/).length;
    const a = await askAI(words <= 2 ? 'word' : 'phrase', english, orig || english);
    if (!isCur() || !a || !a.meaning) return;
    meaning = a.meaning;
    const m = card.querySelector('#mean');
    m.hidden = false;
    m.innerHTML = `<p class="wc-lbl">What it means:</p><p class="wc-local">${esc(meaning)}</p>`;
    if (mine) {
      const t = await translate(meaning, { to: mine });
      if (isCur() && t && t.text) m.insertAdjacentHTML('beforeend', `<p class="wc-lbl">In ${esc(LANG(mine).own)}:</p><p class="wc-local" lang="${esc(mine)}" dir="${rtl(mine) ? 'rtl' : 'auto'}">${esc(t.text)}</p>`);
    }
    if (isCur()) place(card, range.getBoundingClientRect());
  }

  // ---------- translate the whole page ----------
  // Swaps each piece of text on the page for its translation (layout, links and buttons keep working) and can swap it
  // back. Uses Chrome's on-device translator only: a whole page is too much to send to Claude.
  // If the page is already in the reader's language, it translates into English instead (reading a page from home).
  const TR_SKIP = new Set([...SKIP].filter((t) => !['A', 'LABEL', 'BUTTON'].includes(t)));
  const trOk = (n) => {
    for (let el = n.parentElement; el; el = el.parentElement) {
      if (TR_SKIP.has(el.tagName) || el.isContentEditable || el.id === 'linger-ui' || el.id === 'linger-gaze' || el.hasAttribute('data-linger-skip') || el.getAttribute('translate') === 'no') return false;
    }
    return true;
  };
  async function pageLang() {
    const sample = ((document.body && document.body.innerText) || '').slice(0, 3000);
    try {
      if (typeof LanguageDetector !== 'undefined' && (await LanguageDetector.availability()) === 'available') {
        const [best] = await (await LanguageDetector.create()).detect(sample);
        if (best && best.confidence > 0.5 && best.detectedLanguage !== 'und') return best.detectedLanguage;
      }
    } catch {}
    const tag = (document.documentElement.lang || '').trim().toLowerCase();
    return tag ? (tag.startsWith('zh-hant') || tag === 'zh-tw' || tag === 'zh-hk' ? 'zh-Hant' : tag.split('-')[0]) : 'en';
  }
  const base = (c) => String(c || '').split('-')[0].toLowerCase();
  // The language to translate into: the reader's, or English when the page is already in theirs.
  const pageTarget = (from, mine) => (base(from) === base(mine) && !(mine === 'zh-Hant' && from !== 'zh-Hant') ? 'en' : mine);

  function trBar(text) {
    if (!pageTr) return;
    attach();
    if (!pageTr.bar) {
      pageTr.bar = document.createElement('div');
      pageTr.bar.className = 'tbar'; pageTr.bar.setAttribute('role', 'status');
      pageTr.bar.innerHTML = '<span></span><button type="button">Show original</button>';
      pageTr.bar.querySelector('button').onclick = restorePage;
      layer.appendChild(pageTr.bar);
    }
    pageTr.bar.querySelector('span').textContent = text;
  }
  function restorePage() {
    if (!pageTr) return;
    const { orig, bar } = pageTr;
    pageTr = null; // also stops a translation still in progress
    orig.forEach((src, n) => { if (n.isConnected) n.nodeValue = src; });
    if (bar) bar.remove();
    apply(); // underline hard words again
  }
  async function translatePage(lang) {
    if (pageTr) { restorePage(); return { ok: true, off: true }; }
    if (!lang) return { ok: false, why: 'Pick your language first.' };
    const from = await pageLang(), to = pageTarget(from, lang);
    if (base(from) === base(to)) return { ok: false, why: `This page is already in ${LANG(to).name}.` };
    // Chrome's translator when it works here; otherwise Claude, a batch of text pieces at a time (needs AI explanations
    // on). Before, a page whose Chrome translator wasn't ready (Hindi, for one) just said it couldn't translate.
    const t = await chromeTranslator(from, to);
    if (!t && !aiOK()) return { ok: false, why: `Chrome can’t translate ${LANG(from).name} into ${LANG(to).name} here. Turn on AI explanations in the Linger menu to translate with Claude.` };
    // Underlines split sentences into pieces, so they come off while the page is translated (and back after).
    pageTr = { from, to, orig: new Map(), bar: null };
    mo.disconnect(); unwrapAll(); closeCard(); hideChip();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\p{L}/u.test(n.nodeValue) && trOk(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const nodes = []; let n;
    while ((n = walker.nextNode()) && nodes.length < 4000) nodes.push(n);
    // What's on screen first, then below it, then above it.
    const rank = (nd) => { const r = nd.parentElement.getBoundingClientRect(); return r.bottom < 0 ? 2e6 - r.bottom : r.top > innerHeight ? 1e6 + r.top : r.top; };
    const order = nodes.map((nd) => [rank(nd), nd]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const label = `${LANG(from).name} → ${LANG(to).own}`, me = pageTr;
    trBar(`Translating ${label}…`);
    const put = (nd, src, out) => { me.orig.set(nd, src); nd.nodeValue = src.match(/^\s*/)[0] + out + src.match(/\s*$/)[0]; };
    const pct = (done) => trBar(`Translating ${label}… ${Math.round((done / order.length) * 100)}%`);
    (async () => {
      let done = 0;
      if (t) {
        for (const nd of order) {
          if (pageTr !== me) return; // "Show original" was pressed
          const src = nd.nodeValue, core = src.trim();
          if (core && nd.isConnected) { try { const out = await t.translate(core); if (pageTr !== me) return; put(nd, src, out); } catch {} }
          if (++done % 25 === 0) pct(done);
        }
        return trBar(`Translated ${label} by Chrome on this laptop`);
      }
      // Claude: up to 40 pieces (5,000 letters) per request, screen first.
      const batches = []; let cur = [], len = 0;
      for (const nd of order) {
        const core = nd.nodeValue.trim().slice(0, 600);
        if (cur.length && (cur.length >= 40 || len + core.length > 4800)) { batches.push(cur); cur = []; len = 0; }
        cur.push(nd); len += core.length;
      }
      if (cur.length) batches.push(cur);
      let failed = 0;
      for (const b of batches.slice(0, 25)) { // about 1,000 pieces at most, so one page can't run up the bill
        if (pageTr !== me) return;
        const srcs = b.map((nd) => nd.nodeValue);
        const r = await askAI('translate-many', '', '', { lang: to, langName: LANG(to).name, from, texts: srcs.map((x) => x.trim().slice(0, 600)) });
        if (pageTr !== me) return;
        const outs = r && Array.isArray(r.translations) ? r.translations : null;
        if (!outs || outs.length !== b.length) failed++;
        if (outs) b.forEach((nd, i) => { if (outs[i] && nd.isConnected && nd.nodeValue === srcs[i]) put(nd, srcs[i], outs[i]); });
        done += b.length; pct(done);
      }
      trBar(failed === batches.length ? 'Couldn’t translate this page right now. Check your internet connection.' : `Translated ${label} by Claude${failed ? ' (some parts were skipped)' : ''}`);
    })();
    return { ok: true, from, to };
  }

  // ---------- Explain this page ----------
  let panel = null;
  function closePanel() { if (panel) panel.remove(); panel = null; }
  function explainPage() {
    attach(); closePanel();
    const main = document.querySelector('main, article, [role="main"]') || document.body;
    const sel = String(getSelection() || '').trim();
    const text = (sel.split(' ').length > 5 ? sel : (main.innerText || '')).slice(0, 8000);
    const { points, dates } = summarize(text);
    panel = document.createElement('div');
    panel.className = 'panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'What this page wants from you');
    panel.innerHTML = `<div class="phead"><strong>✦ What this ${sel.split(' ').length > 5 ? 'text' : 'page'} wants from you</strong><button class="x" aria-label="Close">✕</button></div>
      <div class="pbody">${points.length ? `<ul>${points.map(([ic, t], i) => `<li style="--i:${i}"><span>${ic}</span><span>${esc(t)}</span></li>`).join('')}</ul>` : '<div>Linger couldn’t find instructions on this page.</div>'}
        ${dates.length ? `<div class="lbl">Key dates and amounts</div><div class="chips">${dates.map((d, i) => `<span class="chip" style="--i:${i}">${esc(d)}</span>`).join('')}</div>` : ''}
        <div class="row"><button class="btn" id="read">🔊 Read aloud</button></div>
        <div class="note">Made by swapping formal words for plain ones in the important sentences. Select some text first to explain just that part.</div></div>`;
    layer.appendChild(panel);
    panel.querySelector('.x').onclick = closePanel;
    panel.querySelector('#read').onclick = () => speakIt(points.map((p) => p[1]).join(' '));
  }

  // ---------- Linger's own words in the reader's language ----------
  // Ask Linger's buttons and messages (and the toolbar menu) follow "My language". Each language is translated once
  // (Chrome's translator, or Claude) and kept in chrome.storage, shared with the menu.
  const UI = new Map(); let uiLang = '';
  const T = (x) => (uiLang && UI.get(x)) || x;
  async function loadUI(lang, strings) {
    if (!lang || lang === 'en') { uiLang = ''; return false; }
    const key = 'uiTr.' + lang;
    if (uiLang !== lang) { UI.clear(); uiLang = lang; }
    try { if (api && alive()) Object.entries((await chrome.storage.local.get({ [key]: {} }))[key] || {}).forEach(([k, v]) => UI.set(k, v)); } catch {}
    const missing = strings.filter((x) => !UI.has(x));
    if (!missing.length) return false;
    const t = await chromeTranslator('en', lang);
    if (t) { for (const m of missing) { try { UI.set(m, await t.translate(m)); } catch {} } }
    else {
      const r = await askAI('translate-many', '', '', { lang, langName: LANG(lang).name, from: 'en', texts: missing });
      if (r && Array.isArray(r.translations) && r.translations.length === missing.length) missing.forEach((m, i) => { if (r.translations[i]) UI.set(m, r.translations[i]); });
    }
    try { if (api && alive()) { const out = {}; UI.forEach((v, k) => { out[k] = v; }); await chrome.storage.local.set({ [key]: out }); } } catch {}
    return missing.some((m) => UI.has(m));
  }

  // ---------- Ask Linger: the page assistant ----------
  // A small button in the bottom-right corner opens a chat about the page: questions, or help with a decision.
  // Claude gets the page's text (and the reader's highlight, if any). Turn the button off in the Linger menu.
  let fab = null, askBox = null, askFocus = '', asking = false;
  const askHist = [];
  const SUGGEST = ['What is this page about?', 'What do I need to do, and by when?', 'Help me decide what to do'];
  const INTRO = 'Hi! Ask me anything about this page, or ask for help deciding what to do. I only use what’s on the page.';
  const ERR = { busy: 'Lots of questions right now. Please wait a minute and try again.', off: 'AI is turned off in the Linger menu.', failed: 'Linger couldn’t answer right now. Check your internet connection and try again.' };
  const ASK_UI = ['Ask Linger', 'About this page', 'Start a new chat', 'Close', 'Ask anything about this page…', 'Your question', 'Send', 'Start over', INTRO, ...SUGGEST,
    'You can hide this button in the Linger menu.', 'Reading the page…', 'Read aloud', 'About your highlight:', 'Ask about the whole page instead', 'Ask Linger about this page', ...Object.values(ERR)];
  const myLang = () => (S.transLang && S.transLang !== 'en' ? S.transLang : '');
  function showFab() {
    // Follows "On this site" (and its own switch), not "Underline hard words": you can ask about a page without underlines.
    const want = S.assistant && aiOK() && !offHere() && window === window.top;
    if (!want) { if (fab) fab.remove(); fab = null; closeAsk(); return; }
    if (fab && fab.isConnected && host$.isConnected) return;
    if (fab) fab.remove();
    attach(); addFonts();
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'ask-fab'; fab.textContent = '✦';
    fab.title = T('Ask Linger about this page'); fab.setAttribute('aria-label', T('Ask Linger about this page'));
    fab.onmousedown = (e) => e.preventDefault(); // keep the reader's highlight, so it can be the topic
    fab.onclick = () => (askBox ? closeAsk() : openAsk());
    layer.appendChild(fab);
  }
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  function closeAsk() { if (askBox) askBox.remove(); askBox = null; if (fab) fab.setAttribute('aria-expanded', 'false'); }
  // The page's readable text: the main article if there is one, otherwise the whole page.
  function pageText() {
    const main = document.querySelector('main, article, [role="main"]');
    const src = main && (main.innerText || '').trim().length > 400 ? main : document.body;
    return ((src && src.innerText) || '').slice(0, 40000);
  }
  async function askServer(question) {
    const body = { mode: 'ask', question, history: askHist.slice(-8).map(({ q, a }) => ({ q, a })), page: pageText(), title: document.title, site: host, focus: askFocus,
      ...(myLang() ? { lang: myLang(), langName: LANG(myLang()).name } : {}) }; // answers come back in the reader's language
    if (api) return send({ type: 'ai-ask', body });
    if (!window.LINGER_AI_URL) return { error: 'off' };
    try { const r = await fetch(window.LINGER_AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.ok ? await r.json() : { error: 'failed' }; }
    catch { return { error: 'failed' }; }
  }
  function openAsk() {
    attach(); hideChip();
    const sel = String(getSelection() || '').replace(/\s+/g, ' ').trim();
    if (sel && /[A-Za-z]/.test(sel)) askFocus = sel.slice(0, 700);
    askBox = document.createElement('div');
    askBox.className = 'ask-panel'; askBox.setAttribute('role', 'dialog'); askBox.setAttribute('aria-label', T('Ask Linger about this page'));
    const L = myLang(), ld = L ? ` lang="${esc(L)}" dir="${rtl(L) ? 'rtl' : 'auto'}"` : '';
    askBox.innerHTML = `<div class="ask-head"${ld}><img class="ask-rings" src="${asset('icons/ask/rings.svg')}" width="252.51" height="252.51" alt="">
        <strong>${esc(T('Ask Linger'))}</strong>
        <div class="ask-tools"><button type="button" class="ask-x" id="new" title="${esc(T('Start over'))}" aria-label="${esc(T('Start a new chat'))}"><img src="${asset('icons/ask/rotate-ccw.svg')}" width="22" height="22" alt=""></button><button type="button" class="ask-x" id="close" title="${esc(T('Close'))}" aria-label="${esc(T('Close'))}">${ICON_X}</button></div></div>
      <div class="ask-log" id="log" aria-live="polite"${ld}></div>
      <div class="ask-foot"><div class="ask-focus" id="focus" hidden${ld}></div>
        <form class="ask-form" id="form"><textarea id="q" rows="1" placeholder="${esc(T('Ask anything about this page…'))}" aria-label="${esc(T('Your question'))}"${ld}></textarea><button type="submit" class="ask-send" aria-label="${esc(T('Send'))}">${ICON_UP}</button></form></div>`;
    layer.appendChild(askBox);
    fab.setAttribute('aria-expanded', 'true');
    const $ = (id) => askBox.querySelector('#' + id);
    $('close').onclick = closeAsk;
    $('new').onclick = () => { askHist.length = 0; askFocus = ''; drawLog(); drawFocus(); $('q').focus(); };
    $('form').onsubmit = (e) => { e.preventDefault(); ask($('q').value); };
    $('q').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask($('q').value); } };
    $('q').oninput = () => { const t = $('q'); t.style.height = 'auto'; t.style.height = Math.max(49, Math.min(110, t.scrollHeight + 4)) + 'px'; };
    drawLog(); drawFocus();
    $('q').focus();
    // First time in this language: translate the panel's words, then redraw it (unless the reader started typing).
    if (L) loadUI(L, ASK_UI).then((changed) => { if (changed && askBox && !askBox.querySelector('#q').value && !asking) { closeAsk(); openAsk(); } });
  }
  function drawFocus() {
    if (!askBox) return;
    const f = askBox.querySelector('#focus');
    f.hidden = !askFocus;
    f.innerHTML = askFocus ? `<span>${esc(T('About your highlight:'))} “${esc(askFocus.length > 90 ? askFocus.slice(0, 90) + '…' : askFocus)}”</span><button type="button" class="ask-x small" aria-label="${esc(T('Ask about the whole page instead'))}">${ICON_X}</button>` : '';
    if (askFocus) f.querySelector('button').onclick = () => { askFocus = ''; drawFocus(); };
  }
  function drawLog(pending, err) {
    if (!askBox) return;
    const log = askBox.querySelector('#log');
    const msgs = askHist.map((t, i) => `<div class="msg-me">${esc(t.q)}</div><div class="msg-ai"${t.lang ? ` lang="${esc(t.lang)}"` : ''}>${esc(t.a)}<button type="button" class="ask-hear" data-i="${i}">🔊 ${esc(T('Read aloud'))}</button></div>`).join('');
    const intro = askHist.length || pending ? '' : `<div class="msg-ai">${esc(T(INTRO))}</div>
      <div class="ask-sugg">${SUGGEST.map((s) => `<button type="button">${esc(T(s))}</button>`).join('')}</div>`;
    log.innerHTML = intro + msgs + (pending ? `<div class="msg-me">${esc(pending)}</div>${err ? '' : `<div class="msg-ai wait">${esc(T('Reading the page…'))}</div>`}` : '') + (err ? `<div class="msg-ai err">${esc(err)}</div>` : '');
    log.querySelectorAll('.ask-sugg button').forEach((b) => { b.onclick = () => ask(b.textContent); });
    log.querySelectorAll('.ask-hear').forEach((b) => { b.onclick = () => { const t = askHist[+b.dataset.i]; speakAlong(b.parentElement, t.a, t.lang || 'en-US'); }; });
    log.scrollTop = log.scrollHeight;
    if (pending && !err && !uiLang) waitCycle(log.querySelector('.msg-ai.wait'), ['Reading the page…', 'Finding the answer…', 'Writing it in simple words…']);
  }
  async function ask(raw) {
    const q = String(raw || '').trim();
    if (!q || asking || !askBox) return;
    asking = true;
    const box = askBox.querySelector('#q'); box.value = ''; box.style.height = '';
    drawLog(q);
    let r = null;
    try { r = await askServer(q); } catch {} finally { asking = false; } // a failed request must not lock the chat
    if (r && r.answer) { askHist.push({ q, a: r.answer.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, ''), lang: myLang() }); drawLog(); }
    else drawLog(q, T(ERR[r && (r.error === 'busy' || r.error === 'off') ? r.error : 'failed']));
    if (askBox) askBox.querySelector('#q').focus();
  }

  // ---------- staying on the page ----------
  // Step aside for a newer copy (or, when the extension can't be reached and no newer copy came, say so once).
  function retire(stale) {
    if (dead) return;
    dead = true;
    try { clearInterval(watchdog); } catch {} // (defined further down)
    try { mo.disconnect(); } catch {}
    try { unwrapAll(); } catch {} // underlines off and swapped words back to the page's own text
    hideChip(); closeCard(); closePanel(); closeAsk();
    if (fab) fab.remove(); fab = null;
    if (pageTr && pageTr.bar) pageTr.bar.remove();
    if (!stale) { host$.remove(); return; }
    attach();
    layer.innerHTML = '<div class="tbar" role="status"><span>Linger was updated. Reload this page to use it here.</span><button type="button">Reload</button></div>';
    layer.querySelector('button').onclick = () => location.reload();
    setTimeout(() => host$.remove(), 15000);
  }
  if (api) document.addEventListener('linger-retire', () => retire(false));
  // The ✦ Ask Linger button sometimes went missing (a page redrew itself, or an old copy took the layer with it).
  // Check every couple of seconds and put it back if it should be there.
  // When Linger is turned off (or removed) on chrome://extensions, Chrome leaves this script running in tabs that were
  // already open. It used to keep putting the button back, so Linger seemed to switch itself on again. Now it notices
  // the extension is gone and cleans up after itself instead.
  const watchdog = setInterval(() => {
    if (dead) return;
    if (!alive()) { retire(false); return; }
    showFab();
  }, 2000);
  // Why the button isn't showing, for the toolbar menu.
  const askWhy = () => (!aiOK() ? 'ai-off' : !S.assistant ? 'button-off' : S.off ? 'all-off' : offHere() ? 'site-off' : window !== window.top ? 'frame' : fab && fab.isConnected && host$.isConnected ? 'shown' : 'missing');
  // Some sites rebuild the page and drop elements they didn't make (the Ask Linger button vanished): put it back.
  new MutationObserver(() => { if (!dead && !host$.isConnected && layer.childElementCount) attach(); }).observe(document.documentElement, { childList: true });

  // ---------- settings and messages ----------
  function apply() {
    document.documentElement.classList.toggle('linger-big', !!S.bigger);
    document.documentElement.classList.toggle('linger-spread', !!S.spread);
    document.documentElement.classList.toggle('linger-nounder', !S.highlight);
    document.querySelectorAll('.linger-w').forEach((sp) => kbdWord(sp, S.highlight || sp.classList.contains('linger-swapped')));
    if (active()) { scan(document.body); mo.observe(document.body, { childList: true, subtree: true }); }
    else { mo.disconnect(); unwrapAll(); closeCard(); }
    scheduleSwap();
    showFab();
  }
  if (api) {
    chrome.storage.local.get({ off: false, highlight: false, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, handSwipe: true, aiOn: null, aiConsent: '', assistant: true, transLang: '', swap: '' }, (v) => { Object.assign(S, v); apply(); });
    chrome.storage.onChanged.addListener((ch) => {
      if (dead) return;
      const was = active();
      Object.keys(ch).forEach((key) => { if (key in S) S[key] = ch[key].newValue; });
      if (active() !== was || ch.bigger || ch.spread || ch.highlight) apply();
      else if (ch.swap || ch.transLang) scheduleSwap();
      if (ch.assistant || ch.aiOn || ch.aiConsent || ch.paused || ch.off || ch.highlight) showFab();
    });
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (dead) return;
      if (msg.type === 'explain') { explainPage(); reply({ ok: true }); }
      if (msg.type === 'status') reply({ ok: true, words: count, eye: !!(window.__lingerGaze && window.__lingerGaze.on), translated: !!pageTr, ask: askWhy(), version: VERSION });
      if (msg.type === 'page-lang') { pageLang().then((from) => reply({ from, to: pageTarget(from, msg.lang) })); return true; }
      if (msg.type === 'translate-page') { if (window !== window.top) return; translatePage(msg.lang).then(reply); return true; }
    });
  } else apply();

  // Shared with gaze.js (eye tracking), which runs in this same isolated world.
  // Hand gestures (hand.js): the word under a point on the screen, and its card. Works on any word, like
  // double-clicking: an underlined word opens its own card; another word is wrapped the same way first.
  const WCH = /[A-Za-z'’-]/;
  function wordAt(x, y) {
    if (dead || offHere() || pageTr || !document.caretRangeFromPoint) return null;
    const r = document.caretRangeFromPoint(x, y);
    if (!r || !r.startContainer || r.startContainer.nodeType !== 3) return null;
    const node = r.startContainer, text = node.data;
    let i = Math.min(r.startOffset, text.length);
    if (!WCH.test(text[i] || '')) { if (i > 0 && WCH.test(text[i - 1])) i--; else return null; }
    let a = i, b = i + 1;
    while (a > 0 && WCH.test(text[a - 1])) a--;
    while (b < text.length && WCH.test(text[b])) b++;
    while (a < b && /['’-]/.test(text[a])) a++;
    while (b > a && /['’-]/.test(text[b - 1])) b--;
    const word = text.slice(a, b);
    if (!/^[A-Za-z][A-Za-z'’-]{1,30}$/.test(word)) return null;
    const range = document.createRange(); range.setStart(node, a); range.setEnd(node, b);
    const rect = range.getBoundingClientRect();
    if (!rect.width || x < rect.left - 6 || x > rect.right + 6 || y < rect.top - 6 || y > rect.bottom + 6) return null;
    const span = node.parentElement && node.parentElement.closest('.linger-w');
    if (!span && !okParent(node)) return null;
    return { word: span ? (span.dataset.orig || span.textContent) : word, rect, range, span };
  }
  function openWordAt(x, y, why) {
    const hit = wordAt(x, y);
    if (!hit) return false;
    if (hit.span) { openCard(hit.span, why); return hit.span; }
    const sp = document.createElement('span'); sp.className = 'linger-w'; sp.dataset.kind = classify(hit.word, true) || 'common'; sp.dataset.k = keyOf(hit.word);
    try { hit.range.surroundContents(sp); kbdWord(sp, S.highlight); openCard(sp, why); return sp; } catch { return false; }
  }
  window.__lingerAPI = { openCard, closeCard, explainPage, settings: S, keyOf, translatePage, restorePage, alive: () => !dead && alive(), retire, version: VERSION, prefetch, wordAt, openWordAt };
})();

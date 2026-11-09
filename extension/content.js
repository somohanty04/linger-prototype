// Linger content script: underlines hard words on the page, shows a word card on click,
// saves words to the phone app, and explains the page in plain English.
(() => {
  'use strict';
  if (window.__lingerAPI) return;
  const { PLAIN, D, PHRASES, COMMON } = self.LINGER_WORDS;
  const CITIES = window.LINGER_CITIES || {};
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id ? chrome : null;
  const send = (msg) => (api ? chrome.runtime.sendMessage(msg).catch(() => null) : Promise.resolve(null));

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
  const S = { highlight: true, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, handSwipe: true };
  const host = location.hostname || 'file';
  const active = () => S.highlight && !S.paused.includes(host);

  // ---------- styles on the page ----------
  const style = document.createElement('style');
  style.textContent = `
    .linger-w { text-decoration: underline dotted #F2A33A 2px !important; text-underline-offset: 3px !important; cursor: help !important; border-radius: 3px; transition: background .12s; }
    .linger-w:hover, .linger-w.linger-on { background: rgba(255, 217, 138, 0.45) !important; }
    .linger-big .linger-w { font-size: 1.25em !important; padding: 0 2px !important; }
    .linger-spread p, .linger-spread li, .linger-spread dd, .linger-spread td, .linger-spread blockquote { line-height: 2.1 !important; }
    .linger-line { background: rgba(255, 217, 138, 0.28) !important; box-shadow: 0 0 0 3px rgba(255, 190, 70, 0.25) !important; border-radius: 4px; }`;
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
      frag.appendChild(sp); count++;
      last = i + w.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
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
    document.querySelectorAll('.linger-w').forEach((sp) => { const p = sp.parentNode; p.replaceChild(document.createTextNode(sp.textContent), sp); p.normalize(); });
    count = 0;
  }
  // Pages like Gmail keep adding content; underline new parts as they appear.
  let pendingRoots = new Set(), flushT = null;
  const mo = new MutationObserver((list) => {
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
    const text = (block.innerText || block.textContent || '').replace(/\s+/g, ' ');
    const w = sp.textContent;
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
    .btn.primary { border: 1px solid #6D79FF; background: linear-gradient(90deg, #6D79FF, #2B39B2); color: #FFFFFF; }
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
    .wc-lbl { color: #5B6070; font-size: 16px; font-weight: 600; line-height: 22px; }
    .wc-box { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: #F6F7FF; }
    .wc-s { color: #252A39; font-size: 16px; font-weight: 600; font-style: italic; line-height: 22px; overflow-wrap: anywhere; }
    .wc-s b { color: #6D79FF; font-weight: 700; font-style: italic; }
    .wc-local { color: #252A39; font-size: 16px; font-weight: 600; line-height: 22px; }
    .wc-note { color: #5B6070; font-size: 13px; font-weight: 600; line-height: 18px; }
    .wc-note:empty { display: none; }
    .wc-words { display: flex; flex-direction: column; gap: 12px; }
    .wc-msg { color: #FFFFFF; font-size: 20px; font-weight: 600; line-height: 22px; }
    /* Not in the dictionary (Figma node 140:496): red, header only, 20px icons */
    .wc.wc-missing { width: 372px; }
    .wc-missing .wc-top { border-radius: 12px; background: linear-gradient(176.9195deg, rgb(168, 31, 31) 1.4073%, rgb(217, 84, 84) 105.55%); }
    .wc-missing .wc-rings { left: 107.32px; }
    .wc-missing .wc-badge { background: #D82E2E; }
    .wc-missing .wc-icon { width: 20px; height: 20px; }
    .wc-missing .wc-body { display: none; }
    .panel { position: fixed; top: 16px; right: 16px; width: 360px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow-y: auto; background: #FFFFFF; color: #14161F; border-radius: 18px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.3); border: 1px solid #E8E8E8; font-size: 14px; line-height: 1.45; }
    .phead { background: linear-gradient(160deg, #1F2DA8, #5464D9); color: #FFFFFF; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 8px; border-radius: 18px 18px 0 0; }
    .phead strong { font-size: 18px; }
    .phead .x { background: rgba(255, 255, 255, 0.2); color: #FFFFFF; }
    .pbody { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    li { display: flex; gap: 10px; background: #F6F8FF; border: 1px solid #EAEFFF; border-radius: 12px; padding: 10px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border-radius: 99px; padding: 4px 10px; background: #F0FFFA; border: 1px solid #BDE8D7; color: #115940; font-size: 12px; font-weight: 700; }
  </style><div id="layer"></div>`;
  const layer = root.getElementById('layer');
  const attach = () => { if (!host$.isConnected) document.documentElement.appendChild(host$); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const asset = (p) => (api ? chrome.runtime.getURL(p) : p);
  // Figtree (the Linger app font) for the word card; most websites don't have it.
  let fontsAdded = false;
  function addFonts() {
    if (fontsAdded || !document.fonts || typeof FontFace !== 'function') return;
    fontsAdded = true;
    [['fonts/figtree-latin.woff2', 'normal'], ['fonts/figtree-latin-italic.woff2', 'italic']].forEach(([f, style]) => {
      try { const ff = new FontFace('Linger Figtree', `url(${asset(f)})`, { style, weight: '300 900' }); document.fonts.add(ff); ff.load().catch(() => {}); } catch {}
    });
  }
  const speakIt = (t) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u); } catch {} };

  let card = null, cardSpan = null;
  function closeCard() { if (card) card.remove(); card = null; if (cardSpan) cardSpan.classList.remove('linger-on'); cardSpan = null; window.dispatchEvent(new CustomEvent('linger-card-closed')); }
  function place(el, rect) {
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = Math.min(Math.max(8, rect.left), innerWidth - w - 8);
    let y = rect.bottom + 8;
    if (y + h > innerHeight - 8) y = Math.max(8, rect.top - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  // Open the card for an underlined word (or any word picked with a double-click).
  async function openCard(sp, why) {
    attach(); closeCard();
    cardSpan = sp; sp.classList.add('linger-on');
    const raw = sp.textContent, k = keyOf(raw);
    const sl = SLANG[k], d = D[k];
    const kind = sl ? 'slang' : sp.dataset.kind || (PLAIN[k] !== undefined ? 'hard' : 'common');
    let meaning = (sl && sl.meaning) || (d && d.meaning) || (PLAIN[k] ? cap(PLAIN[k]) + '.' : '');
    const sentence = sentenceAround(sp);
    const plain = plainify(sentence);
    addFonts();
    // "In context": a sentence with the word in it (from the page; if the page only has a heading or label, Linger's
    // own example, or the dictionary's), and under it the same sentence with an easier synonym, when there is one.
    const wordRe = new RegExp('\\b' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const locate = (t) => { const m = t ? wordRe.exec(t) || new RegExp('\\b' + k.slice(0, Math.max(4, k.length - 3)) + '\\w*', 'i').exec(t) : null; return m ? { at: m.index, len: m[0].length, word: m[0] } : null; };
    // A real sentence: 4+ words that end like a sentence, or 8+ words (not a heading, menu item or label).
    const usable = (t) => { const n = t ? t.trim().split(/\s+/).length : 0; return !!(t && locate(t) && n >= 4 && (/[.!?…"”’)]\s*$/.test(t.trim()) || n >= 8)); };
    const ctx = { s: '', loc: null, syn: PLAIN[k] || '', fromPage: false };
    const useSentence = (t, fromPage) => { ctx.s = t; ctx.loc = locate(t); ctx.fromPage = fromPage; };
    if (usable(sentence)) useSentence(sentence, true);
    else if (d && usable(d.sentence)) useSentence(d.sentence, false);
    else if (sl && usable(sl.sentence)) useSentence(sl.sentence, false);
    const mark = (w) => { const { at, len } = ctx.loc; return `${esc(ctx.s.slice(0, at))}<b>${esc(w)}</b>${esc(ctx.s.slice(at + len))}`; };
    const asCase = (w) => (/^[A-Z]/.test(ctx.loc.word) ? cap(w) : w);
    function synHtml() {
      if (!ctx.loc || !ctx.syn) return '';
      // Linger's phrase rules first ("remit payment" → "pay"), highlighting what changed; otherwise just the easier
      // word in place of this one.
      const src = ctx.s, { at, len } = ctx.loc;
      let t = src; PHRASES.forEach(([re, r]) => { t = t.replace(re, r); });
      if (/^[A-Z]/.test(src)) t = cap(t);
      let a = 0, b = 0;
      while (a < t.length && a < src.length && t[a] === src[a]) a++;
      while (b < t.length - a && b < src.length - a && t[t.length - 1 - b] === src[src.length - 1 - b]) b++;
      while (a > 0 && /\w/.test(t[a - 1])) a--; // widen to whole words
      while (b > 0 && /\w/.test(t[t.length - b])) b--;
      const mid = t.slice(a, t.length - b), [, lead, changed, trail] = mid.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return t !== src && a <= at && src.length - b >= at + len && changed
        ? `${esc(t.slice(0, a))}${lead}<b>${esc(changed)}</b>${trail}${esc(t.slice(t.length - b))}`
        : mark(asCase(ctx.syn));
    }
    function ctxHtml() {
      const local = sl && sl.local ? `<p class="wc-lbl">Local note (${esc(sl.city)}):</p><p class="wc-local">${esc(sl.local)}</p>` : '';
      const syn = synHtml();
      if (!ctx.loc && !local) return '';
      return `<p class="wc-lbl">In context:</p><div class="wc-box">
          ${ctx.loc ? `<p class="wc-lbl">${ctx.fromPage ? 'This word:' : 'Example:'}</p><p class="wc-s">“${mark(ctx.loc.word)}”</p>` : ''}
          ${syn ? `<p class="wc-lbl">Synonym:</p><p class="wc-s">“${syn}”</p>` : ''}
          ${local}</div>`;
    }
    const redraw = () => { if (!card || cardSpan !== sp) return; const el = card.querySelector('#ctx'); el.innerHTML = ctxHtml(); el.hidden = !el.innerHTML.trim(); place(card, sp.getBoundingClientRect()); };
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
          <div class="wc-words"><p class="wc-word">${esc(raw)}</p></div>
        </div></div>
      <div class="wc-body">
        <p class="wc-meaning" id="m">${meaning ? esc(meaning) : 'Looking up…'}</p>
        <div class="wc-ctx" id="ctx"></div>
        <p class="wc-note" id="note"></p>
      </div>`;
    layer.appendChild(card);
    redraw();
    card.querySelector('#hear').onclick = () => speakIt(raw);
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
    if (api) chrome.storage.local.get({ saved: [] }, (v) => { if (card && cardSpan === sp && v.saved.some((x) => x.key === k)) showSaved(); });
    card.querySelector('#save').onclick = async () => {
      const r = await send({ type: 'save', key: k, word: { w: raw.toLowerCase(), m: meaning, s: sentence, p: plain !== sentence ? plain : '', place: host, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } });
      if (!card || cardSpan !== sp) return;
      showSaved();
      card.querySelector('#note').textContent = r && r.synced ? 'Saved. Sent to the Linger app on your phone.' : r && r.paired === false ? 'Saved here. Connect your phone in the Linger menu to send words there.' : r && r.error ? 'Saved here. Couldn’t reach your phone right now.' : 'Saved.';
    };
    const wantSyn = !ctx.syn && kind !== 'slang';
    const synP = wantSyn ? (api ? send({ type: 'synonyms', word: k }) : directSynonyms(k)) : null;
    let dict = null;
    if (!meaning || !ctx.loc) {
      dict = api ? await send({ type: 'lookup', word: k }) : await directLookup(k);
      if (!meaning && !(dict && dict.meaning)) { showMissing(); return; }
      if (!meaning) meaning = dict.meaning;
      if (card && cardSpan === sp) card.querySelector('#m').textContent = meaning;
      if (!ctx.loc && dict && usable(dict.example)) { useSentence(dict.example, false); redraw(); }
    }
    // Still no sentence: try the dictionary's example for the base word (tenants → tenant), then fall back to the
    // text on the page around the word, even if it's only a heading.
    if (!ctx.loc) {
      for (const base of [...new Set([k.replace(/ies$/, 'y'), k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/ed$/, ''), k.replace(/ed$/, 'e'), k.replace(/ing$/, ''), k.replace(/ing$/, 'e')])].filter((b) => b !== k && b.length > 3)) {
        const e = api ? await send({ type: 'lookup', word: base }) : await directLookup(base);
        if (e && usable(e.example)) { useSentence(e.example, false); break; }
      }
      if (!ctx.loc && locate(sentence)) useSentence(sentence, true);
      redraw();
    }
    // An easier synonym from the thesaurus, checked against the meaning so it's the right sense of the word.
    if (synP) { const w = easier(k, await synP, meaning); if (w) { ctx.syn = w; redraw(); } }
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

  document.addEventListener('click', (e) => {
    if (e.composedPath && e.composedPath().includes(host$)) return;
    const sp = e.target.closest && e.target.closest('.linger-w');
    if (sp) { e.preventDefault(); e.stopPropagation(); openCard(sp); return; }
    if (card) closeCard();
  }, true);
  // Double-click any word (even one that isn't underlined) to look it up.
  document.addEventListener('dblclick', (e) => {
    if (!active() || (e.composedPath && e.composedPath().includes(host$))) return;
    const sel = getSelection(); const w = (sel && sel.toString().trim()) || '';
    if (!/^[A-Za-z][A-Za-z'’-]{1,30}$/.test(w) || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!okParent(r.startContainer)) return;
    const sp = document.createElement('span'); sp.className = 'linger-w'; sp.dataset.kind = classify(w, true) || 'common'; sp.dataset.k = keyOf(w);
    try { r.surroundContents(sp); sel.removeAllRanges(); openCard(sp); } catch {}
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCard(); closePanel(); } });
  window.addEventListener('scroll', () => { if (card && cardSpan) place(card, cardSpan.getBoundingClientRect()); }, { passive: true });

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
      <div class="pbody">${points.length ? `<ul>${points.map(([ic, t]) => `<li><span>${ic}</span><span>${esc(t)}</span></li>`).join('')}</ul>` : '<div>Linger couldn’t find instructions on this page.</div>'}
        ${dates.length ? `<div class="lbl">Key dates and amounts</div><div class="chips">${dates.map((d) => `<span class="chip">${esc(d)}</span>`).join('')}</div>` : ''}
        <div class="row"><button class="btn" id="read">🔊 Read aloud</button></div>
        <div class="note">Made by swapping formal words for plain ones in the important sentences. Select some text first to explain just that part.</div></div>`;
    layer.appendChild(panel);
    panel.querySelector('.x').onclick = closePanel;
    panel.querySelector('#read').onclick = () => speakIt(points.map((p) => p[1]).join(' '));
  }

  // ---------- settings and messages ----------
  function apply() {
    document.documentElement.classList.toggle('linger-big', !!S.bigger);
    document.documentElement.classList.toggle('linger-spread', !!S.spread);
    if (active()) { scan(document.body); mo.observe(document.body, { childList: true, subtree: true }); }
    else { mo.disconnect(); unwrapAll(); closeCard(); }
  }
  if (api) {
    chrome.storage.local.get({ highlight: true, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, handSwipe: true }, (v) => { Object.assign(S, v); apply(); });
    chrome.storage.onChanged.addListener((ch) => {
      const was = active();
      Object.keys(ch).forEach((key) => { if (key in S) S[key] = ch[key].newValue; });
      if (active() !== was || ch.bigger || ch.spread) apply();
    });
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg.type === 'explain') { explainPage(); reply({ ok: true }); }
      if (msg.type === 'status') reply({ ok: true, words: count, eye: !!(window.__lingerGaze && window.__lingerGaze.on) });
    });
  } else apply();

  // Shared with gaze.js (eye tracking), which runs in this same isolated world.
  window.__lingerAPI = { openCard, closeCard, explainPage, settings: S, keyOf };
})();

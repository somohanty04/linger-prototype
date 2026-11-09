// Linger content script: underlines hard words on the page, shows a word card on click,
// saves words to the phone app, and explains the page in plain English.
(() => {
  'use strict';
  if (window.__lingerAPI) return;
  const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id ? chrome : null;
  // test.html runs its own copy of Linger. If the extension is also installed, let the page's copy
  // handle that page so you don't get two cards for one click.
  if (api && document.documentElement.dataset.lingerPage) return;
  if (!api) document.documentElement.dataset.lingerPage = '1';
  const { PLAIN, D, PHRASES, COMMON } = self.LINGER_WORDS;
  const CITIES = window.LINGER_CITIES || {};
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
  const S = { highlight: true, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, inlineLang: 'easy' };
  const host = self.LINGER_PLACE || location.hostname || 'file';
  const active = () => S.highlight && !S.paused.includes(host);

  // ---------- styles on the page ----------
  const style = document.createElement('style');
  style.textContent = `
    .linger-w { text-decoration: underline dotted #F2A33A 2px !important; text-underline-offset: 3px !important; cursor: help !important; border-radius: 3px; transition: background .12s; }
    .linger-w:hover, .linger-w.linger-on { background: rgba(255, 217, 138, 0.45) !important; }
    .linger-big .linger-w { font-size: 1.25em !important; padding: 0 2px !important; }
    .linger-spread p, .linger-spread li, .linger-spread dd, .linger-spread td, .linger-spread blockquote { line-height: 2.1 !important; }
    .linger-line { background: rgba(255, 217, 138, 0.28) !important; box-shadow: 0 0 0 3px rgba(255, 190, 70, 0.25) !important; border-radius: 4px; }
    .linger-chip { display: inline-block !important; font: 700 12px/1.3 system-ui, -apple-system, 'Segoe UI', sans-serif !important; color: #FFFFFF !important; background: #2E50D8 !important; border-radius: 99px !important; padding: 2px 8px !important; margin: 0 4px !important; vertical-align: 1px !important; cursor: pointer !important; white-space: nowrap !important; text-decoration: none !important; font-style: normal !important; letter-spacing: 0 !important; }`;
  (document.head || document.documentElement).appendChild(style);

  // ---------- underlining ----------
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'CANVAS', 'IFRAME', 'BUTTON', 'KBD', 'SAMP', 'MATH', 'HEAD', 'TITLE', 'A', 'LABEL']);
  const MAX = 900;
  let count = 0;
  function okParent(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (SKIP.has(el.tagName) || el.isContentEditable || el.id === 'linger-ui' || el.classList.contains('linger-w') || el.classList.contains('linger-chip')) return false;
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
    for (const r of list) r.addedNodes.forEach((nd) => { if (nd.nodeType === 1 && nd.id !== 'linger-ui' && !nd.classList.contains('linger-w') && !nd.classList.contains('linger-chip')) pendingRoots.add(nd); else if (nd.nodeType === 3 && nd.parentElement) pendingRoots.add(nd.parentElement); });
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
    .card { position: fixed; width: 320px; max-width: calc(100vw - 16px); background: #FFFFFF; color: #14161F; border-radius: 16px; padding: 14px 16px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.28); border: 1px solid #E8E8E8; font-size: 14px; line-height: 1.45; display: flex; flex-direction: column; gap: 8px; max-height: calc(100vh - 16px); overflow-y: auto; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .word { font-size: 24px; font-weight: 800; color: #1F2AA8; line-height: 1.15; }
    .say { font-size: 12px; font-weight: 700; color: #0B7A86; background: #DDF4F5; border-radius: 99px; padding: 2px 8px; align-self: flex-start; }
    .badge { font-size: 11px; font-weight: 700; color: #FFFFFF; background: #2E50D8; border-radius: 4px; padding: 3px 8px; white-space: nowrap; }
    .badge.slang { background: #44C9E6; } .badge.common { background: #EEF0F5; color: #4A4F5E; }
    .x { border: 0; background: #EAEFFF; color: #1F2AA8; width: 28px; height: 28px; border-radius: 50%; font-size: 14px; cursor: pointer; flex: none; }
    .meaning { font-size: 16px; font-weight: 600; }
    .lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5B6070; }
    .ctx { background: #F6F8FF; border-radius: 10px; padding: 8px 10px; color: #252A39; }
    .orig { font-style: italic; color: #5B6070; font-size: 13px; }
    .local { background: #EAEFFF; border-radius: 10px; padding: 8px 10px; color: #1F2AA8; font-size: 13px; }
    .row { display: flex; gap: 8px; margin-top: 2px; }
    .btn { flex: 1; height: 40px; border-radius: 99px; border: 1px solid #B1B7FF; background: #FFFFFF; color: #1F2AA8; font-weight: 700; font-size: 14px; cursor: pointer; }
    .btn.primary { border: 1px solid #6D79FF; background: linear-gradient(90deg, #6D79FF, #2B39B2); color: #FFFFFF; }
    .btn.done { background: #F0FFFA; color: #115940; border-color: #BDE8D7; }
    .note { font-size: 12px; color: #5B6070; }
    .why { font-size: 12px; font-weight: 700; color: #8A5A00; background: #FFF6E3; border-radius: 8px; padding: 4px 8px; align-self: flex-start; }
    .panel { position: fixed; top: 16px; right: 16px; width: 360px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow-y: auto; background: #FFFFFF; color: #14161F; border-radius: 18px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.3); border: 1px solid #E8E8E8; font-size: 14px; line-height: 1.45; }
    .phead { background: linear-gradient(160deg, #1F2DA8, #5464D9); color: #FFFFFF; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 8px; border-radius: 18px 18px 0 0; }
    .phead strong { font-size: 18px; }
    .phead .x { background: rgba(255, 255, 255, 0.2); color: #FFFFFF; }
    .pbody { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    li { display: flex; gap: 10px; background: #F6F8FF; border: 1px solid #EAEFFF; border-radius: 12px; padding: 10px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border-radius: 99px; padding: 4px 10px; background: #F0FFFA; border: 1px solid #BDE8D7; color: #115940; font-size: 12px; font-weight: 700; }
    .word.long { font-size: 17px; font-weight: 700; line-height: 1.3; }
    .wait { color: #5B6070; font-weight: 500; font-style: italic; }
    .chip.soft { background: #F6F8FF; border-color: #EAEFFF; color: #252A39; }
    ul.parts { display: block; list-style: disc; padding-left: 18px; }
    .parts li { display: list-item; background: none; border: 0; border-radius: 0; padding: 0; margin: 0 0 4px; font-size: 13px; color: #252A39; }
    mark { background: #FFD98A; color: inherit; border-radius: 3px; padding: 0 2px; font-style: normal; }
    .btn.hear { flex: 0 0 44px; }
    .pill { position: fixed; border: 0; border-radius: 99px; padding: 7px 12px; background: linear-gradient(90deg, #6D79FF, #2B39B2); color: #FFFFFF; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(16, 20, 80, 0.3); }
    .pill:focus-visible, .btn:focus-visible, .chip:focus-visible { outline: 2px solid #2E50D8; outline-offset: 2px; }
    .scope { font-size: 12px; color: #5B6070; }
    .link { border: 0; background: none; padding: 0; color: #2E50D8; font-weight: 700; text-decoration: underline; cursor: pointer; font-size: 12px; }
    .chat { display: flex; flex-direction: column; gap: 8px; }
    .chat:empty { display: none; }
    .msg { padding: 8px 11px; border-radius: 12px; max-width: 90%; white-space: pre-wrap; }
    .msg.me { align-self: flex-end; background: #2E50D8; color: #FFFFFF; }
    .msg.ai { align-self: flex-start; background: #F6F8FF; border: 1px solid #EAEFFF; }
    .msg.wait { color: #5B6070; font-style: italic; }
    .ask { display: flex; gap: 6px; }
    .ask input { flex: 1; min-width: 0; height: 36px; border: 1px solid #B1B7FF; border-radius: 99px; padding: 0 12px; font-size: 14px; }
    .ask-s { cursor: pointer; background: #F6F8FF; border-color: #EAEFFF; color: #1F2AA8; }
    .btn.small { flex: none; height: 36px; padding: 0 14px; }
    /* Word card (Figma: Linger – App Design System, node 140:523) */
    .card { width: 340px; padding: 0; gap: 0; border-radius: 12px; border: 1px solid #E1E4F2; overflow-x: hidden; }
    .ch { position: relative; overflow: hidden; background: linear-gradient(160deg, #1F2DA8, #5464D9); color: #FFFFFF; padding: 12px 12px 16px 16px; display: flex; flex-direction: column; gap: 6px; flex: none; }
    .ch .ring { position: absolute; right: -50px; top: -64px; width: 160px; height: 160px; border-radius: 50%; border: 16px solid rgba(68, 201, 230, 0.25); pointer-events: none; }
    .ch .ring2 { position: absolute; right: -8px; top: -24px; width: 70px; height: 70px; border-radius: 50%; background: rgba(68, 201, 230, 0.2); pointer-events: none; }
    .ch > * { position: relative; }
    .ch-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ch .badge { background: #2E50D8; color: #FFFFFF; font-size: 13px; font-weight: 600; border-radius: 4px; padding: 3px 8px; }
    .ch .icons { display: flex; gap: 2px; }
    .ch .ib { width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: #FFFFFF; display: grid; place-items: center; cursor: pointer; }
    .ch .ib:hover { background: rgba(255, 255, 255, 0.16); }
    .ch .ib:disabled { cursor: default; }
    .ch .ib[aria-pressed="true"] svg { fill: currentColor; }
    .ch .ib:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 1px; }
    .ch .word { font-size: 30px; font-weight: 800; color: #FFFFFF; line-height: 1.15; letter-spacing: -0.01em; overflow-wrap: anywhere; }
    .ch .word.long { font-size: 18px; font-weight: 700; line-height: 1.3; letter-spacing: 0; }
    .ch .say { font-size: 13px; color: #E0E6FF; }
    .ch .why { background: rgba(255, 255, 255, 0.16); color: #FFFFFF; }
    .cb { padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 8px; background: #FFFFFF; }
    .cb .meaning { font-size: 17px; font-weight: 500; color: #14161F; line-height: 1.35; }
    .cb .lbl { font-size: 14px; font-weight: 400; letter-spacing: 0; text-transform: none; color: #5B6070; }
    .ctxbox { background: #F4F5FC; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
    .ctxbox .cl { font-size: 14px; color: #5B6070; }
    .ctxbox .q { font-style: italic; font-weight: 500; color: #252A39; font-size: 15px; line-height: 1.45; margin-bottom: 6px; }
    .ctxbox .q.plain { font-style: normal; }
    .ctxbox mark { background: none; color: #6D79FF; font-weight: 700; padding: 0; }
    .ctxbox > div:last-child .q, .ctxbox > .q:last-child { margin-bottom: 0; }
    .cb .tr { font-size: 16px; font-weight: 600; color: #1F2AA8; }
    .ask-link { align-self: flex-start; font-size: 13px; }
  </style><div id="layer"></div>`;
  const layer = root.getElementById('layer');
  const attach = () => { if (!host$.isConnected) document.documentElement.appendChild(host$); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const speakIt = (t) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u); } catch {} };

  let card = null, cardSpan = null, cardAnchor = null;
  function closeCard() { if (card) card.remove(); card = null; cardAnchor = null; if (cardSpan) cardSpan.classList.remove('linger-on'); cardSpan = null; window.dispatchEvent(new CustomEvent('linger-card-closed')); }
  function place(el, rect) {
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = Math.min(Math.max(8, rect.left), innerWidth - w - 8);
    let y = rect.bottom + 8;
    if (y + h > innerHeight - 8) y = Math.max(8, rect.top - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }

  // ---------- AI and lookups ----------
  const LANGS = { es: 'Spanish', 'zh-CN': 'Chinese (Simplified)', hi: 'Hindi', ar: 'Arabic', fr: 'French', pt: 'Portuguese', ko: 'Korean', vi: 'Vietnamese' };
  const localGet = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  // In the extension these go through the background worker; on the test page (no extension) they run here.
  async function ai(type, data) {
    if (api) return send({ type, ...data });
    if (type === 'lookup') return { meaning: await directLookup(data.word) };
    const L = self.LingerAI;
    if (!L) return null;
    try {
      const key = localGet('linger-ai-key', '');
      if (type === 'ai-explain') return await L.explain({ ...data, key });
      if (type === 'ai-ask') return await L.ask({ ...data, key });
      if (type === 'synonyms') return { list: await L.synonyms(data.word) };
      if (type === 'translate') return { text: await L.translate(data.text, data.lang) };
    } catch (e) { return { error: String(e.message || e) }; }
    return null;
  }

  // ---------- where a selection sits ----------
  const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const blockOf = (node) => { const el = node.nodeType === 1 ? node : node.parentElement; return (el && el.closest('p, li, td, th, dd, dt, blockquote, h1, h2, h3, h4, h5, h6, figcaption, article, section, div')) || el || document.body; };
  const textOf = (el) => squash(el.innerText || el.textContent);
  function sentenceFor(node, text) {
    const t = squash(text);
    const s = sentencesOf(textOf(blockOf(node))).find((x) => x.includes(t));
    if (!s) return t;
    return s.length > 300 ? s.slice(Math.max(0, s.indexOf(t) - 140), s.indexOf(t) + t.length + 140).trim() + '…' : s;
  }
  const paragraphFor = (node) => textOf(blockOf(node)).slice(0, 1500);
  const markIn = (sentence, text) => {
    const i = sentence.toLowerCase().indexOf(text.toLowerCase());
    if (i < 0) return esc(sentence);
    return esc(sentence.slice(0, i)) + '<mark>' + esc(sentence.slice(i, i + text.length)) + '</mark>' + esc(sentence.slice(i + text.length));
  };
  const swapIn = (sentence, text, syn) => {
    const i = sentence.toLowerCase().indexOf(text.toLowerCase());
    if (i < 0) return esc(sentence);
    const fit = /^[A-Z]/.test(sentence.slice(i, i + 1)) ? cap(syn) : syn;
    return esc(sentence.slice(0, i)) + '<mark>' + esc(fit) + '</mark>' + esc(sentence.slice(i + text.length));
  };
  const svg = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = { speaker: svg('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'), bookmark: svg('<path d="M6 3h12v18l-6-4.5L6 21z"/>'), close: svg('<path d="M6 6l12 12M18 6 6 18"/>') };
  const kindOf = (text) => { const n = squash(text).split(' ').length; return n === 1 ? 'word' : n <= 6 && !/[.!?]["”]?$/.test(text.trim()) ? 'phrase' : 'sentence'; };
  const inUI = (node) => { for (let el = node.nodeType === 1 ? node : node.parentElement; el; el = el.parentElement) { if (el.id === 'linger-ui' || el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true; } return false; };

  // Without AI: Linger's word list, Wiktionary, and Datamuse synonyms (most common first, so the easiest come first).
  async function basicExplain(text, kind, sentence) {
    const k = keyOf(text);
    if (kind === 'word') {
      const sl = SLANG[k], d = D[k];
      let meaning = (sl && sl.meaning) || (d && d.meaning) || (PLAIN[k] ? cap(PLAIN[k]) + '.' : '');
      const [syn, look] = await Promise.all([ai('synonyms', { word: k }), meaning ? null : ai('lookup', { word: k })]);
      if (!meaning) meaning = (look && look.meaning) || 'Not in the dictionary yet.';
      const rest = [...new Set(((syn && syn.list) || []).filter((w) => w && w !== k && w !== PLAIN[k]))];
      rest.sort((a, b) => (RANK.get(a) ?? 99999) - (RANK.get(b) ?? 99999));
      const plain = plainify(sentence);
      return { meaning, synonyms: [PLAIN[k], ...rest].filter(Boolean).slice(0, 5), plain: plain !== sentence ? plain : '', parts: [] };
    }
    const plain = plainify(text);
    const parts = [...new Set((text.match(WORD_RE) || []).map(keyOf))].filter((w) => PLAIN[w]).slice(0, 5).map((w) => `${w} = ${PLAIN[w]}`);
    let meaning = plain.toLowerCase() !== squash(text).toLowerCase() ? plain : '';
    if (!meaning && kind === 'phrase') { const look = await ai('lookup', { word: squash(text).toLowerCase() }); const m = look && look.meaning; if (m && !/^(not in the dictionary|couldn)/i.test(m)) meaning = m; }
    return { meaning: meaning || 'Linger’s word list has no simpler version of this yet.', synonyms: [], plain: '', parts, partsLabel: 'Hard words in it' };
  }

  // The easier word (or translation) shown right beside the word on the page.
  function addChip(sp, text) {
    const next = sp.nextSibling;
    if (next && next.nodeType === 1 && next.classList.contains('linger-chip')) { next.textContent = text; return; }
    const ch = document.createElement('span');
    ch.className = 'linger-chip'; ch.textContent = text; ch.title = 'Linger · click to hide';
    sp.after(ch);
  }
  function localSave(key, word) {
    try {
      const list = JSON.parse(localStorage.getItem('linger-saved') || '[]');
      localStorage.setItem('linger-saved', JSON.stringify([{ key, ...word, at: Date.now() }, ...list.filter((x) => x.key !== key)].slice(0, 200)));
    } catch {}
    window.dispatchEvent(new CustomEvent('linger-saved'));
    return { ok: true, local: true };
  }

  // ---------- the card: a word, a phrase or a whole sentence ----------
  async function showCard(o) {
    attach(); closeCard(); hidePill();
    const text = squash(o.text), kind = o.kind, sentence = o.sentence;
    if (o.sp) { cardSpan = o.sp; o.sp.classList.add('linger-on'); }
    cardAnchor = o.anchor;
    const k = keyOf(text), sl = kind === 'word' ? SLANG[k] : null;
    const label = sl ? 'Local slang' : kind === 'sentence' ? 'Sentence' : kind === 'phrase' ? 'Phrase' : o.hard ? 'Hard word' : 'Word';
    const shown = text.length > 70 ? text.slice(0, 67) + '…' : text;
    const c = card = document.createElement('div');
    c.className = 'card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Linger: ' + shown);
    const badge = sl ? 'Local slang' : kind === 'sentence' ? 'Sentence' : kind === 'phrase' ? 'Phrase' : o.hard ? 'Hard Word' : 'Word';
    c.innerHTML = `<div class="ch"><span class="ring" aria-hidden="true"></span><span class="ring2" aria-hidden="true"></span>
        ${o.why ? `<div class="why">👁 ${esc(o.why)}</div>` : ''}
        <div class="ch-top"><span class="badge">${badge}</span><span class="icons">
          <button class="ib" id="hear" aria-label="Hear it" title="Hear it">${ICON.speaker}</button>
          <button class="ib" id="save" aria-label="Save to Linger" title="Save to Linger" aria-pressed="false" disabled>${ICON.bookmark}</button>
          <button class="ib x" aria-label="Close" title="Close">${ICON.close}</button></span></div>
        <div class="word${kind !== 'word' ? ' long' : ''}">${esc(shown)}</div>${sl && sl.say ? `<div class="say">/${esc(sl.say)}/</div>` : ''}</div>
      <div class="cb">
        <div class="meaning" id="m"><span class="wait">Thinking…</span></div>
        <div id="trBox" hidden><div class="lbl" id="trLbl"></div><div class="tr" id="tr"></div></div>
        <div class="lbl">In context:</div>
        <div class="ctxbox">
          <div class="cl">${kind === 'sentence' ? 'This sentence:' : kind === 'phrase' ? 'This phrase:' : 'This word:'}</div>
          <div class="q">“${kind === 'sentence' ? esc(sentence) : markIn(sentence, text)}”</div>
          <div id="swapBox" hidden><div class="cl" id="swapLbl">Synonym:</div><div class="q" id="swap"></div></div>
          <div id="plainBox" hidden><div class="cl">In plain English:</div><div class="q plain" id="plain"></div></div>
        </div>
        <div id="synBox" hidden><div class="lbl">Other easier words:</div><div class="chips" id="syn"></div></div>
        <div id="partsBox" hidden><div class="lbl" id="partsLbl">How it’s put together:</div><ul class="parts" id="parts"></ul></div>
        ${sl && sl.local ? `<div class="local">📍 ${esc(sl.city)}: ${esc(sl.local)}</div>` : ''}
        <button class="link ask-link" id="ask">✦ Ask Linger about this</button>
        <div class="note" id="note"></div>
      </div>`;
    layer.appendChild(c);
    place(c, cardAnchor());
    const $ = (id) => c.querySelector('#' + id);
    c.querySelector('.x').onclick = closeCard;
    $('hear').onclick = () => speakIt(kind === 'word' ? `${text}. ${sentence}` : text);
    $('ask').onclick = () => openAsk(text);

    const lang = S.inlineLang && S.inlineLang !== 'easy' ? S.inlineLang : '';
    const r = await ai('ai-explain', { text, kind, sentence, paragraph: o.paragraph, lang: lang ? LANGS[lang] : '' });
    if (card !== c) return;
    let res, note = '';
    if (r && r.meaning) res = r;
    else {
      note = r && r.noKey ? self.LINGER_NO_AI_NOTE || 'Add an AI key under ✦ AI explanations in the Linger menu to get the meaning in context and how sentences are built.' : r && r.error ? 'AI isn’t reachable right now, so this comes from Linger’s word list.' : '';
      res = await basicExplain(text, kind, sentence);
      if (card !== c) return;
    }
    if (lang && !res.translation) { const t = await ai('translate', { text, lang }); res.translation = t && t.text; if (card !== c) return; }
    $('m').textContent = res.meaning;
    if (res.translation) { $('trBox').hidden = false; $('trLbl').textContent = LANGS[lang] || 'Translation'; $('tr').textContent = res.translation; }
    const syns = (res.synonyms || []).filter(Boolean).slice(0, 5);
    const plain = res.plain && squash(res.plain) !== squash(res.meaning) && squash(res.plain) !== squash(sentence) ? res.plain : '';
    // Like the design: the same sentence again, with the easier word in place of the hard one.
    const swapWith = kind !== 'sentence' && syns[0];
    if (swapWith) { $('swapBox').hidden = false; $('swap').innerHTML = '“' + swapIn(sentence, text, swapWith) + '”'; }
    if (plain) { $('plainBox').hidden = false; $('plain').textContent = plain; }
    const more = swapWith ? syns.slice(1) : syns;
    if (more.length) { $('synBox').hidden = false; $('syn').innerHTML = more.map((x) => `<span class="chip soft">${esc(x)}</span>`).join(''); }
    if (res.parts && res.parts.length) { $('partsBox').hidden = false; if (res.partsLabel) $('partsLbl').textContent = res.partsLabel + ':'; $('parts').innerHTML = res.parts.map((x) => `<li>${esc(x)}</li>`).join(''); }
    if (note) $('note').textContent = note;
    place(c, cardAnchor());
    const beside = lang ? res.translation : syns[0];
    if (o.sp && beside) addChip(o.sp, beside);

    const save = $('save'); save.disabled = false;
    save.onclick = async () => {
      const key = kind === 'word' ? k : text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      const word = { w: kind === 'word' ? text.toLowerCase() : text, kind, m: res.meaning, syn: syns.join(', '), s: sentence, p: res.plain || '', place: host, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      const rr = api ? await send({ type: 'save', key, word }) : localSave(key, word);
      save.setAttribute('aria-pressed', 'true'); save.setAttribute('aria-label', 'Saved'); save.title = 'Saved'; save.disabled = true;
      $('note').textContent = rr && rr.synced ? 'Sent to the Linger app on your phone.' : rr && rr.paired === false ? 'Saved here. Connect your phone in the Linger menu to send words there.' : rr && rr.error ? 'Saved here. Couldn’t reach your phone right now.' : rr && rr.local ? 'Saved in Saved Words.' : 'Saved.';
    };
  }
  // Open the card for an underlined word (or any word picked with a double-click). Eye tracking calls this too.
  function openCard(sp, why) {
    const text = sp.textContent;
    return showCard({ text, kind: 'word', sp, why, hard: sp.dataset.kind === 'hard' || sp.dataset.kind === 'slang', sentence: sentenceFor(sp, text), paragraph: paragraphFor(sp), anchor: () => sp.getBoundingClientRect() });
  }
  // Without the extension (test pages), look words up directly.
  async function directLookup(k) {
    try {
      const r = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(k));
      const j = r.ok ? await r.json() : null;
      const defs = ((j && j.en) || []).flatMap((x) => x.definitions || []).map((d) => d.definition.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      return cap(defs.find((t) => t.length <= 140) || defs[0] || 'Not in the dictionary yet.');
    } catch { return 'Couldn’t look this word up right now.'; }
  }

  // ---------- highlighting with the mouse ----------
  // Select any word, phrase or sentence with the mouse and its card opens right away.
  let pill = null, pillRange = null;
  function hidePill() { if (pill) pill.remove(); pill = null; }
  function showPill(range) {
    attach(); hidePill(); pillRange = range.cloneRange();
    pill = document.createElement('button');
    pill.className = 'pill'; pill.type = 'button'; pill.textContent = '✦ Explain';
    layer.appendChild(pill);
    const r = range.getBoundingClientRect();
    pill.style.left = Math.min(Math.max(8, r.left + r.width / 2 - pill.offsetWidth / 2), innerWidth - pill.offsetWidth - 8) + 'px';
    pill.style.top = (r.top - pill.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - pill.offsetHeight - 8) + 'px';
    pill.onmousedown = (e) => e.preventDefault(); // keep the selection
    pill.onclick = () => explainRange(pillRange);
  }
  // A single word gets wrapped (so the easier word can sit beside it); longer selections are explained as they are.
  function wrapWord(range) {
    for (const n of [range.startContainer, range.endContainer, range.commonAncestorContainer]) {
      const el = n.nodeType === 1 ? n : n.parentElement;
      const w = el && el.closest('.linger-w');
      if (w) return w;
    }
    const r = range.cloneRange();
    if (r.startContainer === r.endContainer && r.startContainer.nodeType === 3) {
      const t = r.startContainer.nodeValue; let s = r.startOffset, e = r.endOffset;
      while (s < e && /\s/.test(t[s])) s++;
      while (e > s && /[\s.,;:!?"”)]/.test(t[e - 1])) e--;
      r.setStart(r.startContainer, s); r.setEnd(r.startContainer, e);
    }
    try {
      const sp = document.createElement('span');
      sp.className = 'linger-w'; sp.dataset.k = keyOf(r.toString()); sp.dataset.kind = classify(r.toString(), true) || 'common';
      r.surroundContents(sp);
      return sp;
    } catch { return null; }
  }
  function explainRange(range) {
    const text = squash(range.toString());
    const kind = kindOf(text);
    if (kind === 'word') {
      const sp = wrapWord(range);
      if (sp) { getSelection().removeAllRanges(); return openCard(sp); }
    }
    const fixed = range.cloneRange();
    getSelection().removeAllRanges();
    return showCard({ text, kind, sentence: kind === 'sentence' ? text : sentenceFor(fixed.startContainer, text), paragraph: paragraphFor(fixed.startContainer), anchor: () => fixed.getBoundingClientRect() });
  }
  document.addEventListener('mouseup', (e) => {
    if (!active() || e.button !== 0 || e.detail > 1 || (e.composedPath && e.composedPath().includes(host$))) return;
    setTimeout(() => {
      const sel = getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (!text || text.length > 800 || !/[A-Za-z]{2,}/.test(text) || !sel.rangeCount) return hidePill();
      const range = sel.getRangeAt(0);
      if (inUI(range.startContainer) || inUI(range.endContainer)) return;
      explainRange(range.cloneRange());
    }, 10);
  });
  document.addEventListener('mousedown', (e) => { if (!(e.composedPath && e.composedPath().includes(host$))) hidePill(); }, true);

  document.addEventListener('click', (e) => {
    if (e.composedPath && e.composedPath().includes(host$)) return;
    const chip = e.target.closest && e.target.closest('.linger-chip');
    if (chip) { e.preventDefault(); e.stopPropagation(); chip.remove(); return; }
    const sp = e.target.closest && e.target.closest('.linger-w');
    if (sp && !String(getSelection() || '').trim()) { e.preventDefault(); e.stopPropagation(); openCard(sp); return; }
    if (card) closeCard();
  }, true);
  // Double-click any word (even one that isn't underlined) to look it up.
  document.addEventListener('dblclick', (e) => {
    if (!active() || (e.composedPath && e.composedPath().includes(host$))) return;
    const sel = getSelection(); const w = (sel && sel.toString().trim()) || '';
    if (!/^[A-Za-z][A-Za-z'’-]{1,30}$/.test(w) || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (inUI(r.startContainer)) return;
    const sp = wrapWord(r);
    if (sp) { sel.removeAllRanges(); openCard(sp); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCard(); closePanel(); hidePill(); } });
  window.addEventListener('scroll', () => { if (card && cardAnchor) place(card, cardAnchor()); hidePill(); }, { passive: true });

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

  // ---------- Ask Linger: open questions about a passage or the whole page ----------
  function openAsk(about) {
    attach(); closeCard(); closePanel(); hidePill();
    const main = document.querySelector('main, article, [role="main"]') || document.body;
    const pageText = textOf(main).slice(0, 12000);
    let scope = about ? squash(about) : '';
    const history = [];
    const p = panel = document.createElement('div');
    p.className = 'panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Ask Linger');
    p.innerHTML = `<div class="phead"><strong>✦ Ask Linger</strong><button class="x" aria-label="Close">✕</button></div>
      <div class="pbody"><div class="scope" id="scope"></div><div class="chat" id="chat"></div><div class="chips" id="sugg"></div>
        <form class="ask" id="f"><input id="q" placeholder="Ask anything about this text…" autocomplete="off"><button class="btn primary small" type="submit">Ask</button></form></div>`;
    layer.appendChild(p);
    const $ = (id) => p.querySelector('#' + id);
    const drawSugg = () => {
      const qs = scope ? ['What does this mean here?', 'Say it more simply', 'Why did the writer say this?'] : ['What is this page about?', 'What do I need to do?', 'Explain the hardest part'];
      $('sugg').innerHTML = qs.map((q) => `<button class="chip ask-s" type="button">${q}</button>`).join('');
      $('sugg').querySelectorAll('button').forEach((b) => { b.onclick = () => askQ(b.textContent); });
    };
    const drawScope = () => {
      $('scope').innerHTML = scope ? `About: <b>“${esc(scope.length > 90 ? scope.slice(0, 87) + '…' : scope)}”</b> · <button class="link" id="whole" type="button">ask about the whole page</button>` : 'About: <b>this whole page</b>';
      const w = $('whole'); if (w) w.onclick = () => { scope = ''; drawScope(); drawSugg(); };
    };
    const add = (who, text) => { const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text; $('chat').appendChild(d); p.scrollTop = p.scrollHeight; return d; };
    async function askQ(q) {
      q = q.trim(); if (!q) return;
      add('me', q);
      const t = add('ai wait', 'Thinking…');
      const context = scope ? `The reader selected this part:\n"${scope}"\n\nThe whole page:\n${pageText}` : pageText;
      const r = await ai('ai-ask', { question: q, context, history: history.slice(-6) });
      t.classList.remove('wait');
      if (r && r.answer) { t.textContent = r.answer; history.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer }); }
      else t.textContent = r && r.noKey ? 'Ask Linger needs AI turned on. Open the Linger menu and add a key under ✦ AI explanations.' : 'Couldn’t reach the AI right now. Check your internet connection and try again.';
      p.scrollTop = p.scrollHeight;
    }
    drawScope(); drawSugg();
    p.querySelector('.x').onclick = closePanel;
    $('f').onsubmit = (e) => { e.preventDefault(); const v = $('q').value; $('q').value = ''; askQ(v); };
    ['keydown', 'keyup', 'keypress'].forEach((t) => $('q').addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
    $('q').focus();
  }

  // ---------- settings and messages ----------
  function apply() {
    document.documentElement.classList.toggle('linger-big', !!S.bigger);
    document.documentElement.classList.toggle('linger-spread', !!S.spread);
    if (active()) { scan(document.body); mo.observe(document.body, { childList: true, subtree: true }); }
    else { mo.disconnect(); unwrapAll(); closeCard(); }
  }
  if (api) {
    chrome.storage.local.get({ highlight: true, paused: [], bigger: false, pauseSecs: 3, showGaze: true, spread: false, inlineLang: 'easy' }, (v) => { Object.assign(S, v); apply(); });
    chrome.storage.onChanged.addListener((ch) => {
      const was = active();
      Object.keys(ch).forEach((key) => { if (key in S) S[key] = ch[key].newValue; });
      if (active() !== was || ch.bigger || ch.spread) apply();
    });
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg.type === 'explain') { explainPage(); reply({ ok: true }); }
      if (msg.type === 'ask') { openAsk(); reply({ ok: true }); }
      if (msg.type === 'status') reply({ ok: true, words: count, eye: !!(window.__lingerGaze && window.__lingerGaze.on) });
    });
  } else { S.inlineLang = localGet('linger-inline-lang', 'easy'); apply(); }

  // Shared with gaze.js (eye tracking), which runs in this same isolated world.
  window.__lingerAPI = { openCard, closeCard, explainPage, openAsk, showCard, settings: S, keyOf };
})();

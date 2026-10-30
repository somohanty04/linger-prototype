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
  const S = { highlight: true, paused: [], bigger: false, pauseSecs: 3 };
  const host = location.hostname || 'file';
  const active = () => S.highlight && !S.paused.includes(host);

  // ---------- styles on the page ----------
  const style = document.createElement('style');
  style.textContent = `
    .linger-w { text-decoration: underline dotted #F2A33A 2px !important; text-underline-offset: 3px !important; cursor: help !important; border-radius: 3px; transition: background .12s; }
    .linger-w:hover, .linger-w.linger-on { background: rgba(255, 217, 138, 0.45) !important; }
    .linger-big .linger-w { font-size: 1.25em !important; padding: 0 2px !important; }
    .linger-line { background: rgba(255, 217, 138, 0.28) !important; box-shadow: 0 0 0 3px rgba(255, 190, 70, 0.25) !important; border-radius: 4px; }`;
  (document.head || document.documentElement).appendChild(style);

  // ---------- underlining ----------
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'CANVAS', 'IFRAME', 'BUTTON', 'KBD', 'SAMP', 'MATH', 'HEAD', 'TITLE', 'A', 'LABEL']);
  const MAX = 900;
  let count = 0;
  function okParent(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (SKIP.has(el.tagName) || el.isContentEditable || el.id === 'linger-ui' || el.classList.contains('linger-w')) return false;
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
    .card { position: fixed; width: 320px; max-width: calc(100vw - 16px); background: #FFFFFF; color: #14161F; border-radius: 16px; padding: 14px 16px; box-shadow: 0 14px 40px rgba(16, 20, 80, 0.28); border: 1px solid #E8E8E8; font-size: 14px; line-height: 1.45; display: flex; flex-direction: column; gap: 8px; }
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
  </style><div id="layer"></div>`;
  const layer = root.getElementById('layer');
  const attach = () => { if (!host$.isConnected) document.documentElement.appendChild(host$); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    card = document.createElement('div');
    card.className = 'card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Meaning of ' + raw);
    card.innerHTML = `${why ? `<div class="why">👁 ${esc(why)}</div>` : ''}
      <div class="head"><div style="display:flex;flex-direction:column;gap:4px"><span class="word">${esc(raw)}</span>${sl && sl.say ? `<span class="say">/${esc(sl.say)}/</span>` : ''}</div>
        <div style="display:flex;gap:6px;align-items:center"><span class="badge ${kind}">${kind === 'slang' ? 'Local slang' : kind === 'hard' ? 'Hard word' : 'Word'}</span><button class="x" aria-label="Close">✕</button></div></div>
      <div class="meaning" id="m">${meaning ? esc(meaning) : 'Looking up…'}</div>
      ${plain !== sentence ? `<div class="lbl">This sentence in plain English</div><div class="ctx">${esc(plain)}</div><div class="orig">“${esc(sentence)}”</div>` : `<div class="lbl">In this sentence</div><div class="ctx">“${esc(sentence)}”</div>`}
      ${sl && sl.local ? `<div class="local">📍 ${esc(sl.city)}: ${esc(sl.local)}</div>` : ''}
      <div class="row"><button class="btn" id="hear">🔊 Hear it</button><button class="btn primary" id="save">★ Save to Linger</button></div>
      <div class="note" id="note"></div>`;
    layer.appendChild(card);
    place(card, sp.getBoundingClientRect());
    card.querySelector('.x').onclick = closeCard;
    card.querySelector('#hear').onclick = () => speakIt(`${raw}. ${sentence}`);
    if (!meaning) {
      const r = await send({ type: 'lookup', word: k });
      meaning = (r && r.meaning) || (api ? 'Not in the dictionary yet.' : await directLookup(k));
      if (card && cardSpan === sp) card.querySelector('#m').textContent = meaning;
    }
    card.querySelector('#save').onclick = async () => {
      const b = card.querySelector('#save');
      const r = await send({ type: 'save', key: k, word: { w: raw.toLowerCase(), m: meaning, s: sentence, p: plain !== sentence ? plain : '', place: host, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } });
      b.textContent = '✓ Saved'; b.classList.add('done'); b.classList.remove('primary');
      card.querySelector('#note').textContent = r && r.synced ? 'Sent to the Linger app on your phone.' : r && r.paired === false ? 'Saved here. Connect your phone in the Linger menu to send words there.' : r && r.error ? 'Saved here. Couldn’t reach your phone right now.' : 'Saved.';
    };
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
    if (active()) { scan(document.body); mo.observe(document.body, { childList: true, subtree: true }); }
    else { mo.disconnect(); unwrapAll(); closeCard(); }
  }
  if (api) {
    chrome.storage.local.get({ highlight: true, paused: [], bigger: false, pauseSecs: 3 }, (v) => { Object.assign(S, v); apply(); });
    chrome.storage.onChanged.addListener((ch) => {
      const was = active();
      Object.keys(ch).forEach((key) => { if (key in S) S[key] = ch[key].newValue; });
      if (active() !== was || ch.bigger) apply();
    });
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg.type === 'explain') { explainPage(); reply({ ok: true }); }
      if (msg.type === 'status') reply({ ok: true, words: count, eye: !!(window.__lingerGaze && window.__lingerGaze.on) });
    });
  } else apply();

  // Shared with gaze.js (eye tracking), which runs in this same isolated world.
  window.__lingerAPI = { openCard, closeCard, explainPage, settings: S, keyOf };
})();

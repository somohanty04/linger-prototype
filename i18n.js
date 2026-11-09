// App language: translates everything on screen into the language picked in the 🌐 menu.
// Text marked translate="no" (the English being learned: letters, word names, example sentences) stays in English.
// Translations come from Google Translate and are kept on this device, so each phrase is only fetched once.
(() => {
  const KEY = 'linger.lang';
  const lang = (() => { try { return localStorage.getItem(KEY) || 'en'; } catch { return 'en'; } })();
  window.LingerI18n = {
    lang,
    set(code) { try { localStorage.setItem(KEY, code); } catch {} location.reload(); }
  };
  if (lang === 'en') return;
  document.documentElement.lang = lang;

  const CACHE = 'linger.tr2.' + lang; // tr2: the app name is kept as “Linger”
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch {}
  const save = () => { try { localStorage.setItem(CACHE, JSON.stringify(cache)); } catch {} };

  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const HAS_WORDS = /[A-Za-z]{2,}/;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const skip = (el) => !el || !!el.closest('[translate="no"], script, style, textarea, code, kbd, svg');
  const done = new WeakMap(); // text node -> the translated text we put there
  const todo = new Set();

  function textNode(n) {
    const v = n.nodeValue;
    if (done.get(n) === v || !HAS_WORDS.test(v) || skip(n.parentElement)) return;
    const k = norm(v);
    if (cache[k]) { const t = v.replace(v.trim(), cache[k]); n.nodeValue = t; done.set(n, t); }
    else todo.add(k);
  }
  function attrs(el) {
    if (skip(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || !HAS_WORDS.test(v) || el.dataset['tr' + a.replace('-', '')] === v) continue;
      const k = norm(v);
      if (cache[k]) { el.setAttribute(a, cache[k]); el.dataset['tr' + a.replace('-', '')] = cache[k]; }
      else todo.add(k);
    }
  }
  function apply(root) {
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1) return;
    attrs(root);
    root.querySelectorAll('[placeholder], [aria-label], [title]').forEach(attrs);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) textNode(n);
    if (todo.size) schedule();
  }

  // Ask for missing phrases in batches: one phrase per line, so the answer lines up line by line.
  let timer = null, busy = false;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(fetchMissing, 60); };
  async function translateLines(lines) {
    // Keep the app's name: swap it for a code the translator leaves alone, then swap it back.
    const q = lines.map((l) => l.replace(/\bLinger\b/g, 'Z9Q')).join('\n');
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error('translate ' + r.status);
    const j = await r.json();
    return (j[0] || []).map((seg) => seg[0] || '').join('').split('\n').map((x) => x.replace(/Z9Q/g, 'Linger').trim());
  }
  async function fetchMissing() {
    if (busy) return schedule();
    busy = true;
    const want = [...todo].filter((k) => !cache[k]); todo.clear();
    const batches = []; let cur = [], size = 0;
    for (const k of want) { if (size + k.length > 1500 && cur.length) { batches.push(cur); cur = []; size = 0; } cur.push(k); size += k.length + 1; }
    if (cur.length) batches.push(cur);
    for (const b of batches) {
      try {
        const out = await translateLines(b);
        if (out.length === b.length) b.forEach((k, i) => { if (out[i]) cache[k] = out[i]; });
        else for (const k of b) { const [one] = await translateLines([k]); if (one) cache[k] = one; }
      } catch { /* offline or blocked: leave the English */ }
    }
    save();
    busy = false;
    apply(document.body);
  }

  // The app redraws often; translate new content right away (before it's painted when the phrase is known).
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes') attrs(m.target);
      else m.addedNodes.forEach(apply);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });
  apply(document.body);
})();

// Test-only: simulates noisy webcam gaze on test.html to measure the pause detection. Not part of the extension zip.
window.lingerSim = (() => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const NOISE = { x: 120, y: 45, outliers: 0.08 };
  const send = (x, y) => { const o = Math.random() < NOISE.outliers; window.__lingerGaze.feed(x + gauss() * NOISE.x + (o ? (Math.random() - 0.5) * 800 : 0), y + gauss() * NOISE.y + (o ? (Math.random() - 0.5) * 500 : 0)); };
  let lines = [], prompts = [], root = null;
  async function setup() {
    await new Promise((r) => { const s = document.createElement('script'); s.src = 'gaze.js?x=' + Date.now(); s.onload = r; document.body.appendChild(s); });
    await wait(300);
    window.__lingerGaze.simOn();
    root = document.getElementById('linger-gaze').shadowRoot;
    await wait(200);
    const ls = [];
    document.querySelectorAll('p').forEach((p, i) => { if (i === 0) return; const r = document.createRange(); r.selectNodeContents(p); const seen = new Set(); [...r.getClientRects()].forEach((b) => { const k = Math.round(b.top); if (b.width > 40 && !seen.has(k)) { seen.add(k); ls.push({ y: (b.top + b.bottom) / 2, l: b.left, r: b.right }); } }); });
    ls.sort((a, b) => a.y - b.y); lines = []; ls.forEach((l) => { if (!lines.length || Math.abs(lines[lines.length - 1].y - l.y) > 8) lines.push(l); });
    setInterval(() => { const a = root.querySelector('.ask'); if (a && !a.dataset.seen) { a.dataset.seen = 1; prompts.push({ word: a.querySelector('b').textContent, why: a.dataset.why }); a.querySelector('.no').click(); } }, 80);
    return lines.length;
  }
  async function read(line, ms) { const end = performance.now() + ms; while (performance.now() < end) { const f = 1 - (end - performance.now()) / ms; send(line.l + (line.r - line.l) * f, line.y); await wait(33); } }
  async function stare(x, y, ms) { const end = performance.now() + ms; while (performance.now() < end) { send(x, y); await wait(33); } }
  const take = () => { const p = prompts; prompts = []; return p; };
  const pause = async () => { await wait(3200); take(); }; // a break in the data resets detection
  return {
    setup, lines: () => lines,
    // Reading time per line is proportional to its length (a full line ≈ ms), like real reading.
    async normal(n = 10, ms = 1600) { await pause(); const full = Math.max(...lines.map((l) => l.r - l.l)); for (const l of lines.slice(0, n)) await read(l, Math.max(250, ms * (l.r - l.l) / full)); await wait(150); return take(); },
    async stareAt(word, ms = 5000) { await pause(); const r = [...document.querySelectorAll('.linger-w')].find((s) => s.textContent === word).getBoundingClientRect(); await stare((r.left + r.right) / 2, (r.top + r.bottom) / 2, ms); await wait(150); return take(); },
    async reread(from = 6, back = 2) { await pause(); for (let i = from; i < from + 3; i++) await read(lines[i], 1400); await read(lines[from + 2 - back], 2400); await wait(150); return take(); }
  };
})();

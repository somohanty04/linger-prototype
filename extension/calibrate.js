// Linger eye tracking setup: camera check, a full-screen dot through 20 spots, then 5 check spots to measure accuracy.
// The tracker (offscreen page) streams features for every camera frame; this page labels them with where the dot was.
import { fit, predict, learn, cleanGroup, OneEuro, pageToScreen, screenToPage } from './gazemodel.mjs';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
let port = null, lastFeat = 0, ready = false, rec = null, live = null, model = null, previewStream = null;

function showErr(t) { $('err').hidden = !t; $('err').textContent = t || ''; }
function check(id, state) { $(id).classList.toggle('ok', state === true); $(id).classList.toggle('bad', state === false); }

// ---------- connect to the tracker ----------
function connect() {
  port = chrome.runtime.connect({ name: 'calib' });
  let alive = true;
  port.onDisconnect.addListener(() => { alive = false; port = null; void chrome.runtime.lastError; setTimeout(connect, 700); });
  port.onMessage.addListener((m) => {
    if (m.status) {
      ready = ['ok', 'nomodel', 'noface', 'moved'].includes(m.status.s);
      check('cReady', ready ? true : m.status.s === 'error' ? false : null);
      if (m.status.s === 'error') showErr(m.status.msg);
      updateStart();
    }
    if (m.feat) {
      lastFeat = performance.now();
      if (rec) rec.push({ f: m.feat, blink: m.blink });
      if (live && !m.blink) live(m.feat);
    }
  });
  return alive;
}
setInterval(() => { check('cFace', lastFeat && performance.now() - lastFeat < 800 ? true : lastFeat ? false : null); updateStart(); }, 400);
function updateStart() { $('startBtn').disabled = !(ready && performance.now() - lastFeat < 800); }

// ---------- camera ----------
$('camBtn').onclick = async () => {
  showErr('');
  try {
    previewStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
  } catch (e) {
    const n = e && e.name;
    showErr(n === 'NotAllowedError' ? 'Camera access was blocked. Click the camera icon in the address bar → Allow, then try again. On a Mac, also check System Settings → Privacy & Security → Camera → Google Chrome.'
      : n === 'NotFoundError' ? 'No camera found. Linger needs a webcam for eye tracking.'
      : n === 'NotReadableError' ? 'The camera is busy. Close Zoom, FaceTime or other apps using it.' : 'Couldn’t turn on the camera: ' + ((e && e.message) || e));
    return;
  }
  $('preview').srcObject = previewStream; $('preview').play(); $('camOff').hidden = true;
  $('camBtn').hidden = true; $('startBtn').hidden = false;
  await chrome.runtime.sendMessage({ type: 'eye-start', restart: true });
  setTimeout(connect, 400);
  lightLoop();
};
// Is the face lit? Average brightness of the middle of the picture.
function lightLoop() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 24;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const t = setInterval(() => {
    const v = $('preview');
    if (!previewStream || !v.videoWidth) { if (!previewStream) clearInterval(t); return; }
    ctx.drawImage(v, v.videoWidth * 0.25, v.videoHeight * 0.15, v.videoWidth * 0.5, v.videoHeight * 0.7, 0, 0, 32, 24);
    const d = ctx.getImageData(0, 0, 32, 24).data; let s = 0;
    for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    check('cLight', s / (d.length / 4) > 70);
  }, 600);
}
$('cancelBtn').onclick = () => chrome.runtime.sendMessage({ type: 'calib-cancel' });

// ---------- the dot ----------
const toScreen = (x, y) => pageToScreen(window, x, y, 1);
async function collect(points, { settle = 420, hold = 650, cls = '', onPoint } = {}) {
  const dot = $('dot'); dot.className = 'dot ' + cls;
  const out = [];
  for (let k = 0; k < points.length; k++) {
    if (!document.fullscreenElement) throw new Error('left');
    const [px, py] = points[k];
    dot.classList.remove('rec'); dot.style.left = px + 'px'; dot.style.top = py + 'px';
    await wait(380 + settle);
    dot.classList.add('rec');
    rec = [];
    await wait(hold);
    const [sx, sy] = toScreen(px, py);
    out.push({ k, sx, sy, frames: rec }); rec = null;
    if (onPoint) onPoint(k);
  }
  return out;
}
const grid = () => { const W = innerWidth, H = innerHeight, out = []; [0.07, 0.36, 0.64, 0.93].forEach((fy, j) => { const xs = [0.05, 0.275, 0.5, 0.725, 0.95].map((fx) => W * fx); (j % 2 ? xs.reverse() : xs).forEach((x) => out.push([Math.round(x), Math.round(H * fy)])); }); return out; };
const checks = () => [[0.5, 0.5], [0.2, 0.22], [0.8, 0.22], [0.8, 0.78], [0.2, 0.78]].map(([fx, fy]) => [Math.round(innerWidth * fx), Math.round(innerHeight * fy)]);

$('startBtn').onclick = run;
$('againBtn').onclick = run;
async function run() {
  showErr(''); live = null;
  try { await document.documentElement.requestFullscreen(); } catch {}
  await wait(700); // let the window finish resizing
  $('intro').hidden = true; $('result').hidden = true; $('run').hidden = false; document.body.classList.add('running');
  const pts = grid(), chk = checks(), total = pts.length + chk.length;
  const bar = $('barFill'); bar.style.width = '0';
  try {
    $('runMsg').textContent = 'Look at the dot';
    $('dot').style.left = pts[0][0] + 'px'; $('dot').style.top = pts[0][1] + 'px';
    await wait(900);
    const cal = await collect(pts, { onPoint: (k) => { bar.style.width = Math.round((k + 1) / total * 100) + '%'; } });
    const samples = [];
    cal.forEach((p) => cleanGroup(p.frames).forEach((s) => samples.push({ f: s.f, x: p.sx, y: p.sy, g: p.k })));
    const good = new Set(samples.map((s) => s.g));
    if (good.size < 12) throw new Error('eyes');
    model = fit(samples);
    // Check spots: measure how far off the gaze lands, then use them to improve the model too.
    $('runMsg').textContent = 'Almost done: look at the green dots';
    const val = await collect(chk, { settle: 450, hold: 800, cls: 'check', onPoint: (k) => { bar.style.width = Math.round((pts.length + k + 1) / total * 100) + '%'; } });
    const errs = [], vErrs = [], extra = [];
    val.forEach((p) => {
      const fr = cleanGroup(p.frames); if (fr.length < 4) return;
      const ps = fr.map((s) => predict(model, s.f));
      const mx = med(ps.map((q) => q[0])), my = med(ps.map((q) => q[1]));
      errs.push(Math.hypot(mx - p.sx, my - p.sy)); vErrs.push(Math.abs(my - p.sy));
      fr.forEach((s) => extra.push({ f: s.f, x: p.sx, y: p.sy }));
    });
    if (extra.length) learn(model, extra);
    model.acc = errs.length ? { err: Math.round(med(errs)), vErr: Math.round(med(vErrs)) } : null;
    model.dpr = devicePixelRatio; model.at = Date.now();
    finish();
  } catch (e) {
    rec = null;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    document.body.classList.remove('running'); $('run').hidden = true; $('intro').hidden = false;
    showErr(e.message === 'left' ? 'Calibration stopped because the page left full screen. Press Start to try again.'
      : e.message === 'eyes' ? 'Linger couldn’t see your eyes well enough. Add light on your face, look straight at each dot, and try again.'
      : 'Something went wrong: ' + e.message);
  }
}

async function finish() {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  document.body.classList.remove('running'); $('run').hidden = true; $('result').hidden = false;
  const a = model.acc;
  const v = !a ? ['Done', 'Calibration finished, but the accuracy check couldn’t see your eyes.']
    : a.vErr <= 35 ? ['Ready: very good', `Gaze lands about ${a.err}px from where you look (${a.vErr}px up or down). Linger can tell lines of text apart.`]
    : a.vErr <= 70 ? ['Ready', `Gaze lands about ${a.err}px from where you look (${a.vErr}px up or down). Good for normal text; “More space between lines” in the Linger menu helps with small text.`]
    : ['Usable, but rough', `Gaze lands about ${a.err}px off (${a.vErr}px up or down). Try more light on your face and keeping a steady distance, then calibrate again.`];
  $('verdict').textContent = v[0]; $('verdictText').textContent = v[1];
  // Live preview: a dot where Linger thinks you're looking, and a bar under the line.
  const fx = new OneEuro(), fy = new OneEuro();
  const lines = [...document.querySelectorAll('.try p:not(.tryHead)')];
  live = (f) => {
    const [sx, sy] = predict(model, f), t = performance.now() / 1000;
    const [x, y] = screenToPage(window, fx.filter(sx, t), fy.filter(sy, t), 1);
    const d = $('gdot'); d.style.display = 'block'; d.style.left = x + 'px'; d.style.top = y + 'px';
    let best = null, bd = 1e9;
    lines.forEach((p) => { const r = p.getBoundingClientRect(); const dd = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0; if (dd < bd) { bd = dd; best = r; } });
    const g = $('gline');
    if (best && bd < 60) { g.style.display = 'block'; g.style.left = best.left + 'px'; g.style.width = best.width + 'px'; g.style.top = (best.bottom - 2) + 'px'; } else g.style.display = 'none';
  };
}

$('doneBtn').onclick = async () => {
  live = null;
  if (port) port.postMessage({ type: 'model', model });
  if (previewStream) previewStream.getTracks().forEach((t) => t.stop());
  await chrome.runtime.sendMessage({ type: 'calib-done', model });
};

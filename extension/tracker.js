// Linger eye tracker. Runs once for the whole browser in a hidden (offscreen) extension page, so the camera is
// asked for once, it works on every website (even ones that block cameras), and calibration carries across tabs.
// Each camera frame → MediaPipe face + iris landmarks → features → screen point → smoothed → sent to the tab.
import { FaceLandmarker, HandLandmarker } from './vendor/mediapipe/vision_bundle.mjs';
import { features, predict, learn, headCheck, OneEuro, BlinkGate } from './gazemodel.mjs';
import { SwipeDetector, HandGestures, palm } from './gestures.mjs';

const url = (p) => chrome.runtime.getURL(p);
const ports = new Set();
let model = null, status = { s: 'loading', msg: 'Starting eye tracking…' };
let landmarker = null, lastFace = 0, movedSince = 0;
const recent = [];                 // the last ~1.5 s of { t, f }, to learn from clicks
let offset = [0, 0], offsetT = 0;  // quick correction for drift (from clicks), fades over a few minutes
const fx = new OneEuro(), fy = new OneEuro();
const gate = new BlinkGate(); // drops blinks, and the half-closed frames around them
let saveTimer = null;
const clickErr = [];               // recent clicks: was the gaze far from where they clicked?
// Hand swipes answer "Want help with this word?". Hand tracking only runs while a tab has that question open (it costs CPU).
const asking = new Set();          // ports of tabs showing the question, with swipes turned on
let hands = null, handsLoading = null;
const swipe = new SwipeDetector();
// Hand gestures (a separate feature): tabs with it on connect as 'hand' and get the pointer, pose and gestures.
const handPorts = new Set();
const gestures = new HandGestures();
const hx = new OneEuro(1.0, 0.6), hy = new OneEuro(1.0, 0.6); // steadies the pointer (0–1 page units)
let hStatus = { s: 'loading', msg: 'Starting hand gestures…' };
function setHStatus(s, msg = '') {
  if (hStatus.s === s && hStatus.msg === msg) return;
  hStatus = { s, msg };
  for (const p of handPorts) try { p.postMessage({ hstatus: hStatus }); } catch {}
}
let files = null;
const dbg = (self.lingerDebug = { frames: 0, faces: 0, path: '', err: '' }); // for testing

function setStatus(s, msg = '') {
  if (status.s === s && status.msg === msg) return;
  status = { s, msg };
  for (const p of ports) try { p.postMessage({ status }); } catch {}
  if (s === 'error') setHStatus('error', msg.replace('Open eye tracking setup', 'Open Practice hand gestures').replace('Eye tracking', 'The camera'));
}
const problem = (why) => chrome.runtime.sendMessage({ type: 'gaze-problem', why }).catch(() => {});

// ---------- light and faces in the picture ----------
// Two things people can fix themselves: a dark room (iris landmarks get jumpy) and someone else in view (Linger may
// follow the wrong face). Brightness = average luminance of a tiny copy of the frame, once a second. Faces = how many
// MediaPipe finds (numFaces: 2, so it can see a second one). Each has to last a few seconds before the menu hears of it.
const env = { dark: false, faces: 1, darkSince: 0, brightSince: 0, multiSince: 0, singleSince: 0, lumaT: 0, sentT: 0 };
let lumaCanvas = null;
function luma(src, now) {
  if (now - env.lumaT < 1000) return;
  env.lumaT = now;
  let v;
  try {
    if (!lumaCanvas) lumaCanvas = new OffscreenCanvas(32, 18);
    const c = lumaCanvas.getContext('2d', { willReadFrequently: true });
    c.drawImage(src, 0, 0, 32, 18);
    const d = c.getImageData(0, 0, 32, 18).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    v = dbg.luma = Math.round(sum / (d.length / 4));
  } catch { return; }
  // Dark below 45 (of 255) for 3 s; fine again above 60 for 3 s (the gap stops it flickering at the edge).
  if (v < 45) { env.brightSince = 0; env.darkSince = env.darkSince || now; } else if (v > 60) { env.darkSince = 0; env.brightSince = env.brightSince || now; }
  if (!env.dark && env.darkSince && now - env.darkSince > 3000) { env.dark = true; tellEnv(now, true); }
  if (env.dark && env.brightSince && now - env.brightSince > 3000) { env.dark = false; tellEnv(now, true); }
}
function countFaces(n, now) {
  dbg.numFaces = n;
  if (n > 1) { env.singleSince = 0; env.multiSince = env.multiSince || now; } else { env.multiSince = 0; env.singleSince = env.singleSince || now; }
  if (env.faces < 2 && env.multiSince && now - env.multiSince > 2000) { env.faces = n; tellEnv(now, true); }
  if (env.faces > 1 && env.singleSince && now - env.singleSince > 3000) { env.faces = 1; tellEnv(now, true); }
}
// Tell the background on a change, and every minute while a warning stands (so the menu knows it's still true).
function tellEnv(now, changed) {
  if (!changed && (!(env.dark || env.faces > 1) || now - env.sentT < 60000)) return;
  env.sentT = now;
  chrome.runtime.sendMessage({ type: 'gaze-env', dark: env.dark, faces: env.faces }).catch(() => {});
}
// No face for 20 s while a tab is listening: record it once per stretch, so the menu can offer Fix it.
let faceGoneSaid = false;

// ---------- tabs and the calibration page connect here ----------
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'hand') {
    handPorts.add(port);
    port.postMessage({ hstatus: hStatus });
    port.onDisconnect.addListener(() => { handPorts.delete(port); if (!handPorts.size) { gestures.reset(); hx.reset(); hy.reset(); } });
    loadHands();
    return;
  }
  if (port.name !== 'gaze' && port.name !== 'calib') return;
  ports.add(port);
  port.postMessage({ status, hasModel: !!model });
  port.onDisconnect.addListener(() => { ports.delete(port); asking.delete(port); });
  port.onMessage.addListener((m) => {
    if (m.type === 'model') { model = m.model; offset = [0, 0]; clickErr.length = 0; fx.reset(); fy.reset(); gate.reset(); }
    if (m.type === 'learn' && model) learnAt(m.s, m.strong);
    if (m.type === 'ask') {
      if (m.open && m.swipe) { asking.add(port); loadHands(); } else asking.delete(port);
      if (!asking.size) swipe.reset();
    }
  });
});

// People look at what they click (just before clicking). Use those frames to correct drift right away and
// to keep improving the model.
function learnAt([sx, sy], strong) {
  const now = performance.now();
  const frames = recent.filter((r) => now - r.t > 60 && now - r.t < 650);
  if (frames.length < 3) return;
  const ps = frames.map((r) => predict(model, r.f));
  const px = ps.reduce((s, p) => s + p[0], 0) / ps.length + offset[0], py = ps.reduce((s, p) => s + p[1], 0) / ps.length + offset[1];
  const ex = sx - px, ey = sy - py;
  // Accuracy check: if 4 of the last 5 clicks (within 2 minutes) landed far from the gaze point, calibration has
  // probably drifted beyond what the quick correction can fix. Tell the tabs, so the one in front can offer to recalibrate.
  clickErr.push({ t: now, far: Math.hypot(ex, ey) > 350 });
  while (clickErr.length > 5 || (clickErr.length && now - clickErr[0].t > 120000)) clickErr.shift();
  if (clickErr.length >= 5 && clickErr.filter((c) => c.far).length >= 4) {
    clickErr.length = 0;
    for (const p of ports) if (p.name === 'gaze') try { p.postMessage({ quality: 'poor' }); } catch {}
  }
  if (Math.hypot(ex, ey) > 450) return; // probably wasn't looking at it (clicked from memory)
  const k = strong ? 0.6 : 0.35, cap = 220;
  offset = [Math.max(-cap, Math.min(cap, offset[0] + k * ex)), Math.max(-cap, Math.min(cap, offset[1] + k * ey))];
  offsetT = now;
  learn(model, frames.map((r) => ({ f: r.f, x: sx, y: sy, w: strong ? 1.5 : 0.6 })));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.runtime.sendMessage({ type: 'save-model', model }).catch(() => {}), 4000);
}

// ---------- every frame ----------
function onFrame(src, W, H) {
  const now = performance.now();
  dbg.frames++;
  if (!ports.size && !handPorts.size) return; // nobody is using it: skip the work (the camera stays ready)
  if ((asking.size || handPorts.size) && hands) handFrame(src, now, W / H);
  if (!ports.size || !landmarker) return; // hand gestures only (or the face model didn't load): skip the face
  let res;
  try { res = landmarker.detectForVideo(src, now); } catch (e) { dbg.err = String((e && e.message) || e); return; }
  luma(src, now);
  tellEnv(now, false);
  // With two faces allowed, follow the biggest one (the person nearest the camera).
  const all = res.faceLandmarks || [];
  countFaces(all.length, now);
  const size = (f) => { let a = 1, b = 0; for (const p of f) { if (p.x < a) a = p.x; if (p.x > b) b = p.x; } return b - a; };
  const best = all.length > 1 ? all.reduce((bi, f, i) => (size(f) > size(all[bi]) ? i : bi), 0) : 0;
  const lm = all[best];
  if (!lm) {
    if (now - lastFace > 600) setStatus('noface', 'Can’t see your eyes. Face the camera.');
    if (!faceGoneSaid && now - lastFace > 20000) { faceGoneSaid = true; problem('noface'); }
    return;
  }
  lastFace = now; dbg.faces++; faceGoneSaid = false;
  const blend = {};
  ((res.faceBlendshapes && res.faceBlendshapes[best] && res.faceBlendshapes[best].categories) || []).forEach((c) => { blend[c.categoryName] = c.score; });
  const mat = res.facialTransformationMatrixes && res.facialTransformationMatrixes[best] && res.facialTransformationMatrixes[best].data;
  const ft = features(lm, W, H, blend, mat);
  if (!ft) return;
  const blink = ft.blink > 0.45;
  for (const p of ports) if (p.name === 'calib') try { p.postMessage({ feat: ft.f, blink, head: ft.head }); } catch {}
  if (!model) { setStatus('nomodel', 'Set up eye tracking first.'); return; }
  if (headCheck(model, ft.head) === 'moved') { if (!movedSince) movedSince = now; } else movedSince = 0;
  setStatus(movedSince && now - movedSince > 1200 ? 'moved' : 'ok', movedSince && now - movedSince > 1200 ? 'Sit like you did when you set it up.' : '');
  for (const fr of gate.push({ t: now, f: ft.f, blink: ft.blink })) send(fr);
}
function send({ t, f }) {
  recent.push({ t, f });
  while (recent.length && t - recent[0].t > 1500) recent.shift();
  const fade = Math.exp(-(t - offsetT) / 180000);
  const [x, y] = predict(model, f);
  const g = [Math.round(fx.filter(x + offset[0] * fade, t / 1000)), Math.round(fy.filter(y + offset[1] * fade, t / 1000))];
  for (const p of ports) if (p.name === 'gaze') try { p.postMessage({ g }); } catch {}
}

// ---------- hand swipes ----------
function handFrame(src, now, asp) {
  let res;
  try { res = hands.detectForVideo(src, now); } catch (e) { dbg.handErr = String((e && e.message) || e); return; }
  const lm = res.landmarks && res.landmarks[0];
  if (lm) dbg.hands = (dbg.hands || 0) + 1;
  if (handPorts.size) {
    const r = gestures.push(now, lm || null, asp || 16 / 9);
    const pointer = r.pointer ? { x: hx.filter(r.pointer.x, now / 1000), y: hy.filter(r.pointer.y, now / 1000) } : null;
    if (!r.pointer) { hx.reset(); hy.reset(); }
    setHStatus('ok');
    for (const p of handPorts) try { p.postMessage({ h: { hand: r.hand, pose: r.pose, pointer, events: r.events } }); } catch {}
  }
  if (!asking.size) return;
  const dir = swipe.push(now, palm(lm));
  if (!dir) return;
  dbg.swipes = (dbg.swipes || 0) + 1;
  for (const p of asking) try { p.postMessage({ gesture: dir }); } catch {}
}
function loadHands() {
  if (hands || handsLoading || !files) return;
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: url('vendor/mediapipe/hand_landmarker.task'), delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.6 });
  handsLoading = HandLandmarker.createFromOptions(files, opts('GPU'))
    .catch(() => HandLandmarker.createFromOptions(files, opts('CPU')))
    .then((h) => { hands = h; })
    .catch((e) => { dbg.handErr = 'load: ' + ((e && e.message) || e); problem('hand swipes ' + ((e && e.message) || e)); setHStatus('error', 'Hand tracking couldn’t load.'); })
    .finally(() => { handsLoading = null; });
}

// ---------- start-up ----------
async function start() {
  const got = await chrome.runtime.sendMessage({ type: 'get-model' }).catch(() => null);
  model = (got && got.model) || null;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' } });
  } catch (e) {
    const n = e && e.name;
    const msg = n === 'NotAllowedError' ? 'Camera access is off. Open eye tracking setup to allow it.'
      : n === 'NotFoundError' ? 'No camera found.' : n === 'NotReadableError' ? 'The camera is busy (Zoom or FaceTime?).' : 'Couldn’t turn on the camera.';
    setStatus('error', msg); problem('camera ' + n); return;
  }
  setStatus('loading', 'Loading eye tracking…');
  setHStatus('loading', 'Loading hand tracking…');
  files = { wasmLoaderPath: url('vendor/mediapipe/vision_wasm_internal.js'), wasmBinaryPath: url('vendor/mediapipe/vision_wasm_internal.wasm') };
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: url('vendor/mediapipe/face_landmarker.task'), delegate }, runningMode: 'VIDEO', numFaces: 2, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
  try { landmarker = await FaceLandmarker.createFromOptions(files, opts('GPU')); }
  catch { try { landmarker = await FaceLandmarker.createFromOptions(files, opts('CPU')); } catch (e) { status = { s: 'error', msg: 'Eye tracking couldn’t load.' }; for (const p of ports) try { p.postMessage({ status }); } catch {} problem('model ' + ((e && e.message) || e)); } }
  if (landmarker) setStatus(model ? 'ok' : 'nomodel', model ? '' : 'Set up eye tracking first.');
  if (asking.size || handPorts.size) loadHands();
  lastFace = performance.now();

  // Read frames straight from the camera track (works in a hidden page); fall back to a <video> element.
  const track = stream.getVideoTracks()[0];
  if (typeof MediaStreamTrackProcessor === 'function') {
    try {
      dbg.path = 'processor';
      const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
      for (;;) {
        const { value: frame, done } = await reader.read();
        if (done) break;
        try { onFrame(frame, frame.displayWidth, frame.displayHeight); } finally { frame.close(); }
      }
      return;
    } catch (e) { dbg.err = 'processor: ' + ((e && e.message) || e); }
  }
  dbg.path = 'video';
  const video = document.querySelector('video');
  video.srcObject = stream; await video.play();
  let lastT = -1;
  const loop = () => { if (video.currentTime !== lastT) { lastT = video.currentTime; onFrame(video, video.videoWidth, video.videoHeight); } setTimeout(loop, 30); };
  loop();
}
start();

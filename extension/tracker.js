// Linger eye tracker. Runs once for the whole browser in a hidden (offscreen) extension page, so the camera is
// asked for once, it works on every website (even ones that block cameras), and calibration carries across tabs.
// Each camera frame → MediaPipe face + iris landmarks → features → screen point → smoothed → sent to the tab.
import { FaceLandmarker } from './vendor/mediapipe/vision_bundle.mjs';
import { features, predict, learn, headCheck, OneEuro } from './gazemodel.mjs';

const url = (p) => chrome.runtime.getURL(p);
const ports = new Set();
let model = null, status = { s: 'loading', msg: 'Starting eye tracking…' };
let landmarker = null, lastFace = 0, movedSince = 0;
const recent = [];                 // the last ~1.5 s of { t, f }, to learn from clicks
let offset = [0, 0], offsetT = 0;  // quick correction for drift (from clicks), fades over a few minutes
const fx = new OneEuro(), fy = new OneEuro();
let saveTimer = null;
const dbg = (self.lingerDebug = { frames: 0, faces: 0, path: '', err: '' }); // for testing

function setStatus(s, msg = '') {
  if (status.s === s && status.msg === msg) return;
  status = { s, msg };
  for (const p of ports) try { p.postMessage({ status }); } catch {}
}
const problem = (why) => chrome.runtime.sendMessage({ type: 'gaze-problem', why }).catch(() => {});

// ---------- tabs and the calibration page connect here ----------
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'gaze' && port.name !== 'calib') return;
  ports.add(port);
  port.postMessage({ status, hasModel: !!model });
  port.onDisconnect.addListener(() => ports.delete(port));
  port.onMessage.addListener((m) => {
    if (m.type === 'model') { model = m.model; offset = [0, 0]; fx.reset(); fy.reset(); }
    if (m.type === 'learn' && model) learnAt(m.s, m.strong);
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
  if (!ports.size) return; // nobody is looking: skip the work (the camera stays ready)
  let res;
  try { res = landmarker.detectForVideo(src, now); } catch (e) { dbg.err = String((e && e.message) || e); return; }
  const lm = res.faceLandmarks && res.faceLandmarks[0];
  if (!lm) { if (now - lastFace > 600) setStatus('noface', 'Can’t see your eyes. Face the camera.'); return; }
  lastFace = now; dbg.faces++;
  const blend = {};
  ((res.faceBlendshapes && res.faceBlendshapes[0] && res.faceBlendshapes[0].categories) || []).forEach((c) => { blend[c.categoryName] = c.score; });
  const mat = res.facialTransformationMatrixes && res.facialTransformationMatrixes[0] && res.facialTransformationMatrixes[0].data;
  const ft = features(lm, W, H, blend, mat);
  if (!ft) return;
  const blink = ft.blink > 0.45;
  for (const p of ports) if (p.name === 'calib') try { p.postMessage({ feat: ft.f, blink, head: ft.head }); } catch {}
  if (!model) { setStatus('nomodel', 'Set up eye tracking first.'); return; }
  if (headCheck(model, ft.head) === 'moved') { if (!movedSince) movedSince = now; } else movedSince = 0;
  setStatus(movedSince && now - movedSince > 1200 ? 'moved' : 'ok', movedSince && now - movedSince > 1200 ? 'Sit like you did when you set it up.' : '');
  if (blink) return; // the iris is hidden during a blink
  recent.push({ t: now, f: ft.f });
  while (recent.length && now - recent[0].t > 1500) recent.shift();
  const fade = Math.exp(-(now - offsetT) / 180000);
  const [x, y] = predict(model, ft.f);
  const g = [Math.round(fx.filter(x + offset[0] * fade, now / 1000)), Math.round(fy.filter(y + offset[1] * fade, now / 1000))];
  for (const p of ports) if (p.name === 'gaze') try { p.postMessage({ g }); } catch {}
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
  const files = { wasmLoaderPath: url('vendor/mediapipe/vision_wasm_internal.js'), wasmBinaryPath: url('vendor/mediapipe/vision_wasm_internal.wasm') };
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: url('vendor/mediapipe/face_landmarker.task'), delegate }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
  try { landmarker = await FaceLandmarker.createFromOptions(files, opts('GPU')); }
  catch { try { landmarker = await FaceLandmarker.createFromOptions(files, opts('CPU')); } catch (e) { setStatus('error', 'Eye tracking couldn’t load.'); problem('model ' + ((e && e.message) || e)); return; } }
  setStatus(model ? 'ok' : 'nomodel', model ? '' : 'Set up eye tracking first.');
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

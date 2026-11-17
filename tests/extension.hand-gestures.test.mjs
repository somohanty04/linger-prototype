// Hand gestures (extension/gestures.mjs): pose, pointer, swipes, scrolling and pinch-zoom from made-up hand landmarks.
// Run: node tests/extension.hand-gestures.test.mjs
import { pose, pointerOf, HandGestures, SwipeDetector } from '../extension/gestures.mjs';

const ASP = 16 / 9;
// A right hand facing the camera, fingers up. cx, cy: palm centre in picture coordinates (0–1).
// shape: 'palm' (all fingers out), 'point' (index out), 'fist', 'pinch' (thumb tip on index tip).
function hand(cx, cy, shape = 'palm', s = 0.1) {
  const P = (dx, dy) => ({ x: cx + (dx * s) / ASP, y: cy + dy * s, z: 0 });
  const lm = new Array(21);
  lm[0] = P(0, 1.1); // wrist
  const base = { 5: -0.45, 9: -0.15, 13: 0.15, 17: 0.42 }; // knuckles across the hand
  const fingers = [[5, 'index'], [9, 'middle'], [13, 'ring'], [17, 'pinky']];
  for (const [m, name] of fingers) {
    const x = base[m];
    const isOut = shape === 'palm' || (shape === 'point' && name === 'index') || (shape === 'pinch' && name !== 'index');
    lm[m] = P(x, 0);
    if (isOut) { lm[m + 1] = P(x, -0.45); lm[m + 2] = P(x, -0.75); lm[m + 3] = P(x, -1.0); }
    else { lm[m + 1] = P(x, -0.35); lm[m + 2] = P(x, -0.1); lm[m + 3] = P(x, 0.2); } // curled back towards the palm
  }
  // Thumb, out to the side.
  lm[1] = P(-0.55, 0.85); lm[2] = P(-0.85, 0.6); lm[3] = P(-1.05, 0.35); lm[4] = P(-1.2, 0.1);
  if (shape === 'pinch') { // index bends forward and its tip meets the thumb tip
    lm[6] = P(-0.6, -0.35); lm[7] = P(-0.8, -0.2); lm[8] = P(-0.95, -0.05); lm[4] = P(-0.97, -0.03);
  }
  return lm;
}

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' ' + extra : ''}`); cond ? pass++ : fail++; };

// ---------- poses ----------
ok('open hand is a palm', pose(hand(0.5, 0.5, 'palm'), ASP) === 'palm');
ok('index finger out is a point', pose(hand(0.5, 0.5, 'point'), ASP) === 'point');
ok('thumb on index tip is a pinch', pose(hand(0.5, 0.5, 'pinch'), ASP) === 'pinch');
ok('fist is other', pose(hand(0.5, 0.5, 'fist'), ASP) === 'other');
ok('works for a small, far-away hand', pose(hand(0.5, 0.5, 'point', 0.04), ASP) === 'point' && pose(hand(0.5, 0.5, 'pinch', 0.04), ASP) === 'pinch');

// ---------- pointer ----------
const pl = pointerOf(hand(0.75, 0.5, 'point')), pr = pointerOf(hand(0.25, 0.5, 'point'));
ok('pointer is mirrored: hand on the right of the picture = left of the page', pl.x < 0.5 && pr.x > 0.5, JSON.stringify([pl, pr]));
const edge = pointerOf(hand(0.05, 0.05, 'point'));
ok('pointer stays on the page at the picture edge', edge.x >= 0 && edge.x <= 1 && edge.y >= 0 && edge.y <= 1);

// Drive a HandGestures with frames at 30 fps. path(i) → [cx, cy, shape] or null (no hand).
function run(g, frames, path, t0 = 0) {
  const ev = []; let last = null;
  for (let i = 0; i < frames; i++) {
    const f = path(i), t = t0 + i * 33;
    const r = g.push(t, f ? hand(f[0], f[1], f[2]) : null, ASP);
    ev.push(...r.events); last = r;
  }
  return { ev, last };
}

// ---------- swipes ----------
{
  const g = new HandGestures();
  const { ev } = run(g, 30, (i) => (i < 10 ? [0.6, 0.5, 'palm'] : [0.6 - (i - 10) * 0.03, 0.5, 'palm'])); // moves left in the picture = your right
  ok('palm swipe to your right → "right" (yes)', ev.includes('right') && !ev.includes('left'), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 30, (i) => (i < 10 ? [0.4, 0.5, 'palm'] : [0.4 + (i - 10) * 0.03, 0.5, 'palm']));
  ok('palm swipe to your left → "left" (no)', ev.includes('left') && !ev.includes('right'), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 30, (i) => (i < 10 ? [0.5, 0.65, 'palm'] : [0.5, 0.65 - (i - 10) * 0.025, 'palm']));
  ok('palm swipe up → scroll down (next part of the page)', ev.includes('scroll-down') && !ev.some((e) => e === 'left' || e === 'right'), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 30, (i) => (i < 10 ? [0.5, 0.35, 'palm'] : [0.5, 0.35 + (i - 10) * 0.025, 'palm']));
  ok('palm swipe down → scroll up', ev.includes('scroll-up'), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 40, (i) => (i < 10 ? [0.7, 0.5, 'point'] : [0.7 - (i - 10) * 0.02, 0.5 + (i - 10) * 0.005, 'point']));
  ok('moving a pointing hand never swipes or scrolls', ev.length === 0, JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 60, (i) => [0.5 + 0.004 * Math.sin(i), 0.5 + 0.004 * Math.cos(i), 'palm']); // a slightly shaky still hand
  ok('a still, shaky palm does nothing', ev.length === 0, JSON.stringify(ev));
}
{
  const g = new HandGestures();
  // two quick swipes: the second inside the cool-down is ignored
  const { ev } = run(g, 40, (i) => (i < 8 ? [0.6, 0.5, 'palm'] : i < 16 ? [0.6 - (i - 8) * 0.04, 0.5, 'palm'] : [0.28 + (i - 16) * 0.04, 0.5, 'palm']));
  ok('one swipe per movement (the swing back doesn\'t count)', ev.filter((e) => e === 'right' || e === 'left').length === 1, JSON.stringify(ev));
}

// ---------- pinch zoom ----------
{
  const g = new HandGestures();
  const { ev } = run(g, 50, (i) => (i < 15 ? [0.5, 0.6, 'pinch'] : [0.5, 0.6 - (i - 15) * 0.01, 'pinch'])); // hold, then move up 0.35
  const ins = ev.filter((e) => e === 'zoom-in').length;
  ok('pinch, hold, move up → zoom in (one step per 7% of the picture)', ev[0] === 'zoom-start' && ins >= 4 && ins <= 5 && !ev.includes('zoom-out'), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 40, (i) => (i < 15 ? [0.5, 0.4, 'pinch'] : [0.5, 0.4 + (i - 15) * 0.01, 'pinch']));
  ok('pinch, hold, move down → zoom out', ev.includes('zoom-out') && !ev.includes('zoom-in'), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 30, (i) => (i < 4 ? [0.5, 0.6, 'pinch'] : [0.5, 0.6 - (i - 4) * 0.02, 'point']));
  ok('a quick pinch that opens again doesn\'t zoom', !ev.some((e) => e.startsWith('zoom')), JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 40, (i) => (i < 15 ? [0.5, 0.6, 'pinch'] : i < 25 ? [0.5, 0.6 - (i - 15) * 0.01, 'pinch'] : [0.5, 0.5, 'point']));
  ok('opening the fingers ends the zoom', ev.at(-1) === 'zoom-end', JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 40, (i) => (i < 15 ? [0.5, 0.6, 'pinch'] : [0.5 + (i - 15) * 0.02, 0.6, 'pinch']));
  ok('moving a held pinch sideways doesn\'t zoom or swipe', ev.filter((e) => e !== 'zoom-start').length === 0, JSON.stringify(ev));
}
{
  const g = new HandGestures();
  const { ev } = run(g, 30, (i) => (i < 15 ? [0.5, 0.6, 'pinch'] : null));
  ok('losing the hand ends the zoom', ev.includes('zoom-end'), JSON.stringify(ev));
}

// ---------- pose is steady, not flickery ----------
{
  const g = new HandGestures();
  const { last } = run(g, 20, (i) => [0.5, 0.5, i === 10 ? 'palm' : 'point']); // one odd frame
  ok('one odd frame doesn\'t change the pose', last.pose === 'point');
}

// ---------- eye tracking's swipes still work the same ----------
{
  const s = new SwipeDetector(); let got = null;
  for (let i = 0; i < 20; i++) { const r = s.push(i * 33, { x: 0.7 - i * 0.02, y: 0.5 }); if (r) got = r; }
  ok('eye-tracking swipe detector unchanged (right)', got === 'right');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

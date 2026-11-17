// Linger hand swipes: answer "Want help with this word?" without touching the mouse.
// Swipe your hand to your RIGHT = "Yes, explain"; to your LEFT = "No". (The mapping is in gaze.js and hand.js.)
// Fed with MediaPipe hand landmarks (0–1 picture coordinates) for each camera frame.

// Middle of the palm: wrist and the four knuckles.
export function palm(lm) {
  if (!lm || lm.length < 21) return null;
  const ids = [0, 5, 9, 13, 17];
  return { x: ids.reduce((s, i) => s + lm[i].x, 0) / ids.length, y: ids.reduce((s, i) => s + lm[i].y, 0) / ids.length };
}

export class SwipeDetector {
  // dist: how far the palm must travel across the picture (share of its width or height); ms: within this time;
  // slant: how much movement the other way is allowed for each bit along the swipe; cool: pause after a swipe.
  // axis: 'x' for left/right swipes (the default), 'y' for up/down.
  constructor({ dist = 0.2, ms = 700, slant = 0.6, cool = 1200, lost = 250, axis = 'x' } = {}) {
    Object.assign(this, { dist, ms, slant, cool, lost, axis, hist: [], until: 0, seen: 0 });
  }
  reset() { this.hist = []; }
  // t: time in ms; p: palm {x, y} or null when no hand is visible. Returns 'left' or 'right' (the person's own
  // left and right), or 'up' / 'down' on the y axis, once per swipe; otherwise null.
  push(t, p) {
    if (!p) { if (t - this.seen > this.lost) this.hist = []; return null; }
    this.seen = t;
    const a = this.axis === 'y' ? 'y' : 'x', b = a === 'x' ? 'y' : 'x';
    this.hist.push({ t, x: p.x, y: p.y });
    while (this.hist.length && t - this.hist[0].t > this.ms) this.hist.shift();
    if (t < this.until || this.hist.length < 3) return null;
    // Compare with the point in the window that is farthest along the axis from where the hand is now.
    let best = null;
    for (const h of this.hist) if (!best || Math.abs(p[a] - h[a]) > Math.abs(p[a] - best[a])) best = h;
    const da = p[a] - best[a], db = p[b] - best[b];
    if (Math.abs(da) < this.dist || Math.abs(db) > Math.abs(da) * this.slant) return null;
    // Only count it while the hand is still moving that way (not on the way back).
    const prev = this.hist[this.hist.length - 2];
    if (Math.sign(p[a] - prev[a]) !== Math.sign(da)) return null;
    this.hist = []; this.until = t + this.cool;
    // Picture y grows downwards. The picture isn't mirrored: moving to your right moves the hand to its left.
    if (a === 'y') return da < 0 ? 'up' : 'down';
    return da < 0 ? 'right' : 'left';
  }
}

// ---------- Hand gestures (a feature of its own, separate from eye tracking) ----------
// One hand in front of the webcam:
//   point (index finger out, other fingers curled)  → a pointer on the page; hold it on a word to be asked
//                                                      "Want help with this word?"
//   open palm, swipe left / right                   → answer that question (right = yes, left = no)
//   open palm, swipe up / down                      → scroll the page down / up by most of a screen
//   pinch (thumb and index fingertips touching),     → zoom: once the pinch has been held a moment, move the hand
//   then move up or down                               up to zoom in, down to zoom out; open the fingers to stop
// A pinch is held and moved (rather than spread like on a phone) because the camera can't tell a spread from
// someone relaxing a pointing hand; a held pinch almost never happens by accident.

// Distance between two landmarks, with x scaled to the picture's shape so distances are the same either way.
const dist = (a, b, asp) => Math.hypot((a.x - b.x) * asp, a.y - b.y);
// A finger is out when its tip is clearly farther from the wrist than its middle joint.
const out = (lm, tip, pip, asp) => dist(lm[0], lm[tip], asp) > dist(lm[0], lm[pip], asp) * 1.12;

// What the hand is doing: 'pinch', 'palm', 'point' or 'other'. pinchOn: whether it was already pinching
// (a pinch starts when the tips nearly touch and ends only once they're clearly apart, so it doesn't flicker).
export function pose(lm, asp = 16 / 9, pinchOn = false) {
  if (!lm || lm.length < 21) return null;
  const size = dist(lm[0], lm[9], asp) || 1e-6; // wrist to middle knuckle: the hand's size in the picture
  const gap = dist(lm[4], lm[8], asp) / size;
  const index = out(lm, 8, 6, asp), middle = out(lm, 12, 10, asp), ring = out(lm, 16, 14, asp), pinky = out(lm, 20, 18, asp);
  if (gap < (pinchOn ? 0.45 : 0.28)) return 'pinch';
  if (index && middle && ring && pinky) return 'palm';
  if (index && !middle && !ring && !pinky) return 'point';
  return 'other';
}

// The part of the camera picture that maps to the whole page, so the pointer reaches the edges without
// stretching your arm to the edge of the picture.
export const BOX = { x0: 0.2, x1: 0.8, y0: 0.15, y1: 0.7 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// Index fingertip → a spot on the page, 0–1 across and down. Mirrored, so moving your hand right moves it right.
export function pointerOf(lm) {
  const tip = lm[8];
  return { x: clamp01((1 - tip.x - BOX.x0) / (BOX.x1 - BOX.x0)), y: clamp01((tip.y - BOX.y0) / (BOX.y1 - BOX.y0)) };
}

export class HandGestures {
  // steady: frames a pose must last before it counts; zoomHold: ms a pinch is held before zooming starts;
  // zoomStep: how far (share of the picture's height) the hand moves for each zoom step.
  constructor({ steady = 3, zoomHold = 300, zoomStep = 0.07, swipeCool = 900 } = {}) {
    Object.assign(this, { steady, zoomHold, zoomStep, swipeCool });
    this.sx = new SwipeDetector({ axis: 'x', dist: 0.18, ms: 650, cool: swipeCool });
    this.sy = new SwipeDetector({ axis: 'y', dist: 0.16, ms: 650, cool: swipeCool });
    this.reset();
  }
  reset() {
    this.raw = null; this.count = 0; this.pose = null; this.palmAt = -1e9; this.pinchOn = false;
    this.pinchSince = 0; this.zooming = false; this.anchor = 0; this.coolUntil = 0; this.lostAt = 0;
    this.sx.reset(); this.sy.reset();
  }
  // t: ms; lm: 21 hand landmarks or null; asp: picture width / height.
  // Returns { hand, pose, pointer, events }: events is a list of 'left' | 'right' | 'scroll-down' | 'scroll-up' |
  // 'zoom-start' | 'zoom-in' | 'zoom-out' | 'zoom-end'.
  push(t, lm, asp = 16 / 9) {
    const events = [];
    if (!lm) {
      if (this.zooming && t - this.lostAt > 200) { this.zooming = false; events.push('zoom-end'); }
      if (!this.lostAt) this.lostAt = t;
      if (t - this.lostAt > 250) { this.pose = null; this.raw = null; this.count = 0; this.pinchOn = false; this.sx.reset(); this.sy.reset(); }
      return { hand: false, pose: this.pose, pointer: null, events };
    }
    this.lostAt = 0;
    const p = pose(lm, asp, this.pinchOn);
    this.pinchOn = p === 'pinch';
    if (p === this.raw) this.count++; else { this.raw = p; this.count = 1; }
    if (this.count >= this.steady && this.pose !== p) {
      if (this.zooming && p !== 'pinch') { this.zooming = false; events.push('zoom-end'); }
      this.pose = p;
      if (p === 'pinch') this.pinchSince = t;
    }
    // Swipes: only with an open palm (a moving pointing hand mustn't scroll). Fingers blur during a fast swipe,
    // so the palm counts for a moment after it was last seen clearly.
    if (p === 'palm') this.palmAt = t;
    const pc = palm(lm);
    if (t - this.palmAt < 300 && !this.zooming) {
      const h = this.sx.push(t, pc), v = this.sy.push(t, pc);
      if (t >= this.coolUntil) {
        const dir = h || (v === 'up' ? 'scroll-down' : v === 'down' ? 'scroll-up' : null); // swipe up = next part of the page
        if (dir) { events.push(dir); this.coolUntil = t + this.swipeCool; this.sx.reset(); this.sy.reset(); }
      }
    } else { this.sx.reset(); this.sy.reset(); }
    // Zoom: a pinch held still for a moment, then moved up (in) or down (out), one step per zoomStep.
    const mid = (lm[4].y + lm[8].y) / 2;
    if (this.pose === 'pinch') {
      if (!this.zooming && t - this.pinchSince >= this.zoomHold) { this.zooming = true; this.anchor = mid; events.push('zoom-start'); }
      else if (this.zooming) {
        while (this.anchor - mid >= this.zoomStep) { events.push('zoom-in'); this.anchor -= this.zoomStep; }
        while (mid - this.anchor >= this.zoomStep) { events.push('zoom-out'); this.anchor += this.zoomStep; }
      }
    }
    return { hand: true, pose: this.pose, pointer: pointerOf(lm), events };
  }
}

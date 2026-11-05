// Linger hand swipes: answer "Stuck on …?" without touching the mouse.
// Swipe your hand to your RIGHT = "Yes, explain"; to your LEFT = "No". (The mapping is in gaze.js.)
// Fed with MediaPipe hand landmarks (0–1 picture coordinates) for each camera frame while a question is open.

// Middle of the palm: wrist and the four knuckles.
export function palm(lm) {
  if (!lm || lm.length < 21) return null;
  const ids = [0, 5, 9, 13, 17];
  return { x: ids.reduce((s, i) => s + lm[i].x, 0) / ids.length, y: ids.reduce((s, i) => s + lm[i].y, 0) / ids.length };
}

export class SwipeDetector {
  // dist: how far the palm must travel across the picture (share of its width); ms: within this time;
  // slant: how much up/down movement is allowed for each bit sideways; cool: pause after a swipe.
  constructor({ dist = 0.2, ms = 700, slant = 0.6, cool = 1200, lost = 250 } = {}) {
    Object.assign(this, { dist, ms, slant, cool, lost, hist: [], until: 0, seen: 0 });
  }
  reset() { this.hist = []; }
  // t: time in ms; p: palm {x, y} or null when no hand is visible. Returns 'left' or 'right' (the person's own
  // left and right) once per swipe, otherwise null.
  push(t, p) {
    if (!p) { if (t - this.seen > this.lost) this.hist = []; return null; }
    this.seen = t;
    this.hist.push({ t, x: p.x, y: p.y });
    while (this.hist.length && t - this.hist[0].t > this.ms) this.hist.shift();
    if (t < this.until || this.hist.length < 3) return null;
    // Compare with the point in the window that is farthest sideways from where the hand is now.
    let best = null;
    for (const h of this.hist) if (!best || Math.abs(p.x - h.x) > Math.abs(p.x - best.x)) best = h;
    const dx = p.x - best.x, dy = p.y - best.y;
    if (Math.abs(dx) < this.dist || Math.abs(dy) > Math.abs(dx) * this.slant) return null;
    // Only count it while the hand is still moving that way (not on the way back).
    const prev = this.hist[this.hist.length - 2];
    if (Math.sign(p.x - prev.x) !== Math.sign(dx)) return null;
    this.hist = []; this.until = t + this.cool;
    // The camera picture isn't mirrored: moving to your right moves the hand to the left of the picture.
    return dx < 0 ? 'right' : 'left';
  }
}

// Linger gaze model: turns MediaPipe face + iris landmarks into a few numbers ("features"), learns how those
// numbers map to points on the screen during calibration, and smooths the result.
// Shared by the tracker (offscreen page), the calibration page and the tests.

// Landmark numbers in MediaPipe's face mesh. "Image-left" = the corner on the left of the camera picture.
const EYE_R = { a: 33, b: 133, up: 159, lo: 145, iris: [468, 469, 470, 471, 472] }; // a = outer, b = inner
const EYE_L = { a: 362, b: 263, up: 386, lo: 374, iris: [473, 474, 475, 476, 477] }; // a = inner, b = outer
export const BLINK = 0.45;
export const NAMES = ['exR', 'eyR', 'exL', 'eyL', 'openR', 'openL', 'lookH', 'lookV', 'yaw', 'pitch', 'roll', 'tx', 'ty', 'tz', 'ex2', 'ey2', 'exey'];

// Where the iris sits inside one eye, measured along the eye (x) and across it (y), in eye-widths.
// Measuring against the eye's own corners cancels out head tilt and distance from the camera.
function eye(P, e) {
  const a = P(e.a), b = P(e.b);
  const w = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / w, (b[1] - a[1]) / w], v = [-u[1], u[0]];
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ir = e.iris.map(P).reduce((s, p) => [s[0] + p[0] / e.iris.length, s[1] + p[1] / e.iris.length], [0, 0]);
  const d = [ir[0] - c[0], ir[1] - c[1]];
  const up = P(e.up), lo = P(e.lo);
  return { x: (d[0] * u[0] + d[1] * u[1]) / w, y: (d[0] * v[0] + d[1] * v[1]) / w, open: Math.hypot(lo[0] - up[0], lo[1] - up[1]) / w };
}

// Head turn (radians) and position (cm from the camera) from MediaPipe's 4×4 face matrix (column-major).
export function headPose(m) {
  if (!m || m.length < 16) return { yaw: 0, pitch: 0, roll: 0, tx: 0, ty: 0, tz: 0 };
  const R = (r, c) => m[c * 4 + r];
  return {
    yaw: Math.atan2(R(0, 2), R(2, 2)),
    pitch: Math.atan2(-R(1, 2), Math.hypot(R(0, 2), R(2, 2))),
    roll: Math.atan2(R(1, 0), R(1, 1)),
    tx: m[12], ty: m[13], tz: m[14]
  };
}

// lm: 478 landmarks {x, y} in 0–1; W, H: picture size; blend: {name: score}; matrix: 16 numbers.
export function features(lm, W, H, blend, matrix) {
  if (!lm || lm.length < 478) return null;
  const P = (i) => [lm[i].x * W, lm[i].y * H];
  const r = eye(P, EYE_R), l = eye(P, EYE_L);
  const b = (k) => (blend && blend[k]) || 0;
  const lookH = (b('eyeLookOutLeft') - b('eyeLookInLeft')) + (b('eyeLookInRight') - b('eyeLookOutRight'));
  const lookV = (b('eyeLookUpLeft') - b('eyeLookDownLeft')) + (b('eyeLookUpRight') - b('eyeLookDownRight'));
  const h = headPose(matrix);
  const ex = (r.x + l.x) / 2, ey = (r.y + l.y) / 2;
  const f = [r.x, r.y, l.x, l.y, r.open, l.open, lookH, lookV, h.yaw, h.pitch, h.roll, h.tx, h.ty, h.tz, ex * ex, ey * ey, ex * ey];
  return { f, blink: Math.max(b('eyeBlinkLeft'), b('eyeBlinkRight')), head: h };
}

// ---------- ridge regression ----------
// Solve A·x = b for a small symmetric matrix (Gaussian elimination with pivoting).
function solve(A, b, n) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const k = M[r][c] / d; if (k) for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j]; x[r] = s / (M[r][r] || 1e-12); }
  return x;
}
const zrow = (m, f) => { const z = f.map((v, i) => (v - m.mu[i]) / m.sd[i]); z.push(1); return z; };
function stats(rows, d) {
  const A = Array.from({ length: d }, () => new Array(d).fill(0)), bx = new Array(d).fill(0), by = new Array(d).fill(0);
  let wsum = 0;
  for (const { z, x, y, w } of rows) {
    wsum += w;
    for (let i = 0; i < d; i++) { const wi = w * z[i]; bx[i] += wi * x; by[i] += wi * y; for (let j = i; j < d; j++) A[i][j] += wi * z[j]; }
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  return { A, bx, by, wsum };
}
function coef(S, lam, d) {
  const A = S.A.map((row, i) => row.map((v, j) => v + (i === j && i < d - 1 ? lam : 0))); // the last column (bias) isn't penalized
  return { cx: solve(A, S.bx, d), cy: solve(A, S.by, d) };
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const sub = (S, T, d) => ({ A: S.A.map((row, i) => row.map((v, j) => v - T.A[i][j])), bx: S.bx.map((v, i) => v - T.bx[i]), by: S.by.map((v, i) => v - T.by[i]), wsum: S.wsum - T.wsum, d });

// Drop blinks and frames where the eyes were clearly elsewhere (looking away, still moving to the dot).
export function cleanGroup(samples) {
  const ok = samples.filter((s) => !(s.blink > BLINK));
  if (ok.length < 4) return ok;
  const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
  const gx = ok.map((s) => (s.f[0] + s.f[2]) / 2), gy = ok.map((s) => (s.f[1] + s.f[3]) / 2);
  const mx = med(gx), my = med(gy);
  const dist = ok.map((s, i) => Math.hypot(gx[i] - mx, gy[i] - my));
  const cut = med(dist) * 3 + 1e-4;
  return ok.filter((s, i) => dist[i] <= cut);
}

// The model only uses a few of the features: both eyes averaged, how open they are, MediaPipe's own look-direction
// scores, and how the head is turned. Fewer inputs = it can't overfit the 20 setup dots (tested on recorded setups:
// typical error 141 → 79 px compared with using all 17).
export function reduce(f) {
  return [(f[0] + f[2]) / 2, (f[1] + f[3]) / 2, (f[4] + f[5]) / 2, f[6], f[7], f[8], f[9]];
}
const inputs = (m, f) => (m.v >= 3 ? reduce(f) : f);
const median = (a) => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };

// One sample per dot: the median of its frames (steadier than fitting every noisy frame).
function perDot(samples) {
  const by = new Map();
  for (const s of samples) { if (!by.has(s.g)) by.set(s.g, []); by.get(s.g).push(s); }
  return [...by.entries()].map(([g, ss]) => ({ g, x: ss[0].x, y: ss[0].y, w: 1, raw: ss[0].f.map((_, i) => median(ss.map((s) => s.f[i]))) }));
}

// Ridge regression from features to screen x, y. The amount of smoothing (lambda) is picked by leaving each dot out
// in turn and checking how well the rest predict it.
function ridge(dots) {
  const k = dots[0].f.length, d = k + 1;
  const mu = new Array(k).fill(0), sd = new Array(k).fill(0);
  dots.forEach((s) => s.f.forEach((v, i) => { mu[i] += v / dots.length; }));
  dots.forEach((s) => s.f.forEach((v, i) => { sd[i] += (v - mu[i]) ** 2 / dots.length; }));
  for (let i = 0; i < k; i++) sd[i] = Math.sqrt(sd[i]) > 1e-9 ? Math.sqrt(sd[i]) : 1;
  const m = { mu, sd };
  const rows = dots.map((s) => ({ z: zrow(m, s.f), x: s.x, y: s.y, w: s.w, g: s.g }));
  const S = stats(rows, d);
  const groups = [...new Set(rows.map((r) => r.g))];
  const per = new Map(groups.map((g) => [g, stats(rows.filter((r) => r.g === g), d)]));
  let best = null;
  for (const kk of [1e-4, 3e-4, 1e-3, 3e-3, 0.01, 0.03, 0.1, 0.3]) {
    const lam = kk * S.wsum;
    let err = 0, n = 0;
    if (groups.length >= 5) {
      for (const g of groups) {
        const c = coef(sub(S, per.get(g), d), lam, d);
        for (const r of rows) if (r.g === g) { err += Math.hypot(dot(c.cx, r.z) - r.x, dot(c.cy, r.z) - r.y); n++; }
      }
    }
    const e = n ? err / n : 0;
    if (!best || e < best.e) best = { lam, e };
    if (!n) break;
  }
  const c = coef(S, best.lam, d);
  return { mu, sd, lam: best.lam, cvErr: Math.round(best.e), cx: c.cx, cy: c.cy, A: S.A, bx: S.bx, by: S.by, wsum: S.wsum };
}

// samples: [{ f, x, y, g (which dot) }] with x, y in screen pixels, f = the full features() list.
export function fit(samples) {
  const dots = perDot(samples).map((s) => ({ ...s, f: reduce(s.raw) }));
  let use = dots, m = ridge(dots);
  // Drop dots that clearly don't fit the rest (head moved, looked away) and fit again.
  if (dots.length >= 10) {
    const err = dots.map((s) => { const z = zrow(m, s.f); return Math.hypot(dot(m.cx, z) - s.x, dot(m.cy, z) - s.y); });
    const cut = Math.max(120, median(err) * 2.5);
    const keep = dots.filter((_, i) => err[i] <= cut);
    if (keep.length < dots.length && keep.length >= 10) { use = keep; m = ridge(keep); }
  }
  // How far the head may move from where it was during calibration before accuracy suffers.
  const hv = (i) => { const v = use.map((s) => s.raw[i]); const a = v.reduce((p, q) => p + q, 0) / v.length; return [a, Math.sqrt(v.reduce((p, q) => p + (q - a) ** 2, 0) / v.length)]; };
  return { v: 3, ...m, head: { tx: hv(11), ty: hv(12), tz: hv(13) }, points: use.length, dropped: dots.length - use.length, n: samples.length };
}

export function predict(m, f) { const z = zrow(m, inputs(m, f)); return [dot(m.cx, z), dot(m.cy, z)]; }

// Keep learning after calibration (from clicks and confirmed words): add samples and refit, keeping the same scale.
// The frames of one call count together as one dot (times its weight), like a setup dot.
export function learn(m, samples) {
  if (!samples.length) return m;
  const d = m.cx.length, n = m.v >= 3 ? samples.length : 1;
  const T = stats(samples.map((s) => ({ z: zrow(m, inputs(m, s.f)), x: s.x, y: s.y, w: (s.w || 1) / n })), d);
  for (let i = 0; i < d; i++) { m.bx[i] += T.bx[i]; m.by[i] += T.by[i]; for (let j = 0; j < d; j++) m.A[i][j] += T.A[i][j]; }
  m.wsum += T.wsum;
  const c = coef(m, m.lam, d);
  m.cx = c.cx; m.cy = c.cy;
  return m;
}

// 'ok', or 'moved' when the head is far from where it was during calibration (cm).
export function headCheck(m, h) {
  if (!m || !m.head || !h) return 'ok';
  const far = (v, [a, s], min) => Math.abs(v - a) > Math.max(min, 3 * s);
  return far(h.tz, m.head.tz, 12) || far(h.tx, m.head.tx, 9) || far(h.ty, m.head.ty, 7) ? 'moved' : 'ok';
}

// Blink gate. MediaPipe only flags a blink once the eyes are nearly shut; the frames while the lids close and open
// look like "looking down" and threw the gaze to the bottom of the screen. So: a frame also counts as a blink when the
// eyes are much less open than they usually are for this person (median of the last ~second), frames are held back
// a little so the lead-in to a blink can be dropped, and a few frames after each blink are skipped.
export class BlinkGate {
  constructor({ delay = 2, after = 3, drop = 0.7 } = {}) { Object.assign(this, { delay, after, drop, buf: [], opens: [], hold: 0 }); }
  reset() { this.buf = []; this.hold = 0; }
  // frame: { f, blink (MediaPipe's blink score 0–1), ... }. Returns the frames that are safe to use (maybe none).
  push(frame) {
    const open = (frame.f[4] + frame.f[5]) / 2;
    const s = this.opens.slice().sort((a, b) => a - b), base = s.length >= 10 ? s[Math.floor(s.length / 2)] : 0;
    if (frame.blink > BLINK || (base && open < base * this.drop)) { this.buf = []; this.hold = this.after; return []; }
    if (this.hold > 0) { this.hold--; return []; }
    this.opens.push(open); if (this.opens.length > 30) this.opens.shift();
    this.buf.push(frame);
    return this.buf.length > this.delay ? [this.buf.shift()] : [];
  }
}

// One Euro filter: smooths small jitter strongly but follows fast eye jumps quickly.
export class OneEuro {
  constructor(minCutoff = 0.8, beta = 0.004, dCutoff = 1) { Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: 0, t: 0 }); }
  static a(cut, dt) { const tau = 1 / (2 * Math.PI * cut); return 1 / (1 + tau / dt); }
  reset() { this.x = null; this.dx = 0; }
  filter(v, t) {
    if (this.x === null || t - this.t > 0.5) { this.x = v; this.dx = 0; this.t = t; return v; }
    const dt = Math.max(1e-3, t - this.t); this.t = t;
    const dx = (v - this.x) / dt;
    this.dx += OneEuro.a(this.dCutoff, dt) * (dx - this.dx);
    const cut = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.a(cut, dt) * (v - this.x);
    return this.x;
  }
}

// Screen ⇄ page conversions. Screen points are in screen pixels at 100% zoom (what calibration records).
export function pageToScreen(win, x, y, zoom = 1) {
  return [win.screenX + (win.outerWidth - win.innerWidth * zoom) / 2 + x * zoom, win.screenY + (win.outerHeight - win.innerHeight * zoom) + y * zoom];
}
export function screenToPage(win, sx, sy, zoom = 1) {
  return [(sx - win.screenX - (win.outerWidth - win.innerWidth * zoom) / 2) / zoom, (sy - win.screenY - (win.outerHeight - win.innerHeight * zoom)) / zoom];
}

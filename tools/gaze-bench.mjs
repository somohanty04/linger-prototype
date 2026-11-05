// Measures eye-tracking accuracy offline from "Save test data" files (setup page → result screen).
// Usage: node tools/gaze-bench.mjs linger-gaze-*.json
// For each file it reports, in screen pixels:
//   offset = how far the typical (median) gaze lands from the dot  → accuracy (fix with a better model)
//   jitter = how much the gaze shakes around its own median         → precision (fix with smoothing / better features)
// "check dots" = the 5 green dots the model never trained on; "leave-one-out" = each of the 25 dots, predicted by a model
// trained on the other 24 (more dots, so a steadier number).
import { readFileSync } from 'node:fs';
import { fit, predict, cleanGroup, OneEuro } from '../extension/gazemodel.mjs';

const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const groups = (pts, base = 0) => pts.map((p, i) => ({ g: base + i, sx: p.sx, sy: p.sy, fr: cleanGroup(p.frames) })).filter((p) => p.fr.length >= 4);
const samplesOf = (gs) => gs.flatMap((p) => p.fr.map((s) => ({ f: s.f, x: p.sx, y: p.sy, g: p.g })));

// Score one dot: offset of the median prediction, and jitter of the smoothed per-frame predictions.
function score(model, p) {
  const ps = p.fr.map((s) => predict(model, s.f));
  const mx = med(ps.map((q) => q[0])), my = med(ps.map((q) => q[1]));
  const fx = new OneEuro(), fy = new OneEuro();
  const sm = ps.map((q, i) => [fx.filter(q[0], i / 30), fy.filter(q[1], i / 30)]).slice(3);
  return {
    off: Math.hypot(mx - p.sx, my - p.sy), offY: Math.abs(my - p.sy),
    jit: med(ps.map((q) => Math.hypot(q[0] - mx, q[1] - my))), jitSm: med(sm.map((q) => Math.hypot(q[0] - mx, q[1] - my)))
  };
}
const row = (name, ss) => console.log(`  ${name.padEnd(14)} offset ${String(Math.round(med(ss.map((s) => s.off)))).padStart(4)}px (up/down ${String(Math.round(med(ss.map((s) => s.offY)))).padStart(3)}px)   jitter raw ${String(Math.round(med(ss.map((s) => s.jit)))).padStart(4)}px, smoothed ${String(Math.round(med(ss.map((s) => s.jitSm)))).padStart(4)}px   (${ss.length} dots)`);

for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, 'utf8'));
  const cal = groups(d.cal), val = groups(d.val, 100), all = [...cal, ...val];
  console.log(`\n${file}  screen ${d.screen.w}×${d.screen.h} @${d.screen.dpr}x  setup said: ${d.acc ? d.acc.err + 'px' : '?'}`);
  const m = fit(samplesOf(cal));
  row('check dots', val.map((p) => score(m, p)));
  row('leave-one-out', all.map((p) => score(fit(samplesOf(all.filter((q) => q !== p))), p)));
}

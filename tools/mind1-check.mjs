// minD1 of src/ias/reg.js against the exact pericentre distance. minD1 is the smallest chain distance seen at the ends of the macro-steps (it is not interpolated), so it is at or above the true
// closest approach of the piece. Test: the equal-mass pair on the ellipse with a = 1 and the periapsis distance q (mu = 2), started at 40 phases before the pericentre (the eccentric anomaly -u0, with u0
// from 0.05 to 0.55 in 40 equal steps) and integrated for the time that takes the pair from -u0 to +u0 (from the Kepler equation M = u - e sin u divided by n = sqrt(2)), so every piece has the pericentre
// in its middle and the true closest approach is q.
// node tools/mind1-check.mjs OUT.json [q ...]       default q = 1e-3, 5e-4, 1e-5, 1e-8. OUT.json must be new.
// Writes for each q the 40 values minD1 / q (the start phases, the number of macro-steps) and their smallest, median and largest.
import fs from 'fs';
import { flowChain } from '../src/ias/reg.js';

const out = process.argv[2];
if (!out || fs.existsSync(out)) { console.error('usage: node tools/mind1-check.mjs OUT.json [q ...] (OUT.json must be new)'); process.exit(2); }
const qs = process.argv.length > 3 ? process.argv.slice(3).map(Number) : [1e-3, 5e-4, 1e-5, 1e-8];
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const pairState = (q, u) => {
  const e = 1 - q, r = 1 - e * Math.cos(u), k = Math.sqrt(2) / r, s = Math.sqrt(1 - e * e);
  const rel = [Math.cos(u) - e, s * Math.sin(u)], vrel = [-k * Math.sin(u), k * s * Math.cos(u)];
  return [-rel[0] / 2, -rel[1] / 2, rel[0] / 2, rel[1] / 2, -vrel[0] / 2, -vrel[1] / 2, vrel[0] / 2, vrel[1] / 2];
};
const res = [];
for (const q of qs) {
  const e = 1 - q, rows = [];
  for (let i = 0; i < 40; i++) {
    const u0 = 0.05 + 0.5 * i / 39, tau = 2 * (u0 - e * Math.sin(u0)) / Math.SQRT2;
    const r = flowChain([1, 1], pairState(q, -u0), tau, { settings });
    if (!r.ok) { rows.push({ u0, ok: false, reason: r.reason }); continue; }
    rows.push({ u0, tau, minD1_over_q: r.minD1 / q, macro: r.macro });
  }
  const v = rows.filter((x) => x.ok !== false).map((x) => x.minD1_over_q).sort((a, b) => a - b);
  const item = { q, phases: 40, finished: v.length, smallest: v[0], median: v[Math.floor(v.length / 2)], largest: v[v.length - 1], rows };
  res.push(item);
  console.log(`q = ${q}: minD1/q smallest ${item.smallest.toPrecision(4)}, median ${item.median.toPrecision(4)}, largest ${item.largest.toPrecision(4)} (${v.length} of 40 finished)`);
}
fs.writeFileSync(out, JSON.stringify({ what: 'minD1 of reg.js divided by the exact pericentre distance q, pair on an ellipse with a = 1, 40 start phases (tools/mind1-check.mjs); minD1 is the smallest chain distance at the ends of the macro-steps', results: res }, null, 1));

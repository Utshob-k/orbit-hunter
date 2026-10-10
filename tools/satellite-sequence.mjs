// the sequence of periodic orbits on the upper branch of the satellites of Broucke's R family, n = 5 up (data/branch-points/<n>-upper.json, k = 1): T* and L* of the zero of
// theta, whether the satellite continuation reached it, the largest multiplier (data/satellite-candidates.json, tools/satellite-candidates.mjs --write), the closure of the double
// precision zero, the closest approach of the zero in the units of its start and in a scale free form (closest approach times |E|, the same in both senses; the start units differ
// between the senses because the two senses reach the same orbit at its two collinear moments), and two predictions that were written down before n = 13 to 20 were run:
//   B:  T*(n) = n T*_R(n) - delta(n), n T*_R(n) from the crossing of nu = 1/n (upper nu) on the stored trace, delta(n) = a + b / n fitted on n = 8 to 20 (so the prediction is a fit
//       there and a test only for n >= 21)
//   the largest multiplier from n = 20 on: m(n) = m(20) + 0.85 (n - 20)
// node tools/satellite-sequence.mjs
import fs from 'fs';
import { perpInitial } from '../src/perp.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const trace = read('r-family-trace.json').curve, cands = read('satellite-candidates.json').orbits;
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
const energy = (s) => { let e = 0; for (let i = 0; i < 3; i++) { e += 0.5 * (s[6 + 2 * i] ** 2 + s[7 + 2 * i] ** 2); for (let j = i + 1; j < 3; j++) e -= 1 / Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]); } return e; };
function memberT(n) {        // n T* of the member with the upper nu = 1/n, interpolated between two accepted steps of the trace
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i], b = trace[i + 1];
    if (!stable(a) || !stable(b)) continue;
    const da = a.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n, db = b.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n;
    if (da * db < 0) return n * (a.Tstar + (da / (da - db)) * (b.Tstar - a.Tstar));
  }
  return null;
}
const rows = [];
for (let n = 5; n <= 80; n++) {
  const f = new URL(`../data/branch-points/${n}-upper.json`, import.meta.url);
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8')), zs = d.satellite.filter((s) => s.zero);
  const row = { n, reached: zs.length, senses: d.satellite.map((s) => s.why) };
  if (zs.length) {
    const z = zs[0].zero, c = cands.find((o) => o.multiplier !== undefined && parseFloat(o.label.slice(3)) === Number(z.Tstar.toFixed(4)));      // the label starts with T* to 4 digits
    Object.assign(row, { T: z.Tstar, L: z.Lstar, closure: Math.max(...zs.map((s) => s.zero.closure)), mult: c ? c.multiplier : null, minDistUnits: Math.min(...zs.map((s) => s.zero.minDist)), nT: memberT(n) });
    row.scaleFree = z.minDist * Math.abs(energy(perpInitial(z.u1, z.u2, z.lam)));
  }
  rows.push(row);
}
const fit = rows.filter((r) => r.T && r.n >= 8 && r.n <= 20);
const dl = (r) => r.nT - r.T, X = fit.map((r) => 1 / r.n), Y = fit.map(dl), mx = X.reduce((a, b) => a + b) / X.length, my = Y.reduce((a, b) => a + b) / Y.length;
const b1 = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / X.reduce((s, x) => s + (x - mx) ** 2, 0), a1 = my - b1 * mx;
const m20 = (rows.find((r) => r.n === 20) || {}).mult;
console.log(`delta(n) = ${a1.toFixed(4)} + ${b1.toFixed(4)} / n (fit on n = 8 to 20), largest multiplier at n = 20: ${m20 && m20.toFixed(3)}`);
console.log('n | zero reached in | T* | L* | B (T*) | zero - B | largest multiplier | linear from n = 20 | closure (double) | closest approach (start units) | closest approach x |E|');
for (const r of rows) {
  if (!r.T) { console.log(`${r.n} | no rotation 0 (${r.senses.join('; ')})`); continue; }
  const B = r.nT - (a1 + b1 / r.n);
  console.log([r.n, r.reached + ' of 2 senses', r.T.toFixed(5), r.L.toFixed(5), B.toFixed(3), (r.T - B).toFixed(4), r.mult === null ? '?' : r.mult.toFixed(3), r.n >= 20 && m20 ? (m20 + 0.85 * (r.n - 20)).toFixed(2) : '', r.closure.toExponential(1), r.minDistUnits.toFixed(3), r.scaleFree.toFixed(4)].join(' | '));
}

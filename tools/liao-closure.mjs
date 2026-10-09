// do the printed start values of Table 1 of Li, Tao, Li and Liao 2025 return rotated by the printed theta after the printed period T?
// each row is integrated with Dormand-Prince 5(4) and with Gragg-Bulirsch-Stoer (both with tolerance 1e-13) from the printed 8 digits, with no solver of mine in between.
// the state is moved to the centre of mass frame first (the rotation of the paper is about the centre of mass). reported per row:
//   dTheta: largest difference of a position or velocity component between the end state and the start rotated by the printed theta (the d of the paper, < 1e-6 is their criterion)
//   dBest:  the same with the best rotation instead of the printed one, and that best angle
//   T*, L*: from the printed numbers themselves
//   choreography: does the state after T/3 equal the start rotated and relabelled by a cyclic permutation (the three bodies on one curve)?
// node tools/liao-closure.mjs      exits with 1 when a list is empty
import fs from 'fs';
import { dp45Step } from '../src/physics.js';
import { bsIntegrate } from '../src/bs.js';

let rows;
try { rows = JSON.parse(fs.readFileSync(new URL('../data/liao2025-table1.json', import.meta.url), 'utf8')).rows; }
catch (e) { console.error('this script needs data/liao2025-table1.json, the table of Li et al. 2025 typed in by the reader; it is not in this repository'); process.exit(1); }
if (rows.length !== 18) { console.error('expected 18 rows'); process.exit(1); }

function cmFrame(r) {
  const s = [r.y1, 0, 1, 0, 0, 0, r.y7, r.y8, r.y9, r.y10, r.y11, r.y12];
  const cx = (s[0] + s[2] + s[4]) / 3;
  for (let i = 0; i < 3; i++) s[2 * i] -= cx;
  return Float64Array.from(s);
}
function dp45(x0, T) {
  const s = Float64Array.from(x0); let t = 0, h = 1e-3;
  while (t < T - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, T - t), 1e-13, 1e-14, 0.01); if (dt === 0) return null; t += dt; h = hn; }
  return s;
}
const rot = (s, th) => {
  const c = Math.cos(th), sn = Math.sin(th), o = new Float64Array(12);
  for (let k = 0; k < 6; k++) { const x = s[2 * k], y = s[2 * k + 1]; o[2 * k] = c * x - sn * y; o[2 * k + 1] = sn * x + c * y; }
  return o;
};
const maxdiff = (a, b) => { let m = 0; for (let i = 0; i < 12; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
function bestRot(x, x0) {
  let C = 0, S = 0;
  for (let k = 0; k < 6; k++) { C += x[2 * k] * x0[2 * k] + x[2 * k + 1] * x0[2 * k + 1]; S += x[2 * k + 1] * x0[2 * k] - x[2 * k] * x0[2 * k + 1]; }
  return Math.atan2(S, C);   // x is about R(th) x0
}
const permute = (s, p) => { const o = new Float64Array(12); for (let i = 0; i < 3; i++) { o[2 * i] = s[2 * p[i]]; o[2 * i + 1] = s[2 * p[i] + 1]; o[6 + 2 * i] = s[6 + 2 * p[i]]; o[7 + 2 * i] = s[7 + 2 * p[i]]; } return o; };
const CYC = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
function energyL(x0) {
  let K = 0, U = 0, L = 0;
  for (let i = 0; i < 3; i++) { K += 0.5 * (x0[6 + 2 * i] ** 2 + x0[7 + 2 * i] ** 2); L += x0[2 * i] * x0[7 + 2 * i] - x0[2 * i + 1] * x0[6 + 2 * i]; }
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) U -= 1 / Math.hypot(x0[2 * i] - x0[2 * j], x0[2 * i + 1] - x0[2 * j + 1]);
  return { E: K + U, L };
}
let n = 0, nFail = 0;
for (const r of rows) {
  const x0 = cmFrame(r), { E, L } = energyL(x0);
  const out = {};
  for (const [name, f] of [['dp45', (x, T) => dp45(x, T)], ['bs', (x, T) => bsIntegrate(x, T, 1e-13)]]) {
    const x = f(x0, r.T);
    if (!x) { out[name] = null; continue; }
    const dTheta = maxdiff(x, rot(x0, r.theta));
    const th = bestRot(x, x0), dBest = maxdiff(x, rot(x0, th));
    out[name] = { dTheta, dBest, thBest: th };
    n++;
  }
  // choreography test with the Dormand-Prince state after T/3
  const y = dp45(x0, r.T / 3);
  let chor = Infinity;
  if (y) for (const p of CYC) { const z = permute(y, p); const th = bestRot(z, x0); chor = Math.min(chor, maxdiff(z, rot(x0, th))); }
  const ok = out.dp45 && out.bs && out.dp45.dTheta < 1e-6 && out.bs.dTheta < 1e-6;
  if (!ok) nFail++;
  const fmt = (o) => (o ? `dTheta ${o.dTheta.toExponential(1)}, best angle ${o.thBest.toFixed(6)} (printed ${r.theta.toFixed(6)}) dBest ${o.dBest.toExponential(1)}` : 'integration failed');
  console.log(`${r.family.padEnd(12)} L=${String(r.L).padEnd(5)} T*=${(r.T * Math.abs(E) ** 1.5).toFixed(5)} L*=${(Math.abs(L) * Math.abs(E) ** 0.5).toFixed(5)} | DP45: ${fmt(out.dp45)} | BS: ${fmt(out.bs)} | T/3 cyclic return ${chor.toExponential(1)} ${ok ? '' : ' <- above 1e-6'}`);
}
if (n === 0) { console.error('compared zero integrations'); process.exit(1); }
console.log(`rows above the paper's own criterion of 1e-6 with either integrator: ${nFail} of ${rows.length}`);

// SPDX-License-Identifier: MIT
// the Jacobian of the ias-mode system of src/shooting.js (system(z, lam, 24): the residual F of the multiple shooting, its derivative J with respect to z = [u1, u2, t, 23 node states] and
// dF/dlam, assembled from the piece matrices of IAS15 / reg.js / the cross-check) against central differences of the residual F, at the first stored point of t35 - (data/deep/traces/t35m.json: lam, u1,
// u2, t; the node states are made here by integrating the 24 pieces one after the other from that start with the ias route, so F is the residual of the stored point, not zero). The point has a pair at
// 7.2e-7, so one piece is an encounter piece (reg.js) and its neighbours are cross-checked pieces.
// The columns taken: u1, u2, t, the 12 components of the start states of the encounter piece and of its two neighbours, and of the last node (the one that feeds the closing conditions); and lam. The central
// difference with the step h = 1e-7, combined with 2h by Richardson extrapolation. PASS if for every column taken the largest |J - J_fd| over the 279 rows is at most 1e-8 max|J| (the printed value is the
// result on the machine of the run). needs python with rebound and mpmath, takes a few minutes.
import fs from 'fs';
process.env.ORBIT_INTEGRATOR = 'ias';
process.env.PYTHONDONTWRITEBYTECODE = '1';
const { settings } = await import('../src/settings.js');
const { system } = await import('../src/shooting.js');
const { iasPieces, gstats } = await import('../src/ias/bridge.js');
const { perpInitial } = await import('../src/perp.js');

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const trace = JSON.parse(fs.readFileSync(new URL('../data/deep/traces/t35m.json', import.meta.url), 'utf8'));
settings.ias.guardRatio = trace.guard_ratio;   // the settings of the run that made the trace
settings.ias.firstStep = 'legacy';
const p = trace.points[0], m = 24, N = 12, n = 3 + N * (m - 1), tau = p.t / m;
// the node states: the 24 pieces one after the other
const z = new Float64Array(n); z[0] = p.u1; z[1] = p.u2; z[2] = p.t;
let cur = perpInitial(p.u1, p.u2, p.lam);
for (let i = 0; i < m - 1; i++) { cur = iasPieces([cur], tau)[0]; z.set(cur, 3 + N * i); }
const base = system(z, p.lam, m);
let maxJ = 0; for (const row of base.J) for (const v of row) maxJ = Math.max(maxJ, Math.abs(v));
let maxFl = 0; for (const v of base.Flam) maxFl = Math.max(maxFl, Math.abs(v));
console.log(`first stored point of t35 -: lam ${p.lam}, residual sup|F| ${Math.max(...Array.from(base.F, Math.abs)).toExponential(2)}, max|J| ${maxJ.toExponential(2)}, max|dF/dlam| ${maxFl.toExponential(2)}`);
const F = (zz, lam) => system(zz, lam, m).F;
function column(j, h) {
  const at = (d) => { const zz = Float64Array.from(z); zz[j] += d; return F(zz, p.lam); };
  const a = at(h), b = at(-h), c = at(2 * h), d = at(-2 * h);
  return Float64Array.from(a, (_, i) => (4 * (a[i] - b[i]) / (2 * h) - (c[i] - d[i]) / (4 * h)) / 3);
}
// the pieces: piece i starts at the state s_i (s_0 from u1, u2, lam, s_i = node i - 1 of z)
const starts = [perpInitial(p.u1, p.u2, p.lam)]; for (let i = 1; i < m; i++) starts.push(z.subarray(3 + N * (i - 1), 3 + N * i));
const route = iasPieces(starts, tau), flagged = route.enc.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
console.log(`flagged (encounter) pieces ${flagged.join(', ')}; pieces with a reg.js matrix (flagged or replaced) ${route.mats.map((x, i) => (x ? i : -1)).filter((i) => i >= 0).join(', ')}`);
check('the point has an encounter piece', flagged.length >= 1);
const pieces = new Set([m - 1]); for (const f of flagged) for (const i of [f - 1, f, f + 1]) if (i >= 1 && i < m) pieces.add(i);
const cols = [0, 1, 2]; for (const i of [...pieces].sort((a, b) => a - b)) for (let k = 0; k < N; k++) cols.push(3 + N * (i - 1) + k);
let worst = 0, worstCol = -1;
for (const j of cols) {
  const fd = column(j, 1e-7); let d = 0;
  for (let i = 0; i < n; i++) d = Math.max(d, Math.abs(base.J[i][j] - fd[i]));
  if (d > worst) { worst = d; worstCol = j; }
}
check(`J equals central differences with Richardson (${cols.length} columns of ${n})`, worst <= 1e-8 * maxJ, `largest difference ${worst.toExponential(2)} = ${(worst / maxJ).toExponential(2)} max|J| at column ${worstCol}`);
const lamAt = (d) => F(z, p.lam + d);
const h = 1e-7, a = lamAt(h), b = lamAt(-h), c = lamAt(2 * h), d2 = lamAt(-2 * h);
let dl = 0; for (let i = 0; i < n; i++) dl = Math.max(dl, Math.abs(base.Flam[i] - (4 * (a[i] - b[i]) / (2 * h) - (c[i] - d2[i]) / (4 * h)) / 3 ));
check('dF/dlam equals central differences with Richardson', dl <= 1e-8 * Math.max(maxFl, 1), `largest difference ${dl.toExponential(2)} (max|dF/dlam| ${maxFl.toExponential(2)})`);
check('no guard tripped, no piece replaced by the cross-check', gstats.tripsTotal === 0, `trips ${gstats.tripsTotal}, replaced ${gstats.replaced}`);
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

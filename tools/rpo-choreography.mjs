// is the figure-eight solution of my continuation (tools/rpo.mjs, steps of 0.002 in L from the L = 0 row) still choreographic (the three bodies on one curve) at L = 0.02 and 0.05?
// the rows of Table 1 are choreographic up to L = 0.011 and not from L = 0.012 on (T/3 cyclic return, tools/liao-closure.mjs)
import fs from 'fs';
import { continueL, newton, startState, scaleFree, flowTo } from './rpo.mjs';
let rows;
try { rows = JSON.parse(fs.readFileSync(new URL('../data/liao2025-table1.json', import.meta.url), 'utf8')).rows; }
catch (e) { console.error('this script needs data/liao2025-table1.json, the table of Li et al. 2025 typed in by the reader; it is not in this repository'); process.exit(1); }
const r0 = rows.find((r) => r.family === 'figure-eight' && r.L === 0);
const u0 = [r0.y1, r0.y7, r0.y8, r0.y9, r0.y10, r0.T, r0.theta];
const rot = (s, th) => { const c = Math.cos(th), sn = Math.sin(th), o = new Float64Array(12); for (let k = 0; k < 6; k++) { o[2 * k] = c * s[2 * k] - sn * s[2 * k + 1]; o[2 * k + 1] = sn * s[2 * k] + c * s[2 * k + 1]; } return o; };
const permute = (s, p) => { const o = new Float64Array(12); for (let i = 0; i < 3; i++) { o[2 * i] = s[2 * p[i]]; o[2 * i + 1] = s[2 * p[i] + 1]; o[6 + 2 * i] = s[6 + 2 * p[i]]; o[7 + 2 * i] = s[7 + 2 * p[i]]; } return o; };
function cm(s) { const cx = (s[0] + s[2] + s[4]) / 3, o = Float64Array.from(s); for (let i = 0; i < 3; i++) o[2 * i] -= cx; return o; }
function chor(u) {
  const x0 = cm(startState(u)), y = cm(flowTo(startState(u), u[5] / 3));
  let best = Infinity;
  for (const p of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) {
    const z = permute(y, p); let C = 0, S = 0;
    for (let k = 0; k < 6; k++) { C += z[2 * k] * x0[2 * k] + z[2 * k + 1] * x0[2 * k + 1]; S += z[2 * k + 1] * x0[2 * k] - z[2 * k] * x0[2 * k + 1]; }
    const w = rot(x0, Math.atan2(S, C)); let m = 0; for (let i = 0; i < 12; i++) m = Math.max(m, Math.abs(z[i] - w[i])); best = Math.min(best, m);
  }
  return best;
}
const res = continueL(u0, 0, 0.05, 0.002, null);
if (!res.out.length) { console.error('continuation produced nothing'); process.exit(1); }
for (const L of [0.01, 0.012, 0.02, 0.05]) {
  const near = res.out.filter((o) => o.L <= L + 1e-12).pop();
  const sol = newton(near.u, L);
  if (!sol.ok) { console.log('L', L, 'no convergence'); continue; }
  const sf = scaleFree(sol.u);
  console.log(`my continuation at L = ${L}: E ${sf.E.toFixed(5)}, T* ${sf.Tstar.toFixed(6)}, L* ${sf.Lstar.toFixed(6)}, theta ${sf.theta.toFixed(6)}, T/3 cyclic return ${chor(sol.u).toExponential(1)}`);
}

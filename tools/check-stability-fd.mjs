// independent check of the stability code: the monodromy matrix from finite differences of the flow map instead of the
// variational equations. compares max |eigenvalue| of the nontrivial part with src/relative.js.
// node tools/check-stability-fd.mjs u1 u2 lam t
import { perpInitial } from '../src/perp.js';
import { dp45Step } from '../src/physics.js';
import { relativeStability } from '../src/relative.js';
import { reducedMonodromy, eigenvalues } from '../src/stability.js';

const [u1, u2, lam, t] = process.argv.slice(2).map(Number);
const T = 2 * t;
function flow(x0) {
  const s = Float64Array.from(x0);
  let tt = 0, h = 1e-3;
  while (tt < T - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, T - tt), 1e-13, 1e-14, 0.005); tt += dt; h = hn; }
  return s;
}
const x0 = perpInitial(u1, u2, lam);
const xe = flow(x0);
let C = 0, S = 0;
for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
  const ax = xe[off + 2 * i], ay = xe[off + 2 * i + 1], bx = x0[off + 2 * i], by = x0[off + 2 * i + 1];
  C += ax * bx + ay * by; S += ax * by - ay * bx;
}
const alpha = Math.atan2(S, C), c = Math.cos(alpha), sn = Math.sin(alpha);
const rot = (x) => { const o = new Float64Array(12); for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) { o[off + 2 * i] = c * x[off + 2 * i] - sn * x[off + 2 * i + 1]; o[off + 2 * i + 1] = sn * x[off + 2 * i] + c * x[off + 2 * i + 1]; } return o; };
const h = 1e-6;
const M = Array.from({ length: 12 }, () => new Array(12).fill(0));
for (let j = 0; j < 12; j++) {
  const xp = Float64Array.from(x0), xm = Float64Array.from(x0);
  xp[j] += h; xm[j] -= h;
  const fp = rot(flow(xp)), fm = rot(flow(xm));
  for (let i = 0; i < 12; i++) M[i][j] = (fp[i] - fm[i]) / (2 * h);
}
const ev = eigenvalues(reducedMonodromy(M)).map((e) => ({ re: e[0], im: e[1], mod: Math.hypot(e[0], e[1]) }));
const dev = (e) => Math.hypot(e.re - 1, e.im);
const non = [...ev].sort((a, b) => dev(a) - dev(b)).slice(4);
const fd = Math.max(...non.map((e) => e.mod));
const var_ = relativeStability(u1, u2, lam, t).maxMod;
console.log(`max|ev| finite differences ${fd.toFixed(6)}  variational ${var_.toFixed(6)}  relative difference ${(Math.abs(fd - var_) / var_).toExponential(1)}`);

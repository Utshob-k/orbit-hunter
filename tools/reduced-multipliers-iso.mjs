// nontrivial multipliers of a relatively periodic orbit with the isosceles start of src/iso.js (arguments p, w, h, t) by reduction, in double precision (class C: the same in tools/reduced-multipliers.mjs)
// (the method of tools/monodromy-mp.py without the multiple precision):
// the 4 x 4 block of the monodromy on W / span{v, g}, W = {dE = 0, dL = 0}, v = vector field, g = rotation generator, inside the 8 dimensional space of zero centre of mass and momentum.
// the rotation of the relative period is compensated as in src/relative.js. no eigenvalue is picked "closest to 1".
import { isoInitial as perpInitial } from '../src/iso.js';
import { monodromy, eigenvalues } from '../src/stability.js';

const to12 = (c) => [c[0], c[1], c[2], c[3], -(c[0] + c[2]), -(c[1] + c[3]), c[4], c[5], c[6], c[7], -(c[4] + c[6]), -(c[5] + c[7])];
const to8 = (u) => [u[0], u[1], u[2], u[3], u[6], u[7], u[8], u[9]];

function rotate12(x, a) {
  const c = Math.cos(a), s = Math.sin(a), out = new Array(12);
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) {
    const px = x[off + 2 * i], py = x[off + 2 * i + 1];
    out[off + 2 * i] = c * px - s * py; out[off + 2 * i + 1] = s * px + c * py;
  }
  return out;
}
function solveLin(A, b) {            // Gaussian elimination with partial pivoting, A n x n (array of arrays), b length n or n x m (array of arrays)
  const n = A.length, M = A.map((r, i) => [...r, ...(Array.isArray(b[i]) ? b[i] : [b[i]])]);
  const m = M[0].length - n;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; if (f !== 0) for (let k = c; k < n + m; k++) M[r][k] -= f * M[c][k]; }
  }
  const X = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let k = 0; k < m; k++) for (let r = n - 1; r >= 0; r--) { let s = M[r][n + k]; for (let c = r + 1; c < n; c++) s -= M[r][c] * X[c][k]; X[r][k] = s / M[r][r]; }
  return m === 1 ? X.map((r) => r[0]) : X;
}
function det(A) {
  const n = A.length, M = A.map((r) => [...r]); let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return 0;
    if (p !== c) { [M[c], M[p]] = [M[p], M[c]]; d = -d; }
    d *= M[c][c];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k < n; k++) M[r][k] -= f * M[c][k]; }
  }
  return d;
}
function field(x) {                  // d/dt of the 12 state
  const a = new Array(12).fill(0);
  for (let k = 0; k < 6; k++) a[k] = x[6 + k];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === j) continue;
    const dx = x[2 * j] - x[2 * i], dy = x[2 * j + 1] - x[2 * i + 1], r3 = Math.pow(dx * dx + dy * dy, 1.5);
    a[6 + 2 * i] += dx / r3; a[7 + 2 * i] += dy / r3;
  }
  return a;
}
function gradE(x) {
  const g = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === j) continue;
    const dx = x[2 * i] - x[2 * j], dy = x[2 * i + 1] - x[2 * j + 1], r3 = Math.pow(dx * dx + dy * dy, 1.5);
    g[2 * i] += dx / r3; g[2 * i + 1] += dy / r3;
  }
  for (let k = 0; k < 6; k++) g[6 + k] = x[6 + k];
  return g;
}
function gradL(x) {
  const g = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) { g[2 * i] = x[6 + 2 * i + 1]; g[2 * i + 1] = -x[6 + 2 * i]; g[6 + 2 * i] = -x[2 * i + 1]; g[6 + 2 * i + 1] = x[2 * i]; }
  return g;
}
function rotgen(x) {
  const g = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) { g[2 * i] = -x[2 * i + 1]; g[2 * i + 1] = x[2 * i]; g[6 + 2 * i] = -x[6 + 2 * i + 1]; g[6 + 2 * i + 1] = x[6 + 2 * i]; }
  return g;
}
const mx = (v) => v.reduce((a, b) => Math.max(a, Math.abs(b)), 0);

// returns { eig: [{mod, angle (turns, 0..1), re, im}], nus: [{nu, mod}] with nu in [0, 0.5], maxModDev, defect, Mv, Mg, alpha, kind }
export function reducedMultipliers(u1, u2, lam, t) {
  const x0 = Array.from(perpInitial(u1, u2, lam));
  const { M, end } = monodromy(x0, 2 * t);
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
    const ax = end[off + 2 * i], ay = end[off + 2 * i + 1], bx = x0[off + 2 * i], by = x0[off + 2 * i + 1];
    C += ax * bx + ay * by; S += ax * by - ay * bx;
  }
  const alpha = Math.atan2(S, C);
  const cols = []; for (let c = 0; c < 12; c++) cols.push(rotate12(M.map((row) => row[c]), alpha));
  const MR = (v) => { const out = new Array(12).fill(0); for (let c = 0; c < 12; c++) if (v[c] !== 0) for (let r = 0; r < 12; r++) out[r] += cols[c][r] * v[c]; return out; };
  const M8 = Array.from({ length: 8 }, () => new Array(8).fill(0));
  for (let k = 0; k < 8; k++) { const e = new Array(8).fill(0); e[k] = 1; const y = to8(MR(to12(e))); for (let r = 0; r < 8; r++) M8[r][k] = y[r]; }
  const M8mul = (u) => M8.map((row) => row.reduce((s, v, k) => s + v * u[k], 0));
  const v8 = to8(field(x0)), g8 = to8(rotgen(x0));
  const gE = gradE(x0), gL = gradL(x0), A = [new Array(8), new Array(8)];
  for (let k = 0; k < 8; k++) { const e = new Array(8).fill(0); e[k] = 1; const b = to12(e); A[0][k] = b.reduce((s, v, i) => s + v * gE[i], 0); A[1][k] = b.reduce((s, v, i) => s + v * gL[i], 0); }
  let best = null;
  for (let p1 = 0; p1 < 8; p1++) for (let p2 = p1 + 1; p2 < 8; p2++) { const d = Math.abs(A[0][p1] * A[1][p2] - A[0][p2] * A[1][p1]); if (!best || d > best[0]) best = [d, p1, p2]; }
  const [, p1, p2] = best, F = [0, 1, 2, 3, 4, 5, 6, 7].filter((k) => k !== p1 && k !== p2);
  const Ap = [[A[0][p1], A[0][p2]], [A[1][p1], A[1][p2]]], K = {};
  for (const j of F) { const s = solveLin(Ap, [-A[0][j], -A[1][j]]); const col = new Array(8).fill(0); col[j] = 1; col[p1] = s[0]; col[p2] = s[1]; K[j] = col; }
  const vF = F.map((j) => v8[j]), gF = F.map((j) => g8[j]);
  let bestS = null;
  const comb = (arr, k, start = 0, cur = [], out = []) => { if (cur.length === k) { out.push([...cur]); return out; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); comb(arr, k, i + 1, cur, out); cur.pop(); } return out; };
  for (const S4 of comb([0, 1, 2, 3, 4, 5], 4)) {
    const Q = Array.from({ length: 6 }, (_, r) => [vF[r], gF[r], ...S4.map((s) => (r === s ? 1 : 0))]);
    const d = Math.abs(det(Q)); if (!bestS || d > bestS[0]) bestS = [d, S4];
  }
  const Wv = bestS[1].map((s) => { const col = K[F[s]], n = mx(col); return col.map((x) => x / n); });
  const z1 = new Array(8).fill(0), z2 = new Array(8).fill(0); z1[p1] = 1; z2[p2] = 1;
  const colsB = [v8, g8, ...Wv, z1, z2], Bf = Array.from({ length: 8 }, (_, r) => colsB.map((c) => c[r]));
  const N = Array.from({ length: 4 }, () => new Array(4).fill(0));
  let defect = 0;
  Wv.forEach((w, i) => { const c = solveLin(Bf, M8mul(w)); for (let r = 0; r < 4; r++) N[r][i] = c[2 + r]; defect = Math.max(defect, Math.abs(c[6]), Math.abs(c[7])); });
  const cv = solveLin(Bf, M8mul(v8)), cg = solveLin(Bf, M8mul(g8));
  const Mv = Math.max(...cv.map((x, i) => Math.abs(x - (i === 0 ? 1 : 0)))), Mg = Math.max(...cg.map((x, i) => Math.abs(x - (i === 1 ? 1 : 0))));
  const ev = eigenvalues(N).map((e) => { const mod = Math.hypot(e[0], e[1]); let ang = Math.atan2(e[1], e[0]) / (2 * Math.PI); if (ang < 0) ang += 1; return { mod, angle: ang, re: e[0], im: e[1] }; }).sort((a, b) => a.angle - b.angle);
  const nus = ev.filter((e) => e.im >= 0).map((e) => ({ nu: Math.min(e.angle, 1 - e.angle), mod: e.mod })).sort((a, b) => a.nu - b.nu);
  const maxModDev = Math.max(...ev.map((e) => Math.abs(e.mod - 1)));
  const realOut = ev.filter((e) => Math.abs(e.im) < 1e-9 && Math.abs(e.mod - 1) > 1e-6).map((e) => (e.re > 0 ? 'real positive ' : 'real negative ') + e.mod.toFixed(5));
  const kind = maxModDev < 1e-6 ? 'all four on the unit circle (elliptic-elliptic)' : realOut.length ? 'outside the unit circle: ' + realOut.join(', ') : 'outside the unit circle (complex): max |mod - 1| ' + maxModDev.toExponential(2);
  return { eig: ev, nus, maxModDev, defect, Mv, Mg, alpha, kind, detN: det(N) };
}

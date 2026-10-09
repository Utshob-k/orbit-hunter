// follows a family of relative periodic orbits of the equal mass planar three body problem by pseudo arclength continuation, with a general (not mirror symmetric) start.
// unknowns u = (y1, v1x, v1y, v2x, v2y, T, theta): the bodies start on the x axis at (y1, 0), (1, 0), (0, 0) (this fixes the scale), v3 = -v1 - v2, and the state after T must equal
// the start turned by theta about the centre of mass (12 numbers, 6 of them independent). the solutions form a curve in u-space; L = y1 v1y + v2y is a function of u.
// every accepted point is stored with its start values u, T*, L*, theta, the closest approach of the orbit and the residual. L* = |L| |E|^0.5, T* = T |E|^1.5.
// the trace stops on: L* above lstarMax, a close approach (closest distance below 0.03), a step collapse (the arclength step stays below 5e-5 for 150 steps in a row, or below 1e-6),
// L turning negative when going down in L, or the step limit. folds in L (L turns back) are recorded and followed.
//
//   node tools/rpo-trace.mjs eight NAME DIR LSTARMAX         start from the figure-eight (built in), DIR = +1 or -1 in L
//   node tools/rpo-trace.mjs resume NAME TRACE.json INDEX DIR LSTARMAX    start from point INDEX of a trace file written by this tool
//   node tools/rpo-trace.mjs row NAME FAMILY L DIR LSTARMAX   start from a printed row of Li et al. 2025 (figure-eight or IA-3) in data/liao2025-table1.json, which is NOT in this repository
// writes data/rpo-trace-NAME.json (thinned: every 3rd point plus the first and last) and prints one line every 20 points
import fs from 'fs';
import { dp45Step } from '../src/physics.js';
import { syzygyWord } from '../src/topology.js';

const RTOL = 1e-13, ATOL = 1e-14;
// the figure-eight at a collinear moment of its orbit, bodies at -1, 0, 1 (shifted), refined by this code
const EIGHT = [-1, 0.3471168881, 0.5327249454, 0.3471168881, 0.5327249454, 6.325914, 0];

export function startState(u) {
  const [y1, v1x, v1y, v2x, v2y] = u;
  return Float64Array.from([y1, 0, 1, 0, 0, 0, v1x, v1y, v2x, v2y, -v1x - v2x, -v1y - v2y]);
}
export function scaleFree(u) {
  const s = startState(u), cx = (s[0] + s[2] + s[4]) / 3;
  const x = [s[0] - cx, s[2] - cx, s[4] - cx];
  let K = 0, U = 0, L = 0;
  for (let i = 0; i < 3; i++) { K += 0.5 * (s[6 + 2 * i] ** 2 + s[7 + 2 * i] ** 2); L += x[i] * s[7 + 2 * i]; }
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) U -= 1 / Math.abs(x[i] - x[j]);
  const E = K + U;
  return { Tstar: u[5] * Math.abs(E) ** 1.5, Lstar: Math.abs(L) * Math.abs(E) ** 0.5, E, L };
}
function flow(s0, T) {
  const s = Float64Array.from(s0);
  let t = 0, h = 1e-3, n = 0, minD = Infinity;
  while (t < T - 1e-15) {
    const [dt, hn] = dp45Step(s, Math.min(h, T - t), RTOL, ATOL, 0.01);
    t += dt; h = hn;
    if (++n > 4e6 || !(dt > 0)) return null;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) minD = Math.min(minD, Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]));
  }
  return { s, minD };
}
function rotated(s, th) {
  const cx = (s[0] + s[2] + s[4]) / 3, cy = (s[1] + s[3] + s[5]) / 3, c = Math.cos(th), sn = Math.sin(th), o = new Float64Array(12);
  for (let i = 0; i < 3; i++) {
    const x = s[2 * i] - cx, y = s[2 * i + 1] - cy;
    o[2 * i] = cx + c * x - sn * y; o[2 * i + 1] = cy + sn * x + c * y;
    const vx = s[6 + 2 * i], vy = s[7 + 2 * i];
    o[6 + 2 * i] = c * vx - sn * vy; o[7 + 2 * i] = sn * vx + c * vy;
  }
  return o;
}
function F(u) {
  const s0 = startState(u), r = flow(s0, u[5]);
  if (!r) return null;
  const I = rotated(s0, u[6]);
  return { f: Array.from(r.s, (v, i) => v - I[i]), minD: r.minD };
}
const Lof = (u) => u[0] * u[2] + u[4];
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}
function jac(u, f0) {
  const J = f0.map(() => new Array(7));
  for (let j = 0; j < 7; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(u[j])), up = Array.from(u), um = Array.from(u); up[j] += h; um[j] -= h;
    const a = F(up), b = F(um); if (!a || !b) return null;
    for (let i = 0; i < f0.length; i++) J[i][j] = (a.f[i] - b.f[i]) / (2 * h);
  }
  return J;
}
const JtJ = (J) => Array.from({ length: 7 }, (_, i) => Array.from({ length: 7 }, (_, j) => J.reduce((s, r) => s + r[i] * r[j], 0)));
function nullVector(J) {
  const A = JtJ(J); for (let i = 0; i < 7; i++) A[i][i] += 1e-10;
  let x = [1, 0.7, 0.3, 0.5, 0.2, 0.9, 0.4];
  for (let k = 0; k < 8; k++) { const y = solve(A, x); if (!y) return null; const n = Math.hypot(...y); x = y.map((v) => v / n); }
  return x;
}
// bring a start close to the curve: minimum norm Gauss-Newton on F = 0
function refine(u0) {
  let u = Array.from(u0);
  for (let it = 0; it < 12; it++) {
    const r = F(u); if (!r) return null;
    const res = Math.max(...r.f.map(Math.abs)); if (res < 1e-11) return { u, res };
    const J = jac(u, r.f); if (!J) return null;
    const A = JtJ(J); for (let i = 0; i < 7; i++) A[i][i] += 1e-12;
    const g = Array.from({ length: 7 }, (_, i) => -J.reduce((s, row, k) => s + row[i] * r.f[k], 0));
    const du = solve(A, g); if (!du) return null;
    const nrm = Math.hypot(...du), sc = nrm > 0.05 ? 0.05 / nrm : 1;
    u = u.map((v, i) => v + sc * du[i]);
  }
  const r = F(u); return { u, res: r ? Math.max(...r.f.map(Math.abs)) : Infinity };
}
function correct(upred, t) {
  let u = Array.from(upred);
  for (let it = 0; it < 10; it++) {
    const r = F(u); if (!r) return null;
    const res = Math.max(...r.f.map(Math.abs));
    const cons = t.reduce((s, v, i) => s + v * (u[i] - upred[i]), 0);
    if (res < 1e-10 && Math.abs(cons) < 1e-10) return { u, res, minD: r.minD, iters: it };
    const J = jac(u, r.f); if (!J) return null;
    const A = JtJ(J); for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) A[i][j] += t[i] * t[j];
    for (let i = 0; i < 7; i++) A[i][i] += 1e-14;
    const g = Array.from({ length: 7 }, (_, i) => -J.reduce((s, row, k) => s + row[i] * r.f[k], 0) - t[i] * cons);
    const du = solve(A, g); if (!du) return null;
    const nrm = Math.hypot(...du); if (nrm > 0.1) return null;
    u = u.map((v, i) => v + du[i]);
  }
  const r = F(u); if (!r) return null;
  const res = Math.max(...r.f.map(Math.abs));
  return res < 1e-8 ? { u, res, minD: r.minD, iters: 10 } : null;
}

function trace(name, uStart, dir, lmax) {
  const ref = refine(uStart);
  if (!ref || ref.res > 1e-9) { console.error('could not refine the start', ref && ref.res); process.exit(1); }
  const path = [];
  let u = ref.u, r0 = F(u), t = nullVector(jac(u, r0.f));
  const gradL = [u[2], 0, u[0], 0, 1, 0, 0];
  if (t.reduce((s, v, i) => s + v * gradL[i], 0) * dir < 0) t = t.map((v) => -v);
  let h = 0.01, why = '', lastL = Lof(u), lastDL = 0, s = 0, small = 0;
  const folds = [];
  const record = (u, res, minD, s) => { const sf = scaleFree(u); path.push({ s, L: Lof(u), Lstar: sf.Lstar, Tstar: sf.Tstar, theta: u[6], minD, res, u: Array.from(u) }); };
  record(u, ref.res, r0.minD, 0);
  for (let step = 1; step <= 12000; step++) {
    let acc = null;
    while (h >= 1e-6) {
      acc = correct(u.map((v, i) => v + h * t[i]), t);
      if (acc && acc.u.every(Number.isFinite)) break;
      acc = null; h /= 2;
    }
    if (!acc) { why = `step collapse (arclength step below 1e-6) at L = ${Lof(u).toFixed(6)}, L* = ${scaleFree(u).Lstar.toFixed(5)}`; break; }
    const du = acc.u.map((v, i) => v - u[i]);
    const Jn = jac(acc.u, F(acc.u).f); let tn = Jn ? nullVector(Jn) : null;
    if (!tn) { why = 'tangent failed at L = ' + Lof(acc.u).toFixed(6); break; }
    if (tn.reduce((q, v, i) => q + v * t[i], 0) < 0) tn = tn.map((v) => -v);
    u = acc.u; t = tn; s += Math.hypot(...du);
    record(u, acc.res, acc.minD, s);
    const p = path[path.length - 1], dL = p.L - lastL;
    if (lastDL !== 0 && dL * lastDL < 0) folds.push({ L: lastL, Lstar: path[path.length - 2].Lstar, step });
    if (dL !== 0) lastDL = dL; lastL = p.L;
    h = acc.iters <= 3 ? Math.min(h * 1.4, 0.04) : acc.iters > 5 ? h * 0.7 : h;
    small = h < 5e-5 ? small + 1 : 0;
    if (step % 20 === 0) console.log(`step ${step} s ${s.toFixed(3)} L ${p.L.toFixed(5)} L* ${p.Lstar.toFixed(5)} T* ${p.Tstar.toFixed(5)} theta ${p.theta.toFixed(5)} minD ${p.minD.toFixed(4)} res ${p.res.toExponential(1)} h ${h.toExponential(1)}`);
    if (p.Lstar > lmax) { why = `reached L* = ${p.Lstar.toFixed(4)} (the limit asked for)`; break; }
    if (dir < 0 && p.L < 0) { why = `L became negative at L* = ${p.Lstar.toFixed(5)}: the trace went through L = 0`; break; }
    if (p.minD < 0.03) { why = `close approach: the closest distance in the orbit is ${p.minD.toFixed(4)} at L = ${p.L.toFixed(5)}, L* = ${p.Lstar.toFixed(5)}`; break; }
    if (small >= 150) { why = `step collapse (the arclength step stayed below 5e-5 for 150 steps) at L = ${p.L.toFixed(5)}, L* = ${p.Lstar.toFixed(5)}, T* = ${p.Tstar.toFixed(5)}, theta = ${p.theta.toFixed(5)}, closest distance ${p.minD.toFixed(4)}`; break; }
    if (step === 12000) why = 'step limit';
  }
  // syzygy words at a few points
  const marks = [];
  for (let k = 0; k < path.length; k += Math.max(1, Math.floor(path.length / 12))) { const p = path[k]; const w = syzygyWord(startState(p.u), p.u[5]); marks.push({ k, L: p.L, Lstar: p.Lstar, word: w && w.word, syz: w && w.length }); }
  // thin the stored path: every 3rd point, plus the first and the last; numbers to 10 significant digits
  const r10 = (x) => Number(x.toPrecision(10));
  const keep = path.filter((p, i) => i % 3 === 0 || i === path.length - 1).map((p) => ({ s: r10(p.s), L: r10(p.L), Lstar: r10(p.Lstar), Tstar: r10(p.Tstar), theta: r10(p.theta), minD: r10(p.minD), res: Number(p.res.toPrecision(2)), u: p.u.map(r10) }));
  fs.writeFileSync(new URL(`../data/rpo-trace-${name}.json`, import.meta.url), JSON.stringify({ name, why, steps: path.length - 1, storedEvery: 3, folds, marks, path: keep }));
  console.log('stopped:', why, '| points', path.length, '(stored', keep.length, ') | L* from', path[0].Lstar.toFixed(5), 'to', path[path.length - 1].Lstar.toFixed(5), '| folds in L:', folds.length);
}

if (process.argv[1] && process.argv[1].endsWith('rpo-trace.mjs')) {
  const [mode, name, ...a] = process.argv.slice(2);
  if (mode === 'eight') trace(name, EIGHT, Number(a[0]) >= 0 ? 1 : -1, Number(a[1]) || 0.3);
  else if (mode === 'resume') {
    const d = JSON.parse(fs.readFileSync(a[0], 'utf8')), p = d.path[Number(a[1])];
    if (!p) { console.error('no such point in the trace file'); process.exit(1); }
    trace(name, p.u, Number(a[2]) >= 0 ? 1 : -1, Number(a[3]) || 0.3);
  } else if (mode === 'row') {
    let rows;
    try { rows = JSON.parse(fs.readFileSync(new URL('../data/liao2025-table1.json', import.meta.url), 'utf8')).rows; }
    catch (e) { console.error('row mode needs data/liao2025-table1.json, the table of Li et al. 2025 typed in by the reader; it is not in this repository'); process.exit(1); }
    const row = rows.find((r) => r.family === a[0] && Math.abs(r.L - Number(a[1])) < 1e-9);
    if (!row) { console.error('no such row'); process.exit(1); }
    trace(name, [row.y1, row.y7, row.y8, row.y9, row.y10, row.T, row.theta], Number(a[2]) >= 0 ? 1 : -1, Number(a[3]) || 0.3);
  } else console.error('usage: see the top of this file');
}

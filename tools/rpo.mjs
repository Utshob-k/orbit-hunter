// relative periodic orbits with a general (not mirror symmetric) start, to reproduce Table 1 of Li, Tao, Li and Liao 2025 and to continue their IA-3 orbit in L.
// start as in the paper: bodies on the x axis at (y1, 0), (1, 0), (0, 0), velocities (v1x, v1y), (v2x, v2y), v3 = -v1 - v2 (zero total momentum, so the centre of mass rests).
// unknowns u = (y1, v1x, v1y, v2x, v2y, T, theta); conditions: the state after T equals the start rotated by theta about the centre of mass (12 numbers, 6 of them independent)
// and L = y1 v1y + v2y has the wanted value (13 equations). Gauss-Newton with finite difference Jacobian (double precision), continuation in L.
// node tools/rpo.mjs reproduce [fam]    the rows of Table 1 at L = 0.02, 0.05 (figure-eight) and 0.05, 0.10 (IA-3), only one family if given
// node tools/rpo.mjs theta fam target   continue the family fam (figure-eight or IA-3) in L until theta = target (a rational multiple of 2 pi), write data/rpo-<fam>-<name>.json
import fs from 'fs';
import { dp45Step } from '../src/physics.js';

let rows = [];   // the printed rows of Table 1; not in this repository, the modes below need them
try { rows = JSON.parse(fs.readFileSync(new URL('../data/liao2025-table1.json', import.meta.url), 'utf8')).rows; } catch (e) { /* checked in the modes */ }
const RTOL = 1e-13, ATOL = 1e-14;

export function startState(u) {
  const [y1, v1x, v1y, v2x, v2y] = u;
  return Float64Array.from([y1, 0, 1, 0, 0, 0, v1x, v1y, v2x, v2y, -v1x - v2x, -v1y - v2y]);
}
export function flowTo(s0, T) {
  const s = Float64Array.from(s0);
  let t = 0, h = 1e-3, n = 0;
  while (t < T - 1e-15) {
    const [dt, hn] = dp45Step(s, Math.min(h, T - t), RTOL, ATOL, 0.01);
    t += dt; h = hn;
    if (++n > 4e6) return null;
  }
  return s;
}
function rotated(s, th) {
  const cx = (s[0] + s[2] + s[4]) / 3, cy = (s[1] + s[3] + s[5]) / 3, c = Math.cos(th), sn = Math.sin(th);
  const o = new Float64Array(12);
  for (let i = 0; i < 3; i++) {
    const x = s[2 * i] - cx, y = s[2 * i + 1] - cy;
    o[2 * i] = cx + c * x - sn * y; o[2 * i + 1] = cy + sn * x + c * y;
    const vx = s[6 + 2 * i], vy = s[7 + 2 * i];
    o[6 + 2 * i] = c * vx - sn * vy; o[7 + 2 * i] = sn * vx + c * vy;
  }
  return o;
}
function residual(u, Ltarget) {
  const s0 = startState(u);
  const x = flowTo(s0, u[5]);
  if (!x) return null;
  const I = rotated(s0, u[6]);
  const F = Array.from(x, (v, i) => v - I[i]);
  F.push(u[0] * u[2] + u[4] - Ltarget);
  return F;
}
// solve the normal equations (J^T J + eps) du = -J^T F
function lsq(J, F) {
  const n = J[0].length, A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < J.length; k++) s += J[k][i] * J[k][j]; A[i][j] = s; }
    A[i][i] += 1e-16; let r = 0; for (let k = 0; k < J.length; k++) r += J[k][i] * F[k]; A[i][n] = -r;
  }
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-300) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = A[r][n]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
export function newton(u0, Ltarget, { maxIter = 12, tol = 1e-11 } = {}) {
  let u = Array.from(u0);
  let F = residual(u, Ltarget);
  for (let it = 0; it < maxIter && F; it++) {
    const res = Math.max(...F.map(Math.abs));
    if (res < tol) return { ok: true, u, res, iters: it };
    const J = F.map(() => new Array(u.length));
    for (let j = 0; j < u.length; j++) {
      const h = 1e-6 * Math.max(1, Math.abs(u[j]));
      const up = Array.from(u), um = Array.from(u); up[j] += h; um[j] -= h;
      const Fp = residual(up, Ltarget), Fm = residual(um, Ltarget);
      if (!Fp || !Fm) return { ok: false, why: 'integration failed' };
      for (let i = 0; i < F.length; i++) J[i][j] = (Fp[i] - Fm[i]) / (2 * h);
    }
    const du = lsq(J, F);
    if (!du) return { ok: false, why: 'singular' };
    const nrm = Math.hypot(...du);
    const sc = nrm > 0.05 ? 0.05 / nrm : 1;   // no big jumps
    u = u.map((v, i) => v + sc * du[i]);
    F = residual(u, Ltarget);
  }
  const res = F ? Math.max(...F.map(Math.abs)) : Infinity;
  return { ok: res < tol * 100, u, res, iters: -1 };
}
const rowU = (r) => [r.y1, r.y7, r.y8, r.y9, r.y10, r.T, r.theta];

// continue from the row at L0 (the L = 0 row) in steps dL until L = Lend; returns the solutions in a list
export function continueL(u0, L0, Lend, dL0, onSol, opts = {}) {   // opts goes to newton: a looser tol keeps the step size up on very unstable orbits
  let u = Array.from(u0), L = L0, dL = dL0, prev = null;
  const out = [];
  while (L < Lend - 1e-12) {
    const Ln = Math.min(Lend, L + dL);
    let guess = u;
    if (prev) { const f = (Ln - L) / (L - prev.L); guess = u.map((v, i) => v + f * (v - prev.u[i])); }
    const r = newton(guess, Ln, opts);
    if (!r.ok) { dL /= 2; if (dL < 1e-7) return { out, why: 'step too small at L=' + L }; continue; }
    prev = { L, u }; u = r.u; L = Ln;
    out.push({ L, u: Array.from(u), res: r.res });
    if (onSol && onSol(L, u) === true) return { out, why: 'stopped' };
    dL = Math.min(dL0 * 4, dL * 1.5);
  }
  return { out, why: 'end' };
}

// scale free numbers of a solution: T* = T |E|^1.5, L* = |L| |E|^0.5 and theta
export function scaleFree(u) {
  const s = startState(u);
  const cx = (s[0] + s[2] + s[4]) / 3;
  const pos = [[s[0] - cx, 0], [s[2] - cx, 0], [s[4] - cx, 0]];
  let K = 0, U = 0, L = 0;
  for (let i = 0; i < 3; i++) { K += 0.5 * (s[6 + 2 * i] ** 2 + s[7 + 2 * i] ** 2); L += pos[i][0] * s[7 + 2 * i]; }
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) U -= 1 / Math.abs(pos[i][0] - pos[j][0]);
  const E = K + U;
  return { Tstar: u[5] * Math.abs(E) ** 1.5, Lstar: Math.abs(L) * Math.abs(E) ** 0.5, theta: u[6], E, L };
}

if (process.argv[1] && process.argv[1].endsWith('rpo.mjs')) {
  const mode = process.argv[2];
  if (['slope', 'theta', 'reproduce'].includes(mode) && !rows.length) { console.error('this script needs data/liao2025-table1.json, the table of Li et al. 2025 typed in by the reader; it is not in this repository'); process.exit(1); }
  if (mode === 'slope') {
    // dT/dL of the IA-3 continuation near L = 0.05 and 0.10 (same gauge: the start with the second body at (1, 0)), by two solutions 1e-4 apart
    const r0 = rows.find((r) => r.family === 'IA-3' && r.L === 0);
    const res = continueL(rowU(r0), 0, 0.1001, 0.005, null);
    if (!res.out.length) { console.error('continuation produced nothing'); process.exit(1); }
    for (const L of [0.05, 0.1]) {
      const near = res.out.filter((o) => o.L <= L + 1e-12).pop();
      const a = newton(near.u, L), b = newton(a.ok ? a.u : near.u, L + 1e-4);
      if (!a.ok || !b.ok) { console.log('no convergence at', L); continue; }
      console.log(`IA-3 near L=${L}: T(${L}) = ${a.u[5].toFixed(6)}, T(${(L + 1e-4).toFixed(4)}) = ${b.u[5].toFixed(6)}, dT/dL = ${((b.u[5] - a.u[5]) / 1e-4).toFixed(1)}, so 1e-4 in L moves T by ${(b.u[5] - a.u[5]).toFixed(5)}`);
    }
    process.exit(0);
  }
  if (mode === 'theta') {
    // continue family fam in L until the rotation angle is the rational multiple q of 2 pi (for example -1/3), solve for that L by the secant method,
    // then check that the orbit closes in the inertial frame after n times the period (n = the denominator) and write the result
    const fam = process.argv[3], [num, den] = process.argv[4].split('/').map(Number), q = num / den, target = 2 * Math.PI * q, n = den;
    const r0 = rows.find((r) => r.family === fam && r.L === 0);
    if (!r0 || !(den > 0)) { console.error('usage: node tools/rpo.mjs theta figure-eight|IA-3 -1/3'); process.exit(1); }
    let prev = null, last = null; const path = [];
    const res = continueL(rowU(r0), 0, 0.5, fam === 'IA-3' ? 0.005 : 0.002, (L, u) => {
      last = { L, u: Array.from(u) };
      const sfl = scaleFree(u);
      path.push({ L, u: Array.from(u), Tstar: sfl.Tstar, Lstar: sfl.Lstar });
      console.log(`  L ${L.toFixed(5)} L* ${sfl.Lstar.toFixed(5)} T* ${sfl.Tstar.toFixed(4)} theta ${u[6].toFixed(6)} (${(u[6] / (2 * Math.PI)).toFixed(4)} x 2 pi) T ${u[5].toFixed(4)}`);
      if ((u[6] - target) * Math.sign(target) >= 0 && prev) return true;   // the angle has passed the target
      prev = { L, u: Array.from(u) };
      return false;
    }, { tol: 1e-8, maxIter: 8 });
    if (res.why !== 'stopped') { console.error('the angle did not reach the target:', res.why); process.exit(1); }
    console.log(`bracket: L ${prev.L} (theta ${prev.u[6].toFixed(6)}) and ${last.L} (theta ${last.u[6].toFixed(6)}), target ${target.toFixed(6)}`);
    fs.writeFileSync(new URL(`../data/rpo-${fam}-theta${num}over${den}-path.json`, import.meta.url), JSON.stringify(path));   // saved before the final solves, which can fail
    let a = prev, b = last, sol = null;
    for (let it = 0; it < 40; it++) {
      const f = (b.u[6] - target) === (a.u[6] - target) ? 0.5 : (0 - (a.u[6] - target)) / ((b.u[6] - target) - (a.u[6] - target));
      const Lm = a.L + f * (b.L - a.L);
      const guess = a.u.map((v, i) => v + f * (b.u[i] - v));
      const r = newton(guess, Lm, { tol: 1e-9, maxIter: 25 });
      if (!r.ok) { console.error('newton failed at L =', Lm); process.exit(1); }
      sol = { L: Lm, u: r.u, res: r.res };
      const d = r.u[6] - target;
      console.log(`  L ${Lm.toFixed(10)} theta - target ${d.toExponential(2)} residual ${r.res.toExponential(1)}`);
      if (Math.abs(d) < 1e-9) break;
      if ((a.u[6] - target) * d < 0) b = { L: Lm, u: r.u }; else a = { L: Lm, u: r.u };
    }
    const sf = scaleFree(sol.u), s0 = startState(sol.u);
    // inertial frame: the start moved to the centre of mass, after n periods the state must return to it
    const cm = (s) => { const c = (s[0] + s[2] + s[4]) / 3, d = (s[1] + s[3] + s[5]) / 3; const o = Float64Array.from(s); for (let i = 0; i < 3; i++) { o[2 * i] -= c; o[2 * i + 1] -= d; } return o; };
    const x = flowTo(s0, n * sol.u[5]), a0 = cm(s0), x1 = cm(x);
    let close = 0; for (let i = 0; i < 12; i++) close = Math.max(close, Math.abs(x1[i] - a0[i]));
    console.log(`${fam} theta = ${num}/${den} * 2 pi at L = ${sol.L.toFixed(8)}: T* ${sf.Tstar.toFixed(6)} (x${n}: ${(n * sf.Tstar).toFixed(6)}), L* ${sf.Lstar.toFixed(6)}, closure after ${n} periods in the inertial frame ${close.toExponential(2)}`);
    fs.writeFileSync(new URL(`../data/rpo-${fam}-theta${num}over${den}.json`, import.meta.url), JSON.stringify({ family: fam, theta_over_2pi: q, L: sol.L, u: sol.u, Tstar: sf.Tstar, Lstar: sf.Lstar, periods: n, closureInertial: close, residual: sol.res, path }, null, 1));
    process.exit(close < 1e-6 ? 0 : 2);
  }
  if (mode === 'reproduce') {
    // the rows are compared in scale free numbers (T*, L*, theta): the raw start (y1, T) depends on which collinear moment of the orbit is used and on the scale.
    // the L of the IA-3 rows is 1e-4 above the printed one (checked with the formula of the paper), so that L is the target there
    const scaled = JSON.parse(fs.readFileSync(new URL('../data/liao2025-scaled.json', import.meta.url), 'utf8'));
    let bad = 0, compared = 0;
    const results = [];
    for (const [fam, Ls] of [['figure-eight', [0.02, 0.05]], ['IA-3', [0.05, 0.1]]].filter(([f]) => !process.argv[3] || f === process.argv[3])) {
      const famRows = rows.filter((r) => r.family === fam);
      const r0 = famRows[0];
      const off = fam === 'IA-3' ? 1e-4 : 0;
      const res = continueL(rowU(r0), 0, Math.max(...Ls) + off, fam === 'IA-3' ? 0.005 : 0.002, null);
      for (const L of Ls) {
        const Lt = L + off;
        const near = res.out.filter((o) => o.L <= Lt + 1e-12).pop();
        const sol = newton(near ? near.u : rowU(r0), Lt);
        const row = famRows.find((r) => Math.abs(r.L - L) < 1e-9);
        const ref = scaled.find((o) => o.family === fam && Math.abs(o.L_paper - L) < 1e-9);
        if (!sol.ok || !ref) { console.log(fam, L, 'did not converge or no reference', sol.res); bad++; continue; }
        const sf = scaleFree(sol.u);
        compared++;
        const dT = Math.abs(sf.Tstar - ref.Tstar) / ref.Tstar, dL = Math.abs(sf.Lstar - ref.Lstar) / ref.Lstar, dTh = Math.abs(sf.theta - ref.theta);
        console.log(`${fam} L=${L} (target ${Lt}): residual ${sol.res.toExponential(1)}  T* ${sf.Tstar.toFixed(6)} (table ${ref.Tstar.toFixed(6)})  L* ${sf.Lstar.toFixed(6)} (${ref.Lstar.toFixed(6)})  theta ${sf.theta.toFixed(6)} (${ref.theta.toFixed(6)})  relative differences ${dT.toExponential(1)} ${dL.toExponential(1)} and ${dTh.toExponential(1)} absolute in theta`);
        results.push({ family: fam, L_paper: L, L_target: Lt, residual: sol.res, Tstar: sf.Tstar, Lstar: sf.Lstar, theta: sf.theta, rel_diff_Tstar: dT, rel_diff_Lstar: dL, abs_diff_theta: dTh });
        if (dT > 2e-6 || dL > 2e-6 || dTh > 2e-6) bad++;
      }
    }
    if (compared === 0) { console.error('compared zero rows'); process.exit(1); }
    fs.writeFileSync(new URL(`../data/rpo-reproduce-${process.argv[3] || 'all'}.json`, import.meta.url), JSON.stringify(results, null, 1));   // my numbers next to the derived numbers of data/liao2025-scaled.json
    process.exit(bad ? 1 : 0);
  }
}

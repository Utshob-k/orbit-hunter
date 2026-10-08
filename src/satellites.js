// satellites branch off a stable orbit where its rotation number nu is m/k: the k times repeated orbit then has
// a double eigenvalue 1 and a second branch of solutions crosses the repeat. here the k fold repeat is followed in lam
// (multiple shooting, arclength), the bifurcation is found as a sign change of the bordered determinant, and the new
// branch is followed from there.
import { closePerpMS, system, correct, tangentAt, packZ, solOf, toY, unit, dot } from './shooting.js';
import { perpInfo } from './perp.js';
import { solve } from './newton.js';

function bordered(J, Flam, tau) {
  const A = J.map((row, i) => [...Array.from(row), Flam[i]]);
  A.push(Array.from(tau));
  return A;
}

// sign and log of |det| by gaussian elimination
function detOf(A) {
  const n = A.length;
  const M = A.map((r) => Float64Array.from(r));
  let sign = 1, log = 0;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (M[p][c] === 0) return { sign: 0, log: -Infinity };
    if (p !== c) { [M[c], M[p]] = [M[p], M[c]]; sign = -sign; }
    sign *= Math.sign(M[c][c]);
    log += Math.log(Math.abs(M[c][c]));
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f !== 0) for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return { sign, log };
}

// direction of the second branch: the (nearly) singular direction of the bordered matrix
function nullVector(A) {
  const n = A.length;
  let x = Float64Array.from({ length: n }, (_, i) => Math.sin(1 + 7 * i));
  for (let it = 0; it < 4; it++) {
    const B = A.map((r, i) => r.map((v, j) => (i === j ? v + 1e-13 : v)));
    const y = solve(B, Array.from(x));
    if (!y) break;
    x = unit(y);
  }
  return x;
}

// follow the solution curve from Y0 (direction tau0). onPoint(point) may return true to stop
function trace(Y0, tau0, m, t0, { h0 = 0.01, hMax = 0.08, maxSteps = 300, maxMs = 120000, onPoint = () => false } = {}) {
  const started = Date.now();
  const n = Y0.length - 1;
  let Y = Y0, tau = tau0, h = h0, steps = 0;
  const out = [];
  while (steps++ < maxSteps && Date.now() - started < maxMs) {
    const c = correct(Float64Array.from(Y, (v, i) => v + h * tau[i]), tau, m, t0);
    let tauNew = null;
    if (c.ok) tauNew = tangentAt(c.J, c.Flam, tau);
    if (!c.ok || !tauNew || dot(tauNew, tau) < Math.cos(0.35)) {
      h /= 2;
      if (h < 1e-7) break;
      continue;
    }
    const det = detOf(bordered(c.J, c.Flam, tauNew));
    const pt = { Y: c.Y, tau: tauNew, sign: det.sign, logdet: det.log, J: c.J, Flam: c.Flam };
    out.push(pt);
    Y = c.Y; tau = tauNew;
    if (onPoint(pt, out)) break;
    h = Math.min(hMax, c.iters <= 3 ? h * 1.4 : h);
  }
  return out;
}

// the k fold repeat of the orbit (u1, u2, lam, t) as a solution of the m piece system
function repeatOf(u1, u2, lam, t, k, m) {
  const s = closePerpMS(u1, u2, lam, k * t, { m, maxMs: 60000 });
  return s.res < 1e-9 ? s : null;
}

// look for branch points of the k fold repeat while lam moves from lamA to lamB.
// returns the branches found: lam, scale free T* and L* along each of them
export function satellitesFrom(orbit, k, lamA, lamB, { m = 8, branchSteps = 40, branchHMax = 0.05, branchMs = 120000 } = {}) {
  const rep = repeatOf(orbit.u1, orbit.u2, lamA, orbit.t, k, m);
  if (!rep) return { ok: false, why: 'repeat did not close at lamA' };
  const n = 3 + 12 * (m - 1);
  const Y0 = toY(packZ(rep), lamA);
  const sys = system(packZ(rep), lamA, m);
  const dz = solve(sys.J.map((r) => Array.from(r)), Array.from(sys.Flam, (v) => -v));
  if (!dz) return { ok: false, why: 'singular at the start' };
  const dir = Math.sign(lamB - lamA);
  const tau0 = unit([...dz, 1].map((v) => v * dir));
  const d0 = detOf(bordered(sys.J, sys.Flam, tau0));
  const first = { Y: Y0, tau: tau0, sign: d0.sign, J: sys.J, Flam: sys.Flam };
  const pts = [first, ...trace(Y0, tau0, m, rep.t, { onPoint: (p) => (lamB - p.Y[n]) * dir <= 0 })];
  const branches = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.sign === 0 || b.sign === 0 || a.sign === b.sign) continue;
    // bisect along the chord to the point where the determinant changes sign
    let P = a, Q = b;
    for (let it = 0; it < 30; it++) {
      const chord = Q.Y.map((v, j) => v - P.Y[j]);
      const mid = Float64Array.from(P.Y, (v, j) => v + 0.5 * chord[j]);
      const c = correct(mid, unit(chord), m, rep.t);
      if (!c.ok) break;
      const tau = tangentAt(c.J, c.Flam, P.tau);
      if (!tau) break;
      const R = { Y: c.Y, tau, sign: detOf(bordered(c.J, c.Flam, tau)).sign, J: c.J, Flam: c.Flam };
      if (R.sign === P.sign) P = R; else Q = R;
    }
    const A = bordered(P.J, P.Flam, P.tau);
    let phi = nullVector(A);
    const d = dot(phi, P.tau);
    phi = unit(phi.map((v, j) => v - d * P.tau[j]));
    const lamBP = P.Y[n];
    const info = (Y) => { const s = solOf(Y, m); const pi = perpInfo(s.u1, s.u2, s.lam, s.t); return pi && { lam: s.lam, ts: pi.ts, ls: Math.abs(pi.ls), repeatErr: pi.repeatErr }; };
    for (const sgn of [1, -1]) {
      const start = correct(Float64Array.from(P.Y, (v, j) => v + sgn * 0.004 * phi[j]), phi.map((v) => sgn * v), m, rep.t);
      if (!start.ok) { branches.push({ lamBP, sgn, ok: false }); continue; }
      const tauS = tangentAt(start.J, start.Flam, phi.map((v) => sgn * v));
      const along = trace(start.Y, tauS, m, rep.t, { maxSteps: branchSteps, hMax: branchHMax, maxMs: branchMs, onPoint: (p) => p.Y[n] < -0.5 || p.Y[n] > 1.05 });
      const curve = [start, ...along].map((p) => info(p.Y)).filter(Boolean);
      branches.push({ lamBP, sgn, ok: true, repeatTs: info(P.Y), curve });
    }
  }
  return { ok: true, k, lamA, lamB, steps: pts.length, signs: pts.map((p) => p.sign).join('').replace(/-1/g, '-').slice(0, 200), branches };
}

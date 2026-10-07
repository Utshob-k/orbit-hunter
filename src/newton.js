// closes a near periodic orbit: solve R(theta) state(T) = state(0) (bodies maybe relabeled)
// levenberg-marquardt with finite difference jacobian. which of v1, v2, T, ell, theta are
// unknowns is picked with a mask. if it's not really periodic the residual stays > 0
import { sdInitial, dp45Step } from './physics.js';

const PERMS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
];

// params p = [v1, v2, T, ell, theta]

// returns null on a near collision (step size collapses)
function stateAt(v1, v2, T, ell) {
  const s = sdInitial(v1, v2, ell);
  let t = 0;
  let h = 1e-3;
  const maxSteps = 4000 + 3000 * Math.max(T, 1);
  for (let n = 0; t < T - 1e-15; n++) {
    if (n > maxSteps || !(T > 0) || !Number.isFinite(T)) return null;
    const [dt, hn] = dp45Step(s, Math.min(h, T - t), 1e-13, 1e-14, 0.01);
    t += dt;
    h = hn;
  }
  return s;
}

function residual(p, perm) {
  const [v1, v2, T, ell, theta] = p;
  const s0 = sdInitial(v1, v2, ell);
  const s = stateAt(v1, v2, T, ell);
  const r = new Float64Array(12);
  if (!s) return r.fill(1e6);
  const co = Math.cos(theta), si = Math.sin(theta);
  const pm = PERMS[perm];
  for (let i = 0; i < 3; i++) {
    const k = pm[i];
    // rotate the end state by theta, then compare
    for (const off of [0, 6]) {
      const x = s[off + 2 * i], y = s[off + 2 * i + 1];
      r[off + 2 * i] = co * x - si * y - s0[off + 2 * k];
      r[off + 2 * i + 1] = si * x + co * y - s0[off + 2 * k + 1];
    }
  }
  return r;
}

const norm = (r) => Math.sqrt(r.reduce((a, b) => a + b * b, 0));

// gaussian elimination, n x n
export function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    if (Math.abs(M[c][c]) < 1e-300) return null;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

// the general closer. p0 = [v1,v2,T,ell,theta], free = which entries may change
export function closeGeneral(p0, free, perm = 0, { maxIter = 30, fd = 1e-6, maxMs = 3000 } = {}) {
  const t0 = Date.now();
  const idx = [0, 1, 2, 3, 4].filter((i) => free[i]);
  const T0 = p0[2];
  let x = [...p0];
  let r = residual(x, perm);
  let res = norm(r);
  let lambda = 1e-3;
  for (let it = 0; it < maxIter && res > 1e-13; it++) {
    // most candidates are junk, bail early
    if (it >= 8 && res > 0.02) break;
    if (Date.now() - t0 > maxMs && res > 1e-9) break;
    const J = idx.map((j) => {
      const xp = [...x], xm = [...x];
      xp[j] += fd;
      xm[j] -= fd;
      const rp = residual(xp, perm), rm = residual(xm, perm);
      return Array.from(rp, (v, i) => (v - rm[i]) / (2 * fd));
    });
    const JtJ = J.map((a) => J.map((b) => a.reduce((s, v, i) => s + v * b[i], 0)));
    const g = J.map((a) => a.reduce((s, v, i) => s + v * r[i], 0));
    let improved = false;
    for (let tries = 0; tries < 12 && !improved; tries++) {
      const A = JtJ.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lambda) + 1e-30 : v)));
      const d = solve(A, g.map((v) => -v));
      if (d) {
        const xn = [...x];
        idx.forEach((j, a) => { xn[j] += d[a]; });
        // T -> 0 trivially "solves" it, keep T near the guess
        if (xn[2] < 0.6 * T0 || xn[2] > 1.6 * T0) {
          lambda *= 8;
          continue;
        }
        const rn = residual(xn, perm);
        const rr = norm(rn);
        if (rr < res) {
          x = xn;
          r = rn;
          res = rr;
          lambda = Math.max(lambda / 5, 1e-12);
          improved = true;
          continue;
        }
      }
      lambda *= 8;
    }
    if (!improved) break;
  }
  return { v1: x[0], v2: x[1], T: x[2], ell: x[3], theta: x[4], res, perm };
}

// plain periodic orbit at fixed ell (theta = 0)
export function closeOrbit(v1, v2, T, perm = 0, { ell = 0, ...opts } = {}) {
  return closeGeneral([v1, v2, T, ell, 0], [1, 1, 1, 0, 0], perm, opts);
}

// angle that best rotates the end state onto the start state (least squares)
function bestTheta(v1, v2, T, ell, perm) {
  const s0 = sdInitial(v1, v2, ell);
  const s = stateAt(v1, v2, T, ell);
  if (!s) return 0;
  let C = 0, S = 0;
  const pm = PERMS[perm];
  for (let i = 0; i < 3; i++) {
    for (const off of [0, 6]) {
      const ax = s[off + 2 * i], ay = s[off + 2 * i + 1];
      const bx = s0[off + 2 * pm[i]], by = s0[off + 2 * pm[i] + 1];
      C += ax * bx + ay * by;
      S += ax * by - ay * bx;
    }
  }
  return Math.atan2(S, C);
}

// orbit that comes back rotated by theta (fixed ell)
export function closeRelative(v1, v2, T, ell, perm = 0, opts = {}) {
  const th = bestTheta(v1, v2, T, ell, perm);
  return closeGeneral([v1, v2, T, ell, th], [1, 1, 1, 0, 1], perm, opts);
}

// start from a near return at ell0, close it as a rotated return, then slide ell with a secant
// iteration until the rotation angle is zero. then it is a real periodic orbit with L = ell.
export function huntExact(v1, v2, T, ell0, perm = 0, { maxMs = 8000 } = {}) {
  const t0 = Date.now();
  const first = closeRelative(v1, v2, T, ell0, perm, { maxMs: 3000 });
  if (first.res > 1e-9) return { ok: false, why: 'rotated return did not close', res: first.res };
  let a = first;
  // second point, small step in ell (sign doesnt matter, secant sorts it out)
  let b = closeRelative(a.v1, a.v2, a.T, ell0 + 0.01, perm, { maxMs: 3000 });
  if (b.res > 1e-9) b = closeRelative(a.v1, a.v2, a.T, ell0 - 0.01, perm, { maxMs: 3000 });
  if (b.res > 1e-9) return { ok: false, why: 'could not continue in ell', res: b.res };
  for (let k = 0; k < 20; k++) {
    if (Date.now() - t0 > maxMs) return { ok: false, why: 'ran out of time', res: b.res, theta: b.theta };
    if (Math.abs(b.theta) < 1e-11) break;
    const slope = (b.theta - a.theta) / (b.ell - a.ell);
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) return { ok: false, why: 'theta does not depend on ell here', res: b.res, theta: b.theta };
    const next = b.ell - b.theta / slope;
    if (Math.abs(next - ell0) > 0.5) return { ok: false, why: 'ell ran away', res: b.res, theta: b.theta };
    const c = closeRelative(b.v1, b.v2, b.T, next, perm, { maxMs: 3000 });
    if (c.res > 1e-9) return { ok: false, why: 'lost the orbit while sliding ell', res: c.res, theta: b.theta };
    a = b;
    b = c;
  }
  if (Math.abs(b.theta) > 1e-9) return { ok: false, why: 'theta never reached 0', res: b.res, theta: b.theta };
  // polish with ell free and theta = 0
  const f = closeGeneral([b.v1, b.v2, b.T, b.ell, 0], [1, 1, 1, 1, 0], perm, { maxMs: 4000 });
  if (f.res > 1e-9) return { ok: false, why: 'final polish failed', res: f.res, theta: b.theta };
  return { ok: true, v1: f.v1, v2: f.v2, T: f.T, ell: f.ell, res: f.res, perm };
}

export function energy(v1, v2, ell = 0) {
  const s = sdInitial(v1, v2, ell);
  let e = 0;
  for (let i = 0; i < 3; i++) e += 0.5 * (s[6 + 2 * i] ** 2 + s[7 + 2 * i] ** 2);
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) e -= 1 / Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]);
  return e;
}

// T * |E|^1.5 doesn't change when you rescale the orbit
export function fingerprint(v1, v2, T, ell = 0) {
  return T * Math.abs(energy(v1, v2, ell)) ** 1.5;
}

// closest two bodies get, and how far out it goes
export function orbitStats(v1, v2, T, ell = 0) {
  const s = sdInitial(v1, v2, ell);
  let t = 0;
  let h = 1e-3;
  let minDist = Infinity;
  let extent = 0;
  for (let n = 0; t < T - 1e-15; n++) {
    if (n > 4000 + 3000 * T) return { minDist: NaN, extent: NaN };
    const [dt, hn] = dp45Step(s, Math.min(h, T - t), 1e-11, 1e-12, 0.01);
    t += dt;
    h = hn;
    for (let i = 0; i < 3; i++) {
      extent = Math.max(extent, Math.hypot(s[2 * i], s[2 * i + 1]));
      for (let j = i + 1; j < 3; j++) minDist = Math.min(minDist, Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]));
    }
  }
  return { minDist, extent };
}

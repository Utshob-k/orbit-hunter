// closes a near periodic orbit: solve state(T) = state(0) for (v1, v2, T)
// levenberg-marquardt, jacobian by finite differences. if it's not really periodic res stays > 0
import { sdInitial, dp45Step } from './physics.js';

const PERMS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
];

// returns null on a near collision (step size collapses)
function stateAt(v1, v2, T) {
  const s = sdInitial(v1, v2);
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

function residual(x, perm) {
  const [v1, v2, T] = x;
  const s0 = sdInitial(v1, v2);
  const s = stateAt(v1, v2, T);
  const r = new Float64Array(12);
  if (!s) return r.fill(1e6);
  const p = PERMS[perm];
  for (let i = 0; i < 3; i++) {
    const k = p[i];
    for (let c = 0; c < 2; c++) {
      r[2 * i + c] = s[2 * i + c] - s0[2 * k + c];
      r[6 + 2 * i + c] = s[6 + 2 * i + c] - s0[6 + 2 * k + c];
    }
  }
  return r;
}

const norm = (r) => Math.sqrt(r.reduce((a, b) => a + b * b, 0));

// 3x3 solve
function solve3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    if (Math.abs(M[c][c]) < 1e-300) return null;
    for (let r = c + 1; r < 3; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let s = M[r][3];
    for (let k = r + 1; k < 3; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

export function closeOrbit(v1, v2, T, perm = 0, { maxIter = 30, fd = 1e-6, maxMs = 3000 } = {}) {
  const t0 = Date.now();
  let x = [v1, v2, T];
  let r = residual(x, perm);
  let res = norm(r);
  let lambda = 1e-3;
  for (let it = 0; it < maxIter && res > 1e-13; it++) {
    // most candidates are junk, bail early
    if (it >= 8 && res > 0.02) break;
    if (Date.now() - t0 > maxMs && res > 1e-9) break;
    // jacobian
    const J = [[], [], []];
    for (let j = 0; j < 3; j++) {
      const xp = [...x];
      const xm = [...x];
      xp[j] += fd;
      xm[j] -= fd;
      const rp = residual(xp, perm);
      const rm = residual(xm, perm);
      for (let i = 0; i < 12; i++) J[j][i] = (rp[i] - rm[i]) / (2 * fd);
    }
    const JtJ = [0, 1, 2].map((a) => [0, 1, 2].map((b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
    const g = [0, 1, 2].map((a) => J[a].reduce((s, v, i) => s + v * r[i], 0));
    let improved = false;
    for (let tries = 0; tries < 12 && !improved; tries++) {
      const A = JtJ.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lambda) + 1e-30 : v)));
      const d = solve3(A, g.map((v) => -v));
      if (d) {
        const xn = x.map((v, i) => v + d[i]);
        // T -> 0 trivially "solves" it, keep T near the guess
        if (xn[2] < 0.6 * T || xn[2] > 1.6 * T || xn[0] < 0 || xn[1] < 0) {
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
  return { v1: x[0], v2: x[1], T: x[2], res, perm };
}

export function energy(v1, v2) {
  const s = sdInitial(v1, v2);
  let e = 0;
  for (let i = 0; i < 3; i++) e += 0.5 * (s[6 + 2 * i] ** 2 + s[7 + 2 * i] ** 2);
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) e -= 1 / Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]);
  return e;
}

// T * |E|^1.5 doesn't change when you rescale the orbit
export function fingerprint(v1, v2, T) {
  return T * Math.abs(energy(v1, v2)) ** 1.5;
}

// closest two bodies get, and how far out it goes
export function orbitStats(v1, v2, T) {
  const s = sdInitial(v1, v2);
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

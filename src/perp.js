// the "perpendicular start" family (henon style), equal masses
// bodies sit on the x axis at -1, lam, 1 (then shifted so the center of mass is 0), all velocities
// point in y. u1, u2 are the y velocities of bodies 1 and 2, body 3 gets -u1-u2.
// if the system is ever collinear again with all velocities perpendicular to the line, the orbit
// is mirror symmetric in time and repeats after twice that time, rotated by some angle.
import { dp45Step } from './physics.js';
import { solve } from './newton.js';

export function perpInitial(u1, u2, lam) {
  const cm = lam / 3;
  return Float64Array.from([-1 - cm, 0, lam - cm, 0, 1 - cm, 0, 0, u1, 0, u2, 0, -u1 - u2]);
}

// how far from "collinear and perpendicular": [collinearity, v0 along line, v1 along line]
export function symResidual(s) {
  let best = 0, dx = 1, dy = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const rx = s[2 * j] - s[2 * i], ry = s[2 * j + 1] - s[2 * i + 1];
      const l = rx * rx + ry * ry;
      if (l > best) { best = l; const n = Math.sqrt(l); dx = rx / n; dy = ry / n; }
    }
  }
  const c = ((s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0])) / best;
  return [c, s[6] * dx + s[7] * dy, s[8] * dx + s[9] * dy];
}

function stateAt(u1, u2, lam, t) {
  const s = perpInitial(u1, u2, lam);
  let tt = 0, h = 1e-3;
  const maxSteps = 4000 + 3000 * Math.max(t, 1);
  for (let n = 0; tt < t - 1e-15; n++) {
    if (n > maxSteps || !(t > 0) || !Number.isFinite(t)) return null;
    const [dt, hn] = dp45Step(s, Math.min(h, t - tt), 1e-13, 1e-14, 0.01);
    tt += dt;
    h = hn;
  }
  return s;
}

const resOf = (x, lam) => {
  const s = stateAt(x[0], x[1], lam, x[2]);
  return s ? symResidual(s) : [1e6, 1e6, 1e6];
};
const nrm = (r) => Math.hypot(...r);

// solve for (u1, u2, t) at fixed lam so the state at time t is collinear + perpendicular
export function closePerp(u1, u2, lam, t0, { maxIter = 30, maxMs = 3000 } = {}) {
  const started = Date.now();
  let x = [u1, u2, t0];
  let r = resOf(x, lam);
  let res = nrm(r);
  let lambda = 1e-3;
  for (let it = 0; it < maxIter && res > 1e-13; it++) {
    if (it >= 8 && res > 0.02) break;
    if (Date.now() - started > maxMs && res > 1e-9) break;
    const fd = 1e-6;
    const J = [0, 1, 2].map((j) => {
      const xp = [...x], xm = [...x];
      xp[j] += fd; xm[j] -= fd;
      const rp = resOf(xp, lam), rm = resOf(xm, lam);
      return rp.map((v, i) => (v - rm[i]) / (2 * fd));
    });
    const JtJ = J.map((a) => J.map((b) => a.reduce((s, v, i) => s + v * b[i], 0)));
    const g = J.map((a) => a.reduce((s, v, i) => s + v * r[i], 0));
    let ok = false;
    for (let k = 0; k < 12 && !ok; k++) {
      const A = JtJ.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lambda) + 1e-30 : v)));
      const d = solve(A, g.map((v) => -v));
      if (d) {
        const xn = x.map((v, i) => v + d[i]);
        if (xn[2] < 0.6 * t0 || xn[2] > 1.6 * t0) { lambda *= 8; continue; }
        const rn = resOf(xn, lam);
        if (nrm(rn) < res) { x = xn; r = rn; res = nrm(rn); lambda = Math.max(lambda / 5, 1e-12); ok = true; continue; }
      }
      lambda *= 8;
    }
    if (!ok) break;
  }
  return { u1: x[0], u2: x[1], lam, t: x[2], res };
}

// rotation per full period, cheaply: the state at time t is collinear along a line at angle phi, the
// mirror symmetry then gives a rotation of 2 phi after 2t. (sign doesnt matter when the target is 0)
export function quickTheta(u1, u2, lam, t) {
  const s = stateAt(u1, u2, lam, t);
  if (!s) return null;
  let best = 0, dx = 1, dy = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const rx = s[2 * j] - s[2 * i], ry = s[2 * j + 1] - s[2 * i + 1], l = rx * rx + ry * ry;
    if (l > best) { best = l; dx = rx; dy = ry; }
  }
  return Math.atan2(Math.sin(2 * Math.atan2(dy, dx)), Math.cos(2 * Math.atan2(dy, dx)));
}

// everything we want to know about a closed one: energy, angular momentum, rotation after a full
// period, and an independent check that it really repeats (integrate 2t, compare with start)
export function perpInfo(u1, u2, lam, t) {
  const s0 = perpInitial(u1, u2, lam);
  const T = 2 * t;
  const s = Float64Array.from(s0);
  let tt = 0, h = 1e-3, minDist = Infinity, extent = 0;
  for (let n = 0; tt < T - 1e-15; n++) {
    if (n > 4000 + 3000 * T) return null;
    const [dt, hn] = dp45Step(s, Math.min(h, T - tt), 1e-13, 1e-14, 0.01);
    tt += dt;
    h = hn;
    for (let i = 0; i < 3; i++) {
      extent = Math.max(extent, Math.hypot(s[2 * i], s[2 * i + 1]));
      for (let j = i + 1; j < 3; j++) minDist = Math.min(minDist, Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]));
    }
  }
  // best rotation taking the end state onto the start state
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) {
    for (const off of [0, 6]) {
      const ax = s[off + 2 * i], ay = s[off + 2 * i + 1], bx = s0[off + 2 * i], by = s0[off + 2 * i + 1];
      C += ax * bx + ay * by;
      S += ax * by - ay * bx;
    }
  }
  const theta = Math.atan2(S, C);
  const co = Math.cos(theta), si = Math.sin(theta);
  let err = 0;
  for (let i = 0; i < 3; i++) {
    for (const off of [0, 6]) {
      const ax = s[off + 2 * i], ay = s[off + 2 * i + 1];
      err += (co * ax - si * ay - s0[off + 2 * i]) ** 2 + (si * ax + co * ay - s0[off + 2 * i + 1]) ** 2;
    }
  }
  let E = 0, L = 0;
  for (let i = 0; i < 3; i++) {
    E += 0.5 * (s0[6 + 2 * i] ** 2 + s0[7 + 2 * i] ** 2);
    L += s0[2 * i] * s0[7 + 2 * i] - s0[2 * i + 1] * s0[6 + 2 * i];
    for (let j = i + 1; j < 3; j++) E -= 1 / Math.hypot(s0[2 * i] - s0[2 * j], s0[2 * i + 1] - s0[2 * j + 1]);
  }
  return {
    T, E, L, theta, repeatErr: Math.sqrt(err), minDist, extent,
    ts: T * Math.abs(E) ** 1.5, // scale free period
    ls: L * Math.abs(E) ** 0.5, // scale free angular momentum
  };
}

// slide lam along a family (re-closing at every step) until the rotation angle hits target
// (0 means a truly periodic orbit, 2*pi/q means periodic after q repeats)
export function huntPeriodic(u1, u2, lam0, t0, target = 0, { maxMs = 25000 } = {}) {
  const started = Date.now();
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  // close at a new lam, guessing (u1, u2, t) from the last one or two solutions
  const at = (lam, prev, prev2) => {
    let g = [prev.u1, prev.u2, prev.t];
    if (prev2) {
      const k = (lam - prev.lam) / (prev.lam - prev2.lam);
      g = [prev.u1 + k * (prev.u1 - prev2.u1), prev.u2 + k * (prev.u2 - prev2.u2), prev.t + k * (prev.t - prev2.t)];
    }
    const r = closePerp(g[0], g[1], lam, g[2], { maxMs: 4000 });
    if (r.res > 1e-9 || Math.abs(r.t - prev.t) > 0.3 * prev.t) return null;
    const th = quickTheta(r.u1, r.u2, lam, r.t);
    if (th === null) return null;
    return { ...r, th };
  };
  const first = closePerp(u1, u2, lam0, t0, { maxMs: 4000 });
  if (first.res > 1e-9) return { ok: false, why: 'start did not close' };
  let a = { ...first, th: quickTheta(first.u1, first.u2, lam0, first.t) };
  const f = (p) => wrap(p.th - target);
  if (Math.abs(f(a)) < 1e-9) return { ok: true, ...a, info: perpInfo(a.u1, a.u2, a.lam, a.t) };
  // walk in the direction that reduces |theta - target|, shrinking the step when we lose the orbit
  let dir = 1, step = 0.02;
  let b = null;
  for (const d of [1, -1]) {
    let st = 0.02;
    while (!b && st > 1e-4) { b = at(lam0 + d * st, a, null); if (!b) st /= 2; }
    if (b) { dir = d; break; }
  }
  if (!b) return { ok: false, why: 'could not step in lam' };
  for (let k = 0; k < 80; k++) {
    if (Date.now() - started > maxMs) return { ok: false, why: 'out of time', lam: b.lam, th: b.th };
    if (Math.abs(f(b)) < 1e-9) return { ok: true, ...b, info: perpInfo(b.u1, b.u2, b.lam, b.t) };
    const slope = (f(b) - f(a)) / (b.lam - a.lam);
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-9) return { ok: false, why: 'theta does not change with lam', lam: b.lam, th: b.th };
    let want = -f(b) / slope; // secant step
    // if the angle is moving away from the target, we are walking the wrong way
    let stepLam = Math.sign(want) * Math.min(Math.abs(want), step);
    let c = null;
    while (!c && Math.abs(stepLam) > 1e-11) {
      const lamNext = b.lam + stepLam;
      if (lamNext < -1 || lamNext > 1) return { ok: false, why: 'lam left [-1, 1]', lam: lamNext, th: b.th };
      c = at(lamNext, b, a);
      if (!c) stepLam /= 2;
    }
    if (!c) return { ok: false, why: 'lost the family near lam=' + b.lam.toFixed(4), lam: b.lam, th: b.th };
    a = b;
    b = c;
  }
  return { ok: false, why: 'no convergence', lam: b.lam, th: b.th };
}

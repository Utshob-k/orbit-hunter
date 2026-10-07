// multiple shooting for the perpendicular family.
// the half orbit is cut into m pieces and the state at the start of each piece is an unknown,
// so a small error in the start can't blow up over the whole orbit.
// unknowns z = [u1, u2, t, s_1 .. s_(m-1)]  (s_0 comes from u1, u2, lam)
// equations: flow(s_i, t/m) = s_(i+1) for each piece, and the last piece ends collinear + perpendicular
import { deriv, dp45Step } from './physics.js';
import { monodromy } from './stability.js';
import { solve } from './newton.js';
import { perpInitial, symResidual, perpInfo } from './perp.js';

const N = 12;

// d(start state)/d(u1), d(start state)/d(u2): the start velocities are (u1, u2, -u1-u2) in y
const dS0 = [new Float64Array(N), new Float64Array(N)];
dS0[0][7] = 1; dS0[0][11] = -1;
dS0[1][9] = 1; dS0[1][11] = -1;

// plain integration of one state over time tau (no variational equations, cheap)
function flow(x0, tau) {
  const s = Float64Array.from(x0);
  let t = 0, h = 1e-3;
  for (let n = 0; t < tau - 1e-15; n++) {
    if (n > 4000 + 3000 * Math.max(tau, 1)) return null;
    const [dt, hn] = dp45Step(s, Math.min(h, tau - t), 1e-13, 1e-14, 0.01);
    if (dt === 0) return null;
    t += dt;
    h = hn;
  }
  return s;
}

function nodesFrom(u1, u2, lam, t, m) {
  const out = [];
  let x = perpInitial(u1, u2, lam);
  for (let i = 1; i < m; i++) {
    x = flow(x, t / m);
    if (!x) return null;
    out.push(Float64Array.from(x));
  }
  return out;
}

const sup = (v) => v.reduce((a, b) => Math.max(a, Math.abs(b)), 0);

// residual only (cheap)
function residual(z, lam, m) {
  const tau = z[2] / m;
  if (!(tau > 0)) return null;
  const F = new Float64Array(N * (m - 1) + 3);
  let cur = perpInitial(z[0], z[1], lam);
  for (let i = 0; i < m; i++) {
    const e = flow(cur, tau);
    if (!e) return null;
    if (i < m - 1) {
      const nxt = z.subarray(3 + N * i, 3 + N * (i + 1));
      for (let k = 0; k < N; k++) F[N * i + k] = e[k] - nxt[k];
      cur = nxt;
    } else {
      F.set(symResidual(e), N * (m - 1));
    }
  }
  return F;
}

// d(start state)/d(lam): x1 = -1 - lam/3, x2 = 2 lam/3, x3 = 1 - lam/3
const dLam = new Float64Array(N);
dLam[0] = -1 / 3; dLam[2] = 2 / 3; dLam[4] = -1 / 3;

// residual, jacobian wrt z, and dF/dlam
function system(z, lam, m) {
  const n = 3 + N * (m - 1);
  const tau = z[2] / m;
  const F = new Float64Array(n);
  const Flam = new Float64Array(n);
  const J = Array.from({ length: n }, () => new Float64Array(n));
  const f = new Float64Array(N);
  let end = null;
  for (let i = 0; i < m; i++) {
    const start = i === 0 ? perpInitial(z[0], z[1], lam) : z.subarray(3 + N * (i - 1), 3 + N * i);
    const { end: e, M } = monodromy(start, tau);
    end = e;
    deriv(e, f);
    if (i < m - 1) {
      const nxt = z.subarray(3 + N * i, 3 + N * (i + 1));
      for (let k = 0; k < N; k++) {
        const row = N * i + k;
        F[row] = e[k] - nxt[k];
        J[row][3 + N * i + k] = -1;       // d/d s_(i+1)
        J[row][2] = f[k] / m;             // d/dt
        if (i === 0) {
          for (let c = 0; c < 2; c++) { let v = 0; for (let q = 0; q < N; q++) v += M[k][q] * dS0[c][q]; J[row][c] = v; }
          let w = 0; for (let q = 0; q < N; q++) w += M[k][q] * dLam[q];
          Flam[row] = w;
        } else {
          for (let q = 0; q < N; q++) J[row][3 + N * (i - 1) + q] = M[k][q];
        }
      }
    } else {
      // last piece: the three conditions at its end. D = d(symResidual)/d(state), by central differences
      F.set(symResidual(e), N * (m - 1));
      const D = Array.from({ length: 3 }, () => new Float64Array(N));
      for (let q = 0; q < N; q++) {
        const sp = Float64Array.from(e), sm = Float64Array.from(e);
        const h = 1e-6;
        sp[q] += h; sm[q] -= h;
        const rp = symResidual(sp), rm = symResidual(sm);
        for (let r = 0; r < 3; r++) D[r][q] = (rp[r] - rm[r]) / (2 * h);
      }
      for (let r = 0; r < 3; r++) {
        const row = N * (m - 1) + r;
        let dt = 0;
        for (let q = 0; q < N; q++) dt += D[r][q] * f[q];
        J[row][2] = dt / m;
        if (i === 0) {
          for (let c = 0; c < 2; c++) { let v = 0; for (let q = 0; q < N; q++) for (let p = 0; p < N; p++) v += D[r][q] * M[q][p] * dS0[c][p]; J[row][c] = v; }
          let w = 0; for (let q = 0; q < N; q++) for (let p = 0; p < N; p++) w += D[r][q] * M[q][p] * dLam[p];
          Flam[row] = w;
        } else {
          for (let p = 0; p < N; p++) { let v = 0; for (let q = 0; q < N; q++) v += D[r][q] * M[q][p]; J[row][3 + N * (i - 1) + p] = v; }
        }
      }
    }
  }
  return { F, J, Flam, end };
}

// close the symmetric half orbit with m pieces. pass the nodes of a nearby solution to warm start.
export function closePerpMS(u1, u2, lam, t0, { m = 6, nodes = null, maxIter = 30, tol = 1e-11, maxMs = 60000 } = {}) {
  const started = Date.now();
  let start = nodes || nodesFrom(u1, u2, lam, t0, m);
  if (!start) return { res: Infinity, why: 'guess orbit blew up' };
  let z = new Float64Array(3 + N * (m - 1));
  z[0] = u1; z[1] = u2; z[2] = t0;
  start.forEach((s, i) => z.set(s, 3 + N * i));
  let F = residual(z, lam, m);
  if (!F) return { res: Infinity, why: 'residual failed' };
  let res = sup(F);
  for (let it = 0; it < maxIter && res > tol; it++) {
    if (Date.now() - started > maxMs) break;
    const sys = system(z, lam, m);
    const delta = solve(sys.J.map((r) => Array.from(r)), Array.from(sys.F, (v) => -v));
    if (!delta) break;
    let accepted = false;
    for (let a = 1; a > 1 / 80; a /= 2) {
      const zn = Float64Array.from(z, (v, i) => v + a * delta[i]);
      if (zn[2] < 0.6 * t0 || zn[2] > 1.6 * t0) continue;
      const Fn = residual(zn, lam, m);
      if (Fn && sup(Fn) < res) { z = zn; F = Fn; res = sup(Fn); accepted = true; break; }
    }
    if (!accepted) break;
  }
  const nodesOut = [];
  for (let i = 0; i < m - 1; i++) nodesOut.push(Float64Array.from(z.subarray(3 + N * i, 3 + N * (i + 1))));
  return { u1: z[0], u2: z[1], t: z[2], lam, res, nodes: nodesOut, m };
}

// rotation per period from the end state of the last piece: twice the angle of the line (same as quickTheta)
function thetaOf(sol) {
  const x = flow(sol.nodes.length ? sol.nodes[sol.nodes.length - 1] : perpInitial(sol.u1, sol.u2, sol.lam), sol.t / sol.m);
  if (!x) return null;
  let best = 0, dx = 1, dy = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const rx = x[2 * j] - x[2 * i], ry = x[2 * j + 1] - x[2 * i + 1], l = rx * rx + ry * ry;
    if (l > best) { best = l; dx = rx; dy = ry; }
  }
  const a = 2 * Math.atan2(dy, dx);
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// slide lam until the rotation angle is 0 (truly periodic). each step uses the tangent predictor and
// starts from the pieces of the last step. the step grows after a success and halves after a failure.
export function huntPeriodicMS(u1, u2, lam0, t0, { m = 8, maxMs = 600000, step0 = 0.002, stepMax = 0.05, thTol = 1e-9 } = {}) {
  const started = Date.now();
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  const good = (from, sol) => sol && sol.res < 1e-9 && Math.abs(sol.t - from.t) < 0.3 * from.t;
  const first = closePerpMS(u1, u2, lam0, t0, { m, maxMs: 120000 });
  if (!(first.res < 1e-9)) return { ok: false, why: 'start did not close' };
  let a = { ...first, th: thetaOf(first) };
  if (a.th === null) return { ok: false, why: 'start orbit failed' };
  const finish = (p) => ({ ok: true, u1: p.u1, u2: p.u2, lam: p.lam, t: p.t, res: p.res, info: perpInfo(p.u1, p.u2, p.lam, p.t) });
  if (Math.abs(a.th) < thTol) return finish(a);
  // first step: small, either direction
  let b = null, dir = 1, step = step0;
  for (const d of [1, -1]) {
    let st = step0;
    while (!b && st > 1e-6) {
      const r = stepInLam(a, d * st, { maxMs: 120000 }).sol;
      if (good(a, r)) { const th = thetaOf(r); if (th !== null) b = { ...r, th }; }
      if (!b) st /= 2;
    }
    if (b) { dir = d; step = st; break; }
  }
  if (!b) return { ok: false, why: 'could not step in lam' };
  for (let k = 0; k < 400; k++) {
    if (Date.now() - started > maxMs) return { ok: false, why: 'out of time', lam: b.lam, th: b.th };
    if (Math.abs(wrap(b.th)) < thTol) return finish(b);
    const slope = (wrap(b.th) - wrap(a.th)) / (b.lam - a.lam);
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-9) return { ok: false, why: 'theta does not change with lam', lam: b.lam, th: b.th };
    const want = -wrap(b.th) / slope;
    let stepLam = Math.sign(want) * Math.min(Math.abs(want), step);
    let c = null;
    while (!c && Math.abs(stepLam) > 1e-9) {
      const lamNext = b.lam + stepLam;
      if (lamNext < -1 || lamNext > 1) return { ok: false, why: 'lam left [-1, 1]', lam: lamNext, th: b.th };
      const r = stepInLam(b, stepLam, { maxMs: 120000 }).sol;
      if (good(b, r)) { const th = thetaOf(r); if (th !== null) c = { ...r, th }; }
      if (!c) { stepLam /= 2; step = Math.max(Math.abs(stepLam), 1e-6); }
    }
    if (!c) return { ok: false, why: 'lost the family near lam=' + b.lam.toFixed(4), lam: b.lam, th: b.th };
    step = Math.min(stepMax, Math.max(step, Math.abs(stepLam)) * 1.5);
    a = b;
    b = c;
  }
  return { ok: false, why: 'no convergence', lam: b.lam, th: b.th };
}

// how the solution moves with lam: J dz/dlam = -dF/dlam. only the first piece depends on lam directly
export function tangentInLam(sol) {
  const m = sol.m, lam = sol.lam;
  const z = new Float64Array(3 + N * (m - 1));
  z[0] = sol.u1; z[1] = sol.u2; z[2] = sol.t;
  sol.nodes.forEach((s, i) => z.set(s, 3 + N * i));
  const { J } = system(z, lam, m);
  // d(start state)/d(lam): x1 = -1 - lam/3, x2 = 2 lam/3, x3 = 1 - lam/3, nothing else
  const dl = new Float64Array(N);
  dl[0] = -1 / 3; dl[2] = 2 / 3; dl[4] = -1 / 3;
  const tau = z[2] / m;
  const { M } = monodromy(perpInitial(z[0], z[1], lam), tau);
  const n = z.length;
  const rhs = new Array(n).fill(0);
  if (m > 1) {
    for (let k = 0; k < N; k++) { let v = 0; for (let q = 0; q < N; q++) v += M[k][q] * dl[q]; rhs[k] = -v; }
  } else {
    // m = 1: final conditions depend on the start directly
    const e = monodromy(perpInitial(z[0], z[1], lam), tau).end;
    const D = Array.from({ length: 3 }, () => new Float64Array(N));
    for (let q = 0; q < N; q++) {
      const sp = Float64Array.from(e), sm = Float64Array.from(e);
      sp[q] += 1e-6; sm[q] -= 1e-6;
      const rp = symResidual(sp), rm = symResidual(sm);
      for (let r = 0; r < 3; r++) D[r][q] = (rp[r] - rm[r]) / 2e-6;
    }
    for (let r = 0; r < 3; r++) { let v = 0; for (let q = 0; q < N; q++) for (let p = 0; p < N; p++) v += D[r][q] * M[q][p] * dl[p]; rhs[r] = -v; }
  }
  const dz = solve(J.map((r) => Array.from(r)), rhs);
  return dz ? { du1: dz[0], du2: dz[1], dt: dz[2], dnodes: sol.nodes.map((_, i) => Float64Array.from(dz.slice(3 + N * i, 3 + N * (i + 1)))) } : null;
}

// one continuation step from sol to lam + d, with the tangent predictor
export function stepInLam(sol, d, opts = {}) {
  const tg = tangentInLam(sol);
  const m = sol.m;
  let guess = { u1: sol.u1, u2: sol.u2, t: sol.t, nodes: sol.nodes };
  if (tg) {
    guess = {
      u1: sol.u1 + d * tg.du1, u2: sol.u2 + d * tg.du2, t: sol.t + d * tg.dt,
      nodes: sol.nodes.map((s, i) => Float64Array.from(s, (v, q) => v + d * tg.dnodes[i][q])),
    };
  }
  const out = closePerpMS(guess.u1, guess.u2, sol.lam + d, guess.t, { m, nodes: guess.nodes, ...opts });
  return { sol: out, tangent: tg };
}


// ---- pseudo-arclength continuation ----
// natural continuation in lam can't get around a turning point of the branch. here the unknowns are (z, lam) together
// and the extra equation keeps us one step h further along the curve: tau . (Y - Y_predicted) = 0.

const dot = (a, b) => { let v = 0; for (let i = 0; i < a.length; i++) v += a[i] * b[i]; return v; };
const unit = (a) => { const n = Math.sqrt(dot(a, a)); return Float64Array.from(a, (v) => v / n); };

function packZ(sol) {
  const z = new Float64Array(3 + N * (sol.m - 1));
  z[0] = sol.u1; z[1] = sol.u2; z[2] = sol.t;
  sol.nodes.forEach((s, i) => z.set(s, 3 + N * i));
  return z;
}

function solOf(Y, m) {
  const n = Y.length - 1;
  const nodes = [];
  for (let i = 0; i < m - 1; i++) nodes.push(Float64Array.from(Y.subarray(3 + N * i, 3 + N * (i + 1))));
  return { u1: Y[0], u2: Y[1], t: Y[2], lam: Y[n], m, nodes };
}

// tangent of the curve at a solution: null vector of [J | Flam], oriented like tauPrev
function tangentAt(J, Flam, tauPrev) {
  const n = Flam.length;
  const A = J.map((row, i) => [...Array.from(row), Flam[i]]);
  A.push(Array.from(tauPrev));
  const rhs = new Array(n + 1).fill(0);
  rhs[n] = 1;
  const x = solve(A, rhs);
  if (!x) return null;
  const t = unit(x);
  return dot(t, tauPrev) < 0 ? t.map((v) => -v) : t;
}

// newton on [F = 0, tau . (Y - Yp) = 0]. returns the solution with its jacobian so the next tangent is cheap.
function correct(Yp, tau, m, t0) {
  const n = Yp.length - 1;
  let Y = Float64Array.from(Yp);
  for (let it = 0; it < 12; it++) {
    const sys = system(Float64Array.from(Y.subarray(0, n)), Y[n], m);
    const Fn = sup(sys.F);
    if (Fn < 1e-11) return { ok: true, Y, J: sys.J, Flam: sys.Flam, iters: it };
    const A = sys.J.map((row, i) => [...Array.from(row), sys.Flam[i]]);
    A.push(Array.from(tau));
    const rhs = [...Array.from(sys.F, (v) => -v), -dot(tau, Y.map((v, i) => v - Yp[i]))];
    const d = solve(A, rhs);
    if (!d) return { ok: false };
    let accepted = false;
    for (let a = 1; a > 1 / 16; a /= 2) {
      const Yn = Float64Array.from(Y, (v, i) => v + a * d[i]);
      if (Yn[2] < 0.3 * t0 || Yn[2] > 3 * t0 || Math.abs(Yn[n]) > 1.2) continue;
      const Fnew = residual(Yn.subarray(0, n), Yn[n], m);
      if (Fnew && sup(Fnew) < Fn) { Y = Yn; accepted = true; break; }
    }
    if (!accepted) return { ok: false };
  }
  return { ok: false };
}

// follow the family from a starting orbit until the rotation angle theta is 0.
// dir = +1 or -1 picks which way along the curve to start.
export function huntArclength(u1, u2, lam0, t0, { m = 8, dir = 1, maxMs = 600000, thTol = 2e-8, hMax = 0.15, maxSteps = 6000, all = false, trace = null } = {}) {
  const started = Date.now();
  const first = closePerpMS(u1, u2, lam0, t0, { m, maxMs: 120000 });
  if (!(first.res < 1e-9)) return { ok: false, why: 'start did not close' };
  const n = 3 + N * (m - 1);
  const z0 = packZ(first);
  const sys0 = system(z0, lam0, m);
  const dz = solve(sys0.J.map((r) => Array.from(r)), Array.from(sys0.Flam, (v) => -v));
  if (!dz) return { ok: false, why: 'singular at the start' };
  let tau = unit([...dz, 1].map((v) => v * dir));
  let Y = toY(z0, lam0);
  let th = thetaOf({ ...first });
  if (th === null) return { ok: false, why: 'start orbit failed' };
  if (Math.abs(th) < thTol) return arcFinish(Y, m);
  let h = Math.min(hMax, 0.002 / Math.max(Math.abs(tau[n]), 1e-6));
  let steps = 0, lamMin = lam0, lamMax = lam0;
  const found = [];
  const end = (why) => (found.length ? { ok: true, orbits: found, why, steps, lamMin, lamMax } : { ok: false, why, lam: Y[n], th, steps, lamMin, lamMax });
  while (steps++ < maxSteps) {
    if (Date.now() - started > maxMs) return end('out of time');
    const Yp = Float64Array.from(Y, (v, i) => v + h * tau[i]);
    const c = correct(Yp, tau, m, t0);
    let accept = false, tauNew = null;
    if (c.ok) {
      tauNew = tangentAt(c.J, c.Flam, tau);
      accept = tauNew && dot(tauNew, tau) > Math.cos(0.35);   // don't jump to another branch
    }
    if (!accept) {
      h /= 2;
      if (h < 1e-9) return end('lost the family near lam=' + Y[n].toFixed(4));
      continue;
    }
    const thNew = thetaOf(solOf(c.Y, m));
    if (thNew === null) { h /= 2; continue; }
    // theta must not jump, or two zeros could hide between the points (it wraps around at +-pi)
    let dth = Math.abs(thNew - th);
    if (dth > Math.PI) dth = 2 * Math.PI - dth;
    if (dth > Math.max(0.03, 0.3 * Math.abs(th)) && h > 1e-6) { h /= 2; continue; }
    if (Math.abs(thNew) < thTol) { const o = arcFinish(c.Y, m); if (o.ok) found.push(o); if (!all && o.ok) return o; }
    else if (th * thNew < 0 && Math.abs(th) < 1 && Math.abs(thNew) < 1) {
      const Yz = refineZero(Y, c.Y, th, thNew, m, t0, thTol);
      if (!Yz) return { ok: false, why: 'zero of theta not refined', lam: Y[n], th, steps, lamMin, lamMax };
      const o = arcFinish(Yz, m);
      if (o.ok) found.push(o);
      if (!all && o.ok) return o;
    }
    if (trace) trace(steps, c.Y[n], thNew, h, c.iters, c.Y);
    // accept the step
    Y = c.Y; tau = tauNew; th = thNew;
    lamMin = Math.min(lamMin, Y[n]); lamMax = Math.max(lamMax, Y[n]);
    h = Math.min(hMax, c.iters <= 3 ? h * 1.4 : h);
  }
  return end('no convergence');
}

// theta changes sign between A and B (points on the curve): illinois regula falsi along the chord,
// with the constraint plane perpendicular to it. returns the point with |theta| < thTol or null
function refineZero(A, B, thA, thB, m, t0, thTol) {
  A = Float64Array.from(A); B = Float64Array.from(B);
  let fA = thA, fB = thB, side = 0;
  for (let k = 0; k < 60; k++) {
    const frac = -fA / (fB - fA);
    const chord = B.map((v, i) => v - A[i]);
    const c = correct(Float64Array.from(A, (v, i) => v + frac * chord[i]), unit(chord), m, t0);
    if (!c.ok) return null;
    const tc = thetaOf(solOf(c.Y, m));
    if (tc === null) return null;
    if (Math.abs(tc) < thTol) return c.Y;
    if (tc * thB > 0) {
      B = Float64Array.from(c.Y); thB = tc; fB = tc;
      if (side === -1) fA /= 2;
      side = -1;
    } else {
      A = Float64Array.from(c.Y); fA = tc;
      if (side === 1) fB /= 2;
      side = 1;
    }
  }
  return null;
}

function toY(z, lam) {
  const Y = new Float64Array(z.length + 1);
  Y.set(z);
  Y[z.length] = lam;
  return Y;
}

function arcFinish(Y, m) {
  const sol = solOf(Y, m);
  const info = perpInfo(sol.u1, sol.u2, sol.lam, sol.t);
  if (!info) return { ok: false, why: 'zero found but the orbit does not integrate' };
  return { ok: true, u1: sol.u1, u2: sol.u2, lam: sol.lam, t: sol.t, res: 0, info };
}

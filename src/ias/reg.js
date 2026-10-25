// reg.js: algorithmic regularisation of the N-body problem (N = 2 or 3, masses as a parameter, G = 1) in chain coordinates, for the encounter pieces.
// Method: logarithmic Hamiltonian Lambda = log(T + Pt) - log(U) (Mikkola and Tanikawa 1999 eqs 1-5, 13-15), drift-kick-drift modified leapfrog (their eqs 19-22 and A6),
// Bulirsch-Stoer extrapolation (their section 5), chain coordinates (their section 4.1, eqs 16-18). The step control, the double-double energy constant and time,
// the chain re-formation rule for three bodies, the end-time search and the hand differentiation are our own.
// Equations in the fictitious time s (U = force function, positive; H = T - U; Pt = U0 - T0 = -E0):   Q' = (dT/dP) / (T + Pt),   P' = (1/U) dU/dQ,   t' = 1 / (T + Pt).
//   signs: eqs 13 and 20 as printed in the paper carry a minus in front of (1/U) dU/dQ; with U = sum m m / r positive, eq 2 (P' = U_Q / U) and the two-body leapfrog (eq 10) give the plus sign used here (checked on Kepler orbits).
// Chain: particles in chain order perm; X_k = r[perm[k+1]] - r[perm[k]]; momenta p_i = m_i (v_i - V_cm); W_k = -sum_{i<=k} p[perm[i]];
//   T = sum_k (1/2)(1/m_k + 1/m_{k+1}) W_k^2 - sum_{k>=1} W_{k-1}.W_k / m_k;  U = sum_{i<j} m_i m_j / |X_i + ... + X_{j-1}| (chain positions).
// State layout of the interface (as the bridge): positions x0,y0,x1,y1,...  then velocities vx0,vy0,vx1,vy1,...  (length 4N).
'use strict';
export const DEFAULTS = { comp: true, TOL: 1e-15, nseq: [2, 4, 6, 8], kmin: 3, safety: 0.9, gmax: 2, gmin: 0.5, d6: 'D6p', ds0f: 0.05, endUlp: 4, stagUlp: 64, maxEnd: 60, maxMacro: 3000000 };
// ---------------------------------------------------------------- double-double (error-free transformations; no fused operations)
const SP = 134217729;
const twoSum = (a, b) => { const s = a + b, bb = s - a; return [s, (a - (s - bb)) + (b - bb)]; };
const quickTwoSum = (a, b) => { const s = a + b; return [s, b - (s - a)]; };
const split = (a) => { const t = SP * a, hi = t - (t - a); return [hi, a - hi]; };
const twoProd = (a, b) => { const p = a * b, [ah, al] = split(a), [bh, bl] = split(b); return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl]; };
export const ddAdd = (a, b) => { let [s, e] = twoSum(a[0], b[0]); const [t, f] = twoSum(a[1], b[1]); e += t; [s, e] = quickTwoSum(s, e); e += f; return quickTwoSum(s, e); };
export const ddNeg = (a) => [-a[0], -a[1]];
export const ddMul = (a, b) => { let [p, e] = twoProd(a[0], b[0]); e += a[0] * b[1] + a[1] * b[0]; return quickTwoSum(p, e); };
export const ddMulD = (a, d) => { let [p, e] = twoProd(a[0], d); e += a[1] * d; return quickTwoSum(p, e); };
export const ddDiv = (a, b) => { const q1 = a[0] / b[0]; let r = ddAdd(a, ddNeg(ddMulD(b, q1))); const q2 = r[0] / b[0]; r = ddAdd(r, ddNeg(ddMulD(b, q2))); const q3 = r[0] / b[0]; return ddAdd(quickTwoSum(q1, q2), [q3, 0]); };
export const ddSqrt = (a) => { if (!(a[0] > 0)) return [0, 0]; const s = Math.sqrt(a[0]); const r = ddAdd(a, ddNeg(twoProd(s, s))); return quickTwoSum(s, r[0] / (2 * s)); };
const _f = new Float64Array(1), _u = new BigUint64Array(_f.buffer);
export function ulp(x) { x = Math.abs(x); if (x === 0) return 5e-324; _f[0] = x; _u[0] += 1n; return _f[0] - x; }
// ---------------------------------------------------------------- chain system (depends on the chain order only)
function makeSys(masses, perm) {
  const N = masses.length, nQ = 2 * (N - 1), mc = perm.map((i) => masses[i]), A = new Float64Array(nQ * nQ);
  for (let k = 0; k < N - 1; k++) { const c = 0.5 * (1 / mc[k] + 1 / mc[k + 1]); A[2 * k * nQ + 2 * k] = 2 * c; A[(2 * k + 1) * nQ + 2 * k + 1] = 2 * c; }
  for (let k = 1; k < N - 1; k++) { const d = 1 / mc[k]; for (let a = 0; a < 2; a++) { A[(2 * (k - 1) + a) * nQ + 2 * k + a] = -d; A[(2 * k + a) * nQ + 2 * (k - 1) + a] = -d; } }
  const pairs = []; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push({ mm: mc[i] * mc[j], k0: i, k1: j });
  return { N, nQ, mc, A, pairs, perm: perm.slice() };
}
function matvec(A, v, out, n) { for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += A[i * n + j] * v[j]; out[i] = s; } }
function Tval(sys, P, AP) { matvec(sys.A, P, AP, sys.nQ); let T = 0; for (let i = 0; i < sys.nQ; i++) T += P[i] * AP[i]; return 0.5 * T; }
function potential(sys, Q, wantH) {
  const nQ = sys.nQ; let U = 0; const G = new Float64Array(nQ), H = wantH ? new Float64Array(nQ * nQ) : null;
  for (const pr of sys.pairs) {
    let dx = 0, dy = 0; for (let k = pr.k0; k < pr.k1; k++) { dx += Q[2 * k]; dy += Q[2 * k + 1]; }
    const R2 = dx * dx + dy * dy, R = Math.sqrt(R2), R3 = R2 * R; U += pr.mm / R; const gx = -pr.mm * dx / R3, gy = -pr.mm * dy / R3;
    for (let k = pr.k0; k < pr.k1; k++) { G[2 * k] += gx; G[2 * k + 1] += gy; }
    if (H) {
      const R5 = R3 * R2, hxx = pr.mm * (3 * dx * dx / R5 - 1 / R3), hxy = pr.mm * 3 * dx * dy / R5, hyy = pr.mm * (3 * dy * dy / R5 - 1 / R3);
      for (let k = pr.k0; k < pr.k1; k++) for (let l = pr.k0; l < pr.k1; l++) { H[2 * k * nQ + 2 * l] += hxx; H[2 * k * nQ + 2 * l + 1] += hxy; H[(2 * k + 1) * nQ + 2 * l] += hxy; H[(2 * k + 1) * nQ + 2 * l + 1] += hyy; }
    }
  }
  return { U, G, H };
}
// ---------------------------------------------------------------- linear maps between the Cartesian state and chain variables
// state s (4N) -> chain (Q, W) for the chain order perm; the centre-of-mass velocity is removed from the momenta (Vcm given or computed in double)
export function toChain(masses, perm, s, Vcm) {
  const N = masses.length, M = masses.reduce((a, b) => a + b, 0), Q = new Float64Array(2 * (N - 1)), W = new Float64Array(2 * (N - 1));
  if (!Vcm) { Vcm = [0, 0]; for (let i = 0; i < N; i++) { Vcm[0] += masses[i] * s[2 * N + 2 * i]; Vcm[1] += masses[i] * s[2 * N + 2 * i + 1]; } Vcm[0] /= M; Vcm[1] /= M; }
  for (let k = 0; k < N - 1; k++) { const a = perm[k], b = perm[k + 1]; Q[2 * k] = s[2 * b] - s[2 * a]; Q[2 * k + 1] = s[2 * b + 1] - s[2 * a + 1]; }
  let cx = 0, cy = 0;
  for (let k = 0; k < N - 1; k++) { const i = perm[k]; cx += masses[i] * (s[2 * N + 2 * i] - Vcm[0]); cy += masses[i] * (s[2 * N + 2 * i + 1] - Vcm[1]); W[2 * k] = -cx; W[2 * k + 1] = -cy; }
  return { Q, W };
}
// chain (Q, W) + centre of mass (position, velocity) -> Cartesian state (4N)
export function fromChain(masses, perm, Q, W, Rcm, Vcm) {
  const N = masses.length, M = masses.reduce((a, b) => a + b, 0), mc = perm.map((i) => masses[i]), out = new Float64Array(4 * N);
  let ox = 0, oy = 0;
  for (let k = 0; k < N - 1; k++) { let S = 0; for (let i = k + 1; i < N; i++) S += mc[i]; ox += Q[2 * k] * S; oy += Q[2 * k + 1] * S; }
  let rx = Rcm[0] - ox / M, ry = Rcm[1] - oy / M;
  for (let i = 0; i < N; i++) {
    const p = perm[i]; if (i > 0) { rx += Q[2 * (i - 1)]; ry += Q[2 * (i - 1) + 1]; }
    out[2 * p] = rx; out[2 * p + 1] = ry;
    const wx0 = i > 0 ? W[2 * (i - 1)] : 0, wy0 = i > 0 ? W[2 * (i - 1) + 1] : 0, wx1 = i < N - 1 ? W[2 * i] : 0, wy1 = i < N - 1 ? W[2 * i + 1] : 0;
    out[2 * N + 2 * p] = Vcm[0] + (wx0 - wx1) / mc[i]; out[2 * N + 2 * p + 1] = Vcm[1] + (wy0 - wy1) / mc[i];
  }
  return out;
}
// the linear change of chain (Q, W) from the order perm to the order newperm
export function reformChain(masses, perm, newperm, Q, W) {
  const N = masses.length, d = new Float64Array(2 * N), p = new Float64Array(2 * N), Qn = new Float64Array(2 * (N - 1)), Wn = new Float64Array(2 * (N - 1));
  for (let i = 0; i < N; i++) {
    const a = perm[i]; if (i > 0) { d[2 * a] = d[2 * perm[i - 1]] + Q[2 * (i - 1)]; d[2 * a + 1] = d[2 * perm[i - 1] + 1] + Q[2 * (i - 1) + 1]; }
    p[2 * a] = (i > 0 ? W[2 * (i - 1)] : 0) - (i < N - 1 ? W[2 * i] : 0); p[2 * a + 1] = (i > 0 ? W[2 * (i - 1) + 1] : 0) - (i < N - 1 ? W[2 * i + 1] : 0);
  }
  let cx = 0, cy = 0;
  for (let k = 0; k < N - 1; k++) {
    const a = newperm[k], b = newperm[k + 1]; Qn[2 * k] = d[2 * b] - d[2 * a]; Qn[2 * k + 1] = d[2 * b + 1] - d[2 * a + 1];
    cx += p[2 * a]; cy += p[2 * a + 1]; Wn[2 * k] = -cx; Wn[2 * k + 1] = -cy;
  }
  return { Q: Qn, W: Wn };
}
function reformMatrices(masses, perm, newperm) {
  const nQ = 2 * (masses.length - 1), LQ = new Float64Array(nQ * nQ), LP = new Float64Array(nQ * nQ), z = new Float64Array(nQ);
  for (let j = 0; j < nQ; j++) {
    const e = new Float64Array(nQ); e[j] = 1; const a = reformChain(masses, perm, newperm, e, z), b = reformChain(masses, perm, newperm, z, e);
    for (let i = 0; i < nQ; i++) { LQ[i * nQ + j] = a.Q[i]; LP[i * nQ + j] = b.W[i]; }
  }
  return { LQ, LP };
}
// ---------------------------------------------------------------- the modified leapfrog (drift-kick-drift, half drifts merged between the sub-steps), with an optional tangent
// y = [Q (nQ), t (1), P (nQ)]; tg = array of tangent vectors of the same layout (t component = the total time perturbation); dPt = the perturbation of Pt of each tangent
function leapfrog(sys, Q0, P0, Pt, n, H, tg0, dPt, wantTg, comp) {
  const nQ = sys.nQ, h = H / n, Q = Float64Array.from(Q0), P = Float64Array.from(P0), Qc = new Float64Array(nQ), Pc = new Float64Array(nQ); let tt = 0, ttc = 0;
  // compensated (error-free) sums for Q, P and t when comp: the increments are exact sums of hi + lo; the function returns the INCREMENTS over the macro-step
  const add = comp ? (a, c, i, inc) => { const s = a[i] + inc, bb = s - a[i]; c[i] += (a[i] - (s - bb)) + (inc - bb); a[i] = s; } : (a, c, i, inc) => { a[i] += inc; };
  const tg = wantTg ? tg0.map((a) => Float64Array.from(a)) : null, AP = new Float64Array(nQ), AdP = new Float64Array(nQ);
  const drift = (hh) => {
    const T = Tval(sys, P, AP), D = (T + Pt) + (sys.PtLo || 0), iD = 1 / D;   // the low part of the double-double energy constant enters here
    if (wantTg) for (let c = 0; c < tg.length; c++) {
      const g = tg[c]; let dot = 0;
      for (let i = 0; i < nQ; i++) { let s = 0; for (let j = 0; j < nQ; j++) s += sys.A[i * nQ + j] * g[nQ + 1 + j]; AdP[i] = s; dot += AP[i] * g[nQ + 1 + i]; }
      const dD = dot + dPt[c], q = dD * iD * iD;
      for (let i = 0; i < nQ; i++) g[i] += hh * (AdP[i] * iD - AP[i] * q);
      g[nQ] += hh * (-q);
    }
    for (let i = 0; i < nQ; i++) add(Q, Qc, i, hh * AP[i] * iD);
    { const inc = hh * iD; if (comp) { const s = tt + inc, bb = s - tt; ttc += (tt - (s - bb)) + (inc - bb); tt = s; } else tt += inc; }
  };
  const kick = (hh) => {
    const { U, G, H: Hm } = potential(sys, Q, wantTg), iU = 1 / U;
    if (wantTg) for (let c = 0; c < tg.length; c++) {
      const g = tg[c]; let dotG = 0;
      for (let j = 0; j < nQ; j++) dotG += G[j] * g[j];
      for (let i = 0; i < nQ; i++) { let s = 0; for (let j = 0; j < nQ; j++) s += Hm[i * nQ + j] * g[j]; g[nQ + 1 + i] += hh * (s * iU - G[i] * dotG * iU * iU); }
    }
    for (let i = 0; i < nQ; i++) add(P, Pc, i, hh * G[i] * iU);
  };
  drift(h / 2); kick(h);
  for (let m = 2; m <= n; m++) { drift(h); kick(h); }
  drift(h / 2);
  const y = new Float64Array(2 * nQ + 1);
  for (let i = 0; i < nQ; i++) { y[i] = (Q[i] - Q0[i]) + Qc[i]; y[nQ + 1 + i] = (P[i] - P0[i]) + Pc[i]; }
  y[nQ] = tt + ttc;
  return { y, tg };
}
function extrap(a, b, f) {
  const y = new Float64Array(a.y.length); for (let i = 0; i < y.length; i++) y[i] = a.y[i] + (a.y[i] - b.y[i]) / f;
  let tg = null; if (a.tg) tg = a.tg.map((v, c) => { const o = new Float64Array(v.length); for (let i = 0; i < o.length; i++) o[i] = v[i] + (v[i] - b.tg[c][i]) / f; return o; });
  return { y, tg };
}
function errNorm(sys, a, b, Q0, P0, o) {
  // a, b: increments over the macro-step of two columns; the scales use the absolute state Q0 + a, P0 + a
  const nQ = sys.nQ; let kc = -1, sc = 1;
  if (o.d6 === 'D6p') {   // relative control of the SHORTEST chain vector: scale = min(|X| at the start, |X| at the end of the extrapolated column)
    let best = Infinity; for (let k = 0; k < nQ / 2; k++) { const n0 = Math.hypot(Q0[2 * k], Q0[2 * k + 1]); if (n0 < best) { best = n0; kc = k; } }
    sc = Math.min(best, Math.hypot(Q0[2 * kc] + a[2 * kc], Q0[2 * kc + 1] + a[2 * kc + 1]));
  }
  let err = 0;
  for (let i = 0; i < a.length; i++) {
    const base = i < nQ ? Q0[i] : (i === nQ ? 0 : P0[i - nQ - 1]); let s = Math.max(1, Math.abs(base + a[i])); if (kc >= 0 && i < nQ && (i === 2 * kc || i === 2 * kc + 1)) s = sc;
    const d = Math.abs(a[i] - b[i]) / s; if (!(d <= err)) { if (!Number.isFinite(d)) return Infinity; err = d; }
  }
  return err;
}
// one extrapolated macro-step of the fictitious-time length H from (Q, P); returns null if no column up to the last converges
function gbsStep(sys, Q, P, Pt, H, tg, dPt, o, wantTg, stats) {   // returns the INCREMENTS of (Q, t, P) over the macro-step
  const ns = o.nseq, K = ns.length, T = []; let lastErr = Infinity;
  for (let j = 0; j < K; j++) {
    const r = leapfrog(sys, Q, P, Pt, ns[j], H, tg, dPt, wantTg, o.comp); stats.subSteps += ns[j];
    const row = [r];
    for (let kk = 1; kk <= j; kk++) row.push(extrap(row[kk - 1], T[j - 1][kk - 1], (ns[j] / ns[j - kk]) ** 2 - 1));
    T.push(row);
    if (j + 1 >= o.kmin) { const err = errNorm(sys, row[j].y, row[j - 1].y, Q, P, o); lastErr = err; if (err <= o.TOL) return { res: row[j], err, k: j + 1 }; }
  }
  return null;
}
// ---------------------------------------------------------------- the flow of the N-body system over the physical time tau
// flowChain(masses, s, tau, {jac, settings}) -> { ok, end (4N), M (4N x 4N row-major, row = output component) or null, ...stats }
export function flowChain(masses, s, tau, opts = {}) {
  const o = Object.assign({}, DEFAULTS, opts.settings || {}); const wantTg = !!opts.jac;
  const N = masses.length, nQ = 2 * (N - 1), nY = 2 * nQ + 1, M = masses.reduce((a, b) => a + b, 0), ncol = 4 * N;
  const stats = { macro: 0, rejected: 0, subSteps: 0, endTrials: 0, stagnation: false, reforms: 0, minD1: Infinity, d2AtMinD1: NaN, maxEnergyDiag: 0, lastEnergyDiag: 0, columns: {} };
  // centre of mass (error-free sums)
  const Rcm0 = [0, 0], Vcm = [0, 0];
  for (let c = 0; c < 2; c++) {
    let pr = [0, 0], pv = [0, 0];
    for (let i = 0; i < N; i++) { pr = ddAdd(pr, ddMulD([s[2 * i + c], 0], masses[i])); pv = ddAdd(pv, ddMulD([s[2 * N + 2 * i + c], 0], masses[i])); }
    Rcm0[c] = ddDiv(pr, [M, 0])[0]; Vcm[c] = ddDiv(pv, [M, 0])[0];
  }
  // initial chain order (shortest pair first, the third body attached to the nearer end)
  let perm = [0, 1]; if (N === 3) {
    const d = (a, b) => Math.hypot(s[2 * b] - s[2 * a], s[2 * b + 1] - s[2 * a + 1]); const pd = [[d(0, 1), 0, 1, 2], [d(0, 2), 0, 2, 1], [d(1, 2), 1, 2, 0]]; pd.sort((x, y) => x[0] - y[0]);
    const [, a, b, c] = pd[0]; perm = d(c, a) < d(c, b) ? [c, a, b] : [a, b, c];
  }
  let PtLo = 0; const sysCache = new Map(); const getSys = (pm) => { const k = pm.join(','); if (!sysCache.has(k)) sysCache.set(k, makeSys(masses, pm)); const sy = sysCache.get(k); sy.PtLo = PtLo; return sy; };
  let sys = getSys(perm); const AP = new Float64Array(nQ);
  const ch = toChain(masses, perm, s, Vcm); let Q = ch.Q, P = ch.W, Ql = new Float64Array(nQ), Pl = new Float64Array(nQ);   // hi parts and, with comp, the low parts of the state (double-double between the macro-steps)
  // Pt = U0 - T0 in double-double
  let Pt;
  { const dN = (x, y) => { const sx = ddMul([x, 0], [x, 0]), sy = ddMul([y, 0], [y, 0]); return ddSqrt(ddAdd(sx, sy)); };
    let Ud = [0, 0]; for (const pr of sys.pairs) { let dx = [0, 0], dy = [0, 0]; for (let k = pr.k0; k < pr.k1; k++) { dx = ddAdd(dx, [Q[2 * k], 0]); dy = ddAdd(dy, [Q[2 * k + 1], 0]); } const R = ddSqrt(ddAdd(ddMul(dx, dx), ddMul(dy, dy))); Ud = ddAdd(Ud, ddDiv([pr.mm, 0], R)); }
    let Td = [0, 0]; for (let i = 0; i < nQ; i++) for (let j = 0; j < nQ; j++) { const a = sys.A[i * nQ + j]; if (a !== 0) Td = ddAdd(Td, ddMulD(ddMul([P[i], 0], [P[j], 0]), 0.5 * a)); }
    const Pd = ddAdd(Ud, ddNeg(Td)); Pt = Pd[0]; PtLo = o.comp ? Pd[1] : 0; sys.PtLo = PtLo; void dN; }
  // tangent columns: unit perturbations of the 4N input components
  let tg = null, dPt = null;
  if (wantTg) {
    tg = []; dPt = new Float64Array(ncol); const pot0 = potential(sys, Q, false); Tval(sys, P, AP);
    for (let c = 0; c < ncol; c++) {
      const e = new Float64Array(4 * N); e[c] = 1; const cl = toChain(masses, perm, e, [0, 0]); // the linear map (Vcm of a unit column is taken from the column itself below)
      const eV = new Float64Array(4 * N); eV.set(e); const dV = [0, 0]; if (c >= 2 * N) { dV[(c - 2 * N) % 2] = masses[Math.floor((c - 2 * N) / 2)] / M; }
      const dl = toChain(masses, perm, eV, dV);
      const g = new Float64Array(nY); g.set(cl.Q, 0); g.set(dl.W, nQ + 1); void cl;
      let dp = 0; for (let i = 0; i < nQ; i++) dp += pot0.G[i] * g[i] - AP[i] * g[nQ + 1 + i]; dPt[c] = dp; tg.push(g);
    }
  }
  const dRcm0 = [], dVcm0 = [];   // centre of mass tangents of the unit columns
  if (wantTg) for (let c = 0; c < ncol; c++) { const r = [0, 0], v = [0, 0]; if (c < 2 * N) r[c % 2] = masses[Math.floor(c / 2)] / M; else v[(c - 2 * N) % 2] = masses[Math.floor((c - 2 * N) / 2)] / M; dRcm0.push(r); dVcm0.push(v); }
  let tdd = [0, 0];
  const U0 = potential(sys, Q, false).U; let Ds = o.ds0f * U0 * Math.min(tau, 0.1);
  const diag = (Qn, Pn) => {
    const pot = potential(sys, Qn, false); const T = Tval(sys, Pn, AP); const dg = ((T + Pt) + PtLo) - pot.U; stats.lastEnergyDiag = dg; if (Math.abs(dg) > stats.maxEnergyDiag) stats.maxEnergyDiag = Math.abs(dg);
    const ds = []; for (let k = 0; k < N - 1; k++) ds.push(Math.hypot(Qn[2 * k], Qn[2 * k + 1])); if (N === 3) ds.push(Math.hypot(Qn[0] + Qn[2], Qn[1] + Qn[3]));
    ds.sort((x, y) => x - y); if (ds[0] < stats.minD1) { stats.minD1 = ds[0]; stats.d2AtMinD1 = ds.length > 1 ? ds[1] : NaN; }
  };
  diag(Q, P);
  const reformCheck = () => {
    if (N !== 3) return;
    const n0 = Math.hypot(Q[0], Q[1]), n1 = Math.hypot(Q[2], Q[3]), n02 = Math.hypot(Q[0] + Q[2], Q[1] + Q[3]);
    if (n02 < Math.min(n0, n1)) {
      const a = perm[0], b = perm[2], c = perm[1]; const np = n0 < n1 ? [c, a, b] : [a, b, c];
      const r = reformChain(masses, perm, np, Q, P), rl = reformChain(masses, perm, np, Ql, Pl);
      if (wantTg) { const { LQ, LP } = reformMatrices(masses, perm, np); for (const g of tg) { const q0 = g.slice(0, nQ), p0 = g.slice(nQ + 1); for (let i = 0; i < nQ; i++) { let sq = 0, sp = 0; for (let j = 0; j < nQ; j++) { sq += LQ[i * nQ + j] * q0[j]; sp += LP[i * nQ + j] * p0[j]; } g[i] = sq; g[nQ + 1 + i] = sp; } } }
      Q = r.Q; P = r.W; Ql = rl.Q; Pl = rl.W; perm = np; sys = getSys(perm); stats.reforms++;
    }
  };
  let final = null;
  for (;;) {
    if (++stats.macro > o.maxMacro) return Object.assign({ ok: false, reason: 'too many macro-steps' }, stats);
    const r = gbsStep(sys, Q, P, Pt, Ds, tg, dPt, o, wantTg, stats);
    if (!r) { Ds *= 0.5; stats.rejected++; if (!(Ds > 1e-300)) return Object.assign({ ok: false, reason: 'macro-step collapsed' }, stats); continue; }
    stats.columns[r.k] = (stats.columns[r.k] || 0) + 1;
    const dt = r.res.y[nQ], tn = ddAdd(tdd, [dt, 0]);
    if (tn[0] > tau || (tn[0] === tau && tn[1] > 0)) {
      // overshoot: the end-time search from the start of this macro-step
      // bracketed search. t(s) grows with s, so the root lies in [0, Ds] (Ds = the overshooting step); a Newton step is taken only if it stays strictly inside the bracket, else bisection; at most o.maxEnd trials
      const rem = ddAdd([tau, 0], ddNeg(tdd))[0], D0 = (Tval(sys, P, AP) + Pt) + PtLo; let lo = 0, hi = Ds, H = rem * D0, best = null, stag = 0, nbis = 0, viaBis = false;
      if (!(H > lo && H < hi)) { H = 0.5 * (lo + hi); nbis++; viaBis = true; }
      for (let trial = 1; trial <= o.maxEnd; trial++) {
        stats.endTrials++; const rr = gbsStep(sys, Q, P, Pt, H, tg, dPt, o, wantTg, stats);
        if (!rr) { hi = H; H = 0.5 * (lo + hi); nbis++; viaBis = true; continue; }
        const dtt = rr.res.y[nQ], f = ddAdd(ddAdd(tdd, [dtt, 0]), [-tau, 0])[0], ul = ulp(dtt);
        const Pe = Float64Array.from({ length: nQ }, (_, i) => P[i] + (rr.res.y[nQ + 1 + i] + Pl[i])), rate = 1 / ((Tval(sys, Pe, AP) + Pt) + PtLo);
        const cand = { f, ulp: ul, rr, H, rate };
        if (Math.abs(f) <= o.endUlp * ul) { best = cand; break; }
        const improved = !best || Math.abs(f) < Math.abs(best.f);
        if (improved) { best = cand; stag = 0; } else if (!viaBis) stag++;
        if (stag >= 2) break;
        if (f > 0) hi = H; else lo = H;
        let Hn = H - f / rate; viaBis = false;
        if (!(Hn > lo && Hn < hi) || !Number.isFinite(Hn)) { Hn = 0.5 * (lo + hi); viaBis = true; nbis++; }
        if (!(Hn > lo && Hn < hi)) break;   // the bracket has no double inside
        H = Hn;
      }
      stats.endBisections = nbis;
      if (!best) return Object.assign({ ok: false, reason: 'end-time iteration (no trial converged)' }, stats);
      if (Math.abs(best.f) > o.stagUlp * best.ulp) return Object.assign({ ok: false, reason: 'end-time iteration', fRes: best.f, ulp: best.ulp }, stats);
      stats.stagnation = Math.abs(best.f) > o.endUlp * best.ulp; final = best; break;
    }
    // accept
    { const y = r.res.y;   // the state advances by the increments, in double-double when comp
      for (let i = 0; i < nQ; i++) {
        if (o.comp) { let sm = twoSum(Q[i], y[i]); let h2 = quickTwoSum(sm[0], sm[1] + Ql[i]); Q[i] = h2[0]; Ql[i] = h2[1]; sm = twoSum(P[i], y[nQ + 1 + i]); h2 = quickTwoSum(sm[0], sm[1] + Pl[i]); P[i] = h2[0]; Pl[i] = h2[1]; }
        else { Q[i] += y[i]; P[i] += y[nQ + 1 + i]; }
      } tdd = tn; }
    if (wantTg) tg = r.res.tg;
    diag(Q, P); reformCheck();
    const fac = r.err === 0 ? o.gmax : Math.min(o.gmax, Math.max(o.gmin, o.safety * Math.pow(o.TOL / r.err, 1 / (2 * r.k - 1)))); Ds *= fac;
    const remn = ddAdd([tau, 0], ddNeg(tdd)); if (remn[0] <= 0) { final = { f: 0, ulp: ulp(dt), rr: null, exact: true }; break; }
  }
  // end state
  let Qe, Pe, tgE = null, tEnd;
  if (final.exact) { Qe = Float64Array.from(Q, (v, i) => v + Ql[i]); Pe = Float64Array.from(P, (v, i) => v + Pl[i]); tgE = tg; tEnd = tdd; }
  else {
    const y = final.rr.res.y; Qe = Float64Array.from({ length: nQ }, (_, i) => Q[i] + (y[i] + Ql[i])); Pe = Float64Array.from({ length: nQ }, (_, i) => P[i] + (y[nQ + 1 + i] + Pl[i])); tEnd = ddAdd(tdd, [y[nQ], 0]); tgE = final.rr.res.tg;
    if (wantTg) {   // the end-time dependence: dZ/dy0 = dZ - (dZ/ds) dt / (dt/ds)
      const Tq = Tval(sys, Pe, AP); const D = (Tq + Pt) + PtLo, fP = Array.from(AP, (v) => v / D), gE = potential(sys, Qe, false); const gQ = Array.from(gE.G, (v) => v / gE.U), rateT = 1 / D;
      tgE = tgE.map((g) => { const o2 = Float64Array.from(g), k = g[nQ] / rateT; for (let i = 0; i < nQ; i++) { o2[i] -= fP[i] * k; o2[nQ + 1 + i] -= gQ[i] * k; } o2[nQ] = 0; return o2; });
    }
  }
  const Rcm1 = [0, 0]; for (let c = 0; c < 2; c++) Rcm1[c] = ddAdd([Rcm0[c], 0], ddMulD([tau, 0], Vcm[c]))[0];
  const end = fromChain(masses, perm, Qe, Pe, Rcm1, Vcm);
  let Mat = null;
  if (wantTg) {
    Mat = new Float64Array(ncol * ncol);
    for (let c = 0; c < ncol; c++) {
      const g = tgE[c], dRe = [dRcm0[c][0] + tau * dVcm0[c][0], dRcm0[c][1] + tau * dVcm0[c][1]];
      const col = fromChain(masses, perm, g.subarray(0, nQ), g.subarray(nQ + 1), dRe, dVcm0[c]);
      for (let i = 0; i < ncol; i++) Mat[i * ncol + c] = col[i];
    }
  }
  const fres = final.exact ? 0 : final.f;
  return Object.assign({ ok: true, end, M: Mat, tEnd, fRes: fres, ulpDt: final.ulp, fOverUlp: final.ulp > 0 ? Math.abs(fres) / final.ulp : 0, perm, Pt }, stats);
}
// the interface of the bridge for the three equal masses: state (12) -> { end, M (144), ... }
export function flowEnc(state12, tau, opts = {}) { return flowChain([1, 1, 1], state12, tau, opts); }
// ---------------------------------------------------------------- operations for the tests of the derivative; values and tangents in chain variables
// spec: { masses, perm, Q, P, Pt, op: 'drift'|'kick'|'macro', hh, H, nseq }  tangent columns: unit perturbations of Q (nQ), of P (nQ) and of Pt (one column)
export function opTest(spec) {
  const sys = makeSys(spec.masses, spec.perm), nQ = sys.nQ, nY = 2 * nQ + 1, Q = Float64Array.from(spec.Q), P = Float64Array.from(spec.P), Pt = spec.Pt;
  const tg = [], dPt = new Float64Array(2 * nQ + 1);
  for (let c = 0; c < 2 * nQ; c++) { const g = new Float64Array(nY); if (c < nQ) g[c] = 1; else g[nQ + 1 + (c - nQ)] = 1; tg.push(g); }
  tg.push(new Float64Array(nY)); dPt[2 * nQ] = 1;
  const stats = { subSteps: 0 };
  if (spec.op === 'macro') {
    const ns = spec.nseq, T = [];
    for (let j = 0; j < ns.length; j++) {
      const r = leapfrog(sys, Q, P, Pt, ns[j], spec.H, tg, dPt, true, false), row = [r];
      for (let kk = 1; kk <= j; kk++) row.push(extrap(row[kk - 1], T[j - 1][kk - 1], (ns[j] / ns[j - kk]) ** 2 - 1));
      T.push(row);
    }
    const last = T[ns.length - 1][ns.length - 1]; return { y: Array.from(last.y, (v, i) => (i < nQ ? Q[i] + v : i === nQ ? v : P[i - nQ - 1] + v)), tg: last.tg.map((v) => Array.from(v)) };
  }
  // a single operation: a leapfrog with n = 1 is drift(h/2) kick(h) drift(h/2); the separate drift and kick are provided by n-independent helpers below
  const out = singleOp(sys, Q, P, Pt, spec.op, spec.hh, tg, dPt);
  return { y: Array.from(out.y), tg: out.tg.map((v) => Array.from(v)) };
}
function singleOp(sys, Q0, P0, Pt, op, hh, tg0, dPt) {
  // implemented by the same code as inside leapfrog (a copy of the two closures; kept identical): used only by the unit test
  const nQ = sys.nQ, Q = Float64Array.from(Q0), P = Float64Array.from(P0), tg = tg0.map((a) => Float64Array.from(a)), AP = new Float64Array(nQ), AdP = new Float64Array(nQ); let tt = 0;
  if (op === 'drift') {
    const T = Tval(sys, P, AP), D = T + Pt, iD = 1 / D;
    for (let c = 0; c < tg.length; c++) {
      const g = tg[c]; let dot = 0;
      for (let i = 0; i < nQ; i++) { let s = 0; for (let j = 0; j < nQ; j++) s += sys.A[i * nQ + j] * g[nQ + 1 + j]; AdP[i] = s; dot += AP[i] * g[nQ + 1 + i]; }
      const dD = dot + dPt[c], q = dD * iD * iD; for (let i = 0; i < nQ; i++) g[i] += hh * (AdP[i] * iD - AP[i] * q); g[nQ] += hh * (-q);
    }
    for (let i = 0; i < nQ; i++) Q[i] += hh * AP[i] * iD; tt += hh * iD;
  } else {
    const { U, G, H: Hm } = potential(sys, Q, true), iU = 1 / U;
    for (let c = 0; c < tg.length; c++) {
      const g = tg[c]; let dotG = 0; for (let j = 0; j < nQ; j++) dotG += G[j] * g[j];
      for (let i = 0; i < nQ; i++) { let s = 0; for (let j = 0; j < nQ; j++) s += Hm[i * nQ + j] * g[j]; g[nQ + 1 + i] += hh * (s * iU - G[i] * dotG * iU * iU); }
    }
    for (let i = 0; i < nQ; i++) P[i] += hh * G[i] * iU;
  }
  const y = new Float64Array(2 * nQ + 1); y.set(Q, 0); y[nQ] = tt; y.set(P, nQ + 1); return { y, tg };
}
// round trips of the chain maps: Cartesian -> chain -> Cartesian, and chain -> re-formed chain -> back; returns the relative errors
export function chainRoundTrip(masses, s, perm1, perm2) {
  const N = masses.length, M = masses.reduce((a, b) => a + b, 0), Vcm = [0, 0], Rcm = [0, 0];
  for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { Vcm[c] += masses[i] * s[2 * N + 2 * i + c] / M; Rcm[c] += masses[i] * s[2 * i + c] / M; }
  const a = toChain(masses, perm1, s, Vcm), back = fromChain(masses, perm1, a.Q, a.W, Rcm, Vcm);
  let e1 = 0; for (let i = 0; i < 4 * N; i++) e1 = Math.max(e1, Math.abs(back[i] - s[i]) / Math.max(1, Math.abs(s[i])));
  const r = reformChain(masses, perm1, perm2, a.Q, a.W), r2 = reformChain(masses, perm2, perm1, r.Q, r.W); let e2 = 0;
  for (let i = 0; i < a.Q.length; i++) e2 = Math.max(e2, Math.abs(r2.Q[i] - a.Q[i]) / Math.max(1, Math.abs(a.Q[i])), Math.abs(r2.W[i] - a.W[i]) / Math.max(1, Math.abs(a.W[i])));
  const b2 = fromChain(masses, perm2, r.Q, r.W, Rcm, Vcm); let e3 = 0; for (let i = 0; i < 4 * N; i++) e3 = Math.max(e3, Math.abs(b2[i] - s[i]) / Math.max(1, Math.abs(s[i])));
  return { cart_chain_cart: e1, reform_back: e2, cart_via_reformed: e3 };
}

// linear stability of a periodic orbit: integrate the orbit with its variational equations over one
// period to get the monodromy matrix M. stable if all eigenvalues of M have modulus 1.
// only perturbations with zero center of mass and momentum are used (8 dimensions)

// state x = [x0,y0,x1,y1,x2,y2, vx0,vy0,vx1,vy1,vx2,vy2], G = m = 1
const N = 12;

function accel(x, a) {
  a.fill(0);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const dx = x[2 * j] - x[2 * i], dy = x[2 * j + 1] - x[2 * i + 1];
    const r2 = dx * dx + dy * dy, inv = 1 / (r2 * Math.sqrt(r2));
    a[2 * i] += dx * inv; a[2 * i + 1] += dy * inv;
    a[2 * j] -= dx * inv; a[2 * j + 1] -= dy * inv;
  }
}

// d(accel)/d(position), 6x6, row major
function accelJac(x, K) {
  K.fill(0);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const dx = x[2 * j] - x[2 * i], dy = x[2 * j + 1] - x[2 * i + 1];
    const r2 = dx * dx + dy * dy, r = Math.sqrt(r2), i3 = 1 / (r2 * r), i5 = i3 / r2;
    // block B = I / r^3 - 3 d d^T / r^5, a_i has +B wrt r_j and -B wrt r_i
    const b = [i3 - 3 * dx * dx * i5, -3 * dx * dy * i5, -3 * dx * dy * i5, i3 - 3 * dy * dy * i5];
    for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) {
      const v = b[2 * p + q];
      K[(2 * i + p) * 6 + (2 * j + q)] += v;
      K[(2 * j + p) * 6 + (2 * i + q)] += v;
      K[(2 * i + p) * 6 + (2 * i + q)] -= v;
      K[(2 * j + p) * 6 + (2 * j + q)] -= v;
    }
  }
}

// right hand side for y = [x (12), Phi (12x12)], dPhi/dt = J Phi
const Kt = new Float64Array(36), At = new Float64Array(6);
function rhs(y, out) {
  const x = y.subarray(0, N);
  for (let i = 0; i < 6; i++) out[i] = x[6 + i];
  accel(x, At);
  for (let i = 0; i < 6; i++) out[6 + i] = At[i];
  accelJac(x, Kt);
  const P = y.subarray(N), dP = out.subarray(N);
  // J = [[0, I], [K, 0]]: top 6 rows of dPhi = bottom 6 rows of Phi, bottom rows = K * top rows of Phi
  for (let r = 0; r < 6; r++) for (let c = 0; c < N; c++) dP[r * N + c] = P[(6 + r) * N + c];
  for (let r = 0; r < 6; r++) for (let c = 0; c < N; c++) {
    let s = 0;
    for (let k = 0; k < 6; k++) s += Kt[r * 6 + k] * P[k * N + c];
    dP[(6 + r) * N + c] = s;
  }
}

// dormand prince 5(4), fixed size arrays
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9], [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656], [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]];
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

export function monodromy(x0, T, { rtol = 1e-12, atol = 1e-13, hMax = 0.01 } = {}) {
  const n = N + N * N;
  const y = new Float64Array(n);
  y.set(x0);
  for (let i = 0; i < N; i++) y[N + i * N + i] = 1;
  const k = Array.from({ length: 7 }, () => new Float64Array(n));
  const tmp = new Float64Array(n), ynew = new Float64Array(n);
  let t = 0, h = 1e-3;
  for (let steps = 0; t < T - 1e-14; steps++) {
    if (steps > 2e6) throw new Error('too many steps (near collision?)');
    h = Math.min(h, T - t);
    rhs(y, k[0]);
    for (let s = 1; s < 7; s++) {
      for (let i = 0; i < n; i++) {
        let acc = 0;
        for (let j = 0; j < s; j++) acc += A[s][j] * k[j][i];
        tmp[i] = y[i] + h * acc;
      }
      rhs(tmp, k[s]);
    }
    let err = 0;
    for (let i = 0; i < n; i++) {
      let h5 = 0, h4 = 0;
      for (let j = 0; j < 7; j++) { h5 += B5[j] * k[j][i]; h4 += B4[j] * k[j][i]; }
      ynew[i] = y[i] + h * h5;
      const sc = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(ynew[i]));
      const e = (h * (h5 - h4)) / sc;
      err += e * e;
    }
    err = Math.sqrt(err / n);
    if (err <= 1 || h < 1e-12) {
      y.set(ynew);
      t += h;
      h = Math.min(h * (err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * Math.pow(err, -0.2)))), hMax);
    } else {
      h *= Math.max(0.1, 0.9 * Math.pow(err, -0.2));
    }
  }
  return { end: Float64Array.from(y.subarray(0, N)), M: Array.from({ length: N }, (_, r) => Array.from(y.subarray(N + r * N, N + r * N + N))) };
}

// orthonormal basis (12 x 8) of the perturbations with zero center of mass and zero momentum
function basis() {
  const e1 = [1 / Math.SQRT2, -1 / Math.SQRT2, 0], e2 = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];
  const cols = [];
  for (const off of [0, 6]) for (const c of [0, 1]) for (const e of [e1, e2]) {
    const v = new Array(N).fill(0);
    for (let b = 0; b < 3; b++) v[off + 2 * b + c] = e[b];
    cols.push(v);
  }
  return cols;
}

export function reducedMonodromy(M) {
  const P = basis();
  const out = [];
  for (let a = 0; a < 8; a++) {
    out.push([]);
    for (let b = 0; b < 8; b++) {
      let s = 0;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) s += P[a][i] * M[i][j] * P[b][j];
      out[a].push(s);
    }
  }
  return out;
}

// eigenvalues of a small real matrix, shifted QR in complex arithmetic
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cabs = (a) => Math.hypot(a[0], a[1]);
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const csqrt = (a) => { const r = cabs(a); const re = Math.sqrt((r + a[0]) / 2); const im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, a[1] < 0 ? -im : im]; };

export function eigenvalues(Areal) {
  let m = Areal.length;
  let Mx = Areal.map((row) => row.map((v) => [v, 0]));
  const eig = [];
  let iter = 0;
  while (m > 0) {
    if (m === 1) { eig.push(Mx[0][0]); break; }
    let off = 0;
    for (let j = 0; j < m - 1; j++) off += cabs(Mx[m - 1][j]);
    const scale = cabs(Mx[m - 1][m - 1]) + cabs(Mx[m - 2][m - 2]) + 1e-300;
    if (off < 1e-15 * scale) {
      eig.push(Mx[m - 1][m - 1]);
      m--;
      Mx = Mx.slice(0, m).map((row) => row.slice(0, m));
      iter = 0;
      continue;
    }
    if (++iter > 500) throw new Error('eigenvalue iteration did not converge');
    // wilkinson shift from the bottom 2x2 block
    const a = Mx[m - 2][m - 2], b = Mx[m - 2][m - 1], c = Mx[m - 1][m - 2], d = Mx[m - 1][m - 1];
    const tr = [a[0] + d[0], a[1] + d[1]], det = [cmul(a, d)[0] - cmul(b, c)[0], cmul(a, d)[1] - cmul(b, c)[1]];
    const disc = csqrt([tr[0] * tr[0] / 4 - tr[1] * tr[1] / 4 - det[0], tr[0] * tr[1] / 2 - det[1]]);
    const l1 = [tr[0] / 2 + disc[0], tr[1] / 2 + disc[1]], l2 = [tr[0] / 2 - disc[0], tr[1] / 2 - disc[1]];
    let mu = cabs([l1[0] - d[0], l1[1] - d[1]]) < cabs([l2[0] - d[0], l2[1] - d[1]]) ? l1 : l2;
    // now and then use an unusual shift so we cannot get stuck
    if (iter % 11 === 0) mu = [mu[0] + 0.3 * scale, mu[1] + 0.2 * scale];
    // QR of (A - mu I) with modified gram schmidt on the columns
    const Bm = Mx.map((row, i) => row.map((v, j) => (i === j ? [v[0] - mu[0], v[1] - mu[1]] : v)));
    const Q = Array.from({ length: m }, () => Array.from({ length: m }, () => [0, 0]));
    const R = Array.from({ length: m }, () => Array.from({ length: m }, () => [0, 0]));
    for (let j = 0; j < m; j++) {
      const v = Array.from({ length: m }, (_, i) => [...Bm[i][j]]);
      for (let k = 0; k < j; k++) {
        let dot = [0, 0];
        for (let i = 0; i < m; i++) { const p = cmul([Q[i][k][0], -Q[i][k][1]], v[i]); dot[0] += p[0]; dot[1] += p[1]; }
        R[k][j] = dot;
        for (let i = 0; i < m; i++) { const p = cmul(dot, Q[i][k]); v[i][0] -= p[0]; v[i][1] -= p[1]; }
      }
      let nv = 0;
      for (let i = 0; i < m; i++) nv += v[i][0] ** 2 + v[i][1] ** 2;
      nv = Math.sqrt(nv);
      if (nv < 1e-300) { for (let i = 0; i < m; i++) v[i] = [i === j ? 1 : 0, 0]; nv = 1; R[j][j] = [0, 0]; } else R[j][j] = [nv, 0];
      for (let i = 0; i < m; i++) Q[i][j] = [v[i][0] / nv, v[i][1] / nv];
    }
    // A = R Q + mu I
    const next = Array.from({ length: m }, () => Array.from({ length: m }, () => [0, 0]));
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      let s = [0, 0];
      for (let k = i; k < m; k++) { const p = cmul(R[i][k], Q[k][j]); s[0] += p[0]; s[1] += p[1]; }
      if (i === j) { s[0] += mu[0]; s[1] += mu[1]; }
      next[i][j] = s;
    }
    Mx = next;
  }
  return eig;
}

// one call: stability numbers for an orbit starting at x0 with period T.
// in theory 4 of the 8 eigenvalues are exactly 1 (two jordan blocks: time shift/energy and
// rotation/angular momentum). numerically they scatter by about sqrt(error), so take the 4 closest
// to 1 as the trivial ones and judge stability on the other 4.
export function stability(x0, T) {
  const { M } = monodromy(x0, T);
  const M8 = reducedMonodromy(M);
  const ev = eigenvalues(M8).map((e) => ({ re: e[0], im: e[1], mod: cabs(e) }));
  const dev = (e) => Math.hypot(e.re - 1, e.im);
  const byDev = [...ev].sort((a, b) => dev(a) - dev(b));
  const trivial = byDev.slice(0, 4), non = byDev.slice(4);
  const scatter = Math.max(...trivial.map(dev));
  const maxNon = Math.max(...non.map((e) => e.mod));
  // stable: all four on the unit circle. unstable: clearly off it compared with the noise.
  // otherwise we can't tell (this happens for orbits with very close approaches)
  let status = 'uncertain';
  if (maxNon <= 1 + 1e-6) status = 'stable';
  else if (maxNon - 1 > 10 * scatter) status = 'unstable';
  // consistency check: for a symplectic map the nontrivial eigenvalues come in pairs l, 1/l. if they do not, one of the four that were taken
  // as trivial is probably a real eigenvalue (or the other way round) and the call is not safe
  let pairing = 0;
  for (const e of non) {
    const d = e.re * e.re + e.im * e.im, inv = { re: e.re / d, im: -e.im / d };
    let best = Infinity;
    for (const f of non) best = Math.min(best, Math.hypot(f.re - inv.re, f.im - inv.im));
    pairing = Math.max(pairing, best / Math.max(1, Math.hypot(inv.re, inv.im)));
  }
  // (for a clearly unstable orbit, max |l| above 2, the small member of a pair is lost in rounding error, and the call cannot flip, so it stays)
  if (pairing > 1e-2 && maxNon < 2) status = 'uncertain';
  ev.sort((a, b) => b.mod - a.mod);
  return { eigenvalues: ev, maxMod: ev[0].mod, maxNontrivial: maxNon, scatter, pairing, status, stable: status === 'stable' };
}

// stability of a relative periodic orbit: after one period (2t) the state is the start state rotated by some angle.
// the monodromy matrix is multiplied by the rotation that undoes it, then it is analysed like a periodic orbit.
import { perpInitial } from './perp.js';
import { monodromy, reducedMonodromy, eigenvalues } from './stability.js';

function rotate12(x, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const out = new Float64Array(12);
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) {
    const px = x[off + 2 * i], py = x[off + 2 * i + 1];
    out[off + 2 * i] = c * px - s * py;
    out[off + 2 * i + 1] = s * px + c * py;
  }
  return out;
}

// returns the nontrivial rotation numbers nu (eigenvalues exp(+-2 pi i nu), modulus 1 when stable), sorted, and the angle
export function relativeStability(u1, u2, lam, t) {
  const x0 = perpInitial(u1, u2, lam);
  const { M, end } = monodromy(x0, 2 * t);
  // angle that takes the end state onto the start state
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
    const ax = end[off + 2 * i], ay = end[off + 2 * i + 1], bx = x0[off + 2 * i], by = x0[off + 2 * i + 1];
    C += ax * bx + ay * by;
    S += ax * by - ay * bx;
  }
  const alpha = Math.atan2(S, C);
  // R(alpha) M : rotate every column of M
  const cols = [];
  for (let c = 0; c < 12; c++) cols.push(rotate12(M.map((row) => row[c]), alpha));
  const MR = M.map((row, r) => row.map((_, c) => cols[c][r]));
  const ev = eigenvalues(reducedMonodromy(MR)).map((e) => ({ re: e[0], im: e[1], mod: Math.hypot(e[0], e[1]) }));
  const dev = (e) => Math.hypot(e.re - 1, e.im);
  const byDev = [...ev].sort((a, b) => dev(a) - dev(b));
  const trivial = byDev.slice(0, 4), non = byDev.slice(4);
  const nus = non.filter((e) => e.im >= 0).map((e) => ({ nu: Math.atan2(e.im, e.re) / (2 * Math.PI), mod: e.mod }));
  return { alpha, scatter: Math.max(...trivial.map(dev)), nus, maxMod: Math.max(...non.map((e) => e.mod)) };
}

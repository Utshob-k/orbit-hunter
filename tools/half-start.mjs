// the state of a perpendicular start of R at the half period t, written again as a perpendicular start (used by half-period-check.mjs and two-senses-check.mjs).
// (u1, u2, lam, t) -> two candidates (the two rotations that put the line on the x axis differ by a half turn): { u1, u2, lam, t, perpErr }
import { perpInitial } from '../src/perp.js';
import { bsIntegrate } from '../src/bs.js';

export function halfStarts(u1, u2, lam, t) {
  const x0 = perpInitial(u1, u2, lam), xe = bsIntegrate(x0, t, 1e-13);
  if (!xe) return null;
  // the line: the two bodies farthest apart
  let best = -1, dx = 1, dy = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const rx = xe[2 * j] - xe[2 * i], ry = xe[2 * j + 1] - xe[2 * i + 1], l = rx * rx + ry * ry;
    if (l > best) { best = l; const n = Math.sqrt(l); dx = rx / n; dy = ry / n; }
  }
  const c = dx, s = dy;                           // rotate by -phi: (x, y) -> (c x + s y, -s x + c y)
  const pos = [], vel = [];
  for (let i = 0; i < 3; i++) {
    pos.push([c * xe[2 * i] + s * xe[2 * i + 1], -s * xe[2 * i] + c * xe[2 * i + 1]]);
    vel.push([c * xe[6 + 2 * i] + s * xe[7 + 2 * i], -s * xe[6 + 2 * i] + c * xe[7 + 2 * i]]);
  }
  const out = [];
  for (const sign of [1, -1]) {                    // sign = -1: the half turn (all coordinates change sign)
    const P = pos.map((p) => [sign * p[0], sign * p[1]]), V = vel.map((v) => [sign * v[0], sign * v[1]]);
    const order = [0, 1, 2].sort((a, b) => P[a][0] - P[b][0]);
    const d = P[order[2]][0] - P[order[0]][0], sc = 2 / d;
    const px = order.map((k) => sc * P[k][0]), vy = order.map((k) => V[k][1] / Math.sqrt(sc));
    const perpErr = Math.max(...order.map((k) => Math.abs(P[k][1]) * sc), ...order.map((k) => Math.abs(V[k][0]) / Math.sqrt(sc)));
    out.push({ u1: vy[0], u2: vy[1], lam: (px[1] - px[0]) - 1, t: t * Math.pow(sc, 1.5), perpErr });
  }
  return out;
}

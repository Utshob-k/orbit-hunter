// are two periodic orbits of the perpendicular start the same orbit? the pair (T*, L*) is not enough, two different orbits can agree in both to 1e-5 or better.
// the start is compared instead: the collinear configuration at t = 0 and at t = t (the other collinear moment), scaled so that the outer bodies are at -1 and 1, as
// (position of the middle body, velocities of the left, middle and right body), up to the mirror image of the line and the sign of y.
import { perpInitial } from './perp.js';
import { dp45Step } from './physics.js';

function stateAt(u1, u2, lam, t) {
  const s = perpInitial(u1, u2, lam);
  let tt = 0, h = 1e-3;
  while (tt < t - 1e-15) { const [dt, hn] = dp45Step(s, Math.min(h, t - tt), 1e-13, 1e-14, 0.01); tt += dt; h = hn; }
  return s;
}

function shape(s) {
  let ax = 1, ay = 0, big = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const rx = s[2 * j] - s[2 * i], ry = s[2 * j + 1] - s[2 * i + 1], l = rx * rx + ry * ry;
    if (l > big) { big = l; ax = rx / Math.sqrt(l); ay = ry / Math.sqrt(l); }
  }
  const pos = [0, 1, 2].map((i) => s[2 * i] * ax + s[2 * i + 1] * ay), perp = [0, 1, 2].map((i) => -s[6 + 2 * i] * ay + s[7 + 2 * i] * ax);
  const ord = [0, 1, 2].sort((a, b) => pos[a] - pos[b]), scale = 2 / (pos[ord[2]] - pos[ord[0]]);
  return [(pos[ord[1]] - pos[ord[0]]) * scale - 1, ...ord.map((i) => perp[i] / Math.sqrt(scale))];
}

export const shapes = (o) => [shape(perpInitial(+o.u1, +o.u2, +o.lam)), shape(stateAt(+o.u1, +o.u2, +o.lam, +o.t))];
const mirrors = (v) => [v, [-v[0], v[3], v[2], v[1]], [v[0], -v[1], -v[2], -v[3]], [-v[0], -v[3], -v[2], -v[1]]];

// the smallest largest-difference between the shapes of two orbits (about 1e-9 or less for the same orbit, 1e-2 or more for different ones)
export const startDistance = (A, B) => Math.min(...A.flatMap((a) => B.flatMap((b) => mirrors(b).map((m) => Math.max(...a.map((x, i) => Math.abs(x - m[i])))))));

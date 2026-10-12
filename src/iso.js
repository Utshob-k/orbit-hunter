// the isosceles start: the second reversing symmetry S' of the orbits of R, equal masses.
// state (centre of mass at 0): body 0 at (1, 0), bodies 1 and 2 at (-1/2, h) and (-1/2, -h), velocities v0 = (0, w), v1 = (p, -w/2), v2 = (-p, -w/2).
// unknowns p, w (and t); h plays the role of lam in the perpendicular start (src/perp.js).
import { dp45Step } from './physics.js';

export function isoInitial(p, w, h) {
  return Float64Array.from([1, 0, -0.5, h, -0.5, -h, 0, w, p, -w / 2, -p, -w / 2]);
}

// how far from "isosceles with apex body 0 and mirrored velocities (v2 = - mirror of v1)": [(x1 - x2) . n, v0 . n, (v1 - v2) . tau],
// n = unit vector from the centre of mass (the origin) to body 0, tau = n turned by 90 degrees. zero at isoInitial.
export function isoSymResidual(s) {
  const a = Math.hypot(s[0], s[1]), nx = s[0] / a, ny = s[1] / a, tx = -ny, ty = nx;
  return [(s[2] - s[4]) * nx + (s[3] - s[5]) * ny, s[6] * nx + s[7] * ny, (s[8] - s[10]) * tx + (s[9] - s[11]) * ty];
}

// everything perpInfo gives (energy, angular momentum, rotation after a full period, closure, closest approach, scale free T* and L*) for the iso start
export function isoInfo(p, w, h, t) {
  const s0 = isoInitial(p, w, h);
  const T = 2 * t;
  const s = Float64Array.from(s0);
  let tt = 0, hh = 1e-3, minDist = Infinity, extent = 0;
  for (let n = 0; tt < T - 1e-15; n++) {
    if (n > 20 * (4000 + 3000 * T)) return null;
    const [dt, hn] = dp45Step(s, Math.min(hh, T - tt), 1e-13, 1e-14, 0.01);
    if (dt === 0) return null;
    tt += dt;
    hh = hn;
    for (let i = 0; i < 3; i++) {
      extent = Math.max(extent, Math.hypot(s[2 * i], s[2 * i + 1]));
      for (let j = i + 1; j < 3; j++) minDist = Math.min(minDist, Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]));
    }
  }
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
    const ax = s[off + 2 * i], ay = s[off + 2 * i + 1], bx = s0[off + 2 * i], by = s0[off + 2 * i + 1];
    C += ax * bx + ay * by; S += ax * by - ay * bx;
  }
  const theta = Math.atan2(S, C), co = Math.cos(theta), si = Math.sin(theta);
  let err = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
    const ax = s[off + 2 * i], ay = s[off + 2 * i + 1];
    err += (co * ax - si * ay - s0[off + 2 * i]) ** 2 + (si * ax + co * ay - s0[off + 2 * i + 1]) ** 2;
  }
  let E = 0, L = 0;
  for (let i = 0; i < 3; i++) {
    E += 0.5 * (s0[6 + 2 * i] ** 2 + s0[7 + 2 * i] ** 2);
    L += s0[2 * i] * s0[7 + 2 * i] - s0[2 * i + 1] * s0[6 + 2 * i];
    for (let j = i + 1; j < 3; j++) E -= 1 / Math.hypot(s0[2 * i] - s0[2 * j], s0[2 * i + 1] - s0[2 * j + 1]);
  }
  return { T, E, L, theta, repeatErr: Math.sqrt(err), minDist, extent, ts: T * Math.abs(E) ** 1.5, ls: L * Math.abs(E) ** 0.5 };
}

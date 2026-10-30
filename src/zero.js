// SPDX-License-Identifier: MIT
// the zero of the rotation angle between two points of a continuation curve (tools/branch-point.mjs): bisection along the chord, every new
// point corrected back onto the curve. if the corrector fails at the midpoint the points at 1/4 and 3/4, then 1/8 and 7/8 of the chord are
// tried, and the bisection goes on from the first that converges; if all fail it stops (stopped = true) with the last converged point. a,
// b: end points (arrays), ta: rotation at a, correct(point, normal) -> { ok, Y }, info(Y) -> { turns, ... } or null, unit(v): the
// normalised chord
export function locateZero({ a, b, ta, correct, info, unit, tol = 1e-11, maxIter = 60, fractions = [0.5, 0.25, 0.75, 0.125, 0.875] }) {
  let zero = null, retries = 0;
  for (let k = 0; k < maxIter; k++) {
    const normal = unit(Float64Array.from(b, (v, i) => v - a[i]));
    let cm = null, im = null;
    for (const f of fractions) {
      const p = Float64Array.from(a, (v, i) => (f === 0.5 ? (v + b[i]) / 2 : v + f * (b[i] - v))), c = correct(p, normal);      // the midpoint exactly as the plain bisection computes it
      if (!c.ok) { retries++; continue; }
      const q = info(c.Y);
      if (!q) { retries++; continue; }
      cm = c; im = q; break;
    }
    if (!cm) return { zero, stopped: true, retries };
    zero = im;
    if (Math.abs(im.turns) < tol) break;
    if (im.turns * ta > 0) { a = Float64Array.from(cm.Y); ta = im.turns; } else b = Float64Array.from(cm.Y);
  }
  return { zero, stopped: false, retries };
}

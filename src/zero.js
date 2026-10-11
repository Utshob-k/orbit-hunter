// the zero of the rotation angle between two points of a continuation curve (tools/branch-point.mjs): bisection along the chord, every new point corrected back onto the curve.
// if the corrector fails at the midpoint (near the floor of its residual it can stall just above its limit) the point is moved to 1/4 and 3/4 of the chord, then 1/8 and 7/8, that is a
// shorter step from a point that is known to be on the curve, like the continuation does when a step fails; the bisection goes on from whichever point converges. only when all of them
// fail does it stop, and then it says so (stopped = true) and returns the last point that converged. with a corrector that never fails at the midpoint the result is the plain bisection.
//   a, b: the two end points (arrays), ta: the rotation at a, correct(point, normal) -> { ok, Y }, info(Y) -> { turns, ... } or null, unit(v): the normalised chord
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

// a second integrator, only to check the first one: Gragg-Bulirsch-Stoer (modified midpoint with extrapolation).
// a different method from the Dormand-Prince 5(4) in physics.js, so agreement means the closure of an orbit is not an artifact of it.
import { deriv } from './physics.js';

const SEQ = [2, 4, 6, 8, 10, 12, 14, 16];

function midpoint(x0, H, n) {
  const h = H / n, k = new Float64Array(12);
  let z0 = Float64Array.from(x0);
  deriv(z0, k);
  let z1 = Float64Array.from(z0, (v, i) => v + h * k[i]);
  for (let m = 1; m < n; m++) {
    deriv(z1, k);
    const z2 = Float64Array.from(z0, (v, i) => v + 2 * h * k[i]);
    z0 = z1; z1 = z2;
  }
  deriv(z1, k);
  return Float64Array.from(z1, (v, i) => 0.5 * (v + z0[i] + h * k[i]));
}

// one macro step of size H, returns { x, err } or null if the extrapolation did not converge
function bsStep(x0, H, tol) {
  const T = [];
  for (let j = 0; j < SEQ.length; j++) {
    T[j] = [midpoint(x0, H, SEQ[j])];
    for (let k = 1; k <= j; k++) {
      const f = (SEQ[j] / SEQ[j - k]) ** 2 - 1;
      T[j][k] = Float64Array.from(T[j][k - 1], (v, i) => v + (v - T[j - 1][k - 1][i]) / f);
    }
    if (j >= 3) {
      let err = 0;
      for (let i = 0; i < 12; i++) err = Math.max(err, Math.abs(T[j][j][i] - T[j][j - 1][i]) / (1 + Math.abs(T[j][j][i])));
      if (err < tol) return { x: T[j][j], err, order: j };
    }
  }
  return null;
}

export function bsIntegrate(x0, T, tol = 1e-13) {
  let x = Float64Array.from(x0), t = 0, H = 0.01, steps = 0;
  while (t < T - 1e-14) {
    if (steps++ > 5e6) return null;
    const h = Math.min(H, T - t);
    const r = bsStep(x, h, tol);
    if (!r) { H = h / 2; if (H < 1e-12) return null; continue; }
    x = r.x; t += h;
    H = Math.min(0.5, h * (r.order <= 4 ? 1.5 : r.order >= 6 ? 0.7 : 1));
  }
  return x;
}

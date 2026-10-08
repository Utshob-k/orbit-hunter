// is an orbit an n fold repeat of a shorter one? the state at T/n is compared with the start state rotated by the best angle.
// nRepeat: largest n for which the bodies are in their own places again (a true repeat).
// nRelabel: largest n for which it is the same up to renaming the bodies (equal masses, so the picture repeats).
import { dp45Step } from './physics.js';

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const permute = (x, p) => { const o = new Float64Array(12); for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) { o[off + 2 * i] = x[off + 2 * p[i]]; o[off + 2 * i + 1] = x[off + 2 * p[i] + 1]; } return o; };

function rotationError(a, b) {
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) { C += a[off + 2 * i] * b[off + 2 * i] + a[off + 2 * i + 1] * b[off + 2 * i + 1]; S += a[off + 2 * i] * b[off + 2 * i + 1] - a[off + 2 * i + 1] * b[off + 2 * i]; }
  const th = Math.atan2(S, C), c = Math.cos(th), s = Math.sin(th);
  let err = 0;
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) err = Math.max(err, Math.abs(c * a[off + 2 * i] - s * a[off + 2 * i + 1] - b[off + 2 * i]), Math.abs(s * a[off + 2 * i] + c * a[off + 2 * i + 1] - b[off + 2 * i + 1]));
  return err;
}

export function coverInfo(x0, T, nMax = 24, tol = 1e-5) {
  const s = Float64Array.from(x0);
  let t = 0, h = 1e-3, nRepeat = 1, nRelabel = 1;
  for (let n = nMax; n >= 2; n--) {
    const target = T / n;
    while (t < target - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, target - t), 1e-13, 1e-14, 0.01); t += dt; h = hn; }
    if (rotationError(s, x0) < tol) nRepeat = Math.max(nRepeat, n);
    if (PERMS.some((p) => rotationError(permute(s, p), x0) < tol)) nRelabel = Math.max(nRelabel, n);
  }
  return { nRepeat, nRelabel };
}

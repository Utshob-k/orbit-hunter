// how well an orbit closes after one period, measured the same way for any integrator: largest difference of a position or velocity
// component between the end state and the start state (max norm), once with the best rotation removed and once without
import { dp45Step } from './physics.js';
import { bsIntegrate } from './bs.js';

function integrateDP45(x0, T, rtol = 1e-13, atol = 1e-14) {
  const s = Float64Array.from(x0);
  let t = 0, h = 1e-3;
  while (t < T - 1e-14) {
    const [dt, hn] = dp45Step(s, Math.min(h, T - t), rtol, atol, 0.01);
    if (dt === 0) return null;
    t += dt; h = hn;
  }
  return s;
}

export function closureError(x0, T, method = 'dp45') {
  const x = method === 'bs' ? bsIntegrate(x0, T, 1e-13) : integrateDP45(x0, T);
  if (!x) return null;
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
    const ax = x[off + 2 * i], ay = x[off + 2 * i + 1], bx = x0[off + 2 * i], by = x0[off + 2 * i + 1];
    C += ax * bx + ay * by; S += ax * by - ay * bx;
  }
  const th = Math.atan2(S, C), c = Math.cos(th), s = Math.sin(th);
  let errRot = 0, errRaw = 0;
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) {
    const ax = x[off + 2 * i], ay = x[off + 2 * i + 1], bx = x0[off + 2 * i], by = x0[off + 2 * i + 1];
    errRot = Math.max(errRot, Math.abs(c * ax - s * ay - bx), Math.abs(s * ax + c * ay - by));
    errRaw = Math.max(errRaw, Math.abs(ax - bx), Math.abs(ay - by));
  }
  return { errRot, errRaw, rotation: th };
}

// one rule for every list: "reliable" when the orbit closes to 1e-8 or better (max norm, best rotation removed) with both integrators,
// "weak" when it closes to 1e-6 with Dormand-Prince only, otherwise "failed". only reliable orbits are counted as exactly periodic.
export function closureTier(x0, T) {
  const dp = closureError(x0, T, 'dp45');
  const bs = closureError(x0, T, 'bs');
  const worst = Math.max(dp ? dp.errRot : Infinity, bs ? bs.errRot : Infinity);
  const tier = worst < 1e-8 ? 'reliable' : dp && dp.errRot < 1e-6 ? 'weak' : 'failed';
  return { tier, dp: dp?.errRot ?? null, bs: bs?.errRot ?? null };
}

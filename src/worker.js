// runs the float64 refine + close steps off the main thread so the page doesn't freeze
import { refine } from './physics.js';
import { closeOrbit, fingerprint } from './newton.js';

self.onmessage = (ev) => {
  const { id, v1, v2, tMax } = ev.data;
  const r0 = refine(v1, v2, tMax, { iters: 120 });
  const r = closeOrbit(r0.v1, r0.v2, r0.t, r0.perm);
  const period = r.perm === 0 ? r.T : r.T * 3;
  self.postMessage({ id, v1: r.v1, v2: r.v2, res: r.res, perm: r.perm, period, fp: fingerprint(r.v1, r.v2, period) });
};

// f64 jobs so the page doesn't freeze. refine = map click, close = deep scan candidate
import { refine } from './physics.js';
import { closeOrbit, fingerprint, energy, orbitStats } from './newton.js';
import { closePerp, perpInfo, huntPeriodic } from './perp.js';

function describe(r, ell) {
  const period = r.perm === 0 ? r.T : r.T * 3;
  const ok = r.res < 1e-9 && period > 0.5;
  const out = { v1: r.v1, v2: r.v2, ell, res: r.res, perm: r.perm, period, ok };
  if (ok) {
    out.fp = fingerprint(r.v1, r.v2, period, ell);
    out.E = energy(r.v1, r.v2, ell);
    Object.assign(out, orbitStats(r.v1, r.v2, period, ell));
  }
  return out;
}

self.onmessage = (ev) => {
  const { id, kind, v1, v2, tMax, T, perm, meta, ell = 0 } = ev.data;
  if (kind === 'perp') {
    // perpendicular family: v1, v2 are the y velocities, ell is lam, T is the half period guess
    const c = closePerp(v1, v2, ell, T, { maxMs: 6000 });
    const info = c.res < 1e-9 ? perpInfo(c.u1, c.u2, c.lam, c.t) : null;
    self.postMessage({ id, kind, ok: !!info && info.repeatErr < 1e-7, res: c.res, u1: c.u1, u2: c.u2, lam: c.lam, t: c.t, info });
    return;
  }
  if (kind === 'perpHunt') {
    const r = huntPeriodic(v1, v2, ell, T, tMax || 0, { maxMs: 60000 });
    self.postMessage({ id, kind, ...r });
    return;
  }
  let r;
  if (kind === 'close') {
    r = closeOrbit(v1, v2, T, perm, { ell });
  } else {
    const r0 = refine(v1, v2, tMax, { iters: 120, ell });
    r = closeOrbit(r0.v1, r0.v2, r0.t, r0.perm, { ell });
  }
  self.postMessage({ id, kind, meta, ...describe(r, ell) });
};

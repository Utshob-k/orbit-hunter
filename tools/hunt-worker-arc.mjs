// same as hunt-worker.mjs but follows the family in arclength (src/shooting.js), both ways from the start
import { parentPort } from 'worker_threads';
import { huntArclength } from '../src/shooting.js';

parentPort.on('message', ({ idx, u1, u2, lam, t, maxMs }) => {
  const t0 = Date.now();
  const orbits = [], whys = [];
  for (const dir of [1, -1]) {
    let r;
    try {
      r = huntArclength(u1, u2, lam, t, { m: 8, dir, maxMs: maxMs / 2, thTol: Number(process.env.HUNT_THTOL) || 2e-8 });
    } catch (e) {
      r = { ok: false, why: 'error: ' + e.message };
    }
    whys.push(r.ok ? 'zero' : r.why);
    if (r.ok) {
      const i = r.info;
      orbits.push({ dir, u1: r.u1, u2: r.u2, lam: r.lam, t: r.t, T: i.T, E: i.E, L: i.L, ts: i.ts, ls: i.ls, theta: i.theta, repeatErr: i.repeatErr, minD: i.minDist });
    }
  }
  parentPort.postMessage({ idx, start: { u1, u2, lam, t }, ok: orbits.some((o) => o.repeatErr < 1e-8), why: whys.join(' / '), secs: Math.round((Date.now() - t0) / 1000), orbits });
});

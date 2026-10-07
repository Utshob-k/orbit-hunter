// same as hunt-worker.mjs but with multiple shooting and the tangent predictor
import { parentPort } from 'worker_threads';
import { huntPeriodicMS } from '../src/shooting.js';

parentPort.on('message', ({ idx, u1, u2, lam, t, maxMs }) => {
  const t0 = Date.now();
  let r;
  try {
    r = huntPeriodicMS(u1, u2, lam, t, { m: 8, maxMs, thTol: Number(process.env.HUNT_THTOL) || 1e-9 });
  } catch (e) {
    r = { ok: false, why: 'error: ' + e.message };
  }
  const out = { idx, start: { u1, u2, lam, t }, ok: !!r.ok, why: r.why || null, secs: Math.round((Date.now() - t0) / 1000), lamEnd: r.lam ?? null, thetaEnd: r.th ?? null };
  if (r.ok) {
    const i = r.info;
    out.orbit = { u1: r.u1, u2: r.u2, lam: r.lam, t: r.t, T: i.T, E: i.E, L: i.L, ts: i.ts, ls: i.ls, theta: i.theta, repeatErr: i.repeatErr, minD: i.minDist };
  }
  parentPort.postMessage(out);
});

// one hunt per message, runs in its own thread
import { parentPort } from 'worker_threads';
import { huntPeriodic } from '../src/perp.js';

parentPort.on('message', ({ idx, u1, u2, lam, t, maxMs }) => {
  const t0 = Date.now();
  const r = huntPeriodic(u1, u2, lam, t, 0, { maxMs });
  const out = { idx, start: { u1, u2, lam, t }, ok: !!r.ok, why: r.why || null, secs: Math.round((Date.now() - t0) / 1000) };
  if (r.ok) {
    const i = r.info;
    out.orbit = { u1: r.u1, u2: r.u2, lam: r.lam, t: r.t, T: i.T, E: i.E, L: i.L, ts: i.ts, ls: i.ls, theta: i.theta, repeatErr: i.repeatErr, minD: i.minDist };
  }
  parentPort.postMessage(out);
});

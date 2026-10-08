import { parentPort } from 'worker_threads';
import { satellitesFrom } from '../src/satellites.js';

parentPort.on('message', (job) => {
  const t0 = Date.now();
  let r;
  try {
    const m = Math.max(8, Math.min(32, 2 * job.k));
    r = satellitesFrom({ u1: job.from.u1, u2: job.from.u2, t: job.from.t }, job.k, job.lamA, job.lamB, { m, branchSteps: job.branchSteps || 120, branchHMax: job.branchHMax || 0.05, branchMs: job.branchMs || 120000, stabEvery: job.stabEvery || 0 });
  } catch (e) {
    r = { ok: false, why: 'error: ' + e.message };
  }
  const branches = (r.branches || []).map((b) => ({ lamBP: b.lamBP, sgn: b.sgn, ok: b.ok, repeat: b.repeatTs || null, curve: (b.curve || []).map((p) => [p.lam, p.ts, p.ls, p.repeatErr, p.maxMod ?? null, p.u1, p.u2, p.t]) }));
  parentPort.postMessage({ job: { orbit: job.orbit, k: job.k, m: job.m, lamA: job.lamA, lamB: job.lamB, ts0: job.ts0 }, secs: Math.round((Date.now() - t0) / 1000), ok: !!r.ok, why: r.why || null, signs: r.signs || null, branches });
});

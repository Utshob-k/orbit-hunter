// does the family that passes through one of my orbits (theta = 0) also pass through a published orbit (a row of a table, a relative periodic orbit with theta != 0)?
// the family is followed from my orbit in both directions with huntArclength (every accepted step: Newton converged, the tangent turned by less than 0.35 rad, theta did not jump)
// and every accepted step is kept. at the step nearest to the published start (in u1, u2, lam, t) the system is solved again at the lam of the published orbit,
// starting from that step: if it lands on the published start, the published orbit is on the traced curve (this only works when my start and the published start describe the same
// collinear moment of the orbit). the second test does not depend on that: the invariants T*, L*, |theta| and the smallest pairwise distance of the published orbit are compared with every
// accepted step and with the straight pieces between neighbouring steps.
// node tools/family-pass-through.mjs out.json seconds myU1 myU2 myLam myT pubU1 pubU2 pubLam pubT [label]
import fs from 'fs';
import { huntArclength, closePerpMS } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';

const [outFile, secArg, ...nums] = process.argv.slice(2);
const label = nums.length > 8 ? nums.pop() : null;
if (!outFile || nums.length !== 8 || nums.some((v) => !Number.isFinite(Number(v)))) { console.error('usage: node tools/family-pass-through.mjs out.json seconds myU1 myU2 myLam myT pubU1 pubU2 pubLam pubT [label]'); process.exit(2); }
const [mu1, mu2, mlam, mt, pu1, pu2, plam, pt] = nums.map(Number);
const perDirMs = (Number(secArg) || 300) * 1000 / 2;
const pinfo = perpInfo(pu1, pu2, plam, pt);
const PT = pinfo.ts, PL = Math.abs(pinfo.ls), PTH = Math.abs(pinfo.theta), PMD = pinfo.minDist;
const dist = (u1, u2, lam, t) => Math.hypot((u1 - pu1) / (1 + Math.abs(pu1)), (u2 - pu2) / (1 + Math.abs(pu2)), lam - plam, (t - pt) / pt);

let m0 = null;
for (const m of [8, 16, 24, 32, 48, 64]) { const s = closePerpMS(mu1, mu2, mlam, mt, { m }); if (s && s.res < 1e-9) { m0 = m; break; } }
if (!m0) { console.error('my orbit does not close'); process.exit(1); }
const out = { label, mine: { u1: mu1, u2: mu2, lam: mlam, t: mt }, published: { u1: pu1, u2: pu2, lam: plam, t: pt }, m: m0, directions: [] };
for (const dir of [1, -1]) {
  const steps = [];
  let best = Infinity, bestAt = -1;
  const r = huntArclength(mu1, mu2, mlam, mt, { m: m0, dir, force: true, all: true, maxMs: perDirMs, hMax: 0.2, maxSteps: 6000,
    trace: (step, lam, th, h, it, Y) => {
      if (!Y) return false;
      const n = Y.length - 1, u1 = Y[0], u2 = Y[1], t = Y[2];
      const info = perpInfo(u1, u2, lam, t);
      const d = dist(u1, u2, lam, t);
      const di = info ? Math.max(Math.abs(info.ts - PT) / PT, Math.abs(Math.abs(info.ls) - PL) / PL, Math.abs(Math.abs(th) - PTH)) : Infinity;   // distance in the invariants
      steps.push({ step, lam, u1, u2, t, theta: th, h, iters: it, Tstar: info ? info.ts : null, Lstar: info ? Math.abs(info.ls) : null, minDist: info ? info.minDist : null, closure: info ? info.repeatErr : null, d, di });
      if (di < best) { best = di; bestAt = steps.length - 1; }
      return best < 0.01 && steps.length - bestAt > 25 && di > 5 * best;   // passed it, no need to go on
    } });
  const rec = { dir, why: r.why || (r.ok ? 'zero' : 'unknown'), nSteps: steps.length, nearest: null };
  if (bestAt >= 0) {
    const s = steps[bestAt];
    const sol = closePerpMS(s.u1, s.u2, plam, s.t, { m: m0 });   // the same lam as the published orbit, from the nearest step
    const path = steps.slice(0, bestAt + 1);
    const jumps = path.slice(1).map((p, i) => Math.hypot((p.Tstar - path[i].Tstar) / p.Tstar, (p.Lstar - path[i].Lstar) / p.Lstar, p.theta - path[i].theta));
    const sorted = [...jumps].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] || 0;
    // distance of the published invariants from the straight pieces between neighbouring accepted steps (relative T*, relative L*, |theta|)
    const P = [0, 0, 0]; let seg = Infinity, segMinDist = null;
    const coord = (q) => [(q.Tstar - PT) / PT, (Math.abs(q.Lstar) - PL) / PL, Math.abs(q.theta) - PTH];
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].Tstar == null || steps[i - 1].Tstar == null) continue;
      const a = coord(steps[i - 1]), b = coord(steps[i]), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      const f = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(a[0] * d[0] + a[1] * d[1] + a[2] * d[2]) / l2));
      const dd = Math.hypot(a[0] + f * d[0], a[1] + f * d[1], a[2] + f * d[2]);
      if (dd < seg) { seg = dd; segMinDist = steps[i - 1].minDist + f * (steps[i].minDist - steps[i - 1].minDist); }
    }
    rec.nearest = { index: bestAt, distance: best, segmentDistance: seg, minDistOnCurve: segMinDist, minDistPublished: PMD, lam: s.lam, Tstar: s.Tstar, Lstar: s.Lstar, theta: s.theta,
      resolvedAtPublishedLam: sol ? { res: sol.res, du1: Math.abs(sol.u1 - pu1), du2: Math.abs(sol.u2 - pu2), dt: Math.abs(sol.t - pt), correctionFromStep: Math.hypot(sol.u1 - s.u1, sol.u2 - s.u2, sol.t - s.t) } : null,
      pathSteps: path.length, maxClosure: Math.max(...path.map((p) => p.closure ?? Infinity)), maxNewtonIters: Math.max(...path.map((p) => p.iters)), largestJumpOverMedian: med > 0 ? Math.max(...jumps, 0) / med : null,
      thetaFrom: path[0].theta, thetaTo: s.theta };
  }
  out.directions.push(rec);
  console.log(`${label || ''} dir ${dir > 0 ? '+' : '-'}: ${rec.why}, ${rec.nSteps} steps` + (rec.nearest ? `, nearest step to the published orbit after ${rec.nearest.pathSteps} steps: invariant distance ${rec.nearest.distance.toExponential(2)}, between steps ${rec.nearest.segmentDistance.toExponential(2)} (smallest pairwise distance ${rec.nearest.minDistOnCurve?.toFixed(4)} there, published ${rec.nearest.minDistPublished.toFixed(4)}); re-solved at the published lam: ` + (rec.nearest.resolvedAtPublishedLam ? `res ${rec.nearest.resolvedAtPublishedLam.res.toExponential(1)}, differs from the published start by ${Math.max(rec.nearest.resolvedAtPublishedLam.du1, rec.nearest.resolvedAtPublishedLam.du2, rec.nearest.resolvedAtPublishedLam.dt).toExponential(1)}; closure max ${rec.nearest.maxClosure.toExponential(1)}, jump/median ${rec.nearest.largestJumpOverMedian?.toFixed(1)}` : 'did not converge') : ''));
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));

// re-checks every orbit in data/perp-periodic.json: integrate one full period with a very tight
// tolerance and see how far the state is from the start (should be tiny, no rotation needed)
import fs from 'fs';
import { dp45Step, phaseDistance } from '../src/physics.js';
import { closePerp, perpInfo, perpInitial } from '../src/perp.js';

const list = JSON.parse(fs.readFileSync(new URL('../data/perp-periodic.json', import.meta.url), 'utf8'));
for (const o of list) {
  // the numbers in the file are rounded to 10 digits, so polish them once first
  const c = closePerp(o.u1, o.u2, o.lam, o.t, { maxMs: 10000 });
  const info = perpInfo(c.u1, c.u2, o.lam, c.t);
  const s0 = perpInitial(c.u1, c.u2, o.lam);
  const s = Float64Array.from(s0);
  let t = 0, h = 1e-4;
  while (t < info.T - 1e-15) { const [dt, hn] = dp45Step(s, Math.min(h, info.T - t), 1e-15, 1e-16, 0.002); t += dt; h = hn; }
  console.log(`lam=${o.lam.toFixed(6)} T=${info.T.toFixed(6)} L=${info.L.toFixed(5)} min sep=${info.minDist.toFixed(4)}  rotation=${info.theta.toExponential(1)}  return distance (tight)=${phaseDistance(s, s0, [0, 1, 2]).toExponential(1)}`);
}

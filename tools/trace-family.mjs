// follow a family of the perpendicular start from one orbit and list the orbits on it with rotation angle 0 (exactly periodic)
// node tools/trace-family.mjs u1 u2 lam t [maxSeconds]       both directions, huntArclength with all = true
import { huntArclength } from '../src/shooting.js';

const [u1, u2, lam, t, secArg] = process.argv.slice(2).map(Number);
const maxMs = (secArg || 300) * 1000;
for (const dir of [1, -1]) {
  const r = huntArclength(u1, u2, lam, t, { dir, maxMs, all: true, hMax: 0.2, maxSteps: 4000 });
  const list = r.orbits || (r.ok ? [r] : []);
  console.log(`direction ${dir > 0 ? '+' : '-'}: ${r.why || 'zero'}, lam ${r.lamMin?.toFixed(4)} .. ${r.lamMax?.toFixed(4)}, ${list.length} exactly periodic orbits`);
  for (const o of list) console.log(`   lam=${o.lam.toFixed(5)} T*=${o.info.ts.toFixed(4)} L*=${Math.abs(o.info.ls).toFixed(5)} closure ${o.info.repeatErr.toExponential(1)} minD=${o.info.minDist.toFixed(4)}`);
}

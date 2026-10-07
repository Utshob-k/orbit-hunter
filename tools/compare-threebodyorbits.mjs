// compares the periodic orbits in data/perp-periodic.json with equal mass, non-zero L orbits copied from
// https://www.threebodyorbits.com (Suvakov, Sheen and BHH satellite pages: period, energy, L)
// everything is turned into T|E|^1.5 and |L||E|^0.5 so the scale doesn't matter
import fs from 'fs';
import { closePerp, perpInfo } from '../src/perp.js';

const cat = JSON.parse(fs.readFileSync(new URL('../data/threebodyorbits-equalmass-L.json', import.meta.url), 'utf8'))
  .map(([name, T, E, L]) => ({ name, ts: T * Math.abs(E) ** 1.5, ls: Math.abs(L) * Math.abs(E) ** 0.5 }));
// optional first argument: another json list of {u1,u2,lam,t} (default is the 11 from data/perp-periodic.json)
const file = process.argv[2] || new URL('../data/perp-periodic.json', import.meta.url);
const mine = JSON.parse(fs.readFileSync(file, 'utf8'));

for (const o of mine) {
  const c = closePerp(o.u1, o.u2, o.lam, o.t, { maxMs: 10000 });
  const i = perpInfo(c.u1, c.u2, o.lam, c.t);
  const ts = i.ts, ls = Math.abs(i.ls);
  // an orbit run n times has the same L* and n times the T*
  let best = null;
  for (const k of cat) {
    const lrel = Math.abs(k.ls - ls) / ls;
    for (let n = 1; n <= 12; n++) {
      for (const [a, b, tag] of [[ts, k.ts * n, `${n}x`], [ts * n, k.ts, `1/${n}`]]) {
        const trel = Math.abs(a - b) / b;
        const score = Math.max(lrel, trel);
        if (!best || score < best.score) best = { score, lrel, trel, name: k.name, tag };
      }
    }
  }
  console.log(`T*=${ts.toFixed(4)} L*=${ls.toFixed(4)}  closest: ${best.name} (${best.tag}) L* off ${best.lrel.toExponential(1)}, T* off ${best.trel.toExponential(1)}  ${best.score < 2e-4 ? 'SAME ORBIT?' : 'no match'}`);
}

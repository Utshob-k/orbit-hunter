// how the rotation numbers of a stable orbit change when lam is moved (the orbit then rotates a little each period).
// node tools/nu-scan.mjs u1 u2 lam t [halfRange] [step]
import { closePerpMS, stepInLam } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';
import { relativeStability } from '../src/relative.js';

const [u1, u2, lam0, t0] = process.argv.slice(2, 6).map(Number);
const range = Number(process.argv[6]) || 0.06, step = Number(process.argv[7]) || 0.004;
const start = closePerpMS(u1, u2, lam0, t0, { m: 8, maxMs: 60000 });
if (!(start.res < 1e-9)) { console.log('start did not close'); process.exit(1); }
for (const dir of [1, -1]) {
  let s = start;
  for (let k = 0; Math.abs(s.lam - lam0) < range; k++) {
    const r = relativeStability(s.u1, s.u2, s.lam, s.t);
    const info = perpInfo(s.u1, s.u2, s.lam, s.t);
    console.log(`${dir > 0 ? '+' : '-'} lam=${s.lam.toFixed(5)} T*=${info.ts.toFixed(4)} L*=${Math.abs(info.ls).toFixed(4)} alpha=${r.alpha.toFixed(5)} scatter=${r.scatter.toExponential(1)} max|ev|=${r.maxMod.toFixed(6)} nu=${r.nus.map((n) => n.nu.toFixed(5)).join(' ')}`);
    const nx = stepInLam(s, dir * step, { maxMs: 60000 }).sol;
    if (!(nx.res < 1e-9)) { console.log('step failed'); break; }
    s = nx;
  }
}

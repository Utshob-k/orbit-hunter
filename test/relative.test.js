// rotation compensated stability: for an orbit that rotates a little each period (lam moved away from the periodic one) the four trivial
// eigenvalues must still be 1, and the result must agree with a finite difference monodromy matrix (tools/check-stability-fd.mjs, value 7.3037)
import fs from 'fs';
import { closePerpMS, stepInLam } from '../src/shooting.js';
import { relativeStability } from '../src/relative.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const o = JSON.parse(fs.readFileSync(new URL('../data/stability-perp-3.json', import.meta.url), 'utf8')).find((x) => Math.abs(x.ts - 4.9598) < 0.001);
let s = closePerpMS(o.u1, o.u2, o.lam, o.t, { m: 4 });
const base = relativeStability(s.u1, s.u2, s.lam, s.t);
check('periodic orbit: stable, rotation 0', Math.abs(base.alpha) < 1e-8 && base.maxMod < 1 + 1e-5, `alpha=${base.alpha.toExponential(1)} max=${base.maxMod}`);
for (let i = 0; i < 20; i++) s = stepInLam(s, -0.01, { maxMs: 60000 }).sol;
const r = relativeStability(s.u1, s.u2, s.lam, s.t);
check('rotating orbit: trivial eigenvalues stay at 1', Math.abs(r.alpha) > 0.1 && r.scatter < 1e-3, `alpha=${r.alpha.toFixed(3)} scatter=${r.scatter.toExponential(1)}`);
check('rotating orbit: max |eigenvalue| agrees with the finite difference value', Math.abs(r.maxMod - 7.30367) < 1e-3, `max=${r.maxMod.toFixed(5)}`);
process.exit(fail ? 1 : 0);

// closure tiers: the figure-8 and the stable T* = 4.96 orbit are reliable, an orbit with a perturbed start is not
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { closureTier } from '../src/closure.js';
import { sdInitial } from '../src/physics.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const list = JSON.parse(fs.readFileSync(new URL('../data/stability-perp-3.json', import.meta.url), 'utf8'));
const o = list.find((x) => Math.abs(x.ts - 4.9598) < 0.001);
const a = closureTier(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
check('the T* = 4.96 orbit is reliable', a.tier === 'reliable', JSON.stringify(a));
const f8 = closureTier(sdInitial(0.347116888118926938, 0.532724945388030229), 6.32591398292621168);
check('the figure-8 is reliable', f8.tier === 'reliable', JSON.stringify(f8));
const bad = closureTier(perpInitial(o.u1 + 1e-4, o.u2, o.lam), 2 * o.t);
check('a start that is off by 1e-4 is not reliable', bad.tier !== 'reliable', JSON.stringify(bad));
process.exit(fail ? 1 : 0);

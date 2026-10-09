// repeats: the T* = 47.065 orbit is a 2 fold repeat of a shorter one, 17.847 is not a repeat (checked in the README)
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { coverInfo } from '../src/covers.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const list = JSON.parse(fs.readFileSync(new URL('../data/stability-perp-3.json', import.meta.url), 'utf8'));
const find = (ts) => list.find((o) => Math.abs(o.ts - ts) < 0.01);

const a = find(47.065), b = find(17.847), c = find(4.9598);
const ca = coverInfo(perpInitial(a.u1, a.u2, a.lam), 2 * a.t, 12);
const cb = coverInfo(perpInitial(b.u1, b.u2, b.lam), 2 * b.t, 12);
const cc = coverInfo(perpInitial(c.u1, c.u2, c.lam), 2 * c.t, 12);
check('T* = 47.065 is a 2 fold repeat', ca.nRepeat === 2, JSON.stringify(ca));
check('T* = 17.847 is not a repeat', cb.nRepeat === 1, JSON.stringify(cb));
check('the BHH orbit (T* = 4.96) is not a repeat but returns after T/2 with bodies swapped', cc.nRepeat === 1 && cc.nRelabel === 2, JSON.stringify(cc));
// the default limit has to be above the repeat count of long repeats: 13 periods of the T* = 47.065 orbit are a 26 fold repeat of its shortest orbit (a limit of 24 sees only 13)
const cl = coverInfo(perpInitial(a.u1, a.u2, a.lam), 13 * 2 * a.t), cl24 = coverInfo(perpInitial(a.u1, a.u2, a.lam), 13 * 2 * a.t, 24);
check('a 26 fold repeat is found with the default limit', cl.nRepeat === 26 && !cl.failed, JSON.stringify(cl));
check('a limit of 24 sees only 13 of them', cl24.nRepeat === 13, JSON.stringify(cl24));
process.exit(fail ? 1 : 0);

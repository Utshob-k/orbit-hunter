// SPDX-License-Identifier: MIT
// the rule of --handover (tools/handover-rule.mjs) on made-up lam sequences: P100 = |lam_K - lam_(K-100)| / 100 over the last 100 accepted steps, the rule fires if P100 < 1e-7 (the default) and there are at least 100
// accepted steps. lams[0] is the lam of the start. No python, takes a moment.
import { p100, handoverFires, backIndex, WINDOW } from '../tools/handover-rule.mjs';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const seq = (start, steps) => { const l = [start]; for (const d of steps) l.push(l[l.length - 1] + d); return l; };
const rep = (d, n) => new Array(n).fill(d);
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b), 1e-300);

check('the window is 100 accepted steps', WINDOW === 100);
// firing
let l = seq(0.66, rep(-1e-8, 150));
check('150 steps of -1e-8: P100 is 1e-8 and the rule fires', near(p100(l), 1e-8) && handoverFires(l), `P100 ${p100(l)}`);
l = seq(0.66, rep(1e-9, 100));
check('exactly 100 steps of +1e-9 (lam rising): fires', near(p100(l), 1e-9) && handoverFires(l));
l = seq(0.66, [...rep(-1e-5, 200), ...rep(-1e-9, 100)]);
check('200 steps of -1e-5, then 100 of -1e-9: only the last 100 count, fires', near(p100(l), 1e-9) && handoverFires(l));
l = seq(0.66, [...rep(-1e-5, 50), ...rep(1e-5, 50), ...rep(-1e-5, 50), ...rep(1e-5, 50)]);
check('steps up and down of 1e-5 with no net change over 100 steps: P100 = 0, fires (net change)', p100(l) < 1e-12 && handoverFires(l));
// not firing
l = seq(0.66, rep(-1e-6, 150));
check('150 steps of -1e-6: P100 is 1e-6, does not fire', near(p100(l), 1e-6) && !handoverFires(l));
l = seq(0.66, [...rep(-1e-9, 100), ...rep(-1e-5, 100)]);
check('100 slow steps, then 100 fast ones: the last 100 are fast, does not fire', near(p100(l), 1e-5) && !handoverFires(l));
l = seq(0.66, rep(-2e-7, 120));
check('steps of -2e-7 (above the limit 1e-7): does not fire', near(p100(l), 2e-7) && !handoverFires(l));
// fewer than 100 steps
l = seq(0.66, rep(-1e-12, 99));
check('99 accepted steps, however slow: no value, does not fire', p100(l) === null && !handoverFires(l));
check('only the start (no accepted step): no value, does not fire', p100([0.66]) === null && !handoverFires([0.66]));
check('an empty list does not fire', !handoverFires([]));
// the threshold is an argument
l = seq(0.66, rep(-1e-6, 120));
check('with the limit 1e-5 the steps of 1e-6 fire, with 1e-7 not', handoverFires(l, 1e-5) && !handoverFires(l, 1e-7) && !handoverFires(l));
// only the last 100 steps count
l = seq(0.66, rep(-1e-8, 100)); const first = handoverFires(l);
l.push(l[l.length - 1] - 1e-3);
check('the rule looks only at the last 100 steps: one big step after a firing sequence stops it firing', first && p100(l) > 1e-7 && !handoverFires(l));

// the point behind the last one (backIndex): the first index below the last with |lam_K - lam_j| >= 1e-6 on a stretch where lam moves one way
l = seq(0.66, rep(-3e-7, 30));
check('backIndex, 30 steps of -3e-7 (lam falling): 4 steps back (1.2e-6, three steps are 9e-7), index 26', backIndex(l) === 26, `index ${backIndex(l)}`);
l = seq(0.66, rep(2e-9, 30));
check('backIndex, 30 steps of +2e-9: the distance 1e-6 is not reached before the start: null', backIndex(l) === null);
l = seq(0.66, rep(1e-5, 5));
check('backIndex, steps of 1e-5 (rising): one step back is enough, index 4', backIndex(l) === 4, `index ${backIndex(l)}`);
check('backIndex with the limit as an argument: 30 steps of 2e-9 and the limit 1e-8 give 5 steps back, index 25', backIndex(l = seq(0.66, rep(2e-9, 30)), 1e-8) === 25, `index ${backIndex(l, 1e-8)}`);
l = seq(0.66, [...rep(-1e-5, 20), ...rep(1e-5, 3)]);
check('backIndex, a turn further back than the first point at distance 1e-6 does not matter (20 falling steps of 1e-5, then 3 rising): index 22', backIndex(l) === 22, `index ${backIndex(l)}`);
l = seq(0.66, [...rep(-1e-5, 20), 3e-8, 3e-8, 3e-8]);
check('backIndex, lam turns inside the last 1e-6 (the last steps go the other way): null', backIndex(l) === null);
l = seq(0.66, [...rep(-1e-7, 4), 1e-7, -1e-7, -1e-7, -1e-7, -1e-7]);
check('backIndex, a turn within the stretch of 1e-6: null', backIndex(l) === null);
l = seq(0.66, [...rep(-4e-7, 5), 0, -4e-7]);
check('backIndex, a step of 0 in lam before the distance is reached: null', backIndex(l) === null);
check('backIndex, the last step of lam is 0: null', backIndex(seq(0.66, [-1e-5, -1e-5, 0])) === null);
check('backIndex, only the start, or an empty list: null', backIndex([0.66]) === null && backIndex([]) === null);
check('backIndex, one step of 1e-5 (start reached, distance enough): index 0', backIndex([0.66, 0.66001]) === 0);
console.log(fail ? `${fail} FAIL` : 'all PASS');
process.exit(fail ? 1 : 0);

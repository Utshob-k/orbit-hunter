// SPDX-License-Identifier: MIT
// the continuation of Henon's family m (planar equal masses, perpendicular start) from his orbit 5 with the ias route, in this process (huntArclength of src/shooting.js, 24 pieces, no driver, 90 seconds).
// Along this family t (half the period) falls from 1.30 at the start to 0.39 at lam 0.668 and to 0.04 near lam 0.93. An earlier version of the corrector skipped every trial point of its line search whose t was
// below 0.3 times the t of the START of the run, and the continuation stopped at lam 0.668029 (t = 0.38965 = 0.3 * 1.29885). The bound is now relative to the predicted point, so the run goes on.
// PASS if the lam reached is above 0.67 (the old code stops at 0.668029 after about 20 seconds on the machine that made this test; a machine more than four times as slow could fail a correct code in 90 seconds).
// all: true keeps the continuation going past the zero of the rotation angle at lam -0.865 (Henon's orbit 11, -0.86525040), which is found on the way. needs python with rebound (ORBIT_PYTHON), takes 90 seconds.
import { settings } from '../src/settings.js';
import { huntArclength } from '../src/shooting.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
settings.integrator = 'ias';
// the orbit 5 of Henon's table, closed again to 50 digits (the doubles of the re-closed values)
const start = { u1: -4.2460235252151115, u2: 4.044279913133019, lam: -0.9436451884920568, t: 1.2988504909572287 };
const t0 = Date.now();
const r = huntArclength(start.u1, start.u2, start.lam, start.t, { m: 24, dir: 1, hMax: 0.2, all: true, force: true, maxMs: 90000 });
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`lam from ${r.lamMin} to ${r.lamMax}, ${r.steps} steps, ${secs} s, stopped: ${r.why}`);
check('the run does not stop at the start', r.steps > 100 && Number.isFinite(r.lamMax), `steps ${r.steps}`);
check('the continuation goes beyond lam 0.67 (the old bound on t stopped it at 0.668029)', r.lamMax > 0.67, `lamMax ${r.lamMax}`);
const orbits = r.orbits || [];
const o11 = orbits.find((o) => Math.abs(o.lam + 0.86525) < 1e-4);
check('the zero of the rotation angle at lam -0.86525 (Henon orbit 11, -0.86525040) is found', !!o11 && Math.abs(o11.lam + 0.8652504) < 1e-5, o11 ? `lam ${o11.lam}` : 'not found');
process.exit(fail ? 1 : 0);

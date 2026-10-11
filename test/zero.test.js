// the bisection for the zero of the rotation (src/zero.js) must go on when the corrector fails at a midpoint, and must be the plain bisection when it does not
import { locateZero } from '../src/zero.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };

// a curve in one variable with the rotation turns(Y) = Y - 0.3; the corrector would put a point back on the curve, here the point is already on it
const info = (Y) => ({ turns: Y[0] - 0.3, Y: Y[0] });
const start = { a: Float64Array.of(0), b: Float64Array.of(1), ta: -0.3, info, unit: (v) => v };

// 1. a corrector that never fails: the result is the plain bisection
let pa = 0, pb = 1, pt = -0.3, plain = null;
for (let k = 0; k < 60; k++) {
  const mid = (pa + pb) / 2, tm = mid - 0.3; plain = mid;
  if (Math.abs(tm) < 1e-11) break;
  if (tm * pt > 0) { pa = mid; pt = tm; } else pb = mid;
}
const r1 = locateZero({ ...start, correct: (p) => ({ ok: true, Y: p }) });
check('a corrector that never fails gives the plain bisection', r1.zero.Y === plain && !r1.stopped && r1.retries === 0, `zero ${r1.zero.Y}`);

// 2. the corrector fails at the first midpoint (as it did for n = 24, 26, 27 and 28 of the R satellites; the old loop stopped there, with a rotation of 0.2 here)
let calls = 0;
const r2 = locateZero({ ...start, correct: (p) => (calls++ === 0 ? { ok: false } : { ok: true, Y: p }) });
check('a failure at the first midpoint is retried', Math.abs(r2.zero.turns) < 1e-11 && !r2.stopped && r2.retries === 1, `rotation left ${r2.zero.turns.toExponential(1)}, retries ${r2.retries}`);

// 3. the corrector fails at the midpoint of every pass (every other call): the points at 1/4 of the chord are used
calls = 0;
const r3 = locateZero({ ...start, correct: (p) => (calls++ % 2 === 0 ? { ok: false } : { ok: true, Y: p }) });
check('a failure at the midpoint of every pass is passed', Math.abs(r3.zero.turns) < 1e-11 && !r3.stopped && r3.retries >= 5, `rotation left ${r3.zero.turns.toExponential(1)}, retries ${r3.retries}`);

// 4. the corrector fails everywhere: the loop stops and says so, with no zero
const r4 = locateZero({ ...start, correct: () => ({ ok: false }) });
check('a corrector that always fails stops and says so', r4.stopped && r4.zero === null && r4.retries === 5, `retries ${r4.retries}`);

// 5. the orbit cannot be integrated at the point (info returns null): treated like a failed corrector
calls = 0;
const r5 = locateZero({ ...start, correct: (p) => ({ ok: true, Y: p }), info: (Y) => (calls++ === 0 ? null : info(Y)) });
check('a point whose orbit cannot be integrated is passed', Math.abs(r5.zero.turns) < 1e-11 && !r5.stopped && r5.retries === 1, `retries ${r5.retries}`);
process.exit(fail ? 1 : 0);

// multiple shooting should give the same orbit as single shooting, from a rough guess
import { closePerp } from '../src/perp.js';
import { closePerpMS, stepInLam } from '../src/shooting.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };

const lam = 0.4421792098, u1 = -0.8780164331, u2 = -0.5496386328, t = 4.0559375563;
const ref = closePerp(u1, u2, lam, t);
check('single shooting closes the reference orbit', ref.res < 1e-10, `res=${ref.res.toExponential(1)}`);

for (const m of [1, 4, 8]) {
  const r = closePerpMS(u1 + 1e-2, u2 - 7e-3, lam, t * 1.01, { m });
  check(`multiple shooting m=${m} from a 1% wrong guess`, r.res < 1e-10 && Math.abs(r.u1 - ref.u1) < 1e-8 && Math.abs(r.t - ref.t) < 1e-8,
    `res=${r.res.toExponential(1)} dt=${Math.abs(r.t - ref.t).toExponential(1)}`);
}

// the tangent (how the orbit moves with lam) must agree with a finite difference of two separate solves
import { tangentInLam } from '../src/shooting.js';
const base = closePerpMS(u1, u2, lam, t, { m: 8 });
const tg = tangentInLam(base);
const h = 1e-4;
const up = closePerpMS(base.u1, base.u2, lam + h, base.t, { m: 8, nodes: base.nodes });
const dn = closePerpMS(base.u1, base.u2, lam - h, base.t, { m: 8, nodes: base.nodes });
const fd = { u1: (up.u1 - dn.u1) / (2 * h), u2: (up.u2 - dn.u2) / (2 * h), t: (up.t - dn.t) / (2 * h) };
check('tangent matches finite differences', Math.abs(tg.du1 - fd.u1) < 1e-4 && Math.abs(tg.du2 - fd.u2) < 1e-4 && Math.abs(tg.dt - fd.t) < 1e-3,
  `dt/dlam tangent ${tg.dt.toFixed(4)} fd ${fd.t.toFixed(4)}`);
// and a step along it closes
const step = stepInLam(base, 0.003, { maxMs: 30000 }).sol;
check('step of 0.003 in lam with the tangent predictor', step.res < 1e-10, `res=${step.res.toExponential(1)}`);
process.exit(fail ? 1 : 0);

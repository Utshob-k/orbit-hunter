// the isosceles start (src/iso.js), the start of the satellites of class I: its symmetric residual, the end orbit of n = 5 from data/class-i/, and the members of R written in it
import fs from 'fs';
import { isoInitial, isoSymResidual, isoInfo } from '../src/iso.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));

// 1. the start has the centre of mass and the momentum at 0 and is its own symmetric state
const s = isoInitial(-1.17, 0.875, 0.176);
const cm = [0, 1].map((k) => s[k] + s[2 + k] + s[4 + k]), mom = [0, 1].map((k) => s[6 + k] + s[8 + k] + s[10 + k]);
check('the isosceles start has the centre of mass and the momentum at 0', Math.max(...cm.map(Math.abs), ...mom.map(Math.abs)) < 1e-15, `${Math.max(...cm.map(Math.abs), ...mom.map(Math.abs))}`);
check('the isosceles start is a symmetric state (residual 0)', Math.max(...isoSymResidual(s).map(Math.abs)) < 1e-15, `${isoSymResidual(s).map((x) => x.toExponential(1)).join(' ')}`);

// 2. the end orbit of class I for n = 5 (30 digits as stored): T*, L*, rotation 0 and closure in double precision
const o = read('class-i/refined/n5.json'), i = isoInfo(Number(o.p), Number(o.w), Number(o.h), Number(o.t));
check('n = 5: T* and L* of the stored 30 digit orbit', Math.abs(i.ts - Number(o.Tstar)) < 1e-9 * i.ts && Math.abs(Math.abs(i.ls) - Number(o.Lstar)) < 1e-9 * Math.abs(i.ls), `T* ${i.ts.toFixed(9)} L* ${Math.abs(i.ls).toFixed(9)}`);
check('n = 5: the orbit closes after one period without rotation', Math.abs(i.theta) < 1e-8 && i.repeatErr < 1e-8, `rotation ${i.theta.toExponential(1)}, closure ${i.repeatErr.toExponential(1)}`);

// 3. a member of R written with the isosceles start (the trace of the isosceles chart) has the T*, L* and rotation of the member
const tr = read('r-family-trace-iso.json').curve;
let worst = 0, worstTurn = 0;
for (const k of [0, 60, 120, 180, 241]) {
  const p = tr[k], q = isoInfo(p.u1, p.u2, p.lam, p.t);
  worst = Math.max(worst, Math.abs(q.ts - p.Tstar) / p.Tstar, Math.abs(Math.abs(q.ls) - p.Lstar) / p.Lstar);
  worstTurn = Math.max(worstTurn, Math.abs(Math.abs(q.theta / (2 * Math.PI)) - Math.abs(p.turns)));
}
check('members of R in the isosceles chart: T* and L* (5 points)', worst < 1e-8, `largest relative difference ${worst.toExponential(1)}`);
check('members of R in the isosceles chart: the rotation (5 points)', worstTurn < 1e-8, `largest difference ${worstTurn.toExponential(1)} turns`);

process.exit(fail ? 1 : 0);

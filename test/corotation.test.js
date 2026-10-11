// the co-rotation share (src/corotation.js): 1 for members of the R family and for the CPC satellites N = 6 and 9, 0 for N = 1
import fs from 'fs';
import { shareSame } from '../src/corotation.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const trace = read('r-family-trace.json').curve, cpc = read('cpc-converted.json');
const r = trace[40], sR = shareSame(r.u1, r.u2, r.lam, r.t);
check('a member of the R family co-rotates all the time', sR.share === 1, `share ${sR.share}`);
for (const [N, want] of [[6, 1], [9, 1], [1, 0]]) { const m = cpc.find((x) => x.N === N).mine, s = shareSame(m.u1, m.u2, m.lam, m.t); check(`CPC N = ${N}: share ${want}`, s.share === want, `share ${s.share}`); }
process.exit(fail ? 1 : 0);

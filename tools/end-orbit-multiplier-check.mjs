// the reduction in double precision (tools/reduced-multipliers.mjs for class C, tools/reduced-multipliers-iso.mjs for class I) applied to the stored 30 digit start of each end orbit (rounded to double), against the stored multiple precision
// multipliers (tier A, data/stability-mp/class-c/ and data/class-i/stability/): class C n = 5 to 20 (n = 8: the double length orbit data/refined/T47.065.json against class-c-8d-A.json) and class I n = 5 to 20.
// the quantity compared is y = mu + 1/mu of the four multipliers, sorted by (real part, imaginary part): max |dy| / max(1, |y|), the limit is 1e-6. node tools/end-orbit-multiplier-check.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
import { reducedMultipliers as redC } from './reduced-multipliers.mjs';
import { reducedMultipliers as redI } from './reduced-multipliers-iso.mjs';
const D = fileURLToPath(new URL('../data/', import.meta.url)), TOL = 1e-6;
const rd = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]], csub = (a, b) => [a[0] - b[0], a[1] - b[1]], cabs = (a) => Math.hypot(a[0], a[1]);
const yOf = (x) => { const d = x[0] * x[0] + x[1] * x[1]; return cadd(x, [x[0] / d, -x[1] / d]); };
const sortY = (ys) => ys.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const maxDy = (A, B) => { const a = sortY(A), b = sortY(B); return Math.max(...a.map((y, k) => cabs(csub(y, b[k])) / Math.max(1, cabs(b[k])))); };
const tierYs = (file) => rd(file).result['1'].mu.map((m) => yOf([Number(m.re), Number(m.im)]));
const cands = rd('satellite-candidates.json').orbits;
const rows = [];
for (const cls of ['C', 'I']) for (let n = 5; n <= 20; n++) {
  let r, tierFile, src;
  if (cls === 'C') {
    let s;
    if (n === 5) { s = rd('refined/T17.847.json'); src = 'data/refined/T17.847.json'; } else if (n === 6) { s = rd('refined/T19.769.json'); src = 'data/refined/T19.769.json'; }
    else if (n === 8) { s = rd('refined/T47.065.json'); src = 'data/refined/T47.065.json (double length orbit)'; }
    else { s = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`)); src = 'data/satellite-candidates.json'; }
    r = redC(Number(s.u1), Number(s.u2), Number(s.lam), Number(s.t));
    tierFile = `stability-mp/class-c/class-c-${n === 8 ? '8d' : n}-A.json`;
  } else {
    const s = rd(`class-i/refined/n${n}.json`); src = `data/class-i/refined/n${n}.json`;
    r = redI(Number(s.p), Number(s.w), Number(s.h), Number(s.t));
    tierFile = `class-i/stability/n${n}-A.json`;
  }
  const dy = maxDy(r.eig.map((e) => yOf([e.re, e.im])), tierYs(tierFile));
  rows.push({ cls, n, src, tierFile, dy, ok: dy <= TOL });
  console.log(`class ${cls} n = ${String(n).padStart(2)}: max |dy|/max(1,|y|) ${dy.toExponential(2)} ${dy <= TOL ? 'PASS' : 'FAIL'} (start ${src}; tier A ${tierFile})`);
}
console.log(`passed ${rows.filter((r) => r.ok).length} of ${rows.length}; largest dy ${Math.max(...rows.map((r) => r.dy)).toExponential(2)}`);

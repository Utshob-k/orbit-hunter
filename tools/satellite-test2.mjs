// test 2 of docs/rules/rules-test1-test2.txt: predictor B for the ten established k > 1 zeros (closure tier reliable) of data/branch-points/<k>-<n>-<branch>-<theta>.json, delta_n = a + b/n exactly as fitted on k = 1, n = 8 to 20 (no refit), bound 0.005; the variant H (delta = 8 |eps|, found after the data) is reported apart. node tools/satellite-test2.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
import { perpInfo } from '../src/perp.js';
const D = fileURLToPath(new URL('../data/', import.meta.url));
const A = -0.0033397, B = 0.463315, XS = [1.537242, 6.06149, 1.82889];
const cands = JSON.parse(fs.readFileSync(D + 'satellite-candidates.json', 'utf8')).orbits;
const list = ['2-5-upper-0.3636', '2-7-upper-0.2809', '2-9-upper-0.2227', '2-11-upper-0.1830', '3-8-upper-0.3482', '3-10-lower-0.4021', '3-10-upper-0.2931', '3-11-upper-0.2696', '4-9-upper-0.4249', '5-12-upper-0.3728'];
console.log('B for k > 1: T*_zero = n T*_member - (a + b/n), a = ' + A + ', b = ' + B + ', bound 0.005. H (declared apart): n T*_member - 8 |eps|, relative bound 10 % of delta.');
console.log('file | n | k | n T*_member | first point T* | fitted delta_n | prediction B | data T* (source) | error B (prediction - data) | holds B | delta (data) | |eps| | delta/|eps| | prediction H | delta error H (relative) | holds H | sqrt form at this n | sqrt - data');
let nB = 0, nH = 0; const rows = [];
for (const f of list) {
  const d = JSON.parse(fs.readFileSync(D + 'branch-points/' + f + '.json', 'utf8')), sat = d.satellite.find((s) => s.zero), n = d.n, k = d.k;
  const nTm = n * d.member.Tstar, p0 = sat.curve[0];
  let T = sat.zero.Tstar, src = 'stored zero';
  const c = cands.find((o) => !/nu = 1\//.test(o.label) && o.label.includes(`nu = ${k}/${n} (${d.branch} branch`) && Math.abs(parseFloat(o.label.slice(3)) - T) < 1e-3);
  if (c) { T = perpInfo(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t)).ts; src = 'refined'; }
  const dfit = A + B / n, predB = nTm - dfit, errB = predB - T, hB = Math.abs(errB) <= 0.005;
  const delta = nTm - T, eps = Math.abs(p0.turns), predH = nTm - 8 * eps, errH = Math.abs(8 * eps - delta) / Math.abs(delta), hH = errH <= 0.1;
  const sq = XS[0] * n + XS[1] + XS[2] * Math.sqrt(n);
  if (hB) nB++; if (hH) nH++;
  rows.push({ n, k, T, sq });
  console.log([f, n, k, nTm.toFixed(5), p0.Tstar.toFixed(5), dfit.toFixed(5), predB.toFixed(4), T.toFixed(4) + ' (' + src + ')', errB.toFixed(4), hB ? 'yes' : 'NO', delta.toFixed(5), eps.toExponential(2), (delta / eps).toFixed(2), predH.toFixed(4), (100 * errH).toFixed(1) + ' %', hH ? 'yes' : 'NO', sq.toFixed(4), (sq - T).toFixed(4)].join(' | '));
}
console.log(`B holds for ${nB} of ${list.length}; the variant H holds for ${nH} of ${list.length}. max |n T*_member - first point T*| = ${Math.max(...list.map((f) => { const d = JSON.parse(fs.readFileSync(D + 'branch-points/' + f + '.json', 'utf8')); return Math.abs(d.n * d.member.Tstar - d.satellite.find((s) => s.zero).curve[0].Tstar); })).toExponential(1)}`);
console.log('\nsame n, different k (the sqrt form gives one value per n):');
for (const n of [...new Set(rows.map((r) => r.n))]) { const g = rows.filter((r) => r.n === n); if (g.length > 1) console.log(`n = ${n}: ` + g.map((r) => `k = ${r.k} T* = ${r.T.toFixed(4)}`).join(', ') + `; sqrt form ${g[0].sq.toFixed(4)}`); }

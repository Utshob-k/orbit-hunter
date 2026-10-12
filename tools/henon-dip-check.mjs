// Henon 1977 (p. 105): the relation was found from the observation that an extremum of T along a family coincides with an extremum of Phi.
// is the minimum of the rotation along each satellite curve (the dip) the maximum of T*? stored curves of data/branch-points. node tools/henon-dip-check.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
const PUB = fileURLToPath(new URL('../data/', import.meta.url));
console.log('n | points up to the zero | index of the lowest rotation | index of the highest T* | difference | s at the lowest rotation | s at the highest T* | lowest rotation (turns) | T* at the highest minus T* at the branch point');
const rows = [];
for (let n = 5; n <= 56; n++) {
  const d = JSON.parse(fs.readFileSync(PUB + `branch-points/${n}-upper.json`, 'utf8')), sat = d.satellite.find((s) => s.zero);
  const c = sat.curve, iz = c.findIndex((p, k) => k > 0 && p.turns >= 0), pts = c.slice(0, iz);
  let iu = 0, it = 0;
  pts.forEach((p, k) => { if (p.turns < pts[iu].turns) iu = k; if (p.Tstar > pts[it].Tstar) it = k; });
  rows.push({ n, iu, it, diff: it - iu });
  console.log([n, pts.length, iu, it, it - iu, pts[iu].s.toFixed(4), pts[it].s.toFixed(4), pts[iu].turns.toExponential(3), (pts[it].Tstar - pts[0].Tstar).toExponential(2)].join(' | '));
}
const within = (k) => rows.filter((r) => Math.abs(r.diff) <= k).length;
console.log(`\nindex difference 0 for ${within(0)} of ${rows.length} curves, at most 1 for ${within(1)}, at most 2 for ${within(2)}, at most 5 for ${within(5)}; largest |difference| ${Math.max(...rows.map((r) => Math.abs(r.diff)))} at n = ${rows.find((r) => Math.abs(r.diff) === Math.max(...rows.map((q) => Math.abs(q.diff)))).n}`);
console.log('curves with a dip (lowest rotation not at the branch point): n = ' + rows.filter((r) => r.iu > 0).map((r) => r.n).join(' '));

// Davoust and Broucke 1982 (Table 5, family D1 = Broucke's R) against my numbers:
// 1. the rotation numbers nu of rows 62 to 66 (relative monodromy matrix, src/relative.js). Their bifurcation points of D1 are rows 63 (branch e, triple period), 64 (branch f, double
//    period) and 65 (family E, triple period); the nu of rows 63 and 65 should be 1/3 and that of row 64 about 1/2 (the printed rows have seven digits, so only 3 or 4 digits agree).
// 2. how far the rows of e (79 to 82) and E (70 to 78) are from the satellite curves of the two members of R with nu = 1/3 (data/branch-points/3-upper.json and 3-lower.json,
//    from tools/branch-point.mjs 3 0.3194 --control --write and 3 0.4276 --control --write): relative distance in (T*, L*) to the nearest point of the polyline of the curve, and the rotation
//    at that point next to the printed one. rows that do not close to 1e-9 as converted (data/db82-table5-converted.json) are skipped.
// node tools/db82-bifurcations.mjs
import fs from 'fs';
import { relativeStability } from '../src/relative.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const rows = read('db82-table5-converted.json'), entries = { '3 upper': read('branch-points/3-upper.json'), '3 lower': read('branch-points/3-lower.json') };

console.log('rotation numbers nu of the family D1 (rows 63, 64 and 65 are the bifurcation points)');
for (const N of [62, 63, 64, 65, 66]) {
  const r = rows.find((x) => x.N === N);
  const st = relativeStability(r.u1, r.u2, r.lam, r.t);
  console.log(`row ${N}: T* ${r.ts.toFixed(4)}, L* ${r.ls.toFixed(4)}, rotation ${Math.abs(r.theta / 2 / Math.PI).toFixed(4)} turn, nu and modulus ` + st.nus.map((x) => x.nu.toFixed(5) + ' / ' + x.mod.toFixed(4)).join(', '));
}

function nearest(p, curves) {
  let best = null;
  for (const [name, curve] of curves) for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1], dx = b.Tstar - a.Tstar, dy = b.Lstar - a.Lstar, len2 = dx * dx + dy * dy || 1e-30;
    const t = Math.max(0, Math.min(1, ((p.T - a.Tstar) * dx + (p.L - a.Lstar) * dy) / len2));
    const d = Math.hypot((p.T - a.Tstar - t * dx) / p.T, (p.L - a.Lstar - t * dy) / p.L);
    if (!best || d < best.d) best = { d, name, i, turns: Math.abs(a.turns + t * (b.turns - a.turns)) };
  }
  return best;
}
for (const [label, key, list] of [['branch e (from the member with nu = 1/3, theta 0.319)', '3 upper', [79, 80, 81, 82]], ['family E (from the member with nu = 1/3, theta 0.428)', '3 lower', [70, 71, 72, 73, 74, 75, 76, 77, 78]]]) {
  const curves = entries[key].satellite.map((s) => ['sense ' + s.sense, s.curve]);
  console.log('\n' + label + ': satellite curves of data/branch-points/' + key.replace(' ', '-') + '.json');
  for (const N of list) {
    const r = rows.find((x) => x.N === N);
    if (!r || r.ts == null || r.closeRes > 1e-9) { console.log(`row ${N}: does not close to 1e-9 as converted (residual ${r.closeRes.toExponential(1)}), skipped`); continue; }
    const b = nearest({ T: r.ts, L: Math.abs(r.ls) }, curves);
    console.log(`row ${N}: T* ${r.ts.toFixed(4)}, L* ${Math.abs(r.ls).toFixed(4)}, rotation ${Math.abs(r.theta / 2 / Math.PI).toFixed(4)} turn; nearest point of the ${b.name} curve (segment ${b.i}): relative distance ${b.d.toExponential(1)}, rotation there ${b.turns.toFixed(4)}`);
  }
}

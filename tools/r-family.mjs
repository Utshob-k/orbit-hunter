// the family of Broucke's R orbits through my T* = 33.745 orbit: recomputes the members of data/r-family-members.json from their start values (T*, L*, rotation angle,
// closure, number of alignments) and compares them with
//   - the R orbits of the Three Body Orbits atlas, by key (the list is not stored here: download https://data.threebodyorbits.com/catalogue.json and give the path),
//   - the rows of Table 5 of Davoust and Broucke 1982 (data/db82-table5-converted.json, my conversion of the printed rows), by number.
// a member matches an atlas entry when q T* and L* agree to 1e-5 (relative) and the alignments are the same (the atlas rule of tools/compare-atlas-all.py).
// the last lines show that R2 (rotation 1/2) is not an accepted step of the trace but lies between two of them: the rotation of the trace has its maximum there.
// node tools/r-family.mjs [catalogue.json]
import fs from 'fs';
import { perpInfo, perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { closePerpMS } from '../src/shooting.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const members = read('r-family-members.json').members, db = read('db82-table5-converted.json');
let atlas = null;
if (process.argv[2]) {
  const cat = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).orbits;
  atlas = new Map(cat.filter((x) => x.masses.every((m) => m === 1)).map((x) => [x.key, { T: x.T * Math.abs(x.E) ** 1.5, L: Math.abs(x.L) * Math.abs(x.E) ** 0.5, syz: x.syz }]));
}
let nAtlas = 0, okAtlas = 0, nDb = 0, okDb = 0;
for (const m of members) {
  const info = perpInfo(m.u1, m.u2, m.lam, m.t), w = syzygyWord(perpInitial(m.u1, m.u2, m.lam), 2 * m.t);
  const q = m.q || 1, T = q * info.ts, L = Math.abs(info.ls), syz = q * w.root.length * w.power;
  let line = `${(m.key || (m.N ? 'DB82 table 5 N = ' + m.N : m.name)).padEnd(26)} turns ${(info.theta / (2 * Math.PI)).toFixed(6).padStart(10)}  q T* ${T.toFixed(7).padStart(10)}  L* ${L.toFixed(7)}  alignments ${syz}  closure ${info.repeatErr.toExponential(1)}`;
  if (m.kind === 'atlas' && atlas) {
    const a = atlas.get(m.key); nAtlas++;
    if (!a) line += '   (not in the catalogue)';
    else {
      const dT = Math.abs(a.T - T) / T, dL = Math.abs(a.L - L) / L, ok = dT < 1e-5 && dL < 1e-5 && a.syz === syz;
      if (ok) okAtlas++;
      line += `   atlas: dT ${dT.toExponential(1)}, dL ${dL.toExponential(1)}, alignments ${a.syz} ${ok ? 'match' : 'NO MATCH'}`;
    }
  }
  if (m.kind === 'db82') {
    const r = db.find((x) => x.N === m.N); nDb++;
    const dT = Math.abs(r.ts - info.ts) / info.ts, dL = Math.abs(r.ls - L) / L, dth = Math.abs(Math.abs(r.theta) - Math.abs(info.theta)) / (2 * Math.PI);
    if (dT < 1e-6 && dL < 1e-6) okDb++;
    line += `   row: dT ${dT.toExponential(1)}, dL ${dL.toExponential(1)}, d theta ${dth.toExponential(1)} turn`;
  }
  console.log(line);
}
if (atlas) console.log(`${okAtlas} of ${nAtlas} atlas R orbits match`); else console.log('no catalogue given: the atlas orbits were not compared');
console.log(`${okDb} of ${nDb} rows of Table 5 of Davoust and Broucke 1982 agree to 1e-6 in T* and L*`);

// the largest rotation of the accepted steps is below 1/2; between that step and its neighbour with the larger rotation the members are solved at ten points
const trace = read('r-family-trace.json').curve, rot = trace.map((p) => Math.abs(p.turns));
const iMax = rot.indexOf(Math.max(...rot)), j = rot[iMax + 1] > rot[iMax - 1] ? iMax + 1 : iMax - 1, a = trace[Math.min(iMax, j)], b = trace[Math.max(iMax, j)];
let top = 0;
for (let k = 0; k <= 10; k++) {
  const g = [a.u1, a.u2, a.lam, a.t].map((v, i) => v + (k / 10) * ([b.u1, b.u2, b.lam, b.t][i] - v)), s = closePerpMS(g[0], g[1], g[2], g[3], { m: 8 });
  if (s.res < 1e-9) top = Math.max(top, Math.abs(perpInfo(s.u1, s.u2, s.lam, s.t).theta) / (2 * Math.PI));
}
console.log(`largest rotation of the accepted steps ${rot[iMax].toFixed(5)} turn (step ${iMax}); between steps ${Math.min(iMax, j)} and ${Math.max(iMax, j)} the solved members reach ${top.toFixed(5)}`);

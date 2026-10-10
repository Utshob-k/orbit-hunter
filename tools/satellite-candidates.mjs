// the orbits of data/satellite-candidates.json (periodic orbits with rotation angle 0 on satellite curves of Broucke's R family, refined to 30 digits): recomputes from the values
// T*, L*, rotation angle, closest approach, the syzygy word and the number of alignments, the repeat test (src/covers.js), the closure tiers (double precision) and the multipliers,
// and compares them with other lists. a hit is T* and L* within HIT (relative), the candidate or the entry repeated up to 12 times (L* does not change, T* and the alignments are
// multiplied), and the same number of alignments where the list has it; "near" is NEAR without the alignments. the tolerances were fixed before the comparison was run.
//   my 85 and 17 (data/orbit-table.json, data/perp-arc-orbits.json); the 99 satellites of Jankovic et al. 2020 (data/cpc-converted.json); the 9 rows of Davoust and Broucke 1982 whose
//   rotation angle is a multiple of 2 pi (data/db82-rotation-multiple-2pi.json); the orbits 2 to 46 of Henon 1976 (data/henon1976-derived.json, relative periodic orbits: T* and L* only);
//   the 18 rows of Li et al. 2025 (data/liao2025-scaled.json, the scale free numbers only); and, if the path of the atlas catalogue is given (https://data.threebodyorbits.com/catalogue.json,
//   not stored here), the equal mass atlas entries: the rule of tools/compare-atlas-all.py.
// a pair of orbits can agree in T* and L* to better than HIT and still be two orbits, so every orbit of my 102 within NEAR of a candidate at the same period (n = 1) is compared by its start values:
// the configuration at the start and at the other collinear moment, scaled to the outer bodies at -1 and 1 (position of the middle body, the three velocities), up to the mirror and the sign of y.
// node tools/satellite-candidates.mjs [catalogue.json]
import fs from 'fs';
import { perpInfo, perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { coverInfo } from '../src/covers.js';
import { relativeStability } from '../src/relative.js';
import { closureTier } from '../src/closure.js';
import { shapes, startDistance } from '../src/identity.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const cands = read('satellite-candidates.json').orbits, tab = read('orbit-table.json'), arc = read('perp-arc-orbits.json');
const mine = [...tab.map((o, i) => ({ name: 't' + String(i).padStart(2, '0'), T: o.primitiveTstar, L: o.Lstar, syz: o.wordRoot.length * o.wordPower / o.repeatOf })), ...arc.map((a, i) => ({ name: 'a' + String(i).padStart(2, '0'), T: a.ts, L: Math.abs(a.ls), syz: null }))];
const HIT = 1e-5, NEAR = 5e-3;
const same = [...tab.map((o, i) => ({ name: 't' + String(i).padStart(2, '0'), o, T: o.Tstar, L: o.Lstar })), ...arc.map((a, i) => ({ name: 'a' + String(i).padStart(2, '0'), o: a, T: a.ts, L: Math.abs(a.ls) }))];
const others = [
  ['the 99 CPC satellites', read('cpc-converted.json').map((c) => ({ name: 'N = ' + c.N + ' (k = ' + c.k + ')', T: c.ts_theirs, L: c.ls_theirs, syz: null }))],
  ['the 9 periodic rows of Davoust and Broucke', read('db82-rotation-multiple-2pi.json').map((r) => ({ name: 'row ' + r.N, T: r.Tstar, L: r.Lstar, syz: null }))],
  ['Henon 1976', read('henon1976-derived.json').rows.filter((r) => r.Lstar > 0).map((r) => ({ name: 'orbit ' + r.orbit, T: r.Tstar, L: r.Lstar, syz: r.alignments }))],
  ['Li et al. 2025', read('liao2025-scaled.json').filter((r) => r.Lstar > 0).map((r) => ({ name: r.family + ' L = ' + r.L_paper, T: r.Tstar, L: r.Lstar, syz: null }))],
];
let atlas = null;
if (process.argv[2]) {
  const cat = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).orbits.filter((x) => x.masses.every((m) => m === 1));
  atlas = cat.map((x) => ({ name: x.key, T: x.T * Math.abs(x.E) ** 1.5, L: Math.abs(x.L) * Math.abs(x.E) ** 0.5, syz: x.syz })).filter((a) => a.L > 1e-7);
}
for (const c of cands) {
  const [u1, u2, lam, t] = [c.u1, c.u2, c.lam, c.t].map(Number), x0 = perpInitial(u1, u2, lam);
  const info = perpInfo(u1, u2, lam, t), w = syzygyWord(x0, 2 * t), cv = coverInfo(x0, 2 * t, 200), st = relativeStability(u1, u2, lam, t), tier = closureTier(x0, 2 * t);
  const T = info.ts, L = Math.abs(info.ls), syz = w.root.length * w.power;
  console.log(`\n${c.label}\n  T* ${T.toFixed(9)}, L* ${L.toFixed(9)}, rotation ${info.theta.toExponential(1)}, closest approach ${info.minDist.toFixed(4)}; 30 digit refinement: residual ${c.residual}, closure of the full period ${c.closure_full_period}`);
  console.log(`  word (${w.root})^${w.power}, ${syz} alignments; repeat test (T/n, n up to 200): ${cv.nRepeat} (in own places), ${cv.nRelabel} (relabelled)${cv.failed ? ' FAILED' : ''}; double precision closure ${tier.tier} (${tier.dp.toExponential(1)}, ${tier.bs.toExponential(1)}); largest nontrivial multiplier ${st.maxMod.toFixed(3)} ${st.maxMod < 1 + 1e-6 ? '(linearly stable)' : '(unstable)'}`);
  const hits = (list, tol, withSyz) => { const out = []; for (const a of list) { const dL = Math.abs(a.L - L) / L; if (dL > tol) continue; for (let n = 1; n <= 12; n++) for (const [nm, x, y, s1, s2] of [['entry = n x candidate', a.T, T * n, a.syz, syz * n], ['candidate = n x entry', a.T * n, T, a.syz == null ? null : a.syz * n, syz]]) { const dT = Math.abs(x - y) / y; if (dT < tol && (!withSyz || s1 == null || s1 === s2)) out.push({ name: a.name, nm, n, dT, dL }); } } return out; };
  for (const [who, list] of [['my 85 and 17', mine], ...others, atlas && ['atlas', atlas]].filter(Boolean)) {
    const m1 = hits(list, HIT, true), m5 = hits(list, NEAR, false);
    console.log(`  ${who}: ${m1.length} within ${HIT.toExponential(0)} (with the alignments where known), ${m5.length} within ${NEAR.toExponential(0)}` + (m5.length ? ': ' + m5.slice(0, 3).map((h) => `${h.name} ${h.nm} n = ${h.n}, dT ${h.dT.toExponential(1)}, dL ${h.dL.toExponential(1)}`).join('; ') : ''));
  }
  const pairs = same.filter((m) => Math.abs(m.T - T) / T < NEAR && Math.abs(m.L - L) / L < NEAR);
  console.log('  my 102 at the same period within ' + NEAR.toExponential(0) + ': ' + (pairs.length ? pairs.map((m) => { const d = startDistance(shapes(c), shapes(m.o)); return `${m.name} (dT ${(Math.abs(m.T - T) / T).toExponential(1)}, dL ${(Math.abs(m.L - L) / L).toExponential(1)}): ` + (d < 1e-6 ? `the same orbit, the starts agree to ${d.toExponential(1)}` : `a different orbit, the starts differ by ${d.toExponential(1)}`); }).join('; ') : 'none'));
  if (!atlas) console.log('  (no catalogue given: the atlas was not compared)');
}

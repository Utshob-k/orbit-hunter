// recomputes the orbits of data/satellite-candidates.json (rotation 0 on satellite curves of R, 30 digits): T*, L*, word, repeat test,
// closure tiers, multipliers, and compares them with my 102 orbits, the CPC rows, the Davoust-Broucke rows, Henon 1976, Li et al. 2025 and,
// if given, the atlas catalogue (not stored here). hit: T*, L* within HIT (relative), either repeated up to 12 times, same alignments;
// near: without them (tolerances fixed before the comparison); near orbits are then compared by start values.
// node tools/satellite-candidates.mjs [catalogue.json] [--write] (--write stores the multiplier and closure tier in
// data/satellite-candidates.json)
import fs from 'fs';
import { perpInfo, perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { coverInfo } from '../src/covers.js';
import { relativeStability } from '../src/relative.js';
import { closureTier } from '../src/closure.js';
import { shapes, startDistance } from '../src/identity.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const doc = read('satellite-candidates.json'), cands = doc.orbits, tab = read('orbit-table.json'), arc = read('perp-arc-orbits.json');
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
const catalogue = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (catalogue) {
  const cat = JSON.parse(fs.readFileSync(catalogue, 'utf8')).orbits.filter((x) => x.masses.every((m) => m === 1));
  atlas = cat.map((x) => ({ name: x.key, T: x.T * Math.abs(x.E) ** 1.5, L: Math.abs(x.L) * Math.abs(x.E) ** 0.5, syz: x.syz })).filter((a) => a.L > 1e-7);
}
for (const c of cands) {
  const [u1, u2, lam, t] = [c.u1, c.u2, c.lam, c.t].map(Number), x0 = perpInitial(u1, u2, lam);
  const info = perpInfo(u1, u2, lam, t), w = syzygyWord(x0, 2 * t), cv = coverInfo(x0, 2 * t, 200), st = relativeStability(u1, u2, lam, t), tier = closureTier(x0, 2 * t);
  const T = info.ts, L = Math.abs(info.ls), syz = w.root.length * w.power;
  c.multiplier = Number(st.maxMod.toPrecision(10)); c.closureTier = tier.tier;
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
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL('../data/satellite-candidates.json', import.meta.url), JSON.stringify(doc, null, 1));
  console.log('multiplier and closureTier written to data/satellite-candidates.json');
}

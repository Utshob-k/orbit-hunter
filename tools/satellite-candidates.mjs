// the two orbits of data/satellite-candidates.json (periodic orbits on satellite curves of Broucke's R family, refined to 30 digits): recomputes from the values
// T*, L*, rotation angle, closest approach, the syzygy word and the number of alignments, the repeat test (src/covers.js), the closure tiers (double precision) and the multipliers,
// and compares them with my 85 + 17 orbits and, if the path of the atlas catalogue is given (https://data.threebodyorbits.com/catalogue.json, not stored here), with the equal mass
// atlas entries: the rule of tools/compare-atlas-all.py (T* and L* to 1e-5, repeats up to 12 either way, same alignments), and "near" at 5e-3.
// node tools/satellite-candidates.mjs [catalogue.json]
import fs from 'fs';
import { perpInfo, perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { coverInfo } from '../src/covers.js';
import { relativeStability } from '../src/relative.js';
import { closureTier } from '../src/closure.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const cands = read('satellite-candidates.json').orbits, tab = read('orbit-table.json'), arc = read('perp-arc-orbits.json');
const mine = [...tab.map((o, i) => ({ name: 't' + String(i).padStart(2, '0'), T: o.primitiveTstar, L: o.Lstar, syz: o.wordRoot.length * o.wordPower / o.repeatOf })), ...arc.map((a, i) => ({ name: 'a' + String(i).padStart(2, '0'), T: a.ts, L: Math.abs(a.ls), syz: null }))];
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
  console.log(`  word (${w.root})^${w.power}, ${syz} alignments; repeat test (T/n, n up to 200): ${cv.nRepeat} (in own places), ${cv.nRelabel} (relabelled)${cv.failed ? ' FAILED' : ''}; double precision closure ${tier.tier} (${tier.dp.toExponential(1)}, ${tier.bs.toExponential(1)}); largest nontrivial multiplier ${st.maxMod.toFixed(3)}`);
  const hits = (list, tol) => { const out = []; for (const a of list) { const dL = Math.abs(a.L - L) / L; if (dL > tol) continue; for (let n = 1; n <= 12; n++) for (const [nm, x, y, s] of [['entry = n x candidate', a.T, T * n, syz * n], ['candidate = n x entry', a.T * n, T, syz]]) { const dT = Math.abs(x - y) / y; if (dT < tol) out.push({ name: a.name, nm, n, dT, dL, same: a.syz == null ? null : (nm.startsWith('entry') ? a.syz === s : syz === a.syz * n) }); } } return out; };
  for (const [list, who] of [[mine, 'my 85 and 17'], atlas && [atlas, 'atlas']].filter(Boolean)) {
    const m1 = hits(list, 1e-5).filter((h) => h.same !== false), m5 = hits(list, 5e-3);
    console.log(`  ${who}: ${m1.length} within 1e-5 (with the alignments), ${m5.length} within 5e-3` + (m5.length ? ': ' + m5.slice(0, 3).map((h) => `${h.name} ${h.nm} n = ${h.n}, dT ${h.dT.toExponential(1)}, dL ${h.dL.toExponential(1)}`).join('; ') : ''));
  }
  if (!atlas) console.log('  (no catalogue given: the atlas was not compared)');
}

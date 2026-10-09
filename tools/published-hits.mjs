// the orbits of my lists that lie on a family traced from a published orbit (data/families85/*.json):
// my T*, L*, syzygy word; the theta = 0 orbit found on the trace (T*, L*, word) and its distance to mine; the published orbit the trace started from (T*, L*, word) and whether it is the same orbit
// node tools/published-hits.mjs
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';

const tab = JSON.parse(fs.readFileSync('data/orbit-table.json', 'utf8')), arc = JSON.parse(fs.readFileSync('data/perp-arc-orbits.json', 'utf8'));
const conv = ['db82-A1-converted', 'db82-table3-converted', 'db82-table4-converted', 'db82-table5-converted', 'db82-table6-converted', 'db82-table7-converted'].flatMap((f) => JSON.parse(fs.readFileSync(`data/${f}.json`, 'utf8')));
const cpc = JSON.parse(fs.readFileSync('data/cpc-converted.json', 'utf8'));
const wordOf = (u1, u2, lam, t) => { const w = syzygyWord(perpInitial(u1, u2, lam), 2 * t); return w ? `${w.root}^${w.power}` : null; };
const short = (w) => (w && w.length > 22 ? w.slice(0, 20) + '..' : w);
const hits = [
  { mine: 't01', file: 'db_lo_a', pub: { kind: 'db', N: 42 }, label: 'D&B family a (traced from row 42)' },
  { mine: 't03', file: 'db_lo_h', pub: { kind: 'db', N: 115 }, label: 'D&B family h (traced from row 115)' },
  { mine: 't02', file: 'db_up_D2', pub: { kind: 'db', N: 92 }, label: 'D&B family D2 (traced from row 92)' },
  { mine: 't05', file: 'db_lo_f', pub: { kind: 'db', N: 84 }, label: 'D&B family f (traced from row 84)' },
  { mine: 't08', file: 'db_lo_gamma', pub: { kind: 'db', N: 86 }, label: 'D&B family gamma (traced from row 86)' },
  { mine: 'a02', file: 'cpcN3', pub: { kind: 'cpc', N: 3 }, label: 'CPC family of N = 3' },
];
const getMine = (n) => { if (n[0] === 't') { const o = tab[+n.slice(1)]; return { Tstar: o.Tstar, Lstar: o.Lstar, u1: o.u1, u2: o.u2, lam: o.lam, t: o.t }; } const a = arc[+n.slice(1)]; return { Tstar: a.ts, Lstar: Math.abs(a.ls), u1: a.u1, u2: a.u2, lam: a.lam, t: a.t }; };
console.log('name | my T*, L*, word | zero on the trace: T*, L*, word | |difference| T*, L* | published start: T*, L*, word | published start = this orbit?');
for (const h of hits) {
  const m = getMine(h.mine); const mw = wordOf(m.u1, m.u2, m.lam, m.t);
  const d = JSON.parse(fs.readFileSync(`data/families85/${h.file}.json`, 'utf8'));
  let z = null; for (const x of d.directions) for (const q of x.zeros) if (Math.abs(q.Tstar - m.Tstar) / m.Tstar < 1e-5) z = q;
  if (!z) { console.log(h.label, 'no zero found'); continue; }
  const zw = wordOf(z.u1, z.u2, z.lam, z.t);
  let p;
  if (h.pub.kind === 'db') { const c = conv.find((r) => r.N === h.pub.N); p = { T: c.ts, L: c.ls, w: wordOf(c.u1, c.u2, c.lam, c.t) }; } else { const c = cpc.find((r) => r.N === h.pub.N); p = { T: c.ts_theirs, L: c.ls_theirs, w: wordOf(c.mine.u1, c.mine.u2, c.mine.lam, c.mine.t) }; }
  const same = Math.abs(p.T - m.Tstar) / m.Tstar < 1e-5 && Math.abs(p.L - m.Lstar) / m.Lstar < 1e-5;
  console.log(`${h.label} | ${m.Tstar.toFixed(5)}, ${m.Lstar.toFixed(5)}, ${short(mw)} | ${z.Tstar.toFixed(5)}, ${z.Lstar.toFixed(5)}, ${short(zw)} (word same as mine: ${zw === mw}) | ${Math.abs(z.Tstar - m.Tstar).toExponential(1)}, ${Math.abs(z.Lstar - m.Lstar).toExponential(1)} | ${p.T.toFixed(5)}, ${p.L.toFixed(5)}, ${short(p.w)} | ${same ? 'yes, the start itself is this orbit' : 'no, ' + (100 * Math.abs(p.T - m.Tstar) / m.Tstar).toFixed(1) + ' % in T*, ' + (100 * Math.abs(p.L - m.Lstar) / m.Lstar).toFixed(1) + ' % in L*'}`);
}

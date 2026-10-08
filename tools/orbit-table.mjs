// one table of the orbits in data/stability-perp-3.json with their syzygy word, for sharing
// node tools/orbit-table.mjs   (writes data/orbit-table.json and data/orbit-table.csv)
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';

const list = JSON.parse(fs.readFileSync(new URL('../data/stability-perp-3.json', import.meta.url), 'utf8'));
const rows = [];
for (const o of list) {
  const w = syzygyWord(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
  const bhh = !!w && w.root === '01';
  rows.push({ group: o.group, u1: o.u1, u2: o.u2, lam: o.lam, t: o.t, T: o.T, Tstar: o.ts, Lstar: Math.abs(o.ls), minDist: o.minD, status: o.status, syzygies: w?.length ?? null, wordRoot: w?.root ?? null, wordPower: w?.power ?? null, bhhType: bhh });
}
rows.sort((a, b) => a.Tstar - b.Tstar);
fs.writeFileSync(new URL('../data/orbit-table.json', import.meta.url), JSON.stringify(rows, null, 1));
const cols = ['group', 'Tstar', 'Lstar', 'lam', 'u1', 'u2', 't', 'minDist', 'status', 'syzygies', 'bhhType', 'wordRoot', 'wordPower'];
fs.writeFileSync(new URL('../data/orbit-table.csv', import.meta.url), [cols.join(','), ...rows.map((r) => cols.map((c) => (typeof r[c] === 'number' ? r[c].toPrecision(12) : r[c])).join(','))].join('\n'));
console.log(rows.length, 'orbits;', rows.filter((r) => r.bhhType).length, 'BHH type;', rows.filter((r) => r.status === 'stable').length, 'stable');

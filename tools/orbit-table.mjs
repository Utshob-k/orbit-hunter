// one table of the orbits in data/stability-perp-3.json with their syzygy word, for sharing
// node tools/orbit-table.mjs   (writes data/orbit-table.json and data/orbit-table.csv)
// start: bodies at (-1-lam/3, lam-lam/3, 1-lam/3) on the x axis, velocities (0,u1), (0,u2), (0,-u1-u2); period T = 2t, m = G = 1.
// closureDP45 / closureBS: the largest position or velocity difference (max norm) between end and start state after one period, with the best rotation
// removed, integrated with Dormand-Prince 5(4) (rtol 1e-13, atol 1e-14) and Gragg-Bulirsch-Stoer (tol 1e-13); the columns ending in raw do not remove the rotation. distToBHHcurve: relative distance of (T*/k, L*) to the nearest published
// satellite (BHH type orbits only); offBHHcurve is true when it is above 0.2.
// repeatOf = n when the orbit is an n fold repeat of a shorter orbit (primitiveTstar = T*/n); relabelReturnN = n when the picture repeats after T/n
// with the bodies renamed (the 'orbit' of the same motion for equal masses).
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { perpInfo } from '../src/perp.js';
import { bsIntegrate } from '../src/bs.js';
import { coverInfo } from '../src/covers.js';
import { closureError } from '../src/closure.js';

// published satellites (T*/k, L*) for the distance to the BHH curve
const cpc = JSON.parse(fs.readFileSync(new URL('../data/cpc-converted.json', import.meta.url), 'utf8')).map((c) => [c.ts_theirs / c.k, c.ls_theirs]);


const list = JSON.parse(fs.readFileSync(new URL('../data/stability-perp-3.json', import.meta.url), 'utf8'));
const rows = [];
for (const o of list) {
  const w = syzygyWord(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
  const bhh = !!w && w.root === '01';
  const info = perpInfo(o.u1, o.u2, o.lam, o.t);
  const x0 = perpInitial(o.u1, o.u2, o.lam);
  const dp = closureError(x0, 2 * o.t, 'dp45');
  const bs = closureError(x0, 2 * o.t, 'bs');
  const cv = coverInfo(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
  const x = w && bhh ? o.ts / w.power : null;
  const distBHH = x ? Math.min(...cpc.map(([a, b]) => Math.hypot((a - x) / x, (b - Math.abs(o.ls)) / Math.abs(o.ls)))) : null;
  rows.push({ group: o.group, u1: o.u1, u2: o.u2, lam: o.lam, t: o.t, T: o.T, Tstar: o.ts, Lstar: Math.abs(o.ls), minDist: o.minD, status: o.status, syzygies: w?.length ?? null, wordRoot: w?.root ?? null, wordPower: w?.power ?? null, bhhType: bhh, closureDP45: dp?.errRot ?? null, closureBS: bs?.errRot ?? null, closureDP45raw: dp?.errRaw ?? null, closureBSraw: bs?.errRaw ?? null, repeatOf: cv.nRepeat, relabelReturnN: cv.nRelabel, primitiveTstar: o.ts / cv.nRepeat, rotation: info?.theta ?? null, distToBHHcurve: distBHH, offBHHcurve: distBHH === null ? null : distBHH > 0.2 });
}
rows.sort((a, b) => a.Tstar - b.Tstar);
fs.writeFileSync(new URL('../data/orbit-table.json', import.meta.url), JSON.stringify(rows, null, 1));
const cols = ['group', 'Tstar', 'Lstar', 'lam', 'u1', 'u2', 't', 'minDist', 'status', 'syzygies', 'bhhType', 'wordRoot', 'wordPower', 'closureDP45', 'closureBS', 'closureDP45raw', 'closureBSraw', 'repeatOf', 'relabelReturnN', 'primitiveTstar', 'rotation', 'distToBHHcurve', 'offBHHcurve'];
fs.writeFileSync(new URL('../data/orbit-table.csv', import.meta.url), [cols.join(','), ...rows.map((r) => cols.map((c) => (typeof r[c] === 'number' ? r[c].toPrecision(12) : r[c])).join(','))].join('\n'));
console.log(rows.length, 'orbits;', rows.filter((r) => r.bhhType).length, 'BHH type;', rows.filter((r) => r.status === 'stable').length, 'stable');

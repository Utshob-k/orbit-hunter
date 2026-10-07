// compares orbits with the Hristov and Hristova database (arXiv 2404.16526)
// file: http://db2.fmi.uni-sofia.bg/3bodyeuler/100_12431.txt  (columns vx vy T T*, T* = T|E|^1.5)
// run: node tools/compare-hristov.mjs path/to/100_12431.txt
import fs from 'fs';
import { fingerprint } from '../src/newton.js';
import { KNOWN } from '../src/known.js';

const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => {
  const c = l.trim().split(/\s+/).map(Number);
  return { vx: c[0], vy: c[1], T: c[2], ts: c[3] };
});
console.log(rows.length, 'rows, T* from', rows[0].ts, 'to', rows[rows.length - 1].ts);

// my orbits: label, v1, v2, T
const mine = [
  ['A', 0.0880054619, 0.4212710769, 8.97545309],
  ['B', 0.062014409, 0.2547876725, 10.09007046],
  ['C', 0.0560050559, 0.1398707263, 10.45366342],
  ['D', 0.3827414123, 0.4589771182, 25.05730466],
  ['E', 0.2517330337, 0.2941901556, 27.00343892],
  ['F', 0.341813, 0.711347, 106.1442],
  ['G', 0.698073, 0.328501, 100.8454],
  ...KNOWN.map((k) => [k.name, k.v1, k.v2, k.T]),
];

for (const [name, v1, v2, T] of mine) {
  const ts = fingerprint(v1, v2, T);
  const best = [...rows].sort((a, b) => Math.abs(a.ts - ts) - Math.abs(b.ts - ts))[0];
  const rel = Math.abs(best.ts - ts) / ts;
  const dv = Math.hypot(best.vx - v1, best.vy - v2);
  const verdict = rel < 1e-6 ? 'SAME ORBIT' : rel < 1e-4 ? 'close but different?' : ts >= 70 ? 'outside this file (T* >= 70)' : 'NOT FOUND';
  console.log(`${name.padEnd(13)} T*=${ts.toFixed(6)}  closest T*=${best.ts.toFixed(6)} rel diff ${rel.toExponential(1)}  |dv|=${dv.toExponential(1)}  ${verdict}`);
}

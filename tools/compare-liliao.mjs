// compares orbits against the table from Li and Liao (arXiv 1705.00527)
// get the table: curl -L -o src.tgz https://arxiv.org/e-print/1705.00527 && tar xzf src.tgz
// run: node tools/compare-liliao.mjs path/to/3-body-14.tex
import fs from 'fs';
import { fingerprint } from '../src/newton.js';
import { KNOWN } from '../src/known.js';

const tex = fs.readFileSync(process.argv[2] || '3-body-14.tex', 'utf8');
const re = /^\s*([IV]+\.?[A-C])\$\^\{i\.c\.\}_\{(\d+)\}\$\s*&\s*([\d.]+)\s*&\s*([\d.]+)\s*&\s*([\d.]+)\s*&/gm;
const seen = new Set();
const rows = [];
let m;
while ((m = re.exec(tex))) {
  const r = { cls: m[1] + m[2], v1: +m[3], v2: +m[4], T: +m[5] };
  const key = r.cls + r.v1 + r.v2;
  if (seen.has(key)) continue; // table is in the file twice
  seen.add(key);
  r.fp = fingerprint(r.v1, r.v2, r.T);
  rows.push(r);
}
console.log(rows.length, 'orbits in the table (paper says 695)');

// pass orbits as "v1,v2,T" on the command line after the file, otherwise use the ones i found
const mine = process.argv.slice(3).map((a) => a.split(',').map(Number));
if (!mine.length) mine.push([0.209661505, 0.525702389, 33.861519], [0.255430936, 0.516385839, 35.043087]);
for (const k of KNOWN) mine.push([k.v1, k.v2, k.T]);

for (const [v1, v2, T] of mine) {
  const fp = fingerprint(v1, v2, T);
  const best = [...rows].sort((a, b) => Math.abs(a.fp - fp) - Math.abs(b.fp - fp))[0];
  const rel = Math.abs(best.fp - fp) / fp;
  console.log(`(${v1}, ${v2}) T=${T} fp=${fp.toFixed(5)}  closest ${best.cls} fp=${best.fp.toFixed(5)} rel diff ${rel.toExponential(1)}  ${rel < 2e-5 ? 'SAME ORBIT' : 'not in table'}`);
}

// the reduced multipliers of tools/reduced-multipliers-iso.mjs and the relative stability of src/iso-relative.js against the rotation numbers stored
// in data/r-family-trace-iso.json, on two members. node tools/iso-check-multipliers.mjs
import fs from 'fs';
import { reducedMultipliers } from './reduced-multipliers-iso.mjs';
import { relativeStability } from '../src/iso-relative.js';
const tr = JSON.parse(fs.readFileSync('data/r-family-trace-iso.json', 'utf8')).curve;
let ok = true;
for (const i of [140, 230]) {
  const p = tr[i], q = reducedMultipliers(p.u1, p.u2, p.lam, p.t), r = relativeStability(p.u1, p.u2, p.lam, p.t);
  const stored = p.nus.map((x) => x[0]).sort((a, b) => a - b), mine = q.nus.map((x) => x.nu), rel = r.nus.map((x) => x.nu).sort((a, b) => a - b);
  const d = Math.max(Math.abs(stored[0] - mine[0]), Math.abs(stored[1] - mine[1])), d2 = Math.max(Math.abs(stored[0] - rel[0]), Math.abs(stored[1] - rel[1]));
  if (!(d < 1e-6 && d2 < 1e-6)) ok = false;
  console.log(`iso point ${i}: stored nus ${stored.map((x) => x.toFixed(8)).join(', ')}; reduction ${mine.map((x) => x.toFixed(8)).join(', ')} (difference ${d.toExponential(2)}, max |mod - 1| ${q.maxModDev.toExponential(1)}); iso relativeStability ${rel.map((x) => x.toFixed(8)).join(', ')} (difference ${d2.toExponential(2)})`);
}
console.log('check ' + (ok ? 'PASSED' : 'FAILED'));

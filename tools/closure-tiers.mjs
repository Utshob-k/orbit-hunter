// closure tier (reliable / weak / failed, see src/closure.js) of every orbit of a list file ({u1, u2, lam, t} entries)
// node tools/closure-tiers.mjs file.json
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { closureTier } from '../src/closure.js';

const counts = {};
for (const o of JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))) {
  const r = closureTier(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
  counts[r.tier] = (counts[r.tier] || 0) + 1;
  console.log(`T*=${(o.ts ?? o.Tstar).toFixed(3)} L*=${Math.abs(o.ls ?? o.Lstar).toFixed(4)}  ${r.tier}  dp45 ${r.dp?.toExponential(1)}  bs ${r.bs?.toExponential(1)}`);
}
console.log(JSON.stringify(counts));

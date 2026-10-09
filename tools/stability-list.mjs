// linear stability of the perpendicular-family orbits in a json file.
// node tools/stability-list.mjs file.json [out.json]
// file: [{u1,u2,lam,t}, ...] or the {unmatched, published, zeroL} layout of data/perp-periodic-3.json
import fs from 'fs';
import { perpInitial, closePerp } from '../src/perp.js';
import { stability } from '../src/stability.js';

const [file, outFile] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const list = Array.isArray(raw) ? raw.map((o) => ({ ...o, group: 'list' }))
  : [...raw.unmatched.map((o) => ({ ...o, group: 'unmatched' })), ...raw.published.map((o) => ({ ...o, group: 'atlas' })), ...raw.zeroL.map((o) => ({ ...o, group: 'zeroL' }))];
const out = [];
let skipped = 0;
for (const o of list) {
  const c = closePerp(o.u1, o.u2, o.lam, o.t, { maxMs: 20000 });
  if (c.res > 1e-9) { console.log('skipped, did not re-close', o.lam); skipped++; continue; }
  const T = 2 * c.t;
  let s;
  try { s = stability(perpInitial(c.u1, c.u2, o.lam), T); } catch (e) { console.log('failed', o.lam, e.message); skipped++; continue; }
  const E = o.E, L = o.L;
  out.push({ group: o.group, u1: c.u1, u2: c.u2, lam: o.lam, t: c.t, T, ts: o.ts, ls: o.ls, minD: o.minD, maxMod: s.maxMod, maxNontrivial: s.maxNontrivial, scatter: s.scatter, status: s.status, stable: s.stable });
  console.log(`${o.group.padEnd(9)} lam=${o.lam.toFixed(5)} T*=${(o.ts ?? NaN).toFixed(3)} L*=${Math.abs(o.ls ?? NaN).toFixed(3)}  max|lambda| (nontrivial)=${s.maxNontrivial.toExponential(3)} noise=${s.scatter.toExponential(1)}  ${s.status.toUpperCase()}`);
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
const st = out.filter((o) => o.stable).length;
const unc = out.filter((o) => o.status === 'uncertain').length;
console.log(`\n${out.length} orbits, ${st} linearly stable, ${out.length - st - unc} unstable, ${unc} uncertain; ${skipped} of ${list.length} not computed (did not re-close or the stability failed)`);

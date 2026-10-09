// checks the multiple precision refinements in data/refined/<name>.json (tools/refine-mp.py) against the double precision orbits of data/orbit-table.json
// an orbit gets the label "refined" when
//   1. newton converged: final residual below 1e-23 and the full period closes to 1e-20 (multiple precision integrator)
//   2. it is the same orbit: T* and L* of the refined start agree with the table to 1e-6, the syzygy word is the same, and the repeat count is the same
// the distance moved is reported but is not pass or fail (the start of a strongly unstable orbit is only known to the precision the instability allows)
// node tools/check-refined.mjs [dir ...]      default: data/refined/weak data/refined/*.json
import fs from 'fs';
import path from 'path';
import { perpInitial, perpInfo } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { coverInfo } from '../src/covers.js';

const table = JSON.parse(fs.readFileSync(new URL('../data/orbit-table.json', import.meta.url), 'utf8'));
// the orbits of the arclength list are not in the table of the 85: add them with their word and repeat count computed here
for (const a of JSON.parse(fs.readFileSync(new URL('../data/perp-arc-orbits.json', import.meta.url), 'utf8'))) {
  const x0 = perpInitial(a.u1, a.u2, a.lam), w = syzygyWord(x0, 2 * a.t), cv = coverInfo(x0, 2 * a.t, 24);
  table.push({ u1: a.u1, u2: a.u2, lam: a.lam, t: a.t, Tstar: a.ts, Lstar: Math.abs(a.ls), closureTier: 'reliable', status: 'arclength list', wordRoot: w.root, wordPower: w.power, repeatOf: cv.nRepeat });
}
const files = [];
const args = process.argv.slice(2);
const dirs = args.length ? args : ['data/refined', 'data/refined/weak'];
for (const d of dirs) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.json') && f !== 'summary.json') files.push(path.join(d, f));

if (files.length === 0) { console.error('no refinement files found: nothing was checked'); process.exit(1); }
const out = [];
for (const f of files.sort()) {
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const start = r.start_double;
  // find the orbit of the table that this refinement started from
  const row = table.reduce((best, o) => (Math.abs(o.lam - Number(start.lam)) + Math.abs(o.u1 - Number(start.u1)) < Math.abs(best.lam - Number(start.lam)) + Math.abs(best.u1 - Number(start.u1)) ? o : best), table[0]);
  const u1 = Number(r.u1), u2 = Number(r.u2), lam = Number(r.lam), t = Number(r.t);
  const info = perpInfo(u1, u2, lam, t);
  const moved = Math.max(Math.abs(u1 - row.u1), Math.abs(u2 - row.u2), Math.abs(lam - row.lam), Math.abs(t - row.t));
  const w = syzygyWord(perpInitial(u1, u2, lam), 2 * t);
  const cv = coverInfo(perpInitial(u1, u2, lam), 2 * t, 24);
  const res = Number(r.residual), full = Number(r.closure_full_period);
  const converged = res < 1e-23 && full < 1e-20;   // the refinement itself stops at 1e-24
  const dT = info ? Math.abs(info.ts - row.Tstar) / row.Tstar : Infinity;
  const dL = info ? Math.abs(Math.abs(info.ls) - row.Lstar) / Math.max(row.Lstar, 1e-3) : Infinity;   // L* = 0 for the two L = 0 orbits
  const sameWord = !!w && w.root === row.wordRoot && w.power === row.wordPower;
  const sameRepeat = cv.nRepeat === row.repeatOf;
  const same = dT < 1e-6 && dL < 1e-6 && sameWord && sameRepeat;
  const label = converged && same ? 'refined' : converged ? 'converged but different orbit?' : 'not converged';
  out.push({ file: f, Tstar: row.Tstar, tierBefore: row.closureTier, status: row.status, residual: res, closureFull: full, moved, dT, dL, sameWord, sameRepeat, label });
  console.log(`${path.basename(f).padEnd(14)} T*=${row.Tstar.toFixed(3).padStart(7)} ${row.closureTier.padEnd(8)} ${row.status.padEnd(9)} residual ${res.toExponential(1)} full ${full.toExponential(1)} moved ${moved.toExponential(1)} dT ${dT.toExponential(1)} word ${sameWord ? 'same' : 'DIFFERENT'} repeat ${sameRepeat ? 'same' : 'DIFFERENT'} -> ${label}`);
}
fs.writeFileSync(new URL('../data/refined/summary.json', import.meta.url), JSON.stringify(out, null, 1));
const count = {};
for (const o of out) count[o.label] = (count[o.label] || 0) + 1;
console.log(JSON.stringify(count));

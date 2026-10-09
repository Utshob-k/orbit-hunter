// is a branch arm just a repeat of a shorter orbit (or of a shorter branch)? for sample points of every arm of a results file that stores the states:
// the minimal period of the orbit (src/covers.js: does the state come back, rotated, after T/n with the bodies in their own places?) and the syzygy word of the
// shortest orbit. an arm whose points are n fold repeats of shorter orbits is not a branch of its own.
// node tools/arm-repeat-check.mjs results.jsonl [from] [to]     (job index range, to split the work)
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { coverInfo } from '../src/covers.js';

const [file, fromArg, toArg] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
const from = Number(fromArg) || 0, to = Number(toArg) || lines.length;
const out = [];
for (let li = from; li < Math.min(to, lines.length); li++) {
  const r = JSON.parse(lines[li]);
  for (const b of r.branches) {
    if (!b.ok) continue;
    const c = b.curve.filter((p) => p[3] < 1e-7 && p.length >= 8);
    if (c.length < 3) continue;
    const idx = [...new Set([Math.floor(c.length * 0.25), Math.floor(c.length * 0.5), c.length - 1])];
    const pts = idx.map((i) => {
      const p = c[i];
      const cv = coverInfo(perpInitial(p[5], p[6], p[0]), 2 * p[7], 200);   // the limit has to be above the repeat count of the parent times k (up to 9 x 20 = 180), a limit of 24 made the 27 fold repeats of the 9 fold parent look like 9 fold ones
      return { lam: p[0], Tstar: p[1], nRepeat: cv.nRepeat, nRelabel: cv.nRelabel, failed: !!cv.failed };
    });
    const rec = { job: li, orbit: r.job.orbit, k: r.job.k, lamBP: b.lamBP, sgn: b.sgn, points: pts, anyRepeat: pts.some((q) => q.nRepeat > 1), anyFailed: pts.some((q) => q.failed) };
    out.push(rec);
    console.log(JSON.stringify(rec));
  }
}
if (out.length === 0) { console.error('no arm checked (no arm with stored states and at least 3 good points in the chosen range): nothing was compared'); process.exit(1); }
fs.writeFileSync(file.replace(/\.jsonl$/, '') + `.repeats-${from}-${to}.json`, JSON.stringify(out, null, 1));

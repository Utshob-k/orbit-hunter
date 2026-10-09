// checks the branches in a results file written by satellite-worker.mjs (needs the state columns u1, u2, t).
// for a sample of points of every branch arm:
//   1. syzygy word: (01)^K with 2K syzygies, K = k times the exponent of the progenitor
//   2. smoothness: jumps in T* and L* between neighbouring points compared with the median jump (a branch jump shows as a big outlier)
//   3. re-close in double precision with more pieces and a tighter tolerance; lam, T* must not change
// node tools/verify-branches.mjs results.jsonl [maxArms]     all arms of the file are checked unless maxArms is given; a cut is reported at the end
import fs from 'fs';
import { closePerpMS } from '../src/shooting.js';
import { perpInfo, perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';

const EXPONENT = { 4.96: 1, 9.658: 3, 17.847: 5, 19.769: 6, 29.31: 8, 33.745: 9, 47.065: 16 };
const [file, maxArgs] = process.argv.slice(2);
const maxArms = Number(maxArgs) || Infinity;
let skippedByCap = 0, noStates = 0;
const out = [];
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  const key = Object.keys(EXPONENT).find((x) => Math.abs(Number(x) - r.job.ts0) < 0.01);
  const kp = key ? EXPONENT[key] : null;
  for (const b of r.branches) {
    if (!b.ok) continue;
    if (b.curve.length < 6 || b.curve[0].length < 8) { noStates++; continue; }
    if (out.length >= maxArms) { skippedByCap++; continue; }
    const c = b.curve.filter((p) => p[3] < 1e-7);
    const res = { orbit: r.job.orbit, ts0: r.job.ts0, k: r.job.k, lamBP: b.lamBP, sgn: b.sgn, points: c.length };
    // smoothness
    const jumps = [];
    for (let i = 1; i < c.length; i++) jumps.push(Math.hypot((c[i][1] - c[i - 1][1]) / c[i][1], (c[i][2] - c[i - 1][2]) / c[i][2]));
    const sorted = [...jumps].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] || 0;
    res.maxJumpOverMedian = med > 0 ? Math.max(...jumps) / med : null;
    // syzygy word at up to 12 points spread over the arm, re-closing at the first, middle and last one
    res.checks = [];
    const picks = new Set();
    const nPick = Math.min(12, c.length);
    for (let q = 0; q < nPick; q++) picks.add(Math.round((q * (c.length - 1)) / Math.max(1, nPick - 1)));
    const reclose = new Set([0, Math.floor(c.length / 2), c.length - 1]);
    for (const i of [...picks].sort((x, y) => x - y)) {
      const p = c[i];
      const w = syzygyWord(perpInitial(p[5], p[6], p[0]), 2 * p[7]);
      const chk = { lam: p[0], word: w ? `${w.root}^${w.power}` : null, syzygies: w?.length, expected: kp ? 2 * kp * r.job.k : null };
      if (reclose.has(i)) {
        const again = closePerpMS(p[5], p[6], p[0], p[7], { m: 16, tol: 1e-12 });
        const info = again.res < 1e-9 ? perpInfo(again.u1, again.u2, again.lam, again.t) : null;
        chk.reclosed = again.res;
        chk.dTs = info ? Math.abs(info.ts - p[1]) / p[1] : null;
      }
      res.checks.push(chk);
    }
    out.push(res);
    console.log(JSON.stringify(res));
  }
}
if (noStates) console.error(`${noStates} arms were skipped: fewer than 6 points or no stored states`);
if (skippedByCap) console.error(`maxArms = ${maxArms} reached: ${skippedByCap} more arms with stored states were NOT checked`);
if (out.length === 0) { console.error('no arm verified (no arm with stored states): nothing was compared'); process.exit(1); }
fs.writeFileSync(file.replace(/\.jsonl$/, '') + '.verified.json', JSON.stringify(out, null, 1));

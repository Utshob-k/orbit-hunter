// walk each stable orbit along lam in both directions, track the rotation numbers nu and write one job for every place where
// a nu passes m/k (k up to kMax): the k fold repeat has a branch point there.
// node tools/nu-crossings.mjs out-jobs.json [kMax] [step] [maxRange]
// ORBITS=1,3,4 only scans those orbits of the list (numbered in the order printed)
import fs from 'fs';
import { closePerpMS, stepInLam } from '../src/shooting.js';
import { relativeStability } from '../src/relative.js';

const [outFile, kArg, stepArg, rangeArg] = process.argv.slice(2);
const kMax = Number(kArg) || 20, step = Number(stepArg) || 0.004, maxRange = Number(rangeArg) || 0.2;
const stable = [];
const seen = new Set();
for (const f of ['stability-perp-3.json', 'stability-arc.json']) {
  for (const o of JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'))) {
    const key = o.ts.toFixed(3);
    if (o.stable && !seen.has(key)) { seen.add(key); stable.push(o); }
  }
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const fracs = [];
for (let k = 2; k <= kMax; k++) for (let m = 1; 2 * m < k; m++) if (gcd(m, k) === 1) fracs.push({ m, k, f: m / k });

const jobs = [];
const only = process.env.ORBITS ? process.env.ORBITS.split(',').map(Number) : null;
for (const [oi, o] of stable.entries()) {
  if (only && !only.includes(oi)) continue;
  const start = closePerpMS(o.u1, o.u2, o.lam, o.t, { m: 8, maxMs: 60000 });
  if (!(start.res < 1e-9)) { console.log('orbit', oi, 'did not close'); continue; }
  for (const dir of [1, -1]) {
    let prev = null, s = start;
    while (Math.abs(s.lam - o.lam) < maxRange) {
      let rs;
      try { rs = relativeStability(s.u1, s.u2, s.lam, s.t); } catch (e) { break; }
      if (rs.maxMod > 1 + 1e-5 || !rs.nus.length) { console.log(`orbit ${oi} (T*=${o.ts.toFixed(3)}) dir ${dir}: unstable at lam=${s.lam.toFixed(4)}`); break; }
      const here = { u1: s.u1, u2: s.u2, lam: s.lam, t: s.t, nus: rs.nus.map((n) => Math.abs(n.nu)) };
      if (prev) {
        for (const a of prev.nus) {
          const b = here.nus.reduce((best, v) => (Math.abs(v - a) < Math.abs(best - a) ? v : best), here.nus[0]);
          if (Math.abs(b - a) > 0.06) continue;
          for (const fr of fracs) if ((a - fr.f) * (b - fr.f) < 0) {
            jobs.push({ orbit: oi, ts0: o.ts, k: fr.k, m: fr.m, from: prev, lamA: prev.lam, lamB: here.lam });
          }
        }
      }
      prev = here;
      const nx = stepInLam(s, dir * step, { maxMs: 60000 }).sol;
      if (!(nx.res < 1e-9)) { console.log(`orbit ${oi} dir ${dir}: step failed at lam=${s.lam.toFixed(4)}`); break; }
      s = nx;
    }
  }
  console.log(`orbit ${oi} T*=${o.ts.toFixed(3)} done, ${jobs.filter((j) => j.orbit === oi).length} crossings`);
}
fs.writeFileSync(outFile, JSON.stringify(jobs));
console.log(jobs.length, 'jobs');

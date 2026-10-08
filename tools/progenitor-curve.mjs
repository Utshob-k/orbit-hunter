// the k = 1 BHH orbit family seen through lam: from the stable orbit at lam = 0.86525 move lam in both directions and
// record T*, L* and whether the orbit (as a relative periodic one) is linearly stable.
// node tools/progenitor-curve.mjs [step] [range]
import fs from 'fs';
import { closePerpMS, stepInLam } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';
import { relativeStability } from '../src/relative.js';

const step = Number(process.argv[2]) || 0.005, range = Number(process.argv[3]) || 0.3;
const o = JSON.parse(fs.readFileSync(new URL('../data/stability-perp-3.json', import.meta.url), 'utf8')).find((x) => Math.abs(x.ts - 4.9598) < 0.001);
const start = closePerpMS(o.u1, o.u2, o.lam, o.t, { m: 4, maxMs: 60000 });
const rows = [];
for (const dir of [1, -1]) {
  let s = start;
  while (Math.abs(s.lam - o.lam) < range) {
    const info = perpInfo(s.u1, s.u2, s.lam, s.t);
    if (!info) break;
    let st = null;
    try { st = relativeStability(s.u1, s.u2, s.lam, s.t); } catch (e) { /* skip */ }
    rows.push({ lam: s.lam, ts: info.ts, ls: Math.abs(info.ls), alpha: st?.alpha ?? null, maxMod: st?.maxMod ?? null, stable: st ? st.maxMod <= 1 + 1e-5 : null });
    const nx = stepInLam(s, dir * step, { maxMs: 60000 }).sol;
    if (!(nx.res < 1e-9)) break;
    s = nx;
  }
}
rows.sort((a, b) => a.lam - b.lam);
fs.writeFileSync(new URL('../data/progenitor-curve.json', import.meta.url), JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`lam=${r.lam.toFixed(4)} T*=${r.ts.toFixed(4)} L*=${r.ls.toFixed(4)} ${r.stable === null ? '?' : r.stable ? 'STABLE' : 'unstable'} max|ev|=${r.maxMod?.toFixed(5)}`);

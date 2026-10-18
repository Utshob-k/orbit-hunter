// the 99 satellites of the CPC 2020 (data/cpc-converted.json) against the curves of this repository; rules (tolerances) written before the
// test: docs/rules/rules-cpc-curves.txt. node tools/cpc-rows.mjs the rows are relatively periodic orbits with theta not 0. steps: 1 close
// each row again; 2 T*/k against the traced Henon curve; 3 the rows against the stored satellite curves of R (n = k): HIT 1e-6 in T* and
// 1e-5 rad, NEAR 1e-3 and 0.02 rad; 4 the screen on T*/k against T*_member at nu = p/k; 5 the co-rotation share (src/corotation.js).
import fs from 'fs';
import { fileURLToPath } from 'url';
import { closePerpMS } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';
import { shapes } from '../src/identity.js';
import { shareSame } from '../src/corotation.js';
const D = fileURLToPath(new URL('../data/', import.meta.url)), TWO_PI = 2 * Math.PI;
const cpc = JSON.parse(fs.readFileSync(D + 'cpc-converted.json', 'utf8')), hen = JSON.parse(fs.readFileSync(D + 'henon-family-curve.json', 'utf8')), trace = JSON.parse(fs.readFileSync(D + 'r-family-trace.json', 'utf8')).curve;
const curves = [];
for (const f of fs.readdirSync(D + 'branch-points')) { const d = JSON.parse(fs.readFileSync(D + 'branch-points/' + f, 'utf8')); for (const s of d.satellite || []) if (s.curve && s.curve.length > 1) curves.push({ label: `${f.replace('.json', '')} sense ${s.sense}`, n: d.n, end: s.zero ? 'zero' : s.why, pts: s.curve }); }
// ---- 1. the rows, closed again
const rows = [];
for (const r of cpc) {
  const m = r.mine; let c = null;
  for (const pieces of [16, 32, 64]) { try { const q = closePerpMS(m.u1, m.u2, m.lam, m.t, { m: pieces, maxIter: 60 }); c = q; if (q.res < 1e-9) break; } catch (e) { c = null; } }
  if (!c || !(c.res < 1e-8)) { rows.push({ N: r.N, k: r.k, closed: false }); continue; }
  const i = perpInfo(c.u1, c.u2, c.lam, c.t), sh = shapes({ u1: c.u1, u2: c.u2, lam: c.lam, t: c.t });
  rows.push({ N: r.N, k: r.k, closed: true, u1: c.u1, u2: c.u2, t: c.t, res: c.res, T: i.ts, L: Math.abs(i.ls), turns: i.theta / TWO_PI, lam0: c.lam, lam1: sh[1][0] });
}
console.log(`1. ${rows.filter((r) => r.closed).length} of ${rows.length} rows closed as relatively periodic orbits (multiple shooting, residual below 1e-8); the others: ${rows.filter((r) => !r.closed).map((r) => 'N = ' + r.N).join(', ') || 'none'}`);
// ---- 2. the curve of Henon's family
const segs = hen.segments.map((s) => s.points.map((p) => ({ L: p[0], T: p[1] })));
const atL = (L) => { const out = []; for (const s of segs) for (let i = 0; i < s.length - 1; i++) { const a = s[i], b = s[i + 1]; if ((a.L - L) * (b.L - L) <= 0 && a.L !== b.L) out.push(a.T + ((L - a.L) / (b.L - a.L)) * (b.T - a.T)); } return out; };
const dev = rows.filter((r) => r.closed).map((r) => { const t = r.T / r.k, cs = atL(r.L); return cs.length ? Math.min(...cs.map((c) => Math.abs(c - t) / t)) : null; }).filter((x) => x !== null);
const cnt = (b) => dev.filter((x) => x < b).length;
console.log(`2. T*/k of the rows against the traced curve of Henon's family (L* ${Math.min(...segs.flat().map((p) => p.L)).toFixed(2)} to ${Math.max(...segs.flat().map((p) => p.L)).toFixed(2)}) at the same L*: ${dev.length} rows have a curve at their L*; relative difference below 1e-3: ${cnt(1e-3)}, 1e-2: ${cnt(1e-2)}, 5e-2: ${cnt(5e-2)}, 0.1: ${cnt(0.1)}; largest ${Math.max(...dev).toFixed(3)}`);
// ---- 3. the rows against the satellite curves
let nTest = 0; const cls = {}; const lines = [];
for (const r of rows) {
  if (!r.closed) continue;
  let best = null; const close = [];
  for (const cu of curves) {
    if (cu.n !== r.k) continue;
    for (let j = 0; j < cu.pts.length - 1; j++) {
      const a = cu.pts[j], b = cu.pts[j + 1];
      if ((a.Lstar - r.L) * (b.Lstar - r.L) <= 0 && a.Lstar !== b.Lstar) {
        const f = (r.L - a.Lstar) / (b.Lstar - a.Lstar), T = a.Tstar + f * (b.Tstar - a.Tstar), tu = a.turns + f * (b.turns - a.turns), lam = a.lam + f * (b.lam - a.lam);
        const dT = Math.abs(T - r.T) / r.T, dR = TWO_PI * Math.abs(Math.abs(tu) - Math.abs(r.turns)), dl = Math.min(Math.abs(Math.abs(lam) - Math.abs(r.lam0)), Math.abs(Math.abs(lam) - Math.abs(r.lam1))), rec = { curve: cu.label, end: cu.end, dT, dR, dl, score: dT + dR / 0.02 };
        if (!best || rec.score < best.score) best = rec;
        if (dT <= 1e-3 && dR <= 0.02) close.push(rec);
      }
    }
  }
  let c;
  if (!best) c = 'no stored curve with n = k reaches the L* of the row';
  else if (close.some((h) => h.dT <= 1e-6 && h.dR <= 1e-5 && h.dl <= 1e-4)) c = 'ON THE CURVE';
  else if (close.length) c = 'near, not on the curve';
  else c = 'not on a curve';
  cls[c] = (cls[c] || 0) + 1; if (best) { nTest++; lines.push(`   N = ${r.N} (k ${r.k}, T* ${r.T.toFixed(5)}, L* ${r.L.toFixed(4)}, rotation ${r.turns.toExponential(2)} turns): nearest ${best.curve} (${best.end}): dT*/T* ${best.dT.toExponential(1)}, d rotation ${best.dR.toExponential(1)} rad, d lam ${best.dl.toExponential(1)} => ${c}`); }
}
console.log(`3. the rows against the ${curves.length} stored satellite curves (every sense of every file of data/branch-points): ${JSON.stringify(cls)}`);
console.log(`   rows with a stored curve at their L*: ${nTest}`); for (const l of lines) console.log(l);
// ---- 4. the screen
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6), nuOf = (q, j) => q.nus.map((x) => x[0]).sort((a, b) => a - b)[j];
let excl = 0; const cands = [];
for (const r of rows) {
  if (!r.closed) continue;
  const t = r.T / r.k, cand = [];
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i], b = trace[i + 1]; if (!stable(a) || !stable(b)) continue;
    for (const j of [0, 1]) {
      const na = nuOf(a, j), nb = nuOf(b, j), lo = Math.min(na, nb), hi = Math.max(na, nb);
      for (let p = Math.ceil(r.k * lo - 1e-12); p <= Math.floor(r.k * hi + 1e-12); p++) {
        if (p < 1 || 2 * p > r.k) continue;
        const f = (p / r.k - na) / (nb - na); if (!(f >= 0 && f <= 1)) continue;
        const T = a.Tstar + f * (b.Tstar - a.Tstar), d = Math.abs(T - t) / t;
        if (d <= (p === 1 ? 0.015 : 0.16) && !cand.some((c) => c.p === p && c.j === j)) cand.push({ p, j, T, L: a.Lstar + f * (b.Lstar - a.Lstar), d });
      }
    }
  }
  if (cand.length) cands.push(`   N = ${r.N} (k ${r.k}, T*/k ${t.toFixed(4)}, L* ${r.L.toFixed(3)}): ` + cand.map((c) => `p = ${c.p} ${c.j ? 'upper' : 'lower'}: member T* ${c.T.toFixed(4)}, L* ${c.L.toFixed(3)} (${(100 * c.d).toFixed(2)} %)`).join('; ')); else excl++;
}
console.log(`4. screen (T*/k against T*_member at nu = p/k, 1.5 % for p = 1, 16 % for p >= 2): ${excl} rows have no such member and cannot be points of an R satellite curve of the stored kind; ${cands.length} rows have a candidate:`); for (const c of cands) console.log(c);
// ---- 5. co-rotation
const co = rows.filter((r) => r.closed).map((r) => ({ N: r.N, k: r.k, T: r.T, L: r.L, share: shareSame(r.u1, r.u2, r.lam0, r.t, 8000).share }));
console.log(`5. co-rotation share of the time (1: the binaries revolve in the same direction all the time): ${co.filter((x) => x.share > 0.9).length} rows above 0.9, ${co.filter((x) => x.share >= 0.1 && x.share <= 0.9).length} between 0.1 and 0.9, ${co.filter((x) => x.share < 0.1).length} below 0.1`);
for (const x of co.filter((x) => x.share >= 0.1)) console.log(`   N = ${x.N} (k ${x.k}, T*/k ${(x.T / x.k).toFixed(4)}, L* ${x.L.toFixed(4)}): share ${x.share.toFixed(3)}`);

// for one n: the symmetric states of the end orbit of class I and of the orbit of class C, the syzygy words, T*, L*, and the comparison of both with the
// atlas list and with the CPC rows (data/cpc-converted.json). the atlas list (415 entries with the family and the number of syzygies) is not in this repository:
// give its path with --atlas=file (data/threebodyorbits-equalmass-L-all.json is the default); without it only the first part is printed.
// node tools/iso-end-orbit-check.mjs <refined json of class I> <orbit of class C as json with u1 u2 lam t> <n> [--atlas=file]
import fs from 'fs';
import { dp45Step } from '../src/physics.js';
import { symResidual, perpInitial, perpInfo } from '../src/perp.js';
import { isoSymResidual, isoInitial, isoInfo } from '../src/iso.js';
import { syzygyWord } from '../src/topology.js';
const args = process.argv.slice(2).filter((a) => !a.startsWith('--')), atlasArg = process.argv.find((a) => a.startsWith('--atlas='));
const [isoFile, knownFile, nArg] = args, n = Number(nArg), atlasFile = atlasArg ? atlasArg.slice(8) : 'data/threebodyorbits-equalmass-L-all.json';
function scan(x0, T, resFn, N = 40000) {
  const s = Float64Array.from(x0), states = [Float64Array.from(s)]; let t = 0, h = 1e-3;
  for (let i = 1; i <= N; i++) { const tg = (i * T) / N; while (t < tg - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, tg - t), 1e-13, 1e-14, 0.01); if (dt === 0) break; t += dt; h = hn; } states.push(Float64Array.from(s)); }
  const v = states.map((st) => Math.hypot(...resFn(st))); let best = Infinity, at = 0;
  for (let i = 1; i < N; i++) if (v[i] <= v[i - 1] && v[i] <= v[i + 1] && v[i] < best) { best = v[i]; at = i / N; }
  return { min: best, at };
}
const perm = (x, a, b, c) => { const o = new Float64Array(12); [a, b, c].forEach((k, i) => { o[2 * i] = x[2 * k]; o[2 * i + 1] = x[2 * k + 1]; o[6 + 2 * i] = x[6 + 2 * k]; o[7 + 2 * i] = x[7 + 2 * k]; }); return o; };
function report(label, x0, T) {
  const S = scan(x0, T, symResidual);
  const Sp = [[0, 1, 2], [1, 0, 2], [2, 0, 1]].map(([a, b, c]) => ({ apex: a, ...scan(x0, T, (st) => isoSymResidual(perm(st, a, b, c))) }));
  const word = syzygyWord(x0, T);
  console.log(`${label}: collinear-perpendicular state (S): smallest residual ${S.min.toExponential(2)} at ${S.at.toFixed(4)} T; isosceles state (S'): apex 0 ${Sp[0].min.toExponential(2)} (at ${Sp[0].at.toFixed(4)} T), apex 1 ${Sp[1].min.toExponential(2)}, apex 2 ${Sp[2].min.toExponential(2)}; word ${word && word.word} (root ${word && word.root}, power ${word && word.power})`);
  return { S: S.min, Sp: Math.min(...Sp.map((q) => q.min)), word };
}
const iso = JSON.parse(fs.readFileSync(isoFile, 'utf8')), kn = JSON.parse(fs.readFileSync(knownFile, 'utf8'));
const xi = isoInitial(+iso.p, +iso.w, +iso.h), Ti = 2 * +iso.t, xk = perpInitial(+kn.u1, +kn.u2, +kn.lam), Tk = 2 * +kn.t;
const ii = isoInfo(+iso.p, +iso.w, +iso.h, +iso.t), ik = perpInfo(+kn.u1, +kn.u2, +kn.lam, +kn.t);
console.log(`n = ${n}: iso end orbit T* ${ii.ts.toFixed(10)} L* ${Math.abs(ii.ls).toFixed(10)} (30 digit values: T* ${iso.Tstar}, L* ${iso.Lstar}); known orbit T* ${ik.ts.toFixed(10)} L* ${Math.abs(ik.ls).toFixed(10)}; difference T* ${(Math.abs(ii.ts - ik.ts) / ik.ts).toExponential(2)} relative, L* ${(Math.abs(Math.abs(ii.ls) - Math.abs(ik.ls)) / Math.abs(ik.ls)).toExponential(2)} relative; closest approach iso ${ii.minDist.toFixed(4)}, known ${ik.minDist.toFixed(4)}`);
const ri = report('iso end orbit', xi, Ti), rk = report('known orbit   ', xk, Tk);
const wi = ri.word, syz = wi ? wi.root.length * wi.power : 2 * n;
console.log(`SYMMETRY CLASS (criterion a): iso end orbit isosceles-only: ${ri.Sp < 1e-9 && ri.S > 1e-4}; known orbit collinear-only: ${rk.S < 1e-9 && rk.Sp > 1e-4}; iso orbit also collinear-perpendicular: ${ri.S < 1e-9}; known orbit also isosceles: ${rk.Sp < 1e-9}`);
// atlas (415, with the family bhhsat) and CPC rows, the method of tools/compare-atlas-all.py
if (!fs.existsSync(atlasFile)) { console.log('no atlas list at ' + atlasFile + ', the comparison with the atlas and the CPC rows is skipped'); process.exit(0); }
const atlas = JSON.parse(fs.readFileSync(atlasFile, 'utf8')), cpc = JSON.parse(fs.readFileSync('data/cpc-converted.json', 'utf8'));
function best(T, L, list, getT, getL, getSyz, tol) {
  const out = [];
  for (const a of list) {
    const dL = Math.abs(getL(a) - L) / Math.max(L, 0.02); if (dL > tol) continue;
    for (let k = 1; k <= 12; k++) for (const [who, x, y] of [['atlas = k x mine', getT(a), T * k], ['mine = k x atlas', getT(a) * k, T]]) {
      const dT = Math.abs(x - y) / y; if (dT > tol) continue;
      const sy = getSyz ? (who.startsWith('atlas') ? syz * k === getSyz(a) : syz === getSyz(a) * k) : null;
      out.push({ score: Math.max(dT, dL), key: a.key || 'CPC N=' + a.N, who, k, dT, dL, sy });
    }
  }
  return out.sort((p, q) => p.score - q.score);
}
for (const [name, T, L] of [['iso end orbit', ii.ts, Math.abs(ii.ls)], ['known orbit', ik.ts, Math.abs(ik.ls)]]) {
  const m1 = best(T, L, atlas, (a) => a.Tstar, (a) => a.Lstar, (a) => a.syz, 1e-5).filter((r) => r.sy !== false), m2 = best(T, L, atlas, (a) => a.Tstar, (a) => a.Lstar, (a) => a.syz, 5e-3).filter((r) => r.sy === true);
  const near = atlas.map((a) => ({ key: a.key, fam: a.family, dT: Math.abs(a.Tstar - T) / T, dL: Math.abs(a.Lstar - L) / L, syz: a.syz })).sort((p, q) => Math.max(p.dT, p.dL) - Math.max(q.dT, q.dL)).slice(0, 3);
  const nearL = atlas.map((a) => ({ key: a.key, dT: Math.abs(a.Tstar - T) / T, dL: Math.abs(a.Lstar - L) / L, syz: a.syz })).sort((p, q) => p.dL - q.dL).slice(0, 3);
  const c1 = best(T, L, cpc, (c) => c.ts_theirs, (c) => c.ls_theirs, null, 1e-5), c2 = best(T, L, cpc, (c) => c.ts_theirs, (c) => c.ls_theirs, null, 5e-3);
  console.log(`ATLAS (415 entries) for the ${name}: MATCH (1e-5, same number of syzygies ${syz}): ${m1.length ? m1.slice(0, 2).map((r) => `${r.key} ${r.who} k=${r.k} dT ${r.dT.toExponential(1)} dL ${r.dL.toExponential(1)}`).join('; ') : 'none'}; NEAR (5e-3, syzygies agree): ${m2.length ? m2.slice(0, 2).map((r) => `${r.key} ${r.who} k=${r.k} dT ${r.dT.toExponential(1)} dL ${r.dL.toExponential(1)}`).join('; ') : 'none'}; nearest in (T*, L*) with k = 1: ${near.map((q) => `${q.key} dT ${q.dT.toExponential(1)} dL ${q.dL.toExponential(1)} syz ${q.syz}`).join('; ')}; nearest in L*: ${nearL.map((q) => `${q.key} dL ${q.dL.toExponential(1)} dT ${q.dT.toExponential(1)}`).join('; ')}`);
  console.log(`CPC (99 rows, theta not 0) for the ${name}: within 1e-5: ${c1.length ? c1.slice(0, 2).map((r) => `${r.key} ${r.who} k=${r.k} dT ${r.dT.toExponential(1)} dL ${r.dL.toExponential(1)}`).join('; ') : 'none'}; within 5e-3: ${c2.length ? c2.slice(0, 2).map((r) => `${r.key} ${r.who} k=${r.k} dT ${r.dT.toExponential(1)} dL ${r.dL.toExponential(1)}`).join('; ') : 'none'}`);
}

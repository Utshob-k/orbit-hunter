// compare the regenerated branch point files (data/branch-points-regenerated/<n>-upper.json) with the stored ones (data/branch-points/) and with the 30 digit orbits:
// every number of a new file except the two zeros and the field repeatTolerance must equal the stored one; the new zeros are listed with the old ones.
// node tools/zero-regenerated-compare.mjs [dir=data/branch-points-regenerated/]
import fs from 'fs';
import { fileURLToPath } from 'url';
import { perpInfo } from '../src/perp.js';
const PUB = fileURLToPath(new URL('../data/', import.meta.url));
const dir = process.argv[2] || PUB + 'branch-points-regenerated/';
const ns = [24, 26, 27, 28, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56];
const cands = JSON.parse(fs.readFileSync(PUB + 'satellite-candidates.json', 'utf8')).orbits;
// all numbers of an object, in order, with a path
function flat(o, p = '', out = []) {
  if (typeof o === 'number') out.push([p, o]);
  else if (Array.isArray(o) || (o && typeof o === 'object')) for (const k of Object.keys(o)) flat(o[k], p + '/' + k, out);
  else out.push([p, o]);
  return out;
}
for (const n of ns) {
  const f = dir + n + '-upper.json';
  if (!fs.existsSync(f)) { console.log(`n = ${n}: NO NEW FILE`); continue; }
  const A = JSON.parse(fs.readFileSync(PUB + 'branch-points/' + n + '-upper.json', 'utf8')), B = JSON.parse(fs.readFileSync(f, 'utf8'));
  // 1. everything except the zeros
  const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.repeatTolerance; for (const k of ['satellite', 'control']) for (const s of c[k] || []) { delete s.zero; } return c; };
  const fa = flat(strip(A)), fb = flat(strip(B));
  let diffs = [];
  if (fa.length !== fb.length) diffs.push(`different count of entries ${fa.length} vs ${fb.length}`);
  for (let i = 0; i < Math.min(fa.length, fb.length); i++) {
    if (fa[i][0] !== fb[i][0]) { diffs.push(`path ${fa[i][0]} vs ${fb[i][0]}`); break; }
    if (fa[i][1] !== fb[i][1]) diffs.push(`${fa[i][0]}: ${fa[i][1]} vs ${fb[i][1]}`);
  }
  // zeros
  const zinfo = (X, key) => (X[key] || []).map((s) => (s.zero ? `sense ${s.sense}: turns ${s.zero.turns.toExponential(2)}, T* ${s.zero.Tstar.toFixed(8)}, L* ${s.zero.Lstar.toFixed(8)}` : `sense ${s.sense}: no zero (${s.why})`));
  const orb = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
  const oi = orb ? perpInfo(Number(orb.u1), Number(orb.u2), Number(orb.lam), Number(orb.t)) : null, OT = oi ? oi.ts : NaN, OL = oi ? Math.abs(oi.ls) : NaN;
  console.log(`\nn = ${n}: other differences between the new and the stored file (everything but the zeros and repeatTolerance): ${diffs.length === 0 ? 'NONE' : diffs.length + ' (first: ' + diffs.slice(0, 3).join(' | ') + ')'}; repeatTolerance new ${B.repeatTolerance} stored ${A.repeatTolerance}`);
  console.log('   stored satellite zeros: ' + zinfo(A, 'satellite').join('; '));
  console.log('   NEW    satellite zeros: ' + zinfo(B, 'satellite').join('; '));
  console.log('   stored control zeros:   ' + zinfo(A, 'control').join('; '));
  console.log('   NEW    control zeros:   ' + zinfo(B, 'control').join('; '));
  const za = (A.satellite || []).find((s) => s.zero), zb = (B.satellite || []).find((s) => s.zero);
  console.log(`   zero in the same sense: ${za && zb ? (za.sense === zb.sense ? 'yes (' + za.sense + ')' : 'NO, stored ' + za.sense + ' new ' + zb.sense) : 'n/a'}; stopped flags new: ${(B.satellite || []).map((s) => s.why).join(' / ')}`);
  if (orb && zb) {
    const z = zb.zero, zs = za && za.zero;
    console.log(`   against the 30 digit orbit (T* ${OT.toFixed(8)}, L* ${OL.toFixed(8)}): NEW dT*/T* ${(Math.abs(z.Tstar - OT) / OT).toExponential(2)}, dL*/L* ${(Math.abs(z.Lstar - OL) / OL).toExponential(2)}; start values du1 ${Math.abs(z.u1 - Number(orb.u1)).toExponential(1)} du2 ${Math.abs(z.u2 - Number(orb.u2)).toExponential(1)} dlam ${Math.abs(z.lam - Number(orb.lam)).toExponential(1)} dt ${Math.abs(z.t - Number(orb.t)).toExponential(1)}` + (zs ? `; STORED dT*/T* ${(Math.abs(zs.Tstar - OT) / OT).toExponential(2)}, dL*/L* ${(Math.abs(zs.Lstar - OL) / OL).toExponential(2)}, du1 ${Math.abs(zs.u1 - Number(orb.u1)).toExponential(1)}` : ''));
  } else if (!orb) console.log('   no 30 digit orbit found for this n in satellite-candidates.json');
}

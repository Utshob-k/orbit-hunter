// Tables 1 and 2 of the satellites of R as markdown rows, from the stored data (nothing is computed again except by satellite-sequence.mjs, which this runs).
//   Table 1: n = 5 to 56, class C: T*, L*, the nontrivial multipliers (angles nu1, nu2 in turns for n = 5 to 12 from data/stability-mp/class-c/, tier B; the largest
//            multiplier for n >= 13) and the number of senses of the continuation that reach rotation 0.
//   Table 2: the end orbits of class I, n = 5 to 12: T* and L*, their differences from the orbit of class C of the same n (absolute, relative in brackets), the real
//            pair of multipliers, the angle of the other pair, the closure of the 30 digit orbit.
// node tools/tables.mjs [1|2]     (both by default)
import { perpInfo } from '../src/perp.js';
import { read, classCOrbit, classIRefined, classIStability, sequenceRows } from './orbit-lookup.mjs';

const which = process.argv[2] || 'all';
const fmt = (x) => x.toExponential(2).replace(/^-/, '−');

if (which === 'all' || which === '1') {
  const rows = sequenceRows();
  if (rows.length !== 52) throw new Error('rows ' + rows.length);
  const angles = {};
  for (const n of [5, 6, 7, 8, 9, 10, 11, 12]) {
    const r = read(`stability-mp/class-c/class-c-${n === 8 ? '8s' : n}-B.json`).result.R.mu.map((m) => +m.angle).map((a) => Math.min(a, 1 - a)).sort((a, b) => a - b);
    angles[n] = [r[0], r[2]];
  }
  console.log('| n | T* | L* | ν₁ | ν₂ | largest multiplier (modulus) | senses with θ = 0 |');
  console.log('|---:|---:|---:|---:|---:|---:|:---:|');
  for (const c of rows) {
    const n = +c[0], a = angles[n];
    console.log(`| ${n} | ${c[2]} | ${c[3]} | ${a ? a[0].toFixed(6) : '–'} | ${a ? a[1].toFixed(6) : '–'} | ${a ? '1 (stable)' : c[6]} | ${c[1].replace(' senses', '')} |`);
  }
  if (which === 'all') console.log('');
}

if (which === 'all' || which === '2') {
  console.log('| n | T* | L* | T\\*(I) − T\\*(C) | L\\*(I) − L\\*(C) | real pair μ, 1/μ | elliptic pair ν | closure (30 digits) |');
  console.log('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const n of [5, 6, 7, 8, 9, 10, 11, 12]) {
    const ref = classIRefined(n), mu = classIStability(n).result.R.mu;
    const k = classCOrbit(n), ik = perpInfo(+k.u1, +k.u2, +k.lam, +k.t);
    const hyp = mu.filter((m) => Math.abs(+m.mod_minus_1) > 1e-6).map((m) => +m.re).sort((a, b) => a - b);
    const ell = mu.filter((m) => Math.abs(+m.mod_minus_1) <= 1e-6).map((m) => +m.angle).map((a) => Math.min(a, 1 - a))[0];
    const TC = ik.ts, LC = Math.abs(ik.ls), TI = +ref.Tstar, LI = +ref.Lstar;
    console.log(`| ${n} | ${TI.toFixed(8)} | ${LI.toFixed(8)} | ${fmt(TI - TC)}<br>(${fmt((TI - TC) / TC)}) | ${fmt(LI - LC)}<br>(${fmt((LI - LC) / LC)}) | ${hyp[1].toFixed(6)} / ${hyp[0].toFixed(6)} | ${ell.toFixed(6)} | ${(+ref.closure_full_period).toExponential(1)} |`);
  }
}

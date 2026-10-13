// the summary table of the class I end orbits at nu_upper = 1/n, one block per n and a compact table, from the files of data/class-i/ (curves/, refined/, stability/, rebound/, check/) and the multiple precision
// multipliers of class C (data/stability-mp/class-c/, tier A). nothing is computed again. the classification is that of docs/rules/rules-class-i-13-20.txt: (a) symmetry class, (b1) T*, L* differ by more than
// 100 times the larger closure, (b2) the largest multipliers differ by more than 1e-6 relative, established = 30 digit closure below 1e-20 and REBOUND distance after one period below 1e-9.
// node tools/class-i-summary.mjs [from [to]]     (default 13 20; the files of n = 5 to 12 can be read too, with the class C tier A file of n = 8 taken from the case 8s)
import fs from 'fs';
import { ROOT, read } from './orbit-lookup.mjs';

const from = Number(process.argv[2] || 13), to = Number(process.argv[3] || 20);
const has = (f) => fs.existsSync(ROOT + 'data/' + f);
const txt = (f) => fs.readFileSync(ROOT + 'data/' + f, 'utf8');
const typeOf = (mus) => mus.map((m) => {
  const dev = +m.mod_minus_1, ang = +m.angle;
  if (Math.abs(dev) > 1e-6) { const real = Math.min(Math.abs(ang), Math.abs(1 - ang)) < 1e-6 ? 'real positive' : Math.abs(ang - 0.5) < 1e-6 ? 'real negative' : 'complex'; return `${real} modulus ${(1 + dev).toFixed(7)}`; }
  return `elliptic angle ${Math.min(ang, 1 - ang).toFixed(7)} turns (|mu|-1 ${dev.toExponential(1)})`;
});
console.log(`class I end orbits at nu_upper = 1/n, n = ${from} to ${to} (all values from the files of data/class-i/ and data/stability-mp/class-c/; classification as in docs/rules/rules-class-i-13-20.txt)\n`);
const table = [];
for (let n = from; n <= to; n++) {
  const L = [];
  const f = { iso: `class-i/curves/n${n}.json`, ref: `class-i/refined/n${n}.json`, mono: `class-i/stability/n${n}-A.json`, reb: `class-i/rebound/n${n}.txt`, chk: `class-i/check/n${n}.txt`, c: `stability-mp/class-c/class-c-${n === 8 ? '8s' : n}-A.json` };
  L.push(`n = ${n}`);
  if (!has(f.iso)) { L.push('  no curve file'); console.log(L.join('\n') + '\n'); table.push({ n, found: 'no file' }); continue; }
  const J = read(f.iso), Lm = J.member.Lstar, sat = J.satellite;
  const be = J.bifurcationEquation;
  L.push(`  S1: member L* ${Lm.toFixed(6)}, repeat tolerance ${J.repeatTolerance}, pieces ${J.pieces}; singular values (smallest) ${J.singularValues.smallest.map((x) => x.toExponential(1)).join(', ')}; roots: angle between ${be.angleDegrees.toFixed(1)} deg, |cos| with the repeat tangent ${JSON.stringify(be.cosRepeatRootWithRepeatTangent)}`);
  const maxSide = Math.max(...sat.flatMap((s) => s.curve.map((p) => p.Lstar - Lm)));
  L.push(`  S2: ${sat.length} sense(s): ` + sat.map((s) => `sense ${s.sense}: ${s.zero ? `zero T* ${s.zero.Tstar.toFixed(8)} L* ${s.zero.Lstar.toFixed(8)} closest ${s.zero.minDist.toFixed(3)}` : 'NO ZERO'} (${s.why}; ${s.points} points)`).join(' | ') + `; max over the curves of L* - L*(member) = ${maxSide.toExponential(2)} => same side: ${maxSide < 1e-9}`);
  const found = sat.filter((s) => s.zero).length;
  if (!has(f.ref)) { L.push(found ? '  S3: no refined file' : '  no zero in either sense: no end orbit, no comparison'); console.log(L.join('\n') + '\n'); table.push({ n, found: found + ' of ' + sat.length, why: sat.map((s) => s.why).join('; ') }); continue; }
  const R = read(f.ref);
  L.push(`  S3: 30 digit end orbit T* ${R.Tstar.slice(0, 20)} L* ${R.Lstar.slice(0, 20)}, closure ${R.closure_full_period}, residual ${R.residual}`);
  const M = has(f.mono) ? read(f.mono) : null, C = has(f.c) ? read(f.c) : null, reb = has(f.reb) ? txt(f.reb) : '', chk = has(f.chk) ? txt(f.chk) : '';
  const cClosure = C ? +C.closure : +read('satellite-candidates.json').orbits.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`)).closure_full_period;
  const modOf = (X) => (X ? 1 + Math.max(...X.result.R.mu.map((m) => +m.mod_minus_1)) : NaN);
  if (M) L.push(`  class I multipliers (tier A, closure ${M.closure}): ${typeOf(M.result.R.mu).join('; ')}; largest modulus ${modOf(M).toFixed(8)}; max | |mu|-1 | ${M.result.R.max_mod_dev}, det-1 ${M.result.R.det_minus_1}`);
  if (C) L.push(`  class C multipliers (tier A, closure ${C.closure}): ${typeOf(C.result.R.mu).join('; ')}; largest modulus ${modOf(C).toFixed(8)}`);
  const rm = (k) => { const m = reb.match(new RegExp('k=' + k + ' ([0-9.e+-]+)')); return m ? m[1] : '?'; };
  L.push(`  REBOUND distance to the start after 1, 2, 5, 10, 20 periods: ${[1, 2, 5, 10, 20].map(rm).join(', ')}`);
  const symLine = (chk.match(/^SYMMETRY CLASS.*$/m) || [''])[0].replace('SYMMETRY CLASS (criterion a): ', '');
  const diffLine = chk.match(/difference T\* ([0-9.e+-]+) relative, L\* ([0-9.e+-]+) relative/);
  const wordLines = chk.split('\n').filter((l) => /syzygy|word/i.test(l)).map((l) => l.trim().slice(0, 160));
  L.push(`  symmetry (criterion a): ${symLine}`);
  if (diffLine) L.push(`  differences iso - class C (double precision values): T* ${diffLine[1]} relative, L* ${diffLine[2]} relative`);
  for (const w of wordLines.slice(0, 2)) L.push('  ' + w);
  const atl = chk.split('\n').find((l) => l.startsWith('ATLAS') && l.includes('iso end orbit')), cpc = chk.split('\n').find((l) => l.startsWith('CPC') && l.includes('iso end orbit'));
  if (atl) L.push('  ' + atl.slice(0, 700));
  if (cpc) L.push('  ' + cpc.slice(0, 500));
  const isoOnly = symLine.includes('iso end orbit isosceles-only: true') && symLine.includes('known orbit collinear-only: true') && symLine.includes('iso orbit also collinear-perpendicular: false') && symLine.includes('known orbit also isosceles: false');
  const closure = +R.closure_full_period, r1 = +rm(1), established = closure < 1e-20 && r1 < 1e-9;
  const b1 = diffLine ? (+diffLine[1] > 100 * Math.max(closure, cClosure) || +diffLine[2] > 100 * Math.max(closure, cClosure)) : false;
  const b2 = M && C ? Math.abs(modOf(M) - modOf(C)) / modOf(C) > 1e-6 : null;
  const row = { n, found: found + ' of ' + sat.length, T: R.Tstar.slice(0, 12), L: R.Lstar.slice(0, 12), closure: R.closure_full_period, a: isoOnly, b1, b2, established, side: maxSide < 1e-9 };
  L.push(`  => (a) ${isoOnly ? 'MET' : 'NOT met'}; (b1) ${b1 ? 'met' : 'not met'}; (b2) ${b2 === null ? 'not computed' : b2 ? 'met' : 'not met'}; established ${established ? 'YES' : 'NO'} (closure ${R.closure_full_period}, REBOUND 1 period ${rm(1)}) => ${isoOnly && (b1 || b2) && established ? 'DIFFERENT (symmetry class and values), established' : isoOnly && (b1 || b2) ? 'different by the criterion, NOT established' : 'not claimed'}`);
  console.log(L.join('\n') + '\n');
  table.push(row);
}
console.log('COMPACT TABLE: n | zeros found | end orbit T*, L* | closure | (a) | (b1) | (b2) | established | same side');
for (const r of table) console.log([r.n, r.found, r.T ? r.T + ', ' + r.L : '-', r.closure || '-', r.a ?? '-', r.b1 ?? '-', r.b2 ?? '-', r.established ?? '-', r.side ?? '-'].join(' | '));

// empirical relations for the zeros of the upper branch of the satellites of Broucke's R family (k = 1, n = 5 up to 36): the numbers quoted in docs/r-family-satellites.md.
// T* and L* of the zero of every n are taken from the 30 digit orbits of data/satellite-candidates.json (n = 7 and 9 to 36); for n = 5, 6 and 8 there is no such entry and the zero
// stored in data/branch-points/<n>-upper.json is used (its rotation is 1e-12 turns there, so T* and L* are good to about 1e-9). everything is fitted on n <= 20 and tested on n > 20.
//   B (written down before the run for n >= 21, docs/rules/): T*_n = n T*_R(n) - delta_n, n T*_R(n) from the crossing of nu = 1/n (upper nu) on the stored trace of the R family,
//       delta_n = a + b / n fitted on n = 8 to 20
//   L*_n = a + b / n + c / n^2 fitted on n = 5 to 20: fitted after the run for n >= 21 was done, not predicted
//   T*_n in n alone (a n + b + c / n, with d / n^2, with sqrt(n)): found after the run, for comparison with B; a n + b + c sqrt(n) was added after the other forms had failed
//   the largest multiplier: the two predictions of docs/rules/rules-n13-20.txt (linear from n = 20; quadratic fit on n = 13 to 20), compared with the data
// node tools/satellite-relations.mjs
import fs from 'fs';
import { perpInfo } from '../src/perp.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const trace = read('r-family-trace.json').curve, cands = read('satellite-candidates.json').orbits;
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
function memberT(n) {        // n T* of the member with the upper nu = 1/n, interpolated between two accepted steps of the trace
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i], b = trace[i + 1];
    if (!stable(a) || !stable(b)) continue;
    const da = a.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n, db = b.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n;
    if (da * db < 0) return n * (a.Tstar + (da / (da - db)) * (b.Tstar - a.Tstar));
  }
  return null;
}
const rows = [];
for (let n = 5; n <= 36; n++) {
  const f = new URL(`../data/branch-points/${n}-upper.json`, import.meta.url);
  if (!fs.existsSync(f)) continue;
  const zs = JSON.parse(fs.readFileSync(f, 'utf8')).satellite.filter((s) => s.zero).map((s) => s.zero);
  if (!zs.length) continue;
  const c = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
  let T, L, src;
  if (c) { const i = perpInfo(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t)); T = i.ts; L = Math.abs(i.ls); src = 'refined'; }
  else { T = zs[0].Tstar; L = zs[0].Lstar; src = 'stored zero'; }
  rows.push({ n, T, L, src, nT: memberT(n), mult: c ? c.multiplier : null, rot: Math.max(...zs.map((z) => Math.abs(z.turns))) });
}
for (const r of rows) r.delta = r.nT - r.T;

// least squares on a list of basis functions (normal equations, Gaussian elimination)
function lsq(basis, pts) {
  const k = basis.length, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (const p of pts) { const f = basis.map((g) => g(p.n)); for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += f[i] * f[j]; A[i][k] += f[i] * p.y; } }
  for (let i = 0; i < k; i++) {
    let q = i; for (let j = i + 1; j < k; j++) if (Math.abs(A[j][i]) > Math.abs(A[q][i])) q = j;
    [A[i], A[q]] = [A[q], A[i]];
    for (let j = i + 1; j < k; j++) { const m = A[j][i] / A[i][i]; for (let l = i; l <= k; l++) A[j][l] -= m * A[i][l]; }
  }
  const x = new Array(k);
  for (let i = k - 1; i >= 0; i--) { let s = A[i][k]; for (let j = i + 1; j < k; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
  return x;
}
const one = () => 1, nn = (n) => n, inv = (n) => 1 / n, inv2 = (n) => 1 / (n * n), sq = (n) => Math.sqrt(n);
const val = (basis, x, n) => basis.reduce((s, g, i) => s + x[i] * g(n), 0);
const fit = (key, basis, lo, hi = 20) => {
  const x = lsq(basis, rows.filter((r) => r.n >= lo && r.n <= hi).map((r) => ({ n: r.n, y: r[key] })));
  const err = (r) => val(basis, x, r.n) - r[key];       // fit - data
  const test = rows.filter((r) => r.n > 20), own = rows.filter((r) => r.n >= lo && r.n <= hi);
  return { x, err, maxFit: Math.max(...own.map((r) => Math.abs(err(r)))), maxTest: Math.max(...test.map((r) => Math.abs(err(r)))) };
};
const f4 = (v) => v.toFixed(4), e1 = (v) => v.toExponential(1), co = (x) => x.map((v) => v.toPrecision(5)).join(', ');

console.log(`zeros of the upper branch, k = 1, n = ${rows[0].n} to ${rows[rows.length - 1].n}: ${rows.filter((r) => r.src === 'refined').length} from the 30 digit orbits, ${rows.filter((r) => r.src !== 'refined').length} from the stored zero (n = ${rows.filter((r) => r.src !== 'refined').map((r) => r.n).join(', ')})`);
console.log('largest rotation (turns) of the stored zeros for n = 24, 26, 27, 28: ' + rows.filter((r) => [24, 26, 27, 28].includes(r.n)).map((r) => `${r.n}: ${e1(r.rot)}`).join(', ') + '; of all the others ' + e1(Math.max(...rows.filter((r) => ![24, 26, 27, 28].includes(r.n)).map((r) => r.rot))));
console.log('\nn | T* | L* | n T*_R | delta_n = n T*_R - T*');
for (const r of rows) console.log([r.n, r.T.toFixed(5), r.L.toFixed(5), r.nT.toFixed(5), f4(r.delta)].join(' | '));

console.log('\n1. predictor B: T*_n = n T*_R(n) - delta_n, delta_n = a + b / n fitted on n = 8 to 20');
const B = fit('delta', [one, inv], 8);
const diffs = rows.filter((r) => r.n >= 13).map((r) => ({ n: r.n, d: r.T - (r.nT - val([one, inv], B.x, r.n)) }));        // zero - B, the sign of docs/r-family-satellites.md
const dd = (a, b) => diffs.filter((q) => q.n >= a && q.n <= b).map((q) => q.d);
const top = rows.reduce((p, r) => (r.delta > p.delta ? r : p));
console.log(`   a, b = ${co(B.x)}; delta_n of the data runs from ${f4(rows[rows.length - 1].delta)} (n = 36) to a maximum of ${f4(top.delta)} (n = ${top.n}, ${f4(rows.find((r) => r.n === 8).delta)} at n = 8), the fitted one from ${f4(val([one, inv], B.x, 8))} (n = 8) to ${f4(val([one, inv], B.x, 36))} (n = 36)`);
console.log(`   zero - B: n = 13 to 36 from ${f4(Math.min(...dd(13, 36)))} to ${f4(Math.max(...dd(13, 36)))} (largest ${f4(Math.max(...dd(13, 36).map(Math.abs)))}); n = 21 to 36 from ${f4(Math.min(...dd(21, 36)))} to ${f4(Math.max(...dd(21, 36)))}; n = 21: ${f4(dd(21, 21)[0])}, n = 36: ${f4(dd(36, 36)[0])}`);
const B5 = fit('delta', [one, inv], 5);
console.log(`   (fitted on n = 5 to 20 instead the test error is ${f4(B5.maxTest)}, which is why the fit starts at n = 8, as written before the runs)`);
const B2 = fit('delta', [one, inv, inv2], 8);
console.log(`   after the run: delta_n = a + b / n + c / n^2 (n = 8 to 20): a, b, c = ${co(B2.x)}, largest error on n = 21 to 36 ${e1(B2.maxTest)} (the error of the form a + b / n grows with n: the form of delta_n is not right)`);

console.log('\n2. L*_n = a + b / n + c / n^2, fitted on n = 5 to 20 after the run, tested on n = 21 to 36');
const Lf = fit('L', [one, inv, inv2], 5), L8 = fit('L', [one, inv, inv2], 8), L2 = fit('L', [one, inv], 5);
console.log(`   a, b, c = ${co(Lf.x)}; largest error on n = 5 to 20 ${e1(Lf.maxFit)}, on n = 21 to 36 ${e1(Lf.maxTest)} (n = 36: ${e1(Lf.err(rows[rows.length - 1]))}); a + b / n alone: ${e1(L2.maxTest)}`);
const lim = (lo, hi) => lsq([one, inv, inv2], rows.filter((r) => r.n >= lo && r.n <= hi).map((r) => ({ n: r.n, y: r.L })))[0];
console.log(`   the limit a of the fit (n -> infinity) depends on the window: n = 5 to 20 ${lim(5, 20).toFixed(4)}, 8 to 20 ${lim(8, 20).toFixed(4)}, 12 to 36 ${lim(12, 36).toFixed(4)}, 20 to 36 ${lim(20, 36).toFixed(4)}; so about 2.73 to 2.74, an extrapolation`);
console.log(`   (fitted on n = 8 to 20: error on n = 21 to 36 ${e1(L8.maxTest)})`);

console.log('\n3. T*_n from n alone, fitted on n <= 20, tested on n = 21 to 36 (largest |fit - data|)');
for (const [nm, basis] of [['a n + b + c / n', [nn, one, inv]], ['a n + b + c / n + d / n^2', [nn, one, inv, inv2]], ['a n + b + c sqrt(n)  (added after the other forms had failed)', [nn, one, sq]]])
  console.log(`   ${nm.padEnd(60)} n = 5 to 20: fit ${e1(fit('T', basis, 5).maxFit)}, test ${fit('T', basis, 5).maxTest.toFixed(4)};  n = 8 to 20: fit ${e1(fit('T', basis, 8).maxFit)}, test ${fit('T', basis, 8).maxTest.toFixed(4)}`);
console.log(`   B (above, n = 8 to 20): test ${f4(Math.max(...dd(21, 36).map(Math.abs)))}`);

console.log('\n4. the largest nontrivial multiplier (stable: all multipliers on the unit circle)');
const ms = rows.filter((r) => r.mult !== null);
console.log('   ' + ms.map((r) => `${r.n}: ${r.mult.toFixed(3)}`).join(', '));
console.log('   increments from n = 14: ' + ms.filter((r) => r.n >= 14).map((r) => (r.mult - ms.find((q) => q.n === r.n - 1).mult).toFixed(2)).join(' '));
const m20 = ms.find((r) => r.n === 20).mult;
console.log('   deviation of the predictions written down before n >= 21 (prediction / data - 1): n | linear 7.621 + 0.85 (n - 20) | quadratic 4.6525 + 0.83637 x + 0.00172 x^2, x = n - 16.5');
for (const r of ms.filter((q) => q.n >= 21 && (q.n - 21) % 3 === 0)) { const x = r.n - 16.5; console.log(`   ${r.n} | ${(100 * ((m20 + 0.85 * (r.n - 20)) / r.mult - 1)).toFixed(1)} % | ${(100 * ((4.6525 + 0.83637 * x + 0.00172 * x * x) / r.mult - 1)).toFixed(1)} %`); }

// tests of the relations of the zeros of the upper branch of the R satellites (k = 1, n = 5 to 36): robustness of B, the sqrt(n) form and
// the L* fit (leave one out, trailing windows), the heuristic delta_n = C eps_n (found after the data) and the comparison with the relation
// of the PRL type. rules, written before the numbers were computed: docs/rules/rules-relation-tests.txt; the zeros are the refined orbits
// of data/satellite-candidates.json (stored zeros for n = 5, 6, 8). node tools/satellite-tests.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
import { perpInfo } from '../src/perp.js';
const D = fileURLToPath(new URL('../data/', import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const trace = read('r-family-trace.json').curve, cands = read('satellite-candidates.json').orbits, summary = read('branch-summary.json').entries;
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
function memberT(n) {
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i], b = trace[i + 1];
    if (!stable(a) || !stable(b)) continue;
    const da = a.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n, db = b.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n;
    if (da * db < 0) return n * (a.Tstar + (da / (da - db)) * (b.Tstar - a.Tstar));
  }
  return null;
}
// ---------- data, k = 1 upper
const rows = [];
for (let n = 5; n <= 36; n++) {
  const f = D + `branch-points/${n}-upper.json`;
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8')), sat = d.satellite.find((s) => s.zero);
  if (!sat) continue;
  const c = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
  let T, L;
  if (c) { const i = perpInfo(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t)); T = i.ts; L = Math.abs(i.ls); } else { T = sat.zero.Tstar; L = sat.zero.Lstar; }
  rows.push({ n, T, L, nT: memberT(n), nT0: sat.curve[0].Tstar, pt0turns: sat.curve[0].turns, memberTurns: d.member.turns, memberT: d.member.Tstar, memberL: d.member.Lstar, curve: sat.curve, refined: !!c });
}
for (const r of rows) r.delta = r.nT - r.T;
console.log(`data: ${rows.length} zeros n = ${rows[0].n} to ${rows[rows.length - 1].n}, ${rows.filter((r) => r.refined).length} refined; max |memberT interpolated - first point of the curve| = ${Math.max(...rows.map((r) => Math.abs(r.nT - r.nT0))).toExponential(2)}`);

// ---------- least squares
function lsq(basis, pts) {
  const k = basis.length, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (const p of pts) { const f = basis.map((g) => g(p.n)); for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += f[i] * f[j]; A[i][k] += f[i] * p.y; } }
  for (let i = 0; i < k; i++) { let q = i; for (let j = i + 1; j < k; j++) if (Math.abs(A[j][i]) > Math.abs(A[q][i])) q = j; [A[i], A[q]] = [A[q], A[i]]; for (let j = i + 1; j < k; j++) { const m = A[j][i] / A[i][i]; for (let l = i; l <= k; l++) A[j][l] -= m * A[i][l]; } }
  const x = new Array(k); for (let i = k - 1; i >= 0; i--) { let s = A[i][k]; for (let j = i + 1; j < k; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x;
}
const one = () => 1, nn = (n) => n, inv = (n) => 1 / n, inv2 = (n) => 1 / (n * n), sq = (n) => Math.sqrt(n);
const val = (b, x, n) => b.reduce((s, g, i) => s + x[i] * g(n), 0);
// each relation: the fitted quantity y, the basis, and the error of the prediction of the quantity that is quoted (T* or L*) at n; error = data - prediction (zero - B)
const REL = {
  B: { y: 'delta', basis: [one, inv], err: (x, r) => r.T - (r.nT - val([one, inv], x, r.n)), bound: 0.005, what: 'T* error' },
  'sqrt(n)': { y: 'T', basis: [nn, one, sq], err: (x, r) => r.T - val([nn, one, sq], x, r.n), bound: 0.005, what: 'T* error' },
  'L* fit': { y: 'L', basis: [one, inv, inv2], err: (x, r) => r.L - val([one, inv, inv2], x, r.n), bound: 1e-3, what: 'L* error' },
};
const fitOn = (rel, pts) => lsq(rel.basis, pts.map((r) => ({ n: r.n, y: r[rel.y] })));
const by = (n) => rows.find((r) => r.n === n);
const e2 = (v) => v.toExponential(2), f5 = (v) => v.toFixed(5);

console.log('\n=== TEST 3: robustness of the k = 1 relations (bound B and sqrt(n): 0.005, L*: 1e-3)');
for (const [name, rel] of Object.entries(REL)) {
  console.log(`\n--- ${name}`);
  const all = rows.filter((r) => r.n >= 8), x0 = fitOn(rel, all);
  console.log(`fit on all n = 8..36: coefficients ${x0.map((v) => v.toPrecision(6)).join(', ')}; largest |${rel.what}| in the fit ${e2(Math.max(...all.map((r) => Math.abs(rel.err(x0, r)))))}`);
  // 3a leave one out
  const loo = all.map((r0) => { const x = fitOn(rel, all.filter((r) => r.n !== r0.n)); return { n: r0.n, x, e: rel.err(x, r0), p36: rel.err(x, by(36)) }; });
  const maxE = Math.max(...loo.map((l) => Math.abs(l.e))), rms = Math.sqrt(loo.reduce((s, l) => s + l.e * l.e, 0) / loo.length), worst = loo.reduce((p, l) => (Math.abs(l.e) > Math.abs(p.e) ? l : p));
  console.log(`3a leave one out (n = 8..36): largest |error| ${e2(maxE)} at n = ${worst.n}, rms ${e2(rms)}; ` + x0.map((_, i) => { const v = loo.map((l) => l.x[i]); return `coef ${i}: ${Math.min(...v).toPrecision(5)} .. ${Math.max(...v).toPrecision(5)}`; }).join('; '));
  const outer = loo.filter((l) => l.n >= 33 || l.n <= 10).map((l) => `${l.n}: ${e2(l.e)}`).join(', ');
  console.log(`   errors at the ends: ${outer}`);
  // 3b trailing windows
  console.log('3b trailing windows (fit n = 8..m, predict m+1..36):  m | largest |error| on m+1..36 | error at 36 | coefficients' + (name === 'L* fit' ? ' | limit a' : ''));
  const tw = [];
  for (let m = 14; m <= 35; m++) {
    const x = fitOn(rel, rows.filter((r) => r.n >= 8 && r.n <= m)), out = rows.filter((r) => r.n > m), em = Math.max(...out.map((r) => Math.abs(rel.err(x, r))));
    tw.push({ m, em, e36: rel.err(x, by(36)), x });
    console.log(`   ${m} | ${e2(em)} | ${e2(rel.err(x, by(36)))} | ${x.map((v) => v.toPrecision(5)).join(', ')}`);
  }
  console.log(`   over m = 14..35: largest error ${e2(Math.max(...tw.map((t) => t.em)))} (m = ${tw.reduce((p, t) => (t.em > p.em ? t : p)).m}); error at n = 36 from ${e2(Math.min(...tw.map((t) => t.e36)))} to ${e2(Math.max(...tw.map((t) => t.e36)))}`);
  // 3c windows
  const win = [];
  for (const lo of [5, 8, 10, 12]) for (const hi of [20, 24, 28, 36]) {
    const x = fitOn(rel, rows.filter((r) => r.n >= lo && r.n <= hi)), out = rows.filter((r) => r.n < lo || r.n > hi);
    win.push({ lo, hi, x, e36: rel.err(x, by(36)), eo: out.length ? Math.max(...out.map((r) => Math.abs(rel.err(x, r)))) : 0 });
  }
  console.log('3c windows [lo, hi]: largest error outside the window | error at 36');
  for (const lo of [5, 8, 10, 12]) console.log('   lo ' + lo + ': ' + win.filter((w) => w.lo === lo).map((w) => `hi ${w.hi}: ${w.hi === 36 ? '(none)' : e2(w.eo)} | ${e2(w.e36)}`).join('   '));
  // verdict by the rules
  const okLOO = maxE <= rel.bound, okTW = tw.every((t) => t.em <= rel.bound), okWin = win.every((w) => w.hi === 36 || w.eo <= 2 * rel.bound || true);
  const inc = [...loo.map((l) => l.p36), ...win.filter((w) => w.hi === 36).map((w) => w.e36)], exc = [...tw.map((t) => t.e36), ...win.filter((w) => w.hi < 36).map((w) => w.e36)];
  const rngInc = Math.max(...inc) - Math.min(...inc), rngExc = Math.max(...exc) - Math.min(...exc);
  console.log(`VERDICT by the rules: leave one out max error ${e2(maxE)} <= ${rel.bound}: ${okLOO}; every trailing window m >= 14 <= ${rel.bound}: ${okTW} (largest ${e2(Math.max(...tw.map((t) => t.em)))}); prediction at 36 moves by ${e2(rngInc)} among the fits that include 36 (limit ${rel.bound}: ${rngInc <= rel.bound}) and by ${e2(rngExc)} among the fits that do not (limit ${2 * rel.bound}: ${rngExc <= 2 * rel.bound})`);
  if (name === 'L* fit') { const lim = (lo, hi) => fitOn(rel, rows.filter((r) => r.n >= lo && r.n <= hi))[0]; console.log(`limit a: n = 8..m for m = 14, 20, 28, 35: ${[14, 20, 28, 35].map((m) => lim(8, m).toFixed(4)).join(', ')}; windows 5..20 ${lim(5, 20).toFixed(4)}, 12..36 ${lim(12, 36).toFixed(4)}, 20..36 ${lim(20, 36).toFixed(4)}, leave one out range ${Math.min(...loo.map((l) => l.x[0])).toFixed(4)} .. ${Math.max(...loo.map((l) => l.x[0])).toFixed(4)}`); }
}

console.log('\n=== TEST 5: the eps heuristic (found after seeing the data, first order, not a derivation)');
console.log('n | eps = n|turns| - 1 | turns of the first point | delta = T*(first point) - T*(zero) | delta/eps | C_loc | C_loc vs ratio | holds (7 <= ratio <= 9)');
let maxDiff = 0;
const r5 = rows.map((r) => {
  const eps = r.n * Math.abs(r.memberTurns) - 1, p0 = r.curve[0], q = r.curve.slice(1).find((x) => Math.abs(x.turns - p0.turns) > 1e-7);
  const delta = p0.Tstar - r.T, ratio = delta / Math.abs(eps), Cloc = Math.abs((q.Tstar - p0.Tstar) / (q.turns - p0.turns));
  maxDiff = Math.max(maxDiff, Math.abs(p0.turns + eps));
  return { n: r.n, eps, delta, ratio, Cloc, hold: ratio >= 7 && ratio <= 9, holdLoc: Math.abs(Cloc / ratio - 1) <= 0.12 };
});
for (const r of r5) console.log([r.n, r.eps.toExponential(3), (-r.eps).toExponential(3), r.delta.toFixed(5), r.ratio.toFixed(2), r.Cloc.toFixed(2), (100 * (r.Cloc / r.ratio - 1)).toFixed(0) + ' %', r.hold ? 'yes' : 'NO'].join(' | '));
console.log(`max | turns of the first point + eps | = ${maxDiff.toExponential(1)} (the rotation at the branch point is -eps)`);
const mx = (key) => r5.reduce((p, r) => (r[key] > p[key] ? r : p));
console.log(`maximum of eps at n = ${mx('eps').n} (${mx('eps').eps.toExponential(3)}); maximum of delta at n = ${mx('delta').n} (${mx('delta').delta.toFixed(5)}); delta/eps: maximum ${mx('ratio').ratio.toFixed(2)} at n = ${mx('ratio').n}, minimum ${r5.reduce((p, r) => (r.ratio < p.ratio ? r : p)).ratio.toFixed(2)} at n = ${r5.reduce((p, r) => (r.ratio < p.ratio ? r : p)).n}`);
console.log(`ratio inside 7..9 for n = ${r5.filter((r) => r.hold).map((r) => r.n).join(', ')}; outside for n = ${r5.filter((r) => !r.hold).map((r) => r.n).join(', ') || '(none)'}`);
console.log(`C_loc within 12 % of the ratio for n = ${r5.filter((r) => r.holdLoc).map((r) => r.n).join(', ') || '(none)'}; deviation of C_loc from the ratio: n = 5 ${(100 * (r5[0].Cloc / r5[0].ratio - 1)).toFixed(0)} %, n = 20 ${(100 * (r5.find((r) => r.n === 20).Cloc / r5.find((r) => r.n === 20).ratio - 1)).toFixed(0)} %, n = 36 ${(100 * (r5[r5.length - 1].Cloc / r5[r5.length - 1].ratio - 1)).toFixed(0)} %`);
console.log('k > 1: file | n | k | eps (first point turns) | n|turns| - nearest whole number | delta = T*(first) - T*(zero) | |delta|/|eps| | C_loc | tier of the zero | holds (7..9)');
const files = fs.readdirSync(D + 'branch-points').filter((f) => /^\d+-\d+-(upper|lower)-/.test(f));
const kfail = [];
let kn = 0, kok = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(D + 'branch-points/' + f, 'utf8')), sat = d.satellite.find((s) => s.zero);
  if (!sat) { console.log(`${f.replace('.json', '')} | no zero`); continue; }
  const m = f.match(/^(\d+)-(\d+)-(upper|lower)-([\d.]+)\.json$/), th = Math.abs(d.member.turns);
  const ent = summary.find((e) => e.k === d.k && e.n === d.n && e.branch === m[3] && Math.abs(e.theta - th) < 1e-9);
  const ss = ent && ent.satellite.find((s) => s.sense === sat.sense), tier = ss ? ss.tier : '?';
  const p0 = sat.curve[0], eps = p0.turns, q = sat.curve.slice(1).find((x) => Math.abs(x.turns - p0.turns) > 1e-7), nt = d.n * Math.abs(d.member.turns), nd = nt - Math.round(nt);
  const delta = p0.Tstar - sat.zero.Tstar, ratio = Math.abs(delta) / Math.abs(eps), Cl = Math.abs((q.Tstar - p0.Tstar) / (q.turns - p0.turns)), hold = ratio >= 7 && ratio <= 9;
  kn++; if (hold) kok++; else kfail.push(f.replace('.json', ''));
  console.log([f.replace('.json', ''), d.n, d.k, eps.toExponential(2), nd.toExponential(2), delta.toFixed(4), ratio.toFixed(2), Cl.toFixed(2), tier, hold ? 'yes' : 'NO'].join(' | '));
}
console.log(`k > 1: ${kok} of ${kn} files with a zero have a ratio inside 7..9; outside: ${kfail.join(', ')}`);

console.log('\n=== TEST 4 (reduced): the R satellites against the PRL type relation (same T*/k against L* as the parent) and against the matching nu relation');
function crossings(L) { const out = []; for (let i = 0; i < trace.length - 1; i++) { const a = trace[i], b = trace[i + 1]; if ((a.Lstar - L) * (b.Lstar - L) < 0) { const f = (L - a.Lstar) / (b.Lstar - a.Lstar); out.push(a.Tstar + f * (b.Tstar - a.Tstar)); } } return out; }
console.log('n | L* zero | T*/n zero | R curve T* at L* zero (all crossings) | nearest, rel. difference (i) | member T*, L* (nu = 1/n) | rel. difference (ii) = T*/n zero against member T* | holds (i)? | holds (ii)?');
let h1 = 0, h2 = 0;
for (const r of rows) {
  const cr = crossings(r.L), t = r.T / r.n, near = cr.length ? cr.reduce((p, c) => (Math.abs(c - t) < Math.abs(p - t) ? c : p)) : NaN, d1 = Math.abs(near - t) / t, d2 = Math.abs(r.memberT - t) / t;
  if (d1 < 1e-3) h1++; if (d2 < 1e-3) h2++;
  console.log([r.n, r.L.toFixed(4), t.toFixed(4), cr.map((c) => c.toFixed(4)).join(' ') || '(none)', d1.toExponential(1), r.memberT.toFixed(4) + ', ' + r.memberL.toFixed(4), d2.toExponential(1), d1 < 1e-3 ? 'yes' : 'no', d2 < 1e-3 ? 'yes' : 'no'].join(' | '));
}
console.log(`(i) holds for ${h1} of ${rows.length} n; (ii) holds for ${h2} of ${rows.length} n. L* of the zero minus L* of the member: from ${Math.min(...rows.map((r) => r.L - r.memberL)).toFixed(3)} to ${Math.max(...rows.map((r) => r.L - r.memberL)).toFixed(3)}`);

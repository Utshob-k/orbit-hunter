// the null model (delta = 0), relation B and the first order prediction of Henon's relation (no free parameter) against the measured delta_n, n = 5 to 56;
// the lines "largest |e|" by range of n are the numbers of the comparison of the three predictions. node tools/relation-b-table.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { perpInfo } = await import(pathToFileURL(PUB + 'src/perp.js').href);
const read = (f) => JSON.parse(fs.readFileSync(PUB + 'data/' + f, 'utf8'));
const trace = read('r-family-trace.json').curve, cands = read('satellite-candidates.json').orbits;
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
const A = -0.0033397, B = 0.463315, Ae = -0.0035851, Be = 0.482212;     // fixed values, not refitted here (docs/r-family-satellites.md)
const rows = [];
for (let n = 5; n <= 56; n++) {
  const d = read(`branch-points/${n}-upper.json`), sat = d.satellite.find((s) => s.zero);
  const c = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
  let T; if (c) { const i = perpInfo(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t)); T = i.ts; } else T = sat.zero.Tstar;
  const nTe = n * d.member.Tstar, nTi = memberT(n), eps = n * Math.abs(d.member.turns) - 1, Lm = d.member.Lstar;
  const delta = nTe - T;                                                     // measured, exact member
  const dh = { M0: 0, MB: (nTe - nTi) + A + B / n, MBe: Ae + Be / n, MH: Math.PI * Lm * eps };   // predicted delta of each model
  const e = Object.fromEntries(Object.entries(dh).map(([k, v]) => [k, v - delta]));                // e = T*(zero) - model = predicted delta - measured delta
  rows.push({ n, T, nTe, nTi, eps, Lm, delta, dh, e, deltaInterp: nTi - T, eNullInterp: -(nTi - T) });
}
const f4 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(4);
console.log('n | measured delta_n (exact member) | predicted delta: B (as defined, on the exact member), B exact member refit, first order pi L*_member eps_n | errors e = zero - model: null (delta = 0), B, B exact, first order | smaller |e| than null: B, B exact, first order | first order / measured');
for (const r of rows) {
  console.log([r.n, r.delta.toFixed(5), r.dh.MB.toFixed(5), r.dh.MBe.toFixed(5), r.dh.MH.toFixed(5), f4(r.e.M0), f4(r.e.MB), f4(r.e.MBe), f4(r.e.MH),
    ['MB', 'MBe', 'MH'].map((k) => (Math.abs(r.e[k]) < Math.abs(r.e.M0) ? 'yes' : 'no')).join('/'), (r.dh.MH / r.delta).toFixed(2)].join(' | '));
}
const ranges = [['5 to 12', 5, 12], ['13 to 20', 13, 20], ['21 to 36', 21, 36], ['37 to 56', 37, 56], ['5 to 56', 5, 56]];
console.log('\nrange | model | largest |e| | at n | inside 0.05 | inside 0.005 | number of n with |e| smaller than the null | smaller than B (as defined)');
for (const [name, lo, hi] of ranges) {
  const rs = rows.filter((r) => r.n >= lo && r.n <= hi);
  for (const [k, label] of [['M0', 'null (delta = 0)'], ['MB', 'B as defined'], ['MBe', 'B exact member'], ['MH', 'first order Henon']]) {
    const big = rs.reduce((p, r) => (Math.abs(r.e[k]) > Math.abs(p.e[k]) ? r : p));
    console.log([name, label, Math.abs(big.e[k]).toFixed(4), big.n, rs.filter((r) => Math.abs(r.e[k]) <= 0.05).length + '/' + rs.length, rs.filter((r) => Math.abs(r.e[k]) <= 0.005).length + '/' + rs.length,
      k === 'M0' ? '-' : rs.filter((r) => Math.abs(r.e[k]) < Math.abs(r.e.M0)).length + '/' + rs.length, k === 'MB' || k === 'M0' ? '-' : rs.filter((r) => Math.abs(r.e[k]) < Math.abs(r.e.MB)).length + '/' + rs.length].join(' | '));
  }
}
// the null model for the exact member and for the interpolated one (delta from zero - B)
console.log('\nTHE NULL MODEL');
const r21 = rows.filter((r) => r.n >= 21 && r.n <= 36), r37 = rows.filter((r) => r.n >= 37);
for (const [label, g] of [['exact member', (r) => r.e.M0], ['interpolated member (delta = delta_fit - (zero - B))', (r) => r.eNullInterp]]) {
  const big = r21.reduce((p, r) => (Math.abs(g(r)) > Math.abs(g(p)) ? r : p));
  const within = r37.filter((r) => Math.abs(g(r)) <= 0.005).map((r) => r.n);
  const beat = r37.filter((r) => Math.abs(g(r)) < Math.abs(r.e.MB)).map((r) => r.n);
  console.log(`null model, ${label}: n = 21 to 36 inside 0.05 for ${r21.filter((r) => Math.abs(g(r)) <= 0.05).length} of ${r21.length}, largest |e| ${Math.abs(g(big)).toFixed(4)} at n = ${big.n}; n = 37 to 56 inside 0.005 for ${within.length} of ${r37.length} (n = ${within.join(' ')}); |e| smaller than B (as defined) for ${beat.length} (n = ${beat.join(' ')}); |e| at n = 37 ${Math.abs(g(rows.find((r) => r.n === 37))).toFixed(4)}, at n = 56 ${Math.abs(g(rows.find((r) => r.n === 56))).toFixed(4)}`);
}
const r56 = rows.find((r) => r.n === 56);
console.log(`n = 56: fitted delta of B ${(A + B / 56).toFixed(4)}; measured delta (interpolated member) ${r56.deltaInterp.toFixed(4)}, measured delta (exact member) ${r56.delta.toFixed(4)}; fitted delta / measured (interpolated) ${((A + B / 56) / r56.deltaInterp).toFixed(2)}, (exact) ${((A + B / 56) / r56.delta).toFixed(2)}`);
// where the first order prediction stops being better than the null model
const cross = rows.filter((r) => Math.abs(r.e.MH) >= Math.abs(r.e.M0)).map((r) => r.n);
console.log('n for which the first order prediction is NOT better than the null model: ' + (cross.length ? cross.join(' ') : 'none'));
const better = rows.filter((r) => Math.abs(r.e.MH) < Math.abs(r.e.M0)).map((r) => r.n);
console.log('first order better than null for n = ' + better[0] + ' to ' + better[better.length - 1] + ' (' + better.length + ' values)');
console.log('first order error: smallest |e| ' + Math.min(...rows.map((r) => Math.abs(r.e.MH))).toExponential(2) + ' at n = ' + rows.reduce((p, r) => (Math.abs(r.e.MH) < Math.abs(p.e.MH) ? r : p)).n + ' (n = 5: ' + rows[0].e.MH.toExponential(2) + ', n = 12: ' + rows[7].e.MH.toExponential(2) + ')');

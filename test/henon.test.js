// Henon's relation dT* = -pi L* d(turns) between consecutive points of a stored trace of the family t35 - (data/deep/traces/t35m.json, 1690 points, direction -1 in lam): for the pairs
// with |d(turns)| of 1e-6 or more, L* the mean of |L*| of the pair, the relative deviation |dT* - s| / max(|dT*|, |s|) with s = -pi L* d(turns). PASS if the median is below 1e-6 and the largest
// below 1e-4 and both equal the stored values (median 3.7e-7, largest 3.2e-5 over 155 pairs). takes about a second.
import fs from 'fs';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const trace = JSON.parse(fs.readFileSync(new URL('../data/deep/traces/t35m.json', import.meta.url), 'utf8'));
const P = trace.points, dev = [];
for (let i = 1; i < P.length; i++) {
  const a = P[i - 1], b = P[i], dT = b.Tstar - a.Tstar, dturn = b.turns - a.turns, Lm = (Math.abs(a.Lstar) + Math.abs(b.Lstar)) / 2;
  if (Math.abs(dturn) >= 1e-6) { const s = -Math.PI * Lm * dturn; dev.push(Math.abs(dT - s) / Math.max(Math.abs(dT), Math.abs(s))); }
}
dev.sort((x, y) => x - y);
const median = dev[Math.floor(dev.length / 2)], max = dev[dev.length - 1], st = JSON.parse(fs.readFileSync(new URL('../data/deep/henon-t35m.json', import.meta.url), 'utf8'));
check('number of pairs', dev.length === st.pairs, `pairs=${dev.length} stored=${st.pairs}`);
check('median deviation below 1e-6', median < 1e-6, `median=${median.toExponential(2)}`);
check('largest deviation below 1e-4', max < 1e-4, `largest=${max.toExponential(2)}`);
check('both equal the stored values', Math.abs(median - st.median_deviation) <= 1e-9 * st.median_deviation && Math.abs(max - st.max_deviation) <= 1e-9 * st.max_deviation, `stored median=${st.median_deviation.toExponential(2)} largest=${st.max_deviation.toExponential(2)}`);
console.log(`time ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);

// the regularised integrator of src/ias/reg.js against the exact Kepler flow of the pair (tools/kepler-ref.py): seven rows of the stored gate (a 1P and a 10P ellipse, near-radial passages
// down to periapsis distance 1e-8, one with the pair at barycentric distance 1), from data/deep/gate-a-subset.json. The exact end state is stored as a double-double (ref_hi + ref_lo), so the
// error |end - exact| / max(1, |exact|) is computed to full accuracy in doubles. PASS if the error is within the limit max(floor, 10 eps S) and within a factor 10 of the stored error.
// on the machine of the stored run the end state is also equal to the stored one. takes a few seconds.
import fs from 'fs';
import { flowChain } from '../src/ias/reg.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t00 = Date.now();
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const gate = JSON.parse(fs.readFileSync(new URL('../data/deep/gate-a-subset.json', import.meta.url), 'utf8'));
let identical = 0;
for (const row of gate.rows) {
  const t0 = Date.now();
  const r = flowChain(row.masses, row.start, row.tau, { settings });
  const sec = (Date.now() - t0) / 1000;
  if (!r.ok) { check(`${row.name}: the flow finishes`, false, r.reason); continue; }
  let err = 0;
  for (let k = 0; k < row.ref_hi.length; k++) err = Math.max(err, Math.abs((r.end[k] - row.ref_hi[k]) - row.ref_lo[k]) / Math.max(1, Math.abs(row.ref_hi[k])));
  const limit = Math.max(row.limit_floor, 10 * gate.eps * row.S);
  const same = r.end.every((v, k) => v === row.stored_end[k]);
  if (same) identical++;
  check(`${row.name}: error within the limit and near the stored error`, err <= limit && err <= 10 * row.stored_error + 1e-17, `error=${err.toExponential(2)} limit=${limit.toExponential(2)} stored=${row.stored_error.toExponential(2)} macro=${r.macro} ${sec.toFixed(2)} s`);
}
console.log(`end state equal to the stored one in ${identical} of ${gate.rows.length} rows`);
console.log(`time ${((Date.now() - t00) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);

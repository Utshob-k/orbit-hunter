// the 8 x 8 matrix of src/ias/reg.js for the equal-mass pair against the matrix of the exact Kepler flow (data/deep/extra/kepler-stm.json, made by tools/kepler-stm.py: central differences of the exact flow
// in 60 digits), for the periapsis distances q = 1e-3, 1e-6 and 1e-8, from the apocentre and from a phase 0.3 radians before the pericentre, one period. PASS if the largest difference of the matrix is
// at most 1e-10 max|M| and the end state agrees with the exact one to max(1e-12, 10 * 1.1e-16 * S), S the largest row sum of |M| (the limit of gate A; error = |difference| / max(1, |value|)).
// Stored values on the machine of the run: the matrix 4.3e-11 max|M| at most, the end state 3.9e-12 at most. No Python needed.
import fs from 'fs';
import { flowChain } from '../src/ias/reg.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t00 = Date.now();
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const data = JSON.parse(fs.readFileSync(new URL('../data/deep/extra/kepler-stm.json', import.meta.url), 'utf8'));
for (const row of data.rows) {
  const r = flowChain(row.masses, row.start, row.tau, { jac: true, settings });
  if (!r.ok) { check(`${row.name}: the flow finishes`, false, r.reason); continue; }
  let dM = 0, dE = 0;
  for (let k = 0; k < 64; k++) dM = Math.max(dM, Math.abs(r.M[k] - row.M[k]));
  for (let k = 0; k < 8; k++) dE = Math.max(dE, Math.abs((r.end[k] - row.ref_hi[k]) - row.ref_lo[k]) / Math.max(1, Math.abs(row.ref_hi[k])));
  let S = 0; for (let i = 0; i < 8; i++) { let rs = 0; for (let k = 0; k < 8; k++) rs += Math.abs(row.M[i * 8 + k]); S = Math.max(S, rs); }
  const lim = Math.max(1e-12, 10 * 1.1e-16 * S);
  check(`${row.name}: matrix equals the exact Kepler matrix`, dM <= 1e-10 * row.max_M, `max|M|=${row.max_M.toExponential(2)} difference/max|M|=${(dM / row.max_M).toExponential(2)}`);
  check(`${row.name}: end state equals the exact one`, dE <= lim, `error=${dE.toExponential(2)} limit=${lim.toExponential(2)}`);
}
console.log(`time ${((Date.now() - t00) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);

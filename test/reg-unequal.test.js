// src/ias/reg.js for two UNEQUAL masses (1 and 0.1, G = 1): a pair with a = 1, e = 0.9 of the relative orbit, from the apocentre, one period (data/deep/extra/reg-unequal-mass.json, made by
// tools/gate-a-unequal.py; the exact end state is the Kepler flow of tools/kepler-ref.py with mu = m1 + m2, stored as a double-double). PASS if the error |end - exact| / max(1, |exact|)
// is within the limit max(floor, 10 eps S) as in test/gate-a.test.js, and if the energy and the angular momentum of the end state differ from those of the start by 1e-13 or less (relative).
// No Python needed, takes a second.
import fs from 'fs';
import { flowChain } from '../src/ias/reg.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const row = JSON.parse(fs.readFileSync(new URL('../data/deep/extra/reg-unequal-mass.json', import.meta.url), 'utf8')).rows[0];
const r = flowChain(row.masses, row.start, row.tau, { settings });
check('masses 1 and 0.1: the flow finishes', r.ok, r.reason || '');
if (r.ok) {
  let err = 0;
  for (let k = 0; k < row.ref_hi.length; k++) err = Math.max(err, Math.abs((r.end[k] - row.ref_hi[k]) - row.ref_lo[k]) / Math.max(1, Math.abs(row.ref_hi[k])));
  const limit = Math.max(row.limit_floor, 10 * 1.1e-16 * row.S);
  check('masses 1 and 0.1: end state within the limit of the exact Kepler flow', err <= limit, `error=${err.toExponential(2)} limit=${limit.toExponential(2)} macro=${r.macro}`);
  const m = row.masses, el = (s) => {
    let E = 0, L = 0;
    for (let i = 0; i < 2; i++) { E += 0.5 * m[i] * (s[4 + 2 * i] ** 2 + s[5 + 2 * i] ** 2); L += m[i] * (s[2 * i] * s[5 + 2 * i] - s[2 * i + 1] * s[4 + 2 * i]); }
    return [E - m[0] * m[1] / Math.hypot(s[2] - s[0], s[3] - s[1]), L];
  };
  const a = el(row.start), b = el(r.end), dE = Math.abs(b[0] - a[0]) / Math.abs(a[0]), dL = Math.abs(b[1] - a[1]) / Math.abs(a[1]);
  check('masses 1 and 0.1: energy and angular momentum kept', dE <= 1e-13 && dL <= 1e-13, `dE=${dE.toExponential(1)} dL=${dL.toExponential(1)}`);
}
console.log(`time ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);

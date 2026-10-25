// runs the regularised integrator of src/ias/reg.js on the rows of tools/gate-a-rows.py (or the stored subset) and grades it against the exact Kepler flow:
// error = largest |end - exact| / max(1, |exact|) over the 4N numbers, the exact end state as ref_hi + ref_lo (a double-double), limit = max(limit_floor, 10 * 1.1e-16 * S), r = error / limit.
// zones: PASS r <= 1, MARGINAL r <= 10, HARD FAIL above; a row with limit_not_meaningful is not graded (EXCLUDED). The exit status is 1 if a row is a HARD FAIL or does not finish.
// node tools/gate-a.mjs [ROWS.json] [--only text] [--stored data/deep/gate-a-all.json]
//   ROWS.json: from python tools/gate-a-rows.py (default data/deep/gate-a-subset.json). --only: rows whose name contains the text. --stored: also print the error of the stored run and
//   whether the end state is the stored one (data/deep/gate-a-all.json holds the 80 rows of the stored run).
import fs from 'fs';
import { fileURLToPath } from 'url';
import { flowChain } from '../src/ias/reg.js';

const pos = []; for (let i = 2; i < process.argv.length; i++) { if (process.argv[i].startsWith('--')) i++; else pos.push(process.argv[i]); }
const opt = (name) => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const rowsFile = pos[0] || fileURLToPath(new URL('../data/deep/gate-a-subset.json', import.meta.url));
const only = opt('--only'), storedFile = opt('--stored');
const data = JSON.parse(fs.readFileSync(rowsFile, 'utf8')), rows = (Array.isArray(data) ? data : data.rows).filter((r) => !only || r.name.includes(only));
const eps = 1.1e-16, settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const stored = storedFile ? Object.fromEntries(JSON.parse(fs.readFileSync(storedFile, 'utf8')).rows.map((r) => [r.name, r])) : {};
const zone = (r) => (r <= 1 ? 'PASS' : r <= 10 ? 'MARGINAL' : 'HARD FAIL');
const count = {}; let bad = 0;
console.log(['row'.padEnd(22), 'error'.padStart(10), 'limit'.padStart(10), 'S'.padStart(10), 'r'.padStart(8), 'zone'.padEnd(9), 'macro'.padStart(6), 'seconds'.padStart(8), storedFile ? 'stored' : ''].join(' '));
const t0 = Date.now();
for (const row of rows) {
  const t1 = Date.now(), r = flowChain(row.masses, row.start, row.tau, { settings }), sec = (Date.now() - t1) / 1000;
  const gate = row.gate || row.name.split('-')[0];
  if (!r.ok) { console.log(row.name.padEnd(22), 'did not finish:', r.reason); bad++; (count[gate] ||= {}).FAILED = ((count[gate] || {}).FAILED || 0) + 1; continue; }
  let err = 0;
  for (let k = 0; k < row.ref_hi.length; k++) err = Math.max(err, Math.abs((r.end[k] - row.ref_hi[k]) - row.ref_lo[k]) / Math.max(1, Math.abs(row.ref_hi[k])));
  const limit = Math.max(row.limit_floor, 10 * eps * row.S), rr = err / limit, z = row.limit_not_meaningful ? 'EXCLUDED' : zone(rr);
  if (z === 'HARD FAIL') bad++;
  (count[gate] ||= {})[z] = ((count[gate] || {})[z] || 0) + 1;
  const s = stored[row.name], note = s ? `${s.error.toExponential(2)} ${r.end.every((v, k) => v === s.end[k]) ? 'identical' : 'differs'}` : '';
  console.log([row.name.padEnd(22), err.toExponential(2).padStart(10), limit.toExponential(2).padStart(10), row.S.toPrecision(4).padStart(10), rr.toPrecision(3).padStart(8), z.padEnd(9), String(r.macro).padStart(6), sec.toFixed(2).padStart(8), note].join(' '));
}
console.log('rows', rows.length, JSON.stringify(count), `time ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(bad ? 1 : 0);

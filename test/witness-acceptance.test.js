// the multiple precision flow used as a witness reproduces the exact Kepler flow of a near-radial pair (periapsis distance q = 1e-8 and 1e-10) to 1e-17:
// tools/witness-acceptance.py runs tools/kepler-check.py and compares with data/deep/witness-acceptance.json. needs python with mpmath, takes about 10 seconds.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

let fail = 0;
const t0 = Date.now();
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const python = settings.ias.python;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-'));
const result = path.join(dir, 'result.json');
const run = spawnSync(python, ['-B', path.join(root, 'tools', 'witness-acceptance.py'), '--q', '1e-8', '1e-10', '--dir', dir, '--out', result], { encoding: 'utf8' });
console.log(run.stdout);
if (run.error || !fs.existsSync(result)) { check('witness acceptance runs', false, String(run.error || run.stderr).slice(0, 200)); process.exit(1); }

const res = JSON.parse(fs.readFileSync(result, 'utf8'));
for (const r of res.rows) {
  check(`q=${r.q}: the flow finishes without a collapse of the step size`, r.status === 'done', `status=${r.status}`);
  const err = Number(r.error_max), stored = Number(r.stored_error_max);
  check(`q=${r.q}: error against the exact Kepler flow below ${res.limit}`, err <= res.limit, `error=${err.toExponential(2)}`);
  check(`q=${r.q}: error within a factor 2 of the stored value`, err >= 0.5 * stored && err <= 2 * stored, `error=${err.toExponential(2)} stored=${stored.toExponential(2)} steps=${r.steps}`);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

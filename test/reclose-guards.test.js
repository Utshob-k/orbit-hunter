// SPDX-License-Identifier: MIT
// the two stops of tools/reclose.py with the real script: a start value t <= 0 (t = -1 and t = 0) stops before any flow with status 't not positive' and exit status 4; --max-first R stops after the evaluation of
// the start values (one iteration) with status 'first residual above limit' and exit status 5 if the largest |r| there is above R; with a large R the same job converges and is the same orbit as its reference
// (an orbit of the family t35 -, lam 0.5879788380024298). needs python with mpmath, takes about 20 s.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const python = settings.ias.python;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-guards-'));
const pt = { u1: -0.025919708924756146, u2: 1.2036381113455779, t: 2.686792141788577 };
const lam = 0.5879788380024298;
let n = 0;
const go = (t, ref, extra = []) => {
  const id = 'job' + n++, job = path.join(dir, id + '.json'), out = path.join(dir, id + '.out.json');
  fs.writeFileSync(job, JSON.stringify({ id, u1: pt.u1, u2: pt.u2, lam, t, ref }));
  const r = spawnSync(python, ['-B', path.join(root, 'tools', 'reclose.py'), job, out, '--minutes', '10', ...extra], { cwd: root, encoding: 'utf8' });
  return { exit: r.status, error: r.error, out: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null };
};
for (const t of [-1, 0]) {
  const r = go(t, null);
  check(`t = ${t}: status 't not positive', exit status 4, no flow`, r.exit === 4 && r.out && r.out.status === 't not positive' && r.out.converged === false && r.out.flows === 0 && r.out.iterations.length === 0, `exit ${r.exit} status ${r.out && r.out.status} flows ${r.out && r.out.flows}`);
}
let r = go(pt.t, pt, ['--max-first', '1e-30']);
check('--max-first 1e-30: status \'first residual above limit\', exit status 5, one iteration', r.exit === 5 && r.out && r.out.status === 'first residual above limit' && r.out.converged === false && r.out.iterations.length === 1 && r.out.residual > 1e-30, `exit ${r.exit} residual ${r.out && r.out.residual}`);
r = go(pt.t, pt, ['--max-first', '1']);
check('--max-first 1: converged, the same orbit as its reference, exit status 0', r.exit === 0 && r.out && r.out.status === 'done' && r.out.converged === true && r.out.same_orbit === true, `exit ${r.exit} residual ${r.out && r.out.residual}`);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

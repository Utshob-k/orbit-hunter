// SPDX-License-Identifier: MIT
// the orbits at steps 9, 10 and 11 of the stored continuation of the family t35 - (the three with the closest approaches 1e-8 to 7e-10, data/deep/reclose-t35m-gap.json) are re-closed at the
// same lam by tools/reclose.py (multiple precision flow, no integrator of src/ in it) and the start values are witnessed by tools/witness.py with the w1b preset. The six jobs run through
// tools/run-queue.py, three at a time. PASS if: the re-closing converged (largest |r| at most 1e-16) and is the same orbit within 1e-9 (the stored differences are 3e-14 and less), the re-closed
// values equal the stored ones to 1e-12, and the witness gives the stored minimum of the pair distance to 1e-4 and a closure below 1e-6. needs python with mpmath, takes about 2 minutes.
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 'reclose-t35m-gap.json'), 'utf8'));
const queue = [];
for (const j of data.jobs) {
  const rcJob = path.join(dir, `rc-${j.step}.json`), wJob = path.join(dir, `w-${j.step}.json`);
  fs.writeFileSync(rcJob, JSON.stringify({ id: `rc-${j.step}`, u1: j.u1, u2: j.u2, lam: j.lam, t: j.t, ref: { u1: j.u1, u2: j.u2, t: j.t } }));
  fs.writeFileSync(wJob, JSON.stringify({ id: `w-${j.step}`, u1: j.u1, u2: j.u2, lam: j.lam, t: j.t }));
  queue.push({ id: `rc-${j.step}`, cmd: ['tools/reclose.py', rcJob, path.join(dir, `rc-${j.step}.out.json`), '--minutes', '30'], out: path.join(dir, `rc-${j.step}.out.json`), limit_min: 30 });
  queue.push({ id: `w-${j.step}`, cmd: ['tools/witness.py', wJob, path.join(dir, `w-${j.step}.out.json`), '--preset', 'w1b', '--minutes', '30'], out: path.join(dir, `w-${j.step}.out.json`), limit_min: 30 });
}
const qf = path.join(dir, 'queue.json');
fs.writeFileSync(qf, JSON.stringify(queue));
const run = spawnSync(python, ['-B', path.join(root, 'tools', 'run-queue.py'), qf, '3'], { cwd: root, encoding: 'utf8' });
if (run.error) { check('the queue runs', false, String(run.error)); process.exit(1); }
console.log(fs.readFileSync(qf + '.log', 'utf8').split('\n').filter((l) => / end /.test(l)).map((l) => l.slice(20)).join('\n'));

const rel = (a, b) => Math.abs(Number(a) - Number(b)) / Math.abs(Number(b));
for (const j of data.jobs) {
  const f = path.join(dir, `rc-${j.step}.out.json`), g = path.join(dir, `w-${j.step}.out.json`);
  const rc = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { status: 'no output' }, w = fs.existsSync(g) ? JSON.parse(fs.readFileSync(g, 'utf8')) : { status: 'no output' };
  check(`step ${j.step}: re-closed at the same lam and the same orbit`, rc.status === 'done' && rc.converged && rc.same_orbit, `residual=${rc.residual} updates=${(rc.iterations || []).length - 1}`);
  const d = Math.max(rel(rc.u1, j.reclosed.u1), rel(rc.u2, j.reclosed.u2), rel(rc.t, j.reclosed.t));
  check(`step ${j.step}: re-closed values equal the stored ones`, d <= 1e-12, `largest relative difference ${d.toExponential(1)}`);
  const m = rel(w.dmin_parabolic, j.witness.dmin_parabolic);
  check(`step ${j.step}: witness minimum of the pair distance equals the stored one`, w.status === 'done' && m <= 1e-4 && w.closure < 1e-6, `minimum=${Number(w.dmin_parabolic).toExponential(4)} stored=${j.witness.dmin_parabolic.toExponential(4)} closure=${Number(w.closure).toExponential(1)}`);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

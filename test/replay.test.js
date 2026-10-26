// a short continuation of the family t35 - with the ias route (tools/family-follow-ias.mjs, 24 pieces, direction -1) from the stored start (data/deep/t35m-replay.json), stopped after 10 recorded points.
// The test compares the path of the continuation, not the recorded points: the accepted steps of the run (the recorded points and the unrecorded steps, sorted by step) with the
// first 31 accepted steps of the stored trace data/deep/traces/t35m.json, the k-th with the k-th, for the first n accepted steps, n = the smaller of 31 and the number of accepted steps of the run, at least 10. The step numbers must be equal at every step compared; lam, u1, u2 and t must agree to a relative
// difference below 1e-9 at every step compared. Which steps are recorded (T* and L* computed) can differ between machines, so a step that is recorded on one side and not on the other
// is listed and is not a failure; a step of the run without values is a failure. The table of the steps is printed on every run, with "bit-identical" if all of them are equal; for the steps
// recorded on both sides the differences of T* and L* are printed as information. needs python with rebound and mpmath, takes about 2 minutes.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ref = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 't35m-replay.json'), 'utf8'));
const stored = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 'traces', 't35m.json'), 'utf8'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-'));
const out = path.join(dir, 'replay.json');
const s = ref.start;
const run = spawnSync(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), out, String(ref.dir), String(s.u1), String(s.u2), String(s.lam), String(s.t), `--pieces=${ref.pieces}`, `--stop-after=${ref.points.length}`, '--minutes=60', '--ias-first-step=legacy'], { cwd: root, encoding: 'utf8' });
console.log(run.stdout.trim());
if (!fs.existsSync(out)) { check('the driver runs', false, String(run.error || run.stderr).slice(0, 300)); process.exit(1); }
const res = JSON.parse(fs.readFileSync(out, 'utf8'));
check('the driver stops after the 10 recorded points', res.points.length === ref.points.length && /stopped after 10/.test(res.why), res.why);

// the accepted steps of both sides, sorted by step
const steps = (points, unrec, last) => [...points.map((p) => ({ ...p, rec: true })), ...unrec.map((u) => ({ ...u, rec: false }))].filter((p) => p.step <= last).sort((a, b) => a.step - b.step);
const refSteps = steps(stored.points, stored.unrecorded, 31);
const runSteps = steps(res.points, res.unrec, Infinity);
const n = Math.min(31, runSteps.length, refSteps.length);
const KEYS = ['lam', 'u1', 'u2', 't'];
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
console.log(`accepted steps of the run ${runSteps.length}, of the stored trace up to step 31: ${refSteps.length}, compared: n = ${n}`);
console.log('k   step run/stored   run        stored     largest relative difference of lam, u1, u2, t   T*, L* (steps recorded on both sides)');
let exact = true, maxRel = 0, missing = 0, stepDiff = 0;
for (let k = 0; k < n; k++) {
  const a = runSteps[k], b = refSteps[k];
  if (a.step !== b.step) stepDiff++;
  if (KEYS.some((key) => typeof a[key] !== 'number')) { missing++; console.log(`${String(k + 1).padStart(2)}  ${a.step}/${b.step}   run step without values (${a.reason})`); continue; }
  let d = 0, same = true;
  for (const key of KEYS) { d = Math.max(d, rel(a[key], b[key])); if (a[key] !== b[key]) same = false; }
  if (!same) exact = false;
  maxRel = Math.max(maxRel, d);
  const info = a.rec && b.rec ? `${rel(a.Tstar, b.Tstar).toExponential(1)}, ${rel(a.Lstar, b.Lstar).toExponential(1)}` : '';
  console.log(`${String(k + 1).padStart(2)}  ${String(a.step).padStart(3)}/${String(b.step).padEnd(3)}        ${(a.rec ? 'recorded' : 'unrecorded').padEnd(10)} ${(b.rec ? 'recorded' : 'unrecorded').padEnd(10)} ${d.toExponential(1)}${same ? '  equal' : ''}   ${info}`);
}
check(`the accepted steps of the run follow the stored path (n = ${n})`, n >= ref.points.length && missing === 0 && stepDiff === 0 && maxRel < 1e-9, stepDiff ? `${stepDiff} step numbers differ` : missing ? `${missing} steps without values` : exact ? 'bit-identical' : `not bit-identical, largest relative difference ${maxRel.toExponential(1)}`);
check('no guard tripped', res.guards.tripsTotal === 0, `trips=${res.guards.tripsTotal} cross-check replaced=${res.guards.replaced}`);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

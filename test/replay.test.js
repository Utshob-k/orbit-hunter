// a short continuation of the family t35 - with the ias route (tools/family-follow-ias.mjs, 24 pieces, direction -1) from the stored start: 31 accepted steps (steps 1 to 31; step 1 is at lam 0.66529, the start is at 0.66535), of which the driver records
// 10 points and lists the other 21 (steps 2, 4 to 22 and 24, where perpInfo gives nothing) as unrecorded. The 10 points must equal the stored points (data/deep/t35m-replay.json) and the
// unrecorded steps must be the stored list. Equality is exact on the machine of the stored run; on another machine floating-point differences are expected, so PASS also if the
// largest relative difference of the recorded numbers is below 1e-9 (the difference is printed). needs python with rebound and mpmath, takes about 2 minutes.
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-'));
const out = path.join(dir, 'replay.json');
const s = ref.start;
const run = spawnSync('node', [path.join(root, 'tools', 'family-follow-ias.mjs'), out, String(ref.dir), String(s.u1), String(s.u2), String(s.lam), String(s.t), `--pieces=${ref.pieces}`, `--stop-after=${ref.points.length}`, '--minutes=60'], { cwd: root, encoding: 'utf8' });
console.log(run.stdout.trim());
if (!fs.existsSync(out)) { check('the driver runs', false, String(run.error || run.stderr).slice(0, 300)); process.exit(1); }
const res = JSON.parse(fs.readFileSync(out, 'utf8'));
check('the driver stops after the 10 recorded points', res.points.length === ref.points.length && /stopped after 10/.test(res.why), res.why);
let exact = true, maxRel = 0;
ref.points.forEach((p, i) => {
  const q = res.points[i];
  for (const k of Object.keys(p)) { if (q[k] !== p[k]) exact = false; maxRel = Math.max(maxRel, Math.abs(q[k] - p[k]) / Math.max(1e-300, Math.abs(p[k]))); }
});
check('the 10 recorded points equal the stored points', exact || maxRel < 1e-9, exact ? 'bit-identical' : `not bit-identical, largest relative difference ${maxRel.toExponential(1)}`);
const un = res.unrec.map((u) => u.step);
check('the unrecorded accepted steps are the stored ones', JSON.stringify(un) === JSON.stringify(ref.unrecorded_steps), `${un.length} steps`);
check('no guard tripped', res.guards.tripsTotal === 0, `trips=${res.guards.tripsTotal} cross-check replaced=${res.guards.replaced}`);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

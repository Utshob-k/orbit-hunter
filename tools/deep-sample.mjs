// SPDX-License-Identifier: MIT
// a sample run of the ias route from the start to the reading: a short continuation of the family t35 - from the stored start (data/deep/t35m-replay.json), the witnesses of its points, the
// deeper witnesses where the first one gives a pair distance below 1e-7, the energy and angular momentum checks and the summary (strict witnessed depth, TURNED). It checks the numbers of
// the summary against data/deep/sample/expected-summary.json and prints PASS or FAIL.
// node tools/deep-sample.mjs [--dir DIR] [--stop-after 4] [--jobs 3]
//   The default of --stop-after is 4 recorded points: 25 accepted steps, of which 21 are not recorded (steps 2, 4 to 22, 24), all witnessed. About 2 minutes for the trace and 4 for the witnesses
//   (6 minutes in all) on the machine of the stored run (needs node, python with rebound and mpmath). DIR keeps the trace, the points, the witness results and the summary; without --dir it is a new folder
//   orbit-hunter-sample-XXXXXX in the temporary folder of the operating system (os.tmpdir()), which is not deleted. The trace is run with the guard ratio 400 of the stored t35 - trace.
//   The test compares numbers with tolerances (data/deep/sample/expected-summary.json): recorded points and accepted steps, witnessed points, the strict depth (relative 1e-3), lam of the last point (relative 1e-9),
//   the closure of every witness below 1e-6, no guard trip; the text of the summary is compared with expected-summary.txt as information only.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const opt = (name, d) => { const i = process.argv.indexOf(name); return i < 0 ? d : process.argv[i + 1]; };
const dir = path.resolve(opt('--dir', null) || fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-sample-'))), stopAfter = opt('--stop-after', '4'), jobs = opt('--jobs', '3');
const python = settings.ias.python;
for (const f of ['t35m.json', 't35m.json.partial.json', 't35m.json.diag.jsonl', 't35m.json.nodes.jsonl', 'points.json', 'low.json', 'w1', 'w1-queue.json', 'w1-queue.json.log', 'w1-check.json', 'w1b', 'w1b-queue.json', 'w1b-queue.json.log', 'w1b-check.json', 'summary.json', 'summary.txt'])
  if (fs.existsSync(path.join(dir, f))) { console.error('exists, not overwriting: ' + path.join(dir, f) + ' (give --dir a new folder)'); process.exit(2); }
fs.mkdirSync(dir, { recursive: true });
const t0 = Date.now(), lap = (what) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${what}`);
const run = (cmd, args, quiet = false) => { const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); } if (!quiet) console.log(r.stdout.trim()); return r.stdout; };
const py = (script, args, quiet) => run(python, ['-B', path.join(root, 'tools', script), ...args], quiet);

const ref = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 't35m-replay.json'), 'utf8')), s = ref.start;
const trace = path.join(dir, 't35m.json');
lap('trace: ' + stopAfter + ' recorded points');
run(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), trace, String(ref.dir), String(s.u1), String(s.u2), String(s.lam), String(s.t), `--pieces=${ref.pieces}`, `--stop-after=${stopAfter}`, '--label=t35m', '--ias-first-step=legacy', '--guard-ratio=400']);
const points = path.join(dir, 'points.json');
lap('points to witness');
py('trace-witnesses.py', ['points', trace, points, '--s', String(ref.s)]);
const witness = (preset, pts, name) => {
  const wd = path.join(dir, name), q = path.join(dir, name + '-queue.json'), check = path.join(dir, name + '-check.json');
  py('witness-jobs.py', [pts, wd, q, '--preset', preset], true);
  py('run-queue.py', [q, jobs], true);
  const table = py('witness-check.py', [wd, '--out', check], true);
  lap(`${preset} witnesses: ` + table.trim().split('\n').pop());
  return { wd, check };
};
const w1 = witness('w1', points, 'w1');
const low = path.join(dir, 'low.json');
py('trace-witnesses.py', ['select', w1.wd, low]);
let w1b = null;
if (JSON.parse(fs.readFileSync(low, 'utf8')).length) w1b = witness('w1b', low, 'w1b');
lap('summary');
const args = ['summary', trace, w1.wd].concat(w1b ? [w1b.wd] : []).concat(['--checks', w1.check]).concat(w1b ? ['--checks-w1b', w1b.check] : []).concat(['--s', String(ref.s), '--out', path.join(dir, 'summary.json')]);
const out = py('trace-witnesses.py', args, true).replace(/\r\n/g, '\n');
fs.writeFileSync(path.join(dir, 'summary.txt'), out);
console.log(out.trim());
const expected = fs.readFileSync(path.join(root, 'data', 'deep', 'sample', 'expected-summary.txt'), 'utf8').replace(/\r\n/g, '\n').trim();
console.log(`info: the summary text ${out.trim() === expected ? 'equals' : 'differs from'} data/deep/sample/expected-summary.txt (text that can depend on the machine, not a test)`);
// the test: numbers with tolerances (data/deep/sample/expected-summary.json)
const exp = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 'sample', 'expected-summary.json'), 'utf8'));
const res = JSON.parse(fs.readFileSync(trace, 'utf8')), sum = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
check('recorded points', res.points.length === exp.recorded_points, `${res.points.length} (expected ${exp.recorded_points})`);
check('accepted steps', res.points.length + res.unrec.length === exp.accepted_steps, `${res.points.length + res.unrec.length} (expected ${exp.accepted_steps})`);
check('witnessed points', sum.rows.length === exp.points_to_witness && sum.rows.filter((r) => r.ok).length === exp.witnessed_points, `${sum.rows.filter((r) => r.ok).length} of ${sum.rows.length} (expected ${exp.witnessed_points} of ${exp.points_to_witness})`);
check('strict witnessed depth', typeof sum.strict_depth === 'number' && rel(sum.strict_depth, exp.strict_depth) <= exp.strict_depth_relative_tolerance && sum.turn && sum.turn.step === exp.strict_depth_step, `${sum.strict_depth} at step ${sum.turn && sum.turn.step} (expected ${exp.strict_depth} at step ${exp.strict_depth_step}, relative tolerance ${exp.strict_depth_relative_tolerance})`);
const last = sum.rows[sum.rows.length - 1];
check('lam of the last point', rel(last.lam, exp.lam_last_point) <= exp.lam_last_point_relative_tolerance, `${last.lam} (expected ${exp.lam_last_point}, relative tolerance ${exp.lam_last_point_relative_tolerance})`);
check('closure of every witness below the limit', sum.rows.every((r) => typeof r.closure === 'number' && r.closure < exp.closure_limit_of_a_witness), `largest ${Math.max(...sum.rows.map((r) => r.closure)).toExponential(2)} (limit ${exp.closure_limit_of_a_witness})`);
check('the closest approach turns', sum.turned === exp.turned);
check('no guard tripped, nothing replaced by the cross-check', res.guards.tripsTotal === exp.guard_trips && res.guards.replaced === exp.cross_check_replaced, `trips ${res.guards.tripsTotal}, replaced ${res.guards.replaced}`);
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s, files in ${dir}`);
process.exit(fail ? 1 : 0);

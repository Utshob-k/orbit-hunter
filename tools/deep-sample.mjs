// a sample run of the ias route from the start to the reading: a short continuation of the family t35 - from the stored start (data/deep/t35m-replay.json), the witnesses of its points, the
// deeper witnesses where the first one gives a pair distance below 1e-7, the energy and angular momentum checks and the summary (strict witnessed depth, TURNED). It compares the summary
// with the stored one (data/deep/sample/expected-summary.txt) and prints PASS or FAIL.
// node tools/deep-sample.mjs [--dir DIR] [--stop-after 4] [--jobs 3]
//   The default of --stop-after is 4 recorded points: 25 accepted steps, of which 21 are not recorded (steps 2, 4 to 22, 24), all witnessed. About 2 minutes for the trace and 4 for the witnesses
//   (6 minutes in all) on the machine of the stored run (needs node, python with rebound and mpmath). DIR (default: a temporary folder) keeps the trace, the points, the witness results and the summary.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const opt = (name, d) => { const i = process.argv.indexOf(name); return i < 0 ? d : process.argv[i + 1]; };
const dir = opt('--dir', null) || fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-sample-')), stopAfter = opt('--stop-after', '4'), jobs = opt('--jobs', '3');
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
run(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), trace, String(ref.dir), String(s.u1), String(s.u2), String(s.lam), String(s.t), `--pieces=${ref.pieces}`, `--stop-after=${stopAfter}`, '--label=t35m', '--ias-first-step=legacy']);
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
const same = out.trim() === expected;
console.log(`${same ? 'PASS' : 'FAIL'}  the summary equals data/deep/sample/expected-summary.txt`);
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s, files in ${dir}`);
process.exit(same ? 0 : 1);

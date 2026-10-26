// the first step of IAS15 (src/ias/ias-bridge.py): piece 18 of the kept point k11 of t35 - (data/deep/extra/piece18-states.json), the piece after the encounter piece 17, with the pair at 0.0137 separating at
// speed 17. IAS15 with adaptive_mode 2 and REBOUND's default first step 0.001 ('legacy', the setting of every stored run) ends 1.18e-7 from the end state of reg.js (the event of the piece scan); with the first
// step from the pair timescale ('timescale') it agrees to about 1e-15. The error is the largest over the 12 components of |IAS15 - reg.js| / max(1, |reg.js|), reg.js run here on the same state.
// PASS if the error is at least 1e-8 with 'legacy' and at most 1e-13 with 'timescale'. Needs python with rebound, takes a few seconds.
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { flowEnc } from '../src/ias/reg.js';
import { settings } from '../src/settings.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reg = JSON.parse(fs.readFileSync(path.join(root, 'src', 'ias', 'reg-settings.json'), 'utf8'));
const d = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 'extra', 'piece18-states.json'), 'utf8')).points.find((p) => p.point === 'k11');
const r = flowEnc(d.state, d.tau, { jac: false, settings: reg });
check('reg.js finishes on the piece and gives the stored end state', r.ok && r.end.every((v, k) => Math.abs(v - d.reg_end[k]) <= 1e-12 * Math.max(1, Math.abs(d.reg_end[k]))), r.ok ? '' : r.reason);
const err = (first) => {
  const run = spawnSync(settings.ias.python, ['-B', path.join(root, 'src', 'ias', 'ias-bridge.py'), '2', '390', first, String(settings.ias.firstStepFactor)], { input: JSON.stringify({ id: 1, starts: [d.state], tau: d.tau }) + '\n', encoding: 'utf8' });
  if (run.status !== 0 || !run.stdout) return { error: String(run.stderr || run.error).slice(0, 300) };
  const e = JSON.parse(run.stdout.trim().split('\n')[0]).ends[0];
  return { err: Math.max(...e.map((v, k) => Math.abs(v - r.end[k]) / Math.max(1, Math.abs(r.end[k])))) };
};
const a = err('legacy'), b = err('timescale');
check("first step 'legacy': the error is at least 1e-8", a.err >= 1e-8, a.error || `error=${a.err.toExponential(2)}`);
check("first step 'timescale': the error is at most 1e-13", b.err <= 1e-13, b.error || `error=${b.err.toExponential(2)}`);
process.exit(fail ? 1 : 0);

// SPDX-License-Identifier: MIT
// the stop reason and the exit status of --handover (tools/handover-run.mjs, used by tools/family-follow-ias.mjs), with fake re-closing scripts: a re-closing that crashes, that does not converge, a continuation that
// writes nothing, a first 50 digit step that does not converge, and the working case (also with a re-closing that is not the same orbit as the point: that is recorded, not required). No python, takes a moment.
// The fakes are node scripts named reclose.py and reclose-continue.py in a temporary folder; the "interpreter" is node, without arguments. The exit status of the driver is 1 if runHandover says failed (checked on its source).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runHandover } from '../tools/handover-run.mjs';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-handover-test-'));
const tools = path.join(tmp, 'tools'); fs.mkdirSync(tools);
fs.writeFileSync(path.join(tools, 'reclose.py'), `
const fs = require('fs'); const [job, out] = process.argv.slice(2); const mode = process.env.FAKE_MODE;
if (mode === 'crash') process.exit(3);
fs.writeFileSync(out, JSON.stringify({ status: 'done', converged: mode !== 'noconv', same_orbit: mode === 'ok' ? true : false, rel_diff_ref: { u1: 3e-8, u2: 2.9e-8, t: 8.6e-8 }, iterations: [{}, {}], residual: 1e-20, elapsed_s: 0.1, u1: '1', u2: '2', t: '3' }));
`);
fs.writeFileSync(path.join(tools, 'reclose-continue.py'), `
const fs = require('fs'); const path = require('path'); const a = process.argv.slice(2); const outdir = a[3]; const mode = process.env.FAKE_MODE;
fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(a));
if (mode === 'nocont') process.exit(5);
fs.mkdirSync(outdir);
const ok = mode !== 'step1';
fs.writeFileSync(path.join(outdir, 'handover_continue.json'), JSON.stringify({ steps: [{ step: 1, lam: '0.5', converged: ok, updates: ok ? 2 : null, residual: 1e-20, seconds: 1 }], ...(ok ? {} : { stopped: 'step 1: status error (exit 2)' }) }));
if (ok) fs.writeFileSync(path.join(outdir, 'handover_s01.out.json'), JSON.stringify({ u1: '1.1', u2: '2.2', t: '3.3' }));
`);
const argsFile = path.join(tmp, 'continue-args.json');
process.env.FAKE_ARGS = argsFile;
let n = 0;
const go = (mode, fired) => {
  process.env.FAKE_MODE = mode;
  const base = path.join(tmp, 'out' + (n++) + '.json.handover');
  return runHandover({ fired: { p100: 5e-8, accepted_steps: 262, loop_step: 268, lam: 0.66, lam_step: -1e-8, u1: 1, u2: 2, t: 3, ...fired }, dir: -1, hBelow: 1e-7, hSteps: 1, hDlam: 1e-5, base, root: tmp, python: process.execPath, pyArgs: [], toolsDir: tools });
};
let r = go('crash');
check('a re-closing that crashes: hand-over failed, with its exit status', r.failed && r.why === 'hand-over failed: reclose produced no output (exit 3)' && r.hv.exits[0].exit === 3, r.why);
r = go('noconv');
check('a re-closing that does not converge: hand-over failed', r.failed && r.why === 'hand-over failed: reclose not converged (status done)' && r.hv.exits.length === 1, r.why);
r = go('nocont');
check('a continuation that writes nothing: hand-over failed, exit status recorded', r.failed && r.why === 'hand-over failed: reclose-continue produced no output (exit 5)' && r.hv.exits.length === 2 && r.hv.exits[1].exit === 5, r.why);
r = go('step1');
check('the first 50 digit step does not converge: hand-over failed, with the reason of the continuation', r.failed && r.why === 'hand-over failed: step 1: status error (exit 2)' && r.hv.steps.length === 1 && r.hv.failed === 'step 1: status error (exit 2)', r.why);
r = go('ok');
check('re-closing and one 50 digit step converged: handed over, exit status of both processes 0', !r.failed && r.why === 'handed over to the 50 digit continuation' && r.hv.exits.length === 2 && r.hv.exits.every((e) => e.exit === 0) && r.hv.steps[0].u1 === '1.1');
r = go('okdiff');
check('the re-closed point is not the same orbit (1e-9 test): recorded, not required', !r.failed && r.hv.reclose.same_orbit_as_the_point_itself === false && r.hv.reclose.rel_diff_ref.t === 8.6e-8, `same_orbit ${r.hv.reclose.same_orbit_as_the_point_itself}`);
// the direction is that of the last step of lam, not the sign of DIR
r = go('ok', { lam_step: 2e-9 });
const a = JSON.parse(fs.readFileSync(argsFile, 'utf8')), dl = Number(a[a.indexOf('--dlam') + 1]);
check('the continuation goes in the direction of the last step of lam (DIR -1, lam rising): dlam +1e-5', r.hv.direction_of_lam === 1 && dl === 1e-5 && r.hv.dlam === 1e-5, `dlam ${dl}`);
r = go('ok');
const b = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
check('lam falling, as DIR -1: dlam -1e-5', r.hv.direction_of_lam === -1 && Number(b[b.indexOf('--dlam') + 1]) === -1e-5);
// the driver ends with exit status 1 if the hand-over failed and writes the reason as the stop reason
const src = fs.readFileSync(new URL('../tools/family-follow-ias.mjs', import.meta.url), 'utf8');
check('the driver sets the stop reason from runHandover and exits with 1 when it failed', src.includes('out.why = h.why;') && src.includes('if (h.failed) handoverFailed = h.why;') && src.includes('if (handoverFailed) { console.error(handoverFailed); process.exit(1); }'));
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

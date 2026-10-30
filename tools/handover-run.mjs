// SPDX-License-Identifier: MIT
// the hand-over of --handover (tools/family-follow-ias.mjs): the last accepted point is closed again with the 50 digit tools/reclose.py (the point itself is the reference) and tools/reclose-continue.py goes on from it.
// runHandover returns the "handover" block of OUT.json, the stop reason and whether the hand-over failed. It has handed over only if the re-closing converged and at least one 50 digit step converged; otherwise the
// reason is "hand-over failed: ..." and the driver exits with 1. same_orbit_as_the_point_itself of the re-closing is recorded and not required: in the creep the double precision point can be off by more than 1e-9
// (the closing equations are flat there and one ulp moves F by 3e-11), and the 50 digit point is the better one. The exit status of every process is in hv.exits.
// The direction of the continuation is that of the last step of lam before the rule fired (fired.lam_step), not the sign of DIR: after a fold in lam the two differ.
// python and pyArgs are the interpreter and its leading arguments (the test of this file puts node and no arguments there and fake scripts in toolsDir).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export function runHandover({ fired, dir, hBelow, hSteps, hDlam, base, root, python, pyArgs = ['-B'], toolsDir = path.join(root, 'tools'), onStart = () => {} }) {
  const sgn = Math.sign(fired.lam_step) || dir;
  const hv = { rule: 'after at least 100 accepted steps P100 = |lam_k - lam_(k-100)| / 100 < ' + hBelow, p100: fired.p100, below: hBelow, accepted_steps: fired.accepted_steps, loop_step: fired.loop_step, lam: fired.lam, u1: fired.u1, u2: fired.u2, t: fired.t,
    steps_wanted: hSteps, last_lam_step: fired.lam_step, direction_of_lam: sgn, dlam: sgn * hDlam, folder: path.basename(base), reclose: null, steps: [], witness: null, exits: [] };
  onStart(hv);
  const run = (args) => {
    const r = spawnSync(python, [...pyArgs, ...args], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
    hv.exits.push({ script: path.basename(args[0]), exit: r.status, signal: r.signal || null, error: r.error ? String(r.error.message || r.error) : null });
    return r;
  };
  const pt = { u1: String(fired.u1), u2: String(fired.u2), t: String(fired.t) };
  fs.writeFileSync(base + '-reclose.job.json', JSON.stringify({ id: 'handover-start', ...pt, lam: String(fired.lam), ref: pt }), { flag: 'wx' });
  const t0 = Date.now();
  const rr = run([path.join(toolsDir, 'reclose.py'), base + '-reclose.job.json', base + '-reclose.json', '--minutes', '60']);
  const rc = fs.existsSync(base + '-reclose.json') ? JSON.parse(fs.readFileSync(base + '-reclose.json', 'utf8')) : null;
  hv.reclose = rc ? { file: path.basename(base) + '-reclose.json', status: rc.status || null, converged: rc.converged, same_orbit_as_the_point_itself: rc.same_orbit, rel_diff_ref: rc.rel_diff_ref, updates: rc.iterations ? rc.iterations.length - 1 : null, residual: rc.residual, seconds: rc.elapsed_s } : { converged: false };
  let reason = null;
  if (!rc) reason = 'reclose produced no output (exit ' + rr.status + ')';
  else if (!rc.converged) reason = 'reclose not converged (status ' + rc.status + ')';
  else {
    const t1 = Date.now();
    const cr = run([path.join(toolsDir, 'reclose-continue.py'), 'handover', base + '-reclose.json', String(fired.lam), base, '--steps', String(hSteps), '--dlam', String(sgn * hDlam)]);
    const cf = path.join(base, 'handover_continue.json');
    const cont = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : null;
    hv.stopped = cont ? cont.stopped || null : null;
    hv.steps = (cont ? cont.steps : []).map((s) => {
      const f = path.join(base, 'handover_s' + String(s.step).padStart(2, '0') + '.out.json'), o = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
      return { step: s.step, lam: s.lam, u1: o.u1, u2: o.u2, t: o.t, converged: s.converged, updates: s.updates, residual: s.residual, seconds: s.seconds, second_over_first: s.second_over_first || null };
    });
    const wf = path.join(base, 'handover_w1.out.json');
    hv.witness = fs.existsSync(wf) ? { file: 'handover_w1.out.json', ...Object.fromEntries(['status', 'closure', 'e_half', 'rotation', 'dmin', 'steps', 'seconds_total'].map((k) => [k, JSON.parse(fs.readFileSync(wf, 'utf8'))[k]])) } : null;
    hv.seconds = { reclose: (t1 - t0) / 1000, continuation: (Date.now() - t1) / 1000 };
    if (!cont) reason = 'reclose-continue produced no output (exit ' + cr.status + ')';
    else if (!hv.steps.some((s) => s.converged)) reason = hv.stopped || 'step 1 did not converge';
  }
  if (reason) hv.failed = reason;
  return { hv, failed: !!reason, why: reason ? 'hand-over failed: ' + reason : 'handed over to the 50 digit continuation' };
}

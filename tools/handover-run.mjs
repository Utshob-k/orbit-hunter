// SPDX-License-Identifier: MIT
// the hand-over of --handover (tools/family-follow-ias.mjs): the last accepted point and a point at least 1e-6 behind it in lam (fired.back, tools/handover-rule.mjs backIndex) are closed again with the 50 digit
// tools/reclose.py (each is the reference of itself) and tools/handover-continue.py goes on from the two: tangent first guess, a test of every step, a return test.
// runHandover returns the "handover" block of OUT.json, the stop reason and whether the hand-over failed. It has handed over only if both re-closings converged and handover-continue.py says handed_over (at least 2 accepted
// steps and the return test passed); otherwise the reason is "hand-over failed: ..." and the driver exits with 1. If fired.back is null (no accepted point at least 1e-6 behind the last one with lam moving one way: lam turns, or the trace is
// shorter) there is no tangent: no process is run and the hand-over fails.
// The w1b witness of the last orbit is recorded (hv.witness, and hv.witness_ok: true if it ran and wrote status done with exit status 0, false if it ran and did not, null if no witness ran); it is not part of
// the decision. An output that cannot be read as JSON is a failed hand-over with that reason (for the witness: witness_ok false). When handover-continue.py stopped after 2 or more accepted steps and the return
// test then failed, the reason names the failed return first and the stop after it. When the continuation did not hand over and its continue file has neither a return test nor a stop reason
// (it ended without a result, for example killed after a dump), the reason is "handover-continue ended without a result (exit N)".
// conv (a string, optional): passed as --conv to the two re-closings and to handover-continue.py; safe: passes --safe to handover-continue.py. Both are unset by default (the jobs are those of earlier versions).
// The hand-over starts at the rule of the driver (trigger 'rule', the default) or at a stop of the trace (trigger { kind: 'stop', reason }: the triple-approach guard, "lost the family"); then fired is built from the last accepted step
// (tools/handover-rule.mjs firedAtStop) and the block has trigger 'stop' and stop_before = the stop reason (null for the rule).
// same_orbit_as_the_point_itself of the re-closing is recorded and not required: in the creep the double precision point can be off by more than 1e-9 (the closing equations are flat there and one ulp moves F by 3e-11), and the
// 50 digit point is the better one. The exit status of every process is in hv.exits.
// The direction of the continuation is that of the last step of lam before the rule fired (fired.lam_step), not the sign of DIR: after a fold in lam the two differ.
// python and pyArgs are the interpreter and its leading arguments (the test of this file puts node and no arguments there and fake scripts in toolsDir).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export function runHandover({ fired, dir, hBelow, hSteps, hDlam, base, root, python, pyArgs = ['-B'], toolsDir = path.join(root, 'tools'), trigger = { kind: 'rule' }, onStart = () => {}, conv = null, safe = false }) {
  const sgn = Math.sign(fired.lam_step) || dir;
  const atStop = trigger.kind === 'stop';
  const hv = { trigger: atStop ? 'stop' : 'rule', stop_before: atStop ? trigger.reason : null,
    rule: atStop ? 'at the stop "' + trigger.reason + '": the last accepted step and the point of backIndex behind it' : 'after at least 100 accepted steps P100 = |lam_k - lam_(k-100)| / 100 < ' + hBelow, p100: fired.p100, below: hBelow, accepted_steps: fired.accepted_steps, loop_step: fired.loop_step, lam: fired.lam, u1: fired.u1, u2: fired.u2, t: fired.t,
    steps_wanted: hSteps, last_lam_step: fired.lam_step, direction_of_lam: sgn, dlam: sgn * hDlam, folder: path.basename(base), back: fired.back || null, reclose: null, back_reclose: null, tangent: null, attempts: [], return: null, steps: [], witness: null, exits: [] };
  if (conv !== null) hv.conv = conv;
  if (safe) hv.safe = true;
  onStart(hv);
  const fail = (reason) => { hv.failed = reason; return { hv, failed: true, why: 'hand-over failed: ' + reason }; };
  if (!fired.back) return fail('no accepted point at least 1e-6 behind the last one with lam moving one way (lam turns, or the trace is shorter): no tangent');
  const run = (args) => {
    const r = spawnSync(python, [...pyArgs, ...args], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
    hv.exits.push({ script: path.basename(args[0]), exit: r.status, signal: r.signal || null, error: r.error ? String(r.error.message || r.error) : null });
    return r;
  };
  const readJson = (f) => { try { return { o: JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch (e) { return { bad: true }; } };   // { o } or { bad: true } for an output that cannot be read
  const close = (id, p, lam, job, out) => {
    const pt = { u1: String(p.u1), u2: String(p.u2), t: String(p.t) };
    fs.writeFileSync(job, JSON.stringify({ id, ...pt, lam: String(lam), ref: pt }), { flag: 'wx' });
    const r = run([path.join(toolsDir, 'reclose.py'), job, out, '--minutes', '60', ...(conv !== null ? ['--conv', conv] : [])]);
    const rd = fs.existsSync(out) ? readJson(out) : { o: null };
    if (rd.bad) return { r, rc: null, bad: true, info: { file: path.basename(out), converged: false, error: 'output not valid JSON' } };
    const rc = rd.o;
    return { r, rc, info: rc ? { file: path.basename(out), status: rc.status || null, converged: rc.converged, same_orbit_as_the_point_itself: rc.same_orbit, rel_diff_ref: rc.rel_diff_ref, updates: rc.iterations ? rc.iterations.length - 1 : null, residual: rc.residual, seconds: rc.elapsed_s } : { converged: false } };
  };
  const t0 = Date.now();
  const z = close('handover-start', fired, fired.lam, base + '-reclose.job.json', base + '-reclose.json');
  hv.reclose = z.info;
  if (z.bad) return fail('reclose output not valid JSON (exit ' + z.r.status + ')');
  if (!z.rc) return fail('reclose produced no output (exit ' + z.r.status + ')');
  if (!z.rc.converged) return fail('reclose not converged (status ' + z.rc.status + ')');
  const b = close('handover-back', fired.back, fired.back.lam, base + '-back.job.json', base + '-back.json');
  hv.back_reclose = b.info;
  if (b.bad) return fail('reclose output of the back point not valid JSON (exit ' + b.r.status + ')');
  if (!b.rc) return fail('reclose of the back point produced no output (exit ' + b.r.status + ')');
  if (!b.rc.converged) return fail('reclose of the back point not converged (status ' + b.rc.status + ')');
  const t1 = Date.now();
  const cr = run([path.join(toolsDir, 'handover-continue.py'), 'handover', base + '-reclose.json', String(fired.lam), base + '-back.json', String(fired.back.lam), base, '--steps', String(hSteps), '--dlam', String(sgn * hDlam), '--minutes', '20', ...(conv !== null ? ['--conv', conv] : []), ...(safe ? ['--safe'] : [])]);
  const cf = path.join(base, 'handover_continue.json');
  const cd = fs.existsSync(cf) ? readJson(cf) : { o: null };
  const cont = cd.bad ? null : cd.o;
  hv.seconds = { reclose: (t1 - t0) / 1000, continuation: (Date.now() - t1) / 1000 };
  if (cd.bad) return fail('handover-continue output not valid JSON (exit ' + cr.status + ')');
  if (!cont) return fail('handover-continue produced no output (exit ' + cr.status + ')');
  hv.stopped = cont.stopped || null;
  hv.tangent = cont.tangent; hv.attempts = cont.attempts; hv.return = cont.return;
  if ('return_last' in cont) hv.return_last = cont.return_last;
  let badStep = null;
  hv.steps = (cont.steps || []).map((s) => {
    const f = path.join(base, s.file), rd = fs.existsSync(f) ? readJson(f) : { o: {} };
    if (rd.bad && badStep === null) badStep = s.file;
    const o = rd.bad ? {} : rd.o;
    return { step: s.step, lam: s.lam, u1: o.u1, u2: o.u2, t: o.t, converged: s.converged, updates: s.updates, first_residual: s.first_residual, residual: s.residual, seconds: s.seconds, predicted: s.predicted, miss: s.miss, ratio: s.ratio,
      ...('dz_cos' in s ? { dz_cos: s.dz_cos, reversed: s.reversed } : {}), ...(s.accepted_by ? { accepted_by: s.accepted_by } : {}) };
  });
  const wf = path.join(base, 'handover_w1.out.json');
  const wd = fs.existsSync(wf) ? readJson(wf) : null;
  hv.witness = wd === null ? null : wd.bad ? { file: 'handover_w1.out.json', error: 'output not valid JSON' } : { file: 'handover_w1.out.json', ...Object.fromEntries(['status', 'closure', 'e_half', 'rotation', 'dmin', 'steps', 'seconds_total'].map((k) => [k, wd.o[k]])) };
  hv.witness_ok = cont.witness ? !!(wd && !wd.bad && wd.o.status === 'done' && cont.witness.exit === 0) : null;   // recorded only, not part of the decision
  if (badStep !== null) return fail('the output ' + badStep + ' of an accepted step is not valid JSON');
  if (!cont.handed_over) {
    const ret = cont.return, last = cont.return_last;
    if (ret && ret.pass === false) return fail('return test failed' + (cont.stopped ? '; the continuation had stopped: ' + cont.stopped : ''));
    if (ret && ret.pass && last && last.pass === false) return fail('second return test (return_last) failed' + (cont.stopped ? '; the continuation had stopped: ' + cont.stopped : ''));
    if (!ret && !cont.stopped) return fail('handover-continue ended without a result (exit ' + cr.status + ')');
    return fail(cont.stopped || 'return test failed');
  }
  return { hv, failed: false, why: 'handed over to the 50 digit continuation' };
}

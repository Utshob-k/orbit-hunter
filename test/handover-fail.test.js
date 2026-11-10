// SPDX-License-Identifier: MIT
// the stop reason and the exit status of --handover (tools/handover-run.mjs, used by tools/family-follow-ias.mjs), with fake re-closing scripts: no point behind the last one (no accepted point at least 1e-6 behind with lam moving one way: no process is run),
// a re-closing that crashes, that does not converge, a re-closing of the back point that does not converge, a continuation that writes nothing, a continuation that stops at its first attempt, one whose return test fails, and
// the working case (also with a re-closing that is not the same orbit as the point: that is recorded, not required), and the same calls with trigger { kind: 'stop' } (the hand-over at the guard and the lost-family stops) and without a trigger
// (the rule: trigger 'rule', stop_before null). No python, takes a moment.
// Also with the fakes: an output that is not valid JSON (the re-closing, the continue file, the output of a step, the witness), a continuation that stopped after 2 steps and whose return test failed (the reason
// names the failed return first), witness_ok (true, false, null; the witness is not part of the decision), and the options conv and safe (the arguments reach the fake tools; without them none is passed).
// The checks named "source contains" only search the source of the driver for strings (the driver itself needs a real flow).
// The fakes are node scripts named reclose.py and handover-continue.py in a temporary folder; the "interpreter" is node, without arguments. The exit status of the driver is 1 if runHandover says failed (checked on its source).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runHandover } from '../tools/handover-run.mjs';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-handover-test-'));
const tools = path.join(tmp, 'tools'); fs.mkdirSync(tools);
fs.writeFileSync(path.join(tools, 'reclose.py'), `
const fs = require('fs'); const [job, out] = process.argv.slice(2); const mode = process.env.FAKE_MODE; const id = JSON.parse(fs.readFileSync(job, 'utf8')).id;
if (process.env.FAKE_RARGS) fs.writeFileSync(process.env.FAKE_RARGS, JSON.stringify(process.argv.slice(2)));
if (mode === 'crash' || (mode === 'backcrash' && id === 'handover-back')) process.exit(3);
if (mode === 'badjson' || (mode === 'backbadjson' && id === 'handover-back')) { fs.writeFileSync(out, '{"status": "do'); process.exit(0); }
fs.writeFileSync(out, JSON.stringify({ status: 'done', converged: mode !== 'noconv' && !(mode === 'backnoconv' && id === 'handover-back'), same_orbit: mode === 'ok' ? true : false, rel_diff_ref: { u1: 3e-8, u2: 2.9e-8, t: 8.6e-8 }, iterations: [{}, {}], residual: 1e-20, elapsed_s: 0.1, u1: '1', u2: '2', t: '3' }));
`);
fs.writeFileSync(path.join(tools, 'handover-continue.py'), `
const fs = require('fs'); const path = require('path'); const a = process.argv.slice(2); const outdir = a[5]; const mode = process.env.FAKE_MODE;
fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(a));
if (mode === 'nocont') process.exit(5);
fs.mkdirSync(outdir);
const ok = mode !== 'step1', handed = ok && mode !== 'retfail' && mode !== 'stopret';
const steps = ok ? [1, 2].map((k) => ({ step: k, lam: '0.5' + k, file: 'handover_a0' + k + '.out.json', converged: true, updates: 2, first_residual: 1e-9, residual: 1e-20, seconds: 1, predicted: 1e-4, miss: 1e-9, ratio: 1e-5 })) : [];
for (const s of steps) fs.writeFileSync(path.join(outdir, s.file), JSON.stringify({ u1: '1.' + s.step, u2: '2.' + s.step, t: '3.' + s.step }));
if (mode === 'stepbad') fs.writeFileSync(path.join(outdir, steps[1].file), '{"u1": ');
const STOPRET = 'dlam 1e-8 is below --min-dlam 1e-7 after attempt 5 (not converged)';
let witness = null;
if (mode === 'wit' || mode === 'witfail' || mode === 'witbad') {
  witness = { file: 'handover_w1.out.json', exists: true, exit: mode === 'witfail' ? 3 : 0 };
  fs.writeFileSync(path.join(outdir, 'handover_w1.out.json'), mode === 'witbad' ? '{"status": ' : JSON.stringify({ status: mode === 'witfail' ? 'over limit' : 'done', closure: 1e-12, e_half: 1e-20, rotation: 0.5, dmin: 0.01, steps: 100, seconds_total: 9 }));
}
const cont = { tangent: ['1', '2', '3'], steps, attempts: steps.map((s) => ({ tag: 'a' + s.step, accepted: true })), return: ok ? { pass: handed } : null, handed_over: handed, stopped: ok ? (mode === 'stopret' ? STOPRET : null) : 'attempt 1: status error (exit 2)', witness };
fs.writeFileSync(path.join(outdir, 'handover_continue.json'), mode === 'contbad' ? '{"tangent": [' : JSON.stringify(cont));
`);
const argsFile = path.join(tmp, 'continue-args.json');
process.env.FAKE_ARGS = argsFile;
let n = 0;
const back = { index: 90, lam: 0.6601, u1: 1.5, u2: 2.5, t: 3.5 };
const rargsFile = path.join(tmp, 'reclose-args.json');
process.env.FAKE_RARGS = rargsFile;
const go = (mode, fired, trigger, extra = {}) => {
  process.env.FAKE_MODE = mode;
  const base = path.join(tmp, 'out' + (n++) + '.json.handover');
  return runHandover({ fired: { p100: 5e-8, accepted_steps: 262, loop_step: 268, lam: 0.66, lam_step: -1e-8, u1: 1, u2: 2, t: 3, back, ...fired }, dir: -1, hBelow: 1e-7, hSteps: 2, hDlam: 1e-5, base, root: tmp, python: process.execPath, pyArgs: [], toolsDir: tools, ...(trigger ? { trigger } : {}), ...extra });
};
let r = go('ok', { back: null });
const NOTANGENT = 'no accepted point at least 1e-6 behind the last one with lam moving one way (lam turns, or the trace is shorter): no tangent';
check('no point behind the last one (lam turns, or the trace is shorter): hand-over failed, no process run', r.failed && r.why === 'hand-over failed: ' + NOTANGENT && r.hv.exits.length === 0 && r.hv.reclose === null, r.why);
r = go('crash');
check('a re-closing that crashes: hand-over failed, with its exit status', r.failed && r.why === 'hand-over failed: reclose produced no output (exit 3)' && r.hv.exits[0].exit === 3 && r.hv.exits.length === 1, r.why);
r = go('noconv');
check('a re-closing that does not converge: hand-over failed', r.failed && r.why === 'hand-over failed: reclose not converged (status done)' && r.hv.exits.length === 1, r.why);
r = go('backcrash');
check('the re-closing of the back point crashes: hand-over failed, with its exit status', r.failed && r.why === 'hand-over failed: reclose of the back point produced no output (exit 3)' && r.hv.exits.length === 2 && r.hv.exits[1].exit === 3, r.why);
r = go('backnoconv');
check('the re-closing of the back point does not converge: hand-over failed, the continuation is not run', r.failed && r.why === 'hand-over failed: reclose of the back point not converged (status done)' && r.hv.exits.length === 2 && r.hv.back_reclose.converged === false, r.why);
r = go('nocont');
check('a continuation that writes nothing: hand-over failed, exit status recorded', r.failed && r.why === 'hand-over failed: handover-continue produced no output (exit 5)' && r.hv.exits.length === 3 && r.hv.exits[2].exit === 5, r.why);
r = go('step1');
check('the continuation stops at its first attempt: hand-over failed, with the reason of the continuation', r.failed && r.why === 'hand-over failed: attempt 1: status error (exit 2)' && r.hv.steps.length === 0 && r.hv.failed === 'attempt 1: status error (exit 2)', r.why);
r = go('retfail');
check('the return test fails: hand-over failed with "return test failed", the steps and the test are recorded', r.failed && r.why === 'hand-over failed: return test failed' && r.hv.steps.length === 2 && r.hv.return.pass === false, r.why);
r = go('ok');
const a0 = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
check('re-closing of both points and the continuation worked: handed over, exit status of the three processes 0', !r.failed && r.why === 'handed over to the 50 digit continuation' && r.hv.exits.length === 3 && r.hv.exits.every((e) => e.exit === 0) && r.hv.exits[2].script === 'handover-continue.py', r.why);
check('the steps carry u1, u2, t read from their files, and predicted, miss, ratio', r.hv.steps.length === 2 && r.hv.steps[0].u1 === '1.1' && r.hv.steps[1].t === '3.2' && r.hv.steps[1].predicted === 1e-4 && r.hv.steps[0].ratio === 1e-5 && r.hv.tangent.length === 3 && r.hv.return.pass === true && r.hv.attempts.length === 2 && r.hv.back.lam === 0.6601);
check('the arguments of the continuation: label, Z, lam of z, BACK, lam of the back point, folder, --steps, --dlam, --minutes 20',
  a0[0] === 'handover' && a0[1].endsWith('-reclose.json') && a0[2] === '0.66' && a0[3].endsWith('-back.json') && a0[4] === '0.6601' && a0[5].endsWith('.handover') && a0[a0.indexOf('--steps') + 1] === '2' && a0[a0.indexOf('--dlam') + 1] === '-0.00001' && a0[a0.indexOf('--minutes') + 1] === '20', JSON.stringify(a0.map((x) => path.basename(x))));
r = go('okdiff');
check('the re-closed point is not the same orbit (1e-9 test): recorded, not required', !r.failed && r.hv.reclose.same_orbit_as_the_point_itself === false && r.hv.reclose.rel_diff_ref.t === 8.6e-8, `same_orbit ${r.hv.reclose.same_orbit_as_the_point_itself}`);
// the direction is that of the last step of lam, not the sign of DIR
r = go('ok', { lam_step: 2e-9 });
const a = JSON.parse(fs.readFileSync(argsFile, 'utf8')), dl = Number(a[a.indexOf('--dlam') + 1]);
check('the continuation goes in the direction of the last step of lam (DIR -1, lam rising): dlam +1e-5', r.hv.direction_of_lam === 1 && dl === 1e-5 && r.hv.dlam === 1e-5, `dlam ${dl}`);
r = go('ok');
const b = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
check('lam falling, as DIR -1: dlam -1e-5', r.hv.direction_of_lam === -1 && Number(b[b.indexOf('--dlam') + 1]) === -1e-5);
// the hand-over at a stop of the trace (trigger stop) and by the rule (no trigger)
const STOP = 'triple-approach guard (5 consecutive attempts failed with a guard trip)';
const stopRule = 'at the stop "' + STOP + '": the last accepted step and the point of backIndex behind it';
r = go('ok', {}, { kind: 'stop', reason: STOP });
check('trigger stop: handed over, the block has trigger stop, stop_before kept and the stop rule text, the three processes exit 0', !r.failed && r.why === 'handed over to the 50 digit continuation' && r.hv.trigger === 'stop' && r.hv.stop_before === STOP && r.hv.rule === stopRule && r.hv.exits.length === 3 && r.hv.exits.every((e) => e.exit === 0), r.hv.rule);
r = go('ok', { back: null }, { kind: 'stop', reason: STOP });
check('trigger stop, no point behind the last one: the same failure and no process run as on the rule path, trigger and stop_before in the block', r.failed && r.why === 'hand-over failed: ' + NOTANGENT && r.hv.exits.length === 0 && r.hv.trigger === 'stop' && r.hv.stop_before === STOP, r.why);
r = go('crash', {}, { kind: 'stop', reason: STOP });
check('trigger stop, a re-closing that crashes: hand-over failed with its exit status, as on the rule path', r.failed && r.why === 'hand-over failed: reclose produced no output (exit 3)' && r.hv.exits.length === 1 && r.hv.exits[0].exit === 3 && r.hv.stop_before === STOP, r.why);
r = go('retfail', {}, { kind: 'stop', reason: STOP });
check('trigger stop, the return test fails: hand-over failed with "return test failed", steps recorded, as on the rule path', r.failed && r.why === 'hand-over failed: return test failed' && r.hv.steps.length === 2 && r.hv.return.pass === false && r.hv.trigger === 'stop', r.why);
r = go('step1', {}, { kind: 'stop', reason: STOP });
check('trigger stop, the continuation stops at its first attempt: the reason of the continuation, as on the rule path', r.failed && r.why === 'hand-over failed: attempt 1: status error (exit 2)' && r.hv.steps.length === 0, r.why);
r = go('ok');
check('no trigger: trigger rule, stop_before null, rule text unchanged', !r.failed && r.hv.trigger === 'rule' && r.hv.stop_before === null && r.hv.rule === 'after at least 100 accepted steps P100 = |lam_k - lam_(k-100)| / 100 < 1e-7', r.hv.rule);
r = go('ok', {}, { kind: 'rule' });
check('trigger { kind: rule }: the same as no trigger', !r.failed && r.hv.trigger === 'rule' && r.hv.stop_before === null && r.hv.rule.startsWith('after at least 100 accepted steps'));
// outputs that are not valid JSON: a failed hand-over with that reason, no crash
r = go('badjson');
check('a re-closing output that is not valid JSON: hand-over failed with that reason', r.failed && r.why === 'hand-over failed: reclose output not valid JSON (exit 0)' && r.hv.exits.length === 1 && r.hv.reclose.error === 'output not valid JSON', r.why);
r = go('backbadjson');
check('the output of the back point not valid JSON: hand-over failed with that reason', r.failed && r.why === 'hand-over failed: reclose output of the back point not valid JSON (exit 0)' && r.hv.exits.length === 2, r.why);
r = go('contbad');
check('a continue file that is not valid JSON: hand-over failed with that reason', r.failed && r.why === 'hand-over failed: handover-continue output not valid JSON (exit 0)' && r.hv.exits.length === 3, r.why);
r = go('stepbad');
check('the output of an accepted step not valid JSON: hand-over failed with that reason', r.failed && r.why === 'hand-over failed: the output handover_a02.out.json of an accepted step is not valid JSON', r.why);
// the reason when the continuation stopped after 2 steps and the return test failed
r = go('stopret');
check('stopped after 2 steps and the return test failed: the reason names the failed return first, then the stop', r.failed && r.why === 'hand-over failed: return test failed; the continuation had stopped: dlam 1e-8 is below --min-dlam 1e-7 after attempt 5 (not converged)' && r.hv.stopped !== null, r.why);
// witness_ok: recorded, not part of the decision
r = go('ok');
check('no witness ran: witness_ok null, handed over', !r.failed && r.hv.witness === null && r.hv.witness_ok === null);
r = go('wit');
check('a witness with status done and exit 0: witness_ok true, handed over', !r.failed && r.hv.witness_ok === true && r.hv.witness.status === 'done' && r.hv.witness.closure === 1e-12);
r = go('witfail');
check('a witness over its limit (exit 3): witness_ok false, still handed over (the witness is not part of the decision)', !r.failed && r.why === 'handed over to the 50 digit continuation' && r.hv.witness_ok === false && r.hv.witness.status === 'over limit');
r = go('witbad');
check('a witness output that is not valid JSON: witness_ok false, recorded, still handed over', !r.failed && r.hv.witness_ok === false && r.hv.witness.error === 'output not valid JSON');
// the options conv and safe reach the fake tools; without them nothing is passed
r = go('ok');
{
  const ca = JSON.parse(fs.readFileSync(argsFile, 'utf8')), ra = JSON.parse(fs.readFileSync(rargsFile, 'utf8'));
  check('without conv and safe: no --conv for the re-closings or the continuation, no --safe, hv without conv and safe', !ca.includes('--conv') && !ca.includes('--safe') && !ra.includes('--conv') && !('conv' in r.hv) && !('safe' in r.hv), JSON.stringify(ra.slice(2)));
}
r = go('ok', {}, null, { conv: '1e-24', safe: true });
{
  const ca = JSON.parse(fs.readFileSync(argsFile, 'utf8')), ra = JSON.parse(fs.readFileSync(rargsFile, 'utf8'));
  check('conv 1e-24 and safe: --conv 1e-24 reaches the re-closing and the continuation, --safe the continuation; recorded in hv', !r.failed && ra[ra.indexOf('--conv') + 1] === '1e-24' && ca[ca.indexOf('--conv') + 1] === '1e-24' && ca.includes('--safe') && r.hv.conv === '1e-24' && r.hv.safe === true, JSON.stringify(ca.slice(6)));
}
// the driver ends with exit status 1 if the hand-over failed and writes the reason as the stop reason
const src = fs.readFileSync(new URL('../tools/family-follow-ias.mjs', import.meta.url), 'utf8');
check('source contains: the driver sets the stop reason from runHandover and exits with 1 when it failed', src.includes('out.why = h.why;') && src.includes('if (h.failed) handoverFailed = h.why;') && src.includes('if (handoverFailed) { console.error(handoverFailed); process.exit(1); }'));
check('source contains: the driver keeps the stop reason in whyBeforeHandover, calls handoverAtStop and firedAtStop and starts the hand-over with trigger stop', src.includes('out.whyBeforeHandover = out.why;') && src.includes('handoverAtStop(out.why)') && src.includes('firedAtStop(lams, pars, steps, hBelow)') && src.includes("trigger = { kind: 'stop', reason: out.whyBeforeHandover };") && src.includes('runHandover({ fired, trigger,'));
check('source contains: the driver passes --handover-conv and --handover-safe to runHandover as conv and safe', src.includes('conv: hConv, safe: hSafe'));
check('source contains: the driver with no accepted step before the stop: hand-over failed (no tangent), still exits with 1, no process run', src.includes("failed: 'no accepted step before the stop: no tangent'") && src.includes("out.why = 'hand-over failed: no accepted step before the stop: no tangent'; handoverFailed = out.why;"));
check('source contains: the driver records the loop step of every accepted step (steps) next to lams and pars', src.includes('const steps = [0];') && src.includes('steps.push(step);'));
const rt = fs.readFileSync(new URL('../tools/reproduce-trace.mjs', import.meta.url), 'utf8'), tv = fs.readFileSync(new URL('../tools/trace-verdict.mjs', import.meta.url), 'utf8');
check('source contains: tools/reproduce-trace.mjs takes its verdict from tools/trace-verdict.mjs, which with --handover also accepts whyBeforeHandover equal to the stored reason, with as many accepted steps as the stored trace', rt.includes("import { traceVerdict } from './trace-verdict.mjs';") && rt.includes('whyBeforeHandover: res.whyBeforeHandover, storedWhy: stored.why') && tv.includes('(whyBeforeHandover === storedWhy && gotLength === refLength)'));
check('source contains: the driver passes the back point of the rule and asks for at least 2 steps', src.includes('const j = backIndex(lams);') && src.includes('fired.back = { index: j, lam: lams[j], ...pars[j] }') && src.includes('hSteps >= 2'));
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

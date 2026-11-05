// SPDX-License-Identifier: MIT
// follows the family of relative periodic orbits through one orbit of the perpendicular start in ONE direction with the ias route (REBOUND IAS15 through src/ias/bridge.js,
// encounter pieces by src/ias/reg.js, the guards of src/ias/guards.py), recording every accepted step (start values, T*, L*, theta, closest approach, closure). An accepted step
// for which perpInfo returns nothing (its Dormand-Prince integration gives up, so there is no closest approach and no closure) is not a point of the trace but is listed in `unrec`; T* and L* of every
// accepted step come from the start values (perpEL), so `unrec` has them too. Stops at a closed loop, L* below 1e-3, a closest approach above --max-dist, a guard,
// a failure of reg.js, a step collapse, a lost family, the step limit or the time limit; the reason is in the file. Writes OUT.json, OUT.json.partial.json every 5 points and
// OUT.json.diag.jsonl (one line per attempt of the corrector, src/ias/recorder.js).
// node tools/family-follow-ias.mjs OUT.json DIR u1 u2 lam t [--handover [--handover-below=1e-7] [--handover-steps=20] [--handover-dlam=1e-5]] [--minutes=120] [--pieces=24] [--label=name] [--max-dist=0.03] [--stop-below=0] [--stop-after=N]
//                                  [--ias-mode=2] [--ias-first-step=timescale|legacy] [--newton-tol=1e-11] [--no-nodes] [--timeout-min=30] [--python=PY] [--guard-ratio=390]
//                                  [--tol-scale=K] [--arc-weight=W] [--grow-iters=K] [--grow-factor=F] [--stop-lam=L] [--ls-reuse] [--mono-threads=K] [--perp-cap=F] [--reg-threads=K] [--ias-procs=K] [--fast=K]
//                                  [--natural=DL] [--matrix=exact|fd-forward|fd-central] [--pieces-by=ias|reg] [--guards=record]
//   DIR = 1 or -1 in lam (anything else stops the driver with exit 2, as does an unknown option); t = half the period. pieces: the number of pieces of the multiple shooting, at most 250. max-dist: stop when the closest approach is above it (inf for never). stop-below: stop
//   when the closest approach is below it (0: never). stop-after: stop after that many recorded points (the message is "stopped after N recorded points"). The other options set src/settings.js: IAS15 adaptive_mode, the longest wait for
//   the Python process, the python executable PY (the default is that of src/settings.js: ORBIT_PYTHON, else python on Windows and python3 elsewhere), the ratio of guard G1b.
//   matrix: the 12 x 12 matrix of a flagged piece and of a piece replaced by the cross-check: 'exact' (the default; the derivative of reg.js), 'fd-forward' (forward differences of reg.js with the increment 1e-7 * max(1, |x_c|), Henon's) or 'fd-central' (central differences, 1e-5 * max(1, |x_c|)); any other value stops the driver; the value is in out.settings.ias.matrix when it is not exact.
//   pieces-by: which integrator gives the pieces: 'ias' takes the end state of every piece from IAS15 and its matrix from the Dormand-Prince variational equations of src/shooting.js (no reg.js, no cross-check, no missed-flag check; the guards on the IAS15 analysis stay on), 'reg' takes every piece from reg.js with its derivative (IAS15 still gives the flags and the guards); absent = the flagged pieces from reg.js, the others from IAS15 with the cross-check; any other value stops the driver; the output of a run with the option has out.settings.ias.piecesBy and out.piecesBy.
//   guards: 'record' (the only value; absent = the default) counts and lists the guard trips (out.guards.tripList, up to 20000 entries, and the counts per kind) but does not let them fail an attempt or end the trace, and the stop "5 consecutive attempts failed with a guard trip" is off; the other stops stay. Used to see what lies beyond the guards of a stored trace; the value is in out.settings.ias.guards.
//   ias-first-step: the first step of IAS15 on every piece ('timescale', the default of src/settings.js, or 'legacy', REBOUND's default 0.001, the setting of the traces stored in data/deep); the value is in out.settings.ias.firstStep.
//   tol-scale=K: the corrector stops when sup|F| < max(newton-tol, K * 2^-52 * (largest entry of the Jacobian of the iteration) * max(1, largest |Y|)); each line of the diag file has the effective tolerance (tolEff) of its last iteration.
//   arc-weight=W: weighted arclength: the 276 (with 24 pieces) node components of the pseudo-arclength unknowns have weight W, u1, u2, t and lam weight 1; the weighted norm is in the unit tangent, in the constraint row of the tangent and of the corrector,
//   in the step length of the predictor, in the orientation test of the tangent and in the branch test dot(tauNew, tau) > cos(0.35) (src/shooting.js, wdot, wunit, wrow).
//   grow-iters=K: the step h of the pseudo-arclength grows after an accepted step with at most K corrector iterations (unset = 3); grow-factor=F: the factor of that growth (unset = 1.4). Both are read by huntArclength only, and with neither given the step control is the old one.
//   stop-lam=L: the run stops, as "stopped by the caller", at the first accepted step whose lam has passed L in the direction DIR (that step is recorded); the value is in out.settings.stopLam and out.options.stopLam. huntArclength only.
//   ls-reuse: the line search of the corrector evaluates the pieces of a trial in ONE request of the bridge (not one request per piece) and the next system() call uses the end states, flags and reg.js matrices of the accepted trial (when its starts are bit-equal); off by default. The diag file has nReuse per attempt. huntArclength only.
//   mono-threads=K: the monodromy (dp45 variational equations) of the pieces without a reg.js matrix is computed in K worker threads, one batch per system() call (src/mono-pool.js, src/mono-worker.mjs); K a whole number of at least 1, unset or 1 = in the main thread, as before; ias route only. The value is in out.settings.monoThreads.
//   perp-cap=F: perpInfo of the trace (closest approach and closure of an accepted step) gives up after the share F of its usual limit of dp45 steps, 20*(4000+3000T); 0 < F <= 1, unset = 1. A step for which it gives up is listed in `unrec` as always; only the time it takes to give up changes. The value is in out.settings.perpCap.
//   reg-threads=K: the reg.js calls a request of the ias route can need (flagged pieces, cross-checks, the missed-flag check) are computed in one batch in K worker threads (src/ias/reg-pool.js, src/ias/reg-worker.mjs) and the bridge then runs its usual code on the results, so counters, replacements and stops are as without it; K a whole number of at least 1, unset or 1 = one after the other; not with --matrix=fd-forward/fd-central or --pieces-by. The value is in out.settings.ias.regThreads; the diag file has secPool and secLsPool.
//   ias-procs=K: the pieces of a request are integrated by IAS15 in a pool of K processes of src/ias/ias-bridge.py (the end states and the analysis are the same numbers, in the same order); K a whole number of at least 1, unset or 1 = one after the other in one process. The value is in out.settings.ias.procs.
//   fast=K: the same as --ls-reuse --mono-threads=K --reg-threads=K --ias-procs=K (K a whole number of at least 1); it cannot be given together with any of those four, with --natural, --matrix=fd-forward/fd-central or --pieces-by. --perp-cap is not part of it. 4, the number of performance cores, was the best value measured on the machine of the runs, and 8 was slower. The value is in out.settings.fast, and the four settings are in out.settings as with the separate options.
//   natural=DL: natural continuation in lam instead of the pseudo-arclength (lam fixed per step, Newton on F alone, first step DL in DIR, doubled after at most 3 iterations, halved on failure, ends below 1e-14); zeros of theta are not looked for.
//   handover: hand the trace over to the 50 digit continuation where the double precision route has become slower than it. Rule, without wall time (tools/handover-rule.mjs): after at least 100 accepted steps
//   P100 = |lam_k - lam_(k-100)| / 100 over the last 100 accepted steps (lam_0 = lam of the start); if P100 < --handover-below (1e-7 by default) the driver stops. If lam moved in one direction over the way back to a point
//   at least 1e-6 behind the last one (backIndex of tools/handover-rule.mjs), both points are closed again with tools/reclose.py (50 digits, each the reference of itself; both must converge) and tools/handover-continue.py goes on from them:
//   its tangent through the two points is the first guess, a step is accepted only if t > 0 and the solution is near the guess (0.1 of the size of the guess step), otherwise the step in lam is divided by 10 (down to 1e-7),
//   then the secant through the two last solutions. At least 2 steps (--handover-steps, 20 by default, of --handover-dlam in lam, 1e-5, in the direction of the last step of lam) and a return test (the line through the first two
//   solutions, evaluated at the lam of the last point, must lead back to that point) are needed, then the w1b witness of the last orbit is made from its exact start (tools/witness.py --exact-start). If there is no accepted point at least 1e-6 behind the last one with lam moving one way (lam turns, or the trace is shorter) there is no tangent and the hand-over fails.
//   The hand-over also starts at two stops of the trace, the triple-approach guard and "lost the family" (handoverAtStop of tools/handover-rule.mjs), from the last accepted step and the point of backIndex behind it (also with fewer
//   than 100 accepted steps; with --guards=record there is no guard stop). The original stop reason is then in OUT.json "whyBeforeHandover" and in handover.stop_before, handover.trigger is 'stop' (else 'rule'); the stop reason and the exit
//   status are as for the rule: "handed over to the 50 digit continuation" (exit 0) or "hand-over failed: <reason>" (exit 1; also if there was no accepted step before the stop: no tangent). The other stops end as before.
//   OUT.json then has a "handover" block (the rule, the two re-closings, the tangent, every attempt, every accepted step with lam, u1, u2, t as strings, the return test, the witness, the files OUT.json.handover-reclose.json, OUT.json.handover-back.json and the folder OUT.json.handover/); the stop reason is
//   "handed over to the 50 digit continuation" if the hand-over succeeded, else "hand-over failed: <reason>" and the exit status is 1 (tools/handover-run.mjs; the exit status of every process is in the block). Why 1e-7: the 50 digit continuation makes 1e-5 in lam in 148.6 s (t35 -) and 293.9 s (t44 -) (data/deep/extra/cost-comparison.json), that is 6.7e-8 and 3.4e-8 per second,
//   and this route takes about 1.8 to 2.9 s per accepted step before the creep, so it makes 1e-7 per step at 3.5e-8 to 5.6e-8 per second; below about 1e-7 per step the 50 digit route is faster. Needs python with rebound and mpmath.
//   newton-tol: settings.newton, the stopping tolerance of the corrector residual (1e-11 by default). The 279 components of every accepted step (u1, u2, t and the 23 node states) are written
//   to OUT.json.nodes.jsonl, one line {step, z} per accepted step, unless --no-nodes is given.
import fs from 'fs';
import { settings } from '../src/settings.js';
import { startRecorder } from '../src/ias/recorder.js';
import { stats as iasStats, gstats, pbStats } from '../src/ias/bridge.js';
import { huntArclength, huntNatural, closePerpMS } from '../src/shooting.js';
import { perpInfo, perpInitial, perpEL } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { relativeStability } from '../src/relative.js';
import { handoverFires, p100, backIndex, handoverAtStop, firedAtStop } from './handover-rule.mjs';
import { runHandover } from './handover-run.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--')), opt = {};
const KNOWN = ['minutes', 'pieces', 'label', 'max-dist', 'stop-below', 'stop-after', 'ias-mode', 'ias-first-step', 'newton-tol', 'no-nodes', 'timeout-min', 'python', 'guard-ratio', 'tol-scale', 'arc-weight', 'grow-iters', 'grow-factor', 'stop-lam', 'ls-reuse', 'mono-threads', 'perp-cap', 'reg-threads', 'ias-procs', 'fast', 'natural', 'handover', 'handover-below', 'handover-steps', 'handover-dlam', 'matrix', 'pieces-by', 'guards'];
for (const a of process.argv.slice(2)) if (a.startsWith('--')) { const eq = a.indexOf('='), k = eq < 0 ? a.slice(2) : a.slice(2, eq), v = eq < 0 ? undefined : a.slice(eq + 1); if (!KNOWN.includes(k)) { console.error('unknown option --' + k + '; the options are --' + KNOWN.join(', --')); process.exit(2); } opt[k] = v === undefined ? true : v; }
const [outArg, dirArg, u1A, u2A, lamA, tA] = pos;
const outFile = outArg ? path.resolve(outArg) : outArg;   // the children (reclose.py, the files next to OUT) run in the root of the repository
if (!outFile || !tA) { console.error('usage: node tools/family-follow-ias.mjs OUT.json DIR u1 u2 lam t [--minutes=120] [--pieces=24] [--label=name] [--max-dist=0.03] [--stop-below=0] [--stop-after=N] [--ias-mode=2] [--ias-first-step=timescale|legacy] [--newton-tol=1e-11] [--no-nodes] [--timeout-min=30] [--python=PY] [--guard-ratio=390] [--tol-scale=K] [--arc-weight=W] [--grow-iters=K] [--grow-factor=F] [--stop-lam=L] [--ls-reuse] [--mono-threads=K] [--perp-cap=F] [--reg-threads=K] [--ias-procs=K] [--fast=K] [--natural=DL] [--matrix=exact|fd-forward|fd-central] [--pieces-by=ias|reg] [--guards=record] [--handover [--handover-below=1e-7] [--handover-steps=20] [--handover-dlam=1e-5]]'); process.exit(2); }
for (const f of [outFile, outFile + '.partial.json', outFile + '.diag.jsonl', outFile + '.crash.json', outFile + '.nodes.jsonl', ...(opt.handover !== undefined ? [outFile + '.handover-reclose.job.json', outFile + '.handover-reclose.json', outFile + '.handover-back.job.json', outFile + '.handover-back.json', outFile + '.handover'] : [])]) if (fs.existsSync(f)) { console.error('exists, not overwriting: ' + f); process.exit(2); }
if (dirArg !== '1' && dirArg !== '-1') { console.error('DIR must be 1 or -1, not ' + dirArg); process.exit(2); }
const dir = Number(dirArg), minutes = Number(opt.minutes ?? 120), maxMs = minutes * 60000;
const pieces = Number(opt.pieces ?? 24), maxDist = opt['max-dist'] === undefined ? 0.03 : Number(opt['max-dist'] === 'inf' ? Infinity : opt['max-dist']);
for (const [k, low] of Object.entries({ minutes: false, pieces: false, 'stop-below': true, 'stop-after': false, 'ias-mode': true, 'newton-tol': false, 'timeout-min': false, 'guard-ratio': false, 'tol-scale': false, 'arc-weight': false, 'grow-iters': false, 'grow-factor': false, 'perp-cap': false, natural: false, 'handover-below': false, 'handover-steps': false, 'handover-dlam': false })) {
  if (opt[k] === undefined) continue;
  const v = Number(opt[k]);
  if (typeof opt[k] !== 'string' || opt[k] === '' || !Number.isFinite(v) || (low ? v < 0 : v <= 0)) { console.error('--' + k + ' needs a number' + (low ? ' of at least 0' : ' above 0') + ', as --' + k + '=VALUE, not ' + (opt[k] === true ? 'nothing' : opt[k])); process.exit(2); }
}
if (opt['perp-cap'] !== undefined && Number(opt['perp-cap']) > 1) { console.error('--perp-cap needs a number above 0 and at most 1, not ' + opt['perp-cap']); process.exit(2); }
if (opt['grow-iters'] !== undefined && !Number.isInteger(Number(opt['grow-iters']))) { console.error('--grow-iters needs a whole number, not ' + opt['grow-iters']); process.exit(2); }
if (opt['stop-lam'] !== undefined && (typeof opt['stop-lam'] !== 'string' || opt['stop-lam'] === '' || !Number.isFinite(Number(opt['stop-lam'])))) { console.error('--stop-lam needs a number, as --stop-lam=VALUE, not ' + (opt['stop-lam'] === true ? 'nothing' : opt['stop-lam'])); process.exit(2); }
if (!Number.isInteger(pieces) || pieces < 1 || pieces > 250) { console.error('--pieces needs a whole number from 1 to 250 (the shared buffer of src/ias/bridge.js holds 24 numbers per piece), not ' + opt.pieces); process.exit(2); }
if (opt['stop-after'] !== undefined && (!Number.isInteger(Number(opt['stop-after'])) || Number(opt['stop-after']) < 1)) { console.error('--stop-after needs a whole number of at least 1, not ' + opt['stop-after']); process.exit(2); }
if (opt['ias-mode'] !== undefined && (!Number.isInteger(Number(opt['ias-mode'])) || Number(opt['ias-mode']) > 3)) { console.error('--ias-mode needs a whole number from 0 to 3, not ' + opt['ias-mode']); process.exit(2); }
const stopBelow = Number(opt['stop-below'] ?? 0), stopAfter = opt['stop-after'] === undefined ? Infinity : Number(opt['stop-after']);
settings.integrator = 'ias';
if (opt['ias-mode'] !== undefined) settings.ias.adaptiveMode = Number(opt['ias-mode']);
if (opt.matrix !== undefined) { if (!['exact', 'fd-forward', 'fd-central'].includes(opt.matrix)) { console.error('--matrix must be exact, fd-forward or fd-central, not ' + opt.matrix); process.exit(2); } if (opt.matrix !== 'exact') settings.ias.matrix = opt.matrix; }
if (opt['pieces-by'] !== undefined) { if (!['ias', 'reg'].includes(opt['pieces-by'])) { console.error('--pieces-by must be ias or reg, not ' + opt['pieces-by']); process.exit(2); } settings.ias.piecesBy = opt['pieces-by']; }
if (opt['pieces-by'] === 'ias' && (opt.matrix === 'fd-forward' || opt.matrix === 'fd-central')) { console.error('--matrix=' + opt.matrix + ' cannot be used together with --pieces-by=ias (no reg.js matrix is built then)'); process.exit(2); }
if (opt.guards !== undefined) { if (opt.guards !== 'record') { console.error('--guards must be record, not ' + opt.guards); process.exit(2); } settings.ias.guards = 'record'; }
if (opt['ias-first-step'] !== undefined) { if (opt['ias-first-step'] !== 'legacy' && opt['ias-first-step'] !== 'timescale') { console.error('--ias-first-step must be legacy or timescale, not ' + opt['ias-first-step']); process.exit(2); } settings.ias.firstStep = opt['ias-first-step']; }
if (opt['newton-tol'] !== undefined) settings.newton = Number(opt['newton-tol']);
if (opt['timeout-min'] !== undefined) settings.ias.timeoutMs = Number(opt['timeout-min']) * 60000;
if (opt.python !== undefined) settings.ias.python = opt.python;
if (opt['guard-ratio'] !== undefined) settings.ias.guardRatio = Number(opt['guard-ratio']);
if (opt['tol-scale'] !== undefined) settings.tolScale = Number(opt['tol-scale']);
if (opt['reg-threads'] !== undefined) for (const o of ['pieces-by']) if (opt[o] !== undefined) { console.error('--reg-threads cannot be used together with --' + o); process.exit(2); }
if (opt['reg-threads'] !== undefined && opt.matrix !== undefined && opt.matrix !== 'exact') { console.error('--reg-threads cannot be used together with --matrix=' + opt.matrix); process.exit(2); }
if (opt.fast !== undefined) {
  const K = Number(opt.fast);
  if (typeof opt.fast !== 'string' || !Number.isInteger(K) || K < 1) { console.error('--fast needs a whole number of at least 1, as --fast=K, not ' + (opt.fast === true ? 'nothing' : opt.fast)); process.exit(2); }
  for (const o of ['ls-reuse', 'mono-threads', 'reg-threads', 'ias-procs', 'natural', 'pieces-by']) if (opt[o] !== undefined) { console.error('--fast cannot be used together with --' + o + ' (--fast sets --ls-reuse, --mono-threads, --reg-threads and --ias-procs itself)'); process.exit(2); }
  if (opt.matrix === 'fd-forward' || opt.matrix === 'fd-central') { console.error('--fast cannot be used together with --matrix=' + opt.matrix); process.exit(2); }
  settings.fast = K; settings.lsReuse = true; settings.monoThreads = K; settings.ias.regThreads = K; settings.ias.procs = K;
}
if (opt['mono-threads'] !== undefined) { const K = Number(opt['mono-threads']); if (typeof opt['mono-threads'] !== 'string' || !Number.isInteger(K) || K < 1) { console.error('--mono-threads needs a whole number of at least 1, as --mono-threads=K, not ' + (opt['mono-threads'] === true ? 'nothing' : opt['mono-threads'])); process.exit(2); } settings.monoThreads = K; }
if (opt['reg-threads'] !== undefined) { const K = Number(opt['reg-threads']); if (typeof opt['reg-threads'] !== 'string' || !Number.isInteger(K) || K < 1) { console.error('--reg-threads needs a whole number of at least 1, as --reg-threads=K, not ' + (opt['reg-threads'] === true ? 'nothing' : opt['reg-threads'])); process.exit(2); } settings.ias.regThreads = K; }
if (opt['ias-procs'] !== undefined) { const K = Number(opt['ias-procs']); if (typeof opt['ias-procs'] !== 'string' || !Number.isInteger(K) || K < 1) { console.error('--ias-procs needs a whole number of at least 1, as --ias-procs=K, not ' + (opt['ias-procs'] === true ? 'nothing' : opt['ias-procs'])); process.exit(2); } settings.ias.procs = K; }
if (opt['ls-reuse'] !== undefined) { if (opt['ls-reuse'] !== true) { console.error('--ls-reuse takes no value'); process.exit(2); } settings.lsReuse = true; }
if (opt['perp-cap'] !== undefined) settings.perpCap = Number(opt['perp-cap']);
if (opt['arc-weight'] !== undefined) settings.arcWeight = Number(opt['arc-weight']);
if (opt['grow-iters'] !== undefined) settings.growIters = Number(opt['grow-iters']);
if (opt['grow-factor'] !== undefined) settings.growFactor = Number(opt['grow-factor']);
if (opt['stop-lam'] !== undefined) settings.stopLam = Number(opt['stop-lam']);
const hunt = opt.natural !== undefined ? huntNatural : huntArclength;
const handover = opt.handover !== undefined, hBelow = Number(opt['handover-below'] ?? 1e-7), hSteps = Number(opt['handover-steps'] ?? 20), hDlam = Number(opt['handover-dlam'] ?? 1e-5);
if (handover && !(hBelow > 0 && Number.isInteger(hSteps) && hSteps >= 2 && hDlam > 0)) { console.error('--handover-below and --handover-dlam must be positive and --handover-steps a whole number of at least 2'); process.exit(2); }
const recorder = startRecorder(outFile);
const nodesFd = opt['no-nodes'] ? null : fs.openSync(outFile + '.nodes.jsonl', 'wx');
const start = { u1: +u1A, u2: +u2A, lam: +lamA, t: +tA };
const s0 = closePerpMS(start.u1, start.u2, start.lam, start.t, { m: pieces });
const shifted = s0 && s0.res < 1e-9 ? { u1: s0.u1, u2: s0.u2, lam: s0.lam, t: s0.t, m: pieces } : null;
const out = { label: opt.label || null, dir, start, shifted, minutesLimit: minutes, settings: { ...settings, observer: undefined }, options: { pieces, maxDist, stopBelow, stopAfter, ...(opt['stop-lam'] !== undefined ? { stopLam: Number(opt['stop-lam']) } : {}), ...(opt.natural !== undefined ? { natural: Number(opt.natural), note: 'natural continuation in lam, zeros of theta are not looked for' } : {}) } };
if (!shifted) {
  out.error = 'could not move the start onto the family'; out.bridge = { ...iasStats }; out.guards = { ...gstats, tripList: gstats.tripList }; out.lastBridgeReason = iasStats.lastReason;
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.error(out.error + '; bridge: ' + iasStats.calls + ' calls, ' + iasStats.errors + ' errors, ' + iasStats.timeouts + ' timeouts, last reason: ' + (iasStats.lastReason || 'none') + '; guard trips ' + gstats.tripsTotal);
  process.exit(1);
}
const pts = [], keys = [];
const unrec = []; out.unrec = unrec;   // accepted steps that are not recorded as points
process.on('uncaughtException', (e) => { try { fs.writeFileSync(outFile + '.crash.json', JSON.stringify({ ...out, error: String(e && e.stack), points: pts })); recorder.flush(); } catch (e2) {} process.exit(3); });
let stop = null;
let traceStop = null, r;
const traceBase = (step, lam, th, h, it, Y) => {
    const n = Y.length - 1, u1 = Y[0], u2 = Y[1], t = Y[2];
    if (nodesFd !== null) fs.writeSync(nodesFd, JSON.stringify({ step, z: Array.from(Y.slice(0, n)) }) + '\n');
    const key = [u1, u2, t, lam];
    const kl = keys.length ? keys[keys.length - 1] : null; const cum = kl ? kl.cum + Math.hypot(key[0] - kl.k[0], key[1] - kl.k[1], key[2] - kl.k[2], key[3] - kl.k[3]) : 0;   // path length along the accepted points
    if (step > 60) for (let i = 0; i < keys.length; i++) {
      const q = keys[i].k;
      if (Math.hypot(key[0] - q[0], key[1] - q[1], key[2] - q[2], key[3] - q[3]) < 1e-4 && cum - keys[i].cum >= 0.01) { stop = 'closed loop'; out.loop = { matchedIndex: i, path: cum - keys[i].cum, distance: Math.hypot(key[0] - q[0], key[1] - q[1], key[2] - q[2], key[3] - q[3]) }; return true; }   // a match needs a path of 0.01 or more between the points
    }
    keys.push({ k: key, cum });
    const el = perpEL(u1, u2, Y[n], t);
    const info = perpInfo(u1, u2, Y[n], t, settings.perpCap ?? 1);
    if (!info) { unrec.push({ step, lam: Y[n], u1, u2, t, Tstar: el.ts, Lstar: Math.abs(el.ls), reason: 'perpInfo null' }); return false; }
    const p = { step, lam: Y[n], u1, u2, t, Tstar: el.ts, Lstar: Math.abs(el.ls), theta: th, turns: th / (2 * Math.PI), minDist: info.minDist, closure: info.repeatErr };
    if (pts.length % 5 === 0) {
      const w = syzygyWord(perpInitial(u1, u2, Y[n]), 2 * t);
      let st = null;
      try { st = relativeStability(u1, u2, Y[n], t); } catch (e) { p.stabilityError = String(e && e.message || e); out.stabilityErrors = (out.stabilityErrors || 0) + 1; }
      p.word = w ? w.word : null; p.root = w ? w.root : null; p.power = w ? w.power : null; p.maxMod = st ? st.maxMod : null;
    }
    pts.push(p);
    if (pts.length % 5 === 0) fs.writeFileSync(outFile + '.partial.json', JSON.stringify({ ...out, points: pts, partial: true }));
    if (pts.length >= stopAfter) { stop = 'stopped after ' + pts.length + ' recorded points'; return true; }
    if (info.minDist < stopBelow) { stop = 'close approach (closest distance ' + info.minDist.toFixed(4) + ')'; return true; }
    if (p.Lstar < 1e-3) { stop = 'L* reached 0'; return true; }
    if (info.minDist > maxDist) { stop = 'left the region (closest approach above ' + maxDist + ')'; return true; }
    return false;
};
const lams = [shifted.lam], pars = [{ u1: shifted.u1, u2: shifted.u2, t: shifted.t }]; const steps = [0]; let fired = null;   // --handover: the lam and (u1, u2, t) of the start and of every accepted step, and the loop step of every accepted step (steps[0] = 0)
const traceHand = (step, lam, th, h, it, Y) => {
  if (traceBase(step, lam, th, h, it, Y) === true) return true;
  lams.push(lam); pars.push({ u1: Y[0], u2: Y[1], t: Y[2] }); steps.push(step);
  if (!handoverFires(lams, hBelow)) return false;
  fired = { p100: p100(lams), below: hBelow, accepted_steps: lams.length - 1, loop_step: step, lam, lam_step: lam - lams[lams.length - 2], u1: Y[0], u2: Y[1], t: Y[2], back: null };
  const j = backIndex(lams);
  if (j !== null) fired.back = { index: j, lam: lams[j], ...pars[j] };
  stop = 'handed over to the 50 digit continuation'; return true;
};
try { r = hunt(shifted.u1, shifted.u2, shifted.lam, shifted.t, { m: shifted.m, dir, force: true, maxMs, all: true, hMax: 0.2, maxSteps: 6000, dl0: Number(opt.natural), trace: handover ? traceHand : traceBase });
} catch (e) { if (e && e.isTraceStop) { stop = e.reason; traceStop = { reason: e.reason, info: e.info || null }; r = { steps: null, lamMin: null, lamMax: null }; } else throw e; }   // the bridge or the recorder ends the trace (guard, missed flag, failure of reg.js)
const zeros = (r.orbits || (r.ok && r.info ? [r] : [])).map((o) => ({ lam: o.lam, u1: o.u1, u2: o.u2, t: o.t, Tstar: o.info.ts, Lstar: Math.abs(o.info.ls), closure: o.info.repeatErr, minDist: o.info.minDist }));
out.why = stop || r.why || (zeros.length ? 'zero of theta' : 'unknown');
out.bridge = { ...iasStats }; out.guards = { ...gstats, tripList: gstats.tripList }; out.traceStop = traceStop; if (settings.ias.piecesBy) out.piecesBy = { mode: settings.ias.piecesBy, ...pbStats }; out.steps = r.steps; out.lamMin = r.lamMin; out.lamMax = r.lamMax; out.points = pts; out.zeros = zeros;
let handoverFailed = null, trigger = { kind: 'rule' };
if (handover && !fired && handoverAtStop(out.why)) {   // the guard stop and the "lost the family" stop: hand over from the last accepted step
  out.whyBeforeHandover = out.why;
  fired = firedAtStop(lams, pars, steps, hBelow);
  trigger = { kind: 'stop', reason: out.whyBeforeHandover };
  if (!fired) {
    out.handover = { trigger: 'stop', stop_before: out.whyBeforeHandover, failed: 'no accepted step before the stop: no tangent' };
    out.why = 'hand-over failed: no accepted step before the stop: no tangent'; handoverFailed = out.why;
  }
}
if (fired) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const h = runHandover({ fired, trigger, dir, hBelow, hSteps, hDlam, base: outFile + '.handover', root, python: settings.ias.python, onStart: (hv) => { out.handover = hv; fs.writeFileSync(outFile + '.partial.json', JSON.stringify({ ...out, points: pts, partial: true })); } });
  out.why = h.why;
  if (h.failed) handoverFailed = h.why;
  const lamsDone = h.hv.steps.filter((s) => s.converged).map((s) => Number(s.lam));
  out.lamMinWithHandover = Math.min(r.lamMin ?? Infinity, ...lamsDone);   // the range of lam with the converged 50 digit steps (in either direction)
  out.lamMaxWithHandover = Math.max(r.lamMax ?? -Infinity, ...lamsDone);
}
fs.writeFileSync(outFile, JSON.stringify(out));
recorder.flush(); if (iasStats.errors || iasStats.timeouts) console.log('bridge: ' + iasStats.errors + ' errors, ' + iasStats.timeouts + ' timeouts, last reason: ' + iasStats.lastReason);
console.log(outFile, 'dir', dir, '|', out.why, '|', pts.length, 'points, lam', r.lamMin, 'to', r.lamMax, '|', zeros.length, 'zeros of theta');
if (handoverFailed) { console.error(handoverFailed); process.exit(1); }
process.exit(0);

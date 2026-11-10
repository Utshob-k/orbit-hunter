// SPDX-License-Identifier: MIT
// tools/handover-continue.py (tangent first guess, test of every step, return test) with fake tools/reclose.py and tools/witness.py (python scripts in a temporary tools folder beside a copy of the script).
// The fake re-closing returns the point of a known smooth curve (u1, u2, t of lam) at the lam of the job, whatever the guess is, and can be told to misbehave per job (FAKE_PLAN: attempt name -> e4 (t not positive, exit 4),
// e5 (first residual above limit, exit 5), noconv, neg (converged with t < 0), none (no output, exit 7); "*" = every job; "return": retfail = a return solution 1e-5 off) and to jump in t beyond a lam (FAKE_JUMP).
// Checked: the first guess is z + d T and the second the secant; a jump beyond a lam is rejected by the ratio and d / 10 is accepted (and kept: no step growth); exit 4 and exit 5 jobs are rejected and the run goes on; a
// run that never converges stops at --min-dlam; a missing output stops the run; a failed return test is not a hand-over; |lam| >= 1 stops without a job; an existing OUTDIR, --steps 1 and an unconverged Z.json are refused
// with exit status 2; the witness runs only when handed over and not with --no-witness, from a job of 40 digit strings with --preset w1b --exact-start. needs python with mpmath (settings.ias.python), takes a few seconds.
// Also checked (the fake writes its arguments into its output as argv; FAKE_PLAN "badjson" writes an output that is not valid JSON, a plan key of two letters ("mr") covers every job of that kind; FAKE_MISS
// {"from": N, "frac": f} makes attempt N and later return the guess times 1 + f P, with P the largest relative change of the guess from the last accepted solution, so miss / predicted stays near f whatever d is;
// FAKE_WEXIT is the exit status of the fake witness): --max-first 0.1 for the attempts only, --conv only when given, the guess of the return job, a start step that is not a decade multiple of --min-dlam
// (and --floor-try), a failed witness, a stop after exactly 2 accepted steps, --miss-norm, --return-last, --miss-return, a LAMZ that does not match Z.json, an output that is not valid JSON, an exact zero
// component, --edge-shrink, dz_cos and reversed.
// Since FIX06: an attempt output that is not valid JSON stops the run (stopped 'attempt N: output of LABEL_aNN not valid JSON (exit E)'); a Z.json that is a JSON list, a u1 that is not a number and bad
// --conv values (0x10, 1e-5, abc) are refused with exit 2 and no OUTDIR; --miss-norm is the rms of the per component relative values (also with a zero component left out); the --miss-return check job
// gets the line through b and the rejected solution at the lam of a as its guess (compared in its job file), and records guess_dist and first_residual (so does the return job).
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const python = settings.ias.python;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-hc-test-'));
const tools = path.join(tmp, 'tools'); fs.mkdirSync(tools);
fs.copyFileSync(path.join(root, 'tools', 'handover-continue.py'), path.join(tools, 'handover-continue.py'));
fs.writeFileSync(path.join(tools, 'reclose.py'), `
import sys, os, json
job = json.load(open(sys.argv[1])); out = sys.argv[2]
lam = float(job['lam'])
curve = lambda l: [0.5 + l, 2 - 3 * l + l * l, 10 + 5 * l + 4 * l * l]
plan = json.loads(os.environ.get('FAKE_PLAN', '{}'))
key = job['id'].split('_')[-1]
how = plan.get(key, plan.get(key[:2], plan.get('*', 'ok')))
def write(d): d['argv'] = sys.argv[3:]; json.dump(d, open(out, 'w'))
if how == 'none': sys.exit(7)
if how == 'badjson': open(out, 'w').write('{"status": "done", "u1": '); sys.exit(0)
if how == 'e4': write(dict(status='t not positive', converged=False, t='-1.5', iterations=[{'residual': 0.3}])); sys.exit(4)
if how == 'e5': write(dict(status='first residual above limit', converged=False, residual=0.5, iterations=[{'residual': 0.5}])); sys.exit(5)
v = curve(lam)
if 'FAKE_JUMP' in os.environ and lam > float(os.environ['FAKE_JUMP']): v[2] += 5
if how == 'retfail': v[2] *= 1 + 1e-5
if how == 'neg': v[2] = -5.0
miss = json.loads(os.environ.get('FAKE_MISS', 'null'))
if miss and job.get('ref') is None and key[0] == 'a' and int(key[1:]) >= miss['from']:
    c = json.load(open(os.path.join(os.path.dirname(out), 'c_continue.json')))
    bl = float(c['steps'][-1]['lam']) if c['steps'] else float(c['lam0'])
    g = [float(job[k]) for k in ('u1', 'u2', 't')]; P = max(abs(x - y) / abs(y) for x, y in zip(g, curve(bl)))
    v = [x * (1 + miss['frac'] * P) for x in g]
d = dict(status='done', converged=how != 'noconv', residual=1e-20 if how != 'noconv' else 1e-3, u1=repr(v[0]), u2=repr(v[1]), t=repr(v[2]), iterations=[{'residual': 0.01}, {'residual': 1e-8}, {'residual': 1e-20}], same_orbit=None)
if job.get('ref'):
    r = job['ref']; dif = {k: abs(x - float(r[k])) / (abs(float(r[k])) or 1) for k, x in zip(('u1', 'u2', 't'), v)}
    d.update(rel_diff_ref=dif, same_orbit=bool(max(dif.values()) <= 1e-9))
write(d)
`);
fs.writeFileSync(path.join(tools, 'witness.py'), `
import sys, os, json
json.dump(dict(status='done', dmin=0.1, argv=sys.argv[3:]), open(sys.argv[2], 'w'))
sys.exit(int(os.environ.get('FAKE_WEXIT', '0')))
`);
const curve = (l) => [0.5 + l, 2 - 3 * l + l * l, 10 + 5 * l + 4 * l * l];
const strs = (v) => ({ status: 'done', converged: true, u1: String(v[0]), u2: String(v[1]), t: String(v[2]) });
let n = 0;
const go = (lamz, lamback, args, env = {}, zv = null) => {
  const id = 'r' + n++, outdir = path.join(tmp, id);
  const zf = path.join(tmp, id + '-z.json'), bf = path.join(tmp, id + '-back.json');
  fs.writeFileSync(zf, JSON.stringify(zv || strs(curve(lamz)))); fs.writeFileSync(bf, JSON.stringify(strs(curve(lambackNum(lamback)))));
  const r = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf, String(lamz), bf, String(lamback), outdir, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  const cf = path.join(outdir, 'c_continue.json');
  return { exit: r.status, stderr: r.stderr, outdir, res: fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : null, has: (f) => fs.existsSync(path.join(outdir, f)), job: (f) => JSON.parse(fs.readFileSync(path.join(outdir, f), 'utf8')) };
};
const lambackNum = (x) => Number(x);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const LZ = 0.3, LB = 0.2999;

// the working case: tangent guess first, secant after, return test passes, witness runs
let r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3']);
const z = curve(LZ), back = curve(LB), T = z.map((x, i) => (x - back[i]) / (LZ - LB));
const j1 = r.job('c_a01.job.json'), g1 = [j1.u1, j1.u2, j1.t].map(Number), want1 = z.map((x, i) => x + 1e-3 * T[i]);
check('the first guess is z + d T', Math.max(...g1.map((x, i) => rel(x, want1[i]))) < 1e-10, `largest relative difference ${Math.max(...g1.map((x, i) => rel(x, want1[i]))).toExponential(1)}`);
const s1 = [r.job('c_a01.out.json').u1, r.job('c_a01.out.json').u2, r.job('c_a01.out.json').t].map(Number), j2 = r.job('c_a02.job.json'), g2 = [j2.u1, j2.u2, j2.t].map(Number);
const want2 = s1.map((x, i) => x + (x - z[i]));
check('the second guess is the secant through z and the first solution', Math.max(...g2.map((x, i) => rel(x, want2[i]))) < 1e-10, `largest relative difference ${Math.max(...g2.map((x, i) => rel(x, want2[i]))).toExponential(1)}`);
check('job files: ref null, lam of the attempt, names LABEL_aNN', j1.ref === null && Math.abs(Number(j1.lam) - 0.301) < 1e-12 && r.has('c_a03.out.json') && r.has('c_a03.stdout'));
check('3 steps accepted, 3 attempts, handed over, return PASS, witness done, exit status 0', r.exit === 0 && r.res.steps.length === 3 && r.res.attempts.length === 3 && r.res.attempts.every((a) => a.accepted) && r.res.handed_over && r.res.return.pass && r.res.witness.exists && r.has('c_w1.out.json') && r.res.stopped === null, `exit ${r.exit}`);
const wjob = r.job('c_w1.job.json'), wout = r.job('c_w1.out.json');
check('the witness job holds u1, u2, lam, t as strings (nstr, 40 digits) and runs with --preset w1b --exact-start', ['u1', 'u2', 'lam', 't'].every((k) => typeof wjob[k] === 'string') && Math.abs(Number(wjob.lam) - 0.303) < 1e-12 && Math.abs(Number(wjob.t) - curve(0.303)[2]) < 1e-9 && wout.argv.join(' ') === '--preset w1b --exact-start --minutes 30', JSON.stringify(wout.argv) + ' lam ' + wjob.lam);
check('the return job has z as reference and no --max-first', r.job('c_return.job.json').ref.t === String(z[2]) && r.res.return.max_rel_diff_ref < 1e-9);
check('the steps list has the file, predicted, miss and ratio', r.res.steps[0].file === 'c_a01.out.json' && r.res.steps[0].predicted > 0 && r.res.steps[0].miss >= 0 && r.res.steps[0].ratio < 0.1 && r.res.dlam_requested === '0.001' && r.res.tangent.length === 3);

// a jump in t beyond a lam: rejected by the ratio, d / 10 is accepted and kept
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--no-witness'], { FAKE_JUMP: String(LZ + 5e-4) });
const A = r.res.attempts;
check('the jump is rejected by the ratio, d / 10 accepted and kept for the later steps (no growth)', r.exit === 0 && !A[0].accepted && A[0].ratio > 0.1 && /above/.test(A[0].reason) && A[1].accepted && Math.abs(Number(A[1].d) - 1e-4) < 1e-15 && A.slice(1).every((a) => a.accepted && a.d === A[1].d) && r.res.steps.length === 3, JSON.stringify(A.map((a) => [a.accepted, a.d])));
check('--no-witness: no witness job, exit status 0', !r.has('c_w1.job.json') && r.res.witness === null && r.res.handed_over);

// exit 4 and exit 5 are rejected, a converged solution with t < 0 too, the run goes on
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness'], { FAKE_PLAN: JSON.stringify({ a01: 'e4', a02: 'e5', a03: 'neg' }) });
const B = r.res.attempts;
check('exit 4 (t not positive), exit 5 (first residual above limit) and a converged t < 0 are rejected; d / 10 each time', B.length === 5 && B[0].status === 't not positive' && B[0].exit === 4 && B[1].status === 'first residual above limit' && B[1].exit === 5 && B[2].reason === 't not positive' && B.slice(0, 3).every((a) => !a.accepted) && B[3].accepted && Math.abs(Number(B[3].d) - 1e-6) < 1e-15, JSON.stringify(B.map((a) => [a.status, a.accepted])));

// never converging: stops at --min-dlam
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--min-dlam', '1e-5', '--no-witness'], { FAKE_PLAN: JSON.stringify({ '*': 'noconv' }) });
check('never converging: 3 attempts (1e-3, 1e-4, 1e-5), stops below --min-dlam, not handed over, exit status 1', r.exit === 1 && r.res.attempts.length === 3 && /min-dlam/.test(r.res.stopped) && !r.res.handed_over && r.res.return === null && r.res.attempts.every((a) => a.reason && /not converged/.test(a.reason)), `stopped: ${r.res.stopped}`);

// no output at all
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3'], { FAKE_PLAN: JSON.stringify({ a01: 'none' }) });
check('reclose.py without output: the run stops with the exit status, not handed over, exit status 1', r.exit === 1 && r.res.attempts.length === 1 && /no output \(exit 7\)/.test(r.res.stopped) && !r.res.handed_over && !r.has('c_w1.job.json'), `stopped: ${r.res.stopped}`);

// the return test fails
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3'], { FAKE_PLAN: JSON.stringify({ return: 'retfail' }) });
check('return test fails (1e-5 off): not handed over, no witness, exit status 1, two steps still listed', r.exit === 1 && r.res.steps.length === 2 && r.res.return && r.res.return.pass === false && r.res.return.max_rel_diff_ref > 1e-9 && !r.res.handed_over && !r.has('c_w1.job.json') && r.res.witness === null);

// |lam| reaches 1: no job
r = go(0.9999, 0.9998, ['--steps', '2', '--dlam', '1e-3']);
check('|lam| would reach 1: stops with the reason, no job, exit status 1', r.exit === 1 && /reach 1/.test(r.res.stopped) && r.res.attempts.length === 0 && !fs.readdirSync(r.outdir).some((f) => f.endsWith('.job.json')), `stopped: ${r.res.stopped}`);

// the arguments of the jobs: --max-first 0.1 for the attempts only, no --conv unless given; the guess of the return job; dz_cos and reversed; dlam_accepted, steps_done, steps_wanted
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--no-witness']);
const argvOf = (f) => r.job(f).argv.join(' ');
check('attempt jobs get --max-first 0.1, the return job no --max-first, no job gets --conv by default', ['c_a01', 'c_a02', 'c_a03'].every((f) => / --max-first 0\.1/.test(argvOf(f + '.out.json'))) && !/max-first/.test(argvOf('c_return.out.json')) && !['c_a01', 'c_a02', 'c_a03', 'c_return'].some((f) => /--conv/.test(argvOf(f + '.out.json'))), argvOf('c_a01.out.json') + ' | ' + argvOf('c_return.out.json'));
{
  const o1 = r.job('c_a01.out.json'), o2 = r.job('c_a02.out.json'), jr = r.job('c_return.job.json');
  const p1 = [o1.u1, o1.u2, o1.t].map(Number), p2 = [o2.u1, o2.u2, o2.t].map(Number), l1 = LZ + 1e-3, l2 = LZ + 2e-3, k = (LZ - l1) / (l2 - l1);
  const want = p1.map((x, i) => x + k * (p2[i] - x)), got = [jr.u1, jr.u2, jr.t].map(Number), dev = Math.max(...got.map((x, i) => rel(x, want[i])));
  check('the guess of the return job is the line through the first two solutions at LAMZ', dev < 1e-12 && Math.abs(Number(jr.lam) - LZ) < 1e-15, `largest relative difference ${dev.toExponential(1)}`);
}
check('dz_cos is null for the first step and near 1 later, reversed false; dlam_accepted, steps_done 3, steps_wanted 3, measure per component, lam_check "no lam in file"', r.res.steps[0].dz_cos === null && r.res.steps[0].reversed === null && r.res.steps.slice(1).every((s) => s.dz_cos > 0.99 && s.reversed === false) && r.res.dlam_accepted === '0.001' && r.res.steps_done === 3 && r.res.steps_wanted === 3 && r.res.measure === 'per component' && r.res.lam_check.z === 'no lam in file' && r.res.options.floor_try === false && !('return_last' in r.res), JSON.stringify(r.res.steps.map((s) => s.dz_cos)));
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--conv', '1e-24']);
check('--conv 1e-24 reaches every job of the run (attempts and return)', ['c_a01', 'c_a02', 'c_return'].every((f) => / --conv 1e-24/.test(r.job(f + '.out.json').argv.join(' '))) && r.res.options.conv === '1e-24' && r.res.handed_over, r.job('c_a01.out.json').argv.join(' '));

// a start step that is not --min-dlam times a power of ten: without --floor-try the floor is never tried, with it it is
r = go(LZ, LB, ['--steps', '2', '--dlam', '6.4e-4', '--min-dlam', '1e-4', '--no-witness'], { FAKE_PLAN: JSON.stringify({ '*': 'noconv' }) });
check('--dlam 6.4e-4 --min-dlam 1e-4 without --floor-try: one attempt, stops without trying 1e-4', r.exit === 1 && r.res.attempts.length === 1 && /below --min-dlam/.test(r.res.stopped), `stopped: ${r.res.stopped}`);
r = go(LZ, LB, ['--steps', '2', '--dlam', '6.4e-4', '--min-dlam', '1e-4', '--no-witness', '--floor-try'], { FAKE_PLAN: JSON.stringify({ '*': 'noconv' }) });
check('the same with --floor-try: the second attempt is at 1e-4, then the stop', r.exit === 1 && r.res.attempts.length === 2 && Math.abs(Number(r.res.attempts[1].d) - 1e-4) < 1e-18 && /was rejected/.test(r.res.stopped) && /below --min-dlam/.test(r.res.stopped), `stopped: ${r.res.stopped} d ${r.res.attempts.map((a) => a.d)}`);
r = go(LZ, LB, ['--steps', '2', '--dlam', '6.4e-4', '--min-dlam', '1e-4', '--no-witness', '--floor-try'], { FAKE_PLAN: JSON.stringify({ a01: 'noconv' }) });
check('--floor-try: a step accepted at the floor goes on at the floor', r.exit === 0 && r.res.handed_over && r.res.attempts.length === 3 && r.res.attempts.slice(1).every((a) => a.accepted && Math.abs(Number(a.d) - 1e-4) < 1e-18) && r.res.dlam_accepted === r.res.attempts[2].d, r.res.attempts.map((a) => a.d).join(' '));

// a witness that exits with 1: handed over, but exit status 1
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3'], { FAKE_WEXIT: '1' });
check('a failed witness (exit 1): handed over, witness exit 1 recorded, exit status 1', r.exit === 1 && r.res.handed_over && r.res.witness && r.res.witness.exit === 1, `exit ${r.exit}`);

// a stop after exactly 2 accepted steps (of 3 wanted): the return test runs and can hand over
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--min-dlam', '1e-4', '--no-witness'], { FAKE_PLAN: JSON.stringify({ a03: 'noconv', a04: 'noconv' }) });
check('a stop after exactly 2 accepted steps: return run, handed over, steps_done 2 of steps_wanted 3, stopped set, dlam_last the rejected d, dlam_accepted 1e-3', r.exit === 0 && r.res.steps.length === 2 && r.res.steps_done === 2 && r.res.steps_wanted === 3 && r.res.return && r.res.return.pass && r.res.handed_over && /min-dlam/.test(r.res.stopped) && r.res.dlam_last === '0.0001' && r.res.dlam_accepted === '0.001', `stopped: ${r.res.stopped} dlam_last ${r.res.dlam_last}`);

// --miss-norm: predicted is the root mean square of the per component relative values (g_k - b_k) / b_k
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--miss-norm']);
{
  const j = r.job('c_a01.job.json'), g = [j.u1, j.u2, j.t].map(Number), want = Math.sqrt(g.reduce((s, x, i) => s + ((x - z[i]) / z[i]) ** 2, 0) / 3);
  check('--miss-norm: predicted = the rms of (g_k - z_k) / z_k, measure recorded, handed over', rel(r.res.attempts[0].predicted, want) < 1e-9 && r.res.measure === 'rms of the per component relative values' && r.res.handed_over, `predicted ${r.res.attempts[0].predicted} want ${want}`);
}

// --return-last: pass, and fail with a wrong solution of that job
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--no-witness', '--return-last']);
{
  const jl = r.job('c_return_last.job.json'), o2 = r.job('c_a02.out.json'), o3 = r.job('c_a03.out.json'), o1 = r.job('c_a01.out.json');
  const p2 = [o2.u1, o2.u2, o2.t].map(Number), p3 = [o3.u1, o3.u2, o3.t].map(Number), l1 = LZ + 1e-3, l2 = LZ + 2e-3, l3 = LZ + 3e-3, k = (l1 - l2) / (l3 - l2);
  const want = p2.map((x, i) => x + k * (p3[i] - x)), got = [jl.u1, jl.u2, jl.t].map(Number), dev = Math.max(...got.map((x, i) => rel(x, want[i])));
  check('--return-last: the line through steps 2 and 3 at the lam of step 1, step 1 as reference, no --max-first; PASS, handed over', r.res.return_last && r.res.return_last.pass === true && r.res.return.pass && r.res.handed_over && dev < 1e-12 && Math.abs(Number(jl.lam) - l1) < 1e-15 && jl.ref.t === o1.t && !/max-first/.test(r.job('c_return_last.out.json').argv.join(' ')), `dev ${dev.toExponential(1)}`);
}
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--no-witness', '--return-last'], { FAKE_PLAN: JSON.stringify({ last: 'retfail' }) });
check('--return-last FAIL: first return passes, second fails, not handed over, exit status 1', r.exit === 1 && r.res.return.pass && r.res.return_last.pass === false && !r.res.handed_over);
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--return-last']);
check('--return-last with 2 accepted steps: no second return (noted), the first decides', r.exit === 0 && r.res.handed_over && r.res.return_last.pass === null && /fewer than 3/.test(r.res.return_last.note) && !r.has('c_return_last.job.json'));

// --miss-return: the solutions of attempt 3 and later miss the guess by about 0.15 x predicted whatever d is (the case of MAPS1 a14m)
const MISS = { FAKE_MISS: JSON.stringify({ from: 3, frac: 0.15 }) };
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--min-dlam', '1e-6', '--no-witness'], MISS);
check('a constant miss ratio 0.15: by default every smaller step is rejected and the run stops at the floor (2 of 3 steps)', r.res.steps.length === 2 && /min-dlam/.test(r.res.stopped) && r.res.attempts.slice(2).every((a) => !a.accepted && a.ratio > 0.14 && a.ratio < 0.16) && r.res.attempts.length === 6 && !r.res.attempts.some((a) => a.miss_return), r.res.attempts.map((a) => a.ratio && a.ratio.toFixed(3)).join(' '));
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--min-dlam', '1e-6', '--no-witness', '--miss-return'], MISS);
{
  const a5 = r.res.attempts[4] || {};
  check('--miss-return: no check at d = D and D / 10, at D / 100 the check job c_mr05 comes back to step 1 and the attempt is accepted; handed over', r.exit === 0 && r.res.handed_over && r.res.steps.length === 3 && r.res.attempts.length === 5 && !r.res.attempts[2].miss_return && !r.res.attempts[3].miss_return && a5.accepted && a5.accepted_by === 'miss-return check' && a5.miss_return && a5.miss_return.pass && a5.miss_return.file === 'c_mr05.out.json' && r.res.steps[2].accepted_by === 'miss-return check' && r.job('c_mr05.job.json').ref.t === r.job('c_a01.out.json').t && Math.abs(Number(r.job('c_mr05.job.json').lam) - (LZ + 1e-3)) < 1e-15 && !/max-first/.test(r.job('c_mr05.out.json').argv.join(' ')), JSON.stringify(r.res.attempts.map((a) => [a.d, a.accepted, a.accepted_by || null])));
}
{
  // the guess of the check job c_mr05: the line through b (step 2, c_a02) and the rejected solution of attempt 5 at the lam of a (step 1, c_a01); guess_dist and first_residual
  const num = (f) => { const o = r.job(f); return [o.u1, o.u2, o.t].map(Number); };
  const va = num('c_a01.out.json'), vb = num('c_a02.out.json'), vs = num('c_a05.out.json'), la = LZ + 1e-3, lb = LZ + 2e-3, ls = lb + 1e-5, k = (la - lb) / (ls - lb);
  const want = vb.map((x, i) => x + k * (vs[i] - x)), got = num('c_mr05.job.json'), dev = Math.max(...got.map((x, i) => rel(x, want[i])));
  const mr = (r.res.attempts[4] || {}).miss_return || {}, gd = Math.max(...want.map((x, i) => rel(x, va[i])));
  check('--miss-return: the check job guess is the line through b and the rejected solution at the lam of a; guess_dist and first_residual recorded (first_residual on the return too)', dev < 1e-9 && Math.abs(Number(r.job('c_mr05.job.json').lam) - la) < 1e-15 && typeof mr.guess_dist === 'number' && rel(mr.guess_dist, gd) < 1e-6 && mr.first_residual === 0.01 && r.res.return.first_residual === 0.01,
    `dev ${dev.toExponential(1)} guess_dist ${mr.guess_dist} want ${gd} first_residual ${mr.first_residual}`);
}
r = go(LZ, LB, ['--steps', '3', '--dlam', '1e-3', '--min-dlam', '1e-6', '--no-witness', '--miss-return'], { ...MISS, FAKE_PLAN: JSON.stringify({ mr: 'retfail' }) });
check('--miss-return with a check job that returns a different orbit: the attempt stays rejected (check recorded), the run stops as without the option', r.res.steps.length === 2 && /min-dlam/.test(r.res.stopped) && r.res.attempts[4] && !r.res.attempts[4].accepted && r.res.attempts[4].miss_return && r.res.attempts[4].miss_return.pass === false && /miss/.test(r.res.attempts[4].reason), JSON.stringify(r.res.attempts.map((a) => [a.d, a.accepted])));
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--safe']);
check('--safe turns on the five options (not --conv)', r.res.handed_over && ['floor_try', 'miss_norm', 'return_last', 'miss_return', 'edge_shrink'].every((k) => r.res.options[k] === true) && r.res.options.conv === null);

// LAMZ against the lam of Z.json; an output that is not valid JSON; an exact zero component
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness'], {}, { ...strs(z), lam: '0.3000001' });
check('LAMZ that does not match the lam of Z.json: exit status 2, nothing written', r.exit === 2 && /does not agree/.test(r.stderr) && !fs.existsSync(r.outdir), `exit ${r.exit}`);
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness'], {}, { ...strs(z), lam: '0.3000000000000000000000000' });
check('a lam of Z.json with 25 digits that agrees: accepted, lam_check recorded', r.exit === 0 && r.res.lam_check.z === 'agrees to 1e-24' && r.res.lam_check.back === 'no lam in file');
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness'], { FAKE_PLAN: JSON.stringify({ a01: 'badjson' }) });
check('an attempt output that is not valid JSON stops the run with that reason, no further attempt, not handed over, exit status 1', r.exit === 1 && r.res.attempts.length === 1 && r.res.attempts[0].reason === 'output of c_a01 not valid JSON (exit 0)' && !r.res.attempts[0].accepted && r.res.stopped === 'attempt 1: output of c_a01 not valid JSON (exit 0)' && !r.res.handed_over && r.res.return === null && !r.has('c_a02.job.json'), JSON.stringify(r.res.attempts[0]) + ' stopped: ' + r.res.stopped);
r = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness'], { FAKE_PLAN: JSON.stringify({ return: 'badjson' }) });
check('a return output that is not valid JSON: return failed with that reason, not handed over', r.exit === 1 && r.res.return && r.res.return.pass === false && r.res.return.reason === 'output not valid JSON' && !r.res.handed_over);
r = go(-0.5, -0.5001, ['--steps', '2', '--dlam', '1e-3', '--no-witness']);
check('an exact zero component of z (u1 = 0 at lam -0.5): no crash, that component left out (measure_note), handed over', r.exit === 0 && r.res.attempts[0].measure_note === 'zero component left out' && r.res.handed_over && r.res.attempts[0].predicted > 0, `exit ${r.exit} ${r.stderr.slice(-200)}`);

r = go(-0.5, -0.5001, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--miss-norm']);
{
  const j = r.job('c_a01.job.json'), g = [j.u1, j.u2, j.t].map(Number), z0 = curve(-0.5), want = Math.sqrt(((g[1] - z0[1]) / z0[1]) ** 2 / 2 + ((g[2] - z0[2]) / z0[2]) ** 2 / 2);
  check('--miss-norm with an exact zero component (u1 = 0 at lam -0.5): the rms over the other two, measure_note "zero component left out", handed over', r.exit === 0 && r.res.attempts[0].measure_note === 'zero component left out' && rel(r.res.attempts[0].predicted, want) < 1e-9 && r.res.handed_over, `predicted ${r.res.attempts[0].predicted} want ${want}`);
}

// --edge-shrink near |lam| = 1
r = go(0.9999, 0.9998, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--edge-shrink']);
check('--edge-shrink: d becomes half the distance to |lam| = 1 (5e-5), then again or 5e-5 if that stays below 1; two steps, every lam below 1, handed over', r.exit === 0 && r.res.steps.length === 2 && r.res.attempts[0].edge_shrunk && Math.abs(Number(r.res.attempts[0].d) - 5e-5) < 1e-15 && [5e-5, 2.5e-5].some((x) => Math.abs(Number(r.res.attempts[1].d) - x) < 1e-15) && r.res.attempts.every((a) => Number(a.lam) < 1) && r.res.handed_over && r.res.stopped === null, r.res.attempts.map((a) => a.d).join(' '));
r = go(0.9999, 0.9998, ['--steps', '2', '--dlam', '1e-3', '--no-witness', '--edge-shrink', '--min-dlam', '1e-4']);
check('--edge-shrink with half the distance below --min-dlam: the stop without a job, as without the option', r.exit === 1 && /reach 1/.test(r.res.stopped) && r.res.attempts.length === 0, `stopped: ${r.res.stopped}`);

// refusals
const old = go(LZ, LB, ['--steps', '2', '--dlam', '1e-3', '--no-witness']);
const zf = path.join(tmp, 'r-again-z.json'), bf = path.join(tmp, 'r-again-back.json');
fs.writeFileSync(zf, JSON.stringify(strs(z))); fs.writeFileSync(bf, JSON.stringify(strs(back)));
let q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf, String(LZ), bf, String(LB), old.outdir], { encoding: 'utf8' });
check('an existing OUTDIR is refused with exit status 2', q.status === 2 && /usage/.test(q.stderr), `exit ${q.status}`);
q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf, String(LZ), bf, String(LB), path.join(tmp, 'new1'), '--steps', '1'], { encoding: 'utf8' });
check('--steps 1 is refused with exit status 2 (no folder made)', q.status === 2 && !fs.existsSync(path.join(tmp, 'new1')), `exit ${q.status}`);
fs.writeFileSync(zf + '2', JSON.stringify({ ...strs(z), converged: false }));
q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf + '2', String(LZ), bf, String(LB), path.join(tmp, 'new2')], { encoding: 'utf8' });
check('Z.json not converged: exit status 2', q.status === 2 && !fs.existsSync(path.join(tmp, 'new2')), `exit ${q.status}`);
q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf], { encoding: 'utf8' });
check('too few arguments: usage, exit status 2', q.status === 2 && /usage/.test(q.stderr), `exit ${q.status}`);
fs.writeFileSync(zf + '3', '[1, 2]');
q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf + '3', String(LZ), bf, String(LB), path.join(tmp, 'new3')], { encoding: 'utf8' });
check('Z.json that is a JSON list: exit status 2, no OUTDIR', q.status === 2 && !fs.existsSync(path.join(tmp, 'new3')), `exit ${q.status} ${(q.stderr || '').split('\n')[0]}`);
fs.writeFileSync(zf + '4', JSON.stringify({ ...strs(z), u1: 'x' }));
q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf + '4', String(LZ), bf, String(LB), path.join(tmp, 'new4')], { encoding: 'utf8' });
check('Z.json with u1 "x": exit status 2, no OUTDIR', q.status === 2 && /must be numbers/.test(q.stderr) && !fs.existsSync(path.join(tmp, 'new4')), `exit ${q.status} ${(q.stderr || '').split('\n')[0]}`);
for (const v of ['0x10', '1e-5', 'abc']) {
  const od = path.join(tmp, 'new-conv-' + v);
  q = spawnSync(python, ['-B', path.join(tools, 'handover-continue.py'), 'c', zf, String(LZ), bf, String(LB), od, '--conv', v], { encoding: 'utf8' });
  check(`--conv ${v}: exit status 2, no OUTDIR`, q.status === 2 && /--conv/.test(q.stderr) && !fs.existsSync(od), `exit ${q.status}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

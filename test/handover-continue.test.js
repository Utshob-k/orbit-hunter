// SPDX-License-Identifier: MIT
// tools/handover-continue.py (tangent first guess, test of every step, return test) with fake tools/reclose.py and tools/witness.py (python scripts in a temporary tools folder beside a copy of the script).
// The fake re-closing returns the point of a known smooth curve (u1, u2, t of lam) at the lam of the job, whatever the guess is, and can be told to misbehave per job (FAKE_PLAN: attempt name -> e4 (t not positive, exit 4),
// e5 (first residual above limit, exit 5), noconv, neg (converged with t < 0), none (no output, exit 7); "*" = every job; "return": retfail = a return solution 1e-5 off) and to jump in t beyond a lam (FAKE_JUMP).
// Checked: the first guess is z + d T and the second the secant; a jump beyond a lam is rejected by the ratio and d / 10 is accepted (and kept: no step growth); exit 4 and exit 5 jobs are rejected and the run goes on; a
// run that never converges stops at --min-dlam; a missing output stops the run; a failed return test is not a hand-over; |lam| >= 1 stops without a job; an existing OUTDIR, --steps 1 and an unconverged Z.json are refused
// with exit status 2; the witness runs only when handed over and not with --no-witness, from a job of 40 digit strings with --preset w1b --exact-start. needs python with mpmath (settings.ias.python), takes a few seconds.
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
how = plan.get(job['id'].split('_')[-1], plan.get('*', 'ok'))
def write(d): json.dump(d, open(out, 'w'))
if how == 'none': sys.exit(7)
if how == 'e4': write(dict(status='t not positive', converged=False, t='-1.5', iterations=[{'residual': 0.3}])); sys.exit(4)
if how == 'e5': write(dict(status='first residual above limit', converged=False, residual=0.5, iterations=[{'residual': 0.5}])); sys.exit(5)
v = curve(lam)
if 'FAKE_JUMP' in os.environ and lam > float(os.environ['FAKE_JUMP']): v[2] += 5
if how == 'retfail': v[2] *= 1 + 1e-5
if how == 'neg': v[2] = -5.0
d = dict(status='done', converged=how != 'noconv', residual=1e-20 if how != 'noconv' else 1e-3, u1=repr(v[0]), u2=repr(v[1]), t=repr(v[2]), iterations=[{'residual': 0.01}, {'residual': 1e-8}, {'residual': 1e-20}], same_orbit=None)
if job.get('ref'):
    r = job['ref']; dif = {k: abs(x - float(r[k])) / abs(float(r[k])) for k, x in zip(('u1', 'u2', 't'), v)}
    d.update(rel_diff_ref=dif, same_orbit=bool(max(dif.values()) <= 1e-9))
write(d)
`);
fs.writeFileSync(path.join(tools, 'witness.py'), `
import sys, json
json.dump(dict(status='done', dmin=0.1, argv=sys.argv[3:]), open(sys.argv[2], 'w'))
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

fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

// SPDX-License-Identifier: MIT
// the two stops of tools/reclose.py with the real script: a start value t <= 0 (t = -1 and t = 0) stops before any flow with status 't not positive' and exit status 4; --max-first R stops after the evaluation of
// the start values (one iteration) with status 'first residual above limit' and exit status 5 if the largest |r| there is above R; with a large R the same job converges and is the same orbit as its reference
// (an orbit of the family t35 -, lam 0.5879788380024298). needs python with mpmath, takes about 20 s.
// --conv C is written into the output as conv (1e-16 without it), and lam_job is the lam of the job as given. t <= 0 after a Newton update: the real reclose.py in a temporary tools folder with a fake
// refine-mp.py whose flow is linear (r1 = -(u2 - 2) / 2, r2 = u1 - 1, r3 = t + 5), so the first update sets t = -5 and the next iteration stops with 't not positive' (exit 4) after one iteration and 3 flows.
// --conv is used, not only written: a second fake flow with a quadratic term (r2 = e + e^2 with e = u1 - 1, r1 = -(u2 - 2) / 2, r3 = t - 1) from e = 5e-4 gives the largest |r| 5e-4, about 2.5e-7, 6.2e-14,
// 3.9e-27 at the iterations 0 to 3, so --conv 1e-12 converges after 2 updates and the default 1e-16 after 3. --conv 0x10, 1e-5 and abc are refused (exit 2, no output; the value must be a plain decimal
// number of at most 1e-12). A ref with u1 "0" (fake flow): the job ends 'done' with exit 0 and the absolute difference for that component.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const python = settings.ias.python;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-guards-'));
const pt = { u1: -0.025919708924756146, u2: 1.2036381113455779, t: 2.686792141788577 };
const lam = 0.5879788380024298;
let n = 0;
const go = (t, ref, extra = []) => {
  const id = 'job' + n++, job = path.join(dir, id + '.json'), out = path.join(dir, id + '.out.json');
  fs.writeFileSync(job, JSON.stringify({ id, u1: pt.u1, u2: pt.u2, lam, t, ref }));
  const r = spawnSync(python, ['-B', path.join(root, 'tools', 'reclose.py'), job, out, '--minutes', '10', ...extra], { cwd: root, encoding: 'utf8' });
  return { exit: r.status, error: r.error, out: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null };
};
for (const t of [-1, 0]) {
  const r = go(t, null);
  check(`t = ${t}: status 't not positive', exit status 4, no flow`, r.exit === 4 && r.out && r.out.status === 't not positive' && r.out.converged === false && r.out.flows === 0 && r.out.iterations.length === 0, `exit ${r.exit} status ${r.out && r.out.status} flows ${r.out && r.out.flows}`);
}
{
  const a = go(-1, null), b = go(-1, null, ['--conv', '1e-24']);
  check('--conv is written into the output as conv (1e-16 without the option), lam_job is the lam of the job', a.out && a.out.conv === '1e-16' && b.out && b.out.conv === '1e-24' && b.exit === 4 && a.out.lam_job === String(lam), `conv ${a.out && a.out.conv} / ${b.out && b.out.conv}, lam_job ${a.out && a.out.lam_job}`);
}
{
  // t <= 0 after a Newton update, with a fake flow
  const ftools = path.join(dir, 'tools'); fs.mkdirSync(ftools);
  fs.copyFileSync(path.join(root, 'tools', 'reclose.py'), path.join(ftools, 'reclose.py'));
  fs.writeFileSync(path.join(ftools, 'refine-mp.py'), [
    'from mpmath import mpf',
    'STEP_FLOOR = None',
    'def start(a, b, lam): return [a, b, lam]',
    'def flow(x, t, tol): return [mpf(-1), mpf(0), mpf(0), x[1] - 2, mpf(1), mpf(0), x[0] - 1, mpf(0), t + 5, mpf(0), mpf(0), mpf(0)]',
    'def deriv(s): return [mpf(0)] * 8 + [mpf(1)] + [mpf(0)] * 3', ''].join('\n'));
  const job = path.join(dir, 'fake.json'), out = path.join(dir, 'fake.out.json');
  fs.writeFileSync(job, JSON.stringify({ id: 'fake', u1: '1.5', u2: '2.5', lam: '0.3', t: '1', ref: null }));
  const q = spawnSync(python, ['-B', path.join(ftools, 'reclose.py'), job, out, '--minutes', '10'], { cwd: root, encoding: 'utf8' });
  const o = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
  check('t <= 0 after a Newton update (fake flow): status \'t not positive\', exit status 4, after one iteration and 3 flows', q.status === 4 && o && o.status === 't not positive' && o.converged === false && o.iterations.length === 1 && o.flows === 3 && Number(o.t) < 0, `exit ${q.status} status ${o && o.status} t ${o && o.t} iterations ${o && o.iterations.length} ${(q.stderr || '').slice(-200)}`);
}
{
  // --conv in use, with the quadratic fake flow; refused values; a zero ref component
  const qtools = path.join(dir, 'tools2'); fs.mkdirSync(qtools);
  fs.copyFileSync(path.join(root, 'tools', 'reclose.py'), path.join(qtools, 'reclose.py'));
  fs.writeFileSync(path.join(qtools, 'refine-mp.py'), [
    'from mpmath import mpf',
    'STEP_FLOOR = None',
    'def start(a, b, lam): return [a, b, lam]',
    'def flow(x, t, tol): return [mpf(-1), mpf(0), mpf(0), x[1] - 2, mpf(1), mpf(0), (x[0] - 1) + (x[0] - 1) ** 2, mpf(0), t - 1, mpf(0), mpf(0), mpf(0)]',
    'def deriv(s): return [mpf(0)] * 8 + [mpf(1)] + [mpf(0)] * 3', ''].join('\n'));
  let k = 0;
  const q = (extra, ref = null) => {
    const job = path.join(dir, 'q' + k + '.json'), out = path.join(dir, 'q' + k++ + '.out.json');
    fs.writeFileSync(job, JSON.stringify({ id: 'q', u1: '1.0005', u2: '2', lam: '0.3', t: '1', ref }));
    const s = spawnSync(python, ['-B', path.join(qtools, 'reclose.py'), job, out, '--minutes', '10', ...extra], { cwd: root, encoding: 'utf8' });
    return { exit: s.status, stderr: s.stderr || '', out: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null };
  };
  const a = q([]), b = q(['--conv', '1e-12']);
  const ra = a.out ? a.out.iterations.map((x) => x.residual) : [], rb = b.out ? b.out.iterations.map((x) => x.residual) : [];
  check('--conv 1e-12 is used: with the quadratic fake flow it converges after 2 updates, the default 1e-16 after 3 (one more)', a.exit === 0 && b.exit === 0 && a.out.converged && b.out.converged && a.out.iterations.length === 4 && b.out.iterations.length === 3 && rb[2] > 1e-16 && rb[2] <= 1e-12 && ra[3] <= 1e-16,
    `updates ${a.out && a.out.iterations.length - 1} / ${b.out && b.out.iterations.length - 1}, residuals ${ra.map((x) => x.toExponential(1)).join(' ')}`);
  for (const v of ['0x10', '1e-5', 'abc']) {
    const c = q(['--conv', v]);
    check(`--conv ${v}: exit 2, no output`, c.exit === 2 && c.out === null && /--conv/.test(c.stderr), `exit ${c.exit}`);
  }
  const z = q([], { u1: '0', u2: '2', t: '1' });
  check('a ref with u1 "0": done, exit 0, the absolute difference for u1 (about 1), not the same orbit', z.exit === 0 && z.out && z.out.status === 'done' && z.out.converged && Math.abs(z.out.rel_diff_ref.u1 - 1) < 1e-9 && z.out.rel_diff_ref.u2 < 1e-30 && z.out.same_orbit === false,
    `exit ${z.exit} ${z.out && JSON.stringify(z.out.rel_diff_ref)} ${z.stderr.slice(-200)}`);
}
let r = go(pt.t, pt, ['--max-first', '1e-30']);
check('--max-first 1e-30: status \'first residual above limit\', exit status 5, one iteration', r.exit === 5 && r.out && r.out.status === 'first residual above limit' && r.out.converged === false && r.out.iterations.length === 1 && r.out.residual > 1e-30, `exit ${r.exit} residual ${r.out && r.out.residual}`);
r = go(pt.t, pt, ['--max-first', '1']);
check('--max-first 1: converged, the same orbit as its reference, exit status 0', r.exit === 0 && r.out && r.out.status === 'done' && r.out.converged === true && r.out.same_orbit === true, `exit ${r.exit} residual ${r.out && r.out.residual}`);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

// SPDX-License-Identifier: MIT
// usage errors of the options added for 0.4.0: every case must end with exit status 2 before anything is run or written.
// tools/family-follow-ias.mjs: --mono-threads and --fast with --pieces above 64, --ls-reuse, --grow-iters, --grow-factor and --stop-lam with --natural, bad values of --handover-conv and a value for --handover-safe.
// tools/handover-continue.py: bad values of --conv (the file names are not read before the options are checked). tools/reclose.py: bad values of --conv.
// Checked: exit status 2, a message that names the option, and no file in the new temp folder of the case. No flow is run; the python cases need python with mpmath (settings.ias.python), takes a few seconds.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const python = settings.ias.python;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-usage-test-'));
let n = 0;
const empty = (d) => fs.readdirSync(d).length === 0;

// the driver: the arguments after the start values, and the words the message has to contain
const driver = [
  [['--mono-threads=2', '--pieces=65'], ['--mono-threads', '--pieces']],
  [['--mono-threads=1', '--pieces=250'], ['--mono-threads', '--pieces']],
  [['--fast=2', '--pieces=100'], ['--fast', '--pieces']],
  [['--natural=0.01', '--ls-reuse'], ['--ls-reuse', '--natural']],
  [['--natural=0.01', '--grow-iters=3'], ['--grow-iters', '--natural']],
  [['--natural=0.01', '--grow-factor=1.4'], ['--grow-factor', '--natural']],
  [['--natural=0.01', '--stop-lam=0.5'], ['--stop-lam', '--natural']],
  [['--handover', '--handover-conv=abc'], ['--handover-conv']],
  [['--handover', '--handover-conv=0'], ['--handover-conv']],
  [['--handover', '--handover-conv=-1e-24'], ['--handover-conv']],
  [['--handover', '--handover-conv'], ['--handover-conv']],
  [['--handover', '--handover-conv='], ['--handover-conv']],
  [['--handover', '--handover-safe=1'], ['--handover-safe']],
];
for (const [args, words] of driver) {
  const d = path.join(tmp, 'd' + n++); fs.mkdirSync(d);
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), path.join(d, 'out.json'), '1', '0.1', '0.2', '0.3', '4', ...args], { cwd: root, encoding: 'utf8', timeout: 60000 });
  const msg = (r.stderr || '').trim();
  check(`family-follow-ias.mjs ${args.join(' ')}: exit 2, names ${words.join(' and ')}, nothing written`, r.status === 2 && words.every((w) => msg.includes(w)) && empty(d), `exit ${r.status}: ${msg.split('\n')[0].slice(0, 110)}`);
}
// the same options where they are allowed pass these checks (--pieces=64 with --mono-threads, --handover-conv=1e-24, a bare --handover-safe): the driver reaches the later check of --handover-steps (1 is refused there)
{
  const d = path.join(tmp, 'd' + n++); fs.mkdirSync(d);
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), path.join(d, 'out.json'), '1', '0.1', '0.2', '0.3', '4', '--mono-threads=2', '--pieces=64', '--handover', '--handover-conv=1e-24', '--handover-safe', '--handover-steps=1'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  check('--mono-threads=2 --pieces=64 --handover-conv=1e-24 --handover-safe pass these checks (the run then stops at --handover-steps=1, exit 2, nothing written)', r.status === 2 && /handover-steps a whole number of at least 2/.test(r.stderr) && empty(d), `exit ${r.status}: ${(r.stderr || '').trim().split('\n')[0]}`);
}

// handover-continue.py --conv
for (const v of ['abc', '0', '-1', 'inf', null]) {
  const d = path.join(tmp, 'd' + n++); fs.mkdirSync(d);
  const r = spawnSync(python, ['-B', path.join(root, 'tools', 'handover-continue.py'), 'c', path.join(d, 'z.json'), '0.3', path.join(d, 'b.json'), '0.2999', path.join(d, 'out'), ...(v === null ? ['--conv'] : ['--conv', v])], { cwd: root, encoding: 'utf8', timeout: 60000 });
  check(`handover-continue.py --conv ${v === null ? '(no value)' : v}: exit 2, usage, nothing written`, r.status === 2 && /usage/.test(r.stderr) && /conv|number/.test(r.stderr) && empty(d), `exit ${r.status}: ${(r.stderr || '').trim().split('\n')[0]}`);
}
{
  const d = path.join(tmp, 'd' + n++); fs.mkdirSync(d);
  const r = spawnSync(python, ['-B', path.join(root, 'tools', 'handover-continue.py'), 'c', path.join(d, 'z.json'), '0.3', path.join(d, 'b.json'), '0.2999', path.join(d, 'out'), '--miss-retrun'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  check('handover-continue.py with a misspelt option (--miss-retrun): exit 2, nothing written', r.status === 2 && /unknown option --miss-retrun/.test(r.stderr) && empty(d), `exit ${r.status}`);
}

// reclose.py --conv
for (const v of ['abc', '0', '-1e-20', 'inf']) {
  const d = path.join(tmp, 'd' + n++); fs.mkdirSync(d);
  const job = path.join(tmp, 'job' + n + '.json');
  fs.writeFileSync(job, JSON.stringify({ id: 'j', u1: 0.1, u2: 0.2, lam: 0.3, t: 1, ref: null }));
  const r = spawnSync(python, ['-B', path.join(root, 'tools', 'reclose.py'), job, path.join(d, 'out.json'), '--conv', v], { cwd: root, encoding: 'utf8', timeout: 60000 });
  check(`reclose.py --conv ${v}: exit 2, names --conv, no output`, r.status === 2 && /--conv/.test(r.stderr) && empty(d), `exit ${r.status}: ${(r.stderr || '').trim().split('\n')[0]}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

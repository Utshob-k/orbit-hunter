// SPDX-License-Identifier: MIT
// the option --fast=K of tools/family-follow-ias.mjs (the same as --ls-reuse --mono-threads=K --reg-threads=K --ias-procs=K) and the usage errors of --reg-threads and --fast.
// (a) every refused combination, --fast=0, --fast=x and a bare --fast end with exit status 2 and a message that names the option, before anything is run.
// (b) t35 - from its command-line start, --stop-after=5, once without options and once with --fast=2 (tools/reproduce-trace.mjs, in a new temp folder): both print PASS, and the points, unrec, why,
// steps, lamMin, lamMax and the .nodes.jsonl files are equal. needs python with rebound and mpmath, takes about 2 minutes.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-fast-option-test-'));

// (a) usage errors: the arguments after the start values, and the words that the message has to contain
const refused = [
  [['--reg-threads=2', '--matrix=fd-forward'], ['--reg-threads', '--matrix=fd-forward']],
  [['--reg-threads=2', '--matrix=fd-central'], ['--reg-threads', '--matrix=fd-central']],
  [['--reg-threads=2', '--pieces-by=ias'], ['--reg-threads', '--pieces-by']],
  [['--reg-threads=2', '--pieces-by=reg'], ['--reg-threads', '--pieces-by']],
  [['--fast=0'], ['--fast']],
  [['--fast=x'], ['--fast']],
  [['--fast=2.5'], ['--fast']],
  [['--fast'], ['--fast']],
  [['--fast=2', '--ls-reuse'], ['--fast', '--ls-reuse']],
  [['--fast=2', '--mono-threads=2'], ['--fast', '--mono-threads']],
  [['--fast=2', '--reg-threads=2'], ['--fast', '--reg-threads']],
  [['--fast=2', '--ias-procs=2'], ['--fast', '--ias-procs']],
  [['--fast=2', '--natural=0.01'], ['--fast', '--natural']],
  [['--fast=2', '--matrix=fd-forward'], ['--fast', '--matrix=fd-forward']],
  [['--fast=2', '--matrix=fd-central'], ['--fast', '--matrix=fd-central']],
  [['--fast=2', '--pieces-by=ias'], ['--fast', '--pieces-by']],
];
refused.forEach(([args, words], i) => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), path.join(dir, `refused-${i}.json`), '1', '0.1', '0.2', '0.3', '4', ...args], { cwd: root, encoding: 'utf8', timeout: 60000 });
  const msg = (r.stderr || '').trim();
  check(`${args.join(' ')} is refused with exit 2 and names ${words.join(' and ')}`, r.status === 2 && words.every((w) => msg.includes(w)) && !fs.existsSync(path.join(dir, `refused-${i}.json`)), `exit ${r.status}: ${msg.split('\n')[0].slice(0, 110)}`);
});

// (b) the same short run without options and with --fast=2
const runs = {};
for (const [name, extra] of [['plain', []], ['fast', ['--fast=2']]]) {
  const out = path.join(dir, `${name}.json`);
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'reproduce-trace.mjs'), 't35m', out, '--stop-after=5', ...extra], { cwd: root, encoding: 'utf8', timeout: 900000 });
  const lines = (r.stdout || '').trim().split('\n');
  console.log(lines.slice(-2).map((l) => '    ' + l).join('\n'));   // the output of the command, indented so that it is not counted as a check
  check(`reproduce-trace t35m --stop-after=5 ${extra.join(' ')} ends with PASS and exit 0`, r.status === 0 && /^PASS /m.test(r.stdout || ''), `exit ${r.status}`);
  runs[name] = fs.existsSync(out) ? { res: JSON.parse(fs.readFileSync(out, 'utf8')), nodes: fs.existsSync(out + '.nodes.jsonl') ? fs.readFileSync(out + '.nodes.jsonl') : null } : null;
}
if (runs.plain && runs.fast) {
  const a = runs.plain.res, b = runs.fast.res;
  check('--fast=2 is in out.settings with the four settings it sets', b.settings.fast === 2 && b.settings.lsReuse === true && b.settings.monoThreads === 2 && b.settings.ias.regThreads === 2 && b.settings.ias.procs === 2 && a.settings.fast === undefined);
  check('the run has points', a.points.length > 0, `${a.points.length} points`);
  for (const key of ['points', 'unrec', 'why', 'steps', 'lamMin', 'lamMax']) check(`${key} is equal`, JSON.stringify(a[key]) === JSON.stringify(b[key]));
  check('the .nodes.jsonl files are equal', runs.plain.nodes !== null && runs.fast.nodes !== null && runs.plain.nodes.equals(runs.fast.nodes), runs.plain.nodes ? `${runs.plain.nodes.length} bytes` : 'no file');
}
fs.rmSync(dir, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

// SPDX-License-Identifier: MIT
// runs a stored trace of data/deep/traces/ again from its command-line start and compares the accepted steps with the stored ones.
// node tools/reproduce-trace.mjs LABEL OUT.json [--stop-after=N] [other options of tools/family-follow-ias.mjs]
//   LABEL: a trace of data/deep/traces/ (t35m, t44m, t62m, t72m, t62p, t72p, ...). The command is built from the command-line start of data/deep/extra/start-shift.json (u1, u2, lam, t), the direction and the guard
//   ratio of data/deep/traces-table.json and --ias-first-step=legacy (the first step of IAS15 of every stored run); 24 pieces; the options after OUT.json are added to the command (a later --pieces,
//   --minutes or --guard-ratio replaces the one built here). The command is printed, then run (needs python with rebound and mpmath, ORBIT_PYTHON). The accepted steps of the run (recorded points and unrecorded
//   steps, by step number) are compared with the first accepted steps of the stored trace: step numbers, and lam, u1, u2, t exactly and as the largest relative difference. For t35 - the start is the replay start of
//   data/deep/t35m-replay.json (test/replay.test.js uses the same one) and the guard ratio is 400, as in the table.
//   PASS: all compared steps have the stored step numbers and the largest relative difference is below 1e-9 (the line says "bit-identical" if every value is equal). OUT.json must be new. Takes seconds to minutes.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [label, outFile, ...rest] = process.argv.slice(2);
if (!label || !outFile || label.startsWith('--') || outFile.startsWith('--')) { console.error('usage: node tools/reproduce-trace.mjs LABEL OUT.json [--stop-after=N] [other options of tools/family-follow-ias.mjs]'); process.exit(2); }
const read = (...p) => JSON.parse(fs.readFileSync(path.join(root, ...p), 'utf8'));
const stored = fs.existsSync(path.join(root, 'data', 'deep', 'traces', label + '.json')) ? read('data', 'deep', 'traces', label + '.json') : null;
const shift = read('data', 'deep', 'extra', 'start-shift.json').rows.find((r) => r.label === label);
const row = read('data', 'deep', 'traces-table.json').traces.find((r) => r.label === label);
if (!stored || !shift || !row) { console.error('no stored trace, start or table row for ' + label); process.exit(2); }
if (fs.existsSync(outFile)) { console.error('exists, not overwriting: ' + outFile); process.exit(2); }
const s = shift.command_line_start;
const opts = new Map([['pieces', '24'], ['guard-ratio', String(row.guard_ratio)], ['ias-first-step', 'legacy']]);
const extra = [];
for (const a of rest) { const m = a.match(/^--([^=]+)(=.*)?$/); if (m && opts.has(m[1])) opts.set(m[1], a.includes('=') ? a.split('=')[1] : ''); else extra.push(a); }
const args = [path.join('tools', 'family-follow-ias.mjs'), outFile, String(row.direction), String(s.u1), String(s.u2), String(s.lam), String(s.t), ...[...opts].map(([k, v]) => `--${k}=${v}`), ...extra];
console.log('node ' + args.join(' '));
const t0 = Date.now();
const run = spawnSync(process.execPath, args, { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
if (!fs.existsSync(outFile)) { console.log('FAIL  the driver wrote no output (exit ' + run.status + ')'); process.exit(1); }
const res = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const steps = (points, unrec) => [...points.map((p) => ({ ...p, rec: true })), ...(unrec || []).map((p) => ({ ...p, rec: false }))].sort((a, b) => a.step - b.step);
const got = steps(res.points || [], res.unrec), ref = steps(stored.points, stored.unrecorded);
const n = Math.min(got.length, ref.length), KEYS = ['lam', 'u1', 'u2', 't'];
let equal = 0, stepDiff = 0, maxRel = 0, missing = 0;
for (let k = 0; k < n; k++) {
  const a = got[k], b = ref[k];
  if (a.step !== b.step) stepDiff++;
  if (KEYS.some((key) => typeof a[key] !== 'number')) { missing++; continue; }
  let same = true;
  for (const key of KEYS) { if (a[key] !== b[key]) same = false; maxRel = Math.max(maxRel, Math.abs(a[key] - b[key]) / Math.max(Math.abs(b[key]), 1e-300)); }
  if (same) equal++;
}
console.log(`stored ${label}: ${ref.length} accepted steps (${stored.points.length} recorded); run: ${got.length} accepted steps (${(res.points || []).length} recorded), stopped: ${res.why}; compared the first ${n}`);
console.log(`bit-identical (lam, u1, u2, t): ${equal} of ${n}; step numbers that differ: ${stepDiff}; steps without values: ${missing}; largest relative difference ${maxRel.toExponential(2)}`);
const ok = n > 0 && stepDiff === 0 && missing === 0 && maxRel < 1e-9;
console.log(`${ok ? 'PASS' : 'FAIL'}  the accepted steps follow the stored trace (n = ${n})${equal === n && n > 0 ? ', bit-identical' : ''}   time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(ok ? 0 : 1);

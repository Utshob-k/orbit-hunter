// SPDX-License-Identifier: MIT
// the stop "L* reached 0" at an accepted step that is not recorded: tools/family-follow-ias.mjs from the zero-L orbit of data/orbit-table.json (row 52, L* 1.2e-13 at lam 0.30196) with
// --perp-cap=1e-6, so perpInfo gives up at once at every accepted step and no step is recorded. PASS if the run stops with "L* reached 0" (exit 0) at its first accepted steps with no recorded point, and
// the unrec entry of that step has |L*| < 1e-3, Lstar_signed (its sign kept, |Lstar_signed| = Lstar), capped true and share a number (the share of its usual limit of dp45 steps that perpInfo made before it gave up; about 1.5e-6 on the machine of the run),
// and OUT.json has L_sign_changes, a list (empty when the run stops at its first accepted step, which has no step before it). needs python with rebound and mpmath, takes under a minute.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const row = JSON.parse(fs.readFileSync(path.join(root, 'data', 'orbit-table.json'), 'utf8'))[52];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-lstar-test-'));
const out = path.join(tmp, 'out.json');
const r = spawnSync(process.execPath, [path.join(root, 'tools', 'family-follow-ias.mjs'), out, '1', String(row.u1), String(row.u2), String(row.lam), String(row.t), '--perp-cap=1e-6', '--minutes=3', '--no-nodes', '--max-dist=inf'], { cwd: root, encoding: 'utf8', timeout: 300000 });
const o = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
check('the start row is a zero-L orbit (|L*| < 1e-12)', row.group === 'zeroL' && Math.abs(row.Lstar) < 1e-12, `L* ${row.Lstar}`);
if (!o) check('the driver wrote OUT.json', false, `exit ${r.status} ${(r.stderr || '').slice(-300)}`);
else {
  const last = o.unrec[o.unrec.length - 1] || {};
  check('stopped with "L* reached 0" at an unrecorded accepted step, no recorded point, exit 0', r.status === 0 && o.why === 'L* reached 0' && o.points.length === 0 && o.unrec.length >= 1 && o.unrec.length <= 5, `exit ${r.status}, why ${o.why}, points ${o.points.length}, unrec ${o.unrec.length}`);
  check('the unrec entry of that step: |L*| < 1e-3, Lstar_signed with |Lstar_signed| = Lstar, capped true, share a number', Math.abs(last.Lstar) < 1e-3 && typeof last.Lstar_signed === 'number' && Math.abs(last.Lstar_signed) === last.Lstar && last.capped === true && typeof last.share === 'number' && last.share >= 0 && last.share < 1 && last.reason === 'perpInfo null',
    JSON.stringify({ step: last.step, Lstar: last.Lstar, Lstar_signed: last.Lstar_signed, capped: last.capped, share: last.share }));
  check('OUT.json has L_sign_changes (a list) and the cap in its settings', Array.isArray(o.L_sign_changes) && o.settings.perpCap === 1e-6, `L_sign_changes ${JSON.stringify(o.L_sign_changes)}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

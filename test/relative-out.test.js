// SPDX-License-Identifier: MIT
// tools/reproduce-trace.mjs run from another folder with a relative OUT (the driver it starts runs in the top folder of the repository, so a relative path used to be taken against two different folders):
// t62 -, --stop-after=1, about 5 seconds. PASS if the command ends with exit 0 and PASS, and the output files are in the folder the command was run in and not in the top folder.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-hunter-relative-out-test-'));
const r = spawnSync(process.execPath, [path.join(root, 'tools', 'reproduce-trace.mjs'), 't62m', 'rel-out.json', '--stop-after=1'], { cwd, encoding: 'utf8', timeout: 600000 });
const lines = (r.stdout || '').trim().split('\n');
console.log(lines.slice(-3).map((l) => '    ' + l).join('\n'));   // the output of the command, indented so that it is not counted as a check
check('reproduce-trace with a relative OUT, run from another folder, ends with PASS and exit 0', r.status === 0 && /^PASS /m.test(r.stdout || ''), `exit ${r.status}`);
check('the trace is in the folder the command was run in', fs.existsSync(path.join(cwd, 'rel-out.json')));
check('and not in the top folder of the repository', !fs.existsSync(path.join(root, 'rel-out.json')));
fs.rmSync(cwd, { recursive: true, force: true });
process.exit(fail ? 1 : 0);

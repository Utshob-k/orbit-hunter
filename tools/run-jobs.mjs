// runs the lines of a jobs file (arguments of tools/family-one.mjs) with a given number of processes at once and writes one line per finished job
// node tools/run-jobs.mjs jobs.txt [processes] > log
import fs from 'fs';
import { spawn } from 'child_process';
const [file, nArg] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
if (!lines.length) { console.error('no jobs'); process.exit(1); }
let next = 0, running = 0, done = 0, failed = 0;
const max = Number(nArg) || 8;
function launch() {
  while (running < max && next < lines.length) {
    const args = lines[next++].split(' ');
    running++;
    const p = spawn('node', ['tools/family-one.mjs', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => { running--; done++; if (code) failed++; console.log(`[${done}/${lines.length}] exit ${code} ${out.trim().split('\n').pop()}`); launch(); if (!running && next >= lines.length) console.log(`finished: ${done} jobs, ${failed} with a non-zero exit`); });
  }
}
launch();

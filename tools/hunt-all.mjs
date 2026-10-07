// hunt for truly periodic orbits from a list of symmetric orbits, on worker threads.
// node tools/hunt-all.mjs rows.json out.jsonl [threads] [maxSeconds] [firstIndex] [ms]
// the last argument 'ms' uses multiple shooting with the tangent predictor, 'arc' follows the family in arclength
// (both in src/shooting.js). HUNT_ONLY=file.json (a list of indexes) restricts the run to those starts.
// rows.json is [[u1, u2, lam, t], ...]. every finished hunt is appended to out.jsonl right away,
// so stopping it never loses work, and rerunning skips what is already in out.jsonl.
import fs from 'fs';
import { Worker } from 'worker_threads';

const [rowsFile, outFile, threadsArg, secArg, firstArg, mode] = process.argv.slice(2);
const threads = Number(threadsArg) || 8;
const maxMs = (Number(secArg) || 300) * 1000;
const first = Number(firstArg) || 0;

let rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8')).map(([u1, u2, lam, t], idx) => ({ idx, u1, u2, lam, t }));
// the same start state shows up with different crossing times, keep the first one of each
const seen = new Set();
rows = rows.filter((r) => { const k = r.u1.toFixed(5) + ',' + r.u2.toFixed(5) + ',' + r.lam; if (seen.has(k)) return false; seen.add(k); return true; });
if (process.env.HUNT_ONLY) { const only = new Set(JSON.parse(fs.readFileSync(process.env.HUNT_ONLY, 'utf8'))); rows = rows.filter((r) => only.has(r.idx)); }
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, 'utf8').split('\n')) if (l.trim()) done.add(JSON.parse(l).idx);
// never-tried ones first (rows from `first` on), then the earlier ones
const todo = [...rows.filter((r) => r.idx >= first), ...rows.filter((r) => r.idx < first)].filter((r) => !done.has(r.idx));
console.log(`${rows.length} unique starts, ${done.size} already done, ${todo.length} to do, ${threads} threads, ${maxMs / 1000} s each`);

let next = 0, finished = 0, ok = 0;
const t0 = Date.now();
await new Promise((resolve) => {
  const start = (w) => {
    if (next >= todo.length) { w.terminate(); if (--alive === 0) resolve(); return; }
    const job = { ...todo[next++], maxMs };
    w.postMessage(job);
  };
  let alive = threads;
  for (let i = 0; i < threads; i++) {
    const w = new Worker(new URL(mode === 'arc' ? './hunt-worker-arc.mjs' : mode === 'ms' ? './hunt-worker-ms.mjs' : './hunt-worker.mjs', import.meta.url));
    w.on('message', (m) => {
      fs.appendFileSync(outFile, JSON.stringify(m) + '\n');
      finished++;
      if (m.ok) ok++;
      if (finished % 5 === 0 || m.ok) console.log(`${finished}/${todo.length} done, ${ok} periodic, ${Math.round((Date.now() - t0) / 60000)} min`);
      start(w);
    });
    w.on('error', (e) => { console.log('worker error', e.message); start(w); });
    start(w);
  }
});
console.log('finished', finished, 'hunts,', ok, 'reached rotation 0');

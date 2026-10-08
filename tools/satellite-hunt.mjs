// run the jobs written by nu-crossings.mjs on worker threads; every result is appended to out.jsonl right away
// node tools/satellite-hunt.mjs jobs.json out.jsonl [threads]
import fs from 'fs';
import { Worker } from 'worker_threads';

const [jobsFile, outFile, threadsArg] = process.argv.slice(2);
const threads = Number(threadsArg) || 8;
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
const key = (j) => `${j.orbit}:${j.k}:${j.m}:${j.lamA.toFixed(5)}`;
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, 'utf8').split('\n')) if (l.trim()) { const j = JSON.parse(l).job; done.add(key(j)); }
const todo = jobs.filter((j) => !done.has(key(j)));
console.log(`${jobs.length} jobs, ${done.size} done, ${todo.length} to do, ${threads} threads`);

let next = 0, finished = 0, alive = threads;
const t0 = Date.now();
await new Promise((resolve) => {
  const start = (w) => {
    if (next >= todo.length) { w.terminate(); if (--alive === 0) resolve(); return; }
    w.postMessage(todo[next++]);
  };
  for (let i = 0; i < threads; i++) {
    const w = new Worker(new URL('./satellite-worker.mjs', import.meta.url));
    w.on('message', (m) => {
      fs.appendFileSync(outFile, JSON.stringify(m) + '\n');
      finished++;
      if (finished % 5 === 0) console.log(`${finished}/${todo.length} done, ${Math.round((Date.now() - t0) / 60000)} min`);
      start(w);
    });
    w.on('error', (e) => { console.log('worker error', e.message); start(w); });
    start(w);
  }
});
console.log('finished', finished);

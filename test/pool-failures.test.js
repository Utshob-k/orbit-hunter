// SPDX-License-Identifier: MIT
// failures of the two thread pools, src/ias/reg-pool.js (--reg-threads) and src/mono-pool.js (--mono-threads), each with K = 2 and settings.ias.timeoutMs = 2000 ms. For each pool, in this order (a hook
// acts only when a pool starts, and every failure drops the pool, so the next call starts a new one):
//   a worker that ends inside a batch gives '... pool error' after about 1 s (the main thread tests the liveness of the workers after every slice of at most 1 s of its wait), not a timeout;
//   a batch held up longer than the limit gives '... pool timeout' after about 2 s;
//   the next call works with a new pool (the same numbers as the call in the main thread), and then one of its workers ends between two batches while the main thread never lets its event loop turn:
//   the next batch gives '... pool error' within 5 s, and the call after it works with a new pool.
// The failures are counted in stats of src/ias/bridge.js (poolTimeouts, poolErrors, lastReason). The workers fail through the test hook of the pools, the environment variable ORBIT_TEST_POOL when a pool
// starts: 'die0' (worker 0 ends at the start of its first batch), 'hold=3000' (every worker waits 3 s before it counts itself out of a batch), 'exit0' (worker 0 ends right after its first batch);
// unset, the hook does nothing.
// Then src/ias/ias-bridge.py with a pool of K = 2 processes: a pool process that dies during a request (the hook ORBIT_TEST_IAS_DIE_TAU of that file: a piece with exactly that tau ends its process)
// gives an answer with an error at once, and the next request is answered by a new pool with the same numbers. needs python with rebound (settings.ias.python), takes about 10 s.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { settings } from '../src/settings.js';
import { stats, BridgeError } from '../src/ias/bridge.js';
import { regBatch } from '../src/ias/reg-pool.js';
import { monoBatch } from '../src/mono-pool.js';
import { flowEnc } from '../src/ias/reg.js';
import { monodromy } from '../src/stability.js';
import { perpInitial } from '../src/perp.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t00 = Date.now();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REG = JSON.parse(fs.readFileSync(path.join(root, 'src', 'ias', 'reg-settings.json'), 'utf8'));
settings.ias.timeoutMs = 2000;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);   // blocks: the event loop does not turn
const x0 = perpInitial(-0.1708641881661099, 0.4895576004238433, 0.301964924993168), x1 = perpInitial(0.3, 0.5, 0.2), tau = 0.05;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
// one call of a pool, with the hook set while the call runs: { res, ms } or { err, ms }
const call = (fn, hook) => {
  if (hook) process.env.ORBIT_TEST_POOL = hook; else delete process.env.ORBIT_TEST_POOL;
  const t0 = performance.now();
  try { const res = fn(); return { res, ms: performance.now() - t0 }; } catch (e) { return { err: e, ms: performance.now() - t0 }; } finally { delete process.env.ORBIT_TEST_POOL; }
};
const s0 = { ...stats };
const msg = (r) => (r.err ? r.err.message : 'ok') + ' after ' + r.ms.toFixed(0) + ' ms';

function sequence(name, run, ok) {
  const d = call(run, 'die0');
  check(`${name} pool, worker 0 ends inside a batch: BridgeError "${name} pool error" after about 1 s, not a timeout`, d.err instanceof BridgeError && d.err.message.startsWith(name + ' pool error') && d.ms > 500 && d.ms < 1900, msg(d));
  const h = call(run, 'hold=3000');
  check(`${name} pool, a batch held up 3 s with the limit 2 s: BridgeError "${name} pool timeout" after about 2 s`, h.err instanceof BridgeError && h.err.message === name + ' pool timeout' && h.ms > 1900 && h.ms < 4000, msg(h));
  const a = call(run, 'exit0');
  check(`${name} pool, the next call: a new pool, the same numbers as the call in the main thread`, !a.err && ok(a.res), msg(a));
  sleep(300);   // worker 0 ends now; the event loop does not turn, so its 'exit' event is not seen
  const b = call(run), c = call(run);
  check(`${name} pool, worker 0 ended after that batch (the event loop never turned): the next batch gives "${name} pool error" within 5 s, the one after it works with a new pool`, b.err instanceof BridgeError && b.err.message.startsWith(name + ' pool error') && b.ms < 5000 && !c.err && ok(c.res), msg(b) + ' | ' + msg(c));
}

const regCalls = [{ x: x0, jac: true }, { x: x1, jac: false }];
const regSeq = regCalls.map((c) => flowEnc(c.x, tau, { jac: c.jac, settings: REG }));
sequence('reg', () => regBatch(regCalls, tau, 2, REG), (res) => res.length === 2 && res[0].ok && same(res[0].end, regSeq[0].end) && same(res[0].M, regSeq[0].M) && res[1].ok && same(res[1].end, regSeq[1].end));
const monoStarts = [x0, x1];
const monoSeq = monoStarts.map((x) => monodromy(x, tau));
sequence('monodromy', () => monoBatch(monoStarts, tau, 2), (res) => res.length === 2 && res.every((r, i) => same(r.end, monoSeq[i].end) && r.M.every((row, k) => same(row, Array.from(monoSeq[i].M[k])))));
check('the pool failures are counted in stats of src/ias/bridge.js: 2 pool timeouts, 4 pool errors, lastReason set; no bridge timeout or error', stats.poolTimeouts - s0.poolTimeouts === 2 && stats.poolErrors - s0.poolErrors === 4 && /pool error/.test(stats.lastReason || '') && stats.timeouts === 0 && stats.errors === 0,
  `poolTimeouts ${stats.poolTimeouts}, poolErrors ${stats.poolErrors}, lastReason ${stats.lastReason}`);

// ias-bridge.py with a pool of 2 processes: a pool process dies during a request
{
  const DIE = 0.0123456789;
  const py = spawn(settings.ias.python, ['-B', path.join(root, 'src', 'ias', 'ias-bridge.py'), '2', String(settings.ias.guardRatio), 'legacy', '0.01', '2'], { env: { ...process.env, ORBIT_TEST_IAS_DIE_TAU: String(DIE) }, stdio: ['pipe', 'pipe', 'pipe'] });
  let errText = ''; py.stderr.on('data', (d) => { errText += d; });
  const lines = readline.createInterface({ input: py.stdout });
  const waiting = [];
  lines.on('line', (l) => { const w = waiting.shift(); if (w) w(l); });
  const ask = (id, t) => new Promise((resolve) => {
    const t0 = performance.now();
    const timer = setTimeout(() => resolve({ timeout: true, ms: performance.now() - t0 }), 60000);
    waiting.push((l) => { clearTimeout(timer); resolve({ ans: JSON.parse(l), ms: performance.now() - t0 }); });
    py.stdin.write(JSON.stringify({ id, starts: [Array.from(x0), Array.from(x1)], tau: t }) + '\n');
  });
  const r1 = await ask(1, 0.05), r2 = await ask(2, DIE), r3 = await ask(3, 0.05);
  py.stdin.end();
  check('ias-bridge.py, pool of 2: a normal request is answered', !!(r1.ans && r1.ans.id === 1 && r1.ans.ends && r1.ans.ends.length === 2), r1.timeout ? 'no answer ' + errText.slice(-200) : `${r1.ms.toFixed(0)} ms`);
  check('ias-bridge.py, pool of 2: a pool process that dies during a request gives an answer with an error at once (under 20 s)', !!(r2.ans && r2.ans.id === 2 && /pool died/.test(r2.ans.error || '') && r2.ms < 20000), r2.timeout ? 'no answer' : `${r2.ms.toFixed(0)} ms: ${r2.ans.error}`);
  check('ias-bridge.py, pool of 2: the next request is answered by a new pool with the same numbers as the first', !!(r3.ans && r3.ans.id === 3 && r3.ans.ends && r1.ans && JSON.stringify(r3.ans.ends) === JSON.stringify(r1.ans.ends)), r3.timeout ? 'no answer' : `${r3.ms.toFixed(0)} ms`);
}
console.log(`time ${((Date.now() - t00) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

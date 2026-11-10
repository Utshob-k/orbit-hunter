// SPDX-License-Identifier: MIT
// pool of worker threads for monodromy() of src/stability.js (--mono-threads=K of tools/family-follow-ias.mjs). The main thread stays synchronous, as with the IAS15 bridge: monoBatch() writes the starts and tau, rtol, atol and hMax
// (of the main thread's settings) to shared memory, wakes the workers (src/mono-worker.mjs), which take the pieces from a shared counter, and blocks with Atomics.wait until every worker has left the batch.
// The pool starts at the first call with K workers (unref'd, like the bridge worker) and stays; it holds at most MAXP pieces per batch (tools/family-follow-ias.mjs refuses --mono-threads and --fast with more than 64 pieces).
// A batch that takes longer than settings.ias.timeoutMs (measured with the monotonic clock performance.now()) throws a BridgeError (reason 'monodromy pool timeout', a failed attempt for correct0, as a bridge
// timeout); the workers are then terminated and the next call starts a new pool. A worker thread that has ended (between batches or inside one) gives a BridgeError 'monodromy pool error' and a new pool too,
// within about a second: every worker sets its entry of a shared liveness array to 1 when it starts and to 2 in its process 'exit' handler (also after an uncaught error), and the main thread, which cannot see
// the 'exit' and 'error' events while it blocks, tests that array before every batch and after every slice of at most 1 s of its wait (the events are still used when the event loop turns between batches).
// An error that monodromy() throws for a piece is thrown here as the sequential loop would throw it. Both kinds of BridgeError are reported to poolFailed of src/ias/errors.js (counted in stats of src/ias/bridge.js: poolTimeouts, poolErrors).
// Test hook (test/pool-failures.test.js), inert unless set: the environment variable ORBIT_TEST_POOL when the pool starts; 'hold=MS' makes every worker wait MS ms before it counts itself out of a batch,
// 'exit0' makes worker 0 end (process.exit) right after its first batch, 'die0' at the start of its first batch (before it counts itself out).
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from './settings.js';
import { BridgeError, poolFailed } from './ias/errors.js';

const MAXP = 64, ERR = 160;
let pool = null;

function start(K) {
  const ctrlBuf = new SharedArrayBuffer(4 * 16), inBuf = new SharedArrayBuffer(8 * (4 + 12 * MAXP)), outBuf = new SharedArrayBuffer(8 * 156 * MAXP), statBuf = new SharedArrayBuffer(4 * MAXP), errBuf = new SharedArrayBuffer(8 * ERR * MAXP);
  const liveBuf = new SharedArrayBuffer(4 * K);   // per worker: 0 not started yet, 1 running, 2 ended
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mono-worker.mjs');
  const workers = [];
  const p = { K, workers, ctrl: new Int32Array(ctrlBuf), inp: new Float64Array(inBuf), out: new Float64Array(outBuf), stat: new Int32Array(statBuf), err: new Float64Array(errBuf), live: new Int32Array(liveBuf), broken: null, closing: false };
  for (let k = 0; k < K; k++) {
    const w = new Worker(file, { workerData: { ctrlBuf, inBuf, outBuf, statBuf, errBuf, liveBuf, index: k, K } }); w.unref(); workers.push(w);
    w.on('error', (e) => { if (!p.closing) p.broken = 'worker error: ' + (e && e.message); });
    w.on('exit', (code) => { if (!p.closing && !p.broken) p.broken = 'worker exited (code ' + code + ')'; });
  }
  return p;
}

// end the pool (its workers are terminated; the next call starts a new one), count the failure and throw the BridgeError
function drop(msg, reason) {
  const p = pool; pool = null;
  if (p) { p.closing = true; for (const w of p.workers) { try { w.terminate(); } catch (e) {} } }
  const e = new BridgeError(msg, reason); poolFailed(e); throw e;
}
// the first worker whose liveness entry says it has ended, or -1
function ended(p) { for (let k = 0; k < p.K; k++) if (Atomics.load(p.live, k) === 2) return k; return -1; }

// starts: array of 12-vectors; returns [{ end, M }] in the order of the starts, in the form of monodromy(): end a Float64Array(12), M 12 arrays of 12 numbers
export function monoBatch(starts, tau, K) {
  if (starts.length > MAXP) throw new Error('too many pieces for the monodromy pool: ' + starts.length + ', at most ' + MAXP);
  if (pool && pool.broken) drop('monodromy pool error: ' + pool.broken, 'monodromy pool error');
  if (pool && ended(pool) >= 0) drop('monodromy pool error: worker ' + ended(pool) + ' has ended', 'monodromy pool error');
  if (!pool) pool = start(K);
  if (pool.K !== K) throw new Error('the monodromy pool has ' + pool.K + ' threads, not ' + K);
  const { ctrl, inp, out, stat, err } = pool, n = starts.length;
  inp[0] = tau; inp[1] = settings.mrtol; inp[2] = settings.matol; inp[3] = settings.hMax;
  for (let i = 0; i < n; i++) inp.set(starts[i], 4 + 12 * i);
  Atomics.store(ctrl, 2, n); Atomics.store(ctrl, 1, 0); Atomics.store(ctrl, 3, 0);
  Atomics.add(ctrl, 0, 1); Atomics.notify(ctrl, 0);
  const limit = performance.now() + settings.ias.timeoutMs;
  for (let c = Atomics.load(ctrl, 3); c < K; c = Atomics.load(ctrl, 3)) {
    const left = limit - performance.now();
    if (left <= 0) drop('monodromy pool timeout', 'monodromy pool timeout');
    if (Atomics.wait(ctrl, 3, c, Math.min(left, 1000)) === 'timed-out' && Atomics.load(ctrl, 3) < K && ended(pool) >= 0) drop('monodromy pool error: worker ' + ended(pool) + ' has ended', 'monodromy pool error');
  }
  for (let i = 0; i < n; i++) if (stat[i]) {   // the failed piece with the smallest index is the one the sequential loop would have thrown first
    let text = ''; for (let k = 0; k < ERR && err[ERR * i + k] !== 0; k++) text += String.fromCharCode(err[ERR * i + k]);
    throw new Error(text);
  }
  const res = [];
  for (let i = 0; i < n; i++) res.push({ end: Float64Array.from(out.subarray(156 * i, 156 * i + 12)), M: Array.from({ length: 12 }, (_, k) => Array.from(out.subarray(156 * i + 12 + 12 * k, 156 * i + 24 + 12 * k))) });
  return res;
}

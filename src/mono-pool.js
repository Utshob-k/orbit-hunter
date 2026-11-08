// SPDX-License-Identifier: MIT
// pool of worker threads for monodromy() of src/stability.js (--mono-threads=K of tools/family-follow-ias.mjs). The main thread stays synchronous, as with the IAS15 bridge: monoBatch() writes the starts and tau, rtol, atol and hMax
// (of the main thread's settings) to shared memory, wakes the workers (src/mono-worker.mjs), which take the pieces from a shared counter, and blocks with Atomics.wait until every worker has left the batch.
// The pool starts at the first call with K workers (unref'd, like the bridge worker) and stays; it holds at most MAXP pieces per batch (tools/family-follow-ias.mjs refuses --mono-threads and --fast with more than 64 pieces).
// A batch that takes longer than settings.ias.timeoutMs throws a BridgeError (reason 'monodromy pool timeout', a failed attempt for correct0, as a bridge timeout); the workers are then terminated and the next
// call starts a new pool. A worker thread that ended or failed (its 'exit' or 'error' event, seen before the next batch) gives a BridgeError 'monodromy pool error' and a new pool too; a worker that dies inside
// a batch is seen as a timeout. An error that monodromy() throws for a piece is thrown here as the sequential loop would throw it.
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from './settings.js';
import { BridgeError } from './ias/errors.js';

const MAXP = 64, ERR = 160;
let pool = null;

function start(K) {
  const ctrlBuf = new SharedArrayBuffer(4 * 16), inBuf = new SharedArrayBuffer(8 * (4 + 12 * MAXP)), outBuf = new SharedArrayBuffer(8 * 156 * MAXP), statBuf = new SharedArrayBuffer(4 * MAXP), errBuf = new SharedArrayBuffer(8 * ERR * MAXP);
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mono-worker.mjs');
  const workers = [];
  const p = { K, workers, ctrl: new Int32Array(ctrlBuf), inp: new Float64Array(inBuf), out: new Float64Array(outBuf), stat: new Int32Array(statBuf), err: new Float64Array(errBuf), dead: false, broken: null, closing: false };
  for (let k = 0; k < K; k++) {
    const w = new Worker(file, { workerData: { ctrlBuf, inBuf, outBuf, statBuf, errBuf, K } }); w.unref(); workers.push(w);
    w.on('error', (e) => { if (!p.closing) p.broken = 'worker error: ' + (e && e.message); });
    w.on('exit', (code) => { if (!p.closing && !p.broken) p.broken = 'worker exited (code ' + code + ')'; });
  }
  return p;
}

// end the pool (its workers are terminated; the next call starts a new one) and throw the BridgeError
function drop(msg, reason) {
  const p = pool; pool = null;
  if (p) { p.closing = true; p.dead = true; for (const w of p.workers) { try { w.terminate(); } catch (e) {} } }
  throw new BridgeError(msg, reason);
}

// starts: array of 12-vectors; returns [{ end, M }] in the order of the starts, in the form of monodromy(): end a Float64Array(12), M 12 arrays of 12 numbers
export function monoBatch(starts, tau, K) {
  if (starts.length > MAXP) throw new Error('too many pieces for the monodromy pool: ' + starts.length + ', at most ' + MAXP);
  if (pool && pool.dead) drop('monodromy pool error: the pool is dead', 'monodromy pool error');
  if (pool && pool.broken) drop('monodromy pool error: ' + pool.broken, 'monodromy pool error');
  if (!pool) pool = start(K);
  if (pool.K !== K) throw new Error('the monodromy pool has ' + pool.K + ' threads, not ' + K);
  const { ctrl, inp, out, stat, err } = pool, n = starts.length;
  inp[0] = tau; inp[1] = settings.mrtol; inp[2] = settings.matol; inp[3] = settings.hMax;
  for (let i = 0; i < n; i++) inp.set(starts[i], 4 + 12 * i);
  Atomics.store(ctrl, 2, n); Atomics.store(ctrl, 1, 0); Atomics.store(ctrl, 3, 0);
  Atomics.add(ctrl, 0, 1); Atomics.notify(ctrl, 0);
  const limit = Date.now() + settings.ias.timeoutMs;
  for (let c = Atomics.load(ctrl, 3); c < K; c = Atomics.load(ctrl, 3)) {
    const left = limit - Date.now();
    if (left <= 0 || Atomics.wait(ctrl, 3, c, left) === 'timed-out') drop('monodromy pool timeout', 'monodromy pool timeout');
  }
  for (let i = 0; i < n; i++) if (stat[i]) {   // the failed piece with the smallest index is the one the sequential loop would have thrown first
    let text = ''; for (let k = 0; k < ERR && err[ERR * i + k] !== 0; k++) text += String.fromCharCode(err[ERR * i + k]);
    throw new Error(text);
  }
  const res = [];
  for (let i = 0; i < n; i++) res.push({ end: Float64Array.from(out.subarray(156 * i, 156 * i + 12)), M: Array.from({ length: 12 }, (_, k) => Array.from(out.subarray(156 * i + 12 + 12 * k, 156 * i + 24 + 12 * k))) });
  return res;
}

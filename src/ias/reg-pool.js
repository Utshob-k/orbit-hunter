// SPDX-License-Identifier: MIT
// pool of worker threads for the reg.js calls of one request of src/ias/bridge.js (--reg-threads=K of tools/family-follow-ias.mjs). The main thread stays synchronous, as with the IAS15 bridge: regBatch() writes the starts and tau to shared
// memory, wakes the workers (src/ias/reg-worker.mjs), which take the calls from a shared counter, and blocks with Atomics.wait until every worker has left the batch. The results come back in shared memory, number for number.
// The pool starts at the first call with K workers (unref'd, like the bridge worker) and stays; it holds at most MAXT calls per batch.
// A batch that takes longer than settings.ias.timeoutMs (measured with the monotonic clock performance.now()) throws a BridgeError (reason 'reg pool timeout', a failed attempt for correct0, as a bridge timeout);
// the workers are then terminated and the next call starts a new pool. A worker thread that has ended (between batches or inside one) gives a BridgeError 'reg pool error' and a new pool too, within about
// a second: every worker sets its entry of a shared liveness array to 1 when it starts and to 2 in its process 'exit' handler (also after an uncaught error), and the main thread, which cannot see the 'exit'
// and 'error' events while it blocks, tests that array before every batch and after every slice of at most 1 s of its wait (the events are still used when the event loop turns between batches).
// A reg.js call that throws inside a worker comes back as { error } and is thrown by the bridge as the sequential call would throw it. Both kinds of BridgeError are reported to poolFailed of
// src/ias/errors.js (counted in stats of src/ias/bridge.js: poolTimeouts, poolErrors).
// Test hook (test/pool-failures.test.js), inert unless set: the environment variable ORBIT_TEST_POOL when the pool starts; 'hold=MS' makes every worker wait MS ms before it counts itself out of a batch,
// 'exit0' makes worker 0 end (process.exit) right after its first batch, 'die0' at the start of its first batch (before it counts itself out).
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '../settings.js';
import { BridgeError, poolFailed } from './errors.js';

const MAXT = 512, ERR = 160, NIN = 13, NOUT = 162;   // calls per batch, characters of a text, numbers of a call (12 + jac flag), numbers of a result (12 end, 144 M, macro, subSteps, endTrials, stagnation, minD1, d2AtMinD1)
let pool = null;

function start(K, regSettings) {
  const ctrlBuf = new SharedArrayBuffer(4 * 16), inBuf = new SharedArrayBuffer(8 * (1 + NIN * MAXT)), outBuf = new SharedArrayBuffer(8 * NOUT * MAXT), statBuf = new SharedArrayBuffer(4 * MAXT), errBuf = new SharedArrayBuffer(8 * ERR * MAXT);
  const liveBuf = new SharedArrayBuffer(4 * K);   // per worker: 0 not started yet, 1 running, 2 ended
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'reg-worker.mjs');
  const workers = [];
  const p = { K, workers, ctrl: new Int32Array(ctrlBuf), inp: new Float64Array(inBuf), out: new Float64Array(outBuf), stat: new Int32Array(statBuf), err: new Float64Array(errBuf), live: new Int32Array(liveBuf), broken: null, closing: false };
  for (let k = 0; k < K; k++) {
    const w = new Worker(file, { workerData: { ctrlBuf, inBuf, outBuf, statBuf, errBuf, liveBuf, index: k, K, regSettings } }); w.unref(); workers.push(w);
    w.on('error', (e) => { if (!p.closing) p.broken = 'worker error: ' + (e && e.message); });
    w.on('exit', (code) => { if (!p.closing && !p.broken) p.broken = 'worker exited (code ' + code + ')'; });
  }
  return p;
}

// end the pool (its workers are terminated; the next call starts a new one), report the failure and throw the BridgeError
function drop(msg, reason) {
  const p = pool; pool = null;
  if (p) { p.closing = true; for (const w of p.workers) { try { w.terminate(); } catch (e) {} } }
  const e = new BridgeError(msg, reason); poolFailed(e); throw e;
}
// the first worker whose liveness entry says it has ended, or -1
function ended(p) { for (let k = 0; k < p.K; k++) if (Atomics.load(p.live, k) === 2) return k; return -1; }

// calls: [{ x (12 numbers), jac }]; returns one entry per call, in the order of the calls: the result of flowEnc(x, tau, { jac, settings: regSettings }) with the fields the bridge reads
// ({ ok, end, M (null without jac), macro, subSteps, endTrials, stagnation, minD1, d2AtMinD1 }, or { ok: false, reason }), or { error: text } where flowEnc threw
export function regBatch(calls, tau, K, regSettings) {
  if (calls.length > MAXT) throw new Error('too many calls for the reg.js pool: ' + calls.length + ', at most ' + MAXT);
  if (pool && pool.broken) drop('reg pool error: ' + pool.broken, 'reg pool error');
  if (pool && ended(pool) >= 0) drop('reg pool error: worker ' + ended(pool) + ' has ended', 'reg pool error');
  if (!pool) pool = start(K, regSettings);
  if (pool.K !== K) throw new Error('the reg.js pool has ' + pool.K + ' threads, not ' + K);
  const { ctrl, inp, out, stat, err } = pool, n = calls.length;
  inp[0] = tau;
  for (let i = 0; i < n; i++) { inp.set(calls[i].x, 1 + NIN * i); inp[1 + NIN * i + 12] = calls[i].jac ? 1 : 0; }
  Atomics.store(ctrl, 2, n); Atomics.store(ctrl, 1, 0); Atomics.store(ctrl, 3, 0);
  Atomics.add(ctrl, 0, 1); Atomics.notify(ctrl, 0);
  const limit = performance.now() + settings.ias.timeoutMs;
  for (let c = Atomics.load(ctrl, 3); c < K; c = Atomics.load(ctrl, 3)) {
    const left = limit - performance.now();
    if (left <= 0) drop('reg pool timeout', 'reg pool timeout');
    if (Atomics.wait(ctrl, 3, c, Math.min(left, 1000)) === 'timed-out' && Atomics.load(ctrl, 3) < K && ended(pool) >= 0) drop('reg pool error: worker ' + ended(pool) + ' has ended', 'reg pool error');
  }
  const text = (i) => { let s = ''; for (let k = 0; k < ERR && err[ERR * i + k] !== 0; k++) s += String.fromCharCode(err[ERR * i + k]); return s; };
  const res = [];
  for (let i = 0; i < n; i++) {
    const b = NOUT * i;
    if (stat[i] === 2) res.push({ error: text(i) });
    else if (stat[i] === 1) res.push({ ok: false, reason: text(i) });
    else res.push({ ok: true, end: Float64Array.from(out.subarray(b, b + 12)), M: stat[i] === 0 ? Float64Array.from(out.subarray(b + 12, b + 156)) : null, macro: out[b + 156], subSteps: out[b + 157], endTrials: out[b + 158], stagnation: out[b + 159] === 1, minD1: out[b + 160], d2AtMinD1: out[b + 161] });
  }
  return res;
}

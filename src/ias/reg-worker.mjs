// SPDX-License-Identifier: MIT
// worker thread of the reg.js pool (src/ias/reg-pool.js). It waits on ctrl[0] for the next batch, takes calls from the shared counter ctrl[1] until ctrl[2] calls are taken, runs flowEnc() of src/ias/reg.js on each
// (the settings of reg.js come from the main thread through workerData), writes the result or the text of the failure, and counts itself out in ctrl[3].
// stat per call: 0 = ok with the matrix, 3 = ok without it (jac false), 1 = flowEnc returned ok: false (its reason is the text), 2 = flowEnc threw (the message is the text).
// live[index]: 1 while the thread runs, 2 from its process 'exit' handler on (also after an uncaught error); the pool reads it while it blocks. ORBIT_TEST_POOL: the test hook of src/ias/reg-pool.js (unset: no effect).
import { workerData } from 'worker_threads';
import { flowEnc } from './reg.js';

const { ctrlBuf, inBuf, outBuf, statBuf, errBuf, liveBuf, index, K, regSettings } = workerData;
const ctrl = new Int32Array(ctrlBuf), inp = new Float64Array(inBuf), out = new Float64Array(outBuf), stat = new Int32Array(statBuf), err = new Float64Array(errBuf), live = new Int32Array(liveBuf);
const ERR = 160, NIN = 13, NOUT = 162;
const put = (i, text) => { const c = Math.min(text.length, ERR - 1); for (let k = 0; k < c; k++) err[ERR * i + k] = text.charCodeAt(k); err[ERR * i + c] = 0; };
process.on('exit', () => Atomics.store(live, index, 2));
Atomics.store(live, index, 1);
const hook = process.env.ORBIT_TEST_POOL || '', hold = /^hold=\d+$/.test(hook) ? Number(hook.slice(5)) : 0;
let seen = 0;
for (;;) {
  Atomics.wait(ctrl, 0, seen);
  seen = Atomics.load(ctrl, 0);
  if (hook === 'die0' && index === 0) process.exit(0);
  const n = Atomics.load(ctrl, 2), tau = inp[0];
  for (;;) {
    const i = Atomics.add(ctrl, 1, 1);
    if (i >= n) break;
    try {
      const jac = inp[1 + NIN * i + 12] === 1;
      const r = flowEnc(Float64Array.from(inp.subarray(1 + NIN * i, 1 + NIN * i + 12)), tau, { jac, settings: regSettings });
      if (!r.ok) { put(i, String(r.reason)); stat[i] = 1; continue; }
      const b = NOUT * i;
      out.set(r.end, b);
      if (jac) out.set(r.M, b + 12);
      out[b + 156] = r.macro; out[b + 157] = r.subSteps; out[b + 158] = r.endTrials; out[b + 159] = r.stagnation ? 1 : 0; out[b + 160] = r.minD1; out[b + 161] = r.d2AtMinD1;
      stat[i] = jac ? 0 : 3;
    } catch (e) {
      put(i, String(e && e.message ? e.message : e)); stat[i] = 2;
    }
  }
  if (hold > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, hold);
  if (Atomics.add(ctrl, 3, 1) + 1 === K) Atomics.notify(ctrl, 3);
  if (hook === 'exit0' && index === 0) process.exit(0);
}

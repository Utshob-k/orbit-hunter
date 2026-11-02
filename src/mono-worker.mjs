// SPDX-License-Identifier: MIT
// worker thread of the monodromy pool (src/mono-pool.js). It waits on ctrl[0] for the next batch, takes pieces from the shared counter ctrl[1] until ctrl[2] pieces are taken, runs monodromy() of src/stability.js on
// each (rtol, atol and hMax come from the batch, never from the settings of this thread), writes end (12 numbers) and M (144) of the piece, or the text of the error, and counts itself out in ctrl[3].
import { workerData } from 'worker_threads';
import { monodromy } from './stability.js';

const { ctrlBuf, inBuf, outBuf, statBuf, errBuf, K } = workerData;
const ctrl = new Int32Array(ctrlBuf), inp = new Float64Array(inBuf), out = new Float64Array(outBuf), stat = new Int32Array(statBuf), err = new Float64Array(errBuf);
const ERR = 160;   // characters of an error text per piece
let seen = 0;
for (;;) {
  Atomics.wait(ctrl, 0, seen);
  seen = Atomics.load(ctrl, 0);
  const n = Atomics.load(ctrl, 2), tau = inp[0], rtol = inp[1], atol = inp[2], hMax = inp[3];
  for (;;) {
    const i = Atomics.add(ctrl, 1, 1);
    if (i >= n) break;
    try {
      const r = monodromy(Float64Array.from(inp.subarray(4 + 12 * i, 16 + 12 * i)), tau, { rtol, atol, hMax });
      out.set(r.end, 156 * i);
      for (let k = 0; k < 12; k++) out.set(r.M[k], 156 * i + 12 + 12 * k);
      stat[i] = 0;
    } catch (e) {
      const text = String(e && e.message ? e.message : e), c = Math.min(text.length, ERR - 1);
      for (let k = 0; k < c; k++) err[ERR * i + k] = text.charCodeAt(k);
      err[ERR * i + c] = 0; stat[i] = 1;
    }
  }
  if (Atomics.add(ctrl, 3, 1) + 1 === K) Atomics.notify(ctrl, 3);
}

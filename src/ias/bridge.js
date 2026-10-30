// SPDX-License-Identifier: MIT
// synchronous bridge from the (synchronous) shooting code to REBOUND IAS15 in a Python process, with the guards for triple approaches.
// The main thread posts a request to a worker thread that owns one long-lived Python process (ias-bridge.py) and blocks with Atomics.wait until the
// answer is in shared memory, settings.ias.timeoutMs at most per request. A timeout kills the Python process (a new one starts for the next request)
// and the request fails (BridgeError, reason 'timeout'). There is no fallback to dp45.
// The pieces that are encounter pieces (smallest sampled pair distance below 1e-3) are recomputed by reg.js, which also gives their 12 x 12 matrices;
// unflagged pieces with a pair distance below settings.ias.crossCheckBelow are cross-checked with reg.js and replaced where the end states differ.
// The Python process and the worker are started at the first request, so importing this file costs nothing when the dp45 integrator is used.
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { flowEnc } from './reg.js';
import { settings } from '../settings.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const REG_SETTINGS = JSON.parse(fs.readFileSync(path.join(here, 'reg-settings.json'), 'utf8'));
const PAIRS = [[0, 1], [0, 2], [1, 2]];

// thresholds of the guards and of the missed-flag check (the ratio of G1b and the cross-check values are in settings.ias)
const START_BELOW = 1e-4;          // G3: a piece start with a pair distance below this
const MISSED_COUNT_BELOW = 1e-3;   // an unflagged piece in which reg.js finds a closest approach below this is counted as a missed flag
const MISSED_STOP_BELOW = 5e-4;    // and the trace stops if it is below this
const SMALL_RESIDUAL = 1e-10;      // a guard trip right after a Newton residual below this ends the trace at once

const BUF_NUMBERS = 6000, PER_PIECE = 24;   // room of the shared buffer; an answer has 24 numbers per piece (12 end state, 1 flag, 11 analysis)
const ctrlBuf = new SharedArrayBuffer(32), dataBuf = new SharedArrayBuffer(8 * BUF_NUMBERS);
const ctrl = new Int32Array(ctrlBuf), data = new Float64Array(dataBuf);
let worker = null;
function getWorker() {
  if (!worker) {
    const ias = settings.ias;
    worker = new Worker(path.join(here, 'bridge-worker.mjs'), { workerData: { ctrlBuf, dataBuf, python: ias.python, script: path.join(here, 'ias-bridge.py'), mode: ias.adaptiveMode, guardRatio: ias.guardRatio, firstStep: ias.firstStep, firstStepFactor: ias.firstStepFactor } });
    worker.unref();
  }
  return worker;
}

export const stats = { regPieces: 0, regMacro: 0, regSub: 0, regEndTrials: 0, regStagnation: 0, lastReason: null, calls: 0, pieces: 0, steps: 0, timeouts: 0, errors: 0, stepFloor: 0, encounterPieces: 0 };
export const gstats = { trips: { G1a: 0, G1b: 0, G2: 0, G3: 0 }, tripsTotal: 0, tripList: [], ratioMin: Infinity, d2CloseMin: Infinity, attRatioMin: Infinity, attD2Close: Infinity, samePair: 0,
  missChecks: 0, missedCounted: 0, missedStops: 0, missFailed: 0, regFailures: 0, cMinSeen: Infinity, cRatioMin: Infinity, tIas: 0, tC: 0, tMiss: 0, xchk: 0, xchkMaxDiff: 0, replaced: 0, replList: [], tX: 0 };
let nextId = 1;
export class BridgeError extends Error { constructor(msg, reason) { super(msg); this.reason = reason; } }
export class GuardError extends BridgeError { constructor(kind, info) { super('guard ' + kind, 'guard ' + kind); this.kind = kind; this.info = info; } }
// not a BridgeError: it ends the trace (the driver catches it)
export class TraceStop extends Error { constructor(reason, info) { super(reason); this.reason = reason; this.info = info || null; this.isTraceStop = true; } }

function request(msg) {
  const id = nextId++;
  const w = getWorker();
  Atomics.store(ctrl, 0, 0);
  w.postMessage({ id, ...msg });
  const r = Atomics.wait(ctrl, 0, 0, settings.ias.timeoutMs);
  if (r === 'timed-out') { stats.timeouts++; stats.lastReason = 'no answer within ' + settings.ias.timeoutMs / 60000 + ' minutes'; w.postMessage({ kill: true }); throw new BridgeError('bridge timeout', 'timeout'); }
  if (Atomics.load(ctrl, 0) !== 2 || ctrl[3] !== id) {
    // the worker leaves the reason (the python process could not be started, exited, or answered with an error) as char codes in the data buffer
    const why = ctrl[5] > 0 ? String.fromCharCode(...data.subarray(0, ctrl[5])) : null;
    stats.errors++; stats.lastReason = why || 'bridge error'; w.postMessage({ kill: true }); throw new BridgeError('bridge error' + (why ? ': ' + why : ''), 'bridge error');
  }
  return ctrl[1];
}

// the matrix by finite differences of reg.js (settings.ias.matrix 'fd-forward' or 'fd-central'): column c is the difference quotient of the end states of flows from the start state x with component c changed, with the increment
// h_c = 1e-7 * max(1, |x_c|) (forward, against the unperturbed end state end0) or 1e-5 * max(1, |x_c|) (central, both signs); the quotient is divided by the increment that was really added. A failed flow gives { ok: false }.
export function fdMatrix(x, tau, end0, mode) {
  const central = mode === 'fd-central', h0 = central ? 1e-5 : 1e-7, M = new Float64Array(144);
  for (let c = 0; c < 12; c++) {
    const h = h0 * Math.max(1, Math.abs(x[c])), xp = Float64Array.from(x); xp[c] = x[c] + h;
    const rp = flowEnc(xp, tau, { jac: false, settings: REG_SETTINGS }); if (!rp.ok) return { ok: false, reason: rp.reason };
    let lo = end0, dd = xp[c] - x[c];
    if (central) { const xm = Float64Array.from(x); xm[c] = x[c] - h; const rm = flowEnc(xm, tau, { jac: false, settings: REG_SETTINGS }); if (!rm.ok) return { ok: false, reason: rm.reason }; lo = rm.end; dd += x[c] - xm[c]; }
    for (let i = 0; i < 12; i++) M[i * 12 + c] = (rp.end[i] - lo[i]) / dd;
  }
  return { ok: true, M };
}
const fdMode = () => (settings.ias.matrix === 'fd-forward' || settings.ias.matrix === 'fd-central' ? settings.ias.matrix : null);
function fdOrThrow(x, tau, end0, mode, key, what) {
  const t0 = Date.now(); const f = fdMatrix(x, tau, end0, mode); gstats[key] += Date.now() - t0;
  if (!f.ok) { gstats.regFailures++; throw new BridgeError('reg: ' + f.reason + ' (fd' + what + ')', 'reg failure'); }
  return f.M;
}

// counters of settings.ias.piecesBy (only written to the output of a run that has the option): the pieces that IAS15 flagged and that were taken from IAS15 anyway ('ias'), the pieces
// taken from reg.js that were not flagged and the largest difference of their end state to IAS15, as in the cross-check ('reg')
export const pbStats = { flaggedTakenFromIas: 0, unflaggedFromReg: 0, maxDiffToIas: 0 };
const piecesBy = () => (settings.ias.piecesBy === 'ias' || settings.ias.piecesBy === 'reg' ? settings.ias.piecesBy : null);

const pairMin = (s) => Math.min(...PAIRS.map(([i, j]) => Math.hypot(s[2 * j] - s[2 * i], s[2 * j + 1] - s[2 * i + 1])));

// missed flag: reg.js without the tangent on every unflagged piece
function missedFlagCheck(starts, enc, tau, ana) {
  for (let i = 0; i < starts.length; i++) if (!enc[i]) {
    const t0 = Date.now(); const r = flowEnc(starts[i], tau, { jac: false, settings: REG_SETTINGS }); gstats.tMiss += Date.now() - t0; gstats.missChecks++;
    if (!r.ok) { gstats.missFailed++; continue; }
    missedFromResult(i, r, ana);
  }
}
function missedFromResult(i, r, ana) {
  if (r.minD1 < gstats.cMinSeen) gstats.cMinSeen = r.minD1;
  if (r.minD1 < MISSED_COUNT_BELOW) { gstats.missedCounted++; if (r.minD1 < MISSED_STOP_BELOW) { gstats.missedStops++; throw new TraceStop('missed flag', { piece: i, cMinD1: r.minD1, d2AtMin: r.d2AtMinD1, iasMin: ana ? ana[i][3] : null }); } }
}

// a guard trip fails the attempt; right after a Newton residual that was already small it ends the trace
function trip(kind, info) {
  const obs = settings.observer;
  gstats.trips[kind]++; gstats.tripsTotal++;
  if (gstats.tripList.length < 2000) gstats.tripList.push(Object.assign({ kind, step: obs ? obs.step : null }, info));
  const lr = obs && obs.lastResidual ? obs.lastResidual() : null;
  if (lr !== null && lr <= SMALL_RESIDUAL) throw new TraceStop('triple-approach guard ' + kind + ' (previous Newton residual ' + lr.toExponential(2) + ')', Object.assign({ kind, lastResidual: lr }, info));
  throw new GuardError(kind, info);
}

// starts: array of 12-vectors; returns the end states (those of the encounter pieces from reg.js) with the properties
// enc (0/1 per piece), ana (11 numbers per piece, see ias-bridge.py) and mats (the 12 x 12 matrices from reg.js of the flagged and of the replaced pieces, else null)
export function iasPieces(starts, tau) {
  if (PER_PIECE * starts.length > BUF_NUMBERS) throw new Error('too many pieces for the shared buffer: ' + starts.length + ' pieces need ' + PER_PIECE * starts.length + ' numbers, there is room for ' + BUF_NUMBERS + ' (at most ' + Math.floor(BUF_NUMBERS / PER_PIECE) + ' pieces)');
  stats.calls++;
  const ias = settings.ias, obs = settings.observer, FD = fdMode(), PB = piecesBy();
  for (let i = 0; i < starts.length; i++) { const d = pairMin(starts[i]); if (d < START_BELOW) trip('G3', { piece: i, d }); }
  let t0 = Date.now(); const n = request({ starts: starts.map((s) => Array.from(s)), tau }); gstats.tIas += Date.now() - t0;
  const m = starts.length, out = [];
  for (let i = 0; i < 12 * m; i += 12) out.push(Float64Array.from(data.subarray(i, i + 12)));
  out.enc = Array.from(data.subarray(12 * m, 13 * m));
  out.ana = []; for (let i = 0; i < m; i++) out.ana.push(Array.from(data.subarray(13 * m + 11 * i, 13 * m + 11 * (i + 1))));
  // guards on the IAS15 pass: G1a, G1b, G2 on every flagged piece, G2 also for two flagged pieces of different pairs
  const pairs = []; for (let i = 0; i < m; i++) if (out.enc[i]) {
    const a = out.ana[i]; pairs.push(a[7]);
    const ratio = a[5] / a[4]; if (ratio < gstats.ratioMin) gstats.ratioMin = ratio; if (ratio < gstats.attRatioMin) gstats.attRatioMin = ratio;
    if (a[6] < gstats.d2CloseMin) gstats.d2CloseMin = a[6]; if (a[6] < gstats.attD2Close) gstats.attD2Close = a[6];
    const info = { piece: i, pair: a[7], d1: a[4], d2: a[5], ratio, d2close: a[6], secondMin: [a[0], a[1], a[2]].sort((x, y) => x - y)[1] };
    if (a[8]) trip('G1a', info);
    if (a[9]) trip('G1b', info);
    if (a[10]) trip('G2', info);
  }
  if (pairs.length > 1) { if (new Set(pairs).size > 1) trip('G2', { reason: 'two flagged pieces of different pairs', pairs }); else gstats.samePair++; }
  // the flagged pieces by reg.js (end state and the 12 x 12 matrix); a failure of reg.js fails the evaluation, there is no fallback
  out.mats = new Array(m).fill(null);
  if (PB === 'ias') {   // every piece is an unflagged piece: the end state of IAS15, the matrix from src/shooting.js; the guards above stay, the missed-flag check (reg.js on every piece) does not run
    const nFlag = out.enc.reduce((a, b) => a + b, 0); pbStats.flaggedTakenFromIas += nFlag;
    out.enc = out.enc.map(() => 0);
    stats.pieces += m; stats.steps += ctrl[2]; stats.encounterPieces += nFlag;
    return out;
  }
  for (let i = 0; i < m; i++) if (out.enc[i]) {
    t0 = Date.now(); const r = flowEnc(starts[i], tau, { jac: !FD, settings: REG_SETTINGS }); gstats.tC += Date.now() - t0;
    if (!r.ok) { gstats.regFailures++; throw new BridgeError('reg: ' + r.reason, 'reg failure'); }
    out[i] = Float64Array.from(r.end); out.mats[i] = FD ? fdOrThrow(starts[i], tau, r.end, FD, 'tC', '') : r.M; stats.regPieces++; stats.regMacro += r.macro; stats.regSub += r.subSteps; stats.regEndTrials += r.endTrials; if (r.stagnation) stats.regStagnation++;
    const cr = r.d2AtMinD1 / r.minD1; if (cr < gstats.cRatioMin) gstats.cRatioMin = cr;
  }
  if (PB === 'reg') {   // every unflagged piece also from reg.js, always replacing IAS15; the missed-flag test is made on this result (no second reg.js call)
    for (let i = 0; i < m; i++) if (!out.enc[i]) {
      gstats.xchk++; t0 = Date.now(); const r = flowEnc(starts[i], tau, { jac: !FD, settings: REG_SETTINGS }); gstats.tX += Date.now() - t0;
      if (!r.ok) { gstats.regFailures++; throw new BridgeError('reg: ' + r.reason + ' (all pieces, piece ' + i + ')', 'reg failure'); }
      let diff = 0; for (let k = 0; k < 12; k++) diff = Math.max(diff, Math.abs(r.end[k] - out[i][k]) / Math.max(1, Math.abs(r.end[k])));
      if (diff > pbStats.maxDiffToIas) pbStats.maxDiffToIas = diff;
      out[i] = Float64Array.from(r.end); out.mats[i] = FD ? fdOrThrow(starts[i], tau, r.end, FD, 'tX', ', all pieces') : r.M; pbStats.unflaggedFromReg++;
      gstats.missChecks++; missedFromResult(i, r, out.ana);
    }
    stats.pieces += m; stats.steps += ctrl[2]; stats.encounterPieces += out.enc.reduce((a, b) => a + b, 0);
    return out;
  }
  // cross-check of every unflagged piece whose smallest IAS15 pair minimum is below crossCheckBelow: reg.js with the tangent on the same start state; where the end states
  // differ by crossCheckDiff or more (largest over the 12 components of |reg - IAS15| / max(1, |reg|)) the end state and the matrix of reg.js replace those of IAS15 and the
  // dp45 matrix; a failure of reg.js fails the evaluation as for a flagged piece; every replacement is logged
  for (let i = 0; i < m; i++) if (!out.enc[i]) {
    const a = out.ana[i]; const pm = Math.min(a[0], a[1], a[2]); if (!(pm < ias.crossCheckBelow)) continue;
    gstats.xchk++; t0 = Date.now(); const r = flowEnc(starts[i], tau, { jac: !FD, settings: REG_SETTINGS }); gstats.tX += Date.now() - t0;
    if (!r.ok) { gstats.regFailures++; throw new BridgeError('reg: ' + r.reason + ' (cross-check, piece ' + i + ')', 'reg failure'); }
    let diff = 0; for (let k = 0; k < 12; k++) diff = Math.max(diff, Math.abs(r.end[k] - out[i][k]) / Math.max(1, Math.abs(r.end[k])));
    if (diff > gstats.xchkMaxDiff) gstats.xchkMaxDiff = diff;
    if (diff >= ias.crossCheckDiff) {
      out[i] = Float64Array.from(r.end); out.mats[i] = FD ? fdOrThrow(starts[i], tau, r.end, FD, 'tX', ', cross-check') : r.M; gstats.replaced++;
      if (gstats.replList.length < 5000) gstats.replList.push({ call: stats.calls, step: obs ? obs.step : null, piece: i, pairMin: pm, diff });
    }
  }
  missedFlagCheck(starts, out.enc, tau, out.ana);
  stats.pieces += m; stats.steps += ctrl[2]; stats.encounterPieces += out.enc.reduce((a, b) => a + b, 0);
  return out;
}

// one piece; null when the bridge fails (a failed evaluation, as flow() returns null when its step limit is exceeded)
export function iasFlow(x0, tau) {
  try { return iasPieces([x0], tau)[0]; } catch (e) { if (e instanceof BridgeError) return null; throw e; }
}

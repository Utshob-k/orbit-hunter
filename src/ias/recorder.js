// SPDX-License-Identifier: MIT
// recorder of the corrector and of the continuation loop of shooting.js for the ias route. It only observes the numbers of the corrector, apart from the stop rules below.
// startRecorder(outFile) installs it as settings.observer; flush() writes <outFile>.diag.jsonl, one json line per continuation attempt (one call of correct()):
// step (loop step), h, tauLam (lam component of the unit tangent), the residual history (sup F at the start of each Newton iteration), iterations, ok, why,
// outcome, tangentDot, lamNew, smax (largest row sum of the piece matrices at the first iteration), the guard and reg.js counters of the attempt, the bridge calls
// and IAS15 steps it used, and the seconds (split into IAS15 pass, reg.js and missed-flag check).
// Stop rules (TraceStop, ending the trace): 5 consecutive attempts failed with a guard trip (not with settings.ias.guards = 'record', where the trips are only counted), or 10 consecutive attempts failed with a failure of reg.js.
import fs from 'fs';
import { stats as bs, gstats, TraceStop } from './bridge.js';
import { settings } from '../settings.js';

const GUARD_STOP = 5, REG_STOP = 10;

export function startRecorder(outFile) {
  let gConsec = 0, rConsec = 0;
  const records = []; let cur = null; let id = 0;
  let sysMono = [];
  const writeAll = () => fs.writeFileSync(outFile + '.diag.jsonl', records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const obs = {
    step: 0, h: 0, tauLam: null, why: null,
    starts() { sysMono = []; },
    mono(i, M) { const f = new Float64Array(144); for (let k = 0; k < 12; k++) for (let q = 0; q < 12; q++) f[12 * k + q] = M[k][q]; sysMono[i] = f; },
    begin() {
      if (cur) { const bad = cur.outcome !== 'accepted'; gConsec = (bad && (cur.guardTrips || 0) > 0) ? gConsec + 1 : 0; rConsec = (bad && (cur.regFail || 0) > 0) ? rConsec + 1 : 0; }
      if (gConsec >= GUARD_STOP && settings.ias.guards !== 'record') throw new TraceStop('triple-approach guard (' + GUARD_STOP + ' consecutive attempts failed with a guard trip)', { consecutive: gConsec });
      if (rConsec >= REG_STOP) throw new TraceStop('stopped by reg.js failures (' + REG_STOP + ' consecutive attempts failed with a failure of reg.js)', { consecutive: rConsec });
      id++; this.why = null; gstats.attRatioMin = Infinity; gstats.attD2Close = Infinity;
      cur = { id, step: this.step, h: this.h, tauLam: this.tauLam, resid: [], t0: Date.now(),
        b0: { calls: bs.calls, steps: bs.steps, timeouts: bs.timeouts, stepFloor: bs.stepFloor, errors: bs.errors, enc: bs.encounterPieces },
        g0: { trips: gstats.tripsTotal, byKind: { ...gstats.trips }, reg: gstats.regFailures, miss: gstats.missedCounted, tIas: gstats.tIas, tC: gstats.tC, tMiss: gstats.tMiss, cm: bs.regMacro } };
      records.push(cur);
    },
    iter(it, Fn) {
      cur.resid.push(Fn);
      if (it === 0) {
        let sm = 0, sp = -1;
        sysMono.forEach((M, i) => { let mx = 0; for (let k = 0; k < 12; k++) { let r = 0; for (let q = 0; q < 12; q++) r += Math.abs(M[12 * k + q]); if (r > mx) mx = r; } if (mx > sm) { sm = mx; sp = i; } });
        cur.smax = sm; cur.smaxPiece = sp;
      }
    },
    note(o) { if (cur) Object.assign(cur, o); },
    lastResidual() { return cur && cur.resid.length ? cur.resid[cur.resid.length - 1] : null; },
    end(r) {
      cur.ok = r.ok; cur.iters = r.ok ? r.iters : cur.resid.length; cur.why = r.ok ? null : (this.why || '12 iterations without reaching the tolerance');
      cur.bridge = { calls: bs.calls - cur.b0.calls, iasSteps: bs.steps - cur.b0.steps, timeouts: bs.timeouts - cur.b0.timeouts, stepFloor: bs.stepFloor - cur.b0.stepFloor, errors: bs.errors - cur.b0.errors, encounterPieces: bs.encounterPieces - cur.b0.enc };
      cur.seconds = (Date.now() - cur.t0) / 1000;
      const g0 = cur.g0;
      cur.guardTrips = gstats.tripsTotal - g0.trips; cur.guardByKind = Object.fromEntries(Object.keys(gstats.trips).map((k) => [k, gstats.trips[k] - g0.byKind[k]]));
      cur.regFail = gstats.regFailures - g0.reg; cur.missedCounted = gstats.missedCounted - g0.miss;
      cur.secIas = (gstats.tIas - g0.tIas) / 1000; cur.secC = (gstats.tC - g0.tC) / 1000; cur.secMiss = (gstats.tMiss - g0.tMiss) / 1000; cur.cMacro = bs.regMacro - g0.cm;
      cur.ratioMin = Number.isFinite(gstats.attRatioMin) ? gstats.attRatioMin : null; cur.d2CloseMin = Number.isFinite(gstats.attD2Close) ? gstats.attD2Close : null;
      cur.finalResid = cur.resid.length ? cur.resid[cur.resid.length - 1] : null;
      delete cur.g0; delete cur.b0; delete cur.t0;
      if (records.length % 25 === 0) writeAll();
    },
    flush() { cur = null; writeAll(); },
  };
  settings.observer = obs;
  return obs;
}

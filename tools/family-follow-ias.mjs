// follows the family of relative periodic orbits through one orbit of the perpendicular start in ONE direction with the ias route (REBOUND IAS15 through src/ias/bridge.js,
// encounter pieces by src/ias/reg.js, the guards of src/ias/guards.py), recording every accepted step (start values, T*, L*, theta, closest approach, closure). An accepted step
// for which perpInfo returns nothing (its Dormand-Prince integration gives up, so there is no closest approach and no closure) is not a point of the trace but is listed in `unrec`; T* and L* of every
// accepted step come from the start values (perpEL), so `unrec` has them too. Stops at a closed loop, L* below 1e-3, a closest approach above --max-dist, a guard,
// a failure of reg.js, a step collapse, a lost family, the step limit or the time limit; the reason is in the file. Writes OUT.json, OUT.json.partial.json every 5 points and
// OUT.json.diag.jsonl (one line per attempt of the corrector, src/ias/recorder.js).
// node tools/family-follow-ias.mjs OUT.json DIR u1 u2 lam t [--minutes=120] [--pieces=24] [--label=name] [--max-dist=0.03] [--stop-below=0] [--stop-after=N]
//                                  [--ias-mode=2] [--ias-first-step=timescale|legacy] [--newton-tol=1e-11] [--no-nodes] [--timeout-min=30] [--python=PY] [--guard-ratio=390]
//   DIR = 1 or -1 in lam (anything else stops the driver with exit 2, as does an unknown option); t = half the period. pieces: the number of pieces of the multiple shooting, at most 250. max-dist: stop when the closest approach is above it (inf for never). stop-below: stop
//   when the closest approach is below it (0: never). stop-after: stop after that many recorded points (the message is "stopped after N recorded points"). The other options set src/settings.js: IAS15 adaptive_mode, the longest wait for
//   the Python process, the python executable PY (the default is that of src/settings.js: ORBIT_PYTHON, else python on Windows and python3 elsewhere), the ratio of guard G1b.
//   ias-first-step: the first step of IAS15 on every piece ('timescale', the default of src/settings.js, or 'legacy', REBOUND's default 0.001, the setting of the traces stored in data/deep); the value is in out.settings.ias.firstStep.
//   newton-tol: settings.newton, the stopping tolerance of the corrector residual (1e-11 by default). The 279 components of every accepted step (u1, u2, t and the 23 node states) are written
//   to OUT.json.nodes.jsonl, one line {step, z} per accepted step, unless --no-nodes is given.
import fs from 'fs';
import { settings } from '../src/settings.js';
import { startRecorder } from '../src/ias/recorder.js';
import { stats as iasStats, gstats } from '../src/ias/bridge.js';
import { huntArclength, closePerpMS } from '../src/shooting.js';
import { perpInfo, perpInitial, perpEL } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { relativeStability } from '../src/relative.js';

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--')), opt = {};
const KNOWN = ['minutes', 'pieces', 'label', 'max-dist', 'stop-below', 'stop-after', 'ias-mode', 'ias-first-step', 'newton-tol', 'no-nodes', 'timeout-min', 'python', 'guard-ratio'];
for (const a of process.argv.slice(2)) if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); if (!KNOWN.includes(k)) { console.error('unknown option --' + k + '; the options are --' + KNOWN.join(', --')); process.exit(2); } opt[k] = v === undefined ? true : v; }
const [outFile, dirArg, u1A, u2A, lamA, tA] = pos;
if (!outFile || !tA) { console.error('usage: node tools/family-follow-ias.mjs OUT.json DIR u1 u2 lam t [--minutes=120] [--pieces=24] [--label=name] [--max-dist=0.03] [--stop-below=0] [--stop-after=N] [--ias-mode=2] [--ias-first-step=timescale|legacy] [--newton-tol=1e-11] [--no-nodes] [--timeout-min=30] [--python=PY] [--guard-ratio=390]'); process.exit(2); }
for (const f of [outFile, outFile + '.partial.json', outFile + '.diag.jsonl', outFile + '.crash.json', outFile + '.nodes.jsonl']) if (fs.existsSync(f)) { console.error('exists, not overwriting: ' + f); process.exit(2); }
if (dirArg !== '1' && dirArg !== '-1') { console.error('DIR must be 1 or -1, not ' + dirArg); process.exit(2); }
const dir = Number(dirArg), minutes = Number(opt.minutes ?? 120), maxMs = minutes * 60000;
const pieces = Number(opt.pieces ?? 24), maxDist = opt['max-dist'] === undefined ? 0.03 : Number(opt['max-dist'] === 'inf' ? Infinity : opt['max-dist']);
if (pieces > 250) { console.error('pieces is at most 250 (the shared buffer of src/ias/bridge.js holds 24 numbers per piece)'); process.exit(2); }
const stopBelow = Number(opt['stop-below'] ?? 0), stopAfter = opt['stop-after'] === undefined ? Infinity : Number(opt['stop-after']);
settings.integrator = 'ias';
if (opt['ias-mode'] !== undefined) settings.ias.adaptiveMode = Number(opt['ias-mode']);
if (opt['ias-first-step'] !== undefined) { if (opt['ias-first-step'] !== 'legacy' && opt['ias-first-step'] !== 'timescale') { console.error('--ias-first-step must be legacy or timescale, not ' + opt['ias-first-step']); process.exit(2); } settings.ias.firstStep = opt['ias-first-step']; }
if (opt['newton-tol'] !== undefined) settings.newton = Number(opt['newton-tol']);
if (opt['timeout-min'] !== undefined) settings.ias.timeoutMs = Number(opt['timeout-min']) * 60000;
if (opt.python !== undefined) settings.ias.python = opt.python;
if (opt['guard-ratio'] !== undefined) settings.ias.guardRatio = Number(opt['guard-ratio']);
const recorder = startRecorder(outFile);
const nodesFd = opt['no-nodes'] ? null : fs.openSync(outFile + '.nodes.jsonl', 'wx');
const start = { u1: +u1A, u2: +u2A, lam: +lamA, t: +tA };
const s0 = closePerpMS(start.u1, start.u2, start.lam, start.t, { m: pieces });
const shifted = s0 && s0.res < 1e-9 ? { u1: s0.u1, u2: s0.u2, lam: s0.lam, t: s0.t, m: pieces } : null;
const out = { label: opt.label || null, dir, start, shifted, minutesLimit: minutes, settings: { ...settings, observer: undefined }, options: { pieces, maxDist, stopBelow, stopAfter } };
if (!shifted) {
  out.error = 'could not move the start onto the family'; out.bridge = { ...iasStats }; out.guards = { ...gstats, tripList: gstats.tripList }; out.lastBridgeReason = iasStats.lastReason;
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.error(out.error + '; bridge: ' + iasStats.calls + ' calls, ' + iasStats.errors + ' errors, ' + iasStats.timeouts + ' timeouts, last reason: ' + (iasStats.lastReason || 'none') + '; guard trips ' + gstats.tripsTotal);
  process.exit(1);
}
const pts = [], keys = [];
const unrec = []; out.unrec = unrec;   // accepted steps that are not recorded as points
process.on('uncaughtException', (e) => { try { fs.writeFileSync(outFile + '.crash.json', JSON.stringify({ ...out, error: String(e && e.stack), points: pts })); recorder.flush(); } catch (e2) {} process.exit(3); });
let stop = null;
let traceStop = null, r;
try { r = huntArclength(shifted.u1, shifted.u2, shifted.lam, shifted.t, { m: shifted.m, dir, force: true, maxMs, all: true, hMax: 0.2, maxSteps: 6000,
  trace: (step, lam, th, h, it, Y) => {
    const n = Y.length - 1, u1 = Y[0], u2 = Y[1], t = Y[2];
    if (nodesFd !== null) fs.writeSync(nodesFd, JSON.stringify({ step, z: Array.from(Y.slice(0, n)) }) + '\n');
    const key = [u1, u2, t, lam];
    const kl = keys.length ? keys[keys.length - 1] : null; const cum = kl ? kl.cum + Math.hypot(key[0] - kl.k[0], key[1] - kl.k[1], key[2] - kl.k[2], key[3] - kl.k[3]) : 0;   // path length along the accepted points
    if (step > 60) for (let i = 0; i < keys.length; i++) {
      const q = keys[i].k;
      if (Math.hypot(key[0] - q[0], key[1] - q[1], key[2] - q[2], key[3] - q[3]) < 1e-4 && cum - keys[i].cum >= 0.01) { stop = 'closed loop'; out.loop = { matchedIndex: i, path: cum - keys[i].cum, distance: Math.hypot(key[0] - q[0], key[1] - q[1], key[2] - q[2], key[3] - q[3]) }; return true; }   // a match needs a path of 0.01 or more between the points
    }
    keys.push({ k: key, cum });
    const el = perpEL(u1, u2, Y[n], t);
    const info = perpInfo(u1, u2, Y[n], t);
    if (!info) { unrec.push({ step, lam: Y[n], u1, u2, t, Tstar: el.ts, Lstar: Math.abs(el.ls), reason: 'perpInfo null' }); return false; }
    const p = { step, lam: Y[n], u1, u2, t, Tstar: el.ts, Lstar: Math.abs(el.ls), theta: th, turns: th / (2 * Math.PI), minDist: info.minDist, closure: info.repeatErr };
    if (pts.length % 5 === 0) {
      const w = syzygyWord(perpInitial(u1, u2, Y[n]), 2 * t);
      const st = relativeStability(u1, u2, Y[n], t);
      p.word = w ? w.word : null; p.root = w ? w.root : null; p.power = w ? w.power : null; p.maxMod = st ? st.maxMod : null;
    }
    pts.push(p);
    if (pts.length % 5 === 0) fs.writeFileSync(outFile + '.partial.json', JSON.stringify({ ...out, points: pts, partial: true }));
    if (pts.length >= stopAfter) { stop = 'stopped after ' + pts.length + ' recorded points'; return true; }
    if (info.minDist < stopBelow) { stop = 'close approach (closest distance ' + info.minDist.toFixed(4) + ')'; return true; }
    if (p.Lstar < 1e-3) { stop = 'L* reached 0'; return true; }
    if (info.minDist > maxDist) { stop = 'left the region (closest approach above ' + maxDist + ')'; return true; }
    return false;
  } });
} catch (e) { if (e && e.isTraceStop) { stop = e.reason; traceStop = { reason: e.reason, info: e.info || null }; r = { steps: null, lamMin: null, lamMax: null }; } else throw e; }   // the bridge or the recorder ends the trace (guard, missed flag, failure of reg.js)
const zeros = (r.orbits || (r.ok && r.info ? [r] : [])).map((o) => ({ lam: o.lam, u1: o.u1, u2: o.u2, t: o.t, Tstar: o.info.ts, Lstar: Math.abs(o.info.ls), closure: o.info.repeatErr, minDist: o.info.minDist }));
out.why = stop || r.why || (zeros.length ? 'zero of theta' : 'unknown');
out.bridge = { ...iasStats }; out.guards = { ...gstats, tripList: gstats.tripList }; out.traceStop = traceStop; out.steps = r.steps; out.lamMin = r.lamMin; out.lamMax = r.lamMax; out.points = pts; out.zeros = zeros;
fs.writeFileSync(outFile, JSON.stringify(out));
recorder.flush(); if (iasStats.errors || iasStats.timeouts) console.log('bridge: ' + iasStats.errors + ' errors, ' + iasStats.timeouts + ' timeouts, last reason: ' + iasStats.lastReason);
console.log(outFile, 'dir', dir, '|', out.why, '|', pts.length, 'points, lam', r.lamMin, 'to', r.lamMax, '|', zeros.length, 'zeros of theta');
process.exit(0);

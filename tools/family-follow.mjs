// SPDX-License-Identifier: MIT
// follows the family of relative periodic orbits through one orbit of the perpendicular start in ONE direction, recording every accepted
// step (start values, T*, L*, theta, closest approach, closure). stops at a close approach (below 0.03), L* below 1e-3, a closed loop, a
// step collapse, a lost family, the step limit or the time limit; the reason is in the file.
// node tools/family-follow.mjs out.json DIR minutes u1 u2 lam t [label] [pieces] [--newton-tol=X] [--stop-below=X] (DIR = 1 or -1 in lam, t = half the period; pieces: only
// this many instead of trying 8, 16, 24 ...; the options may stand anywhere among the arguments: --newton-tol=X is the stopping tolerance of the corrector residual, 1e-11 by default; --stop-below=X ends the
// run at a closest approach below X, 0.03 by default, 0 never; a value that is not the default is written to the output as newtonTol and stopBelow)
import fs from 'fs';
import { huntArclength, closePerpMS } from '../src/shooting.js';
import { perpInfo, perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';
import { relativeStability } from '../src/relative.js';
import { settings } from '../src/settings.js';

const optArgs = process.argv.slice(2).filter((a) => a.startsWith('--')), [outFile, dirArg, minArg, u1A, u2A, lamA, tA, label, piecesA] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const optNum = (name) => { const a = optArgs.find((x) => x.startsWith('--' + name + '=')); return a === undefined ? undefined : (a.length > name.length + 3 ? Number(a.slice(name.length + 3)) : NaN); };
for (const a of optArgs) if (!/^--(newton-tol|stop-below)=/.test(a)) { console.error('unknown option ' + a + '; the options are --newton-tol=X and --stop-below=X'); process.exit(2); }
const newtonTol = optNum('newton-tol'), stopBelow = optNum('stop-below') ?? 0.03;
if (newtonTol !== undefined && !(newtonTol > 0 && Number.isFinite(newtonTol))) { console.error('--newton-tol needs a number above 0'); process.exit(2); }
if (!(stopBelow >= 0 && Number.isFinite(stopBelow))) { console.error('--stop-below needs a number of at least 0'); process.exit(2); }
if (newtonTol !== undefined) settings.newton = newtonTol;
if (!outFile || !tA) { console.error('usage: node tools/family-follow.mjs out.json DIR minutes u1 u2 lam t [label] [pieces] [--newton-tol=X] [--stop-below=X]'); process.exit(2); }
const dir = Number(dirArg) >= 0 ? 1 : -1, maxMs = (Number(minArg) || 30) * 60000;
const start = { u1: +u1A, u2: +u2A, lam: +lamA, t: +tA };
let shifted = null;
for (const m of piecesA ? [Number(piecesA)] : [8, 16, 24, 32, 48, 64]) {
  const s = closePerpMS(start.u1, start.u2, start.lam, start.t, { m });
  if (s && s.res < 1e-9) { shifted = { u1: s.u1, u2: s.u2, lam: s.lam, t: s.t, m }; break; }
}
const out = { label: label || null, dir, start, shifted, minutesLimit: maxMs / 60000, ...(newtonTol !== undefined ? { newtonTol } : {}), ...(stopBelow !== 0.03 ? { stopBelow } : {}) };
if (!shifted) { out.error = 'could not move the start onto the family'; fs.writeFileSync(outFile, JSON.stringify(out)); console.error(out.error); process.exit(1); }
const pts = [], keys = [];
let stop = null;
const r = huntArclength(shifted.u1, shifted.u2, shifted.lam, shifted.t, { m: shifted.m, dir, force: true, maxMs, all: true, hMax: 0.2, maxSteps: 6000,
  trace: (step, lam, th, h, it, Y) => {
    if (!Y) return false;
    const n = Y.length - 1, u1 = Y[0], u2 = Y[1], t = Y[2];
    const key = [u1, u2, t, lam];
    if (step > 60) for (let i = 0; i < keys.length - 40; i++) {
      const q = keys[i];
      if (Math.hypot(key[0] - q[0], key[1] - q[1], key[2] - q[2], key[3] - q[3]) < 1e-4) { stop = 'closed loop'; return true; }
    }
    keys.push(key);
    const info = perpInfo(u1, u2, Y[n], t);
    if (!info) return false;
    const p = { step, lam: Y[n], u1, u2, t, Tstar: info.ts, Lstar: Math.abs(info.ls), theta: th, turns: th / (2 * Math.PI), minDist: info.minDist, closure: info.repeatErr };
    if (pts.length % 5 === 0) {
      const w = syzygyWord(perpInitial(u1, u2, Y[n]), 2 * t);
      let st = null;
      try { st = relativeStability(u1, u2, Y[n], t); } catch (e) { p.stabilityError = String(e && e.message || e); out.stabilityErrors = (out.stabilityErrors || 0) + 1; }
      p.word = w ? w.word : null; p.root = w ? w.root : null; p.power = w ? w.power : null; p.maxMod = st ? st.maxMod : null;
    }
    pts.push(p);
    if (info.minDist < stopBelow) { stop = 'close approach (closest distance ' + info.minDist.toFixed(4) + ')'; return true; }
    if (p.Lstar < 1e-3) { stop = 'L* reached 0'; return true; }
    return false;
  } });
const zeros = (r.orbits || (r.ok && r.info ? [r] : [])).map((o) => ({ lam: o.lam, u1: o.u1, u2: o.u2, t: o.t, Tstar: o.info.ts, Lstar: Math.abs(o.info.ls), closure: o.info.repeatErr, minDist: o.info.minDist }));
out.why = stop || r.why || (zeros.length ? 'zero of theta' : 'unknown');
out.steps = r.steps; out.lamMin = r.lamMin; out.lamMax = r.lamMax; out.points = pts; out.zeros = zeros;
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(outFile, 'dir', dir, '|', out.why, '|', pts.length, 'points, lam', r.lamMin, 'to', r.lamMax, '|', zeros.length, 'zeros of theta');

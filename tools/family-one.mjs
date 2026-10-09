// follows the family (relative periodic orbits, rotation angle theta not 0) that passes through one orbit of the perpendicular start, in both directions,
// and writes the exactly periodic orbits found on it (theta = 0) and the curve (lam, T*, L*, theta every 4th step)
// the family is followed from the orbit itself (huntArclength with force), also when its theta is 0; the zero at the start is then found as well
// the trace stops when the curve returns to a point it has already visited (a closed loop), when the family is lost, or after the time limit
// node tools/family-one.mjs out.json seconds u1 u2 lam t [label]
import fs from 'fs';
import { huntArclength, closePerpMS } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';

const [outFile, secArg, u1A, u2A, lamA, tA, label] = process.argv.slice(2);
if (!outFile || !tA) { console.error('usage: node tools/family-one.mjs out.json seconds u1 u2 lam t [label]'); process.exit(2); }
const perDirMs = (Number(secArg) || 300) * 1000 / 2;
const start = { u1: +u1A, u2: +u2A, lam: +lamA, t: +tA };
// the number of pieces of the multiple shooting grows with the period (a long orbit does not close with 8 pieces); the start itself is used
// and followed even though its theta is (nearly) 0, so that the zero at the start and the family on both sides are found
let shifted = null;
for (const m of [8, 16, 24, 32, 48, 64]) {
  const s = closePerpMS(start.u1, start.u2, start.lam, start.t, { m });
  if (s && s.res < 1e-9) { shifted = { u1: s.u1, u2: s.u2, lam: s.lam, t: s.t, shift: 0, m }; break; }
}
const out = { label: label || null, start, shifted, directions: [] };
if (!shifted) { out.error = 'could not move the start along the family'; fs.writeFileSync(outFile, JSON.stringify(out)); console.error(out.error); process.exit(1); }
for (const dir of [1, -1]) {
  const pts = [], ys = [];
  let loop = false;
  const r = huntArclength(shifted.u1, shifted.u2, shifted.lam, shifted.t, { m: shifted.m, dir, force: true, maxMs: perDirMs, all: true, hMax: 0.2, maxSteps: 6000,
    trace: (step, lam, th, h, it, Y) => {
      if (!Y) return false;
      const n = Y.length - 1;
      const key = [Y[0], Y[1], Y[2], Y[n]];
      if (step > 60) for (let i = 0; i < ys.length - 40; i++) {
        const q = ys[i];
        if (Math.hypot(key[0] - q[0], key[1] - q[1], key[2] - q[2], key[3] - q[3]) < 1e-4) { loop = true; return true; }
      }
      ys.push(key);
      if (step % 4 === 0) {
        const info = perpInfo(Y[0], Y[1], Y[n], Y[2]);
        if (info) pts.push({ lam: Y[n], Tstar: info.ts, Lstar: Math.abs(info.ls), theta: th, minDist: info.minDist, closure: info.repeatErr });
      }
      return false;
    } });
  const zeros = (r.orbits || (r.ok && r.info ? [r] : [])).map((o) => ({ lam: o.lam, u1: o.u1, u2: o.u2, t: o.t, Tstar: o.info.ts, Lstar: Math.abs(o.info.ls), closure: o.info.repeatErr, minDist: o.info.minDist }));
  out.directions.push({ dir, why: loop ? 'closed loop' : (r.why || (zeros.length ? 'zero' : 'unknown')), steps: r.steps, lamMin: r.lamMin, lamMax: r.lamMax, points: pts, zeros });
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(outFile, out.directions.map((d) => `${d.dir > 0 ? '+' : '-'} ${d.why} ${d.points.length} pts ${d.zeros.length} zeros`).join('; '));

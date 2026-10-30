// SPDX-License-Identifier: MIT
// The track of one orbit of a trace: the positions of the three bodies over one period, from the start values of an accepted step (a recorded point or an unrecorded step of a stored trace file),
// computed with src/ias/reg.js only. Every sample is a separate flow from the start state to its own time, so the samples do not depend on each other.
// The start state is the perpendicular start (src/perp.js). The positions are in the frame of the code (centre of mass at the origin; the orbit comes back rotated by the angle theta after one period).
// The encounter: the first time at which the smallest chain distance of the flow from the start has fallen to twice its value over the whole period (found by bisection); around it the samples are dense
// (offsets of both signs from 1e-9 to the window length, logarithmic), so that the tracks of the two bodies can be drawn close to the encounter.
// node tools/orbit-track.mjs OUT.json TRACE.json STEP [--samples=600] [--window=0.2]       OUT.json must be new.
import fs from 'fs';
import { flowEnc } from '../src/ias/reg.js';
import { perpInitial } from '../src/perp.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v]; }));
const [outFile, traceFile, stepArg] = args;
if (!outFile || !traceFile || !stepArg || fs.existsSync(outFile)) { console.error('usage: node tools/orbit-track.mjs OUT.json TRACE.json STEP [--samples=600] [--window=0.2] (OUT.json must be new)'); process.exit(2); }
const samples = Number(opt.samples || 600), win = Number(opt.window || 0.2);
const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
const step = Number(stepArg);
const rec = trace.points.find((p) => p.step === step), unrec = (trace.unrecorded || []).find((p) => p.step === step);
const p = rec || unrec;
if (!p) { console.error('no accepted step ' + step + ' in ' + traceFile); process.exit(2); }
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const s0 = Array.from(perpInitial(p.u1, p.u2, p.lam)), T = 2 * p.t;
const dist = (s, i, j) => Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]);
const flow = (tau) => { const r = flowEnc(s0, tau, { settings }); if (!r.ok) throw new Error('reg.js failed at tau = ' + tau + ': ' + r.reason); return r; };

const whole = flow(T);
let lo = 0, hi = T;
for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (flow(m).minD1 <= 2 * whole.minD1) hi = m; else lo = m; }
const tEnc = hi;

const times = new Set();
for (let k = 1; k <= samples; k++) times.add(T * k / samples);
times.add(tEnc);
const M = 60;
for (let j = 0; j <= M; j++) {
  const off = win * Math.pow(1e-9 / win, j / M);
  for (const sgn of [-1, 1]) { const tau = tEnc + sgn * off; if (tau > 0 && tau < T) times.add(tau); }
}
const ts = [...times].sort((a, b) => a - b), rows = [];
for (const tau of ts) { const r = flow(tau); rows.push({ t: tau, x: Array.from(r.end).slice(0, 6), d: [dist(r.end, 0, 1), dist(r.end, 0, 2), dist(r.end, 1, 2)] }); }
const dEnc = rows.find((r) => r.t === tEnc);
const out = {
  what: 'positions of the three bodies over one period from the stored start values of one accepted step, src/ias/reg.js only (tools/orbit-track.mjs); x = x0, y0, x1, y1, x2, y2; d = the pair distances 01, 02, 12',
  command: 'node tools/orbit-track.mjs OUT.json ' + traceFile.split(/[\\/]/).slice(-2).join('/') + ' ' + step + ' --samples=' + samples + ' --window=' + win,
  trace: trace.label, step, recorded: !!rec, start: { u1: p.u1, u2: p.u2, lam: p.lam, t: p.t }, period: T,
  minD1_period: whole.minD1, t_encounter: tEnc, d_at_t_encounter: dEnc.d, samples: rows,
};
fs.writeFileSync(outFile, JSON.stringify(out));
console.log('wrote', outFile, rows.length, 'samples; minD1 over the period', whole.minD1.toExponential(3), 'encounter at t =', tEnc.toFixed(6), 'of', T.toFixed(6));

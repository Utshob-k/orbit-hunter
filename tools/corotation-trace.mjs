// the co-rotation share (src/corotation.js) along the family of relatively periodic orbits through the BHH orbit A1 (T* 4.9598, L* 1.0150, start values of data/orbit-table.json), followed in both directions with
// the arclength tracer (the family of the traced curve data/henon-family-curve.json, the retrograde branch of the CPC paper). at every 2nd step: lam, T*, L*, rotation, closest approach and the share.
// the output file must be new (an existing file is never overwritten). data/a1-family-corotation.json is the result of: node tools/corotation-trace.mjs data/a1-family-corotation.json 300
// node tools/corotation-trace.mjs out.json [seconds per direction]
import fs from 'fs';
import { huntArclength, closePerpMS } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';
import { shareSame } from '../src/corotation.js';
const [name, secs] = process.argv.slice(2);
if (!name || fs.existsSync(name)) { console.error('usage: node tools/corotation-trace.mjs out.json [seconds per direction]   (out.json must not exist)'); process.exit(2); }
const tab = JSON.parse(fs.readFileSync(new URL('../data/orbit-table.json', import.meta.url), 'utf8')), a1 = tab.find((o) => Math.abs(o.Tstar - 4.9598) < 0.01);
let st = null;
for (const m of [8, 16, 24]) { const s = closePerpMS(a1.u1, a1.u2, a1.lam, a1.t, { m }); if (s && s.res < 1e-9) { st = { u1: s.u1, u2: s.u2, lam: s.lam, t: s.t, m }; break; } }
if (!st) { console.error('A1 does not close'); process.exit(1); }
const out = { what: 'co-rotation share along the family of relatively periodic orbits through the BHH orbit A1 (tools/corotation-trace.mjs): lam, T*, L*, rotation in turns, closest approach, share of the time at the same sense (1 = the binaries revolve in the same direction all the time, 0 = in opposite directions)', start: st, directions: [] };
for (const dir of [1, -1]) {
  const pts = [];
  const r = huntArclength(st.u1, st.u2, st.lam, st.t, { m: st.m, dir, force: true, maxMs: (Number(secs) || 300) * 1000, all: true, hMax: 0.05, maxSteps: 3000,
    trace: (step, lam, th, h, it, Y) => {
      if (!Y || step % 2) return false;
      const n = Y.length - 1, info = perpInfo(Y[0], Y[1], Y[n], Y[2]); if (!info) return false;
      const last = pts[pts.length - 1]; if (last && Math.abs(last.lam - Y[n]) < 1e-9 && Math.abs(last.Tstar - info.ts) < 1e-9) return false;      // the tracer can stall at the end of the family: a repeated point is not stored
      const s = shareSame(Y[0], Y[1], Y[n], Y[2], 3000);
      pts.push({ step, lam: Y[n], u1: Y[0], u2: Y[1], t: Y[2], Tstar: info.ts, Lstar: Math.abs(info.ls), turns: info.theta / (2 * Math.PI), minDist: info.minDist, share: s.share });
      return false;
    } });
  out.directions.push({ dir, why: r.why, steps: r.steps, points: pts });
  const sh = pts.map((p) => p.share), sw = []; for (let i = 1; i < pts.length; i++) if ((pts[i - 1].share > 0.5) !== (pts[i].share > 0.5)) sw.push(`between step ${pts[i - 1].step} (T* ${pts[i - 1].Tstar.toFixed(3)}, L* ${pts[i - 1].Lstar.toFixed(3)}, share ${pts[i - 1].share.toFixed(2)}) and step ${pts[i].step} (T* ${pts[i].Tstar.toFixed(3)}, L* ${pts[i].Lstar.toFixed(3)}, share ${pts[i].share.toFixed(2)})`);
  console.log(`direction ${dir > 0 ? '+' : '-'}: ${r.why}, ${r.steps} steps, ${pts.length} points; L* ${Math.min(...pts.map((p) => p.Lstar)).toFixed(3)} to ${Math.max(...pts.map((p) => p.Lstar)).toFixed(3)}, T* ${Math.min(...pts.map((p) => p.Tstar)).toFixed(3)} to ${Math.max(...pts.map((p) => p.Tstar)).toFixed(3)}; share ${Math.min(...sh).toFixed(2)} to ${Math.max(...sh).toFixed(2)}; sign changes: ${sw.join('; ') || 'none'}`);
}
fs.writeFileSync(name, JSON.stringify(out));

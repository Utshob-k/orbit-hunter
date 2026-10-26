// the 279 x 280 matrix [J | dF/dlam] of the multiple shooting system (24 pieces, ias route) at stored accepted steps of a trace, after closing each step at its lam with closePerpMS.
// node tools/stall-matrix.mjs LABEL STEPS OUT      e.g. node tools/stall-matrix.mjs t35m 1,100,142,165,700,2190 out/t35m
//   LABEL: a trace of data/deep/traces/, STEPS: loop steps (the nearest accepted step is taken, the lower one on a tie), OUT: the base name of the output.
//   Writes OUT.json (what was taken, the closing residuals, the guard counts) and OUT-<step>.bin (the matrix, 279 rows of 280 float64, little endian, row major); refuses existing names.
//   tools/stall-svd.py reads the result. About 1 s per step with the ias route (needs python with rebound and mpmath).
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

process.env.ORBIT_INTEGRATOR = 'ias';
process.env.PYTHONDONTWRITEBYTECODE = '1';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [label, stepsArg, out] = process.argv.slice(2);
if (!label || !stepsArg || !out) { console.error('usage: node tools/stall-matrix.mjs LABEL STEPS OUT'); process.exit(2); }
if (fs.existsSync(out + '.json')) { console.error('exists, not overwriting: ' + out + '.json'); process.exit(2); }
const load = (f) => import(pathToFileURL(path.join(root, f)).href);
const { settings } = await load('src/settings.js');
const { closePerpMS, system } = await load('src/shooting.js');
const { gstats } = await load('src/ias/bridge.js');
const tr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 'traces', label + '.json'), 'utf8'));
settings.ias.guardRatio = tr.guard_ratio;   // the ratio K of the code that ran the trace, set before the first request
settings.ias.firstStep = 'legacy';           // and the first step of IAS15 of the stored runs
const all = [...tr.points.map((p) => ({ kind: 'recorded', ...p })), ...tr.unrecorded.map((p) => ({ kind: 'unrecorded', ...p }))].sort((a, b) => a.step - b.step);
const m = 24, N = 12;
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const res = { label, guard_ratio: tr.guard_ratio, m, integrator: settings.integrator, tolerance: settings.newton, items: [] };
for (const target of stepsArg.split(',').map(Number)) {
  let best = null;
  for (const e of all) if (!best || Math.abs(e.step - target) < Math.abs(best.step - target)) best = e;
  const item = { target, taken_step: best.step, kind: best.kind, lam: best.lam, u1: best.u1, u2: best.u2, t: best.t };
  const t0 = Date.now();
  try {
    const c = closePerpMS(best.u1, best.u2, best.lam, best.t, { m });
    item.close = { res: c.res, u1: c.u1, u2: c.u2, t: c.t, why: c.why || null, seconds: (Date.now() - t0) / 1000 };
    if (c.nodes) {
      const z = new Float64Array(3 + N * (m - 1)); z[0] = c.u1; z[1] = c.u2; z[2] = c.t; c.nodes.forEach((s, i) => z.set(s, 3 + N * i));
      const t1 = Date.now(), n = 3 + N * (m - 1), sys = system(z, c.lam, m), A = new Float64Array(n * (n + 1));
      for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i * (n + 1) + j] = sys.J[i][j]; A[i * (n + 1) + n] = sys.Flam[i]; }
      let fsup = 0; for (const v of sys.F) fsup = Math.max(fsup, Math.abs(v));
      item.system = { rows: n, cols: n + 1, residual_sup: fsup, seconds: (Date.now() - t1) / 1000 };
      const f = `${out}-${best.step}.bin`;
      if (fs.existsSync(f)) throw new Error('exists, not overwriting: ' + f);
      fs.writeFileSync(f, Buffer.from(A.buffer)); item.bin = path.basename(f);
    }
  } catch (e) { item.error = String(e && e.message || e); }
  res.items.push(item);
  console.log(label, 'target', target, 'taken', best.step, best.kind, 'residual', item.close && item.close.res, item.error || '', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
res.gstats = { trips: gstats.trips, missChecks: gstats.missChecks, xchk: gstats.xchk, replaced: gstats.replaced };
fs.writeFileSync(out + '.json', JSON.stringify(res, null, 1));
process.exit(0);

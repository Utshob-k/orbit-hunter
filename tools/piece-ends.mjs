// SPDX-License-Identifier: MIT
// the end states of the pieces of the multiple shooting at one stored step of a trace, by the three integrators of the repository, for tools/piece-mp.py to compare with the 50 digit flow.
// The step is closed at its lam with closePerpMS (24 pieces, the ias route, first step 'legacy' and the guard ratio of the run that made the trace, as tools/stall-matrix.mjs does); the 24 piece starts and
// tau = t / 24 are those of that corrected solution. Every flagged piece (encounter piece, recomputed by reg.js in the route), every piece that the cross-check of the route replaced by reg.js, every piece that the route
// cross-checks (unflagged, a pair distance below settings.ias.crossCheckBelow), and the two neighbours of each flagged or replaced piece are written, with for each:  ias = IAS15 alone as the route calls it (adaptive mode 2, the first step of the run, src/ias/ias-bridge.py; the end state before bridge.js replaces it),
// reg = reg.js as the route uses it (flowEnc with the tangent, src/ias/reg-settings.json), dp45 = the Dormand-Prince integrator of the default route (src/physics.js, settings.rtol, atol, hMax).
// node tools/piece-ends.mjs LABEL STEP OUT.json [--no-neighbours]      LABEL: a trace of data/deep/traces/; STEP: the loop step (the nearest accepted step, the lower one on a tie); OUT.json must be new.
//   Needs python with rebound (ORBIT_PYTHON). A few seconds to a few minutes (dp45 on a deep encounter piece can be slow).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

process.env.ORBIT_INTEGRATOR = 'ias';
process.env.PYTHONDONTWRITEBYTECODE = '1';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [label, stepArg, outFile] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!label || !stepArg || !outFile) { console.error('usage: node tools/piece-ends.mjs LABEL STEP OUT.json [--no-neighbours]'); process.exit(2); }
if (fs.existsSync(outFile)) { console.error('exists, not overwriting: ' + outFile); process.exit(2); }
const load = (f) => import(pathToFileURL(path.join(root, f)).href);
const { settings } = await load('src/settings.js');
const { closePerpMS } = await load('src/shooting.js');
const { iasPieces } = await load('src/ias/bridge.js');
const { flowEnc } = await load('src/ias/reg.js');
const { dp45Step } = await load('src/physics.js');
const { perpInitial } = await load('src/perp.js');
const REG_SETTINGS = JSON.parse(fs.readFileSync(path.join(root, 'src/ias/reg-settings.json'), 'utf8'));
const tr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'deep', 'traces', label + '.json'), 'utf8'));
settings.ias.guardRatio = tr.guard_ratio; settings.ias.firstStep = 'legacy'; settings.integrator = 'ias';
const all = [...tr.points.map((p) => ({ kind: 'recorded', ...p })), ...tr.unrecorded.map((p) => ({ kind: 'unrecorded', ...p }))].sort((a, b) => a.step - b.step);
let best = null; for (const e of all) if (!best || Math.abs(e.step - Number(stepArg)) < Math.abs(best.step - Number(stepArg))) best = e;
const m = 24, N = 12;
const res = { label, target_step: Number(stepArg), taken_step: best.step, kind: best.kind, lam: best.lam, guard_ratio: tr.guard_ratio, ias_first_step: 'legacy', ias_adaptive_mode: settings.ias.adaptiveMode, dp45: { rtol: settings.rtol, atol: settings.atol, hMax: settings.hMax }, pieces: [] };
const c = closePerpMS(best.u1, best.u2, best.lam, best.t, { m });
res.close = { res: c.res, why: c.why || null, u1: c.u1, u2: c.u2, t: c.t, lam: c.lam };
if (!c.nodes) { res.error = 'the step could not be closed'; fs.writeFileSync(outFile, JSON.stringify(res)); console.error(res.error); process.exit(1); }
const tau = c.t / m, starts = [perpInitial(c.u1, c.u2, c.lam), ...c.nodes.map((s) => Float64Array.from(s))];
const route = iasPieces(starts, tau);   // flagged (enc) and replaced (mats without enc) pieces of the route at this solution
const role = new Array(m).fill(null);
const crossed = new Array(m).fill(false);   // unflagged pieces with a pair distance below crossCheckBelow: the pieces that the cross-check of the route compares with reg.js (and replaces where the difference is crossCheckDiff or more)
for (let i = 0; i < m; i++) { crossed[i] = !route.enc[i] && Math.min(route.ana[i][0], route.ana[i][1], route.ana[i][2]) < settings.ias.crossCheckBelow; if (route.enc[i]) role[i] = 'flagged'; else if (route.mats[i]) role[i] = 'replaced'; else if (crossed[i]) role[i] = 'cross-checked'; }
const want = new Set(); role.forEach((r, i) => { if (r) { want.add(i); if (r !== 'cross-checked' && !process.argv.includes('--no-neighbours')) { if (i > 0) want.add(i - 1); if (i < m - 1) want.add(i + 1); } } });
const ids = [...want].sort((a, b) => a - b);
// IAS15 alone: the python process of the bridge, one request with these pieces
const br = spawnSync(settings.ias.python, [path.join(root, 'src/ias/ias-bridge.py'), String(settings.ias.adaptiveMode), String(settings.ias.guardRatio), 'legacy'], { input: JSON.stringify({ id: 1, starts: ids.map((i) => Array.from(starts[i])), tau }) + '\n', encoding: 'utf8', maxBuffer: 1 << 28 });
if (br.status !== 0 || !br.stdout) { console.error('the IAS15 process failed: ' + br.stderr); process.exit(1); }
const ias = JSON.parse(br.stdout.split('\n')[0]);
function dp45Flow(x0, tau) {
  const s = Float64Array.from(x0); let t = 0, h = 1e-3, n = 0;
  for (; t < tau - 1e-15; n++) {
    if (n > 20 * (4000 + 3000 * Math.max(tau, 1))) return { end: null, why: 'step limit', steps: n };
    const [dt, hn] = dp45Step(s, Math.min(h, tau - t), settings.rtol, settings.atol, settings.hMax);
    if (dt === 0) return { end: null, why: 'step length zero', steps: n };
    t += dt; h = hn;
  }
  return { end: Array.from(s), why: null, steps: n };
}
ids.forEach((i, k) => {
  const p = { piece: i, role: role[i] || 'neighbour', cross_checked_by_the_route: crossed[i], start: Array.from(starts[i]), tau, ias_smallest_sampled_pair_distance: ias.ana[k][3], ias_pair_minima: ias.ana[k].slice(0, 3), ias_steps_total_of_request: ias.steps, ias: { end: ias.ends[k] } };
  let t0 = Date.now(); const r = flowEnc(starts[i], tau, { jac: true, settings: REG_SETTINGS });
  p.reg = r.ok ? { end: Array.from(r.end), minD1: r.minD1, max_abs_matrix_entry: Math.max(...Array.from(r.M, Math.abs)), seconds: (Date.now() - t0) / 1000 } : { end: null, why: r.reason };
  t0 = Date.now(); const d = dp45Flow(starts[i], tau); p.dp45 = { ...d, seconds: (Date.now() - t0) / 1000 };
  res.pieces.push(p);
  console.log(label, 'step', best.step, 'piece', i, p.role, 'IAS15 smallest sampled pair distance', p.ias_smallest_sampled_pair_distance, 'reg ok', !!p.reg.end, 'dp45', p.dp45.end ? 'ok ' + p.dp45.steps + ' steps' : p.dp45.why);
});
res.route = { flagged: role.map((r, i) => r === 'flagged' ? i : -1).filter((i) => i >= 0), replaced: role.map((r, i) => r === 'replaced' ? i : -1).filter((i) => i >= 0), cross_checked: crossed.map((c, i) => c ? i : -1).filter((i) => i >= 0) };
fs.writeFileSync(outFile, JSON.stringify(res));
process.exit(0);

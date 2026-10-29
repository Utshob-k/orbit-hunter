// the resolution of the corrector residual: for accepted steps of a run of tools/family-follow-ias.mjs the residual F of the multiple shooting system (the ias route as the corrector evaluates it: all pieces in one
// request of src/ias/bridge.js, the settings of the run) at the stored 279 numbers z = [u1, u2, t, nodes] and at the stored lam, and then K times with every NODE component (the 276 numbers after u1, u2, t)
// moved by one unit in the last place, the sign random (fixed seed). Per step: sup|F|, the largest and the median change sup|F_moved - F| over the K trials, the range of sup|F_moved|, the piece in which the
// largest change sits, the same for the F of the line search (one request per piece, as src/shooting.js residual() does), and for every flagged piece and every replaced piece the largest |entry| of its
// 12 x 12 matrix from reg.js. Needs python with rebound and mpmath (ORBIT_PYTHON).
// node tools/residual-floor.mjs OUT.json LABEL=TRACE.json:I,J,K [LABEL2=TRACE2.json:I,J ...] [--k=30] [--seed=1]
//   TRACE.json: the output of tools/family-follow-ias.mjs (its settings.ias are taken over, its points and unrec give lam of a step); TRACE.json.nodes.jsonl must be next to it. I, J, K: the accepted steps as
//   line numbers of the nodes file (1 = the first accepted step of the run). All traces of one call must have the same first step and guard ratio. OUT.json must be new.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

process.env.ORBIT_INTEGRATOR = 'ias';
process.env.PYTHONDONTWRITEBYTECODE = '1';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--')), opt = {};
for (const a of process.argv.slice(2)) if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); if (!['k', 'seed'].includes(k)) { console.error('unknown option --' + k); process.exit(2); } opt[k] = v; }
const [outFile, ...specs] = pos;
if (!outFile || !specs.length) { console.error('usage: node tools/residual-floor.mjs OUT.json LABEL=TRACE.json:I,J,K [...] [--k=30] [--seed=1]'); process.exit(2); }
if (fs.existsSync(outFile)) { console.error('exists, not overwriting: ' + outFile); process.exit(2); }
const load = (f) => import(pathToFileURL(path.join(root, f)).href);
const { settings } = await load('src/settings.js');
const { iasPieces, iasFlow, gstats } = await load('src/ias/bridge.js');
const { perpInitial, symResidual } = await load('src/perp.js');
const K = Number(opt.k ?? 30), m = 24, N = 12;

// next double from x towards +1 or -1 (one unit in the last place)
const dv = new DataView(new ArrayBuffer(8));
function step1(x, s) {
  if (x === 0) return s * Number.MIN_VALUE;
  dv.setFloat64(0, x); let b = dv.getBigInt64(0);
  b += ((x > 0) === (s > 0)) ? 1n : -1n;
  dv.setBigInt64(0, b); return dv.getFloat64(0);
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(Number(opt.seed ?? 1));
const sup = (v) => v.reduce((a, b) => Math.max(a, Math.abs(b)), 0);
const med = (v) => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// F as system() in src/shooting.js has it (all pieces in one request); returns {F, enc, mats}
function evalAll(z, lam) {
  const tau = z[2] / m, starts = [perpInitial(z[0], z[1], lam)];
  for (let i = 1; i < m; i++) starts.push(z.subarray(3 + N * (i - 1), 3 + N * i));
  const ends = iasPieces(starts, tau), F = new Float64Array(3 + N * (m - 1));
  for (let i = 0; i < m - 1; i++) { const nxt = z.subarray(3 + N * i, 3 + N * (i + 1)); for (let k = 0; k < N; k++) F[N * i + k] = ends[i][k] - nxt[k]; }
  F.set(symResidual(ends[m - 1]), N * (m - 1));
  return { F, enc: ends.enc, mats: ends.mats, ana: ends.ana };
}
// F as residual() in src/shooting.js has it (one request per piece, the line search)
function evalEach(z, lam) {
  const tau = z[2] / m, F = new Float64Array(3 + N * (m - 1));
  let cur = perpInitial(z[0], z[1], lam);
  for (let i = 0; i < m; i++) {
    const e = iasFlow(cur, tau); if (!e) return null;
    if (i < m - 1) { const nxt = z.subarray(3 + N * i, 3 + N * (i + 1)); for (let k = 0; k < N; k++) F[N * i + k] = e[k] - nxt[k]; cur = nxt; } else F.set(symResidual(e), N * (m - 1));
  }
  return F;
}
const diffSup = (a, b) => { let d = 0, at = 0; for (let i = 0; i < a.length; i++) { const x = Math.abs(a[i] - b[i]); if (x > d) { d = x; at = i; } } return [d, at]; };

const parsed = specs.map((s) => { const mm = s.match(/^([^=]+)=(.+):([0-9,]+)$/); if (!mm) { console.error('bad spec ' + s); process.exit(2); } return { label: mm[1], file: mm[2], idx: mm[3].split(',').map(Number) }; });
const traces = parsed.map((p) => ({ ...p, tr: JSON.parse(fs.readFileSync(p.file, 'utf8')) }));
const ref = traces[0].tr.settings.ias;
for (const t of traces) if (t.tr.settings.ias.firstStep !== ref.firstStep || t.tr.settings.ias.guardRatio !== ref.guardRatio) { console.error('the traces differ in first step or guard ratio; run them in separate calls'); process.exit(2); }
Object.assign(settings.ias, ref); settings.integrator = 'ias';
const res = { what: 'resolution of the corrector residual F at accepted steps; see the header of tools/residual-floor.mjs', K, seed: Number(opt.seed ?? 1), ias_settings: ref, tolerance: settings.newton, items: [] };
for (const t of traces) {
  const lines = fs.readFileSync(t.file + '.nodes.jsonl', 'utf8').trim().split('\n');
  const lamOf = new Map([...(t.tr.points || []), ...(t.tr.unrec || [])].map((p) => [p.step, p.lam]));
  for (const idx of t.idx) {
    if (idx < 1 || idx > lines.length) { res.items.push({ label: t.label, line: idx, error: 'the nodes file has ' + lines.length + ' lines' }); continue; }
    const rec = JSON.parse(lines[idx - 1]), z = Float64Array.from(rec.z), lam = lamOf.get(rec.step);
    const item = { label: t.label, line: idx, loop_step: rec.step, lam };
    if (lam === undefined) { item.error = 'no lam for this step in the trace'; res.items.push(item); continue; }
    try {
      const a = evalAll(z, lam), a2 = evalAll(z, lam), each = evalEach(z, lam);
      item.sup_F = sup(a.F); item.repeat_evaluation_difference = diffSup(a.F, a2.F)[0]; item.sup_F_line_search_evaluation = each ? sup(each) : null; item.difference_of_the_two_evaluations = each ? diffSup(a.F, each)[0] : null;
      item.flagged_pieces = [], item.replaced_pieces = [];
      for (let i = 0; i < m; i++) if (a.mats[i]) {
        let mx = 0; for (const v of a.mats[i]) mx = Math.max(mx, Math.abs(v));
        (a.enc[i] ? item.flagged_pieces : item.replaced_pieces).push({ piece: i, max_abs_matrix_entry: mx, smallest_ias15_pair_distance: Math.min(a.ana[i][0], a.ana[i][1], a.ana[i][2]) });
      }
      const dF = [], moved = [], atPiece = [], dFe = [];
      for (let k = 0; k < K; k++) {
        const zz = Float64Array.from(z);
        for (let q = 3; q < zz.length; q++) zz[q] = step1(zz[q], rand() < 0.5 ? -1 : 1);
        const b = evalAll(zz, lam), [d, at] = diffSup(b.F, a.F);
        dF.push(d); moved.push(sup(b.F)); atPiece.push(Math.floor(at / N));
        const be = evalEach(zz, lam); if (be && each) dFe.push(diffSup(be, each)[0]);
      }
      Object.assign(item, { change_of_F_largest: Math.max(...dF), change_of_F_median: med(dF), change_of_F_smallest: Math.min(...dF), moved_sup_F_range: [Math.min(...moved), Math.max(...moved)], moved_sup_F_median: med(moved),
        piece_of_the_largest_change_most_often: Object.entries(atPiece.reduce((o, p) => (o[p] = (o[p] || 0) + 1, o), {})).sort((x, y) => y[1] - x[1])[0][0] * 1,
        change_of_F_line_search_evaluation: { largest: Math.max(...dFe), median: med(dFe) },
        trials_with_moved_sup_F_below_tolerance: moved.filter((v) => v < settings.newton).length, sup_F_below_tolerance: sup(a.F) < settings.newton });
    } catch (e) { item.error = String(e && e.message || e); }
    res.items.push(item);
    console.log(t.label, 'line', idx, 'step', rec.step, 'sup|F|', item.sup_F, 'change of F: largest', item.change_of_F_largest, 'median', item.change_of_F_median, 'flagged', (item.flagged_pieces || []).map((p) => p.piece + ':' + p.max_abs_matrix_entry.toExponential(2)).join(' '), item.error || '');
  }
}
res.gstats = { trips: gstats.trips, missChecks: gstats.missChecks, xchk: gstats.xchk, replaced: gstats.replaced };
fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
process.exit(0);

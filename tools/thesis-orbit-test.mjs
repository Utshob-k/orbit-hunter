// is an orbit given by printed start values (Jacobi vectors xi = (a, 0), eta = (1, 0), velocities (0, c) and (0, d), d = L - a c, as in the tables of the CPC paper) a repeat of a shorter orbit,
// or a point of a satellite curve of the member of Broucke's R family with the rotation number nu = 1/k? the rules (written before the runs): docs/rules/rules-thesis-k39.txt
// the printed values are NOT stored in this repository, they are arguments; the output files are local.
//   node tools/thesis-orbit-test.mjs close out.json k L a c T [pieces] [--nu=lower|upper]
//       closes the orbit (multiple shooting, 16 pieces unless given), tests for a repeat (return after T/n, n = 2 to 2k, own places, up to a rotation), prints the word of the syzygies
//       and the member of the R trace with nu = 1/k (interpolated between two accepted steps):
//       its T*, L*, rotation, eps = k |theta| - 1 (a satellite curve starts at the rotation -eps with the invariants of the k fold repeat), and the distance of the orbit from that point
//   node tools/family-follow.mjs follow-1.json 1 8 u1 u2 lam t      and      ... -1 ...      (the start values are in out.json; 8 minutes each)
//   node tools/thesis-orbit-test.mjs hit out.json follow-1.json follow-2.json thetaMember TstarMember LstarMember
//       the nearest step of each traced family to the branch point (k T*, L*, -eps) of the EXACT member (the first line of  node tools/branch-point.mjs k theta --pieces=16 --repeat-tol=1e-8,
//       which can be stopped after its first lines); a hit if the three differences are below 2e-4 (T* relative, L*, rotation in turns)
import fs from 'fs';
import { perpInfo, perpInitial } from '../src/perp.js';
import { closePerpMS } from '../src/shooting.js';
import { dp45Step } from '../src/physics.js';
import { syzygyWord } from '../src/topology.js';

const TWO_PI = 2 * Math.PI, S2 = Math.SQRT2, S6 = Math.sqrt(6);
const [mode, outFile, ...rest] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const nuArg = process.argv.find((a) => a.startsWith('--nu=')), nuWhich = nuArg && nuArg.slice(5) === 'upper' ? 1 : 0;
if (mode !== 'close' && mode !== 'hit') { console.error('usage: see the head of this file'); process.exit(2); }

if (mode === 'close') {
  if (fs.existsSync(outFile)) { console.error('give a new output name: ' + outFile + ' exists'); process.exit(2); }
  const [k, L, a, c, T, piecesArg] = rest.map(Number);
  // 1. the orbit in the start used here (outer bodies at distance 2), closed again
  const d = L - a * c;
  const x = [a / S2 + 1 / S6, -a / S2 + 1 / S6, -2 / S6], vy = [c / S2 + d / S6, -c / S2 + d / S6, -2 * d / S6];
  const [L0, M0, R0] = [0, 1, 2].sort((p, q) => x[p] - x[q]);
  const sc = 2 / (x[R0] - x[L0]), lam0 = -1 + 2 * (x[M0] - x[L0]) / (x[R0] - x[L0]), vs = Math.pow(sc, -0.5);
  const q = closePerpMS(vy[L0] * vs, vy[M0] * vs, lam0, (T / 2) * Math.pow(sc, 1.5), { m: piecesArg || 16, maxIter: 60 });
  if (!q || !(q.res < 1e-9)) { console.log('1. does not close from the printed values' + (q ? ' (residual ' + q.res.toExponential(1) + ')' : '')); process.exit(1); }
  const info = perpInfo(q.u1, q.u2, q.lam, q.t);
  console.log(`1. closed (residual ${q.res.toExponential(2)}): T* ${info.ts.toFixed(5)}, L* ${Math.abs(info.ls).toFixed(5)}, rotation ${(info.theta / TWO_PI).toExponential(3)} turns`);
  // 2. repeat test and word
  const x0 = perpInitial(q.u1, q.u2, q.lam), Trel = 2 * q.t;
  const rotation = (p, r) => {
    let C = 0, S = 0;
    for (let i = 0; i < 3; i++) for (const off of [0, 6]) { C += p[off + 2 * i] * r[off + 2 * i] + p[off + 2 * i + 1] * r[off + 2 * i + 1]; S += p[off + 2 * i] * r[off + 2 * i + 1] - p[off + 2 * i + 1] * r[off + 2 * i]; }
    const th = Math.atan2(S, C), cs = Math.cos(th), sn = Math.sin(th); let e = 0;
    for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) e = Math.max(e, Math.abs(cs * p[off + 2 * i] - sn * p[off + 2 * i + 1] - r[off + 2 * i]), Math.abs(sn * p[off + 2 * i] + cs * p[off + 2 * i + 1] - r[off + 2 * i + 1]));
    return { th, err: e };
  };
  const s = Float64Array.from(x0); let t = 0, h = 1e-3; const ret = [];
  for (let n = 2 * k; n >= 2; n--) {
    const target = Trel / n;
    while (t < target - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, target - t), 1e-13, 1e-14, 0.01); if (dt === 0) throw new Error('integration stopped'); t += dt; h = hn; }
    ret.push({ n, err: rotation(x0, s).err });
  }
  const best = [...ret].sort((p, r) => p.err - r.err)[0], reps = ret.filter((r) => r.err < 1e-5).map((r) => r.n);
  console.log(`2. return after T/n (own places, n = 2 to ${2 * k}): smallest mismatch ${best.err.toExponential(2)} at n = ${best.n}; ${reps.length ? 'mismatch below 1e-5 for n = ' + reps.join(', ') + ' => a repeat' : 'no mismatch below 1e-5 => no repeat'}`);
  const w = syzygyWord(x0, Trel);
  console.log(`   syzygies over one relative period: ${w.length}; the primitive word has root "${w.root}" with power ${w.power}`);
  // 3. the member with nu = 1/k
  const trace = JSON.parse(fs.readFileSync(new URL('../data/r-family-trace.json', import.meta.url), 'utf8')).curve;
  const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((v) => Math.abs(v[1] - 1) < 1e-6), nuOf = (p, j) => p.nus.map((v) => v[0]).sort((u, v) => u - v)[j];
  let member = null;
  for (let i = 0; i < trace.length - 1 && !member; i++) {
    const A = trace[i], B = trace[i + 1]; if (!stable(A) || !stable(B)) continue;
    const da = nuOf(A, nuWhich) - 1 / k, db = nuOf(B, nuWhich) - 1 / k;
    if (da * db < 0) { const f = da / (da - db), lin = (key) => A[key] + f * (B[key] - A[key]); member = { Tstar: lin('Tstar'), Lstar: lin('Lstar'), lam: lin('lam'), turns: lin('turns') }; }
  }
  if (member) {
    member.eps = k * Math.abs(member.turns) - 1;
    console.log(`3. member with the ${nuWhich ? 'upper' : 'lower'} nu = 1/${k} (interpolated on the trace, good to about 3e-4 in L*): k T* ${(k * member.Tstar).toFixed(4)}, L* ${member.Lstar.toFixed(5)}, |theta| ${Math.abs(member.turns).toFixed(7)} turn, eps ${member.eps.toExponential(3)}`);
    console.log(`   the orbit minus the k fold repeat at the branch point: dT*/T* ${((info.ts - k * member.Tstar) / info.ts).toExponential(2)}, dL* ${(Math.abs(info.ls) - member.Lstar).toExponential(2)}, rotation ${(info.theta / TWO_PI).toExponential(2)} against -eps ${(-member.eps).toExponential(2)} turns`);
  } else console.log(`3. no member of the stable stretch of the trace has the ${nuWhich ? 'upper' : 'lower'} nu = 1/${k}`);
  fs.writeFileSync(outFile, JSON.stringify({ k, start: { u1: q.u1, u2: q.u2, lam: q.lam, t: q.t, res: q.res }, info: { Tstar: info.ts, Lstar: Math.abs(info.ls), turns: info.theta / TWO_PI }, minReturnMismatch: best, repeats: reps, word: { length: w.length, root: w.root, power: w.power }, member }, null, 1));
  console.log('   start values for family-follow: u1 ' + q.u1 + ' u2 ' + q.u2 + ' lam ' + q.lam + ' t ' + q.t);
} else {
  const st = JSON.parse(fs.readFileSync(outFile, 'utf8')), k = st.k, files = rest.slice(0, -3), [thM, TM, LM] = rest.slice(-3).map(Number);
  const eps = k * thM - 1, Tb = k * TM;
  console.log(`exact member: k T* ${Tb.toFixed(5)}, L* ${LM.toFixed(6)}, eps = ${eps.toExponential(4)}`);
  console.log(`the orbit: dT*/T* ${((st.info.Tstar - Tb) / Tb).toExponential(2)}, dL* ${(st.info.Lstar - LM).toExponential(2)}, d|rotation| ${(Math.abs(st.info.turns) - eps).toExponential(2)} turns`);
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8')), pts = d.points || [];
    if (!pts.length) { console.log(`${f}: no points (${d.why})`); continue; }
    const rows = pts.map((p) => ({ p, dT: (p.Tstar - Tb) / Tb, dL: p.Lstar - LM, dR: Math.abs(p.theta / TWO_PI) - eps }));
    const b = rows.sort((p, r) => Math.hypot(p.dT, p.dL, p.dR) - Math.hypot(r.dT, r.dL, r.dR))[0];
    const hit = [b.dT, b.dL, b.dR].every((v) => Math.abs(v) <= 2e-4);
    console.log(`${f}: ${pts.length} points (${d.why}); L* ${Math.min(...pts.map((p) => p.Lstar)).toFixed(4)} to ${Math.max(...pts.map((p) => p.Lstar)).toFixed(4)}; nearest step ${b.p.step}: dT*/T* ${b.dT.toExponential(2)}, dL* ${b.dL.toExponential(2)}, d|rotation| ${b.dR.toExponential(2)} turns => ${hit ? 'HIT' : 'no hit'}`);
  }
}

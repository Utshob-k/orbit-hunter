// converts the satellite orbits of Jankovic, Dmitrasinovic and Suvakov (CPC 2020, tables 3 to 6) into
// the start used here (bodies on the x axis at -1, lam, 1 after rescaling, velocities along y).
// their setup: Jacobi vectors xi = (a, 0), eta = (b, 0) with b = 1, velocities (0, c) and (0, d), d = L - a c
// node tools/convert-cpc.mjs data/cpc2020-satellites.json data/cpc-converted.json data/cpc-rows.json
import fs from 'fs';
import { dp45Step } from '../src/physics.js';
import { closePerp, perpInfo, symResidual } from '../src/perp.js';

const [inFile, outFile, rowsFile] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(inFile, 'utf8')).rows;
const S2 = Math.SQRT2, S6 = Math.sqrt(6);

const out = [], forHunt = [];
for (const r of rows) {
  const { a, c, L, T } = r;
  const d = L - a * c;                       // b = 1
  // positions and y velocities of the three bodies
  const x = [a / S2 + 1 / S6, -a / S2 + 1 / S6, -2 / S6];
  const vy = [c / S2 + d / S6, -c / S2 + d / S6, -2 * d / S6];
  const state = Float64Array.from([x[0], 0, x[1], 0, x[2], 0, 0, vy[0], 0, vy[1], 0, vy[2]]);
  // energy and angular momentum from the state itself (not from their formula)
  let E = 0, Lc = 0;
  for (let i = 0; i < 3; i++) { E += 0.5 * vy[i] ** 2; Lc += x[i] * vy[i]; for (let j = i + 1; j < 3; j++) E -= 1 / Math.abs(x[i] - x[j]); }
  // is it collinear and perpendicular again after half their period?
  const s = Float64Array.from(state);
  let t = 0, h = 1e-3;
  while (t < T / 2 - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, T / 2 - t), 1e-13, 1e-14, 0.01); t += dt; h = hn; }
  const sym = Math.hypot(...symResidual(s));
  // rescale to my start: outer bodies at distance 2
  const idx = [0, 1, 2].sort((p, q) => x[p] - x[q]);
  const [L0, M0, R0] = idx;
  const sc = 2 / (x[R0] - x[L0]);
  const lam = -1 + 2 * (x[M0] - x[L0]) / (x[R0] - x[L0]);
  const vs = Math.pow(sc, -0.5);
  const u1 = vy[L0] * vs, u2 = vy[M0] * vs;
  const tHalf = (T / 2) * Math.pow(sc, 1.5);
  let closed = closePerp(u1, u2, lam, tHalf, { maxMs: 20000 });
  let info = closed.res < 1e-9 ? perpInfo(closed.u1, closed.u2, lam, closed.t) : null;
  out.push({
    N: r.N, k: r.k, L_b1: L, a, c, d, T_theirs: T,
    E_b1: E, L_check: Lc, ts_theirs: T * Math.abs(E) ** 1.5, ls_theirs: Math.abs(Lc) * Math.abs(E) ** 0.5,
    symResidualAtHalfT: sym,
    mine: { u1, u2, lam, t: tHalf, closeRes: closed.res, ts: info && info.ts, ls: info && Math.abs(info.ls), theta: info && info.theta, repeatErr: info && info.repeatErr, minD: info && info.minDist },
  });
  if (info) forHunt.push([closed.u1, closed.u2, lam, closed.t]);
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
fs.writeFileSync(rowsFile, JSON.stringify(forHunt));
const good = out.filter((o) => o.mine.closeRes < 1e-9);
console.log(`${out.length} orbits, ${good.length} re-closed in my setup (closing residual < 1e-9)`);
const d1 = good.map((o) => Math.abs(o.mine.ts - o.ts_theirs) / o.ts_theirs);
console.log('T* mine vs theirs: median rel diff', d1.sort((p, q) => p - q)[Math.floor(d1.length / 2)].toExponential(1), ' max', Math.max(...d1).toExponential(1));
const d2 = good.map((o) => Math.abs(o.mine.ls - o.ls_theirs) / o.ls_theirs);
console.log('L* mine vs theirs: median rel diff', d2.sort((p, q) => p - q)[Math.floor(d2.length / 2)].toExponential(1), ' max', Math.max(...d2).toExponential(1));
console.log('symmetric-return residual at T/2 (their orbits): median', out.map((o) => o.symResidualAtHalfT).sort((p, q) => p - q)[Math.floor(out.length / 2)].toExponential(1));
console.log('k range', Math.min(...out.map((o) => o.k)), Math.max(...out.map((o) => o.k)));

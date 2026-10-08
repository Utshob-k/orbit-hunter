// converts the initial conditions of Davoust and Broucke (1982) into the start used here and checks them
// node tools/convert-db82.mjs data/db82-table2-A1.json [out.json]
// their coordinates: m0 at the origin, m1 at (1, 0) with velocity (0, y1d), m2 at (x2, 0) with velocity (0, y2d), masses 1/3, G = 1.
// unit mass system: same positions, velocities times sqrt(3), time times 1/sqrt(3) (the trajectory is the same).
import fs from 'fs';
import { closePerp, perpInfo } from '../src/perp.js';

const [inFile, outFile] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(inFile, 'utf8')).rows;
const S3 = Math.sqrt(3);
const out = [];
for (const r of rows) {
  const pos = [0, 1, r.x2], vel = [0, r.y1d, r.y2d];
  const R = (pos[0] + pos[1] + pos[2]) / 3, V = (vel[0] + vel[1] + vel[2]) / 3;
  const x = pos.map((p) => p - R), vy = vel.map((v) => (v - V) * S3);
  // order along the line, rescale so that the outer bodies are 2 apart
  const idx = [0, 1, 2].sort((a, b) => x[a] - x[b]);
  const [L0, M0, R0] = idx;
  const sc = 2 / (x[R0] - x[L0]);
  const lam = -1 + 2 * (x[M0] - x[L0]) / (x[R0] - x[L0]);
  const vs = Math.pow(sc, -0.5);
  const u1 = vy[L0] * vs, u2 = vy[M0] * vs;
  const tHalf = (r.Thalf / S3) * Math.pow(sc, 1.5);
  const c = closePerp(u1, u2, lam, tHalf, { maxMs: 30000 });
  const info = c.res < 1e-8 ? perpInfo(c.u1, c.u2, lam, c.t) : null;
  const row = { N: r.N, closeRes: c.res, u1: c.u1, u2: c.u2, lam, t: c.t, ts: info?.ts ?? null, ls: info ? Math.abs(info.ls) : null, theta: info?.theta ?? null, thalfPrinted: r.thalf, thalfFromTheta: info ? Math.abs(info.theta) / 2 : null, lsFromPrinted: 3 * Math.sqrt(r.c27) };
  out.push(row);
  console.log(`N=${r.N} close ${c.res.toExponential(1)}  L* ${row.ls?.toFixed(5)} (printed ${row.lsFromPrinted.toFixed(5)})  T* ${row.ts?.toFixed(4)}  theta/2 mod pi: mine ${row.thalfFromTheta?.toFixed(5)} printed ${(r.thalf % Math.PI).toFixed(5)}`);
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));

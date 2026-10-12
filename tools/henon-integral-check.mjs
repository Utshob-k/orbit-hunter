// is dT* = -pi L* d(turns) true pointwise along the whole satellite curve (Henon's relation, eq. 35 of his paper of 1977, with theta = -Phi)? the integral of
// pi L* d(turns) along each stored satellite curve against delta_n = n T*_member - T*(end orbit), the depth of the dip of the rotation, and the deviation of the slope
// of neighbouring points. reads data/branch-points/<n>-upper.json. node tools/henon-integral-check.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
const D = fileURLToPath(new URL('../data/', import.meta.url));
console.log('n | eps_n | dip below -eps (turns) | s at the dip minimum | delta_n | pi int L* dturns | ratio | difference | pairs (|dturns| >= 1e-6) | largest deviation of the pair slope from pi L*mean');
const rows = [];
for (let n = 5; n <= 56; n++) {
  const f = D + `branch-points/${n}-upper.json`;
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const sat = d.satellite.find((s) => s.zero);
  if (!sat) { console.log(n + ' | no zero'); continue; }
  const c = sat.curve, z = sat.zero;
  const iz = c.findIndex((p, k) => k > 0 && p.turns >= 0);
  // the points from s = 0 up to the last point before the zero, then the zero itself (T*, L*, turns of sat.zero)
  const pts = c.slice(0, iz).map((p) => ({ s: p.s, T: p.Tstar, L: p.Lstar, u: p.turns }));
  pts.push({ s: null, T: z.Tstar, L: z.Lstar, u: z.turns });
  const p0 = pts[0], eps = -p0.u;
  let minU = Infinity, sMin = null;
  for (const p of pts) if (p.u < minU) { minU = p.u; sMin = p.s; }
  let integral = 0, maxDev = 0, np = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k], b = pts[k + 1], du = b.u - a.u, Lm = (a.L + b.L) / 2;
    integral += Math.PI * Lm * du;                      // signed: dT* = -pi L* d(turns) in the orientation of these files, so T*(first) - T*(zero) = pi int L* d(turns)
    if (Math.abs(du) >= 1e-6) { np++; const dev = Math.abs(Math.abs(b.T - a.T) / (Math.PI * Lm * Math.abs(du)) - 1); if (dev > maxDev) maxDev = dev; }
  }
  const delta = p0.T - z.Tstar;
  rows.push({ n, ratio: integral / delta });
  console.log([n, eps.toExponential(3), (-eps - minU).toExponential(2), sMin === null ? 'zero' : sMin.toFixed(4), delta.toFixed(5), integral.toFixed(5), (integral / delta).toFixed(4), (integral - delta).toExponential(2), np, maxDev.toExponential(2)].join(' | '));
}
const r = rows.map((q) => q.ratio);
console.log(`\nratio of the integral to delta_n: min ${Math.min(...r).toFixed(4)}, max ${Math.max(...r).toFixed(4)}; n outside 1 +- 1 %: ${rows.filter((q) => Math.abs(q.ratio - 1) > 0.01).map((q) => q.n).join(', ') || 'none'}`);

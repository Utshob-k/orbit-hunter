// does the interpolation of n T*_R(n) on the trace matter for relation B? compares B as defined (interpolated crossing, tools/satellite-relations.mjs)
// with the same relation refitted on the exact member of data/branch-points/<n>-upper.json. node tools/relation-b-exact-members.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { perpInfo } = await import(pathToFileURL(PUB + 'src/perp.js').href);
const read = (f) => JSON.parse(fs.readFileSync(PUB + 'data/' + f, 'utf8'));
const trace = read('r-family-trace.json').curve, cands = read('satellite-candidates.json').orbits;
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
function memberT(n) {
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i], b = trace[i + 1];
    if (!stable(a) || !stable(b)) continue;
    const da = a.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n, db = b.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n;
    if (da * db < 0) return n * (a.Tstar + (da / (da - db)) * (b.Tstar - a.Tstar));
  }
  return null;
}
const rows = [];
for (let n = 5; n <= 56; n++) {
  const d = read(`branch-points/${n}-upper.json`), sat = d.satellite.find((s) => s.zero);
  const c = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
  let T; if (c) { const i = perpInfo(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t)); T = i.ts; } else T = sat.zero.Tstar;
  rows.push({ n, T, nTi: memberT(n), nTe: n * d.member.Tstar, first: sat.curve[0].Tstar });
}
function fit(key) {
  const pts = rows.filter((r) => r.n >= 8 && r.n <= 20); let s1 = 0, sx = 0, sxx = 0, sy = 0, sxy = 0;
  for (const r of pts) { const x = 1 / r.n, y = r[key] - r.T; s1++; sx += x; sxx += x * x; sy += y; sxy += x * y; }
  const b = (s1 * sxy - sx * sy) / (s1 * sxx - sx * sx); return { a: (sy - b * sx) / s1, b };
}
const fi = fit('nTi'), fe = fit('nTe');
console.log(`B as defined (interpolated crossing): a = ${fi.a.toFixed(7)}, b = ${fi.b.toFixed(6)}; with the exact member: a = ${fe.a.toFixed(7)}, b = ${fe.b.toFixed(6)}`);
console.log('n | n T*_R interpolated - n T*_member (exact) | zero - B (as defined) | zero - B (exact member, refit) | delta (interpolated) | delta (exact, first point of the curve)');
for (const r of rows) {
  const ei = r.T - (r.nTi - (fi.a + fi.b / r.n)), ee = r.T - (r.nTe - (fe.a + fe.b / r.n));
  r.ei = ei; r.ee = ee; r.di = r.nTi - r.T; r.de = r.nTe - r.T;
  console.log([r.n, (r.nTi - r.nTe).toExponential(2), ei.toFixed(5), ee.toFixed(5), r.di.toFixed(5), r.de.toFixed(5)].join(' | '));
}
const rg = (k, lo, hi) => { const v = rows.filter((r) => r.n >= lo && r.n <= hi).map((r) => r[k]); return `${Math.min(...v).toFixed(4)} to ${Math.max(...v).toFixed(4)}`; };
console.log(`\nmax |interpolated - exact| over n = 5 to 56: ${Math.max(...rows.map((r) => Math.abs(r.nTi - r.nTe))).toExponential(2)} at n = ${rows.find((r) => Math.abs(r.nTi - r.nTe) === Math.max(...rows.map((q) => Math.abs(q.nTi - q.nTe)))).n}`);
console.log(`zero - B as defined: n = 21 to 36 ${rg('ei', 21, 36)}; n = 37 to 56 ${rg('ei', 37, 56)}; with the exact member (refit): n = 21 to 36 ${rg('ee', 21, 36)}; n = 37 to 56 ${rg('ee', 37, 56)}; n = 5, 6, 7: ${[5, 6, 7].map((n) => rows[n - 5].ee.toFixed(4)).join(', ')}`);
const slope = (k, lo, hi) => { const p = rows.filter((r) => r.n >= lo && r.n <= hi); const mx = p.reduce((s, r) => s + r.n, 0) / p.length, my = p.reduce((s, r) => s + r[k], 0) / p.length; return p.reduce((s, r) => s + (r.n - mx) * (r[k] - my), 0) / p.reduce((s, r) => s + (r.n - mx) ** 2, 0); };
console.log(`trend of the error per n (least squares): as defined n = 28 to 36 ${slope('ei', 28, 36).toExponential(2)}, n = 37 to 56 ${slope('ei', 37, 56).toExponential(2)}; exact member: n = 28 to 36 ${slope('ee', 28, 36).toExponential(2)}, n = 37 to 56 ${slope('ee', 37, 56).toExponential(2)}`);

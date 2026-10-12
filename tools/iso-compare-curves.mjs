// the satellite curves of class I for n = 5 against the stored curve of class C (data/branch-points/5-upper.json): distance of the two curves, the side of
// the branch value of L*, and the multipliers along the curve of class I. node tools/iso-compare-curves.mjs [data/class-i/curves/n5.json]
import fs from 'fs';
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const fmt = (x) => (typeof x === 'number' ? x.toExponential(2) : String(x));
const stored = rd('data/branch-points/5-upper.json'), iso = rd(process.argv[2] || 'data/class-i/curves/n5.json');
const sense = (J, s) => J.satellite.find((q) => q.sense === s);
function polyDist(V, q, scale) {
  let best = { d: Infinity, k: 0, seg: 0, t: 0 };
  for (let k = 0; k + 1 < V.length; k++) {
    const a = V[k], b = V[k + 1], ab = a.map((x, i) => (b[i] - x) / scale[i]), aq = q.map((x, i) => (x - a[i]) / scale[i]);
    const L2 = ab.reduce((s, x) => s + x * x, 0);
    let t = L2 > 0 ? aq.reduce((s, x, i) => s + x * ab[i], 0) / L2 : 0; t = Math.max(0, Math.min(1, t));
    const d = Math.sqrt(aq.reduce((s, x, i) => s + (x - t * ab[i]) ** 2, 0));
    if (d < best.d) best = { d, k: t < 0.5 ? k : k + 1, t, seg: k };
  }
  return best;
}
function sag(V, k, scale) { if (k <= 0 || k >= V.length - 1) return 0; const a = V[k - 1], b = V[k], c = V[k + 1]; return Math.sqrt(a.reduce((s, x, i) => s + ((x - 2 * b[i] + c[i]) / scale[i]) ** 2, 0)) / 8; }
const scale = [stored.repeat.Tstar, stored.member.Lstar, 1e9];
const knownPoly = [...sense(stored, 1).curve].reverse().concat(sense(stored, -1).curve.slice(1)).map((p) => [p.Tstar, p.Lstar, p.turns]);
console.log(`known satellite: stored curve of data/branch-points/5-upper.json, ${knownPoly.length} points; member L* ${stored.member.Lstar.toFixed(6)}; zeros: ${stored.satellite.map((s) => s.zero ? `sense ${s.sense} T* ${s.zero.Tstar.toFixed(8)} L* ${s.zero.Lstar.toFixed(8)} minDist ${s.zero.minDist.toFixed(3)}` : 'none').join('; ')}`);
console.log(`iso curves: ${iso.satellite.map((s) => `sense ${s.sense}: ${s.points} points, ${s.why}${s.zero ? `, zero T* ${s.zero.Tstar.toFixed(8)} L* ${s.zero.Lstar.toFixed(8)} minDist ${s.zero.minDist.toFixed(3)} closure ${s.zero.closure.toExponential(1)}` : ''}`).join('; ')}`);
console.log(`bifurcation equation, iso: angle between the roots ${iso.bifurcationEquation.angleDegrees.toFixed(2)} deg (S class: ${stored.bifurcationEquation.angleDegrees.toFixed(2)} deg); singular values ${iso.singularValues.smallest.map(fmt).join(', ')}`);
// the distance of the two curves
for (const sg of [1, -1]) {
  const pts = sense(iso, sg).curve; let fail = 0, far = 0, worst = 0, dturnMax = 0, ratioMax = 0;
  const rows = [];
  pts.forEach((p, i) => {
    const r = polyDist(knownPoly, [p.Tstar, p.Lstar, p.turns], scale), tol = Math.max(2e-6, 3 * sag(knownPoly, r.k, scale));
    const a = knownPoly[r.seg], b = knownPoly[r.seg + 1], tf = a[2] + r.t * (b[2] - a[2]), dturn = Math.abs(p.turns - tf);
    if (r.d > tol || dturn > 2e-7) fail++; if (r.d > Math.max(1e-4, 10 * tol)) far++;
    worst = Math.max(worst, r.d); dturnMax = Math.max(dturnMax, dturn); ratioMax = Math.max(ratioMax, r.d / tol);
    if ([1, 5, 10, 20, 40, 60, 80, 100, pts.length - 1].includes(i)) rows.push(`pt ${i}: s ${p.s.toFixed(3)} d ${r.d.toExponential(1)} tol ${tol.toExponential(1)}`);
  });
  console.log(`distance of the curves, iso sense ${sg}: ${pts.length} points; outside the tolerance: ${fail}; far off (> max(1e-4, 10 tol)): ${far}; largest distance ${worst.toExponential(2)}; largest distance / tolerance ${ratioMax.toFixed(1)}; largest |d turns| ${dturnMax.toExponential(2)}\n   ${rows.join('; ')}`);
}
// the two curves compared at equal T*: L* of the iso curve and of the known curve (sense 1 of each, then sense -1)
function Lat(poly, T) { for (let k = 0; k + 1 < poly.length; k++) { const a = poly[k], b = poly[k + 1]; if ((a[0] - T) * (b[0] - T) <= 0 && a[0] !== b[0]) return a[1] + (T - a[0]) / (b[0] - a[0]) * (b[1] - a[1]); } return null; }
const isoPoly = [...sense(iso, 1).curve].reverse().concat(sense(iso, -1).curve.slice(1)).map((p) => [p.Tstar, p.Lstar, p.turns]);
console.log('\nL* of the two curves at the same T* (the curves are monotone in T*? iso T* range ' + Math.min(...isoPoly.map((p) => p[0])).toFixed(6) + ' to ' + Math.max(...isoPoly.map((p) => p[0])).toFixed(6) + ', known ' + Math.min(...knownPoly.map((p) => p[0])).toFixed(6) + ' to ' + Math.max(...knownPoly.map((p) => p[0])).toFixed(6) + '):');
for (const T of [17.8886, 17.888, 17.887, 17.885, 17.88, 17.87, 17.86, 17.85, 17.847]) { const a = Lat(knownPoly, T), b = Lat(isoPoly, T); console.log(`  T* ${T}: L* known ${a === null ? '-' : a.toFixed(7)}, L* iso ${b === null ? '-' : b.toFixed(7)}, iso - known ${a === null || b === null ? '-' : (b - a).toExponential(2)}`); }
// side: L* of the iso curve relative to the member, along the curve
const Lm = stored.member.Lstar;
for (const sg of [1, -1]) { const pts = sense(iso, sg).curve; console.log(`side, iso sense ${sg}: L* - L*(member) at points 10, 20, 40, 60, 80, end: ` + [10, 20, 40, 60, 80, pts.length - 1].map((i) => (i < pts.length ? (pts[i].Lstar - Lm).toExponential(2) : '-')).join(', ') + `; maximum of L* - L*(member) over the curve ${Math.max(...pts.map((p) => p.Lstar - Lm)).toExponential(2)}; turns at the first and last points ${pts[0].turns.toExponential(3)}, ${pts[pts.length - 1].turns.toExponential(3)}`); }
for (const sg of [1, -1]) { const pts = sense(stored, sg).curve; console.log(`side, KNOWN sense ${sg}: L* - L*(member) at points 10, 20, 40, 60, 80, end: ` + [10, 20, 40, 60, 80, pts.length - 1].map((i) => (i < pts.length ? (pts[i].Lstar - Lm).toExponential(2) : '-')).join(', ') + `; maximum ${Math.max(...pts.map((p) => p.Lstar - Lm)).toExponential(2)}`); }
// the multipliers
for (const sg of [1, -1]) {
  const pts = sense(iso, sg).curve;
  console.log(`\nmultipliers along the iso curve, sense ${sg} (reduction, double precision): point | s | T* | L* | turns | eigenvalues nearest +1: Re(mu)-1, Im(mu) | resonant pair kind | other pair (angle, |mod|-1)`);
  const idx = []; for (let i = 0; i < pts.length; i += 10) idx.push(i); if (idx[idx.length - 1] !== pts.length - 1) idx.push(pts.length - 1);
  for (const i of idx) {
    const p = pts[i], m = p.mult; if (!m || m.error) { console.log(`  ${i}: no multipliers (${m && m.error})`); continue; }
    const ev = [...m.eig].sort((a, b) => Math.hypot(a.re - 1, a.im) - Math.hypot(b.re - 1, b.im));
    const pair = ev.slice(0, 2), others = ev.slice(2);
    const kind = pair.every((e) => Math.abs(e.im) < 1e-12) ? (Math.max(...pair.map((e) => Math.abs(e.mod - 1))) > 1e-6 ? 'REAL pair, off the circle: HYPERBOLIC' : 'real pair within 1e-6 of the circle') : (Math.abs(pair[0].mod - 1) < 1e-9 ? 'complex pair on the circle (elliptic)' : 'complex pair off the circle');
    console.log(`  ${i}: s ${p.s.toFixed(3)} | T* ${p.Tstar.toFixed(6)} | L* ${p.Lstar.toFixed(6)} | turns ${p.turns.toExponential(3)} | mu - 1 = ${pair.map((e) => (e.re - 1).toExponential(2) + (e.im >= 0 ? '+' : '') + e.im.toExponential(1) + 'i').join(', ')} | ${kind} | other: angle ${others.map((e) => e.angle.toFixed(5)).join(', ')}, |mod|-1 ${others.map((e) => (e.mod - 1).toExponential(1)).join(', ')}`);
  }
}

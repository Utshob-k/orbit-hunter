// the branch point of a satellite on the family of Broucke's R orbits: the member of the family with rotation number nu = 1/n, where the n fold repeat of the orbit has a double multiplier 1.
// 1. the member is found by bisection between the two accepted steps of data/r-family-trace.json where nu (the stored multiplier angle) crosses 1/n;
// 2. its n fold repeat is solved as an orbit of the shooting system of src/shooting.js (half period n t, 8 or more pieces); the matrix [J | dF/dlam] of that system has a one dimensional
//    null space at an ordinary point of a curve and a two dimensional one at a branch point, so its smallest singular values are printed (one sided Jacobi, accurate for small ones);
// 3. the two directions at the branch point come from the quadratic bifurcation equation g(a, b) = psi . F(Y0 + h (a v1 + b v2)) / h^2 = 0 on the null space (psi: left null vector); one root is the
//    tangent of the repeat curve (the exact repeats of the neighbouring members, started cold), the other is the satellite;
// 4. the satellite is followed in both senses with pseudo arclength (tangent turning < 0.35 rad, steps below 6 % of the distance from the branch point so that Newton cannot land on the repeat
//    curve) until the rotation angle is 0: an exactly periodic orbit. with --control the repeat direction is followed too, it must end at a repeat of an R orbit.
// node tools/branch-point.mjs n theta [--control] [--write]      n = 5, 6 or 8; theta = rotation of the member in turns (0.2010, 0.1678, 0.1258): the crossing of nu = 1/n nearest to it
//   --write stores the numbers in data/branch-points.json (the other entries are kept). a run takes a few minutes (n = 8 with --control about 20)
import fs from 'fs';
import { closePerpMS, system, correct, tangentAt, solOf, packZ, toY, unit, dot } from '../src/shooting.js';
import { perpInfo } from '../src/perp.js';
import { relativeStability } from '../src/relative.js';

const n = Number(process.argv[2]), thetaWanted = Number(process.argv[3]), control = process.argv.includes('--control'), write = process.argv.includes('--write');
if (!n || !thetaWanted) { console.error('usage: node tools/branch-point.mjs n theta [--control] [--write]'); process.exit(2); }
const target = 1 / n;
const trace = JSON.parse(fs.readFileSync(new URL('../data/r-family-trace.json', import.meta.url), 'utf8')).curve;

// 1. the bracket and the member with nu = 1/n
const nearest = (q) => q.nus.map((x) => x[0]).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
let br = null;
for (let i = 0; i < trace.length - 1; i++) {
  const a = trace[i], b = trace[i + 1];
  if (!a.nus || !b.nus || Math.abs(a.turns - b.turns) > 0.1) continue;
  const na = nearest(a) - target, nb = nearest(b) - target;
  if (na * nb < 0 && Math.abs(na - nb) < 0.05 && (!br || Math.abs(Math.abs(a.turns) - thetaWanted) < Math.abs(Math.abs(br.a.turns) - thetaWanted))) br = { i, a, b };
}
if (!br) { console.error('no crossing of nu = 1/' + n + ' in the stored trace'); process.exit(1); }
const start = (q) => [q.u1, q.u2, q.lam, q.t];
function member(f) {
  const g = start(br.a).map((v, i) => v + f * (start(br.b)[i] - v));
  const s = closePerpMS(g[0], g[1], g[2], g[3], { m: 8 });
  if (!(s.res < 1e-11)) return null;
  const nu = relativeStability(s.u1, s.u2, s.lam, s.t).nus.map((x) => x.nu).sort((p, q) => Math.abs(p - target) - Math.abs(q - target))[0];
  return { s, nu, info: perpInfo(s.u1, s.u2, s.lam, s.t) };
}
let lo = 0, hi = 1, nuLo = nearest(br.a) - target, R = null;
for (let k = 0; k < 45; k++) {
  const f = (lo + hi) / 2, m = member(f);
  if (!m) { console.error('a member did not close at f = ' + f); process.exit(1); }
  R = { f, ...m };
  if (Math.abs(m.nu - target) < 1e-11) break;
  if ((m.nu - target) * nuLo < 0) hi = f; else { lo = f; nuLo = m.nu - target; }
}
const Rinfo = { turns: R.info.theta / (2 * Math.PI), Tstar: R.info.ts, Lstar: Math.abs(R.info.ls), lam: R.s.lam, u1: R.s.u1, u2: R.s.u2, t: R.s.t, nuMinusTarget: R.nu - target };
console.log(`n = ${n}: member with nu = 1/${n}: |theta| ${Math.abs(Rinfo.turns).toFixed(7)} turn, T* ${Rinfo.Tstar.toFixed(7)}, L* ${Rinfo.Lstar.toFixed(7)}, nu - 1/n = ${Rinfo.nuMinusTarget.toExponential(1)}`);

// 2. the n fold repeat as a solution of the shooting system and the matrix [J | dF/dlam]
let rep = null, m = 0;
for (const pieces of [8, 16, 24, 32, 40]) { const s = closePerpMS(R.s.u1, R.s.u2, R.s.lam, n * R.s.t, { m: pieces }); if (s.res < 1e-9) { rep = s; m = pieces; break; } }   // 1e-9: the system is singular here, Newton stalls a little above 1e-11
if (!rep) { console.error('the n fold repeat did not close'); process.exit(1); }
const repInfo = perpInfo(rep.u1, rep.u2, rep.lam, rep.t), z = packZ(rep), nz = z.length, t0 = rep.t, Y0 = toY(z, rep.lam);
const sys = system(z, rep.lam, m), A = sys.J.map((row, i) => [...Array.from(row), sys.Flam[i]]);
function jacobiSvd(M) {          // one sided Jacobi on the columns of M (rows x cols): columns of W = M V are orthogonal, their norms are the singular values
  const rows = M.length, cols = M[0].length;
  const W = Array.from({ length: cols }, (_, j) => Float64Array.from(M, (r) => r[j]));
  const V = Array.from({ length: cols }, (_, j) => { const v = new Float64Array(cols); v[j] = 1; return v; });
  for (let sweep = 0; sweep < 60; sweep++) {
    let rotated = 0;
    for (let i = 0; i < cols - 1; i++) for (let j = i + 1; j < cols; j++) {
      const al = dot(W[i], W[i]), be = dot(W[j], W[j]), ga = dot(W[i], W[j]);
      if (al * be === 0 || Math.abs(ga) <= 1e-14 * Math.sqrt(al * be)) continue;
      const zeta = (be - al) / (2 * ga), tt = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta)), c = 1 / Math.sqrt(1 + tt * tt), s = c * tt;
      for (const X of [W, V]) { const xi = X[i], xj = X[j]; for (let r = 0; r < xi.length; r++) { const a = xi[r], b = xj[r]; xi[r] = c * a - s * b; xj[r] = s * a + c * b; } }
      rotated++;
    }
    if (!rotated) break;
  }
  const norms = W.map((w) => Math.sqrt(dot(w, w))), order = norms.map((v, j) => [v, j]).sort((p, q) => p[0] - q[0]);
  return { norms, order, W, V, rows };
}
function smallestAt(f) {    // the same matrix at another member of the family (not the branch point): smallest singular values and nu - 1/n
  const mm = member(f); if (!mm) return null;
  let r = null, pieces = 0;
  for (const p of [8, 16, 24]) { const q = closePerpMS(mm.s.u1, mm.s.u2, mm.s.lam, n * mm.s.t, { m: p }); if (q.res < 1e-9) { r = q; pieces = p; break; } }
  if (!r) return null;
  const zz = packZ(r), ss = system(zz, r.lam, pieces), M = ss.J.map((row, i) => [...Array.from(row), ss.Flam[i]]);
  return { f, nuMinusTarget: mm.nu - target, smallest: jacobiSvd(M).order.slice(0, 3).map((o) => o[0]) };
}
const svd = jacobiSvd(A);
const [sA, sB, sC] = svd.order.slice(0, 3).map((o) => o[0]);
console.log(`   [J | dF/dlam] ${A.length} x ${A[0].length}: the three smallest singular values ${sA.toExponential(1)}, ${sB.toExponential(1)}, ${sC.toExponential(1)} (the first is zero by the shape of the matrix, one more column than rows), the largest ${Math.max(...svd.norms).toExponential(1)}`);
// the two null vectors and the left null vector (the column of W belonging to the larger of the two small values)
const [k1, k2] = [svd.order[0][1], svd.order[1][1]], big = svd.norms[k1] > svd.norms[k2] ? k1 : k2;
const v1 = Float64Array.from(svd.V[k1]), v2 = Float64Array.from(svd.V[k2]), psi = Float64Array.from(svd.W[big], (x) => x / svd.norms[big]);

// 3. the repeat curve: the exact repeats of the neighbouring members, started cold
function repeatAt(f) { const mm = member(f); if (!mm) return null; const s = closePerpMS(mm.s.u1, mm.s.u2, mm.s.lam, n * mm.s.t, { m }); return s.res < 1e-9 ? s : null; }
const up = repeatAt(Math.min(1, R.f + 1e-4)), dn = repeatAt(Math.max(0, R.f - 1e-4));
const yu = toY(packZ(up), up.lam), yd = toY(packZ(dn), dn.lam), tauR = unit(Float64Array.from(yu, (v, i) => v - yd[i]));
// the quadratic bifurcation equation on the null space
const Fof = (Y) => system(Float64Array.from(Y.subarray(0, nz)), Y[nz], m).F, h = 2e-3, rowsQ = [];
for (let k = 0; k < 36; k++) {
  const phi = (Math.PI * k) / 36, a = Math.cos(phi), b = Math.sin(phi);
  const fp = Fof(Float64Array.from(Y0, (v, i) => v + h * (a * v1[i] + b * v2[i]))), fm = Fof(Float64Array.from(Y0, (v, i) => v - h * (a * v1[i] + b * v2[i])));
  let g = 0; for (let i = 0; i < psi.length; i++) g += psi[i] * (fp[i] + fm[i]) / 2;
  rowsQ.push([a * a, a * b, b * b, g / (h * h)]);
}
const N3 = [0, 1, 2].map((i) => [0, 1, 2].map((j) => rowsQ.reduce((s, r) => s + r[i] * r[j], 0))), r3 = [0, 1, 2].map((i) => rowsQ.reduce((s, r) => s + r[i] * r[3], 0));
function solve3(M, b) { const a = M.map((r, i) => [...r, b[i]]); for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; for (let r = c + 1; r < 3; r++) { const f = a[r][c] / a[c][c]; for (let k = c; k < 4; k++) a[r][k] -= f * a[c][k]; } } const x = [0, 0, 0]; for (let r = 2; r >= 0; r--) { let s = a[r][3]; for (let k = r + 1; k < 3; k++) s -= a[r][k] * x[k]; x[r] = s / a[r][r]; } return x; }
const [c1, c2, c3] = solve3(N3, r3), fitRes = Math.max(...rowsQ.map((r) => Math.abs(r[3] - (c1 * r[0] + c2 * r[1] + c3 * r[2]))));
const disc = c2 * c2 - 4 * c1 * c3;
if (disc < 0) { console.error('the bifurcation equation has no real directions'); process.exit(1); }
const dirs = [(-c2 + Math.sqrt(disc)) / (2 * c3), (-c2 - Math.sqrt(disc)) / (2 * c3)].map((t) => unit(Float64Array.from(v1, (x, i) => x + t * v2[i])));
const iR = Math.abs(dot(dirs[0], tauR)) > Math.abs(dot(dirs[1], tauR)) ? 0 : 1, vR = dirs[iR], vS = dirs[1 - iR];
const angle = Math.acos(Math.abs(dot(vR, vS))) * 180 / Math.PI;
console.log(`   bifurcation equation: fit residual ${fitRes.toExponential(1)}, two real directions, |cos| of the repeat root with the repeat tangent ${Math.abs(dot(vR, tauR)).toFixed(6)}, angle between the two ${angle.toFixed(1)} degrees`);

// 4. following a direction in both senses until theta = 0
const inv = (Y) => { const s = solOf(Y, m), i = perpInfo(s.u1, s.u2, s.lam, s.t); return { s, Tstar: i.ts, Lstar: Math.abs(i.ls), turns: i.theta / (2 * Math.PI), minDist: i.minDist, closure: i.repeatErr }; };
function follow(vDir, vOther, sgn) {
  let tau = Float64Array.from(vDir, (v) => sgn * v), Y = Float64Array.from(Y0), step_h = 1e-3, s = 0, prev = inv(Y0), zero = null, why = 'step limit';
  const pts = [{ s: 0, Tstar: prev.Tstar, Lstar: prev.Lstar, turns: prev.turns, lam: prev.s.lam, minDist: prev.minDist }];
  for (let step = 1; step <= 700; step++) {
    let c = null;
    while (step_h > 1e-7) {
      // first step: the constraint plane must not cut the other curve near the branch point, so its normal has that tangent taken out
      const nrm = step === 1 ? unit(Float64Array.from(tau, (v, i) => v - dot(tau, vOther) * vOther[i])) : tau;
      c = correct(Float64Array.from(Y, (v, i) => v + step_h * tau[i]), nrm, m, t0);
      if (c.ok) {
        const tn = tangentAt(c.J, c.Flam, step === 1 ? unit(Float64Array.from(c.Y, (v, i) => v - Y[i])) : tau);
        if (tn && (step === 1 || dot(tn, tau) > Math.cos(0.35))) { c.tn = tn; break; }
      }
      c = null; step_h /= 2;
    }
    if (!c) { why = 'step collapse'; break; }
    const cur = inv(c.Y), d = Math.hypot(...Array.from(c.Y, (v, i) => v - Y[i]));
    if (cur.minDist < 0.03) { why = 'close approach ' + cur.minDist.toFixed(4); break; }
    if (step > 1 && prev.turns * cur.turns < 0 && Math.abs(prev.turns) < 0.05) {      // the zero of theta between the last two points: bisection along the chord, corrected onto the curve
      let a = Float64Array.from(Y), b = Float64Array.from(c.Y), ta = prev.turns, zz = null;
      for (let k = 0; k < 60; k++) {
        const mid = Float64Array.from(a, (v, i) => (v + b[i]) / 2), cm = correct(mid, unit(Float64Array.from(b, (v, i) => v - a[i])), m, t0);
        if (!cm.ok) break;
        const im = inv(cm.Y); zz = im;
        if (Math.abs(im.turns) < 1e-11) break;
        if (im.turns * ta > 0) { a = Float64Array.from(cm.Y); ta = im.turns; } else b = Float64Array.from(cm.Y);
      }
      zero = zz; why = 'zero of theta'; s += d; pts.push({ s, Tstar: cur.Tstar, Lstar: cur.Lstar, turns: cur.turns, lam: cur.s.lam, minDist: cur.minDist });
      break;
    }
    Y = c.Y; tau = c.tn; s += d; prev = cur;
    pts.push({ s, Tstar: cur.Tstar, Lstar: cur.Lstar, turns: cur.turns, lam: cur.s.lam, minDist: cur.minDist });
    step_h = Math.min(0.03, step_h * 1.3, Math.max(3e-4, 0.06 * s));
  }
  return { sense: sgn, why, points: pts.length, pathLength: s, zero: zero && { Tstar: zero.Tstar, Lstar: zero.Lstar, turns: zero.turns, closure: zero.closure, minDist: zero.minDist, u1: zero.s.u1, u2: zero.s.u2, lam: zero.s.lam, t: zero.s.t }, curve: pts };
}
const result = { n, member: Rinfo, repeat: { pieces: m, Tstar: repInfo.ts, Lstar: Math.abs(repInfo.ls), turns: repInfo.theta / (2 * Math.PI) },
  singularValues: { smallest: [sA, sB, sC], largest: Math.max(...svd.norms) }, bifurcationEquation: { coefficients: [c1, c2, c3], fitResidual: fitRes, angleDegrees: angle, cosRepeatRootWithRepeatTangent: Math.abs(dot(vR, tauR)) }, satellite: [], control: [] };
result.offPoint = [0, 0.5, 1].map(smallestAt).filter(Boolean);
console.log('   control, the same matrix at other members: ' + result.offPoint.map((o) => `nu - 1/n = ${o.nuMinusTarget.toExponential(1)}: smallest singular value ${o.smallest[1].toExponential(1)}`).join('; '));
for (const sgn of [1, -1]) {
  const r = follow(vS, vR, sgn); result.satellite.push(r);
  console.log(`   satellite, sense ${sgn}: ${r.why} after ${r.points} points (path length ${r.pathLength.toFixed(3)})` + (r.zero ? `: theta = 0 at T* ${r.zero.Tstar.toFixed(8)}, L* ${r.zero.Lstar.toFixed(8)}, closure ${r.zero.closure.toExponential(1)}, closest approach ${r.zero.minDist.toFixed(3)}` : ''));
}
if (control) for (const sgn of [1, -1]) {
  const r = follow(vR, vS, sgn); result.control.push(r);
  console.log(`   repeat direction (control), sense ${sgn}: ${r.why} after ${r.points} points` + (r.zero ? `: theta = 0 at T* ${r.zero.Tstar.toFixed(8)}, L* ${r.zero.Lstar.toFixed(8)}` : ''));
}
if (write) {
  const file = new URL('../data/branch-points.json', import.meta.url);
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { what: 'branch points of satellites on the family of Broucke\'s R orbits (tools/branch-point.mjs): the R member with rotation number nu = 1/n, the singular values of the n fold repeat, the two directions, and the satellite followed in both senses (curve = s, T*, L*, turns, lam, closest approach); control = the repeat direction. turns has the sign of src/perp.js', entries: {} };
  const r6 = (x) => Number(x.toPrecision(10));
  for (const r of [...result.satellite, ...result.control]) r.curve = r.curve.map((p) => ({ s: r6(p.s), Tstar: r6(p.Tstar), Lstar: r6(p.Lstar), turns: r6(p.turns), lam: r6(p.lam), minDist: r6(p.minDist) }));
  all.entries[n] = result;
  fs.writeFileSync(file, JSON.stringify(all));
  console.log('   written to data/branch-points.json');
}

// the three figures of the satellites of R as plain SVG (no libraries), from the stored data:
//   figure 1: T*/n against L*: the family R, its members with nu = 1/n and the end orbits of the satellite curves of class C, n = 5 to 56, with a zoom
//   figure 2: the two satellite families of n = 5 (class C, stored curve of data/branch-points/5-upper.json; class I, data/class-i/curves/n5.json): rotation against L*
//             and the difference of their T* at equal L*
//   figure 3: the rotation along the satellite curves of n = 20 and n = 36 against L*, with the dip below -eps
// node tools/figures.mjs [1|2|3] [--out=DIR]     (all three by default; the files go to DIR, default figures/; a file that exists is only accepted if it is identical)
import fs from 'fs';
import { panel, wrap } from './svg-helpers.mjs';
import { perpInfo } from '../src/perp.js';
import { ROOT, read, sequenceRows } from './orbit-lookup.mjs';

const which = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'all';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = (outArg ? outArg.slice(6) : ROOT + 'figures').replace(/[\\/]$/, '') + '/';
fs.mkdirSync(OUT, { recursive: true });
const writeNew = (f, text) => { if (fs.existsSync(OUT + f) && fs.readFileSync(OUT + f, 'utf8') !== text) throw new Error('refusing to overwrite ' + OUT + f); fs.writeFileSync(OUT + f, text); console.log('written ' + OUT + f); };

if (which === 'all' || which === '1' || which === '3') {
  const trace = read('r-family-trace.json').curve, cands = read('satellite-candidates.json').orbits;
  const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
  const memberT = (n) => {            // n T* of the member with the upper nu = 1/n, as in tools/satellite-relations.mjs
    for (let i = 0; i < trace.length - 1; i++) {
      const a = trace[i], b = trace[i + 1];
      if (!stable(a) || !stable(b)) continue;
      const da = a.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n, db = b.nus.map((x) => x[0]).sort((x, y) => x - y)[1] - 1 / n;
      if (da * db < 0) return n * (a.Tstar + (da / (da - db)) * (b.Tstar - a.Tstar));
    }
    return null;
  };
  const rows = [];
  for (let n = 5; n <= 56; n++) {
    const d = read(`branch-points/${n}-upper.json`), sat = d.satellite.find((s) => s.zero);
    const c = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
    let T, L, src;
    if (c) { const i = perpInfo(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t)); T = i.ts; L = Math.abs(i.ls); src = '30 digits'; }
    else { T = sat.zero.Tstar; L = sat.zero.Lstar; src = 'double (stored zero)'; }
    rows.push({ n, T, L, src, nT: memberT(n), member: d.member, sat, d });
  }
  // B: delta = n T_R - T fitted as a + b / n on n = 8 to 20
  const fitPts = rows.filter((r) => r.n >= 8 && r.n <= 20);
  let s1 = 0, sx = 0, sxx = 0, sy = 0, sxy = 0;
  for (const r of fitPts) { const x = 1 / r.n, y = r.nT - r.T; s1++; sx += x; sxx += x * x; sy += y; sxy += x * y; }
  const bb = (s1 * sxy - sx * sy) / (s1 * sxx - sx * sx), aa = (sy - bb * sx) / s1;
  for (const r of rows) r.err = r.T - (r.nT - (aa + bb / r.n));       // zero - B
  console.log(`B: delta(n) = ${aa.toFixed(7)} + ${bb.toFixed(6)} / n (fit on n = 8 to 20; tools/satellite-relations.mjs prints -0.0033397 and 0.463315)`);

  // check against the table printed by tools/satellite-sequence.mjs
  const tab = sequenceRows();
  let dT = 0, dL = 0, dE = 0;
  for (const c of tab) { const r = rows.find((q) => q.n === +c[0]); dT = Math.max(dT, Math.abs(r.T - +c[2])); dL = Math.max(dL, Math.abs(r.L - +c[3])); dE = Math.max(dE, Math.abs(r.err - +c[5])); }
  console.log(`check against tools/satellite-sequence.mjs (${tab.length} rows): max |T* - table| ${dT.toExponential(2)}, max |L* - table| ${dL.toExponential(2)}, max |zero - B - table| ${dE.toExponential(2)} (the table has 5, 5 and 4 decimals)`);
  console.log('zero - B for n = 21 to 36: ' + Math.min(...rows.filter((r) => r.n >= 21 && r.n <= 36).map((r) => r.err)).toFixed(4) + ' to ' + Math.max(...rows.filter((r) => r.n >= 21 && r.n <= 36).map((r) => r.err)).toFixed(4) + '; n = 37 to 56: ' + Math.min(...rows.filter((r) => r.n >= 37).map((r) => r.err)).toFixed(4) + ' to ' + Math.max(...rows.filter((r) => r.n >= 37).map((r) => r.err)).toFixed(4));

  if (which === 'all' || which === '1') {
    const W = 940, H = 440;
    const inR = (q) => q.Lstar >= 2.4;
    const xl = 2.4, xh = 4.2, yl = 1.7, yh = 4.0;
    const p = panel(70, 30, 400, 340, xl, xh, yl, yh, { xlabel: 'L*', ylabel: 'T*/n', xticks: 6 });
    p.line(trace.filter(inR).map((q) => [q.Lstar, q.Tstar]), '#1f4e9e', 1.4);
    p.dots(rows.map((r) => [r.member.Lstar, r.member.Tstar]), '#1f4e9e', 2.4, true);
    p.dots(rows.map((r) => [r.L, r.T / r.n]), '#b2182b', 2.4);
    // the zoom region of the right panel is drawn as a box on the left panel
    const zl = 2.54, zh = 2.74, zyl = 1.8, zyh = 3.75;
    p.line([[zl, zyl], [zh, zyl], [zh, zyh], [zl, zyh], [zl, zyl]], '#888', 1, '3 2');
    const q = panel(550, 30, 340, 340, zl, zh, zyl, zyh, { xlabel: 'L*', ylabel: 'T*/n', xticks: 4 });
    q.line(trace.filter((t) => t.Lstar >= zl - 0.05 && t.Lstar <= zh + 0.05).map((t) => [t.Lstar, t.Tstar]), '#1f4e9e', 1.4);
    const lab = [5, 6, 8, 12, 20, 36, 56];
    for (const r of rows) if (r.member.Lstar <= zh) q.line([[r.member.Lstar, r.member.Tstar], [r.L, r.T / r.n]], '#999999', 0.8);
    q.dots(rows.map((r) => [r.member.Lstar, r.member.Tstar]).filter((d) => d[0] <= zh), '#1f4e9e', 2.6, true);
    q.dots(rows.map((r) => [r.L, r.T / r.n]), '#b2182b', 2.6);
    for (const n of lab) { const r = rows.find((t) => t.n === n); q.text(r.L - 0.006, r.T / r.n - 0.02, 'n = ' + n, 10.5, '#b2182b', 'end'); }
    writeNew('satellites-period-vs-L.svg', wrap(W, H, p.svg() + q.svg(), 'T*/n against L* for R, its members with nu = 1/n and the end orbits of the satellite curves (left), and an enlargement (right)'));
    console.log('figure 1: left x ' + xl + ' to ' + xh + ', y ' + yl + ' to ' + yh + '; zoom x ' + zl + ' to ' + zh + ', y ' + zyl + ' to ' + zyh + '; trace points drawn ' + trace.filter(inR).length + ' of ' + trace.length + '; members and end orbits ' + rows.length);
  }

  if (which === 'all' || which === '3') {
    const W = 900, H = 440;
    let inner = '';
    [20, 36].forEach((n, k) => {
      const r = rows.find((q) => q.n === n), c = r.sat.curve, z = r.sat.zero;
      const iz = c.findIndex((q, i) => i > 0 && q.turns >= 0);
      const pts = c.slice(0, iz).map((q) => [q.Lstar, q.turns * 1e3]);
      pts.push([z.Lstar, z.turns * 1e3]);
      const eps = -c[0].turns * 1e3, ymin = Math.min(...pts.map((q) => q[1])), dip = -eps - ymin;
      const xl = Math.floor(Math.min(...pts.map((q) => q[0])) * 20) / 20 - 0.02, xh = Math.ceil(Math.max(...pts.map((q) => q[0])) * 20) / 20 + 0.02;
      const yl = Math.floor(ymin) - 0.3, yh = 0.6;
      const p = panel(70 + k * 430, 50, 360, 320, xl, xh, yl, yh, { xlabel: 'L*', ylabel: 'θ (10^-3 turns)', title: `n = ${n}: the satellite curve from the branch point to the zero`, xticks: 5 });
      p.hline(-eps, '#888');
      p.hline(0, '#444', '2 2');
      p.line(pts, '#1f4e9e', 1.6);
      p.dots([pts[0]], '#2d7d32', 4);
      p.dots([pts[pts.length - 1]], '#b2182b', 4);
      p.label(70 + k * 430 + 8, 50 + 16, `green: branch point (rotation -eps = ${(-eps).toFixed(3)}); red: zero`, 10.5, '#333');
      p.label(70 + k * 430 + 8, 50 + 31, `dashed grey: -eps; lowest point ${ymin.toFixed(3)}, ${dip.toFixed(3)} below -eps (10^-3 turns)`, 10.5, '#333');
      inner += p.svg();
      console.log(`figure 3 n = ${n}: eps ${eps.toFixed(4)}e-3 turns, lowest rotation ${ymin.toFixed(4)}e-3, dip below -eps ${dip.toFixed(4)}e-3, ${pts.length} points, L* from ${pts[0][0].toFixed(4)} to ${pts[pts.length - 1][0].toFixed(4)}`);
    });
    writeNew('satellites-rotation-dip.svg', wrap(W, H, inner, 'rotation against L* along the satellite curves for n = 20 and n = 36'));
  }
}

if (which === 'all' || which === '2') {
  const K = read('branch-points/5-upper.json'), P = read('class-i/curves/n5.json');
  const kc = K.satellite.find((s) => s.sense === 1).curve, pc = P.satellite.find((s) => s.sense === 1).curve;
  // natural cubic spline of key against L* (L* decreases along the curve): the linear interpolation of the coarse polylines gives a sawtooth of the size of their sagitta
  const spline = (c, key) => {
    const x = c.map((q) => q.Lstar).reverse(), y = c.map((q) => q[key]).reverse(), n = x.length, h = [], al = [0], l = [1], mu = [0], z = [0], b = new Array(n).fill(0), cc = new Array(n).fill(0), d = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) h.push(x[i + 1] - x[i]);
    for (let i = 1; i < n - 1; i++) al.push((3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]));
    for (let i = 1; i < n - 1; i++) { l.push(2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]); mu.push(h[i] / l[i]); z.push((al[i] - h[i - 1] * z[i - 1]) / l[i]); }
    for (let j = n - 2; j >= 0; j--) { cc[j] = (z[j] || 0) - (mu[j] || 0) * cc[j + 1]; b[j] = (y[j + 1] - y[j]) / h[j] - (h[j] * (cc[j + 1] + 2 * cc[j])) / 3; d[j] = (cc[j + 1] - cc[j]) / (3 * h[j]); }
    return (L) => { let i = 0; while (i < n - 2 && L > x[i + 1]) i++; const t = L - x[i]; return y[i] + b[i] * t + cc[i] * t * t + d[i] * t * t * t; };
  };
  const sK = { T: spline(kc, 'Tstar'), th: spline(kc, 'turns') }, sP = { T: spline(pc, 'Tstar'), th: spline(pc, 'turns') };
  const at = (which2, L, key) => (which2 === kc ? sK : sP)[key === 'Tstar' ? 'T' : 'th'](L);
  const Lmax = Math.min(kc[0].Lstar, pc[0].Lstar), Lmin = Math.max(kc[kc.length - 1].Lstar, pc[pc.length - 1].Lstar);
  const grid = []; for (let i = 0; i <= 600; i++) grid.push(Lmin + ((Lmax - Lmin) * i) / 600);
  const dT = grid.map((L) => [L, at(pc, L, 'Tstar') - at(kc, L, 'Tstar')]), dth = grid.map((L) => [L, at(pc, L, 'turns') - at(kc, L, 'turns')]);
  console.log(`common range of L*: ${Lmin.toFixed(6)} to ${Lmax.toFixed(6)}; T*(partner) - T*(known) at equal L*: ${Math.min(...dT.map((p) => p[1])).toExponential(2)} to ${Math.max(...dT.map((p) => p[1])).toExponential(2)}; rotation difference ${Math.min(...dth.map((p) => p[1])).toExponential(2)} to ${Math.max(...dth.map((p) => p[1])).toExponential(2)} turns`);
  const zeroK = K.satellite.find((s) => s.sense === 1).zero, zeroP = P.satellite.find((s) => s.sense === 1).zero;
  console.log(`zeros of the rotation: known L* ${zeroK.Lstar.toFixed(6)}, T* ${zeroK.Tstar.toFixed(6)}; partner L* ${zeroP.Lstar.toFixed(6)}, T* ${zeroP.Tstar.toFixed(6)}`);
  const W = 900, H = 380;
  const p = panel(70, 40, 360, 270, Math.min(kc[kc.length - 1].Lstar, pc[pc.length - 1].Lstar) - 0.0005, kc[0].Lstar + 0.0003, -5.6, 1.0, { xlabel: 'L*', ylabel: 'θ (10^-3 turns)', title: 'both families', xticks: 5 });
  p.line(kc.map((q) => [q.Lstar, q.turns * 1e3]), '#1f4e9e', 1.8);
  p.line(pc.map((q) => [q.Lstar, q.turns * 1e3]), '#b2182b', 1.2, '5 3');
  p.dots([[zeroK.Lstar, 0]], '#1f4e9e', 3.2); p.dots([[zeroP.Lstar, 0]], '#b2182b', 3.2);
  p.label(250, 70, 'collinear class (stable end orbit)', 11, '#1f4e9e'); p.label(250, 86, 'isosceles class (unstable end orbit)', 11, '#b2182b');
  const q = panel(530, 40, 340, 270, Lmin, Lmax, -1, 22, { xlabel: 'L*', ylabel: 'T*(isosceles) - T*(collinear) at equal L* (10^-5)', title: 'the difference of the two curves', xticks: 5 });
  q.line(dT.map((r) => [r[0], r[1] * 1e5]), '#444', 1.6); q.hline(0);
  writeNew('class-i-pair-n5.svg', wrap(W, H, p.svg() + q.svg(), 'the two satellite families at n = 5: rotation against L*, and the difference of their T* at equal L*'));
}

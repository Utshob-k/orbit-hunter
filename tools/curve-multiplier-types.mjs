// the types (elliptic, real positive or negative) of the two pairs of nontrivial multipliers along the 53 satellite curves of data/curve-multipliers/ (class C and class I, n = 5 to 20), tracked by the continuity of y = mu + 1/mu,
// with the brackets of the changes of type; also the checks that the points equal the stored curves and that the zero agrees with the multiple precision values (tier A) to 1e-3 in y.
// the thresholds, the rule of 3 consecutive points and the tracking are in docs/rules/rules-curve-multipliers.txt; a pair is classified only where |y - 2| and |y + 2| are at least 1e-6.
// node tools/curve-multiplier-types.mjs [--write]     (--write stores data/curve-multipliers/summary.json, which must be new)
import fs from 'fs';
import { fileURLToPath } from 'url';
const D = fileURLToPath(new URL('../data/', import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const TOL_CIRCLE = 1e-6, NEAR_Y = 1e-6, AMBIGUOUS_FACTOR = 3, NCONSEC = 3, TOL_G = 1e-7, TOL_TURNS = 1e-9, TOL_B = 1e-3;
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]], cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cabs = (a) => Math.hypot(a[0], a[1]);
const csqrt = (a) => { const r = cabs(a); const re = Math.sqrt(Math.max(0, (r + a[0]) / 2)), im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, a[1] < 0 ? -im : im]; };
const rootsAB = (a, b) => { const Dd = a * a - 4 * (b - 2); if (Dd >= 0) { const q = Math.sqrt(Dd); return [[(a + q) / 2, 0], [(a - q) / 2, 0]]; } const q = Math.sqrt(-Dd); return [[a / 2, q / 2], [a / 2, -q / 2]]; };
function abOfMu(mu) { let a = 0, b = 0; const L = mu.map((m) => [Number(m.re), Number(m.im)]); for (const l of L) a += l[0]; for (let j = 0; j < 4; j++) for (let k = j + 1; k < 4; k++) b += cmul(L[j], L[k])[0]; return [a, b]; }
function pairInfo(y) {
  const s = csqrt(csub(cmul(y, y), [4, 0])), x1 = [(y[0] + s[0]) / 2, (y[1] + s[1]) / 2], x2 = [(y[0] - s[0]) / 2, (y[1] - s[1]) / 2], m1 = cabs(x1), m2 = cabs(x2);
  const onCircle = Math.abs(m1 - 1) <= TOL_CIRCLE && Math.abs(m2 - 1) <= TOL_CIRCLE, real = Math.abs(x1[1]) <= TOL_CIRCLE * m1 && Math.abs(x2[1]) <= TOL_CIRCLE * m2;
  const type = onCircle ? 'elliptic' : real ? (x1[0] > 0 ? 'real positive' : 'real negative') : 'complex';
  return { type, alpha: Math.min(Math.abs(Math.atan2(x1[1], x1[0]) / (2 * Math.PI)), 0.5), mod: Math.max(m1, m2), yd: Math.min(cabs(csub(y, [2, 0])), cabs(csub(y, [-2, 0]))) };
}
function track(seq) {
  const out = []; let prev = null, amb = 0;
  for (const p of seq) {
    if (p.a === null) { out.push(null); continue; }
    const ys = rootsAB(p.a, p.b); let R, T;
    if (!prev) { const d0 = cabs(csub(ys[0], [2, 0])), d1 = cabs(csub(ys[1], [2, 0])); [R, T] = d0 <= d1 ? [ys[0], ys[1]] : [ys[1], ys[0]]; }
    else {
      const keep = cabs(csub(ys[0], prev.R)) + cabs(csub(ys[1], prev.T)), swap = cabs(csub(ys[1], prev.R)) + cabs(csub(ys[0], prev.T)), best = Math.min(keep, swap), alt = Math.max(keep, swap);
      [R, T] = keep <= swap ? [ys[0], ys[1]] : [ys[1], ys[0]];
      if (alt < AMBIGUOUS_FACTOR * best) amb++;
    }
    prev = { R, T }; out.push({ R, T });
  }
  return { yy: out, amb };
}
function runs(types) { const r = []; types.forEach((t, i) => { if (!t) return; const l = r[r.length - 1]; if (l && l.t === t) { l.n++; l.end = i; } else r.push({ t, start: i, end: i, n: 1 }); }); return r; }
function changes(types) {
  const r = runs(types), est = r.filter((x) => x.n >= NCONSEC), merged = [];
  for (const x of est) { const l = merged[merged.length - 1]; if (l && l.t === x.t) l.end = x.end; else merged.push({ ...x }); }
  const ch = []; for (let k = 1; k < merged.length; k++) ch.push({ from: merged[k - 1].t, to: merged[k].t, lastOld: merged[k - 1].end, firstNew: merged[k].start });
  const l = r[r.length - 1];
  return { established: merged, changes: ch, endRun: l && l.n < NCONSEC ? { type: l.t, length: l.n, first: l.start } : null, noise: r.filter((x) => x.n < NCONSEC).length };
}
const files = [];
for (const cls of ['class-c', 'class-i']) for (const f of fs.readdirSync(D + 'curve-multipliers/' + cls).sort((x, y) => Number(x.match(/n(\d+)/)[1]) - Number(y.match(/n(\d+)/)[1]) || x.localeCompare(y))) files.push(`curve-multipliers/${cls}/${f}`);
const out = [], summary = [];
for (const f of files) {
  const j = read(f), seq = j.points.map((p) => ({ s: p[0], T: p[1], L: p[2], turns: p[3], a: p[4], b: p[5] }));
  const zi = seq.length - 1;     // the first point past the zero is the last point of the file
  const zp = { s: null, T: j.zero.Tstar, L: j.zero.Lstar, turns: j.zero.turns, a: j.zero.a, b: j.zero.b, zero: true };
  // check G: the points against the stored curve
  const st = (j.class === 'C' ? read(`branch-points/${j.n}-upper.json`) : read(`class-i/curves/n${j.n}.json`)).satellite.find((s) => s.sense === j.sense).curve;
  let g = st.length === seq.length; let gm = 0;
  if (g) seq.forEach((p, i) => { gm = Math.max(gm, Math.abs(p.s - st[i].s), Math.abs(p.T - st[i].Tstar), Math.abs(p.L - st[i].Lstar)); if (Math.abs(p.turns - st[i].turns) > TOL_TURNS) g = false; });
  g = g && gm <= TOL_G;
  // check b: the zero against tier A (the y roots, sorted)
  const tier = read(j.class === 'C' ? `stability-mp/class-c/class-c-${j.n === 8 ? '8s' : j.n}-A.json` : `class-i/stability/n${j.n}-A.json`).result['1'].mu;
  const ra = rootsAB(...abOfMu(tier)).sort((p, q) => p[0] - q[0] || p[1] - q[1]), rb = rootsAB(zp.a, zp.b).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const dy = Math.max(...ra.map((y, k) => cabs(csub(y, rb[k])) / Math.max(1, cabs(rb[k]))));
  const full = [...seq.slice(0, zi), zp, seq[zi]];
  const { yy, amb } = track(full), info = yy.map((q) => (q ? { R: pairInfo(q.R), T: pairInfo(q.T) } : null));
  const typeR = info.map((x) => (x && x.R.yd >= NEAR_Y ? x.R.type : null)), typeT = info.map((x) => (x && x.T.yd >= NEAR_Y ? x.T.type : null));
  const at = (i) => `(i ${i}${full[i].zero ? ' = the zero' : ''}, L* ${full[i].L.toFixed(5)}, turns ${full[i].turns.toExponential(2)})`;
  const cR = changes(typeR), cT = changes(typeT), firstR = typeR.findIndex((t) => t), firstT = typeT.findIndex((t) => t);
  const lines = [`class ${j.class} n = ${j.n} sense ${j.sense}: ${seq.length} points; points equal the stored curve: ${g ? 'yes' : 'NO'}; zero against tier A: max dy ${dy.toExponential(2)} ${dy <= TOL_B ? 'ok' : 'FAILS'}; ambiguous steps ${amb}`];
  const row = { class: j.class, n: j.n, sense: j.sense, equalsStored: g, dyZero: dy, ambiguous: amb };
  for (const [name, c, f1] of [['resonant', cR, firstR], ['transverse', cT, firstT]]) {
    lines.push(`   ${name} (classified from ${f1 < 0 ? 'nowhere' : at(f1)}): ${c.established.map((x) => `${x.t} [${x.start}..${x.end}]`).join(' -> ') || 'nothing classified'}; changes: ${c.changes.length ? c.changes.map((x) => `${x.from} -> ${x.to}, between ${at(x.lastOld)} and ${at(x.firstNew)}`).join('; ') : 'none'}${c.endRun ? '; end run ' + c.endRun.type + ' x' + c.endRun.length : ''}; noise runs ${c.noise}`);
    row[name] = { classifiedFrom: f1 < 0 ? null : { i: f1, L: full[f1].L }, types: c.established.map((x) => x.t), changes: c.changes.map((x) => ({ from: x.from, to: x.to, lastOld: { i: x.lastOld, L: full[x.lastOld].L, turns: full[x.lastOld].turns }, firstNew: { i: x.firstNew, L: full[x.firstNew].L, turns: full[x.firstNew].turns } })), endRun: c.endRun };
  }
  out.push(...lines); summary.push(row);
}
console.log(out.join('\n'));
if (process.argv.includes('--write')) { const f = D + 'curve-multipliers/summary.json'; if (fs.existsSync(f)) throw new Error('refusing to overwrite ' + f); fs.writeFileSync(f, JSON.stringify(summary)); console.log('written data/curve-multipliers/summary.json'); }

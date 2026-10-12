// the table of nu_lower and nu_upper along the extended trace of R (data/r-family-trace-extended.json: the runs after the last point of data/r-family-trace.json)
// and the crossings of 1/n for n >= 59. nu is computed again at every point (src/relative.js, double precision). the last point of data/r-family-trace.json is put
// first, so that crossings between it and the first point of the first run are found (--no-old-end leaves it out). node tools/r-trace-nus.mjs
import fs from 'fs';
import { relativeStability } from '../src/relative.js';
const ext = JSON.parse(fs.readFileSync(new URL('../data/r-family-trace-extended.json', import.meta.url), 'utf8'));
const rows = [];
// the last stored point of data/r-family-trace.json (index 241) is put first, with its stored nu
const withOld = !process.argv.includes('--no-old-end');
if (withOld) {
  const tr = JSON.parse(fs.readFileSync(new URL('../data/r-family-trace.json', import.meta.url), 'utf8')).curve, q = tr[tr.length - 1], nn = q.nus.map((x) => x[0]).sort((x, y) => x - y);
  rows.push({ file: 'stored-trace-index-241', step: 0, lam: q.lam, t: q.t, T: q.Tstar, L: q.Lstar, turns: q.turns, minDist: q.minDist, lo: nn[0], up: nn[1], scatter: 0, maxMod: 1, stable: true, ok: true });
}
for (const j of ext.runs) {
  const f = j.label.split(', ').pop() + '.json';
  console.log(`# ${f}: why = ${j.why}; points ${j.points.length}; minutes limit ${j.minutesLimit}; start ${JSON.stringify(j.start)}; shifted ${JSON.stringify(j.shifted)}`);
  for (const p of j.points) {
    let st = null;
    try { st = relativeStability(p.u1, p.u2, p.lam, p.t); } catch (e) { st = null; }
    const nus = st ? st.nus.map((x) => x.nu).sort((a, b) => a - b) : [];
    const mods = st ? st.nus.map((x) => x.mod) : [];
    const stable = st && nus.length === 2 && mods.every((m) => Math.abs(m - 1) < 1e-6);
    rows.push({ file: f, step: p.step, lam: p.lam, t: p.t, T: p.Tstar, L: p.Lstar, turns: p.turns, minDist: p.minDist, lo: nus[0], up: nus[1], scatter: st ? st.scatter : null, maxMod: st ? st.maxMod : null, stable, ok: st && st.scatter < 1e-3 });
  }
}
console.log('index | file | step | lam | minDist | t | T* | L* | turns | nu_lower | nu_upper | nu_up - nu_low | scatter | max modulus | stable | usable');
rows.forEach((r, i) => {
  if (i % 10 === 0 || i === rows.length - 1)
    console.log([i, r.file, r.step, r.lam.toFixed(6), r.minDist.toFixed(5), r.t.toExponential(4), r.T.toFixed(5), r.L.toFixed(5), r.turns.toFixed(6), r.lo === undefined ? '-' : r.lo.toFixed(7), r.up === undefined ? '-' : r.up.toFixed(7), r.lo === undefined ? '-' : (r.up - r.lo).toExponential(2), r.scatter === null ? '-' : r.scatter.toExponential(1), r.maxMod === null ? '-' : r.maxMod.toFixed(8), r.stable ? 'stable' : 'NOT stable', r.ok ? 'yes' : 'NO'].join(' | '));
});
const use = rows.filter((r) => r.ok && r.lo !== undefined);
console.log(`\nusable points ${use.length} of ${rows.length}; stable among them ${use.filter((r) => r.stable).length}`);
let minUp = use.reduce((a, r) => (r.up < a.up ? r : a), use[0]), minLo = use.reduce((a, r) => (r.lo < a.lo ? r : a), use[0]);
console.log(`smallest nu_upper ${minUp.up.toFixed(8)} at lam ${minUp.lam.toFixed(6)}, smallest nu_lower ${minLo.lo.toFixed(8)} at lam ${minLo.lam.toFixed(6)}; last point nu_lower ${use[use.length - 1].lo.toFixed(8)}, nu_upper ${use[use.length - 1].up.toFixed(8)}`);
// monotonic?
for (const key of ['lo', 'up']) {
  let ups = 0; for (let i = 1; i < use.length; i++) if (use[i][key] > use[i - 1][key] + 1e-12) ups++;
  console.log(`${key}: number of consecutive increases (>1e-12) along the trace: ${ups}`);
}
// crossings of 1/n, n >= 59
for (const key of ['up', 'lo']) {
  const hits = [];
  for (let n = 59; n <= 2000; n++) {
    const target = 1 / n;
    let c = 0;
    for (let i = 1; i < use.length; i++) { const a = use[i - 1][key] - target, b = use[i][key] - target; if (a * b < 0) { c++; if (c === 1) hits.push(`${n}: between indices ${rows.indexOf(use[i - 1])} and ${rows.indexOf(use[i])} (lam ${use[i - 1].lam.toFixed(5)} to ${use[i].lam.toFixed(5)})`); } }
    if (c > 1) hits.push(`${n}: crossed ${c} times`);
  }
  console.log(`\ncrossings of 1/n (n >= 59) by nu_${key === 'up' ? 'upper' : 'lower'}: ${hits.length}`); hits.forEach((h) => console.log('  ' + h));
}

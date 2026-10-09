// does an orbit return, after T/n (n = 2 to 12), to its start up to a rotation? it is then n relative periods of a shorter, rotating orbit.
// checked for the 85 orbits of data/orbit-table.json and the 17 of data/perp-arc-orbits.json, in two ways:
//   own places: the bodies are in their own places after T/n (the rotation angle is then the rotation angle of the relative period)
//   any symmetry: the best over relabelling of the bodies, reflection (y -> -y) and reversal of the velocities (with the best rotation in every case)
// a reflected or reversed return means a return at 2T/n in the first two ways, so nothing is lost by this being in the second list only.
// whether an arclength orbit is an atlas orbit comes from the downloaded catalogue if its path is given (the list itself is not stored here),
// otherwise from the groups stored in data/return-test.json (made with the catalogue of 2026-10-09; the README counts "of the 92" use them).
// node tools/return-test.mjs [path/to/catalogue.json] [--write]      prints the counts; data/return-test.json is only written with --write
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { dp45Step } from '../src/physics.js';

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const NMAX = 12, TOL = 1e-5;
function transform(x, p, refl, rev) {
  const o = new Float64Array(12);
  for (let i = 0; i < 3; i++) {
    const k = p[i], sy = refl ? -1 : 1, sv = rev ? -1 : 1;
    o[2 * i] = x[2 * k]; o[2 * i + 1] = sy * x[2 * k + 1];
    o[6 + 2 * i] = sv * x[6 + 2 * k]; o[7 + 2 * i] = sv * sy * x[7 + 2 * k];
  }
  return o;
}
function rotation(a, b) {   // best rotation of a onto b: the angle and the largest remaining difference
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) { C += a[off + 2 * i] * b[off + 2 * i] + a[off + 2 * i + 1] * b[off + 2 * i + 1]; S += a[off + 2 * i] * b[off + 2 * i + 1] - a[off + 2 * i + 1] * b[off + 2 * i]; }
  const th = Math.atan2(S, C), c = Math.cos(th), s = Math.sin(th);
  let e = 0;
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) e = Math.max(e, Math.abs(c * a[off + 2 * i] - s * a[off + 2 * i + 1] - b[off + 2 * i]), Math.abs(s * a[off + 2 * i] + c * a[off + 2 * i + 1] - b[off + 2 * i + 1]));
  return { th, err: e };
}
function returns(x0, T) {
  const s = Float64Array.from(x0); let t = 0, h = 1e-3;
  const own = [], any = [];
  for (let n = NMAX; n >= 2; n--) {
    const target = T / n;
    while (t < target - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, target - t), 1e-13, 1e-14, 0.01); if (dt === 0) throw new Error('integration stopped'); t += dt; h = hn; }
    const r0 = rotation(x0, s);
    own.push({ n, err: r0.err, turns: r0.th / (2 * Math.PI) });
    let best = { err: Infinity };
    for (const p of PERMS) for (const refl of [0, 1]) for (const rev of [0, 1]) {
      const r = rotation(transform(x0, p, refl, rev), s);
      if (r.err < best.err) best = { n, err: r.err, perm: p.join(''), reflection: refl, reversal: rev, turns: r.th / (2 * Math.PI) };
    }
    any.push(best);
  }
  return { own, any };
}
const tab = JSON.parse(fs.readFileSync(new URL('../data/orbit-table.json', import.meta.url), 'utf8'));
const arc = JSON.parse(fs.readFileSync(new URL('../data/perp-arc-orbits.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2), write = args.includes('--write'), catPath = args.find((a) => !a.startsWith('--'));
const outFile = new URL('../data/return-test.json', import.meta.url);
let atlas = null, stored = null;
if (!catPath && fs.existsSync(outFile)) stored = new Map(JSON.parse(fs.readFileSync(outFile, 'utf8')).map((o) => [o.name, o.group]));
if (catPath) {
  const cat = JSON.parse(fs.readFileSync(catPath, 'utf8')).orbits.filter((x) => x.masses.every((m) => m === 1));
  atlas = cat.map((x) => ({ T: x.T * Math.abs(x.E) ** 1.5, L: Math.abs(x.L) * Math.abs(x.E) ** 0.5 })).filter((a) => a.L > 1e-7);
}
const inAtlas = (T, L) => atlas && atlas.some((a) => Math.abs(a.L / L - 1) < TOL && Array.from({ length: NMAX }, (_, i) => i + 1).some((n) => Math.abs(n * a.T / T - 1) < TOL || Math.abs(a.T / (n * T) - 1) < TOL));
const list = [
  ...tab.map((o, i) => ({ name: 't' + String(i).padStart(2, '0'), group: o.group, u1: o.u1, u2: o.u2, lam: o.lam, t: o.t, Tstar: o.Tstar, Lstar: o.Lstar })),
  ...arc.map((a, i) => ({ name: 'a' + String(i).padStart(2, '0'), group: atlas ? (inAtlas(a.ts, Math.abs(a.ls)) ? 'atlas' : 'unmatched') : (stored && stored.get('a' + String(i).padStart(2, '0'))) || 'arclength list (atlas not checked)', u1: a.u1, u2: a.u2, lam: a.lam, t: a.t, Tstar: a.ts, Lstar: Math.abs(a.ls) })),
];
const out = [];
for (const o of list) {
  const { own, any } = returns(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
  const ownOk = own.filter((r) => r.err < TOL).sort((a, b) => b.n - a.n)[0] || null;     // largest n: the shortest relative period
  const anyOk = any.filter((r) => r.err < TOL).sort((a, b) => b.n - a.n)[0] || null;
  const bestAny = [...any].sort((a, b) => a.err - b.err)[0];
  out.push({ name: o.name, group: o.group, Tstar: o.Tstar, Lstar: o.Lstar,
    ownPlaces: ownOk ? { n: ownOk.n, mismatch: ownOk.err, turns: ownOk.turns, Tstar_relative: o.Tstar / ownOk.n } : null,
    anySymmetry: anyOk ? { n: anyOk.n, mismatch: anyOk.err, perm: anyOk.perm, reflection: anyOk.reflection, reversal: anyOk.reversal, turns: anyOk.turns, Tstar_relative: o.Tstar / anyOk.n } : null,
    bestMismatchAnySymmetry: { n: bestAny.n, mismatch: bestAny.err } });
}
const unm = out.filter((o) => o.group === 'unmatched');
console.log(out.length, 'orbits tested (n = 2 to 12, mismatch below', TOL, ')');
console.log('return in their own places:', out.filter((o) => o.ownPlaces).length, 'of', out.length, '; among the unmatched ones:', unm.filter((o) => o.ownPlaces).length, 'of', unm.length);
console.log('return under any relabelling, reflection or reversal:', out.filter((o) => o.anySymmetry).length, '; among the unmatched ones:', unm.filter((o) => o.anySymmetry).length);
const rest = out.filter((o) => !o.anySymmetry).sort((a, b) => a.bestMismatchAnySymmetry.mismatch - b.bestMismatchAnySymmetry.mismatch)[0];
console.log('closest orbit that does not return:', rest.name, 'n =', rest.bestMismatchAnySymmetry.n, 'mismatch', rest.bestMismatchAnySymmetry.mismatch.toExponential(1));
if (write) { fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); console.log('written to data/return-test.json'); }
else console.log('data/return-test.json not changed (add --write to store this result)');
if (!unm.some((o) => o.name.startsWith('a'))) console.log('note: the atlas status of the arclength orbits is unknown, so the counts "among the unmatched" cover the 77 of the table only');

// what became of every branch point stored in data/branch-points/ (tools/branch-point.mjs): the member of the family of Broucke's R orbits with nu = k/n, the second smallest singular value
// of the matrix of its n fold repeat (about 1e-12 at a branch point, 1e-3 next to it), and how each of the four continuations ended.
// a satellite sense ends at a zero of theta (a periodic orbit) or is stopped by a limit of the continuation (closest approach below 0.03, collapse of the step, 700 accepted steps); a stop
// is a limit of the method and says nothing about the curve beyond it. the control (the repeat direction) must end at a repeat of an orbit of the family: its end is solved as an orbit,
// its repeat count is taken from src/covers.js and the primitive orbit must close as a relative periodic orbit, with a rotation p/m of a turn.
// a zero of theta is called established when its closure tier (src/closure.js, double precision, two integrators) is reliable; weak or failed zeros are not established.
// every zero is also compared with my 102 orbits (data/orbit-table.json, data/perp-arc-orbits.json): an orbit with T* and L* within 5e-3 is the same orbit when the start values agree (src/identity.js), otherwise it is near and different.
// node tools/branch-summary.mjs [--write]        --write stores data/branch-summary.json
import fs from 'fs';
import { perpInitial, perpInfo } from '../src/perp.js';
import { coverInfo } from '../src/covers.js';
import { closePerpMS } from '../src/shooting.js';
import { closureTier } from '../src/closure.js';
import { shapes, startDistance } from '../src/identity.js';

const dir = new URL('../data/branch-points/', import.meta.url);
const kn = (f) => (/^\d+-\d+-/.test(f) ? [parseInt(f), parseInt(f.split('-')[1])] : [1, parseInt(f)]);       // k and n from the name: n-branch.json (k = 1) or k-n-branch-theta.json
const files = fs.readdirSync(dir).filter((f) => /^\d+-(upper|lower)\.json$|^\d+-\d+-(upper|lower)-[0-9.]+\.json$/.test(f))
  .sort((a, b) => kn(a)[1] - kn(b)[1] || kn(a)[0] - kn(b)[0] || (a.includes('upper') ? -1 : 1) || a.localeCompare(b));
const kind = (r) => (r.zero ? 'rotation 0 reached' : r.why.startsWith('close approach') ? 'stopped at the close approach limit (0.03)' : r.why === 'step collapse' ? 'stopped by a collapse of the step' : r.why === 'step limit' ? 'stopped at the step limit of 700 steps' : 'stopped: ' + r.why);
const fraction = (x) => { for (let q = 1; q <= 40; q++) { const p = Math.round(x * q); if (Math.abs(x * q - p) < 1e-6) return p + '/' + q; } return x.toFixed(6); };

const mine = [...JSON.parse(fs.readFileSync(new URL('../data/orbit-table.json', import.meta.url), 'utf8')).map((o, i) => ({ name: 't' + String(i).padStart(2, '0'), o, T: o.Tstar, L: o.Lstar })),
  ...JSON.parse(fs.readFileSync(new URL('../data/perp-arc-orbits.json', import.meta.url), 'utf8')).map((a, i) => ({ name: 'a' + String(i).padStart(2, '0'), o: a, T: a.ts, L: Math.abs(a.ls) }))];

const out = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  const e = { k: d.k ?? 1, n: d.n, branch: d.branch, theta: Math.abs(d.member.turns), Tstar: d.member.Tstar, Lstar: d.member.Lstar, singular: d.singularValues.smallest.slice(1), angle: d.bifurcationEquation.angleDegrees, satellite: [], control: [] };
  console.log(`nu = ${e.k}/${e.n} ${e.branch}: member |theta| ${e.theta.toFixed(4)} turn, T* ${e.Tstar.toFixed(4)}, L* ${e.Lstar.toFixed(4)}; singular values ${e.singular[0].toExponential(1)} and ${e.singular[1].toExponential(1)}; the two directions are ${e.angle.toFixed(1)} degrees apart`);
  for (const r of d.satellite) {
    const s = { sense: r.sense, end: kind(r), points: r.points };
    if (r.zero) Object.assign(s, { Tstar: r.zero.Tstar, Lstar: r.zero.Lstar, closure: r.zero.closure, minDist: r.zero.minDist, tier: closureTier(perpInitial(r.zero.u1, r.zero.u2, r.zero.lam), 2 * r.zero.t).tier });
    if (r.zero) {
      const near = mine.filter((m) => Math.abs(m.T - r.zero.Tstar) / r.zero.Tstar < 5e-3 && Math.abs(m.L - r.zero.Lstar) / r.zero.Lstar < 5e-3);
      s.mine = near.map((m) => ({ name: m.name, same: startDistance(shapes(r.zero), shapes(m.o)) < 1e-6 }));
    }
    e.satellite.push(s);
    console.log(`   satellite, sense ${r.sense > 0 ? '+' : '-'}: ${s.end}${r.why === 'step limit' ? '' : ` (${r.points} steps)`}` + (r.zero ? `: T* ${r.zero.Tstar.toFixed(8)}, L* ${r.zero.Lstar.toFixed(8)}, closure ${r.zero.closure.toExponential(1)} (${s.tier}), closest approach ${r.zero.minDist.toFixed(3)}` + (s.mine.length ? '; ' + s.mine.map((m) => (m.same ? 'the same orbit as ' : 'near, a different orbit from ') + m.name).join(', ') : '') : ''));
  }
  const two = e.satellite.filter((s) => s.Tstar);
  if (two.length === 2) console.log(`   both senses reach ${Math.abs(two[0].Tstar - two[1].Tstar) < 1e-6 && Math.abs(two[0].Lstar - two[1].Lstar) < 1e-6 ? 'the same orbit' : 'different orbits'}`);
  for (const r of d.control) {
    const c = { sense: r.sense, end: kind(r), points: r.points };
    if (r.zero) {
      const z = r.zero, cv = coverInfo(perpInitial(z.u1, z.u2, z.lam), 2 * z.t, 200), m = cv.nRepeat, prim = closePerpMS(z.u1, z.u2, z.lam, z.t / m, { m: 8 }), info = perpInfo(prim.u1, prim.u2, prim.lam, prim.t);
      Object.assign(c, { Tstar: z.Tstar, Lstar: z.Lstar, repeats: m, primitiveCloses: prim.res < 1e-9, primitiveResidual: prim.res, primitiveTstar: info.ts, rotation: fraction(Math.abs(info.theta) / (2 * Math.PI)) });
    }
    e.control.push(c);
    console.log(`   control, sense ${r.sense > 0 ? '+' : '-'}: ${c.end}${r.why === 'step limit' ? '' : ` (${r.points} steps)`}` + (r.zero ? `: ${c.repeats} fold repeat of an orbit with rotation ${c.rotation} turn, T* ${c.primitiveTstar.toFixed(5)}, L* ${c.Lstar.toFixed(5)}, the primitive ${c.primitiveCloses ? 'closes' : 'DOES NOT CLOSE'} (${c.primitiveResidual.toExponential(1)})` : ''));
  }
  out.push(e);
}
const nSat = out.reduce((s, e) => s + e.satellite.length, 0), zero = out.reduce((s, e) => s + e.satellite.filter((x) => x.Tstar).length, 0);
const established = out.reduce((n, e) => n + e.satellite.filter((x) => x.tier === 'reliable').length, 0);
const nCtl = out.reduce((s, e) => s + e.control.length, 0), ctlOk = out.reduce((s, e) => s + e.control.filter((x) => x.primitiveCloses).length, 0);
console.log(`${out.length} branch points, ${nSat} satellite continuations of which ${zero} reach a rotation 0 (${established} of the zeros are established, ${zero - established} are weak or failed and not established, counted once for each sense); ${nCtl} control continuations, ${ctlOk} end at a repeat whose primitive closes, ${nCtl - ctlOk} are stopped`);
const sameOrbits = new Set(out.flatMap((e) => e.satellite.flatMap((x) => (x.mine || []).filter((m) => m.same).map((m) => m.name))));
console.log(`zeros that are orbits of my 102: ${[...sameOrbits].sort().join(', ')}`);
const stops = {};
for (const e of out) for (const x of e.satellite) if (!x.Tstar) stops[x.end] = (stops[x.end] || 0) + 1;
console.log('satellite continuations without a rotation 0: ' + Object.entries(stops).map(([k, v]) => `${v} ${k}`).join(', '));
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL('../data/branch-summary.json', import.meta.url), JSON.stringify({ what: 'how every continuation of data/branch-points/ ended (tools/branch-summary.mjs); a stop is a limit of the continuation, not a result', entries: out }, null, 1));
  console.log('written to data/branch-summary.json');
}

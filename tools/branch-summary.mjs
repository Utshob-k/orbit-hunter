// what became of every branch point stored in data/branch-points/ (tools/branch-point.mjs): the member of the family of Broucke's R orbits with nu = 1/n, the second smallest singular value
// of the matrix of its n fold repeat (about 1e-12 at a branch point, 1e-3 next to it), and how each of the four continuations ended.
// a satellite sense ends at a zero of theta (a periodic orbit) or is stopped by a limit of the continuation (closest approach below 0.03, collapse of the step, 700 accepted steps); a stop
// is a limit of the method and says nothing about the curve beyond it. the control (the repeat direction) must end at a repeat of an orbit of the family: its end is solved as an orbit,
// its repeat count is taken from src/covers.js and the primitive orbit must close as a relative periodic orbit, with a rotation p/m of a turn.
// node tools/branch-summary.mjs [--write]        --write stores data/branch-summary.json
import fs from 'fs';
import { perpInitial, perpInfo } from '../src/perp.js';
import { coverInfo } from '../src/covers.js';
import { closePerpMS } from '../src/shooting.js';

const dir = new URL('../data/branch-points/', import.meta.url);
const files = fs.readdirSync(dir).filter((f) => /^\d+-(upper|lower)\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b) || (a.includes('upper') ? -1 : 1));
const kind = (r) => (r.zero ? 'rotation 0 reached' : r.why.startsWith('close approach') ? 'stopped at the close approach limit (0.03)' : r.why === 'step collapse' ? 'stopped by a collapse of the step' : r.why === 'step limit' ? 'stopped at the step limit of 700 steps' : 'stopped: ' + r.why);
const fraction = (x) => { for (let q = 1; q <= 40; q++) { const p = Math.round(x * q); if (Math.abs(x * q - p) < 1e-6) return p + '/' + q; } return x.toFixed(6); };

const out = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  const e = { n: d.n, branch: d.branch, theta: Math.abs(d.member.turns), Tstar: d.member.Tstar, Lstar: d.member.Lstar, singular: d.singularValues.smallest.slice(1), angle: d.bifurcationEquation.angleDegrees, satellite: [], control: [] };
  console.log(`n = ${e.n} ${e.branch}: member |theta| ${e.theta.toFixed(4)} turn, T* ${e.Tstar.toFixed(4)}, L* ${e.Lstar.toFixed(4)}; singular values ${e.singular[0].toExponential(1)} and ${e.singular[1].toExponential(1)}; the two directions are ${e.angle.toFixed(1)} degrees apart`);
  for (const r of d.satellite) {
    const s = { sense: r.sense, end: kind(r), points: r.points };
    if (r.zero) Object.assign(s, { Tstar: r.zero.Tstar, Lstar: r.zero.Lstar, closure: r.zero.closure, minDist: r.zero.minDist });
    e.satellite.push(s);
    console.log(`   satellite, sense ${r.sense > 0 ? '+' : '-'}: ${s.end}${r.why === 'step limit' ? '' : ` (${r.points} steps)`}` + (r.zero ? `: T* ${r.zero.Tstar.toFixed(8)}, L* ${r.zero.Lstar.toFixed(8)}, closure ${r.zero.closure.toExponential(1)}, closest approach ${r.zero.minDist.toFixed(3)}` : ''));
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
const nCtl = out.reduce((s, e) => s + e.control.length, 0), ctlOk = out.reduce((s, e) => s + e.control.filter((x) => x.primitiveCloses).length, 0);
console.log(`${out.length} branch points, ${nSat} satellite continuations of which ${zero} reach a rotation 0; ${nCtl} control continuations, ${ctlOk} end at a repeat whose primitive closes, ${nCtl - ctlOk} are stopped`);
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL('../data/branch-summary.json', import.meta.url), JSON.stringify({ what: 'how every continuation of data/branch-points/ ended (tools/branch-summary.mjs); a stop is a limit of the continuation, not a result', entries: out }, null, 1));
  console.log('written to data/branch-summary.json');
}

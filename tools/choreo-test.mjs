// is one of my orbits a rotating choreography, or m relative periods of one (the rotating figure-eight branch is one)? such an orbit returns after T/(3m)
// with the bodies renamed cyclically (the next body is where the previous one was), up to a rotation. every n from 2 to 60 is checked, not only the multiples of 3,
// for the 85 orbits of data/orbit-table.json and the 17 of data/perp-arc-orbits.json. the control: members of the branch in data/rpo-trace-eightC.json must return at n = 3.
// node tools/choreo-test.mjs [--write]     prints the counts; data/choreo-test.json is only written with --write
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { dp45Step } from '../src/physics.js';
import { startState } from './rpo-trace.mjs';

const NMAX = 60, TOL = 1e-5;
const CYCLIC = [[1, 2, 0], [2, 0, 1]];
function renamed(x, p) {
  const o = new Float64Array(12);
  for (let i = 0; i < 3; i++) { const k = p[i]; o[2 * i] = x[2 * k]; o[2 * i + 1] = x[2 * k + 1]; o[6 + 2 * i] = x[6 + 2 * k]; o[7 + 2 * i] = x[7 + 2 * k]; }
  return o;
}
function rotation(a, b) {
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) { C += a[off + 2 * i] * b[off + 2 * i] + a[off + 2 * i + 1] * b[off + 2 * i + 1]; S += a[off + 2 * i] * b[off + 2 * i + 1] - a[off + 2 * i + 1] * b[off + 2 * i]; }
  const th = Math.atan2(S, C), c = Math.cos(th), s = Math.sin(th);
  let e = 0;
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) e = Math.max(e, Math.abs(c * a[off + 2 * i] - s * a[off + 2 * i + 1] - b[off + 2 * i]), Math.abs(s * a[off + 2 * i] + c * a[off + 2 * i + 1] - b[off + 2 * i + 1]));
  return { th, err: e };
}
// best cyclic return at T/n for n = 2 .. nmax, from the start x0 (period T)
export function cyclicReturns(x0in, T, nmax = NMAX) {
  const x0 = Float64Array.from(x0in);    // centre of mass to the origin, the start of the rotating orbits is not centred
  const cx = (x0[0] + x0[2] + x0[4]) / 3, cy = (x0[1] + x0[3] + x0[5]) / 3;
  for (let i = 0; i < 3; i++) { x0[2 * i] -= cx; x0[2 * i + 1] -= cy; }
  const s = Float64Array.from(x0); let t = 0, h = 1e-3;
  const out = [];
  for (let n = nmax; n >= 2; n--) {
    const target = T / n;
    while (t < target - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, target - t), 1e-13, 1e-14, 0.01); if (dt === 0) throw new Error('integration stopped'); t += dt; h = hn; }
    let best = { err: Infinity };
    for (const p of CYCLIC) { const r = rotation(renamed(x0, p), s); if (r.err < best.err) best = { n, err: r.err, perm: p.join(''), turns: r.th / (2 * Math.PI) }; }
    out.push(best);
  }
  return out.sort((a, b) => a.n - b.n);
}

if (process.argv[1] && process.argv[1].endsWith('choreo-test.mjs')) {
  const write = process.argv.includes('--write');
  const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
  const trace = read('rpo-trace-eightC.json').path, controls = [];
  for (const k of [10, 40, 100, 200]) {
    const p = trace[k], at = cyclicReturns(startState(p.u), p.u[5], 12).filter((r) => r.err < 1e-6).map((r) => r.n);
    controls.push({ Lstar: Number(p.Lstar.toFixed(4)), returnsAtN: at });
    console.log('control, member of the rotating eight branch at L* =', p.Lstar.toFixed(4), ': cyclic return below 1e-6 at n =', at.join(', ') || 'none');
  }
  const tab = read('orbit-table.json'), arc = read('perp-arc-orbits.json');
  const list = [...tab.map((o, i) => ({ name: 't' + String(i).padStart(2, '0'), u1: o.u1, u2: o.u2, lam: o.lam, t: o.t })),
    ...arc.map((a, i) => ({ name: 'a' + String(i).padStart(2, '0'), u1: a.u1, u2: a.u2, lam: a.lam, t: a.t }))];
  const best = [];
  for (const o of list) {
    const rs = cyclicReturns(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
    const b = [...rs].sort((x, y) => x.err - y.err)[0];
    best.push({ name: o.name, n: b.n, mismatch: b.err });
  }
  best.sort((x, y) => x.mismatch - y.mismatch);
  const hits = best.filter((b) => b.mismatch < TOL);
  console.log(list.length, 'orbits, cyclic return at T/n for n = 2 to', NMAX, ', mismatch below', TOL, ':', hits.length, 'orbits');
  console.log('the five smallest mismatches over all orbits and n:', best.slice(0, 5).map((b) => b.name + ' (n = ' + b.n + ') ' + b.mismatch.toExponential(1)).join(', '));
  if (write) {
    fs.writeFileSync(new URL('../data/choreo-test.json', import.meta.url), JSON.stringify({ nmax: NMAX, tolerance: TOL, orbits: list.length, controls, withCyclicReturn: hits, smallestMismatches: best.slice(0, 5) }, null, 1));
    console.log('written to data/choreo-test.json');
  } else console.log('data/choreo-test.json not changed (add --write to store this result)');
}

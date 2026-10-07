// sanity check against the figure-8 (v1~0.347, v2~0.533, T~6.3259)
import { sdInitial, bestReturn, refine } from '../src/physics.js';

let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!ok) fail++;
};

const rough = bestReturn(sdInitial(0.3471128135672417, 0.532724945402719), 12);
console.log('start guess ->', rough);
check('figure-8 guess returns close to start', rough.d < 1e-3, `d=${rough.d.toExponential(2)}`);

const r = refine(0.347, 0.533, 12, { iters: 120 });
console.log('refined ->', r);
check('refined return distance < 1e-6', r.d < 1e-6, `d=${r.d.toExponential(2)}`);
const T = r.perm === 0 ? r.t : r.t * 3; // relabeled return, so 3t
const periods = T / 6.32591398;
check('period ~ 6.3259 (Chenciner-Montgomery scaled)', Math.abs(periods - Math.round(periods)) < 0.01, `T=${T.toFixed(5)} perm=${r.perm} t=${r.t.toFixed(5)}`);

// energy drift
const s0 = sdInitial(0.347, 0.533);
const energy = (s) => {
  let e = 0;
  for (let i = 0; i < 3; i++) e += 0.5 * (s[6 + 2 * i] ** 2 + s[7 + 2 * i] ** 2);
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) e -= 1 / Math.hypot(s[2 * i] - s[2 * j], s[2 * i + 1] - s[2 * j + 1]);
  return e;
};
import { dp45Step } from '../src/physics.js';
const s = Float64Array.from(s0);
const e0 = energy(s);
let t = 0, h = 1e-3;
while (t < 12) {
  const [dt, hn] = dp45Step(s, Math.min(h, 12 - t), 1e-11, 1e-12, 0.01);
  t += dt; h = hn;
}
check('energy drift over t=12 < 1e-8', Math.abs(energy(s) - e0) < 1e-8, `drift=${Math.abs(energy(s) - e0).toExponential(2)}`);

process.exit(fail ? 1 : 0);

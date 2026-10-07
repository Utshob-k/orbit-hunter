// checks the eigenvalue solver on matrices where the answer is known, then the figure-8
// (which is known to be linearly stable) and an orbit that is known to be unstable
import { eigenvalues, stability } from '../src/stability.js';
import { sdInitial } from '../src/physics.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const sortBy = (ev) => [...ev].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

// diagonal
let ev = sortBy(eigenvalues([[3, 0, 0], [0, -1, 0], [0, 0, 2]]));
check('diagonal', Math.abs(ev[0][0] + 1) < 1e-10 && Math.abs(ev[1][0] - 2) < 1e-10 && Math.abs(ev[2][0] - 3) < 1e-10);

// rotation: eigenvalues exp(+-i a)
const a = 0.7;
ev = eigenvalues([[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]]);
check('rotation', ev.every((e) => Math.abs(Math.hypot(e[0], e[1]) - 1) < 1e-10) && Math.abs(Math.abs(ev[0][1]) - Math.sin(a)) < 1e-10);

// companion matrix of (x-1)(x-2)(x-3)(x+4)
const poly = [1, -2 + 0, 0, 0];
const roots = [1, 2, 3, -4];
// build coefficients of prod (x - r)
let co = [1];
for (const r of roots) { const nxt = new Array(co.length + 1).fill(0); co.forEach((c, i) => { nxt[i] += c; nxt[i + 1] -= r * c; }); co = nxt; }
const n = roots.length;
const comp = Array.from({ length: n }, () => new Array(n).fill(0));
for (let i = 1; i < n; i++) comp[i][i - 1] = 1;
for (let i = 0; i < n; i++) comp[i][n - 1] = -co[n - i];
ev = sortBy(eigenvalues(comp));
check('companion matrix roots 1,2,3,-4', [-4, 1, 2, 3].every((r, i) => Math.abs(ev[i][0] - r) < 1e-8 && Math.abs(ev[i][1]) < 1e-8), JSON.stringify(ev.map((e) => +e[0].toFixed(6))));

// a 2x2 Jordan block next to a rotation block: eigenvalue 1 twice, plus exp(+-i 0.3)
const J = [[1, 1, 0, 0], [0, 1, 0, 0], [0, 0, Math.cos(0.3), -Math.sin(0.3)], [0, 0, Math.sin(0.3), Math.cos(0.3)]];
ev = eigenvalues(J);
check('jordan block + rotation, all on the unit circle (to sqrt eps)', ev.every((e) => Math.abs(Math.hypot(e[0], e[1]) - 1) < 1e-6));

// figure-8: linearly stable
const f8 = stability(sdInitial(0.347116888118926938, 0.532724945388030229), 6.32591398292621168);
console.log('figure-8 eigenvalue moduli:', f8.eigenvalues.map((e) => e.mod.toFixed(8)).join(' '));
check('figure-8 is linearly stable', f8.stable, `max |lambda| = ${f8.maxMod.toFixed(8)}`);

// butterfly I: the Suvakov-Dmitrasinovic butterfly I is unstable
const b1 = stability(sdInitial(0.306893420490, 0.125506567011), 6.23467484);
check('butterfly I comes out unstable', !b1.stable, `max |lambda| = ${b1.maxMod.toFixed(4)}`);

// symplectic: eigenvalues come in pairs l, 1/l, so the product of all moduli is 1
const prod = f8.eigenvalues.reduce((p, e) => p * e.mod, 1);
check('product of moduli is 1 (symplectic)', Math.abs(prod - 1) < 1e-6, `product = ${prod}`);

process.exit(fail ? 1 : 0);

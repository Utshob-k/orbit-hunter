// rotation numbers of the stable orbits: the nontrivial eigenvalues are exp(+-2 pi i nu).
// node tools/floquet-angles.mjs file.json [file2.json ...]   (files written by stability-list.mjs)
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { stability } from '../src/stability.js';

for (const file of process.argv.slice(2)) {
  for (const o of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    if (!o.stable) continue;
    const s = stability(perpInitial(o.u1, o.u2, o.lam), o.T);
    const dev = (e) => Math.hypot(e.re - 1, e.im);
    const non = [...s.eigenvalues].sort((a, b) => dev(b) - dev(a)).slice(0, 4);
    const nus = [...new Set(non.map((e) => Math.abs(Math.atan2(e.im, e.re)) / (2 * Math.PI)).map((v) => v.toFixed(5)))];
    console.log(`lam=${o.lam.toFixed(5)} T*=${o.ts.toFixed(3)} L*=${Math.abs(o.ls).toFixed(3)}  |eig|=${non.map((e) => e.mod.toFixed(6)).join(' ')}  nu=${nus.join(' ')}`);
  }
}

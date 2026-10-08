// closure of the orbits in a list, integrated with Gragg-Bulirsch-Stoer instead of Dormand-Prince (src/bs.js).
// node tools/check-closure-bs.mjs file.json [tol]    file: list of {u1,u2,lam,t,...}; period 2t. compares with the Dormand-Prince closure.
import fs from 'fs';
import { perpInitial, perpInfo } from '../src/perp.js';
import { bsIntegrate } from '../src/bs.js';

const [file, tolArg] = process.argv.slice(2);
const tol = Number(tolArg) || 1e-13;
for (const o of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  const x0 = perpInitial(o.u1, o.u2, o.lam);
  const t0 = Date.now();
  const x = bsIntegrate(x0, 2 * o.t, tol);
  if (!x) { console.log(`T*=${(o.ts ?? o.Tstar).toFixed(3)} lam=${o.lam.toFixed(5)}  Bulirsch-Stoer failed`); continue; }
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) {
    const ax = x[off + 2 * i], ay = x[off + 2 * i + 1], bx = x0[off + 2 * i], by = x0[off + 2 * i + 1];
    C += ax * bx + ay * by; S += ax * by - ay * bx;
  }
  const th = Math.atan2(S, C), c = Math.cos(th), s = Math.sin(th);
  let err = 0;
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) {
    const rx = c * x[off + 2 * i] - s * x[off + 2 * i + 1], ry = s * x[off + 2 * i] + c * x[off + 2 * i + 1];
    err = Math.max(err, Math.abs(rx - x0[off + 2 * i]), Math.abs(ry - x0[off + 2 * i + 1]));
  }
  const dp = perpInfo(o.u1, o.u2, o.lam, o.t);
  console.log(`T*=${(o.ts ?? o.Tstar).toFixed(3)} lam=${o.lam.toFixed(5)}  closure BS ${err.toExponential(1)}  rotation ${th.toExponential(1)}  DP45 ${dp.repeatErr.toExponential(1)}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

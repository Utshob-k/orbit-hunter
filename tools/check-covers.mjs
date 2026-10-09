// is an orbit a repeat (cover) of a shorter one? integrates one period 2t and looks at the state at T/n for n = 2..nMax: if it equals the start
// state rotated by some angle, with the bodies in any order, the orbit is an n fold repeat.
// node tools/check-covers.mjs file.json [nMax]    file: list of {u1,u2,lam,t,...}
import fs from 'fs';
import { perpInitial } from '../src/perp.js';
import { dp45Step } from '../src/physics.js';

const [file, nArg] = process.argv.slice(2);
const nMax = Number(nArg) || 200;
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const permute = (x, p) => { const o = new Float64Array(12); for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) { o[off + 2 * i] = x[off + 2 * p[i]]; o[off + 2 * i + 1] = x[off + 2 * p[i] + 1]; } return o; };
function bestRotationError(a, b) {
  let C = 0, S = 0;
  for (let i = 0; i < 3; i++) for (const off of [0, 6]) { C += a[off + 2 * i] * b[off + 2 * i] + a[off + 2 * i + 1] * b[off + 2 * i + 1]; S += a[off + 2 * i] * b[off + 2 * i + 1] - a[off + 2 * i + 1] * b[off + 2 * i]; }
  const th = Math.atan2(S, C), c = Math.cos(th), s = Math.sin(th);
  let err = 0;
  for (let off = 0; off < 12; off += 6) for (let i = 0; i < 3; i++) err = Math.max(err, Math.abs(c * a[off + 2 * i] - s * a[off + 2 * i + 1] - b[off + 2 * i]), Math.abs(s * a[off + 2 * i] + c * a[off + 2 * i + 1] - b[off + 2 * i + 1]));
  return err;
}
for (const o of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  const x0 = perpInitial(o.u1, o.u2, o.lam), T = 2 * o.t;
  const stops = []; for (let n = nMax; n >= 2; n--) stops.push({ n, t: T / n });
  const s = Float64Array.from(x0); let t = 0, h = 1e-3, k = 0; const found = [];
  while (k < stops.length) {
    const target = stops[k].t;
    while (t < target - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, target - t), 1e-13, 1e-14, 0.01); if (dt === 0) { console.error('the integration stopped (step size 0) for lam =', o.lam); process.exit(1); } t += dt; h = hn; }
    let best = Infinity, bp = null;
    for (const p of PERMS) { const e = bestRotationError(permute(s, p), x0); if (e < best) { best = e; bp = p; } }
    found.push({ n: stops[k].n, err: best, perm: bp.join(''), errId: bestRotationError(s, x0) });
    k++;
  }
  const hit = found.filter((f) => f.err < 1e-5).sort((a, b) => b.n - a.n)[0];
  const hitId = found.filter((f) => f.errId < 1e-5).sort((a, b) => b.n - a.n)[0];
  const ts = o.ts ?? o.Tstar, ls = Math.abs(o.ls ?? o.Lstar);
  console.log(`T*=${ts.toFixed(4)} L*=${ls.toFixed(4)} lam=${o.lam.toFixed(5)}  ` + (hitId ? `TRUE REPEAT n=${hitId.n} (error ${hitId.errId.toExponential(1)}) -> base orbit T*=${(ts / hitId.n).toFixed(4)}` : 'not a repeat') + (hit && (!hitId || hit.n > hitId.n) ? `;  returns at T/${hit.n} with bodies relabeled ${hit.perm}` : ''));
}

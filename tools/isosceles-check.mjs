// isosceles test of the stored trace of R (data/r-family-trace.json): is the state at a quarter and at three quarters of the relative period 2t a state of the reversing symmetry S' = G S
// (reflect in the axis through body 0 and the centre of mass, exchange bodies 1 and 2, reverse the time)? the last two columns are the control with body 1 as the apex (bodies 0 and 2 as the mirrored pair: position error and velocity error); body 2 as the apex is not tested. node tools/isosceles-check.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { perpInitial } = await import(pathToFileURL(PUB + 'src/perp.js').href);
const { bsIntegrate } = await import(pathToFileURL(PUB + 'src/bs.js').href);
const a = JSON.parse(fs.readFileSync(PUB + 'data/r-family-trace.json', 'utf8')).curve;
console.log('index | time fraction of 2t | position error of the isosceles test | velocity error (v2 = -Refl v1, v0 perpendicular to the axis) | the same with body 1 as the apex (control: position error, velocity error)');
function test(xe, apex, b1, b2) {
  const P = (k) => [xe[2 * k], xe[2 * k + 1]], V = (k) => [xe[6 + 2 * k], xe[7 + 2 * k]];
  const p0 = P(apex), n = Math.hypot(...p0); if (n < 1e-9) return NaN;
  const ax = [p0[0] / n, p0[1] / n], refl = (v) => { const d = v[0] * ax[0] + v[1] * ax[1]; return [2 * d * ax[0] - v[0], 2 * d * ax[1] - v[1]]; };
  const r1 = refl(P(b1)), p2 = P(b2), rv1 = refl(V(b1)), v2 = V(b2), v0 = V(apex);
  const ep = Math.max(Math.abs(r1[0] - p2[0]), Math.abs(r1[1] - p2[1]));
  const ev = Math.max(Math.abs(v2[0] + rv1[0]), Math.abs(v2[1] + rv1[1]), Math.abs(v0[0] * ax[0] + v0[1] * ax[1]));
  return [ep, ev];
}
let worstP = 0, worstV = 0;
a.forEach((p, i) => {
  const x0 = perpInitial(p.u1, p.u2, p.lam);
  for (const f of [0.25, 0.75]) {
    const xe = bsIntegrate(x0, 2 * p.t * f, 1e-13), [ep, ev] = test(xe, 0, 1, 2), ctrl = test(xe, 1, 0, 2);
    worstP = Math.max(worstP, ep); worstV = Math.max(worstV, ev);
    if (i % 60 === 0 || i === a.length - 1) console.log([i, f, ep.toExponential(2), ev.toExponential(2), ctrl.map((x) => x.toExponential(1)).join(' ')].join(' | '));
  }
});
console.log('\nworst over all 242 points and both times: position error ' + worstP.toExponential(2) + ', velocity error ' + worstV.toExponential(2));

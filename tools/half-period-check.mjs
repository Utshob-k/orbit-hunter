// half period symmetry of R on the stored trace (data/r-family-trace.json, 242 points): (1) the state at the time t (half the relative period 2t), written again as a perpendicular start
// (tools/half-start.mjs; of the two rotations that put the line on the x axis the one nearer to the previous point is taken), is the start itself: the largest differences in u1, u2, lam and t;
// (2) which body is where at the time t: the order of the bodies on the line, the angle phi of the line against the rotation per 2t, and the largest deviation of the state at t, turned
// onto the x axis, from the start state. node tools/half-period-check.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { perpInitial, perpInfo } = await import(pathToFileURL(PUB + 'src/perp.js').href);
const { bsIntegrate } = await import(pathToFileURL(PUB + 'src/bs.js').href);
const { halfStarts } = await import(pathToFileURL(PUB + 'tools/half-start.mjs').href);
const a = JSON.parse(fs.readFileSync(PUB + 'data/r-family-trace.json', 'utf8')).curve;
// ---- (1) the half period state against the start
const jump = (p, q) => Math.hypot(p.u1 - q.u1, p.u2 - q.u2, p.lam - q.lam, p.t - q.t);
let prev = null; const mx = [0, 0, 0, 0];
a.forEach((p, i) => {
  const cand = halfStarts(p.u1, p.u2, p.lam, p.t);
  const q = !prev ? cand[cand[0].u1 < 0 ? 0 : 1] : (jump(cand[0], prev) <= jump(cand[1], prev) ? cand[0] : cand[1]);
  [Math.abs(q.u1 - p.u1), Math.abs(q.u2 - p.u2), Math.abs(q.lam - p.lam), Math.abs(q.t - p.t)].forEach((d, k) => { mx[k] = Math.max(mx[k], d); });
  prev = q;
});
console.log('max |half period start - start| over ' + a.length + ' points in u1,u2,lam,t: ' + mx.map((d) => d.toExponential(2)).join(' '));
// ---- (2) the bodies at the time t
const perms = new Map(); let maxDev = 0;
console.log('index | order of the bodies left-to-right at t (body numbers 0,1,2) | start order | angle of the line at t (turns, mod 1/2) | rotation per 2t (turns) | difference 2*angle - rotation (mod 1) | |state(t) - R(phi) state(0) relabelled|');
a.forEach((p, i) => {
  const x0 = perpInitial(p.u1, p.u2, p.lam), xe = bsIntegrate(x0, p.t, 1e-13);
  let best = -1, dx = 1, dy = 0;
  for (let k = 0; k < 3; k++) for (let j = k + 1; j < 3; j++) { const rx = xe[2 * j] - xe[2 * k], ry = xe[2 * j + 1] - xe[2 * k + 1], l = rx * rx + ry * ry; if (l > best) { best = l; dx = rx; dy = ry; } }
  const phi = Math.atan2(dy, dx), c = Math.cos(phi), s = Math.sin(phi);
  const P = [0, 1, 2].map((k) => [c * xe[2 * k] + s * xe[2 * k + 1], -s * xe[2 * k] + c * xe[2 * k + 1]]);
  const ord = [0, 1, 2].sort((u, v) => P[u][0] - P[v][0]);
  const ord0 = [0, 1, 2].sort((u, v) => x0[2 * u] - x0[2 * v]);
  // compare state(t) rotated by -phi (either half turn) with the start, body by body in the same order of position, scale 1
  let dev = Infinity;
  for (const sg of [1, -1]) {
    const Q = [0, 1, 2].map((k) => [sg * P[k][0], sg * P[k][1]]);
    const V = [0, 1, 2].map((k) => [sg * (c * xe[6 + 2 * k] + s * xe[7 + 2 * k]), sg * (-s * xe[6 + 2 * k] + c * xe[7 + 2 * k])]);
    const o = [0, 1, 2].sort((u, v) => Q[u][0] - Q[v][0]);
    let d = 0; for (let r = 0; r < 3; r++) d = Math.max(d, Math.abs(Q[o[r]][0] - x0[2 * ord0[r]]), Math.abs(Q[o[r]][1]), Math.abs(V[o[r]][1] - x0[7 + 2 * ord0[r]]), Math.abs(V[o[r]][0]));
    dev = Math.min(dev, d);
  }
  maxDev = Math.max(maxDev, dev);
  const key = `${ord0.join('')}->${ord.join('')}`; perms.set(key, (perms.get(key) || 0) + 1);
  if (i % 40 === 0 || i === a.length - 1) {
    const info = perpInfo(p.u1, p.u2, p.lam, p.t), th = info.theta / (2 * Math.PI);      // perpInfo().theta is the rotation that takes the end state back onto the start, minus the rotation of the orbit
    console.log([i, ord.join(''), ord0.join(''), ((phi / (2 * Math.PI)) % 0.5).toFixed(6), (-th).toFixed(6), (((2 * phi / (2 * Math.PI) + th) % 1 + 1.5) % 1 - 0.5).toExponential(2), dev.toExponential(2)].join(' | '));
  }
});
console.log('\nmost deviation over all ' + a.length + ' points between state(t) turned onto the x axis (best of the two half turns, bodies matched by position) and the start state: ' + maxDev.toExponential(2));
console.log('start order -> order at t, counts: ' + [...perms.entries()].map(([k, v]) => k + ' x' + v).join(', '));

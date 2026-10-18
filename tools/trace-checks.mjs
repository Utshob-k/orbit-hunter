// the stored trace of the family R (data/r-family-trace.json, 242 points): how many points are distinct, the closest approach at the first points, and where the half period test (tools/half-period-check.mjs, part 2) deviates most:
// the state at the time t, turned onto the x axis, against the start state (the largest deviation in state space, its index, the part that is the departure from the collinear and perpendicular form, and the stored closure of that point).
// node tools/trace-checks.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { perpInitial } = await import(pathToFileURL(PUB + 'src/perp.js').href);
const { bsIntegrate } = await import(pathToFileURL(PUB + 'src/bs.js').href);
const a = JSON.parse(fs.readFileSync(PUB + 'data/r-family-trace.json', 'utf8')).curve;
const devs = [];
a.forEach((p, i) => {
  const x0 = perpInitial(p.u1, p.u2, p.lam), xe = bsIntegrate(x0, p.t, 1e-13);
  let best = -1, dx = 1, dy = 0;
  for (let k = 0; k < 3; k++) for (let j = k + 1; j < 3; j++) { const rx = xe[2 * j] - xe[2 * k], ry = xe[2 * j + 1] - xe[2 * k + 1], l = rx * rx + ry * ry; if (l > best) { best = l; dx = rx; dy = ry; } }
  const phi = Math.atan2(dy, dx), c = Math.cos(phi), s = Math.sin(phi);
  const P = [0, 1, 2].map((k) => [c * xe[2 * k] + s * xe[2 * k + 1], -s * xe[2 * k] + c * xe[2 * k + 1]]);
  const ord0 = [0, 1, 2].sort((u, v) => x0[2 * u] - x0[2 * v]);
  let dev = Infinity, perp = 0;
  for (const sg of [1, -1]) {
    const Q = [0, 1, 2].map((k) => [sg * P[k][0], sg * P[k][1]]);
    const V = [0, 1, 2].map((k) => [sg * (c * xe[6 + 2 * k] + s * xe[7 + 2 * k]), sg * (-s * xe[6 + 2 * k] + c * xe[7 + 2 * k])]);
    const o = [0, 1, 2].sort((u, v) => Q[u][0] - Q[v][0]);
    let d = 0, pp = 0;
    for (let r = 0; r < 3; r++) { d = Math.max(d, Math.abs(Q[o[r]][0] - x0[2 * ord0[r]]), Math.abs(Q[o[r]][1]), Math.abs(V[o[r]][1] - x0[7 + 2 * ord0[r]]), Math.abs(V[o[r]][0])); pp = Math.max(pp, Math.abs(Q[o[r]][1]), Math.abs(V[o[r]][0])); }
    if (d < dev) { dev = d; perp = pp; }
  }
  devs.push({ i, dev, perp, closure: p.closure });
});
const top = devs.slice().sort((x, y) => y.dev - x.dev);
console.log(`points: ${a.length}; lam from ${Math.min(...a.map((p) => p.lam)).toFixed(4)} to ${Math.max(...a.map((p) => p.lam)).toFixed(4)}, L* from ${Math.min(...a.map((p) => p.Lstar)).toFixed(4)} to ${Math.max(...a.map((p) => p.Lstar)).toFixed(4)}`);
console.log(`distinct (T*, L*) to 8 digits: ${new Set(a.map((p) => p.Tstar.toFixed(8) + '/' + p.Lstar.toFixed(8))).size}; distinct (u1, u2, lam, t) to 8 digits: ${new Set(a.map((p) => [p.u1, p.u2, p.lam, p.t].map((x) => x.toFixed(8)).join('/'))).size}`);
let minStep = Infinity; for (let i = 1; i < a.length; i++) minStep = Math.min(minStep, Math.hypot(a[i].lam - a[i - 1].lam, a[i].Lstar - a[i - 1].Lstar));
console.log(`smallest step between consecutive points in (lam, L*): ${minStep.toExponential(2)}`);
console.log('closest approach (field minDist) at the first points: ' + a.slice(0, 6).map((p, i) => `${i}: ${p.minDist.toFixed(4)}`).join(', ') + `; smallest over all points ${Math.min(...a.map((p) => p.minDist)).toFixed(4)}`);
console.log(`half period test, state space: largest deviation ${top[0].dev.toExponential(3)} at index ${top[0].i} (non-perpendicular part ${top[0].perp.toExponential(3)}, stored closure ${top[0].closure}); the five largest: ` + top.slice(0, 5).map((x) => `${x.i}: ${x.dev.toExponential(2)}`).join(', ') + `; median ${devs.map((x) => x.dev).sort((x, y) => x - y)[Math.floor(a.length / 2)].toExponential(2)}`);

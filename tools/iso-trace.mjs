// the trace of R (data/r-family-trace.json) written with the isosceles state at a quarter of the relative period as the start, and the check that
// the isosceles start reproduces every member: closes with the multiple shooting of src/iso-shooting.js, T*, L* and the rotation as in the trace.
// node tools/iso-trace.mjs [out.json]   (a plain run only prints the check; the file out.json must be new; data/r-family-trace-iso.json is the stored result)
import fs from 'fs';
import { perpInitial, perpInfo } from '../src/perp.js';
import { bsIntegrate } from '../src/bs.js';
import { isoInitial, isoSymResidual, isoInfo } from '../src/iso.js';
import { closePerpMS } from '../src/iso-shooting.js';

const src = JSON.parse(fs.readFileSync('data/r-family-trace.json', 'utf8'));
const out = { what: 'ISOSCELES chart: every point is the isosceles state of R at a quarter of the relative period 2t of the corresponding point of data/r-family-trace.json: u1 = p, u2 = w, lam = h, t = elapsed time to the next isosceles state (src/iso.js). turns, nus, Tstar, Lstar, minDist, closure copied. ORIGINAL TEXT: ' + src.what, pieces: src.pieces, curve: [] };
let bad = 0, maxIso = 0, maxMS = 0, maxRel = 0, maxTurn = 0, maxJump = 0, prev = null, nrows = 0;
console.log('index | p | w | h | t_iso | isosceles error of the transformed state | iso closePerpMS res | T* rel diff | L* rel diff | |turns| diff');
src.curve.forEach((p, i) => {
  const x0 = perpInitial(p.u1, p.u2, p.lam);
  // quarter of the relative period 2t is t / 2: integrate to t / 2
  const xq = bsIntegrate(x0, p.t / 2, 1e-13);
  if (!xq) { console.log(i, 'integration failed'); bad++; return; }
  const psi = Math.atan2(xq[1], xq[0]), c = Math.cos(psi), s = Math.sin(psi), a = Math.hypot(xq[0], xq[1]), sc = 1 / a;
  const P = [0, 1, 2].map((k) => [sc * (c * xq[2 * k] + s * xq[2 * k + 1]), sc * (-s * xq[2 * k] + c * xq[2 * k + 1])]);
  const V = [0, 1, 2].map((k) => [(c * xq[6 + 2 * k] + s * xq[7 + 2 * k]) / Math.sqrt(sc), (-s * xq[6 + 2 * k] + c * xq[7 + 2 * k]) / Math.sqrt(sc)]);
  const h = P[1][1], pp = V[1][0], w = V[0][1], tIso = p.t * Math.pow(sc, 1.5);
  const iso = isoInitial(pp, w, h);
  const isoErr = Math.max(Math.abs(P[1][0] + 0.5), Math.abs(P[1][1] + P[2][1]), Math.abs(P[2][0] + 0.5), Math.abs(V[0][0]), Math.abs(V[1][1] + w / 2), Math.abs(V[1][0] + V[2][0]), Math.abs(V[1][1] - V[2][1]), Math.abs(V[2][1] + w / 2), Math.abs(P[0][0] - 1), Math.abs(P[0][1]));
  const ms = closePerpMS(pp, w, h, tIso, { m: 8 });
  const info = isoInfo(pp, w, h, tIso);
  const dT = Math.abs(info.ts - p.Tstar) / p.Tstar, dL = Math.abs(Math.abs(info.ls) - p.Lstar) / p.Lstar, dTurn = Math.abs(Math.abs(info.theta / (2 * Math.PI)) - Math.abs(p.turns));
  const jmp = prev ? Math.hypot(pp - prev.p, w - prev.w, h - prev.h, tIso - prev.t) : 0;
  if (!(ms.res < 1e-9)) bad++;
  maxIso = Math.max(maxIso, isoErr); maxMS = Math.max(maxMS, ms.res); maxRel = Math.max(maxRel, dT, dL); maxTurn = Math.max(maxTurn, dTurn); maxJump = Math.max(maxJump, jmp);
  if (i % 20 === 0 || !(ms.res < 1e-9) || dT > 1e-8 || dL > 1e-8 || dTurn > 1e-8) console.log([i, pp.toFixed(5), w.toFixed(5), h.toFixed(5), tIso.toFixed(5), isoErr.toExponential(1), ms.res.toExponential(1), dT.toExponential(1), dL.toExponential(1), dTurn.toExponential(1)].join(' | '));
  out.curve.push({ ...p, u1: pp, u2: w, lam: h, t: tIso, original: { u1: p.u1, u2: p.u2, lam: p.lam, t: p.t } });
  prev = { p: pp, w, h, t: tIso };
});
if (process.argv[2]) {
  if (fs.existsSync(process.argv[2])) { console.error('refusing to overwrite ' + process.argv[2]); process.exit(2); }
  fs.writeFileSync(process.argv[2], JSON.stringify(out));
}
console.log(`\n${out.curve.length} points; failures (integration or iso closePerpMS res >= 1e-9): ${bad}; largest isosceles error of a transformed state ${maxIso.toExponential(2)}; largest iso closePerpMS residual ${maxMS.toExponential(2)}; largest relative difference of T* or L* ${maxRel.toExponential(2)}; largest |turns| difference ${maxTurn.toExponential(2)}; largest jump between consecutive iso points ${maxJump.toExponential(2)}`);
console.log('check (all 242 converge, T* and L* to 1e-8 relative, |turns| to 1e-8): ' + (bad === 0 && maxRel < 1e-8 && maxTurn < 1e-8 ? 'PASSED' : 'FAILED (see the rows above and the maxima)'));

// signs of dT*/d(turns) in the stored files, against Henon's eq. (35) dT/dPhi = -A/(2E) (theta = -Phi). node tools/henon-sign-check.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { perpInfo } = await import(pathToFileURL(PUB + 'src/perp.js').href);
const read = (f) => JSON.parse(fs.readFileSync(PUB + 'data/' + f, 'utf8'));
// (1) the satellite curves of data/branch-points (turns = perpInfo theta / 2 pi)
let pairs = 0, opposite = 0, ratios = [];
for (let n = 5; n <= 56; n++) {
  const sat = read(`branch-points/${n}-upper.json`).satellite.find((s) => s.zero), c = sat.curve, iz = c.findIndex((p, k) => k > 0 && p.turns >= 0);
  for (let k = 0; k + 1 < iz; k++) {
    const a = c[k], b = c[k + 1], du = b.turns - a.turns, dT = b.Tstar - a.Tstar;
    if (Math.abs(du) < 1e-6) continue;
    pairs++; if (dT * du < 0) opposite++;
    ratios.push(dT / (-Math.PI * (a.Lstar + b.Lstar) / 2 * du));
  }
}
ratios.sort((x, y) => x - y);
console.log(`(1) satellite curves, n = 5 to 56, neighbouring stored points with |d turns| >= 1e-6: ${pairs}; dT* and d(turns) have OPPOSITE signs in ${opposite} of them; dT* / (-pi L* d(turns)) has median ${ratios[Math.floor(ratios.length / 2)].toFixed(5)}, 1st and 99th percentile ${ratios[Math.floor(ratios.length * 0.01)].toFixed(4)} and ${ratios[Math.floor(ratios.length * 0.99)].toFixed(4)}`);
// (2) the sign of the angular momentum of the orbits (perpInfo: L = sum x vy - y vx) and of the rotation angle
const cands = read('satellite-candidates.json').orbits;
let pos = 0, neg = 0;
for (const o of cands) { const i = perpInfo(Number(o.u1), Number(o.u2), Number(o.lam), Number(o.t)); if (i.L > 0) pos++; else neg++; }
console.log(`(2) perpInfo L (signed angular momentum) of the ${cands.length} orbits of data/satellite-candidates.json: positive for ${pos}, negative for ${neg}`);
// (3) the trace of R: the sign of dT*/d(turns) along the family at the members with nu = 1/n (the trace file has the opposite sign of turns, see its description)
const trace = read('r-family-trace.json').curve;
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
let tp = 0, tn = 0;
for (let i = 0; i + 1 < trace.length; i++) { const a = trace[i], b = trace[i + 1]; if (!stable(a) || !stable(b)) continue; const du = b.turns - a.turns; if (Math.abs(du) < 1e-9) continue; ((b.Tstar - a.Tstar) / du > 0 ? tp++ : tn++); }
console.log(`(3) r-family-trace.json, consecutive stable steps: dT*/d(turns of the trace) positive for ${tp}, negative for ${tn}`);
// (4) the relation between the signs of the branch point files and of the trace for the same member
const d20 = read('branch-points/20-upper.json');
const nearest = trace.filter(stable).reduce((p, q) => (Math.abs(q.Lstar - d20.member.Lstar) < Math.abs(p.Lstar - d20.member.Lstar) ? q : p));
console.log(`(4) n = 20: turns of the member in data/branch-points/20-upper.json ${d20.member.turns.toFixed(6)}; turns of the nearest stable trace step (same L*) ${nearest.turns.toFixed(6)}`);

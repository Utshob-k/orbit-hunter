// are the end orbits of the two senses of a satellite curve (n = 5 to 15, data/branch-points/<n>-upper.json) linked by the flow over half a period? the zero of one sense, integrated
// to the half period and written again as a perpendicular start, is compared with the zero of the other sense. node tools/two-senses-check.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const { halfStarts } = await import(pathToFileURL(PUB + 'tools/half-start.mjs').href);
const zero = (n, sense) => { const j = JSON.parse(fs.readFileSync(`${PUB}data/branch-points/${n}-upper.json`, 'utf8')); const s = j.satellite.find((q) => q.sense === sense); return s && s.zero ? s.zero : null; };
const mism = (c, z) => Math.max(Math.abs(c.u1 - z.u1), Math.abs(c.u2 - z.u2), Math.abs(c.lam - z.lam));
console.log('n | direction | perpErr of the half period state | cand0: max|d(u1,u2,lam)|, rel d t | cand1: max|d(u1,u2,lam)|, rel d t | best | within 1e-6 (u1,u2,lam) and 1e-6 rel (t)');
let allOk = true, worst = 0, worstT = 0, control = Infinity;
for (let n = 5; n <= 15; n++) {
  const a = zero(n, 1), b = zero(n, -1);
  for (const [from, to, name] of [[a, b, '+1 -> -1'], [b, a, '-1 -> +1']]) {
    const c = halfStarts(from.u1, from.u2, from.lam, from.t);
    const r = c.map((q) => ({ m: mism(q, to), dt: Math.abs(q.t - to.t) / to.t, perp: q.perpErr }));
    const k = r[0].m <= r[1].m ? 0 : 1, ok = r[k].m < 1e-6 && r[k].dt < 1e-6;
    allOk = allOk && ok; worst = Math.max(worst, r[k].m); worstT = Math.max(worstT, r[k].dt); control = Math.min(control, r[1 - k].m);
    console.log(`${n} | ${name} | ${Math.max(r[0].perp, r[1].perp).toExponential(2)} | ${r[0].m.toExponential(2)}, ${r[0].dt.toExponential(2)} | ${r[1].m.toExponential(2)}, ${r[1].dt.toExponential(2)} | cand${k} | ${ok}`);
  }
  console.log(`    T*, L* of the two zeros: dT* ${(a.Tstar - b.Tstar).toExponential(2)}, dL* ${(a.Lstar - b.Lstar).toExponential(2)}; closures ${a.closure.toExponential(1)}, ${b.closure.toExponential(1)}; lam ${a.lam.toFixed(6)} and ${b.lam.toFixed(6)}`);
}
console.log(`ALL within tolerance: ${allOk}; worst mismatch in (u1,u2,lam) ${worst.toExponential(2)}, worst relative mismatch in t ${worstT.toExponential(2)}; smallest mismatch of the other candidate (control) ${control.toExponential(2)}`);

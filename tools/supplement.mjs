// the initial conditions of the 52 satellites of class C (n = 5 to 56, the perpendicular start, upper nu = 1/n) and of the 8 end orbits of class I (n = 5 to 12,
// the isosceles start), 30 digits as stored. the formats of the two starts are in docs/reproducing.md.
// node tools/supplement.mjs [--write]    (a plain run prints the JSON; --write stores data/supplement-initial-conditions.json, the file must be new)
import fs from 'fs';
import { ROOT, classCOrbit, classCSource, classIRefined } from './orbit-lookup.mjs';

const sat = [];
for (let n = 5; n <= 56; n++) { const k = classCOrbit(n); sat.push({ n, u1: k.u1, u2: k.u2, lam: k.lam, t: k.t, source: classCSource(n) }); }
const partners = [];
for (let n = 5; n <= 12; n++) { const ref = classIRefined(n); partners.push({ n, p: ref.p, w: ref.w, h: ref.h, t: ref.t, Tstar: ref.Tstar, Lstar: ref.Lstar, closure: ref.closure_full_period }); }
const text = JSON.stringify({ satellites_perpendicular_start: sat, partners_isosceles_start: partners }, null, 1);
if (process.argv.includes('--write')) {
  const f = ROOT + 'data/supplement-initial-conditions.json';
  if (fs.existsSync(f)) { console.error('refusing to overwrite ' + f); process.exit(2); }
  fs.writeFileSync(f, text);
  console.log('written data/supplement-initial-conditions.json');
} else console.log(text);

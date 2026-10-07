// turns data/hunt-results.jsonl into a clean list: distinct orbits, repeats removed, atlas matches marked
// node tools/summarize-hunt.mjs data/hunt-results.jsonl data/perp-periodic-3.json
import fs from 'fs';

const [inFile, outFile] = process.argv.slice(2);
const rows = fs.readFileSync(inFile, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const cat = JSON.parse(fs.readFileSync(new URL('../data/threebodyorbits-equalmass-L.json', import.meta.url), 'utf8'))
  .map(([name, T, E, L]) => ({ name, ts: T * Math.abs(E) ** 1.5, ls: Math.abs(L) * Math.abs(E) ** 0.5 }));

const ok = rows.filter((r) => r.ok).map((r) => r.orbit);
console.log(rows.length, 'hunts,', ok.length, 'reached rotation 0');

// 1. same orbit found more than once (same fingerprint)
const same = (a, b) => Math.abs(a.ts - b.ts) < 1e-6 * a.ts && Math.abs(Math.abs(a.ls) - Math.abs(b.ls)) < 1e-5 * Math.max(Math.abs(a.ls), 1e-3);
const distinct = [];
for (const o of ok) if (!distinct.some((d) => same(d, o))) distinct.push(o);

// 2. an orbit run n times: same L*, T* = n * T* of a shorter one. keep only the shortest
const isRepeat = (o) => distinct.some((d) => d !== o && Math.abs(Math.abs(d.ls) - Math.abs(o.ls)) < 1e-5 * Math.max(Math.abs(o.ls), 1e-3) &&
  [2, 3, 4, 5, 6, 7, 8].some((n) => Math.abs(d.ts * n - o.ts) < 1e-6 * o.ts));
const repeats = distinct.filter(isRepeat);
const base = distinct.filter((o) => !isRepeat(o));

// 3. published? (equal mass, L != 0 orbits copied from threebodyorbits.com, allowing n x repeats)
function atlas(o) {
  let best = null;
  for (const k of cat) for (let n = 1; n <= 8; n++) {
    const score = Math.max(Math.abs(k.ls - Math.abs(o.ls)) / Math.max(Math.abs(o.ls), 1e-3), Math.abs(o.ts - k.ts * n) / o.ts);
    if (!best || score < best.score) best = { score, name: k.name, n };
  }
  return best;
}
const published = [], unmatched = [], zeroL = [];
for (const o of base) {
  if (Math.abs(o.ls) < 1e-6) { zeroL.push(o); continue; }
  const a = atlas(o);
  (a.score < 3e-4 ? published : unmatched).push({ ...o, atlas: a });
}
console.log(`distinct ${distinct.length}; n-times repeats of another ${repeats.length}; base orbits ${base.length}`);
console.log(`  L = 0 (belong to the zero-L family, already published): ${zeroL.length}`);
console.log(`  match an atlas orbit: ${published.length}  ->`, published.map((o) => `${o.atlas.name}${o.atlas.n > 1 ? ' x' + o.atlas.n : ''}`).join('; '));
console.log(`  match nothing in the atlas: ${unmatched.length}`);
console.log('  of those, closest approach > 0.1:', unmatched.filter((o) => o.minD > 0.1).length, ' > 0.2:', unmatched.filter((o) => o.minD > 0.2).length);
fs.writeFileSync(outFile, JSON.stringify({ unmatched, published, zeroL, repeats }, null, 1));
console.log('wrote', outFile);

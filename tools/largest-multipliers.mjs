// the largest multiplier of the class C end orbits n = 13 to 56 by the reduction in double precision (tools/reduced-multipliers.mjs) from the 30 digit starts of data/satellite-candidates.json (rounded to double):
// its modulus and its sign (real negative, real positive or complex), compared with the stored double precision value (field multiplier) and, for n <= 20, with the multiple precision tier A values of data/stability-mp/class-c/.
// node tools/largest-multipliers.mjs [--write]     (--write stores data/largest-multipliers-n13-56.json, which must be new)
import fs from 'fs';
import { fileURLToPath } from 'url';
import { reducedMultipliers } from './reduced-multipliers.mjs';
const D = fileURLToPath(new URL('../data/', import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const cands = read('satellite-candidates.json').orbits;
const typeOf = (e) => (Math.abs(e.im) <= 1e-6 * e.mod ? (e.re > 0 ? 'real positive' : 'real negative') : 'complex');
const rows = [];
for (let n = 13; n <= 56; n++) {
  const c = cands.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
  const r = reducedMultipliers(Number(c.u1), Number(c.u2), Number(c.lam), Number(c.t));
  const big = r.eig.map((e) => ({ mod: e.mod, re: e.re, im: e.im })).sort((a, b) => b.mod - a.mod)[0];
  const row = { n, largest: big.mod, type: typeOf(big), stored: c.multiplier, relDiffStored: Math.abs(big.mod - c.multiplier) / c.multiplier };
  if (n <= 20) {
    const mu = read(`stability-mp/class-c/class-c-${n}-A.json`).result['1'].mu.map((m) => ({ mod: 1 + Number(m.mod_minus_1), re: Number(m.re), im: Number(m.im) })), tb = mu.sort((a, b) => b.mod - a.mod)[0];
    row.tierA = tb.mod; row.tierAType = typeOf(tb); row.relDiffTierA = Math.abs(big.mod - tb.mod) / tb.mod;
  }
  rows.push(row);
  console.log(`n = ${String(n).padStart(2)}: largest multiplier ${big.mod.toFixed(6)} (${row.type}); stored double precision ${c.multiplier} (relative difference ${row.relDiffStored.toExponential(2)})` + (row.tierA ? `; tier A ${row.tierA.toFixed(6)} (${row.tierAType}), relative difference ${row.relDiffTierA.toExponential(2)}` : ''));
}
console.log(`real negative for ${rows.filter((r) => r.type === 'real negative').length} of ${rows.length}; largest relative difference to the stored value ${Math.max(...rows.map((r) => r.relDiffStored)).toExponential(2)}; to tier A (n <= 20) ${Math.max(...rows.filter((r) => r.tierA).map((r) => r.relDiffTierA)).toExponential(2)}`);
if (process.argv.includes('--write')) {
  const f = D + 'largest-multipliers-n13-56.json'; if (fs.existsSync(f)) throw new Error('refusing to overwrite ' + f);
  const p9 = (x) => Number(x.toPrecision(10));
  fs.writeFileSync(f, JSON.stringify({ what: 'the largest multiplier of the class C end orbits n = 13 to 56 by reduction in double precision (tools/largest-multipliers.mjs) from the 30 digit starts of satellite-candidates.json: modulus, type, the stored double precision value, the tier A value for n <= 20', rows: rows.map((r) => ({ ...r, largest: p9(r.largest), relDiffStored: Number(r.relDiffStored.toPrecision(3)), relDiffTierA: r.relDiffTierA === undefined ? undefined : Number(r.relDiffTierA.toPrecision(3)) })) }));
  console.log('written data/largest-multipliers-n13-56.json');
}

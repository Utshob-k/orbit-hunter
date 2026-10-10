// the members of the family of Broucke's R orbits where a rotation number nu of the stable stretch is k/n (n up to 12, k/n <= 1/2): the places where the n fold repeat has a
// double multiplier 1 and satellites can leave. the stable stretch of data/r-family-trace.json (both nu of a step have modulus 1) has two nu, the lower and the upper one; each
// crossing of a level k/n is found between two accepted steps and theta, T* and L* are interpolated linearly between them, so they are good to a few 1e-3 (n = 3, 4) down to 1e-4.
// followed = there is a file data/branch-points/<n>-<branch>.json made by tools/branch-point.mjs (only k = 1 can be followed by that tool).
// node tools/nu-map.mjs [--write]        --write stores data/nu-map.json
import fs from 'fs';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const trace = read('r-family-trace.json').curve;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
const followed = (n, branch) => fs.existsSync(new URL(`../data/branch-points/${n}-${branch}.json`, import.meta.url));

const rows = [];
for (let i = 0; i < trace.length - 1; i++) {
  const a = trace[i], b = trace[i + 1];
  if (!stable(a) || !stable(b)) continue;
  const na = a.nus.map((x) => x[0]).sort((x, y) => x - y), nb = b.nus.map((x) => x[0]).sort((x, y) => x - y);
  for (let n = 3; n <= 12; n++) for (let k = 1; 2 * k <= n; k++) {
    if (gcd(k, n) !== 1) continue;
    for (const j of [0, 1]) {
      const da = na[j] - k / n, db = nb[j] - k / n;
      if (da * db >= 0) continue;
      const f = da / (da - db), at = (key) => a[key] + f * (b[key] - a[key]), branch = j ? 'upper' : 'lower';
      rows.push({ k, n, branch, step: i, theta: Math.abs(at('turns')), Tstar: at('Tstar'), Lstar: Math.abs(at('Lstar')), followed: k === 1 && followed(n, branch) });
    }
  }
}
rows.sort((x, y) => x.n - y.n || x.k - y.k || (x.branch < y.branch ? 1 : -1));
console.log(`the stable stretch has ${trace.filter(stable).length} of the ${trace.length} accepted steps; nu = k/n for n up to 12 is crossed ${rows.length} times`);
for (const r of rows) console.log(`nu = ${r.k}/${r.n}  ${r.branch.padEnd(5)}  between steps ${r.step} and ${r.step + 1}  |theta| ${r.theta.toFixed(4)}  T* ${r.Tstar.toFixed(4)}  L* ${r.Lstar.toFixed(4)}  ${r.followed ? 'followed' : (r.k === 1 ? 'not followed' : 'not followed (k > 1)')}`);
const k1 = rows.filter((r) => r.k === 1);
console.log(`k = 1: ${k1.length} crossings, ${k1.filter((r) => r.followed).length} followed; k > 1: ${rows.length - k1.length} crossings, none followed`);
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL('../data/nu-map.json', import.meta.url), JSON.stringify({ what: 'crossings of nu = k/n (n up to 12) on the stable stretch of the family of Broucke\'s R orbits, tools/nu-map.mjs: step = accepted step of data/r-family-trace.json before the crossing, theta, T*, L* interpolated linearly between the two steps, followed = data/branch-points/ has the entry (k = 1 only)', rows }));
  console.log('written to data/nu-map.json');
}

// streams the big Hristov and Hristova file (60digits.txt, 421,562 rows: vx vy T T*) and reports the rows
// whose T* is closest to the given targets
// run: node tools/compare-hristov-big.mjs path/to/60digits.txt 79.246922 79.27361 ...
import fs from 'fs';
import readline from 'readline';

const file = process.argv[2];
const targets = process.argv.slice(3).map(Number);
const best = targets.map(() => []);
let n = 0, tsMax = 0;
const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
for await (const line of rl) {
  const c = line.trim().split(/\s+/);
  if (c.length < 4) continue;
  const row = { vx: Number(c[0]), vy: Number(c[1]), T: Number(c[2]), ts: Number(c[3]) };
  n++;
  tsMax = Math.max(tsMax, row.ts);
  targets.forEach((t, i) => {
    const d = Math.abs(row.ts - t) / t;
    const arr = best[i];
    if (arr.length < 3 || d < arr[arr.length - 1].d) {
      arr.push({ ...row, d });
      arr.sort((a, b) => a.d - b.d);
      if (arr.length > 3) arr.pop();
    }
  });
}
console.log(n, 'rows, largest T* =', tsMax);
targets.forEach((t, i) => {
  console.log(`\ntarget T* = ${t}`);
  for (const r of best[i]) console.log(`  closest: T*=${r.ts.toFixed(9)} rel diff ${r.d.toExponential(2)}  (vx, vy)=(${r.vx.toFixed(9)}, ${r.vy.toFixed(9)}) T=${r.T.toFixed(6)}`);
});

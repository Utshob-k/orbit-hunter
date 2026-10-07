// builds data/liliao.json from the tex source of arXiv 1705.00527 (same parsing as compare-liliao.mjs)
// node tools/make-catalog.mjs path/to/3-body-14.tex
import fs from 'fs';
import { fingerprint } from '../src/newton.js';

const tex = fs.readFileSync(process.argv[2], 'utf8');
const re = /^\s*([IV]+\.?[A-C])\$\^\{i\.c\.\}_\{(\d+)\}\$\s*&\s*([\d.]+)\s*&\s*([\d.]+)\s*&\s*([\d.]+)\s*&/gm;
const seen = new Set();
const rows = [];
let m;
while ((m = re.exec(tex))) {
  const key = m[1] + m[2] + m[3] + m[4];
  if (seen.has(key)) continue;
  seen.add(key);
  const v1 = +m[3], v2 = +m[4], T = +m[5];
  rows.push({ name: m[1] + m[2], v1, v2, T, fp: +fingerprint(v1, v2, T).toFixed(8) });
}
fs.writeFileSync('data/liliao.json', JSON.stringify(rows));
console.log(rows.length, 'rows written');

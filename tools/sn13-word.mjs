// syzygy word of an atlas orbit from its own data file (published start values), to compare with the words of my orbits.
// download https://data.threebodyorbits.com/orbits/suvakovpc_sn_13.bin first, then
//   node tools/sn13-word.mjs path/to/suvakovpc_sn_13.bin
// layout of the file (from js/orbit-data.js of threebodyorbits.com): "TBO2"/"TBO3", u32 version, f64 period at byte 8, f64 masses[3],
// f64 bbox[4], f64 published start values [12] at byte 72 (x1 y1 x2 y2 x3 y3 vx1 vy1 vx2 vy2 vx3 vy3), refined ones at byte 168.
import fs from 'fs';
import { syzygyWord, canonical } from '../src/topology.js';

const file = process.argv[2];
if (!file) { console.error('usage: node tools/sn13-word.mjs orbit.bin'); process.exit(1); }
const buf = fs.readFileSync(file);
const magic = buf.toString('latin1', 0, 4);
if (magic !== 'TBO2' && magic !== 'TBO3') { console.error('not an orbit file'); process.exit(1); }
const T = buf.readDoubleLE(8);
const x0 = Array.from({ length: 12 }, (_, i) => buf.readDoubleLE(72 + 8 * i));
const one = syzygyWord(x0, T), two = syzygyWord(x0, 2 * T);
if (!one || !two) { console.error('integration failed'); process.exit(1); }
console.log(`period ${T}: word of one period ${one.word} = (${one.root})^${one.power}, of two periods (${two.root})^${two.power}`);
const mine = canonical([...'01010212'.repeat(3)].map(Number));
console.log(`my T* = 36.23 orbit: ${mine} = (01010212)^3`);
console.log(`my word is the word of two periods of this orbit: ${two.word === mine}`);

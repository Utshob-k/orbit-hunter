// syzygy words of the published orbits in src/known.js and of perpendicular family orbits
// node tools/syzygy-words.mjs [file.json]    (file: list of {u1,u2,lam,t,ts,ls}, period 2t)
import fs from 'fs';
import { KNOWN } from '../src/known.js';
import { perpInitial } from '../src/perp.js';
import { syzygyWord } from '../src/topology.js';

const file = process.argv[2];
if (!file) {
  for (const o of KNOWN) {
    const x0 = Float64Array.from([-1, 0, 1, 0, 0, 0, o.v1, o.v2, o.v1, o.v2, -2 * o.v1, -2 * o.v2]);
    const w = syzygyWord(x0, o.T);
    console.log(o.name.padEnd(14), w ? `${w.length} syzygies  root ${w.root} ^ ${w.power}` : 'failed');
  }
} else {
  for (const o of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    const w = syzygyWord(perpInitial(o.u1, o.u2, o.lam), 2 * o.t);
    console.log(`T*=${(o.ts ?? NaN).toFixed(4)} L*=${Math.abs(o.ls ?? NaN).toFixed(4)} lam=${o.lam.toFixed(5)}  ` + (w ? `${w.length} syzygies  root ${w.root.length > 40 ? w.root.slice(0, 40) + '…' : w.root} ^ ${w.power}` : 'failed'));
  }
}

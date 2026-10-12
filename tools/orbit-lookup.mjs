// shared by the scripts of the tables, the supplement and the figures (tables.mjs, supplement.mjs, figures.mjs, class-i-partners.mjs):
// the 30 digit orbits of class C and class I by n, and the rows printed by satellite-sequence.mjs
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
export const read = (f) => JSON.parse(fs.readFileSync(ROOT + 'data/' + f, 'utf8'));

// the orbit of class C (perpendicular start, strings with 30 digits) of the satellite with the upper nu = 1/n, n = 5 to 56
export function classCOrbit(n) {
  if (n === 5) return read('refined/T17.847.json');
  if (n === 6) return read('refined/T19.769.json');
  if (n === 8) return read('stability-mp/class-c/class-c-orbit-8s-30.json');     // the shortest orbit of the T* = 47.065 orbit, refined to 30 digits
  return read('satellite-candidates.json').orbits.find((o) => o.n === n && o.label.includes(`nu = 1/${n} (upper branch`));
}
export const classCSource = (n) => (n === 5 || n === 6 ? 'data/refined' : n === 8 ? 'refined here from the stored zero (shortest orbit of data/refined/T47.065.json)' : 'data/satellite-candidates.json');

// the end orbit of class I (isosceles start) of n = 5 to 12: the refined file and the multiple precision multipliers
export const classIRefined = (n) => read(`class-i/refined/n${n}.json`);
export const classIStability = (n) => read(`class-i/stability/n${n}-A.json`);

// the table printed by tools/satellite-sequence.mjs, as rows of cells
export function sequenceRows() {
  const out = execFileSync(process.execPath, [ROOT + 'tools/satellite-sequence.mjs'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  return out.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((c) => /^\d+$/.test(c[0]));
}

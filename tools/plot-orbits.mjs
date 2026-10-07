// draws orbits as svg, one panel each. usage: node tools/plot-orbits.mjs out.svg "label:v1,v2,T" ...
import fs from 'fs';
import { sdInitial, sampleOrbit } from '../src/physics.js';

const out = process.argv[2];
const specs = process.argv.slice(3).map((a) => {
  const [label, nums] = a.split(':');
  const [v1, v2, T] = nums.split(',').map(Number);
  return { label, v1, v2, T };
});
const COLS = ['#000000', '#1f4e9c', '#b22222'];
const P = 360, pad = 24;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${P * specs.length}" height="${P + 30}" font-family="Georgia, serif" font-size="13">\n<rect width="100%" height="100%" fill="#fff"/>\n`;
specs.forEach((s, k) => {
  const path = sampleOrbit(sdInitial(s.v1, s.v2), s.T, 3000);
  let ext = 0;
  for (const v of path) ext = Math.max(ext, Math.abs(v));
  ext *= 1.08;
  const sc = (P / 2 - pad) / ext;
  const ox = k * P + P / 2, oy = P / 2;
  svg += `<rect x="${k * P + 4}" y="4" width="${P - 8}" height="${P - 8}" fill="none" stroke="#888"/>\n`;
  for (let b = 0; b < 3; b++) {
    let d = '';
    for (let f = 0; f < 3000; f++) {
      const x = ox + path[f * 6 + b * 2] * sc, y = oy - path[f * 6 + b * 2 + 1] * sc;
      d += (f ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    svg += `<path d="${d}" fill="none" stroke="${COLS[b]}" stroke-width="0.8" stroke-opacity="0.85"/>\n`;
    svg += `<circle cx="${(ox + path[b * 2] * sc).toFixed(1)}" cy="${(oy - path[b * 2 + 1] * sc).toFixed(1)}" r="3.5" fill="#fff" stroke="${COLS[b]}"/>\n`;
  }
  svg += `<text x="${k * P + P / 2}" y="${P + 18}" text-anchor="middle">${s.label}, T = ${s.T}</text>\n`;
});
svg += '</svg>\n';
fs.writeFileSync(out, svg);
console.log('wrote', out);

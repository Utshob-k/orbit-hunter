// draws perpendicular-family orbits as svg. usage: node tools/plot-perp.mjs out.svg "label:u1,u2,lam,T" ...
// (T is the full period). also checks the first return with a very tight integrator
import fs from 'fs';
import { sampleOrbit, dp45Step, phaseDistance } from '../src/physics.js';
import { perpInitial } from '../src/perp.js';

const out = process.argv[2];
const specs = process.argv.slice(3).map((a) => {
  const [label, nums] = a.split(':');
  const [u1, u2, lam, T] = nums.split(',').map(Number);
  return { label, u1, u2, lam, T };
});
const COLS = ['#000000', '#1f4e9c', '#b22222'];
const P = 360, pad = 24;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${P * specs.length}" height="${P + 30}" font-family="Georgia, serif" font-size="13">\n<rect width="100%" height="100%" fill="#fff"/>\n`;
specs.forEach((s, k) => {
  const s0 = perpInitial(s.u1, s.u2, s.lam);
  // tight check: integrate one period with 1e-15 tolerance, compare with start
  const st = Float64Array.from(s0);
  let t = 0, h = 1e-4;
  while (t < s.T - 1e-15) { const [dt, hn] = dp45Step(st, Math.min(h, s.T - t), 1e-15, 1e-16, 0.002); t += dt; h = hn; }
  console.log(`${s.label}: return distance after one period (tight tol) = ${phaseDistance(st, s0, [0, 1, 2]).toExponential(2)}`);
  const path = sampleOrbit(s0, s.T, 3000);
  let ext = 0;
  for (const v of path) ext = Math.max(ext, Math.abs(v));
  ext *= 1.08;
  const sc = (P / 2 - pad) / ext;
  const ox = k * P + P / 2, oy = P / 2;
  svg += `<rect x="${k * P + 4}" y="4" width="${P - 8}" height="${P - 8}" fill="none" stroke="#888"/>\n`;
  for (let b = 0; b < 3; b++) {
    let d = '';
    for (let f = 0; f < 3000; f++) d += (f ? 'L' : 'M') + (ox + path[f * 6 + b * 2] * sc).toFixed(1) + ' ' + (oy - path[f * 6 + b * 2 + 1] * sc).toFixed(1);
    svg += `<path d="${d}" fill="none" stroke="${COLS[b]}" stroke-width="0.8" stroke-opacity="0.85"/>\n`;
    svg += `<circle cx="${(ox + path[b * 2] * sc).toFixed(1)}" cy="${(oy - path[b * 2 + 1] * sc).toFixed(1)}" r="3.5" fill="#fff" stroke="${COLS[b]}"/>\n`;
  }
  svg += `<text x="${k * P + P / 2}" y="${P + 18}" text-anchor="middle">${s.label}, T = ${s.T}</text>\n`;
});
svg += '</svg>\n';
fs.writeFileSync(out, svg);
console.log('wrote', out);

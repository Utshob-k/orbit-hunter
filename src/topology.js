// the syzygy word of an orbit: every time the three bodies are on a line, write down which one is in the middle.
// read around one period this is a cyclic word in {0,1,2}. relabeling the bodies, starting somewhere else or running
// time backwards gives the same orbit, so the word is brought to a canonical form, and an orbit that is a repeat of a
// shorter one shows up as a word that is a power.
import { dp45Step } from './physics.js';

const area = (s) => (s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0]);

function middle(s) {
  // project the positions on the longest side and take the body between the other two
  let best = 0, dx = 1, dy = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const rx = s[2 * j] - s[2 * i], ry = s[2 * j + 1] - s[2 * i + 1], l = rx * rx + ry * ry;
    if (l > best) { best = l; dx = rx; dy = ry; }
  }
  const p = [0, 1, 2].map((i) => s[2 * i] * dx + s[2 * i + 1] * dy);
  const order = [0, 1, 2].sort((a, b) => p[a] - p[b]);
  return order[1];
}

// raw word over the time T from the state x0, or null if the orbit can't be integrated
export function rawWord(x0, T) {
  const s = Float64Array.from(x0);
  const word = [];
  let t = 0, h = 1e-3, prev = Float64Array.from(s), aPrev = area(s);
  for (let n = 0; t < T - 1e-14; n++) {
    if (n > 4e6) return null;
    const [dt, hn] = dp45Step(s, Math.min(h, T - t), 1e-12, 1e-13, 0.01);
    t += dt; h = hn;
    const a = area(s);
    if (aPrev !== 0 && a * aPrev < 0) {
      const f = aPrev / (aPrev - a);
      const mid = Float64Array.from(prev, (v, i) => v + f * (s[i] - v));
      word.push(middle(mid));
    }
    prev = Float64Array.from(s); aPrev = a;
  }
  return word;
}

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

// smallest string over relabelings, rotations and reversal
export function canonical(word) {
  const n = word.length;
  let best = null;
  for (const seq of [word, [...word].reverse()]) for (const p of PERMS) {
    const w = seq.map((c) => p[c]);
    for (let r = 0; r < n; r++) {
      const str = w.slice(r).concat(w.slice(0, r)).join('');
      if (best === null || str < best) best = str;
    }
  }
  return best;
}

// shortest u with word = u^n
export function primitive(str) {
  const n = str.length;
  for (let d = 1; d <= n; d++) if (n % d === 0 && str.slice(0, d).repeat(n / d) === str) return { root: str.slice(0, d), power: n / d };
  return { root: str, power: 1 };
}

// the orbits here start on a line (a syzygy right at t = 0), so the window is moved a little to keep that one from
// being counted twice or not at all
export function syzygyWord(x0, T) {
  const s = Float64Array.from(x0);
  const shift = 0.00123 * T;
  let t = 0, h = 1e-3;
  while (t < shift - 1e-14) { const [dt, hn] = dp45Step(s, Math.min(h, shift - t), 1e-12, 1e-13, 0.01); if (dt === 0) return null; t += dt; h = hn; }
  const raw = rawWord(s, T);
  if (!raw || raw.length === 0) return null;
  const c = canonical(raw);
  return { length: raw.length, word: c, ...primitive(c) };
}

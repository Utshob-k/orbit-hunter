// do the binaries of a three-body orbit revolve in the same direction? along one relative period of an orbit of the perpendicular start the closest pair of bodies is taken as the inner binary and the third
// body as the outer one; the angular momentum of the inner binary (about its centre of mass) and of the outer orbit (the centre of mass of the pair about the third body) have the same sign (the binaries
// revolve in the same direction: "direct" in the sense of the paper of Jankovic, Dmitrasinovic and Suvakov 2020) or opposite signs ("retrograde"). the result is the share of the time at the same sign,
// 1 for an orbit that co-rotates all the time, 0 for one that counter-rotates all the time. the positions are those of sampleOrbit (single precision), the velocities central differences.
import { perpInitial } from './perp.js';
import { sampleOrbit } from './physics.js';
export function shareSame(u1, u2, lam, t, frames = 6000) {
  const fr = sampleOrbit(perpInitial(u1, u2, lam), 2 * t, frames), nf = fr.length / 6;
  if (nf < frames) return { share: NaN, frames: nf, gaveUp: true };
  const dt = (2 * t) / (frames - 1), P = (q) => [[fr[q * 6], fr[q * 6 + 1]], [fr[q * 6 + 2], fr[q * 6 + 3]], [fr[q * 6 + 4], fr[q * 6 + 5]]];
  let same = 0, n = 0;
  for (let f = 1; f < nf - 1; f++) {
    const p = P(f), a = P(f - 1), b = P(f + 1), v = p.map((_, i) => [(b[i][0] - a[i][0]) / (2 * dt), (b[i][1] - a[i][1]) / (2 * dt)]);
    let best = null;
    for (const [i, j, k] of [[0, 1, 2], [0, 2, 1], [1, 2, 0]]) { const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); if (!best || d < best.d) best = { d, i, j, k }; }
    const { i, j, k } = best, lin = 0.5 * ((p[j][0] - p[i][0]) * (v[j][1] - v[i][1]) - (p[j][1] - p[i][1]) * (v[j][0] - v[i][0]));
    const cx = (p[i][0] + p[j][0]) / 2 - p[k][0], cy = (p[i][1] + p[j][1]) / 2 - p[k][1], cvx = (v[i][0] + v[j][0]) / 2 - v[k][0], cvy = (v[i][1] + v[j][1]) / 2 - v[k][1];
    n++; if (lin * (2 / 3) * (cx * cvy - cy * cvx) > 0) same++;
  }
  return { share: same / n, frames: nf, gaveUp: false };
}

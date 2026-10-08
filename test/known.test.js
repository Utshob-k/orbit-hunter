// try to close every orbit in known.js
import { KNOWN } from '../src/known.js';
import { closeOrbit, fingerprint } from '../src/newton.js';
import { bestReturn, sdInitial } from '../src/physics.js';

let ok = 0;
for (const k of KNOWN) {
  // catalogue T might be for a relabeled return, so try all 3
  let best = null;
  for (const perm of [0, 1, 2]) {
    const Tguess = perm === 0 ? k.T : k.T / 3;
    // a generous time budget: the default of 3 s cuts newton off early on a busy machine and the result then depends on the load
    const r = closeOrbit(k.v1, k.v2, Tguess, perm, { maxMs: 120000 });
    if (!best || r.res < best.res) best = r;
    if (best.res < 1e-9) break;
  }
  // if it wandered off to another orbit (usually the figure-8) that doesn't count
  const drift = Math.hypot(best.v1 - k.v1, best.v2 - k.v2);
  const good = best.res < 1e-9 && drift < 0.01;
  if (good) ok++;
  const T = best.perm === 0 ? best.T : best.T * 3;
  console.log(
    `${good ? 'closed ' : best.res < 1e-9 ? 'DRIFTED' : 'FAILED '} ${k.name.padEnd(14)} v=(${best.v1.toFixed(9)}, ${best.v2.toFixed(9)}) ` +
      `T=${T.toFixed(6)} (catalogue ${k.T}) res=${best.res.toExponential(1)} fp=${fingerprint(best.v1, best.v2, T).toFixed(5)}`
  );
}
console.log(`${ok}/${KNOWN.length} closed`);
process.exit(ok === KNOWN.length ? 0 : 1);

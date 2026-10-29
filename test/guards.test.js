// SPDX-License-Identifier: MIT
// the guards of the ias route, on constructed states and samples, with the rules as the code has them.
// (1) analyse() of src/ias/guards.py, which gets the sampled pair distances (t, d01, d02, d12) of a piece; its header lines 5 to 7: a piece is an encounter piece if its smallest sampled pair distance is below
//     1e-3. G1a trips if d2 < 0.02 at any sample with d1 < 1e-3; G1b trips if d2 < ratio * d1 at the pericentre (ratio 390 by default; d1 the smaller, d2 the second pair distance); G2 trips if the second smallest
//     of the three per-pair minima is below 0.02. Each rule is tested just below and just above its limit (the samples are symmetric around the pericentre, so the parabolic refinement leaves d1 as it is).
//     G1a implies G2 (the pair that gives d2 < 0.02 at a close sample has a minimum below 0.02), so a G1a case has G2 tripped as well; a G2 case without G1a has the dip at a sample with d1 of 1e-3 or more.
// (2) the bridge (src/ias/bridge.js, iasPieces) on states made here, three equal masses at rest and a tau of 1e-7 (the pair moves by 0.5 % of its distance): G3 trips for a piece whose start has a pair distance
//     below 1e-4 (START_BELOW) and not for 1.1e-4; G1a and G1b trip for a third body at 0.015 and at 0.03 from a pair at 1e-4 and not for 0.06; G2 trips for two encounter pieces of different pairs in one call.
// Not constructed: the stop of the trace right after a guard trip that follows a Newton residual below 1e-10 (it needs the recorder of a running trace), and G2 alone through the bridge (a dip of the
// second pair distance below 0.02 at a sample that is not an encounter sample needs a flow, not a state). needs python with rebound, takes a few seconds.
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
process.env.PYTHONDONTWRITEBYTECODE = '1';
const { settings } = await import('../src/settings.js');
const { iasPieces, GuardError } = await import('../src/ias/bridge.js');

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t0 = Date.now();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url))), iasDir = path.join(root, 'src', 'ias').split(String.fromCharCode(92)).join('/');

// (1) analyse(): samples around the pericentre at t = 0.5 (the closest pair 0-1 at d1, the third body at d2 from both), with optional extra samples
const peri = (d1, d2, extra = []) => [[0, 1, 1, 1], [0.49, 2e-3, d2, d2], [0.5, d1, d2, d2], [0.51, 2e-3, d2, d2], ...extra, [1, 1, 1, 1]].sort((a, b) => a[0] - b[0]);
const cases = [
  ['no trip: d1 = 1e-5, d2 = 1', peri(1e-5, 1), { flagged: true, g1a: false, g1b: false, g2: false }],
  ['not an encounter piece (smallest distance 1.1e-3)', peri(1.1e-3, 1), { flagged: false }],
  ['G1a: a close sample (d1 9e-4) with d2 = 0.0199', peri(1e-5, 1, [[0.3, 9e-4, 0.0199, 0.0199]]), { flagged: true, g1a: true, g1b: false, g2: true }],
  ['no G1a: the close sample has d2 = 0.0201', peri(1e-5, 1, [[0.3, 9e-4, 0.0201, 0.0201]]), { flagged: true, g1a: false, g1b: false, g2: false }],
  ['no G1a: d2 = 0.0199 at a sample with d1 = 1.1e-3 (not close), which is G2', peri(1e-5, 1, [[0.3, 1.1e-3, 0.0199, 0.0199]]), { flagged: true, g1a: false, g1b: false, g2: true }],
  ['G1b: d1 = 1e-4, d2 = 0.0389 (limit 390 d1 = 0.039)', peri(1e-4, 0.0389), { flagged: true, g1a: false, g1b: true, g2: false }],
  ['no G1b: d1 = 1e-4, d2 = 0.0391', peri(1e-4, 0.0391), { flagged: true, g1a: false, g1b: false, g2: false }],
  ['G2: the second smallest per-pair minimum is 0.0199 (a dip of the pair 0-2 at a sample with d1 = 0.0199)', peri(1e-5, 1, [[0.8, 0.5, 0.0199, 0.5]]), { flagged: true, g1a: false, g1b: false, g2: true }],
  ['no G2: the second smallest per-pair minimum is 0.0201', peri(1e-5, 1, [[0.8, 0.5, 0.0201, 0.5]]), { flagged: true, g1a: false, g1b: false, g2: false }],
];
const code = `import sys, json
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(iasDir)})
import guards
out = []
for samples, ratio in json.load(sys.stdin):
    a = guards.analyse([tuple(s) for s in samples], ratio)
    out.append([bool(a['flagged']), bool(a.get('g1a_trip', False)), bool(a.get('g1b_trip', False)), bool(a.get('g2_trip', False))])
print(json.dumps(out))`;
const r = spawnSync(settings.ias.python, ['-c', code], { input: JSON.stringify(cases.map((c) => [c[1], 390])), encoding: 'utf8' });
if (r.status !== 0) { check('guards.py runs', false, String(r.stderr).slice(0, 300)); process.exit(1); }
const got = JSON.parse(r.stdout);
cases.forEach((c, i) => {
  const [flagged, g1a, g1b, g2] = got[i], e = c[2];
  const ok = flagged === e.flagged && (!e.flagged || (g1a === e.g1a && g1b === e.g1b && g2 === e.g2));
  check(c[0], ok, `flagged ${flagged} G1a ${g1a} G1b ${g1b} G2 ${g2}`);
});
// the ratio is a parameter: d1 = 1e-4, d2 = 0.0391 trips for the ratio 400 and not for 390
const r2 = spawnSync(settings.ias.python, ['-c', code], { input: JSON.stringify([[peri(1e-4, 0.0391), 400], [peri(1e-4, 0.0391), 390]]), encoding: 'utf8' });
const g2 = JSON.parse(r2.stdout);
check('G1b with the ratio 400: d2 = 0.0391 trips, with 390 it does not', g2[0][2] === true && g2[1][2] === false);

// (2) the bridge
const pairState = (s, h, pair = [0, 1]) => {   // three bodies at rest: the pair [i, j] at the distance s on the x axis, the third body at the height h above the middle of the pair
  const x = new Float64Array(12), third = [0, 1, 2].find((k) => !pair.includes(k));
  x[2 * pair[0]] = -s / 2; x[2 * pair[1]] = s / 2; x[2 * third] = 0; x[2 * third + 1] = h;
  return x;
};
const tau = 1e-7;
const attempt = (starts) => { try { iasPieces(starts, tau); return null; } catch (e) { return e instanceof GuardError ? e.kind : 'other: ' + e.message; } };
check('G3: a piece start with a pair distance 0.9e-4 trips', attempt([pairState(0.9e-4, 1)]) === 'G3');
check('G3: a piece start with a pair distance 1.1e-4 does not', attempt([pairState(1.1e-4, 1)]) === null);
check('G1a: pair at 1e-4, third body at 0.015 trips G1a', attempt([pairState(1e-4, 0.015)]) === 'G1a');
check('G1b: pair at 1e-4, third body at 0.03 trips G1b (not G1a)', attempt([pairState(1e-4, 0.03)]) === 'G1b');
check('no guard: pair at 1e-4, third body at 0.06', attempt([pairState(1e-4, 0.06)]) === null);
check('G2: two encounter pieces of different pairs in one call trip', attempt([pairState(5e-4, 1, [0, 1]), pairState(5e-4, 1, [1, 2])]) === 'G2');
check('no G2: two encounter pieces of the same pair do not', attempt([pairState(5e-4, 1, [0, 1]), pairState(6e-4, 1, [0, 1])]) === null);
console.log(`time ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);

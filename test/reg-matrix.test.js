// SPDX-License-Identifier: MIT
// the 12 x 12 matrix of src/ias/reg.js (flowEnc with jac: true, the derivative of the end state of a piece with respect to its start state) on the six encounter pieces of the stored points
// t35 - steps 1 and 10 and t44 - step 34 (data/deep/extra/reg-matrix-pieces.json, closest approach of the pair from 4e-4 down to 7e-10), two ways: (1) central differences of the end states of
// flowEnc with the step h = 1e-6 and 2h, combined by Richardson extrapolation; PASS if the largest |M - M_fd| is at most 1e-8 max|M|. (2) the matrix has to be symplectic (masses 1, so the velocities
// are the momenta): the largest |M^T Omega M - Omega| with Omega = [[0, I], [-I, 0]] (positions first, then velocities) is at most 1e-10 max|M|^2. Stored values on the machine of the run: the
// difference at most 1.1e-9 max|M|, the defect at most 2.3e-12 max|M|^2.
// The same two checks on states that are made here: (3) a tight pair with the periapsis distance q = 1e-4 and 1e-5 and the semi-major axis R / 8, 0.3 radians before the pericentre, with the third body at the distance
// R = 2e-3 and 1e-2 from the pair (at rest, and with a velocity across the line), three periods of the pair; (4) three-body states from a seeded generator (random positions and velocities in a square of side 2,
// interval 0.5) in which the chain is re-formed one to three times during the flow: the first four of the seed list that do so. For (3) and (4) the difference is the smallest of the results of several steps
// h (1e-6 and 1e-5 for (4); 1e-8 to 1e-11 for (3), where the pair is small and the matrix large, up to 1.5e9: the larger the entries, the smaller the step that stays in the linear range, and the
// noise of the differences is then still small against max|M|). No Python needed, takes under a minute.
import fs from 'fs';
import { flowEnc } from '../src/ias/reg.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t00 = Date.now();
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const data = JSON.parse(fs.readFileSync(new URL('../data/deep/extra/reg-matrix-pieces.json', import.meta.url), 'utf8'));
const omega = (a, b) => (a < 6 && b === a + 6 ? 1 : a >= 6 && b === a - 6 ? -1 : 0);
const endAt = (x, tau) => { const r = flowEnc(x, tau, { jac: false, settings }); if (!r.ok) throw new Error('reg.js did not finish: ' + r.reason); return r.end; };

// the largest difference of M to the Richardson-extrapolated central differences of the end state with the step h
function fdDiff(M, start, tau, h) {
  let diff = 0;
  for (let q = 0; q < 12; q++) {
    const at = (d) => { const x = start.slice(); x[q] += d; return endAt(x, tau); };
    const ep = at(h), em = at(-h), ep2 = at(2 * h), em2 = at(-2 * h);
    for (let k = 0; k < 12; k++) {
      const d1 = (ep[k] - em[k]) / (2 * h), d2 = (ep2[k] - em2[k]) / (4 * h);
      diff = Math.max(diff, Math.abs(M[k * 12 + q] - (4 * d1 - d2) / 3));
    }
  }
  return diff;
}
function symplecticDefect(M) {
  let defect = 0;
  for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
    let v = 0;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { const o = omega(i, j); if (o !== 0) v += M[i * 12 + a] * o * M[j * 12 + b]; }
    defect = Math.max(defect, Math.abs(v - omega(a, b)));
  }
  return defect;
}
function oneCase(id, start, tau, steps, note = '') {
  const r = flowEnc(start, tau, { jac: true, settings });
  if (!r.ok) { check(`${id}: the flow finishes`, false, r.reason); return null; }
  const M = r.M; let maxM = 0; for (const v of M) maxM = Math.max(maxM, Math.abs(v));
  const diff = Math.min(...steps.map((h) => fdDiff(M, start, tau, h))), defect = symplecticDefect(M);
  check(`${id}: matrix equals central differences with Richardson (${steps.length === 1 ? 'h = 1e-6' : 'best of h = ' + steps.join(', ')})`, diff <= 1e-8 * maxM, `${note}closest approach ${r.minD1.toExponential(2)} max|M|=${maxM.toExponential(2)} difference/max|M|=${(diff / maxM).toExponential(2)}`);
  check(`${id}: matrix is symplectic`, defect <= 1e-10 * maxM * maxM, `defect/max|M|^2=${(defect / (maxM * maxM)).toExponential(2)}`);
  return r;
}

// (1), (2): the stored pieces
for (const p of data.pieces) oneCase(p.id, p.start, p.tau, [1e-6]);

// (3): a tight pair with the periapsis distance q and the semi-major axis a = R / 8 (mu = 2), at the eccentric anomaly -0.3 (0.3 radians before the pericentre), the centre at the origin, and the third body
// of mass 1 at (R, 0), at rest or with the velocity (0, 0.5); the interval is three periods of the pair
function pairState(q, a, u, R, vy) {
  const e = 1 - q / a, r = a * (1 - e * Math.cos(u)), k = Math.sqrt(2 * a) / r, s = Math.sqrt(1 - e * e);
  const rel = [a * (Math.cos(u) - e), a * s * Math.sin(u)], vrel = [-k * Math.sin(u), k * s * Math.cos(u)];
  return [-rel[0] / 2, -rel[1] / 2, rel[0] / 2, rel[1] / 2, R, 0, -vrel[0] / 2, -vrel[1] / 2, vrel[0] / 2, vrel[1] / 2, 0, vy];
}
for (const q of [1e-4, 1e-5]) for (const R of [2e-3, 1e-2]) for (const vy of [0, 0.5]) {
  const a = R / 8, tau = 3 * 2 * Math.PI * Math.sqrt(a * a * a / 2);
  oneCase(`pair q=${q} third body R=${R} v=${vy}`, pairState(q, a, -0.3, R, vy), tau, [1e-8, 1e-9, 1e-10, 1e-11]);
}

// (4): three-body states from a seeded generator in which the chain is re-formed one to three times
let seed = 20261026, used = 0, tried = 0;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
while (used < 4 && tried < 400) {
  tried++;
  const st = []; for (let i = 0; i < 12; i++) st.push(2 * rnd() - 1);
  if (Math.min(...[[0, 1], [0, 2], [1, 2]].map(([i, j]) => Math.hypot(st[2 * j] - st[2 * i], st[2 * j + 1] - st[2 * i + 1]))) < 0.05) continue;
  const r = flowEnc(st, 0.5, { jac: false, settings });
  if (!r.ok || r.reforms < 1 || r.reforms > 3) continue;
  used++;
  oneCase(`three bodies, seed state ${tried}, ${r.reforms} chain re-formations`, st, 0.5, [1e-6, 1e-5], `${r.reforms} re-formations, `);
}
check('four states with chain re-formations found', used === 4, `found ${used} in ${tried} seed states`);
// (5): the branch in which the last macro-step lands exactly on tau (no end-time search). The matrix has to be the derivative at fixed physical time there too (the end-time correction dZ - Z' dt / t').
// A state and the first step size ds0f of the settings are fixed. For tau of 0.1 or more the macro-steps do not depend on tau until the last one, so the first accepted macro-step has a fixed duration dt1; the
// largest tau for which the flow still ends in that step (found by bisection on tau) is dt1, and there the step lands on tau exactly. The branch is taken when the flow reports no end-time trial (endTrials = 0).
// If a ds0f does not give an exact landing for a state, the next ds0f is tried.
function exactLanding(start, ds0f) {
  const run = (tau) => flowEnc(start, tau, { jac: true, settings: { ...settings, ds0f } });
  const a = run(0.1), b = run(5);
  if (!a.ok || !b.ok || !(a.endTrials > 0) || !(b.macro > a.macro)) return null;
  let lo = 0.1, hi = 5;
  for (let k = 0; k < 200; k++) { const mid = 0.5 * (lo + hi); if (mid === lo || mid === hi) break; if (run(mid).macro === a.macro) lo = mid; else hi = mid; }
  const r = run(lo);
  return r.ok && r.endTrials === 0 ? { r, tau: lo, ds0f } : null;
}
const exactStates = [[-2, 0, 2, 0.1, 0, 3, 0.05, 0.1, -0.05, 0.1, 0, -0.2], [-1.5, 0.2, 1.8, -0.3, 0.2, 2.5, 0.1, -0.1, 0, 0.15, -0.1, -0.05]];
let forced = 0;
exactStates.forEach((st, n) => {
  for (const ds0f of [5, 30, 1, 3, 10]) {
    const f = exactLanding(st, ds0f); if (!f) continue;
    forced++;
    let maxM = 0; for (const v of f.r.M) maxM = Math.max(maxM, Math.abs(v));
    const diff = fdDiff(f.r.M, st, f.tau, 1e-6);
    check(`exact landing, state ${n + 1}: no end-time trial, fRes = 0`, f.r.endTrials === 0 && f.r.fRes === 0, `ds0f=${f.ds0f} tau=${f.tau}`);
    check(`exact landing, state ${n + 1}: matrix equals central differences at fixed time`, diff <= 1e-8 * maxM, `max|M|=${maxM.toExponential(2)} difference/max|M|=${(diff / maxM).toExponential(2)}`);
    break;
  }
});
check('the exact landing was forced for both states', forced === exactStates.length, `${forced} of ${exactStates.length}`);

console.log(`time ${((Date.now() - t00) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);

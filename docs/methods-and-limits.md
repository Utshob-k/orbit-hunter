# Methods and limits

This file holds a part of the former README, moved here on 2026-10-10 without changing it (only headings were added). Paths such as `tools/...` and `data/...` are from the top folder of the repository. "Corrections" in the text means the log in [CHANGELOG.md](../CHANGELOG.md); the other sections of the former README are in this folder (see [README.md](../README.md)).

## How it works

1. **Screening (`src/gpu.js`).** One GPU thread per starting condition integrates the orbit in float32 and records how
   close it ever gets back to its start. Float32 only picks candidates, it never decides anything.
   512x512 orbits take about half a second.
2. **Closing (`src/newton.js`).** Levenberg-Marquardt on (v1, v2, period) in float64, with the Dormand-Prince integrator in
   `src/physics.js`. The fingerprint T|E|^1.5 tells orbits apart and spots an orbit run several times.
3. **The zero-L family.** Bodies 1 and 2 start at (-1,0) and (1,0), body 3 at the origin, velocities (v1,v2) for
   bodies 1 and 2 and minus twice that for body 3. Candidates come from a 2D scan of (v1, v2).
4. **The perpendicular family (`src/perp.js`).** Bodies on the x axis at -1, lam, 1, all velocities along y. If the system is ever
   collinear again with every velocity perpendicular to the line, the orbit is mirror symmetric, so it repeats after
   twice that time rotated by an angle theta. That gives L != 0. To get a periodic orbit, slide lam until theta = 0.
5. **Multiple shooting (`src/shooting.js`).** The half orbit is cut into pieces so a small error can't blow up over the
   whole orbit, and a tangent predictor follows how the solution moves with lam. The old hunts failed on tight, many-winding
   satellites (k = 15 to 48) mostly because the predictor was bad, not because the orbits are long (their full period is only
   about 10 time units).
   **Arclength continuation (`huntArclength`).** lam and the shooting unknowns are followed together as one curve (the next point
   has to lie on the plane perpendicular to the tangent), so turning points are no problem, and a step is refused when theta
   jumps by more than a few hundredths of a radian or the tangent turns too much, so no zero is skipped and the branch can't be
   left by accident. When theta changes sign the zero is found by regula falsi along the curve.
6. **Stability (`src/stability.js`).** The orbit is integrated together with its variational equations over one period, the
   monodromy matrix is restricted to the 8 dimensional part with zero center of mass and momentum, and its eigenvalues
   (own complex QR solver, no libraries) say stable or not. Four of the eight eigenvalues are 1 in theory and scatter
   a little numerically, so the four closest to 1 count as trivial.

Checks: `test/figure8.test.js` (figure-8 and energy drift), `test/known.test.js` (11 published orbits),
`test/stability.test.js` (known eigenvalues, figure-8 stable, M^T J M = J, butterfly I unstable),
`test/topology.test.js` (figure-8 and k = 3 satellite words), `test/covers.test.js` (repeats), `test/relative.test.js` (rotating orbit: trivial
eigenvalues, agreement with finite differences) and `test/closure.test.js` (the closure tiers) and `test/shooting.test.js` (multiple shooting gives
the same orbit as single shooting; the tangent equals a finite
difference). Against the atlas my stability numbers match to four digits for the three re-found orbits
(|lambda|max 1.409, 19.55, 9.860).

## What is not proven

- "Not in the atlas" is not "new". The atlas has 415 equal-mass orbits with L != 0 (344 of them Simo's), and Jankovic et al. report about 100
  satellites.
  Their list is only in the paper's tables, and the paper does not cover everything. Butterfly II, a published orbit, is
  also missing from the Li-Liao table.
- Following the high-k satellites (about 56 of the 98) to a zero of theta took more than the 5 minutes
  per direction I gave each start, so for those I do not know if they reach a periodic orbit. A few others lost the family
  near a close approach (lam near 0.25 to 0.5 or near 1), which may be where the branch really ends.
- **Refinement to 30 digits (`tools/refine-mp.py`, `tools/check-refined.mjs`, `data/refined/`).** Newton's method with a multiple precision integrator
  (Gragg-Bulirsch-Stoer, target accuracy 30 digits, working precision 40 digits) on the
  four symmetry conditions (back on the x axis with all velocities along y at the half period), started from the double precision orbit. Done for the
  6 stable orbits of the 85, the T* = 29.31 stable orbit of the arclength
  list, all 31 weak orbits of the 85, and (2026-10-09) the other 48 unstable reliable orbits of the 85. An orbit counts as refined when the final
  residual is below 1e-23, the full period closes to better than 1e-20 in the multiple precision integrator, and the refined orbit is
  the same one (T* and L* agree to 1e-6, same syzygy word, same repeat count). **All 86 orbits pass the check as it was written: the closure that the
  refinement measured on its unrounded solution is below 1e-20** (worst final residual 6.3e-25 at T* = 60.66, worst closure of the
  full period 8e-21, largest change of a start value 7e-8). `tools/check-refined.mjs` integrates nothing, it reads that number from the files;
  integrated from the values as stored the closure is 2.7e-19 or better and 16 of the 85 are above 1e-20 (`tools/closure-stored.py`,
  `data/closure-stored.json`; Corrections, 2026-10-10). Of the 85: all 85 are refined (6 stable, 31 weak and 48 unstable reliable orbits); the 86th is
  the T* = 29.31 one, which is not among the 85.
  The 48 were added on 2026-10-09 with the thresholds above fixed before the run (the code of `tools/check-refined.mjs` was not changed): no failure,
  no timeout (limit 2 hours each, all 48 were done in about 16 minutes with 10 at a time, the longest one took 4 minutes), worst final residual
  8.6e-30, worst closure of the full period 9.7e-22,
  largest change of a start value 1.4e-8, T* and L* equal to the table to 4e-10 or better, the same word and repeat count for all 48.
  The threshold for the final residual was first 1e-25 in the checker; T* = 60.66 ended at 6.3e-25 and was flagged, and I raised the threshold to
  1e-23 after seeing that (the refinement itself stops at 1e-24),
  so that threshold was changed after the result (for the 31 and the 6 and the T* = 29.31 orbit; not for the 48). Values:
  `data/stable-orbits-30digits.json` (the stable ones), `data/refined/*.json`, `data/refined/weak/*.json` and `data/refined/reliable/*.json`, summary
  in `data/refined/summary.json`.
- **How well the orbits close.** The 7 stable orbits close to 5e-10 or better with two independent integrators (Dormand-Prince 5(4) and
  Gragg-Bulirsch-Stoer, `tools/check-closure-bs.mjs`). The unstable ones are much weaker. With Dormand-Prince 23 of the 85 close worse than 1e-9,
  6 worse than 1e-8 and the worst is 7.7e-8 (max norm, rotation removed); with Bulirsch-Stoer 11 are worse than 1e-7 and the worst is 3.5e-6 (columns
  `closureDP45` and `closureBS`
  in `data/orbit-table.csv`). For a strongly unstable orbit the instability multiplies the rounding error, so double precision cannot show that it
  is periodic; those orbits need high precision arithmetic before anyone should call them that (all 85 are refined, see above).
- **A third integrator (REBOUND).** The closure and the stability were also checked with REBOUND 5.2.2 (IAS15, default settings;
  `tools/rebound-check.py`, numbers in `data/rebound-check.json`), which uses nothing from `src/`. The rule was fixed before the run: the 54 reliable
  orbits must close to 1e-8 or better. 48 of the 54 do from the start values of `data/orbit-table.csv`; 6 do not: t20 (2.3e-7), t36 (1.1e-8), t40
  (2.2e-7), t43 (1.0e-8), t47 (1.7e-8) and t57 (9.2e-8), counting the rows of the csv from 0. A diagnostic run after the failures were seen shows that
  the cause is the 12 digits of the csv, not IAS15 (a smaller epsilon changes nothing): with the 30 digit refined values all six close to 7e-11 or
  better. With the double precision values of `data/orbit-table.json` t40, t47 and t57 are still above 1e-8 (6.6e-8, 1.2e-8 and 2.0e-8; their largest
  multipliers are between 2e4 and 2e5). So for these three orbits Dormand-Prince and Bulirsch-Stoer in double precision gave closures that are too
  small: a 40 digit integrator agrees with REBOUND on them and not with the two (Corrections, 2026-10-09, `data/closure-mp.json`). With a third
  integrator from the 12 digit csv values 48 of the 54 close to 1e-8. The 31 weak orbits close to at most 8.1e-6 in REBOUND and the 17 orbits of the
  arclength list to at most 4.9e-9. All 7 stable orbits are stable in REBOUND as well (monodromy matrix from the variational equations, 12 x 12; the
  largest nontrivial modulus is at most 1 + 1e-12 there and at most 1 + 2.5e-10 in my computation), and for the six orbits that failed above the
  largest multipliers agree with mine to 5 digits. The rule for the trivial multipliers was changed after the run showed the BHH orbit t00: the first
  rule (not within 1e-3 of 1) took its trivial pair, which splits by 2e-3 in double precision, for a nontrivial one; the 8 multipliers closest to 1
  are now taken as the trivial ones.
- A first version of this table said the satellites connect to my stable orbits. That came from a method that jumped
  branches, see above.
- I used to think many of my orbits were probably more BHH family members. The syzygy words say that only 18 of the 85 are.

## Dead ends and bugs (so I don't repeat them)

- First try at L != 0: a knob `ell` in the zero-L family. Found nothing, and a "rotated return" solver didn't help; exact
  closure in that family relies on a symmetry that only exists at L = 0.
- The solver can "converge" to T -> 0 (state(0) = state(0) trivially). Fixed by keeping T near the guess.
- Near-collision orbits made the integrator loop forever. Fixed with step caps and early exits.
- Fingerprints have to be matched tightly: butterfly I and II differ by only 6e-5.
- My first stability cutoff called a stable orbit unstable because of the scatter in the trivial eigenvalues.
- Early hunts used a success cutoff of 1e-9 on the rotation, tighter than long orbits can reach.
- A first reading of the paper's table took its L for the scale free one; it is the angular momentum at size b = 1.

## Known weaknesses

Found in an independent review of the code and in my own checks; what is fixed and what is not:

- **Closure rule (fixed, with consequences).** One rule now decides every list (`src/closure.js`, `tools/closure-tiers.mjs`): an orbit is *reliable*
  when it closes to 1e-8 or better
  (largest position or velocity difference after one period, best rotation removed) with both integrators, *weak* when it closes to 1e-6 with
  Dormand-Prince only. Of the 85 orbits of the
  perpendicular search **54 are reliable and 31 are weak** (column `closureTier` of `data/orbit-table.csv`); the 6 stable ones are all reliable. The
  column is the double precision tier and is unchanged (the Bulirsch-Stoer closure is not converged at its tolerance for t40, t47 and t57, see
  Corrections, 2026-10-10); in 40 digit arithmetic from the same start values 51 of the 54 close to 1e-8 (Corrections, 2026-10-09). Only reliable
  orbits should be called periodic to 1e-8, and the refined values are the ones to use;
  all 85 were refined to 30 digits (see the refinement above). All 17 orbits of the arclength list are reliable.
- **Closure columns (fixed).** `closureDP45` and `closureBS` are both max norms with the best rotation removed; the columns ending in `raw` leave the
  rotation in.
- **Matching with the CPC list (partly fixed).** Both scripts now cut an arm at the first bad point. For the 126 branch points that have a published
  satellite with the same k to compare with,
  the closest distance in (T*, L*) is 2.5e-7 (N = 9), 7.9e-6 (N = 6), 3.0e-3 (N = 1, but that arm is the 3 fold repeat curve of the parent, not a
  satellite; the entry is marked in `data/bifurcation-points.json`), and then 0.15 or more, with a median of 0.945 (`same_k_closest` in
  `data/bifurcation-points.json`),
  so the tolerance of 5e-3 does not decide any match. The check that an arm is not just the repeat of a shorter branch is
  `tools/arm-repeat-check.mjs`, for the arms with stored states only. Still open: the matching compares curves sampled
  with large gaps (the largest step between samples is 0.34).
- **Branch points (partly fixed).** New runs store how well the branch point was located (`bisected`, `width`, `nullSolved`). Still open: two branch
  points closer than one step cancel in
  the sign test, a symmetric degenerate point gives no sign change, and only mirror symmetric branches can be found. The word along an arm is now
  checked at up to 12 points (30 of the 36
  verified arms still pass). The one arm with a 104 degree turn (T* = 33.75, k = 3, lam = 0.5566) is a fold: lam turns back while T* and L* continue
  smoothly.
- **Stability (partly fixed).** "The four eigenvalues closest to 1 are the trivial ones" is checked in two ways now: the other four must form
  reciprocal pairs, and the fifth closest must be at least
  10 times farther from 1 than the fourth; otherwise the orbit is called uncertain unless max |l| is above 2. This changes no label (85 orbits: 6
  stable, 77 unstable, 2 uncertain; arclength list:
  2 stable, 15 unstable). The finite difference check uses the same reduction and eigenvalue solver, so it confirms the matrix and not the
  stable/unstable decision.
- **Integrators (mostly fixed).** `monodromy` and `sampleOrbit` now stop when a step produces nan or the step size collapses; a few other loops with
  step caps can still run for a long time near collisions.

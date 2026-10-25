# Methods and limits

This file holds a part of the former README, moved here on 2026-10-10 (only headings were added at the time; the text has been corrected and extended since). Paths such as `tools/...` and `data/...` are from the top folder of the repository. "Corrections" in the text means the log in [CHANGELOG.md](../CHANGELOG.md); the other sections of the former README are in this folder (see [README.md](../README.md)).

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

Checks (the 11 files of `test/`, run by `npm test`): `test/figure8.test.js` (figure-8 and energy drift), `test/known.test.js` (11 published orbits),
`test/stability.test.js` (known eigenvalues, figure-8 stable, M^T J M = J, butterfly I unstable),
`test/topology.test.js` (figure-8 and k = 3 satellite words), `test/covers.test.js` (repeats), `test/relative.test.js` (rotating orbit: trivial
eigenvalues, agreement with finite differences), `test/closure.test.js` (the closure tiers), `test/shooting.test.js` (multiple shooting gives
the same orbit as single shooting; the tangent equals a finite difference), `test/corotation.test.js` (the co-rotation share of `src/corotation.js`: 1 for
members of the R family and for the CPC satellites N = 6 and 9, 0 for N = 1), `test/iso.test.js` (the isosceles start of `src/iso.js`: its symmetric
residual, the end orbit of n = 5 of class I, the members of R written in it) and `test/zero.test.js` (the bisection for the zero of the rotation goes
on when the corrector fails at a midpoint). Against the atlas my stability numbers match to four digits for the three re-found orbits
(|lambda|max 1.409, 19.55, 9.860).

## What is not proven

- "Not in the atlas" is not "new". The atlas has 415 equal-mass orbits with L != 0 (344 of them Simo's), and Janković et al. report about 100
  satellites (99 rows in their tables).
  Their list is only in the paper's tables, and the paper does not cover everything. Butterfly II, a published orbit, is
  also missing from the Li-Liao table.
- Following the high-k satellites (about 56 of the 98 rows that re-close) to a zero of theta took more than the 5 minutes
  per direction I gave each start, so for those I do not know if they reach a periodic orbit. A few others lost the family
  near a close approach (lam near 0.25 to 0.5 or near 1), which may be where the branch really ends.
- **Class I for n = 13 to 20 (version 0.2.29).** The end orbits are closed to 30 digits and in REBOUND over one period, and the multipliers are computed in multiple precision in one tier only (tier A: no second precision for an error estimate; linear stability only). Only the upper nu, the apex body 0 and the one non-repeat root of each branch point (the null space is two dimensional) were searched; for n = 15 to 20 one sense of the curve stopped by a collapse of the step and was not investigated (the same happens to the class C curves for n >= 16); that the two senses end at the same orbit was checked only for n = 13 and 14. The REBOUND distance after 20 periods grows to the size of the orbit for n >= 17, because the orbits are unstable; it is not part of the threshold for "established" (one period). "Different from the class C orbit" means another symmetry class and other values and shows nothing about how the two families are related.
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
  branches (the entry "SN.9 and N = 9" of 2026-10-07 in [CHANGELOG.md](../CHANGELOG.md), and the continuation in arclength in [results.md](results.md)).
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
- **A match by T* and L* is not a proof of identity.** Two orbits can agree in T* and L* to 1e-5 or better, with the same number of alignments, and
  still be different orbits. The two zeros of theta on the satellite curve of the member of R with nu = 2/9 (upper nu) are at T* = 33.745150 (L* =
  2.556740) and T* = 33.745149 (L* = 2.556792), 5e-9 apart in T* and 2e-5 in L*; the first is t42 of my table (unstable, largest multiplier 1.0267),
  the second has start values that differ from it (the normalised starts differ by 0.099) and is linearly stable, and both have the word (01)^9 and 18
  alignments. The second may lie near a bifurcation of t42 (not shown). So the pairs of orbits at the same period that the comparison reports as a hit
  or as near are decided by their start values (`tools/satellite-candidates.mjs` does it).
- **Near never means the same orbit.** The comparison with repeats up to 12 uses the primitive T* of an orbit that returns rotated, also for numbers
  of repeats that are not whole turns (for t41, rotation 2/9 of a turn, the 10 fold repeat does not close, but its T* is compared). A pair within 5e-3
  says that the invariants are close and nothing more.
- **A zero of the continuation can be left unconverged (fixed in 0.2.24 for new runs).** Until version 0.2.23 the bisection for the zero of theta in
  `tools/branch-point.mjs` stopped when the corrector failed at a midpoint and kept the last midpoint: 4 of the 32 zeros of n <= 36 (n = 24, 26, 27,
  28) and 15 of the 20 of n = 37 to 56 (n = 42 to 56) were left at a rotation above 1e-9 turns, up to 5e-5, which moves L*
  by up to 1e-3 and T* by up to 4e-4, while the closure of the stored zero is unchanged. Since 0.2.24 the bisection retries at other points of the
  chord (`src/zero.js`, `test/zero.test.js`); the stored files were not regenerated, the tool prints the rotation left at a zero, and the 30 digit
  orbits of `data/satellite-candidates.json` are not affected. A zero taken from `data/branch-points/` should be checked for its rotation (`turns`)
  before its T* and L* are used to more than four digits.

## The ias route (version 0.3.0)

What the route of [deep.md](deep.md) does not cover and what its results do not show. The default route (Dormand-Prince) is unchanged.

- **Which integrator gives which number.** The corrector takes the end states of the pieces from IAS15 (from `reg.js` for the encounter pieces and for the pieces replaced by the cross-check) and makes theta from them. The numbers that a trace records for every point (T*, L*, the closest approach `minDist`, the closure) and the syzygy word and `maxMod` of every fifth point come from `perpInfo` and `relativeStability`, which integrate the whole orbit with the Dormand-Prince code (`src/perp.js` has no ias branch); so do the stop rule `--max-dist` and the stored closest approach (values at the ends of Dormand-Prince steps). The 12 x 12 matrices of the pieces that are neither flagged nor replaced by the cross-check are the variational equations of the Dormand-Prince code (`src/stability.js`). An accepted step is unrecorded when the Dormand-Prince integration of its whole orbit in `perpInfo` exceeds its step limit: its start values are kept (`unrec`) and it is witnessed, and that is why which steps are recorded can differ between machines. `test/henon.test.js` checks the stored Dormand-Prince values of T* and L*.
- **A third body near the close pair is not covered.** The regularised integrator of `src/ias/reg.js` treats one close pair with the third body away from it. When the third body is within 0.02 of the pair, when a second pair is close as well, or when two encounter pieces belong to different pairs, the guards (G1a, G1b with the ratio 390, G2, G3) trip: a trip fails that attempt of the corrector, five failed attempts in a row with a guard trip end the trace, and a trip right after a Newton residual of 1e-10 or less ends it at once (the G2 rule for pieces of different pairs can only act when the pieces of one evaluation are computed together, not in the single-piece flows of the line search); the ratio 390 is 1.5 times the largest of the smallest tested ratios of each pair scale q (257.2 at q = 1e-4), 385.9, rounded up to a multiple of 10, from the 44 rows of `data/deep/extra/gate-a-extension.json` (`reg.js` with a third body at the distance R from the pair, R/q from 50 to 3333, no row fails). It is a margin over the tested ratios and not a bound. Three start orbits of the group trip G2 already (t18 in both senses, a14 +, t19 -; 4 of the 19 traces of `data/deep/traces-table.csv`), so they were not run.
- **A stop is not an end of the family.** "Triple-approach guard", "lost the family", "left the region" and "out of time" say that the code could not go further or was stopped, not that the family has no orbit beyond that point.
- **The path between two points rests on the integrator.** The end states of the pieces, from which a point is made, come from IAS15 and `reg.js`. The witnesses (`tools/witness.py`) check each point alone: its start values close after a full period in multiple precision and have the stated smallest pair distance. They do not show that two consecutive points lie on the same continuous curve. For four stretches (the 25 accepted steps around the smallest minimum of t35 - and 3 steps of each of t44 -, t62 -, t72 -) the points were closed again at the same lam by `tools/reclose.py` and the midpoints between consecutive steps were witnessed; nothing of the kind exists for the other stretches. An accepted step for which T* and L* cannot be computed (`unrec` in the trace) is witnessed but has no place in the curve of T* and L*.
- **Witness acceptance ranges.** The 40 digit flow (preset w1) is accepted for orbits whose smallest pair distance is 1e-7 or more (`data/deep/extra/w1-acceptance.json`: error against the exact Kepler flow 8.7e-21 at the periapsis distance q = 1e-6 and 4.7e-19 at q = 1e-7, limit 1e-17; the command of each row is in the file), the 50 digit flow (w1b) from 1e-10 (`tools/witness-acceptance.py`: error against the exact Kepler flow at most 1e-17 for periapsis distances 1e-7 to 1e-10). A point with a smaller minimum is not witnessed; the midpoint between steps 10 and 11 of t35 - (w1b minimum 6.562e-11) is labelled so. It lies below the smallest witnessed value of the trace, 7.320e-10 at step 10, so the closest approach along the family is lower than that value between two computed points, and the data do not say how much lower. The "strict witnessed depth" of a trace is the smallest witnessed minimum before the first point that is not witnessed, so it is not the smallest distance of the family. "Turns" in the reading means only a rise of a factor 2 over witnessed points on both sides; it is not a turn of the family, it says nothing about what lies between the points, and it does not show that the family ends in a collision orbit. The minimum of a witness is a parabolic estimate through three samples; the 50 and the 60 digit flow differ by a relative 3.7e-5 at step 10 of t35 - (`data/deep/extra/w1c-gap.json`), so depths are given to four digits.
- **A stored point can be off the orbit by more than the corrector tolerance, and the witness closure cannot always show it.** The corrector stops at a residual of 1e-11, and the points of a trace are not shown to be orbits to that accuracy. In a kept point of an earlier trace of t35 - (id k11 of `data/deep/extra/piece-scan.json`) the residual of the corrector was 6.7e-14, but piece 18 (IAS15, not flagged, smallest pair distance 0.0137, the piece right after the encounter piece) was wrong by 1.18e-7, and the multiple precision chain from the same start misses closing by 5.1e-7 at the half period. The witness w1 gives a full-period closure of 4.125e-6 for these start values (`point_11_witness` of the same file), so it rejects that point; the test is a closure below 1e-6, and its power depends on the sensitivity of the orbit: the witnessed points of the four traces close to at most 9.8e-11 (t35 -), 3.2e-9 (t44 -), 4.6e-9 (t62 -) and 7.1e-9 (t72 -), while the stored points that fail it (next bullet) are off the orbit by only 4.2e-14 to 8.8e-11 relative. A witnessed point may therefore be off the orbit by more than the corrector tolerance. The cross-check of `src/ias/bridge.js` covers the unflagged pieces with a smallest pair distance below 0.05 and replaces the IAS15 end state by that of `reg.js` where the two differ by 3e-12 or more; in the scan of 9016 pieces all 18 pieces with an IAS15 error of 1e-12 or more are in that class, and a piece with a larger pair distance is not covered.
- **15 stored points fail the witness closure.** 2 points of t28 - (steps 146 and 160) and 13 of t81 + have a witnessed closure of 1.05e-6 to 3.27e-6 (`data/deep/extra/closure-failed.json`, column `closure_failed` of `data/deep/traces-table.csv`). They cut the strict chains of the two traces (at steps 146 and 93) and stay in the table. Refined at the same lam in multiple precision they move by 4.2e-14 to 8.8e-11 relative, and the refined orbit rounded to double closes only to 1.1e-12 to 3.0e-8, so for these orbits the closure of a double precision start is limited by their sensitivity.
- **Not every point is witnessed.** The witnesses cover the kept points (a recorded point is kept if its lam differs by at least 0.01 s from that of the last kept point; s is stored in each witness file, with the ids added outside the rule) and the unrecorded steps, at most 400 of each kind: 69 of the 1711 accepted steps of t35 -, 124 of 1266 of t44 -, 336 of 375 of t62 -, 325 of 325 of t72 -. `python tools/trace-witnesses.py reading WITNESSES.json --trace TRACE.json` prints how many recorded points were not selected; the long stretches of small steps (1070 recorded points from step 717 of t35 -, 700 from step 588 of t44 -) are not witnessed point by point.
- **The matrices of `reg.js` are not tested by a stored check.** The gate A rows (`tools/gate-a.mjs`, `test/gate-a.test.js`) test the end states of `reg.js` only; they run `flowChain` without the tangent, and nothing in the repository tests the 12 x 12 matrices that `reg.js` returns for the Newton Jacobian.
- **Energy and angular momentum.** A witnessed point has a relative change of the energy and of the angular momentum below 1e-14 over the period in the multiple precision flow; this is a check of the flow, it does not check the start values.
- **One machine.** The stored numbers come from one machine (Windows 11, Node v24.15.0, Python 3.14.6, REBOUND 5.2.2, mpmath 1.4.1). On the same versions the replayed accepted steps are equal bit for bit; on another platform small differences are expected, and which steps are recorded (T* and L* computed) can differ; the replay test compares the accepted steps of the continuation (lam, u1, u2, t) with the stored trace to 1e-9 relative. On Linux (GitHub Actions run 40185378474: Ubuntu 24.04.5, Node v24.15.0, Python 3.14.8) all tests pass and the replayed accepted steps agree with the stored trace to 1.1e-11 relative (31 steps), with the recording different at 4 of them.
- **Scope.** Planar, equal masses, the perpendicular start only. A trace is sequential. Python and REBOUND are needed for this route.

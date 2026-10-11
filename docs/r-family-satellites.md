# Broucke's R family and its satellites

This file holds a part of the former README, moved here on 2026-10-10 without changing it (only headings were added). Paths such as `tools/...` and `data/...` are from the top folder of the repository. "Corrections" in the text means the log in [CHANGELOG.md](../CHANGELOG.md); the other sections of the former README are in this folder (see [README.md](../README.md)).

The paragraphs below are the part of the former "Results" section on the satellites of the family R (the 33.745 orbit on the family, the entry of 2026-10-10 on Davoust and Broucke 1982 and the entry of 2026-10-10 on R2 are in the corrections log). The scripts are `tools/branch-point.mjs`, `nu-map.mjs`, `branch-summary.mjs`, `db82-bifurcations.mjs`, `r-family.mjs`, `satellite-candidates.mjs` and `satellite-check.py`.

**Satellites of Broucke's R family (2026-10-10).** The three stable orbits among the 77, T* = 17.847, 19.769 and 47.065 (the last as its shortest
orbit, T* = 23.533; words (01)^5, (01)^6 and (01)^16), are on satellite branches of the family R of Broucke, the curve through the T* = 33.745 orbit
(Corrections, 2026-10-10). A satellite leaves a family where the rotation number nu of a member is 1/n: the n fold repeat of that member has a double
multiplier 1 there, and a second solution curve crosses the repeat curve. The members with nu = 1/5, 1/6 and 1/8 (to 1e-11) have the rotation 0.20103,
0.16784 and 0.12582 of a turn, T* = 3.5777, 3.3045 and 2.9484, L* = 2.5940, 2.6495 and 2.7531 (`tools/branch-point.mjs`, numbers in
`data/branch-points/5-upper.json` and so on, the nu of the family in `data/r-family-trace.json`). The evidence, for each of the three: (1) The matrix
[J | dF/dlam] of the shooting system of the n fold repeat (87 x 88, so it always has one null vector) has a second null vector at that member: its
smallest singular values are 3.4e-12, 3.4e-12 and 6.9e-13 against 5.5e-3, 3.8e-3 and 2.2e-3 for the next one, and at members next to it the smallest
singular value falls with nu - 1/n (n = 5: 2.2e-3, 7.4e-4 and 8.0e-4 at nu - 1/5 = 6.1e-3, 2.0e-3 and -2.1e-3; n = 6 and 8 in the data file), so it is
a branch point and not an ordinary point of a curve. (2) The quadratic bifurcation equation on the two dimensional null space has two real directions,
55.9, 56.5 and 57.4 degrees apart; one is the tangent of the repeat curve (computed from the exact repeats of the neighbouring members, agreement to 6
digits), the other is the satellite. (3) The satellite, followed from the branch point in both senses (pseudo arclength, the tangent turning by less
than 0.35 rad per step, steps below 6 % of the distance from the branch point so that Newton cannot land on the repeat curve), reaches a rotation
angle 0 after 124 and 136 (n = 5), 177 and 148 (n = 6) and 250 and 177 (n = 8) accepted steps, at T* = 17.84680764, 19.76913153 and 23.53270715 with
L* = 2.57211588, 2.59503494 and 2.62588103: the three stable orbits (in one sense the start values are those of the refined orbit, in the other those
of the same orbit at its other collinear moment). (4) As a control the repeat direction was followed as well; it ends at repeats of orbits of the
family R itself: R5 (T* 17.846582, L* 2.595492) and R9 (25.691626, 2.424562) for n = 5; 6 times R6 (19.768302, 2.651825) and 2 times R3 (27.757041,
2.466962) for n = 6; the member with rotation 1/8 (23.530644, 2.755713) and 2 times R4 (31.775888, 2.535118) for n = 8. Limits: all of it is double
precision (the members next to the branch points are stable, so the matrices are well conditioned, but the zeros are good to about 8 digits, not 30).
Close to a branch point the invariants (T*, L*, theta) of the satellite and of the repeat curve differ by only a few 1e-4, so they cannot tell the two
apart, only the shooting system can.

The family has 41 members on its stable stretch where a rotation number nu is k/n with n up to 12 (`tools/nu-map.mjs`, `data/nu-map.json`; theta, T*
and L* are interpolated between two accepted steps): 20 with k = 1, two for each n from 3 to 12 (one on the lower and one on the upper of the two nu),
and 21 with k > 1. All 20 with k = 1 were followed in the way described above (`tools/branch-point.mjs`, one file for each in `data/branch-points/`;
how every continuation ended: `tools/branch-summary.mjs`, `data/branch-summary.json`), the 21 with k > 1 were followed as well (below). At all 20 the
second smallest singular value of the matrix of the n fold repeat is 3.7e-13 to 2.0e-11 (6.6e-9 for n = 7 on the lower branch), against 9e-4 or more
for the next one, and the bifurcation equation has two real roots, 51 to 58 degrees apart on the upper branch and 77 to 89 on the lower. Of the 40
satellite continuations 17 reach a rotation angle 0: both senses of the upper branch for n = 5 to 12 and one sense of the lower branch for n = 3. The
other 23 were stopped by a limit of the continuation, 15 at the closest approach limit of 0.03, 2 by a collapse of the step and 6 at the step limit of
700 steps (the lower branch for n = 4, 6 and 8, both senses). A stop says nothing about the curve beyond it, so these 23 are undecided and not
results. Of the 40 control continuations (the repeat direction) 38 end at an n fold repeat of an orbit with a rotation p/n of a turn whose primitive
closes as a relative periodic orbit, among them R2 and the T* = 33.745 orbit as the 9 fold repeat of the member with rotation 2/9; 2 were stopped by a
collapse of the step. All of this is double precision: the zeros of theta close to 6e-12 to 4e-10, not to 30 digits, and where a continuation stops
depends on its step rules. Davoust and Broucke 1982 followed the satellites of R (their family D1) for the multiplicities 2 and 3 (branches f, e and
E, Corrections, 2026-10-10) and the atlas lists satellites of the BHH family coded R or A (family bhhsat). For n = 5, 6, 8 and 9 to 12 none of the
sources that could be read has these orbits (the papers named above, the atlas, Broucke 1975, Davoust and Broucke 1982). The review "A review on
periodic orbits of the general planar three-body problem" of Li and Liao (Sci. China Phys. Mech. Astron. 68(8), 289501, 2025, doi
10.1007/s11433-024-2686-6) could not be read (it is not open access and there is no preprint), so "not found" is all that can be said.

The satellite curves of the T* = 17.847 and 19.769 orbits each have a second orbit with rotation angle 0, after the stable one, near a close approach:
T* = 17.7208, L* = 1.6293 (word (01)^5, 10 alignments) and T* = 19.6472, L* = 1.5989 ((01)^6, 12 alignments).
They were refined to 30 digits (closure of the full period 1.2e-21 and 3.6e-21), have no repeat (the return test for n up to 200), are unstable
(largest multiplier 210.11 and 253.24) and have a closest approach of 0.056 and 0.058. REBOUND (IAS15, default settings) closes them to 3.8e-12 and
4.3e-12 from the double values and gives the multipliers 210.1089 and 253.2420 (`tools/satellite-check.py`). They match nothing in the sources checked
so far: no atlas entry within 5e-3 in T* and L* with repeats up to 12 and none of my 102 orbits (`tools/satellite-candidates.mjs`,
`data/satellite-candidates.json`); this says nothing about whether they are known.

The upper branch gives a sequence of periodic orbits: for each n = 5 to 12 both senses end at the same orbit, at T* = 17.84680764, 19.76913153,
21.66265043, 23.53270715, 25.38320311, 27.21708996, 29.03666251 and 30.84374481 (L* = 2.57212 to 2.65930, word (01)^n with 2n alignments). The orbits
for n = 5, 6 and 8 are the three stable orbits above. The orbits for n = 7 and 9 to 12 were refined to 30 digits (closure of the full period 1e-25 to
2e-24 on the stored values, `data/satellite-candidates.json`) and are linearly stable (`tools/satellite-candidates.mjs`); REBOUND (IAS15, default
settings) closes them to 2.6e-14 to 9.5e-14 from the double precision values and the multipliers are on the unit circle to 7e-6
(`tools/satellite-check.py`, `data/satellite-check.json`). The orbit for n = 7 is the atlas entry bhhsat_r7_1_1 (T* agrees to 1e-12 and L* to 1.6e-6,
the digits of the entry); the atlas lists its satellites of the BHH family, this one as R7 1/1, from its own search of September 2026 and cites no
paper. The orbits for n = 9, 10, 11 and 12 match nothing in the sources checked so far: none of my 85 and 17, the 99 satellites of the CPC table, the
9 rows of Davoust and Broucke with a rotation angle of 2 pi, the orbits of Henon 1976, the 18 rows of Li et al. 2025 or the atlas (T* and L* to 1e-5
and to 5e-3, repeats up to 12 either way, the same alignments where the list has them; fixed before the comparison). The review of Li and Liao could
not be read, and this says nothing about whether they are known.

**Satellites with k > 1.** The 21 members with nu = k/n and k > 1 were followed in the same way (`tools/branch-point.mjs` with `--k=K`; the upper nu
crosses the same k/n twice for 3/7, 4/9, 5/11 and 5/12, so the theta is in the name of the file). At all 21 the second smallest singular value is
5.8e-13 to 1.0e-11, against 2.3e-4 to 7.3e-3 for the next one, and the two directions are 67 to 88 degrees apart. Of the 42 satellite continuations 33
reach a rotation angle 0 and 9 were stopped by a limit of the continuation, 5 at the closest approach limit and 4 at the step limit of 700 steps. For
3/7 (theta 0.4302 and 0.3793), 4/9 (0.3872) and 4/11 (0.3409) neither sense reaches a rotation 0: these four are undecided. All 42 control
continuations end at a repeat whose primitive closes. The zeros close worse than for k = 1 (7e-12 to 1.7e-5 in double precision): of the 33, 21 have
the closure tier reliable, 7 weak and 5 failed, and the 12 weak or failed zeros are not established, whatever their T* and L*. For n up to 12 (41
branch points) there are 82 satellite continuations, 50 of them reach a rotation 0 (38 established), 20 stopped at the closest approach limit, 2 by a
collapse of the step and 10 at the step limit; 80 of the 82 control continuations end at a repeat whose primitive closes and 2 were stopped by a
collapse of the step (`tools/branch-summary.mjs`, `data/branch-summary.json`). Six of the 77 unmatched orbits lie on satellites of R: the three stable
orbits above and t37 (T* = 29.7765, nu = 2/7 upper branch), t42 (T* = 33.7451, nu = 2/9 upper) and t59 (T* = 43.6551, nu = 3/10 upper); a zero of the
satellite is the same orbit as each of them by the start values (`tools/branch-summary.mjs`). Three zeros are linearly stable and match nothing in the
sources checked: T* = 33.745149 (nu = 2/9 upper branch, sense -), T* = 37.624249 (2/11 upper, sense -) and T* = 51.383330 (3/10 lower, sense +), with
the words (01)^9, (01)^11 and (01)^10. They were refined to 30 digits (closure of the full period 7e-26, 9e-26 and 3e-25 on the stored values,
`data/satellite-candidates.json`); REBOUND closes them to 3e-14 to 5e-14 from the double precision values and the multipliers are on the unit circle
to 1.2e-5 (`data/satellite-check.json`). The first of them is 5e-9 in T* and 2e-5 in L* from t42 but it is a different orbit: the start values differ
(the normalised starts by 0.099), t42 is unstable (largest multiplier 1.027) and this one is linearly stable (`tools/satellite-candidates.mjs`); it
may lie near a bifurcation of t42 (not shown). The other zeros with k > 1 are not refined. That these three match nothing in the sources checked so
far is all that can be said (the review of Li and Liao could not be read).

**The upper branch beyond n = 12 (2026-10-10).** The members with nu = 1/n for n = 13 to 20 were followed on both branches, with the control direction
and the limits as for n <= 12 (`data/branch-points/<n>-upper.json` and `<n>-lower.json`); then the upper branch from n = 21 up. The rules, the
predictions, the stop rule and the changes made during the runs were written down in `docs/rules/` (the rules and predictions before the first run,
the changes in the second file as they were made). For every n from 13 to 36 the upper branch reaches a periodic orbit in at least one sense: for n =
13, 14 and 15 in both senses, which reach the same orbit, from n = 16 in one sense, while the other is stopped by a collapse of the step after 505 to
625 steps. Each zero has the word (01)^n, 2n alignments and no repeat. T* runs from 32.63981 (n = 13) through 44.98515 (n = 20) and 58.77994 (n = 28)
to 72.37337 (n = 36); the table with L*, the multiplier, the closure and the closest approach of every n is the output of
`tools/satellite-sequence.mjs`. THE ZEROS ARE NOT STABLE: the largest nontrivial multiplier (src/relative.js and REBOUND) is 1.712 for n = 13 and
grows to 15.427 for n = 28 and 24.624 for n = 36 (by 0.90 to 1.22 per n, the increments themselves growing), while the orbits for n = 5 to 12 are
stable. So the sequence of linearly stable orbits ends at n = 12. The closure of the double precision zeros is 6e-10 to 4.0e-9 (tier reliable for
all); refined to 30 digits the closure of the full period on the stored values is 4e-25 to 1.6e-23 and REBOUND closes them to 1.6e-14 to 6e-13 from
the double precision values (`data/satellite-candidates.json`, `data/satellite-check.json`). None of the 24 orbits matches the atlas, the CPC table,
my 102, the periodic rows of Davoust and Broucke, Henon 1976 or the rows of Li et al. (hits at 1e-5 with the alignments, repeats up to 12, pairs at
the same period by the start values, `tools/satellite-candidates.mjs`): not found in the sources checked, and the review of Li and Liao could not be
read. The predictions written down before the runs: the T* of the zero from the member (T*(n) = n T*_R(n) - delta(n), delta = a + b / n fitted on n =
8 to 20) holds to 0.0031 for all n = 13 to 36 (the differences are -0.0013 to +0.0031, for n = 21 to 36 +0.0011 to +0.0031; a version with delta
linear in n is off by up to 0.02), while the extrapolation of the steps in T* of n = 5 to 12 fails from n = 18; the multiplier 7.621 + 0.85 (n - 20)
holds within 5 % up to n = 26 and fails from n = 27 (+5.9 % at n = 27, +16 % at n = 36); the closest approach of the zero in the units of its start
falls from 0.160 (n = 13) to 0.070 (n = 36), the scale free closest approach times |E| from 0.540 to 0.457, with no break. The lower branches (n = 13
to 20) never reach a rotation 0: 16 continuations, all stopped by a limit (8 at the closest approach limit, 6 by a collapse of the step, 2 at the step
limit); they are undecided.

**Where the upper branch was stopped by the method (2026-10-10).** The stop rule written before the runs (three consecutive n undecided, an n is
undecided when neither sense reaches a rotation 0) ended the sequence at n = 28 when the runs were done as planned: for n = 27 and n >= 29 the n fold
repeat of the member did not close to the residual 1e-9 of the earlier runs (the system is singular at the branch point and the residual stalls near
3.5e-11 n, 1.00e-9 at n = 29 for 8 to 48 pieces). Four changes of the method were then made, each written into the rules file before it was run: (1)
the residual accepted for the repeat was relaxed to 1e-8 (`--repeat-tol=1e-8`), which decides n = 27 but not n >= 29, where the satellite curves
advance with very small steps (a path length of 3 in 700 steps where n = 28 reaches its zero at 6.0 in 282) and stop at the step limit; (2) the repeat
was solved with 16 pieces of the multiple shooting instead of 8 (`--pieces=16`), after which the steps are normal but the continuation ends just
before the zero (n = 29: theta = -0.0005 at a path of 8.29, T* about 60.49), where the integration of the orbit gave up (a cap of 4000 + 3000 T steps
in `src/perp.js`); (3) a point whose orbit cannot be integrated is rejected like a failed step; (4) the caps of the number of integration steps were
raised by a factor 20 (`src/perp.js`, `src/shooting.js`). With these changes the zeros for n = 29 to 36 are reached in 358 to 386 steps (the other
sense ends by a collapse of the step after 616 to 624 steps). So the stop of the sequence at n = 29 was the method and not the orbits. The files for n
= 29 to 36 were made with `--repeat-tol=1e-8 --pieces=16`, the file for n = 27 with `--repeat-tol=1e-8`, the others with the defaults; the runs of the
earlier attempts (8 pieces, the old caps) stopped at limits and are not kept. The sequence was not run beyond n = 36 (the time limit of 4 hours); the
stored trace has crossings of nu = 1/n for the upper nu up to n = 58 and no further (its upper nu has the minimum 0.017034 at its end, and a longer
trace of the same family would not give more unless the family continues beyond the end of the stored trace, which was not tested).

**The stored zeros of n = 24, 26, 27 and 28 (2026-10-11).** The zeros stored in `data/branch-points/<n>-upper.json` for n = 24, 26, 27 and 28 were
left at a rotation of 3.6e-6, 5.0e-5, 1.4e-5 and 2.3e-5 turns instead of 1e-11 or less (all other k = 1 zeros of n = 5 to 36 are below 1e-11; three
files with k > 1 have 3e-9 to 3e-8). The bisection for the zero of theta between the last two points of the curve (`follow` in
`tools/branch-point.mjs`) ended early: the corrector (`correct` in `src/shooting.js`, Newton on the shooting system, accepted when the residual is
below 1e-11) returned not ok at the 2nd midpoint for n = 26 and 28 and at the 4th for n = 24 and 27 (the four runs were repeated with the bisection
logged), the loop stops at a failed corrector, and the last accepted midpoint was kept as the zero. For n = 26 and 28 (repeated with the residuals of
the corrector logged) the residual at that midpoint stalls at 1.19e-11 and 1.64e-11, just above the limit; in the continuation a failed corrector
halves the step and tries again, in the bisection it does not. Why these four and no other n of 5 to 36 was not traced further; the residual stalls
near 1e-11 where it failed, so it is probably a matter of rounding at which midpoint it ends above the limit. A rotation of 5e-5 turns moves L* by
1e-3 and T* by 4e-4 along the curve (L* changes by about 20 per turn there), and the closure of the stored zero (1e-9 to 2e-9, measured on the
relative periodic orbit) does not show it. The 30 digit orbits of `data/satellite-candidates.json` were refined from these zeros and have rotation 0
(2e-10 turns in double precision, residual below 1e-27), so everything computed from them is not affected: the comparisons with the other lists, the
multipliers, the closure tiers and the REBOUND checks. The stored zeros were used in the table of `tools/satellite-sequence.mjs` of version 0.2.21
(T*, L* and the scale free closest approach), in `data/branch-summary.json` (the output of the tool, unchanged) and for one number of this file (T* of
n = 28, corrected above). The differences zero - B and the closest approach in the units of the start do not change in the digits quoted. The stored
files were not rerun; the table now takes T* and L* from the refined orbits and prints the rotation left at each stored zero, and
`tools/branch-point.mjs` prints it too.

## Empirical relations

Relations between the numbers of the zeros of the upper branch (k = 1) for n = 5 to 36, printed by `tools/satellite-relations.mjs`: fitted on n <= 20
and tested on n = 21 to 36. The zeros are the 30 digit orbits of `data/satellite-candidates.json` (for n = 5, 6 and 8, which have none, the stored
zero). They are empirical relations fitted to 32 numbers, not laws and not derived, and none was tested beyond n = 36.

**T* (written down before the run for n >= 21).** Prediction B of `docs/rules/rules-n21-up.txt`: T*_n = n T*_R(n) - delta_n, where T*_R(n) is the T*
of the member of the R family with the upper rotation number nu = 1/n and delta_n = a + b / n, a = -0.0033, b = 0.4633, fitted on n = 8 to 20 (fitted
on n = 5 to 20 the test error is up to 0.014, which is why the fit starts at 8). The reason for this form is that the satellite curve leaves the n
fold repeat of the member at the branch point, so the T* of its zero should be close to n T*_R(n), with a difference that gets small for large n. The
differences zero - B are -0.0013 to +0.0031 for n = 13 to 36 and +0.0011 to +0.0031 for n = 21 to 36 (the test), growing with n. The data delta_n = n
T*_R(n) - T* is 0.058 at n = 7 and 0.0064 at n = 36; the fitted one is 0.055 at n = 8 and 0.0095 at n = 36, and the growing difference is the error of
B. A form with a c / n^2 term (fitted on n = 8 to 20, after the run) has a largest test error of 5.9e-4, so a + b / n is not the right form for
delta_n; it is the one that was written down.

**L* (fitted after the run).** L*_n = a + b / n + c / n^2 with a = 2.7344, b = -0.9649, c = 0.7684, fitted on n = 5 to 20: the largest error is 9.0e-5
on n = 5 to 20 and 5.1e-4 on n = 21 to 36 (at n = 36); a + b / n alone has 4.9e-3. This relation was found after the zeros for n >= 21 were known and
is not a prediction. The limit a depends on the window of the fit: 2.7344 for n = 5 to 20, 2.7351 for 8 to 20, 2.7358 for 12 to 36 and 2.7361 for 20
to 36; so L* seems to tend to a value between 2.73 and 2.74, which is an extrapolation of a fit, not a result.

**Stability (an observation).** The largest nontrivial multiplier is on the unit circle for n = 5 to 12 and 1.712 for n = 13; it then grows from 2.609
(n = 14) to 24.624 (n = 36), by 0.8 to 0.9 per n at first and 1.2 per n at the end. The two trends written down before the run for n >= 21 fail: the
linear one (0.85 per n from n = 20) is 14 % low at n = 36, the quadratic fit of n = 13 to 20 is 12 % low. So there is no relation for the multiplier
here. Where the orbits become unstable is between n = 12 and 13, but n is discrete: the place of the change is not located, and whether it is a
bifurcation of the sequence has not been examined.

**Fits in n alone (found after the run, for comparison).** Largest error on n = 21 to 36 of T* fitted on n <= 20: a n + b + c / n 0.72 (fit on n = 5
to 20) and 0.47 (n = 8 to 20); with a d / n^2 term 0.35 and 0.20; a n + b + c sqrt(n) 0.020 and 0.0024. The last form was tried after the others had
failed, so it is a form chosen after the test; fitted on n = 8 to 20 it is as good as B (0.0031) with three parameters and without the parent family,
and for n = 5 to 20 it is not (0.020). So the fits in n alone do not show that the relation to the parent family is needed: it is a reason for B that
was given before the run, and the sqrt(n) form has none. Both are empirical.

**Robustness (2026-10-11).** `tools/satellite-tests.mjs`; the rules, with the bounds, were written before the numbers were computed
(`docs/rules/rules-relation-tests.txt`: 0.005 for T*, 1e-3 for L*). Only B was written down before the run for n >= 21; the sqrt(n) form and the L*
fit were found after it, so a pass for them is not out of sample. Leave one out over n = 8 to 36 (interpolation): the largest error is 3.98e-3 for B
(at n = 8), 8.8e-4 for the sqrt(n) form and 1.9e-4 for L*. Trailing windows (fit on n = 8 to m, predict m + 1 to 36): B is inside the bound from m =
15 (3.8e-3; 5.18e-3 at m = 14, 4 % over), and its error at n = 36 has the same sign for every m (-5.2e-3 to -1.0e-3), with coefficients that drift
with the window (a from -0.0005 to -0.0066, b from 0.435 to 0.500: the form a + b / n is not right); it is not inside the bound when n = 5 to 7 are in
the fit (-0.014 at n = 36 for the window 5 to 20). The sqrt(n) form has very stable coefficients (a 1.5365 to 1.5397) but is inside the bound only for
fits that reach n = 19 (3.7e-3; 5.6e-3 at m = 18, 1.99e-2 at m = 14). The L* fit stays within 4.5e-4 in every trailing window and every window tried,
and its limit is 2.735 +- 0.001 (2.7344 to 2.7361 over the windows, 2.7347 to 2.7355 for fits on 8 to m).

**A heuristic for the correction of B (suggested after the data were seen).** The rotation of the first point of every satellite curve is -eps_n, with
eps_n = n |theta_R| - 1, the rotation of the n fold repeat of the member beyond one turn (equal to within 4e-10 for n = 5 to 36). eps_n has its maximum at n
= 7 (7.04e-3), and so has delta_n (0.0583): the hump of delta that a + b / n cannot follow is the hump of eps. The ratio delta_n / eps_n is the mean
of |dT*/dtheta| along the curve from the branch point to the zero, so it is an identity and not a test; it is 8.1 at n = 5, 8.4 at n = 11, 8.0 at n =
20, 7.5 at n = 25, 6.95 at n = 30 and 6.13 at n = 36, inside 7 to 9 up to n = 29. The slope at the branch point is not the mean slope for the larger n
(8.2 at n = 5, 10.1 at n = 20, 11.45 at n = 36; within 12 % of the mean only up to n = 12): the curve bends. So delta_n = C eps_n with C about 8 is a
first-order heuristic, not a derivation and not a prediction (C is not known independently of the curves). For k > 1 the ratio |delta| / |eps| is 7.5
to 8.3 for all ten zeros with closure tier reliable, 7.1 to 7.5 for three zeros with tier weak, and 16.5 to 32.5 for four files (2-9-lower-0.2572,
2-11-lower-0.1995, 5-11-upper-0.3916, 5-12-upper-0.4313), all four with tier weak or failed, which are zeros that are not established.

**Not the relation of the PRL type (the R family only).** Jankovic, Dmitrasinovic and Suvakov (PRL 2016) say that the published BHH satellites lie on
the same curve of L against T/k as the BHH family itself (see "Where the stable orbits sit on the BHH curve" in `docs/results.md`). That was not
tested here: the BHH family (Broucke's A1, orbit 11 of Henon 1976) was not traced, and nothing is said about the CPC satellites. For the R family: the
zeros of n = 5 to 36 do not lie on the curve of T* against L* of the parent (the R family at the L* of the zero), 0 of 32 within 1e-3; the relative
difference is 0.039 at n = 5 and 0.53 at n = 36 (the zero of n = 36 has T*/n = 2.010, the R family at its L* = 2.709 has T* = 3.084). They have
instead the T* of the member with nu = 1/n minus delta_n / n: relative difference 2.3e-3 at n = 5, 1.1e-3 at n = 13 and 9.8e-5 at n = 36, inside 1e-3
for 23 of the 32 (n >= 14), while the L* of the zero is 0.02 to 0.96 below that of the member. So for the R satellites the period is that of the
repeat at matching nu and not that of the family at matching L*; whether the BHH satellites behave like this was not tested, and this is not a test of
the published statement.

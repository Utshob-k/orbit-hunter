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
the closure tier reliable, 7 weak and 5 failed, and the 12 weak or failed zeros are not established, whatever their T* and L*. Over all 41 branch
points there are 82 satellite continuations, 50 of them reach a rotation 0 (38 established), 20 stopped at the closest approach limit, 2 by a collapse
of the step and 10 at the step limit; 80 of the 82 control continuations end at a repeat whose primitive closes and 2 were stopped by a collapse of
the step (`tools/branch-summary.mjs`, `data/branch-summary.json`). Six of the 77 unmatched orbits lie on satellites of R: the three stable orbits
above and t37 (T* = 29.7765, nu = 2/7 upper branch), t42 (T* = 33.7451, nu = 2/9 upper) and t59 (T* = 43.6551, nu = 3/10 upper); a zero of the
satellite is the same orbit as each of them by the start values (`tools/branch-summary.mjs`). Three zeros are linearly stable and match nothing in the
sources checked: T* = 33.745149 (nu = 2/9 upper branch, sense -), T* = 37.624249 (2/11 upper, sense -) and T* = 51.383330 (3/10 lower, sense +), with
the words (01)^9, (01)^11 and (01)^10. They were refined to 30 digits (closure of the full period 7e-26, 9e-26 and 3e-25 on the stored values,
`data/satellite-candidates.json`); REBOUND closes them to 3e-14 to 5e-14 from the double precision values and the multipliers are on the unit circle
to 1.2e-5 (`data/satellite-check.json`). The first of them is 5e-9 in T* and 2e-5 in L* from t42 but it is a different orbit: the start values differ
(the normalised starts by 0.099), t42 is unstable (largest multiplier 1.027) and this one is linearly stable (`tools/satellite-candidates.mjs`); it
may lie near a bifurcation of t42 (not shown). The other zeros with k > 1 are not refined. That these three match nothing in the sources checked so
far is all that can be said (the review of Li and Liao could not be read).

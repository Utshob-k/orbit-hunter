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
sources that could be read has these orbits with rotation 0 (the papers named above, the atlas, Broucke 1975, Davoust and Broucke 1982); a rotating
member of the satellite curve for n = 39 is in a source that was added later, see the paragraph below. The review "A review on periodic orbits of the
general planar three-body problem" of Li and Liao (Sci. China Phys. Mech. Astron. 68(8), 289501, 2025, doi 10.1007/s11433-024-2686-6) could not be
read (it is not open access and there is no preprint), so "not found" is all that can be said.

**A rotating member of the satellite curve for n = 39 was found before (2026-10-11).** The sentence above was incomplete. The master thesis of M.
Jankovic (Belgrade 2016, appendix A, Table 3; it is not part of this repository and not public; a copy was provided by the author, and the thesis is cited with her permission) gives six orbits of a preliminary search,
two at L = 0.935549 and four at L = 1.5, with the topological exponents k = 13, 58 and 12, 45, 39, 84. The CPC 2020 paper mentions that search and
the six exponents (section 4, p. 8: "some of which are retrograde and others are direct") but does not tabulate the orbits at L = 1.5. I read the
thesis on 2026-10-11, converted the orbits like the rows of the CPC tables, closed them again and tested them (`tools/thesis-orbit-test.mjs`; the
rules, written before the runs, are in `docs/rules/rules-thesis-k39.txt`; the printed values are arguments of the script and are not stored here).
Result: the orbit k = 39 is a rotating member (rotation angle not 0) of the satellite curve of the R member with the lower nu = 1/39. It has no repeat
and the word (01)^39; the exact member has a second null vector of the shooting matrix of its 39 fold repeat (second smallest singular value 4.3e-12
against 8.1e-5); the orbit is within 1e-7 of the branch point in T* (relative), 3e-5 in L* and 3e-7 turns in the rotation (its rotation is minus
eps_39 to that accuracy), and the family through it, followed in both senses, passes within 4e-8 in L* and 3e-7 turns of the branch point and then
leaves it as the two senses of a satellite curve do. The orbit with rotation 0 on that curve was not computed. The orbit k = 45 is a 45 fold repeat of
an R orbit (it returns after T/45, mismatch 1.7e-10) and not a satellite. For k = 58, whose refined version is the row N = 99 of the CPC tables, the
family could not be followed from the start and the orbit is far from the branch point of the member (about 0.85 in L*): undecided. k = 12 (11 loops
per relative period) is undecided and k = 84 does not close from the printed digits. So satellites of R with n >= 5 were partly found before: one
rotating member of the curve for n = 39 is in the thesis, and its search is mentioned in the CPC 2020, without being identified as a satellite of R.
The orbits with rotation 0 and the sequence for n = 5 to 56 are not in the sources I could read.

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
earlier attempts (8 pieces, the old caps) stopped at limits and are not kept. The run of that day ended at n = 36 (the time limit of 4 hours); n = 37 to 56 were run later (below). The stored trace has crossings of nu = 1/n for the upper nu up to n = 58 and no further (at its end its lower nu is 0.017034 and its upper nu 0.017100, both still falling; the stored trace stops at a limit of the tracing code, and the extended trace described at the end of this file goes on).

**The upper branch from n = 37 to 56 (2026-10-11).** Run as an out of sample test, with the rules and the predictions written before the first run
(`docs/rules/rules-test1-test2.txt`): the upper branch for n = 37 to 58 with the settings of n = 29 to 36 unchanged (`--repeat-tol=1e-8 --pieces=16
--control`), 22 jobs, 148 minutes. For every n = 37 to 56 the upper branch reaches a periodic orbit in one sense (the other sense ends by a collapse
of the step or at the step limit, as before; the data are `data/branch-points/<n>-upper.json`). n = 57 and 58 are undecided: both senses of both stop
at the step limit of 700 points after a path length of 3.9 to 8.0, the small step symptom that n = 29 had with 8 pieces, which is a limit of the
method and says nothing about the orbits. The 20 zeros were refined to 30 digits (residual up to 3e-25, closure of the full period of the rounded
values 2.4e-24 to 7.1e-23; `data/satellite-candidates.json` has 54 orbits now). All have the word (01)^n with 2n alignments and no repeat, closure
tier reliable in double precision, and are unstable: the largest multiplier is 25.868 at n = 37 and 53.176 at n = 56 (REBOUND agrees to 2e-5, closure
4e-14 to 1.5e-12). None is a hit in the lists checked (my 102, the atlas, the CPC rows, Davoust and Broucke, Henon 1976, Li et al. 2025; within
1e-5 with the alignments). One near pair: the n = 41 zero (T* 80.79823, L* 2.71199, 41 loops) and the CPC rows N = 92 and 93 (43 loops; N = 92 has T*
80.80025, L* 2.70889, dT 2.5e-5 and dL 1.1e-3), which are different orbits (the normalised starts differ by 1.55 and 1.82). 15 of the 20 stored double
precision zeros (n = 42 to 56) were left by the bisection at a rotation above 1e-9 turns, up to 2.4e-5 at n = 42, against 4 of 32 for n <= 36 (the
same cause as for n = 24, 26, 27 and 28, next paragraph); the numbers quoted here are those of the refined orbits, and `data/branch-points/` has the
files as they were run. The table of `tools/satellite-sequence.mjs` goes to n = 56.

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
files were not rerun; the table now takes T* and L* from the refined orbits and prints the rotation left at each stored zero, and `tools/branch-point.mjs` prints it too. The same happened to 15 of the 20 zeros of n = 37 to 56 (the paragraph below).

**The bisection retries (version 0.2.24).** `src/zero.js` (`locateZero`, tested in `test/zero.test.js`) replaces the loop of `tools/branch-point.mjs`:
when the corrector fails at the midpoint it tries the points at 1/4 and 3/4 of the chord, then at 1/8 and 7/8 (shorter steps from a point known to be
on the curve, as the continuation does after a failed step), and goes on with the bisection from the first that converges; it stops only if all five
fail, and then says so. When the corrector does not fail at the midpoint the loop is the plain bisection, with the same floating point operations.
Checked by rerunning with the changed tool (the committed tool with the paths changed, output outside the repository): n = 13 (7167 numbers) and n =
21 (8178 numbers) are identical to the stored files number for number, apart from the field `repeatTolerance` that the older files do not have; n = 26
(one of the four unconverged ones) and n = 42 (the first of the 15) differ from the stored files only in the zero of the satellite curve (and for n =
26 in the zero of the control curve), nothing else (the curves, the other sense, the singular values): the zero is now at a rotation of 7.4e-12 turns
(n = 26: T* 55.35381, L* 2.69872, the values of the refined orbit; stored 55.35424 and 2.69975) and 1.9e-12 turns (n = 42: T* 82.47787, L* 2.71254;
stored 82.47767 at 2.4e-5 turns). The stored files of n = 24, 26 to 28 and 42 to 56 were not regenerated: they are the files as they were run, and the
30 digit orbits are the values to use. The zeros of the control curves were affected in the same way (12 of 156 above 1e-9 turns, up to 1e-4, in the
files of n = 25 to 28 and 49 to 56). The 19 regenerated files of version 0.2.28 are described at the end of this file.

## Empirical relations

Signs: every difference or error of a prediction in this file and in the tools is the data minus the prediction, for B the T* of the zero minus B (zero - B). Until version 0.2.28 three tools printed prediction - data (see the corrections in `CHANGELOG.md`).

Relations between the numbers of the zeros of the upper branch (k = 1) for n = 5 to 36, printed by `tools/satellite-relations.mjs`: fitted on n <= 20
and tested on n = 21 to 36. The zeros are the 30 digit orbits of `data/satellite-candidates.json` (for n = 5, 6 and 8, which have none, the stored
zero). They are empirical relations fitted to 32 numbers, not laws and not derived, and none was tested beyond n = 36 before the run of n = 37 to 56 described in the last paragraph of this section.

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
15 (3.8e-3; 5.18e-3 at m = 14, 4 % over), and its error at n = 36 has the same sign for every m (+1.0e-3 to +5.2e-3), with coefficients that drift
with the window (a from -0.0005 to -0.0066, b from 0.435 to 0.500: the form a + b / n is not right); it is not inside the bound when n = 5 to 7 are in
the fit (+0.014 at n = 36 for the window 5 to 20). The sqrt(n) form has very stable coefficients (a 1.5365 to 1.5397) but is inside the bound only for
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

**Not the relation of the PRL type (the R family only).** Jankovic and Dmitrasinovic (PRL 2016) say that the published BHH satellites lie on
the same curve of L against T/k as the BHH family itself (see "Where the stable orbits sit on the BHH curve" in `docs/results.md`). That was not
tested here: the BHH family (Broucke's A1, orbit 11 of Henon 1976) was not traced, and nothing is said about the CPC satellites. For the R family: the
zeros of n = 5 to 36 do not lie on the curve of T* against L* of the parent (the R family at the L* of the zero), 0 of 32 within 1e-3; the relative
difference is 0.039 at n = 5 and 0.53 at n = 36 (the zero of n = 36 has T*/n = 2.010, the R family at its L* = 2.709 has T* = 3.084). They have
instead the T* of the member with nu = 1/n minus delta_n / n: relative difference 2.3e-3 at n = 5, 1.1e-3 at n = 13 and 9.8e-5 at n = 36, inside 1e-3
for 23 of the 32 (n >= 14), while the L* of the zero is 0.02 to 0.96 below that of the member. So for the R satellites the period is that of the
repeat at matching nu and not that of the family at matching L*; whether the BHH satellites behave like this was not tested, and this is not a test of
the published statement.

**Out of sample, n = 37 to 56 (2026-10-11).** The three formulas, fitted on n <= 20 only, against the 20 zeros of n = 37 to 56
(`tools/satellite-relations.mjs`, section 5; the predictions for n = 37 to 58 and the expected errors, from the trend of the errors on n = 28 to 36,
were written down before the run in `docs/rules/rules-test1-test2.txt`; bounds 0.005 for T* and 1e-3 for L*). Of the three only B had been written
down before the zeros for n >= 21 were known, so this is the first out of sample test of the other two. B: the T* of the zero is 2.9e-3 to 3.9e-3
above B, which holds for all 20 (largest 3.9e-3 at n = 53); the error grows by 3.8e-5 per n, about half of the trend of n = 28 to 36 (9e-5), and the
expectation that B reaches the bound at the end was not met. The L* fit: error +5.4e-4 at n = 37 to +9.0e-4 at n = 56, holds (the expectation was a
crossing of 1e-3 at n = 56; the trend now puts it near n = 61). The sqrt(n) form: error -2.0e-3 at n = 37, zero at n = 42 to 43, then positive and
growing, +5.5e-3 at n = 50 and +1.3e-2 at n = 56: it holds up to n = 49 and fails from n = 50. The expectation written down for it (holds for all n)
was wrong, and the form is not a law: a fit on n = 8 to 20 that was as good as B for n <= 49 leaves the data beyond. The largest multiplier grows by
1.26 per n at n = 37 and by 1.60 per n at n = 56. So B and the L* fit survive an extension of 20 values of n beyond the data they were fitted on and
compared with; whether they hold beyond n = 56 was not tested (n = 57 and 58 are undecided).

**Predictor B for k > 1 (test 2 of the same rules).** B in the form T*_zero = n T*_member - delta_n, with delta_n = a + b / n exactly as fitted on k =
1 (n = 8 to 20, no refit), applied to the ten zeros with k > 1 whose closure tier is reliable (`tools/satellite-test2.mjs`, bound 0.005): it holds for
0 of 10, as expected in advance (zero - B from +0.012 for 2-9-upper to +4.0 for 5-12-upper for eight of the ten, and -0.067 for 2-11-upper and -0.195 for 3-10-lower for the other two: of either sign). The reason is the size of the rotation excess: eps is
0.0045 to 0.48 for these zeros (0.001 to 0.007 for k = 1), so delta is about 8 eps, 0.036 to 4.0 and of either sign (seven of the ten have delta < 0,
the zero is longer than the n fold repeat), while a + b / n is 0.035 to 0.09. The sqrt(n) form cannot be applied to k > 1: it is a function of n alone
and zeros of the same n have different T* (n = 9: 33.745 for k = 2 and 49.263 for k = 4). The heuristic delta = 8 |eps|, tried as a variant after the
data were seen, holds for the three zeros with delta > 0 (relative errors 0.6 %, 1.7 % and 5.1 %) and not for the seven with delta < 0; |delta| /
|eps| is 7.5 to 8.3 for all ten, and whether delta = C eps holds with eps signed has not been tested (the numbers that would test it have been looked
at).

**What the literature says about that curve.** Li and Liao (arXiv:2008.13550) report that the relation found by Jankovic and Dmitrasinovic for equal
masses (at a fixed energy, the same curve of L against T/k for the BHH orbits and for their satellites) does not hold for unequal masses: for m1 =
0.7, m2 = 0.9 and other mass pairs (m3 = 1) the satellites follow a different relation from the BHH orbits, and they conclude that in general it
should be more complicated. All the orbits of that paper are retrograde (the binary and the third body move in opposite directions), and they start
from Broucke's 16 A orbits, Henon's 45 orbits and the 58 satellites then known. So the departure of the R satellites from the curve of their parent is
not by itself a difference between a prograde and a retrograde family: a departure from the BHH curve is also reported for the retrograde family once
the masses are unequal. It is not only a matter of kind, though. For equal masses the CPC satellites are near the traced retrograde curve of Henon's
family and not on it: at their L*, T*/k differs from the curve by less than 1e-3 for 12 of the 98 rows that have a curve at their L*, by less than
1e-2 for 70, by less than 5e-2 for 96 and by 0.096 at most (`tools/cpc-rows.mjs`), against 0.04 (n = 5) to 0.53 (n = 36) for the R satellites and the
curve of R. What "the same curve" means in the PRL was not checked (the curve used here is my own trace of Henon's family, L* 0.21 to 4.93).

**The CPC rows are points of families (2026-10-11).** The 99 rows of the CPC tables are relatively periodic orbits with a rotation angle that is not 0
(-0.38 rad for N = 1), so each is one point of a family of orbits and not an isolated orbit. Comparing their T* and L* with the zeros of my satellite
curves (rotation 0), as done before, is therefore not enough, and the rows were also compared with the curves themselves (`tools/cpc-rows.mjs`; the
rules, with the tolerances, were written before the test, `docs/rules/rules-cpc-curves.txt`). Each row was closed again as a relatively periodic orbit
(multiple shooting; all 99 close, residual below 1e-8; N = 99 does not close by single shooting); at the L* of the row, the T*, the rotation and lam
of every stored curve with n = k (every sense of every file of `data/branch-points/`) were compared with the row (hit: 1e-6 in T* and 1e-5 rad in the
rotation; near: 1e-3 and 0.02 rad; on the curve if lam agrees to 1e-4). Only 6 rows (N = 93 to 98, k = 43 to 48, L* 2.73 to 2.82) have a stored curve
at their L*, because the curves end at their first zero (L* 2.57 to 2.72) or at the limit that stopped them, and the other 93 are beyond the part that
was computed; the 6 are 4 % away in T* and are not on a curve. For the rest a screen was used that does not need the curves: a point of a satellite
curve of the member with nu = p/k has T* equal to k T*_member(p/k) up to a shift that is at most 0.3 % for p = 1 and 16 % for p >= 2 (the largest
shift of the zeros of the stored k > 1 files), so T*/k of the row must be within 1.5 % (p = 1) or 16 % (p >= 2) of the T* of a member of the stored
trace with nu = p/k. 95 of the 99 rows have no such member and cannot be points of a satellite curve of R of the stored kind. Four have one. N = 9 (k
= 5) lies on the k = 5 branch of the T* = 4.96 orbit (A1) that was followed earlier (`tools/match-start.py`: the closest point of the arm is 2.5e-7
from the row in T* and L*, and lam, |u1|, |u2| and t agree to 1e-5; see the count of the branches in `docs/results.md`), so it is a satellite on the A
side and not of R. N = 19 (k = 8) and N = 33 (k = 10) are not on the stored arms of A1 either (their T*/k, 3.44 and 2.78, is far from the 4.96 of A1;
the nearest points of the arms of A1 with the same k are 0.44 and 0.77 away in T* and L*), and they are near the traced retrograde curve of Henon's
family, N = 19 to 2e-4 and N = 33 to 3 % in T*/k at their L*: satellites of other members of the retrograde family. N = 99 (k = 58, L* 3.26) is near
the satellite curve of the R member nu = 1/58 and not on it (in a run for n = 58 that is not part of this repository, T* differs by 1.4e-4, the
rotation by 7e-3 rad and lam by 0.046 on the first sense; the second sense stopped at L* 3.57, before the L* of the row), so it stays open (N = 99 is the refined version of the orbit k = 58 of the preliminary search of the thesis of Jankovic, see the paragraph on the thesis above). So no row
of the CPC tables is shown to lie on one of my satellite curves, 95 of the 99 are excluded as points of one, N = 9 is on the A side, and N = 99 is the
one row that remains open until the curves of n = 58 are continued; "not found in the sources checked" stands for the zeros and now also holds for the
curves in the part that was computed. The same screen does not exclude the rows as points of other families of the retrograde branch, which is what
almost all of them are.

**Which CPC satellites are direct (2026-10-11).** The CPC paper says that four of its 99 satellites belong to direct (prograde) orbits and does not
mark them. With the co-rotation share (`src/corotation.js`: the closest pair is taken as the inner binary, and the share is the part of the relative
period in which the angular momenta of the inner binary and of the outer orbit have the same sign) three rows co-rotate all the time (N = 6, 9 and
99), N = 3 for 40 % of the time and 95 rows counter-rotate (`tools/cpc-rows.mjs`); the fourth direct satellite is not among the rows (the four direct
ones of the paper are probably among the six orbits of the preliminary search, four of them at L = 1.5, which are not in the tables; see the paragraph
on the thesis above, where k = 45 is a repeat of an R orbit; N = 3, with 40 %, is not one of them). The members of the R family that were tested
co-rotate (all 242 points of the stored trace at the start, six over the whole orbit), and so does the BHH orbit A1 (T* 4.9598), which the papers call
retrograde (Li and Liao for all their orbits). The reason, from `tools/corotation-trace.mjs` (`data/a1-family-corotation.json`): along the traced
family through A1 the share is 1 for the stretch around A1 (in one direction, lam increasing, L* falls to 0.22 at T* 4.98 to 4.995; in the other T*
falls from 4.96 to 4.29 while L* stays between 1.04 and 0.775) and falls to 0 between T* 4.29 and 4.23 (lam 0.50 to 0.47, L* 0.775 to 0.760), where it
stays to the end of the trace (T* 2.32, L* 1.61, where the tracer lost the family). So the measure changes sign along the retrograde curve near L*
0.77, and the satellites N = 6 and N = 9, which branch from A1, are on the co-rotating stretch. That the rows the paper calls direct are the
co-rotating ones is a reading of its words with a measure of my own, which the paper does not state; N = 99 (k = 58, L* 3.26) co-rotates too but is
far from A1. None of these rows is an R satellite zero.

## Stability, the second family of satellites, the extended trace and Henon's relation (version 0.2.28)

**Stability of n = 5 to 12 in multiple precision.** `tools/monodromy-mp.py` computes the four nontrivial multipliers of the 30 digit orbits of `data/satellite-candidates.json` and `data/refined/` (for n = 8 the shortest orbit of the T* = 47.065 orbit, refined to 30 digits) by reduction: the time shift and the rotation are taken out analytically (the 4 x 4 block of the monodromy on W / span{v, g}, where W is the subspace on which the energy and the angular momentum are stationary, v the vector field and g the generator of the rotation, inside the 8 dimensional space with zero centre of mass and momentum), so no eigenvalue is picked as the one "closest to 1". Tier A (the stored orbit, 50 digits) and tier B (the orbit refined to 40 digits, 60 digits) give, over the nine cases (`data/stability-mp/class-c/`), moduli equal to 1 within 3.6e-24 and 2.6e-35, an invariance defect of the subspace of at most 3.0e-23 and 5.4e-34, and the same angles. The angles nu1 < nu2 (in turns) of the orbits are in Table 1 printed by `tools/tables.mjs`: nu2 rises from 0.1029 at n = 5 to 0.4017 at n = 12, nu1 stays between 0.0039 and 0.0095. For n = 13 to 16 the largest multiplier has the modulus 1.712, 2.609, 3.426 and 4.235 (`tools/satellite-sequence.mjs`); it is real and negative (a computation that is not part of this release; the signs were not computed for n >= 17). So the pair exp(+-2 pi i nu2) reaches -1 between n = 12 and n = 13 and leaves along the negative real axis: a collision at -1, of the type of a period doubling, not at +1 and not of the two pairs. This is a reading of the sequence of orbits: n is a label and not a parameter, and no single family was followed through the point where the pair reaches -1. It is linear stability, with error estimates from two precisions, not a proof. REBOUND runs over 1000 and 10,000 periods (double precision) were made for n = 5 to 12; their scripts and outputs are not part of this release.

**The second family of satellites: class I.** Besides the reflection of the perpendicular start (class C, the collinear class used above), the orbits of R have a second reversing symmetry. Let z(s) be a member of R with S z(s) = z(-s), where S is the reflection in the line with the velocities reversed. At the time t (half of the relative period 2t) the state is the start state with bodies 1 and 2 exchanged and turned by an angle phi: z(t) = G z(0), with G the exchange followed by the rotation, a symmetry of the equations. Then S' = G S is another reversing symmetry (S commutes with the exchange and turns the rotation by phi into one by -phi, so S G S = G^-1 and (G S)^2 = 1), and S' z(s) = G z(-s) = z(t - s): the states at t/2 and 3t/2, a quarter and three quarters of the relative period, are fixed by S'. They are isosceles states: body 0 on the line through the centre of mass at the angle phi/2 to the start line, its velocity perpendicular to it, body 2 the mirror image of body 1 in that line and v2 minus the mirror image of v1. On the 242 stored points of the trace of R the half period state equals the original start to 7e-8 at most, and the isosceles test holds at a quarter and at three quarters of the period with errors of at most 1.2e-8 in the positions and 2.5e-9 in the velocities. The two facts about R that the derivation uses (z(t) = G z(0) and the symmetry of the start) were found on the stored orbits; they are not derived from the equations, and no citation for them is given. The isosceles start of `src/iso.js` (body 0 at (1, 0), bodies 1 and 2 at (-1/2, h) and (-1/2, -h), velocities (0, w), (p, -w/2), (-p, -w/2)) has its shooting system in `src/iso-shooting.js` and `src/iso-relative.js` (copies of `src/shooting.js` and `src/relative.js` with the start, its derivatives and the angle changed). It reproduces all 242 members of R (`tools/iso-trace.mjs`: T* and L* to 6.4e-10 relative, the rotation to 3.3e-10 turns; the result is `data/r-family-trace-iso.json`), and `tools/branch-point-iso.mjs` does for it what `tools/branch-point.mjs` does for the perpendicular start.

For every n = 5 to 12 (upper nu = 1/n) the member is found in the isosceles description (|nu - 1/n| below 7e-12), the matrix [J | dF/dlam] of the n fold repeat has a two dimensional null space, and the bifurcation equation has two real roots, the direction of the repeat and one other. The curve of the other root runs to a rotation 0 in both senses (`data/class-i/curves/n<k>.json`), the two senses end at the same orbit (the same T* and L*), started from its two symmetric points, and the curve leaves the branch point on the same side as the satellite curve of class C (L* below the branch value). The eight end orbits are in `data/class-i/partner-orbits.json`: the start values with 30 digits, the closure of the full period (4e-26 to 4e-25), the multipliers in multiple precision (`tools/iso-monodromy-mp.py`, `data/class-i/stability/`) and the REBOUND closures (7.7e-15 to 5.9e-14 after one period, 4.2e-13 to 3.7e-12 after twenty). For every n the orbit of class C is stable and the orbit of class I is unstable: a real pair of multipliers mu, 1/mu with mu = 1.0252 at n = 5, then 1.0539, 1.0612, 1.0616, 1.0601, 1.0582, 1.0564 and 1.0547 at n = 12, and one pair on the unit circle. The class I orbit has an isosceles state and no collinear state, the class C orbit the reverse (`data/class-i/check/`). The two end orbits of a given n are close and not equal: T* of the class I orbit is above that of the class C orbit by 3.0e-7 at n = 5, then 1.9e-6, 4.0e-6, 5.9e-6, 7.6e-6, 8.9e-6, 1.0e-5 and 1.1e-5 at n = 12 (relative 1.7e-8 to 3.6e-7), and its L* is below by 6.2e-5, 2.7e-4, 5.3e-4, 8.0e-4, 1.1e-3, 1.3e-3, 1.5e-3 and 1.7e-3 (relative 2.4e-5 to 6.5e-4); these are the columns of Table 2 printed by `tools/tables.mjs 2`. The results show no difference between odd and even n. For n = 5 the two curves agree in (T*, L*, rotation) to 1e-9 over the first 0.23 of the path length and then separate (`tools/iso-compare-curves.mjs`, `tools/figures.mjs 2`); the comparison of the two curves written down before that run, a threshold of 1e-4 on their distance in (T*, L*), was undecided because the threshold was too coarse, so that the end orbit of class I is a different orbit rests on checks added after the data were seen (its symmetry class, its stability, the end orbits themselves). For n = 6 to 12 the criterion was written before the runs and does not use the curves near the branch point; it is met for all seven n.

The pair, a stable and an unstable orbit on the same side of the branch point leaving it together, looks like the pair of an elliptic and a hyperbolic orbit of period k that appear on one side of a generic period-k bifurcation of a two dimensional area preserving map (Meyer 1970, Trans. Amer. Math. Soc. 149, 95-107, Proposition 1.18, k >= 5). The analogy is qualitative. The theorem is for maps of a two dimensional manifold without symmetry; the reduced map here is four dimensional and reversible, so it does not apply directly, and the pairing is a numerical result of this computation, not a consequence of the theorem. Class I was computed for the upper rotation number and n = 5 to 12 only: not for n >= 13, not for the lower rotation number and not for orbits without these symmetries.

The eight end orbits of class I were compared with the 415 equal-mass entries with L != 0 of the atlas list (the copy of 2026-10-09; the list is not in this repository) and with the 99 rows of the CPC tables, in the way of `tools/compare-atlas-all.py` (T* and L* to 1e-5 relative, T* up to a factor n with n up to 12, the same number of syzygies): none matches; the orbit of class I for n = 7 lies 2.1e-4 in L* from the atlas entry R7 1/1, which is the class C orbit (`data/class-i/check/`). They were not found in the sources checked. That says nothing about whether they are known; the atlas has no versioned DOI and cites no paper, so the comparison is weak evidence either way.

**The family R beyond the end of its stored trace.** `data/r-family-trace.json` (unchanged) ends at L* = 4.129 (T* = 1.880) with the lower nu 0.017034 and the upper nu 0.017100, both still falling; its last 32 points do not move (steps of 1e-8 to 1e-9). The step rule of `src/shooting.js` (`correct`) rejects a half period t below 0.3 of the t at which a piece of the trace started, and the last stored point has t = 0.29999 of that value, so the end of the stored trace is a limit of the tracing code and not a property of the family. `tools/family-follow.mjs` (unchanged) was started again from the last stored point (direction +1, 24 pieces): 77 accepted points to lam = 0.9496, where the same limit was reached again, and a second run from there: 32 points, ended by the closest approach stop of the tool (0.03) at lam = 0.9696, L* = 7.25, T* = 1.646. The 109 points are in `data/r-family-trace-extended.json` (the commands are in its field `what`). All are stable (both nontrivial moduli within 1e-6 of 1), and the lower and the upper nu fall monotonically from 0.0170 to 0.0023; each 1/n for n = 59 to 439 is crossed once by each (`tools/r-trace-nus.mjs`, the table is `data/r-family-trace-extended-nus.txt`). These crossings are brackets between consecutive points (9 or 10 values of n lie in one step near the end), not members of the family and not branch points. No satellite was computed beyond n = 56, the family was not followed beyond lam = 0.970, and nothing here says that the sequence of satellites is finite or where it ends. The multipliers are in double precision.

**Henon's relation and the sign convention.** Henon (Celestial Mechanics 15, 99, 1977) shows for a family of periodic solutions of a system with an axis of symmetry that dT/dA = -dPhi/dE (T the period, A the angular momentum, Phi the angle through which the system has rotated after one period, E the energy), and for the N body problem, with the similarity of Newtonian orbits, dT/dPhi = -A/(2E) along a family of fixed energy (his eq. 35). In the scale free variables of this repository (T* = T |E|^(3/2), L* = |A| |E|^(1/2); the similarity leaves T*, L* and Phi unchanged, so any family can be brought to one energy) this is, for E < 0 and A > 0, dT/dPhi = A/(2|E|) and dT* = (L*/2) dPhi. The rotation angle theta of this repository (the angle of the rotation that takes the end state of one period back onto the start state) has the opposite sign, theta = -Phi, so dT* = -(L*/2) dtheta = -pi L* d(turns) with turns = theta/(2 pi), which is how the sign of `turns` in the stored curves enters. Along a satellite curve the relation gives delta_n = n T*_member - T*(end orbit) = pi times the integral of L* d(turns) from -eps_n to 0, where eps_n = n |turns of the member| - 1 is the excess of the n fold repeat; the integral is positive. The relation is Henon's, used here and not claimed; it is checked on the stored curves: for all 52 curves the integral (trapezoid rule on the stored points) equals delta_n with a ratio of 1.0000 and a largest difference of 4.1e-7 in T* (`tools/henon-integral-check.mjs`); at the branch point the slope of the satellite curve and of the repeat curve is pi L*_member in absolute value, and the slope of the repeat curve read from the family R alone agrees for 50 of the 52 values of n (`tools/henon-slope-check.mjs`); dT* and d(turns) have opposite signs in all 11,497 pairs of neighbouring points with |d(turns)| >= 1e-6, and dT* / (-pi L* d(turns)) has the median 1.0000 (`tools/henon-sign-check.mjs`). Along a satellite curve the rotation does not go straight from -eps_n to 0: it first becomes more negative (the dip: 0 for n = 5 and 6, 1.4e-4 turns at n = 9, 2.1e-3 at n = 56, larger than eps_n from n = 27). Because dT* = -(L*/2) dtheta, the lowest rotation is the highest T*, the coincidence of extrema from which Henon found his relation: it is the same stored point on 51 of the 52 curves and neighbouring points on the 52nd (`tools/henon-dip-check.mjs`). The size of the dip decides delta_n and is not predicted by the family R alone; it is not explained here. B above is an empirical relation for delta_n and is not derived from Henon's relation.

**The 19 regenerated zero files.** `data/branch-points-regenerated/<n>-upper.json` for n = 24, 26, 27, 28 and 42 to 56 are the 19 files whose stored satellite zero was left at more than 1e-9 turns (see the two paragraphs on the zero loop above). They were made by `tools/branch-point.mjs` with the repaired `src/zero.js` and the same arguments as the stored files (theta, `--pieces`, `--repeat-tol`, `--control`; n = 27 with `--repeat-tol=1e-8`), written into a copy of the repository, so that no stored file was touched; each run took 54 to 119 minutes. `tools/zero-regenerated-compare.mjs` compares every number of a new file with the stored one: everything except the two zeros and the field `repeatTolerance` is equal for all 19 files and the new zero is the zero of the same sense. The rotation left at the new zero is below 1e-10 for 7 files, below 1e-8 for 12 and at most 2.7e-8 for all (it was up to 5.0e-5 before); 12 of the 19 still stop above 1e-9 turns, because the corrector fails at all five points tried, so the 30 digit orbits remain the values to use. The stored files are unchanged and are the ones that every other file and tool of this repository reads. The 19 runs were not repeated for the release; `docs/rules/results-release-0.2.28.txt` has a rerun of the same tool for n = 13.

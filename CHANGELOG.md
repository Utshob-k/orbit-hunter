# Changelog

The README was split on 2026-10-10 (version 0.2.18). Its sections went to `docs/results.md` (results and comparisons), `docs/r-family-satellites.md` (the R family and its satellites), `docs/prior-work.md`, `docs/methods-and-limits.md` (how it works, what is not proven, dead ends and bugs, known weaknesses) and `docs/reproducing.md` (running it); the data table is in `data/README.md` and the corrections log is below. The text was moved without changing it. References to "Corrections" in the old text mean the log below.

## Versions

- 0.2.20 (2026-10-10): small fixes in the README and docs (the 33.745149 orbit against t41 and t42, rows of the csv, REBOUND sentence, file names).
- 0.2.19 (2026-10-10): the satellites with k > 1 followed (21 more members; six of the 77 lie on satellites of R, three more stable orbits), `branch-point.mjs --k=K`, the start value comparison of orbits (`src/identity.js`), the family of the T* = 29.310 orbit and the check of the Suvakov gallery as data, the paths in `data/refined/summary.json`, `arm-repeats.json` and `bifurcation-points.json` with forward slashes (only the `file` fields changed), two more known weaknesses, small fixes in the docs.
- 0.2.18 (2026-10-10): the README split into README, `docs/`, `data/README.md` and this file; no change to the code or the numbers.
- 0.2.17 (2026-10-10): all 20 crossings of the R family with nu = 1/n followed, one data file for each in `data/branch-points/`, `nu-map.mjs` and `branch-summary.mjs`, the orbits for n = 7 and 9 to 12 refined to 30 digits and checked in REBOUND.
- 0.2.16 (2026-10-10): Davoust and Broucke 1982 did find satellites of R (n = 2 and 3), the n = 3 satellites reproduce their rows, R2 is on the curve, year of the Li and Liao review; `db82-bifurcations.mjs`.
- 0.2.15 (2026-10-10): satellites of Broucke's R family for n = 5, 6 and 8, the two refined orbits at T* = 17.7208 and 19.6472, REBOUND check, `branch-point.mjs`.
- 0.2.14 (2026-10-10): the T* = 33.745 orbit is on Broucke's R family; the traces of the family and `r-family.mjs`.
- 0.2.13 (2026-10-10): no orbit of the lists has a cyclic return (`choreo-test.mjs`) and none is a rational member of IA-3 in the range of the printed rows (`ia3-rational.py`).
- 0.2.12 (2026-10-10): unused code removed, `orbit-table.mjs` keeps the atlas groups, shorter lines in the README.
- 0.2.11 (2026-10-10): corrections from the bug check of 0.2.10 (stored refined values, stable samples, duplicates); `closure-stored.py`, `stable-samples.py`.
- 0.2.10 (2026-10-09): REBOUND check of all 102 orbits, 40 digit closure of the 85 (the double precision closures of t40, t47 and t57 were too small).
- 0.2.9 (2026-10-09): the return test and the comparison with Henon's family as scripts; the 1970s papers added to the sources compared with.
- 0.2.8 (2026-10-09): families through published starts (traces from the exact start), a note at the first 77.
- 0.2.7 (2026-10-09): how to rerun the branch counts, closing stops on tolerance and not on the clock, the Li rows as derived numbers only.
- 0.2.6 (2026-10-09): the other 48 orbits refined to 30 digits, so all 85 are.
- 0.2.5 (2026-10-09): the choreographic branch of the rotating eights traced to L* = 0.41.
- 0.2.4 (2026-10-09): wording fixes (Three ovals, the T* = 59.72 orbit is not IA-3 repeated), rotated returns are not repeats.
- 0.2.3 (2026-10-09): the lam = 0.6018 arm is the 27 fold repeat curve of its parent, the distance to the Li rows is 16.5 %.
- 0.2.2 (2026-10-09): SN.13 has its own syzygy word.
- 0.2.1 (2026-10-09): version in `package.json` and `CITATION.cff`, how the atlas list was first made.
- 0.2 (2026-10-09): first corrected release: the 7 stable orbits refined to 30 digits, the atlas comparison with all 415 entries (6 of the 85 are atlas orbits, 77 match none), corrections of 2026-10-08 and 2026-10-09.

## Corrections

Statements of mine that were wrong, newest first. The dates are those of the commits or, for 2026-10-09, of the day of the change.

- **2026-10-10, satellites of Broucke's R family are published, and R2 is on the curve.** The paragraph on the satellites of R said that no satellites
  of the family were found in the literature checked, which included Davoust and Broucke 1982 and Broucke 1975. Of Davoust and Broucke only the tables
  had been typed in from the ADS scans, and of Broucke 1975 pages 1 and 19 and the tables had been read. Both papers were read in full on 2026-10-10.
  Broucke 1975 says that the characteristic exponents of his families A and R will be published later and has nothing on stability, bifurcations or
  satellites. Davoust and Broucke study the stability and the bifurcations of their families up to the multiplicity three. Their family D1, the direct
  revolution of a binary around a third mass, is R (rows N = 62 to 67 of their Table 5 are on the traced curve, see the entry below). On D1 they find
  three bifurcations: point 1, in the stable region at the 3T line, the branch e (triple period); point 2, where the stability curve is tangent to the
  2T line, the branch f (double period); point 3, at the 3T line again, the family E (triple period). Their Table 8 pairs the rows D1(63) with e(79),
  D1(64) with f(83) and D1(65) with E(74). The rotation numbers nu of these rows are 0.3331, 0.4985 and 0.3329 in my code (the printed rows have seven
  digits). The satellites followed from the two members of R with nu = 1/3 (`tools/branch-point.mjs 3 0.3194` and `3 0.4276`,
  `data/branch-points/3-upper.json` and `3-lower.json`), without using the rows, pass through the rows 79 to 81 of e and the rows 71 to 78 of E, to
  3e-6 or better in T* and L* and with the same rotation angle (`tools/db82-bifurcations.mjs`); rows 70 and 82 do not close as converted. So the
  satellites of R with n = 2 and 3 were published in 1982; for n >= 4 that paper has nothing, its authors stopped at the multiplicity three. The atlas
  also lists satellites of the BHH family coded by the branch (R the prograde, A the retrograde one, as its families page says), the number of laps
  and the rotation per loop (family bhhsat, codes such as R7 1/1, R4 7/6 and A7 4/1, 14 of them with equal masses). Their source tag is "bhh2026" and
  its families page describes them as the result of the atlas's own search of September 2026 and cites no paper, so they are in a catalogue, not in a
  paper; the CPC 2020 and PRL 2016 papers do not use this naming. The sentence on the literature in the paragraph on the satellites is replaced. R2
  (rotation 1/2) is on the traced curve of the entry below as well: the largest rotation of the accepted steps is 0.4946, but between the steps 120
  and 121 the rotation of the family reaches 0.49995 (`tools/r-family.mjs`), and R2 itself, found as the end of the repeat direction at the member
  with nu = 1/4, has the rotation 1/2, T* = 5.89038 and L* = 2.36212 (atlas: 5.89038 and 2.36212; `data/r-family-members.json`). So all 13 R orbits of
  the atlas are members of the curve, not 12. The review of Li and Liao is of 2025 (Sci. China Phys. Mech. Astron. 68(8), 289501), not 2024.
- **2026-10-10, the T* = 33.745 orbit is on the family of Broucke's R orbits.** The paragraph on the 1970s papers ended with "these orbits are not
  rational members of Henon's family or of Broucke's families". Only Henon's family had been traced (`data/henon-family-curve.json`); for Broucke's
  families the test was the comparison with his 29 absolute orbits of the atlas, which cannot show that an orbit is another member of one of his
  families. The family of relative periodic orbits through the shortest orbit of my stable T* = 33.745 orbit (T* = 3.7495, rotation 2/9 of a turn: the
  orbit that the return test found returning after T/9) was traced in both directions with `tools/family-follow.mjs` from the refined start values
  (`data/r-family-trace.json`, 242 accepted steps, closure 1.3e-7 or better). The traces ended at a closest approach of 0.03 (once), in a closed loop
  (once), and in two places where the step had collapsed and the trace was restarted from its last point with 24 instead of 8 pieces of the multiple
  shooting. Twelve of the 13 R orbits of Broucke in the atlas (keys `broucke_broucke_r_1` and `r_3` to `r_13`) are members of this curve: solved at
  their rotation angles (0, 1/3 twice, 1/4, 1/5, 1/6, 1/7, 2/5 twice, 2/7, 3/7 twice; the family has two members with the same angle on different
  parts), q T* agrees with the atlas to 5e-7 and L* to 3e-6, and the number of alignments is the same (`tools/r-family.mjs`,
  `data/r-family-members.json`). R2 (rotation 1/2) is not reached by the trace (largest rotation 0.4946). Rows N = 62 to 67 of Table 5 of Davoust and
  Broucke 1982 are on the curve too: at the printed rotation angle T* and L* agree to 1e-9 (row N = 68 comes within 9e-5 along the curve, but the
  member at its angle could not be solved). The T* = 33.745 orbit is the member with rotation 2/9 of a turn (q = 9, 18 alignments, T* = 33.7450829, L*
  = 2.5659196); the R orbits of the atlas have q up to 7. So it is one of the 77 that match no atlas orbit and also another member of a published
  family, as the T* = 11.652 orbit is of the curve through row 84; it is not a match, and this does not say whether the q = 9 member was known. The
  sentence of the 1970s paragraph is changed to say that the test applies to Henon's family.
- **2026-10-10, `tools/orbit-table.mjs` overwrote the atlas groups.** Run from a clean clone it replaced the group column of `data/orbit-table.json`
  and `.csv` by the one in `data/stability-perp-3.json` (the first, small atlas comparison): 81 orbits unmatched instead of 77, with 4 atlas orbits
  among them. The published tables were not affected. The script now keeps the group of the existing table, and a rerun gives the published files
  again. Found while removing unused code.
- **2026-10-10, from an independent bug check of v0.2.10.** The points below were checked against the data here before this entry; the numbers are
  recomputed. (1) *The refined values are periodic to 2.7e-19, not to 1e-20.* The intro, the refinement paragraph and the entry of 2026-10-09 below
  say that all 85 are periodic to better than 1e-20 from the refined start values. Integrated from the 30 digit values as they are stored in
  `data/refined` (50 digits, `tools/closure-stored.py`, `data/closure-stored.json`), 16 of the 85 close worse than 1e-20 (t18, t31, t40, t49, t53,
  t55, t60, t65, t66, t68, t69, t70, t71, t79, t81, t83) and the worst is 2.7e-19 (t66 and t79; t68 1.5e-19, t40 5.2e-20). The number that
  `tools/check-refined.mjs` reads from the files had been measured by `tools/refine-mp.py` on its unrounded 40 digit solution, while the files hold
  the solution rounded to 30 digits, and for orbits with large multipliers the rounding is amplified. `check-refined.mjs` integrates nothing (its
  header said that it did; corrected). The threshold of 1e-20 was not changed and the refinement was not run again; `refine-mp.py` now measures the
  closure on the rounded values, which only matters for new runs. The orbits are periodic to about 3e-19 from the stored values; "better than 1e-20"
  was wrong for them. (2) *One orbit was counted twice.* The orbit a16 of the arclength list (T* = 30.8616, L* = 1.4100) is the shortest orbit of t80
  (T* = 61.72, one of the 77, a true 2 fold repeat): u1, u2 and lam agree to 1e-9 and the t of t80 is twice that of a16. This was known in my notes on
  2026-10-09 (102 entries, 100 distinct orbits: a00 = t02 and a16 = t80) but not in this file. The 85 and the 17 are therefore 100 distinct orbits and
  the unmatched ones are 91 distinct, not 92, and "the other 14 match nothing in the atlas or in my first list" was wrong for a16. The same orbit is
  tier weak as t80 and reliable as a16. The counts of the return test (8 and 17 of the unmatched ones) do not change, because a16 does not return, and
  the smallest distances to the rows of Li et al. do not change either; `tools/return-test.mjs` now prints the duplicates. (3) *The Bulirsch-Stoer
  closure is not converged for t40, t47 and t57.* The same start values with `bsIntegrate` at the tolerance of the table (1e-13), at 1e-14 and at
  1e-15 close to 9.6e-9, 5.5e-8 and 1.1e-7 (t40), 8.6e-9, 2.0e-8 and 1.9e-8 (t47), 7.1e-9, 1.8e-8 and 2.2e-8 (t57). The entry of 2026-10-09 below
  explains only the Dormand-Prince numbers. `closureBS`, `closureDP45` and `closureTier` are unchanged and the tiers were not recomputed. (4) *SN.9 is
  not one of the 85.* The sentence "A control" listed it as found by the search without being pointed at it; it is orbit a01 of the arclength list,
  reached from the satellites of the CPC table (`data/atlas-comparison-all.json`). (5) *The stable samples on the branches.* "23 of the 30 arms have
  at least one linearly stable sample, but at most of them it is the sample at the branch point" had no script. Recounted (`tools/stable-samples.py`):
  23 is right; in 21 the sample at the branch point is stable, in 9 it is the only stable one; without the 4 repeat curve arms 19 of 26, 17 and 8. The
  sentence is replaced. (6) *Smaller points.* `npm test` accepted a residual below 1e-9 for the 11 known orbits while the README said 1e-10 (the
  residuals are 5e-13 to 8.9e-11; the sentence now says what the test accepts); the test of butterfly I now also requires a largest multiplier above
  1.5 (it is 1.7758); one of the 75 jobs of the first branch run found a branch point whose two branches failed and did not run out of time; the data
  table called two files "derived numbers" that also hold printed values (the printed L and rotation angle of Li et al., the printed rotation angle of
  Henon); `tools/closure-mp.py` took about 6 minutes, not 10. Not changed: `data/refined/summary.json`, `data/arm-repeats.json` and
  `data/bifurcation-points.json` contain relative paths with backslashes (`data\refined\...`), so scripts that read them by those names work on
  Windows only, and about 17 scripts only work when started from the top folder.
- **2026-10-09, the closure of 3 of the 54 reliable orbits was too small.** The README said that 54 of the 85 orbits close to 1e-8 or better with two
  integrators (Dormand-Prince and Bulirsch-Stoer, double precision). REBOUND (below) gave 1.2e-8 to 6.6e-8 for t40, t47 and t57 from the same double
  precision start values. The double start values of all 85 orbits were then integrated for one period in 40 digit arithmetic (the
  Gragg-Bulirsch-Stoer code of the refinement; `tools/closure-mp.py`, `data/closure-mp.json`), closure as defined above. Of the 54: 51 close to 1e-8
  or better, and t40 (6.65e-8), t47 (1.24e-8) and t57 (1.96e-8) do not; these three agree with REBOUND to two digits. Of the 31 weak ones: 10 close to
  below 1e-8, 30 to below 1e-6 and t68 to 1.52e-6 (the numbers of the intro for Dormand-Prince and Bulirsch-Stoer are what those two gave). The
  columns `closureDP45`, `closureBS` and `closureTier` of the table are unchanged and are the double precision tier. A likely explanation, not proven:
  the double precision start values were found with the same Dormand-Prince code and tolerances (rtol 1e-13, atol 1e-14, `src/perp.js` and
  `src/shooting.js`), so they close to the error of that integrator, and for orbits with multipliers of 1e4 to 1e5 that error is of the size of the
  closure; the check that fits: for t40, t47 and t57 Dormand-Prince at rtol 1e-15 gives 6.4e-8, 9.6e-9 and 1.9e-8 for the same start values, against
  1.5e-9, 1.9e-9 and 3.4e-11 at the rtol 1e-13 of the table. All 85 are still periodic to better than 1e-20 from the refined start values (30 digits);
  what was wrong is the statement about the double precision starts.
- **2026-10-09, orbits on curves through published rows.** The sentence about Davoust and Broucke (above, after the traces of A1, A2 and B) said that
  traces which I had not published put at least two more of my orbits on curves from rows of that paper, with another syzygy word than the row. Those
  traces had started 0.003 in lam from the published row and been corrected there by Newton; for row 42 the correction moved u1 by 0.06 and t by 0.85,
  so that trace was not continuous with the row. Redone from the exact rows, and from my orbits towards the rows: three of my orbits are on a
  continuous curve through a published start (T* = 9.658 with row 92, T* = 11.652 with row 84, and the T* = 12.381 orbit of the arclength list with
  the CPC satellite N = 3), and the other two (T* = 7.218 with row 42, T* = 13.986 with row 86) are not shown to be. Only one of the two with another
  word holds (T* = 11.652, the row has 01^2 and mine 000101); the other is withdrawn. Of the three, T* = 9.658 is an atlas orbit, T* = 11.652 is the
  only one among the 77 unmatched and T* = 12.381 is not among the 85. None is a match: they are other members of the curve, 1.8 to 26 % away in T*,
  L* from the row. The smallest pairwise distance of an orbit, as `perpInfo` computes it, is not used: it depends on the sampling and gave 0.021 and
  0.072 for the same orbit. Scripts and traces: `tools/family-one.mjs`, `tools/family-pass-through.mjs`, `tools/published-hits.mjs`,
  `data/families85/`, `data/family-pass-through.json`.
- **2026-10-09, scripts and data for four counts that had none.** The recall count (5 tested, 2 found), the distance to the rows of Li et al. (16.5 %
  and 1.9 %), the recount of the 312 arms behind the lam = 0.6018 entry, and the reproduction of two IA-3 rows were stated here without the scripts
  that made them. The scripts and the data they read are in the repository now (Running it, "Reproducing the branch counts"). Run from a fresh clone
  they give the numbers written in this file: 312 arms of which 54 on the repeat curve of their parent, 5 tested and 2 found, 16.5 % and 1.9 %, 238
  arms that pass all checks and 139 branch points with such an arm. For the IA-3 rows at L = 0.05 and 0.10 my run differs from the derived numbers of
  the rows by 4.8e-9 and 5.9e-8 in T*, 8.5e-8 and 7.5e-8 in L*, and 3.8e-9 and 9.1e-10 in theta (`data/rpo-reproduce-IA-3.json`); that run needs the
  table, which is not in the repository, so it cannot be repeated without it. Not as I had written: (1) the distance script allowed repeats of my
  orbit only and printed 16.5 % in both lines, the 1.9 % had been computed separately; it now allows repeats of either side (up to 8) and prints both.
  (2) `data/bifurcation-points.json` was built from the first four runs (178 rows) and its arms were not reduced to their primitive period; it is
  rebuilt from all runs (276 rows), repeat-curve arms are dropped, and the retraction of N = 1 stays in it (the script used to erase it). In Known
  weaknesses the count of branch points with a satellite of the same k is now 126 instead of 116 (median 0.945 instead of 0.92), and the one arm
  within 5e-3 of a satellite with another k is now N = 77 (k = 37, 5.7e-4; the exponent of its arms is 24, so it is not that satellite) instead of N = 93.
  (3) The files of the last three runs are large (`satellite-results7.jsonl` was 5.3 MB), so results 5 to 7 are published with the numbers rounded to
  14 digits (`tools/thin-results.py`); I checked that the repeat check, the table and all verification checks give the same results on the full and on
  the rounded files, and one point that rounding would have moved across the closure limit of 1e-7 is kept as it was.
- **2026-10-09, failed computations that looked like results.** A review found places where a failed computation was counted as a result: `coverInfo`
  returned a repeat count of 1 when the integration stopped (so "not a repeat"), and `tools/orbit-table.mjs` and `tools/check-refined.mjs` did not
  look at the failure flag; `tools/check-covers.mjs` had no guard against a step size of 0; `tools/stability-list.mjs` left the orbits that did not
  re-close out of its final count without saying how many, and counted the 2 uncertain ones as unstable; `tools/verify-branches.mjs` skipped arms
  without stored states and stopped at 50 arms without saying so; `tools/arm-repeats-summary.py` dropped arms whose integration failed. All of them
  now report what they skipped or stop. The default repeat limit of `coverInfo` is 200 instead of 24 (the 85 orbits give the same repeat counts with
  both). Nothing in the numbers of this file changed: no failure occurred in the 85 orbits, the 17 orbits of the arclength list, or the 312 arms. Two
  statements that were missing from the first paragraph of Results are added there: the scan list has 319 rows and the hunts start from 287 after
  removing starts that agree to 5 decimals, and each hunt had a limit of 300 s, which stopped 92 of the 287 (so 85 is what these hunts reached, not a
  count of the family).
- **2026-10-09, repeats, and the A10 and sc022 identifications.** The README said that 9 of my 85 orbits are n fold repeats of shorter orbits and that
  their real periods are the short ones. A review checked the turn angle after T/n: it is 0 for only 3 of the 9 (T* = 39.61, 47.07 and 61.72). For the
  other 6 it is 1/3, 1/2, 2/9, 1/3, 1/4 and 1/2 of a turn, so the short orbit is only relative periodic and the real period is the full T. The
  comparisons with the atlas gave the same numbers, but two sentences had the direction wrong. My T* = 12.17 orbit is Broucke's A10 (it was written as
  A10 run 3 times). Simo's sc022 has three times the period of my T* = 19.41 orbit (it was written as three times sc022). The SN.13 comparison used
  the relative period 36.23 of my T* = 72.465 orbit. The conclusion stands for the real period too: four periods of SN.13 have 16, 16 and 16 letters
  in the word, my orbit has 18, 18 and 12.
- **2026-10-09, small numbers, from the same review.** The median distance of the 42 unmatched orbits inside the L* range of the CPC table is 4.0 %,
  not 4.3 %. Re-closing was checked at the first and last point of each of the 36 arms, which is 72 points (32 above 1e-12, the largest 5.8e-11), not
  108 points. Of the 17 arclength orbits, 2 match the atlas under the 1e-5 rule (SN.9 and S4). a08 is close to Sheen's "Three ovals" (T* equal to
  3e-8, both with the word (01)^4) but its L* is 5.9e-5 away, which is not rounding (the atlas gives the same L* from its published and its refined
  start values) and which I cannot explain, so "3 of the 17 are known" was too strong: 2 match, and a08 is unresolved. The column `group` of
  `data/orbit-table.*` still held the retracted 81 unmatched orbits and is now 77 unmatched, 6 atlas and 2 with L = 0. The sentence about satellite
  passes with a different k named N = 69, which is not in the current data (only N = 93 is, and it is on the withdrawn arm).
- **2026-10-09, the distance to the rows of Li et al.** The 16.5 % was computed with no repeats on either side, while the atlas and CPC comparisons
  allow repeats. With repeats of either side up to 8, the closest is 1.9 % (my orbit with T* = 59.72 and L* = 0.193 against four times the IA-3 row at
  L = 0.2). Neither number is a match (1e-5) to a printed row. That orbit is not IA-3 repeated four times: it has 42 syzygies, and four relative
  periods of any orbit have a multiple of 4 (a syzygy count does not change when an orbit is turned); the IA-3 member with the same L* (0.193) has
  four times its rotation angle about 0.3 turn from a whole number. The 1.9 % is a near coincidence.
- **2026-10-09, the recall count.** "Tested" counts the arms that turn out to be repeat curves of the parent, "found" does not; the second part was
  added after N = 1 turned out to be a repeat curve (the first version counted it as found), although the text calls the rule one that I do not
  change. With this rule the result is 5 tested and 2 found, as written. If repeat-curve arms are dropped from both, it is 2 tested and 2 found. The
  script of the count is not in the repository yet.
- **2026-10-09, "81 of the 85 are not in the atlas" (wrong in the README at commit 96fec98).** I had compared my orbits with 37 of the 415 equal-mass
  orbits with L != 0 of the Three Body Orbits atlas (the BHH satellites, Suvakov's orbits and Sheen's). With all 415
  (`data.threebodyorbits.com/catalogue.json`, read by `tools/compare-atlas-all.py`; the list itself is not stored here), four more of my orbits are
  atlas orbits: T* = 4.960 (Broucke A1, the BHH orbit of Henon), T* = 9.658 (Broucke and Boggs' S4, my row 91 of Davoust and Broucke), T* = 13.986
  (Broucke and Boggs' S122) and the T* = 12.17 orbit (Broucke A10 run 3 times). So 6 of the 85 are atlas orbits and 77, not 81, match none; the "row
  91 is not in the atlas" and "all 6 stable orbits are among the 81" statements were wrong as well.
- **2026-10-09, the closure range of the 31 orbits (wrong in the README at commit 96fec98).** The first paragraph and the entry below say that the
  other 31 orbits close "only to between 1e-8 and 1e-6 in double precision". That is wrong for 3 of them: with the worse of the two integrators 28
  close to between 1e-8 and 1e-6 and 3 to between 1e-6 and 3.5e-6 (Bulirsch-Stoer; Dormand-Prince alone is at most 7.7e-8).
- **2026-10-09, the sentence about Li et al. 2025 (wrong in the README at commit 96fec98).** I wrote that the paper "is not a catalogue of periodic
  orbits with L != 0". Its 16 rows with rotation angle not 0 do have L != 0 and are relative periodic orbits. What is true is that it continues only
  two families, the figure-eight and IA-3, from L = 0.
- **2026-10-09, what the 421,562 counts (wrong in the README at commit 96fec98).** I wrote that I did not know what the 421,562 rows of `60digits.txt`
  count. The page of the database says "file with 60 digits data in the form (vx, vy, T, T*) ordered by T* for 421,562 i.c.s" and, for the
  supplementary pdf, "421,562 Euler i.c.s with T* < 200": initial conditions, not distinct orbits.
- **2026-10-09, a file name.** `data/db82-exactly-periodic.json` is renamed `data/db82-rotation-multiple-2pi.json` (the orbits of Davoust and Broucke
  whose rotation angle is a multiple of 2 pi), and the phrase "exactly periodic" is removed from comments of the scripts and from descriptions in data
  files.
- **2026-10-09, the lam = 0.6018 branch and the repeat check.** My check of the minimal period of the arms (a script that is not published yet) tested
  repeat counts only up to 24. The T* = 33.745 parent is a 9 fold repeat, so the repeat curve of its k = 3 branch is a 27 fold repeat. The check could
  not see 27: it reported 9, and the arm was counted as a branch. With the limit raised to 200, the orbits of both arms at lam = 0.6018 are 27 fold
  repeats of a primitive orbit with the syzygy word 01. Over the 797 stored points of the two arms (lam 0.530 to 0.698) its T* is 2.62 to 3.67 and its
  L* is 2.58 to 2.91. After 1/27 of the period the state is the start turned by an angle, with a residual of 1.1e-9 at worst over the 797 points
  (7e-11 at three of them). As an independent test I followed the parent's own family in lam from its start values, without the arm data: at four lam
  of the arm that goes to larger lam (0.6018, 0.6026, 0.6478, 0.6977) it gives the same start values and period to 1e-10 or better. So the arms are
  the repeat curve of the parent and not a branch, and the candidate "stable at every sample" is withdrawn. The old values T* = 8.46 to 10.40 were the
  T* of the arm divided by 9 instead of 27; L* does not change with the repeat count. I redid the check for all 312 arms with stored states. The
  number of arms on the repeat curve of their parent went from 36 to 54, all 18 new ones belong to the T* = 33.745 parent (k = 3, 4, 7, 11 and 12),
  and no arm of another parent changed. The recall check against the CPC table (5 tested, 2 found) does not change.
- **2026-10-09, "exactly periodic".** The first paragraph of this file said that the search found 81 exactly periodic orbits, which gave the 81 orbits
  that I could not match to the atlas as the number found (there are 85 distinct ones), and other places called the orbits exactly periodic. What the
  checks support: of the 85 distinct orbits, 54 close to 1e-8 or better with two integrators (the six linearly stable ones among them), and 31 close
  only to between 1e-8 and 1e-6 in double precision. These 31 and the 6 stable ones are refined, and are periodic to better than 1e-20 in the 30 digit
  refinement; the other 48 are not refined. I no longer use "exactly periodic" for any of them. The closure tiers were introduced on 2026-10-08
  (commit 1e9c02a), the refinement of the 7 stable orbits on 2026-10-08 (commit b412011), the refinement of the 31 weak ones was done on 2026-10-08
  and its files are added on 2026-10-09.
- **2026-10-09, the N = 1 match.** A branch from the 3 fold repeat of the T* = 4.96 orbit passes 3e-3 from the published satellite N = 1 (CPC 2020),
  and I listed N = 1 among the matches (here, and as a hit in `data/bifurcation-points.json`, where the original value is still visible). Both arms of
  that branch point are the 3 fold repeat curve of the parent, not a satellite, so N = 1 is not reproduced.
- **2026-10-08, a candidate branch.** I described the branch at lam = 0.6018 of the T* = 33.745 orbit by the period of a 9 fold repeat (T* = 77 to 93,
  exponent 27). Its orbits are 9 fold repeats of shorter orbits (primitive T* = 8.46 to 10.40, L* = 2.61 to 2.80, word (01)^3). Fixed in commit
  fff46ba.
- **2026-10-07, SN.9 and N = 9.** I stated that the k = 3 and 4 satellites end at SN.9 and that satellite N = 9 (k = 5) is connected to 5 times the
  stable orbit at lam = 0.8653. The continuation I used could jump to another branch; redone in arclength, the claims are not supported (commit
  117e23b).

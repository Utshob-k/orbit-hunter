# Results and comparisons

This file holds a part of the former README, moved here on 2026-10-10 without changing it (only headings were added). Paths such as `tools/...` and `data/...` are from the top folder of the repository. "Corrections" in the text means the log in [CHANGELOG.md](../CHANGELOG.md); the other sections of the former README are in this folder (see [README.md](../README.md)).

## Where it stands, the full statement

A search for periodic orbits of the planar three-body problem with equal masses. A GPU does the rough search in
the browser (WebGPU), double precision code on the CPU closes and checks every candidate.

**Where it stands.** The code reproduces published orbits to about nine digits. Every orbit it found with zero
angular momentum was already published. For non-zero angular momentum it found 85 distinct orbits. 54 of them are
close to 1e-8 or better with two double precision integrators (among them the 6 linearly stable ones); the other 31 do not: with the worse of the two
integrators 28 of them close to between 1e-8 and 1e-6 and 3 to between 1e-6 and 3.5e-6. In 40 digit arithmetic, from the same double precision start
values, 51 of the 54 close to 1e-8 (t40, t47 and t57 do not, at most 6.7e-8), and of the 31, 10 close to below 1e-8, 30 to below 1e-6 and one to
1.5e-6 (Corrections, 2026-10-09; `data/closure-mp.json`).
All 85 are refined: the stored 30 digit values close to 2.7e-19 or better (16 of the 85 above 1e-20, see Corrections, 2026-10-10; the unrounded
solutions of the refinement close to better than 1e-20). The refinement dates: the 31 and the 6 stable ones on 2026-10-08 and 2026-10-09 (37 orbits),
the other 48 on 2026-10-09 (the rule is in the refinement paragraph below).
Among the sources checked so far (all 415 equal-mass orbits with L != 0 of the Three Body Orbits atlas, Davoust and Broucke 1982, Broucke and Boggs
1975, Broucke 1975, Henon 1976, the 99 satellites of Jankovic et al. 2020, the 18 rows of Li et al. 2025; the
L = 0 catalogues of Li and Liao and of Hristov and Hristova cannot contain orbits with L != 0), 6 of my 85 orbits are atlas orbits (T* and L* equal to
1e-5 and the same number of alignments): the BHH orbit of Henon (Broucke A1),
Sheen's "Two ovals" and "Oval, catface and starship", Broucke and Boggs' S4 and S122, and Broucke's A10 (in my table it returns rotated by a third of
a turn after T/3, see Repeats). 2 have L = 0, and 77 match none of them. Three of the nine rows of Davoust and Broucke 1982
with a rotation angle that is a multiple of 2 pi are in my lists (rows 9, 91, 115), and all three are atlas orbits, so the 77 are not at a row of that
paper either. One of the 77 (T* = 11.652) lies on the continuous curve of relative periodic orbits through row 84 of that paper (my word is 000101,
the row's is 01^2): it is another member of that curve, 3.0 % and 17 % away from the row in T* and L*, so not a match (see Corrections, 2026-10-09).
The T* = 33.745 orbit lies on the curve of Broucke's family R, as its member with rotation 2/9 of a turn (Corrections, 2026-10-10).
For them I do not know whether they are known.
Not yet checked: Suvakov's gallery, Nauenberg 2001, Chenciner, Fejoz and Montgomery 2005. 35 of the 77 have L* below the range of the CPC table, so
for them "no match" with its satellites means "nothing to compare with".
I do not know if any is new, and nothing here should be read as a discovery.

## Results

**Which catalogues contain orbits with L != 0.** Some catalogues only contain L = 0 orbits, so "matches none of them" means nothing for orbits with L
!= 0. This is what I actually compared against:

| catalogue | orbits with L != 0? | what I did |
|---|---|---|
| Three Body Orbits atlas (threebodyorbits.com) | yes, 415 equal-mass entries with L != 0 in `data.threebodyorbits.com/catalogue.json` on 2026-10-09 (Simo 344, Broucke A 16 and R 13, Broucke-Boggs 2, BHH satellites 14, Suvakov 13, Sheen 11, Rose 2; the list is not stored here, `tools/compare-atlas-all.py` reads the downloaded file; the first run (2026-10-09) was on a list typed from the atlas pages; re-run on `catalogue.json`, same result; that file was generated 2026-09-27, 1,772,587 bytes, sha256 `597c66bd937764825ccaa38da5372d2c71fc6490ab9b09a51902339e5e3c0eb0`) | compared the 85 base orbits and the 17 of the arclength list (`tools/compare-atlas-all.py`): 6 of the 85 match, 77 do not; before 2026-10-09 I had compared with only 37 of the 415 entries, see Corrections |
| Jankovic et al., CPC 2020 | yes, 99 BHH satellites | converted all, 98 close; used for the satellite runs |
| Jankovic et al., PRL 2016 | yes, 57 satellites, all in the CPC list | consistency check only |
| Li and Liao 2017 (695 families) | no, L = 0 | only my L = 0 orbits |
| Hristov and Hristova 2024 (Astronomy and Computing 49, 100880; arXiv:2404.16526), Euler configuration | no, L = 0 | only my L = 0 orbits (abstract of arXiv:2404.16526: "12,431 initial conditions (i.c.s) corresponding to 6,333 distinct solutions"; the database page db2.fmi.uni-sofia.bg/3bodyeuler says "file with 60 digits data in the form (vx, vy, T, T*) ordered by T* for 421,562 i.c.s" and "421,562 Euler i.c.s with T* < 200" for the supplementary pdf; the 12,409 distinct free-fall solutions that Li et al. 2025 cite are from another paper, Hristov et al., Celest. Mech. Dyn. Astron. 136, 7, arXiv:2308.16159, whose abstract says "24,582 i.c.s of equal-mass periodic orbits with scale-invariant period T*<80, corresponding to 12,409 distinct solutions") |
| Suvakov gallery (three-body.ipb.ac.rs) | partly, pictures not numbers | not compared (its site certificate is broken for my tools) |
| Li, Tao, Li and Liao 2025, New Astronomy 119, 102407 (doi:10.1016/j.newast.2025.102407) | equal mass, finite L, but only the figure-eight and IA-3 orbits continued in L from L = 0; 18 rows in the table (10 figure-eight, 8 IA-3), 16 of them relative periodic with rotation angle not 0 | read; not a catalogue; none of my orbits matches a row; the closest is 16.5 % away in (T*, L*), or 1.9 % if repeats are allowed, see below |
| Broucke and Boggs 1975 (Celest. Mech. 11, 13); Broucke 1975 (Celest. Mech. 12, 439); Hadjidemetriou 1975 (12, 155); Hadjidemetriou and Christides 1975 (12, 175); Henon 1976 (Celest. Mech. 13, 267) | the first, second and last have equal-mass orbits (5 of 27, 29 absolute periodic orbits of two families, one family of 46 orbits); the two Hadjidemetriou papers have none | transcribed from the ADS scans and compared, see the paragraph below; no hit |
| Nauenberg 2001 (Phys. Lett. A 292, 93); Chenciner, Fejoz and Montgomery 2005 (Nonlinearity 18, 1407) | finite L, rotating eights | not read, not compared |

So "77 match nothing" means: nothing among the 415 atlas entries (to 1e-5 in T* and L*, with the same number of alignments; repeats up to 12 times)
plus the 99 CPC satellites plus the equal-mass orbits of the 1970s papers in the paragraph below. Two orbits come close without matching: the T* =
19.41 orbit (L* = 2.22) is 8.5e-4 in T* and 1.0e-3 in L* from Simo's sc022 (three times its period is the period of sc022), and the relative period of
my T* = 72.465 orbit (36.23: it returns rotated by half a turn after T/2) is 3.1e-3 and 2.5e-3 away in (T*, L*) from twice the atlas orbit SN.13
(Suvakov's other orbits). SN.13 itself has T* = 18.06 (period 7.1716, E = -1.85094, L = -0.20452, L* = 0.2782, 12 alignments per period); the relative
period of my orbit is about twice that (T* = 36.23, ratio 2.006, L* = 0.2790, syzygy word (01010212)^3, 24 syzygies per relative period and 48 per
full period). It is not SN.13 run twice: T* and L* differ by 3e-3, far more than the accuracy of the atlas numbers (about 1e-5), and a syzygy word of
24 letters with minimal period 8 cannot be a block of 12 letters followed by the same block, even relabelled or read backwards
(`tools/word-square-check.py`; the atlas counts alignments as I count syzygies, it gives 6 for the figure-eight). The word of SN.13 itself, computed
from its start values (`tools/sn13-word.mjs`), is (010212)^2 over one period and (010212)^4 over two, with a root of 6 letters; mine is (01010212)^3
with a root of 8. The 24 syzygies per period agree, the words do not, so these are two different orbits and not one orbit 3e-3 off. The letter counts
differ as well, and neither relabelling, rotation nor reversal can change them: SN.13 run twice has 8 of each letter (8, 8, 8), mine has 9, 9 and 6.
The same holds for the real period 72.465 of my orbit against four periods of SN.13 (16, 16, 16 letters against 18, 18 and 12). What it does not rule
out is a period doubled relative of SN.13. The atlas does give the initial conditions, in the data file of the orbit
(`data.threebodyorbits.com/orbits/suvakovpc_sn_13.bin`, published and refined values; the layout is in the site's `js/orbit-data.js`); I found this
out on 2026-10-09. From the published values E = -1.850943, L = -0.204522 and period 7.171575 give T* = 18.0594 and L* = 0.27825, the numbers of the
catalogue, so the comparison above stands. I have not tried to follow one orbit to the other.
It is weaker than it looks: the 99 CPC satellites have L* from 0.8385 (N = 3, the only one below 0.84) to 3.2626 and T* from 9.69 to 109.20, and L*
does not change when an orbit is repeated. So the 35 of the 77 unmatched orbits with L* below 0.8385 are not close to any satellite or repeat of one
(the closest is 0.11 away in relative terms): for them there was nothing to compare with. The other 42 have L* inside the range of the table; the
closest of them to any satellite or repeat of one (n up to 8) is 1.0 % away in (T*, L*), the median is 4.0 %, and none is within 5e-3.

**The 1970s papers (2026-10-09).** Broucke and Boggs 1975, Broucke 1975, Hadjidemetriou 1975, Hadjidemetriou and Christides 1975 and Henon 1976 are
the early papers with collinear starts and perpendicular velocities. The numbers needed were transcribed from the ADS scans (no scans and no tables of
printed start values are in this repository) and checked: Broucke and Boggs against its printed energy E and angular momentum C (its row 6 is
inconsistent with its printed E and C, so for that row the printed T/2, E and C were used), Broucke against the atlas, and the 45 rows 2 to 46 of
Henon against his printed energy -1/6 and his printed A (to 1.2e-8) and then, by integration, against his printed T (to 6e-9) and rotation angle (to
6e-8 in 43 of the 45 rows; row 2 differs by 2e-5 and the printed angle of row 42 looks like a misprint). Broucke and Boggs have 5 orbits with equal
masses (N = 1, 4, 6, 40, 122; N = 4 and 122 are S4 and S122), Broucke has 29 absolute periodic orbits of his families A and R, which are the 16 + 13
Broucke A and R entries of the atlas (T* and L* to 1e-5, same order), and Henon has one equal-mass family (orbits 1 to 46, E = -1/6, 2 alignments per
relative period) whose only member with rotation angle 0 is orbit 11, the BHH orbit with T* = 4.9598 and L* = 1.0150: my T* = 4.960 orbit and the
atlas orbit A 1/1. The two Hadjidemetriou papers have no orbit with equal masses. With the rule of the atlas comparison (1e-5 in T* and L*, repeats up
to 12 times, the same number of alignments) none of my 77 unmatched orbits and none of the 15 unmatched orbits of the arclength list (the 14 and a08,
see below; a16 is the shortest orbit of t80, so these are 91 distinct orbits) matches an orbit of these papers. The derived numbers of Henon's rows
are in `data/henon1976-derived.json`.
For Henon's family the question was whether one of my orbits is n relative periods of a member, so that it returns rotated after T/n. The family
returns after one relative period with the bodies in their own places (at all 420 traced points of `data/henon-family-curve.json` the mismatch is at
most 1.6e-6, median 8.5e-9, with no relabelling), so the test is the return with the bodies in their own places (`tools/return-test.mjs`,
`data/return-test.json`). Of the 91 distinct unmatched orbits 8 return like that (the T* = 32.3, 33.7, 39.6, 47.1, 59.7, 61.7, 70.0 and 72.5 orbits),
and they are 0.5 to 1.9 away from the family in (T*, L*, turns) (`tools/henon-family-compare.py`). The 9 orbits that return only with the bodies
relabelled (a swap at T/2) are 0.8 to 1.0 away when their half period is compared in the same way, and allowing reflection and time reversal adds no
orbit (17 of the 91 return in some way, 8 + 9). The trace of the family starts from six of Henon's tabulated orbits (their start values are not stored
here) and covers L* 0.21 to 4.9, not the small L* near Schubart's orbit; two of the 8 have small L* (T* = 59.7 and 70.0, primitive T* of 19.9 and
17.5), but the T* of the family is below 5 everywhere. The closest screening hit was the arclength orbit a03 (T* = 13.903, L* = 1.186, word (01)^5):
it is not on the family, since it has no return after T/n under any rotation, relabelling, reflection or time reversal (best mismatch 0.5), and it
differs from Broucke's A 1/5 (same word and 10 alignments, T* = 13.886, L* = 1.185, which does return after T/5) by 1.2e-3 in T*. This says that these
orbits are not rational members of Henon's family, not that they are new. For Broucke's families the comparison above is only with his 29 absolute
orbits of the atlas, which cannot show that an orbit is another member of one of his families, and the T* = 33.745 orbit is one (Corrections,
2026-10-10).

**Li, Tao, Li and Liao 2025** (Xiaoming Li, Yueyan Tao, Xiaochen Li and Shijun Liao, "A numerical scheme to obtain periodic three-body orbits with
finite angular momentum", New Astronomy 119 (2025) 102407, doi:10.1016/j.newast.2025.102407). The paper is about equal masses. It continues only two
orbits of L = 0, the figure-eight and IA-3, in the angular momentum (L up to 0.07 and 0.35, which is L* up to about 0.08 and 0.36 and T* about 9.2 and
15), and lists relative periodic orbits, closed to 1e-6 in the rotating frame, in a table of 18 rows (the two L = 0 orbits and 16 with rotation angle
not 0); the authors say that the full data can be had on request. They write that earlier work on L != 0 concentrated on the figure-eight and BHH
families. It is not a catalogue: it continues only two families from L = 0 (its 16 rows with rotation angle not 0 have L != 0 and are relative
periodic orbits), so it says nothing about most of my orbits. Integrating the printed start values of the rows (Dormand-Prince and Bulirsch-Stoer give
the same; `tools/liao-closure.mjs`, which needs the table): the 10 figure-eight rows return rotated by the printed theta to between 6e-8 and 4e-7, as
the paper claims (d < 1e-6). The 8 IA-3 rows return only to between 2e-6 and 1e-4 from the printed 8 digits. These orbits are very unstable (a
rounding of 5e-9 in one printed velocity changes the closure by up to 1e-5), which explains the L = 0 row and part of the others but not the largest
(1e-4 at L = 0.35); I cannot do better without the unrounded values. With a solver of my own (`tools/rpo.mjs`, which needs the table; my numbers are
in `data/rpo-reproduce-figure-eight.json` and `data/rpo-reproduce-IA-3.json`) I reproduce the figure-eight row at L = 0.01 (theta -0.165183 as
printed) but not the rows at L = 0.02 and 0.05: my continuation stays on the choreographic branch (the three bodies on one curve: the state after T/3
equals the start relabelled and rotated, to 3e-11 or better, `tools/rpo-choreography.mjs`), while the printed rows from L = 0.012 on are not
choreographic (the same test gives 0.06 to 0.4), as the paper itself says for L = 0.012 (Section 4, p. 5, around Fig. 5: for L = 0.011 the three
bodies follow the same orbit, for L = 0.012 they no longer do). In scale free numbers (T*, L*, theta; the raw y1 and T cannot be compared) my L* is 2
% and 6 % away from those rows, consistent with them being on another branch that I did not follow. The IA-3 rows at L = 0.05 and 0.10 are reproduced
by the same solver to better than 1e-7 (relative) in T* and L* and 4e-9 in theta, with L taken from the printed start values by the formula of the
paper, which is 1e-4 above the printed L for all 7 rows with L > 0 (found from the rows themselves, not fitted to my solver, see below); the other 6
IA-3 rows are not compared. I converted the rows with T* = T |E|^1.5 and L* = |L| |E|^0.5 (check: the figure-eight at L = 0 gives T* = 9.238, IA-3 at
L = 0 gives 15.048). The 18 rows were typed in from the PDF and checked against its text (identical); with the formula of the paper, L = y1 y8 + y10,
the figure-eight rows give the printed L to 1e-8, and the 7 IA-3 rows with L > 0 give 1.0e-4 more than the printed L (I use the L computed from the
rows). Only the derived numbers (T*, L*, rotation angle, one row per printed L) are in the repository, in `data/liao2025-scaled.json` (made by
`tools/liao2025-scale.py`); the table is not. The scripts that read it (`liao2025-scale.py`, `liao-closure.mjs`, `rpo.mjs`, `rpo-choreography.mjs`,
and `rpo-trace.mjs` in its `row` mode) stop with a message when `data/liao2025-table1.json` is missing. The rotation angle of my orbits is below 4e-8
(largest |theta| of the 85 and of the 17 of the arclength list: 3.6e-8), and the two orbits of the 85 with L = 0 (T* = 39.64 and 79.25) are not these
two orbits. The closest of my 85 and 17 orbits (with T* of the shortest period) to any of the 18 rows is 16.5 % away in (T*, L*): the distance is the
larger of the relative difference in T* and the relative difference in L* (divided by the L* of the row, with a floor of 0.05 for the rows near L =
0), and the closest pair is my orbit with T* = 17.50, L* = 0.078 against the IA-3 row at L = 0.1 (T* = 15.02, L* = 0.088). If repeats of either side
are allowed (n up to 8) the closest is 1.9 %: my orbit with T* = 59.72 and L* = 0.193 against four times the IA-3 row at L = 0.2 (T* = 14.97, L* =
0.190). `tools/liao-distance.py` prints both numbers. None of my orbits matches a printed row, and the 1.9 % is a near coincidence: the T* = 59.72
orbit has 42 syzygies, a syzygy count does not change when an orbit is turned, so four relative periods of any orbit have a multiple of 4 syzygies,
and it cannot be four relative periods of the IA-3 continuation; the IA-3 member with the same L* (0.193) has four times its rotation angle about 0.3
turn from a whole number, so it does not close after four relative periods either. More generally, IA-3 members with a rotation angle -p/q of a turn
(q up to 12) close in the inertial frame after q relative periods, and so do their repeats (up to 4): in the range of the printed rows (L* up to 0.36)
there are 68 such orbits (T* and theta fitted by polynomials through the 8 rows), and the closest of my 102 orbits is 6.8 % away in (T*, L*) (my T* =
70.00 orbit against the member with theta = -1/5 turn at L* = 0.083), so none is one. None of my 85 has the syzygy word root of the IA-3 rows (01012).
`tools/ia3-rational.py` prints this. Beyond L* = 0.36 the family was not followed.

**Rotating figure-eights (2026-10-09).** I followed the choreographic branch of the planar figure-eight in the angular momentum with
`tools/rpo-trace.mjs` (`data/rpo-trace-eightC.json`, results in `data/rpo-eight-results.json`). The trace reaches L* = 0.4103, where it stops by a
step collapse, and the syzygy word is (012)^2 at every checked point. At their L* the branch contains the atlas orbits SN.19, SN.20 and SN.21 as 3, 5
and 2 relative periods (T* to 3e-6 or better from the stored points, n times theta a whole number of turns, 6n syzygies). None of my 77 unmatched
orbits is n relative periods of a member of this branch in that range: 47 have a syzygy count that is not a multiple of 6, 9 are inside the range and
none is close (best 2.9 % in T* and 0.054 turn in n times theta), and 21 have L* above 0.41, outside the trace. For all of them there is a test that
does not depend on the range: an orbit that is m relative periods of a rotating choreography returns after T/(3m) with the bodies renamed cyclically,
up to a rotation (one relative period: T/3; checked with four members of the trace and with repeats of them). None of my 102 orbits (the 85 and the
17 of the arclength list) has such a return for any n up to 60; the smallest mismatch is 9e-2, a member of the branch has 1e-6 or less
(`tools/choreo-test.mjs`, `data/choreo-test.json`). So none of my orbits, the 21 above L* = 0.41 included, is a member of this branch or a repeat of
one. SN.19, SN.20 and SN.21 are atlas
orbits; the papers of Nauenberg (2001) and of Chenciner, Fejoz and Montgomery (2005) on rotating eights are not read yet.

**Counting.** The 85 orbits of the perpendicular search are 6 linearly stable, 77 unstable and 2 uncertain. The satellite work uses 7 stable parents:
those 6 plus the orbit at T* = 29.31 that was found later by continuation (it is not one of the 85). Of the 85, 2 have L = 0 (members of the family
that are also in the L = 0 catalogues) and 6 are atlas orbits.

- All 11 orbits in `src/known.js` (figure-8, butterflies, moths, goggles, dragonfly, bumblebee, yin-yang) close from
  their published start values with residual 1e-10 or better (5e-13 to 8.9e-11 here); `npm test` accepts a residual below 1e-9 and a start that moved
  by less than 0.01.
- **Zero angular momentum.** I scanned the Suvakov-Dmitrasinovic plane at a finer grid than Li and Liao used. Every orbit
  I closed is in Hristov and Hristova's database (arXiv 2404.16526, the 421,562 initial conditions of `60digits.txt`): the eight that were
  not in my own list (seven from the scans, one L = 0 orbit found by the perpendicular search), including two with
  T|E|^1.5 about 79, match to 1e-8 or better. Nothing new there.
- **Non-zero angular momentum.** A Henon-style start (below) gives orbits with L != 0. From 287 starting points (the 319 rows of
  `data/scan-rows-perp.json` hunted once each when u1 and u2 agree to 5 decimals and lam is the same; each hunt had a limit of 300 s),
  111 hunts reached a periodic orbit (rotation angle 0 to the tolerance of the hunt) and 176 did not: 92 ran out of time, 52 did not converge, 16 lost
  the family near a close approach, 15 could not step in lam, 1 start did not close (`why` in `data/hunt-results.jsonl`). So the 85 are what these
  hunts reached, not a count of all orbits of the family. 85 distinct orbits after removing repeats:
  2 have L = 0 (published), 6 are orbits of the Three Body Orbits atlas, **77 match nothing in the atlas**. Of the 85, 54 close to 1e-8 or better with
  two double precision integrators (the 6 stable ones among them; 51 of the 54 in 40 digit arithmetic, see Corrections, 2026-10-09); the other 31 are
  weak (see Known weaknesses).
- **A control.** The search found published L != 0 orbits without being pointed at them: Sheen's "Two ovals",
  and Sheen's "Oval, catface and starship" (matching the atlas to the rounding of its numbers); compared with all 415 atlas entries it also found the
  BHH orbit of Henon (Broucke A1), Broucke A10, and Broucke and Boggs' S4 and S122. Suvakov's SN.9 is not part of this control: it is orbit a01 of the
  arclength list, reached by continuation from the satellites of the CPC table, that is from published orbits (Corrections, 2026-10-10).
- **Linear stability.** 6 of the 85 are stable, 77 unstable, 2 uncertain (the eigenvalue excess is under 10 times the scatter of the trivial
  eigenvalues). All 6 stable
  ones, T* = 4.960 (Broucke A1) and 9.658 (Broucke and Boggs' S4) are atlas orbits and the other 4 are among the 77:

| lam | T* | L* | closest approach |
|---|---|---|---|
| 0.86525 | 4.960 | 1.015 | 0.135 |
| 0.49914 | 9.658 | 1.042 | 0.501 |
| 0.49474 | 17.847 | 2.572 | 0.505 |
| 0.50926 | 19.769 | 2.595 | 0.491 |
| 0.52028 | 33.745 | 2.566 | 0.480 |
| 0.70190 | 47.065 | 2.626 | 0.242 |

  (T* = T|E|^1.5 and L* = |L||E|^0.5 are unchanged when an orbit is rescaled; closest approach is in units where
  the outer two bodies start at distance 2.)
- **Connection to a published family.** The satellites of the BHH family (Jankovic, Dmitrasinovic and Suvakov,
  CPC 2020, tables 3 to 6) are inside my search family. I converted all 99 (98 re-close, and my T* and L* reproduce
  theirs, median relative difference 6e-10 and 1e-10) and followed each one in lam until the rotation angle theta is 0.
  The first attempt (steps in lam, `huntPeriodicMS`) reported 40 of 98 reaching a periodic orbit, but that
  method can jump to another branch, so I redid it with continuation in arclength (below), which can't:
  - Of those 40, arclength gives the same orbit for only 3, a different one for 11 and gets no zero for the
    other 26 (7 ran out of time in both directions, 16 ran out of time one way and lost the family the other way, 2 lost it both ways, 1 found a zero
    that was rejected for its closure error), so those 26 are unchecked. The orbits found the first way are still genuine periodic orbits (they
    close to 1e-11), but I can no longer say they are on the satellite's branch. In particular my earlier statements that
    the k = 3 and 4 satellites end at SN.9, and that satellite N = 9 (k = 5) is connected to 5 times the stable orbit at
    lam = 0.8653, are not supported: theta along the N = 9 branch peaks at -0.07 and never reaches 0, it only passes close.
  - On the 58 that failed before, 13 hunts reached a periodic orbit, 30 ran out of time in both directions and
    the rest lost the family near a close approach. Together with the checked ones that makes **17 distinct orbits**
    reached by continuation (`data/perp-arc-orbits.json`). 2 of them match an atlas orbit under the 1e-5 rule (SN.9, and my stable orbit at T* =
    9.658, which is
    Broucke and Boggs' S4). A third, a08 (T* = 19.8399122, L* = 0.9864022), is close to Sheen's "Three ovals" (T* = 19.8399117, L* = 0.9864605): both
    are periodic orbits with the word (01)^4 and their T* agree to 3e-8, but their L* differ by 5.9e-5. This is not rounding: the data file of the
    atlas orbit gives the same L* from its published and from its refined start values, and its start closes to 1.8e-11 with my integrator. I do not
    know why they differ, so I cannot say whether a08 is known. Of the other 14, 13 match nothing in the atlas or in my first list; a16 (T* = 30.8616,
    L* = 1.4100) is the shortest orbit of t80 of the table (T* = 61.72, a true 2 fold repeat, one of the 77), the same orbit counted twice
    (Corrections, 2026-10-10). Two are linearly stable:
    the T* = 9.658 one already in the table above, and **lam = 0.03231, T* = 29.310, L* = 0.7897** (not in the table).
    The atlas has 14 equal-mass BHH satellites of its own, and 415 equal-mass entries with L != 0 in all; this comparison is with the 99 satellites of
    the CPC table.

- **Topology (syzygy words, `src/topology.js`).** Every time the three bodies are on a line I write down which one is in the
  middle; read around one period that is a cyclic word, and I bring it to a canonical form (relabeling, start point, time
  reversal). Checks: the figure-8 is 012 twice; Butterfly I and II have the same word (so it is a coarse label, it can't tell
  close variants apart); all 98 satellites of Jankovic et al. give the word (01)^k with exactly 2k syzygies, k being their
  topological exponent. Results: all 17 orbits reached by arclength are (01)^k with k from 3 to 14, so they are of the BHH
  satellite type. Of my 85 orbits from the perpendicular search, only 18 are (01)^k; the other 67 have other words
  (for example 000101), so they are not BHH satellites. That says nothing yet about whether they are new, it only says which
  tables could contain them.

- **Satellite families by bifurcation (`src/relative.js`, `src/satellites.js`).** A satellite of order k branches off the k times
  repeated orbit where a rotation number nu of the orbit is m/k. For each of my 7 stable orbits I follow lam (the orbit
  then rotates a little each period), track nu, and at every crossing of m/k follow the k fold repeat until the bordered
  determinant of the shooting system changes sign, then follow the new branch (`tools/nu-crossings.mjs`,
  `tools/satellite-hunt.mjs`). All 7 stable orbits have the word (01)^k, with k = 1, 3, 5, 6, 8, 9, 16, so they are BHH
  orbits (the T* = 4.96 one is the k = 1 BHH orbit itself; T* = 33.745 and 47.065 return after T/9 and T/2, see Repeats below).
  - **Check (recall):** from the T* = 4.96 orbit the branches for k = 4 and 5 pass close to the published satellites N = 6 and N = 9 in (T*, L*)
    (relative distance of the arm to the satellite 7.9e-6 and 2.5e-7). I then compared more than (T*, L*), with the start of the published orbit
    converted into mine:
    - **N = 9 is confirmed.** At lam = 0.71687 the arm has the published start: lam, |u1|, |u2| and t agree to about 1e-5 (the velocities are
      reversed, which is the same orbit), and the word is (01)^5 as published.
    - **N = 6 is partial.** T* and L* agree to 8e-6 and the word is (01)^4 at the nearest point, but the start variables of the interpolated arm
      differ from the published ones by 3.6e-4 (u1), 3.2e-4 (u2) and 1.7e-4 (t, relative); the arm is sampled coarsely and the orbit is very unstable,
      so a Newton step from there does not converge. I have not continued from the published orbit to the arm yet.
    - **N = 1 is not reproduced.** The k = 3 arms are not a satellite: both are the 3 fold repeat curve of the parent (the minimal period of their
      orbits, from `src/covers.js`, is 1/3 of the arm's), and that curve passes 3e-3 from N = 1. An earlier version listed N = 1 among the matches in
      the paragraph about the other branches below, and `data/bifurcation-points.json` showed it as a hit; both are corrected, see Corrections. I do
      not know why the branch switching ends up on the repeat curve for k = 3 and not for k = 4 and 5.
    - **Counting, with one rule (the exclusion of repeat-curve arms from "found" was added after N = 1 turned out to be a repeat curve; the rest was
      fixed before I saw the result):** a satellite is "tested" when its (T*, L*) lies inside the box (2 % margin) spanned by an arm of the same
      exponent k that I followed, and "found" when an arm passes within 5e-3.
      5 of the 99 satellites are tested (N = 1, 2, 3 with k = 3, N = 6 with k = 4, N = 9 with k = 5) and 2 are found (N = 6 and N = 9), of which N = 9
      is confirmed and N = 6 partial. The arms through N = 1, 2 and 3 are repeat curves of the parent, so these three are tested only by arms that are
      not branches; if repeat-curve arms are dropped from both counts, the result is 2 tested and 2 found. N = 2 and N = 3 are 0.07 and 0.08
      (relative, in T* and L*) from the nearest arm, so they are not found. The other 94 satellites are outside every box, there is nothing to compare
      with. (`tools/recall-cpc.py` makes this count and `tools/match-start.py` the comparison of the start values above; the commands are under
      "Reproducing the branch counts" in Running it.)
  - 211 places where a rotation number crosses m/k were found on 4 of the 7 orbits, k up to 20; 136 of them have a branch point. For the other 75 the
    trace of the repeat ran out of its 120 s
    before it reached the end of the window in 74 of them (they took 123 to 166 s), so I do not know if they have one; in the 75th (orbit 0, k = 13, m
    = 5, 144 s) a branch point was found and both of its branches failed; `satellites.js` now records
    `reached` and the time limit is an option, and these jobs have to be redone. The other 3 stable orbits (T* = 19.8, 33.7, 47.1) were scanned later
    with a smaller step (60 more jobs for k up to 8, then 21 verification jobs).
    The 30 jobs with k up to 8 on the first 4 orbits were followed far (`tools/compare-satellites.py`). The branches of the
    orbits at L* = 2.57, 1.04 and 0.79 (k = 3 to 8 repeats, T* from 38 to 207) pass close to no published satellite, nor do the
    k >= 6 branches of the T* = 4.96 orbit. So these are families I can not find in the CPC tables.
    The tables only go to T* about 90, only some of the arms were followed to the end, and nobody expert has looked at
    them, so I'd call them candidates.
  - **Repeats and rotated returns.** 9 of my 85 orbits return to their own start after T/n (`src/covers.js`, columns `repeatOf` and `primitiveTstar`
    in
    `data/orbit-table.csv`; the start values in that file are rounded to 12 digits, so for closure checks of the unstable orbits use the 30 digit
    values in `data/refined/` or the double precision values of `data/orbit-table.json`), turned by an angle. For 3 of them (T* = 39.61, 47.07 and
    61.72, n = 2) the angle is 0: they are true repeats of a shorter periodic orbit.
    For the other 6 (T* = 12.17, 32.31, 33.75, 59.72, 70.00 and 72.47, with n = 3, 2, 9, 3, 4 and 2) the angle is 1/3, 1/2, 2/9, 1/3, 1/4 and 1/2 of a
    turn: the short orbit is only relative periodic (its period `primitiveTstar` is a relative period)
    and the real period is the T of the whole orbit. Two of the 9 are among the 6 stable orbits: T* = 33.745 returns after T/9 turned by 2/9 of a turn
    (relative period T* = 3.7495),
    and T* = 47.065 is a true 2 fold repeat of an orbit with T* = 23.53. None of the 9 shorter orbits is
    among the other 76, so the count of 85 different orbits does not change. The satellite branches of those two "parents" are branches of their n
    fold returns, and their own orbits can be returns of shorter ones again (see the stability paragraph below). T*/k, the quantity used for
    the comparison with the BHH curve, does not change when an orbit is repeated or returns turned. None of the 17 orbits of the arclength list is a
    repeat (I did not test the CPC satellites); one of them, a16, is the shortest orbit of the 2 fold repeat t80 of the table.
    Many orbits also return to their start after T/2 with two bodies swapped; for equal masses that is the same picture, but it is not counted as a
    repeat here (I have not checked which convention the published periods use).

- **Where the stable orbits sit on the BHH curve.** The PRL says all published satellites lie on the same curve of L against T/k as
  the BHH orbits themselves. In my units that curve has T*/k from 1.86 to 4.92 (the 99 satellites of CPC 2020). Three of my stable orbits
  lie on it or close to it (T* = 4.96, 9.66, 29.31), but the four stable orbits at L* about 2.57 to 2.63
  (T* = 17.85, 19.77, 33.75, 47.07, words (01)^5, (01)^6, (01)^9, (01)^16) have T*/k between 2.9 and 3.75, far from any
  CPC satellite (relative distance 0.35 to 0.48; the satellites near L* = 2.6 have T*/k about 1.95). So they are stable orbits with the
  BHH word that are not on the published curve. Two of them (33.75 and 47.07) return after T/9 and T/2 (see Repeats); T*/k does not change under
  repeats. I compare
  the period after which every body is back in its own place. Of 12 published satellites I tested only N = 2 also returns after T/2 with two bodies
  swapped, while the
  T* = 4.96 orbit does, and its period in this convention (4.96, so T*/k = 4.96 for k = 1) fits the satellites of that type (N = 9: 4.84), so I think
  the convention is the same
  and the four orbits really are away from the published points. That is not settled. I do not know if it is the "second stable region" the PRL says
  no satellites were found in.
  The k = 1 orbit family seen through lam (`tools/progenitor-curve.mjs`, `data/progenitor-curve.json`) is stable from lam about 0.822 up to
  at least 0.935 (L* from 1.04 down to 0.83) and unstable below, but this covers only part of the family.

- **Verification of the satellite branches (`tools/verify-branches.mjs`, `tools/check-stability-fd.mjs`).** 36 branch arms (3 branch points
  for each of the 7 stable orbits) were stored with their states and checked (the word at up to 12 points of an arm, the re-closing at its first and
  last point): the syzygy word must be (01)^K with
  exactly 2K syzygies (K = exponent of the progenitor times k), the orbit must close to 1e-9 after re-solving with 16 pieces and a tighter tolerance
  (T* unchanged to 1e-8), and T* and L* must not jump. 30 of the 36 arms pass all three (17 branch points), but 4 of those 30 arms (2 branch points: k
  = 4 at lam = 0.6508 of the T* = 17.85 orbit and k = 3 at lam = 0.6018 of the T* = 33.7 orbit) are the repeat curve of their parent and not branches
  (see Corrections, 2026-10-09), which leaves 26 arms from 15 branch points; the other 6 have a jump of more than
  50 times the median step and two of them also change their word, so I do not trust them (they probably run into a close approach).
  Re-closing: the 72 points (first and last of each of the 36 arms) close to 6e-11 or better (32 of them are above 1e-12). The stability code was also
  checked against a separate finite difference monodromy matrix on four orbits
  (two of them rotating) and agrees to 1e-6 on three and 5e-4 on the fourth.
  - **None of these branches matches a CPC satellite of the same exponent** (the only ones that pass close to a satellite are the arms through N = 6
    and N = 9 from the T* = 4.96 orbit: N = 9 is confirmed and N = 6 partial, see the recall check above). That is mostly "nothing to compare with":
    only 5 of the 99 satellites lie in the (T*, L*) region of an arm that I followed (same exponent, see the recall check), and the others are not
    covered by any arm.
    More precisely: they do not pass within 0.5 % in T* and L* of any CPC satellite with the same k. The only pass within 0.5 % of a satellite with a
    different k in `data/bifurcation-points.json` (rebuilt on 2026-10-09) is N = 77 (k = 37) at 5.7e-4, on the arms of the k = 3 branch of the T* =
    47.065 orbit at lam = 0.7004; the orbits of those arms are 2 fold repeats and their exponent is 24, not 37, so it is not that satellite. (The N =
    93 of the older table was on the arm at lam = 0.6018 that is the repeat curve of its parent; that arm is now dropped.) The CPC table covers T*
    from 9.69 to 109.20 and L* from 0.8385 to 3.2626. Comparisons with it use the primitive (minimal) period for the 85 orbits (`primitiveTstar`,
    repeats of a satellite up to n = 8 are allowed); in the rebuilt table (`tools/bifurcation-table.py`) the arms that are repeat curves of their
    parent are dropped and the other arms are reduced to their primitive period before the comparison; the arms of the older runs (105 of the 276
    branch points) have no stored states and are used as they are.
  - **Stability along the branches:** 23 of the 30 arms have at least one linearly stable sample (`tools/stable-samples.py`). In 21 of the 23 the
    sample at the branch point itself is stable (there the repeat of a stable orbit is stable), in 9 of them it is the only stable one and in 14 there
    are stable samples further along the arm. Without the 4 arms that are the repeat curve of their parent: 19 of 26 arms have a stable sample, in 17
    of them the one at the branch point is stable and in 8 it is the only one.
    I had called one branch stable at every sample, the branch point at lam = 0.6018 of the T* = 33.7 orbit. That was wrong. Its orbits are 27 fold
    repeats of a primitive orbit with the syzygy word 01
    (T* = 2.62 to 3.67, L* = 2.58 to 2.91 over the 797 stored points of its two arms), so the arms are the repeat curve of the parent (a 9 fold
    repeat, times k = 3) and not a branch, and the candidate is withdrawn.
    The orbits along these arms are relative periodic, not periodic: the angle they are turned by after the full period is 0.08 rad at lam = 0.6026
    (T* = 84.9), 1.11 rad at lam = 0.6478 and 2.51 rad at lam = 0.6977,
    equal in size to 27 times the turn after 1/27 of the period (to 1e-6), and it is a multiple of 2 pi only at isolated points. Details are in the
    Corrections of 2026-10-09.
  - **What this does not show:** nothing here is called new. The 2025 paper of Li, Tao, Li and Liao (New Astronomy 119, 102407) continues only the
    figure-eight and IA-3 from L = 0 and lists relative periodic orbits, so it does not decide anything about mine, and nobody expert has looked at
    these.

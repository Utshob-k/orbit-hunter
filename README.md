# Orbit Hunter

A search for periodic orbits of the planar three-body problem with equal masses. A GPU does the rough search in
the browser (WebGPU), double precision code on the CPU closes and checks every candidate.

**Where it stands.** The code reproduces published orbits to about nine digits. Every orbit it found with zero
angular momentum was already published. For non-zero angular momentum it found 85 distinct orbits. 54 of them are
periodic to 1e-8 or better with two integrators (among them the 6 linearly stable ones); the other 31 do not: with the worse of the two integrators 28 of them close to between 1e-8 and 1e-6 and 3 to between 1e-6 and 3.5e-6.
All 85 are refined and periodic to better than 1e-20 in the 30 digit refinement: the 31 and the 6 stable ones on 2026-10-08 and 2026-10-09 (37 orbits), the other 48 on 2026-10-09 (the rule is in the refinement paragraph below).
Among the sources checked so far (all 415 equal-mass orbits with L != 0 of the Three Body Orbits atlas, Davoust and Broucke 1982, the 99 satellites of Jankovic et al. 2020, the 18 rows of Li et al. 2025; the
L = 0 catalogues of Li and Liao and of Hristov and Hristova cannot contain orbits with L != 0), 6 of my 85 orbits are atlas orbits (T* and L* equal to 1e-5 and the same number of alignments): the BHH orbit of Henon (Broucke A1),
Sheen's "Two ovals" and "Oval, catface and starship", Broucke and Boggs' S4 and S122, and Broucke's A10 (in my table it returns rotated by a third of a turn after T/3, see Repeats). 2 have L = 0, and 77 match none of them. Three of the nine rows of Davoust and Broucke 1982
with a rotation angle that is a multiple of 2 pi are in my lists (rows 9, 91, 115), and all three are atlas orbits, so the 77 are not at a row of that paper either. For them I do not know whether they are known.
Not yet checked: Suvakov's gallery, Nauenberg 2001, Chenciner, Fejoz and Montgomery 2005. 35 of the 77 have L* below the range of the CPC table, so for them "no match" with its satellites means "nothing to compare with".
I do not know if any is new, and nothing here should be read as a discovery.

## Results

**Which catalogues contain orbits with L != 0.** Some catalogues only contain L = 0 orbits, so "matches none of them" means nothing for orbits with L != 0. This is what I actually compared against:

| catalogue | orbits with L != 0? | what I did |
|---|---|---|
| Three Body Orbits atlas (threebodyorbits.com) | yes, 415 equal-mass entries with L != 0 in `data.threebodyorbits.com/catalogue.json` on 2026-10-09 (Simo 344, Broucke A 16 and R 13, Broucke-Boggs 2, BHH satellites 14, Suvakov 13, Sheen 11, Rose 2; the list is not stored here, `tools/compare-atlas-all.py` reads the downloaded file; the first run (2026-10-09) was on a list typed from the atlas pages; re-run on `catalogue.json`, same result; that file was generated 2026-09-27, 1,772,587 bytes, sha256 `597c66bd937764825ccaa38da5372d2c71fc6490ab9b09a51902339e5e3c0eb0`) | compared the 85 base orbits and the 17 of the arclength list (`tools/compare-atlas-all.py`): 6 of the 85 match, 77 do not; before 2026-10-09 I had compared with only 37 of the 415 entries, see Corrections |
| Jankovic et al., CPC 2020 | yes, 99 BHH satellites | converted all, 98 close; used for the satellite runs |
| Jankovic et al., PRL 2016 | yes, 57 satellites, all in the CPC list | consistency check only |
| Li and Liao 2017 (695 families) | no, L = 0 | only my L = 0 orbits |
| Hristov and Hristova 2024 (Astronomy and Computing 49, 100880; arXiv:2404.16526), Euler configuration | no, L = 0 | only my L = 0 orbits (abstract of arXiv:2404.16526: "12,431 initial conditions (i.c.s) corresponding to 6,333 distinct solutions"; the database page db2.fmi.uni-sofia.bg/3bodyeuler says "file with 60 digits data in the form (vx, vy, T, T*) ordered by T* for 421,562 i.c.s" and "421,562 Euler i.c.s with T* < 200" for the supplementary pdf; the 12,409 distinct free-fall solutions that Li et al. 2025 cite are from another paper, Hristov et al., Celest. Mech. Dyn. Astron. 136, 7, arXiv:2308.16159, whose abstract says "24,582 i.c.s of equal-mass periodic orbits with scale-invariant period T*<80, corresponding to 12,409 distinct solutions") |
| Suvakov gallery (three-body.ipb.ac.rs) | partly, pictures not numbers | not compared (its site certificate is broken for my tools) |
| Li, Tao, Li and Liao 2025, New Astronomy 119, 102407 (doi:10.1016/j.newast.2025.102407) | equal mass, finite L, but only the figure-eight and IA-3 orbits continued in L from L = 0; 18 rows in the table (10 figure-eight, 8 IA-3), 16 of them relative periodic with rotation angle not 0 | read; not a catalogue; none of my orbits matches a row; the closest is 16.5 % away in (T*, L*), or 1.9 % if repeats are allowed, see below |
| Nauenberg 2001 (Phys. Lett. A 292, 93); Chenciner, Fejoz and Montgomery 2005 (Nonlinearity 18, 1407) | finite L, rotating eights | not read, not compared |

So "77 match nothing" means: nothing among the 415 atlas entries (to 1e-5 in T* and L*, with the same number of alignments; repeats up to 12 times) plus the 99 CPC satellites. Two orbits come close without matching: the T* = 19.41 orbit (L* = 2.22) is 8.5e-4 in T* and 1.0e-3 in L* from Simo's sc022 (three times its period is the period of sc022), and the relative period of my T* = 72.465 orbit (36.23: it returns rotated by half a turn after T/2) is 3.1e-3 and 2.5e-3 away in (T*, L*) from twice the atlas orbit SN.13 (Suvakov's other orbits). SN.13 itself has T* = 18.06 (period 7.1716, E = -1.85094, L = -0.20452, L* = 0.2782, 12 alignments per period); the relative period of my orbit is about twice that (T* = 36.23, ratio 2.006, L* = 0.2790, syzygy word (01010212)^3, 24 syzygies per relative period and 48 per full period). It is not SN.13 run twice: T* and L* differ by 3e-3, far more than the accuracy of the atlas numbers (about 1e-5), and a syzygy word of 24 letters with minimal period 8 cannot be a block of 12 letters followed by the same block, even relabelled or read backwards (`tools/word-square-check.py`; the atlas counts alignments as I count syzygies, it gives 6 for the figure-eight). The word of SN.13 itself, computed from its start values (`tools/sn13-word.mjs`), is (010212)^2 over one period and (010212)^4 over two, with a root of 6 letters; mine is (01010212)^3 with a root of 8. The 24 syzygies per period agree, the words do not, so these are two different orbits and not one orbit 3e-3 off. The letter counts differ as well, and neither relabelling, rotation nor reversal can change them: SN.13 run twice has 8 of each letter (8, 8, 8), mine has 9, 9 and 6. The same holds for the real period 72.465 of my orbit against four periods of SN.13 (16, 16, 16 letters against 18, 18 and 12). What it does not rule out is a period doubled relative of SN.13. The atlas does give the initial conditions, in the data file of the orbit (`data.threebodyorbits.com/orbits/suvakovpc_sn_13.bin`, published and refined values; the layout is in the site's `js/orbit-data.js`); I found this out on 2026-10-09. From the published values E = -1.850943, L = -0.204522 and period 7.171575 give T* = 18.0594 and L* = 0.27825, the numbers of the catalogue, so the comparison above stands. I have not tried to follow one orbit to the other.
It is weaker than it looks: the 99 CPC satellites have L* from 0.8385 (N = 3, the only one below 0.84) to 3.2626 and T* from 9.69 to 109.20, and L* does not change when an orbit is repeated. So the 35 of the 77 unmatched orbits with L* below 0.8385 are not close to any satellite or repeat of one (the closest is 0.11 away in relative terms): for them there was nothing to compare with. The other 42 have L* inside the range of the table; the closest of them to any satellite or repeat of one (n up to 8) is 1.0 % away in (T*, L*), the median is 4.0 %, and none is within 5e-3.

**Li, Tao, Li and Liao 2025** (Xiaoming Li, Yueyan Tao, Xiaochen Li and Shijun Liao, "A numerical scheme to obtain periodic three-body orbits with finite angular momentum", New Astronomy 119 (2025) 102407, doi:10.1016/j.newast.2025.102407). The paper is about equal masses. It continues only two orbits of L = 0, the figure-eight and IA-3, in the angular momentum (L up to 0.07 and 0.35, which is L* up to about 0.08 and 0.36 and T* about 9.2 and 15), and lists relative periodic orbits, closed to 1e-6 in the rotating frame, in a table of 18 rows (the two L = 0 orbits and 16 with rotation angle not 0); the authors say that the full data can be had on request. They write that earlier work on L != 0 concentrated on the figure-eight and BHH families. It is not a catalogue: it continues only two families from L = 0 (its 16 rows with rotation angle not 0 have L != 0 and are relative periodic orbits), so it says nothing about most of my orbits. Integrating the printed start values of the rows (Dormand-Prince and Bulirsch-Stoer give the same; this check is not published): the 10 figure-eight rows return rotated by the printed theta to between 6e-8 and 4e-7, as the paper claims (d < 1e-6). The 8 IA-3 rows return only to between 2e-6 and 1e-4 from the printed 8 digits. These orbits are very unstable (a rounding of 5e-9 in one printed velocity changes the closure by up to 1e-5), which explains the L = 0 row and part of the others but not the largest (1e-4 at L = 0.35); I cannot do better without the unrounded values. With a solver of my own that is not published I reproduce the figure-eight row at L = 0.01 (theta -0.165183 as printed) but not the rows at L = 0.02 and 0.05: my continuation stays on the choreographic branch (the three bodies on one curve: the state after T/3 equals the start relabelled and rotated, to 1e-11), while the printed rows from L = 0.012 on are not choreographic (the same test gives 0.06 to 0.4), as the paper itself says for L = 0.012 (Section 4, p. 5, around Fig. 5: for L = 0.011 the three bodies follow the same orbit, for L = 0.012 they no longer do). In scale free numbers (T*, L*, theta; the raw y1 and T cannot be compared) my L* is 2 % and 6 % away from those rows, consistent with them being on another branch that I did not follow. The IA-3 rows at L = 0.05 and 0.10 are reproduced by the same solver to better than 1e-7 (relative) in T* and L* and 4e-9 in theta, with L taken from the printed start values by the formula of the paper, which is 1e-4 above the printed L for all 7 rows with L > 0 (found from the rows themselves, not fitted to my solver, see below); the other 6 IA-3 rows are not compared. I converted the rows with T* = T |E|^1.5 and L* = |L| |E|^0.5 (check: the figure-eight at L = 0 gives T* = 9.238, IA-3 at L = 0 gives 15.048). The 18 rows were typed in from the PDF and checked against its text (identical); with the formula of the paper, L = y1 y8 + y10, the figure-eight rows give the printed L to 1e-8, and the 7 IA-3 rows with L > 0 give 1.0e-4 more than the printed L (I use the L computed from the rows). Only the derived numbers (T*, L*, rotation angle) will be published, not the table. The rotation angle of my orbits is below 4e-8 (largest |theta| of the 85 and of the 17 of the arclength list: 3.6e-8), and the two orbits of the 85 with L = 0 (T* = 39.64 and 79.25) are not these two orbits. The closest of my 85 and 17 orbits (with T* of the shortest period) to any of the 18 rows is 16.5 % away in (T*, L*): the distance is the larger of the relative difference in T* and the relative difference in L* (divided by the L* of the row, with a floor of 0.05 for the rows near L = 0), and the closest pair is my orbit with T* = 17.50, L* = 0.078 against the IA-3 row at L = 0.1 (T* = 15.02, L* = 0.088). If repeats of either side are allowed (n up to 8) the closest is 1.9 %: my orbit with T* = 59.72 and L* = 0.193 against four times the IA-3 row at L = 0.2 (T* = 14.97, L* = 0.190). None of my orbits matches a printed row, and the 1.9 % is a near coincidence: the T* = 59.72 orbit has 42 syzygies, a syzygy count does not change when an orbit is turned, so four relative periods of any orbit have a multiple of 4 syzygies, and it cannot be four relative periods of the IA-3 continuation; the IA-3 member with the same L* (0.193) has four times its rotation angle about 0.3 turn from a whole number, so it does not close after four relative periods either.

**Rotating figure-eights (2026-10-09).** I followed the choreographic branch of the planar figure-eight in the angular momentum with `tools/rpo-trace.mjs` (`data/rpo-trace-eightC.json`, results in `data/rpo-eight-results.json`). The trace reaches L* = 0.4103, where it stops by a step collapse, and the syzygy word is (012)^2 at every checked point. At their L* the branch contains the atlas orbits SN.19, SN.20 and SN.21 as 3, 5 and 2 relative periods (T* to 3e-6 or better from the stored points, n times theta a whole number of turns, 6n syzygies). None of my 77 unmatched orbits is n relative periods of a member of this branch in that range: 47 have a syzygy count that is not a multiple of 6, 9 are inside the range and none is close (best 2.9 % in T* and 0.054 turn in n times theta), and 21 have L* above 0.41 and are not tested. SN.19, SN.20 and SN.21 are atlas orbits; the papers of Nauenberg (2001) and of Chenciner, Fejoz and Montgomery (2005) on rotating eights are not read yet.

**Counting.** The 85 orbits of the perpendicular search are 6 linearly stable, 77 unstable and 2 uncertain. The satellite work uses 7 stable parents:
those 6 plus the orbit at T* = 29.31 that was found later by continuation (it is not one of the 85). Of the 85, 2 have L = 0 (members of the family
that are also in the L = 0 catalogues) and 6 are atlas orbits.

- All 11 orbits in `src/known.js` (figure-8, butterflies, moths, goggles, dragonfly, bumblebee, yin-yang) close from
  their published start values with residual 1e-10 or better. `npm test` checks this.
- **Zero angular momentum.** I scanned the Suvakov-Dmitrasinovic plane at a finer grid than Li and Liao used. Every orbit
  I closed is in Hristov and Hristova's database (arXiv 2404.16526, the 421,562 initial conditions of `60digits.txt`): the eight that were
  not in my own list (seven from the scans, one L = 0 orbit found by the perpendicular search), including two with
  T|E|^1.5 about 79, match to 1e-8 or better. Nothing new there.
- **Non-zero angular momentum.** A Henon-style start (below) gives orbits with L != 0. From 287 starting points,
  111 hunts reached a periodic orbit (rotation angle 0 to the tolerance of the hunt), 85 distinct orbits after removing repeats:
  2 have L = 0 (published), 6 are orbits of the Three Body Orbits atlas, **77 match nothing in the atlas**. Of the 85, 54 close to 1e-8 or better with two integrators (the 6 stable ones among them); the other 31 are weak (see Known weaknesses).
- **A control.** The search found published L != 0 orbits without being pointed at them: Sheen's "Two ovals",
  Sheen's "Oval, catface and starship", and Suvakov's SN.9 (matching the atlas to the rounding of its numbers); compared with all 415 atlas entries it also found the BHH orbit of Henon (Broucke A1), Broucke A10, and Broucke and Boggs' S4 and S122.
- **Linear stability.** 6 of the 85 are stable, 77 unstable, 2 uncertain (the eigenvalue excess is under 10 times the scatter of the trivial eigenvalues). All 6 stable
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
    reached by continuation (`data/perp-arc-orbits.json`). 2 of them match an atlas orbit under the 1e-5 rule (SN.9, and my stable orbit at T* = 9.658, which is
    Broucke and Boggs' S4). A third, a08 (T* = 19.8399122, L* = 0.9864022), is close to Sheen's "Three ovals" (T* = 19.8399117, L* = 0.9864605): both are periodic orbits with the word (01)^4 and their T* agree to 3e-8, but their L* differ by 5.9e-5. This is not rounding: the data file of the atlas orbit gives the same L* from its published and from its refined start values, and its start closes to 1.8e-11 with my integrator. I do not know why they differ, so I cannot say whether a08 is known. The other 14 match nothing in the atlas or in my first list. Two are linearly stable:
    the T* = 9.658 one already in the table above, and **lam = 0.03231, T* = 29.310, L* = 0.7897** (not in the table).
    The atlas has 14 equal-mass BHH satellites of its own, and 415 equal-mass entries with L != 0 in all; this comparison is with the 99 satellites of the CPC table.

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
    (relative distance of the arm to the satellite 7.9e-6 and 2.5e-7). I then compared more than (T*, L*), with the start of the published orbit converted into mine:
    - **N = 9 is confirmed.** At lam = 0.71687 the arm has the published start: lam, |u1|, |u2| and t agree to about 1e-5 (the velocities are reversed, which is the same orbit), and the word is (01)^5 as published.
    - **N = 6 is partial.** T* and L* agree to 8e-6 and the word is (01)^4 at the nearest point, but the start variables of the interpolated arm differ from the published ones by 3.6e-4 (u1), 3.2e-4 (u2) and 1.7e-4 (t, relative); the arm is sampled coarsely and the orbit is very unstable, so a Newton step from there does not converge. I have not continued from the published orbit to the arm yet.
    - **N = 1 is not reproduced.** The k = 3 arms are not a satellite: both are the 3 fold repeat curve of the parent (the minimal period of their orbits, from `src/covers.js`, is 1/3 of the arm's), and that curve passes 3e-3 from N = 1. An earlier version listed N = 1 among the matches in the paragraph about the other branches below, and `data/bifurcation-points.json` showed it as a hit; both are corrected, see Corrections. I do not know why the branch switching ends up on the repeat curve for k = 3 and not for k = 4 and 5.
    - **Counting, with one rule (the exclusion of repeat-curve arms from "found" was added after N = 1 turned out to be a repeat curve; the rest was fixed before I saw the result):** a satellite is "tested" when its (T*, L*) lies inside the box (2 % margin) spanned by an arm of the same exponent k that I followed, and "found" when an arm passes within 5e-3.
      5 of the 99 satellites are tested (N = 1, 2, 3 with k = 3, N = 6 with k = 4, N = 9 with k = 5) and 2 are found (N = 6 and N = 9), of which N = 9 is confirmed and N = 6 partial. The arms through N = 1, 2 and 3 are repeat curves of the parent, so these three are tested only by arms that are not branches; if repeat-curve arms are dropped from both counts, the result is 2 tested and 2 found. N = 2 and N = 3 are 0.07 and 0.08 (relative, in T* and L*) from the nearest arm, so they are not found. The other 94 satellites are outside every box, there is nothing to compare with. (The scripts for the start comparison are not in the repository yet.)
  - 211 places where a rotation number crosses m/k were found on 4 of the 7 orbits, k up to 20; 136 of them have a branch point. For the other 75 the trace of the repeat ran out of its 120 s
    before it reached the end of the window (every one of them took 123 to 166 s), so I do not know if they have one; `satellites.js` now records
    `reached` and the time limit is an option, and these jobs have to be redone. The other 3 stable orbits (T* = 19.8, 33.7, 47.1) were scanned later with a smaller step (60 more jobs for k up to 8, then 21 verification jobs).
    The 30 jobs with k up to 8 on the first 4 orbits were followed far (`tools/compare-satellites.py`). The branches of the
    orbits at L* = 2.57, 1.04 and 0.79 (k = 3 to 8 repeats, T* from 38 to 207) pass close to no published satellite, nor do the
    k >= 6 branches of the T* = 4.96 orbit. So these are families I can not find in the CPC tables.
    The tables only go to T* about 90, only some of the arms were followed to the end, and nobody expert has looked at
    them, so I'd call them candidates.
  - **Repeats and rotated returns.** 9 of my 85 orbits return to their own start after T/n (`src/covers.js`, columns `repeatOf` and `primitiveTstar` in
    `data/orbit-table.csv`), turned by an angle. For 3 of them (T* = 39.61, 47.07 and 61.72, n = 2) the angle is 0: they are true repeats of a shorter periodic orbit.
    For the other 6 (T* = 12.17, 32.31, 33.75, 59.72, 70.00 and 72.47, with n = 3, 2, 9, 3, 4 and 2) the angle is 1/3, 1/2, 2/9, 1/3, 1/4 and 1/2 of a turn: the short orbit is only relative periodic (its period `primitiveTstar` is a relative period)
    and the real period is the T of the whole orbit. Two of the 9 are among the 6 stable orbits: T* = 33.745 returns after T/9 turned by 2/9 of a turn (relative period T* = 3.7495),
    and T* = 47.065 is a true 2 fold repeat of an orbit with T* = 23.53. None of the 9 shorter orbits is
    among the other 76, so the count of 85 different orbits does not change. The satellite branches of those two "parents" are branches of their n fold returns, and their own orbits can be returns of shorter ones again (see the stability paragraph below). T*/k, the quantity used for
    the comparison with the BHH curve, does not change when an orbit is repeated or returns turned. None of the 17 orbits of the arclength list is a repeat (I did not test the CPC satellites).
    Many orbits also return to their start after T/2 with two bodies swapped; for equal masses that is the same picture, but it is not counted as a repeat here (I have not checked which convention the published periods use).

- **Where the stable orbits sit on the BHH curve.** The PRL says all published satellites lie on the same curve of L against T/k as
  the BHH orbits themselves. In my units that curve has T*/k from 1.86 to 4.92 (the 99 satellites of CPC 2020). Three of my stable orbits
  lie on it or close to it (T* = 4.96, 9.66, 29.31), but the four stable orbits at L* about 2.57 to 2.63
  (T* = 17.85, 19.77, 33.75, 47.07, words (01)^5, (01)^6, (01)^9, (01)^16) have T*/k between 2.9 and 3.75, far from any
  CPC satellite (relative distance 0.35 to 0.48; the satellites near L* = 2.6 have T*/k about 1.95). So they are stable orbits with the
  BHH word that are not on the published curve. Two of them (33.75 and 47.07) return after T/9 and T/2 (see Repeats); T*/k does not change under repeats. I compare
  the period after which every body is back in its own place. Of 12 published satellites I tested only N = 2 also returns after T/2 with two bodies swapped, while the
  T* = 4.96 orbit does, and its period in this convention (4.96, so T*/k = 4.96 for k = 1) fits the satellites of that type (N = 9: 4.84), so I think the convention is the same
  and the four orbits really are away from the published points. That is not settled. I do not know if it is the "second stable region" the PRL says no satellites were found in.
  The k = 1 orbit family seen through lam (`tools/progenitor-curve.mjs`, `data/progenitor-curve.json`) is stable from lam about 0.822 up to
  at least 0.935 (L* from 1.04 down to 0.83) and unstable below, but this covers only part of the family.

- **Verification of the satellite branches (`tools/verify-branches.mjs`, `tools/check-stability-fd.mjs`).** 36 branch arms (3 branch points
  for each of the 7 stable orbits) were stored with their states and checked (the word at up to 12 points of an arm, the re-closing at its first and last point): the syzygy word must be (01)^K with
  exactly 2K syzygies (K = exponent of the progenitor times k), the orbit must close to 1e-9 after re-solving with 16 pieces and a tighter tolerance
  (T* unchanged to 1e-8), and T* and L* must not jump. 30 of the 36 arms pass all three (17 branch points), but 4 of those 30 arms (2 branch points: k = 4 at lam = 0.6508 of the T* = 17.85 orbit and k = 3 at lam = 0.6018 of the T* = 33.7 orbit) are the repeat curve of their parent and not branches (see Corrections, 2026-10-09), which leaves 26 arms from 15 branch points; the other 6 have a jump of more than
  50 times the median step and two of them also change their word, so I do not trust them (they probably run into a close approach).
  Re-closing: the 72 points (first and last of each of the 36 arms) close to 6e-11 or better (32 of them are above 1e-12). The stability code was also checked against a separate finite difference monodromy matrix on four orbits
  (two of them rotating) and agrees to 1e-6 on three and 5e-4 on the fourth.
  - **None of these branches matches a CPC satellite of the same exponent** (the only ones that pass close to a satellite are the arms through N = 6 and N = 9 from the T* = 4.96 orbit: N = 9 is confirmed and N = 6 partial, see the recall check above). That is mostly "nothing to compare with": only 5 of the 99 satellites lie in the (T*, L*) region of an arm that I followed (same exponent, see the recall check), and the others are not covered by any arm.
    More precisely: they do not pass within 0.5 % in T* and L* of any CPC satellite with the same k. The only pass within 0.5 % of a satellite with a
    different k in `data/bifurcation-points.json` is N = 93 (4.5e-3), on the arm at lam = 0.6018 that is the repeat curve of its parent (so not a branch); an earlier version also listed N = 69, which was on an arm that the cut at closure 1e-7 now discards. The CPC table covers T* from 9.69 to 109.20 and L* from 0.8385 to 3.2626. Comparisons with it use the primitive (minimal) period for the 85 orbits (`primitiveTstar`, repeats of a satellite up to n = 8 are allowed); the comparison of the branch arms in the table of this version does not reduce them to their primitive period yet, a rebuilt table that does is to follow.
  - **Stability along the branches:** 23 of the 30 arms have at least one linearly stable sample, but at most of them it is the sample at
    the branch point itself, where the repeat of a stable orbit is stable. This count was made before 4 of the 30 arms were found to be repeat curves of their parent, and I have not redone it without them.
    I had called one branch stable at every sample, the branch point at lam = 0.6018 of the T* = 33.7 orbit. That was wrong. Its orbits are 27 fold repeats of a primitive orbit with the syzygy word 01
    (T* = 2.62 to 3.67, L* = 2.58 to 2.91 over the 797 stored points of its two arms), so the arms are the repeat curve of the parent (a 9 fold repeat, times k = 3) and not a branch, and the candidate is withdrawn.
    The orbits along these arms are relative periodic, not periodic: the angle they are turned by after the full period is 0.08 rad at lam = 0.6026 (T* = 84.9), 1.11 rad at lam = 0.6478 and 2.51 rad at lam = 0.6977,
    equal in size to 27 times the turn after 1/27 of the period (to 1e-6), and it is a multiple of 2 pi only at isolated points. Details are in the Corrections of 2026-10-09.
  - **What this does not show:** nothing here is called new. The 2025 paper of Li, Tao, Li and Liao (New Astronomy 119, 102407) continues only the figure-eight and IA-3 from L = 0 and lists relative periodic orbits, so it does not decide anything about mine, and nobody expert has looked at these.

## Prior work I know of

- Hénon 1976, Broucke 1975 and Hadjidemetriou 1975: the BHH family. Davoust and Broucke 1982 (Astronomy and Astrophysics 112, 305): "A manifold of periodic orbits
  in the planar general three-body problem with equal masses", the first satellite (k = 3) and families followed by continuation (I have the page scans from ADS, bibcode 1982A&A...112..305D, there is no text version, so I read the tables by eye from the scan images).
- Janković, Dmitrašinović and Šuvakov (PRL 2016, CPC 2020): about 100 satellites of the BHH family by brute force search. I do not know of work that follows their
  satellite branches by continuation from the stable BHH orbits, other than the first satellite and the families in Davoust and Broucke 1982.
- Li and Liao and others: thousands of orbits since 2017, as far as I can see in their public data zero angular momentum or 3D, or unequal masses. Their 2025 paper on
  finite angular momentum (New Astronomy 119, 102407) continues the figure-eight and IA-3 orbits from L = 0 (18 rows in a table, the rest on request). In it they write that
  work on L != 0 had so far concentrated on the figure-eight and BHH families. Nauenberg 2001 and Chenciner, Fejoz and Montgomery 2005 (rotating eights) I have not read.

So the continuation of satellite branches is not new as a method (Davoust and Broucke did it); what is done here is the systematic search for the places where branches leave the
repeats of the stable orbits, with the checks described below.

- **Families of Davoust and Broucke (1982).** All their tables of initial conditions were typed in from those ADS scans (Tables 2 to 7, 130 orbits of the families A1, A2, B, a to d, alpha, beta,
  D1 to D4, E, e to k, F, G, H, `data/db82-table*.json`), checked every row against the printed value of -27 C^2 H (which equals L*^2/9 in my units; the few misread
  digits were repaired with `tools/check-db82.py`), converted them into my start (`tools/convert-db82.mjs`) and 118 of the 130 rows close to 1e-9 or better, with L* and the
  rotation angle agreeing with the printed ones (the other 12 are rows 23, 43, 46, 54, 69, 70, 82, 85, 87, 88, 106 and 118: close encounters or a misread digit). Nine of their orbits have a rotation angle that is a multiple of 2 pi to the printed digits, so they are
  periodic (rows 9, 44, 45, 49, 52, 67, 91, 97, 115). Three of them are in my lists: rows 9, 91 and 115, and all three are atlas orbits (row 9 is Sheen's "Two ovals", row 115 his "Oval, catface and starship", and **row 91 (T* = 9.6584,
  L* = 1.0418) is my stable orbit at lam = 0.49914**, which is Broucke and Boggs' S4 of the atlas and so was published in 1975 and again in 1982).
  Checks of the transcription: all 130 rows were compared with the printed value of -27 C^2 H; 12 rows differ from it by more than 2e-6 (rows 17, 21, 22, 23, 34, 55, 69, 78, 82, 121, 122, 123; this is not the same set of 12 as the rows that do not close, only rows 23, 69 and 82 are in both), none of them among the nine, which agree to 8e-8 or better.
  Exactly nine rows have a printed half rotation angle within 1e-2 of a multiple of pi, and my own conversion gives no other. The nine rows were read twice from the same ADS scan, the second time without looking at the first: 50 of the 54 numbers are identical (rows 9, 91 and 115 completely),
  of the 4 that differ 3 are settled by the printed invariant (rows 45 and 49: the first reading) and one is not (row 52, last digit of the first velocity, 3 or 5, an effect of 2e-7 that does not change any result). Both readings come from the same scan, so this checks consistency, not the scan itself.
  The other six are not in my lists, so my own search misses periodic orbits that are known (`tools/compare-db82.py`, `data/db82-rotation-multiple-2pi.json`).
  Following the families A1, A2 and B with the continuation (`tools/trace-family.mjs`): A1 has one periodic orbit (the row 9 orbit), A2 none, B three (T* = 21.6615 with closure
  5e-9, and two weak ones at 21.911 and 28.478, `data/db82-family-orbits.json`). So three of my orbits are rows of that paper, all three atlas orbits. For the others I did not find out in this version whether they lie on families of that paper: the traces of A1, A2 and B
  contain none of them, but I followed only these three of its families, and my own search misses periodic orbits that are known (the other six rows above). It is undetermined here; traces of more families that I have run but not published yet put at least two more of my orbits on curves traced from rows of that paper, with a different syzygy word than the row they start from, so I do not call that a match.

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
`test/topology.test.js` (figure-8 and k = 3 satellite words), `test/covers.test.js` (repeats), `test/relative.test.js` (rotating orbit: trivial eigenvalues, agreement with finite differences) and `test/closure.test.js` (the closure tiers) and `test/shooting.test.js` (multiple shooting gives the same orbit as single shooting; the tangent equals a finite
difference). Against the atlas my stability numbers match to four digits for the three re-found orbits
(|lambda|max 1.409, 19.55, 9.860).

## Corrections

Statements of mine that were wrong, newest first. The dates are those of the commits or, for 2026-10-09, of the day of the change.

- **2026-10-09, repeats, and the A10 and sc022 identifications.** The README said that 9 of my 85 orbits are n fold repeats of shorter orbits and that their real periods are the short ones. A review checked the turn angle after T/n: it is 0 for only 3 of the 9 (T* = 39.61, 47.07 and 61.72). For the other 6 it is 1/3, 1/2, 2/9, 1/3, 1/4 and 1/2 of a turn, so the short orbit is only relative periodic and the real period is the full T. The comparisons with the atlas gave the same numbers, but two sentences had the direction wrong. My T* = 12.17 orbit is Broucke's A10 (it was written as A10 run 3 times). Simo's sc022 has three times the period of my T* = 19.41 orbit (it was written as three times sc022). The SN.13 comparison used the relative period 36.23 of my T* = 72.465 orbit. The conclusion stands for the real period too: four periods of SN.13 have 16, 16 and 16 letters in the word, my orbit has 18, 18 and 12.
- **2026-10-09, small numbers, from the same review.** The median distance of the 42 unmatched orbits inside the L* range of the CPC table is 4.0 %, not 4.3 %. Re-closing was checked at the first and last point of each of the 36 arms, which is 72 points (32 above 1e-12, the largest 5.8e-11), not 108 points. Of the 17 arclength orbits, 2 match the atlas under the 1e-5 rule (SN.9 and S4). a08 is close to Sheen's "Three ovals" (T* equal to 3e-8, both with the word (01)^4) but its L* is 5.9e-5 away, which is not rounding (the atlas gives the same L* from its published and its refined start values) and which I cannot explain, so "3 of the 17 are known" was too strong: 2 match, and a08 is unresolved. The column `group` of `data/orbit-table.*` still held the retracted 81 unmatched orbits and is now 77 unmatched, 6 atlas and 2 with L = 0. The sentence about satellite passes with a different k named N = 69, which is not in the current data (only N = 93 is, and it is on the withdrawn arm).
- **2026-10-09, the distance to the rows of Li et al.** The 16.5 % was computed with no repeats on either side, while the atlas and CPC comparisons allow repeats. With repeats of either side up to 8, the closest is 1.9 % (my orbit with T* = 59.72 and L* = 0.193 against four times the IA-3 row at L = 0.2). Neither number is a match (1e-5) to a printed row. That orbit is not IA-3 repeated four times: it has 42 syzygies, and four relative periods of any orbit have a multiple of 4 (a syzygy count does not change when an orbit is turned); the IA-3 member with the same L* (0.193) has four times its rotation angle about 0.3 turn from a whole number. The 1.9 % is a near coincidence.
- **2026-10-09, the recall count.** "Tested" counts the arms that turn out to be repeat curves of the parent, "found" does not; the second part was added after N = 1 turned out to be a repeat curve (the first version counted it as found), although the text calls the rule one that I do not change. With this rule the result is 5 tested and 2 found, as written. If repeat-curve arms are dropped from both, it is 2 tested and 2 found. The script of the count is not in the repository yet.
- **2026-10-09, "81 of the 85 are not in the atlas" (wrong in the README at commit 96fec98).** I had compared my orbits with 37 of the 415 equal-mass orbits with L != 0 of the Three Body Orbits atlas (the BHH satellites, Suvakov's orbits and Sheen's). With all 415 (`data.threebodyorbits.com/catalogue.json`, read by `tools/compare-atlas-all.py`; the list itself is not stored here), four more of my orbits are atlas orbits: T* = 4.960 (Broucke A1, the BHH orbit of Henon), T* = 9.658 (Broucke and Boggs' S4, my row 91 of Davoust and Broucke), T* = 13.986 (Broucke and Boggs' S122) and the T* = 12.17 orbit (Broucke A10 run 3 times). So 6 of the 85 are atlas orbits and 77, not 81, match none; the "row 91 is not in the atlas" and "all 6 stable orbits are among the 81" statements were wrong as well.
- **2026-10-09, the closure range of the 31 orbits (wrong in the README at commit 96fec98).** The first paragraph and the entry below say that the other 31 orbits close "only to between 1e-8 and 1e-6 in double precision". That is wrong for 3 of them: with the worse of the two integrators 28 close to between 1e-8 and 1e-6 and 3 to between 1e-6 and 3.5e-6 (Bulirsch-Stoer; Dormand-Prince alone is at most 7.7e-8).
- **2026-10-09, the sentence about Li et al. 2025 (wrong in the README at commit 96fec98).** I wrote that the paper "is not a catalogue of periodic orbits with L != 0". Its 16 rows with rotation angle not 0 do have L != 0 and are relative periodic orbits. What is true is that it continues only two families, the figure-eight and IA-3, from L = 0.
- **2026-10-09, what the 421,562 counts (wrong in the README at commit 96fec98).** I wrote that I did not know what the 421,562 rows of `60digits.txt` count. The page of the database says "file with 60 digits data in the form (vx, vy, T, T*) ordered by T* for 421,562 i.c.s" and, for the supplementary pdf, "421,562 Euler i.c.s with T* < 200": initial conditions, not distinct orbits.
- **2026-10-09, a file name.** `data/db82-exactly-periodic.json` is renamed `data/db82-rotation-multiple-2pi.json` (the orbits of Davoust and Broucke whose rotation angle is a multiple of 2 pi), and the phrase "exactly periodic" is removed from comments of the scripts and from descriptions in data files.
- **2026-10-09, the lam = 0.6018 branch and the repeat check.** My check of the minimal period of the arms (a script that is not published yet) tested repeat counts only up to 24. The T* = 33.745 parent is a 9 fold repeat, so the repeat curve of its k = 3 branch is a 27 fold repeat. The check could not see 27: it reported 9, and the arm was counted as a branch. With the limit raised to 200, the orbits of both arms at lam = 0.6018 are 27 fold repeats of a primitive orbit with the syzygy word 01. Over the 797 stored points of the two arms (lam 0.530 to 0.698) its T* is 2.62 to 3.67 and its L* is 2.58 to 2.91. After 1/27 of the period the state is the start turned by an angle, with a residual of 1.1e-9 at worst over the 797 points (7e-11 at three of them). As an independent test I followed the parent's own family in lam from its start values, without the arm data: at four lam of the arm that goes to larger lam (0.6018, 0.6026, 0.6478, 0.6977) it gives the same start values and period to 1e-10 or better. So the arms are the repeat curve of the parent and not a branch, and the candidate "stable at every sample" is withdrawn. The old values T* = 8.46 to 10.40 were the T* of the arm divided by 9 instead of 27; L* does not change with the repeat count. I redid the check for all 312 arms with stored states. The number of arms on the repeat curve of their parent went from 36 to 54, all 18 new ones belong to the T* = 33.745 parent (k = 3, 4, 7, 11 and 12), and no arm of another parent changed. The recall check against the CPC table (5 tested, 2 found) does not change.
- **2026-10-09, "exactly periodic".** The first paragraph of this file said that the search found 81 exactly periodic orbits, which gave the 81 orbits that I could not match to the atlas as the number found (there are 85 distinct ones), and other places called the orbits exactly periodic. What the checks support: of the 85 distinct orbits, 54 close to 1e-8 or better with two integrators (the six linearly stable ones among them), and 31 close only to between 1e-8 and 1e-6 in double precision. These 31 and the 6 stable ones are refined, and are periodic to better than 1e-20 in the 30 digit refinement; the other 48 are not refined. I no longer use "exactly periodic" for any of them. The closure tiers were introduced on 2026-10-08 (commit 1e9c02a), the refinement of the 7 stable orbits on 2026-10-08 (commit b412011), the refinement of the 31 weak ones was done on 2026-10-08 and its files are added on 2026-10-09.
- **2026-10-09, the N = 1 match.** A branch from the 3 fold repeat of the T* = 4.96 orbit passes 3e-3 from the published satellite N = 1 (CPC 2020), and I listed N = 1 among the matches (here, and as a hit in `data/bifurcation-points.json`, where the original value is still visible). Both arms of that branch point are the 3 fold repeat curve of the parent, not a satellite, so N = 1 is not reproduced.
- **2026-10-08, a candidate branch.** I described the branch at lam = 0.6018 of the T* = 33.745 orbit by the period of a 9 fold repeat (T* = 77 to 93, exponent 27). Its orbits are 9 fold repeats of shorter orbits (primitive T* = 8.46 to 10.40, L* = 2.61 to 2.80, word (01)^3). Fixed in commit fff46ba.
- **2026-10-07, SN.9 and N = 9.** I stated that the k = 3 and 4 satellites end at SN.9 and that satellite N = 9 (k = 5) is connected to 5 times the stable orbit at lam = 0.8653. The continuation I used could jump to another branch; redone in arclength, the claims are not supported (commit 117e23b).

## What is not proven

- "Not in the atlas" is not "new". The atlas has 415 equal-mass orbits with L != 0 (344 of them Simo's), and Jankovic et al. report about 100 satellites.
  Their list is only in the paper's tables, and the paper does not cover everything. Butterfly II, a published orbit, is
  also missing from the Li-Liao table.
- Following the high-k satellites (about 56 of the 98) to a zero of theta took more than the 5 minutes
  per direction I gave each start, so for those I do not know if they reach a periodic orbit. A few others lost the family
  near a close approach (lam near 0.25 to 0.5 or near 1), which may be where the branch really ends.
- **Refinement to 30 digits (`tools/refine-mp.py`, `tools/check-refined.mjs`, `data/refined/`).** Newton's method with a multiple precision integrator (Gragg-Bulirsch-Stoer, target accuracy 30 digits, working precision 40 digits) on the
  four symmetry conditions (back on the x axis with all velocities along y at the half period), started from the double precision orbit. Done for the 6 stable orbits of the 85, the T* = 29.31 stable orbit of the arclength
  list, all 31 weak orbits of the 85, and (2026-10-09) the other 48 unstable reliable orbits of the 85. An orbit counts as refined when the final residual is below 1e-23, the full period closes to better than 1e-20 in the multiple precision integrator, and the refined orbit is
  the same one (T* and L* agree to 1e-6, same syzygy word, same repeat count). **All 86 orbits pass: they are periodic to better than 1e-20 in the 30 digit refinement** (worst final residual 6.3e-25 at T* = 60.66, worst closure of the
  full period 8e-21, largest change of a start value 7e-8). Of the 85: all 85 are refined (6 stable, 31 weak and 48 unstable reliable orbits); the 86th is the T* = 29.31 one, which is not among the 85.
  The 48 were added on 2026-10-09 with the thresholds above fixed before the run (the code of `tools/check-refined.mjs` was not changed): no failure, no timeout (limit 2 hours each, all 48 were done in about 16 minutes with 10 at a time, the longest one took 4 minutes), worst final residual 8.6e-30, worst closure of the full period 9.7e-22,
  largest change of a start value 1.4e-8, T* and L* equal to the table to 4e-10 or better, the same word and repeat count for all 48.
  The threshold for the final residual was first 1e-25 in the checker; T* = 60.66 ended at 6.3e-25 and was flagged, and I raised the threshold to 1e-23 after seeing that (the refinement itself stops at 1e-24),
  so that threshold was changed after the result (for the 31 and the 6 and the T* = 29.31 orbit; not for the 48). Values: `data/stable-orbits-30digits.json` (the stable ones), `data/refined/*.json`, `data/refined/weak/*.json` and `data/refined/reliable/*.json`, summary in `data/refined/summary.json`.
- **How well the orbits close.** The 7 stable orbits close to 5e-10 or better with two independent integrators (Dormand-Prince 5(4) and
  Gragg-Bulirsch-Stoer, `tools/check-closure-bs.mjs`). The unstable ones are much weaker. With Dormand-Prince 23 of the 85 close worse than 1e-9,
  6 worse than 1e-8 and the worst is 7.7e-8 (max norm, rotation removed); with Bulirsch-Stoer 11 are worse than 1e-7 and the worst is 3.5e-6 (columns `closureDP45` and `closureBS`
  in `data/orbit-table.csv`). For a strongly unstable orbit the instability multiplies the rounding error, so double precision cannot show that it
  is periodic; those orbits need high precision arithmetic before anyone should call them that (all 85 are refined, see above).
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

## Running it

```
npm test                       # all the tests, a few minutes, node 18+
python -m http.server          # then open http://localhost:8000 (needs WebGPU)
```

The page scans a region and draws the map. Click a light spot to refine it, or press "Deep scan" to run the whole pipeline.
Both families are in the "family" menu.

Useful scripts in `tools/` (all print what they do at the top):

- `hunt-all.mjs` hunts periodic orbits from a list of starts on worker threads; add `ms` to use multiple shooting or `arc` for arclength continuation (`HUNT_ONLY=list.json` picks starts)
- `summarize-hunt.mjs` removes repeats and marks atlas matches; `stability-list.mjs` computes stability
- `convert-cpc.mjs` turns the paper's satellite table into my start; `compare-*.mjs` compare orbits with the published lists
- `plot-orbits.mjs`, `plot-perp.mjs` draw orbits as svg (figures/)

## Data

| file | what it is |
|---|---|
| `data/perp-periodic*.json`, `hunt-results.jsonl`, `stability-perp-3.json` | my orbits and their stability |
| `data/hunt-cpc-*.jsonl`, `cpc-converted.json` | the continuation from the paper's satellites (`hunt-cpc-arc*.jsonl` is the arclength one) |
| `data/perp-arc-orbits.json`, `stability-arc.json` | the 17 orbits reached by arclength continuation and their stability |
| `data/cpc2020-satellites.json`, `liliao.json`, `threebodyorbits-equalmass-L.json` (37 entries, the first comparison; the 415 entries of the second one are not stored, see the atlas row above) | **other people's numbers**, copied from Jankovic et al. 2020, Li and Liao 2017 and threebodyorbits.com |
| `data/db82-table*.json` (tables 2 to 7, 130 rows) | **other people's numbers**, typed in from the scan of Davoust and Broucke 1982 (A&A 112, 305); `data/db82-*-converted.json` are my conversions of them |

## License

Creative Commons Attribution 4.0 (CC BY 4.0), see LICENSE. You can use, copy and change the code, the results and the orbit
lists as long as you credit Utshob Kandel and link to https://github.com/Utshob-k/orbit-hunter (see CITATION.cff).
The files marked above as other people's numbers (including the rows of Davoust and Broucke 1982) belong to their authors, cite them if you use them.

## Known weaknesses

Found in an independent review of the code and in my own checks; what is fixed and what is not:

- **Closure rule (fixed, with consequences).** One rule now decides every list (`src/closure.js`, `tools/closure-tiers.mjs`): an orbit is *reliable* when it closes to 1e-8 or better
  (largest position or velocity difference after one period, best rotation removed) with both integrators, *weak* when it closes to 1e-6 with Dormand-Prince only. Of the 85 orbits of the
  perpendicular search **54 are reliable and 31 are weak** (column `closureTier` of `data/orbit-table.csv`); the 6 stable ones are all reliable. Only reliable orbits should be called periodic to 1e-8;
  all 85 were refined to 30 digits (see the refinement above). All 17 orbits of the arclength list are reliable.
- **Closure columns (fixed).** `closureDP45` and `closureBS` are both max norms with the best rotation removed; the columns ending in `raw` leave the rotation in.
- **Matching with the CPC list (partly fixed).** Both scripts now cut an arm at the first bad point. For the 116 branch points that have a published satellite with the same k to compare with,
  the closest distance in (T*, L*) is 2.5e-7 (N = 9), 7.9e-6 (N = 6), 3.0e-3 (N = 1, but that arm is the 3 fold repeat curve of the parent, not a satellite; the entry is marked in `data/bifurcation-points.json`), and then 0.15 or more, with a median of 0.92 (`same_k_closest` in `data/bifurcation-points.json`),
  so the tolerance of 5e-3 does not decide any match. Still open: nothing checks that an arm is not just the repeat of a shorter branch, and the matching compares curves sampled
  with large gaps (the largest step between samples is 0.34).
- **Branch points (partly fixed).** New runs store how well the branch point was located (`bisected`, `width`, `nullSolved`). Still open: two branch points closer than one step cancel in
  the sign test, a symmetric degenerate point gives no sign change, and only mirror symmetric branches can be found. The word along an arm is now checked at up to 12 points (30 of the 36
  verified arms still pass). The one arm with a 104 degree turn (T* = 33.75, k = 3, lam = 0.5566) is a fold: lam turns back while T* and L* continue smoothly.
- **Stability (partly fixed).** "The four eigenvalues closest to 1 are the trivial ones" is checked in two ways now: the other four must form reciprocal pairs, and the fifth closest must be at least
  10 times farther from 1 than the fourth; otherwise the orbit is called uncertain unless max |l| is above 2. This changes no label (85 orbits: 6 stable, 77 unstable, 2 uncertain; arclength list:
  2 stable, 15 unstable). The finite difference check uses the same reduction and eigenvalue solver, so it confirms the matrix and not the stable/unstable decision.
- **Integrators (mostly fixed).** `monodromy` and `sampleOrbit` now stop when a step produces nan or the step size collapses; a few other loops with step caps can still run for a long time near collisions.

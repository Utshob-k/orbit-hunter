# Reproducing the numbers

This file holds a part of the former README, moved here on 2026-10-10 without changing it (only headings were added). Paths such as `tools/...` and `data/...` are from the top folder of the repository. "Corrections" in the text means the log in [CHANGELOG.md](../CHANGELOG.md); the other sections of the former README are in this folder (see [README.md](../README.md)).

## Running it

```
npm test                       # all the tests, about 10 seconds, node 18+
python -m http.server          # then open http://localhost:8000 (needs WebGPU)
```

The page scans a region and draws the map. Click a light spot to refine it, or press "Deep scan" to run the whole pipeline.
Both families are in the "family" menu.

Useful scripts in `tools/` (all print what they do at the top; run them from the top folder of the repository, many read `data/...` by a relative
path):

- `hunt-all.mjs` hunts periodic orbits from a list of starts on worker threads; add `ms` to use multiple shooting or `arc` for arclength continuation
  (`HUNT_ONLY=list.json` picks starts)
- `summarize-hunt.mjs` removes repeats and marks atlas matches; `stability-list.mjs` computes stability
- `convert-cpc.mjs` turns the paper's satellite table into my start; `compare-*.mjs` compare orbits with the published lists
- `plot-orbits.mjs`, `plot-perp.mjs` draw orbits as svg (figures/)
- `closure-mp.py` integrates the double precision starts of the 85 orbits for one period in 40 digits (about 6 minutes; `--write` stores
  `data/closure-mp.json`)
- `ia3-rational.py` puts the IA-3 members with a rational rotation angle (q up to 12) next to my orbits, in the range of the printed rows
- `family-follow.mjs` follows the family of relative periodic orbits through one orbit in one direction and records T*, L*, theta, closest approach,
  closure, word and stability at every step; `r-family.mjs` checks the members of the family of Broucke's R orbits through my T* = 33.745 orbit
  against the atlas (by key, give the path of `catalogue.json`) and against Table 5 of Davoust and Broucke 1982
- `branch-point.mjs` solves the branch point of a satellite on the family of Broucke's R orbits (the member with nu = 1/n, the two null vectors of its
  n fold repeat, the satellite followed to its periodic orbit; a few minutes, `--control` adds the repeat direction, `--write` stores
  `data/branch-points/<n>-upper.json` or `<n>-lower.json` (`<k>-<n>-<branch>-<theta>.json` for k > 1), theta chooses between the two nu of the stable
  stretch, `--k=K` follows nu = K/n, `--repeat-tol=1e-8` relaxes the residual accepted for the n fold repeat (needed from n = 27), `--pieces=P` forces
  the number of pieces of the repeat (16 from n = 29)); `nu-map.mjs` lists the 41 members of the family where a nu of the stable stretch is k/n (n up
  to 12, `--max=N` goes further) and which of them were followed; `branch-summary.mjs` prints how every continuation of `data/branch-points/` ended (a
  rotation 0 reached, or the limit that stopped it) and checks the ends of the control continuations (`--write` stores `data/branch-summary.json`);
  `db82-bifurcations.mjs` puts the bifurcation points of the family D1 of Davoust and Broucke (rows 63 to 65 of their Table 5, branches e, f and E)
  next to the members with nu = 1/3 and their satellite curves; `satellite-sequence.mjs` prints the table of the zeros of the upper branch (T* and L*
  of the 30 digit orbits where there are some, largest multiplier, closure, the rotation left at the stored zero, closest approach, the prediction of
  T* from the R member); `satellite-relations.mjs` prints the empirical relations of `docs/r-family-satellites.md` (fits on n <= 20, tests on n > 20);
  `satellite-test2.mjs` applies predictor B to the zeros with k > 1; `satellite-tests.mjs` prints their robustness (leave one out, trailing windows),
  the table of the heuristic delta_n = C eps_n and the comparison with the relation of the PRL type, with the rules in
  `docs/rules/rules-relation-tests.txt` (the rules of the out of sample run of n = 37 to 56 and of test 2 are in `docs/rules/rules-test1-test2.txt`;
  the bisection for the zero of theta is `src/zero.js`, tested in `test/zero.test.js`); `cpc-rows.mjs` closes the 99 rows of the CPC tables again and
  compares them with the traced curve of Henon's family, with the satellite curves of R (rules in `docs/rules/rules-cpc-curves.txt`) and by their
  co-rotation share (about 20 seconds); `thesis-orbit-test.mjs` takes the printed start values of an orbit as arguments, tests it for a repeat and
  compares it with the branch point of the R member with the same nu = 1/k (rules in `docs/rules/rules-thesis-k39.txt`; the traced families come from
  `family-follow.mjs`); `corotation-trace.mjs` follows the family through A1 and writes the share along it (about a minute; the output file must be
  new); `satellite-candidates.mjs` and `satellite-check.py` recompute the numbers of the 54 orbits of the satellite curves of
  `data/satellite-candidates.json` and compare them with other lists (the second needs `pip install rebound numpy`) 
- `choreo-test.mjs` looks for a cyclic return after T/n (n up to 60) of the 102 orbits, a rotating choreography has one; a plain run prints the
  counts, `--write` stores `data/choreo-test.json`
- `compare-hristov.mjs path/to/100_12431.txt` compares the orbits with the database of Hristov and Hristova (arXiv 2404.16526; the file is not stored here)
- `compare-hristov-big.mjs path/to/60digits.txt T* ...` lists the rows of their big file (421,562 rows) whose T* is closest to the given values
- `compare-threebodyorbits.mjs` compares the 11 orbits of `data/perp-periodic.json` with equal mass L != 0 orbits copied by hand from threebodyorbits.com (the first atlas comparison)
- `compare-unmatched.py` compares the unmatched orbits with the 99 CPC satellites, allowing n fold repeats of either one (n up to 8)
- `make-catalog.mjs path/to/3-body-14.tex` builds `data/liliao.json` from the TeX source of arXiv 1705.00527
- `closure-stored.py` integrates the 30 digit start values stored in `data/refined` for one period (about 6 minutes; `--write` stores
  `data/closure-stored.json`), `stable-samples.py` counts the stable samples on the branch arms; `orbit-table.mjs`, `check-refined.mjs`,
  `arm-repeat-check.mjs` and `verify-branches.mjs` write their result files, so tracked files change when they run
- `rebound-check.py` closes the orbits and computes the monodromy matrix of the stable ones with REBOUND (`pip install rebound numpy`; a plain run
  prints the result, `--write` stores `data/rebound-check.json`)
- `family-one.mjs` follows the family through one start in both directions (`run-jobs.mjs` runs a list of them), `published-hits.mjs` lists which of
  my orbits are on the traces of `data/families85/`, `family-pass-through.mjs` follows the family from my orbit and asks whether it passes a published
  start

Short checks of the symmetries of R, of the satellite curves and of the long runs (version 0.2.30; each prints its numbers, nothing is written to `data/`):

- `half-period-check.mjs` writes the state of R at the half period t again as a perpendicular start (`half-start.mjs`) for the 242 points of `data/r-family-trace.json`
  and gives the largest difference to the start (5e-10, 7e-8, 8e-10, 1e-8 in u1, u2, lam, t); it also lists which body is where at t (a few seconds)
- `isosceles-check.mjs` tests whether the state at a quarter and at three quarters of the relative period is an isosceles state, with body 0 as the apex
  (largest errors 1.2e-8 in the positions and 2.5e-9 in the velocities on the 242 points; bodies 0 or 1 as the apex are the control) (a few seconds)
- `two-senses-check.mjs` takes the zero of one sense of the satellite curves of n = 5 to 15 to the half period and compares it with the zero of the other sense
  (largest difference 1.9e-9 in u1, u2, lam and 1.7e-9 relative in t; the half turn variant differs by more than 1.1) (a few seconds)
- `long-run-rebound.py 1000 out-1000.json` (also 10000; `pip install rebound numpy`; the output file must be new) integrates the stable orbits n = 5 to 12
  for K periods with REBOUND in double precision, as they are and with a perturbation of 1e-8 (largest distance to the start 1.1e-8, drift of the energy and
  of the angular momentum at most 8.4e-14 and 4.3e-14 for 10000 periods; the perturbation grows linearly in the number of periods) (about 3 minutes for 10000 periods)
- `results-numbers.mjs` runs `satellite-sequence.mjs` and `satellite-candidates.mjs` and prints the ranges of T*, L*, the multipliers and the closures of the 52 end orbits, the
  end orbit against its member of R (T*/n lower by 2.34e-3 at n = 5, 1.63e-5 at n = 56; L* lower by 0.0219 and 1.3660) and the words of the 49 orbits (about 40 seconds)

**Reproducing the branch counts.** The runs that follow the branches (`satellite-hunt.mjs`, hours) are not repeated here; their results are in
`data/satellite-results*.jsonl` (results 5 to 7 have the numbers rounded to 14 significant digits by `tools/thin-results.py`, because the file of the
last run was 5.3 MB; the repeat checks, the table, the recall count and the coverage give the same numbers on the full and on the rounded files, and
the verification of all 312 arms was run again on the rounded files with the same result for every check). From these:

```
node tools/arm-repeat-check.mjs data/satellite-results7.jsonl 0 25    # also 25 50 and 50 73
                                                                      # results6: 0 40, 40 80, 80 121; results5: 0 44; results4: 0 21
python tools/arm-repeats-summary.py   # 312 arms with stored states, 54 of them on the repeat curve of their parent
python tools/recall-cpc.py            # 99 satellites, 5 tested, 2 found (N = 6 and N = 9)
python tools/bifurcation-table.py     # 276 branch points; keeps the retraction of N = 1
python tools/branch-census.py         # branch points by what is known about their arms
node tools/verify-branches.mjs data/satellite-results7.jsonl    # slow: about 30 minutes for results7, 1.5 hours for results6 on my machine
                                                                # same for results6, results5, results4
python tools/verify-summary.py        # 238 of 312 arms pass all checks, 139 branch points with such an arm
python tools/cpc-coverage.py          # 31 of the 139 overlap the region of the CPC table, 1 has a satellite of its exponent to compare with
python tools/match-start.py data/satellite-results7.jsonl 9 0 5 0.8583     # N = 9; N = 6 is: 6 0 4 0.87667
python tools/liao-distance.py         # 16.5 % and 1.9 % from the rows of Li et al. 2025 (uses data/liao2025-scaled.json)
node tools/return-test.mjs           # returns after T/n for the 102 entries (100 distinct orbits): 9 in their own places, 25 with some symmetry; of the 91 distinct unmatched ones 8 in their own places
                                     # the atlas status of the arclength orbits comes from data/return-test.json (or from the downloaded catalogue if its path is given); --write stores the result
python tools/henon-family-compare.py # the 8 + 9 unmatched orbits that return, against the family of Henon 1976
```

`tools/rpo.mjs reproduce IA-3` (about 10 minutes) and the other scripts on the printed rows of Li et al. need `data/liao2025-table1.json`, the table
typed in by the reader; they say so and stop without it. `data/rpo-reproduce-*.json` has the numbers of my run.

## The tables, figures and checks of the satellites (version 0.2.28)

Commands from the top folder of the repository. They read the files of `data/`; nothing is written unless `--write`, `--out` or an output path is given, and an output file that exists is never overwritten. The short ones take seconds to a minute. The long computations (hours) are not repeated: their outputs are the data files in the last column. The checks made for the release, with the rules written before them, are in `docs/rules/rules-release-0.2.28.txt` and `docs/rules/results-release-0.2.28.txt`; the class I runs for n = 13 to 20 (version 0.2.29) are in `docs/rules/rules-class-i-13-20.txt` and `docs/rules/results-class-i-13-20.txt`.

| item | command | data |
|---|---|---|
| Table 1: T*, L*, nu1 and nu2 (n = 5 to 12) or the largest multiplier, senses with rotation 0, n = 5 to 56 | `node tools/tables.mjs 1` (runs `tools/satellite-sequence.mjs`) | `data/stability-mp/class-c/` |
| Table 2: the end orbits of class I, n = 5 to 12, and their differences from the class C orbits (a second block for n = 13 to 20, where both orbits are unstable) | `node tools/tables.mjs 2` | `data/class-i/`, `data/stability-mp/class-c/` |
| Table 3: the largest error of the three predictions of T* (no correction, the first order prediction of Henon's relation, B) by range of n | `node tools/relation-b-table.mjs` (the lines "largest \|e\|") | `data/branch-points/`, `data/satellite-candidates.json` |
| B with the exact member instead of the interpolated one | `node tools/relation-b-exact-members.mjs` | |
| the relations, their robustness, the tests on k > 1 (errors are data minus prediction, zero - B) | `node tools/satellite-relations.mjs`, `node tools/satellite-tests.mjs`, `node tools/satellite-test2.mjs` | |
| Figures 1 to 3 (T*/n against L*; the two families for n = 5; the dip of the rotation) | `node tools/figures.mjs [1\|2\|3] [--out=DIR]` | `figures/satellites-period-vs-L.svg`, `class-i-pair-n5.svg`, `satellites-rotation-dip.svg` |
| the supplement: start values of the 52 satellites and the 16 end orbits of class I (n = 5 to 20) | `node tools/supplement.mjs [--write] [--out=file]` | `data/supplement-initial-conditions.json` |
| Henon's relation on the stored curves: the integral, the slope at the branch point, the signs, the dip | `node tools/henon-integral-check.mjs`, `henon-slope-check.mjs`, `henon-sign-check.mjs`, `henon-dip-check.mjs` | |
| class I: the trace of R in the isosceles description and the check that it reproduces every member | `node tools/iso-trace.mjs [out.json]`, `node tools/iso-check-multipliers.mjs` | `data/r-family-trace-iso.json` |
| class I: a branch point and its satellite curves, both senses (n = 5: about 40 seconds, n = 12: minutes, n = 13 to 20: 24 to 47 minutes with 16 jobs running; theta of n = 13 to 20: 0.0772, 0.0717, 0.0669, 0.0627, 0.0590, 0.0557, 0.0528, 0.0501) | `node tools/branch-point-iso.mjs 5 0.2010 --pieces=8 --out=out.json` (theta as for `branch-point.mjs`; `--out` writes the result, no `--write`) | `data/class-i/curves/` |
| class I: refinement to 30 digits, REBOUND, the multipliers in multiple precision (about 6 minutes) | `python tools/iso-refine.py out.json refined.json 30`, `python tools/iso-rebound.py refined.json`, `python tools/iso-monodromy-mp.py refined.json stability.json` | `data/class-i/refined/`, `rebound/`, `stability/` |
| class I: the curves of n = 5 against the stored curve of class C; the end orbits against the class C orbits, the atlas list and the CPC rows | `node tools/iso-compare-curves.mjs`, `node tools/iso-end-orbit-check.mjs refined.json orbit-c.json n --atlas=file` (the atlas list is not stored here) | `data/class-i/check/` |
| class I: the sixteen end orbits (n = 5 to 20) in one file | `node tools/class-i-partners.mjs [--write] [--out=file]` | `data/class-i/partner-orbits.json` |
| class I: the summary of every n from the stored files (zeros of the senses, end orbit, multipliers of class I and class C, REBOUND, symmetry class, atlas and CPC, the criterion of the rules) | `node tools/class-i-summary.mjs [from [to]]` (13 to 20 by default) | `data/class-i/`, `data/stability-mp/class-c/` |
| class C: the multipliers in multiple precision (cases 5 6 7 8s 8d 9 10 11 12, tiers A and B, 3 to 16 minutes per tier; cases 13 to 20, tier A only, 50 to 59 minutes each with 16 jobs running) | `python tools/monodromy-mp.py 5 A --out=DIR` | `data/stability-mp/class-c/` |
| the extended trace of R: nu along the 109 new points and the crossings of 1/n for n >= 59 (the tracer is `tools/family-follow.mjs`, unchanged; the two commands are in the field `what` of the data file) | `node tools/r-trace-nus.mjs` | `data/r-family-trace-extended.json`, `data/r-family-trace-extended-nus.txt` |
| the 19 regenerated zero files against the stored ones | `node tools/zero-regenerated-compare.mjs` | `data/branch-points-regenerated/` |

The start formats: the perpendicular start (class C) has the bodies on the x axis at -1 - lam/3, lam - lam/3 and 1 - lam/3 with the velocities (0, u1), (0, u2) and (0, -u1 - u2); the isosceles start (class I) has body 0 at (1, 0), bodies 1 and 2 at (-1/2, h) and (-1/2, -h) and the velocities (0, w), (p, -w/2) and (-p, -w/2). G = m = 1, the relative period is 2t, and the values in the files are strings with 30 digits. `tools/refine-mp.py`, `tools/monodromy-mp.py` and `tools/iso-refine.py` need `mpmath`, `tools/iso-rebound.py` and `tools/rebound-check.py` need `rebound` and `numpy`.

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
  stretch); `nu-map.mjs` lists the 41 members of the family where a nu of the stable stretch is k/n (n up to 12) and which of them were followed;
  `branch-summary.mjs` prints how every continuation of `data/branch-points/` ended (a rotation 0 reached, or the limit that stopped it) and checks
  the ends of the control continuations (`--write` stores `data/branch-summary.json`); `db82-bifurcations.mjs` puts the bifurcation points of the
  family D1 of Davoust and Broucke (rows 63 to 65 of their Table 5, branches e, f and E) next to the members with nu = 1/3 and their satellite curves;
  `satellite-candidates.mjs` and `satellite-check.py` recompute the numbers of the ten orbits of the satellite curves of
  `data/satellite-candidates.json` and compare them with other lists (the second needs `pip install rebound numpy`)
- `choreo-test.mjs` looks for a cyclic return after T/n (n up to 60) of the 102 orbits, a rotating choreography has one; a plain run prints the
  counts, `--write` stores `data/choreo-test.json`
- `closure-stored.py` integrates the 30 digit start values stored in `data/refined` for one period (about 6 minutes; `--write` stores
  `data/closure-stored.json`), `stable-samples.py` counts the stable samples on the branch arms; `orbit-table.mjs`, `check-refined.mjs`,
  `arm-repeat-check.mjs` and `verify-branches.mjs` write their result files, so tracked files change when they run
- `rebound-check.py` closes the orbits and computes the monodromy matrix of the stable ones with REBOUND (`pip install rebound numpy`; a plain run
  prints the result, `--write` stores `data/rebound-check.json`)
- `family-one.mjs` follows the family through one start in both directions (`run-jobs.mjs` runs a list of them), `published-hits.mjs` lists which of
  my orbits are on the traces of `data/families85/`, `family-pass-through.mjs` follows the family from my orbit and asks whether it passes a published
  start

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

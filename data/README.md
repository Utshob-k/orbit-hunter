# Data

What each file in this folder is. The files marked "other people's numbers" belong to their authors, cite them if you use them. Moved from the former README on 2026-10-10.

| file | what it is |
|---|---|
| `data/perp-periodic*.json`, `hunt-results.jsonl`, `stability-perp-3.json` | my orbits and their stability |
| `data/hunt-cpc-*.jsonl`, `cpc-converted.json` | the continuation from the paper's satellites (`hunt-cpc-arc*.jsonl` is the arclength one) |
| `data/perp-arc-orbits.json`, `stability-arc.json` | the 17 orbits reached by arclength continuation and their stability |
| `data/satellite-results*.jsonl`, `satellite-jobs*.json` | the branch arms followed from the repeats of the 7 stable orbits (results 5 to 7 rounded to 14 digits, see Running it); `*.repeats-*.json`, `arm-repeats.json` the minimal period of the arms, `*.verified.json`, `verified-branch-points.json` their checks, `bifurcation-points.json` the table of branch points |
| `data/families85/*.json`, `family-pass-through.json` | traces of the families that start at six published orbits (from the exact start, not moved) and the check from my side; the starts are my conversions of rows of Davoust and Broucke 1982 and of the CPC satellite N = 3 |
| `data/return-test.json`, `henon1976-derived.json`, `henon-family-curve.json` | the return test of my 102 entries (85 + 17, 100 distinct orbits; rotation, relabelling, reflection, reversal after T/n); **derived numbers** (L*, T*, alignments) and the printed rotation angle of the 46 tabulated orbits of Henon 1976 and points of the family traced from them; the printed start values are not stored |
| `data/r-family-trace.json`, `r-family-members.json` | the family of relative periodic orbits through the shortest orbit of my T* = 33.745 orbit (T* = 3.7495, rotation 2/9 of a turn): 242 accepted steps of the trace (derived numbers of my own runs) and the 19 members solved at the rotation angles of the R orbits of the atlas and of rows of Davoust and Broucke 1982 (start values, my own numbers; the atlas and the rows are referred to by key and number) |
| `data/branch-points/*.json`, `nu-map.json`, `branch-summary.json`, `satellite-candidates.json`, `satellite-check.json` | the 20 branch points of satellites on the family R with k = 1 (one file each: member, singular values, directions, the satellite and control curves followed to their zeros of theta or to the limit that stopped them, my own runs, about 3 MB in all), the 41 crossings of nu = k/n, how every continuation ended, and the seven orbits with rotation angle 0 on the satellite curves (30 digit start values) with the REBOUND check |
| `data/choreo-test.json` | the result of `tools/choreo-test.mjs`: no orbit has a cyclic return, the smallest mismatches, and the four members of the rotating eight branch used as a control |
| `data/closure-stored.json` | the closure of the 30 digit start values as stored in `data/refined`, integrated in 50 digits (`tools/closure-stored.py`) next to the number written into the files |
| `data/closure-mp.json` | the closure of the 85 orbits from their double precision start values in 40 digit arithmetic (`tools/closure-mp.py`) next to the columns `closureDP45` and `closureBS` |
| `data/rebound-check.json` | the result of `tools/rebound-check.py`: closure of the 102 entries (100 distinct orbits) with REBOUND (IAS15) from the start values, and the multipliers of the 7 stable ones |
| `data/liao2025-scaled.json`, `rpo-reproduce-*.json` | **derived numbers** (T*, L*) and the printed L and rotation angle of the 18 rows of Li et al. 2025 and of my runs next to them; the table itself is not stored |
| `data/cpc2020-satellites.json`, `liliao.json`, `threebodyorbits-equalmass-L.json` (37 entries, the first comparison; the 415 entries of the second one are not stored, see the atlas row above) | **other people's numbers**, copied from Jankovic et al. 2020, Li and Liao 2017 and threebodyorbits.com |
| `data/db82-table*.json` (tables 2 to 7, 130 rows) | **other people's numbers**, typed in from the scan of Davoust and Broucke 1982 (A&A 112, 305); `data/db82-*-converted.json` are my conversions of them |

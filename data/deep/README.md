# data/deep

The data of the ias route (see [docs/deep.md](../../docs/deep.md)): the traces of four families, the witnesses of their points, the re-closed stretches, the table of every trace of the group, run or not run, and the numbers that the tests of `npm run test:ias` compare with. About 1.5 MB in all. The files are under CC BY 4.0.

## Traces, witnesses, re-closed stretches

The four families are t35 -, t44 -, t62 - and t72 - (the label `t35m` is the family t35 followed in the direction of falling lam; `m` and `p` are the two directions). Every file is compact json written by `tools/family-follow-ias.mjs` and `tools/witness.py` after they were reduced to the fields below; the complete outputs are not stored here.

- `traces/<label>.json`: the points of the trace (loop step, lam, u1, u2, t, T*, L*, theta, turns, closest approach, closure), the start, the direction, the ratio of guard G1b, the guard counts, why the trace stopped and the accepted steps that could not be recorded (`unrecorded`, with their start values). 481 kB (t35m, 1690 points), 358 kB (t44m), 106 kB (t62m), 92 kB (t72m).
- `witnesses/<label>.json`: for every witnessed point (`<label>-k<index>` for a recorded point, `<label>-u<step>` for an unrecorded step) the start values and the results of `tools/witness.py` for the presets w1 and w1b: smallest pair distance (`dmin_parabolic`), closure of the full period, relative change of the energy and of the angular momentum, seconds. w1b is there only where the w1 minimum was below 1e-7. `python tools/trace-witnesses.py reading data/deep/witnesses/<label>.json` gives the reading (strict depth, turns) from this file alone. 29 kB, 46 kB, 118 kB, 115 kB.
- `reclose/<label>.json`: the accepted steps (and the midpoints between consecutive steps) that were closed again at the same lam by `tools/reclose.py`: start values, re-closed values, number of updates, residual, whether it is the same orbit, and for the midpoints the w1b witness at the re-closed values. t35m: 25 steps and 24 midpoints; the others: 3 steps and 2 midpoints each; all 64 converged. 31 kB, 4 kB each.
- `traces-table.json` and `traces-table.csv`: the 19 traces of the group, 15 run and 4 not run (the start orbit trips guard G2), with the start values, direction, how the start was found, why the trace stopped, the number of points, the run time in seconds, the ratio K of guard G1b of the code that ran the trace (`guard_ratio`; 400 for the two traces of the first group, 390 for the others, empty if not run), the strict witnessed depth, the turn and the further turns, and the number of points whose closure failed. In the json the rows of the last group also name the row of `data/orbit-table.json` that the start comes from (`start_file`, `start_row`, counted from 0; the start in the table is that row closed again by the code at 24 pieces, `start_note` gives the largest change). 17 kB and 3 kB.

The complete outputs behind these files (the full results of `tools/witness.py` and `tools/reclose.py`, including the end states, 989 files, 7 MB) are deposited with the paper and not in the repository.

## For the tests and the sample run

- `witness-acceptance.json`: the multiple precision flow of `tools/refine-mp.py` (50 digits, tolerance 1e-30, step floor 1e-20) against the exact Kepler flow of `tools/kepler-ref.py`,
  one period of a near-radial pair with periapsis distance q = 1e-7 to 1e-10. `tools/witness-acceptance.py` reruns it and compares (`test/witness-acceptance.test.js`).
- `gate-a-subset.json`: seven rows of the test of `src/ias/reg.js` against the exact Kepler flow of the pair: masses, start state, interval, the exact end state as a double-double
  (`ref_hi` + `ref_lo`), the sensitivity S and the floor of the limit, and the stored end state and error (`test/gate-a.test.js`).
- `gate-a-all.json`: the 80 rows of `tools/gate-a-rows.py` with the error, limit, zone and end state of the stored run (`node tools/gate-a.mjs rows.json --stored data/deep/gate-a-all.json`).
- `reclose-t35m-gap.json`: accepted steps 9, 10 and 11 of a continuation of the family t35 - (start values), the same orbits re-closed at the same lam by `tools/reclose.py`, and the witness minimum
  of the pair distance and the closure of the start values from `tools/witness.py --preset w1b` (`test/reclose.test.js`).
- `t35m-replay.json`: the start of that continuation, its first 10 recorded points on the machine of the stored run and the loop steps of the accepted steps that were not recorded there; `test/replay.test.js` takes the start from here and compares the accepted steps of the continuation (lam, u1, u2, t) with `traces/t35m.json` to 1e-9 relative, and `node tools/deep-sample.mjs` takes its start from here.
- `henon-t35m.json`: the stored median and largest deviation from Hénon's relation dT* = -pi L* d(turns) between consecutive points of `traces/t35m.json` (`test/henon.test.js`).
- `sample/expected-summary.txt`: the summary that `node tools/deep-sample.mjs` has to print; `sample/output.txt` is the whole output of the stored run with the times (the name of its temporary folder is replaced by `<temp folder>`).

The numbers were computed on Windows 11 with Node v24.15.0, Python 3.14.6, REBOUND 5.2.2 and mpmath 1.4.1. On that machine the end states of `src/ias/reg.js` and the replayed accepted steps are equal to
the stored ones bit for bit; on another platform the end states can differ in the last digits, so the tests with exact equality also accept small relative differences where the file says so.

## Extra files for the numbers of the paper

Compact copies of results that the text of the paper uses and that are not behind a test (`data/deep/extra/`, 129 kB, each file has a `what` field).

- `extra/piece-scan.json`: the scan of 9016 pieces of the multiple shooting against the multiple precision flow (counts by group and by the smallest pair minimum of the piece, the 18 pieces with an error of 1e-12 or more, the 69 kept points that were scanned) and the one event with an error far above the corrector tolerance: piece 18 of kept point 11 of the trace of t35 -, an unflagged IAS15 piece after the encounter piece, 1.18e-7.
- `extra/gate-a-extension.json`: 44 rows of the test of `src/ias/reg.js` against a 40 digit flow (periapsis distance q = 1e-4 to 1e-3, third body at R, ratios R/measured from 50 to 3300), all within the limit, and the value K = 390 of guard G1b derived from them.
- `extra/closure-failed.json`: the 15 stored points of t28 - and t81 + whose witnessed closure is 1e-6 or more, refined at the same lam in multiple precision (stored values, refined values, change, the witness of the rounded refined orbit). The multipliers of these points are not given: they failed their quality checks.
- `extra/old-variants.json`: seven earlier runs of the Dormand-Prince code of version 0.2.33 (t19 -, t35 +, t35 - with the corrector tolerance 1e-11; the same and a14 + with 1e-10): where each lost the family (the closest approach of the tool at the last point, `end_d`, a tool value that is not witnessed) and the end of its reliable stretch as read then (`endx`). The numbers of `docs/deep.md` line 3 are the range of `end_d`.
- `extra/w1c-gap.json`: the witness minimum at accepted steps 9, 10 and 11 of t35 - with the 50 digit flow and with a 60 digit flow (relative differences 6.6e-6, 3.7e-5, 7.5e-8).

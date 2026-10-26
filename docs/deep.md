# The ias route (PeriCont, version 0.3.0)

The close-approach route of the perpendicular start is called PeriCont (version 0.3.0); in the code and in the settings it is the ias route. It goes through close approaches of two bodies to witnessed pair distances of 7.320e-10, 1.907e-9, 8.573e-9 and 1.611e-8 on four families. Version 0.2.33 and the default of 0.3.0 use the Dormand-Prince code of `src/physics.js`; in the earlier runs of `data/deep/extra/old-variants.json` the closest approach of the tool (a tool value, not witnessed) at the point where it lost the family was 3.8e-4 to 8.1e-4 on t19 -, t35 + and t35 - with the default corrector tolerance 1e-11, and 1.2e-4 to 2.6e-4 on t19 -, t35 +, t35 - and a14 + with the tolerance 1e-10 (the run of a14 + used tighter integrator tolerances). In the corrector of the ias route the end state of every piece of the multiple shooting comes from REBOUND IAS15, and the pieces with a close pair are recomputed with the regularised integrator `src/ias/reg.js`; T* and L* of every accepted step come from the start values alone, and the closest approach and the closure of a recorded point from the Dormand-Prince code (section "Which integrator gives which number"). The results that come out are checked afterwards by a flow in multiple precision (the witnesses, `tools/witness.py`), which does not use any of this code. The limits are in [methods-and-limits.md](methods-and-limits.md) (section "The ias route"). Paths are from the top folder of the repository.

## What it needs

Node v24.15.0 (the only version this route was run with; Node 18 or newer for the DP45 code), Python with `rebound` and `mpmath` (the stored runs used 3.14.6, REBOUND 5.2.2, mpmath 1.4.1, numpy 2.5.3):

```
pip install rebound==5.2.2 mpmath==1.4.1 numpy==2.5.3
npm test                 # the tests of the default route (Dormand-Prince), 10 to 20 seconds
npm run test:ias         # the tests of this route, 4 to 6 minutes
```

The route is off unless asked for. `settings.integrator` in `src/settings.js` is `'dp45'` (default) or `'ias'`; the environment variable `ORBIT_INTEGRATOR=ias` sets it from the shell. `ORBIT_PYTHON` names the python executable (default `python` on Windows, `python3` elsewhere). `tools/family-follow-ias.mjs` sets it itself.

## Which integrator gives which number

- From IAS15 and `reg.js`: the end states of the pieces in the corrector (`reg.js` for the encounter pieces and for the pieces replaced by the cross-check), and the rotation angle theta made from them.
- From the start values alone, without any integration: the energy E, the angular momentum L, T* = 2t |E|^1.5 and L* = |L| |E|^(1/2) of every accepted step, recorded or not (`perpEL` in `src/perp.js`; it uses the same sums as `perpInfo`, so its values equal the `ts` and `ls` of `perpInfo` bit for bit). L has a sign (negative on t35 -); the traces store L* = |L| |E|^(1/2).
- From the Dormand-Prince code of `src/physics.js`: the closest approach `minDist` (the smallest pair distance at the ends of its steps), the closure, and for every fifth point the syzygy word and `maxMod`, all computed by `perpInfo` and `relativeStability`, which integrate the whole orbit (`src/perp.js` has no ias branch); the stop rule `--max-dist`; and the 12 x 12 matrices of the pieces that are neither flagged nor replaced by the cross-check (`src/stability.js`).
- An accepted step is unrecorded when the Dormand-Prince integration of its whole orbit in `perpInfo` exceeds its step limit: it then has no closest approach and no closure from the tool. Its start values and its T* and L* (from the start values) are kept in the list `unrec`, and it is witnessed. The step limit is reached near deep encounters, which is why which steps are recorded can differ between machines. The `unrecorded` lists of the stored traces got `Tstar` and `Lstar` afterwards, computed from their stored start values (no rerun).
- From the multiple precision flow of the witnesses: the closure and the smallest pair distance of a witnessed point (the depths).

## Parts

- `src/ias/ias-bridge.py` is one long-lived Python process per trace. It runs REBOUND IAS15 for one piece at a time and gets its requests as lines of JSON from `src/ias/bridge.js` (through a worker thread, `bridge-worker.mjs`, so the shooting code can stay synchronous).
- `src/ias/guards.py` decides from the sampled pair distances of a piece whether it is an encounter piece and whether one of the guards trips (below). `src/ias/reg.js` is the regularised integrator (algorithmic regularisation in chain coordinates) used for the encounter pieces; `reg-settings.json` has its constants. `src/ias/recorder.js` writes one line per attempt of the corrector.
- `tools/family-follow-ias.mjs` follows a family in one direction and writes the trace.
- `tools/trace-witnesses.py`, `witness-jobs.py`, `run-queue.py`, `witness.py`, `witness-check.py` make the witnesses of a trace and read them (below). `tools/reclose.py` closes a stored orbit again at the same lam in multiple precision. `tools/point-diagnostic.py` looks at one point that does not close. `tools/guard-check.py` runs the guards on stored orbits.
- `src/ias/reg.js` has its own page, [reg.md](reg.md) (arguments, returned fields, failure reasons, what is tested).
- `tools/gate-a-rows.py` and `tools/gate-a.mjs` test `reg.js` against the exact Kepler flow of a pair (`tools/gate-a-unequal.py` makes the row for two unequal masses); `tools/kepler-ref.py`, `kepler-check.py` and `witness-acceptance.py` do the same for the multiple precision flow of the witnesses.

### The guards

A piece is an encounter piece if its smallest sampled pair distance is below 1e-3. A guard trips when

- G1a: the second smallest pair distance is below 0.02 at a sample where the smallest is below 1e-3,
- G1b: at the pericentre of an encounter piece the second distance is below 390 times the smallest (`--guard-ratio`),
- G2: the second smallest of the three per-pair minima of a piece is below 0.02, or two encounter pieces belong to different pairs,
- G3: a node of the multiple shooting has a pair distance below 1e-4.

A trip fails that attempt of the corrector; it does not stop the trace by itself. After five failed attempts in a row with a guard tripping the driver stops with "triple-approach guard", and a trip right after a Newton residual of 1e-10 or less stops it at once. The ratio of G1b is 390 in this release; the stored traces of t35 - and t12 + were run with 400 (column `guard_ratio` of `data/deep/traces-table.csv`). Two more checks do not stop a trace by themselves: an unflagged piece in which `reg.js` finds a closest approach below 1e-3 is counted as a missed flag (the trace stops if it is below 5e-4), and unflagged pieces with a pair distance below `settings.ias.crossCheckBelow` (0.05 by default) are also run through `reg.js` and replaced by its end state where the two differ. The counts are in the `guards` field of the trace file.

The thresholds of the guards are chosen, they are not observed failures. The ratio 390 of G1b is 1.5 times the smallest tested ratio R/d1 at the periapsis distance q = 1e-4 (257.2); none of the 44 rows of `data/deep/extra/gate-a-extension.json` fails at any tested ratio (R/d1 from 50 at q = 1e-3 to 3333; the largest error is 3.6e-3 of its limit), so no tested ratio shows `reg.js` failing. G1a and G2 (0.02) and G3 (1e-4) have no test of their own. A stop by "triple-approach guard" (7 of the 15 traces that were run) therefore says that the chosen threshold was reached, not that `reg.js` was seen to fail there.

The missed-flag check runs `reg.js` (without the matrix) on every unflagged piece of every evaluation (`missedFlagCheck` in `src/ias/bridge.js`). In the full outputs of the 14 traces that have one (not in the compact files; `guards.missChecks` and `guards.tMiss`) it was called 462126 times for t35 - (501013 pieces went through the bridge), 284107 times for t44 - (349827 pieces), 107906 times for t62 - (109406 pieces) and 80524 times for t72 - (84564 pieces), and it took 6.3, 3.4, 5.2 and 4.9 percent of the run time of these four; over all 14 traces 2.3 to 7.4 percent.

### A trace

```
node tools/family-follow-ias.mjs OUT.json DIR u1 u2 lam t [--minutes=120] [--pieces=24] [--label=name] [--max-dist=0.03] [--stop-after=N]
```

DIR is 1 or -1 (the direction in lam), `t` is half the period. `OUT.json` must be new. The file has one record for every accepted step that could be recorded (start values, T*, L*, theta, turns, closest approach, closure; T* and L* from the start values, the closest approach and the closure from the Dormand-Prince code), a list `unrec` of the accepted steps for which the closest approach and the closure could not be computed (the Dormand-Prince integration of the orbit exceeded its step limit; their T* and L* are in the list, from the start values), the guard counts and the reason why the trace stopped. The cost of an accepted step, run_seconds / (points + unrecorded_steps) of `data/deep/traces-table.json`, was 0.74 to 6.14 seconds on the 15 traces that were run; a trace is sequential (each step needs the one before).

### The witnesses

A witness integrates the stored start values (u1, u2, lam, t) over the whole orbit in multiple precision, with the Gragg-Bulirsch-Stoer flow of `tools/refine-mp.py` and nothing from `src/ias/`: preset `w1` 40 digits, flow tolerance 1e-26, smallest step 1e-14; preset `w1b` 50 digits, tolerance 1e-30, smallest step 1e-20. It records the smallest pair distance and the closure of the full period, and `tools/witness-check.py` adds the relative change of the energy and of the angular momentum (both must stay below 1e-14). A point counts as witnessed if the w1 minimum of the pair distance is 1e-7 or more, or the w1b minimum is 1e-10 or more, the closure is below 1e-6 and the check passes; below those minima the flow is not accepted (see the limits).

```
python tools/trace-witnesses.py points TRACE.json POINTS.json      # which points: every point whose lam is at least 0.01 s from the last kept one (s is the median |dlam| of the first 20 recorded steps, or --s), and the unrecorded steps
python tools/witness-jobs.py POINTS.json W1DIR QUEUE.json          # job files and the queue
python tools/run-queue.py QUEUE.json 3                             # three at a time
python tools/witness-check.py W1DIR --out W1CHECK.json
python tools/trace-witnesses.py select W1DIR LOW.json              # the points below 1e-7: w1b for these (witness-jobs.py ... --preset w1b)
python tools/trace-witnesses.py summary TRACE.json W1DIR W1BDIR --checks W1CHECK.json --checks-w1b W1BCHECK.json
```

The summary gives the strict chain (the points in the order of the steps, cut at the first point that is not witnessed), the smallest witnessed minimum before the cut (the "strict witnessed depth") and whether the witnessed closest approach turns (a witnessed minimum followed by a rise of a factor 2 or more with witnessed points on both sides; this is all that "turns" means here, it is not a turn of the family). The witnessed points are the kept points and the unrecorded steps, not every accepted step: 69 of the 1711 accepted steps of t35 -, 124 of 1266 of t44 -, 336 of 375 of t62 -, 325 of 325 of t72 -; the witness files store the s that was used, and `reading --trace` prints how many recorded points were not selected. One witness takes 14 to 172 seconds with w1 (median 26 to 43 seconds on the four stored traces) and 26 to 106 seconds with w1b; the witnesses of a whole trace of 300 points are an hour or two with three jobs at once.

## The numbers and how to reproduce them

Times are from the machine of the stored runs (Windows 11, one core per job).

| number | command | time |
|---|---|---|
| `src/ias/reg.js` against the exact Kepler flow: 80 rows (A1 48 ellipses: 46 within the limit, 2 not graded because the sensitivity is not resolved; A2 24 near-radial orbits, periapsis distance 1e-3 to 1e-8; A3 8 of them with the pair away from the origin), all within the limit `max(floor, 10 * 1.1e-16 * S)`; on the machine of the stored run the end states equal the stored ones bit for bit | `python tools/gate-a-rows.py rows.json` then `node tools/gate-a.mjs rows.json --stored data/deep/gate-a-all.json` | 3 s and 1 s |
| the same for seven of the rows | `node test/gate-a.test.js` | a few seconds |
| gate A for the periapsis distances 1e-10 and 1e-11 (8 rows of type A2: one and five periods, from the apocentre and from 0.3 radians before the pericentre): 7 within the limit, 1 HARD FAIL (q = 1e-11, apocentre, five periods: error 1.8e-11, limit 5e-13) | `node tools/gate-a.mjs data/deep/extra/gate-a-deep-q.json` (the rows are in the file; `tools/kepler-ref.py selfcheck` passes for both q) | a second |
| `reg.js` for two unequal masses (1 and 0.1, e = 0.9, one period) against the exact Kepler flow with mu = m1 + m2: error 5.2e-16, limit 2e-14; energy and angular momentum kept | `node test/reg-unequal.test.js` (the row: `python tools/gate-a-unequal.py OUT.json`) | a second |
| the 12 x 12 matrix of `reg.js` on six encounter pieces of stored points (closest approach 4e-4 down to 7e-10): at most 1.1e-9 of max\|M\| from central differences with Richardson extrapolation, symplectic defect at most 2.3e-12 of max\|M\|^2 | `node test/reg-matrix.test.js` | a second |
| the multiple precision flow of the witnesses against the exact Kepler flow, one period, periapsis distance 1e-7 to 1e-10: error 5.9e-24 (1e-7), 4.5e-22 (1e-8), 5.5e-21 (1e-10), limit 1e-17, no collapse of the step; the 40 digit flow of the preset w1 at q = 1e-6 and 1e-7: error 8.7e-21 and 4.7e-19, same limit | `python tools/witness-acceptance.py` (q = 1e-8 and 1e-10; `--q all` for the seven stored ones); `python tools/kepler-check.py 1e-7 OUT.json --digits 40 --tol 26 --floor 1e-14` (also 1e-6; stored in `data/deep/extra/w1-acceptance.json`) | 15 s per q; 10 s for each w1 row |
| Hénon's relation dT* = pi Ls d(turns) with the signed Ls = L \|E\|^(1/2) (for t35 -, where L < 0, dT* = -pi L* d(turns) with L* = \|L\| \|E\|^(1/2)) on the 1690 points of the trace of t35 -: 155 pairs, median relative deviation 3.7e-7, largest 3.2e-5 | `node test/henon.test.js` | 1 s |
| the re-closer on accepted steps 9, 10 and 11 of the t35 - trace: converged within 10 updates, the same orbit as the stored values to 3e-14, and the witnessed minima 1.018e-8, 7.320e-10 and 1.872e-9 | `node test/reclose.test.js` | 2.5 min |
| the first 31 accepted steps of the continuation of t35 - from the stored start (10 recorded points and the unrecorded steps), compared with the stored trace: the step numbers equal, lam, u1, u2 and t to 1e-9 relative; which steps are recorded can differ between machines | `node test/replay.test.js` | 3 min |
| the smallest witnessed value of each of the four traces (t35 -: 7.320e-10 at step 10, with the unchecked midpoint 6.562e-11 between steps 10 and 11 next to it; t44 -: 1.907e-9 at step 34; t62 -: 8.573e-9 at step 9; t72 -: 1.611e-8 at step 97), the further minima below 1e-6 (rises of a factor 2 over witnessed points, as the reading defines them), the counts of witnessed points | `python tools/trace-witnesses.py reading data/deep/witnesses/t35m.json [--trace data/deep/traces/t35m.json]` (also t44m, t62m, t72m; with `--trace` it also prints how many recorded points were not selected for witnessing and their step ranges) | 0.3 s each |
| the re-closed stretches (t35 -: 25 accepted steps and the 24 midpoints between them; t44 -, t62 -, t72 -: 3 steps and 2 midpoints each; all converged) | the files `data/deep/reclose/*.json`; one point again with `python tools/reclose.py JOB.json OUT.json` | 45 to 366 s per point |
| the table of 19 traces (15 run, 4 not run because guard G2 trips at the start orbit) with start values, direction, stop reason, number of points, strict depth and run time | `data/deep/traces-table.csv` and `.json`; a trace again with the command above and the start values of the json | 5 s to 2 h per trace |
| a short trace of t35 -, its witnesses and the summary | `node tools/deep-sample.mjs` | see below |

The trace files of `data/deep/traces/` and the witness files of `data/deep/witnesses/` hold the numbers behind the reading of the four traces; `data/deep/README.md` lists every file. A rerun of a trace on another machine is not expected to give the same points bit for bit (the libm and the IAS15 build differ), and which accepted steps are recorded (T* and L* computed) can differ; `test/replay.test.js` compares the accepted steps of the continuation (lam, u1, u2, t) with the stored trace to 1e-9 relative. On Linux (GitHub Actions run 40185378474: Ubuntu 24.04.5, Node v24.15.0, Python 3.14.8) all tests pass and the replayed accepted steps agree with the stored trace to 1.1e-11 relative (31 steps), with the recording different at 4 of them.

## Sample run

```
node tools/deep-sample.mjs
```

follows the family of t35 - from its stored start for 4 recorded points (25 accepted steps, 21 of them not recorded), makes the witnesses of all 25 (w1, and w1b for the points below 1e-7) and prints the summary. It compares the summary with `data/deep/sample/expected-summary.txt` and prints PASS or FAIL. The text it compares depends on the machine (which steps are recorded, lam to 8 decimals, the w1 minima to 6 digits, the guard counts and the number of replacements by the cross-check), so on another platform a FAIL is expected where these differ in the last digits or in which steps are recorded; compare the two summaries by their numbers then (the strict depth, the 25 accepted steps, the minima to four digits). It took 331 seconds on the machine of the stored run (trace 109 s, w1 witnesses 146 s, w1b witnesses 76 s); a first run with other jobs on the machine took 621 seconds. The whole output of the stored run is `data/deep/sample/output.txt`.

## Other files

- `data/deep/README.md`: what each stored file is.
- Raw results of the witnesses and of the re-closer (the full output of `tools/witness.py`, including the end states) are not in the repository; they are deposited on Zenodo [DOI at release].

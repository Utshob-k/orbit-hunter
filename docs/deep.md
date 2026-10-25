# The ias route (version 0.3.0)

The route of the perpendicular start that goes through close approaches of two bodies down to a pair distance of about 1e-9. Version 0.2.33 and the default of 0.3.0 use the Dormand-Prince code of `src/physics.js`; in the earlier runs of `data/deep/extra/old-variants.json` the closest approach of the tool (a tool value, not witnessed) at the point where it lost the family was 3.8e-4 to 8.1e-4 on t19 -, t35 + and t35 - with the default corrector tolerance 1e-11, and 1.2e-4 to 2.6e-4 on t19 -, t35 +, t35 - and a14 + (with tighter integrator tolerances) with the tolerance 1e-10. The ias route integrates every piece of the multiple shooting with REBOUND IAS15 and recomputes the pieces with a close pair with the regularised integrator `src/ias/reg.js`. The results that come out are checked afterwards by a flow in multiple precision (the witnesses, `tools/witness.py`), which does not use any of this code. The limits are in [methods-and-limits.md](methods-and-limits.md) (section "The ias route"). Paths are from the top folder of the repository.

## What it needs

Node v24.15.0 (the only version this route was run with; Node 18 or newer for the DP45 code), Python with `rebound` and `mpmath` (the stored runs used 3.14.6, REBOUND 5.2.2, mpmath 1.4.1, numpy 2.5.3):

```
pip install rebound==5.2.2 mpmath==1.4.1 numpy==2.5.3
npm test                 # the old tests, DP45, about 20 seconds
npm run test:ias         # the tests of this route, about 4 minutes
```

The route is off unless asked for. `settings.integrator` in `src/settings.js` is `'dp45'` (default) or `'ias'`; the environment variable `ORBIT_INTEGRATOR=ias` sets it from the shell. `ORBIT_PYTHON` names the python executable (default `python` on Windows, `python3` elsewhere). `tools/family-follow-ias.mjs` sets it itself.

## Parts

- `src/ias/ias-bridge.py` is one long-lived Python process per trace. It runs REBOUND IAS15 for one piece at a time and gets its requests as lines of JSON from `src/ias/bridge.js` (through a worker thread, `bridge-worker.mjs`, so the shooting code can stay synchronous).
- `src/ias/guards.py` decides from the sampled pair distances of a piece whether it is an encounter piece and whether one of the guards trips (below). `src/ias/reg.js` is the regularised integrator (algorithmic regularisation in chain coordinates) used for the encounter pieces; `reg-settings.json` has its constants. `src/ias/recorder.js` writes one line per attempt of the corrector.
- `tools/family-follow-ias.mjs` follows a family in one direction and writes the trace.
- `tools/trace-witnesses.py`, `witness-jobs.py`, `run-queue.py`, `witness.py`, `witness-check.py` make the witnesses of a trace and read them (below). `tools/reclose.py` closes a stored orbit again at the same lam in multiple precision. `tools/point-diagnostic.py` looks at one point that does not close. `tools/guard-check.py` runs the guards on stored orbits.
- `tools/gate-a-rows.py` and `tools/gate-a.mjs` test `reg.js` against the exact Kepler flow of a pair; `tools/kepler-ref.py`, `kepler-check.py` and `witness-acceptance.py` do the same for the multiple precision flow of the witnesses.

### The guards

A piece is an encounter piece if its smallest sampled pair distance is below 1e-3. The trace stops, with the guard as the reason, when

- G1a: the second smallest pair distance is below 0.02 at a sample where the smallest is below 1e-3,
- G1b: at the pericentre of an encounter piece the second distance is below 390 times the smallest (`--guard-ratio`),
- G2: the second smallest of the three per-pair minima of a piece is below 0.02, or two encounter pieces belong to different pairs,
- G3: a node of the multiple shooting has a pair distance below 1e-4.

After five failed attempts in a row with a guard tripping the driver stops with "triple-approach guard". Two more checks do not stop a trace by themselves: an unflagged piece in which `reg.js` finds a closest approach below 1e-3 is counted as a missed flag (the trace stops if it is below 5e-4), and unflagged pieces with a pair distance below `settings.ias.crossCheckBelow` (0.05 by default) are also run through `reg.js` and replaced by its end state where the two differ. The counts are in the `guards` field of the trace file.

### A trace

```
node tools/family-follow-ias.mjs OUT.json DIR u1 u2 lam t [--minutes=120] [--pieces=24] [--label=name] [--max-dist=0.03] [--stop-after=N]
```

DIR is 1 or -1 (the direction in lam), `t` is half the period. `OUT.json` must be new. The file has one record for every accepted step that could be recorded (start values, T*, L*, theta, turns, closest approach, closure), a list `unrec` of the accepted steps for which T* and L* could not be computed, the guard counts and the reason why the trace stopped. The cost of an accepted point was 0.7 to 5.8 seconds; a trace is sequential (each step needs the one before).

### The witnesses

A witness integrates the stored start values (u1, u2, lam, t) over the whole orbit in multiple precision, with the Gragg-Bulirsch-Stoer flow of `tools/refine-mp.py` and nothing from `src/ias/`: preset `w1` 40 digits, flow tolerance 1e-26, smallest step 1e-14; preset `w1b` 50 digits, tolerance 1e-30, smallest step 1e-20. It records the smallest pair distance and the closure of the full period, and `tools/witness-check.py` adds the relative change of the energy and of the angular momentum (both must stay below 1e-14). A point counts as witnessed if the w1 minimum of the pair distance is 1e-7 or more, or the w1b minimum is 1e-10 or more, the closure is below 1e-6 and the check passes; below those minima the flow is not accepted (see the limits).

```
python tools/trace-witnesses.py points TRACE.json POINTS.json      # which points: every point whose lam is at least 0.01 s from the last kept one, and the unrecorded steps
python tools/witness-jobs.py POINTS.json W1DIR QUEUE.json          # job files and the queue
python tools/run-queue.py QUEUE.json 3                             # three at a time
python tools/witness-check.py W1DIR --out W1CHECK.json
python tools/trace-witnesses.py select W1DIR LOW.json              # the points below 1e-7: w1b for these (witness-jobs.py ... --preset w1b)
python tools/trace-witnesses.py summary TRACE.json W1DIR W1BDIR --checks W1CHECK.json --checks-w1b W1BCHECK.json
```

The summary gives the strict chain (the points in the order of the steps, cut at the first point that is not witnessed), the smallest witnessed minimum before the cut (the "strict witnessed depth") and whether the witnessed closest approach turns (a witnessed minimum followed by a rise of a factor 2 or more with witnessed points on both sides). One witness takes 14 to 172 seconds with w1 (median 26 to 43 seconds on the four stored traces) and 26 to 106 seconds with w1b; the witnesses of a whole trace of 300 points are an hour or two with three jobs at once.

## The numbers and how to reproduce them

Times are from the machine of the stored runs (Windows 11, one core per job).

| number | command | time |
|---|---|---|
| `src/ias/reg.js` against the exact Kepler flow: 80 rows (A1 48 ellipses: 46 within the limit, 2 not graded because the sensitivity is not resolved; A2 24 near-radial orbits, periapsis distance 1e-3 to 1e-8; A3 8 of them with the pair away from the origin), all within the limit `max(floor, 10 * 1.1e-16 * S)`; the end states equal the stored ones bit for bit | `python tools/gate-a-rows.py rows.json` then `node tools/gate-a.mjs rows.json --stored data/deep/gate-a-all.json` | 3 s and 1 s |
| the same for seven of the rows | `node test/gate-a.test.js` | a few seconds |
| the multiple precision flow of the witnesses against the exact Kepler flow, one period, periapsis distance 1e-7 to 1e-10: error 5.9e-24 (1e-7), 4.5e-22 (1e-8), 5.5e-21 (1e-10), limit 1e-17, no collapse of the step | `python tools/witness-acceptance.py` (q = 1e-8 and 1e-10; `--q all` for the seven stored ones) | 15 s per q |
| Hénon's relation dT* = -pi L* d(turns) on the 1690 points of the trace of t35 -: 155 pairs, median relative deviation 3.7e-7, largest 3.2e-5 | `node test/henon.test.js` | 1 s |
| the re-closer on accepted steps 9, 10 and 11 of the t35 - trace: converged within 10 updates, the same orbit as the stored values to 3e-14, and the witnessed minima 1.0180e-8, 7.3197e-10 and 1.8717e-9 | `node test/reclose.test.js` | 2 min |
| the first 10 recorded points of the trace of t35 - and its 21 unrecorded steps from the stored start | `node test/replay.test.js` | 2 min |
| the witnessed depth and the turn of the four traces (t35 -: 7.3197e-10 at step 10; t44 -: 1.9068e-9 at step 34; t62 -: 8.5734e-9 at step 9; t72 -: 1.6112e-8 at step 97), the further turns below 1e-6, the counts of witnessed points | `python tools/trace-witnesses.py reading data/deep/witnesses/t35m.json` (also t44m, t62m, t72m) | 0.3 s each |
| the re-closed stretches (t35 -: 25 accepted steps and the 24 midpoints between them; t44 -, t62 -, t72 -: 3 steps and 2 midpoints each; all converged) | the files `data/deep/reclose/*.json`; one point again with `python tools/reclose.py JOB.json OUT.json` | 45 to 366 s per point |
| the table of 19 traces (15 run, 4 not run because guard G2 trips at the start orbit) with start values, direction, stop reason, number of points, strict depth and run time | `data/deep/traces-table.csv` and `.json`; a trace again with the command above and the start values of the json | 5 s to 2 h per trace |
| a short trace of t35 -, its witnesses and the summary | `node tools/deep-sample.mjs` | see below |

The trace files of `data/deep/traces/` and the witness files of `data/deep/witnesses/` hold the numbers behind the reading of the four traces; `data/deep/README.md` lists every file. A rerun of a trace on another machine is not expected to give the same points bit for bit (the libm and the IAS15 build differ); `test/replay.test.js` accepts a relative difference below 1e-9, which has not been measured on a second machine.

## Sample run

```
node tools/deep-sample.mjs
```

follows the family of t35 - from its stored start for 4 recorded points (25 accepted steps, 21 of them not recorded), makes the witnesses of all 25 (w1, and w1b for the points below 1e-7) and prints the summary. It compares the summary with `data/deep/sample/expected-summary.txt` and prints PASS or FAIL. It took 331 seconds on the machine of the stored run (trace 109 s, w1 witnesses 146 s, w1b witnesses 76 s); a first run with other jobs on the machine took 621 seconds. The whole output of the stored run is `data/deep/sample/output.txt`.

## Other files

- `data/deep/README.md`: what each stored file is.
- Raw results of the witnesses and of the re-closer (the full output of `tools/witness.py`, including the end states) are not in the repository; they are deposited with the data of the paper.

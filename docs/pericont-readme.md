# PeriCont 0.3.0

PeriCont follows families of relative periodic orbits of the planar equal-mass three-body problem (the perpendicular start) through close approaches of two bodies, to witnessed pair distances of 7.3e-10 to 1.6e-8 on four families, where an ordinary Dormand-Prince integrator does not follow. This folder is the program package of version 0.3.0 of Orbit Hunter: the code of the ias route (`src/ias/` and the modules it uses), the drivers and checking tools in `tools/`, the tests in `test/`, and the data of `data/deep/` that the tests and the sample run read. The rest of Orbit Hunter (the search, the R family and its satellites, the other data) is in the repository https://github.com/Utshob-k/orbit-hunter and is not in this package.

## Install

Node version: the ias route was tested with Node v24.15.0 only. There is nothing to install for the JavaScript code. The ias route needs python with `rebound` and `mpmath`: Python 3.14 with REBOUND 5.2.2, mpmath 1.4.1 and numpy 2.5.3, in a venv in this folder (Python 3.15 does not build REBOUND 5.2.2; on Windows `python` may be 3.15, so name the version). `ORBIT_PYTHON` is the python of that venv; the node commands use it.

Windows, PowerShell:

```
py -3.14 -m venv venv
venv\Scripts\pip install rebound==5.2.2 mpmath==1.4.1 numpy==2.5.3
$env:ORBIT_PYTHON = "$PWD\venv\Scripts\python.exe"
```

Windows, cmd:

```
py -3.14 -m venv venv
venv\Scripts\pip install rebound==5.2.2 mpmath==1.4.1 numpy==2.5.3
set ORBIT_PYTHON=%CD%\venv\Scripts\python.exe
```

Linux:

```
python3.14 -m venv venv
venv/bin/pip install rebound==5.2.2 mpmath==1.4.1 numpy==2.5.3
export ORBIT_PYTHON=$PWD/venv/bin/python
```

## Test

From this folder:

```
npm test                 # the tests of the default route (Dormand-Prince), about 20 seconds
npm run test:ias         # the tests of the ias route, 4 to 10 minutes
node tools/deep-sample.mjs   # the sample run: a short trace of the family t35 -, its witnesses and a summary, 6 to 15 minutes
```

`npm test` and `npm run test:ias` print one PASS or FAIL line per check and exit with 0 if there is no FAIL. The PASS or FAIL of the sample run compares numbers with tolerances (`data/deep/sample/expected-summary.json`). Run times depend on the machine; the longest test of `test:ias` (`test/reclose.test.js`, the 50 digit re-closing) takes several minutes.

## What is in the package

- `src/ias/`: the bridge to REBOUND IAS15 (`bridge.js`, `ias-bridge.py`), the guards for a third body near a close pair, and the regularised integrator `reg.js` for the encounter pieces (`docs/reg.md`). `src/shooting.js` is the corrector (multiple shooting with pseudo-arclength continuation); `src/settings.js` selects the route (`ORBIT_INTEGRATOR=ias` or `settings.integrator = 'ias'`).
- `tools/family-follow-ias.mjs`: the driver. It follows one family from a start in one direction and writes the points to a file (usage in its first lines and in `docs/deep.md`). `tools/reproduce-trace.mjs` runs a stored trace of `data/deep/traces/` again and compares it with the stored one; `tools/handover-rule.mjs` and `tools/handover-run.mjs` are the hand-over to the 50 digit continuation (option `--handover`).
- `tools/witness.py` and its helpers: the multiple precision witness of a point (a flow that uses none of the code of the route); `tools/reclose.py` and `tools/reclose-continue.py` close an orbit again in 50 digits and continue it in lam; `tools/fd-reference.py` makes the 60 digit reference matrices of `data/deep/extra/fd-comparison.json`.
- `test/`: the tests. `data/deep/`: the stored traces, witnesses, re-closed stretches, the table of the traces that were started, and `data/deep/extra/` with the data files behind the statements of `docs/deep.md`; `data/deep/README.md` says what each file is.
- `docs/deep.md`: the ias route, its commands and run times. `docs/methods-and-limits.md`: what the route does not cover (section "The ias route"; the document is the one of the whole repository, so its other sections and `data/deep/README.md` name some files, mostly of the search and of the R family, that are in the repository and not in this package). `docs/pericont-files.txt`: the list of the files of this package; `node tools/pack-pericont.mjs OUTDIR` builds the zip from that list.
- `CHANGELOG.md`: the versions and the log of corrections.

## Cite

Cite it as in `CITATION.cff`. The code (`src/`, `tools/`, `test/`) is under the MIT license (`LICENSE`); the data and the documents are under CC BY 4.0 (`LICENSE-DATA`): you can use, copy and change them as long as you credit Utshob Kandel and link to https://github.com/Utshob-k/orbit-hunter.

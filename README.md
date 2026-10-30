# Orbit Hunter

Version 0.3.0 adds PeriCont (the ias route): continuation of families of periodic orbits through close approaches of two bodies, with multiple precision witnesses.
See [The ias route](#the-ias-route-pericont-version-030).

A search for periodic orbits of the planar three-body problem with equal masses and non-zero angular momentum. A GPU does the rough search in the
browser (WebGPU). Double precision code on the CPU closes and checks every candidate.

## Where it stands

Nothing here is claimed as a discovery. No orbit has been shown to be unpublished.

The code reproduces published orbits to about nine digits. The perpendicular search found 85 distinct orbits, 83 with non-zero angular momentum and 2 with L = 0. They were compared with:

- all 415 equal-mass orbits with L != 0 of the Three Body Orbits atlas,
- Davoust and Broucke 1982, Broucke and Boggs 1975, Broucke 1975, Hénon 1976,
- the 99 satellites of Janković et al. 2020,
- the 18 rows of Li et al. 2025,
- the preliminary search of the master thesis of Janković (2016; a copy was provided by the author and the thesis is cited with her permission; described, not reproduced here), added on 2026-10-11 (see below).

Three families were tested as well: Hénon's family (the BHH family), the rotating eights (a choreography test) and IA-3 (in the range of the Li et al. rows).

Nauenberg 2001 and Chenciner, Fejoz and Montgomery 2005 are not read yet. The rotating-eight branch of the figure-eight, which both papers are about,
was traced and compared (see [docs/results.md](docs/results.md)). The 2025 review of Li and Liao could not be read.

## The numbers

| list | orbits | what they are |
|---|---|---|
| perpendicular search | 85 | 6 are atlas orbits, 2 have L = 0, 77 match none of the sources above |
| arclength list | 17 | reached by continuation from the CPC satellites: 2 are atlas orbits, 1 (a08) is unresolved because it is close to Sheen's Three ovals, a16 is the shortest orbit of t80, the other 13 match none of the sources |

Since a16 is the shortest orbit of t80, the two lists hold 100 distinct orbits, 91 of them unmatched. Whether they are already published is open.

Two of the 77 lie on published families (T* = 11.652 and 33.745) and six lie on satellites of Broucke's R family (see below). So "match none" means
not a listed orbit. It does not mean unrelated to published ones.

Of the 85, 6 are linearly stable. 54 of the 85 close to 1e-8 or better in double precision with two integrators, and 51 of those 54 also in 40 digit
arithmetic. An independent integrator (REBOUND) agrees, also on the three whose double precision start values close only to between 1e-8 and 7e-8
(t40, t47, t57; see docs/methods-and-limits.md). All 85 are refined to 30 digits; the stored values close to 2.7e-19 or better. The details, and every
correction made so far, are in the files below.

## Broucke's R family and its satellites

One of the 77 orbits (T* = 33.745) lies on Broucke's family R. Satellites leave this family where a rotation number is 1/n. They were followed for n =
3 to 12, and on the upper branch up to n = 56 (n = 57 and 58 were not decided).

| n | what was found | status |
|---|---|---|
| 2 | branch f | published, Davoust and Broucke 1982; not followed here |
| 3 | branches e and E | published, Davoust and Broucke 1982; reproduced here |
| 4 | no orbit reached | the continuation was stopped by its limits; undecided |
| 5, 6, 8 | the three stable orbits, T* = 17.847, 19.769, 23.533 (the shortest orbit of the T* = 47.065 orbit) | not found in the sources checked |
| 7 | T* = 21.663 | in the atlas (R7 1/1, from the atlas's own 2026 search, no paper) |
| 9 to 12 | T* = 25.383, 27.217, 29.037, 30.844 | not found in the sources checked |
| 13 to 56 | T* = 32.640 to 105.846, all unstable (largest multiplier 1.71 to 53.2) | not found in the sources checked (n = 27 and 29 to 36 reached only after declared changes of the method, see docs) |
| 39 | one rotating member (rotation angle not 0) of the satellite curve of the member with the lower nu = 1/39 | found before: preliminary search of the thesis of Janković 2016, mentioned in the CPC 2020 (version 0.2.26); the orbit with rotation 0 is not in the sources checked |
| 57, 58 | undecided | both senses stopped at the step limit of the method |
| 59 and up | not run | the stored trace has no crossings of nu = 1/n beyond n = 58; along the extended trace (version 0.2.28) 1/n is crossed for n = 59 to 439 only as a bracket between consecutive points, and no satellite was computed there |

The orbits for n = 5 to 12 are all linearly stable; from n = 13 on they are unstable, so the sequence of stable orbits ends at n = 12. The satellite
curves of n = 5 and 6 each have a second orbit (T* = 17.7208 and 19.6472, refined to 30 digits, unstable). "Not found in the sources checked" says
nothing about whether an orbit is known. The thesis of Janković (2016) has a rotating member of the satellite curve for n = 39 and, among the six
orbits of its preliminary search, a 45 fold repeat of an R orbit; k = 12, 58 and 84 of that search are undecided (details in
`docs/r-family-satellites.md`). The orbits with rotation 0 and the sequence for n = 5 to 56 were not found in the sources checked. The 2025 review of
Li and Liao could not be read. Several continuations stopped at a limit of the method (close approach, step size, step count); those are undecided,
not results. Satellites with a rotation number k/n, k > 1, were followed too (21 more members): three more linearly stable orbits (T* = 33.745149, a
different orbit from t41 and t42, see docs; 37.624249; 51.383330) match nothing in the sources checked, three of the 77 (t37, t42, t59: rows 37, 42
and 59 of data/orbit-table.csv, counting from 0) lie on such satellites, and 12 of the zeros are not established. Details:
[docs/r-family-satellites.md](docs/r-family-satellites.md).

Since version 0.2.28: the linear stability of the satellites for n = 5 to 12 was computed again in multiple precision, with the time shift and the rotation taken
out analytically (the four nontrivial multipliers are on the unit circle within 3.6e-24 for the 30 digit orbits); from n = 13 on the orbits are unstable: the
largest multiplier is real and negative for n = 13 to 56 (the sign was computed in multiple precision, tier A, for n = 13 to 20 in version 0.2.29, and in double precision, by the reduction, for n = 21 to 56 in version 0.2.32) and grows in modulus from 1.71 (n = 13) to 53.2 (n = 56). The second
pair of multipliers reaches -1 between n = 12 and 13 (n is a label, not a parameter). For n = 5 to 12 a second
family of satellites leaves the same branch points on the same side, in the class of orbits that are symmetric under a second reversing symmetry of R (the
isosceles class, `src/iso.js`). Its end orbits are unstable (a real pair of multipliers of 1.025 to 1.062) next to the stable orbit of the first class, so each
n has a stable and an unstable orbit; T* of the unstable one is larger by 3e-7 to 1.1e-5 and L* smaller by 6e-5 to 1.7e-3. This is a numerical result. It
looks like the pair of an elliptic and a hyperbolic orbit that a generic period-k bifurcation of a two dimensional area preserving map gives (Meyer 1970), but
that theorem is for maps without symmetry on a two dimensional manifold and does not apply directly here (four dimensions, reversible). None of the eight orbits
matches an entry of the atlas list (415 entries, the copy of 2026-10-09) or a row of the CPC tables at 1e-5: not found in the sources checked. The family R was
also followed beyond the end of its stored trace (L* up to 7.25; the end of the stored trace was a limit of the tracing code); the crossings of nu = 1/n for n = 59
to 439 along it are brackets between consecutive points and not computed branch points, and no satellite was computed beyond n = 56. The relation of Hénon
between the period and the angular momentum (dT* = -(L*/2) dtheta with theta = -Phi) is checked on the stored curves. Details, files and commands:
[docs/r-family-satellites.md](docs/r-family-satellites.md), [docs/reproducing.md](docs/reproducing.md), [data/README.md](data/README.md).

Since version 0.2.29: the satellites of class I were followed for n = 13 to 20 as well, and the multipliers of the class C orbits for n = 13 to 20 were computed in multiple
precision (tier A; rules and predictions written before the runs: `docs/rules/rules-class-i-13-20.txt`, results: `docs/rules/results-class-i-13-20.txt`). For every n the
member is found, the matrix of the n fold repeat has a two dimensional null space and the bifurcation equation two real roots, as for n = 5 to 12; the curve of the other
root reaches a rotation 0 in both senses for n = 13 and 14 and in one sense for n = 15 to 20 (in the stored files; the other sense stopped by a "collapse of the step", which was the bound on t in the line search of the corrector and not a property of the curve: with the code of version 0.3.0 it reaches the same orbit, `data/rerun-0.3.0/`). The 30
digit end orbits are established (closure 5.7e-25 to 3.6e-24, REBOUND after one period 9e-15 to 3e-13), have an isosceles state and no collinear one (the class C orbit
the reverse), and differ from the class C orbit of the same n by 3.3e-7 to 3.6e-7 in T* and 7.2e-4 to 1.07e-3 in L* (relative). For n >= 13 both orbits are unstable, so there is no
pair of a stable and an unstable orbit there: the class C orbit has a real negative pair of multipliers (modulus 1.712 at n = 13 to 7.621 at n = 20) and an elliptic pair with a
small angle (0.0082 to 0.0071 turns); the class I orbit has a real positive pair (1.053 to 1.046), a real negative pair (2.164 to 8.426) and no pair on the unit circle. None of the 16
end orbits of class I (n = 5 to 20) matches an atlas entry or a CPC row at 1e-5: not found in the sources checked (for n = 17 two CPC rows are within 5e-3 in (T*, L*) at twice T*,
a coincidence of two numbers, see the results file). The summary table is printed by `node tools/class-i-summary.mjs`; the supplement `data/supplement-initial-conditions.json`
has the 52 orbits of class C and the 16 of class I. Not done: n >= 21, the lower nu, orbits without these symmetries.

## Install and reproduce

Nothing to install for the JavaScript code. Node version: the ias route (PeriCont) was tested with Node v24.15.0 only; the rest of the repository needs Node 18 or newer. Some Python scripts need `rebound`, `numpy` or `mpmath` (the ias route below: exact commands there).

```
npm test                              # the tests of the default route (Dormand-Prince), about 20 seconds
python -m http.server                 # then open http://localhost:8000 (needs WebGPU)
node tools/nu-map.mjs                 # the 41 places where satellites can leave the R family
node tools/branch-summary.mjs         # how every satellite continuation ended
node tools/satellite-candidates.mjs   # the orbits with rotation 0, compared with the other lists
node tools/tables.mjs                 # Tables 1 and 2 of the satellites of R (more commands: docs/reproducing.md)
```

The scripts behind the numbers are in `tools/`. How to rerun them: [docs/reproducing.md](docs/reproducing.md).

## The ias route (PeriCont, version 0.3.0)

This close-approach route is called PeriCont (version 0.3.0); in the code and in the settings it is the ias route. It follows the families of the perpendicular start through close approaches of two bodies, to witnessed pair distances of 7.320e-10, 1.907e-9, 8.573e-9 and 1.611e-8 on four families (stored parabolic estimates to four digits; the osculating pericentre at the closest sample is 7.319e-10 for t35 - and the same four digits for the other three; `data/deep/extra/pericentres.json`), where the Dormand-Prince code of `src/physics.js` does not follow.

Which integrator gives which number: the corrector (the multiple shooting) takes the end state of every piece from REBOUND IAS15, and the pieces with a close pair are recomputed with the regularised integrator `src/ias/reg.js`; the rotation angle theta of a point is made from these end states. The numbers recorded for every point of a trace, T*, L*, the closest approach (`minDist`) and the closure, and for every fifth point the syzygy word and `maxMod`, come from the Dormand-Prince code (`perpInfo` integrates the whole orbit), and so do the 12 x 12 matrices of the pieces that are neither flagged nor replaced by the cross-check. An accepted step is unrecorded when that integration exceeds its step limit, which is why the recording can differ between machines. The points of a trace are checked afterwards with a multiple precision flow (`tools/witness.py`) that uses none of this code. The smallest witnessed value of the trace of t35 - is 7.320e-10 (accepted step 10); the re-closed midpoint between steps 10 and 11 gives 6.562e-11, which is below the range of the witness and is not witnessed.

Two limits to read first: a stored point can be off the orbit by more than the corrector tolerance (piece 18 of an earlier point of t35 - was wrong by 1.18e-7 while the residual of the corrector was 6.7e-14), and 15 stored points of t28 - and t81 + fail the witness closure; both are described in the section "The ias route" of [docs/methods-and-limits.md](docs/methods-and-limits.md).

The route is off by default (`npm test` does not use it); `ORBIT_INTEGRATOR=ias` or `settings.integrator = 'ias'` turns it on. It needs python with `rebound` and `mpmath`. Node version: the ias route (PeriCont) was tested with Node v24.15.0 only; the rest of the repository needs Node 18 or newer.

Python 3.14 with REBOUND 5.2.2, mpmath 1.4.1 and numpy 2.5.3 in a venv in the top folder of the repository (Python 3.15 does not build REBOUND 5.2.2; on Windows `python` may be 3.15, so name the version). `ORBIT_PYTHON` is the python of that venv; the node commands use it, and the python tools can be run with it directly.

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

Then, from the top folder:

```
npm run test:ias                      # the tests of the ias route, 4 to 10 minutes
node tools/deep-sample.mjs            # a short trace of the family t35 -, its witnesses and a summary, 6 to 15 minutes (its PASS or FAIL compares numbers with tolerances, see docs/deep.md)
```

The files of PeriCont are listed in `docs/pericont-files.txt`; `node tools/pack-pericont.mjs OUTDIR` builds the package `pericont-0.3.0.zip` from that list (docs/deep.md, section "The package").

The stored traces and witnesses of the families t35 -, t44 -, t62 - and t72 - and the table of the 19 traces that were started are in `data/deep/`. What the route does not cover is in [docs/methods-and-limits.md](docs/methods-and-limits.md) (section "The ias route"), the commands and run times in [docs/deep.md](docs/deep.md).

## More

- [docs/results.md](docs/results.md): results and comparisons in full
- [docs/r-family-satellites.md](docs/r-family-satellites.md): the R family and its satellites
- [docs/methods-and-limits.md](docs/methods-and-limits.md): how it works, what is not proven, known weaknesses, dead ends
- [docs/prior-work.md](docs/prior-work.md): the papers this builds on
- [docs/reproducing.md](docs/reproducing.md): running the scripts
- [docs/deep.md](docs/deep.md): the ias route, its commands and run times
- [data/README.md](data/README.md): what each data file is
- [CHANGELOG.md](CHANGELOG.md): versions, and the log of corrections (every statement that turned out wrong)

## Citation and license

Cite it as in [CITATION.cff](CITATION.cff). The code (`src/`, `tools/`, `test/`, `index.html`, `archive/`) is under the MIT license, see [LICENSE](LICENSE). The data, results and orbit lists
(`data/`, `docs/`, `figures/`) are under Creative Commons Attribution 4.0 (CC BY 4.0), as are `README.md`, `CHANGELOG.md` and `CITATION.cff` (documents); `package.json` and `.github/` (the settings of the tests) are under the MIT license like the code. See [LICENSE-DATA](LICENSE-DATA): you can use, copy and change them as long as you credit Utshob Kandel and link to
https://github.com/Utshob-k/orbit-hunter. Versions up to 0.2.33 were published with CC BY 4.0 for everything and keep that license. The files marked in
[data/README.md](data/README.md) as other people's numbers (including the rows of Davoust and Broucke 1982) belong to their authors, cite them if you use them.

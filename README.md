# Orbit Hunter

A search for periodic orbits of the planar three-body problem with equal masses and non-zero angular momentum. A GPU does the rough search in the
browser (WebGPU). Double precision code on the CPU closes and checks every candidate.

## Where it stands

Nothing here is claimed as a discovery. No orbit has been shown to be unpublished.

The code reproduces published orbits to about nine digits. For non-zero angular momentum it found 85 distinct orbits. They were compared with:

- all 415 equal-mass orbits with L != 0 of the Three Body Orbits atlas,
- Davoust and Broucke 1982, Broucke and Boggs 1975, Broucke 1975, Hénon 1976,
- the 99 satellites of Janković et al. 2020,
- the 18 rows of Li et al. 2025.

Three families were tested as well: Hénon's family (the BHH family), the rotating eights (a choreography test) and IA-3 (in the range of the Li et al. rows).

Nauenberg 2001 and Chenciner, Fejoz and Montgomery 2005 are not read yet. The rotating-eight branch of the figure-eight, which both papers are about,
was traced and compared (see [docs/results.md](docs/results.md)). The 2025 review of Li and Liao could not be read.

## The numbers

| list | orbits | what they are |
|---|---|---|
| perpendicular search | 85 | 6 are atlas orbits, 2 have L = 0, 77 match none of the sources above |
| arclength list | 17 | reached by continuation from the CPC satellites: 2 are atlas orbits, 1 (a08) is unresolved because it is close to Sheen's Three ovals, a16 is the shortest orbit of t80, the other 13 match none of the sources |

Since a16 is the shortest orbit of t80, the two lists hold 100 distinct orbits, 91 of them unmatched. Whether they are already published is open.

Two of the 77 lie on published families (T* = 11.652 and 33.745) and three lie on satellites of Broucke's R family (see below). So "match none" means
not a listed orbit. It does not mean unrelated to published ones.

Of the 85, 6 are linearly stable. 54 of the 85 close to 1e-8 or better in double precision with two integrators, and 51 of those 54 also in 40 digit
arithmetic. All 85 are refined to 30 digits; the stored values close to 2.7e-19 or better. The details, and every correction made so far, are in the
files below.

## Broucke's R family and its satellites

One of the 77 orbits (T* = 33.745) lies on Broucke's family R. Satellites leave this family where a rotation number is 1/n. They were followed
for n = 3 to 12.

| n | what was found | status |
|---|---|---|
| 2 | branch f | published, Davoust and Broucke 1982; not followed here |
| 3 | branches e and E | published, Davoust and Broucke 1982; reproduced here |
| 4 | no orbit reached | the continuation was stopped by its limits; undecided |
| 5, 6, 8 | the three stable orbits, T* = 17.847, 19.769, 23.533 (the shortest orbit of the T* = 47.065 orbit) | not found in the sources checked |
| 7 | T* = 21.663 | in the atlas (R7 1/1, from the atlas's own 2026 search, no paper) |
| 9 to 12 | T* = 25.383, 27.217, 29.037, 30.844 | not found in the sources checked |

The orbits for n = 5 to 12 are all linearly stable. The satellite curves of n = 5 and 6 each have a second orbit (T* = 17.7208 and 19.6472, refined
to 30 digits, unstable). "Not found in the sources checked" says nothing about whether an orbit is known. The 2025 review of Li and Liao could not be read. Several
continuations stopped at a limit of the method (close approach, step size, step count); those are undecided, not results. Details:
[docs/r-family-satellites.md](docs/r-family-satellites.md).

## Install and reproduce

Node 18 or newer, nothing to install for the JavaScript code. Some Python scripts need `rebound`, `numpy` or `mpmath` (`pip install`).

```
npm test                              # all the tests, about 10 seconds
python -m http.server                 # then open http://localhost:8000 (needs WebGPU)
node tools/nu-map.mjs                 # the 41 places where satellites can leave the R family
node tools/branch-summary.mjs         # how every satellite continuation ended
node tools/satellite-candidates.mjs   # the orbits with rotation 0, compared with the other lists
```

The scripts behind the numbers are in `tools/`. How to rerun them: [docs/reproducing.md](docs/reproducing.md).

## More

- [docs/results.md](docs/results.md): results and comparisons in full
- [docs/r-family-satellites.md](docs/r-family-satellites.md): the R family and its satellites
- [docs/methods-and-limits.md](docs/methods-and-limits.md): how it works, what is not proven, known weaknesses, dead ends
- [docs/prior-work.md](docs/prior-work.md): the papers this builds on
- [docs/reproducing.md](docs/reproducing.md): running the scripts
- [data/README.md](data/README.md): what each data file is
- [CHANGELOG.md](CHANGELOG.md): versions, and the log of corrections (every statement that turned out wrong)

## Citation and license

Cite it as in [CITATION.cff](CITATION.cff). Creative Commons Attribution 4.0 (CC BY 4.0), see [LICENSE](LICENSE). You can use, copy and change the code,
the results and the orbit lists as long as you credit Utshob Kandel and link to https://github.com/Utshob-k/orbit-hunter. The files marked in
[data/README.md](data/README.md) as other people's numbers (including the rows of Davoust and Broucke 1982) belong to their authors, cite them if you use them.

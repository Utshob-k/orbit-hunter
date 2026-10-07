# Orbit Hunter

A search for periodic orbits of the planar three-body problem (equal masses).

How it works:

- Screening (WebGPU, float32). One GPU thread per (v1, v2) starting condition in the
  Suvakov-Dmitrasinovic family integrates the orbit and records how close it ever comes back to its
  starting phase-space point. 512x512 orbits take about half a second.
- Verification (float64, CPU). Candidates are closed with a Levenberg-Marquardt solver on
  (v1, v2, period). float32 is only used to pick candidates, never to claim anything.
- Fingerprint. `T * |E|^1.5` doesn't change when you rescale an orbit, so it's used to tell orbits
  apart and to spot a known orbit run N times.

## What works

- All 11 orbits in known.js close from their published start values, residual 1e-10 or better. `npm test`
- A blind scan of the whole plane (1024x1024, tmax 15) finds the figure-8, butterfly I and III,
  goggles, yin-yang I, moth I and repeats of the figure-8 without being told where to look.
- The GPU scan gets blurry for long orbits (bumblebee, T ~ 63), so it only picks candidates.

## Not in known.js

The scan also closed two orbits that are not in known.js. Checked with a much tighter integrator, they
still return to the start within 2e-10, and the closest approach is 0.34:

    v1 = 0.209661505, v2 = 0.525702389, T = 33.8615
    v1 = 0.255430936, v2 = 0.516385839, T = 35.0431

I compared them with the full table from Li and Liao (arXiv 1705.00527, `tools/compare-liliao.mjs`).
The table parses to exactly 695 orbits, and my solver reproduces their values to about 9 digits for
the figure-8, butterfly I, moth I and II, dragonfly, butterfly III, goggles, bumblebee and yin-yang.
Neither of the two orbits is in it (closest T|E|^1.5 is 3e-3 away, a match needs about 1e-5).

Plot (figures/two-orbits.svg, made with tools/plot-orbits.mjs): both are figure-8 shapes wound
about 7 times with a slow wobble, next to the real figure-8.

What that does and doesn't mean:

- Butterfly II is a published Suvakov-Dmitrasinovic orbit and it is also missing from their table, so
  "not in that table" is not the same as "never published".
- Both orbits have T|E|^1.5 within 2e-4 of 7x the figure-8 (64.66), so they are probably
  figure-8 like orbits, not something exotic.
- I did not check other catalogs (Suvakov's own list, later papers). Not claiming these are new.

## Finer scan (v1 0.05-0.6, v2 0.05-0.7)

6x6 tiles of 1024x1024 cells (about 38M orbits, cells roughly 3x finer than Li and Liao's grid), tmax 40
for the return time (so full periods up to 120 when a relabeled return is used). 46 distinct orbits closed:

- 8 from my known list, 6 from the Li-Liao table
- 22 figure-8 relatives (n-times wound figure-8s, including some with n = 17, 19, 22 and T up to ~100)
- 10 not in either list. 5 of those are not figure-8 relatives:

        v1            v2            T          T|E|^1.5   closest published (rel diff)
    A   0.0880054619  0.4212710769   8.97545    24.33439   I.B1  5.3e-3
    B   0.0620144090  0.2547876725  10.09007    35.05118   I.B2  7.1e-3
    C   0.0560050559  0.1398707263  10.45366    39.64485   I.B3  3.0e-5
    D   0.3827414123  0.4589771182  25.05730    42.78349   I.B5  3.3e-5
    E   0.2517330337  0.2941901556  27.00344    79.27361   I.A9  4.8e-5

All five re-close to better than 1e-9 with a 100x tighter integrator. C, D and E each have a published orbit
whose fingerprint is within 5e-5, so they are probably relatives of goggles, moth II and I.A9, not
unrelated orbits. A and B have nothing close in the Li-Liao table (but see the literature check below). They are short orbits with close approaches
(about 0.04), so their basins are narrow, which is a believable way for a 4000x4000 grid to miss them.
The figure is figures/five-candidates.svg.

Still not proof of anything: I only compared against the one table, and a miss in that table is not
the same as a miss in the literature (butterfly II is also not in it).

## Literature check (this changes things)

Found while checking A to E: Hristov and Hristova (arXiv 2404.16526, Astronomy and Computing 49, 2024)
searched exactly this family (bodies at (-1,0), (1,0) and the origin, equal parallel velocities for 1 and 2,
zero angular momentum) with T|E|^1.5 < 70 and periods up to 1000. They report 12,431 initial conditions =
6,333 distinct orbits, and they published the data (100 digits, columns vx, vy, T, T*, T* = T|E|^1.5):
http://db2.fmi.uni-sofia.bg/3bodyeuler/ . There is also a 421,562 entry file with T* < 200 on that page.

So the Li and Liao table (695 orbits) was never the full picture, and my comparison against it was too weak.
A to D have T* of 24.3, 35.1, 39.6 and 42.8, so they are inside the range that paper covers and are most
likely in their database. E has T* = 79.3, outside the 12,431 file but inside the T* < 200 file. I have not
downloaded either file yet, so none of A to E is confirmed either way. Treat all five as "probably already
published" until that comparison is done.

The scan of the rest of the plane (v1 0.05-0.6 with v2 0.7-1, and v1 0.6-1 with v2 0.05-1) closed only 2
more unlisted orbits, (0.3418, 0.7113) T = 106.1 T* = 53.26 and (0.6981, 0.3285) T = 100.8 T* = 60.89.
Same caveat, both are inside T* < 70.

## Angular momentum

The start state has a knob `ell` (total angular momentum, `ell = 0` is the usual plane). Scans at
ell = 0.02 and ell = 0.1 (about a million orbits each) found no orbit that closes. My guess is that the closing in this
family only works because of a symmetry at L = 0, but I haven't proven that. The rotated-return
solver (`huntExact` in newton.js) doesn't get anywhere either, so treat this part as a dead end for
now. A start with perpendicular crossings (Henon style) would keep a symmetry and is probably the
better way to get to L != 0.

## Run

    npm test                  # float64 checks, node 18+
    python -m http.server     # open http://localhost:8000, needs a browser with WebGPU

Click a light spot on the map to refine it. "Deep scan" runs the whole pipeline over tiles.

## Next

comparing A to E and the two extra orbits with the Hristov and Hristova files, Henon style perpendicular-crossing family,
volunteer compute (browser tabs donate GPU time), 4+ bodies.

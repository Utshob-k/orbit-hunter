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

Henon style perpendicular-crossing family, a look at the shapes of those two orbits, other catalogs,
volunteer compute (browser tabs donate GPU time), 4+ bodies.

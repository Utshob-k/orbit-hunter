# Orbit Hunter

A search for new periodic orbits of the planar equal-mass three-body problem.

How it works:

- Screening (WebGPU, float32). One GPU thread per (v1, v2) starting condition in the
  Suvakov-Dmitrasinovic family integrates the orbit and records how close it ever comes back to its
  starting phase-space point. 512x512 orbits take about a third of a second.
- Verification (float64, CPU). Candidates are refined with Nelder-Mead, then closed with a
  Levenberg-Marquardt solver on (v1, v2, period). float32 is only ever a filter, never the answer.
- Fingerprint. `T * |E|^1.5` doesn't change when you rescale an orbit, so it's used to tell orbits apart.

## What's checked so far

- The solver reproduces the figure-8 (T = 6.325914, published 6.32591398).
- It also closes butterfly I/II/III, goggles, bumblebee and yin-yang I b from their published
  starting values, residual around 1e-11 or better (`npm test`).
- The GPU scan shows a dip at every one of those orbits, but for long, sensitive orbits (bumblebee,
  T ~ 63) the dip is blurry: the best float32 cell can sit a few 1e-3 away from the true point.
  So it shortlists candidates and the float64 step does the real work.
- Moth I/II, dragonfly and yin-yang I a are NOT in the list yet. The starting values I had for
  them were wrong (they converged to the figure-8) and need to be looked up properly.

## Honest caveat

This exact (v1, v2) plane has already been scanned by other people (Suvakov and Dmitrasinovic in
2013, then Li and Liao with a much finer grid in 2017-2018), so the easy finds are probably gone.
Realistic ways to find something new: longer periods, much finer grids, other slices
(non-zero angular momentum, unequal masses) and more bodies.

## Run

    npm test                  # float64 checks, needs Node 18+ (takes a minute or two)
    python -m http.server     # then open http://localhost:8000, needs a browser with WebGPU

Click a bright spot on the map to refine it and watch the orbit.

## Next

Volunteer compute (browser tabs donate GPU time), a public catalogue of verified orbits,
stability classification, other slices, 4+ bodies.

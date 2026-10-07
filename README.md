# Orbit Hunter

A search for new periodic orbits of the planar equal-mass three-body problem.

How it works:

- Screening (WebGPU, float32). One GPU thread per (v1, v2) starting condition in the
  Suvakov-Dmitrasinovic family integrates the orbit and records how close it ever comes back to its
  starting phase-space point. 512x512 orbits take about a third of a second.
- Verification (float64, CPU). Candidates are refined with Nelder-Mead, then closed with a
  Levenberg-Marquardt solver on (v1, v2, period). float32 is only ever a filter, never the answer.
- Fingerprint. `T * |E|^1.5` doesn't change when you rescale an orbit, so it's used to tell orbits apart.

## What works so far

- Closes all 11 orbits in known.js (figure-8, butterflies, moths, goggles, dragonfly, bumblebee,
  yin-yang) from their published start values, residual 1e-10 or better. `npm test`
- Blind scan of the whole plane (1024x1024, tmax 15) gets the figure-8, butterfly II/III,
  goggles, yin-yang I b and moth I back without being told where to look.
- GPU scan is blurry for long orbits (bumblebee, T ~ 63), best cell can be a few 1e-3 off.
  It only picks candidates, the float64 solver does the real work.

## Caveat

This exact (v1, v2) plane was already scanned by Suvakov and Dmitrasinovic (2013) and then by
Li and Liao (2017-18) with a much finer grid, so most easy finds are taken. "Not in known.js" does
not mean new, it has to be checked against their published lists. Other things to try: longer
periods, finer grids, other slices (angular momentum, unequal masses), more bodies.

## Run

    npm test                  # float64 checks, needs Node 18+ (takes a minute or two)
    python -m http.server     # then open http://localhost:8000, needs a browser with WebGPU

Click a bright spot on the map to refine it and watch the orbit.

## Next

Volunteer compute (browser tabs donate GPU time), a public catalogue of verified orbits,
stability classification, other slices, 4+ bodies.

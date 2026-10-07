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

This plane has been searched hard already. Suvakov and Dmitrasinovic (2013) found 13 families here, then
Li and Liao (arXiv 1705.00527) used the same setup with grids up to 4000x4000 and periods up to
T = 200 and found 695 families (229 with T <= 100). So "not in known.js" does not mean new, and a
plain finer grid / longer period scan of this plane mostly repeats their work. Things that are less
covered: other slices (non-zero angular momentum, other start configurations), more bodies,
T > 200, and much finer grids around the long orbits.

## Run

    npm test                  # float64 checks, needs Node 18+ (takes a minute or two)
    python -m http.server     # then open http://localhost:8000, needs a browser with WebGPU

Click a bright spot on the map to refine it and watch the orbit.

## Next

Volunteer compute (browser tabs donate GPU time), a public catalogue of verified orbits,
stability classification, other slices, 4+ bodies.

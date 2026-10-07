# Orbit Hunter

A search for new periodic orbits of the planar equal-mass three-body problem.

- **Screening (WebGPU, float32):** one GPU thread per (v1, v2) initial condition in the
  Šuvakov–Dmitrašinović family integrates the orbit and records its closest return to the starting
  phase-space point.
- **Verification (float64, CPU):** every candidate is refined with Nelder–Mead on a
  Dormand–Prince 5(4) integrator. float32 is only ever a filter.
- **Sanity check:** `npm test` reproduces the figure-8 orbit and checks energy conservation.

Status: early. CPU reference + validation done; GPU screener and UI written, not yet validated.
Planned: volunteer compute (browser tabs donate GPU time), a public catalog of verified orbits,
stability classification, 4+ bodies.

## Run

    npm test                    # float64 reference checks (Node 18+)
    npx http-server . -p 8080   # then open http://localhost:8080 (needs a WebGPU browser)

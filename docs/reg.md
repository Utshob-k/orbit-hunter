# The regularised integrator `src/ias/reg.js`

`src/ias/reg.js` integrates the planar gravitational problem of N = 2 or 3 bodies (any positive masses, G = 1) over a given physical time `tau` with algorithmic regularisation in chain coordinates (Mikkola and Tanikawa 1999), and can return the 12 x 12 (in general 4N x 4N) derivative of the end state with respect to the start state, obtained by differentiating the scheme by hand. The ias route uses it for the pieces with a close pair ([deep.md](deep.md)); the module does not depend on the rest of the repository and can be imported alone. This page describes the interface as the code has it. The method is in the comment at the top of the file.

```js
import { flowChain, flowEnc } from './src/ias/reg.js';
const settings = JSON.parse(fs.readFileSync('src/ias/reg-settings.json', 'utf8'));
const r = flowChain([1, 0.1], start, tau, { jac: true, settings });
if (r.ok) { r.end; r.M; r.minD1; }
```

## Arguments

`flowChain(masses, s, tau, opts = {})`

- `masses`: array of N positive numbers, N = 2 or 3. The chain re-formation (the choice of which pair is the first link) is written for N = 3; for N = 2 the chain is the pair. Other N are not supported.
- `s`: the start state, a flat array of length 4N: the positions `x0, y0, x1, y1, ...` and then the velocities `vx0, vy0, vx1, vy1, ...` (body i has `s[2i], s[2i+1]` and `s[2N+2i], s[2N+2i+1]`). The centre of mass need not be at rest or at the origin; it moves on a straight line and is part of the end state.
- `tau`: the physical time to integrate over, positive. The end state is at `tau` to within a few units in the last place of the last step (below).
- `opts.jac`: `true` to compute the matrix `M` as well (0.01 s for a piece of the ias route with 3 bodies). `opts.settings`: an object that overrides the constants in `DEFAULTS` (the file `src/ias/reg-settings.json` has the values of the stored runs, the same as `DEFAULTS`).

`flowEnc(state12, tau, opts)` is `flowChain([1, 1, 1], ...)`, the three equal masses of the perpendicular start.

## The constants (`DEFAULTS`)

| name | value | meaning |
|---|---|---|
| `comp` | true | the state and the time are carried between macro-steps as double-double sums (error-free additions) |
| `TOL` | 1e-15 | tolerance of the extrapolation, the largest scaled difference of the last two columns of a macro-step |
| `nseq` | [2, 4, 6, 8] | numbers of leapfrog sub-steps of the columns of the Bulirsch-Stoer extrapolation |
| `kmin` | 3 | the first column at which the error is tested |
| `safety`, `gmax`, `gmin` | 0.9, 2, 0.5 | step control: the next fictitious-time step is multiplied by `safety (TOL/err)^(1/(2k-1))`, kept between `gmin` and `gmax` |
| `d6` | `'D6p'` | the error of the shortest chain vector is scaled by its smaller length at the start and at the end of the step (any other value: the scale max(1, |value|) for every component) |
| `ds0f` | 0.05 | first fictitious-time step: `ds0f * U0 * min(tau, 0.1)`, U0 the force function at the start |
| `endUlp` | 4 | the end-time search stops when the time reached differs from `tau` by at most this many units in the last place of the last increment |
| `stagUlp` | 64 | if the search stalls, the best trial is accepted up to this many units (and `stagnation` is set), otherwise the flow fails |
| `maxEnd` | 60 | most trials of the end-time search |
| `maxMacro` | 3000000 | most macro-steps |

## What comes back

On success an object with

- `ok: true`, `end`: the end state (length 4N, same layout as `s`); `M`: the derivative of `end` with respect to `s` at fixed `tau`, row-major with the row the output component and the column the start component (length (4N)^2), or `null` without `jac`; the end-time dependence is included, so the matrix is that of the map "state at time 0 to state at time `tau`". The map is symplectic in (positions, momenta); with the masses 1 the momenta are the velocities.
- `tEnd`: the time reached as a double-double `[hi, lo]`; `fRes`: its difference from `tau`; `ulpDt`: the unit in the last place of the last time increment; `fOverUlp = |fRes| / ulpDt`; `perm`: the chain order at the end; `Pt`: the constant `U0 - T0` (minus the energy).
- statistics: `macro` (accepted macro-steps), `rejected` (rejected ones), `subSteps` (leapfrog sub-steps), `endTrials` (trials of the end-time search), `endBisections`, `stagnation` (the search ended with more than `endUlp` units), `reforms` (chain re-formations), `minD1` (the smallest chain distance seen at the ends of the macro-steps, i.e. the closest approach as `reg.js` sees it) and `d2AtMinD1` (the next distance at that moment), `maxEnergyDiag`, `lastEnergyDiag` (the energy constant of the logarithmic Hamiltonian, which should stay at rounding), `columns` (how often each column of the extrapolation was the last one).

On failure `{ ok: false, reason, ...statistics }` with the reason

- `'too many macro-steps'` (`maxMacro` reached),
- `'macro-step collapsed'` (the fictitious-time step fell below 1e-300),
- `'end-time iteration (no trial converged)'` (no trial of the end-time search was accepted by the extrapolation),
- `'end-time iteration'` (the best trial misses `tau` by more than `stagUlp` units; `fRes` and `ulp` are given).

`src/ias/bridge.js` turns a failure into an error of the evaluation (there is no fallback to another integrator).

## What it is tested against

- `test/gate-a.test.js` and `tools/gate-a.mjs`: the end states against the exact Kepler flow of the equal-mass pair (ellipses and near-radial orbits with periapsis distance down to 1e-8; `data/deep/gate-a-all.json`, 80 rows) and, with a third body, against a 40 digit flow (`data/deep/extra/gate-a-extension.json`, 44 rows).
- `test/reg-unequal.test.js`: the masses 1 and 0.1, e = 0.9, one period, against the exact Kepler flow with mu = m1 + m2 (`tools/gate-a-unequal.py`, `data/deep/extra/reg-unequal-mass.json`), and the energy and the angular momentum of the end state.
- `test/reg-matrix.test.js`: the matrix `M` on six encounter pieces of stored points (closest approach from 4e-4 down to 7e-10), against central differences with Richardson extrapolation and for symplecticity (`data/deep/extra/reg-matrix-pieces.json`).

The tests cover a pair with a third body far away (equal masses for the matrix, one unequal mass ratio for the end state). They do not cover a third body near the pair (the guards of the ias route stop the trace there), more than three bodies, or the matrix for unequal masses.

## When it fails or should not be used

- A third body within a few tenths of the close pair, or a second close pair: the chain is formed from the shortest pair and the third body is attached to the nearer end, but the accuracy near a close triple approach is not tested; the ias route does not call `reg.js` there (guards G1a, G1b, G2 in `src/ias/guards.py` and `src/ias/bridge.js`).
- An exact collision (r = 0) is not representable: the flow is regular for any positive pericentre distance, and the derivative `M` grows without bound as the pericentre distance goes to zero (the six tested pieces have `max|M|` from 4 to 4e3).
- Energy and angular momentum are conserved to rounding in the tests; there is no check of them inside the function, only `maxEnergyDiag` for the constant of the regularised Hamiltonian.
- The stored traces were run with a copy of this file whose sha256 is stored in their field `frozen`; the released file differs from it in comments and in code that no run called (see `data/deep/README.md`).

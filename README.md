# Orbit Hunter

A search for periodic orbits of the planar three-body problem with equal masses. A GPU does the rough search in
the browser (WebGPU), double precision code on the CPU closes and checks every candidate.

**Where it stands.** The code reproduces published orbits to about nine digits. Every orbit it found with zero
angular momentum was already published. For non-zero angular momentum it found 81 exactly periodic orbits that I
could not match to the one catalog I could get, and 6 of them are linearly stable. I do not know if any of those
is new, and nothing here should be read as a discovery.

## Results

**Which catalogues contain orbits with L != 0.** Some catalogues only contain L = 0 orbits, so "matches none of them" means nothing for orbits with L != 0. This is what I actually compared against:

| catalogue | orbits with L != 0? | what I did |
|---|---|---|
| Three Body Orbits atlas (threebodyorbits.com) | yes, 37 equal-mass entries (14 BHH, 13 Suvakov, 10 Sheen) | compared all 85 base orbits: 2 match, 81 do not |
| Jankovic et al., CPC 2020 | yes, 99 BHH satellites | converted all, 98 close; used for the satellite runs |
| Jankovic et al., PRL 2016 | yes, 57 satellites, all in the CPC list | consistency check only |
| Li and Liao 2017 (695 orbits) | no, L = 0 | only my L = 0 orbits |
| Hristov and Hristova 2024 (421,562 rows) | no, L = 0 | only my L = 0 orbits |
| Suvakov gallery (three-body.ipb.ac.rs) | partly, pictures not numbers | not compared (its site certificate is broken for my tools) |
| Li, Tao, Li and Liao 2025, New Astronomy 119, 102407 | finite L | not read yet, asked the authors |

So "81 match nothing" means: nothing among 37 atlas entries plus the 99 CPC satellites. It is a weak statement.

**Counting.** The 85 orbits of the perpendicular search are 6 linearly stable, 77 unstable and 2 uncertain. The satellite work uses 7 stable parents:
those 6 plus the orbit at T* = 29.31 that was found later by continuation (it is not one of the 85). Of the 85, 2 have L = 0 (members of the family
that are also in the L = 0 catalogues) and 2 are atlas orbits.

- All 11 orbits in `src/known.js` (figure-8, butterflies, moths, goggles, dragonfly, bumblebee, yin-yang) close from
  their published start values with residual 1e-10 or better. `npm test` checks this.
- **Zero angular momentum.** I scanned the Suvakov-Dmitrasinovic plane at a finer grid than Li and Liao used. Every orbit
  I closed is in Hristov and Hristova's database (arXiv 2404.16526, 421,562 initial conditions): the eight that were
  not in my own list (seven from the scans, one L = 0 orbit found by the perpendicular search), including two with
  T|E|^1.5 about 79, match to 1e-8 or better. Nothing new there.
- **Non-zero angular momentum.** A Henon-style start (below) gives orbits with L != 0. From 287 starting points,
  111 hunts reached an exactly periodic orbit, 85 distinct orbits after removing repeats:
  2 have L = 0 (published), 2 are orbits of the Three Body Orbits atlas, **81 match nothing in the atlas**.
- **A control.** The search found published L != 0 orbits without being pointed at them: Sheen's "Two ovals",
  Sheen's "Oval, catface and starship", and Suvakov's SN.9 (matching the atlas to the rounding of its numbers).
- **Linear stability.** 6 of the 85 are stable, 77 unstable, 2 uncertain (closest approach under 0.005). All 6 stable
  ones are among the 81:

| lam | T* | L* | closest approach |
|---|---|---|---|
| 0.86525 | 4.960 | 1.015 | 0.135 |
| 0.49914 | 9.658 | 1.042 | 0.501 |
| 0.49474 | 17.847 | 2.572 | 0.505 |
| 0.50926 | 19.769 | 2.595 | 0.491 |
| 0.52028 | 33.745 | 2.566 | 0.480 |
| 0.70190 | 47.065 | 2.626 | 0.242 |

  (T* = T|E|^1.5 and L* = |L||E|^0.5 are unchanged when an orbit is rescaled; closest approach is in units where
  the outer two bodies start at distance 2.)
- **Connection to a published family.** The satellites of the BHH family (Jankovic, Dmitrasinovic and Suvakov,
  CPC 2020, tables 3 to 6) are inside my search family. I converted all 99 (98 re-close, and my T* and L* reproduce
  theirs, median relative difference 6e-10 and 1e-10) and followed each one in lam until the rotation angle theta is 0.
  The first attempt (steps in lam, `huntPeriodicMS`) reported 40 of 98 reaching an exactly periodic orbit, but that
  method can jump to another branch, so I redid it with continuation in arclength (below), which can't:
  - Of those 40, arclength gives the same orbit for only 3, a different one for 11 and runs out of time for the
    26 high-k ones, so the other 26 are unchecked. The orbits found the first way are still genuine periodic orbits (they
    close to 1e-11), but I can no longer say they are on the satellite's branch. In particular my earlier statements that
    the k = 3 and 4 satellites end at SN.9, and that satellite N = 9 (k = 5) is connected to 5 times the stable orbit at
    lam = 0.8653, are not supported: theta along the N = 9 branch peaks at -0.07 and never reaches 0, it only passes close.
  - On the 58 that failed before, 13 hunts reached an exactly periodic orbit, 30 ran out of time in both directions and
    the rest lost the family near a close approach. Together with the checked ones that makes **17 distinct orbits**
    reached by continuation (`data/perp-arc-orbits.json`). 3 of them are known or already mine (SN.9, Sheen's "Three
    ovals", my stable orbit at T* = 9.658) and 14 match neither the atlas nor my first list. Two are linearly stable:
    the T* = 9.658 one already in the table above, and **lam = 0.03231, T* = 29.310, L* = 0.7897** (not in the table).
    The atlas has only 14 equal-mass satellites, so not matching it says very little.

- **Topology (syzygy words, `src/topology.js`).** Every time the three bodies are on a line I write down which one is in the
  middle; read around one period that is a cyclic word, and I bring it to a canonical form (relabeling, start point, time
  reversal). Checks: the figure-8 is 012 twice; Butterfly I and II have the same word (so it is a coarse label, it can't tell
  close variants apart); all 98 satellites of Jankovic et al. give the word (01)^k with exactly 2k syzygies, k being their
  topological exponent. Results: all 17 orbits reached by arclength are (01)^k with k from 3 to 14, so they are of the BHH
  satellite type. Of my 85 orbits from the perpendicular search, only 18 are (01)^k; the other 67 have other words
  (for example 000101), so they are not BHH satellites. That says nothing yet about whether they are new, it only says which
  tables could contain them.

- **Satellite families by bifurcation (`src/relative.js`, `src/satellites.js`).** A satellite of order k branches off the k times
  repeated orbit where a rotation number nu of the orbit is m/k. For each of my 7 stable orbits I follow lam (the orbit
  then rotates a little each period), track nu, and at every crossing of m/k follow the k fold repeat until the bordered
  determinant of the shooting system changes sign, then follow the new branch (`tools/nu-crossings.mjs`,
  `tools/satellite-hunt.mjs`). All 7 stable orbits have the word (01)^k, with k = 1, 3, 5, 6, 8, 9, 16, so they are BHH
  orbits (the T* = 4.96 one is the k = 1 BHH orbit itself, the others are satellites already).
  - **Check:** from the T* = 4.96 orbit the branches for k = 4 and 5 pass through the published satellites N = 6 and N = 9
    (T* and L* agree to 4 digits) and the k = 3 branch passes within 0.3 % of N = 1.
  - 211 branch points were found on 4 of the 7 orbits (the 3 longest orbits did not step at my step size, so they are not
    scanned), k up to 20. The 30 with k up to 8 were followed far (`tools/compare-satellites.py`). The branches of the
    orbits at L* = 2.57, 1.04 and 0.79 (k = 5 to 8 repeats, T* from 38 to 207) pass close to no published satellite, nor do the
    k >= 6 branches of the T* = 4.96 orbit. So these are families I can not find in the CPC tables.
    The tables only go to T* about 90, only some of the arms were followed to the end, and nobody expert has looked at
    them, so I'd call them candidates.

- **Where the stable orbits sit on the BHH curve.** The PRL says all published satellites lie on the same curve of L against T/k as
  the BHH orbits themselves. In my units that curve has T*/k from 1.86 to 4.92 (the 99 satellites of CPC 2020). Four of my stable orbits
  lie on it or close to it (T* = 4.96, 9.66, 29.31 and nearly so), but the stable orbits at L* about 2.57 to 2.63
  (T* = 17.85, 19.77, 33.75, 47.07, words (01)^5, (01)^6, (01)^9, (01)^16) have T*/k between 2.9 and 3.75, far from any
  CPC satellite (relative distance 0.35 to 0.48; the satellites near L* = 2.6 have T*/k about 1.95). So they are stable orbits with the
  BHH word that are not on the published curve. I do not know if that is the "second stable region" the PRL says no satellites were found in.
  The k = 1 orbit family seen through lam (`tools/progenitor-curve.mjs`, `data/progenitor-curve.json`) is stable from lam about 0.822 up to
  at least 0.935 (L* from 1.04 down to 0.83) and unstable below, but this covers only part of the family.

- **Verification of the satellite branches (`tools/verify-branches.mjs`, `tools/check-stability-fd.mjs`).** 36 branch arms (3 branch points
  for each of the 7 stable orbits) were stored with their states and checked at three points each: the syzygy word must be (01)^K with
  exactly 2K syzygies (K = exponent of the progenitor times k), the orbit must close to 1e-9 after re-solving with 16 pieces and a tighter tolerance
  (T* unchanged to 1e-8), and T* and L* must not jump. 30 of the 36 arms pass all three (17 branch points); the other 6 have a jump of more than
  50 times the median step and two of them also change their word, so I do not trust them (they probably run into a close approach).
  Re-closing: all 108 points close to 1e-12. The stability code was also checked against a separate finite difference monodromy matrix on four orbits
  (two of them rotating) and agrees to 1e-6 on three and 5e-4 on the fourth.
  - **None of these branches matches a CPC satellite of the same exponent** (the only matches are N = 1, 6, 9 from the T* = 4.96 orbit, checked before).
    More precisely: they do not pass within 0.5 % in T* and L* of any CPC satellite with the same k. Two passes within 0.5 % of satellites with a
    different k (N = 69 and N = 93) are coincidences. The CPC table only reaches T* of about 90, and most of my branches are above that.
  - **Stability along the branches:** 23 of the 30 arms have at least one linearly stable sample, but at most of them it is the sample at
    the branch point itself, where the repeat of a stable orbit is stable. The interesting ones are stable at every sample along the arm:
    the branch point at lam = 0.6018 of the T* = 33.7 orbit (k = 3, exponent 27), T* from 77 to 93 and L* from 2.62 to 2.79, both arms, 10 of 10 samples.
  - **What this does not show:** nothing here is called new. I have not read the 2025 paper of Li, Tao, Li and Liao (New Astronomy 119, 102407), and nobody expert has looked at these.

## How it works

1. **Screening (`src/gpu.js`).** One GPU thread per starting condition integrates the orbit in float32 and records how
   close it ever gets back to its start. Float32 only picks candidates, it never decides anything.
   512x512 orbits take about half a second.
2. **Closing (`src/newton.js`).** Levenberg-Marquardt on (v1, v2, period) in float64, with the Dormand-Prince integrator in
   `src/physics.js`. The fingerprint T|E|^1.5 tells orbits apart and spots an orbit run several times.
3. **The zero-L family.** Bodies 1 and 2 start at (-1,0) and (1,0), body 3 at the origin, velocities (v1,v2) for
   bodies 1 and 2 and minus twice that for body 3. Candidates come from a 2D scan of (v1, v2).
4. **The perpendicular family (`src/perp.js`).** Bodies on the x axis at -1, lam, 1, all velocities along y. If the system is ever
   collinear again with every velocity perpendicular to the line, the orbit is mirror symmetric, so it repeats after
   twice that time rotated by an angle theta. That gives L != 0. To get a truly periodic orbit, slide lam until theta = 0.
5. **Multiple shooting (`src/shooting.js`).** The half orbit is cut into pieces so a small error can't blow up over the
   whole orbit, and a tangent predictor follows how the solution moves with lam. The old hunts failed on tight, many-winding
   satellites (k = 15 to 48) mostly because the predictor was bad, not because the orbits are long (their full period is only
   about 10 time units).
   **Arclength continuation (`huntArclength`).** lam and the shooting unknowns are followed together as one curve (the next point
   has to lie on the plane perpendicular to the tangent), so turning points are no problem, and a step is refused when theta
   jumps by more than a few hundredths of a radian or the tangent turns too much, so no zero is skipped and the branch can't be
   left by accident. When theta changes sign the zero is found by regula falsi along the curve.
6. **Stability (`src/stability.js`).** The orbit is integrated together with its variational equations over one period, the
   monodromy matrix is restricted to the 8 dimensional part with zero center of mass and momentum, and its eigenvalues
   (own complex QR solver, no libraries) say stable or not. Four of the eight eigenvalues are 1 in theory and scatter
   a little numerically, so the four closest to 1 count as trivial.

Checks: `test/figure8.test.js` (figure-8 and energy drift), `test/known.test.js` (11 published orbits),
`test/stability.test.js` (known eigenvalues, figure-8 stable, matrix symplectic, butterfly I unstable) and
`test/topology.test.js` (figure-8 and k = 3 satellite words) and `test/shooting.test.js` (multiple shooting gives the same orbit as single shooting; the tangent equals a finite
difference). Against the atlas my stability numbers match to four digits for the three re-found orbits
(|lambda|max 1.409, 19.55, 9.860).

## What is not proven

- "Not in the atlas" is not "new". The atlas lists only 14 equal-mass BHH satellites, and Jankovic et al. report about 100.
  Their list is only in the paper's tables, and the paper does not cover everything. Butterfly II, a published orbit, is
  also missing from the Li-Liao table.
- Following the high-k satellites (about 56 of the 98) to a zero of theta takes more than the 10 minutes
  per start I gave each direction, so for those I do not know if they reach a periodic orbit. A few others lost the family
  near a close approach (lam near 0.25 to 0.5 or near 1), which may be where the branch really ends.
- **How well the orbits close.** The 7 stable orbits close to 5e-10 or better with two independent integrators (Dormand-Prince 5(4) and
  Gragg-Bulirsch-Stoer, `tools/check-closure-bs.mjs`). The unstable ones are much weaker. With Dormand-Prince 26 of the 85 close worse than 1e-9,
  8 worse than 1e-8 and the worst is 1.1e-7; with Bulirsch-Stoer 11 are worse than 1e-7 and the worst is 3.5e-6 (columns `closureDP45` and `closureBS`
  in `data/orbit-table.csv`). For a strongly unstable orbit the instability multiplies the rounding error, so double precision cannot show that it
  is exactly periodic; those orbits need high precision arithmetic before anyone should call them that.
- A first version of this table said the satellites connect to my stable orbits. That came from a method that jumped
  branches, see above.
- I used to think many of my orbits were probably more BHH family members. The syzygy words say that only 18 of the 85 are.

## Dead ends and bugs (so I don't repeat them)

- First try at L != 0: a knob `ell` in the zero-L family. Found nothing, and a "rotated return" solver didn't help; exact
  closure in that family relies on a symmetry that only exists at L = 0.
- The solver can "converge" to T -> 0 (state(0) = state(0) trivially). Fixed by keeping T near the guess.
- Near-collision orbits made the integrator loop forever. Fixed with step caps and early exits.
- Fingerprints have to be matched tightly: butterfly I and II differ by only 6e-5.
- My first stability cutoff called a stable orbit unstable because of the scatter in the trivial eigenvalues.
- Early hunts used a success cutoff of 1e-9 on the rotation, tighter than long orbits can reach.
- A first reading of the paper's table took its L for the scale free one; it is the angular momentum at size b = 1.

## Running it

```
npm test                       # all four tests, a minute or two, node 18+
python -m http.server          # then open http://localhost:8000 (needs WebGPU)
```

The page scans a region and draws the map. Click a light spot to refine it, or press "Deep scan" to run the whole pipeline.
Both families are in the "family" menu.

Useful scripts in `tools/` (all print what they do at the top):

- `hunt-all.mjs` hunts truly periodic orbits from a list of starts on worker threads; add `ms` to use multiple shooting or `arc` for arclength continuation (`HUNT_ONLY=list.json` picks starts)
- `summarize-hunt.mjs` removes repeats and marks atlas matches; `stability-list.mjs` computes stability
- `convert-cpc.mjs` turns the paper's satellite table into my start; `compare-*.mjs` compare orbits with the published lists
- `plot-orbits.mjs`, `plot-perp.mjs` draw orbits as svg (figures/)

## Data

| file | what it is |
|---|---|
| `data/perp-periodic*.json`, `hunt-results.jsonl`, `stability-perp-3.json` | my orbits and their stability |
| `data/hunt-cpc-*.jsonl`, `cpc-converted.json` | the continuation from the paper's satellites (`hunt-cpc-arc*.jsonl` is the arclength one) |
| `data/perp-arc-orbits.json`, `stability-arc.json` | the 17 orbits reached by arclength continuation and their stability |
| `data/cpc2020-satellites.json`, `liliao.json`, `threebodyorbits-equalmass-L.json` | **other people's numbers**, copied from Jankovic et al. 2020, Li and Liao 2017 and threebodyorbits.com |

## License

Creative Commons Attribution 4.0 (CC BY 4.0), see LICENSE. You can use, copy and change the code, the results and the orbit
lists as long as you credit Utshob Kandel and link to https://github.com/Utshob-k/orbit-hunter (see CITATION.cff).
The three files marked above belong to their authors, cite them if you use them.

## Next

Hear back from the authors of the BHH papers about whether the L != 0 orbits are known. Longer arclength runs for the high-k satellites,
and following each branch past its first zero. Possibly 4 or more bodies, or volunteer compute.

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

So the Li and Liao table (695 orbits) was never the full picture, and my first comparison was too weak.

I downloaded their 12,431 row file (5.3 MB, T* from 9.24 to 74.07) and compared with
`tools/compare-hristov.mjs`:

- A, B, C and D are all in it. T* agrees to 1e-10 or better, and for B, C and D the velocities agree to 1e-11
  too (A matches at a different crossing of the same orbit, so its velocities are different but T* is not).
- The two extra orbits from the scan of the rest of the plane (F and G below) are in it as well, T* agrees to
  1e-12 once I re-closed them at full precision.
- Every orbit in known.js is in it.
- E has T* = 79.27, above the 74.07 end of this file. Not checked, it would need their 109 MB file
  (60digits.txt, 421,562 entries, T* < 200).

So 6 of my 7 "unlisted" orbits were already published and none of them is new. Their file also shows what a
careful search of this plane looks like: it has 12,431 starts, I found 46 + 2.

The scan of the rest of the plane (v1 0.05-0.6 with v2 0.7-1, and v1 0.6-1 with v2 0.05-1) closed only 2
more unlisted orbits, (0.3418, 0.7113) T = 106.1 T* = 53.26 and (0.6981, 0.3285) T = 100.8 T* = 60.89.
F and G, see above, are both in the Hristov file.

## Angular momentum, version 2: perpendicular start (src/perp.js)

The first try (the `ell` knob) found nothing. The zero-L family only closes because of a symmetry, so
I started over with one that keeps a symmetry: bodies on the x axis at -1, lam, 1 (center of mass shifted
to 0), all velocities along y, (u1, u2, -u1-u2). If the system is ever collinear again with every velocity
perpendicular to the line, the orbit is mirror symmetric in time, so it repeats after twice that time,
rotated by some angle theta. This is the Henon style start. It has total L != 0.

- GPU mode 1 looks for "collinear and perpendicular" instead of "back at the start". At fixed lam,
  the solutions are isolated points of (u1, u2) and close easily (80 of the first 150 candidates in a tile).
- Every one of those is only relative periodic (rotation theta != 0). To get a truly periodic orbit I
  slide lam, re-closing at every step (`huntPeriodic`), until theta = 0.
- From 54 symmetric orbits at lam = 0.5 (half plane u1 <= 0, mirror images are the same orbit),
  11 distinct truly periodic orbits came out, listed in data/perp-periodic.json. `node tools/check-perp-list.mjs`
  re-checks them: one full period with a 1e-15 integrator returns to the start within 3e-8 or better.
  Most of the other 43 hunts just ran out of the 60 s budget, so that rate is a lower bound.
  Plot of two of them: figures/perp-periodic.svg.

| lam | T | L | closest approach |
|---|---|---|---|
| 0.17838 | 6.934 | 1.5919 | 0.0104 |
| 0.51987 | 7.116 | 0.2673 | 0.0045 |
| 0.44218 | 8.112 | 2.0626 | 0.558 |
| 0.53938 | 8.464 | 1.4836 | 0.090 |
| 0.54204 | 8.495 | 2.0266 | 0.458 |
| 0.49474 | 10.652 | 2.1656 | 0.505 |
| 0.55295 | 14.900 | 1.9469 | 0.435 |
| 0.49623 | 16.637 | 2.0433 | 0.504 |
| 0.48484 | 19.244 | 2.1202 | 0.515 |
| 0.53631 | 20.716 | 1.8516 | 0.298 |
| 0.75014 | 23.929 | 2.2535 | 0.072 |

Comparison with what is catalogued (tools/compare-threebodyorbits.mjs): the Three Body Orbits atlas
(threebodyorbits.com, 3,942 orbits) lists 37 equal-mass orbits with non-zero angular momentum that are not
choreographies: Suvakov's other orbits (13), Sheen's (11) and the equal-mass BHH satellites (14). I copied
their period, energy and L from the orbit pages into data/threebodyorbits-equalmass-L.json and compared the
scale free numbers T|E|^1.5 and |L||E|^0.5 (also allowing an orbit run n times). None of my 11 matches any of
them; the closest is off by about 0.5% in L|E|^0.5, which is far more than the numerical noise (1e-8).

Not the same as "new":

- Their 14 BHH satellites are only the ones that atlas lists. Jankovic et al (CPC 2020) say they found
  about 100 and I can't get that list, so I can't rule out a match there.
- Five or six of mine sit at L|E|^0.5 between 2.4 and 2.6, right where the R-series BHH satellites of the atlas are
  are (2.42 to 2.61), so they are probably more members of that same family, not a new kind of orbit.
- Two of the 11 are near-twins (same T|E|^1.5 to 5e-9, L|E|^0.5 differing by 2e-5), probably two nearby
  members of one family on either side of a turning point. They are kept as two.
- Simo's choreographies (343 orbits, non-zero L) were not compared, my orbits are not choreographies.

## Big run over 5 values of lam (stopped early)

Scanned lam = 0.15, 0.3, 0.5, 0.7, 0.85 (half plane u1 <= 0, 1024x1024 cells x 4 tiles each): 319 symmetric
orbits (117, 95, 85, 22, 0). Then hunted all of them for truly periodic ones, but stopped after 160 hunts:
24 reached rotation 0 (20 distinct, one of those 20 is the same orbit run twice, so 19), 91 timed out,
36 ran out of their own budget, 9 did not converge. Almost all failures are time-outs (11 workers on 8
cores), so the yield is a lower bound, and the first ~90 hunts gave nearly all the successes.
The 19 are in data/perp-periodic-2.json (the scan results themselves were not saved).

Control test: three of the 19 match atlas orbits from threebodyorbits.com to within the rounding of the
atlas numbers (L|E|^0.5 within 1e-5, T|E|^1.5 within 3e-6): Sheen's "Two ovals", Sheen's "Oval, catface and
starship" and Suvakov SN.9. The search found them without being pointed at them, so it can re-find
published non-zero-L orbits. The other 16 match nothing in the atlas, with the same caveats as above
(the atlas list is short and incomplete).

One of the 19 has L = 0 (to 1e-13): lam = 0.14505, T = 20.026, T|E|^1.5 = 79.2469. I checked whether it
is in the zero-L search space of the big databases: at exactly T/4 and 3T/4 it is collinear, the middle
body is at the midpoint and the outer two have equal velocities, all to about 1e-10. So it is an orbit
of the Suvakov / Li-Liao / Hristov family.

I then downloaded their big file (60digits.txt, 112 MB, 421,562 rows, T* up to 211) and compared with
`tools/compare-hristov-big.mjs`. Both orbits are in it:

- orbit E (T* = 79.27361): T* agrees to 5e-9 and the file's (vx, vy) = (0.251733034, 0.294190156) is the same
  starting point I had.
- the L = 0 orbit (T* = 79.246922): T* agrees to 3e-9, at a different crossing of the same orbit
  (their (vx, vy) = (0.1137, 0.1013), T = 20.91).

So every zero angular momentum orbit I found, in both families, is already published. That includes the
L = 0 one my perpendicular-start search stumbled on, which is a nice cross-check of the search but not a find.

## Second big run, on worker threads (tools/hunt-all.mjs)

The browser version of the hunt was too slow (11 workers on 8 cores, jobs killed at 130 s), so I moved it
to Node worker threads: 8 threads, 5 minutes per hunt, every result appended to data/hunt-results.jsonl as
it finishes. Input is the 319 symmetric orbits from the earlier scan (data/scan-rows-perp.json, 287 unique
starts). It took about 1h50.

- 287 hunts, 111 reached rotation 0 (the 176 failures: 92 ran out of time, 52 did not converge,
  31 lost the family while sliding lam).
- `node tools/summarize-hunt.mjs data/hunt-results.jsonl data/perp-periodic-3.json` collapses that to
  89 distinct orbits, minus 4 that are another orbit run 2 to 8 times, so 85 base orbits.
- 2 of those have L = 0 and are in Hristov and Hristova's database (checked with
  tools/compare-hristov-big.mjs). 2 are atlas orbits (Sheen's "Two ovals" and "Oval, catface and
  starship"). 81 match nothing in the atlas, 16 of them closing to better than 1e-8 and never
  coming closer than 0.2. About 10 of those 16 have L|E|^0.5 between 2.4 and 2.6, the band of the
  R-series BHH satellites of the atlas, so some are probably more members of that family (not shown).
- 8 of the 16 were re-checked with a 1e-15 integrator over one full period, they return to the start
  within about 1e-9 (data/email-orbits.json, `node tools/check-perp-list.mjs data/email-orbits.json`).

Same caveat as everywhere above: "not in the atlas" is not "new". I could not get the Jankovic et al.
satellite list, so I can't say whether any of these are known.

## Linear stability (src/stability.js)

For each periodic orbit I integrate the orbit together with its variational equations over one period, get
the 12x12 monodromy matrix, restrict it to the 8 dimensional part with zero center of mass and momentum, and
take the eigenvalues (a small complex shifted QR solver, no libraries). Four of the eight are exactly 1 in
theory (time shift / energy and rotation / angular momentum, two Jordan blocks) and scatter by about sqrt(error)
numerically, so the four closest to 1 are treated as trivial and stability is judged on the other four.
"stable" = those four on the unit circle (to 1e-6), "unstable" = off it by more than 10 times the scatter,
otherwise "uncertain".

Checks (`node test/stability.test.js`): the solver gets known eigenvalues right, the figure-8 comes out stable
(all 8 moduli 1.00000000), the matrix is symplectic (product of moduli 1 to 1e-12), butterfly I is unstable.
Against the atlas (threebodyorbits.com), the three orbits my search re-found give the same |lambda|max as the atlas
to 4 digits: Sheen's "Two ovals" 1.409, "Oval, catface and starship" 19.55, Suvakov SN.9 9.860.

Results for the 85 base orbits of the Node run (`node tools/stability-list.mjs data/perp-periodic-3.json
data/stability-perp-3.json`): 6 stable, 77 unstable, 2 uncertain (both have a closest approach under 0.005,
so the numbers are not reliable). All 6 stable ones are among the 81 not in the atlas:

| lam | T* | L* | closest approach |
|---|---|---|---|
| 0.86525 | 4.960 | 1.015 | 0.135 |
| 0.49914 | 9.658 | 1.042 | 0.501 |
| 0.49474 | 17.847 | 2.572 | 0.505 |
| 0.50926 | 19.769 | 2.595 | 0.491 |
| 0.52028 | 33.745 | 2.566 | 0.480 |
| 0.70190 | 47.065 | 2.626 | 0.242 |

Four have L* in the band of the R-series BHH satellites of the atlas (2.42 to 2.61) and two are in the band of the
A-series ones (0.76 to 1.13), and 14 of the 15 BHH satellites in the atlas are stable, so these are probably
more members of those families. Stable orbits are rare in general (Hristov and Hristova found 7 stable among
6,333 distinct orbits in the zero-L family), which is why they are interesting to ask about.

## Where a list of the L != 0 orbits could be (search done after the stability run)

- Jankovic, Dmitrasinovic and Suvakov, CPC 250 (2020) 107052: Tables 3 to 6 list 99 retrograde BHH satellites,
  columns N, L, a, c, T, k, closest return. They are relative periodic orbits at the size b = 1 (see the update
  below for how to read L, a, c), scanned at fixed L in {0.65, 0.7, 0.8, 0.85, 0.9, 0.935549, 1.0, 1.03, 1.07, 1.1},
  k from 3 to 58. I extracted the text from the paper PDF (the minus signs show up as NUL characters).
- Jankovic and Dmitrasinovic, PRL 116 (2016) 064301 / arXiv:1604.08358: Table 1, 57 satellites, (L, k, T) at E = -1/2.
  The units of its L and T do not match mine, so no direct comparison yet.
- The Three Body Orbits atlas: 14 equal-mass BHH satellites (A series L* 0.76 to 1.13; R series L* 2.42 to 2.61,
  mostly T* > 100; I could not establish from the atlas pages which of them is retrograde or prograde), Sheen 11, Suvakov 13, Simo choreographies 343.
- Li and Liao, arXiv:2008.13550: 598,996 BHH orbits and satellites, but for unequal masses (data in a supplement);
  the equal-mass case only appears as a plot and the 58 satellites of the 2016 paper.
- Not reachable: Suvakov's three-body.ipb.ac.rs / suki.ipb.ac.rs pages (certificate errors), pub.ipb.ac.rs
  (expired certificate), a 2025 ScienceDirect paper on L != 0 orbits (403). I did not bypass any of those.

Because their orbits are relative periodic (not exactly periodic) and sit at fixed round values of L, an
exactly periodic orbit of mine will not match a row number for number even if it belongs to the same family.

Update: I did the conversion (tools/convert-cpc.mjs, data/cpc2020-satellites.json holds their numbers, with the
source). Their setup is Jacobi vectors xi = (a, 0), eta = (b, 0) with the size fixed by b = 1, velocities
(0, c), (0, d) and d = L - a c, where L is the angular momentum at that size (so the L in their tables is not the
scale free L*; I first read it as L* and that was wrong). 98 of the 99 satellites re-close in my setup, and my T* and L*
reproduce theirs (median relative difference 6e-10 for the period, 1e-10 for the angular momentum), so their orbits
are inside my search family and the conversion is right. Their scale free L* runs from 0.84 to 2.82 (k from 3 to 58),
so their list covers both of my bands, including 2.3 to 2.7 (30 satellites). The rotation per period of their orbits is
small (median 0.02 rad, 62 of 98 under 0.05), so a small change of lam makes each exactly periodic.
A crude test (T*/k as a function of L*, k should come out near an integer for a satellite) gave nothing: 11 of 47
orbits near integer k, chance level, but the relation is only approximate so this does not decide anything.

Result of the continuation hunts from their satellites (`node tools/hunt-all.mjs data/cpc-rows.json data/hunt-cpc.jsonl 8 300 0`,
all 98 finished): only 9 reached an exactly periodic orbit (5 distinct up to repeats), 43 ran out of the 5 minutes, 17 did not
converge, 29 lost the family or could not step in lam. It worked for low k and failed for high k: 8 of 43 satellites with k < 15
reached one, 1 of 55 with k >= 15 (which includes all of their satellites at L* 2.3 to 2.7). What came out:

- 4 of the 9 end at Suvakov's SN.9 exactly (T* = 11.8309, L* = 1.1166, to better than 1e-11): their satellites with k = 3, 4, 4
  and, run twice, k = 10. So SN.9 is on their family. It is a published orbit and one I had re-found earlier (it is not
  among the 81 unmatched ones).
- 5 others (T*, L*): (12.3814, 1.1249), (19.7361, 1.0981), (19.7689, 1.4394), (26.6952, 0.8909), (46.7188, 2.1581). They match
  nothing in my lists. (19.7689, 1.4394) is close to twice the atlas orbit "Oval, catface and starship" (19.7566, 1.4387) but
  not equal (6e-4). These are exactly periodic orbits on their families that I had not found; they come from a published
  list, so that says nothing about whether they are new.
- None of my 81 unmatched orbits (including the 6 stable ones) was reached. That does NOT show they are new: the hunts
  barely got into the region where most of them sit (L* 2.4 to 2.6, which their satellites reach only at high k), and all
  the successes have L* below 2.2.

So the question "are the 81 new" is still open. What is settled: their satellites are in my family, the method reproduces
their numbers, and one published orbit (SN.9) is connected to them.

## Run

    npm test                  # float64 checks, node 18+
    python -m http.server     # open http://localhost:8000, needs a browser with WebGPU

Click a light spot on the map to refine it. "Deep scan" runs the whole pipeline over tiles.

## Next

checking E against the 109 MB file, getting the Jankovic et al. satellite list (ask the authors?), rerunning the failed hunts with fewer workers and longer limits,
volunteer compute (browser tabs donate GPU time), 4+ bodies.

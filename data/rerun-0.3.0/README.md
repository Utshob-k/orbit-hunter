# data/rerun-0.3.0

Reruns of satellite continuations of the R family with the code of version 0.3.0. They were made because the line search of the corrector skipped every trial point whose t (half the period) was below 0.3 or above 3 times the t of the START of the run, and some stored continuations ended at that bound and were described as a "collapse of the step" or a lost family (`docs/deep.md`, section "The bound on t in the line search"; `CHANGELOG.md`, corrections of 2026-10-30). The bound is relative to the predicted point in `src/shooting.js` (class C, since commit c87aa47) and in `src/iso-shooting.js` (class I, since this release). The stored files in `data/branch-points/`, `data/class-i/` and the others are not changed; the files here are new and no tool reads them.

## The files, one per run

- `class-c-upper-n<n>.txt`, n = 16 to 36: the printed output of `node tools/branch-point.mjs n theta` (without `--write`; the tool has no output option), theta = |member.turns| of `data/branch-points/<n>-upper.json` rounded to 4 digits (n = 16: 0.0627).
- `class-c-upper-n<n>-stored-options.txt`, n = 27 and 29 to 36: the same with the options of the stored file, `--repeat-tol=1e-8` (n = 27) and `--repeat-tol=1e-8 --pieces=16` (n = 29 to 36), as `docs/r-family-satellites.md` says the stored files were made. With the defaults the n fold repeat of these n does not close (exit status 1, the runs without a result in the table).
- `class-c-upper-n<n>-max1500.txt` (n = 23 to 28) and `class-c-upper-n<n>-stored-options-max1500.txt` (n = 29 to 36): the runs with `--max-steps=1500`. The loop of `tools/branch-point.mjs` that follows a sense is limited to 700 steps by default; for n = 23 to 28 with the defaults, and for n = 29 to 36 with the options of the stored file, the sense that had stopped by a collapse of the step now ends at that limit (701 points). The option `--max-steps=N` of the tool (700 by default; the commands of the 14 files are at the end of this file) raises it. These 14 runs were made with a copy of the tool in which that option was the only change; the option is now in `tools/branch-point.mjs`, and the run for n = 23 was made again with it: without the option the printed output is that of `class-c-upper-n23.txt`, with `--max-steps=1500` that of `class-c-upper-n23-max1500.txt`, line by line.
- `class-i-n<n>.txt` and `class-i-n<n>.json`, n = 15 to 20: the printed output of `node tools/branch-point-iso.mjs n theta --pieces=8 --out=class-i-n<n>.json` and the file that the tool writes (the same fields as `data/class-i/curves/n<n>.json`), with theta 0.0669, 0.0627, 0.0590, 0.0557, 0.0528, 0.0501 for n = 15 to 20 (`docs/reproducing.md`).

## The code

The release at e6eccf6 with the bound of `src/iso-shooting.js` relative to the predicted point, in a separate copy so that later edits could not reach the runs (the commit of that change is the first of this series). The files that these tools use differ in the release from that copy only in comments, in SPDX lines, in the option `--max-steps` of `tools/branch-point.mjs` (default 700, the limit that was in the loop) and, in `src/shooting.js`, in the range lamMin, lamMax that a caller's `trace` function stops (these tools do not call it). At most three runs at a time on one machine, with other jobs; a run that passed 90 minutes would have been stopped and recorded as not finished: none did. Wall times: class I 6 to 8 minutes, class C 3 to 27 minutes.

## Result

- Class I, n = 15 to 20: the sense that the stored file stopped by "step collapse" (path length 9.6, t / t0 = 3.000004 to 3.000006 at its last point in the stored file) goes on for 419, 442, 467, 492, 516, 541 points (n = 15 to 20) to a rotation 0, at the same orbit as the other sense.
- Class C upper, n = 16 to 36: the sense that the stored file stopped by "step collapse" (after 508 to 624 points) reaches a rotation 0 in every case, at the orbit of the other sense: after 510 to 693 points for n = 16 to 22 (defaults of the tool), and after 723 to 1275 points for n = 23 to 36 with the limit of 700 steps raised to 1500 (`--max-steps=1500`). With the limit of 700 steps itself the sense of n = 23 to 36 ends at the step limit without a rotation 0.
- T* and L* of the two senses of a run agree to 1e-7 relative in all runs but two (the rule of the comparison). In the runs with `--max-steps=1500` of n = 24 and n = 27 L* of the two zeros differs by 1.4e-7 and 1.2e-7 relative (T* by 3e-9): the zero of the sense that was stored is one of the 19 that the stored file leaves at more than 1e-8 turns (`docs/r-family-satellites.md`, "The 19 regenerated zero files"; here rotation left 1.9e-8 and 1.6e-8 turns, "the bisection stopped early"), the zero of the new sense has 4e-12 turns.
- The zeros of the senses that were stored are reproduced to the 8 printed digits where the stored zero is converged. For n = 24, 26, 27 and 28 the zero of `data/branch-points/<n>-upper.json` is less converged (rotation left 4e-6 to 5e-5 turns), so T* and L* of the rerun differ from it by up to 4e-4 in T* and 1e-3 in L*, and they agree with the regenerated zeros in `data/branch-points-regenerated/` to 4e-9 (last column of the second table).
- The runs of the table are double precision continuations like the stored ones; the zeros are closed to 1e-9 turns or better, not to 30 digits, and none was refined.

## How each sense ends: stored file and now

| run | sense | stored file | now | change |
|---|---|---|---|---|
| class-i-n15 | 1 | step collapse, 418 points | zero of theta, 419 points, T* 36.20358137 | collapse -> zero |
| class-i-n15 | -1 | zero of theta, 210 points, T* 36.20358137 | zero of theta, 210 points, T* 36.20358137 | same |
| class-i-n16 | 1 | step collapse, 409 points | zero of theta, 442 points, T* 37.97313436 | collapse -> zero |
| class-i-n16 | -1 | zero of theta, 222 points, T* 37.97313436 | zero of theta, 222 points, T* 37.97313436 | same |
| class-i-n17 | 1 | zero of theta, 228 points, T* 39.73548355 | zero of theta, 228 points, T* 39.73548355 | same |
| class-i-n17 | -1 | step collapse, 412 points | zero of theta, 467 points, T* 39.73548355 | collapse -> zero |
| class-i-n18 | 1 | zero of theta, 234 points, T* 41.49125515 | zero of theta, 234 points, T* 41.49125515 | same |
| class-i-n18 | -1 | step collapse, 408 points | zero of theta, 492 points, T* 41.49125515 | collapse -> zero |
| class-i-n19 | 1 | zero of theta, 259 points, T* 43.24099217 | zero of theta, 259 points, T* 43.24099217 | same |
| class-i-n19 | -1 | step collapse, 421 points | zero of theta, 516 points, T* 43.24099217 | collapse -> zero |
| class-i-n20 | 1 | zero of theta, 244 points, T* 44.98516898 | zero of theta, 244 points, T* 44.98516898 | same |
| class-i-n20 | -1 | step collapse, 409 points | zero of theta, 541 points, T* 44.98516898 | collapse -> zero |
| class-c-upper-n16 | 1 | step collapse, 518 points | zero of theta, 510 points, T* 37.97312085 | collapse -> zero |
| class-c-upper-n16 | -1 | zero of theta, 238 points, T* 37.97312085 | zero of theta, 238 points, T* 37.97312085 | same |
| class-c-upper-n17 | 1 | step collapse, 515 points | zero of theta, 541 points, T* 39.73546963 | collapse -> zero |
| class-c-upper-n17 | -1 | zero of theta, 242 points, T* 39.73546963 | zero of theta, 242 points, T* 39.73546963 | same |
| class-c-upper-n18 | 1 | zero of theta, 246 points, T* 41.49124087 | zero of theta, 246 points, T* 41.49124087 | same |
| class-c-upper-n18 | -1 | step collapse, 508 points | zero of theta, 572 points, T* 41.49124087 | collapse -> zero |
| class-c-upper-n19 | 1 | step collapse, 512 points | zero of theta, 603 points, T* 43.24097759 | collapse -> zero |
| class-c-upper-n19 | -1 | zero of theta, 250 points, T* 43.24097759 | zero of theta, 250 points, T* 43.24097759 | same |
| class-c-upper-n20 | 1 | zero of theta, 254 points, T* 44.98515413 | zero of theta, 254 points, T* 44.98515413 | same |
| class-c-upper-n20 | -1 | step collapse, 513 points | zero of theta, 633 points, T* 44.98515413 | collapse -> zero |
| class-c-upper-n21 | 1 | step collapse, 525 points | zero of theta, 663 points, T* 46.72418760 | collapse -> zero |
| class-c-upper-n21 | -1 | zero of theta, 258 points, T* 46.72418761 | zero of theta, 258 points, T* 46.72418761 | same |
| class-c-upper-n22 | 1 | zero of theta, 262 points, T* 48.45844698 | zero of theta, 262 points, T* 48.45844698 | same |
| class-c-upper-n22 | -1 | step collapse, 524 points | zero of theta, 693 points, T* 48.45844698 | collapse -> zero |
| class-c-upper-n23 | 1 | step collapse, 521 points | step limit, 701 points | other |
| class-c-upper-n23 | -1 | zero of theta, 266 points, T* 50.18826043 | zero of theta, 266 points, T* 50.18826043 | same |
| class-c-upper-n24 | 1 | zero of theta, 269 points, T* 51.91389055 | zero of theta, 269 points, T* 51.91392115 | same |
| class-c-upper-n24 | -1 | step collapse, 523 points | step limit, 701 points | other |
| class-c-upper-n25 | 1 | step collapse, 550 points | step limit, 701 points | other |
| class-c-upper-n25 | -1 | zero of theta, 274 points, T* 53.63569304 | zero of theta, 274 points, T* 53.63569304 | same |
| class-c-upper-n26 | 1 | zero of theta, 277 points, T* 55.35423615 | zero of theta, 277 points, T* 55.35381318 | same |
| class-c-upper-n26 | -1 | step collapse, 553 points | step limit, 701 points | other |
| class-c-upper-n27 | | 1: zero of theta, 276 points, T* 57.06861923; -1: step collapse, 518 points | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n28 | 1 | step collapse, 544 points | step limit, 701 points | other |
| class-c-upper-n28 | -1 | zero of theta, 282 points, T* 58.78013469 | zero of theta, 282 points, T* 58.77993925 | same |
| class-c-upper-n29 | | 1: step collapse, 616 points; -1: zero of theta, 358 points, T* 60.48831878 | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n30 | | 1: zero of theta, 359 points, T* 62.19379820; -1: step collapse, 618 points | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n31 | | 1: zero of theta, 384 points, T* 63.89652697; -1: step collapse, 623 points | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n32 | | 1: step collapse, 624 points; -1: zero of theta, 376 points, T* 65.59664250 | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n33 | | 1: step collapse, 616 points; -1: zero of theta, 377 points, T* 67.29427152 | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n34 | | 1: step collapse, 621 points; -1: zero of theta, 380 points, T* 68.98953114 | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n35 | | 1: step collapse, 617 points; -1: zero of theta, 383 points, T* 70.68252988 | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n36 | | 1: zero of theta, 386 points, T* 72.37336846; -1: step collapse, 622 points | exit 1: the n fold repeat did not close | no result |
| class-c-upper-n27-stored-options | 1 | zero of theta, 276 points, T* 57.06861923 | zero of theta, 276 points, T* 57.06849666 | same |
| class-c-upper-n27-stored-options | -1 | step collapse, 518 points | step limit, 701 points | other |
| class-c-upper-n29-stored-options | 1 | step collapse, 616 points | step limit, 701 points | other |
| class-c-upper-n29-stored-options | -1 | zero of theta, 358 points, T* 60.48831878 | zero of theta, 358 points, T* 60.48831878 | same |
| class-c-upper-n30-stored-options | 1 | zero of theta, 359 points, T* 62.19379820 | zero of theta, 359 points, T* 62.19379820 | same |
| class-c-upper-n30-stored-options | -1 | step collapse, 618 points | step limit, 701 points | other |
| class-c-upper-n31-stored-options | 1 | zero of theta, 384 points, T* 63.89652697 | zero of theta, 384 points, T* 63.89652697 | same |
| class-c-upper-n31-stored-options | -1 | step collapse, 623 points | step limit, 701 points | other |
| class-c-upper-n32-stored-options | 1 | step collapse, 624 points | step limit, 701 points | other |
| class-c-upper-n32-stored-options | -1 | zero of theta, 376 points, T* 65.59664250 | zero of theta, 376 points, T* 65.59664250 | same |
| class-c-upper-n33-stored-options | 1 | step collapse, 616 points | step limit, 701 points | other |
| class-c-upper-n33-stored-options | -1 | zero of theta, 377 points, T* 67.29427152 | zero of theta, 377 points, T* 67.29427152 | same |
| class-c-upper-n34-stored-options | 1 | step collapse, 621 points | step limit, 701 points | other |
| class-c-upper-n34-stored-options | -1 | zero of theta, 380 points, T* 68.98953114 | zero of theta, 380 points, T* 68.98953114 | same |
| class-c-upper-n35-stored-options | 1 | step collapse, 617 points | step limit, 701 points | other |
| class-c-upper-n35-stored-options | -1 | zero of theta, 383 points, T* 70.68252988 | zero of theta, 383 points, T* 70.68252988 | same |
| class-c-upper-n36-stored-options | 1 | zero of theta, 386 points, T* 72.37336846 | zero of theta, 386 points, T* 72.37336846 | same |
| class-c-upper-n36-stored-options | -1 | step collapse, 622 points | step limit, 701 points | other |
| class-c-upper-n23-max1500 | 1 | step collapse, 521 points | zero of theta, 723 points, T* 50.18826043 | collapse -> zero |
| class-c-upper-n23-max1500 | -1 | zero of theta, 266 points, T* 50.18826043 | zero of theta, 266 points, T* 50.18826043 | same |
| class-c-upper-n24-max1500 | 1 | zero of theta, 269 points, T* 51.91389055 | zero of theta, 269 points, T* 51.91392115 | same |
| class-c-upper-n24-max1500 | -1 | step collapse, 523 points | zero of theta, 753 points, T* 51.91392130 | collapse -> zero |
| class-c-upper-n25-max1500 | 1 | step collapse, 550 points | zero of theta, 797 points, T* 53.63569303 | collapse -> zero |
| class-c-upper-n25-max1500 | -1 | zero of theta, 274 points, T* 53.63569304 | zero of theta, 274 points, T* 53.63569304 | same |
| class-c-upper-n26-max1500 | 1 | zero of theta, 277 points, T* 55.35423615 | zero of theta, 277 points, T* 55.35381318 | same |
| class-c-upper-n26-max1500 | -1 | step collapse, 553 points | zero of theta, 828 points, T* 55.35381318 | collapse -> zero |
| class-c-upper-n27-max1500 | 1 | zero of theta, 276 points, T* 57.06861923 | zero of theta, 276 points, T* 57.06849666 | same |
| class-c-upper-n27-max1500 | -1 | step collapse, 518 points | zero of theta, 841 points, T* 57.06849679 | collapse -> zero |
| class-c-upper-n28-max1500 | 1 | step collapse, 544 points | zero of theta, 890 points, T* 58.77993928 | collapse -> zero |
| class-c-upper-n28-max1500 | -1 | zero of theta, 282 points, T* 58.78013469 | zero of theta, 282 points, T* 58.77993925 | same |
| class-c-upper-n29-stored-options-max1500 | 1 | step collapse, 616 points | zero of theta, 1049 points, T* 60.48831878 | collapse -> zero |
| class-c-upper-n29-stored-options-max1500 | -1 | zero of theta, 358 points, T* 60.48831878 | zero of theta, 358 points, T* 60.48831878 | same |
| class-c-upper-n30-stored-options-max1500 | 1 | zero of theta, 359 points, T* 62.19379820 | zero of theta, 359 points, T* 62.19379820 | same |
| class-c-upper-n30-stored-options-max1500 | -1 | step collapse, 618 points | zero of theta, 1082 points, T* 62.19379820 | collapse -> zero |
| class-c-upper-n31-stored-options-max1500 | 1 | zero of theta, 384 points, T* 63.89652697 | zero of theta, 384 points, T* 63.89652697 | same |
| class-c-upper-n31-stored-options-max1500 | -1 | step collapse, 623 points | zero of theta, 1112 points, T* 63.89652697 | collapse -> zero |
| class-c-upper-n32-stored-options-max1500 | 1 | step collapse, 624 points | zero of theta, 1147 points, T* 65.59664250 | collapse -> zero |
| class-c-upper-n32-stored-options-max1500 | -1 | zero of theta, 376 points, T* 65.59664250 | zero of theta, 376 points, T* 65.59664250 | same |
| class-c-upper-n33-stored-options-max1500 | 1 | step collapse, 616 points | zero of theta, 1179 points, T* 67.29427152 | collapse -> zero |
| class-c-upper-n33-stored-options-max1500 | -1 | zero of theta, 377 points, T* 67.29427152 | zero of theta, 377 points, T* 67.29427152 | same |
| class-c-upper-n34-stored-options-max1500 | 1 | step collapse, 621 points | zero of theta, 1211 points, T* 68.98953114 | collapse -> zero |
| class-c-upper-n34-stored-options-max1500 | -1 | zero of theta, 380 points, T* 68.98953114 | zero of theta, 380 points, T* 68.98953114 | same |
| class-c-upper-n35-stored-options-max1500 | 1 | step collapse, 617 points | zero of theta, 1243 points, T* 70.68252988 | collapse -> zero |
| class-c-upper-n35-stored-options-max1500 | -1 | zero of theta, 383 points, T* 70.68252988 | zero of theta, 383 points, T* 70.68252988 | same |
| class-c-upper-n36-stored-options-max1500 | 1 | zero of theta, 386 points, T* 72.37336846 | zero of theta, 386 points, T* 72.37336846 | same |
| class-c-upper-n36-stored-options-max1500 | -1 | step collapse, 622 points | zero of theta, 1275 points, T* 72.37336846 | collapse -> zero |

## The orbits at the end

The two senses of a run end at the same orbit if T* and L* agree to 1e-7 relative. The tool prints T* and L* with 8 digits (class C), so differences of 5e-9 and less are rounding of the printout; for class I the file has full precision.

| run | difference of T*, L* of the two senses | same orbit | difference to the zero of the stored file | difference to the regenerated zero |
|---|---|---|---|---|
| class-i-n15 | 2.4e-10, 3.4e-10 (relative 6.7e-12, 1.3e-10) | yes | 2.4e-10, 3.4e-10 | - |
| class-i-n16 | 4.3e-10, 6.4e-10 (relative 1.1e-11, 2.4e-10) | yes | 4.3e-10, 6.4e-10 | - |
| class-i-n17 | 3.6e-10, 6.2e-10 (relative 9.2e-12, 2.3e-10) | yes | 0.0e+0, 0.0e+0 | - |
| class-i-n18 | 5.2e-10, 9.9e-10 (relative 1.3e-11, 3.7e-10) | yes | 0.0e+0, 0.0e+0 | - |
| class-i-n19 | 4.5e-10, 8.5e-10 (relative 1.0e-11, 3.2e-10) | yes | 0.0e+0, 0.0e+0 | - |
| class-i-n20 | 6.7e-10, 1.3e-9 (relative 1.5e-11, 5.0e-10) | yes | 0.0e+0, 0.0e+0 | - |
| class-c-upper-n16 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 3.7e-9, 3.5e-9 | - |
| class-c-upper-n17 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 3.5e-9, 3.4e-9 | - |
| class-c-upper-n18 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 3.9e-9, 2.5e-9 | - |
| class-c-upper-n19 | 0.0e+0, 1.0e-8 (relative 0.0e+0, 3.7e-9) | yes | 4.1e-9, 5.9e-9 | - |
| class-c-upper-n20 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 7.4e-10, 1.4e-9 | - |
| class-c-upper-n21 | 1.0e-8, 0.0e+0 (relative 2.1e-10, 0.0e+0) | yes | 5.3e-9, 1.7e-10 | - |
| class-c-upper-n22 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 1.7e-9, 4.3e-9 | - |
| class-c-upper-n23 | one sense only | - | 2.3e-9, 1.3e-9 | - |
| class-c-upper-n24 | one sense only | - | 3.1e-5, 7.1e-5 | 3.8e-9, 4.4e-9 |
| class-c-upper-n25 | one sense only | - | 4.5e-9, 2.5e-9 | - |
| class-c-upper-n26 | one sense only | - | 4.2e-4, 1.0e-3 | 3.1e-9, 2.5e-9 |
| class-c-upper-n28 | one sense only | - | 2.0e-4, 5.0e-4 | 2.0e-9, 9.2e-10 |
| class-c-upper-n27-stored-options | one sense only | - | 1.2e-4, 3.1e-4 | 2.0e-9, 2.4e-9 |
| class-c-upper-n29-stored-options | one sense only | - | 1.4e-9, 7.8e-10 | - |
| class-c-upper-n30-stored-options | one sense only | - | 1.8e-9, 5.0e-11 | - |
| class-c-upper-n31-stored-options | one sense only | - | 1.6e-10, 1.9e-9 | - |
| class-c-upper-n32-stored-options | one sense only | - | 3.2e-9, 3.0e-9 | - |
| class-c-upper-n33-stored-options | one sense only | - | 1.8e-10, 5.0e-9 | - |
| class-c-upper-n34-stored-options | one sense only | - | 1.2e-9, 3.3e-9 | - |
| class-c-upper-n35-stored-options | one sense only | - | 2.7e-9, 1.3e-9 | - |
| class-c-upper-n36-stored-options | one sense only | - | 3.4e-9, 2.8e-9 | - |
| class-c-upper-n23-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 2.3e-9, 1.3e-9 | - |
| class-c-upper-n24-max1500 | 1.5e-7, 3.7e-7 (relative 2.9e-9, 1.4e-7) | NO, see below | 3.1e-5, 7.1e-5 | 3.8e-9, 4.4e-9 |
| class-c-upper-n25-max1500 | 1.0e-8, 0.0e+0 (relative 1.9e-10, 0.0e+0) | yes | 5.5e-9, 2.5e-9 | - |
| class-c-upper-n26-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 4.2e-4, 1.0e-3 | 3.1e-9, 2.5e-9 |
| class-c-upper-n27-max1500 | 1.3e-7, 3.3e-7 (relative 2.3e-9, 1.2e-7) | NO, see below | 1.2e-4, 3.1e-4 | 2.0e-9, 2.4e-9 |
| class-c-upper-n28-max1500 | 3.0e-8, 7.0e-8 (relative 5.1e-10, 2.6e-8) | yes | 2.0e-4, 5.0e-4 | 3.2e-8, 6.9e-8 |
| class-c-upper-n29-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 1.4e-9, 7.8e-10 | - |
| class-c-upper-n30-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 1.8e-9, 5.0e-11 | - |
| class-c-upper-n31-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 1.6e-10, 1.9e-9 | - |
| class-c-upper-n32-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 3.2e-9, 3.0e-9 | - |
| class-c-upper-n33-stored-options-max1500 | 0.0e+0, 1.0e-8 (relative 0.0e+0, 3.7e-9) | yes | 1.8e-10, 5.0e-9 | - |
| class-c-upper-n34-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 1.2e-9, 3.3e-9 | - |
| class-c-upper-n35-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 2.7e-9, 1.3e-9 | - |
| class-c-upper-n36-stored-options-max1500 | 0.0e+0, 0.0e+0 (relative 0.0e+0, 0.0e+0) | yes | 3.4e-9, 2.8e-9 | - |

## The commands of the 14 files with --max-steps=1500

n and theta as in the first group of files; `--repeat-tol=1e-8` (n = 27) and `--repeat-tol=1e-8 --pieces=16` (n = 29 to 36) are the options of the stored files. The printed output is in the file named after `>`.

```
node tools/branch-point.mjs 23 0.0436 --max-steps=1500 > class-c-upper-n23-max1500.txt
node tools/branch-point.mjs 24 0.0417 --max-steps=1500 > class-c-upper-n24-max1500.txt
node tools/branch-point.mjs 25 0.0401 --max-steps=1500 > class-c-upper-n25-max1500.txt
node tools/branch-point.mjs 26 0.0385 --max-steps=1500 > class-c-upper-n26-max1500.txt
node tools/branch-point.mjs 27 0.0371 --max-steps=1500 --repeat-tol=1e-8 > class-c-upper-n27-max1500.txt
node tools/branch-point.mjs 28 0.0358 --max-steps=1500 > class-c-upper-n28-max1500.txt
node tools/branch-point.mjs 29 0.0345 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n29-stored-options-max1500.txt
node tools/branch-point.mjs 30 0.0334 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n30-stored-options-max1500.txt
node tools/branch-point.mjs 31 0.0323 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n31-stored-options-max1500.txt
node tools/branch-point.mjs 32 0.0313 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n32-stored-options-max1500.txt
node tools/branch-point.mjs 33 0.0303 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n33-stored-options-max1500.txt
node tools/branch-point.mjs 34 0.0294 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n34-stored-options-max1500.txt
node tools/branch-point.mjs 35 0.0286 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n35-stored-options-max1500.txt
node tools/branch-point.mjs 36 0.0278 --repeat-tol=1e-8 --pieces=16 --max-steps=1500 > class-c-upper-n36-stored-options-max1500.txt
```

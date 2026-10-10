# Prior work

This file holds a part of the former README, moved here on 2026-10-10 without changing it (only headings were added). Paths such as `tools/...` and `data/...` are from the top folder of the repository. "Corrections" in the text means the log in [CHANGELOG.md](../CHANGELOG.md); the other sections of the former README are in this folder (see [README.md](../README.md)).

## Prior work I know of

- Hénon 1976, Broucke 1975 and Hadjidemetriou 1975: the BHH family. Davoust and Broucke 1982 (Astronomy and Astrophysics 112, 305): "A manifold of
  periodic orbits in the planar general three-body problem with equal masses", the first satellite (k = 3) and families followed by continuation (the
  page scans are from ADS, bibcode 1982A&A...112..305D, there is no text version, so the text and the tables were read from the scan images).
- Janković, Dmitrašinović and Šuvakov (PRL 2016, CPC 2020): about 100 satellites of the BHH family by brute force search. I do not know of work that
  follows their
  satellite branches by continuation from the stable BHH orbits, other than the first satellite and the families in Davoust and Broucke 1982.
- Li and Liao and others: thousands of orbits since 2017, as far as I can see in their public data zero angular momentum or 3D, or unequal masses.
  Their 2025 paper on
  finite angular momentum (New Astronomy 119, 102407) continues the figure-eight and IA-3 orbits from L = 0 (18 rows in a table, the rest on request).
  In it they write that
  work on L != 0 had so far concentrated on the figure-eight and BHH families. Nauenberg 2001 and Chenciner, Fejoz and Montgomery 2005 (rotating
  eights) I have not read.

So the continuation of satellite branches is not new as a method (Davoust and Broucke did it); what is done here is the systematic search for the
places where branches leave the
repeats of the stable orbits, with the checks described below.

- **Families of Davoust and Broucke (1982).** All their tables of initial conditions were typed in from those ADS scans (Tables 2 to 7, 130 orbits of
  the families A1, A2, B, a to d, alpha, beta,
  D1 to D4, E, e to k, F, G, H, `data/db82-table*.json`), checked every row against the printed value of -27 C^2 H (which equals L*^2/9 in my units;
  the few misread
  digits were repaired with `tools/check-db82.py`), converted them into my start (`tools/convert-db82.mjs`) and 118 of the 130 rows close to 1e-9 or
  better, with L* and the
  rotation angle agreeing with the printed ones (the other 12 are rows 23, 43, 46, 54, 69, 70, 82, 85, 87, 88, 106 and 118: close encounters or a
  misread digit). Nine of their orbits have a rotation angle that is a multiple of 2 pi to the printed digits, so they are
  periodic (rows 9, 44, 45, 49, 52, 67, 91, 97, 115). Three of them are in my lists: rows 9, 91 and 115, and all three are atlas orbits (row 9 is
  Sheen's "Two ovals", row 115 his "Oval, catface and starship", and **row 91 (T* = 9.6584,
  L* = 1.0418) is my stable orbit at lam = 0.49914**, which is Broucke and Boggs' S4 of the atlas and so was published in 1975 and again in 1982).
  Checks of the transcription: all 130 rows were compared with the printed value of -27 C^2 H; 12 rows differ from it by more than 2e-6 (rows 17, 21,
  22, 23, 34, 55, 69, 78, 82, 121, 122, 123; this is not the same set of 12 as the rows that do not close, only rows 23, 69 and 82 are in both), none
  of them among the nine, which agree to 8e-8 or better.
  Exactly nine rows have a printed half rotation angle within 1e-2 of a multiple of pi, and my own conversion gives no other. The nine rows were read
  twice from the same ADS scan, the second time without looking at the first: 50 of the 54 numbers are identical (rows 9, 91 and 115 completely),
  of the 4 that differ 3 are settled by the printed invariant (rows 45 and 49: the first reading) and one is not (row 52, last digit of the first
  velocity, 3 or 5, an effect of 2e-7 that does not change any result). Both readings come from the same scan, so this checks consistency, not the
  scan itself.
  The other six are not in my lists, so my own search misses periodic orbits that are known (`tools/compare-db82.py`,
  `data/db82-rotation-multiple-2pi.json`).
  Following the families A1, A2 and B with the continuation (`tools/trace-family.mjs`): A1 has one periodic orbit (the row 9 orbit), A2 none, B three
  (T* = 21.6615 with closure
  5e-9, and two weak ones at 21.911 and 28.478, `data/db82-family-orbits.json`). So three of my orbits are rows of that paper, all three atlas orbits.
  For the others I did not find out in this version whether they lie on families of that paper: the traces of A1, A2 and B
  contain none of them, but I followed only these three of its families, and my own search misses periodic orbits that are known (the other six rows
  above). It is undetermined here, but part of it can be checked. I followed the families that start at six published orbits (five rows of this paper
  and the CPC satellite N = 3, `tools/family-one.mjs`, traces in `data/families85/`, `tools/published-hits.mjs`) and, from my side, the families
  through five of my orbits (`tools/family-pass-through.mjs`, `data/family-pass-through.json`). Three of my orbits lie on the same continuous curve of
  relative periodic orbits as a published start: T* = 9.658 (row 92, the word is 01^3 for both; it is the atlas orbit S4), T* = 11.652 (row 84; my
  word is 000101 and the row's is 01^2; it is one of the 77 unmatched) and the T* = 12.381 orbit of the arclength list (the CPC satellite N = 3, 01^3
  for both; it is not one of the 85). On the stretch between the published orbit and mine every accepted step converged, the tangent turned by less
  than 0.35 rad and theta did not jump (the largest jump in T*, L*, theta between neighbouring steps is 1.2 to 1.3 times the median), and the closure
  error is at most 8e-11, 4e-10 and 9e-10. A curve through a published orbit is not that orbit: the T* and L* of mine differ from those of the row by
  1.8 % and 7.0 %, 3.0 % and 17 %, 6.6 % and 26 %, so none of the three is a match under the rule. For the other two (T* = 7.218 from row 42 and T* =
  13.986 from row 86) the check does not show it: the trace from the exact row does not reach my orbit and the trace from my orbit does not pass the
  row (closest 1.9 % and 2.1 % in T*, L*, |theta|), see the correction of 2026-10-09. A fourth one, the T* = 33.745 orbit (one of the 77), is on the
  curve of Broucke's family R (Corrections, 2026-10-10): the curve was traced from my orbit and the published orbits were found on it.

# SPDX-License-Identifier: MIT
# the state transition matrix of the exact Kepler flow of the equal-mass pair (tools/kepler-ref.py, 60 digits), by central differences of the exact flow with a step of 1e-25 (relative, the
# 8 x 8 matrix of the barycentric state r0, r1, v0, v1), for the periapsis distances q = 1e-3, 1e-6, 1e-8, from the apocentre and from a phase 0.3 radians before the pericentre, one period.
# Reference for test/kepler-stm.test.js: reg.js has to give this matrix. The matrix is also computed with the step 2e-25 and the largest difference of the two is stored (the check of the reference).
# python tools/kepler-stm.py OUT.json        OUT.json must be new. A few seconds.
import sys, os, json, math, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gate_a_rows', os.path.join(here, 'gate-a-rows.py')); G = importlib.util.module_from_spec(spec); spec.loader.exec_module(G)


def stm(start, tau, hrel):
    mp.dps = 60; x = [mpf(v) for v in start]; M = [[None] * 8 for _ in range(8)]; tau = mpf(tau)
    for k in range(8):
        h = mpf(hrel) * max(mpf(1), abs(x[k])); a = list(x); b = list(x); a[k] += h; b[k] -= h
        fa, fb = G.F8(a, tau), G.F8(b, tau)
        for i in range(8): M[i][k] = (fa[i] - fb[i]) / (2 * h)
    return M


def main():
    out = sys.argv[1]
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    rows = []
    for q in (1e-3, 1e-6, 1e-8):
        for name, ph in (('apo', 'apo'), ('m03', -0.3)):
            st = G.pair_start(1.0, q, ph); tau = G.P0
            M1 = stm(st, tau, '1e-25'); M2 = stm(st, tau, '2e-25')
            mp.dps = 60; end = G.F8([mpf(v) for v in st], mpf(tau)); hi = [float(v) for v in end]; lo = [float(v - mpf(h)) for v, h in zip(end, hi)]
            diff = max(abs(M1[i][k] - M2[i][k]) for i in range(8) for k in range(8)); mx = max(abs(M1[i][k]) for i in range(8) for k in range(8))
            rows.append(dict(name='q%g-%s' % (q, name), q=q, masses=[1.0, 1.0], start=st, tau=tau, ref_hi=hi, ref_lo=lo, M=[float(M1[i][k]) for i in range(8) for k in range(8)], max_M=float(mx), step_check=float(diff / mx)))
            print(rows[-1]['name'], 'max|M|', '%.3e' % mx, 'step check', '%.2e' % (diff / mx), flush=True)
    json.dump(dict(what='state transition matrix of the exact Kepler flow of the equal-mass pair, one period, by central differences of tools/kepler-ref.py in 60 digits (step 1e-25 relative; step_check: largest difference to the matrix with the step 2e-25 over max|M|). M is row-major 8 x 8 in the order r0, r1, v0, v1 (x and y each); end state ref_hi + ref_lo.', rows=rows), open(out, 'x'))


main()

# SPDX-License-Identifier: MIT
# one row of the test of src/ias/reg.js for UNEQUAL masses against the exact Kepler flow: a pair with the masses 1 and 0.1 (G = 1), e = 0.9, a = 1 of the relative orbit, from the apocentre,
# one period. tools/kepler-ref.py has the sum of the masses fixed in the module constant MU (2 for the masses 1, 1), and does not take masses as an argument; the relative motion of a pair depends
# on the masses only through mu = m1 + m2, so this tool sets kepler_ref.MU to the exact sum of the two double precision masses and calls its prop() for the relative state. The barycentre moves
# on a straight line. The row has the layout of the rows of tools/gate-a-rows.py (masses, start, tau, ref_hi + ref_lo, S, limit_floor), so node tools/gate-a.mjs and test/reg-unequal.test.js read it.
# python tools/gate-a-unequal.py OUT.json         OUT.json must be new (data/deep/extra/reg-unequal-mass.json is its output). Takes a few seconds.
import sys, os, json, math, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('kepler_ref', os.path.join(here, 'kepler-ref.py')); K = importlib.util.module_from_spec(spec); spec.loader.exec_module(K)
M1, M2 = 1.0, 0.1
mp.dps = 60
K.MU = mpf(M1) + mpf(M2)


def start_state(a, e):
    # apocentre of the relative orbit on the x axis, velocity along y, barycentre at rest at the origin (rounded to doubles)
    mu = float(K.MU); M = M1 + M2
    r = a * (1 + e); v = math.sqrt(mu * (1 - e) / (a * (1 + e)))
    return [-(M2 / M) * r, 0.0, (M1 / M) * r, 0.0, 0.0, -(M2 / M) * v, 0.0, (M1 / M) * v]


def F8(x, tau):
    # 8-state (r0, r1, v0, v1) -> end state at tau, exact: Kepler flow of the relative motion with mu = m1 + m2 and the straight line of the barycentre
    mp.dps = 60
    m1, m2 = mpf(M1), mpf(M2); M = m1 + m2
    x = [mpf(v) for v in x]
    rel = [x[2] - x[0], x[3] - x[1]]; vrel = [x[6] - x[4], x[7] - x[5]]
    c = [(m1 * x[0] + m2 * x[2]) / M, (m1 * x[1] + m2 * x[3]) / M]; vc = [(m1 * x[4] + m2 * x[6]) / M, (m1 * x[5] + m2 * x[7]) / M]
    rr, vv, _ = K.prop(rel, vrel, tau); mp.dps = 60
    ce = [c[0] + vc[0] * mpf(tau), c[1] + vc[1] * mpf(tau)]
    return [ce[0] - m2 / M * rr[0], ce[1] - m2 / M * rr[1], ce[0] + m1 / M * rr[0], ce[1] + m1 / M * rr[1],
            vc[0] - m2 / M * vv[0], vc[1] - m2 / M * vv[1], vc[0] + m1 / M * vv[0], vc[1] + m1 / M * vv[1]]


def sensitivity(start, tau, hrel):
    mp.dps = 60; x = [mpf(v) for v in start]; Mx = [[None] * 8 for _ in range(8)]
    for k in range(8):
        h = mpf(hrel) * max(mpf(1), abs(x[k])); a = list(x); b = list(x); a[k] += h; b[k] -= h
        fa, fb = F8(a, tau), F8(b, tau)
        for i in range(8): Mx[i][k] = (fa[i] - fb[i]) / (2 * h)
    return float(max(sum(abs(v) for v in row) for row in Mx))


if __name__ == '__main__':
    out = sys.argv[1]
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    a, e = 1.0, 0.9
    tau = float(2 * mp.pi * mp.sqrt(mpf(a) ** 3 / K.MU))   # one period of the relative orbit, as a double
    st = start_state(a, e)
    end = F8(st, tau); hi = [float(v) for v in end]; lo = [float(v - mpf(h)) for v, h in zip(end, hi)]
    s9, s10 = sensitivity(st, tau, 1e-9), sensitivity(st, tau, 1e-10)
    row = dict(gate='A1u', name='A1u-m1-0.1-e0.9-1P-apo', masses=[M1, M2], start=st, tau=tau, ref_hi=hi, ref_lo=lo, S=s10, limit_floor=2e-14, e=e, a=a)
    if abs(s9 - s10) > 0.01 * s10: row['limit_not_meaningful'] = True
    data = dict(what='one row for src/ias/reg.js with two UNEQUAL masses (1 and 0.1): the relative orbit with a = 1, e = 0.9 from the apocentre for one period, the exact end state (ref_hi + ref_lo) from the Kepler flow of '
                     'tools/kepler-ref.py with mu = m1 + m2 (tools/gate-a-unequal.py sets its constant MU), the sensitivity S as in tools/gate-a-rows.py. test/reg-unequal.test.js reads it.', rows=[row])
    json.dump(data, open(out, 'x'), indent=1); print('wrote', out, 'S', row['S'], 'tau', tau, 'not graded' if row.get('limit_not_meaningful') else '')

# SPDX-License-Identifier: MIT
# the rows of the test of src/ias/reg.js against the exact Kepler flow of the equal-mass pair (tools/kepler-ref.py), 80 rows:
#   A1: 48 ellipses, e = 0, 0.3, 0.9, 0.99, for the interval 0.0861, one period and ten periods, from the apocentre, the pericentre, the eccentric anomaly pi/2 and a seeded phase;
#   A2: 24 near-radial orbits, periapsis distance q = 1e-3 ... 1e-8, one and five periods, from the apocentre and from a phase 0.3 radians before the pericentre;
#   A3: 8 of the same with the pair centre at (1, 0).
# python tools/gate-a-rows.py OUT.json         OUT.json must be new. Takes a few seconds.
# Each row: masses, start state (doubles), interval tau, the exact end state as a double-double (ref_hi + ref_lo) computed from the exact doubles with 60 digits, the sensitivity S of the exact flow
# (largest row sum of the matrix of the flow, by central differences with the relative step 1e-10; if S at the step 1e-9 differs by more than 1 percent it is not resolved and the row
# gets limit_not_meaningful: it is not graded) and the floor of the limit. tools/gate-a.mjs grades with limit = max(limit_floor, 10 * 1.1e-16 * S).
import sys, os, json, math, random, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('kepler_ref', os.path.join(here, 'kepler-ref.py')); K = importlib.util.module_from_spec(spec); spec.loader.exec_module(K)
SEED = 20261022
P0 = 2 * math.pi / math.sqrt(2.0)


def pair_start(a, q, phase, centre=(0.0, 0.0)):
    e = 1.0 - q / a
    if phase == 'apo':
        r = 2 * a - q; v = math.sqrt(2 * q / (r * a)); rel = (r, 0.0); vrel = (0.0, v)
    elif phase == 'peri':
        v = math.sqrt(2 * (2 * a - q) / (q * a)); rel = (q, 0.0); vrel = (0.0, v)
    else:
        u = phase; r = a * (1 - e * math.cos(u)); k = math.sqrt(2 * a) / r; s = math.sqrt((q / a) * (2 - q / a)); rel = (a * (math.cos(u) - e), a * s * math.sin(u)); vrel = (k * -math.sin(u), k * s * math.cos(u))
    cx, cy = centre
    return [cx - rel[0] / 2, cy - rel[1] / 2, cx + rel[0] / 2, cy + rel[1] / 2, -vrel[0] / 2, -vrel[1] / 2, vrel[0] / 2, vrel[1] / 2]


def F8(x, tau):
    # barycentric 8-state (r0, r1, v0, v1) -> end state at tau: the exact Kepler flow of the relative motion and the straight line of the centre of mass
    r0, r1, v0, v1 = x[0:2], x[2:4], x[4:6], x[6:8]
    rel = [r1[0] - r0[0], r1[1] - r0[1]]; vrel = [v1[0] - v0[0], v1[1] - v0[1]]; c = [(r0[0] + r1[0]) / 2, (r0[1] + r1[1]) / 2]; vc = [(v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2]
    rr, vv, _ = K.prop(rel, vrel, tau); mp.dps = 60
    ce = [c[0] + vc[0] * tau, c[1] + vc[1] * tau]
    return [ce[0] - rr[0] / 2, ce[1] - rr[1] / 2, ce[0] + rr[0] / 2, ce[1] + rr[1] / 2, vc[0] - vv[0] / 2, vc[1] - vv[1] / 2, vc[0] + vv[0] / 2, vc[1] + vv[1] / 2]


def sensitivity(start, tau, hrel):
    mp.dps = 60; x = [mpf(v) for v in start]; M = [[None] * 8 for _ in range(8)]; tau = mpf(tau)
    for k in range(8):
        h = mpf(hrel) * max(mpf(1), abs(x[k])); a = list(x); b = list(x); a[k] += h; b[k] -= h
        fa, fb = F8(a, tau), F8(b, tau)
        for i in range(8): M[i][k] = (fa[i] - fb[i]) / (2 * h)
    return float(max(sum(abs(v) for v in row) for row in M))


def pair_row(gate, name, a, q, phase, tau, centre=(0.0, 0.0), extra=None):
    st = pair_start(a, q, phase, centre); mp.dps = 60; end = F8([mpf(v) for v in st], mpf(tau)); mp.dps = 60
    hi = [float(v) for v in end]; lo = [float(v - mpf(h)) for v, h in zip(end, hi)]
    s9, s10 = sensitivity(st, tau, 1e-9), sensitivity(st, tau, 1e-10)
    row = dict(gate=gate, name=name, masses=[1.0, 1.0], start=st, tau=tau, ref_hi=hi, ref_lo=lo, S=s10)
    if abs(s9 - s10) > 0.01 * s10: row['limit_not_meaningful'] = True
    if extra: row.update(extra)
    return row


def rows_gate():
    rows = []; useed = 2 * math.pi * random.Random(SEED).random()
    for e in (0.0, 0.3, 0.9, 0.99):
        q = 1.0 - e
        for tag, tau, lim in (('tau', 0.0861, 2e-14), ('1P', P0, 2e-14), ('10P', 10 * P0, 2e-13)):
            for ph, pv in (('apo', 'apo'), ('peri', 'peri'), ('pi2', math.pi / 2), ('seed', useed)):
                rows.append(pair_row('A1', 'A1-e%g-%s-%s' % (e, tag, ph), 1.0, q, pv, tau, extra=dict(limit_floor=lim)))
    for q in (1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8):
        for ph, pv in (('apo', 'apo'), ('m03', -0.3)):
            for k, lim in ((1, 1e-13), (5, 5e-13)):
                rows.append(pair_row('A2', 'A2-q%g-%s-k%d' % (q, ph, k), 1.0, q, pv, k * P0, extra=dict(limit_floor=lim, k=k)))
    for q in (1e-6, 1e-8):
        for ph, pv in (('apo', 'apo'), ('m03', -0.3)):
            for k, lim in ((1, 1e-13), (5, 5e-13)):
                rows.append(pair_row('A3', 'A3-q%g-%s-k%d' % (q, ph, k), 1.0, q, pv, k * P0, centre=(1.0, 0.0), extra=dict(limit_floor=lim, k=k)))
    return rows


if __name__ == '__main__':
    out = sys.argv[1]
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    rows = rows_gate()
    json.dump(rows, open(out, 'x')); print('wrote', out, len(rows), 'rows')

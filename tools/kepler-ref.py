# exact Kepler flow of the equal-mass pair in its relative coordinates (mu = 2, G = 1, masses 1, 1) at 60 digits, from a double precision start state (the exact doubles).
# Kepler's equation near e = 1 is solved in the form M = s E + e (E - sin E) with s = 1 - e computed stably as (h^2/(mu a))/(1 + e) and E - sin E from its Maclaurin series
# for |E| < 1 (no cancellation of E - e sin E); the radius is a (s + 2 e sin^2(E/2)); the Gauss functions use 1 - cos dE = 2 sin^2(dE/2) and dE - sin dE by the same series.
# python tools/kepler-ref.py selfcheck out.json q [q ...]   checks the flow on its own for the apocentre start of the given periapsis distances q (a = 1, one period): relative change of the
#                                                           energy and of the angular momentum (limit 1e-35) and the return after propagating forward and back (limit 1e-30); the output file must be new.
# Also importable (kepler_ref): setup_rel(q, u0=None), prop(r0, v0, tau, dps=60).
import sys, os, json
sys.dont_write_bytecode = True
from mpmath import mp, mpf, sqrt, sin, cos, atan2, nstr, pi, factorial

MU = mpf(2)

def gfun(E, dps):
    # E - sin E without cancellation
    if E == 0: return mpf(0)   # the series loop would not end for E = 0 exactly (circular start at the pericentre)
    if abs(E) < 1:
        s = mpf(0); term = E ** 3 / 6; k = 1; lim = mpf(10) ** (-(dps + 5))
        while True:
            s += term
            k += 1
            term = -term * E * E / ((2 * k) * (2 * k + 1))
            if abs(term) < lim * abs(s): break
        return s
    return E - sin(E)

def solve_kepler(M, s, e, dps):
    # f(E) = s E + e g(E) - M, monotonic; odd in (E, M)
    if M == 0: return mpf(0)
    sg = 1
    if M < 0: M = -M; sg = -1
    lo, hi = mpf(0), M + 1
    E = min(M, hi)   # start inside the bracket; Newton with bisection fallback does the rest
    tol = mpf(10) ** (-(dps - 5))
    for _ in range(500):
        f = s * E + e * gfun(E, dps) - M
        if f > 0: hi = E
        elif f < 0: lo = E
        else: break
        fp = s + 2 * e * sin(E / 2) ** 2
        En = E - f / fp
        if not (lo < En < hi): En = (lo + hi) / 2
        if abs(En - E) < tol * max(mpf(1), abs(En)):
            E = En; break
        E = En
    else:
        raise RuntimeError('Kepler equation did not converge')
    return sg * E

def prop(r0, v0, tau, dps=60):
    mp.dps = dps
    rx, ry = mpf(r0[0]), mpf(r0[1]); vx, vy = mpf(v0[0]), mpf(v0[1]); tau = mpf(tau)
    r = sqrt(rx * rx + ry * ry); v2 = vx * vx + vy * vy
    eps = v2 / 2 - MU / r
    if eps >= 0: raise ValueError('not a bound orbit')
    a = -MU / (2 * eps); h = rx * vy - ry * vx
    ome2 = h * h / (MU * a)              # 1 - e^2
    e = sqrt(1 - ome2); s = ome2 / (1 + e)   # s = 1 - e
    n = sqrt(MU / a ** 3)
    rv = rx * vx + ry * vy
    E0 = atan2(rv / sqrt(MU * a), 1 - r / a)
    M0 = s * E0 + e * gfun(E0, dps)
    M = M0 + n * tau
    E = solve_kepler(M, s, e, dps)
    dE = E - E0
    sh = sin(dE / 2) ** 2
    rnew = a * (s + 2 * e * sin(E / 2) ** 2)
    f = 1 - (a / r) * 2 * sh
    g = tau - gfun(dE, dps) / n
    fd = -sqrt(MU * a) / (rnew * r) * sin(dE)
    gd = 1 - (a / rnew) * 2 * sh
    return [f * rx + g * vx, f * ry + g * vy], [fd * rx + gd * vx, fd * ry + gd * vy], dict(a=a, e=e, s=s, E0=E0, E=E)

def energy_L(r, v):
    rr = sqrt(r[0] ** 2 + r[1] ** 2)
    return (v[0] ** 2 + v[1] ** 2) / 2 - MU / rr, r[0] * v[1] - r[1] * v[0]

def setup_rel(q, u0=None):
    # relative start state in doubles. Default: apocentre at (+r_ap, 0), velocity (0, v_ap), a = 1, e = 1 - q.
    # u0: eccentric anomaly measured from the pericentre (pericentre on the +x axis), for a general phase.
    import math
    e = 1.0 - q
    if u0 is None:
        r_ap = 2.0 - q; v_ap = math.sqrt(2.0 * q / (2.0 - q))
        return (r_ap, 0.0), (0.0, v_ap)
    r = 1.0 * (1 - e * math.cos(u0)); k = math.sqrt(2.0 * 1.0) / r
    return (math.cos(u0) - e, math.sqrt(1 - e * e) * math.sin(u0)), (k * -math.sin(u0), k * math.sqrt(1 - e * e) * math.cos(u0))

def tau_period():
    import math
    return 2 * math.pi / math.sqrt(2.0)

def selfcheck(qs, out):
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    res = []; ok = True
    for q in qs:
        r0, v0 = setup_rel(q); tau = tau_period()
        r1, v1, el = prop(r0, v0, tau)
        e0, L0 = energy_L([mpf(r0[0]), mpf(r0[1])], [mpf(v0[0]), mpf(v0[1])]); e1, L1 = energy_L(r1, v1)
        dE = abs(e1 - e0) / abs(e0); dL = abs(L1 - L0) / abs(L0)
        rb, vb, _ = prop(r1, v1, -mpf(tau))
        nr = sqrt(mpf(r0[0]) ** 2 + mpf(r0[1]) ** 2); nv = sqrt(mpf(v0[0]) ** 2 + mpf(v0[1]) ** 2)
        back_r = sqrt((rb[0] - mpf(r0[0])) ** 2 + (rb[1] - mpf(r0[1])) ** 2) / nr
        back_v = sqrt((vb[0] - mpf(v0[0])) ** 2 + (vb[1] - mpf(v0[1])) ** 2) / nv
        good = dE <= mpf('1e-35') and dL <= mpf('1e-35') and back_r <= mpf('1e-30') and back_v <= mpf('1e-30')
        ok = ok and good
        res.append(dict(q=q, r0=list(r0), v0=list(v0), tau=tau, e=nstr(el['e'], 20), one_minus_e=nstr(el['s'], 20), a=nstr(el['a'], 20), rel_energy_change=nstr(dE, 4), rel_L_change=nstr(dL, 4),
                        back_position=nstr(back_r, 4), back_velocity=nstr(back_v, 4), verdict='PASS' if good else 'FAIL',
                        r_end=[nstr(x, 40) for x in r1], v_end=[nstr(x, 40) for x in v1]))
        print('q', q, 'dE', nstr(dE, 3), 'dL', nstr(dL, 3), 'back', nstr(back_r, 3), nstr(back_v, 3), 'PASS' if good else 'FAIL', flush=True)
    json.dump(dict(limits=dict(energy_L=1e-35, back=1e-30), dps=60, results=res, all_pass=ok), open(out, 'x'), indent=1)
    return ok

if __name__ == '__main__':
    if len(sys.argv) > 3 and sys.argv[1] == 'selfcheck':
        sys.exit(0 if selfcheck([float(x) for x in sys.argv[3:]], sys.argv[2]) else 1)
    sys.exit('usage: python -B kepler-ref.py selfcheck out.json q [q ...]')

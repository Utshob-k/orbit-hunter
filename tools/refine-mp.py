# refines a symmetric periodic orbit of the perpendicular start to many digits (default 40) and checks the closure of the full period.
# the orbit: bodies on the x axis at -1-lam/3, lam-lam/3, 1-lam/3 with velocities (0,u1), (0,u2), (0,-u1-u2); m = G = 1.
# it repeats after 2t exactly when, at time t, all bodies are back on the x axis with all velocities along y (4 conditions:
# y1 = y2 = 0, vx1 = vx2 = 0, the third follows from the center of mass), unknowns u1, u2, lam, t.
# integrator: Gragg-Bulirsch-Stoer (modified midpoint with extrapolation) in multiple precision, a different method from the double
# precision Dormand-Prince of the rest of the code.
# python tools/refine-mp.py u1 u2 lam t [digits [out.json]]
import sys
from mpmath import mp, mpf, sqrt, matrix, lu_solve, nstr

SEQ = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]


def deriv(x):
    d = [x[6], x[7], x[8], x[9], x[10], x[11], mpf(0), mpf(0), mpf(0), mpf(0), mpf(0), mpf(0)]
    for i in range(3):
        for j in range(i + 1, 3):
            dx = x[2 * j] - x[2 * i]
            dy = x[2 * j + 1] - x[2 * i + 1]
            r2 = dx * dx + dy * dy
            inv = 1 / (r2 * sqrt(r2))
            fx = dx * inv
            fy = dy * inv
            d[6 + 2 * i] += fx
            d[7 + 2 * i] += fy
            d[6 + 2 * j] -= fx
            d[7 + 2 * j] -= fy
    return d


def midpoint(x0, H, n):
    h = H / n
    z0 = list(x0)
    k = deriv(z0)
    z1 = [a + h * b for a, b in zip(z0, k)]
    for _ in range(1, n):
        k = deriv(z1)
        z2 = [a + 2 * h * b for a, b in zip(z0, k)]
        z0, z1 = z1, z2
    k = deriv(z1)
    return [(a + b + h * c) / 2 for a, b, c in zip(z1, z0, k)]


def bs_step(x0, H, tol):
    T = []
    for j in range(len(SEQ)):
        row = [midpoint(x0, H, SEQ[j])]
        for kk in range(1, j + 1):
            f = (mpf(SEQ[j]) / SEQ[j - kk]) ** 2 - 1
            row.append([a + (a - b) / f for a, b in zip(row[kk - 1], T[j - 1][kk - 1])])
        T.append(row)
        if j >= 6:
            err = max(abs(a - b) / (1 + abs(a)) for a, b in zip(row[j], row[j - 1]))
            if err < tol:
                return row[j], j
    return None, None


def flow(x0, tmax, tol):
    x = list(x0)
    t = mpf(0)
    H = mpf('0.02')
    while t < tmax:
        h = min(H, tmax - t)
        r, order = bs_step(x, h, tol)
        if r is None:
            H = h / 2
            if H < mpf('1e-9'):
                raise RuntimeError('step size collapsed (close encounter?)')
            continue
        x = r
        t += h
        H = min(mpf('0.4'), h * (mpf('1.6') if order <= 9 else mpf('0.8') if order >= 13 else mpf(1)))
    return x


def start(u1, u2, lam):
    cm = lam / 3
    return [-1 - cm, mpf(0), lam - cm, mpf(0), 1 - cm, mpf(0), mpf(0), u1, mpf(0), u2, mpf(0), -u1 - u2]


def residual(p, tol):
    u1, u2, lam, t = p
    x = flow(start(u1, u2, lam), t, tol)
    return [x[1], x[3], x[6], x[8]], x


def refine(u1, u2, lam, t, digits=40):
    mp.dps = digits + 10
    tol = mpf(10) ** (-(digits - 4))
    p = [mpf(str(u1)), mpf(str(u2)), mpf(str(lam)), mpf(str(t))]
    for it in range(8):
        F, xe = residual(p, tol)
        res = max(abs(a) for a in F)
        print('iteration', it, 'residual', nstr(res, 3), flush=True)
        if res < mpf(10) ** (-(digits - 6)):
            break
        # jacobian by finite differences in the first three unknowns, the time derivative is known from the end state
        h = mpf(10) ** (-(digits // 2))
        J = matrix(4, 4)
        for c in range(3):
            q = list(p)
            q[c] += h
            Fq, _ = residual(q, tol)
            for r in range(4):
                J[r, c] = (Fq[r] - F[r]) / h
        d = deriv(xe)
        for r, comp in enumerate([1, 3, 6, 8]):
            J[r, 3] = d[comp]
        step = lu_solve(J, matrix([-a for a in F]))
        p = [p[i] + step[i] for i in range(4)]
    return p, res


def main():
    u1, u2, lam, t = sys.argv[1:5]
    digits = int(sys.argv[5]) if len(sys.argv) > 5 else 40
    p, res = refine(u1, u2, lam, t, digits)
    mp.dps = digits + 10
    tol = mpf(10) ** (-(digits - 4))
    # the full period: integrate to 2t and compare with the start
    x0 = start(p[0], p[1], p[2])
    x = flow(x0, 2 * p[3], tol)
    full = max(abs(a - b) for a, b in zip(x, x0))
    print('refined: u1 =', nstr(p[0], digits), '\n         u2 =', nstr(p[1], digits), '\n         lam =', nstr(p[2], digits), '\n         t =', nstr(p[3], digits))
    print('change from the double precision start: du1 %s du2 %s dlam %s dt %s' % (nstr(abs(p[0] - mpf(u1)), 2), nstr(abs(p[1] - mpf(u2)), 2), nstr(abs(p[2] - mpf(lam)), 2), nstr(abs(p[3] - mpf(t)), 2)))
    print('closure of the full period (max component difference, rotation not needed since theta = 0):', nstr(full, 3))
    if len(sys.argv) > 6:
        import json
        json.dump({'u1': nstr(p[0], digits), 'u2': nstr(p[1], digits), 'lam': nstr(p[2], digits), 't': nstr(p[3], digits), 'digits': digits, 'residual': nstr(res, 3), 'closure_full_period': nstr(full, 3), 'start_double': {'u1': u1, 'u2': u2, 'lam': lam, 't': t}}, open(sys.argv[6], 'w'), indent=1)


if __name__ == '__main__':
    main()

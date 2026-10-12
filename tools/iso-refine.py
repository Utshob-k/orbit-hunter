# the zero of theta of a satellite curve of class I (the isosceles start) refined to many digits, with the end conditions of a zero of theta: the state at time t
# has body 0 on the x axis, x1 = x2, v0x = 0, v1y = v2y (the end state is the isosceles state with the same axis, so the orbit repeats after 2t without rotation).
# start: body 0 (1, 0), bodies 1, 2 at (-1/2, +-h), velocities (0, w), (p, -w/2), (-p, -w/2). refine-mp.py is imported for the integrator.
# python tools/iso-refine.py branch-point.json out.json [digits]   (branch-point.json: the output of branch-point-iso.mjs --out=, the first zero in it is refined; out.json must be new)
import importlib.util, json, os, sys
from mpmath import mp, mpf, matrix, lu_solve, nstr, sqrt

R = importlib.util.module_from_spec(importlib.util.spec_from_file_location('refinemp', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refine-mp.py')))
R.__spec__.loader.exec_module(R)
srcfile = sys.argv[1]; out = sys.argv[2]; digits = int(sys.argv[3]) if len(sys.argv) > 3 else 30

def iso_start(p, w, h):
    half = mpf(1) / 2
    return [mpf(1), mpf(0), -half, h, -half, -h, mpf(0), w, p, -w / 2, -p, -w / 2]

def resid(x): return [x[1], x[2] - x[4], x[6], x[9] - x[11]]
def dresid_dt(d): return [d[1], d[2] - d[4], d[6], d[9] - d[11]]    # the residual is linear in the state

def residual(q, tol):
    p, w, h, t = q
    x = R.flow(iso_start(p, w, h), t, tol)
    return resid(x), x

def info(p, w, h, t, tol):
    x0 = iso_start(p, w, h)
    E = sum((x0[6 + 2 * i] ** 2 + x0[7 + 2 * i] ** 2) / 2 for i in range(3))
    for i in range(3):
        for j in range(i + 1, 3):
            E -= 1 / sqrt((x0[2 * i] - x0[2 * j]) ** 2 + (x0[2 * i + 1] - x0[2 * j + 1]) ** 2)
    L = sum(x0[2 * i] * x0[7 + 2 * i] - x0[2 * i + 1] * x0[6 + 2 * i] for i in range(3))
    T = 2 * t
    xe = R.flow(x0, T, tol)
    closure = max(abs(a - b) for a, b in zip(xe, x0))
    return dict(Tstar=T * abs(E) ** mpf('1.5'), Lstar=abs(L) * abs(E) ** mpf('0.5'), E=E, L=L, closure=closure)

mp.dps = digits + 10
tol = mpf(10) ** (-(digits - 4))
src = json.load(open(srcfile))
z = [s for s in src['satellite'] if s.get('zero')][0]['zero']
q = [mpf(repr(z['u1'])), mpf(repr(z['u2'])), mpf(repr(z['lam'])), mpf(repr(z['t']))]
for it in range(10):
    F, xe = residual(q, tol)
    res = max(abs(a) for a in F)
    print('iteration', it, 'residual', nstr(res, 3), flush=True)
    if res < mpf(10) ** (-(digits - 6)): break
    hh = mpf(10) ** (-(digits // 2))
    J = matrix(4, 4)
    for c in range(3):
        qq = list(q); qq[c] += hh
        Fq, _ = residual(qq, tol)
        for r in range(4): J[r, c] = (Fq[r] - F[r]) / hh
    dr = dresid_dt(R.deriv(xe))
    for r in range(4): J[r, 3] = dr[r]
    step = lu_solve(J, matrix([-a for a in F]))
    q = [q[i] + step[i] for i in range(4)]
qr = [mpf(nstr(a, digits)) for a in q]
inf = info(*qr, tol)
print('refined: p', nstr(qr[0], digits), 'w', nstr(qr[1], digits), 'h', nstr(qr[2], digits), 't', nstr(qr[3], digits))
print('T* %s  L* %s  closure of the full period (rounded values) %s' % (nstr(inf['Tstar'], 20), nstr(inf['Lstar'], 20), nstr(inf['closure'], 3)))
print('change from the double precision zero: dp %s dw %s dh %s dt %s' % tuple(nstr(abs(a - mpf(repr(z[k]))), 2) for a, k in zip(q, ('u1', 'u2', 'lam', 't'))))
json.dump(dict(p=nstr(qr[0], digits), w=nstr(qr[1], digits), h=nstr(qr[2], digits), t=nstr(qr[3], digits), digits=digits, residual=nstr(res, 3), closure_full_period=nstr(inf['closure'], 3), Tstar=nstr(inf['Tstar'], 25), Lstar=nstr(inf['Lstar'], 25), start_double=z), open(out, 'x'), indent=1)

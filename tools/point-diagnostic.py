# SPDX-License-Identifier: MIT
# tells whether a stored point of a trace that does not close (the closure of the full period is not small) is off the orbit or cannot be closed with doubles, for one point:
#  (a) refine the stored (u1, u2, t) at the FIXED lam to the three conditions of symResidual (collinear, both velocities perpendicular, the line may be rotated) with Newton in mpmath
#      (50 digits, flow tolerance 1e-35, central difference Jacobian with step 1e-18) until the largest |symResidual| is below 1e-30, at most 12 iterations;
#  (b) the closure of the full period of the refined values, rotation removed: valid if below 1e-25;
#  (c) the refined values rounded to double (OUT.json.rounded.json, a job file for tools/witness.py: the closure of the rounded orbit says whether doubles can represent it);
#  (d) the multipliers of the refined orbit as relativeStability of src/relative.js defines them (monodromy of the period 2t, rotated back by the angle alpha, reduced to the 8 dimensions
#      without the centre of mass, the 4 eigenvalues nearest to 1 are the trivial ones, the other 4 are the multipliers): 40 digits, flow tolerance 1e-26, central differences along the
#      8 basis directions with step 1e-12 (16 flows of the period 2t). The checks |det - 1| < 1e-10 and trivial scatter < 1e-3 must hold for a multiplier to be quoted; for orbits whose
#      multipliers are of the order 1e5 and more they failed in our runs, so do not quote them without looking at both numbers.
# python tools/point-diagnostic.py POINTS.json ID OUT.json [--minutes 60] [--floor 1e-20] [--mult-only]
#   POINTS.json: a list of {"id", "u1", "u2", "lam", "t"}; ID: the point; OUT.json must be new. --mult-only: no refinement, the multipliers at the stored values.
#   Reading: a refinement that converged with a valid closure and a rounded orbit that closes below 1e-6 means the stored point was off the orbit by more than the rounding;
#   a rounded orbit that does not close below 1e-6 means that no double representation of this orbit does.
import sys, os, json, time, threading, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf, sqrt, atan2, cos, sin, matrix, lu_solve, eig, det, nstr
here = os.path.dirname(os.path.abspath(__file__))


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


pf, pid, outf = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3])
limit, FLOOR = float(option('--minutes', 60)), option('--floor', '1e-20')
only_mult = '--mult-only' in sys.argv
if os.path.exists(outf): sys.exit('exists, not overwriting: ' + outf)
spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py')); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
R.STEP_FLOOR = mpf(FLOOR)
pt = [p for p in json.load(open(pf)) if p['id'] == pid][0]
T0 = time.time(); log = dict(id=pid, source=pt.get('source'), floor=FLOOR, iterations=[])
def write(d):
    d.update(log); tmp = outf + '.tmp'; json.dump(d, open(tmp, 'w'), indent=1); os.replace(tmp, outf)
def timeout():
    write(dict(status='over limit', elapsed_s=round(time.time() - T0))); os._exit(3)
th = threading.Timer(limit * 60, timeout); th.daemon = True; th.start()
def sym_residual(s):
    best = mpf(0); dx = mpf(1); dy = mpf(0)
    for i in range(3):
        for j in range(i + 1, 3):
            rx = s[2 * j] - s[2 * i]; ry = s[2 * j + 1] - s[2 * i + 1]; l = rx * rx + ry * ry
            if l > best: best = l; n = sqrt(l); dx = rx / n; dy = ry / n
    c = ((s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0])) / best
    return [c, s[6] * dx + s[7] * dy, s[8] * dx + s[9] * dy]
def closure_of(lam, p0, tol):
    x0 = R.start(p0[0], p0[1], lam); x = R.flow(x0, 2 * p0[2], tol)
    A = [(x[2 * i], x[2 * i + 1]) for i in range(6)]; B = [(x0[2 * i], x0[2 * i + 1]) for i in range(6)]
    C = sum(a[0] * b[0] + a[1] * b[1] for a, b in zip(A, B)); S = sum(a[0] * b[1] - a[1] * b[0] for a, b in zip(A, B))
    rot = atan2(S, C); c, s = cos(rot), sin(rot)
    return max(max(abs(c * a[0] - s * a[1] - b[0]), abs(s * a[0] + c * a[1] - b[1])) for a, b in zip(A, B))
def rot12(x, a):
    c, s = cos(a), sin(a); out = [mpf(0)] * 12
    for off in (0, 6):
        for i in range(3):
            px, py = x[off + 2 * i], x[off + 2 * i + 1]; out[off + 2 * i] = c * px - s * py; out[off + 2 * i + 1] = s * px + c * py
    return out
def basis():
    e1 = [1 / sqrt(mpf(2)), -1 / sqrt(mpf(2)), mpf(0)]; e2 = [1 / sqrt(mpf(6)), 1 / sqrt(mpf(6)), -2 / sqrt(mpf(6))]; cols = []
    for off in (0, 6):
        for c in (0, 1):
            for e in (e1, e2):
                v = [mpf(0)] * 12
                for b in range(3): v[off + 2 * b + c] = e[b]
                cols.append(v)
    return cols
def multipliers(lam, p):
    mp.dps = 40; tol = mpf(10) ** (-26); h = mpf(10) ** (-12); t1 = time.time()
    u1, u2, tt = mpf(p[0]), mpf(p[1]), mpf(p[2]); lam = mpf(lam); x0 = R.start(u1, u2, lam); xe = R.flow(x0, 2 * tt, tol)
    C = mpf(0); S = mpf(0)
    for off in (0, 6):
        for i in range(3):
            ax, ay, bx, by = xe[off + 2 * i], xe[off + 2 * i + 1], x0[off + 2 * i], x0[off + 2 * i + 1]; C += ax * bx + ay * by; S += ax * by - ay * bx
    alpha = atan2(S, C); P = basis(); M = matrix(8, 8)
    for a in range(8):
        xp = [x0[k] + h * P[a][k] for k in range(12)]; xm = [x0[k] - h * P[a][k] for k in range(12)]
        fp = R.flow(xp, 2 * tt, tol); fm = R.flow(xm, 2 * tt, tol); col = rot12([(fp[k] - fm[k]) / (2 * h) for k in range(12)], alpha)
        for b in range(8): M[b, a] = sum(P[b][k] * col[k] for k in range(12))
    E, ER = eig(M); ev = sorted([complex(e) for e in E], key=lambda z: abs(z - 1)); evm = [complex(e) for e in E]
    triv, non = ev[:4], ev[4:]; d = det(M)
    return dict(alpha=float(alpha), moduli=sorted([abs(z) for z in non], reverse=True), nontrivial=[[z.real, z.imag] for z in non], trivial_scatter=max(abs(z - 1) for z in triv), det_minus_1=float(abs(d - 1)), maxMod=max(abs(z) for z in non), seconds=round(time.time() - t1))
try:
    lam = mpf(float(pt['lam'])); stored = [float(pt['u1']), float(pt['u2']), float(pt['t'])]
    if only_mult:
        write(dict(status='mult only (stored values)', stored=stored, lam=float(lam), mult=multipliers(lam, stored))); print('done', pid, 'mult only', round(time.time() - T0)); sys.exit(0)
    mp.dps = 50; tolflow = mpf(10) ** (-35); target = mpf(10) ** (-30)
    def F(p): return sym_residual(R.flow(R.start(p[0], p[1], lam), p[2], tolflow))
    p = [mpf(v) for v in stored]; status = 'not converged'
    for it in range(12):
        f = F(p); res = max(abs(v) for v in f); log['iterations'].append(dict(it=it, residual=float(res), seconds=round(time.time() - T0)))
        if res < target: status = 'converged'; break
        h = mpf(10) ** (-18); J = matrix(3, 3)
        for c in range(3):
            qp = list(p); qm = list(p); qp[c] += h; qm[c] -= h; fp = F(qp); fm = F(qm)
            for r in range(3): J[r, c] = (fp[r] - fm[r]) / (2 * h)
        d = lu_solve(J, matrix([-v for v in f])); p = [p[i] + d[i] for i in range(3)]
    if status != 'converged': write(dict(status=status)); print('done', pid, status); sys.exit(0)
    clo = closure_of(lam, p, tolflow); rounded = dict(id=pid + '_round', u1=float(p[0]), u2=float(p[1]), lam=float(lam), t=float(p[2]))
    json.dump(rounded, open(outf + '.rounded.json', 'x'))
    rec = dict(status='refined', lam=float(lam), stored=stored, refined=[nstr(v, 45) for v in p], closure_refined=float(clo), closure_valid=bool(clo < mpf(10) ** (-25)),
               change_from_stored=[float(abs(p[i] - stored[i])) for i in range(3)], change_rel=[float(abs(p[i] - stored[i]) / abs(p[i])) for i in range(3)],
               rounding_changes=[float(abs(mpf(rounded[k]) - v)) for k, v in zip(('u1', 'u2', 't'), p)], seconds_refine=round(time.time() - T0))
    write(rec)
    rec['mult'] = multipliers(lam, p); rec['status'] = 'done'; write(rec)
except Exception as e:
    write(dict(status='error', error=str(e)))
print('done', pid, round(time.time() - T0))

# the 3 x 3 block d(r1, r2, r3)/d(u1, u2, t) of the 3 x 4 closing Jacobian of tools/stall-jacobian-mp.py (same points, same re-closed values from DIR/res, same 50 digit flow and steps), its singular
# values and the ratio of the smallest to the largest. At a fold of the family in lam this block is singular while the 3 x 4 matrix keeps full rank, so sigma3/sigma1 of the block tells a fold from
# a smooth continuation. The 3 x 4 matrix is computed again and its sigma3/sigma1 printed next to the stored one as a check.
#   python tools/stall-jacobian-3x3.py DIR OUT.json       DIR: the folder of tools/stall-jacobian-mp.py (selection.json, res/); OUT.json must be new. About 1 to 3 minutes a point.
import sys, os, json, importlib.util
sys.dont_write_bytecode = True

here = os.path.dirname(os.path.abspath(__file__))
d1, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
from mpmath import mp, mpf, sqrt, matrix, svd_r
spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
R.STEP_FLOOR = mpf('1e-20')
mp.dps = 50
TOL = mpf(10) ** (-30); H = mpf(10) ** (-25)


def resid(s):
    big = mpf(0); dx = mpf(1); dy = mpf(0)
    for i in range(3):
        for j in range(i + 1, 3):
            rx = s[2 * j] - s[2 * i]; ry = s[2 * j + 1] - s[2 * i + 1]; l = rx * rx + ry * ry
            if l > big: big = l; n = sqrt(l); dx = rx / n; dy = ry / n
    return [((s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0])) / big, s[6] * dx + s[7] * dy, s[8] * dx + s[9] * dy]


def F(a, b, tt, lam):
    s = R.flow(R.start(a, b, lam), tt, TOL)
    return resid(s), s


def svals(A):
    sv = svd_r(A, compute_uv=False)
    return sorted([sv[i] for i in range(len(sv))], reverse=True)


rows = []
for x in json.load(open(d1 + '/selection.json')):
    r = json.load(open('%s/res/%s.json' % (d1, x['id'])))
    u1, u2, t = [mpf(r[k]) for k in ('u1', 'u2', 't')]; lam = mpf(str(x['lam']))
    r0, s0 = F(u1, u2, t, lam)
    A = matrix(3, 4)
    for c, args in enumerate([(u1 + H, u2, t, lam), (u1, u2 + H, t, lam)]):
        rq, _ = F(*args)
        for k in range(3): A[k, c] = (rq[k] - r0[k]) / H
    f = R.deriv(s0); rt = resid([a + H * b for a, b in zip(s0, f)])
    for k in range(3): A[k, 2] = (rt[k] - r0[k]) / H
    rl, _ = F(u1, u2, t, lam + H)
    for k in range(3): A[k, 3] = (rl[k] - r0[k]) / H
    B = matrix(3, 3)
    for i in range(3):
        for j in range(3): B[i, j] = A[i, j]
    s4, s3 = svals(A), svals(B)
    row = dict(id=x['id'], trace=x['trace'], step=x['taken'], lam=float(lam), sigma_3x3=[float(v) for v in s3], smin_over_smax_3x3=float(s3[2] / s3[0]), sigma_3x4=[float(v) for v in s4], s3_over_s1_3x4=float(s4[2] / s4[0]))
    rows.append(row)
    print('%s: 3x3 block sigma %s, sigma3/sigma1 %.3e; 3x4 sigma3/sigma1 %.3e' % (x['id'], ' '.join('%.3e' % v for v in row['sigma_3x3']), row['smin_over_smax_3x3'], row['s3_over_s1_3x4']), flush=True)
json.dump(dict(what='singular values of the 3 x 3 block d(r1, r2, r3)/d(u1, u2, t) of the closing Jacobian at the stall points (tools/stall-jacobian-3x3.py)', rows=rows), open(out, 'x'), indent=1)

# multiple precision monodromy of the satellite orbits of class C, n = 5 to 20: the four nontrivial multipliers by reduction (the time shift and the rotation
# are taken out analytically, no eigenvalue is picked "closest to 1"), tier A on the stored 30 digit orbit (50 digits, tolerance 1e-36, h = 1e-10), tier B on the
# same orbit refined to 40 digits (60 digits, 1e-46, h = 1e-12). monodromy_block() also takes another start (iso-monodromy-mp.py uses it for class I).
# python tools/monodromy-mp.py CASE [A] [B] [--out=DIR]    CASE in 5 6 7 8s 8d 9 10 11 12 13 14 15 16 17 18 19 20 (8s: the shortest orbit of the T* = 47.065 orbit refined here, 8d: data/refined/T47.065.json);
# the results go to DIR (default data/stability-mp/class-c/) as class-c-CASE-A.json, class-c-CASE-B.json and class-c-orbit-CASE-40.json; a file is never overwritten
# (a case that was run is not run again into the same folder). a case takes about 3 to 16 minutes per tier for n = 5 to 12 (n = 13 to 20, tier A: 50 to 59 minutes each, 16 jobs at a time on 12 processors).
import importlib.util, json, sys, time, os
from mpmath import mp, mpf, matrix, lu_solve, nstr, det, eig, pi, arg, fabs

TOOLS = os.path.dirname(os.path.abspath(__file__)) + '/'
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
spec = importlib.util.spec_from_file_location('refinemp', TOOLS + 'refine-mp.py')
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)

CASE = n = OUT = o30 = None     # set in the main block

def read(f): return json.load(open(REPO + 'data/' + f))

def load30():
    if CASE in ('5', '6', '8d'):
        j = read({'5': 'refined/T17.847.json', '6': 'refined/T19.769.json', '8d': 'refined/T47.065.json'}[CASE])
        return dict(u1=j['u1'], u2=j['u2'], lam=j['lam'], t=j['t'], src='data/refined/' + {'5': 'T17.847', '6': 'T19.769', '8d': 'T47.065'}[CASE] + '.json')
    if CASE == '8s':
        z = [s for s in read('branch-points/8-upper.json')['satellite'] if s.get('zero')][0]['zero']
        p, res = R.refine(repr(z['u1']), repr(z['u2']), repr(z['lam']), repr(z['t']), 30)
        mp.dps = 40
        o = dict(u1=nstr(p[0], 30), u2=nstr(p[1], 30), lam=nstr(p[2], 30), t=nstr(p[3], 30), src='data/branch-points/8-upper.json (double precision zero) refined to 30 digits here', residual=nstr(res, 3))
        return o
    c = [o for o in read('satellite-candidates.json')['orbits'] if o['n'] == n and ('nu = 1/%d (upper branch' % n) in o['label']][0]
    return dict(u1=c['u1'], u2=c['u2'], lam=c['lam'], t=c['t'], src='data/satellite-candidates.json')

def flow_to(x, T, tol): return R.flow(x, T, tol)

def to12(c):
    return [c[0], c[1], c[2], c[3], -(c[0] + c[2]), -(c[1] + c[3]), c[4], c[5], c[6], c[7], -(c[4] + c[6]), -(c[5] + c[7])]
def to8(u): return [u[0], u[1], u[2], u[3], u[6], u[7], u[8], u[9]]

def gradE(x):
    g = [mpf(0)] * 12
    for i in range(3):
        for j in range(3):
            if i == j: continue
            dx = x[2 * i] - x[2 * j]; dy = x[2 * i + 1] - x[2 * j + 1]
            r3 = (dx * dx + dy * dy) ** mpf('1.5')
            g[2 * i] += dx / r3; g[2 * i + 1] += dy / r3
    for k in range(6): g[6 + k] = x[6 + k]
    return g
def gradL(x):
    g = [mpf(0)] * 12
    for i in range(3):
        g[2 * i] = x[6 + 2 * i + 1]; g[2 * i + 1] = -x[6 + 2 * i]
        g[6 + 2 * i] = -x[2 * i + 1]; g[6 + 2 * i + 1] = x[2 * i]
    return g
def rotgen(x):
    g = [mpf(0)] * 12
    for i in range(3):
        g[2 * i] = -x[2 * i + 1]; g[2 * i + 1] = x[2 * i]
        g[6 + 2 * i] = -x[6 + 2 * i + 1]; g[6 + 2 * i + 1] = x[6 + 2 * i]
    return g
def mx(v): return max(fabs(a) for a in v)

def monodromy_block(u1, u2, lam, t, dps, tol, h, start=None):
    mp.dps = dps
    u1, u2, lam, t = mpf(u1), mpf(u2), mpf(lam), mpf(t)
    h = mpf(h); tol = mpf(tol)
    x0 = (start or R.start)(u1, u2, lam); T2 = 2 * t
    t0 = time.time()
    xe = flow_to(x0, T2, tol)
    closure = mx([a - b for a, b in zip(xe, x0)])
    # the 8 dimensional subspace, analytic vectors
    Bs = matrix(12, 8)
    for k in range(8):
        e = [mpf(0)] * 8; e[k] = mpf(1)
        col = to12(e)
        for r in range(12): Bs[r, k] = col[r]
    gE, gL = gradE(x0), gradL(x0)
    A = matrix(2, 8)
    for k in range(8):
        A[0, k] = sum(gE[r] * Bs[r, k] for r in range(12)); A[1, k] = sum(gL[r] * Bs[r, k] for r in range(12))
    v12 = R.deriv(x0); g12 = rotgen(x0)
    v8, g8 = to8(v12), to8(g12)
    cm_v = mx([a - b for a, b in zip(to12(v8), v12)]); cm_g = mx([a - b for a, b in zip(to12(g8), g12)])
    def Av(u): return [sum(A[r, k] * u[k] for k in range(8)) for r in range(2)]
    # pivot columns
    best = None
    for p1 in range(8):
        for p2 in range(p1 + 1, 8):
            d = fabs(A[0, p1] * A[1, p2] - A[0, p2] * A[1, p1])
            if best is None or d > best[0]: best = (d, p1, p2)
    _, p1, p2 = best
    Ap = matrix([[A[0, p1], A[0, p2]], [A[1, p1], A[1, p2]]])
    F = [k for k in range(8) if k not in (p1, p2)]
    K = {}
    for j in F:
        rhs = matrix([-A[0, j], -A[1, j]]); s = lu_solve(Ap, rhs)
        col = [mpf(0)] * 8; col[j] = mpf(1); col[p1] = s[0]; col[p2] = s[1]; K[j] = col
    # choose 4 of the 6 free coordinates to complete (v, g)
    from itertools import combinations
    vF = [v8[j] for j in F]; gF = [g8[j] for j in F]
    bestc = None
    for S in combinations(range(6), 4):
        Q = matrix(6, 6)
        for r in range(6):
            Q[r, 0] = vF[r]; Q[r, 1] = gF[r]
            for c, s in enumerate(S): Q[r, 2 + c] = mpf(1) if r == s else mpf(0)
        d = fabs(det(Q))
        if bestc is None or d > bestc[0]: bestc = (d, S)
    S4 = bestc[1]
    W = []
    for s in S4:
        col = K[F[s]]; nrm = mx(col); W.append([c / nrm for c in col])
    z1 = [mpf(0)] * 8; z1[p1] = mpf(1); z2 = [mpf(0)] * 8; z2[p2] = mpf(1)
    cols = [v8, g8] + W + [z1, z2]
    Bf = matrix(8, 8)
    for c in range(8):
        for r in range(8): Bf[r, c] = cols[c][r]
    condBf = None
    dirs = [('v', v8)] + [('g', g8)] + [('w%d' % (i + 1), W[i]) for i in range(4)]
    def apply_M(u8, hh):
        d12 = to12(u8); nrm = mx(d12); d12 = [c / nrm for c in d12]
        xp = [a + hh * b for a, b in zip(x0, d12)]; xm = [a - hh * b for a, b in zip(x0, d12)]
        fp = flow_to(xp, T2, tol); fm = flow_to(xm, T2, tol)
        return [(a - b) / (2 * hh) * nrm for a, b in zip(fp, fm)]
    D1 = {}; D2 = {}
    for name, u in dirs:
        D1[name] = to8(apply_M(u, h)); D2[name] = to8(apply_M(u, 2 * h))
    def coords(name, mode):
        if mode == 'R': d = [(4 * a - b) / 3 for a, b in zip(D1[name], D2[name])]
        else: d = D1[name]
        return lu_solve(Bf, matrix(d))
    out = {}
    for mode in ('R', '1'):
        N = matrix(4, 4); defect = mpf(0); Mv = mpf(0); Mg = mpf(0)
        for name, u in dirs:
            c = coords(name, mode)
            if name == 'v':
                Mv = max(fabs(c[0] - 1), *[fabs(c[k]) for k in range(1, 8)])
            elif name == 'g':
                Mg = max(fabs(c[1] - 1), fabs(c[0]), *[fabs(c[k]) for k in range(2, 8)])
            else:
                i = int(name[1]) - 1
                for r in range(4): N[r, i] = c[2 + r]
                defect = max(defect, fabs(c[6]), fabs(c[7]), fabs(c[0]), fabs(c[1]))   # z components must vanish; the v, g components are dropped (also listed)
        zdef = mpf(0); vgcomp = mpf(0)
        for name, u in dirs[2:]:
            c = coords(name, mode); zdef = max(zdef, fabs(c[6]), fabs(c[7])); vgcomp = max(vgcomp, fabs(c[0]), fabs(c[1]))
        E, _ = eig(N)
        mus = [(complex_mod(m), complex_angle(m), m) for m in E]
        trN = sum(E); e3 = mpf(0)
        import itertools
        e3 = sum(a * b * c for a, b, c in itertools.combinations(E, 3))
        out[mode] = dict(N=[[nstr(N[r, c], 25) for c in range(4)] for r in range(4)],
                         mu=[dict(angle=nstr(a, 30), mod_minus_1=nstr(m - 1, 12), re=nstr(z.real, 30), im=nstr(z.imag, 30)) for (m, a, z) in sorted(mus, key=lambda q: q[1])],
                         max_mod_dev=nstr(max(fabs(m - 1) for (m, a, z) in mus), 5),
                         invariance_defect_z=nstr(zdef, 5), v_g_components_of_Mw=nstr(vgcomp, 5), Mv_minus_v=nstr(Mv, 5), Mg_minus_g=nstr(Mg, 5),
                         det_minus_1=nstr(fabs(det(N) - 1), 5), palindromic_c1_minus_c3=nstr(fabs(trN - e3), 5))
    return dict(closure=nstr(closure, 5), dps=dps, tol=nstr(tol, 3), h=nstr(h, 3), pivots=[p1, p2], chosen_free=list(S4), cm_v=nstr(cm_v, 3), cm_g=nstr(cm_g, 3),
                gradient_check_v_g=[nstr(mx(Av(v8)), 5), nstr(mx(Av(g8)), 5)], seconds=round(time.time() - t0, 1), result=out)

def complex_mod(z): return abs(z)
def complex_angle(z):
    a = arg(z) / (2 * pi)
    return a + 1 if a < 0 else a

def run(tier):
    t0 = time.time()
    if tier == 'A':
        o = o30; dps, tol, h = 50, '1e-36', '1e-10'
    else:
        mp.dps = 50
        p, res = R.refine(o30['u1'], o30['u2'], o30['lam'], o30['t'], 40)
        mp.dps = 60
        o = dict(u1=nstr(p[0], 40), u2=nstr(p[1], 40), lam=nstr(p[2], 40), t=nstr(p[3], 40), residual=nstr(res, 3), src='refined to 40 digits here from ' + o30['src'])
        json.dump(o, open(OUT + 'class-c-orbit-%s-40.json' % CASE, 'x'), indent=1)
        dps, tol, h = 60, '1e-46', '1e-12'
    res = monodromy_block(o['u1'], o['u2'], o['lam'], o['t'], dps, tol, h)
    res.update(case=CASE, tier=tier, orbit_src=o['src'], total_seconds=round(time.time() - t0, 1))
    json.dump(res, open(OUT + 'class-c-%s-%s.json' % (CASE, tier), 'x'), indent=1)
    r = res['result']['R']
    print('case %s tier %s: closure %s; max | |mu|-1 | %s; invariance defect %s; |Mv-v| %s; |Mg-g| %s; det-1 %s; c1-c3 %s; seconds %s' % (CASE, tier, res['closure'], r['max_mod_dev'], r['invariance_defect_z'], r['Mv_minus_v'], r['Mg_minus_g'], r['det_minus_1'], r['palindromic_c1_minus_c3'], res['total_seconds']))
    print('   angles (turns):', ', '.join(m['angle'][:22] for m in r['mu']), '| mod-1:', ', '.join(m['mod_minus_1'] for m in r['mu']), flush=True)
    r1 = res['result']['1']
    print('   plain D(h) only: max | |mu|-1 | %s; defect %s' % (r1['max_mod_dev'], r1['invariance_defect_z']), flush=True)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--out=')]
    outs = [a[6:] for a in sys.argv[1:] if a.startswith('--out=')]
    CASE = args[0]
    n = int(CASE.rstrip('sd'))
    OUT = (outs[0] if outs else REPO + 'data/stability-mp/class-c').rstrip('/') + '/'
    os.makedirs(OUT, exist_ok=True)
    print('start', time.strftime('%Y-%m-%d %H:%M:%S'), 'case', CASE, flush=True)
    o30 = load30()
    if CASE == '8s': json.dump(o30, open(OUT + 'class-c-orbit-8s-30.json', 'x'), indent=1)
    for tier in args[1:] or ['A', 'B']:
        run(tier)
    print('end', time.strftime('%Y-%m-%d %H:%M:%S'))

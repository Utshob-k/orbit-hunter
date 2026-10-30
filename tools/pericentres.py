# SPDX-License-Identifier: MIT
# the osculating two-body pericentre at the closest sample of the 50 digit flow (the preset w1b of tools/witness.py), next to the stored parabolic estimate of the minimum pair distance. The samples are the
# start and the end of every accepted step of the Gragg-Bulirsch-Stoer flow of tools/refine-mp.py over the half orbit t and the second t. At the closest sample the pair with the smallest distance is taken as
# a two-body orbit (mu = 2, the relative position and velocity of the pair): q = h^2 / (mu (1 + e)), written without the cancellation of a (1 - e).
# The points: the smallest witnessed value of each of t35 -, t44 -, t62 -, t72 - (steps 10, 34, 9, 97) and the re-closed midpoints of the steps 10 and 11 of t35 - and 34 and 35 of t44 -.
#   python tools/pericentres.py run DIR [JOBS | --only ID]   DIR must be new (or hold other ids): DIR/<id>.json for every point, JOBS at a time (default 3); 60 to 180 s for a point
#   python tools/pericentres.py summary DIR OUT.json            reads DIR/<id>.json and writes OUT.json (new)
import sys, os, json, time, subprocess, importlib.util
sys.dont_write_bytecode = True

here = os.path.dirname(os.path.abspath(__file__))
data = os.path.join(os.path.dirname(here), 'data', 'deep')
PAIRS = [(0, 1), (0, 2), (1, 2)]
IDS = ['t35m-u0010', 't44m-u0034', 't62m-u0009', 't72m-u0097', 't35m-m010-011', 't44m-m034-035']


def points():
    out = []
    W = {lab: {p['id']: p for p in json.load(open(os.path.join(data, 'witnesses', lab + '.json')))['points']} for lab in ('t35m', 't44m', 't62m', 't72m')}
    Rc = {lab: {x['id']: x for x in json.load(open(os.path.join(data, 'reclose', lab + '.json')))['rows']} for lab in ('t35m', 't44m')}
    for lab, i in [('t35m', 't35m-u0010'), ('t44m', 't44m-u0034'), ('t62m', 't62m-u0009'), ('t72m', 't72m-u0097')]:
        p = W[lab][i]
        out.append(dict(id=i, u1=p['u1'], u2=p['u2'], lam=p['lam'], t=p['t'], stored=p['w1b']['dmin_parabolic'], stored_sampled=p['w1b']['dmin']))
    for lab, i in [('t35m', 't35m-m010-011'), ('t44m', 't44m-m034-035')]:
        x = Rc[lab][i]
        rc = x['reclosed']
        out.append(dict(id=i, u1=float(rc['u1']), u2=float(rc['u2']), lam=x['lam'], t=float(rc['t']), stored=x['w1b']['dmin_parabolic'], stored_sampled=None))
    return out


def one(i, outf):
    from mpmath import mp, mpf, sqrt, nstr
    pt = [p for p in points() if p['id'] == i][0]
    spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
    R = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(R)
    R.STEP_FLOOR = mpf('1e-20')
    mp.dps = 50
    tol = mpf(10) ** (-30)
    best = dict(d2=None)

    def sample(x, tt):
        d2 = [(x[2 * j] - x[2 * i_]) ** 2 + (x[2 * j + 1] - x[2 * i_ + 1]) ** 2 for i_, j in PAIRS]
        k = min(range(3), key=lambda q: d2[q])
        if best['d2'] is None or d2[k] < best['d2']:
            best.update(d2=d2[k], pair=k, t=tt, x=list(x))
    orig = R.bs_step
    state = dict(tacc=mpf(0))

    def counted(x0, H, tol_):
        r, order = orig(x0, H, tol_)
        if r is not None:
            state['tacc'] += H
            sample(r, state['tacc'])
        return r, order
    R.bs_step = counted
    u1, u2, lam, t = [mpf(float(pt[k])) for k in ('u1', 'u2', 'lam', 't')]
    x0 = R.start(u1, u2, lam)
    sample(x0, mpf(0))
    T0 = time.time()
    xh = R.flow(x0, t, tol)
    R.flow(xh, t, tol)
    x = best['x']
    a_, j = PAIRS[best['pair']]
    rx, ry = x[2 * j] - x[2 * a_], x[2 * j + 1] - x[2 * a_ + 1]
    vx, vy = x[6 + 2 * j] - x[6 + 2 * a_], x[7 + 2 * j] - x[7 + 2 * a_]
    MU = mpf(2)
    r = sqrt(rx * rx + ry * ry)
    eps = (vx * vx + vy * vy) / 2 - MU / r
    h = rx * vy - ry * vx
    a = -MU / (2 * eps)
    e = sqrt(1 - h * h / (MU * a))
    q = h * h / (MU * (1 + e))
    res = dict(id=pt['id'], pair=[a_, j], t_at_min=float(best['t']), sampled_min=float(sqrt(best['d2'])), osculating_pericentre=nstr(q, 12), osculating_float=float(q), eccentricity_minus_1=nstr(e - 1, 8),
               stored_dmin_parabolic=pt['stored'], stored_sampled=pt['stored_sampled'], rel_diff_to_stored_parabolic=float(abs(q - mpf(pt['stored'])) / q), seconds=round(time.time() - T0))
    json.dump(res, open(outf, 'x'), indent=1)
    print(json.dumps(res))


def run(d, jobs, only):
    from concurrent.futures import ThreadPoolExecutor
    os.makedirs(d, exist_ok=True)
    ids = [i for i in IDS if not only or i == only]
    for i in ids:
        if os.path.exists('%s/%s.json' % (d, i)):
            sys.exit('exists, not overwriting: %s/%s.json' % (d, i))

    def go(i):
        r = subprocess.run([sys.executable, '-B', os.path.abspath(__file__), '--one', i, '%s/%s.json' % (d, i)], capture_output=True, text=True)
        print(i, r.stdout[-300:], r.stderr[-300:], flush=True)
    with ThreadPoolExecutor(jobs) as ex:
        list(ex.map(go, ids))


def summary(d, out):
    if os.path.exists(out):
        sys.exit('exists, not overwriting: ' + out)
    pts = [json.load(open('%s/%s.json' % (d, i))) for i in IDS]
    what = ('the osculating two-body pericentre at the closest sample of the 50 digit flow (preset w1b of tools/witness.py) at six points of t35 -, t44 -, t62 -, t72 - (the smallest witnessed value of each, and the '
            're-closed midpoints of the steps 10 and 11 of t35 - and 34 and 35 of t44 -), with the pair, the time of the sample, the smallest sampled distance, e - 1 and the stored parabolic estimate of the minimum '
            '(stored_dmin_parabolic) and its relative difference to the pericentre. These are the stored results of the command in "command" (60 to 180 s for a point).')
    json.dump(dict(what=what, command=['python tools/pericentres.py run DIR', 'python tools/pericentres.py summary DIR OUT.json'], points=pts), open(out, 'x'), indent=1)
    for r in pts:
        print('%s: pair %s at t %.6f, sampled minimum %.7e, osculating pericentre %s (e - 1 = %s), stored parabolic %.7e (relative difference %.2e)' % (
            r['id'], r['pair'], r['t_at_min'], r['sampled_min'], r['osculating_pericentre'], r['eccentricity_minus_1'], r['stored_dmin_parabolic'], r['rel_diff_to_stored_parabolic']))


if len(sys.argv) > 3 and sys.argv[1] == '--one':
    one(sys.argv[2], sys.argv[3])
elif len(sys.argv) >= 3 and sys.argv[1] == 'run':
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    rest = [a for a in sys.argv[3:] if a != '--only' and a != only]
    run(sys.argv[2], int(rest[0]) if rest else 3, only)
elif len(sys.argv) >= 4 and sys.argv[1] == 'summary':
    summary(sys.argv[2], sys.argv[3])
else:
    sys.exit('usage: python tools/pericentres.py run DIR [JOBS | --only ID]  or  summary DIR OUT.json')

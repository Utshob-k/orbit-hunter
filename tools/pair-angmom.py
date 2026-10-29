# the signed angular momentum of the close pair at the closest sample of the 50 digit flow (the preset w1b of tools/witness.py, as tools/pericentres.py samples it): h = x_rel * vy_rel - y_rel * vx_rel of the
# pair with the smallest distance at the closest sample (relative position and velocity of the pair, in the order of the bodies a < j), with the osculating pericentre q and e - 1 as tools/pericentres.py gives them,
# and h at the sample before and the sample after it. The question: does h change sign between the two sides of lam_c (the collision orbit of the quadratic law d = c (lam - lam_c)^2).
# The points: t35 - the witnessed steps 9, 10, 11, 12 and the re-closed midpoints 9-10, 10-11; t44 - the witnessed steps 33, 34, 35 and the re-closed midpoint 34-35 (data/deep/reclose/t35m.json and t44m.json).
#   python tools/pair-angmom.py run DIR [JOBS | --only ID]   DIR must be new (or hold other ids): DIR/<id>.json for every point, JOBS at a time (default 3); 60 to 180 s for a point
#   python tools/pair-angmom.py summary DIR OUT.json         reads DIR/<id>.json and writes OUT.json (new), the points of each trace in the order of lam
import sys, os, json, time, subprocess, importlib.util
sys.dont_write_bytecode = True

here = os.path.dirname(os.path.abspath(__file__))
data = os.path.join(os.path.dirname(here), 'data', 'deep')
PAIRS = [(0, 1), (0, 2), (1, 2)]
IDS = ['t35m-u0009', 't35m-m009-010', 't35m-u0010', 't35m-m010-011', 't35m-u0011', 't35m-u0012', 't44m-u0033', 't44m-u0034', 't44m-m034-035', 't44m-u0035']


def points():
    out = []
    W = {lab: {p['id']: p for p in json.load(open(os.path.join(data, 'witnesses', lab + '.json')))['points']} for lab in ('t35m', 't44m')}
    Rc = {lab: {x['id']: x for x in json.load(open(os.path.join(data, 'reclose', lab + '.json')))['rows']} for lab in ('t35m', 't44m')}
    for i in IDS:
        lab = i[:4]
        if '-m' in i:
            x = Rc[lab][i]; rc = x['reclosed']
            out.append(dict(id=i, lab=lab, kind='re-closed midpoint', lam=x['lam'], u1=float(rc['u1']), u2=float(rc['u2']), t=float(rc['t'])))
        else:
            p = W[lab][i]
            out.append(dict(id=i, lab=lab, kind='witnessed step %d' % p['step'], lam=p['lam'], u1=p['u1'], u2=p['u2'], t=p['t']))
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
    samples = []

    def sample(x, tt):
        samples.append((tt, list(x)))
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
    d2 = lambda x, a, j: (x[2 * j] - x[2 * a]) ** 2 + (x[2 * j + 1] - x[2 * a + 1]) ** 2
    ib, kb = min(((n, k) for n in range(len(samples)) for k in range(3)), key=lambda nk: d2(samples[nk[0]][1], *PAIRS[nk[1]]))
    a_, j = PAIRS[kb]

    def pair(x):
        rx, ry = x[2 * j] - x[2 * a_], x[2 * j + 1] - x[2 * a_ + 1]
        vx, vy = x[6 + 2 * j] - x[6 + 2 * a_], x[7 + 2 * j] - x[7 + 2 * a_]
        return rx, ry, vx, vy, rx * vy - ry * vx
    rx, ry, vx, vy, h = pair(samples[ib][1])
    MU = mpf(2)
    r = sqrt(rx * rx + ry * ry)
    eps = (vx * vx + vy * vy) / 2 - MU / r
    a = -MU / (2 * eps)
    e = sqrt(1 - h * h / (MU * a))
    q = h * h / (MU * (1 + e))
    hs = {nm: (float(pair(samples[n][1])[4]) if 0 <= n < len(samples) else None) for nm, n in (('before', ib - 1), ('after', ib + 1))}
    res = dict(id=pt['id'], kind=pt['kind'], lam=pt['lam'], pair=[a_, j], samples=len(samples), t_at_min=float(samples[ib][0]), sampled_min=float(r), h=nstr(h, 12), h_float=float(h), sign_of_h=1 if h > 0 else -1,
               h_sample_before=hs['before'], h_sample_after=hs['after'], osculating_pericentre=nstr(q, 12), osculating_float=float(q), eccentricity_minus_1=nstr(e - 1, 8), seconds=round(time.time() - T0))
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
    rows = [json.load(open('%s/%s.json' % (d, i))) for i in IDS]
    traces = {}
    for lab in ('t35m', 't44m'):
        rs = sorted([r for r in rows if r['id'].startswith(lab)], key=lambda r: r['lam'])
        flips = [[rs[k]['id'], rs[k + 1]['id']] for k in range(len(rs) - 1) if rs[k]['sign_of_h'] != rs[k + 1]['sign_of_h']]
        traces[lab] = dict(points_in_order_of_lam=rs, sign_changes_between=flips)
    what = ('the signed angular momentum h of the close pair at the closest sample of the 50 digit flow (preset w1b of tools/witness.py) at witnessed steps and re-closed midpoints of t35 - (steps 9 to 12, midpoints 9-10, 10-11) '
            'and t44 - (steps 33 to 35, midpoint 34-35), with the pair, the osculating pericentre q, e - 1, and h at the sample before and after the closest one. sign_changes_between lists the neighbours in lam with opposite signs of h.')
    json.dump(dict(what=what, command=['python tools/pair-angmom.py run DIR', 'python tools/pair-angmom.py summary DIR OUT.json'], traces=traces), open(out, 'x'), indent=1)
    for lab, tr in traces.items():
        for r in tr['points_in_order_of_lam']:
            print('%s lam %.10f pair %s h %s (before %.3e, after %.3e) q %s e-1 %s' % (r['id'], float(r['lam']), r['pair'], r['h'], r['h_sample_before'] or 0, r['h_sample_after'] or 0, r['osculating_pericentre'], r['eccentricity_minus_1']))
        print(lab, 'sign changes between', tr['sign_changes_between'])


if len(sys.argv) > 3 and sys.argv[1] == '--one':
    one(sys.argv[2], sys.argv[3])
elif len(sys.argv) >= 3 and sys.argv[1] == 'run':
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    rest = [a for a in sys.argv[3:] if a != '--only' and a != only]
    run(sys.argv[2], int(rest[0]) if rest else 3, only)
elif len(sys.argv) >= 4 and sys.argv[1] == 'summary':
    summary(sys.argv[2], sys.argv[3])
else:
    sys.exit('usage: python tools/pair-angmom.py run DIR [JOBS | --only ID]  or  summary DIR OUT.json')

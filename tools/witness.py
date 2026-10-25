# multiple precision witness of one orbit of the perpendicular start: the stored double start values (u1, u2, lam, t) are integrated with the Gragg-Bulirsch-Stoer flow of tools/refine-mp.py,
# first over the time t (the end state of the half orbit, where all bodies should be on one line with velocities perpendicular to it) and then over a second t (the closure of the
# full period, best rotation removed). The smallest pair distance over the whole orbit is recorded: sampled at the start and at every accepted step end, the pair, the distance of the
# third body to the middle of that pair, the time, and a parabolic estimate of the minimum of the squared distance through three consecutive samples (dmin_parabolic).
# python tools/witness.py JOB.json OUT.json [--preset w1|w1b] [--minutes 30] [--digits 40] [--tol 26] [--floor 1e-14]
#   JOB.json: {"id", "u1", "u2", "lam", "t"}. OUT.json must be new; a self-timer ends the job at the limit and writes "over limit".
#   w1 (the default): 40 digits, tolerance 1e-26, step floor 1e-14: accepted for minima of the pair distance down to 1e-7.
#   w1b: 50 digits, tolerance 1e-30, step floor 1e-20: accepted down to 1e-10 (tools/witness-acceptance.py).
import sys, os, json, time, threading, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf, sqrt, atan2, cos, sin, nstr

here = os.path.dirname(os.path.abspath(__file__))
PRESETS = {'w1': dict(digits=40, tol=26, floor='1e-14'), 'w1b': dict(digits=50, tol=30, floor='1e-20')}


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


jobfile, outfile = sys.argv[1], sys.argv[2]
preset = PRESETS[option('--preset', 'w1')]
DIGITS, TOL, FLOOR = int(option('--digits', preset['digits'])), int(option('--tol', preset['tol'])), option('--floor', preset['floor'])
limit = float(option('--minutes', 30))
if os.path.exists(outfile): sys.exit('exists, not overwriting: ' + outfile)
spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
R.STEP_FLOOR = mpf(FLOOR)
job = json.load(open(jobfile))
mp.dps = DIGITS; tol = mpf(10) ** (-TOL)
state = dict(phase='half', tacc=mpf(0), steps=0, t0=time.time(), minH=None, rejected=0)
PAIRS = [(0, 1), (0, 2), (1, 2)]


def pair_d2(x):
    return [(x[2 * j] - x[2 * i]) ** 2 + (x[2 * j + 1] - x[2 * i + 1]) ** 2 for i, j in PAIRS]


best = dict(d2=None, pair=None, third2=None, t=None, parab=None, parab_pair=None); hist = []


def sample(x, tt):
    d2 = pair_d2(x); k = min(range(3), key=lambda q: d2[q]); i, j = PAIRS[k]; l = 3 - i - j
    if best['d2'] is None or d2[k] < best['d2']:
        mx = (x[2 * i] + x[2 * j]) / 2; my = (x[2 * i + 1] + x[2 * j + 1]) / 2
        best.update(d2=d2[k], pair=k, third2=(x[2 * l] - mx) ** 2 + (x[2 * l + 1] - my) ** 2, t=tt)
    hist.append((tt, d2))
    if len(hist) >= 3:
        (t0_, a0), (t1_, a1), (t2_, a2) = hist[-3:]
        for q in range(3):
            if a1[q] <= a0[q] and a1[q] <= a2[q] and t2_ > t1_ > t0_:
                # parabola a(t) = a1 + b (t - t1) + c2 (t - t1)^2 through the three samples; its value at the minimum if that lies inside [t0, t2]
                h1 = t1_ - t0_; h2 = t2_ - t1_
                c2 = ((a2[q] - a1[q]) / h2 - (a1[q] - a0[q]) / h1) / (h1 + h2)
                if c2 > 0:
                    bb = (a2[q] - a0[q]) / (h1 + h2) - c2 * (h2 - h1)
                    tm1 = -bb / (2 * c2)
                    if -h1 <= tm1 <= h2:
                        v = a1[q] + bb * tm1 + c2 * tm1 * tm1
                        if v > 0 and (best['parab'] is None or v < best['parab']):
                            best.update(parab=v, parab_pair=q)
    del hist[:-3]


orig = R.bs_step


def counted(x0, H, tol_):
    r, order = orig(x0, H, tol_)
    if r is None: state['rejected'] += 1
    if r is not None:
        state['tacc'] += H; state['steps'] += 1; sample(r, state['tacc'])
        state['minH'] = H if state['minH'] is None or H < state['minH'] else state['minH']
    return r, order


R.bs_step = counted


def write(d):
    d.update(id=job['id'], digits=DIGITS, tol=TOL, floor=FLOOR, limit_minutes=limit)
    tmp = outfile + '.tmp'; json.dump(d, open(tmp, 'w'), indent=1); os.replace(tmp, outfile)


def extra():
    if best['d2'] is None: return {}
    return dict(dmin=float(sqrt(best['d2'])), dmin_pair=list(PAIRS[best['pair']]), third_dist=float(sqrt(best['third2'])), t_at_min=float(best['t']),
                dmin_parabolic=(float(sqrt(best['parab'])) if best['parab'] is not None else None), dmin_parabolic_pair=(list(PAIRS[best['parab_pair']]) if best['parab_pair'] is not None else None))


def timeout():
    write(dict(status='over limit', elapsed_s=round(time.time() - state['t0']), phase=state['phase'], t_reached=float(state['tacc']), steps=state['steps'], partial=extra()))
    os._exit(3)


timer = threading.Timer(limit * 60, timeout); timer.daemon = True; timer.start()


def sym_residual(s):
    # collinearity and the two velocity components along the line, as symResidual of src/perp.js
    big = mpf(0); dx = mpf(1); dy = mpf(0)
    for i in range(3):
        for j in range(i + 1, 3):
            rx = s[2 * j] - s[2 * i]; ry = s[2 * j + 1] - s[2 * i + 1]; l = rx * rx + ry * ry
            if l > big:
                big = l; n = sqrt(l); dx = rx / n; dy = ry / n
    c = ((s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0])) / big
    return [c, s[6] * dx + s[7] * dy, s[8] * dx + s[9] * dy]


u1, u2, lam, t = [mpf(float(job[k])) for k in ('u1', 'u2', 'lam', 't')]
x0 = R.start(u1, u2, lam)
sample(x0, mpf(0))
try:
    T0 = time.time()
    xh = R.flow(x0, t, tol)
    th = time.time() - T0
    res = sym_residual(xh)
    state['phase'] = 'second half'
    xf = R.flow(xh, t, tol)
    tt = time.time() - T0
except Exception as e:
    write(dict(status='error', error=str(e), elapsed_s=round(time.time() - state['t0']), t_reached=float(state['tacc']), steps=state['steps'], partial=extra()))
    sys.exit(2)
A = [(xf[2 * i], xf[2 * i + 1]) for i in range(6)]; B = [(x0[2 * i], x0[2 * i + 1]) for i in range(6)]
C = sum(a[0] * b[0] + a[1] * b[1] for a, b in zip(A, B)); S = sum(a[0] * b[1] - a[1] * b[0] for a, b in zip(A, B))
rot = atan2(S, C); c, s = cos(rot), sin(rot)
clo = max(max(abs(c * a[0] - s * a[1] - b[0]), abs(s * a[0] + c * a[1] - b[1])) for a, b in zip(A, B))
raw = max(max(abs(a[0] - b[0]), abs(a[1] - b[1])) for a, b in zip(A, B))
write(dict(status='done', e_half=float(max(abs(v) for v in res)), e_half_components=[float(v) for v in res], closure=float(clo), closure_raw=float(raw), rotation=float(rot),
           seconds_half=round(th, 1), seconds_total=round(tt, 1), steps=state['steps'], elapsed_s=round(time.time() - state['t0']), min_accepted_step=(float(state['minH']) if state['minH'] is not None else None), rejected_tries=state['rejected'],
           x_half=[nstr(v, 40) for v in xh], x_full=[nstr(v, 40) for v in xf], residual_half=[nstr(v, 40) for v in res], **extra()))
print('done', job['id'], 'e_half', float(max(abs(v) for v in res)), 'closure', float(clo), 'seconds', round(tt, 1), flush=True)

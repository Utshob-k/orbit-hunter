# long time integration in double precision (REBOUND, IAS15, defaults) of the stable orbits n = 5 to 12 (30 digit start values of data/refined and data/satellite-candidates.json, rounded to double).
# C1: the orbit as it is; C2: a perturbation of relative size 1e-8 of every component (seeds 1, 2, 3). for n = 8 the orbit is the double length one, one period here is two periods of the n = 8 orbit.
# pip install rebound numpy; python tools/long-run-rebound.py K out.json   (K periods, e.g. 1000 or 10000; out.json must be a new file; a single run is stopped after 10 minutes)
import json, math, os, sys, time
import numpy as np
import rebound

PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data') + '/'
K = int(sys.argv[1]); OUT = sys.argv[2]
if os.path.exists(OUT): sys.exit(OUT + ' exists, give a new file name')

def load(n):
    if n in (5, 6, 8):
        f = {5: 'refined/T17.847.json', 6: 'refined/T19.769.json', 8: 'refined/T47.065.json'}[n]
        j = json.load(open(PUB + f)); src = 'data/' + f + (' (the double length orbit; one period here is two periods of the n = 8 orbit)' if n == 8 else '')
    else:
        c = [o for o in json.load(open(PUB + 'satellite-candidates.json'))['orbits'] if o['n'] == n and ('nu = 1/%d (upper branch' % n) in o['label']][0]
        j = c; src = 'data/satellite-candidates.json'
    return dict(u1=float(j['u1']), u2=float(j['u2']), lam=float(j['lam']), t=float(j['t']), src=src)

def start_state(u1, u2, lam):
    cm = lam / 3
    pos = [(-1 - cm, 0.0), (lam - cm, 0.0), (1 - cm, 0.0)]
    vel = [(0.0, u1), (0.0, u2), (0.0, -u1 - u2)]
    return np.array([[*p, *v] for p, v in zip(pos, vel)])          # 3 x 4: x, y, vx, vy

def make_sim(S):
    sim = rebound.Simulation(); sim.G = 1.0; sim.integrator = 'ias15'
    for (x, y, vx, vy) in S: sim.add(m=1.0, x=x, y=y, vx=vx, vy=vy)
    return sim

def state(sim):
    p = sim.particles
    return np.array([[p[i].x, p[i].y, p[i].vx, p[i].vy] for i in range(3)])

def EL(S):
    x, y, vx, vy = S[:, 0], S[:, 1], S[:, 2], S[:, 3]
    E = 0.5 * np.sum(vx ** 2 + vy ** 2)
    for i in range(3):
        for j in range(i + 1, 3): E -= 1.0 / math.hypot(x[i] - x[j], y[i] - y[j])
    L = float(np.sum(x * vy - y * vx))
    return E, L

def d_raw(a, b): return float(np.max(np.abs(a - b)))
def d_rot(a, b):                                                   # the best rotation removed (as the closure of tools/satellite-check.py)
    A = np.concatenate([a[:, 0:2], a[:, 2:4]]); B = np.concatenate([b[:, 0:2], b[:, 2:4]])
    C = float(np.sum(A * B)); S_ = float(np.sum(A[:, 0] * B[:, 1] - A[:, 1] * B[:, 0])); th = math.atan2(S_, C); c, s = math.cos(th), math.sin(th)
    R = np.stack([c * A[:, 0] - s * A[:, 1], s * A[:, 0] + c * A[:, 1]], axis=1)
    return float(np.max(np.abs(R - B)))

def slope(d, k0=10):
    k = np.arange(1, len(d) + 1); m = k >= k0
    dd = np.maximum(np.array(d)[m], 1e-300)
    return float(np.polyfit(np.log10(k[m]), np.log10(dd), 1)[0])

def decades(d):
    out = {}
    for lo, hi in ((1, 10), (10, 100), (100, 1000), (1000, 10000)):
        if len(d) >= lo: out['%d-%d' % (lo, min(hi, len(d)))] = float(np.max(d[lo - 1:min(hi, len(d))]))
    return out

results = {}
for n in range(5, 13):
    o = load(n); T = 2 * o['t']; S0 = start_state(o['u1'], o['u2'], o['lam'])
    E0, L0 = EL(S0)
    t0 = time.time(); sim = make_sim(S0)
    traj = []; dr = []; dq = []; dE = []; dL = []; dCM = []; stopped = None
    for k in range(1, K + 1):
        sim.integrate(k * T)
        S = state(sim); traj.append(S)
        dr.append(d_raw(S, S0)); dq.append(d_rot(S, S0))
        E, L = EL(S); dE.append(abs(E / E0 - 1)); dL.append(abs(L / L0 - 1))
        dCM.append(float(max(abs(S[:, 0].sum()), abs(S[:, 1].sum()), abs(S[:, 2].sum()), abs(S[:, 3].sum())) / 3))
        if time.time() - t0 > 600: stopped = k; break
    sec = time.time() - t0
    r = dict(src=o['src'], T=T, periods_done=len(dr), seconds=round(sec, 2), steps=int(sim.steps_done), stopped_at=stopped,
             C1=dict(d_raw={str(k): dr[k - 1] for k in (1, 10, 100, 1000, 10000) if k <= len(dr)}, d_rot={str(k): dq[k - 1] for k in (1, 10, 100, 1000, 10000) if k <= len(dq)},
                     max_d_raw=max(dr), max_dE=max(dE), max_dL=max(dL), max_dCM=max(dCM), slope_loglog=slope(dr), ratio_dK_over_K_d1=dr[-1] / (len(dr) * dr[0]), decades_d_raw=decades(dr)))
    c2 = {}
    for seed in (1, 2, 3):
        g = np.random.RandomState(seed).standard_normal((3, 4)); S1 = S0 * (1 + 1e-8 * g)
        t1 = time.time(); sim2 = make_sim(S1); dp = []
        for k in range(1, len(traj) + 1):
            sim2.integrate(k * T); dp.append(d_raw(state(sim2), traj[k - 1]))
            if time.time() - t1 > 600: break
        c2[str(seed)] = dict(periods_done=len(dp), seconds=round(time.time() - t1, 2), d={str(k): dp[k - 1] for k in (1, 10, 100, 1000, 10000) if k <= len(dp)}, max_d=max(dp), slope_loglog=slope(dp), decades=decades(dp))
    r['C2'] = c2
    results[str(n)] = r
    print('n = %d: %d periods in %.1f s (steps %d); C1: d_1 %.2e, d_10 %.2e, d_100 %.2e, d_%d %.2e; slope %.2f; d_K/(K d_1) %.2f; max dE %.1e, dL %.1e, dCM %.1e; C2: max d\' %s; slopes %s' % (
        n, len(dr), sec, sim.steps_done, dr[0], dr[min(9, len(dr) - 1)], dr[min(99, len(dr) - 1)], len(dr), dr[-1], r['C1']['slope_loglog'], r['C1']['ratio_dK_over_K_d1'], max(dE), max(dL), max(dCM),
        ', '.join('%.1e' % c2[s]['max_d'] for s in c2), ', '.join('%.2f' % c2[s]['slope_loglog'] for s in c2)), flush=True)
r1 = [results[k]['C1'] for k in results]; r2 = [results[k]['C2'][s]['slope_loglog'] for k in results for s in results[k]['C2']]
print('n = 5 to 12: largest distance to the start state at any period %.2e; largest drift of the energy %.1e and of the angular momentum %.1e; slope of the perturbed runs %.2f to %.2f' % (
    max(c['max_d_raw'] for c in r1), max(c['max_dE'] for c in r1), max(c['max_dL'] for c in r1), min(r2), max(r2)))
json.dump(results, open(OUT, 'w'), indent=1)
print('written', OUT)

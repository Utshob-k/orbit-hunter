# an independent integration (REBOUND IAS15, double precision, default settings) of an orbit of class I (the 30 digit values rounded to double):
# distance to the start state after 1, 2, 5, 10, 20 periods (no rotation: theta = 0), energy and angular momentum, and the same for a perturbation (the start state multiplied by 1 + 1e-10 g with g standard normal, so components that are zero are not perturbed; growth per period).
# python tools/iso-rebound.py refined.json   (needs rebound and numpy)
import json, math, sys
import numpy as np, rebound
j = json.load(open(sys.argv[1]))
p, w, h, t = (float(j[k]) for k in ('p', 'w', 'h', 't'))
S0 = np.array([[1, 0, 0, w], [-0.5, h, p, -w / 2], [-0.5, -h, -p, -w / 2]], dtype=float)   # x, y, vx, vy
def run(S, K):
    sim = rebound.Simulation(); sim.G = 1.0; sim.integrator = 'ias15'
    for (x, y, vx, vy) in S: sim.add(m=1.0, x=x, y=y, vx=vx, vy=vy)
    out = []
    for k in range(1, K + 1):
        sim.integrate(k * 2 * t)
        out.append(np.array([[q.x, q.y, q.vx, q.vy] for q in sim.particles]))
    return out
def EL(S):
    E = 0.5 * np.sum(S[:, 2] ** 2 + S[:, 3] ** 2)
    for a in range(3):
        for b in range(a + 1, 3): E -= 1 / math.hypot(S[a, 0] - S[b, 0], S[a, 1] - S[b, 1])
    return E, float(np.sum(S[:, 0] * S[:, 3] - S[:, 1] * S[:, 2]))
E0, L0 = EL(S0)
print('start: E %.15f, L %.15f, T* %.12f, L* %.12f' % (E0, L0, 2 * t * abs(E0) ** 1.5, abs(L0) * abs(E0) ** 0.5))
tr = run(S0, 20)
print('REBOUND, unperturbed: distance to the start state after k periods: ' + ', '.join('k=%d %.2e' % (k, np.max(np.abs(tr[k - 1] - S0))) for k in (1, 2, 5, 10, 20)))
print('   relative drift of E and L after 20 periods: %.1e, %.1e' % (abs(EL(tr[-1])[0] / E0 - 1), abs(EL(tr[-1])[1] / L0 - 1)))
rng = np.random.RandomState(1)
for amp in (1e-10,):
    S1 = S0 * (1 + amp * rng.standard_normal((3, 4)))
    tp = run(S1, 20)
    d = [np.max(np.abs(tp[k] - tr[k])) for k in range(20)]
    # growth factor per period from k = 10 to 20 (the unstable direction grows like mu^k)
    g = (d[19] / d[9]) ** (1 / 10)
    print('perturbation %.0e: distance between the two runs after k periods: ' % amp + ', '.join('k=%d %.2e' % (k, d[k - 1]) for k in (1, 5, 10, 15, 20)) + '; growth factor per period between k = 10 and 20: %.4f' % g)

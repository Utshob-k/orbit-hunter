# checks the two orbits of data/satellite-candidates.json with REBOUND (IAS15, default settings; nothing from src/ is used): the closure after one period (max norm, best rotation removed, from the
# start values rounded to double precision) and the largest nontrivial multiplier of the 12 x 12 monodromy matrix (the 8 multipliers closest to 1 are the trivial ones), next to the multiplier of src/relative.js
# (210.109 and 253.242 in tools/satellite-candidates.mjs). the functions are the ones of tools/rebound-check.py.
# pip install rebound numpy;  python tools/satellite-check.py [--write]      (data/satellite-check.json is only written with --write)
import json, math, sys, time, os
import numpy as np
import rebound

def start_state(u1, u2, lam):
    cm = lam / 3
    pos = [(-1 - cm, 0.0), (lam - cm, 0.0), (1 - cm, 0.0)]
    vel = [(0.0, u1), (0.0, u2), (0.0, -u1 - u2)]
    return pos, vel

def make_sim(pos, vel, eps=None):
    sim = rebound.Simulation()
    sim.G = 1.0
    sim.integrator = 'ias15'
    if eps is not None: sim.integrator.epsilon = eps
    for (x, y), (vx, vy) in zip(pos, vel): sim.add(m=1.0, x=x, y=y, vx=vx, vy=vy)
    return sim

def state_of(sim):
    p = sim.particles
    return [(p[i].x, p[i].y) for i in range(3)], [(p[i].vx, p[i].vy) for i in range(3)]

def closure(pos0, vel0, pos1, vel1):
    a = np.array([*pos1, *vel1]); b = np.array([*pos0, *vel0])      # rows: 3 positions, 3 velocities, columns x, y
    C = float(np.sum(a * b)); S = float(np.sum(a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]))
    th = math.atan2(S, C); c, s = math.cos(th), math.sin(th)
    rot = np.stack([c * a[:, 0] - s * a[:, 1], s * a[:, 0] + c * a[:, 1]], axis=1)
    return float(np.max(np.abs(rot - b))), float(np.max(np.abs(a - b))), th

def run(u1, u2, lam, t, eps=None):
    pos, vel = start_state(u1, u2, lam)
    sim = make_sim(pos, vel, eps); T0 = time.time()
    sim.integrate(2 * t)
    p1, v1 = state_of(sim)
    e, raw, th = closure(pos, vel, p1, v1)
    return dict(closure=e, closureRaw=raw, rotation=th, steps=int(sim.steps_done), seconds=round(time.time() - T0, 2))

def monodromy(u1, u2, lam, t, eps=None):
    pos, vel = start_state(u1, u2, lam)
    sim = make_sim(pos, vel, eps)
    var = []
    for i in range(3):
        for c in ('x', 'y', 'vx', 'vy'):
            v = sim.add_variation(); setattr(v.particles[i], c, 1.0); var.append(v)   # a unit perturbation of one coordinate of one body
    sim.integrate(2 * t)
    M = np.zeros((12, 12))
    for j, v in enumerate(var):
        for i in range(3):
            q = v.particles[i]
            M[4 * i:4 * i + 4, j] = [q.x, q.y, q.vx, q.vy]
    J = np.zeros((12, 12))                      # the symplectic form in the coordinates (x, y, vx, vy) per body (the masses are 1)
    for i in range(3):
        J[4 * i, 4 * i + 2] = 1; J[4 * i + 1, 4 * i + 3] = 1; J[4 * i + 2, 4 * i] = -1; J[4 * i + 3, 4 * i + 1] = -1
    ev = np.linalg.eigvals(M)
    order = np.argsort(np.abs(ev - 1)); triv = ev[order[:8]]; non1 = ev[order[8:]]     # the 8 multipliers closest to 1 are the trivial ones
    return dict(det=float(np.linalg.det(M)), symplectic_deviation=float(np.max(np.abs(M.T @ J @ M - J))), trivial_largest_distance_from_1=float(np.max(np.abs(triv - 1))),
                max_modulus_nontrivial=float(np.max(np.abs(non1))), max_modulus_all=float(np.max(np.abs(ev))), nontrivial_angles=[float(abs(np.angle(z))) for z in non1],
                stable=bool(np.max(np.abs(non1)) <= 1 + 1e-6), nontrivial=[[float(z.real), float(z.imag)] for z in non1])

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cands = json.load(open(os.path.join(root, 'data', 'satellite-candidates.json')))['orbits']
_s = rebound.Simulation(); _s.integrator = 'ias15'
print('REBOUND', rebound.__version__, '; IAS15 epsilon', _s.integrator.epsilon, '; numpy', np.__version__)
MINE = [210.109, 253.242]      # tools/satellite-candidates.mjs
out = []
for c, mine in zip(cands, MINE):
    u1, u2, lam, t = (float(c[k]) for k in ('u1', 'u2', 'lam', 't'))
    r = run(u1, u2, lam, t); r12 = run(u1, u2, lam, t, 1e-12); m = monodromy(u1, u2, lam, t)
    print('%s\n  closure %.2e (raw %.2e, rotation %.1e, %d steps); with epsilon 1e-12 %.2e; largest multiplier %.4f (src/relative.js %.3f); symplectic deviation %.1e'
          % (c['label'], r['closure'], r['closureRaw'], r['rotation'], r['steps'], r12['closure'], m['max_modulus_all'], mine, m['symplectic_deviation']))
    out.append(dict(label=c['label'], closure=r['closure'], closureEps1e12=r12['closure'], largestMultiplier=m['max_modulus_all'], largestMultiplierMine=mine, symplecticDeviation=m['symplectic_deviation']))
if '--write' in sys.argv:
    json.dump(dict(rebound=rebound.__version__, orbits=out), open(os.path.join(root, 'data', 'satellite-check.json'), 'w'), indent=1)
    print('written data/satellite-check.json')

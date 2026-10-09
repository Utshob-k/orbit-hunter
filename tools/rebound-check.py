# independent check of the closure and the stability of the orbits with REBOUND (IAS15), nothing from src/ is used.
# reads only the start values: data/orbit-table.csv (the 85 orbits, the numbers have 12 digits there) and data/perp-arc-orbits.json (the 17 orbits of the arclength list).
# the start is the perpendicular start of src/perp.js, written out again here: bodies on the x axis at -1, lam, 1 shifted so that the centre of mass is 0 (cm = lam / 3),
# velocities along y: u1, u2 for bodies 1 and 2 and -u1 - u2 for body 3; G = 1, all masses 1; the full period is T = 2 t.
# closure as the README defines it: largest difference of a position or velocity component between the end state and the start state (max norm),
# with the best rotation removed (the rotation is the one that maximises the overlap of the two states) and without ("raw").
# fixed before the first run: IAS15 with its default settings (epsilon 1e-9); the 54 reliable orbits must close to 1e-8; the 31 weak ones are reported next to my own closure.
# stability: the 8 multipliers of the 12 x 12 monodromy matrix that are closest to 1 are the trivial ones (centre of mass 4, flow, energy, angular momentum, rotation); an orbit is called stable
# when the 4 others have modulus below 1 + 1e-6. (my first rule, 'not within 1e-3 of 1', was dropped after the BHH orbit t00: its trivial pair splits by 2e-3 in double precision.)
# pip install rebound numpy;  python tools/rebound-check.py [--write]      (the result file data/rebound-check.json is only written with --write)
import csv, json, math, sys, time
import numpy as np
import rebound

EPS = None   # None: the default of IAS15
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

rows = list(csv.DictReader(open('data/orbit-table.csv', encoding='utf8')))
arc = json.load(open('data/perp-arc-orbits.json'))
if len(rows) != 85 or len(arc) != 17: sys.exit('expected 85 + 17 orbits')
_s = rebound.Simulation(); _s.integrator = 'ias15'
print('REBOUND', rebound.__version__, '; IAS15 epsilon', _s.integrator.epsilon, '; numpy', np.__version__)
out = []; fails = []
for i, r in enumerate(rows):
    u1, u2, lam, t = (float(r[k]) for k in ('u1', 'u2', 'lam', 't'))
    res = run(u1, u2, lam, t)
    o = dict(name='t%02d' % i, tier=r['closureTier'], status=r['status'], Tstar=float(r['Tstar']), Lstar=float(r['Lstar']), mine_dp45=float(r['closureDP45']), mine_bs=float(r['closureBS']), **res)
    out.append(o)
    if o['tier'] == 'reliable' and o['closure'] >= 1e-8: fails.append(o['name'])
for i, a in enumerate(arc):
    res = run(a['u1'], a['u2'], a['lam'], a['t'])
    out.append(dict(name='a%02d' % i, tier='arclength list (reliable in the README)', status=None, Tstar=a['ts'], Lstar=abs(a['ls']), mine_dp45=None, mine_bs=None, **res))
    if res['closure'] >= 1e-8: fails.append('a%02d' % i)
rel = [o for o in out if o['tier'] == 'reliable']; weak = [o for o in out if o['tier'] == 'weak']; arcs = [o for o in out if o['name'].startswith('a')]
print('reliable (%d): REBOUND closure max %.2e, median %.2e, %d at or above 1e-8' % (len(rel), max(o['closure'] for o in rel), sorted(o['closure'] for o in rel)[len(rel) // 2], sum(o['closure'] >= 1e-8 for o in rel)))
print('weak (%d): REBOUND closure max %.2e, median %.2e; my DP45 max %.2e, my BS max %.2e; REBOUND below 1e-8: %d, below 1e-6: %d' % (len(weak), max(o['closure'] for o in weak), sorted(o['closure'] for o in weak)[len(weak) // 2], max(o['mine_dp45'] for o in weak), max(o['mine_bs'] for o in weak), sum(o['closure'] < 1e-8 for o in weak), sum(o['closure'] < 1e-6 for o in weak)))
print('arclength list (%d): REBOUND closure max %.2e' % (len(arcs), max(o['closure'] for o in arcs)))
print('orbits that fail the rule (reliable or arclength orbit at or above 1e-8):', fails if fails else 'none')

# after seeing the failures (not part of the rule fixed before the run): is it the start values (12 digits in the csv; double precision in data/orbit-table.json;
# the 30 digit refinement of data/refined rounded to double) or the integrator (default epsilon 1e-9 of IAS15 against 1e-12)? only for the orbits that failed.
# (a start from the 30 digit values of the L = 0 orbit t52 makes IAS15 run for minutes, so the refined starts were not run for all 85 orbits.)
if fails:
    import glob
    full = json.load(open('data/orbit-table.json'))
    refined = {}
    for f in glob.glob('data/refined/*.json') + glob.glob('data/refined/weak/*.json') + glob.glob('data/refined/reliable/*.json'):
        if f.endswith('summary.json'): continue
        d = json.load(open(f)); sd = d['start_double']
        k = min(range(len(rows)), key=lambda i: abs(float(rows[i]['lam']) - float(sd['lam'])) + abs(float(rows[i]['u1']) - float(sd['u1'])))
        if abs(float(rows[k]['lam']) - float(sd['lam'])) + abs(float(rows[k]['u1']) - float(sd['u1'])) < 1e-6: refined[k] = d
    print('diagnostic for the failures, closure with: csv values / double values of orbit-table.json / 30 digit refined values / csv with epsilon 1e-12; my DP45 and BS')
    for name in fails:
        if not name.startswith('t'): continue
        k = int(name[1:]); r = rows[k]; f = full[k]; d = refined[k]
        c1 = run(float(r['u1']), float(r['u2']), float(r['lam']), float(r['t']))['closure']
        c2 = run(f['u1'], f['u2'], f['lam'], f['t'])['closure']
        c3 = run(float(d['u1']), float(d['u2']), float(d['lam']), float(d['t']))['closure']
        c4 = run(float(r['u1']), float(r['u2']), float(r['lam']), float(r['t']), 1e-12)['closure']
        print('  %s T*=%.3f  %.1e / %.1e / %.1e / %.1e ;  mine %.1e, %.1e' % (name, float(r['Tstar']), c1, c2, c3, c4, float(r['closureDP45']), float(r['closureBS'])))
        m = monodromy(f['u1'], f['u2'], f['lam'], f['t']); stp_ = json.load(open('data/stability-perp-3.json')); mine_ = min(stp_, key=lambda q: abs(q['ts'] - float(r['Tstar'])))
        print('      largest multiplier: REBOUND %.4e, mine (stored) %.4e' % (m['max_modulus_all'], mine_['maxMod']))
        for o in out:
            if o['name'] == name: o['diagnostic'] = dict(csv=c1, double_values=c2, refined_30_digits=c3, csv_epsilon_1e12=c4, max_multiplier_rebound=m['max_modulus_all'], max_multiplier_mine=mine_['maxMod'])

# the stable orbits: 6 of the table and the T* = 29.31 orbit of the arclength list
stp = json.load(open('data/stability-perp-3.json')); sta = json.load(open('data/stability-arc.json'))
def mine_nontrivial(Ts):          # my stored largest nontrivial multiplier, matched by T*
    c = min(stp + sta, key=lambda o: abs(o['ts'] - Ts))
    return c['maxNontrivial'] if abs(c['ts'] - Ts) < 1e-5 else None
stab = []
for i, r in enumerate(rows):
    if r['status'] == 'stable': stab.append(('t%02d' % i, float(r['u1']), float(r['u2']), float(r['lam']), float(r['t']), float(r['Tstar'])))
k29 = [k for k, q in enumerate(arc) if abs(q['ts'] - 29.31) < 0.01][0]
stab.append(('a%02d' % k29, arc[k29]['u1'], arc[k29]['u2'], arc[k29]['lam'], arc[k29]['t'], arc[k29]['ts']))
print('\nstable orbits (monodromy matrix from the variational equations of REBOUND, 12 x 12):')
mono = []
for name, u1, u2, lam, t, Ts in stab:
    m = monodromy(u1, u2, lam, t); mymax = mine_nontrivial(Ts); m.update(name=name, Tstar=Ts, mine_maxNontrivial=mymax); mono.append(m)
    print('  %s T*=%.4f  det-1 %.1e  symplectic deviation %.1e  trivial multipliers within %.1e of 1  largest |m| of the other 4: %.12f (angles %s)  stable: %s   mine, largest nontrivial: %s' % (name, Ts, m['det'] - 1, m['symplectic_deviation'], m['trivial_largest_distance_from_1'], m['max_modulus_nontrivial'], ', '.join('%.4f' % x for x in sorted(set(round(a, 4) for a in m['nontrivial_angles']))), m['stable'], ('%.12f' % mymax) if mymax else None))
if '--write' in sys.argv:
    json.dump(dict(rebound=rebound.__version__, numpy=np.__version__, integrator='IAS15, default epsilon', rule='reliable orbits must close to 1e-8 or better (max norm, best rotation removed)', orbits=out, stable_orbits=mono), open('data/rebound-check.json', 'w'), indent=1)
    print('written to data/rebound-check.json')

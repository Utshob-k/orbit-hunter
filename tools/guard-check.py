# SPDX-License-Identifier: MIT
# the guards of src/ias/guards.py on the pieces of stored orbits: for every orbit (u1, u2, lam, t) the 24 pieces of the multiple shooting are built with the multiple precision flow of
# tools/refine-mp.py (the start of piece i+1 is the end state of piece i, carried in 40 digits and rounded to double only for the start of the next piece, as the nodes of the corrector are doubles);
# every piece is then run through the IAS15 process of src/ias/ias-bridge.py (REBOUND, a fresh simulation, the three pair distances at every step end) and analysed.
# python tools/guard-check.py POINTS.json [--id ID [ID ...]] [--ratio 390] [--out RESULT.json]
#   POINTS.json: a list of {"id", "u1", "u2", "lam", "t"}, or an object with such a list in "points" (the witness files of data/deep/witnesses/). The nodes are built with the settings of the preset w1 (40 digits, tolerance 1e-26, floor 1e-14),
#   or with those of w1b (50 digits, tolerance 1e-30, floor 1e-20) for a point of a witness file whose stored w1 minimum is below 1e-7 (the range of w1, see docs/deep.md). For every orbit it prints the pieces that are encounter pieces (smallest sampled pair distance
#   below 1e-3) with the pair, d1 and d2 at the pericentre, their ratio against the ratio of guard G1b, and whether G1a, G1b, G2 would trip; G2 also if two encounter pieces belong to different pairs;
#   G3 if a node (start of a piece) has a pair distance below 1e-4. Takes the time of one witness of the orbit (tens of seconds) plus a few seconds of IAS15. RESULT.json must be new.
import sys, os, json, math, time, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf

here = os.path.dirname(os.path.abspath(__file__))
PIECES = 24


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def perp_initial(u1, u2, lam):
    cm = lam / 3
    return [-1 - cm, 0.0, lam - cm, 0.0, 1 - cm, 0.0, 0.0, u1, 0.0, u2, 0.0, -u1 - u2]


def ias_piece(start, tau, mode=2):
    import rebound
    G = guards
    sim = rebound.Simulation(); sim.G = 1.0; sim.integrator = 'ias15'; sim.integrator.adaptive_mode = mode
    for i in range(3): sim.add(m=1.0, x=start[2 * i], y=start[2 * i + 1], vx=start[6 + 2 * i], vy=start[7 + 2 * i])
    samples = [(0.0,) + tuple(G.pd(start))]

    def heartbeat(_s):
        P = sim.particles
        samples.append((sim.t,) + tuple(math.hypot(P[j].x - P[i].x, P[j].y - P[i].y) for i, j in G.PAIRS))
    sim.heartbeat = heartbeat
    sim.integrate(tau)
    return samples


def preset_of(p):
    # w1b for a point whose stored w1 minimum is below 1e-7, else w1
    m = (p.get('w1') or {}).get('dmin_parabolic')
    return ('w1b', 50, 30, '1e-20') if m is not None and m < 1e-7 else ('w1', 40, 26, '1e-14')


def nodes_of(R, p):
    name, digits, tolexp, floor = preset_of(p); mp.dps = digits; tol = mpf(10) ** (-tolexp); R.STEP_FLOOR = mpf(floor); tau = p['t'] / PIECES
    x = [mpf(v) for v in perp_initial(p['u1'], p['u2'], p['lam'])]; starts = [[float(v) for v in x]]
    for i in range(PIECES - 1):
        x = R.flow(x, mpf(tau), tol); starts.append([float(v) for v in x])
    return starts, tau


def main():
    pts = json.load(open(sys.argv[1]))
    if isinstance(pts, dict): pts = pts['points']
    ratio = float(option('--ratio', 390)); out = option('--out', None)
    if out and os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    if '--id' in sys.argv:
        i = sys.argv.index('--id') + 1; ids = []
        while i < len(sys.argv) and not sys.argv[i].startswith('--'): ids.append(sys.argv[i]); i += 1
        pts = [p for p in pts if p['id'] in ids]
    global guards
    guards = load(os.path.join(os.path.dirname(here), 'src', 'ias', 'guards.py'), 'guards')
    R = load(os.path.join(here, 'refine-mp.py'), 'refine_mp')
    results = []
    for p in pts:
        t0 = time.time(); starts, tau = nodes_of(R, p); flagged = []; g3 = [i for i, s in enumerate(starts) if min(guards.pd(s)) < 1e-4]
        for i, s in enumerate(starts):
            a = guards.analyse(ias_piece(s, tau), ratio)
            if a['flagged']: a['piece'] = i; a['pair'] = a['pair_minima'].index(min(a['pair_minima'])); flagged.append(a)
        pairs = set(a['pair'] for a in flagged)
        print('%s (nodes with the settings of %s): lam %.8f, %d encounter pieces%s, nodes below 1e-4: %s, G2 for two pairs: %s (%.0f s)' % (p['id'], preset_of(p)[0], p['lam'], len(flagged), (' (pieces ' + ', '.join(str(a['piece']) for a in flagged) + ')') if flagged else '', g3 or 'none', 'yes' if len(pairs) > 1 else 'no', time.time() - t0))
        for a in flagged:
            print('   piece %2d pair %d: d1 at the pericentre %.4e, d2 %.4e, d2/d1 %.4g (margin %.3g against %g); second smallest pair minimum %.4e; trips: G1a %s G1b %s G2 %s' % (a['piece'], a['pair'], a['d1_peri'], a['d2_at_peri'], a['ratio'], a['margin'], ratio, a['g2_second_min'], a['g1a_trip'], a['g1b_trip'], a['g2_trip']))
        results.append(dict(id=p['id'], lam=p['lam'], nodes_below_1e4=g3, flagged=flagged, two_pairs=len(pairs) > 1))
    if out: json.dump(dict(ratio=ratio, results=results), open(out, 'x'))


if __name__ == '__main__':
    main()

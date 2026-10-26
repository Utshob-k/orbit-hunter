# REBOUND IAS15 process for src/ias/bridge.js: one long-lived process, line-delimited JSON on stdin and stdout, each answer flushed at once.
# python ias-bridge.py MODE RATIO [FIRST [FACTOR]]      MODE: IAS15 adaptive_mode; RATIO: the ratio of guard G1b (see guards.py)
#   FIRST: 'legacy' (the default when it is not given: sim.dt is not set, so IAS15 starts with REBOUND's default 0.001, as in every stored run) or 'timescale'
#   (sim.dt = FACTOR * the smallest d / |v_rel| over the three pairs at the start of the piece, at most tau and at least 1e-12; FACTOR is 0.01 when not given)
# request  {"id": n, "starts": [[12 numbers], ...], "tau": float}    state = x0,y0,x1,y1,x2,y2,vx0,vy0,vx1,vy1,vx2,vy2; G = 1, three masses 1
#   Each start is integrated for the time tau in a fresh IAS15 simulation. The three pair distances are sampled at the start and at every step end;
#   a piece whose smallest sampled pair distance is below 1e-3 is flagged as an encounter piece (the end state of IAS15 is returned anyway, bridge.js
#   replaces it by the one of reg.js).
# answer   {"id": n, "ends": [[12]...], "steps": total IAS15 steps, "enc": [0/1 per piece], "ana": [[11 numbers]...]}
#   ana per piece: the three pair minima, the smallest sampled pair distance, d1 and d2 at the pericentre, the smallest d2 while d1 < 1e-3 (-1 where
#   not defined for an unflagged piece), the number of the pair with the smallest minimum, and the flags of G1a, G1b, G2 as 0/1.
import sys, json, math
sys.dont_write_bytecode = True
import rebound
import guards


def ana_vec(a):
    mins = a['pair_minima']; pid = mins.index(min(mins))
    if not a['flagged']: return [mins[0], mins[1], mins[2], a['d1_min_sampled'], -1.0, -1.0, -1.0, float(pid), 0.0, 0.0, 0.0]
    return [mins[0], mins[1], mins[2], a['d1_min_sampled'], a['d1_peri'], a['d2_at_peri'], a['min_d2_while_d1_lt_1e3'], float(pid), float(a['g1a_trip']), float(a['g1b_trip']), float(a['g2_trip'])]


def first_step(st, tau, factor):
    # a fraction of the shortest pair timescale d / |v_rel| at the start of the piece
    best = tau
    for i, j in guards.PAIRS:
        v = math.hypot(st[6 + 2 * j] - st[6 + 2 * i], st[7 + 2 * j] - st[7 + 2 * i])
        if v > 0: best = min(best, factor * math.hypot(st[2 * j] - st[2 * i], st[2 * j + 1] - st[2 * i + 1]) / v)
    return max(best, 1e-12)


def piece(st, tau, mode, ratio, first='legacy', factor=0.01):
    sim = rebound.Simulation(); sim.G = 1.0; sim.integrator = 'ias15'; sim.integrator.adaptive_mode = mode
    for i in range(3): sim.add(m=1.0, x=st[2 * i], y=st[2 * i + 1], vx=st[6 + 2 * i], vy=st[7 + 2 * i])
    if first == 'timescale': sim.dt = first_step(st, tau, factor)
    samples = [(0.0,) + tuple(guards.pd(st))]

    def heartbeat(_s):
        P = sim.particles
        samples.append((sim.t,) + tuple(math.hypot(P[j].x - P[i].x, P[j].y - P[i].y) for i, j in guards.PAIRS))
    sim.heartbeat = heartbeat
    sim.integrate(tau)
    p = sim.particles
    return [p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[0].vx, p[0].vy, p[1].vx, p[1].vy, p[2].vx, p[2].vy], int(sim.steps_done), guards.analyse(samples, ratio)


def main():
    mode = int(sys.argv[1]); ratio = float(sys.argv[2]) if len(sys.argv) > 2 else guards.DEFAULT_RATIO
    first = sys.argv[3] if len(sys.argv) > 3 else 'legacy'; factor = float(sys.argv[4]) if len(sys.argv) > 4 else 0.01
    if first not in ('legacy', 'timescale'): sys.exit('FIRST must be legacy or timescale, not ' + first)
    for line in sys.stdin:
        line = line.strip()
        if not line: continue
        req = json.loads(line)
        ends = []; steps = 0; enc = []; ana = []
        for st in req['starts']:
            e, k, a = piece(st, req['tau'], mode, ratio, first, factor); steps += k
            enc.append(1 if a['flagged'] else 0)
            ends.append(e); ana.append(ana_vec(a))
        sys.stdout.write(json.dumps({'id': req['id'], 'ends': ends, 'steps': steps, 'enc': enc, 'ana': ana}) + '\n'); sys.stdout.flush()


if __name__ == '__main__':
    main()
